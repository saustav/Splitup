import type { MemberBalance } from '@/types/expense';
import type { EnrichedSettlement, Settlement, SimplifiedDebt } from '@/types/settlement';
import {
  BALANCE_ZERO_THRESHOLD,
  isEffectivelyZero,
  roundMoney,
} from '@/lib/balances';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type SettlementRow = {
  id: string;
  group_id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  provider: Settlement['provider'];
  status: Settlement['status'];
  external_ref: string | null;
  created_at: string;
  completed_at: string | null;
};

function mapSettlementRow(row: SettlementRow): Settlement {
  return {
    id: row.id,
    group_id: row.group_id,
    payer_id: row.payer_id,
    payee_id: row.payee_id,
    amount: Number(row.amount),
    provider: row.provider,
    status: row.status,
    external_ref: row.external_ref,
    created_at: row.created_at,
  };
}

/** Minimize transactions: match debtors to creditors */
export function simplifyDebts(balances: MemberBalance[]): Omit<
  SimplifiedDebt,
  'from_name' | 'to_name'
>[] {
  type Bucket = { user_id: string; amount: number };

  const creditors: Bucket[] = [];
  const debtors: Bucket[] = [];

  for (const b of balances) {
    if (b.net_balance > BALANCE_ZERO_THRESHOLD) {
      creditors.push({ user_id: b.user_id, amount: b.net_balance });
    } else if (b.net_balance < -BALANCE_ZERO_THRESHOLD) {
      debtors.push({ user_id: b.user_id, amount: -b.net_balance });
    }
  }

  const debts: Omit<SimplifiedDebt, 'from_name' | 'to_name'>[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    const rounded = roundMoney(pay);

    if (rounded > 0) {
      debts.push({
        from_user_id: debtors[i].user_id,
        to_user_id: creditors[j].user_id,
        amount: rounded,
      });
    }

    debtors[i].amount -= pay;
    creditors[j].amount -= pay;

    if (debtors[i].amount < BALANCE_ZERO_THRESHOLD) i++;
    if (creditors[j].amount < BALANCE_ZERO_THRESHOLD) j++;
  }

  return debts;
}

export function enrichDebts(
  debts: Omit<SimplifiedDebt, 'from_name' | 'to_name'>[],
  balances: MemberBalance[]
): SimplifiedDebt[] {
  const nameById = new Map(balances.map((b) => [b.user_id, b.display_name]));

  return debts.map((d) => ({
    ...d,
    from_name: nameById.get(d.from_user_id) ?? 'Someone',
    to_name: nameById.get(d.to_user_id) ?? 'Someone',
  }));
}

export function enrichSettlements(
  settlements: Settlement[],
  balances: MemberBalance[]
): EnrichedSettlement[] {
  const nameById = new Map(balances.map((b) => [b.user_id, b.display_name]));

  return settlements.map((s) => ({
    ...s,
    payer_name: nameById.get(s.payer_id) ?? 'Someone',
    payee_name: nameById.get(s.payee_id) ?? 'Someone',
  }));
}

/** Pending manual payments where the current user is payee and must confirm receipt. */
export async function fetchIncomingPendingPaymentActions(
  userId: string
): Promise<
  Array<{
    settlement: Settlement;
    groupName: string;
    currency: string;
    payerName: string;
  }>
> {
  if (!isSupabaseConfigured || !userId) {
    return [];
  }

  const { data, error } = await supabase
    .from('settlements')
    .select(
      'id, group_id, payer_id, payee_id, amount, provider, status, external_ref, created_at, group:groups ( name, currency )'
    )
    .eq('payee_id', userId)
    .eq('status', 'pending')
    .eq('provider', 'manual')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  const payerIds = [
    ...new Set(rows.map((r) => (r as { payer_id: string }).payer_id)),
  ];

  const profileNames = new Map<string, string>();
  if (payerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', payerIds);

    for (const p of profiles ?? []) {
      profileNames.set(p.id, p.display_name?.trim() || 'Someone');
    }
  }

  return rows.map((row) => {
    const r = row as SettlementRow & {
      group: { name: string; currency: string } | { name: string; currency: string }[] | null;
    };
    const group = Array.isArray(r.group) ? r.group[0] : r.group;
    return {
      settlement: mapSettlementRow(r),
      groupName: group?.name ?? 'Group',
      currency: group?.currency ?? 'USD',
      payerName: profileNames.get(r.payer_id) ?? 'Someone',
    };
  });
}

export async function fetchGroupSettlements(
  groupId: string,
  options?: { status?: Settlement['status'] | Settlement['status'][] }
): Promise<Settlement[]> {
  if (!isSupabaseConfigured) {
    return [];
  }

  let query = supabase
    .from('settlements')
    .select(
      'id, group_id, payer_id, payee_id, amount, provider, status, external_ref, created_at, completed_at'
    )
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    const statuses = Array.isArray(options.status)
      ? options.status
      : [options.status];
    query = query.in('status', statuses);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapSettlementRow(row as SettlementRow));
}

/** Record a cash payment — stays pending until the payee accepts. */
export async function recordManualSettlement(params: {
  groupId: string;
  payeeId: string;
  amount: number;
}): Promise<string> {
  return createSettlement({
    groupId: params.groupId,
    payeeId: params.payeeId,
    amount: params.amount,
    provider: 'manual',
  });
}

export async function acceptSettlement(settlementId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase.rpc('accept_settlement', {
    p_settlement_id: settlementId,
  });

  if (error) throw error;
}

export async function createSettlement(params: {
  groupId: string;
  payeeId: string;
  amount: number;
  provider: 'manual';
}): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await supabase.rpc('create_settlement', {
    p_group_id: params.groupId,
    p_payee_id: params.payeeId,
    p_amount: params.amount,
    p_provider: params.provider,
  });

  if (error) throw error;
  return data as string;
}

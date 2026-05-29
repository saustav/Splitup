import type { MemberBalance } from '@/types/expense';
import type { SimplifiedDebt } from '@/types/settlement';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/** Minimize transactions: match debtors to creditors */
export function simplifyDebts(balances: MemberBalance[]): Omit<
  SimplifiedDebt,
  'from_name' | 'to_name'
>[] {
  type Bucket = { user_id: string; amount: number };

  const creditors: Bucket[] = [];
  const debtors: Bucket[] = [];

  for (const b of balances) {
    if (b.net_balance > 0.01) {
      creditors.push({ user_id: b.user_id, amount: b.net_balance });
    } else if (b.net_balance < -0.01) {
      debtors.push({ user_id: b.user_id, amount: -b.net_balance });
    }
  }

  const debts: Omit<SimplifiedDebt, 'from_name' | 'to_name'>[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    const rounded = Math.round(pay * 100) / 100;

    if (rounded > 0) {
      debts.push({
        from_user_id: debtors[i].user_id,
        to_user_id: creditors[j].user_id,
        amount: rounded,
      });
    }

    debtors[i].amount -= pay;
    creditors[j].amount -= pay;

    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
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

export async function createSettlement(params: {
  groupId: string;
  payeeId: string;
  amount: number;
  provider: 'khalti' | 'esewa' | 'manual';
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

export async function completeSettlement(settlementId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase.rpc('complete_settlement', {
    p_settlement_id: settlementId,
  });

  if (error) throw error;
}

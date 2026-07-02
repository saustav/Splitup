import {
  BALANCE_ZERO_THRESHOLD,
  calculateBalances,
  isEffectivelyZero,
  normalizeNetBalance,
} from '@/lib/balances';
import { fetchGroupExpenses } from '@/lib/expenses';
import { fetchGroupMembers, fetchUserGroups } from '@/lib/groups';
import { fetchGroupSettlements } from '@/lib/settlements';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Group } from '@/types/group';

export type GroupBalanceSummary = {
  group: Group;
  netBalance: number;
  /** Latest expense timestamp in the group, if any. */
  lastActiveAt: string | null;
};

export type DashboardSummary = {
  totalBalance: number;
  totalYouOwe: number;
  totalOwedToYou: number;
  groupBalances: GroupBalanceSummary[];
};

export async function fetchDashboardSummary(
  userId: string
): Promise<DashboardSummary> {
  if (!isSupabaseConfigured || !userId) {
    return {
      totalBalance: 0,
      totalYouOwe: 0,
      totalOwedToYou: 0,
      groupBalances: [],
    };
  }

  const groups = await fetchUserGroups();
  const groupBalances: GroupBalanceSummary[] = [];

  await Promise.all(
    groups.map(async (group) => {
      try {
        const [members, expenses, settlements] = await Promise.all([
          fetchGroupMembers(group.id),
          fetchGroupExpenses(group.id),
          fetchGroupSettlements(group.id),
        ]);

        const balances = calculateBalances(expenses, members, settlements);
        const mine = balances.find((b) => b.user_id === userId);
        const netBalance = mine?.net_balance ?? 0;
        const lastActiveAt = expenses.reduce<string | null>((latest, expense) => {
          if (!expense.created_at) return latest;
          if (!latest || expense.created_at > latest) return expense.created_at;
          return latest;
        }, null);

        groupBalances.push({ group, netBalance, lastActiveAt });
      } catch {
        groupBalances.push({ group, netBalance: 0, lastActiveAt: null });
      }
    })
  );

  let totalYouOwe = 0;
  let totalOwedToYou = 0;

  for (const item of groupBalances) {
    if (item.netBalance < -BALANCE_ZERO_THRESHOLD) {
      totalYouOwe += Math.abs(item.netBalance);
    } else if (item.netBalance > BALANCE_ZERO_THRESHOLD) {
      totalOwedToYou += item.netBalance;
    }
  }

  const totalBalance = normalizeNetBalance(
    groupBalances.reduce((sum, item) => sum + item.netBalance, 0)
  );

  return {
    totalBalance,
    totalYouOwe: normalizeNetBalance(totalYouOwe),
    totalOwedToYou: normalizeNetBalance(totalOwedToYou),
    groupBalances: groupBalances.sort(
      (a, b) =>
        new Date(b.group.created_at).getTime() -
        new Date(a.group.created_at).getTime()
    ),
  };
}

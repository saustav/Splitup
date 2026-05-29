import { calculateBalances } from '@/lib/balances';
import { fetchGroupExpenses } from '@/lib/expenses';
import { fetchGroupMembers, fetchUserGroups } from '@/lib/groups';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Group } from '@/types/group';

export type GroupBalanceSummary = {
  group: Group;
  netBalance: number;
};

export type DashboardSummary = {
  totalBalance: number;
  groupBalances: GroupBalanceSummary[];
};

export async function fetchDashboardSummary(
  userId: string
): Promise<DashboardSummary> {
  if (!isSupabaseConfigured || !userId) {
    return { totalBalance: 0, groupBalances: [] };
  }

  const groups = await fetchUserGroups();
  const groupBalances: GroupBalanceSummary[] = [];

  await Promise.all(
    groups.map(async (group) => {
      try {
        const [members, expenses] = await Promise.all([
          fetchGroupMembers(group.id),
          fetchGroupExpenses(group.id),
        ]);

        const balances = calculateBalances(expenses, members);
        const mine = balances.find((b) => b.user_id === userId);
        const netBalance = mine?.net_balance ?? 0;

        groupBalances.push({ group, netBalance });
      } catch {
        groupBalances.push({ group, netBalance: 0 });
      }
    })
  );

  const totalBalance = groupBalances.reduce(
    (sum, item) => sum + item.netBalance,
    0
  );

  return {
    totalBalance: Math.round(totalBalance * 100) / 100,
    groupBalances: groupBalances.sort(
      (a, b) =>
        new Date(b.group.created_at).getTime() -
        new Date(a.group.created_at).getTime()
    ),
  };
}

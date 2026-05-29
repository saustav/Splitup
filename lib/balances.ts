import type { Expense, MemberBalance } from '@/types/expense';
import type { GroupMember } from '@/types/group';

/**
 * Net balance per member: positive means others owe them, negative means they owe.
 * Payer is credited the full amount; each split row debits that user.
 */
export function calculateBalances(
  expenses: Expense[],
  members: GroupMember[]
): MemberBalance[] {
  const nets = new Map<string, number>();

  for (const member of members) {
    nets.set(member.user_id, 0);
  }

  for (const expense of expenses) {
    const paidBy = expense.paid_by;
    if (nets.has(paidBy)) {
      nets.set(paidBy, (nets.get(paidBy) ?? 0) + Number(expense.amount));
    }

    for (const split of expense.splits ?? []) {
      if (nets.has(split.user_id)) {
        nets.set(
          split.user_id,
          (nets.get(split.user_id) ?? 0) - Number(split.amount_owed)
        );
      }
    }
  }

  return members.map((member) => {
    const profile = member.profile;
    const name =
      (Array.isArray(profile) ? profile[0]?.display_name : profile?.display_name) ??
      `User ${member.user_id.slice(0, 8)}`;

    return {
      user_id: member.user_id,
      display_name: name,
      net_balance: Math.round((nets.get(member.user_id) ?? 0) * 100) / 100,
    };
  });
}

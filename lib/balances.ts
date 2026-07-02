import type { ExpenseBalanceInput, MemberBalance } from '@/types/expense';
import type { GroupMember } from '@/types/group';
import type { Settlement } from '@/types/settlement';

/** Balances within ±this amount are treated as zero (split rounding + settle-up). */
export const BALANCE_ZERO_THRESHOLD = 0.02;

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Snap tiny residuals from equal splits / simplified settle-up to exactly zero. */
export function normalizeNetBalance(net: number): number {
  const rounded = roundMoney(net);
  return Math.abs(rounded) < BALANCE_ZERO_THRESHOLD ? 0 : rounded;
}

export function isEffectivelyZero(balance: number): boolean {
  return Math.abs(balance) < BALANCE_ZERO_THRESHOLD;
}

/**
 * Settlement amount for a simplified debt line — pays the exact cents owed when
 * this payment clears the payer's remaining balance (avoids -0.01 leftovers).
 */
export function settlementAmountForDebt(
  debtAmount: number,
  payerNetBalance: number
): number {
  const debt = roundMoney(debtAmount);
  const payerOwed = roundMoney(Math.abs(Math.min(payerNetBalance, 0)));

  if (payerOwed > 0 && debt >= payerOwed - BALANCE_ZERO_THRESHOLD) {
    return payerOwed;
  }

  return debt;
}

/**
 * Net balance per member: positive means others owe them, negative means they owe.
 * Payer is credited the full amount; each split row debits that user.
 * Completed settlements adjust balances (payer owes less, payee is owed less).
 */
export function calculateBalances(
  expenses: ExpenseBalanceInput[],
  members: GroupMember[],
  settlements: Settlement[] = []
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

  for (const settlement of settlements) {
    if (settlement.status !== 'completed') continue;

    const amount = Number(settlement.amount);
    if (nets.has(settlement.payer_id)) {
      nets.set(
        settlement.payer_id,
        (nets.get(settlement.payer_id) ?? 0) + amount
      );
    }
    if (nets.has(settlement.payee_id)) {
      nets.set(
        settlement.payee_id,
        (nets.get(settlement.payee_id) ?? 0) - amount
      );
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
      net_balance: normalizeNetBalance(nets.get(member.user_id) ?? 0),
    };
  });
}

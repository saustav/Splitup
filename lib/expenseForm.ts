import {
  DEFAULT_EXPENSE_CATEGORY,
  normalizeExpenseCategory,
  type ExpenseCategoryId,
} from '@/constants/expenseCategories';
import type { Expense } from '@/types/expense';

export type SplitMode = 'equal' | 'custom';

export function expenseToFormState(
  expense: Expense,
  memberIds: string[]
): {
  description: string;
  amountText: string;
  paidById: string;
  category: ExpenseCategoryId;
  expenseDate: string;
  splitMode: SplitMode;
  includedIds: Set<string>;
  customSplits: Record<string, string>;
} {
  const splits = expense.splits ?? [];
  const withOwed = splits.filter((s) => s.amount_owed > 0);
  const includedIds = new Set(withOwed.map((s) => s.user_id));

  const customSplits: Record<string, string> = {};
  for (const id of memberIds) {
    const row = splits.find((s) => s.user_id === id);
    customSplits[id] =
      row && row.amount_owed > 0 ? String(row.amount_owed) : '';
  }

  let splitMode: SplitMode = 'equal';
  if (withOwed.length > 1) {
    const share = withOwed[0].amount_owed;
    const allSame = withOwed.every(
      (s) => Math.abs(s.amount_owed - share) < 0.02
    );
    if (!allSame) splitMode = 'custom';
  } else if (withOwed.length === 1 && memberIds.length > 1) {
    splitMode = 'custom';
  }

  return {
    description: expense.description,
    amountText: String(expense.amount),
    paidById: expense.paid_by,
    category: normalizeExpenseCategory(expense.category),
    expenseDate: expense.expense_date,
    splitMode,
    includedIds,
    customSplits,
  };
}

export function canEditExpense(
  expense: Expense,
  currentUserId: string | undefined
): boolean {
  if (!currentUserId) return false;
  return (
    expense.paid_by === currentUserId ||
    expense.created_by === currentUserId
  );
}

/** Label for who paid vs who logged the expense. */
export function expensePaidByLabel(
  expense: Expense,
  currentUserId: string | undefined
): string {
  const payerName = expense.payer?.display_name?.trim();

  if (expense.paid_by === currentUserId) {
    return 'You paid';
  }

  if (payerName) {
    return `${payerName} paid`;
  }

  return 'Paid by a group member';
}

export function expenseAddedByLabel(
  expense: Expense,
  currentUserId: string | undefined
): string {
  const paid = expensePaidByLabel(expense, currentUserId);

  if (expense.created_by === currentUserId && expense.paid_by !== currentUserId) {
    return `You added · ${paid.toLowerCase()}`;
  }

  if (expense.paid_by === currentUserId) {
    return paid;
  }

  return paid;
}

import type { ExpenseCategoryId } from '@/constants/expenseCategories';

export type Expense = {
  id: string;
  group_id: string;
  description: string;
  category: ExpenseCategoryId;
  amount: number;
  currency: string;
  paid_by: string;
  created_by: string | null;
  expense_date: string;
  created_at: string;
  payer?: {
    display_name: string | null;
  } | null;
  splits?: ExpenseSplit[];
};

export type ExpenseSplit = {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  profile?: {
    display_name: string | null;
  } | null;
};

/** Minimal expense fields used for balance calculation. */
export type ExpenseBalanceInput = {
  paid_by: string;
  amount: number;
  splits?: Pick<ExpenseSplit, 'user_id' | 'amount_owed'>[];
};

export type MemberBalance = {
  user_id: string;
  display_name: string;
  /** Positive = others owe this person; negative = they owe the group */
  net_balance: number;
};

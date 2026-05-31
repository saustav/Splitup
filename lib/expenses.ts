import { normalizeExpenseCategory } from '@/constants/expenseCategories';
import type { Expense, ExpenseSplit } from '@/types/expense';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

function normalizeExpense(row: Record<string, unknown>): Expense {
  const payer = row.payer as Expense['payer'] | Expense['payer'][];
  const splits = row.splits as Expense['splits'];

  return {
    ...(row as Expense),
    category: normalizeExpenseCategory(row.category as string | null),
    amount: Number(row.amount),
    payer: Array.isArray(payer) ? payer[0] ?? null : payer ?? null,
    splits: (splits ?? []).map((s) => {
      const raw = s as ExpenseSplit & {
        profile?:
          | { display_name: string | null }
          | { display_name: string | null }[];
      };
      const profile = Array.isArray(raw.profile)
        ? (raw.profile[0] ?? null)
        : (raw.profile ?? null);
      return {
        ...raw,
        amount_owed: Number(raw.amount_owed),
        profile,
      };
    }),
  };
}

const expenseSelect = `
  id,
  group_id,
  description,
  category,
  amount,
  currency,
  paid_by,
  created_by,
  expense_date,
  created_at,
  payer:profiles!expenses_paid_by_profile_fkey ( display_name ),
  splits:expense_splits (
    id,
    expense_id,
    user_id,
    amount_owed,
    profile:profiles!expense_splits_user_profile_fkey ( display_name )
  )
`;

export async function fetchExpenseById(expenseId: string): Promise<Expense | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('expenses')
    .select(expenseSelect)
    .eq('id', expenseId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return normalizeExpense(data as Record<string, unknown>);
}

export async function fetchGroupExpenses(groupId: string): Promise<Expense[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('expenses')
    .select(expenseSelect)
    .eq('group_id', groupId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => normalizeExpense(row as Record<string, unknown>));
}

export type ExpenseSplitInput = {
  user_id: string;
  amount_owed: number;
};

/** Creates an expense; payer must be a group member (defaults to signed-in user). */
export async function createExpense(params: {
  groupId: string;
  description: string;
  amount: number;
  paidBy?: string;
  category?: string;
  expenseDate?: string;
  splits?: ExpenseSplitInput[];
}): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await supabase.rpc('create_expense', {
    p_group_id: params.groupId,
    p_description: params.description.trim(),
    p_amount: params.amount,
    p_paid_by: params.paidBy ?? null,
    p_category: params.category ?? 'other',
    p_expense_date: params.expenseDate ?? null,
    p_splits: params.splits?.length
      ? params.splits.filter((s) => s.amount_owed > 0)
      : null,
  });

  if (error) throw error;

  return data as string;
}

/** Updates an expense. Payer or creator may edit (enforced in DB). */
export async function updateExpense(params: {
  expenseId: string;
  description: string;
  amount: number;
  paidBy?: string;
  category?: string;
  expenseDate?: string;
  splits?: ExpenseSplitInput[];
}): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase.rpc('update_expense', {
    p_expense_id: params.expenseId,
    p_description: params.description.trim(),
    p_amount: params.amount,
    p_paid_by: params.paidBy ?? null,
    p_category: params.category ?? null,
    p_expense_date: params.expenseDate ?? null,
    p_splits: params.splits?.length
      ? params.splits.filter((s) => s.amount_owed > 0)
      : null,
  });

  if (error) throw error;
}

/** Deletes an expense. Payer or creator may delete (enforced in DB). */
export async function deleteExpense(expenseId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase.rpc('delete_expense', {
    p_expense_id: expenseId,
  });

  if (error) throw error;
}

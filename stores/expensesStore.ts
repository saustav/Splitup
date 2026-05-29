import { create } from 'zustand';

import { calculateBalances } from '@/lib/balances';
import {
  createExpense as createExpenseApi,
  type ExpenseSplitInput,
  fetchGroupExpenses,
} from '@/lib/expenses';
import { fetchGroupMembers } from '@/lib/groups';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Expense, MemberBalance } from '@/types/expense';
import type { GroupMember } from '@/types/group';

interface ExpensesState {
  groupId: string | null;
  expenses: Expense[];
  members: GroupMember[];
  balances: MemberBalance[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  loadForGroup: (groupId: string) => Promise<void>;
  createExpense: (params: {
    description: string;
    amount: number;
    splits?: ExpenseSplitInput[];
  }) => Promise<boolean>;
  subscribe: (groupId: string) => void;
  unsubscribe: () => void;
  reset: () => void;
}

let expensesChannel: ReturnType<typeof supabase.channel> | null = null;

export const useExpensesStore = create<ExpensesState>((set, get) => ({
  groupId: null,
  expenses: [],
  members: [],
  balances: [],
  isLoading: false,
  isCreating: false,
  error: null,

  loadForGroup: async (groupId: string) => {
    if (!isSupabaseConfigured) return;

    set({ groupId, isLoading: true, error: null });

    try {
      const [expenses, members] = await Promise.all([
        fetchGroupExpenses(groupId),
        fetchGroupMembers(groupId),
      ]);

      set({
        expenses,
        members,
        balances: calculateBalances(expenses, members),
        isLoading: false,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load expenses';
      set({ isLoading: false, error: message });
    }
  },

  createExpense: async ({ description, amount, splits }) => {
    const groupId = get().groupId;
    if (!groupId) return false;

    const trimmed = description.trim();
    if (!trimmed) {
      set({ error: 'Description is required' });
      return false;
    }

    set({ isCreating: true, error: null });

    try {
      await createExpenseApi({
        groupId,
        description: trimmed,
        amount,
        splits,
      });
      await get().loadForGroup(groupId);
      set({ isCreating: false });
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to add expense';
      set({ isCreating: false, error: message });
      return false;
    }
  },

  subscribe: (groupId: string) => {
    if (!isSupabaseConfigured) return;

    get().unsubscribe();

    expensesChannel = supabase
      .channel(`expenses-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          get().loadForGroup(groupId);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expense_splits' },
        () => {
          get().loadForGroup(groupId);
        }
      )
      .subscribe();
  },

  unsubscribe: () => {
    if (expensesChannel) {
      supabase.removeChannel(expensesChannel);
      expensesChannel = null;
    }
  },

  reset: () => {
    get().unsubscribe();
    set({
      groupId: null,
      expenses: [],
      members: [],
      balances: [],
      isLoading: false,
      isCreating: false,
      error: null,
    });
  },
}));

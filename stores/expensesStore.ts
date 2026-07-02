import { create } from 'zustand';

import { calculateBalances } from '@/lib/balances';
import {
  createExpense as createExpenseApi,
  type ExpenseSplitInput,
  fetchGroupExpenseCount,
  fetchGroupExpensesForBalances,
  fetchGroupExpensesPage,
} from '@/lib/expenses';
import { fetchGroupMembers } from '@/lib/groups';
import { fetchGroupSettlements } from '@/lib/settlements';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Expense, MemberBalance } from '@/types/expense';
import type { GroupMember } from '@/types/group';
import type { Settlement } from '@/types/settlement';

interface ExpensesState {
  groupId: string | null;
  expenses: Expense[];
  expenseCount: number;
  expenseSortAscending: boolean;
  hasMoreExpenses: boolean;
  members: GroupMember[];
  balances: MemberBalance[];
  pendingSettlements: Settlement[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isCreating: boolean;
  error: string | null;
  loadForGroup: (groupId: string) => Promise<void>;
  loadMoreExpenses: () => Promise<void>;
  toggleExpenseSort: () => Promise<void>;
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
let isLoadingMoreRef = false;

export const useExpensesStore = create<ExpensesState>((set, get) => ({
  groupId: null,
  expenses: [],
  expenseCount: 0,
  expenseSortAscending: false,
  hasMoreExpenses: false,
  members: [],
  balances: [],
  pendingSettlements: [],
  isLoading: false,
  isLoadingMore: false,
  isCreating: false,
  error: null,

  loadForGroup: async (groupId: string) => {
    if (!isSupabaseConfigured) return;

    const { expenseSortAscending } = get();
    set({ groupId, isLoading: true, error: null });

    try {
      const [
        expensePage,
        expenseCount,
        balanceInputs,
        members,
        completedSettlements,
        pendingSettlements,
      ] = await Promise.all([
        fetchGroupExpensesPage(groupId, { sortAscending: expenseSortAscending }),
        fetchGroupExpenseCount(groupId),
        fetchGroupExpensesForBalances(groupId),
        fetchGroupMembers(groupId),
        fetchGroupSettlements(groupId, { status: 'completed' }),
        fetchGroupSettlements(groupId, { status: 'pending' }),
      ]);

      set({
        expenses: expensePage.expenses,
        expenseCount,
        hasMoreExpenses: expensePage.hasMore,
        members,
        balances: calculateBalances(balanceInputs, members, completedSettlements),
        pendingSettlements,
        isLoading: false,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load expenses';
      set({ isLoading: false, error: message });
    }
  },

  loadMoreExpenses: async () => {
    const { groupId, expenses, hasMoreExpenses, expenseSortAscending, isLoading, isLoadingMore } =
      get();

    if (
      !groupId ||
      !hasMoreExpenses ||
      isLoading ||
      isLoadingMore ||
      isLoadingMoreRef
    ) {
      return;
    }

    isLoadingMoreRef = true;
    set({ isLoadingMore: true, error: null });

    try {
      const page = await fetchGroupExpensesPage(groupId, {
        offset: expenses.length,
        sortAscending: expenseSortAscending,
      });

      const seen = new Set(expenses.map((expense) => expense.id));
      const next = page.expenses.filter((expense) => !seen.has(expense.id));

      set({
        expenses: next.length ? [...expenses, ...next] : expenses,
        hasMoreExpenses: page.hasMore,
        isLoadingMore: false,
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Failed to load more expenses';
      set({ isLoadingMore: false, error: message });
    } finally {
      isLoadingMoreRef = false;
    }
  },

  toggleExpenseSort: async () => {
    const { groupId, expenseSortAscending } = get();
    if (!groupId) return;

    const nextSort = !expenseSortAscending;
    set({
      expenseSortAscending: nextSort,
      isLoading: true,
      error: null,
      expenses: [],
      hasMoreExpenses: false,
    });

    try {
      const page = await fetchGroupExpensesPage(groupId, {
        sortAscending: nextSort,
      });

      set({
        expenses: page.expenses,
        hasMoreExpenses: page.hasMore,
        isLoading: false,
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Failed to sort expenses';
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settlements',
          filter: `group_id=eq.${groupId}`,
        },
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
    isLoadingMoreRef = false;
    set({
      groupId: null,
      expenses: [],
      expenseCount: 0,
      expenseSortAscending: false,
      hasMoreExpenses: false,
      members: [],
      balances: [],
      pendingSettlements: [],
      isLoading: false,
      isLoadingMore: false,
      isCreating: false,
      error: null,
    });
  },
}));

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AddExpenseForm } from '@/components/AddExpenseForm';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TopAppBar } from '@/components/TopAppBar';
import { canEditExpense } from '@/lib/expenseForm';
import { getErrorMessage } from '@/lib/errors';
import {
  deleteExpense,
  fetchExpenseById,
  updateExpense,
} from '@/lib/expenses';
import { fetchGroupById, fetchGroupMembers } from '@/lib/groups';
import { goBackOrHome } from '@/lib/navigation';
import { paramString } from '@/lib/routeParams';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useExpensesStore } from '@/stores/expensesStore';
import { useGroupsStore } from '@/stores/groupsStore';
import { usePendingActionsStore } from '@/stores/pendingActionsStore';
import type { Expense } from '@/types/expense';
import type { Group, GroupMember } from '@/types/group';

export default function EditExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    expenseId: string | string[];
    groupId?: string | string[];
  }>();
  const expenseId = paramString(params.expenseId);
  const groupIdParam = paramString(params.groupId);
  const user = useAuthStore((s) => s.user);

  const [expense, setExpense] = useState<Expense | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const load = useCallback(async () => {
    if (!expenseId || !isSupabaseConfigured) {
      setIsLoading(false);
      if (!expenseId) setError('Missing expense id');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const expenseData = await fetchExpenseById(expenseId);
      if (!expenseData) {
        setError('Expense not found');
        setExpense(null);
        return;
      }

      if (!canEditExpense(expenseData, user?.id)) {
        setError('You can only edit expenses you paid for or added.');
        setExpense(expenseData);
        return;
      }

      const gid = groupIdParam ?? expenseData.group_id;
      const [groupData, memberList] = await Promise.all([
        fetchGroupById(gid),
        fetchGroupMembers(gid),
      ]);

      setExpense(expenseData);
      setGroup(groupData);
      setMembers(memberList);
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load expense'));
    } finally {
      setIsLoading(false);
    }
  }, [expenseId, groupIdParam, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const canEdit = expense ? canEditExpense(expense, user?.id) : false;
  const groupId = group?.id ?? expense?.group_id ?? '';

  const groupForForm = useMemo((): Group | null => {
    if (group) return group;
    if (!expense) return null;
    return {
      id: expense.group_id,
      name: 'Group',
      currency: expense.currency ?? 'USD',
      created_by: null,
      created_at: expense.created_at,
      member_count: members.length,
    };
  }, [group, expense, members.length]);

  async function handleSubmit(params: {
    description: string;
    amount: number;
    paidById: string;
    category: string;
    expenseDate: string;
    splits?: { user_id: string; amount_owed: number }[];
  }) {
    if (!expenseId || !canEdit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await updateExpense({
        expenseId,
        description: params.description,
        amount: params.amount,
        paidBy: params.paidById,
        category: params.category,
        expenseDate: params.expenseDate,
        splits: params.splits,
      });
      if (groupId) {
        await useExpensesStore.getState().loadForGroup(groupId);
        await useGroupsStore.getState().fetchGroups();
        await usePendingActionsStore.getState().refresh();
      }
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to update expense'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function performDelete() {
    if (!expenseId) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await deleteExpense(expenseId);
      setDeleteConfirmVisible(false);
      if (groupId) {
        await useExpensesStore.getState().loadForGroup(groupId);
        await useGroupsStore.getState().fetchGroups();
        await usePendingActionsStore.getState().refresh();
      }
      router.replace(`/group/${groupId}`);
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to delete expense'));
      setIsSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <TopAppBar title="Edit expense" showBack />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1D9E75" />
        </View>
      ) : !canEdit ? (
        <View className="flex-1 items-center justify-center gap-md px-container-margin">
          <Text className="text-center font-sans text-body-lg text-on-surface-variant">
            {error ?? 'You can only edit expenses you paid for.'}
          </Text>
          <Pressable
            onPress={() => goBackOrHome(router)}
            className="rounded-lg border border-outline-variant px-lg py-sm"
          >
            <Text className="font-sans-semibold text-label-md text-primary">Go back</Text>
          </Pressable>
        </View>
      ) : expense && groupForForm && members.length > 0 ? (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 24,
              paddingBottom: 40,
              maxWidth: 768,
              width: '100%',
              alignSelf: 'center',
            }}
            keyboardShouldPersistTaps="handled"
          >
            <AddExpenseForm
              mode="edit"
              groups={[groupForForm]}
              groupId={groupId}
              currencyCode={groupForForm.currency}
              onGroupChange={() => {}}
              members={members}
              currentUserId={user?.id}
              initialExpense={expense}
              onSubmit={handleSubmit}
              onCancel={() => goBackOrHome(router)}
              onDelete={() => setDeleteConfirmVisible(true)}
              isSubmitting={isSubmitting}
              error={error}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View className="flex-1 items-center justify-center gap-md px-container-margin">
          <Text className="text-center font-sans text-body-lg text-on-surface-variant">
            {error ?? 'Could not load expense details.'}
          </Text>
          <Pressable
            onPress={() => goBackOrHome(router)}
            className="rounded-lg border border-outline-variant px-lg py-sm"
          >
            <Text className="font-sans-semibold text-label-md text-primary">Go back</Text>
          </Pressable>
        </View>
      )}

      <ConfirmDialog
        visible={deleteConfirmVisible}
        title="Delete expense?"
        message="This cannot be undone. Balances will be recalculated."
        confirmLabel="Delete"
        destructive
        isLoading={isSubmitting}
        onCancel={() => !isSubmitting && setDeleteConfirmVisible(false)}
        onConfirm={performDelete}
      />
    </View>
  );
}

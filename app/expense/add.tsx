import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AddExpenseForm } from '@/components/AddExpenseForm';
import { TopAppBar } from '@/components/TopAppBar';
import {
  getPushNotificationHelpMessage,
  registerForPushNotifications,
} from '@/lib/notifications';
import { createExpense } from '@/lib/expenses';
import { fetchGroupMembers, fetchUserGroups } from '@/lib/groups';
import { goBackOrHome } from '@/lib/navigation';
import { getErrorMessage } from '@/lib/errors';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useExpensesStore } from '@/stores/expensesStore';
import { useGroupsStore } from '@/stores/groupsStore';
import { usePendingActionsStore } from '@/stores/pendingActionsStore';
import type { Group, GroupMember } from '@/types/group';

export default function AddExpenseScreen() {
  const router = useRouter();
  const { groupId: initialGroupId } = useLocalSearchParams<{ groupId?: string }>();
  const user = useAuthStore((s) => s.user);

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState(initialGroupId ?? '');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const list = await fetchUserGroups();
      setGroups(list);

      if (list.length === 0) {
        setGroupId('');
        setMembers([]);
      } else if (initialGroupId && list.some((g) => g.id === initialGroupId)) {
        setGroupId(initialGroupId);
      } else {
        setGroupId((current) =>
          current && list.some((g) => g.id === current) ? current : list[0].id
        );
      }
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load groups'));
    } finally {
      setIsLoading(false);
    }
  }, [initialGroupId]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (!groupId || !isSupabaseConfigured) {
      setMembers([]);
      return;
    }

    let cancelled = false;

    fetchGroupMembers(groupId)
      .then((data) => {
        if (!cancelled) setMembers(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(getErrorMessage(e, 'Failed to load group members'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  async function handleEnableNotifications() {
    const token = await registerForPushNotifications();
    Alert.alert(
      token ? 'Notifications enabled' : 'Could not enable notifications',
      token
        ? 'Your device is registered for expense alerts.'
        : getPushNotificationHelpMessage()
    );
  }

  async function handleSubmit(params: {
    description: string;
    amount: number;
    paidById: string;
    category: string;
    expenseDate: string;
    splits?: { user_id: string; amount_owed: number }[];
  }) {
    if (!groupId || !user?.id) {
      setError('You must be signed in to add an expense.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createExpense({
        groupId,
        description: params.description,
        amount: params.amount,
        paidBy: params.paidById,
        category: params.category,
        expenseDate: params.expenseDate,
        splits: params.splits,
      });
      await useExpensesStore.getState().loadForGroup(groupId);
      await useGroupsStore.getState().fetchGroups();
      await usePendingActionsStore.getState().refresh();
      router.replace(`/group/${groupId}`);
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to save expense'));
      setIsSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <TopAppBar
        title="Add New Expense"
        showBack
        hasNotifications
        onNotificationsPress={handleEnableNotifications}
      />

      {!isSupabaseConfigured ? (
        <View className="flex-1 items-center justify-center px-container-margin">
          <ActivityIndicator size="large" color="#0F6E56" />
        </View>
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0F6E56" />
        </View>
      ) : groups.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-md px-container-margin">
          <Text className="text-center font-sans text-body-lg text-on-surface-variant">
            Create a group first, then you can add a shared expense.
          </Text>
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            className="rounded-lg bg-primary px-lg py-sm active:opacity-90"
          >
            <Text className="font-sans-semibold text-label-md text-on-primary">
              Go to dashboard
            </Text>
          </Pressable>
        </View>
      ) : (
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
              groups={groups}
              groupId={groupId}
              currencyCode={
                groups.find((g) => g.id === groupId)?.currency ?? 'USD'
              }
              onGroupChange={setGroupId}
              members={members}
              currentUserId={user?.id}
              onSubmit={handleSubmit}
              onCancel={() => goBackOrHome(router)}
              isSubmitting={isSubmitting}
              error={error}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { ExpenseDetailView } from '@/components/ExpenseDetailView';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { uiColors } from '@/constants/theme';
import { canEditExpense } from '@/lib/expenseForm';
import { getErrorMessage } from '@/lib/errors';
import { fetchExpenseById } from '@/lib/expenses';
import { fetchGroupById, fetchGroupMembers } from '@/lib/groups';
import { memberDisplayName } from '@/lib/members';
import { goBackOrHome } from '@/lib/navigation';
import { paramString } from '@/lib/routeParams';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { Expense } from '@/types/expense';
import type { Group, GroupMember } from '@/types/group';

export default function ExpenseDetailScreen() {
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
  const [error, setError] = useState<string | null>(null);

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
  }, [expenseId, groupIdParam]);

  useEffect(() => {
    load();
  }, [load]);

  const memberNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const member of members) {
      map[member.user_id] = memberDisplayName(member);
    }
    return map;
  }, [members]);

  const canEdit = expense ? canEditExpense(expense, user?.id) : false;
  const groupId = group?.id ?? expense?.group_id ?? '';

  function openEdit() {
    if (!expense) return;
    router.push(
      `/expense/edit?expenseId=${expense.id}&groupId=${groupId}`
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader variant="stack" title="Expense details" showBack />

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={uiColors.iconOnLight} />
        </View>
      ) : error || !expense ? (
        <View className="flex-1 items-center justify-center gap-md px-container-margin">
          <Text className="text-center font-sans text-body-lg text-on-surface-variant">
            {error ?? 'Could not load expense details.'}
          </Text>
          <Pressable
            onPress={() => goBackOrHome(router)}
            className="rounded-lg border border-outline-variant px-lg py-sm"
          >
            <Text className="font-sans-semibold text-label-md text-primary">
              Go back
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: canEdit ? 96 : 40,
            maxWidth: 768,
            width: '100%',
            alignSelf: 'center',
          }}
        >
          <ExpenseDetailView
            expense={expense}
            currentUserId={user?.id}
            memberNameById={memberNameById}
            groupName={group?.name}
          />
        </ScrollView>
      )}

      {canEdit && expense ? (
        <View className="absolute bottom-0 left-0 right-0 border-t border-outline-variant/30 bg-background px-container-margin py-md">
          <Pressable
            onPress={openEdit}
            className="items-center rounded-xl bg-primary py-md active:opacity-90"
          >
            <Text className="font-sans-semibold text-body-md text-on-primary">
              Edit expense
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

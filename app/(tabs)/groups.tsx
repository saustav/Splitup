import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';

import { GroupCard } from '@/components/GroupCard';
import { OutlineButton } from '@/components/ui/Buttons';
import { EmptyState } from '@/components/ui/Buttons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { layout } from '@/constants/layout';
import { uiColors } from '@/constants/theme';
import { fetchDashboardSummary } from '@/lib/dashboard';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useGroupsStore } from '@/stores/groupsStore';
import { usePendingActionsStore } from '@/stores/pendingActionsStore';
import type { Group } from '@/types/group';

export default function GroupsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const groups = useGroupsStore((s) => s.groups);
  const isLoading = useGroupsStore((s) => s.isLoading);
  const error = useGroupsStore((s) => s.error);
  const fetchGroups = useGroupsStore((s) => s.fetchGroups);
  const subscribe = useGroupsStore((s) => s.subscribe);
  const unsubscribe = useGroupsStore((s) => s.unsubscribe);
  const countByGroupId = usePendingActionsStore((s) => s.countByGroupId);
  const notificationCount = usePendingActionsStore((s) => s.totalCount);
  const openNotifications = usePendingActionsStore((s) => s.openSheet);
  const refreshPendingActions = usePendingActionsStore((s) => s.refresh);

  const [balancesByGroup, setBalancesByGroup] = useState<
    Record<string, { netBalance: number; lastActiveAt: string | null }>
  >({});

  const loadBalances = useCallback(async () => {
    if (!user?.id) return;
    const data = await fetchDashboardSummary(user.id);
    const map: Record<string, { netBalance: number; lastActiveAt: string | null }> =
      {};
    for (const item of data.groupBalances) {
      map[item.group.id] = {
        netBalance: item.netBalance,
        lastActiveAt: item.lastActiveAt,
      };
    }
    setBalancesByGroup(map);
  }, [user?.id]);

  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      fetchGroups();
      void loadBalances();
      refreshPendingActions();
    }, [user?.id, fetchGroups, loadBalances, refreshPendingActions])
  );

  const handleRefresh = useCallback(() => {
    fetchGroups();
    void loadBalances();
    refreshPendingActions();
  }, [fetchGroups, loadBalances, refreshPendingActions]);

  function openGroup(group: Group) {
    router.push(`/group/${group.id}`);
  }

  if (!isSupabaseConfigured) {
    return (
      <View className="flex-1 bg-background">
        <ScreenHeader variant="tab" title="Groups" />
        <View className="flex-1 items-center justify-center px-container-margin">
          <Text className="text-center font-sans text-body-md text-on-surface-variant">
            Add Supabase keys to .env to create and sync groups.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        variant="tab"
        title="Groups"
        notificationCount={notificationCount}
        onNotificationsPress={openNotifications}
      />

      {isLoading && groups.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={uiColors.iconOnLight} />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: layout.screenPadding,
            paddingTop: 8,
            paddingBottom: layout.tabScrollBottom,
          }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              title="No groups yet"
              message="Create a group or join one with an invite code."
            >
              <OutlineButton
                label="Join with code"
                onPress={() => router.push('/invite/join')}
              />
            </EmptyState>
          }
          renderItem={({ item }) => (
            <GroupCard
              group={item}
              netBalance={balancesByGroup[item.id]?.netBalance}
              lastActiveAt={balancesByGroup[item.id]?.lastActiveAt}
              pendingActionCount={countByGroupId[item.id] ?? 0}
              onPress={() => openGroup(item)}
            />
          )}
        />
      )}

      {error ? (
        <View className="mx-4 mb-2 rounded-card bg-error-container p-3">
          <Text className="text-center font-sans text-body-md text-on-error-container">
            {error}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';

import { GroupCard } from '@/components/GroupCard';
import { TopAppBar } from '@/components/TopAppBar';
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
  const refreshPendingActions = usePendingActionsStore((s) => s.refresh);

  const [balancesByGroup, setBalancesByGroup] = useState<
    Record<string, number>
  >({});

  const loadBalances = useCallback(async () => {
    if (!user?.id) return;
    const data = await fetchDashboardSummary(user.id);
    const map: Record<string, number> = {};
    for (const item of data.groupBalances) {
      map[item.group.id] = item.netBalance;
    }
    setBalancesByGroup(map);
  }, [user?.id]);

  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
      void loadBalances();
      refreshPendingActions();
    }, [fetchGroups, loadBalances, refreshPendingActions]),
  );

  const handleRefresh = useCallback(() => {
    fetchGroups();
    refreshPendingActions();
  }, [fetchGroups, refreshPendingActions]);

  function openGroup(group: Group) {
    router.push(`/group/${group.id}`);
  }

  if (!isSupabaseConfigured) {
    return (
      <View className="flex-1 bg-background">
        <TopAppBar />
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
      <TopAppBar showBack />

      {isLoading && groups.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1D9E75" />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 24,
            paddingBottom: 120,
          }}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
          }
          ListHeaderComponent={
            <Text className="mb-stack-gap font-sans-semibold text-headline-sm text-on-surface">
              All Groups
            </Text>
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="font-sans-semibold text-body-lg text-on-surface">
                No groups yet
              </Text>
              <Text className="mt-2 text-center font-sans text-body-md text-on-surface-variant">
                Create a group or join one with an invite code.
              </Text>
              <Pressable
                onPress={() => router.push('/invite/join')}
                className="mt-4 rounded-full border border-outline-variant px-md py-sm active:bg-surface-container-low"
              >
                <Text className="font-sans-semibold text-body-md text-primary">
                  Join with code
                </Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <View className="mb-stack-gap">
              <GroupCard
                group={item}
                netBalance={balancesByGroup[item.id]}
                pendingActionCount={countByGroupId[item.id] ?? 0}
                onPress={() => openGroup(item)}
              />
            </View>
          )}
        />
      )}

      {error && (
        <View className="mx-4 mb-2 rounded-lg bg-error-container p-3">
          <Text className="text-center font-sans text-body-md text-on-error-container">
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

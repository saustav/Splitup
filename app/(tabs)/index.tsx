import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { BalanceOverviewCard } from '@/components/BalanceOverviewCard';
import { GroupCard } from '@/components/GroupCard';
import { TopAppBar } from '@/components/TopAppBar';
import { useProfileDisplayCurrency } from '@/hooks/useProfileDisplayCurrency';
import { fetchDashboardSummary, type GroupBalanceSummary } from '@/lib/dashboard';
import { convertCurrencyBatch } from '@/lib/currency';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useGroupsStore } from '@/stores/groupsStore';
import { usePendingActionsStore } from '@/stores/pendingActionsStore';

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [summary, setSummary] = useState<{
    totalBalance: number;
    groupBalances: GroupBalanceSummary[];
  }>({ totalBalance: 0, groupBalances: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [convertedTotal, setConvertedTotal] = useState<number | null>(null);
  const [isConvertingTotal, setIsConvertingTotal] = useState(false);
  const { defaultCurrency, showConverted } = useProfileDisplayCurrency(user?.id);
  const openCreateGroupModal = useGroupsStore((s) => s.openCreateGroupModal);
  const storeGroups = useGroupsStore((s) => s.groups);
  const fetchGroups = useGroupsStore((s) => s.fetchGroups);
  const subscribe = useGroupsStore((s) => s.subscribe);
  const unsubscribe = useGroupsStore((s) => s.unsubscribe);
  const notificationCount = usePendingActionsStore((s) => s.totalCount);
  const countByGroupId = usePendingActionsStore((s) => s.countByGroupId);
  const openNotifications = usePendingActionsStore((s) => s.openSheet);
  const refreshPendingActions = usePendingActionsStore((s) => s.refresh);

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (!user?.id) {
        setSummary({ totalBalance: 0, groupBalances: [] });
        setIsLoading(false);
        return;
      }

      if (!silent) setIsLoading(true);

      try {
        const data = await fetchDashboardSummary(user.id);
        setSummary(data);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
      loadDashboard(true);
      refreshPendingActions();
    }, [fetchGroups, loadDashboard, refreshPendingActions])
  );

  useEffect(() => {
    if (!showConverted || summary.groupBalances.length === 0) {
      setConvertedTotal(null);
      setIsConvertingTotal(false);
      return;
    }

    const hasForeign = summary.groupBalances.some(
      (g) => g.group.currency.toUpperCase() !== defaultCurrency.toUpperCase()
    );
    if (!hasForeign) {
      setConvertedTotal(summary.totalBalance);
      setIsConvertingTotal(false);
      return;
    }

    let cancelled = false;
    setIsConvertingTotal(true);

    convertCurrencyBatch(
      summary.groupBalances.map((item) => ({
        amount: item.netBalance,
        fromCurrency: item.group.currency,
      })),
      defaultCurrency
    )
      .then((total) => {
        if (!cancelled) {
          setConvertedTotal(total);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsConvertingTotal(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [summary, defaultCurrency, showConverted]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchGroups();
    loadDashboard(true);
    refreshPendingActions();
  }, [fetchGroups, loadDashboard, refreshPendingActions]);

  const activeGroups = useMemo(() => {
    const balanceById = Object.fromEntries(
      summary.groupBalances.map((item) => [item.group.id, item.netBalance])
    );
    const merged = new Map<string, GroupBalanceSummary>();

    for (const group of storeGroups) {
      merged.set(group.id, {
        group,
        netBalance: balanceById[group.id] ?? 0,
      });
    }

    for (const item of summary.groupBalances) {
      if (!merged.has(item.group.id)) {
        merged.set(item.group.id, item);
      }
    }

    return [...merged.values()]
      .sort(
        (a, b) =>
          new Date(b.group.created_at).getTime() -
          new Date(a.group.created_at).getTime()
      )
      .slice(0, 5);
  }, [storeGroups, summary.groupBalances]);

  const hasNoGroups =
    storeGroups.length === 0 && summary.groupBalances.length === 0;

  return (
    <View className="flex-1 bg-background">
      <TopAppBar
        showNotifications
        notificationCount={notificationCount}
        onNotificationsPress={openNotifications}
      />

      {!isSupabaseConfigured ? (
        <View className="flex-1 items-center justify-center px-container-margin">
          <Text className="text-center font-sans text-body-md text-on-surface-variant">
            Add Supabase keys to .env to sync groups and balances.
          </Text>
        </View>
      ) : isLoading && hasNoGroups ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1D9E75" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 24,
            paddingBottom: 32,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#1D9E75"
            />
          }
        >
          <View className="mb-lg">
            <BalanceOverviewCard
              totalBalance={summary.totalBalance}
              primaryCurrency={
                summary.groupBalances[0]?.group.currency ?? defaultCurrency
              }
              convertedTotal={convertedTotal}
              displayCurrency={defaultCurrency}
              isConverting={isConvertingTotal}
              showConvertedPrimary={showConverted}
            />
          </View>

          <View>
            <View className="mb-stack-gap flex-row items-center justify-between">
              <Text className="font-sans-semibold text-headline-sm text-on-surface">
                Active Groups
              </Text>
              <Pressable onPress={() => router.push('/(tabs)/groups')}>
                <Text className="font-sans-semibold text-label-md text-primary">
                  View All
                </Text>
              </Pressable>
            </View>

            {hasNoGroups ? (
              <View className="items-center rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest py-12">
                <Text className="font-sans-semibold text-body-lg text-on-surface">
                  No groups yet
                </Text>
                <Text className="mt-2 px-6 text-center font-sans text-body-md text-on-surface-variant">
                  Create a group to start splitting expenses with friends.
                </Text>
                <View className="mt-4 flex-row flex-wrap items-center justify-center gap-sm">
                  <Pressable
                    onPress={openCreateGroupModal}
                    className="rounded-full bg-primary px-md py-sm active:opacity-80"
                  >
                    <Text className="font-sans-semibold text-body-md text-on-primary">
                      Create group
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => router.push('/invite/join')}
                    className="rounded-full border border-outline-variant bg-background px-md py-sm active:bg-surface-container-low"
                  >
                    <Text className="font-sans-semibold text-body-md text-primary">
                      Join with code
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View className="gap-stack-gap">
                {activeGroups.map(({ group, netBalance }) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    netBalance={netBalance}
                    pendingActionCount={countByGroupId[group.id] ?? 0}
                    onPress={() => router.push(`/group/${group.id}`)}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

    </View>
  );
}

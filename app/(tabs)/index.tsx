import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { DashboardBalanceCard } from '@/components/DashboardBalanceCard';
import { DashboardGroupCard } from '@/components/DashboardGroupCard';
import { DashboardHeader } from '@/components/DashboardHeader';
import { DashboardQuickActions } from '@/components/DashboardQuickActions';
import { uiColors } from '@/constants/theme';
import { useProfileDisplayCurrency } from '@/hooks/useProfileDisplayCurrency';
import { BALANCE_ZERO_THRESHOLD } from '@/lib/balances';
import { fetchDashboardSummary, type GroupBalanceSummary } from '@/lib/dashboard';
import { convertCurrencyBatch } from '@/lib/currency';
import {
  displayNameFromProfile,
  fetchUserProfile,
  type UserProfile,
} from '@/lib/profile';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useGroupsStore } from '@/stores/groupsStore';
import { usePendingActionsStore } from '@/stores/pendingActionsStore';

type ConvertedSummary = {
  net: number | null;
  youOwe: number | null;
  owedToYou: number | null;
};

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<{
    totalBalance: number;
    totalYouOwe: number;
    totalOwedToYou: number;
    groupBalances: GroupBalanceSummary[];
  }>({
    totalBalance: 0,
    totalYouOwe: 0,
    totalOwedToYou: 0,
    groupBalances: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [convertedSummary, setConvertedSummary] = useState<ConvertedSummary>({
    net: null,
    youOwe: null,
    owedToYou: null,
  });
  const [isConverting, setIsConverting] = useState(false);

  const { defaultCurrency, showConverted } = useProfileDisplayCurrency(user?.id);
  const openCreateGroupModal = useGroupsStore((s) => s.openCreateGroupModal);
  const storeGroups = useGroupsStore((s) => s.groups);
  const fetchGroups = useGroupsStore((s) => s.fetchGroups);
  const subscribe = useGroupsStore((s) => s.subscribe);
  const unsubscribe = useGroupsStore((s) => s.unsubscribe);
  const notificationCount = usePendingActionsStore((s) => s.totalCount);
  const openNotifications = usePendingActionsStore((s) => s.openSheet);
  const refreshPendingActions = usePendingActionsStore((s) => s.refresh);

  const displayName = displayNameFromProfile(profile, user?.email ?? undefined);
  const primaryCurrency =
    summary.groupBalances[0]?.group.currency ?? defaultCurrency;

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (!user?.id) {
        setSummary({
          totalBalance: 0,
          totalYouOwe: 0,
          totalOwedToYou: 0,
          groupBalances: [],
        });
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
    if (!user?.id) {
      setProfile(null);
      return;
    }

    let cancelled = false;
    void fetchUserProfile(user.id, user.email ?? '').then((row) => {
      if (!cancelled) setProfile(row);
    });

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email]);

  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      fetchGroups();
      loadDashboard(true);
      refreshPendingActions();
    }, [user?.id, fetchGroups, loadDashboard, refreshPendingActions])
  );

  useEffect(() => {
    if (!showConverted || summary.groupBalances.length === 0) {
      setConvertedSummary({ net: null, youOwe: null, owedToYou: null });
      setIsConverting(false);
      return;
    }

    const hasForeign = summary.groupBalances.some(
      (item) =>
        item.group.currency.toUpperCase() !== defaultCurrency.toUpperCase()
    );

    if (!hasForeign) {
      setConvertedSummary({
        net: summary.totalBalance,
        youOwe: summary.totalYouOwe,
        owedToYou: summary.totalOwedToYou,
      });
      setIsConverting(false);
      return;
    }

    let cancelled = false;
    setIsConverting(true);

    Promise.all([
      convertCurrencyBatch(
        summary.groupBalances.map((item) => ({
          amount: item.netBalance,
          fromCurrency: item.group.currency,
        })),
        defaultCurrency
      ),
      convertCurrencyBatch(
        summary.groupBalances
          .filter((item) => item.netBalance < -BALANCE_ZERO_THRESHOLD)
          .map((item) => ({
            amount: Math.abs(item.netBalance),
            fromCurrency: item.group.currency,
          })),
        defaultCurrency
      ),
      convertCurrencyBatch(
        summary.groupBalances
          .filter((item) => item.netBalance > BALANCE_ZERO_THRESHOLD)
          .map((item) => ({
            amount: item.netBalance,
            fromCurrency: item.group.currency,
          })),
        defaultCurrency
      ),
    ])
      .then(([net, youOwe, owedToYou]) => {
        if (!cancelled) {
          setConvertedSummary({
            net,
            youOwe: youOwe ?? 0,
            owedToYou: owedToYou ?? 0,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setIsConverting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [summary, defaultCurrency, showConverted]);

  const handleRefresh = useCallback(() => {
    if (!user?.id) return;
    setIsRefreshing(true);
    fetchGroups();
    loadDashboard(true);
    refreshPendingActions();
  }, [user?.id, fetchGroups, loadDashboard, refreshPendingActions]);

  const activeGroups = useMemo(() => {
    const balanceById = Object.fromEntries(
      summary.groupBalances.map((item) => [item.group.id, item])
    );
    const merged = new Map<string, GroupBalanceSummary>();

    for (const group of storeGroups) {
      const existing = balanceById[group.id];
      merged.set(group.id, {
        group,
        netBalance: existing?.netBalance ?? 0,
        lastActiveAt: existing?.lastActiveAt ?? null,
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

  function handleSettleUp() {
    const owingGroups = activeGroups
      .filter((item) => item.netBalance < -BALANCE_ZERO_THRESHOLD)
      .sort((a, b) => a.netBalance - b.netBalance);

    if (owingGroups.length === 0) {
      Alert.alert(
        'Nothing to settle',
        'You do not owe anyone across your active groups.'
      );
      return;
    }

    router.push(`/group/${owingGroups[0].group.id}/settle`);
  }

  return (
    <View className="flex-1 bg-background">
      <DashboardHeader
        displayName={displayName}
        avatarUrl={profile?.avatar_url}
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
          <ActivityIndicator size="large" color={uiColors.iconOnLight} />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 4,
            paddingBottom: 32,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={uiColors.iconOnLight}
            />
          }
        >
          <DashboardBalanceCard
            netBalance={summary.totalBalance}
            totalYouOwe={summary.totalYouOwe}
            totalOwedToYou={summary.totalOwedToYou}
            currency={primaryCurrency}
            convertedNetBalance={convertedSummary.net}
            convertedYouOwe={convertedSummary.youOwe}
            convertedOwedToYou={convertedSummary.owedToYou}
            displayCurrency={defaultCurrency}
            isConverting={isConverting}
            showConverted={showConverted}
          />

          <View className="mt-lg">
            <View className="mb-stack-gap flex-row items-center justify-between">
              <Text className="font-sans-medium text-body-lg text-on-surface">
                Active groups
              </Text>
              <Pressable onPress={() => router.push('/(tabs)/groups')}>
                <Text className="font-sans-medium text-label-md text-brand-primary">
                  View all
                </Text>
              </Pressable>
            </View>

            {hasNoGroups ? (
              <View className="items-center rounded-[14px] border border-dashed border-outline-variant bg-surface-container-low px-md py-12">
                <Text className="font-sans-medium text-body-lg text-on-surface">
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
              <View>
                {activeGroups.map(({ group, netBalance, lastActiveAt }) => (
                  <DashboardGroupCard
                    key={group.id}
                    group={group}
                    netBalance={netBalance}
                    lastActiveAt={lastActiveAt}
                    onPress={() => router.push(`/group/${group.id}`)}
                  />
                ))}
              </View>
            )}
          </View>

          <View className="mt-lg">
            <DashboardQuickActions
              onAddExpense={() => router.push('/expense/add')}
              onSettleUp={handleSettleUp}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

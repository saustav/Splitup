import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ActivityCard } from '@/components/ActivityCard';
import { ActivityFilters } from '@/components/ActivityFilters';
import { EmptyState } from '@/components/ui/Buttons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { layout } from '@/constants/layout';
import { uiColors } from '@/constants/theme';
import {
  activityFilterCounts,
  filterActivities,
  groupActivitiesByDay,
  searchActivities,
  fetchUserActivityPage,
  type ActivityFilter,
  type ActivityItem,
} from '@/lib/activity';
import { getErrorMessage } from '@/lib/errors';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { usePendingActionsStore } from '@/stores/pendingActionsStore';

function mergeActivityItems(
  existing: ActivityItem[],
  incoming: ActivityItem[],
): ActivityItem[] {
  if (!incoming.length) return existing;

  const seen = new Set(existing.map((item) => item.id));
  const next = incoming.filter((item) => !seen.has(item.id));
  if (!next.length) return existing;

  return [...existing, ...next];
}

export default function ActivityScreen() {
  const user = useAuthStore((s) => s.user);
  const notificationCount = usePendingActionsStore((s) => s.totalCount);
  const openNotifications = usePendingActionsStore((s) => s.openSheet);
  const refreshPendingActions = usePendingActionsStore((s) => s.refresh);

  const [items, setItems] = useState<ActivityItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const isLoadingMoreRef = useRef(false);

  const loadInitial = useCallback(
    async (silent = false) => {
      if (!user?.id || !isSupabaseConfigured) {
        setItems([]);
        setCursor(null);
        setHasMore(false);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (!silent) setIsLoading(true);
      setError(null);

      try {
        const page = await fetchUserActivityPage(user.id, { includeLegacy: true });
        setItems(page.items);
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch (e) {
        setError(getErrorMessage(e, 'Failed to load activity'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user?.id],
  );

  const loadMore = useCallback(async () => {
    if (
      !user?.id ||
      !isSupabaseConfigured ||
      !hasMore ||
      !cursor ||
      isLoadingMoreRef.current
    ) {
      return;
    }

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const page = await fetchUserActivityPage(user.id, { cursor });
      setItems((current) => mergeActivityItems(current, page.items));
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (e) {
      setError(getErrorMessage(e, 'Failed to load more activity'));
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [cursor, hasMore, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadInitial(true);
      refreshPendingActions();
    }, [loadInitial, refreshPendingActions]),
  );

  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`activity-feed-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_events',
        },
        () => {
          loadInitial(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadInitial]);

  const filtered = useMemo(() => {
    const byType = filterActivities(items, filter);
    return searchActivities(byType, searchQuery);
  }, [items, filter, searchQuery]);

  const sections = useMemo(
    () =>
      groupActivitiesByDay(filtered).map((group) => ({
        title: group.label,
        data: group.items,
      })),
    [filtered],
  );

  const counts = useMemo(() => activityFilterCounts(items), [items]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadInitial(true);
    refreshPendingActions();
  }, [loadInitial, refreshPendingActions]);

  const listHeader = useMemo(
    () => (
      <View className="gap-lg">
        <ActivityFilters active={filter} counts={counts} onChange={setFilter} />

        <View className="relative">
          <MaterialIcons
            name="search"
            size={20}
            color={uiColors.muted}
            style={{ position: 'absolute', left: 14, top: 12, zIndex: 1 }}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search activity…"
            placeholderTextColor={uiColors.muted}
            className="rounded-card border border-outline-variant/40 bg-surface-container-low py-sm pl-10 pr-md font-sans text-body-md text-on-surface"
          />
        </View>

        {isRefreshing && !isLoading ? (
          <Text className="text-center font-sans text-label-md text-primary">
            Refreshing from Supabase…
          </Text>
        ) : null}
      </View>
    ),
    [counts, filter, isLoading, isRefreshing, searchQuery],
  );

  const listFooter = useMemo(
    () => (
      <View className="gap-lg pt-lg">
        {isLoadingMore ? (
          <View className="items-center py-md">
            <ActivityIndicator size="small" color={uiColors.iconOnLight} />
            <Text className="mt-sm font-sans text-label-md text-on-surface-variant">
              Loading more…
            </Text>
          </View>
        ) : null}

        {!isLoading && !hasMore && items.length > 0 ? (
          <Text className="text-center font-sans text-label-md text-on-surface-variant">
            You&apos;re all caught up
          </Text>
        ) : null}
      </View>
    ),
    [hasMore, isLoading, isLoadingMore, items.length],
  );

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        variant="tab"
        title="Activity"
        notificationCount={notificationCount}
        onNotificationsPress={openNotifications}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ActivityCard item={item} />}
        renderSectionHeader={({ section: { title } }) => (
          <Text className="mb-sm mt-md bg-background px-sm font-sans-semibold text-label-md text-on-surface-variant">
            {title}
          </Text>
        )}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: 8,
          paddingBottom: layout.tabScrollBottom,
          maxWidth: layout.contentMaxWidth,
          width: '100%',
          alignSelf: 'center',
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={uiColors.iconOnLight}
            colors={[uiColors.iconOnLight]}
            title={isRefreshing ? 'Refreshing…' : undefined}
          />
        }
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color={uiColors.iconOnLight} />
            </View>
          ) : error ? (
            <View className="rounded-xl bg-error-container p-md">
              <Text className="text-center font-sans text-body-md text-on-error-container">
                {error}
              </Text>
              <Text
                onPress={handleRefresh}
                className="mt-sm text-center font-sans-semibold text-body-md text-primary"
              >
                Tap to retry
              </Text>
            </View>
          ) : (
            <EmptyState
              title="No activity yet"
              message="Add an expense, share an invite, or settle up in a group to see updates here. Pull down to refresh."
            />
          )
        }
      />
    </View>
  );
}

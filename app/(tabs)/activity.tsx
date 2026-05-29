import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ActivityCard } from '@/components/ActivityCard';
import { ActivityFilters } from '@/components/ActivityFilters';
import { TopAppBar } from '@/components/TopAppBar';
import {
  activityFilterCounts,
  filterActivities,
  groupActivitiesByDay,
  searchActivities,
  fetchUserActivity,
  type ActivityFilter,
  type ActivityItem,
} from '@/lib/activity';
import { getErrorMessage } from '@/lib/errors';
import {
  getPushNotificationHelpMessage,
  registerForPushNotifications,
} from '@/lib/notifications';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function ActivityScreen() {
  const user = useAuthStore((s) => s.user);

  const [items, setItems] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const load = useCallback(
    async (silent = false) => {
      if (!user?.id || !isSupabaseConfigured) {
        setItems([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (!silent) setIsLoading(true);
      setError(null);

      try {
        const data = await fetchUserActivity(user.id);
        setItems(data);
      } catch (e) {
        setError(getErrorMessage(e, 'Failed to load activity'));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    load();
  }, [load]);

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
          load(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, load]);

  const filtered = useMemo(() => {
    const byType = filterActivities(items, filter);
    return searchActivities(byType, searchQuery);
  }, [items, filter, searchQuery]);

  const dayGroups = useMemo(() => groupActivitiesByDay(filtered), [filtered]);
  const counts = useMemo(() => activityFilterCounts(items), [items]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    load(true);
  }, [load]);

  async function handleEnableNotifications() {
    const token = await registerForPushNotifications();
    Alert.alert(
      token ? 'Notifications enabled' : 'Could not enable notifications',
      token
        ? 'Your device is registered for expense alerts.'
        : getPushNotificationHelpMessage()
    );
  }

  return (
    <View className="flex-1 bg-background">
      <TopAppBar
        title="Activity Feed"
        hasNotifications
        onNotificationsPress={handleEnableNotifications}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 120,
          maxWidth: 900,
          width: '100%',
          alignSelf: 'center',
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#006c49"
            colors={['#006c49']}
            title={isRefreshing ? 'Refreshing…' : undefined}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        <View className="relative mb-lg">
          <MaterialIcons
            name="search"
            size={20}
            color="#6c7a71"
            style={{ position: 'absolute', left: 14, top: 12, zIndex: 1 }}
          />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search activity…"
            placeholderTextColor="#6c7a71"
            className="rounded-full border border-outline-variant bg-surface py-sm pl-10 pr-md font-sans text-body-md text-on-surface"
          />
        </View>

        {isRefreshing && !isLoading ? (
          <Text className="mb-sm text-center font-sans text-label-md text-primary">
            Refreshing from Supabase…
          </Text>
        ) : null}

        <View className="flex-col gap-lg">
          <View className="flex-1 gap-stack-gap">
            {isLoading ? (
              <View className="items-center py-16">
                <ActivityIndicator size="large" color="#006c49" />
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
            ) : dayGroups.length === 0 ? (
              <View className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-lg">
                <Text className="text-center font-sans-semibold text-body-lg text-on-surface">
                  No activity yet
                </Text>
                <Text className="mt-2 text-center font-sans text-body-md text-on-surface-variant">
                  Add an expense, share an invite, or settle up in a group to see
                  updates here. Pull down to refresh.
                </Text>
              </View>
            ) : (
              dayGroups.map((group) => (
                <View key={group.label}>
                  <Text className="mb-sm px-sm font-sans-semibold text-label-md text-on-surface-variant">
                    {group.label}
                  </Text>
                  <View className="gap-sm">
                    {group.items.map((item) => (
                      <ActivityCard key={item.id} item={item} />
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>

          <ActivityFilters active={filter} counts={counts} onChange={setFilter} />
        </View>
      </ScrollView>
    </View>
  );
}

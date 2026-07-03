import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const KEY = (userId: string) => `notifications_last_seen:${userId}`;

const DEFAULT_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

export async function getNotificationsLastSeen(userId: string): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(KEY(userId));
    if (raw) return raw;
  } catch {
    /* use default lookback */
  }
  return new Date(Date.now() - DEFAULT_LOOKBACK_MS).toISOString();
}

export async function markNotificationLogRead(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;

  const now = new Date().toISOString();
  await supabase
    .from('notification_log')
    .update({ read_at: now })
    .eq('user_id', userId)
    .is('read_at', null);
}

export async function markNotificationsSeen(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await AsyncStorage.setItem(KEY(userId), now);
  await markNotificationLogRead(userId);
}

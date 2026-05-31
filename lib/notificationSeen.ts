import AsyncStorage from '@react-native-async-storage/async-storage';

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

export async function markNotificationsSeen(userId: string): Promise<void> {
  await AsyncStorage.setItem(KEY(userId), new Date().toISOString());
}

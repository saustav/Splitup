import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/** Push remote notifications are not supported in Expo Go (SDK 53+). */
export const pushNotificationsUnsupportedInExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Placeholder values from app.json templates — not real VAPID keys. */
const VAPID_PLACEHOLDERS = new Set(['YOUR_PUBLIC_KEY_HERE', 'your_public_key_here']);

export type PushNotificationData = {
  type?: string;
  groupId?: string;
  entityId?: string;
  eventId?: string;
  settlementId?: string;
};

/** Web push needs `notification.vapidPublicKey` in app.json (Expo VAPID guide). */
export function getWebVapidPublicKey(): string | undefined {
  const config = Constants.expoConfig as
    | { notification?: { vapidPublicKey?: string } }
    | null
    | undefined;
  const key = config?.notification?.vapidPublicKey;
  if (typeof key !== 'string') return undefined;
  const trimmed = key.trim();
  if (!trimmed || VAPID_PLACEHOLDERS.has(trimmed)) return undefined;
  return trimmed;
}

export function getPushPlatform(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

export function canRegisterForPushNotifications(): boolean {
  if (pushNotificationsUnsupportedInExpoGo) return false;
  if (Platform.OS === 'web') return false;
  if (!Device.isDevice) return false;
  return true;
}

async function loadNotifications() {
  if (pushNotificationsUnsupportedInExpoGo) {
    return null;
  }

  if (Platform.OS === 'web') {
    return null;
  }

  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

function getExpoProjectId(): string | undefined {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  return typeof projectId === 'string' && projectId.trim().length > 0
    ? projectId.trim()
    : undefined;
}

export async function savePushToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android' | 'web' = getPushPlatform()
): Promise<void> {
  if (!isSupabaseConfigured || !userId || !token) return;

  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' }
  );

  if (error) {
    if (error.code === '42P01' || error.message.includes('push_tokens')) {
      return;
    }
    throw error;
  }
}

export async function removePushTokensForUser(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;

  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId);

  if (error && error.code !== '42P01' && !error.message.includes('push_tokens')) {
    throw error;
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!canRegisterForPushNotifications()) {
    return null;
  }

  const Notifications = await loadNotifications();
  if (!Notifications) {
    return null;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  try {
    const projectId = getExpoProjectId();
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return token.data;
  } catch {
    return null;
  }
}

export async function registerAndSavePushToken(userId: string): Promise<string | null> {
  const token = await registerForPushNotifications();
  if (token) {
    await savePushToken(userId, token);
  }
  return token;
}

export function getPushNotificationHelpMessage(): string {
  if (Platform.OS === 'web') {
    return 'Push notifications are available in the iOS and Android apps. Web push is not enabled for this project yet.';
  }
  if (pushNotificationsUnsupportedInExpoGo) {
    return 'Push notifications need a development build (expo-notifications does not work in Expo Go). Use the web app or run: npx expo run:android';
  }
  if (!Device.isDevice) {
    return 'Use a physical device and grant notification permission.';
  }
  return 'Could not register for notifications. Check permission settings.';
}

export function navigateFromPushData(
  data: PushNotificationData,
  navigate: (path: string) => void
): void {
  const type = data.type ?? '';

  if (type === 'monthly_report') {
    navigate('/(tabs)/balances');
    return;
  }

  if (
    (type === 'expense_created' || type === 'expense_updated') &&
    data.entityId
  ) {
    navigate(`/expense/${data.entityId}`);
    return;
  }

  if (data.groupId) {
    navigate(`/group/${data.groupId}`);
  }
}

type NotificationModule = Awaited<ReturnType<typeof loadNotifications>>;

let notificationListenersAttached = false;

export async function setupPushNotificationListeners(
  navigate: (path: string) => void
): Promise<() => void> {
  const Notifications = await loadNotifications();
  if (!Notifications) {
    return () => {};
  }

  if (!notificationListenersAttached) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationListenersAttached = true;
  }

  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = (response.notification.request.content.data ??
        {}) as PushNotificationData;
      navigateFromPushData(data, navigate);
    }
  );

  return () => {
    responseSub.remove();
  };
}

export type { NotificationModule };

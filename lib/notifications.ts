import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/** Push remote notifications are not supported in Expo Go (SDK 53+). */
export const pushNotificationsUnsupportedInExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Placeholder values from app.json templates — not real VAPID keys. */
const VAPID_PLACEHOLDERS = new Set(['YOUR_PUBLIC_KEY_HERE', 'your_public_key_here']);

/** Web push needs `notification.vapidPublicKey` in app.json (Expo VAPID guide). */
export function getWebVapidPublicKey(): string | undefined {
  const key = Constants.expoConfig?.notification?.vapidPublicKey;
  if (typeof key !== 'string') return undefined;
  const trimmed = key.trim();
  if (!trimmed || VAPID_PLACEHOLDERS.has(trimmed)) return undefined;
  return trimmed;
}

export function canRegisterForPushNotifications(): boolean {
  if (pushNotificationsUnsupportedInExpoGo) return false;
  // expo-notifications registers push-token listeners at import time; on web that
  // only logs a warning and has no effect. Native apps are the supported path.
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
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
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

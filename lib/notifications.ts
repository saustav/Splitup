import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/** Push remote notifications are not supported in Expo Go (SDK 53+). */
export const pushNotificationsUnsupportedInExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Web push needs `notification.vapidPublicKey` in app.json (Expo VAPID guide). */
export function getWebVapidPublicKey(): string | undefined {
  const key = Constants.expoConfig?.notification?.vapidPublicKey;
  return typeof key === 'string' && key.trim().length > 0 ? key.trim() : undefined;
}

export function canRegisterForPushNotifications(): boolean {
  if (pushNotificationsUnsupportedInExpoGo) return false;
  if (!Device.isDevice) return false;
  if (Platform.OS === 'web' && !getWebVapidPublicKey()) return false;
  return true;
}

async function loadNotifications() {
  if (pushNotificationsUnsupportedInExpoGo) {
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
  if (pushNotificationsUnsupportedInExpoGo) {
    return 'Push notifications need a development build (expo-notifications does not work in Expo Go). Use the web app or run: npx expo run:android';
  }
  if (Platform.OS === 'web' && !getWebVapidPublicKey()) {
    return 'Web push is not configured yet. Use the iOS or Android app for alerts, or add notification.vapidPublicKey to app.json (Expo VAPID guide).';
  }
  if (!Device.isDevice) {
    return 'Use a physical device and grant notification permission.';
  }
  return 'Could not register for notifications. Check permission settings.';
}

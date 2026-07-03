import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { setupPushNotificationListeners } from '@/lib/notifications';

/** Handle notification taps and route to the relevant screen. */
export function usePushNotificationNavigation() {
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    void setupPushNotificationListeners((path) => {
      router.push(path as never);
    }).then((unsub) => {
      cleanup = unsub;
    });

    return () => {
      cleanup?.();
    };
  }, [router]);
}

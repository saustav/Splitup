import { useEffect } from 'react';

import { registerAndSavePushToken } from '@/lib/notifications';
import { useAuthStore } from '@/stores/authStore';

/** Register for push notifications and persist the Expo token after sign-in. */
export function usePushNotificationsBootstrap() {
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!userId) return;
    void registerAndSavePushToken(userId);
  }, [userId]);
}

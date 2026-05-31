import { useEffect } from 'react';

import { runInviteCleanupIfDue } from '@/lib/inviteCleanup';
import { useAuthStore } from '@/stores/authStore';
import { usePendingActionsStore } from '@/stores/pendingActionsStore';

/** Load and subscribe to incoming payment confirmations for the signed-in user. */
export function usePendingPaymentActionsBootstrap() {
  const userId = useAuthStore((s) => s.user?.id);
  const fetch = usePendingActionsStore((s) => s.fetch);
  const subscribe = usePendingActionsStore((s) => s.subscribe);
  const reset = usePendingActionsStore((s) => s.reset);

  useEffect(() => {
    if (!userId) {
      reset();
      return;
    }

    void runInviteCleanupIfDue(userId);
    fetch(userId);
    subscribe(userId);
    return () => {
      reset();
    };
  }, [userId, fetch, subscribe, reset]);
}

export function usePendingPaymentCounts() {
  return usePendingActionsStore((s) => ({
    totalCount: s.totalCount,
    countByGroupId: s.countByGroupId,
    items: s.items,
    isLoading: s.isLoading,
  }));
}

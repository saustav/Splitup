import { create } from 'zustand';

import {
  buildNotificationCounts,
  fetchAppNotifications,
} from '@/lib/notificationFeed';
import { markNotificationsSeen } from '@/lib/notificationSeen';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { AppNotification } from '@/types/notification';

interface PendingActionsState {
  items: AppNotification[];
  countByGroupId: Record<string, number>;
  totalCount: number;
  sheetOpen: boolean;
  isLoading: boolean;
  userId: string | null;
  fetch: (userId: string) => Promise<void>;
  refresh: () => Promise<void>;
  subscribe: (userId: string) => void;
  unsubscribe: () => void;
  openSheet: () => void;
  closeSheet: () => void;
  reset: () => void;
}

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export const usePendingActionsStore = create<PendingActionsState>((set, get) => ({
  items: [],
  countByGroupId: {},
  totalCount: 0,
  sheetOpen: false,
  isLoading: false,
  userId: null,

  fetch: async (userId: string) => {
    if (!isSupabaseConfigured) {
      set({
        items: [],
        countByGroupId: {},
        totalCount: 0,
        userId: null,
        isLoading: false,
      });
      return;
    }

    set({ isLoading: true, userId });

    try {
      const items = await fetchAppNotifications(userId);
      const counts = buildNotificationCounts(items);
      if (get().sheetOpen) {
        set({ items, isLoading: false });
      } else {
        set({ items, ...counts, isLoading: false });
      }
    } catch {
      set({
        items: [],
        countByGroupId: {},
        totalCount: 0,
        isLoading: false,
      });
    }
  },

  refresh: async () => {
    const userId = get().userId;
    if (userId) {
      await get().fetch(userId);
    }
  },

  subscribe: (userId: string) => {
    if (!isSupabaseConfigured) return;

    get().unsubscribe();

    realtimeChannel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settlements',
          filter: `payee_id=eq.${userId}`,
        },
        () => {
          get().fetch(userId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_events',
        },
        () => {
          get().fetch(userId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_log',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          get().fetch(userId);
        }
      )
      .subscribe();
  },

  unsubscribe: () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
  },

  openSheet: () => {
    const userId = get().userId;
    if (userId) {
      void markNotificationsSeen(userId);
    }
    set({ sheetOpen: true, totalCount: 0, countByGroupId: {} });
  },

  closeSheet: () => {
    set({ sheetOpen: false });
    void get().refresh();
  },

  reset: () => {
    get().unsubscribe();
    set({
      items: [],
      countByGroupId: {},
      totalCount: 0,
      sheetOpen: false,
      isLoading: false,
      userId: null,
    });
  },
}));

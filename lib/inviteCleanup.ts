import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const LAST_RUN_KEY = (userId: string) => `invite_cleanup_last_run:${userId}`;
const MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Runs DB cleanup at most once per 24h per user (fallback when pg_cron is not enabled).
 */
export async function runInviteCleanupIfDue(userId: string): Promise<void> {
  if (!isSupabaseConfigured || !userId) return;

  try {
    const lastRaw = await AsyncStorage.getItem(LAST_RUN_KEY(userId));
    if (lastRaw) {
      const last = Date.parse(lastRaw);
      if (!Number.isNaN(last) && Date.now() - last < MIN_INTERVAL_MS) {
        return;
      }
    }

    const { error } = await supabase.rpc('cleanup_expired_group_invites');
    if (!error) {
      await AsyncStorage.setItem(LAST_RUN_KEY(userId), new Date().toISOString());
    }
  } catch {
    /* non-fatal housekeeping */
  }
}

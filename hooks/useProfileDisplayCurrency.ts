import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_CURRENCY_CODE } from '@/constants/currencies';
import {
  DEFAULT_PROFILE_PREFERENCES,
  loadProfilePreferences,
  type ProfilePreferences,
} from '@/lib/profile';

export function useProfileDisplayCurrency(userId: string | undefined) {
  const [prefs, setPrefs] = useState<ProfilePreferences>(DEFAULT_PROFILE_PREFERENCES);
  const [isLoading, setIsLoading] = useState(Boolean(userId));

  const reload = useCallback(async () => {
    if (!userId) {
      setPrefs(DEFAULT_PROFILE_PREFERENCES);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const loaded = await loadProfilePreferences(userId);
      setPrefs(loaded);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    defaultCurrency: prefs.defaultCurrency ?? DEFAULT_CURRENCY_CODE,
    showConverted: prefs.showConvertedToDefaultCurrency ?? true,
    isLoading,
    reload,
  };
}

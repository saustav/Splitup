import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_CURRENCY_CODE } from '@/constants/currencies';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type UserProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
};

export type PaymentMethod = {
  id: string;
  type: 'bank' | 'wallet';
  name: string;
  masked: string;
};

export type ProfilePreferences = {
  phone: string;
  defaultCurrency: string;
  /** When true, show ≈ amounts in default currency using live exchange rates. */
  showConvertedToDefaultCurrency: boolean;
  notifications: {
    expenseUpdates: boolean;
    settlements: boolean;
    groupActivity: boolean;
    monthlyReports: boolean;
  };
  privacy: {
    publicProfile: boolean;
    twoFactorAuth: boolean;
  };
  paymentMethods: PaymentMethod[];
};

const PREFS_KEY = (userId: string) => `profile_prefs:${userId}`;

export const DEFAULT_PROFILE_PREFERENCES: ProfilePreferences = {
  phone: '',
  defaultCurrency: DEFAULT_CURRENCY_CODE,
  showConvertedToDefaultCurrency: true,
  notifications: {
    expenseUpdates: true,
    settlements: true,
    groupActivity: true,
    monthlyReports: false,
  },
  privacy: {
    publicProfile: true,
    twoFactorAuth: false,
  },
  paymentMethods: [],
};

export async function fetchUserProfile(
  userId: string,
  email: string
): Promise<UserProfile> {
  if (!isSupabaseConfigured) {
    return { id: userId, display_name: null, avatar_url: null, email };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  return {
    id: userId,
    display_name: data?.display_name ?? null,
    avatar_url: data?.avatar_url ?? null,
    email,
  };
}

export async function updateUserProfile(
  userId: string,
  updates: { display_name?: string; avatar_url?: string | null }
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}

export async function loadProfilePreferences(
  userId: string
): Promise<ProfilePreferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY(userId));
    if (!raw) return { ...DEFAULT_PROFILE_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<ProfilePreferences>;
    return {
      ...DEFAULT_PROFILE_PREFERENCES,
      ...parsed,
      notifications: {
        ...DEFAULT_PROFILE_PREFERENCES.notifications,
        ...parsed.notifications,
      },
      privacy: {
        ...DEFAULT_PROFILE_PREFERENCES.privacy,
        ...parsed.privacy,
      },
      paymentMethods: parsed.paymentMethods ?? [],
    };
  } catch {
    return { ...DEFAULT_PROFILE_PREFERENCES };
  }
}

export async function saveProfilePreferences(
  userId: string,
  prefs: ProfilePreferences
): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY(userId), JSON.stringify(prefs));
}

export function displayNameFromProfile(
  profile: UserProfile | null,
  fallbackEmail?: string
): string {
  const name = profile?.display_name?.trim();
  if (name) return name;
  const email = fallbackEmail ?? profile?.email;
  if (email) return email.split('@')[0] ?? 'Account';
  return 'Account';
}

export function initialsFromName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import { Platform } from 'react-native';
import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'splitit:theme';

function applyThemeToDocument(mode: ThemeMode) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', mode === 'dark');
}

type ThemeState = {
  mode: ThemeMode;
  hydrated: boolean;
  initialize: () => Promise<void>;
  toggle: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'light',
  hydrated: false,

  initialize: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const mode: ThemeMode = stored === 'dark' ? 'dark' : 'light';
      colorScheme.set(mode);
      applyThemeToDocument(mode);
      set({ mode, hydrated: true });
    } catch {
      colorScheme.set('light');
      applyThemeToDocument('light');
      set({ mode: 'light', hydrated: true });
    }
  },

  setMode: async (mode) => {
    colorScheme.set(mode);
    applyThemeToDocument(mode);
    await AsyncStorage.setItem(STORAGE_KEY, mode);
    set({ mode });
  },

  toggle: async () => {
    const next: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
    await get().setMode(next);
  },
}));

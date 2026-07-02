import { useThemeStore } from '@/stores/themeStore';

export function useColorScheme() {
  return useThemeStore((s) => s.mode);
}

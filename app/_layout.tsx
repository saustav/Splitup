import '../global.css';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';
import 'react-native-reanimated';

if (__DEV__ && Platform.OS === 'web') {
  LogBox.ignoreLogs([/shadow\*.*style props are deprecated/i]);
}

import { LoadingScreen } from '@/components/LoadingScreen';
import { urlHasOAuthPayload } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const initialize = useAuthStore((s) => s.initialize);
  const isLoading = useAuthStore((s) => s.isLoading);
  const session = useAuthStore((s) => s.session);
  const initializeTheme = useThemeStore((s) => s.initialize);
  const themeHydrated = useThemeStore((s) => s.hydrated);
  const pathname = usePathname();
  const router = useRouter();
  const isOAuthCallback =
    pathname === '/auth/callback' || pathname?.endsWith('/auth/callback');

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!urlHasOAuthPayload(window.location.href)) return;

    const path = window.location.pathname || '/';
    const onCallback =
      path === '/auth/callback' || path.endsWith('/auth/callback');
    if (!onCallback) {
      router.replace('/auth/callback');
    }
  }, [router]);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    initialize();
    void initializeTheme();
  }, [initialize, initializeTheme]);

  useEffect(() => {
    if (loaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isLoading]);

  if ((!loaded || isLoading || !themeHydrated) && !isOAuthCallback) {
    return <LoadingScreen />;
  }

  const isSignedIn = !!session;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth/callback" />
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="expense/add" />
        <Stack.Screen name="expense/[expenseId]" />
        <Stack.Screen name="expense/edit" />
        <Stack.Screen name="group/[id]" />
        <Stack.Screen name="group/[id]/settle" />
        <Stack.Screen name="invite/join" />
        <Stack.Screen name="invite/[code]" />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', headerShown: true, title: 'Stack' }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

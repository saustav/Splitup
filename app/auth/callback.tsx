import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { LoadingScreen } from '@/components/LoadingScreen';
import {
  clearOAuthParamsFromUrl,
  completeOAuthFromRedirectUrl,
} from '@/lib/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

function urlHasOAuthPayload(url: string): boolean {
  return /[?&#](code|access_token|error)=/.test(url);
}

/**
 * OAuth redirect target (web). Supabase returns here with ?code= or #access_token=.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const handled = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    async function finishSignIn() {
      if (!isSupabaseConfigured) {
        router.replace('/login');
        return;
      }

      try {
        const url =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? window.location.href
            : ((await Linking.getInitialURL()) ?? '');

        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();

        if (existingSession) {
          await refreshSession();
          clearOAuthParamsFromUrl();
          router.replace('/(tabs)');
          return;
        }

        if (!url || !urlHasOAuthPayload(url)) {
          throw new Error('Missing OAuth callback parameters');
        }

        await completeOAuthFromRedirectUrl(url);
        await refreshSession();
        clearOAuthParamsFromUrl();
        router.replace('/(tabs)');
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Could not complete sign-in';

        const {
          data: { session: recoveredSession },
        } = await supabase.auth.getSession();

        if (recoveredSession) {
          await refreshSession();
          clearOAuthParamsFromUrl();
          router.replace('/(tabs)');
          return;
        }

        setErrorMessage(message);
        clearOAuthParamsFromUrl();
        setTimeout(() => router.replace('/login'), 2000);
      }
    }

    finishSignIn();
  }, [refreshSession, router]);

  if (errorMessage) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-neutral-950">
        <Text className="text-center text-base text-red-600 dark:text-red-400">
          {errorMessage}
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-500">
          Redirecting to sign in…
        </Text>
      </View>
    );
  }

  return <LoadingScreen message="Completing sign-in…" />;
}

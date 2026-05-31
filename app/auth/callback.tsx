import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { LoadingScreen } from '@/components/LoadingScreen';
import {
  clearOAuthCallbackSnapshot,
  clearOAuthParamsFromUrl,
  completeOAuthFromRedirectUrl,
  hasOAuthCallbackPayload,
  urlHasOAuthPayload,
  waitForWebOAuthSession,
} from '@/lib/auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

const NATIVE_URL_WAIT_MS = 2500;

async function resolveNativeCallbackUrl(
  linkingUrl: string | null
): Promise<string> {
  if (linkingUrl && urlHasOAuthPayload(linkingUrl)) return linkingUrl;

  const initial = await Linking.getInitialURL();
  if (initial && urlHasOAuthPayload(initial)) return initial;

  return new Promise((resolve) => {
    let settled = false;
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (settled || !urlHasOAuthPayload(url)) return;
      settled = true;
      clearTimeout(timer);
      sub.remove();
      resolve(url);
    });
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      sub.remove();
      resolve('');
    }, NATIVE_URL_WAIT_MS);
  });
}

/**
 * OAuth redirect target (web + native deep link).
 * Supabase returns here with ?code= or #access_token=.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const refreshSession = useAuthStore((s) => s.refreshSession);
  const linkingUrl = Linking.useURL();
  const finishedRef = useRef(false);

  useEffect(() => {
    async function finishSignIn() {
      if (finishedRef.current) return;

      const goLogin = () => {
        finishedRef.current = true;
        clearOAuthParamsFromUrl();
        clearOAuthCallbackSnapshot();
        router.replace('/login');
      };

      const goApp = async () => {
        finishedRef.current = true;
        await refreshSession();
        clearOAuthParamsFromUrl();
        clearOAuthCallbackSnapshot();
        router.replace('/(tabs)');
      };

      if (!isSupabaseConfigured) {
        goLogin();
        return;
      }

      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (existingSession) {
        await goApp();
        return;
      }

      let nativeCallbackUrl = '';

      if (Platform.OS !== 'web') {
        nativeCallbackUrl = await resolveNativeCallbackUrl(linkingUrl);
      }

      const hasPayload =
        Platform.OS === 'web'
          ? hasOAuthCallbackPayload()
          : urlHasOAuthPayload(nativeCallbackUrl);

      if (!hasPayload) {
        goLogin();
        return;
      }

      try {
        if (Platform.OS === 'web') {
          const session = await waitForWebOAuthSession();
          if (session) {
            await goApp();
            return;
          }
        } else {
          await completeOAuthFromRedirectUrl(nativeCallbackUrl);
          await refreshSession();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            await goApp();
            return;
          }
        }

        goLogin();
      } catch {
        const {
          data: { session: recoveredSession },
        } = await supabase.auth.getSession();

        if (recoveredSession) {
          await goApp();
        } else {
          goLogin();
        }
      }
    }

    void finishSignIn();
  }, [linkingUrl, refreshSession, router]);

  return <LoadingScreen message="Completing sign-in…" />;
}

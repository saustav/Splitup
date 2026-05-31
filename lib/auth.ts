import * as Linking from 'expo-linking';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const AUTH_CALLBACK_PATH = 'auth/callback';

export function urlHasOAuthPayload(url: string): boolean {
  return /[?&#](code|access_token|error)=/.test(url);
}

/** Preserved on first import — before React can strip query/hash via replaceState. */
let oauthCallbackUrlSnapshot: string | null = null;

function snapshotOAuthCallbackUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  const { pathname, href } = window.location;
  const onCallback =
    pathname === `/${AUTH_CALLBACK_PATH}` ||
    pathname.endsWith(`/${AUTH_CALLBACK_PATH}`);

  if (onCallback && urlHasOAuthPayload(href)) {
    oauthCallbackUrlSnapshot = href;
  }
}

snapshotOAuthCallbackUrl();

/**
 * OAuth redirect URI — must match Supabase Auth → Redirect URLs (add `splitup://**`).
 *
 * Dev builds use executionEnvironment `storeClient`, so makeRedirectUri ignores `native`
 * and can produce the wrong URL. Use a fixed deep link on iOS/Android instead.
 */
export function getAuthRedirectUri(): string {
  if (Platform.OS === 'web') {
    // Match the browser origin exactly — avoids localhost vs 127.0.0.1 / port mismatches
    // that cause Supabase to redirect without ?code=.
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/${AUTH_CALLBACK_PATH}`;
    }
    return makeRedirectUri({
      path: AUTH_CALLBACK_PATH,
      preferLocalhost: true,
    });
  }

  return 'splitup://auth/callback';
}

/** Snapshot OAuth callback URL on first paint (web). Params must be read before history.replaceState. */
export function getOAuthCallbackUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (oauthCallbackUrlSnapshot) return oauthCallbackUrlSnapshot;
    const { href } = window.location;
    if (urlHasOAuthPayload(href)) {
      oauthCallbackUrlSnapshot = href;
    }
    return oauthCallbackUrlSnapshot ?? href;
  }
  return '';
}

export const authRedirectUri = getAuthRedirectUri();

function parseOAuthParams(url: string) {
  const { params: queryParams, errorCode: queryError } =
    QueryParams.getQueryParams(url);

  if (queryError) {
    return { params: queryParams, errorCode: queryError };
  }

  try {
    const parsed = new URL(url);
    const hashParams = Object.fromEntries(
      new URLSearchParams(parsed.hash.replace(/^#/, ''))
    );
    const merged = { ...hashParams, ...queryParams };
    const hashError = merged.error ?? merged.error_description;
    return {
      params: merged,
      errorCode: typeof hashError === 'string' ? hashError : null,
    };
  } catch {
    return { params: queryParams, errorCode: null };
  }
}

/** Remove OAuth query/hash from the address bar so refresh does not re-run the callback. */
export function clearOAuthParamsFromUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  const path = window.location.pathname || '/';
  window.history.replaceState({}, document.title, path);
  oauthCallbackUrlSnapshot = null;
}

export function clearOAuthCallbackSnapshot() {
  oauthCallbackUrlSnapshot = null;
}

export function hasOAuthCallbackPayload(): boolean {
  if (oauthCallbackUrlSnapshot && urlHasOAuthPayload(oauthCallbackUrlSnapshot)) {
    return true;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return urlHasOAuthPayload(window.location.href);
  }
  return false;
}

/** Web: Supabase detectSessionInUrl exchanges the code; wait for the session to appear. */
export function waitForWebOAuthSession(timeoutMs = 12_000) {
  return new Promise<Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']>(
    (resolve) => {
      let settled = false;

      const finish = (
        session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']
      ) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        subscription.unsubscribe();
        resolve(session);
      };

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (session) finish(session);
        }
      );

      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) finish(session);
      });

      const timer = setTimeout(() => finish(null), timeoutMs);
    }
  );
}

/** Finish OAuth after redirect (web) or deep link (native). */
export async function completeOAuthFromRedirectUrl(url: string) {
  const { params, errorCode } = parseOAuthParams(url);

  if (errorCode) {
    throw new Error(errorCode);
  }

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(
      params.code
    );
    if (error) throw error;
    return data.session;
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;

  if (accessToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken ?? '',
    });
    if (error) throw error;
    return data.session;
  }

  throw new Error('No auth tokens found in redirect URL');
}

function waitForOAuthDeepLink(timeoutMs = 90_000): {
  promise: Promise<string>;
  cancel: () => void;
} {
  let subscription: { remove: () => void } | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let settled = false;

  const promise = new Promise<string>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      subscription?.remove();
      reject(new Error('Sign-in timed out waiting for redirect'));
    }, timeoutMs);

    subscription = Linking.addEventListener('url', ({ url }) => {
      if (!urlHasOAuthPayload(url) || settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      subscription?.remove();
      resolve(url);
    });
  });

  return {
    promise,
    cancel: () => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      subscription?.remove();
    },
  };
}

/**
 * Sign in with Google or Apple via Supabase OAuth.
 * Enable providers in Supabase Dashboard → Auth → Sign In / Providers.
 */
export async function signInWithOAuth(provider: 'google' | 'apple') {
  const redirectTo = getAuthRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: Platform.OS !== 'web',
    },
  });

  if (error) throw error;

  if (Platform.OS === 'web') {
    if (data.url) {
      window.location.assign(data.url);
    }
    return data;
  }

  if (!data.url) {
    throw new Error('No OAuth URL returned from Supabase');
  }

  const deepLinkWait = waitForOAuthDeepLink();

  try {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type === 'success' && result.url) {
      deepLinkWait.cancel();
      await completeOAuthFromRedirectUrl(result.url);
      return data;
    }

    if (result.type === 'cancel') {
      deepLinkWait.cancel();
      throw new Error('Sign in was cancelled');
    }

    // iOS often returns "dismiss" even when the deep link succeeds right after.
    try {
      const url = await deepLinkWait.promise;
      await completeOAuthFromRedirectUrl(url);
      return data;
    } catch {
      throw new Error(
        `Google sign-in did not complete. In Supabase → Auth → URL Configuration, add redirect URL: splitup://**`
      );
    }
  } finally {
    deepLinkWait.cancel();
  }
}

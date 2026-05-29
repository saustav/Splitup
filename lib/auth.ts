import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export const authRedirectUri = makeRedirectUri({
  scheme: 'splitup',
  path: 'auth/callback',
  preferLocalhost: true,
});

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

/**
 * Sign in with Google or Apple via Supabase OAuth.
 * Enable providers in Supabase Dashboard → Auth → Sign In / Providers.
 */
export async function signInWithOAuth(provider: 'google' | 'apple') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: authRedirectUri,
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

  if (data.url) {
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      authRedirectUri
    );

    if (result.type === 'success' && result.url) {
      await completeOAuthFromRedirectUrl(result.url);
    } else if (result.type === 'cancel') {
      throw new Error('Sign in was cancelled');
    }
  }

  return data;
}

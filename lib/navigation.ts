import type { Router } from 'expo-router';

/** Home tabs — safe fallback when the stack has no previous screen (common on web). */
export const HOME_ROUTE = '/(tabs)' as const;

/**
 * Go back if possible; otherwise return to the main tabs screen.
 * Avoids "The action 'GO_BACK' was not handled by any navigator" in dev.
 */
export function goBackOrHome(router: Router): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(HOME_ROUTE);
  }
}

// Central resolution of backend / websocket URLs from env. Keeping this in one place means
// staging and per-school deployments can be pointed elsewhere via .env alone, and a missing
// value fails loudly instead of silently falling back to the prod onrender instance (which
// would mask the misconfig and send a new school's traffic to the wrong backend).

const rawBackendUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim() || '';
const rawWsUrl = process.env.EXPO_PUBLIC_WS_URL?.trim() || '';

/** HTTP(S) base URL for the backend (tour generation, walking routes). '' if unset. */
export const BACKEND_URL = rawBackendUrl;

/**
 * WebSocket base URL. Prefers EXPO_PUBLIC_WS_URL, then derives from the backend URL by
 * swapping the scheme to ws(s). Never falls back to a hardcoded host.
 */
export const WS_URL = rawWsUrl || (rawBackendUrl ? rawBackendUrl.replace(/^http/, 'ws') : '');

if (!BACKEND_URL) {
  console.error(
    '[config] EXPO_PUBLIC_BACKEND_URL is not set — tour generation and walking routes will fail.'
  );
}
if (!WS_URL) {
  console.error(
    '[config] Neither EXPO_PUBLIC_WS_URL nor EXPO_PUBLIC_BACKEND_URL is set — live ambassador tours will not connect.'
  );
}

/**
 * Returns the backend URL, throwing in dev / logging loudly in prod when unset.
 * Use at call sites that cannot proceed without it.
 */
export function requireBackendUrl(): string {
  if (BACKEND_URL) return BACKEND_URL;
  const message = 'EXPO_PUBLIC_BACKEND_URL is not configured.';
  if (__DEV__) throw new Error(message);
  console.error('[config]', message);
  return '';
}

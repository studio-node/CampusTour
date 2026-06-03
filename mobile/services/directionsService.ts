import type { Polygon } from './deadzones';
import { routePassesThroughDeadzone } from './deadzones';
import { decodePolyline } from './polylineUtils';

export interface WalkingRouteResult {
  coordinates: Array<{ latitude: number; longitude: number }>;
}

export interface FetchWalkingRouteOptions {
  /** School deadzone polygons; routes passing through any are avoided when alternatives exist. */
  deadzonePolygons?: Polygon[];
}

/**
 * Fetches a walking route between origin and destination via the backend proxy.
 * Requests alternative routes and returns the first route that does not pass through any deadzone.
 * Requires EXPO_PUBLIC_BACKEND_URL to be set.
 * Returns decoded polyline coordinates or null on missing config / API error / no valid route.
 */
export async function fetchWalkingRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  options: FetchWalkingRouteOptions = {}
): Promise<WalkingRouteResult | null> {
  const { deadzonePolygons = [] } = options;
  const backendUrl =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (!backendUrl) {
    return null;
  }

  console.log('[directionsService] fetchWalkingRoute called', { backendUrl, origin, destination });
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[directionsService] fetch timed out after 10s, aborting');
      controller.abort();
    }, 10000);
    const res = await fetch(`${backendUrl}/walking-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    console.log('[directionsService] fetch response status', res.status);
    if (!res.ok) {
      console.log('[directionsService] non-OK response, returning null');
      return null;
    }

    const data = await res.json();
    const routes = data.routes;
    if (!Array.isArray(routes) || routes.length === 0) {
      return null;
    }

    // Return the first route that does not pass through any deadzone
    for (const route of routes) {
      const encoded = route?.polyline?.encodedPolyline;
      if (!encoded || typeof encoded !== 'string') continue;

      const coordinates = decodePolyline(encoded);
      if (coordinates.length === 0) continue;

      if (!routePassesThroughDeadzone(coordinates, deadzonePolygons)) {
        return { coordinates };
      }
    }

    // All routes pass through a deadzone; use the first route anyway
    const first = routes[0];
    const encoded = first?.polyline?.encodedPolyline;
    if (encoded && typeof encoded === 'string') {
      const coordinates = decodePolyline(encoded);
      if (coordinates.length > 0) return { coordinates };
    }
    return null;
  } catch (err) {
    console.log('[directionsService] fetch threw', err);
    return null;
  }
}

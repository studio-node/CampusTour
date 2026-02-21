import { routePassesThroughDeadzone } from './deadzones';
import { decodePolyline } from './polylineUtils';

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const FIELD_MASK =
  'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.routeLabels';

export interface WalkingRouteResult {
  coordinates: Array<{ latitude: number; longitude: number }>;
}

/**
 * Fetches a walking route between origin and destination using Google Routes API.
 * Requests alternative routes and returns the first route that does not pass through any deadzone.
 * Requires EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY to be set (Routes API must be enabled for the project).
 * Returns decoded polyline coordinates or null on missing key / API error / no valid route.
 */
export async function fetchWalkingRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<WalkingRouteResult | null> {
  const apiKey =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const body = {
    origin: {
      location: {
        latLng: {
          latitude: origin.latitude,
          longitude: origin.longitude,

          // About 100ft easy of the clocktower
          // latitude: 37.103069331849845, 
          // longitude: -113.56483742834496,

          // Center of the circle in front of the Holland
          // latitude: 37.10314021556226,
          // longitude: -113.56592069506931,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
      },
    },
    travelMode: 'WALK',
    computeAlternativeRoutes: true,
    languageCode: 'en-US',
    units: 'METRIC',
  };

  try {
    const res = await fetch(ROUTES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return null;
    }

    const routes = data.routes;
    if (!Array.isArray(routes) || routes.length === 0) {
      console.log('routes in top null', routes);
      return null;
    }

    // Return the first route that does not pass through any deadzone
    for (const route of routes) {
      const encoded = route?.polyline?.encodedPolyline;
      if (!encoded || typeof encoded !== 'string') continue;

      const coordinates = decodePolyline(encoded);
      if (coordinates.length === 0) continue;

      if (!routePassesThroughDeadzone(coordinates)) {
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
  } catch {
    return null;
  }
}

import { decodePolyline } from './polylineUtils';

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const FIELD_MASK = 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline';

export interface WalkingRouteResult {
  coordinates: Array<{ latitude: number; longitude: number }>;
}

/**
 * Fetches a walking route between origin and destination using Google Routes API.
 * Requires EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY to be set (Routes API must be enabled for the project).
 * Returns decoded polyline coordinates or null on missing key / API error.
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
          // latitude: origin.latitude,
          // longitude: origin.longitude,
          latitude: 37.10314021556226,
          longitude: -113.56592069506931,
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

    const route = data.routes?.[0];
    const encoded = route?.polyline?.encodedPolyline;
    if (!encoded || typeof encoded !== 'string') {
      return null;
    }

    const coordinates = decodePolyline(encoded);
    if (coordinates.length === 0) {
      return null;
    }

    return { coordinates };
  } catch {
    return null;
  }
}

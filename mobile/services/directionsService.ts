import type { Polygon } from './deadzones';
import { routePassesThroughDeadzone } from './deadzones';
import { decodePolyline } from './polylineUtils';

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const FIELD_MASK =
  'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.routeLabels';

export interface WalkingRouteResult {
  coordinates: Array<{ latitude: number; longitude: number }>;
}

export interface FetchWalkingRouteOptions {
  /** School deadzone polygons; routes passing through any are avoided when alternatives exist. */
  deadzonePolygons?: Polygon[];
}

/**
 * Fetches a walking route between origin and destination using Google Routes API.
 * Requests alternative routes and returns the first route that does not pass through any deadzone.
 * Pass deadzonePolygons from the school (e.g. parseDeadzonesFromSchool(school.deadzones)).
 * Requires EXPO_PUBLIC_GOOGLE_ROUTES_API_KEY to be set (Routes API must be enabled for the project).
 * Returns decoded polyline coordinates or null on missing key / API error / no valid route.
 */
export async function fetchWalkingRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  options: FetchWalkingRouteOptions = {}
): Promise<WalkingRouteResult | null> {
  const { deadzonePolygons = [] } = options;
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

          // About 100ft easy of the clocktower
          // latitude: 37.103069331849845, 
          // longitude: -113.56483742834496,

          // Center of the circle in front of the Holland
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
      return null;
    }

    // Return the first route that does not pass through any deadzone
    // console.log('\n\n\nroutes length', routes.length);
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
  } catch {
    return null;
  }
}

[
  [
    {
      "latitude": 37.103741821648384,
      "longitude": -113.56620993343819
    },
    {
      "latitude": 37.10381022009893,
      "longitude": -113.5664051140773
    },
    {
      "latitude": 37.10340410491303,
      "longitude": -113.56638116043668
    },
    {
      "latitude": 37.103421084269,
      "longitude": -113.5662103157271
    }
  ],
  [
    {
      "latitude": 37.10252315843044, 
      "longitude": -113.56467910947526
    },
    {
      "latitude": 37.102851548092616, 
      "longitude": -113.564672680498
    },
    {
      "latitude": 37.10274412112869, 
      "longitude": -113.56507306332509
    },
    {
      "latitude": 37.102502944631254, 
      "longitude": -113.56514809711588
    }
  ]
]

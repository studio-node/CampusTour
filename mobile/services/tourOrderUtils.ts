import { Location } from './supabase';

/**
 * Haversine distance in meters between two lat/lng points.
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Orders tour stops so the tour starts at the location nearest to the user,
 * then continues by order_index ascending, wrapping from max back to min
 * (finishing at the location just before the start in the circle).
 *
 * @param locations - Tour stops (may be in any order)
 * @param userCoords - User's current position; if null, returns locations unchanged
 */
export function orderTourStopsByNearestFirst(
  locations: Location[],
  userCoords: { latitude: number; longitude: number } | null
): Location[] {
  if (!locations || locations.length === 0) return locations;
  if (!userCoords) {
    console.warn('no user coords, returning locations unchanged');
    return locations;
  }

  // Sort by order_index ascending (nulls last)
  const sorted = [...locations].sort((a, b) => {
    const aOrder = a.order_index ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.order_index ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });

  // Find nearest location to user
  let nearestIndex = 0;
  let nearestDist = Infinity;
  for (let i = 0; i < sorted.length; i++) {
    const loc = sorted[i];
    const dist = haversineDistance(
      userCoords.latitude,
      userCoords.longitude,
      loc.coordinates.latitude,
      loc.coordinates.longitude
    );
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestIndex = i;
    }
  }

  console.warn('nearestIndex:', nearestIndex);
  console.warn('nearestDist:', nearestDist);

  // Rotate: start at nearest, then wrap around the circle
  return [...sorted.slice(nearestIndex), ...sorted.slice(0, nearestIndex)];
}

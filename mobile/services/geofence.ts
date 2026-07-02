import type { Location } from './supabase';
import { analyticsService } from './supabase';

/**
 * Returns the id of the first tour stop whose geofence contains the given
 * coordinates, or null if the user isn't within any of them. A user can only
 * be at one location at a time, so the first match wins.
 */
export function findStopIdWithinGeofence(
  userLat: number,
  userLon: number,
  stops: Location[]
): string | null {
  for (const stop of stops) {
    const isWithin = analyticsService.isWithinGeofence(
      userLat,
      userLon,
      stop.coordinates.latitude,
      stop.coordinates.longitude
    );
    if (isWithin) {
      return stop.id;
    }
  }
  return null;
}

import type { Location } from './supabase';
import { findNearestLocation } from './tourOrderUtils';

/**
 * Which campus location the Current tab treats as "current" — same rules for highlighting on the map.
 */
export function getHighlightedLocationIdForCurrentTabLogic(params: {
  nearestCampusMode: boolean;
  nearestCampusLoading: boolean;
  allCampusLocations: Location[];
  userCoords: { latitude: number; longitude: number } | null;
  currentLocationId: string | null;
  tourStops: Location[];
  visitedLocations: string[];
}): string | null {
  const {
    nearestCampusMode,
    nearestCampusLoading,
    allCampusLocations,
    userCoords,
    currentLocationId,
    tourStops,
    visitedLocations,
  } = params;

  if (nearestCampusMode && nearestCampusLoading) {
    return null;
  }

  if (nearestCampusMode) {
    if (allCampusLocations.length === 0) return null;
    const nearest = userCoords ? findNearestLocation(allCampusLocations, userCoords) : null;
    return (nearest ?? allCampusLocations[0])?.id ?? null;
  }

  if (currentLocationId) {
    const found = tourStops.find((stop) => stop.id === currentLocationId);
    return found?.id ?? null;
  }

  if (tourStops.length > 0) {
    const unvisited = tourStops.filter((stop) => !visitedLocations.includes(stop.id));
    return (unvisited[0] ?? tourStops[0])?.id ?? null;
  }

  return null;
}

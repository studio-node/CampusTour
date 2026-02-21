/**
 * Deadzones: polygons that routes must not pass through.
 * Loaded from the school's deadzones column in Supabase.
 */

export type LatLng = { latitude: number; longitude: number };

/** A polygon as an ordered list of vertices (closed: first and last are connected). */
export type Polygon = LatLng[];

/**
 * Parses the deadzones value from a school (Supabase JSONB) into Polygon[].
 * Handles null, undefined, and invalid shapes; returns [] when no valid polygons.
 */
export function parseDeadzonesFromSchool(raw: unknown): Polygon[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  const out: Polygon[] = [];
  for (const item of raw) {
    if (!Array.isArray(item)) continue;
    const polygon: LatLng[] = [];
    for (const pt of item) {
      if (pt && typeof pt === 'object' && typeof (pt as any).latitude === 'number' && typeof (pt as any).longitude === 'number') {
        polygon.push({ latitude: (pt as any).latitude, longitude: (pt as any).longitude });
      }
    }
    if (polygon.length >= 3) out.push(polygon);
  }
  return out;
}

/**
 * Ray-casting point-in-polygon test (horizontal ray to the right).
 * Returns true if the point is inside the polygon (or on its boundary, depending on edge handling).
 */
function pointInPolygon(point: LatLng, polygon: Polygon): boolean {
  const n = polygon.length;
  if (n < 3) return false;

  const { latitude: py, longitude: px } = point;
  let inside = false;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const vi = polygon[i];
    const vj = polygon[j];
    const xi = vi.longitude;
    const yi = vi.latitude;
    const xj = vj.longitude;
    const yj = vj.latitude;

    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  // console.log('inside', inside);
  return inside;
}

/**
 * Returns true if any point of the route lies inside any deadzone polygon.
 * Pass the school's deadzones (from parseDeadzonesFromSchool); if empty, returns false.
 */
export function routePassesThroughDeadzone(
  routePoints: LatLng[],
  deadzonePolygons: Polygon[]
): boolean {
  if (!deadzonePolygons?.length) return false;

  for (const point of routePoints) {
    // console.log('deadzonePolygons length', deadzonePolygons.length);
    for (const polygon of deadzonePolygons) {
      if (pointInPolygon(point, polygon)) return true;
    }
  }
  return false;
}

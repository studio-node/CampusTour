/**
 * Deadzones: polygons that routes must not pass through.
 * Schools will configure these; for now we use a single hardcoded rectangle.
 */

export type LatLng = { latitude: number; longitude: number };

/** A polygon as an ordered list of vertices (closed: first and last are connected). */
export type Polygon = LatLng[];

/**
 * Deadzone polygons. Routes that pass through any of these are discarded in favor of alternatives.
 * TODO: Load from school config / Supabase when available.
 */
export const DEADZONE_POLYGONS: Polygon[] = [
  // Rectangle provided for initial testing (lat, lng order)
  [
    { latitude: 37.10381022009893, longitude: -113.5664051140773 },
    { latitude: 37.103741821648384, longitude: -113.56620993343819 },
    { latitude: 37.10340410491303, longitude: -113.56638116043668 },
    { latitude: 37.103421084269, longitude: -113.5662103157271 },
  ],
];

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

  return inside;
}

/**
 * Returns true if any point of the route lies inside any deadzone polygon.
 */
export function routePassesThroughDeadzone(
  routePoints: LatLng[],
  deadzonePolygons: Polygon[] = DEADZONE_POLYGONS
): boolean {
  if (deadzonePolygons.length === 0) return false;

  for (const point of routePoints) {
    for (const polygon of deadzonePolygons) {
      if (pointInPolygon(point, polygon)) return true;
    }
  }
  return false;
}

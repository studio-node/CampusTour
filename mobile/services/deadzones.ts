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
  return inside;
}

/** Cross-product orientation: > 0 ccw, < 0 cw, 0 collinear (using lng as x, lat as y). */
function orient(o: LatLng, a: LatLng, b: LatLng): number {
  return (
    (a.longitude - o.longitude) * (b.latitude - o.latitude) -
    (a.latitude - o.latitude) * (b.longitude - o.longitude)
  );
}

/** True if point c is on the closed segment [a, b] (assumes a, b, c are collinear). */
function onSegment(a: LatLng, b: LatLng, c: LatLng): boolean {
  const minLng = Math.min(a.longitude, b.longitude);
  const maxLng = Math.max(a.longitude, b.longitude);
  const minLat = Math.min(a.latitude, b.latitude);
  const maxLat = Math.max(a.latitude, b.latitude);
  return (
    c.longitude >= minLng &&
    c.longitude <= maxLng &&
    c.latitude >= minLat &&
    c.latitude <= maxLat
  );
}

/**
 * Returns true if the two line segments (a1,a2) and (b1,b2) intersect,
 * including when an endpoint lies on the other segment.
 */
function segmentIntersectsSegment(
  a1: LatLng,
  a2: LatLng,
  b1: LatLng,
  b2: LatLng
): boolean {
  const oa = orient(a1, a2, b1);
  const ob = orient(a1, a2, b2);
  const oc = orient(b1, b2, a1);
  const od = orient(b1, b2, a2);

  if (oa !== 0 && ob !== 0 && oc !== 0 && od !== 0) {
    return (oa > 0) !== (ob > 0) && (oc > 0) !== (od > 0);
  }
  if (oa === 0 && onSegment(a1, a2, b1)) return true;
  if (ob === 0 && onSegment(a1, a2, b2)) return true;
  if (oc === 0 && onSegment(b1, b2, a1)) return true;
  if (od === 0 && onSegment(b1, b2, a2)) return true;
  return false;
}

/** True if the segment (p1, p2) intersects any edge of the polygon. */
function segmentIntersectsPolygon(p1: LatLng, p2: LatLng, polygon: Polygon): boolean {
  const n = polygon.length;
  if (n < 3) return false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    if (segmentIntersectsSegment(p1, p2, polygon[j], polygon[i])) return true;
  }
  return false;
}

/**
 * Returns true if the route passes through any deadzone polygon: either a route vertex
 * lies inside a polygon, or a route segment (line between two consecutive points) crosses
 * a polygon edge. So straight-line segments that cut through a deadzone are detected.
 */
export function routePassesThroughDeadzone(
  routePoints: LatLng[],
  deadzonePolygons: Polygon[]
): boolean {
  if (!deadzonePolygons?.length) return false;

  for (const point of routePoints) {
    for (const polygon of deadzonePolygons) {
      if (pointInPolygon(point, polygon)) return true;
    }
  }

  for (let i = 0; i < routePoints.length - 1; i++) {
    const p1 = routePoints[i];
    const p2 = routePoints[i + 1];
    for (const polygon of deadzonePolygons) {
      if (segmentIntersectsPolygon(p1, p2, polygon)) return true;
    }
  }
  return false;
}

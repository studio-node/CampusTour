import type { Location } from '@/services/supabase';
import { findNearestLocation, orderTourStopsByNearestFirst } from '@/services/tourOrderUtils';

function loc(
  id: string,
  lat: number,
  lng: number,
  orderIndex: number
): Location {
  return {
    id,
    name: id,
    coordinates: { latitude: lat, longitude: lng },
    image: '',
    description: '',
    interests: [],
    isTourStop: true,
    order_index: orderIndex,
  };
}

describe('findNearestLocation', () => {
  it('returns null for empty list or null coords', () => {
    expect(findNearestLocation([], { latitude: 0, longitude: 0 })).toBeNull();
    const a = loc('a', 1, 1, 0);
    expect(findNearestLocation([a], null)).toBeNull();
  });

  it('returns the closest location to the user', () => {
    const far = loc('far', 10, 10, 0);
    const near = loc('near', 0.0001, 0.0001, 1);
    const user = { latitude: 0, longitude: 0 };
    expect(findNearestLocation([far, near], user)?.id).toBe('near');
  });
});

describe('orderTourStopsByNearestFirst', () => {
  it('returns empty array unchanged', () => {
    expect(orderTourStopsByNearestFirst([], { latitude: 0, longitude: 0 })).toEqual([]);
  });

  it('returns locations unchanged when userCoords is null', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const stops = [loc('a', 1, 1, 0), loc('b', 2, 2, 1)];
      expect(orderTourStopsByNearestFirst(stops, null)).toBe(stops);
    } finally {
      warn.mockRestore();
    }
  });

  it('rotates so the nearest stop to the user is first, preserving order_index sequence after', () => {
    const far = loc('far', 10, 10, 0);
    const mid = loc('mid', 5, 5, 1);
    const near = loc('near', 0.0001, 0.0001, 2);
    const user = { latitude: 0, longitude: 0 };

    const ordered = orderTourStopsByNearestFirst([far, near, mid], user);

    expect(ordered[0].id).toBe('near');
    expect(ordered.map((s) => s.id)).toEqual(['near', 'far', 'mid']);
  });
});

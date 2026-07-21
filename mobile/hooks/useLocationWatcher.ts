import { useEffect, useRef, useState } from 'react';
import * as ExpoLocation from 'expo-location';

export interface UserCoords {
  latitude: number;
  longitude: number;
}

/**
 * Watches the user's foreground location while `shouldTrack` is true and tears the watcher
 * down otherwise. Consolidates the three near-identical copies previously inlined in the
 * Tour, Current, and Map tabs.
 *
 * Key correctness properties:
 *  - The subscription lives in a ref, not state, so a cleanup that runs before the async
 *    `watchPositionAsync` resolves still removes the watcher (the `alive` guard), preventing
 *    the leaked-watcher pileup that kept GPS hot and fired duplicate updates.
 *  - Tracking is driven purely by `shouldTrack` intent — it is NOT gated on tour lifecycle
 *    flags like "tour started", so location keeps updating for the whole tour.
 */
export function useLocationWatcher(shouldTrack: boolean) {
  const [userLocation, setUserLocation] = useState<UserCoords | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const watcherRef = useRef<ExpoLocation.LocationSubscription | null>(null);

  useEffect(() => {
    let alive = true;

    const stop = () => {
      watcherRef.current?.remove();
      watcherRef.current = null;
    };

    if (!shouldTrack) {
      stop();
      return () => {
        alive = false;
      };
    }

    const start = async () => {
      try {
        let { status } = await ExpoLocation.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          const result = await ExpoLocation.requestForegroundPermissionsAsync();
          status = result.status;
        }
        if (!alive) return;
        setPermissionStatus(status);
        if (status !== 'granted') return;

        // Seed an initial fix so consumers don't wait for the first watch callback.
        const initial = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Balanced,
        });
        if (!alive) return;
        setUserLocation({
          latitude: initial.coords.latitude,
          longitude: initial.coords.longitude,
        });

        const sub = await ExpoLocation.watchPositionAsync(
          {
            accuracy: ExpoLocation.Accuracy.Balanced,
            timeInterval: 5000, // Check every 5 seconds
            distanceInterval: 10, // Only update if moved 10 meters
          },
          (loc) => {
            setUserLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        );

        // If the effect was cleaned up while awaiting, remove the just-created watcher now.
        if (!alive) {
          sub.remove();
          return;
        }
        watcherRef.current = sub;
      } catch (error) {
        console.error('useLocationWatcher: error starting location tracking', error);
      }
    };

    start();

    return () => {
      alive = false;
      stop();
    };
  }, [shouldTrack]);

  return { userLocation, permissionStatus };
}

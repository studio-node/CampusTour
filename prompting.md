
# Handling session starting vs tour starting
I've noticed that you start the tour session when the user first connects using the websocket. I want to change this order. When either user first connects to the websocket (either those in the tour group or the ambassador), I want you to create a tour session with the default status (I've changed it to be 'awaiting_start' instead of 'active'). This should only be done for the first person to join the session. After that, every subsequent member will just join the session that is already started. Where things have been mixed up is that the session being started is different from the tour being started. I only want the tour to be started when the ambassador presses the 'Start Tour' button. Then, we need to update the 'live_tour_sessions' table to have a status of 'active'. This will aslo require you to add an additional 'tour:...' action in TOURSESSIONSJS. I need you to make these updates.
 

# Base Prompt

This project is for a Campus tour app and supporting services that I am building for my Univserity, but it will be for many schools. I am in the middle of building it at the moment, and I need your help. In the mobile app portion of this project, there are three user journeys: self-guided, ambassador-led, and ambassador. Ambassadors lead a tour and the ambassador-led tour group can see the changes made by the ambassador. You can find all the overaching documentation for this project in USERJOURNEYS . 

I am in the process of handling the ambassador-led tour part of this product. We now have the websockets connection working and handling session creation, tour starting, and tour generation for the ambassador-led tour. Next up, we need to add some tour editing features for the ambassador and self-guided user. First, I want you to replace the "New Tour" button in TOURTSX with a button that will put the generated tour list in editing mode (the button text should be "Edit Tour"). When pressed it will put the user in editing mode and the text will change to "Stop Editing". We can handle the logic in the next step. Put the "New Tour" button and functionality in the hamburger menu. 





# Reccomened Changes by gpt5

I'll first scan the `mobile/app` directory to see all pages and layouts, then open any files not already provided for a full review.
Ran tool
Ran tool
Ran tool

Brief status: I scanned all screens/layouts under `mobile/app` (including `/(tabs)` and `/building`) to review patterns, state, navigation, permissions, sockets, storage usage, and identify concrete improvements. Highlighting correctness issues first, then structural refactors, consistency, UX/accessibility, and performance.

### Critical correctness issues
- WebSocket event name mismatch
  - `/(tabs)/tour.tsx` sends `tour:state_update` while `/(tabs)/current.tsx` listens for `tour_state_updated`. These won’t match unless the server transforms the name.
  ```115:126:mobile/app/(tabs)/current.tsx
        if (msg?.type === 'tour_state_updated' && msg?.state) {
          const { current_location_id, visited_locations } = msg.state;
  ```
  ```275:290:mobile/app/(tabs)/tour.tsx
      wsManager.send('tour:state_update', {
        tourId,
        state: {
          current_location_id: currentLocationId,
          visited_locations: visitedLocations,
        }
      });
  ```
  - Recommendation: standardize a single event name (e.g., `tour_state_update`) for send and receive across ambassador and member clients.

- Live updates cleanup never runs in `current.tsx`
  - The effect defines a cleanup inside `attachLiveUpdates` but the outer `useEffect` doesn’t return it, leading to event handlers persisting across mounts.
  ```106:131:mobile/app/(tabs)/current.tsx
  useEffect(() => {
    const attachLiveUpdates = async () => {
      ...
      wsManager.on('message', onMessage);
      wsManager.send('join_session', { tourId });
      return () => {
        wsManager.off('message', onMessage);
      };
    };
    const cleanupPromise = attachLiveUpdates();
    return () => {
      // cleanup handled by returned function if any
    };
  }, []);
  ```
  - Fix: await the inner function and return its cleanup.
  ```tsx
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      const isAmbassadorUser = await userTypeService.isAmbassador();
      if (isAmbassadorUser) return;
      const tourId = await tourGroupSelectionService.getSelectedTourGroup();
      if (!tourId) return;
      wsManager.connect();
      const onMessage = (msg: any) => {
        if (msg?.type === 'tour_state_update' && msg?.state) {
          const { current_location_id, visited_locations } = msg.state;
          if (current_location_id) setCurrentLocationId(current_location_id);
          if (Array.isArray(visited_locations)) setVisitedLocations(visited_locations);
        }
      };
      wsManager.on('message', onMessage);
      wsManager.send('join_session', { tourId });
      cleanup = () => wsManager.off('message', onMessage);
    })();
    return () => cleanup?.();
  }, []);
  ```

- Mixed navigation paths
  - Sometimes `router.push('/map')`, sometimes `router.push('/(tabs)/map')`. Prefer the route within the `(tabs)` stack consistently. Mismatches can create duplicate stack instances and back button oddities.

- Async permission handling race conditions
  - Requesting location permissions happens across three screens independently. If the user bounces between tabs quickly, multiple requests/watchers can be created. Consolidate via a shared hook that ensures a single watcher and reference-counted subscribe/unsubscribe.

### High-impact refactors
- Consolidate location permission + tracking
  - Extract a reusable hook like `useLocationTracking({ accuracy, timeInterval, distanceInterval })` returning `{ status, region, stop, start, lastError }`. Use it in `/(tabs)/tour.tsx`, `/(tabs)/current.tsx`, and possibly `/map.tsx`.
  - Have a single geofence utility (vs duplicating the check loop) and a single source of truth for geofence radius.

- Centralize AsyncStorage keys and persistence
  - Keys like `tourStops`, `visitedLocations`, `currentLocationId`, `showInterestSelection` are duplicated. Create `storage/keys.ts` and a small `useAsyncStorageState` hook for get/set with JSON serialization and error handling.

- Normalize WebSocket session orchestration
  - Wrap `wsManager` usage in a `useTourSession` hook. Unify:
    - connect/authenticate on mount
    - joining or creating session based on `userType`
    - sending `tour_state_update` and handling inbound events
    - automatic cleanup
  - This removes per-screen bespoke code and fixes lifecycle inconsistencies.

- DRY repeated UI sections
  - The header with title and `HamburgerMenu`, the tag chips (interests/careers/features), and section blocks are repeated in `/(tabs)/current.tsx`, `/building/[id].tsx`, and `/(tabs)/tour.tsx`. Create small components: `AppHeader`, `ChipsList`, `Section`, `PrimaryButton`.

- Unify images
  - You use `expo-image` in `/(tabs)/tour.tsx` and React Native `Image` elsewhere. Prefer `expo-image` for caching/performance consistently across screens.

### Consistency and type safety
- Tighten types
  - Replace `any` watchers with the `LocationSubscription` type from `expo-location`.
  - Make `UserType` explicit where initialized as `null` (e.g., `UserType | null`) to avoid stray strings.

- Prefer `useCallback` for handler props
  - For handlers passed to `FlatList` items and `MapView` markers to reduce re-renders.

- Extract constants
  - Colors and magic numbers (e.g., geofence interval 5s, distance 10m, map deltas) to a single constants module.

### UX and behavior enhancements
- Location permission denied flow
  - In `/(tabs)/current.tsx` and `/(tabs)/tour.tsx`, show a CTA to open system settings when permission is denied, rather than just falling back silently. Persist the “don’t ask again” state.

- Map deep-link consistency
  - When navigating to `/map` with `params.building`, ensure all call sites pass lowercase ID consistently and that the map centers even if the map isn’t ready yet (queue the centering until `onMapReady`).

- Tour modal in `map.tsx`
  - The modal visible logic relies on `showInterestSelection` AsyncStorage. Ensure it’s always set by `tour.tsx` before navigating back, and that ambassador-led members never see it (you already check, keep consistent).

- Overlay bounds are hardcoded to a single campus
  - If multi-school support is intended, hide or swap overlays based on school.

- Accessibility
  - Add `accessible`, `accessibilityLabel`, and roles to interactive elements. Current UI is visually solid but screen-reader metadata is missing.

### Performance
- `FlatList` optimization in `/(tabs)/tour.tsx`
  - Consider `getItemLayout` if card heights are fixed, and `initialNumToRender` to improve first paint.
  - Extract `TourStopItem` to a memoized component; pass stable callbacks via `useCallback`.

- Map markers
  - If the locations list gets large, consider clustering or limiting initial render.

### Error handling and resilience
- Network failures
  - Several fetch/service calls just `console.error`. Surface user-friendly toasts or banners, and add retry actions.

- Analytics calls
  - Wrap analytics exports with safe fallbacks; ensure they never block UX. You already try/catch—good; make it consistent across all calls.

### Security and privacy
- Don’t persist ephemeral permission status
  - Storing `LOCATION_PERMISSION_STATUS` in AsyncStorage isn’t necessary and can drift. Query it on demand.

- Hide dev/test controls in production
  - `/index.tsx` “Skip to map” and “Clear Async Storage” controls should be behind `__DEV__` checks or environment flags.

### Concrete low-risk improvements
- Fix navigation path consistency
  - Change all pushes to use tabbed path:
  - In `/(tabs)/current.tsx` and `/building/[id].tsx`, ensure `{ pathname: '/(tabs)/map', params: { building: id } }`.

- Deduplicate tag UIs
  - Extract a single chip style used in `current` and `building` for `interests`, `careers`, `features`.

- Replace string comparisons with enums
  - For statuses like tour appointment status and user type.

- Cleanup on unmount everywhere there’s a watcher or socket listener
  - You do this well in `tour.tsx`; fix in `current.tsx` and verify in `tour-details.tsx` event listeners are removed in cleanup (they are—good).

### Optional architecture improvements
- Introduce a global state layer
  - A lightweight store (Zustand/Jotai) or React Context for:
    - selected school
    - user type
    - tour session state (current location, visited locations)
  - This reduces AsyncStorage churn and prop-drilling across screens.

- Feature flags
  - Introduce flags for ambassador-led vs self-guided flows so the UI logic doesn’t branch across many screens.

- i18n
  - Externalize strings for localization.

### Quick wins (suggested edits)
- Standardize event name and fix cleanup in `current.tsx`.
- Guard dev buttons in `/index.tsx` behind `__DEV__`.
- Extract storage keys to `storage/keys.ts` and import everywhere.
- Create `hooks/useLocationTracking.ts` and `hooks/useTourSession.ts` to remove duplication and prevent multiple watchers.
- Switch all images to `expo-image` for caching.

Summary
- Fixes: event name mismatch and broken cleanup in `/(tabs)/current.tsx`; unify map navigation path; remove storing permission status.
- Refactors: shared hooks for location and tour session; centralize AsyncStorage keys; DRY repeated UI sections and chips; unify image component.
- Enhancements: permission-denied UX; accessibility metadata; overlay per-school; better error handling; disable dev controls in prod.
- Performance: memoize list items, stable callbacks, consider map clustering if needed.

# Mobile App Hardening Plan

A review of the mobile app (`mobile/`) looking for places where things can break, places that could handle failure better, and general fixing up. Five issues, ranked by importance, each with a concrete fix plan. File references are to the current state of the repo.

---

## 1. Prospective-student PII in `leads` is readable by anyone with the app's anon key

**Severity: Critical (security/privacy — this is a "lose the school's trust" bug)**

### The problem

The mobile app queries the `leads` table directly with the anon key, and the RLS policy allows it for everyone:

- `supabase/supabase_schema.sql:3623` — `CREATE POLICY "Enable read access for all users" ON "public"."leads" FOR SELECT USING (true);`
- `mobile/services/supabase.ts:870-902` — `verifyConfirmationCode()` does `select('*')` on `leads` filtered by `appointment_confirmation` + `tour_appointment_id`, entirely client-side.
- `mobile/services/supabase.ts:696-725` — `getTourParticipants()` does `select('*')` on `leads` by appointment.

The anon key ships inside the app bundle (any `EXPO_PUBLIC_*` value is extractable), so anyone can run `select * from leads` and dump every prospective student's first/last name, email, date of birth, and tour history — across **all schools**, since nothing scopes by school either. The client-side confirmation-code check also means codes can be brute-forced or simply read out of the table.

Note the irony that the general confirmation code already does this right: `verifyGeneralConfirmationCode()` calls the `verify_general_confirmation_code` RPC "so the code itself is never exposed to the client" (`supabase.ts:1332-1358`). The per-lead code path never got the same treatment.

### The fix

1. **Lock down `leads` SELECT.** Drop the `USING (true)` policy. Replace with: ambassadors/admins can read leads for appointments in their school (mirror the `tour_appointments_select_admin_school` / `ambassador_own` patterns).
2. **Move confirmation-code verification server-side.** Add a `verify_lead_confirmation_code(p_tour_appointment_id, p_code)` SECURITY DEFINER RPC that returns only the fields the app needs on success (lead id, first name) — same shape as the existing general-code RPC. Update `verifyConfirmationCode()` to call it.
3. **Scope the roster.** `getTourParticipants()` is used by the ambassador roster screen; ambassadors are authenticated, so an RLS policy tied to `tour_appointments.ambassador_id = auth.uid()` covers it without an RPC.
4. While in there: the INSERT policy named "Enable insert for authenticated users only" is actually `WITH CHECK (true)` for all roles (`supabase_schema.sql:3615`). Anonymous insert is required by lead capture, but rename it and add sanity constraints (rate limiting is a backend/edge concern, but at minimum validate `school_id` exists).

**Effort:** ~1 day including migration + testing both join flows (confirmed lead + general code).

---

## 2. Supabase auth sessions don't survive an app restart (split-brain auth state)

**Severity: High (breaks the ambassador experience; root cause of "mysterious" auth failures)**

### The problem

`mobile/services/supabase.ts:15` creates the client with no React Native auth config:

```ts
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

In React Native there is no `localStorage`, so supabase-js falls back to in-memory session storage — **the real session (JWT + refresh token) is gone every time the app is killed**. To compensate, the app hand-rolls its own auth persistence (`AUTH_USER_KEY` in AsyncStorage, `saveAuthState`/`getStoredUser`/`isAuthenticated`), which stores the *user object* but not the *session*. The two sources of truth diverge after any restart:

- `app/index.tsx:37-50` routes ambassadors to `/ambassador-tours` because `isAuthenticated()` (AsyncStorage) says yes — but `supabase.auth.getSession()` is null, so every RLS-gated query (`getAmbassadorTours` relies on `ambassador_id = auth.uid()` policies) silently returns nothing. The ambassador sees an empty tour list with no explanation.
- `services/ws.ts:157-168` — `sendAuth()` fetches the session, gets null, and **silently sends no auth message**, then proceeds to flush queued `create_session` messages anyway. The server sees an unauthenticated ambassador session.
- Token auto-refresh is never paused/resumed with AppState, which the supabase-js RN docs require — so even within one launch, a long tour can end with an expired token.

### The fix

1. Configure the client properly:
   ```ts
   createClient(supabaseUrl, supabaseAnonKey, {
     auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
   });
   ```
2. Add the AppState hook (in `_layout.tsx` or the supabase module): `startAutoRefresh()` on `active`, `stopAutoRefresh()` otherwise.
3. **Delete the parallel auth store.** `isAuthenticated()` / `getStoredUser()` should derive from `supabase.auth.getSession()` / `getUser()`; keep the AsyncStorage copy only as a display cache if needed. This removes the divergence class entirely (including stale-role edge cases in `isStoredUserAmbassador`).
4. Make `ws.ts` `sendAuth()` treat "no token while `shouldAuthenticate` is set" as an error: emit `auth_failed`, don't flush session messages until auth is acknowledged (ties into item 5).

**Effort:** ~half a day + regression pass on ambassador sign-in, restart, tour list, live session.

---

## 3. Tour tab location tracking dies the moment the tour "starts" (and can leak watchers)

**Severity: High (silently kills geofencing, the current-stop UX, and duration analytics mid-tour)**

### The problem

`mobile/app/(tabs)/tour.tsx:1159-1177`:

```ts
useEffect(() => {
  if (tourPaused || tourFinished) { stopLocationTracking(); return; }
  if (!showInterestSelection && tourStops.length > 0 && !tourStarted) {
    // request permission / startLocationTracking()
  }
  return () => { stopLocationTracking(); };
}, [tourPaused, tourFinished, showInterestSelection, tourStops, locationPermissionStatus, tourStarted]);
```

Two bugs:

1. **The `!tourStarted` gate.** When the user reaches their first stop, `checkGeofences` sets `tourStarted = true` (line 1106-1116). That dep change re-runs the effect: cleanup removes the watcher, and the body does nothing because `!tourStarted` is now false. From that point on, `userLocation` never updates on this screen — no more geofence entries/exits, no `location-duration` analytics, no auto check-off. Everything downstream of GPS on the Tour tab works for exactly one stop.
2. **Watcher handle in `useState` (`locationWatcher`, line 259) + stale closures.** The cleanup captured at effect-run time can see a `null` watcher that was set after (i.e. `startLocationTracking`'s async `setLocationWatcher` lands post-cleanup), so watchers leak and pile up as `tourStops`/`locationPermissionStatus` change — each leaked watcher keeps GPS hot (battery) and fires duplicate `setUserLocation` updates.

### The fix

1. Hold the subscription in a ref, not state: `const watcherRef = useRef<ExpoLocation.LocationSubscription | null>(null);` and make start/stop idempotent against the ref.
2. Replace the gate with intent, not lifecycle-phase: `const shouldTrack = !tourPaused && !tourFinished && !showInterestSelection && tourStops.length > 0;` and one effect on `[shouldTrack, locationPermissionStatus]` that starts/stops accordingly. `tourStarted` should have no bearing on whether we keep watching.
3. Guard the async start: after `await watchPositionAsync`, if the effect has since been cleaned up (an `alive` flag, same pattern already used in `map.tsx:301-338`), remove the subscription immediately.
4. Extract this into a `useLocationWatcher(shouldTrack)` hook and reuse it in `current.tsx:167-229`, which has the same state-held-watcher shape (its single-mount effect just hides it better), and in `map.tsx` — three copies of the same tracking code today.

**Effort:** ~half a day; verify with a walking test (or mocked coordinates) that a second stop still triggers entry/exit events.

---

## 4. Persisted tour-state model is self-inconsistent — current stop is wrong after every restart

**Severity: Medium-High (resume flow "works" but restores wrong data; three tabs disagree)**

### The problem

Two fields that sound identical are written and read by different screens:

- **Written:** `tour.tsx:620` saves `tourState.currentStopIndex: tourStops.findIndex(stop => stop.id === currentLocationId) || 0`. Bug inside a bug: `findIndex` returns `-1` when the user isn't at a stop (the common case), and `-1 || 0` is `-1`, so `-1` is what gets persisted.
- **Read:** `map.tsx:470-480` and `current.tsx:111-121` restore the current stop from **`tourProgress.currentStopIndex`** — a *different* field that no screen ever writes. It's `0` from `createEmptyState()` (`appStateManager.ts:476-482`) forever. So after any restart, Map and Current confidently highlight **stop #1** as "current" regardless of where the user actually was. Meanwhile `tourProgress.tourStartedAt`/`visitedStops`/`totalStops` are also never maintained, so the Resume modal's progress numbers come from `getTourProgress()` recomputing some fields and reading stale ones for others.

More generally, `PersistedAppState` is written blind: `loadPersistedState` does `JSON.parse(...) as PersistedAppState` with no validation (`appStateManager.ts:196`), so any shape change ships a crash/undefined-behavior risk to users with old state on disk.

### The fix

1. **Persist the location id, not an index.** Add `tourState.currentLocationId: string | null`; delete both `currentStopIndex` fields. Ids survive reordering/deleting stops (indexes don't — today an ambassador reorder shifts everyone's "current" stop meaning). Update `tour.tsx` save/load, `map.tsx`, `current.tsx`, and `useResumeTour.ts:55-59` to use it.
2. **Make `tourProgress` derived, not stored.** `getTourProgress()` already computes totals from `tourState`; remove the stored duplicate, keep only `tourStartedAt` (set once when `tourStarted` flips true).
3. **Version + validate persisted state.** Add `schemaVersion` to `PersistedAppState`; on load, run a small validator (or zod) and clear state on mismatch instead of trusting the cast. `clearAllState`'s hand-maintained key list (`appStateManager.ts:418-432`) should be replaced by a single prefixed namespace so new keys can't be forgotten.

**Effort:** ~1 day including a migration path (treat missing `schemaVersion` as "clear and start fresh" — acceptable since state already expires at 7 days).

---

## 5. Network layer robustness: hardcoded backend URL, WS listener leaks, no dead-connection detection

**Severity: Medium (degrades ambassador-led live tours, blocks per-environment config)**

### The problem

- **Hardcoded URL:** `tour.tsx:713` fetches `https://campustourbackend.onrender.com/generate-tour` directly, ignoring `EXPO_PUBLIC_BACKEND_URL` that `directionsService.ts` and `ws.ts` honor. Point staging/a new school's deployment elsewhere and tour generation still hits prod. (`ws.ts:19` also hardcodes the onrender fallback — a wrong-but-plausible default that masks missing config.)
- **`'open'` listener leaks:** `useResumeTour.ts:79-87` (`runWhenSocketOpen`) registers `wsManager.on('open', ...)` and never removes it — and `'open'` fires on **every reconnect**, so each resume stacks another `create_session`/`join_session` sender that replays forever. `handleRaiseHand` (`tour.tsx:854-881` and duplicated in `current.tsx:348-375`) has the same pattern: the `onOpen` only self-removes if it fires, and the "Hand Raised" success alert shows before anything was actually sent.
- **No heartbeat:** `ws.ts` has reconnect/backoff (good) but no ping/pong. On a phone walking across campus, sockets go half-dead without a `close` event — the ambassador keeps "broadcasting" into a dead socket and members silently stop receiving until something else fails.
- **Auth/flush ordering:** `onSocketOpen` (`ws.ts:97-109`) flushes queued messages even when `sendAuth` found no token (see item 2).

### The fix

1. Add `mobile/services/config.ts` exporting `BACKEND_URL` / `WS_URL` resolved from env in one place, **throwing (dev) / logging loudly (prod) when unset** instead of falling back to onrender. Replace the `generate-tour` fetch and the `ws.ts` fallback.
2. Add `wsManager.once(event, fn)` (eventemitter3 supports it) and a `sendWhenOpen(type, payload)` helper that uses it; replace `runWhenSocketOpen` and both raise-hand implementations (extract raise-hand into one shared helper — it's copy-pasted today). Move the raise-hand confirmation alert into an ack/timeout: alert success on send, alert failure if the socket doesn't open within ~5s.
3. Heartbeat: send `{type:'ping'}` every 30s while open; if no message of any kind within ~45s, `socket.close()` to force the existing reconnect path (server side already exists or is trivial to add in the ws handler).
4. Gate `flushPending()` on auth having been sent successfully when `shouldAuthenticate` is set.

**Effort:** ~1 day across `ws.ts`, `useResumeTour`, the two raise-hand call sites, plus a small backend ping handler.

---

## Honorable mentions (worth fixing, didn't crack the top 5)

| Issue | Where | Note |
|---|---|---|
| Debug UI in the production entry screen | `app/index.tsx:71-115` — "Skip to map" (hardcoded Utah Tech UUID) and "Clear Async Storage" buttons, hero image hotlinked from pexels.com | Wrap in `__DEV__`, bundle the hero image locally |
| Multi-tenant hardcodes | `map.tsx:790` (Utah Tech UUID gating the buildings overlay), `appStateManager.ts:463-468` + `map.tsx:42-47` (Utah Tech fallback region), `map.tsx:71` (`#990000` fallback color) | Move overlay image + bounds to a `schools` column; make fallback region "first school's coordinates" or a neutral zoomed-out region |
| Directions route refetched on every GPS tick | `map.tsx:401-429` — deps include `userLocation.latitude/longitude`, which update every 5s/10m; each refetch nulls the polyline (flicker) and bills a Google Routes call | Only refetch when the user strays >N meters from the current polyline or the destination changes; keep the old route rendered while fetching |
| Errors swallowed into empty states | `locationService.getLocations` returns `[]` on network failure → Tour tab shows "No buildings match your selected interests" (`tour.tsx:1437`), which is false and a dead end | Return `{data, error}` from services; add an error + retry state to Tour/Map lists; generateTour's silent fallback to the default tour should at least toast the user |
| Roster N+1 queries | `supabase.ts:710-718` — one `analytics_events` query per participant | Single `.in('lead_id', ids)` query, group client-side |

## Suggested order of work

1 (RLS/PII) and 2 (auth persistence) first — they're independent of the UI refactors and 1 is a live exposure. Then 3 and 4 together, since both touch the tour state lifecycle and share test flows. Then 5, then the mentions as cleanup passes.

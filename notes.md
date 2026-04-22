- Web app tab thing
- Restarting app after closing out for self-guided isn't working correctly








# From Opus about websockets

| Client emits | Server handles | Server emits / broadcasts |
|---|---|---|
| `auth` | `handleAuth` — attaches `ws.user = { sub }` | `auth_ok` |
| `create_session` | `handleCreateSession` → `ensureSessionExists` | `session_created` (to caller) |
| `join_session` | `handleJoinSession` | `session_joined` (to caller), `member_joined` (to ambassador) |
| `tour:start` | `handleTourStart` → Gemini → persist `live_tour_structure` + `status=active` | `tour_started` (to ambassador), `tour_structure_updated` (to members) |
| `tour:state_update` | `handleTourStateUpdate` → persist `current_location_id`, `visited_locations` | `tour_state_updated` (to members) |
| `tour:structure_update` | `handleTourStructureUpdate` | `tour_structure_updated` (to members) |
| `tour:tour-list-changed` | `handleTourListChanged` | `tour_list_changed` (to members) |
| `tour:media:add-to-detail` | `handleTourMediaAddToDetail` | `media_added_to_detail` (to members) |
| `tour:media:push-takeover` | `handleTourMediaPushTakeover` | `media_takeover` (to members) |
| `tour:end` | `handleTourEnd` — sets `status=ended`, closes member sockets | `session_ended` (to members), `tour_ended_confirmation` (to ambassador) |
| `ambassador:ping` | `handleAmbassadorPing` — looks up `lead.name` | `ambassador_ping` (to ambassador) |
| (implicit) disconnect | `handleDisconnect` | `member_left` (to ambassador) |

Authorization rule: mutating ops (`tour:start`, `tour:state_update`, `tour:structure_update`, `tour:end`, both media pushes) require `session.ambassador.id === ws.id`. `ambassador:ping` requires `session.members.has(ws)`. `create_session` and `join_session` have **no** authorization.

---

## 2. Critical issues

### 2.1 Any member can become the "ambassador" of a session
**Location:** `backend/tour-sessions.js` `handleCreateSession` + `mobile/app/tour-details.tsx` lines 198–220

On the mobile side, `tour-details.tsx` runs its `useEffect([userType], ...)` on mount and, **regardless of `userType`**, registers an `onOpen` listener that sends:

```197:214:mobile/app/tour-details.tsx
    wsManager.connect();
    const onOpen = async () => {
      const u = await authService.getStoredUser();
      if (u?.id) {
        wsManager.authenticate(u.id);
      }
        // Create or attach to the live tour session on socket open
        const tId = await tourGroupSelectionService.getSelectedTourGroup();
        if (tId) {
          wsManager.send('create_session', {
            tourId: tId,
            initial_structure: {},
            ambassador_id: u?.id || null,
          });
```

So an `ambassador-led` member calls `create_session`. On the server:

```219:222:backend/tour-sessions.js
  // Set ambassador if not already set
  if (!session.ambassador) {
    session.ambassador = ws;
  }
```

If the member arrives before the real ambassador's socket has bound (or if the ambassador's socket has disconnected and `session.ambassador` was cleared at line 603), whichever member hits this path first is promoted to `session.ambassador`, gets access to `tour:start`, `tour:state_update`, media pushes, and `tour:end`. And because `handleCreateSession` resolves the ambassador id purely from `tour_appointments`, there is no check that the caller is actually that ambassador.

Two independent things to fix:

1. Guard the mobile `onOpen` so only `userType === 'ambassador'` ever calls `create_session`. The `userType` is resolved from `userTypeService.getUserType()` earlier in the same effect — use that.
2. On the server, gate `handleCreateSession` / the `if (!session.ambassador)` line on `ws.user?.sub === tour_appointments.ambassador_id`. Reject otherwise.

### 2.2 Authentication is a stub — anyone can impersonate any ambassador
**Location:** `backend/tour-sessions.js` lines 183–197

```183:197:backend/tour-sessions.js
async function handleAuth(ws, _supabase, payload) {
  try {
    const ambassadorId = payload?.sub || payload?.ambassador_id || payload?.userId || null;
    …
    ws.user = { sub: ambassadorId };
    ws.send(JSON.stringify({ type: 'auth_ok' }));
```

Nothing is signed, nothing is verified. A malicious client can send `{ type: 'auth', payload: { sub: '<any-uuid-from-profiles>' } }` and the server will happily treat it as that ambassador on any future `create_session`/`tour:start` flow. Combined with 2.1 you can take over live tours for any school.

Fix: the mobile side is already logging users in via Supabase Auth, so forward the access token in the `auth` payload and verify it with `supabase.auth.getUser(token)` server-side before setting `ws.user`. Also verify `ws.user.sub` matches `tour_appointments.ambassador_id` in `handleCreateSession` / `handleTourStart`.

### 2.3 Ambassador can't rebind after reconnect unless they visit `tour-details`
**Location:** `backend/tour-sessions.js` lines 591–615; rebinding logic only in `mobile/app/tour-details.tsx`

On ambassador disconnect the server deliberately keeps the session alive and just nulls out `session.ambassador`. The ambassador's next socket gets a new `ws.id` generated in `sessionManager`, so until somebody sets `session.ambassador = newWs`, all `tour:state_update` / `tour:structure_update` / `tour:end` / media sends from the ambassador will be rejected as "Unauthorized action." from the check at line 51:

```50:54:backend/tour-sessions.js
        if (['tour:start', 'tour:state_update', 'tour:structure_update', 'tour:end', 'tour:media:add-to-detail', 'tour:media:push-takeover'].includes(data.type)) {
          if (!session || !session.ambassador || session.ambassador.id !== ws.id) {
            return ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized action.' }));
          }
        }
```

The only place that re-sends `create_session` on open is `tour-details.tsx`. If the ambassador is on `/tour`, `/map`, `/current`, or `building/location-media` when their WS drops, the ambassador-side screens will continue to fire `tour:state_update` or media-push events onto the new socket, all of which the server rejects silently (it sends an `error` message back but nothing in the mobile app reacts to `type: 'error'`).

Fix: re-send `create_session` on every reconnect for ambassadors (e.g. inside `wsManager.connect`'s `onopen` when an ambassador id + active tour id are known), or give the server a lightweight rebind path where an ambassador can re-attach their new `ws.id` to the existing session by proving identity via a validated JWT.

### 2.4 `tour:end` is never actually sent from the mobile app
**Location:** `mobile/components/HamburgerMenu.tsx` lines 49–65, `mobile/app/(tabs)/tour.tsx` `markTourFinished` callers

The "End Tour" menu item calls `markTourFinished(true)`, which only flips a local `tourFinished` flag. The server's `handleTourEnd` (which sets `status='ended'`, broadcasts `session_ended`, and closes every member socket) is never invoked. Consequences:

- Members stay on their active-tour UI and keep receiving `tour_state_updated` broadcasts for as long as the tour session lives in memory.
- The `live_tour_sessions` row stays `active` until `closeInactiveSessions` runs 60+ minutes later.
- If the ambassador restarts the tour for a new group on the same `tour_appointment_id` (or an ambassador-led member lingers), the stale "members" set still receives messages.
- `useResumeTour` will keep offering to resume a tour the ambassador thinks they ended.

Fix: in the "End Tour" flow for an ambassador, send `wsManager.send('tour:end', { tourId })` before navigating away, and only then `markTourFinished(true)`. For members, handle `session_ended` (it's currently unhandled anywhere in the mobile code) to call `markTourFinished(true)` + drop to a "tour ended" screen.

---

## 3. High-impact correctness issues

### 3.1 `join_session` is sent from four different places for the same member
**Locations:** `mobile/app/tour-details.tsx:147 and 357–377`, `mobile/app/(tabs)/map.tsx:393`, `mobile/app/(tabs)/current.tsx:170`, `mobile/hooks/useResumeTour.ts:229`

All four will fire for a single member in a normal session (`tour-details` on initial load → `/map` arrival → `/current` tab switch → resume path). Each `handleJoinSession` call:

- sends back `session_joined`
- hits `ensureLiveTourSessionRow` + a DB `update` on `joined_members`
- fires `member_joined` to the ambassador, which in `tour-details.tsx:306–322` does a setState with an `exists` check (idempotent) and in `tour-roster.tsx:111–120` triggers a full `loadRoster()` round-trip (not idempotent — extra latency and flicker per duplicate).

The server does dedupe `joined_members` (lines 313–315), so DB rows are fine, but each extra call is one unnecessary DB round-trip and one unnecessary broadcast per member per screen navigation.

Fix: centralize member session-join. For example, do it once in a top-level hook or provider keyed on `tourAppointmentId`, and have the tabs subscribe to messages only (`current.tsx` and `map.tsx` don't need to rejoin — their purpose is listening).

### 3.2 Messages lost during any disconnect (no reconnect / no replay)
**Location:** `mobile/services/ws.ts`

`onclose` simply nulls the socket and marks `closed`. There's no reconnect loop, no visibility-change handler, no replay on rejoin. Concretely:

- App backgrounding on iOS/Android kills the WS pretty aggressively. When the app returns, the stale listeners remain but the socket has to be re-opened by the next explicit `wsManager.connect()`.
- The `.on('open', …)` listeners that survived don't carry a re-`join_session` for members (see 3.1 — the screens that do it do so only on first mount).
- Messages fired by the ambassador while a member was disconnected are never replayed on `join_session`. The server code does not send the current `tour_state`/`live_tour_structure` back when a member joins, so the member's UI can silently go out of sync with the leader.

Fix plan (in increasing effort):

1. Add auto-reconnect with exponential backoff in `ws.ts`.
2. Persist a small "desired subscriptions" record (`{tourId, leadId, isAmbassador}`) and replay `authenticate` + `create_session`/`join_session` automatically on every successful reconnect.
3. In `handleJoinSession` (and a new post-rebind path for the ambassador), immediately reply with a `tour_snapshot` message that contains `live_tour_structure`, `visited_locations`, `current_location_id` so the client can do a single, definitive reconcile.

### 3.3 Accumulating `on('open', …)` listeners
**Locations:** `mobile/hooks/useResumeTour.ts:154`, `mobile/hooks/useResumeTour.ts:235`, `mobile/app/tour-details.tsx:153`, `mobile/app/(tabs)/tour.tsx:846`, `mobile/app/(tabs)/current.tsx:394`, `mobile/app/building/location-media.tsx:101 and 120`

Several of these register a function literal as an `open` handler without ever calling `wsManager.off('open', …)`. Each reconnect re-fires all of them (`send`s `join_session` many times, `ambassador:ping` many times, media pushes many times). The pattern used in `tour-details.tsx:367-370` is the right one:

```367:371:mobile/app/tour-details.tsx
            const onOpenForJoin = () => {
              wsManager.send('join_session', { tourId: tId, leadId });
              wsManager.off('open', onOpenForJoin);
            };
            wsManager.on('open', onOpenForJoin);
```

Every other "queue until open" call in the mobile app should mirror that (name the handler and remove it after firing). Better still, fix this once in `ws.ts` by having `send()` use a `once()` helper, since `EventEmitter3` supports `emitter.once()`.

### 3.4 Geofence vs. WS state collision for ambassador-led members on `/tour`
**Location:** `mobile/app/(tabs)/tour.tsx` `checkGeofences` (lines 1053–1141) + `useEffect` deps (1165–1170)

`map.tsx` and `current.tsx` both guard geofence-based `setCurrentLocationId` with `isAmbassadorLedMember`. `tour.tsx` does not. So a member on the Tour tab has two competing writers to `currentLocationId`: `handleTourStateUpdated` (from the ambassador over WS) and the local geofence loop. Combined with the big save effect:

```348:352:mobile/app/(tabs)/tour.tsx
  useEffect(() => {
    if (!isLoading) {
      saveTourState();
    }
  }, [showInterestSelection, selectedInterests, tourStops, visitedLocations, tourStarted, tourFinished, processingTourStart, locationPermissionStatus, currentLocationId, locationEntryTimes, previouslyEnteredLocations, isEditingTour, isLoading, tourPaused, schoolId, userType]);
```

…the member's `currentLocationId` can be overwritten by their own GPS in between ambassador-driven state updates, which then gets persisted to `appStateManager` and resurfaces on other tabs / on resume.

Fix: wrap the `checkGeofences` useEffect in `if (isAmbassadorLedMember) return;` the same way `map.tsx` and `current.tsx` do. Same goes for the analytics side-effects in that function (tour-start, tour-finish, location-duration) — a member shouldn't be emitting their own analytics for the group tour based on their own GPS.

### 3.5 Leader echoes that aren't debounced can ping-pong on ambassador
**Location:** `mobile/app/(tabs)/tour.tsx` lines 355–369

```355:369:mobile/app/(tabs)/tour.tsx
  useEffect(() => {
    const syncStateToServer = async () => {
      if (!isAmbassador) return;
      const tourId = await tourGroupSelectionService.getSelectedTourGroup();
      if (!tourId) return;
      wsManager.send('tour:state_update', {
        tourId,
        state: {
          current_location_id: currentLocationId,
          visited_locations: visitedLocations,
        }
      });
    };
    syncStateToServer();
  }, [isAmbassador, currentLocationId, visitedLocations]);
```

Today this works only because the server deliberately does not echo `tour_state_updated` back to the ambassador. If you ever change `broadcastToMembers` to include the ambassador (tempting for consistency, and already done for `tour_structure_updated` via `tour:start`), this useEffect becomes a loop. Also, a GPS-driven `currentLocationId` change fires one WS write per polling interval — no throttle. For a 15-stop tour over an hour this is fine, but it's worth a `useEffect`-level debounce or a "changed since last send" guard.

---

## 4. Protocol / contract discrepancies

### 4.1 Two near-duplicate events: `tour_structure_updated` vs `tour_list_changed`
- `tour:start` → `tour_structure_updated` (members)
- `tour:structure_update` → `tour_structure_updated` (members) — but **nothing** in the mobile app sends `tour:structure_update`
- `tour:tour-list-changed` → `tour_list_changed` (members) — the actual save flow from the ambassador's "Save Changes" button in `tour.tsx:869`

On the member side, `tour.tsx` subscribes to both and does the same thing. Either consolidate (delete `tour:structure_update` + `tour_list_changed`, standardize on `tour_structure_updated` in both directions), or give them distinct semantics. Right now you'll likely forget which is which the next time you touch this.

### 4.2 Schema tolerates both array and `{generated_tour_order}|{tour_stops}` object formats
**Locations:** `backend/tour-sessions.js` lines 456–468 and 497–511; `mobile/app/(tabs)/tour.tsx` lines 394–402 and 454–463

The "backward compatibility" branches in both server and mobile suggest an older payload format still lurks somewhere. If nothing actually produces the object format any more, remove the branches so a future regression (sending `{ new_structure: { something_else: […] } }`) surfaces as an error instead of a silent empty list (`locationIds = []` → empty tour).

### 4.3 `name` is stripped from media pushes
**Location:** `backend/tour-sessions.js` lines 535–551; mobile `building/location-media.tsx:80-85`

`mediaPayload` sends `{ id, name, media_type, url }`, and `PushedLocationMediaContext.PushedMediaItem` declares `name?`. But `location_media` rows can have `name: null` (your own table in the earlier question had a "Trailblazers logo" with a newline-prefixed name, and an `Earth Sample` video). There's no validation on the server; whatever `media` object arrives is broadcast verbatim. Worth adding a small shape validator on the server to reject payloads missing `url` / `media_type` so a bad ambassador client can't push arbitrary JSON into every member's context.

### 4.4 `member_left` isn't handled anywhere except the roster
`handleDisconnect` emits `member_left` to the ambassador (line 640), and `tour-details.tsx:323–329` removes from `joinedMemberIds`. But `tour-roster.tsx` reloads the whole roster, and no screen informs the member group that a peer left. That last bit is probably fine for your UX, but you should confirm. The bigger issue: the ambassador's roster count in `tour-details.tsx` depends on `member_joined` / `member_left` deltas *plus* on the initial `session_created` `joined_members` array. If that array is missing and falls back to `getJoinedMembers` (lines 233–237), the count is correct only at that snapshot — subsequent disconnects/reconnects rely on broadcast events not being dropped, which ties back to 3.2.

---

## 5. Server-side robustness gaps

### 5.1 No rate limiting or schema validation on WS traffic
`backend/index.js:15` and `backend/app.js` set up an IP rate limiter for HTTP only. The WS layer has no per-socket limits. Nothing prevents:

- an ambassador-led member from hammering `ambassador:ping` (UX DoS against the ambassador's modal + vibration)
- a rogue client from sending huge `tour:state_update` payloads
- malformed payloads like `tour:state_update` with `state: null` → access on `state.current_location_id` is inside the outer `try/catch`, so it'll bounce back "Invalid message format" but is caught by the generic path rather than validated up front

Consider a tiny per-socket token bucket plus `zod`-style schemas keyed by message type.

### 5.2 `closeInactiveSessions` mutates DB but not in-memory `tourSessions`
**Location:** `backend/supabase.mjs` lines 172–219, `backend/index.js:36–42`

Every 10 minutes, sessions inactive for 60+ minutes are flipped to `status='ended'` in DB. But `tourSessions` (the in-memory `Map` in `index.js`) is not touched, and the connected sockets are not closed. So a resilient client can keep sending `tour:state_update` against an "ended" DB row. `updateLiveTourSession` re-creates the row via `ensureLiveTourSessionRow` with `status ?? 'active'` when the row has been updated out from under it, so the tour effectively un-ends itself. If ambassadors are leaving socket connections open overnight, this would manifest as sessions marked ended then mysteriously active again.

Fix: after DB cleanup, iterate `tourSessions`, look up each `tour_appointment_id`'s new status, and if `ended`, `broadcastToMembers` `session_ended`, `close()` each member socket, `ambassador?.close()`, and `tourSessions.delete(tourId)`.

### 5.3 `session_joined` missing a leaderboard snapshot
`handleJoinSession` replies `session_joined` with just `{ tourId }`. A freshly-joined or reconnected member therefore has no way to know the current `live_tour_structure` / `current_location_id` / `visited_locations` without an extra REST trip via `getLiveTourSession`. You already pay that trip in some paths (e.g. `tour-details.tsx:91` and `useResumeTour.ts:86`) but not universally. Shipping the snapshot with `session_joined` would simplify the mobile paths and eliminate the ordering bugs you'll get as 3.1 and 3.2 are cleaned up.

---

## 6. Lower-priority / code-hygiene nits

- `ws.id = uuidv4()` is assigned on every connection but the `ws` type from the `ws` library doesn't reserve `id`, and nothing in the server uses it except the authorization check at line 51. That means equality of authorization is by *object identity plus a freshly-minted uuid*. If you ever move behind a load balancer with sticky connections split across Render instances, this identity check is tied to the instance. If you scale horizontally, you need a shared store (Redis) for session ownership, not an in-process `Map`. Something to plan for before your second school rolls out.
- `url = 'wss://campustourbackend.onrender.com'` is hardcoded in `ws.ts:16`. Everywhere else you gate on `process.env.NODE_ENV` / `VITE_SUPABASE_URL` / etc., but this is hard-wired to prod, which makes local dev testing of the WS flows awkward. Consider reading `expo-constants`'s extra config.
- `tour-details.tsx` useEffect deps use `[userType]` but re-read `userType` *inside* the closure from the stale state (line 249 in the `if (userType === 'ambassador' …)` guard) rather than `currentUserType` it just fetched. You have both in scope; pick one. The stale read is why there's an async `getUserType` recompute inside the message handler (line 224) — that's a smell.
- `PushedLocationMediaContext.tsx:52–63` has the exact same "check user type once at mount and latch" bug that **`RaiseHandContext.tsx:20–27` still has**. The push media one was fixed by attaching unconditionally. The raise-hand one will silently miss every `ambassador_ping` if `userTypeService.isAmbassador()` races the user's selection on `index.tsx`. Attach unconditionally (server already only sends to ambassadors) or re-check `isAmbassador` when `userType` changes.
- `handleAmbassadorPing` dereferences `session.ambassador.tourId` for logging — if the ambassador disconnected, `session.ambassador` is `null` and the log crashes. The outer try/catch in `ws.on('message')` catches it and replies "Invalid message format", but the ping is silently dropped. Move the log or null-check.
- `handleTourStart` interest aggregation reads `analytics_events` where `event_type='interests-chosen'` — any member who re-selects interests will re-insert, and `interestsUsed = Array.from(new Set(...))` dedupes them fine. But nothing ties this to the `live_tour_sessions.selected_interests` you might want to persist for later introspection. Minor.

---

## 7. Suggested fix order

1. **Kill the impersonation paths** (2.1 + 2.2): condition `create_session` on `userType === 'ambassador'` in the mobile client, and validate the Supabase JWT server-side against `tour_appointments.ambassador_id` before promoting anyone to `session.ambassador`.
2. **Make `tour:end` an actual thing** (2.4): wire it into the End Tour menu for ambassadors and handle `session_ended` in a new mobile listener that calls `markTourFinished(true)`.
3. **Consolidate `join_session`** (3.1) + **reconnect with replay** (3.2) + **reply snapshot on `session_joined`** (5.3). These three are really one refactor.
4. **Fix geofence gating on `/tour`** for ambassador-led members (3.4).
5. Cleanup pass on `on('open', …)` listener leaks (3.3) using `once()`.
6. Protocol consolidation (4.1, 4.2).
7. Server robustness (5.1, 5.2) and code-hygiene nits.

If you want, I can switch to Agent mode and take these one at a time starting with 2.1 + 2.4 since those are the highest-impact with the smallest blast radius. Let me know which you'd like me to touch first.
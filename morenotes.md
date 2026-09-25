# Meeting with admissions

## Intake form
- No gender
- First and last
- No address
- Skippable but small
- Change grad year to when you plan to attend
- Student types and other
- Make sure it's only there for prospective students
- They'll 


## Map
- Accessability Directions


## Tours
- Set Default Tours for amb led



- RANDY HUNT to talk to for element
- INTEGRATE WITH element
- Future of Studio Node and it's stability. Will it be supported and maintained
- Cost for them?
- Bulk appointment adding and scheduling and editing






 ▐▛███▜▌   Claude Code v2.1.220
▝▜█████▛▘  Opus 5 (1M context) with high effort · Claude Team
  ▘▘ ▝▝    ~/studioNode/campus-tours


❯ Can you go through the websocket stuff on both sides of and see if there's inconsistencies                                                        

⏺ I'll explore the websocket implementation on both the backend and client sides.

  Searched for 3 patterns, read 3 files, listed 3 directories, ran 13 shell commands 
  ⎿  Interrupted · What should Claude do instead?
 
❯ /fast 
  ⎿  Fast mode OFF
 
❯ Can you go through the websocket stuff on both sides of and see if there's inconsistencies                                                        
 
⏺ I read both sides end to end (backend/tour-sessions.js, backend/index.js, mobile/services/ws.ts and all 10 call sites). Findings ranked by impact
  — no code changed.

  Real bugs

  1. Client heartbeat ping has no server handler
  mobile/services/ws.ts:197 sends {type:'ping'} every 30s. backend/tour-sessions.js:26-38 has no ping entry, so it falls through to the unknown-type
  branch (:85) and replies {type:'error', message:'Unknown message type: ping'}. The client emits that as an error event, so
  app/(tabs)/tour.tsx:542 logs console.error every 30 seconds for every ambassador. The client also filters pong (ws.ts:82) — a message the server
  never sends.

  The subtle part: the client's dead-socket detector (ws.ts:192) keys off any inbound message, and the server's ws.ping() (index.js:54) is a
  protocol frame that never fires onmessage in RN. On an idle tour, that error reply is the only thing keeping lastActivityAt fresh. So silently
  ignoring ping server-side would give you a force-close → reconnect loop every 45s. It needs an actual {type:'pong'} reply.

  2. Nothing on the client ever ends a tour
  tour:end has a complete handler (:627 — sets session ended, appointment completed, broadcasts, closes members, deletes). Zero senders in mobile.
  Sessions and appointments stay active until the 10-minute inactivity sweep picks them up.

  3. session_ended has no listener, and ended sessions resurrect 
  handleTourEnd:648 / evictSessions:816 close member sockets. The client sees a non-intentional close → scheduleReconnect → onSocketOpen replays
  lastSessionMessage (ws.ts:128), which is join_session. ensureSessionExists:164 re-fetches the live_tour_sessions row without checking status,
  restores it to memory, and re-adds the member to joined_members. An ended or inactivity-evicted tour comes back alive. Needs both halves: a client
  session_ended handler that clears lastSessionMessage and marks the close intentional, plus a status guard in ensureSessionExists.

  4. useResumeTour races auth against create_session
  hooks/useResumeTour.ts:157-162 awaits wsManager.authenticate() then immediately sends create_session. authenticate() resolves when the auth frame
  is written, not on auth_ok. ws.on('message', async …) isn't serialized server-side, so handleAuth's await supabase.auth.getUser() can still be in
  flight when handleCreateSession:288 checks ws.user → "Authentication required to create a session." tour-details.tsx:234 gets this right by gating
  on auth_ok. Same operation, two different contracts.

  5. get_members_snapshot has no authorization
  It's an ambassador roster feature (app/tour-roster.tsx:109) but isn't in AMBASSADOR_ONLY_EVENTS and does no membership check (:103) — any
  connected socket that knows a tourId gets connected members' first names. It's also asymmetric with member_joined: the snapshot only returns
  general members (:117-120 filters on generalMemberId), never leads, so the WS-sourced roster and the DB-sourced roster differ in kind, not just
  freshness.

  Contract inconsistencies

  6. tour_started is ambassador-only but members handle it
  handleTourStart:583 replies tour_started to the requesting socket only, and broadcasts tour_structure_updated to members. tour-details.tsx:397
  treats tour_started as a member start-signal (with a comment saying "server implementations differ"). That branch is dead. Members actually move
  on via tour_list_changed, which only arrives because the ambassador client manually re-broadcasts tour:tour-list-changed at tour-details.tsx:320 —
  duplicating the structure the server already pushed as tour_structure_updated. Three overlapping start signals, one of them unreachable.

  7. Envelope shape varies per message
  Client→server is uniformly {type, payload} (ws.ts:276). Server→client is not: payload-nested for tour_list_changed, tour_started, ambassador_ping,
  members_snapshot; top-level for tour_state_updated.state, tour_structure_updated.changes, member_joined.lead/member, member_left.*,
  media_added_to_detail.*, session_created.*. Clients compens Jump to bottom (click) ↓ | msg?.x fallbacks (tour-details.tsx:399-403). Not breaking


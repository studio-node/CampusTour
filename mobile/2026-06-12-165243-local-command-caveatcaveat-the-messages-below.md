 ▐▛███▜▌   Claude Code v2.1.176
▝▜█████▛▘  Fable 5 · Claude Team
  ▘▘ ▝▝    ~/studioNode/campus-tours/mobile


❯ /model                                                                        
  ⎿  Set model to Fable 5 and saved as your default for new sessions

❯ Look for issues in the ambassad0r-led tour part of this project. I suspect    
  that are inconsitencies or things that could be better, list them out now,    
  and we'll fix them next                                                       

⏺ I'll dig into the ambassador-led tour flow across the mobile app, backend
  websocket handling, webapp, and Supabase schema. Let me start by mapping the
  relevant code.

  Searched for 1 pattern, listed 1 directory (ctrl+o to expand)

⏺ 3 Explore agents finished (ctrl+o to expand)
   ├ Audit backend tour sessions · 40 tool uses · 52.7k tokens
   │ ⎿  Done
   ├ Audit mobile ambassador-led code · 43 tool uses · 89.3k tokens
   │ ⎿  Done
   └ Audit webapp + Supabase side · 48 tool uses · 72.6k tokens
     ⎿  Done

  Read 4 files (ctrl+o to expand)

⏺ Mobile side confirmed. Now let me verify the Supabase RLS gap on
  live_tour_sessions and the webapp schema mismatch claim.

  Searched for 5 patterns, read 3 files (ctrl+o to expand)

⏺ All claims verified. One last check — whether anything actually increments
  participants_signed_up (e.g., a DB trigger), then I'll write up the findings.

  Searched for 2 patterns, read 1 file (ctrl+o to expand)

⏺ All key claims are verified. Writing up the findings now.

⏺ Updated plan
  ⎿  /plan to preview

⏺ User approved Claude's plan
  ⎿  Plan saved to: ~/.claude/plans/temporal-hopping-anchor.md · /plan to edit
     Ambassador-Led Tour Audit — Findings

     Context

     Audit of the ambassador-led tour flow across backend websockets
     (backend/tour-sessions.js), mobile client (mobile/services/ws.ts +
     screens/contexts), webapp, and Supabase schema/RLS. Goal: list issues and
     inconsistencies now; fixes come in a follow-up phase. All findings below
     were verified by reading the code directly (file:line refs included).

     Critical

     1. Unauthenticated remote crash vector. ws.on('message') calls
     handler(data.payload, session) without await (backend/tour-sessions.js:61),
     so the outer try/catch does NOT catch async handler rejections. Sending
     {"type":"join_session"} with no payload makes const { tourId, leadId, 
     member } = payload throw (tour-sessions.js:265) → unhandled promise
     rejection → Node crashes by default. Same for create_session (:225) and
     tour:state_update with missing state (:541). No auth needed for
     join_session/create_session.
     2. WS auth is trust-the-client. handleAuth accepts any ambassador_id with
     zero JWT validation (tour-sessions.js:207-220, comment admits "In
     production, validate a real JWT"). Anyone with a tourId can become the
     ambassador, drive the tour, end it, or pull lead PII (email, DOB) by
     joining with an arbitrary leadId (:331-348 fetches select('*') from leads
     with no verification the lead belongs to that tour).
     3. tour:tour-list-changed missing from the ambassador-only guard. The guard
     list at tour-sessions.js:50 covers
     tour:start/state_update/structure_update/end/media:* but not
     tour:tour-list-changed — any socket (even one that never joined) can
     rewrite live_tour_structure in the DB and broadcast a new tour order to all
     members (:596-636).
     4. Ambassador session hijack after disconnect. On ambassador disconnect,
     session.ambassador = null (tour-sessions.js:713); handleCreateSession then
     assigns ambassador to whoever sends create_session next (:243-245).
     Combined with #2, any client can take over a live tour during the real
     ambassador's network blip.
     5. general_confirmation_code and qr_code_token are readable by anon. RLS
     policy tour_appointments_select_public_scheduled (supabase_schema.sql:3747)
     lets anon SELECT entire rows of scheduled/active tours — including the
     confirmation code the mobile app gates entry on. Mobile even verifies the
     code by selecting it client-side (mobile/services/supabase.ts:1342-1356),
     confirming exposure. The join gate is bypassable by anyone.
     6. Webapp tour creation writes columns that don't exist.
     AmbassadorTours.vue:131,133 inserts duration_minutes and meeting_location
     into tour_appointments, but the schema has neither column
     (supabase_schema.sql:2562-2578) → insert fails at runtime; admins cannot
     create tours from this page.

     High

     7. No reconnection or re-join logic on mobile. ws.ts has no
     auto-reconnect/backoff; after a drop, status stays closed until some
     screen's focus effect happens to call connect(). Even then the client never
     re-sends join_session/auth+create_session, so the server's
     session.members/session.ambassador no longer includes the socket and the
     user silently receives nothing mid-tour.
     8. No heartbeat / dead-socket reaping on the server. No ping/pong or
     isAlive sweep; phones that lose connectivity without a close frame stay in
     session.members forever, and joined_members in DB stays stale → roster
     shows "Connected" for people who left (mobile/app/tour-roster.tsx:91-103
     trusts DB joined_members).
     9. Zombie sessions never cleaned up. Sessions are only deleted on tour:end
     (tour-sessions.js:592). If the ambassador never ends the tour, the
     in-memory session and the DB row (status stuck 'active') live forever.
     Server restart also orphans DB rows: ensureSessionExists restores with
     empty members (:127) but never reconciles stale joined_members.
     10. send() queueing leaks listeners and misfires. ws.ts:85-97: while
     connecting, each send registers an 'open' listener with no timeout; if the
     connection errors, listeners persist and fire on a future open, delivering
     stale messages out of order.
     11. Signup capacity is not enforced anywhere real. joinTourGroup is a stub
     returning success in BOTH webapp (tourAppointmentsService.js:248-268) and
     mobile (supabase.ts:1406-1426) — duplicated dead code. Webapp
     hasAvailableSpots(tour, currentParticipants = 0) is always true
     (tourAppointmentsService.js:276). DB triggers maintain
     participants_signed_up (schema:623-637) but nothing enforces
     max_participants at the DB level → concurrent signups overbook. No guard
     against signing up for past tours.
     12. live_tour_sessions is world-readable. Policy "Enable read access for 
     all users" ... USING (true) (supabase_schema.sql:3581) — anon can read
     every school's live sessions: current location, visited stops,
     joined_members UUIDs. Privacy leak + real-time location of tour groups. (No
     write policies exist; backend writes via service role, so writes are
     fine.)

     Medium

     13. Inconsistent message envelopes server→client. Some types wrap data in
     payload (tour_started, tour_list_changed, ambassador_ping,
     members_snapshot); others put fields top-level (member_joined, member_left,
     session_created, tour_state_updated, tour_structure_updated,
     media_added_to_detail, session_ended). Client mirrors this ad hoc
     (tour-roster.tsx:137 reads msg?.member, :157 reads
     msg?.payload?.generalMembers).
     14. Two parallel "structure changed" paths. tour:structure_update
     (tour-sessions.js:554) and tour:tour-list-changed (:596) do nearly the same
     thing with different payload field names (changes.new_structure vs
     newTourStructure) and different broadcast types (tour_structure_updated vs
     tour_list_changed). One should be removed.
     15. tour:state_update broadcasts unsanitized state but persists sanitized 
     state. tour-sessions.js:541-551 filters invalid UUIDs before the DB write
     but broadcasts the raw state — members and DB can disagree.
     16. Dual status vocabularies that never sync. tour_appointments.status ∈
     scheduled/active/completed/cancelled (schema:2577);
     live_tour_sessions.status uses awaiting_start/active/ended. tour:start sets
     the session to 'active' but never moves the appointment out of
     'scheduled'; tour:end sets session 'ended' but appointment is never
     'completed'.
     17. Ambassadors have no UPDATE policy on their own appointments (only
     tour_appointments_update_admin_school, schema:3751, plus an impromptu
     INSERT policy) — any client-side attempt by an ambassador to change
     appointment status will silently no-op under RLS.
     18. Timezone bug in webapp tour creation. AmbassadorTours.vue:120 builds
     ${date}T${time}:00 with no offset into a timestamptz column — interpreted
     as DB/UTC time, so tours are shifted by the school's UTC offset.
     19. Hardcoded prod WS URL. wss://campustourbackend.onrender.com baked into
     ws.ts:16; no env-based config for dev/staging (REST endpoints similar).
     20. members_snapshot omits leads. Snapshot only returns general members
     (tour-sessions.js:89-93); a reconnecting ambassador's roster relies on
     stale DB joined_members for lead connectivity (compounds #8/#9).

     Low

     21. RaiseHandContext checks ambassador status once on mount
     (RaiseHandContext.tsx:20-27); signing in as ambassador later never attaches
     the ping listener until app restart. Also calls wsManager.connect()
     without authenticating.
     22. Duplicate UUID regexes (tour-sessions.js:280 and :532); double .map()
     in handleGetMembersSnapshot (:90-92); commented-out ambassador-disconnect
     notification (:716-720); ResumeTourModal usage commented out in
     ambassador-tours.tsx; wsManager.close() never clears emitter listeners or
     ambassadorId.

     Suggested fix order (next phase)

     1. Crash vector (#1): await handlers, add per-handler payload validation —
     small, immediate win.
     2. Auth (#2, #4, #5): real JWT validation on WS auth; move
     confirmation-code verification server-side; column-restrict or split the
     public tour listing policy.
     3. Guard tour:tour-list-changed (#3) or delete it in favor of
     tour:structure_update (#14).
     4. Reconnect/heartbeat/cleanup (#7, #8, #9, #10).
     5. Schema/webapp fixes (#6, #11, #12, #16, #17, #18).

     Verification

     - Backend: cd backend && npm test (extend
     test/unit/ws/tour-sessions.test.js for each protocol/auth fix).
     - Crash fix: send {"type":"join_session"} with no payload over a raw WS
     client and confirm an error reply instead of a process exit.
     - RLS: query tour_appointments/live_tour_sessions with the anon key and
     confirm sensitive columns are gone.

  Searched for 4 patterns, read 8 files, listed 1 directory, ran 1 shell command (ctrl+o to expand)
⏺ Write(~/studioNode/campus-tours/backend/tour-sessions.js)
  ⎿  Added 189 lines, removed 124 lines
       1  import { v4 as uuidv4 } from 'uuid';
       2  import { createLiveTourSession, updateLiveTourSession, ensureLi
          veTourSessionRow } from './supabase.mjs';
       3  
       4 +// Simple UUID v4 regex so we don't write non-UUIDs (e.g. "0") 
         +to uuid columns                                                
       5 +const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[
         +89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;                              
       6 +function isValidUuid(s) {                                      
       7 +  return typeof s === 'string' && UUID_REGEX.test(s);          
       8 +}                                                              
       9 +                                                               
      10 +// Events only the session's ambassador may send.              
      11 +const AMBASSADOR_ONLY_EVENTS = new Set([                       
      12 +  'tour:start',                                                
      13 +  'tour:state_update',                                         
      14 +  'tour:tour-list-changed',                                    
      15 +  'tour:end',                                                  
      16 +  'tour:media:add-to-detail',                                  
      17 +  'tour:media:push-takeover',                                  
      18 +]);                                                            
      19 +                                                               
      20  // --- Main Session Manager ---
      21  
      22  export function sessionManager(ws, supabase, tourSessions) {
     ...
      24    console.log(`Client connected with ID: ${ws.id}`);
      25  
      26    const messageHandlers = {
      11 -    // Optional auth bootstrap if mobile sends a token or user 
         -id                                                             
      12 -    'auth': async (payload) => handleAuth(ws, supabase, payload
         -),                                                             
      27 +    'auth': (payload) => handleAuth(ws, supabase, payload),    
      28      'create_session': (payload) => handleCreateSession(ws, supa
          base, tourSessions, payload),
      29      'join_session': (payload) => handleJoinSession(ws, supabase
          , tourSessions, payload),
      30      'tour:start': (payload, session) => handleTourStart(ws, sup
          abase, payload, session),
      16 -    'tour:state_update': (payload, session) => handleTourStateU
         -pdate(supabase, session, payload),                             
      17 -    'tour:structure_update': (payload, session) => handleTourSt
         -ructureUpdate(supabase, session, payload),                     
      31 +    'tour:state_update': (payload, session) => handleTourStateU
         +pdate(ws, supabase, session, payload),                         
      32      'tour:tour-list-changed': (payload, session) => handleTourL
          istChanged(supabase, session, payload),
      33      'tour:media:add-to-detail': (payload, session) => handleTou
          rMediaAddToDetail(session, payload),
      34      'tour:media:push-takeover': (payload, session) => handleTou
          rMediaPushTakeover(session, payload),
      21 -    'tour:end': (payload, session) => handleTourEnd(ws, supabas
         -e, tourSessions, payload.tourId, session),                     
      22 -    'ambassador:ping': async (payload, session) => handleAmbass
         -adorPing(ws, supabase, session, payload),                      
      35 +    'tour:end': (payload, session) => handleTourEnd(ws, supabas
         +e, tourSessions, payload, session),                            
      36 +    'ambassador:ping': (payload, session) => handleAmbassadorPi
         +ng(ws, supabase, session, payload),                            
      37      'get_members_snapshot': (payload) => handleGetMembersSnapsh
          ot(ws, tourSessions, payload),
      38    };
      39  
      40    ws.on('message', async (message) => {
      41      try {
      42        const data = JSON.parse(message);
      29 -      console.log('Received message:', data);                  
      43 +      console.log('Received message type:', data?.type);       
      44  
      31 -      const { tourId } = data.payload || {};                   
      45 +      // Normalize so handlers can safely destructure even when
         + payload is missing/malformed.                                 
      46 +      const payload = data && data.payload && typeof data.paylo
         +ad === 'object' ? data.payload : {};                           
      47 +      const { tourId } = payload;                              
      48        let session = tourId ? tourSessions.get(tourId) : undefin
          ed;
      49  
      34 -      // If tour:start is sent before create_session (or server
         - restarted), ensure session exists in DB and memory            
      50 +      // If tour:start is sent before create_session (or server
         + restarted), ensure the session                                
      51 +      // exists in DB and memory — but only for the verified am
         +bassador of this appointment.                                  
      52        if (data.type === 'tour:start' && tourId && !session) {
      36 -        const created = await ensureSessionExists(ws, supabase,
         - tourSessions, tourId, {                                       
      37 -          ambassador_id: (ws.user && ws.user.sub) || null,     
      38 -        });                                                    
      39 -        if (created) {                                         
      40 -          session = tourSessions.get(tourId);                  
      41 -          if (session && !session.ambassador) {                
      42 -            session.ambassador = ws;                           
      53 +        if (await isAuthorizedAmbassador(ws, supabase, tourId))
         + {                                                             
      54 +          const created = await ensureSessionExists(ws, supabas
         +e, tourSessions, tourId, {                                     
      55 +            ambassador_id: ws.user.sub,                        
      56 +          });                                                  
      57 +          if (created) {                                       
      58 +            session = tourSessions.get(tourId);                
      59            }
      60          }
      61        }
      62 +      // Rebind a verified ambassador (e.g. after a reconnect) 
         +before the authorization check.                                
      63 +      if (data.type === 'tour:start' && session && !session.amb
         +assador) {                                                     
      64 +        if (await isAuthorizedAmbassador(ws, supabase, tourId))
         + {                                                             
      65 +          session.ambassador = ws;                             
      66 +        }                                                      
      67 +      }                                                        
      68  
      69        const handler = messageHandlers[data.type];
      70  
      71        if (handler) {
      50 -        if (['tour:start', 'tour:state_update', 'tour:structure
         -_update', 'tour:end', 'tour:media:add-to-detail', 'tour:media:p
         -ush-takeover'].includes(data.type)) {                          
      72 +        if (AMBASSADOR_ONLY_EVENTS.has(data.type)) {           
      73            if (!session || !session.ambassador || session.ambass
          ador.id !== ws.id) {
      74              return ws.send(JSON.stringify({ type: 'error', mess
          age: 'Unauthorized action.' }));
      75            }
     ...
       80            }
       81          }
       82  
       61 -        handler(data.payload, session);                       
       83 +        await handler(payload, session);                      
       84        } else {
       85          console.log(`Unknown message type: ${data.type}`);
       86          ws.send(JSON.stringify({ type: 'error', message: `Unkn
           own message type: ${data.type}` }));
       87        }
       88      } catch (error) {
       89        console.error('Failed to parse message or handle event:'
           , error);
       68 -      ws.send(JSON.stringify({ type: 'error', message: 'Invali
          -d message format.' }));                                       
       90 +      if (ws.readyState === 1) {                              
       91 +        ws.send(JSON.stringify({ type: 'error', message: 'Inva
          +lid message format.' }));                                     
       92 +      }                                                       
       93      }
       94    });
       95  
       72 -  ws.on('close', () => handleDisconnect(ws, supabase, tourSess
          -ions));                                                       
       96 +  ws.on('close', () => {                                      
       97 +    handleDisconnect(ws, supabase, tourSessions).catch((error)
          + => {                                                         
       98 +      console.error('Error handling disconnect:', error);     
       99 +    });                                                       
      100 +  });                                                         
      101  }
      102  
      103  function handleGetMembersSnapshot(ws, tourSessions, payload) {
       76 -  const { tourId } = payload || {};                           
      104 +  const { tourId } = payload;                                 
      105    if (!tourId) {
      106      ws.send(JSON.stringify({ type: 'error', message: 'tourId i
           s required.' }));
      107      return;
     ...
      117    const generalMembers = Array.from(session.members || [])
      118      .map((m) => ({ id: m.generalMemberId, first_name: m.genera
           lFirstName }))
      119      .filter((m) => !!m.id && !!m.first_name)
       92 -    .map((m) => ({ id: m.id, first_name: m.first_name }))     
      120      .sort((a, b) => a.first_name.localeCompare(b.first_name, u
           ndefined, { sensitivity: 'base' }));
      121  
      122    ws.send(JSON.stringify({ type: 'members_snapshot', payload: 
           { tourId, generalMembers } }));
     ...
      132    });
      133  }
      134  
      135 +// True only when this socket has authenticated as the ambassa
          +dor assigned to the appointment.                              
      136 +async function isAuthorizedAmbassador(ws, supabase, tourId) { 
      137 +  if (!ws.user || !ws.user.sub) {                             
      138 +    return false;                                             
      139 +  }                                                           
      140 +  try {                                                       
      141 +    const { data: appt, error } = await supabase              
      142 +      .from('tour_appointments')                              
      143 +      .select('ambassador_id')                                
      144 +      .eq('id', tourId)                                       
      145 +      .single();                                              
      146 +    return !error && !!appt && appt.ambassador_id === ws.user.
          +sub;                                                          
      147 +  } catch (error) {                                           
      148 +    console.error('Error verifying ambassador for tour:', erro
          +r);                                                           
      149 +    return false;                                             
      150 +  }                                                           
      151 +}                                                             
      152 +                                                              
      153  // Ensures a session exists in memory and database. Creates it
            if it doesn't exist.
      154  // Returns the session object or null if creation failed.
      155  async function ensureSessionExists(ws, supabase, tourSessions,
            tourId, options = {}) {
     ...
      166        .select('*')
      167        .eq('tour_appointment_id', tourId)
      168        .single();
      124 -                                                              
      169 +                                                              
      170      if (!fetchError && existingSession) {
      126 -      // Session exists in DB but not in memory - restore it  
      171 +      // Session exists in DB but not in memory (e.g. server r
          +estart) - restore it.                                         
      172 +      // Nobody from the old process is still connected, so cl
          +ear stale joined_members;                                     
      173 +      // connected clients re-add themselves when they rejoin.
      174        session = { ambassador: null, members: new Set() };
      175        tourSessions.set(tourId, session);
      176 +      if (Array.isArray(existingSession.joined_members) && exi
          +stingSession.joined_members.length > 0) {                     
      177 +        await updateLiveTourSession(supabase, tourId, { joined
          +_members: [] });                                              
      178 +      }                                                       
      179        console.log(`Restored session ${tourId} from database`);
      180        return session;
      181      }
     ...
      185  
      186    // Session doesn't exist - create it
      187    console.log(`No session found for ${tourId}. Creating new se
           ssion.`);
      138 -                                                              
      188 +                                                              
      189    // Fetch ambassador_id from tour_appointments if not provide
           d
      190    let ambassadorId = options.ambassador_id || (ws.user && ws.u
           ser.sub) || null;
      191    if (!ambassadorId) {
     ...
      195          .select('ambassador_id')
      196          .eq('id', tourId)
      197          .single();
      148 -                                                              
      198 +                                                              
      199        if (!tourApptError && tourAppt?.ambassador_id) {
      200          ambassadorId = tourAppt.ambassador_id;
      201          console.log(`Fetched ambassador_id ${ambassadorId} fro
           m tour appointment ${tourId}`);
     ...
      206        console.error('Exception fetching tour appointment:', er
           ror);
      207      }
      208    }
      159 -                                                              
      209 +                                                              
      210    // ambassador_id is required by the database schema
      211    // It should always be available from tour_appointments
      212    if (!ambassadorId) {
     ...
      230          .select('*')
      231          .eq('tour_appointment_id', tourId)
      232          .single();
      183 -                                                              
      233 +                                                              
      234        if (!fetchError && existingSession) {
      235          // Session was created by another process - restore it
      236          session = { ambassador: null, members: new Set() };
     ...
      241      } catch (error) {
      242        console.error('Error fetching session after creation fai
           lure:', error);
      243      }
      194 -                                                              
      244 +                                                              
      245      console.error(`Failed to create session in database for to
           ur ${tourId}`);
      246      return null;
      247    }
     ...
      252    return session;
      253  }
      254  
      205 -// Basic auth handler to attach a minimal user object to the w
          -ebsocket connection.                                          
      206 -// In production, validate a real JWT and fetch the user from 
          -Supabase.                                                     
      207 -async function handleAuth(ws, _supabase, payload) {           
      255 +// Validates the Supabase access token and attaches the verifi
          +ed user to the connection.                                    
      256 +async function handleAuth(ws, supabase, payload) {            
      257    try {
      209 -    const ambassadorId = payload?.sub || payload?.ambassador_i
          -d || payload?.userId || null;                                 
      210 -    if (!ambassadorId) {                                      
      211 -      ws.send(JSON.stringify({ type: 'error', message: 'Missin
          -g ambassador id for auth.' }));                               
      258 +    const token = typeof payload.token === 'string' ? payload.
          +token.trim() : '';                                            
      259 +    if (!token) {                                             
      260 +      ws.send(JSON.stringify({ type: 'error', message: 'Missin
          +g auth token.' }));                                           
      261        return;
      262      }
      214 -    ws.user = { sub: ambassadorId };                          
      263 +                                                              
      264 +    const { data, error } = await supabase.auth.getUser(token)
          +;                                                             
      265 +    if (error || !data?.user?.id) {                           
      266 +      ws.send(JSON.stringify({ type: 'error', message: 'Invali
          +d auth token.' }));                                           
      267 +      return;                                                 
      268 +    }                                                         
      269 +                                                              
      270 +    ws.user = { sub: data.user.id };                          
      271      ws.send(JSON.stringify({ type: 'auth_ok' }));
      272    } catch (e) {
      273      console.error('Auth error:', e);
     ...
      284      return;
      285    }
      286  
      287 +  // Only the verified ambassador assigned to the appointment 
          +may run the session.                                          
      288 +  if (!ws.user || !ws.user.sub) {                             
      289 +    ws.send(JSON.stringify({ type: 'error', message: 'Authenti
          +cation required to create a session.' }));                    
      290 +    return;                                                   
      291 +  }                                                           
      292 +  if (!(await isAuthorizedAmbassador(ws, supabase, tourId))) {
      293 +    ws.send(JSON.stringify({ type: 'error', message: 'Unauthor
          +ized action.' }));                                            
      294 +    return;                                                   
      295 +  }                                                           
      296 +                                                              
      297    // Ensure session exists (creates if it doesn't)
      298    const session = await ensureSessionExists(ws, supabase, tour
           Sessions, tourId, {
      233 -    ambassador_id: (ws.user && ws.user.sub) || payload.ambassa
          -dor_id || null,                                               
      299 +    ambassador_id: ws.user.sub,                               
      300      initial_structure: initial_structure || {},
      301    });
      302  
     ...
      305      return;
      306    }
      307  
      242 -  // Set ambassador if not already set                        
      243 -  if (!session.ambassador) {                                  
      244 -    session.ambassador = ws;                                  
      245 -  }                                                           
      308 +  // Bind (or rebind after a reconnect) the verified ambassado
          +r to this socket.                                             
      309 +  session.ambassador = ws;                                    
      310  
      311    ws.tourId = tourId;
      312    console.log(`Ambassador ${ws.id} created/joined session: ${t
           ourId}`);
      249 -                                                              
      313 +                                                              
      314    // Fetch the session data from DB to send back
      315    try {
      316      const { data: sessionData } = await supabase
     ...
      327  
      328  async function handleJoinSession(ws, supabase, tourSessions, p
           ayload) {
      329    const { tourId, leadId, member } = payload;
      266 -                                                              
      330 +                                                              
      331    if (!tourId) {
      332      ws.send(JSON.stringify({ type: 'error', message: 'tourId i
           s required to join session.' }));
      333      return;
     ...
      341      return;
      342    }
      343  
      280 -  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}
          --[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;                           
      344    const generalMemberId = isGeneralJoin ? member?.id : null;
      345    const generalFirstName = isGeneralJoin ? (member?.first_name
            || '').toString().trim() : '';
      346  
      347    if (isGeneralJoin) {
      285 -    if (!generalMemberId || !uuidRegex.test(generalMemberId)) 
          -{                                                             
      348 +    if (!generalMemberId || !isValidUuid(generalMemberId)) {  
      349        ws.send(JSON.stringify({ type: 'error', message: 'Invali
           d member.id.' }));
      350        return;
      351      }
     ...
      365          .select('ambassador_id')
      366          .eq('id', tourId)
      367          .single();
      305 -                                                              
      368 +                                                              
      369        if (!tourApptError && tourAppt?.ambassador_id) {
      370          ambassadorId = tourAppt.ambassador_id;
      371          console.log(`Fetched ambassador_id ${ambassadorId} fro
           m tour appointment for join_session`);
     ...
      387      return;
      388    }
      389  
      327 -  // For leads, fetch full information from database. For gene
          -ral members, we only have the provided name.                  
      390 +  // For leads, fetch their information from the database. The
          + lead must belong to this tour —                              
      391 +  // otherwise anyone with a lead UUID could pull that lead's 
          +PII into a session they control.                              
      392    let leadInfo = null;
      393    if (isLeadJoin) {
      394      try {
      395        const { data: lead, error: leadError } = await supabase
      396          .from('leads')
      333 -        .select('*')                                          
      397 +        .select('id, first_name, last_name, email, identity, d
          +ate_of_birth, expected_attendance')                           
      398 +        .eq('tour_appointment_id', tourId)                    
      399          .eq('id', leadId)
      400          .single();
      336 -                                                              
      401 +                                                              
      402        if (leadError || !lead) {
      403          console.error('Error fetching lead:', leadError);
      404          ws.send(JSON.stringify({ type: 'error', message: 'Inva
           lid leadId.' }));
     ...
      451    ws.tourId = tourId;
      452    console.log(`Client ${ws.id} joined tour: ${tourId} (${isLea
           dJoin ? `leadId: ${leadId}` : `generalMemberId: ${generalMembe
           rId}`})`);
      453    ws.send(JSON.stringify({ type: 'session_joined', tourId }));
      389 -                                                              
      454 +                                                              
      455    // Notify ambassador with full lead/member information
      456    if (session.ambassador && session.ambassador.readyState === 
           1) {
      457      if (isLeadJoin && leadInfo) {
     ...
      459          .filter(Boolean)
      460          .join(' ')
      461          .trim() || 'Member';
      397 -      session.ambassador.send(JSON.stringify({                
      398 -        type: 'member_joined',                                
      462 +      session.ambassador.send(JSON.stringify({                
      463 +        type: 'member_joined',                                
      464          lead: {
      465            id: leadInfo.id,
      466            name: displayName,
     ...
      506  }
      507  
      508  async function handleTourStart(ws, supabase, payload, session)
            {
      444 -  const tourId = payload?.tourId;                             
      445 -  const payloadTemplateId = payload?.preconfiguredTourId || nu
          -ll;                                                           
      509 +  const tourId = payload.tourId;                              
      510 +  const payloadTemplateId = payload.preconfiguredTourId || nul
          +l;                                                            
      511    if (!tourId) {
      512      ws.send(JSON.stringify({ type: 'error', message: 'tourId i
           s required.' }));
      513      return;
      514    }
      515    console.log(`Starting tour ${tourId}`);
      451 -  // Bind ambassador to this session if not set yet           
      452 -  if (!session.ambassador) {                                  
      453 -    session.ambassador = ws;                                  
      454 -  }                                                           
      516  
      517    let selectedTemplate = null;
      518    let generatedOrder = [];
     ...
      569      live_tour_structure: generatedOrder,
      570    });
      571  
      572 +  // Keep the appointment's status in sync with the live sessi
          +on.                                                           
      573 +  try {                                                       
      574 +    await supabase                                            
      575 +      .from('tour_appointments')                              
      576 +      .update({ status: 'active', updated_at: new Date().toISO
          +String() })                                                   
      577 +      .eq('id', tourId);                                      
      578 +  } catch (error) {                                           
      579 +    console.error('Error marking tour appointment active:', er
          +ror);                                                         
      580 +  }                                                           
      581 +                                                              
      582    // Return selected template snapshot to ambassador.
      583    ws.send(JSON.stringify({
      584      type: 'tour_started',
     ...
      599    }
      600  }
      601  
      531 -// Simple UUID v4 regex so we don't write non-UUIDs (e.g. "0")
          - to uuid columns                                              
      532 -const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-
          -[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;                            
      533 -function isValidUuid(s) {                                     
      534 -  return typeof s === 'string' && UUID_REGEX.test(s);         
      535 -}                                                             
      536 -                                                              
      537 -async function handleTourStateUpdate(supabase, session, payloa
          -d) {                                                          
      602 +async function handleTourStateUpdate(ws, supabase, session, pa
          +yload) {                                                      
      603    const { tourId, state } = payload;
      604 +  if (!tourId || !state || typeof state !== 'object') {       
      605 +    ws.send(JSON.stringify({ type: 'error', message: 'tourId a
          +nd state are required.' }));                                  
      606 +    return;                                                   
      607 +  }                                                           
      608    console.log(`Broadcasting and persisting state update for to
           ur ${tourId}:`, state);
      609  
      610    const current_location_id = isValidUuid(state.current_locati
           on_id) ? state.current_location_id : null;
     ...
      617      visited_locations,
      618    });
      619  
      551 -  broadcastToMembers(session, { type: 'tour_state_updated', st
          -ate });                                                       
      552 -}                                                             
      553 -                                                              
      554 -async function handleTourStructureUpdate(supabase, session, pa
          -yload) {                                                      
      555 -  const { tourId, changes } = payload;                        
      556 -  console.log(`Broadcasting and persisting structure update fo
          -r tour ${tourId}:`, changes);                                 
      557 -                                                              
      558 -  // Extract location IDs - handle both array format and objec
          -t format for backward compatibility                           
      559 -  let locationIds = [];                                       
      560 -  if (Array.isArray(changes.new_structure)) {                 
      561 -    // Already in simple array format                         
      562 -    locationIds = changes.new_structure;                      
      563 -  } else if (changes.new_structure.generated_tour_order && Arr
          -ay.isArray(changes.new_structure.generated_tour_order)) {     
      564 -    // Object format with generated_tour_order                
      565 -    locationIds = changes.new_structure.generated_tour_order; 
      566 -  } else if (changes.new_structure.tour_stops && Array.isArray
          -(changes.new_structure.tour_stops)) {                         
      567 -    // Extract location IDs from full objects                 
      568 -    locationIds = changes.new_structure.tour_stops.map(stop =>
          -                                                              
      569 -      typeof stop === 'string' ? stop : stop.id               
      570 -    );                                                        
      571 -  }                                                           
      572 -                                                              
      573 -  // Store just the array of location IDs                     
      574 -  await updateLiveTourSession(supabase, tourId, {             
      575 -    live_tour_structure: locationIds,                         
      620 +  // Broadcast the same sanitized state we persisted so member
          +s and DB never diverge.                                       
      621 +  broadcastToMembers(session, {                               
      622 +    type: 'tour_state_updated',                               
      623 +    state: { ...state, current_location_id, visited_locations 
          +},                                                            
      624    });
      577 -                                                              
      578 -  // Broadcast just the array of location IDs                 
      579 -  broadcastToMembers(session, {                               
      580 -    type: 'tour_structure_updated',                           
      581 -    changes: { new_structure: locationIds }                   
      582 -  });                                                         
      625  }
      626  
      585 -async function handleTourEnd(ws, supabase, tourSessions, tourI
          -d, session) {                                                 
      627 +async function handleTourEnd(ws, supabase, tourSessions, paylo
          +ad, session) {                                                
      628 +  const { tourId } = payload;                                 
      629 +  if (!tourId) {                                              
      630 +    ws.send(JSON.stringify({ type: 'error', message: 'tourId i
          +s required.' }));                                             
      631 +    return;                                                   
      632 +  }                                                           
      633    console.log(`Ending tour ${tourId}`);
      634  
      635    await updateLiveTourSession(supabase, tourId, { status: 'end
           ed' });
      636  
      637 +  // Keep the appointment's status in sync with the live sessi
          +on.                                                           
      638 +  try {                                                       
      639 +    await supabase                                            
      640 +      .from('tour_appointments')                              
      641 +      .update({ status: 'completed', updated_at: new Date().to
          +ISOString() })                                                
      642 +      .eq('id', tourId);                                      
      643 +  } catch (error) {                                           
      644 +    console.error('Error marking tour appointment completed:',
          + error);                                                      
      645 +  }                                                           
      646 +                                                              
      647    broadcastToMembers(session, { type: 'session_ended', message
           : 'The ambassador has ended the tour.' });
      648    session.members.forEach(member => member.close());
      649    tourSessions.delete(tourId);
     ...
      660      if (Array.isArray(newTourStructure)) {
      661        // Already in simple array format
      662        locationIds = newTourStructure;
      606 -    } else if (newTourStructure.generated_tour_order && Array.
          -isArray(newTourStructure.generated_tour_order)) {             
      663 +    } else if (newTourStructure?.generated_tour_order && Array
          +.isArray(newTourStructure.generated_tour_order)) {            
      664        // Object format with generated_tour_order
      665        locationIds = newTourStructure.generated_tour_order;
      609 -    } else if (newTourStructure.tour_stops && Array.isArray(ne
          -wTourStructure.tour_stops)) {                                 
      666 +    } else if (newTourStructure?.tour_stops && Array.isArray(n
          +ewTourStructure.tour_stops)) {                                
      667        // Extract location IDs from full objects
      611 -      locationIds = newTourStructure.tour_stops.map(stop =>   
      668 +      locationIds = newTourStructure.tour_stops.map(stop =>   
      669          typeof stop === 'string' ? stop : stop.id
      670        );
      671      }
     ...
      676      });
      677  
      678      // Broadcast just the array of location IDs
      622 -    broadcastToMembers(session, {                             
      623 -      type: 'tour_list_changed',                              
      679 +    broadcastToMembers(session, {                             
      680 +      type: 'tour_list_changed',                              
      681        payload: {
      682          tourId,
      683          newTourStructure: locationIds, // Just the array of lo
           cation IDs
     ...
      712  
      713  async function handleAmbassadorPing(ws, supabase, session, pay
           load) {
      714    console.log(`Member ${ws.id} is pinging the ambassador`);
      658 -                                                              
      715 +                                                              
      716    // Fetch lead information to get the member's name
      717    let memberName = 'A member';
      718    const leadId = ws.leadId;
      719    const generalFirstName = ws.generalFirstName;
      720    const generalMemberId = ws.generalMemberId;
      664 -                                                              
      721 +                                                              
      722    if (generalFirstName) {
      723      memberName = generalFirstName;
      724    } else if (leadId) {
     ...
      728          .select('first_name, last_name')
      729          .eq('id', leadId)
      730          .single();
      674 -                                                              
      731 +                                                              
      732        if (!leadError && lead) {
      733          const n = [lead.first_name, lead.last_name].filter(Boo
           lean).join(' ').trim();
      734          if (n) memberName = n;
     ...
      738        // Continue with default name if fetch fails
      739      }
      740    }
      684 -                                                              
      741 +                                                              
      742    // Send ping notification to ambassador
      743    if (session.ambassador && session.ambassador.readyState === 
           1) {
      744      session.ambassador.send(JSON.stringify({
     ...
      765          // Ambassador disconnected - don't end the tour, just 
           remove ambassador reference
      766          // This allows the ambassador to rejoin later
      767          console.log(`Ambassador for tour ${tourId} disconnecte
           d. Tour continues, ambassador can rejoin.`);
      711 -                                                              
      768 +                                                              
      769          // Clear the ambassador reference but keep the session
            active
      770          session.ambassador = null;
      714 -                                                              
      715 -        // Optionally notify members that ambassador disconnec
          -ted (but tour continues)                                      
      716 -        // Uncomment if you want to notify members:           
      717 -        // broadcastToMembers(session, {                      
      718 -        //   type: 'ambassador_disconnected',                 
      719 -        //   message: 'The ambassador has disconnected. The to
          -ur will continue when they rejoin.'                           
      720 -        // });                                                
      721 -                                                              
      722 -        // Do NOT:                                            
      723 -        // - Update status to 'ended' (keep it 'active')      
      724 -        // - Close member connections                         
      725 -        // - Delete the session                               
      771        } else if (session.members.has(ws)) {
      772          session.members.delete(ws);
      773          console.log(`Member ${ws.id} left tour ${tourId}.`);
      729 -                                                              
      774 +                                                              
      775          // Remove member id from joined_members array in datab
           ase
      776          const idToRemove = leadId || generalMemberId;
      777          if (idToRemove) {
     ...
      790              console.error('Exception removing leadId from join
           ed_members:', error);
      791            }
      792          }
      748 -                                                              
      793 +                                                              
      794          // Notify ambassador
      795          if (session.ambassador && session.ambassador.readyStat
           e === 1) {
      751 -          session.ambassador.send(JSON.stringify({            
      752 -            type: 'member_left',                              
      796 +          session.ambassador.send(JSON.stringify({            
      797 +            type: 'member_left',                              
      798              leadId: leadId || null,
      799              leftMemberId: idToRemove || null,
      800              is_general: !!(generalMemberId && !leadId),
      756 -            socketMemberId: ws.id                             
      801 +            socketMemberId: ws.id                             
      802            }));
      803          }
      804        }
      805      }
      806    }
      807  }
      808 +                                                              
      809 +// Evicts in-memory sessions whose DB rows were closed by the 
          +inactivity sweep.                                             
      810 +export function evictSessions(tourSessions, tourIds) {        
      811 +  let evicted = 0;                                            
      812 +  for (const tourId of tourIds || []) {                       
      813 +    const session = tourSessions.get(tourId);                 
      814 +    if (!session) continue;                                   
      815 +    broadcastToMembers(session, { type: 'session_ended', messa
          +ge: 'The tour has ended due to inactivity.' });               
      816 +    session.members.forEach(member => member.close());        
      817 +    if (session.ambassador && session.ambassador.readyState ==
          += 1) {                                                        
      818 +      session.ambassador.send(JSON.stringify({ type: 'session_
          +ended', message: 'The tour has ended due to inactivity.' })); 
      819 +    }                                                         
      820 +    tourSessions.delete(tourId);                              
      821 +    evicted++;                                                
      822 +  }                                                           
      823 +  if (evicted > 0) {                                          
      824 +    console.log(`Evicted ${evicted} inactive session(s) from m
          +emory.`);                                                     
      825 +  }                                                           
      826 +  return evicted;                                             
      827 +}                                                             

  Searched for 1 pattern (ctrl+o to expand)

⏺ The user's global rules say not to modify existing test files — so I'll keep
  closeInactiveSessions's return type unchanged and add a new helper
  (getEndedSessionIds) instead, with new tests in a separate file.

⏺ Update(~/studioNode/campus-tours/backend/supabase.mjs)
  ⎿  Added 29 lines
      164  }
      165  
      166  /**
      167 + * Returns the subset of the given tour appointment ids whose 
          +live session rows are 'ended'.                                
      168 + * Used to evict in-memory sessions after the inactivity sweep
          + closes their DB rows.                                        
      169 + * @param {Object} supabase - Supabase client instance        
      170 + * @param {string[]} tourIds - Tour appointment ids currently 
          +held in memory                                                
      171 + * @returns {Promise<string[]>}                               
      172 + */                                                           
      173 +export async function getEndedSessionIds(supabase, tourIds) { 
      174 +  if (!Array.isArray(tourIds) || tourIds.length === 0) {      
      175 +    return [];                                                
      176 +  }                                                           
      177 +  try {                                                       
      178 +    const { data, error } = await supabase                    
      179 +      .from('live_tour_sessions')                             
      180 +      .select('tour_appointment_id')                          
      181 +      .in('tour_appointment_id', tourIds)                     
      182 +      .eq('status', 'ended');                                 
      183 +                                                              
      184 +    if (error) {                                              
      185 +      console.error('Error fetching ended sessions:', error); 
      186 +      return [];                                              
      187 +    }                                                         
      188 +    return (data || []).map((row) => row.tour_appointment_id);
      189 +  } catch (error) {                                           
      190 +    console.error('Exception fetching ended sessions:', error)
          +;                                                             
      191 +    return [];                                                
      192 +  }                                                           
      193 +}                                                             
      194 +                                                              
      195 +/**                                                           
      196   * Closes inactive sessions that haven't been updated in the l
           ast hour.
      197   * Sessions with status 'ended' are excluded from this check.
      198   * @param {Object} supabase - Supabase client instance

⏺ Update(~/studioNode/campus-tours/backend/index.js)
  ⎿  Added 2 lines, removed 2 lines
      1  import { WebSocketServer } from 'ws';
      2  import GeminiCaller from './gemini_caller.mjs';
      3  import { createClient } from '@supabase/supabase-js';
      4 -import { getLocations, closeInactiveSessions } from './supabase.
        -mjs';                                                           
      5 -import { sessionManager } from './tour-sessions.js';            
      4 +import { getLocations, closeInactiveSessions, getEndedSessionIds
        + } from './supabase.mjs';                                       
      5 +import { sessionManager, evictSessions } from './tour-sessions.j
        +s';                                                             
      6  import { createApp, createIpRateLimiter, RATE_LIMIT_WINDOW_MS, R
         OUTES_RATE_LIMIT_WINDOW_MS, ROUTES_RATE_LIMIT_MAX_REQUESTS } fro
         m './app.js';
      7  
      8  const port = process.env.PORT || 3000;

⏺ Update(~/studioNode/campus-tours/backend/index.js)
  ⎿  Added 25 lines, removed 1 line
      34  const wss = new WebSocketServer({ server });
      35  
      36  // Pass the Supabase client into the session manager so handler
          s can auth and persist
      37 -wss.on('connection', ws => sessionManager(ws, supabase, tourSes
         -sions));                                                       
      37 +wss.on('connection', ws => {                                   
      38 +  ws.isAlive = true;                                           
      39 +  ws.on('pong', () => { ws.isAlive = true; });                 
      40 +  sessionManager(ws, supabase, tourSessions);                  
      41 +});                                                            
      42  
      43 +// Heartbeat: terminate sockets that miss a ping/pong round so 
         +dead phones don't                                              
      44 +// linger in session member lists (terminate fires 'close' → no
         +rmal disconnect cleanup).                                      
      45 +const HEARTBEAT_INTERVAL_MS = 30 * 1000;                       
      46 +                                                               
      47 +setInterval(() => {                                            
      48 +  wss.clients.forEach(ws => {                                  
      49 +    if (ws.isAlive === false) {                                
      50 +      console.log(`Terminating unresponsive client ${ws.id}`); 
      51 +      return ws.terminate();                                   
      52 +    }                                                          
      53 +    ws.isAlive = false;                                        
      54 +    ws.ping();                                                 
      55 +  });                                                          
      56 +}, HEARTBEAT_INTERVAL_MS);                                     
      57 +                                                               
      58  // Set up interval to check for inactive sessions every 10 minu
          tes
      59  const INACTIVE_SESSION_CHECK_INTERVAL_MS = 10 * 60 * 1000; // 1
          0 minutes
      60  
     ...
      64    if (closedCount > 0) {
      65      console.log(`Session timeout check completed: ${closedCount
          } session(s) closed.`);
      66    }
      67 +  // Evict in-memory sessions whose DB rows are now ended, so t
         +hey don't leak forever.                                        
      68 +  if (tourSessions.size > 0) {                                 
      69 +    const endedIds = await getEndedSessionIds(supabase, Array.f
         +rom(tourSessions.keys()));                                     
      70 +    evictSessions(tourSessions, endedIds);                     
      71 +  }                                                            
      72  }, INACTIVE_SESSION_CHECK_INTERVAL_MS);
      73  
      74  console.log(`Session timeout checker initialized: checking ever
          y ${INACTIVE_SESSION_CHECK_INTERVAL_MS / 1000 / 60} minutes`);

⏺ Update(~/studioNode/campus-tours/backend/test/helpers/mock-supabase.js)
  ⎿  Added 12 lines
      48      singleByTableAndEq: new Map(),
      49      lastUpdatePayload: null,
      50      lastInsertPayload: null,
      51 +    authUsersByToken: new Map(),                               
      52    };
      53  
      54    return {
     ...
      59        }
      60        state.singleByTableAndEq.get(table).set(eqValue, response
          );
      61      },
      62 +    setAuthUser(token, userId) {                               
      63 +      state.authUsersByToken.set(token, userId);               
      64 +    },                                                         
      65 +    auth: {                                                    
      66 +      getUser: async (token) => {                              
      67 +        if (state.authUsersByToken.has(token)) {               
      68 +          return { data: { user: { id: state.authUsersByToken.g
         +et(token) } }, error: null };                                  
      69 +        }                                                      
      70 +        return { data: { user: null }, error: { message: 'Inval
         +id token' } };                                                 
      71 +      },                                                       
      72 +    },                                                         
      73      from(table) {
      74        state.currentTable = table;
      75        return makeEqChain(state);

⏺ Write(~/studioNode/campus-tours/backend/test/unit/ws/tour-sessions-security.te
       st.js)
  ⎿  Wrote 231 lines to
     ../backend/test/unit/ws/tour-sessions-security.test.js
       1 import test from 'node:test';
       2 import assert from 'node:assert/strict';
         sions.js';
       4 import { FakeWs, emitClientMessage, flushAsync } from '../../hel
         pers/fake-ws.js';
         js';
       6 
       7 function attachClient({ supabase, tourSessions }) {
       9   sessionManager(ws, supabase, tourSessions);
      10   return ws;
     … +257 lines (ctrl+o to expand)

  Ran 1 shell command (ctrl+o to expand)

⏺ Update(~/studioNode/campus-tours/backend/test/unit/ws/tour-sessions-security.t
        est.js)
  ⎿  Added 3 lines, removed 4 lines
      63    emitClientMessage(ws, { type: 'auth', payload: { sub: 'amb-1'
           } });
      64    await flushAsync();
      65  
      66 -  assert.equal(ws.sentMessages[0].type, 'error');              
      67 -  assert.match(ws.sentMessages[0].message, /invalid auth token/
         -i);                                                            
      68 -  assert.equal(ws.sentMessages[1].type, 'error');              
      69 -  assert.match(ws.sentMessages[1].message, /missing auth token/
         -i);                                                            
      66 +  // Replies can arrive out of order (token validation is async
         +); assert on the set.                                          
      67 +  const messages = ws.sentMessages.map((m) => `${m.type}:${m.me
         +ssage}`).sort();                                               
      68 +  assert.deepEqual(messages, ['error:Invalid auth token.', 'err
         +or:Missing auth token.']);                                     
      69    assert.equal(ws.user, undefined);
      70  });
      71  

  Searched for 1 pattern, ran 1 shell command (ctrl+o to expand)
⏺ Write(services/ws.ts)
  ⎿  Added 113 lines, removed 20 lines
      1  import EventEmitter from 'eventemitter3';
      2 +import { authService } from '@/services/supabase';              
      3  
      4  type WebSocketMessage = {
      5    type: string;
     ...
       9  
      10  type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'close
          d' | 'error';
      11  
      12 +// WS endpoint from .env (EXPO_PUBLIC_WS_URL), falling back to 
         +the backend URL                                                
      13 +// (EXPO_PUBLIC_BACKEND_URL) with the scheme swapped to ws(s). 
      14 +function resolveWsUrl(): string {                              
      15 +  const explicit = process.env.EXPO_PUBLIC_WS_URL?.trim();     
      16 +  if (explicit) return explicit;                               
      17 +  const backend = process.env.EXPO_PUBLIC_BACKEND_URL?.trim(); 
      18 +  if (backend) return backend.replace(/^http/, 'ws');          
      19 +  return 'wss://campustourbackend.onrender.com';               
      20 +}                                                              
      21 +                                                               
      22 +const RECONNECT_BASE_DELAY_MS = 1000;                          
      23 +const RECONNECT_MAX_DELAY_MS = 30000;                          
      24 +                                                               
      25  class WebSocketManager {
      26    private static instance: WebSocketManager;
      27    private socket: WebSocket | null = null;
      28    private emitter = new EventEmitter();
      29    private status: ConnectionStatus = 'idle';
      16 -  private url = 'wss://campustourbackend.onrender.com';        
      17 -  private ambassadorId: string | null = null;                  
      30 +  private url = resolveWsUrl();                                
      31 +  private shouldAuthenticate = false;                          
      32 +  private pendingMessages: WebSocketMessage[] = [];            
      33 +  private reconnectAttempts = 0;                               
      34 +  private reconnectTimer: ReturnType<typeof setTimeout> | null 
         += null;                                                        
      35 +  private intentionalClose = false;                            
      36 +  // Last create_session / join_session sent, replayed after a 
         +reconnect so the                                               
      37 +  // server re-adds this socket to the session (server state is
         + per-connection).                                              
      38 +  private lastSessionMessage: WebSocketMessage | null = null;  
      39  
      40    static getInstance(): WebSocketManager {
      41      if (!WebSocketManager.instance) {
     ...
      53        return;
      54      }
      55      if (url) this.url = url;
      56 +    this.intentionalClose = false;                             
      57 +    this.clearReconnectTimer();                                
      58      this.status = 'connecting';
      59      this.socket = new WebSocket(this.url);
      60  
      61      this.socket.onopen = () => {
      62        this.status = 'open';
      40 -      this.emitter.emit('open');                               
      41 -      if (this.ambassadorId) {                                 
      42 -        this.authenticate(this.ambassadorId);                  
      43 -      }                                                        
      63 +      const isReconnect = this.reconnectAttempts > 0;          
      64 +      this.reconnectAttempts = 0;                              
      65 +      void this.onSocketOpen(isReconnect);                     
      66      };
      67  
      68      this.socket.onmessage = (event) => {
     ...
       86  
       87      this.socket.onclose = () => {
       88        this.status = 'closed';
       67 -      this.emitter.emit('close');                             
       89        this.socket = null;
       90 +      this.emitter.emit('close');                             
       91 +      if (!this.intentionalClose) {                           
       92 +        this.scheduleReconnect();                             
       93 +      }                                                       
       94      };
       95    }
       96  
       97 +  private async onSocketOpen(isReconnect: boolean) {          
       98 +    // Order matters: authenticate first so the server attache
          +s the verified user                                           
       99 +    // before any session message is processed, then rejoin, t
          +hen flush queued sends.                                       
      100 +    if (this.shouldAuthenticate) {                            
      101 +      await this.sendAuth();                                  
      102 +    }                                                         
      103 +    if (isReconnect && this.lastSessionMessage) {             
      104 +      this.sendRaw(this.lastSessionMessage);                  
      105 +      this.emitter.emit('reconnected');                       
      106 +    }                                                         
      107 +    this.flushPending();                                      
      108 +    this.emitter.emit('open');                                
      109 +  }                                                           
      110 +                                                              
      111 +  private scheduleReconnect() {                               
      112 +    if (this.reconnectTimer) return;                          
      113 +    const delay = Math.min(                                   
      114 +      RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts,  
      115 +      RECONNECT_MAX_DELAY_MS                                  
      116 +    );                                                        
      117 +    this.reconnectAttempts += 1;                              
      118 +    console.log(`WebSocket reconnecting in ${delay}ms (attempt
          + ${this.reconnectAttempts})`);                                
      119 +    this.reconnectTimer = setTimeout(() => {                  
      120 +      this.reconnectTimer = null;                             
      121 +      this.connect();                                         
      122 +    }, delay);                                                
      123 +  }                                                           
      124 +                                                              
      125 +  private clearReconnectTimer() {                             
      126 +    if (this.reconnectTimer) {                                
      127 +      clearTimeout(this.reconnectTimer);                      
      128 +      this.reconnectTimer = null;                             
      129 +    }                                                         
      130 +  }                                                           
      131 +                                                              
      132    close() {
      133 +    this.intentionalClose = true;                             
      134 +    this.clearReconnectTimer();                               
      135 +    this.pendingMessages = [];                                
      136 +    this.lastSessionMessage = null;                           
      137 +    this.shouldAuthenticate = false;                          
      138 +    this.reconnectAttempts = 0;                               
      139      if (this.socket) {
      140        this.socket.close();
      141        this.socket = null;
     ...
      143      }
      144    }
      145  
       80 -  authenticate(ambassadorId: string) {                        
       81 -    this.ambassadorId = ambassadorId;                         
       82 -    this.send('auth', { sub: ambassadorId });                 
      146 +  // Sends the current Supabase access token to the server for
          + verification.                                                
      147 +  // The token is fetched fresh each time (also on every recon
          +nect) so it never goes stale.                                 
      148 +  async authenticate() {                                      
      149 +    this.shouldAuthenticate = true;                           
      150 +    if (this.status === 'open') {                             
      151 +      await this.sendAuth();                                  
      152 +    } else {                                                  
      153 +      this.connect();                                         
      154 +    }                                                         
      155    }
      156  
      157 +  private async sendAuth() {                                  
      158 +    try {                                                     
      159 +      const session = await authService.getCurrentSession();  
      160 +      const token = session?.access_token;                    
      161 +      if (token && this.socket && this.status === 'open') {   
      162 +        this.socket.send(JSON.stringify({ type: 'auth', payloa
          +d: { token } }));                                             
      163 +      }                                                       
      164 +    } catch (e) {                                             
      165 +      console.error('WebSocket auth failed to fetch session');
      166 +      this.emitter.emit('error', e);                          
      167 +    }                                                         
      168 +  }                                                           
      169 +                                                              
      170    send(type: string, payload?: any) {
      171      const message: WebSocketMessage = { type, payload };
      172 +    if (type === 'create_session' || type === 'join_session') 
          +{                                                             
      173 +      this.lastSessionMessage = message;                      
      174 +    }                                                         
      175      if (this.socket && this.status === 'open') {
       88 -      this.socket.send(JSON.stringify(message));              
      176 +      this.sendRaw(message);                                  
      177      } else {
       90 -      // queue by attempting connection then sending after ope
          -n                                                             
       91 -      if (!this.socket) this.connect();                       
       92 -      const onOpen = () => {                                  
       93 -        this.socket?.send(JSON.stringify(message));           
       94 -        this.emitter.off('open', onOpen);                     
       95 -      };                                                      
       96 -      this.emitter.on('open', onOpen);                        
      178 +      this.pendingMessages.push(message);                     
      179 +      this.connect();                                         
      180      }
      181    }
      182  
      183 +  private sendRaw(message: WebSocketMessage) {                
      184 +    this.socket?.send(JSON.stringify(message));               
      185 +  }                                                           
      186 +                                                              
      187 +  private flushPending() {                                    
      188 +    const queued = this.pendingMessages;                      
      189 +    this.pendingMessages = [];                                
      190 +    for (const message of queued) {                           
      191 +      this.sendRaw(message);                                  
      192 +    }                                                         
      193 +  }                                                           
      194 +                                                              
      195    on(eventType: string, listener: (data?: any) => void) {
      196      this.emitter.on(eventType, listener);
      197    }
     ...
      202  }
      203  
      204  export const wsManager = WebSocketManager.getInstance();
      110 -                                                              
      111 -                                                              

⏺ Now updating the three authenticate(u.id) call sites to the token-based flow:

  Read 3 files (ctrl+o to expand)

⏺ Update(app/tour-details.tsx)
  ⎿  Added 2 lines, removed 2 lines
      206        const u = await authService.getStoredUser();
      207        const currentUserType = await userTypeService.getUserTyp
           e();
      208        if (u?.id) {
      209 -        wsManager.authenticate(u.id);                         
      209 +        // Await so the auth token reaches the server before c
          +reate_session below.                                          
      210 +        await wsManager.authenticate();                       
      211        }
      212        // Create or attach to the live tour session on socket o
           pen (ambassador only)
      213        if (currentUserType !== 'ambassador') {
     ...
      219          wsManager.send('create_session', {
      220            tourId: tId,
      221            initial_structure: {},
      221 -          ambassador_id: u?.id || null,                       
      222          });
      223          // joined_members will be loaded from the session_crea
           ted message response
      224        }

⏺ Update(app/(tabs)/tour.tsx)
  ⎿  Added 1 line, removed 1 line
      302        // Establish WS and authenticate if logged in
      303        wsManager.connect();
      304        const u = await authService.getStoredUser();
      305 -      if (u?.id) wsManager.authenticate(u.id);                
      305 +      if (u?.id) await wsManager.authenticate();              
      306      };
      307  
      308      getSelectedSchool();

⏺ Update(hooks/useResumeTour.ts)
  ⎿  Added 3 lines, removed 3 lines
      139        const user = await authService.getStoredUser();
      140        if (user?.id) {
      141          // Wait for websocket to open, then authenticate and c
           reate/attach to session
      142 -        const authenticateAndCreateSession = () => {          
      143 -          wsManager.authenticate(user.id);                    
      142 +        const authenticateAndCreateSession = async () => {    
      143 +          // Await so the auth token reaches the server before
          + create_session below.                                        
      144 +          await wsManager.authenticate();                     
      145            // Create or attach to the live tour session
      146            wsManager.send('create_session', {
      147              tourId: tourId,
      148              initial_structure: {},
      148 -            ambassador_id: user.id,                           
      149            });
      150          };
      151          

  Ran 1 shell command (ctrl+o to expand)

⏺ Update(services/supabase.ts)
  ⎿  Added 6 lines, removed 9 lines
      1339          return { success: false, error: 'Invalid confirmation
             code' };
      1340        }
      1341  
      1342 -      const { data, error } = await supabase                 
      1343 -        .from('tour_appointments')                           
      1344 -        .select('general_confirmation_code')                 
      1345 -        .eq('id', tourAppointmentId)                         
      1346 -        .single();                                           
      1342 +      // Verified server-side so the code itself is never exp
           +osed to the client.                                          
      1343 +      const { data, error } = await supabase.rpc('verify_gene
           +ral_confirmation_code', {                                    
      1344 +        p_tour_appointment_id: tourAppointmentId,            
      1345 +        p_code: trimmed,                                     
      1346 +      });                                                    
      1347  
      1348        if (error) {
      1349          console.error('Error verifying general confirmation c
            ode:', error);
      1350          return { success: false, error: 'Failed to verify con
            firmation code' };
      1351        }
      1352  
      1353 -      const isGeneralCode =                                  
      1354 -        (data?.general_confirmation_code || '').toString().tr
           -im().toUpperCase() === trimmed;                              
      1355 -                                                             
      1356 -      return { success: true, isGeneralCode };               
      1353 +      return { success: true, isGeneralCode: data === true };
      1354      } catch (e) {
      1355        console.error('Exception verifying general confirmation
             code:', e);
      1356        return { success: false, error: 'Failed to verify confi
            rmation code' };

⏺ Update(services/supabase.ts)
  ⎿  Removed 9 lines
      1358    },
      1359  
      1360    /**
      1361 -   * Check if tour appointment has available spots           
      1362 -   * @param appointment - The tour appointment object        
      1363 -   * @returns boolean                                        
      1364 -   */                                                        
      1365 -  hasAvailableSpots(appointment: TourAppointment): boolean { 
      1366 -    return appointment.participants_signed_up < appointment.m
           -ax_participants;                                             
      1367 -  },                                                         
      1368 -                                                             
      1369 -  /**                                                        
      1361     * Format tour date and time for display
      1362     * @param scheduledDate - ISO date string
      1363     * @returns Formatted date and time object

⏺ Update(services/supabase.ts)
  ⎿  Removed 27 lines
      1386    },
      1387  
      1388    /**
      1389 -   * Join a tour group (for now, just return success - could 
           -track participants later)                                    
      1390 -   * @param appointmentId - The appointment ID to join       
      1391 -   * @param userInfo - User information                      
      1392 -   * @returns Promise with success status                    
      1393 -   */                                                        
      1394 -  async joinTourGroup(appointmentId: string, userInfo: any): 
           -Promise<{success: boolean, error?: string, message?: string}>
           - {                                                           
      1395 -    try {                                                    
      1396 -      // For now, we'll just return success                  
      1397 -      // In the future, this could:                          
      1398 -      // 1. Add the user to a tour_participants table        
      1399 -      // 2. Check if tour is full                            
      1400 -      // 3. Send confirmation emails                         
      1401 -      // 4. Generate QR codes for check-in                   
      1402 -                                                             
      1403 -      return {                                               
      1404 -        success: true,                                       
      1405 -        message: 'Successfully joined tour group!'           
      1406 -      };                                                     
      1407 -    } catch (error) {                                        
      1408 -      console.error('Error joining tour group:', error);     
      1409 -      return {                                               
      1410 -        success: false,                                      
      1411 -        error: 'Failed to join tour group. Please try again.'
      1412 -      };                                                     
      1413 -    }                                                        
      1414 -  },                                                         
      1415 -  /**                                                        
      1389     * Returns active preconfigured tours for a school.
      1390     */
      1391    async getPreconfiguredTours(schoolId: string): Promise<Prec
            onfiguredTour[]> {

⏺ Update(contexts/RaiseHandContext.tsx)
  ⎿  Added 1 line, removed 1 line
      1  import React, { createContext, useContext, useState, useEffect, 
         ReactNode } from 'react';
      2  import { Vibration } from 'react-native';
      3  import { wsManager } from '@/services/ws';
      4 -import { userTypeService } from '@/services/supabase';          
      4 +import { authService, userTypeService } from '@/services/supabas
        +e';                                                             
      5  
      6  interface RaiseHandContextType {
      7    showModal: boolean;

⏺ Update(contexts/RaiseHandContext.tsx)
  ⎿  Added 9 lines, removed 1 line
      16    const [memberName, setMemberName] = useState('');
      17    const [isAmbassador, setIsAmbassador] = useState(false);
      18  
      19 -  // Check if user is an ambassador                            
      19 +  // Check if user is an ambassador, and re-check whenever auth
         + state changes                                                 
      20 +  // (the provider mounts at the root, before an ambassador sig
         +ns in).                                                        
      21    useEffect(() => {
      22      const checkUserType = async () => {
      23        const ambassadorStatus = await userTypeService.isAmbassad
          or();
     ...
      25      };
      26  
      27      checkUserType();
      28 +                                                               
      29 +    const { data: subscription } = authService.onAuthStateChang
         +e(() => {                                                      
      30 +      void checkUserType();                                    
      31 +    });                                                        
      32 +    return () => {                                             
      33 +      subscription?.subscription?.unsubscribe?.();             
      34 +    };                                                         
      35    }, []);
      36  
      37    // Listen for WebSocket events (for ambassadors to receive ra
          ise hand notifications)

⏺ Now let me run the existing mobile tests to make sure the ws.ts rewrite
  doesn't break them:

  Ran 1 shell command (ctrl+o to expand)

⏺ Existing tests pass. Adding a new test file for the reconnect/auth/queue
  behavior:

⏺ Write(__tests__/ws-reconnect.test.ts)
  ⎿  Wrote 128 lines to __tests__/ws-reconnect.test.ts
       1 jest.mock('@/services/supabase', () => ({
       2   authService: {
       3     getCurrentSession: jest.fn(async () => ({ access_token: 'tes
         t-access-token' })),
       4   },
       6 
       7 class MockWebSocket {
       8   url: string;
       9   onopen: (() => void) | null = null;
      10   onmessage: ((e: { data: string }) => void) | null = null;
     … +136 lines (ctrl+o to expand)

  Ran 1 shell command (ctrl+o to expand)

⏺ Update(__tests__/ws-reconnect.test.ts)
  ⎿  Added 2 lines, removed 1 line
      29    beforeEach(() => {
      30      jest.spyOn(console, 'log').mockImplementation(() => {});
      31      jest.resetModules();
      32 -    jest.useFakeTimers();                                      
      32 +    // Keep setImmediate real so flushAsync can drain microtask
         +s under fake timers.                                           
      33 +    jest.useFakeTimers({ doNotFake: ['setImmediate'] });       
      34      socketCount = 0;
      35      global.WebSocket = jest.fn().mockImplementation((url: strin
          g) => {
      36        socketCount += 1;

  Ran 1 shell command (ctrl+o to expand)
⏺ All passing. Running the full mobile suite to catch regressions from the
  service edits:

  Ran 1 shell command (ctrl+o to expand)

⏺ Full mobile suite green. Quick TypeScript check on the mobile edits:

  Ran 4 shell commands (ctrl+o to expand)

⏺ Write(~/studioNode/campus-tours/supabase/sql/021_ambassador_led_fixes.sql)
  ⎿  Wrote 101 lines to ../supabase/sql/021_ambassador_led_fixes.sql
       1 -- Ambassador-led tour hardening:
         nger reads the code column).
         ons.
       4 --   3. Ambassadors can update their own appointments (status tr
       5 --   4. Capacity + status enforcement when leads sign up (no ove
       6 --   5. duration_minutes / meeting_location columns the admin to
       7 --
       8 -- NOTE: general_confirmation_code remains client-readable becau
       9 -- signup flow (Information.vue) displays it to anonymous visito
      10 -- a real secret requires moving that flow server
     … +116 lines (ctrl+o to expand)

⏺ Now the webapp fixes — timezone-correct datetime in AmbassadorTours.vue and
  removing the dead stubs from the service:

  Read 1 file (ctrl+o to expand)

⏺ Update(~/studioNode/campus-tours/webapp/src/services/tourAppointmentsService.j
        s)
  ⎿  Removed 38 lines
      240  }
      241  
      242  /**
      243 - * Join a tour group (for now, just return success - could tra
          -ck participants later)                                        
      244 - * @param {string} appointmentId - The appointment ID to join 
      245 - * @param {Object} userInfo - User information                
      246 - * @returns {Promise<{success: boolean, error?: string}>}     
      247 - */                                                           
      248 -export async function joinTourGroup(appointmentId, userInfo) {
      249 -  try {                                                       
      250 -    // For now, we'll just return success                     
      251 -    // In the future, this could:                             
      252 -    // 1. Add the user to a tour_participants table           
      253 -    // 2. Check if tour is full                               
      254 -    // 3. Send confirmation emails                            
      255 -    // 4. Generate QR codes for check-in                      
      256 -                                                              
      257 -    return {                                                  
      258 -      success: true,                                          
      259 -      message: 'Successfully joined tour group!'              
      260 -    }                                                         
      261 -  } catch (error) {                                           
      262 -    console.error('Error joining tour group:', error)         
      263 -    return {                                                  
      264 -      success: false,                                         
      265 -      error: 'Failed to join tour group. Please try again.'   
      266 -    }                                                         
      267 -  }                                                           
      268 -}                                                             
      269 -                                                              
      270 -/**                                                           
      271 - * Check if a tour has available spots                        
      272 - * @param {Object} tour - The tour appointment object         
      273 - * @param {number} currentParticipants - Current number of par
          -ticipants (for future use)                                    
      274 - * @returns {boolean}                                         
      275 - */                                                           
      276 -export function hasAvailableSpots(tour, currentParticipants = 
          -0) {                                                          
      277 -  return currentParticipants < tour.max_participants          
      278 -}                                                             
      279 -                                                              
      280 -/**                                                           
      243   * Format tour date and time for display
      244   * @param {string} scheduledDate - ISO date string
      245   * @returns {Object} - Formatted date and time

⏺ Update(~/studioNode/campus-tours/webapp/src/services/tourAppointmentsService.j
        s)
  ⎿  Removed 2 lines
      344    listAmbassadorsForSchool,
      345    getAvailableTourGroups,
      346    getTourAppointmentById,
      347 -  joinTourGroup,                                              
      348 -  hasAvailableSpots,                                          
      347    formatTourDateTime,
      348    listPreconfiguredToursForSchool,
      349    createPreconfiguredTour,

⏺ Update(~/studioNode/campus-tours/webapp/src/pages/AmbassadorTours.vue)
  ⎿  Added 5 lines, removed 2 lines
      116    successMessage.value = ''
      117    
      118    try {
      119 -    // Combine date and time                                  
      120 -    const scheduledDateTime = `${newTour.value.scheduledDate}T
          -${newTour.value.scheduledTime}:00`                            
      119 +    // Combine date and time, interpreted in the admin's local
          + timezone, and store as UTC.                                  
      120 +    // (A bare "YYYY-MM-DDTHH:MM:SS" string would be read as U
          +TC by Postgres, shifting the tour.)                           
      121 +    const scheduledDateTime = new Date(                       
      122 +      `${newTour.value.scheduledDate}T${newTour.value.schedule
          +dTime}:00`                                                    
      123 +    ).toISOString()                                           
      124      
      125      const { data, error } = await supabase
      126        .from('tour_appointments')

  Searched for 1 pattern, ran 1 shell command (ctrl+o to expand)

⏺ Everything is green. Let me do a final full-suite check across both test
  stacks:

  Ran 1 shell command (ctrl+o to expand)

⏺ All fixes are in and verified: backend 31/31 tests pass, mobile 16/16 pass
  with a clean type-check, and the webapp builds. No commits made, per your
  workflow.

  What changed

  Backend (tour-sessions.js, index.js, supabase.mjs)
  - Crash vector closed: the message dispatcher now normalizes malformed
  payloads and awaits every handler, so async errors land in the try/catch
  instead of killing the process. tour:state_update and tour:end also validate
  their payloads explicitly.
  - Real auth: auth now requires a Supabase access token, verified via
  supabase.auth.getUser(token) — raw user IDs are rejected.
  - Hijack closed: create_session (and the tour:start rebind path) only binds a
  socket as ambassador after verifying the authenticated user is the
  appointment's assigned ambassador. A reconnecting ambassador rebinds cleanly;
  an imposter gets Unauthorized action.
  - tour:tour-list-changed is now in the ambassador-only guard list, and the
  never-used tour:structure_update inbound path was deleted (no client sent it;
  the tour_structure_updated broadcast from tour:start is unchanged).
  - Lead PII: join_session lead lookups are scoped to the tour
  (tour_appointment_id = tourId) and fetch explicit columns.
  - Lifecycle: 30s ping/pong heartbeat terminates dead sockets (which triggers
  normal disconnect cleanup of joined_members); the existing 10-minute
  inactivity sweep now also evicts in-memory sessions via new getEndedSessionIds
  + evictSessions; restoring a session after a server restart resets stale
  joined_members.
  - State updates now broadcast the same sanitized state they persist;
  appointment status syncs to active on tour start and completed on tour end.
  - New tests in test/unit/ws/tour-sessions-security.test.js (12 tests);
  existing test files untouched.

  Mobile
  - services/ws.ts rewritten: auto-reconnect with exponential backoff (1s→30s
  cap), automatic re-auth + replay of the last create_session/join_session after
  reconnect, a real pending-message queue (no more leaked one-shot listeners),
  and the URL now comes from EXPO_PUBLIC_WS_URL/EXPO_PUBLIC_BACKEND_URL with the
  Render URL as fallback.
  - authenticate() now fetches the current Supabase access token instead of
  sending a raw user ID; the three call sites (tour-details.tsx, tour.tsx,
  useResumeTour.ts) await it before create_session, and the spoofable
  ambassador_id field was dropped from payloads.
  - Confirmation-code check in services/supabase.ts now calls the new
  verify_general_confirmation_code RPC instead of reading the code client-side.
  - RaiseHandContext re-checks ambassador status on auth state changes, so the
  ping listener attaches after sign-in without an app restart.
  - Dead joinTourGroup/hasAvailableSpots stubs deleted. New tests in
  __tests__/ws-reconnect.test.ts (5 tests).

  Supabase — new migration supabase/sql/021_ambassador_led_fixes.sql (needs to
  be applied to your project)
  - verify_general_confirmation_code SECURITY DEFINER RPC.
  - live_tour_sessions SELECT scoped to non-ended sessions.
  - Ambassadors can UPDATE their own appointments.
  - increment_tour_participants now locks the appointment row and rejects
  signups when the tour is full or not scheduled/active — DB-level overbooking
  protection.
  - Adds duration_minutes and meeting_location, the columns AmbassadorTours.vue
  was inserting into nothingness.

  Webapp — AmbassadorTours.vue now converts the local date+time to UTC before
  insert (timezone fix); dead stubs removed from tourAppointmentsService.js.

  Deliberately deferred (need your call)

  - general_confirmation_code is still anon-readable — the public signup flow
  (Information.vue) displays it to anonymous visitors by design, so locking the
  column would break that flow. Truly securing it means per-lead codes issued
  server-side; the RPC puts the mobile side ready for that.
  - live_tour_sessions stays readable while active — anonymous tour members poll
  it for resume/roster, so restricting it needs a member-auth/token design.
  - The inconsistent payload-vs-top-level message envelopes (finding #13) —
  normalizing touches every client handler at once; better as its own pass.

  Verifying end-to-end

  1. Apply 021_ambassador_led_fixes.sql in the Supabase SQL editor before
  deploying the backend/mobile changes (mobile's verify call depends on the RPC;
  the webapp create form depends on the new columns).
  2. Crash check: wscat -c <backend-url>, send {"type":"join_session"} — you
  should get an error reply and a live server.
  3. Auth check: send {"type":"auth","payload":{"sub":"some-uuid"}} — should be
  rejected; the mobile ambassador flow should still connect, create a session,
  and start a tour normally.
  4. Reconnect check: start a tour on a device, toggle airplane mode for ~10s —
  the app should reconnect, rejoin, and keep receiving state updates.

✻ Sautéed for 23m 28s
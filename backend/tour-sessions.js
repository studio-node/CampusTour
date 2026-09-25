import { v4 as uuidv4 } from 'uuid';
import { createLiveTourSession, updateLiveTourSession, ensureLiveTourSessionRow } from './supabase.mjs';

// Simple UUID v4 regex so we don't write non-UUIDs (e.g. "0") to uuid columns
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUuid(s) {
  return typeof s === 'string' && UUID_REGEX.test(s);
}

// Events only the session's ambassador may send.
const AMBASSADOR_ONLY_EVENTS = new Set([
  'tour:start',
  'tour:state_update',
  'tour:tour-list-changed',
  'tour:end',
  'tour:media:add-to-detail',
  'tour:media:push-takeover',
]);

// Returned by ensureSessionExists when the tour has already ended and must not be restored.
const SESSION_ENDED = Symbol('SESSION_ENDED');

// --- Main Session Manager ---

export function sessionManager(ws, supabase, tourSessions) {
  ws.id = uuidv4();
  console.log(`Client connected with ID: ${ws.id}`);

  const messageHandlers = {
    // Client heartbeat. It needs a reply: the client treats a socket with no inbound traffic as dead.
    'ping': () => send(ws, 'pong'),
    'auth': (payload) => handleAuth(ws, supabase, payload),
    'create_session': (payload) => handleCreateSession(ws, supabase, tourSessions, payload),
    'join_session': (payload) => handleJoinSession(ws, supabase, tourSessions, payload),
    'tour:start': (payload, session) => handleTourStart(ws, supabase, payload, session),
    'tour:state_update': (payload, session) => handleTourStateUpdate(ws, supabase, session, payload),
    'tour:tour-list-changed': (payload, session) => handleTourListChanged(supabase, session, payload),
    'tour:media:add-to-detail': (payload, session) => handleTourMediaAddToDetail(session, payload),
    'tour:media:push-takeover': (payload, session) => handleTourMediaPushTakeover(session, payload),
    'tour:end': (payload, session) => handleTourEnd(ws, supabase, tourSessions, payload, session),
    'ambassador:ping': (payload, session) => handleAmbassadorPing(ws, supabase, session, payload),
    'get_members_snapshot': (payload, session) => handleGetMembersSnapshot(ws, payload, session),
  };

  const handleMessage = async (message) => {
    try {
      const data = JSON.parse(message);
      if (data?.type !== 'ping') {
        console.log('Received message type:', data?.type);
      }

      // Normalize so handlers can safely destructure even when payload is missing/malformed.
      const payload = data && data.payload && typeof data.payload === 'object' ? data.payload : {};
      const { tourId } = payload;
      let session = tourId ? tourSessions.get(tourId) : undefined;

      // If tour:start is sent before create_session (or server restarted), ensure the session
      // exists in DB and memory — but only for the verified ambassador of this appointment.
      if (data.type === 'tour:start' && tourId && !session) {
        if (await isAuthorizedAmbassador(ws, supabase, tourId)) {
          const created = await ensureSessionExists(ws, supabase, tourSessions, tourId, {
            ambassador_id: ws.user.sub,
          });
          if (created === SESSION_ENDED) {
            return send(ws, 'session_ended', { tourId, message: 'This tour has already ended.' });
          }
          if (created) {
            session = tourSessions.get(tourId);
          }
        }
      }
      // Rebind a verified ambassador (e.g. after a reconnect) before the authorization check.
      if (data.type === 'tour:start' && session && !session.ambassador) {
        if (await isAuthorizedAmbassador(ws, supabase, tourId)) {
          session.ambassador = ws;
        }
      }

      const handler = messageHandlers[data.type];

      if (handler) {
        if (AMBASSADOR_ONLY_EVENTS.has(data.type) && !isSessionAmbassador(session, ws)) {
          return send(ws, 'error', { message: 'Unauthorized action.' });
        }
        if (data.type === 'ambassador:ping') {
          if (!session || !session.members.has(ws)) {
            return send(ws, 'error', { message: 'Unauthorized action.' });
          }
        }

        await handler(payload, session);
      } else {
        console.log(`Unknown message type: ${data.type}`);
        send(ws, 'error', { message: `Unknown message type: ${data.type}` });
      }
    } catch (error) {
      console.error('Failed to parse message or handle event:', error);
      if (ws.readyState === 1) {
        send(ws, 'error', { message: 'Invalid message format.' });
      }
    }
  };

  // Handle this socket's messages one at a time, in arrival order. Handlers await DB calls, so
  // otherwise an `auth` still being verified could be overtaken by the create_session sent after it.
  let messageQueue = Promise.resolve();
  ws.on('message', (message) => {
    messageQueue = messageQueue
      .then(() => handleMessage(message))
      .catch((error) => console.error('Unhandled error processing message:', error));
  });

  ws.on('close', () => {
    handleDisconnect(ws, supabase, tourSessions).catch((error) => {
      console.error('Error handling disconnect:', error);
    });
  });
}

// Connected general members, name-only. Leads are left out on purpose: the roster reads them from
// Supabase, while general members exist only on their device and socket, so this is their only source.
function handleGetMembersSnapshot(ws, payload, session) {
  const { tourId } = payload;
  if (!tourId) {
    send(ws, 'error', { message: 'tourId is required.' });
    return;
  }
  // Checked here rather than via AMBASSADOR_ONLY_EVENTS so a missing tourId still gets the error above.
  if (!isSessionAmbassador(session, ws)) {
    send(ws, 'error', { message: 'Unauthorized action.' });
    return;
  }

  const generalMembers = Array.from(session.members)
    .map((m) => ({ id: m.generalMemberId, first_name: m.generalFirstName }))
    .filter((m) => !!m.id && !!m.first_name)
    .sort((a, b) => a.first_name.localeCompare(b.first_name, undefined, { sensitivity: 'base' }));

  send(ws, 'members_snapshot', { tourId, generalMembers });
}

// --- Helper Functions ---

// Every server→client message carries its data under `payload`, the same shape clients send.
// The fields are mirrored at the top level for app builds that still read them there; drop the
// mirror once those builds are retired.
function send(ws, type, payload = {}) {
  ws.send(JSON.stringify({ type, ...payload, payload }));
}

function broadcastToMembers(session, type, payload) {
  session.members.forEach(member => {
    if (member.readyState === 1) { // WebSocket.OPEN
      send(member, type, payload);
    }
  });
}

function isSessionAmbassador(session, ws) {
  return !!session?.ambassador && session.ambassador.id === ws.id;
}

// True only when this socket has authenticated as the ambassador assigned to the appointment.
async function isAuthorizedAmbassador(ws, supabase, tourId) {
  if (!ws.user || !ws.user.sub) {
    return false;
  }
  try {
    const { data: appt, error } = await supabase
      .from('tour_appointments')
      .select('ambassador_id')
      .eq('id', tourId)
      .single();
    return !error && !!appt && appt.ambassador_id === ws.user.sub;
  } catch (error) {
    console.error('Error verifying ambassador for tour:', error);
    return false;
  }
}

// tour:start moves the appointment to 'active' and tour:end to 'completed'; the inactivity sweep
// doesn't touch it. So an appointment that's still 'scheduled' never started.
async function isTourUnstarted(supabase, tourId) {
  try {
    const { data, error } = await supabase
      .from('tour_appointments')
      .select('status')
      .eq('id', tourId)
      .single();
    return !error && data?.status === 'scheduled';
  } catch (error) {
    console.error('Error checking tour appointment status:', error);
    return false;
  }
}

// Ensures a session exists in memory and database. Creates it if it doesn't exist.
// Returns the session object, SESSION_ENDED if the tour already ended, or null if creation failed.
async function ensureSessionExists(ws, supabase, tourSessions, tourId, options = {}) {
  // Check if session exists in memory
  let session = tourSessions.get(tourId);
  if (session) {
    return session;
  }

  // Check if session exists in database
  try {
    const { data: existingSession, error: fetchError } = await supabase
      .from('live_tour_sessions')
      .select('*')
      .eq('tour_appointment_id', tourId)
      .single();

    if (!fetchError && existingSession) {
      // Never bring an ended tour back (e.g. a reconnecting client replaying join_session). The
      // exception is a lobby the inactivity sweep closed before the tour started: reopen it.
      const isEnded = existingSession.status === 'ended';
      if (isEnded && !(await isTourUnstarted(supabase, tourId))) {
        console.log(`Session ${tourId} has ended; not restoring it.`);
        return SESSION_ENDED;
      }

      // Session exists in DB but not in memory (e.g. server restart) - restore it.
      // Nobody from the old process is still connected, so clear stale joined_members;
      // connected clients re-add themselves when they rejoin.
      session = { ambassador: null, members: new Set() };
      tourSessions.set(tourId, session);
      const resets = {};
      if (Array.isArray(existingSession.joined_members) && existingSession.joined_members.length > 0) {
        resets.joined_members = [];
      }
      if (isEnded) {
        resets.status = 'awaiting_start';
      }
      if (Object.keys(resets).length > 0) {
        await updateLiveTourSession(supabase, tourId, resets);
      }
      console.log(`${isEnded ? 'Reopened' : 'Restored'} session ${tourId} from database`);
      return session;
    }
  } catch (error) {
    console.error('Error checking for existing session:', error);
  }

  // Session doesn't exist - create it
  console.log(`No session found for ${tourId}. Creating new session.`);

  // Fetch ambassador_id from tour_appointments if not provided
  let ambassadorId = options.ambassador_id || (ws.user && ws.user.sub) || null;
  if (!ambassadorId) {
    try {
      const { data: tourAppt, error: tourApptError } = await supabase
        .from('tour_appointments')
        .select('ambassador_id')
        .eq('id', tourId)
        .single();

      if (!tourApptError && tourAppt?.ambassador_id) {
        ambassadorId = tourAppt.ambassador_id;
        console.log(`Fetched ambassador_id ${ambassadorId} from tour appointment ${tourId}`);
      } else if (tourApptError) {
        console.error('Error fetching tour appointment:', tourApptError);
      }
    } catch (error) {
      console.error('Exception fetching tour appointment:', error);
    }
  }

  // ambassador_id is required by the database schema
  // It should always be available from tour_appointments
  if (!ambassadorId) {
    console.error(`Cannot create session for ${tourId}: ambassador_id is required but not found in tour_appointments.`);
    return null;
  }

  const sessionData = {
    tour_appointment_id: tourId,
    ambassador_id: ambassadorId,
    initial_structure: options.initial_structure || {},
  };

  const newSession = await createLiveTourSession(supabase, sessionData);
  if (!newSession) {
    // Creation failed - might be a race condition where another process created it
    // Try to fetch it again
    try {
      const { data: existingSession, error: fetchError } = await supabase
        .from('live_tour_sessions')
        .select('*')
        .eq('tour_appointment_id', tourId)
        .single();

      if (!fetchError && existingSession) {
        // Session was created by another process - restore it
        session = { ambassador: null, members: new Set() };
        tourSessions.set(tourId, session);
        console.log(`Session ${tourId} was created by another process, restored from database`);
        return session;
      }
    } catch (error) {
      console.error('Error fetching session after creation failure:', error);
    }

    console.error(`Failed to create session in database for tour ${tourId}`);
    return null;
  }

  session = { ambassador: null, members: new Set() };
  tourSessions.set(tourId, session);
  console.log(`Live tour session created for ${tourId}`);
  return session;
}

// Validates the Supabase access token and attaches the verified user to the connection.
async function handleAuth(ws, supabase, payload) {
  try {
    const token = typeof payload.token === 'string' ? payload.token.trim() : '';
    if (!token) {
      send(ws, 'error', { message: 'Missing auth token.' });
      return;
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user?.id) {
      send(ws, 'error', { message: 'Invalid auth token.' });
      return;
    }

    ws.user = { sub: data.user.id };
    send(ws, 'auth_ok');
  } catch (e) {
    console.error('Auth error:', e);
    send(ws, 'error', { message: 'Auth failed.' });
  }
}

// --- Event Handlers ---

async function handleCreateSession(ws, supabase, tourSessions, payload) {
  const { tourId, initial_structure } = payload;
  if (!tourId) {
    send(ws, 'error', { message: 'tourId is required.' });
    return;
  }

  // Only the verified ambassador assigned to the appointment may run the session.
  if (!ws.user || !ws.user.sub) {
    send(ws, 'error', { message: 'Authentication required to create a session.' });
    return;
  }
  if (!(await isAuthorizedAmbassador(ws, supabase, tourId))) {
    send(ws, 'error', { message: 'Unauthorized action.' });
    return;
  }

  // Ensure session exists (creates if it doesn't)
  const session = await ensureSessionExists(ws, supabase, tourSessions, tourId, {
    ambassador_id: ws.user.sub,
    initial_structure: initial_structure || {},
  });

  if (session === SESSION_ENDED) {
    send(ws, 'session_ended', { tourId, message: 'This tour has already ended.' });
    return;
  }
  if (!session) {
    send(ws, 'error', { message: 'Failed to create session in database.' });
    return;
  }

  // Bind (or rebind after a reconnect) the verified ambassador to this socket.
  session.ambassador = ws;

  ws.tourId = tourId;
  console.log(`Ambassador ${ws.id} created/joined session: ${tourId}`);

  // Fetch the session data from DB to send back
  try {
    const { data: sessionData } = await supabase
      .from('live_tour_sessions')
      .select('*')
      .eq('tour_appointment_id', tourId)
      .single();
    send(ws, 'session_created', { tourId, sessionData: sessionData || null });
  } catch (error) {
    send(ws, 'session_created', { tourId });
  }
}


async function handleJoinSession(ws, supabase, tourSessions, payload) {
  const { tourId, leadId, member } = payload;

  if (!tourId) {
    send(ws, 'error', { message: 'tourId is required to join session.' });
    return;
  }

  const isLeadJoin = !!leadId;
  const isGeneralJoin = !!member && !leadId;

  if (!isLeadJoin && !isGeneralJoin) {
    send(ws, 'error', { message: 'leadId or member is required to join session.' });
    return;
  }

  const generalMemberId = isGeneralJoin ? member?.id : null;
  const generalFirstName = isGeneralJoin ? (member?.first_name || '').toString().trim() : '';

  if (isGeneralJoin) {
    if (!generalMemberId || !isValidUuid(generalMemberId)) {
      send(ws, 'error', { message: 'Invalid member.id.' });
      return;
    }
    if (!generalFirstName) {
      send(ws, 'error', { message: 'member.first_name is required.' });
      return;
    }
  }

  // Ensure session exists (creates if it doesn't) - first person to join creates it
  // Always fetch ambassador_id from tour_appointments to ensure we can create the session
  let ambassadorId = (ws.user && ws.user.sub) || null;
  if (!ambassadorId) {
    try {
      const { data: tourAppt, error: tourApptError } = await supabase
        .from('tour_appointments')
        .select('ambassador_id')
        .eq('id', tourId)
        .single();

      if (!tourApptError && tourAppt?.ambassador_id) {
        ambassadorId = tourAppt.ambassador_id;
        console.log(`Fetched ambassador_id ${ambassadorId} from tour appointment for join_session`);
      } else if (tourApptError) {
        console.error('Error fetching tour appointment for join_session:', tourApptError);
      }
    } catch (error) {
      console.error('Exception fetching tour appointment for join_session:', error);
    }
  }

  const session = await ensureSessionExists(ws, supabase, tourSessions, tourId, {
    ambassador_id: ambassadorId,
    initial_structure: {},
  });

  if (session === SESSION_ENDED) {
    send(ws, 'session_ended', { tourId, message: 'This tour has already ended.' });
    return;
  }
  if (!session) {
    send(ws, 'error', { message: 'Failed to create session in database.' });
    return;
  }

  // For leads, fetch their information from the database. The lead must belong to this tour —
  // otherwise anyone with a lead UUID could pull that lead's PII into a session they control.
  let leadInfo = null;
  if (isLeadJoin) {
    try {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, identity, date_of_birth, expected_attendance')
        .eq('tour_appointment_id', tourId)
        .eq('id', leadId)
        .single();

      if (leadError || !lead) {
        console.error('Error fetching lead:', leadError);
        send(ws, 'error', { message: 'Invalid leadId.' });
        return;
      }
      leadInfo = lead;
    } catch (error) {
      console.error('Exception fetching lead:', error);
      send(ws, 'error', { message: 'Failed to fetch lead information.' });
      return;
    }
  }

  // Update joined_members array in database (row may be missing if deleted manually while WS session lives on)
  try {
    const row = await ensureLiveTourSessionRow(supabase, tourId, {});
    if (!row) {
      console.error('Could not ensure live_tour_sessions row for join; joined_members not persisted');
    } else {
      const currentJoined = row.joined_members || [];
      const idToPersist = isLeadJoin ? leadId : generalMemberId;
      if (idToPersist && !currentJoined.includes(idToPersist)) {
        const updatedJoined = [...currentJoined, idToPersist];
        const updated = await updateLiveTourSession(supabase, tourId, { joined_members: updatedJoined });
        if (!updated) {
          console.error('Error updating joined_members after ensure');
        } else {
          console.log(`Added member ${idToPersist} to joined_members for tour ${tourId}`);
        }
      }
    }
  } catch (error) {
    console.error('Exception updating joined_members:', error);
    // Continue even if update fails - we still want to add them to the session
  }

  // Store identifiers on websocket for disconnect + ping handling
  if (isLeadJoin) {
    ws.leadId = leadId;
    ws.generalMemberId = null;
    ws.generalFirstName = null;
  } else {
    ws.leadId = null;
    ws.generalMemberId = generalMemberId;
    ws.generalFirstName = generalFirstName;
  }

  // Add this websocket as a member (ambassador will be set later on start)
  session.members.add(ws);
  ws.tourId = tourId;
  console.log(`Client ${ws.id} joined tour: ${tourId} (${isLeadJoin ? `leadId: ${leadId}` : `generalMemberId: ${generalMemberId}`})`);
  send(ws, 'session_joined', { tourId });

  // Notify ambassador with full lead/member information
  if (session.ambassador && session.ambassador.readyState === 1) {
    if (isLeadJoin && leadInfo) {
      const displayName = [leadInfo.first_name, leadInfo.last_name]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Member';
      send(session.ambassador, 'member_joined', {
        lead: {
          id: leadInfo.id,
          name: displayName,
          first_name: leadInfo.first_name,
          last_name: leadInfo.last_name,
          email: leadInfo.email,
          identity: leadInfo.identity,
          date_of_birth: leadInfo.date_of_birth,
          expected_attendance: leadInfo.expected_attendance,
        }
      });
    } else {
      send(session.ambassador, 'member_joined', {
        member: {
          id: generalMemberId,
          name: generalFirstName,
          first_name: generalFirstName,
          is_general: true,
        }
      });
    }
  }
}

function extractLocationIdsFromTemplateStops(stopsJson) {
  if (!Array.isArray(stopsJson)) {
    return [];
  }
  const ids = [];
  for (const stop of stopsJson) {
    let id = null;
    if (typeof stop === 'string') {
      id = stop;
    } else if (stop && typeof stop === 'object') {
      id = stop.location_id || stop.id || null;
    }
    if (isValidUuid(id) && !ids.includes(id)) {
      ids.push(id);
    }
  }
  return ids;
}

async function handleTourStart(ws, supabase, payload, session) {
  const tourId = payload.tourId;
  const payloadTemplateId = payload.preconfiguredTourId || null;
  if (!tourId) {
    send(ws, 'error', { message: 'tourId is required.' });
    return;
  }
  console.log(`Starting tour ${tourId}`);

  let selectedTemplate = null;
  let generatedOrder = [];
  try {
    const { data: tourAppt, error: tourApptError } = await supabase
      .from('tour_appointments')
      .select(`
        school_id,
        preconfigured_tour_id,
        preconfigured_tours (
          id,
          name,
          stops_json
        )
      `)
      .eq('id', tourId)
      .single();
    if (tourApptError || !tourAppt?.school_id) {
      throw new Error('Failed to load tour appointment for start.');
    }

    selectedTemplate = tourAppt.preconfigured_tours || null;

    // Allow explicit payload override for impromptu flow edge-cases where relation is stale.
    if ((!selectedTemplate || selectedTemplate.id !== payloadTemplateId) && payloadTemplateId) {
      const { data: overrideTemplate, error: templateError } = await supabase
        .from('preconfigured_tours')
        .select('id, name, stops_json, school_id, is_active')
        .eq('id', payloadTemplateId)
        .eq('school_id', tourAppt.school_id)
        .eq('is_active', true)
        .single();
      if (!templateError && overrideTemplate) {
        selectedTemplate = overrideTemplate;
      }
    }

    generatedOrder = extractLocationIdsFromTemplateStops(selectedTemplate?.stops_json || []);
    if (!generatedOrder.length) {
      throw new Error('Selected preconfigured tour does not contain valid location IDs.');
    }
  } catch (e) {
    console.error('Error loading preconfigured tour on start:', e);
    send(ws, 'error', { message: 'Unable to start tour. This tour needs a valid preconfigured template.' });
    return;
  }

  // Persist session as active and save template snapshot (location IDs only).
  await updateLiveTourSession(supabase, tourId, {
    status: 'active',
    live_tour_structure: generatedOrder,
  });

  // Keep the appointment's status in sync with the live session.
  try {
    await supabase
      .from('tour_appointments')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', tourId);
  } catch (error) {
    console.error('Error marking tour appointment active:', error);
  }

  // Same start signal (with the template snapshot) to the ambassador and every member.
  const started = {
    tourId,
    generated_tour_order: generatedOrder,
    preconfigured_tour_id: selectedTemplate?.id || null,
    preconfigured_tour_name: selectedTemplate?.name || null,
  };
  send(ws, 'tour_started', started);
  if (session && session.members) {
    broadcastToMembers(session, 'tour_started', started);
  }
}

async function handleTourStateUpdate(ws, supabase, session, payload) {
  const { tourId, state } = payload;
  if (!tourId || !state || typeof state !== 'object') {
    send(ws, 'error', { message: 'tourId and state are required.' });
    return;
  }
  console.log(`Broadcasting and persisting state update for tour ${tourId}:`, state);

  const current_location_id = isValidUuid(state.current_location_id) ? state.current_location_id : null;
  const visited_locations = Array.isArray(state.visited_locations)
    ? state.visited_locations.filter(isValidUuid)
    : [];

  await updateLiveTourSession(supabase, tourId, {
    current_location_id,
    visited_locations,
  });

  // Broadcast the same sanitized state we persisted so members and DB never diverge.
  broadcastToMembers(session, 'tour_state_updated', {
    state: { ...state, current_location_id, visited_locations },
  });
}

async function handleTourEnd(ws, supabase, tourSessions, payload, session) {
  const { tourId } = payload;
  if (!tourId) {
    send(ws, 'error', { message: 'tourId is required.' });
    return;
  }
  console.log(`Ending tour ${tourId}`);

  await updateLiveTourSession(supabase, tourId, { status: 'ended' });

  // Keep the appointment's status in sync with the live session.
  try {
    await supabase
      .from('tour_appointments')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', tourId);
  } catch (error) {
    console.error('Error marking tour appointment completed:', error);
  }

  broadcastToMembers(session, 'session_ended', { tourId, message: 'The ambassador has ended the tour.' });
  session.members.forEach(member => member.close());
  tourSessions.delete(tourId);
  send(ws, 'tour_ended_confirmation', { tourId });
}

async function handleTourListChanged(supabase, session, payload) {
  const { tourId, newTourStructure } = payload;
  console.log(`Broadcasting and persisting tour list changes for tour ${tourId}:`, newTourStructure);

  try {
    // Extract location IDs - handle both array format and object format for backward compatibility
    let locationIds = [];
    if (Array.isArray(newTourStructure)) {
      // Already in simple array format
      locationIds = newTourStructure;
    } else if (newTourStructure?.generated_tour_order && Array.isArray(newTourStructure.generated_tour_order)) {
      // Object format with generated_tour_order
      locationIds = newTourStructure.generated_tour_order;
    } else if (newTourStructure?.tour_stops && Array.isArray(newTourStructure.tour_stops)) {
      // Extract location IDs from full objects
      locationIds = newTourStructure.tour_stops.map(stop =>
        typeof stop === 'string' ? stop : stop.id
      );
    }

    // Store just the array of location IDs
    await updateLiveTourSession(supabase, tourId, {
      live_tour_structure: locationIds,
    });

    // Broadcast just the array of location IDs
    broadcastToMembers(session, 'tour_list_changed', {
      tourId,
      newTourStructure: locationIds, // Just the array of location IDs
    });

    console.log(`Tour list changes for ${tourId} successfully broadcasted to ${session.members.size} members`);
  } catch (error) {
    console.error(`Error handling tour list changes for ${tourId}:`, error);
    // Note: We don't send error back to ambassador here as it's a broadcast operation
    // The ambassador should handle errors on their end
  }
}

function handleTourMediaAddToDetail(session, payload) {
  const { locationId, media } = payload;
  if (!session || !locationId || !media) {
    return;
  }
  console.log(`Broadcasting media_added_to_detail for location ${locationId} to ${session.members.size} members`);
  broadcastToMembers(session, 'media_added_to_detail', { locationId, media });
}

function handleTourMediaPushTakeover(session, payload) {
  const { media } = payload;
  if (!session || !media) {
    return;
  }
  console.log(`Broadcasting media_takeover to ${session.members.size} members`);
  broadcastToMembers(session, 'media_takeover', { media });
}

async function handleAmbassadorPing(ws, supabase, session, payload) {
  console.log(`Member ${ws.id} is pinging the ambassador`);

  // Fetch lead information to get the member's name
  let memberName = 'A member';
  const leadId = ws.leadId;
  const generalFirstName = ws.generalFirstName;
  const generalMemberId = ws.generalMemberId;

  if (generalFirstName) {
    memberName = generalFirstName;
  } else if (leadId) {
    try {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('first_name, last_name')
        .eq('id', leadId)
        .single();

      if (!leadError && lead) {
        const n = [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim();
        if (n) memberName = n;
      }
    } catch (error) {
      console.error('Error fetching lead name for ping:', error);
      // Continue with default name if fetch fails
    }
  }

  // Send ping notification to ambassador
  if (session.ambassador && session.ambassador.readyState === 1) {
    send(session.ambassador, 'ambassador_ping', {
      memberId: ws.id,
      leadId: leadId || null,
      generalMemberId: generalMemberId || null,
      memberName: memberName,
      message: payload.message || `${memberName} needs your attention.`
    });
  }
}

async function handleDisconnect(ws, supabase, tourSessions) {
  console.log(`Client ${ws.id} disconnected`);
  const { tourId, leadId } = ws;
  const generalMemberId = ws.generalMemberId;
  if (tourId) {
    const session = tourSessions.get(tourId);
    if (session) {
      if (session.ambassador && session.ambassador.id === ws.id) {
        // Ambassador disconnected - don't end the tour, just remove ambassador reference
        // This allows the ambassador to rejoin later
        console.log(`Ambassador for tour ${tourId} disconnected. Tour continues, ambassador can rejoin.`);

        // Clear the ambassador reference but keep the session active
        session.ambassador = null;
      } else if (session.members.has(ws)) {
        session.members.delete(ws);
        console.log(`Member ${ws.id} left tour ${tourId}.`);

        // Remove member id from joined_members array in database
        const idToRemove = leadId || generalMemberId;
        if (idToRemove) {
          try {
            const row = await ensureLiveTourSessionRow(supabase, tourId, {});
            if (row?.joined_members?.length) {
              const updatedJoined = row.joined_members.filter(id => id !== idToRemove);
              const updated = await updateLiveTourSession(supabase, tourId, { joined_members: updatedJoined });
              if (!updated) {
                console.error('Error removing leadId from joined_members after ensure');
              } else {
                console.log(`Removed member ${idToRemove} from joined_members for tour ${tourId}`);
              }
            }
          } catch (error) {
            console.error('Exception removing leadId from joined_members:', error);
          }
        }

        // Notify ambassador
        if (session.ambassador && session.ambassador.readyState === 1) {
          send(session.ambassador, 'member_left', {
            leadId: leadId || null,
            leftMemberId: idToRemove || null,
            is_general: !!(generalMemberId && !leadId),
            socketMemberId: ws.id
          });
        }
      }
    }
  }
}

// Evicts in-memory sessions whose DB rows were closed by the inactivity sweep.
export function evictSessions(tourSessions, tourIds) {
  let evicted = 0;
  for (const tourId of tourIds || []) {
    const session = tourSessions.get(tourId);
    if (!session) continue;
    const ended = { tourId, message: 'The tour has ended due to inactivity.' };
    broadcastToMembers(session, 'session_ended', ended);
    session.members.forEach(member => member.close());
    if (session.ambassador && session.ambassador.readyState === 1) {
      send(session.ambassador, 'session_ended', ended);
    }
    tourSessions.delete(tourId);
    evicted++;
  }
  if (evicted > 0) {
    console.log(`Evicted ${evicted} inactive session(s) from memory.`);
  }
  return evicted;
}

import { v4 as uuidv4 } from 'uuid';
import { createLiveTourSession, updateLiveTourSession, getLocations } from './supabase.mjs';
import GeminiCaller from './gemini_caller.mjs';

// --- Main Session Manager ---

export function sessionManager(ws, supabase, tourSessions) {
  ws.id = uuidv4();
  console.log(`Client connected with ID: ${ws.id}`);

  const messageHandlers = {
    // Optional auth bootstrap if mobile sends a token or user id
    'auth': async (payload) => handleAuth(ws, supabase, payload),
    'create_session': (payload) => handleCreateSession(ws, supabase, tourSessions, payload),
    'join_session': (payload) => handleJoinSession(ws, supabase, tourSessions, payload),
    'tour:start': (payload, session) => handleTourStart(ws, supabase, tourSessions, payload.tourId, session),
    'tour:state_update': (payload, session) => handleTourStateUpdate(supabase, session, payload),
    'tour:structure_update': (payload, session) => handleTourStructureUpdate(supabase, session, payload),
    'tour:end': (payload, session) => handleTourEnd(ws, supabase, tourSessions, payload.tourId, session),
    'ambassador:ping': (payload, session) => handleAmbassadorPing(ws, session, payload),
  };

  ws.on('message', message => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);

      const { tourId } = data.payload || {};
      const session = tourId ? tourSessions.get(tourId) : undefined;
      const handler = messageHandlers[data.type];

      if (handler) {
        if (['tour:start', 'tour:state_update', 'tour:structure_update', 'tour:end'].includes(data.type)) {
          if (!session || !session.ambassador || session.ambassador.id !== ws.id) {
            return ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized action.' }));
          }
        }
        if (data.type === 'ambassador:ping') {
          if (!session || !session.members.has(ws)) {
            return ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized action.' }));
          }
        }

        handler(data.payload, session);
      } else {
        console.log(`Unknown message type: ${data.type}`);
        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type.' }));
      }
    } catch (error) {
      console.error('Failed to parse message or handle event:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' }));
    }
  });

  ws.on('close', () => handleDisconnect(ws, supabase, tourSessions));
}

// --- Helper Functions ---

function broadcastToMembers(session, message) {
  session.members.forEach(member => {
    if (member.readyState === 1) { // WebSocket.OPEN
      member.send(JSON.stringify(message));
    }
  });
}

// Basic auth handler to attach a minimal user object to the websocket connection.
// In production, validate a real JWT and fetch the user from Supabase.
async function handleAuth(ws, _supabase, payload) {
  try {
    const ambassadorId = payload?.sub || payload?.ambassador_id || payload?.userId || null;
    if (!ambassadorId) {
      ws.send(JSON.stringify({ type: 'error', message: 'Missing ambassador id for auth.' }));
      return;
    }
    ws.user = { sub: ambassadorId };
    ws.send(JSON.stringify({ type: 'auth_ok' }));
  } catch (e) {
    console.error('Auth error:', e);
    ws.send(JSON.stringify({ type: 'error', message: 'Auth failed.' }));
  }
}

// --- Event Handlers ---

async function handleCreateSession(ws, supabase, tourSessions, payload) {
  const { tourId, initial_structure } = payload;
  if (!tourId || !initial_structure) {
    ws.send(JSON.stringify({ type: 'error', message: 'tourId and initial_structure are required.' }));
    return;
  }
  if (tourSessions.has(tourId)) {
    // Treat create_session as a Start Tour request if session already exists but awaiting start
    const existing = tourSessions.get(tourId);
    existing.ambassador = ws; // Set ambassador on first Start action
    await updateLiveTourSession(supabase, tourId, { status: 'active' });
    ws.tourId = tourId;
    ws.send(JSON.stringify({ type: 'session_created', tourId }));
    return;
  }

  const sessionData = {
    tour_appointment_id: tourId,
    ambassador_id: (ws.user && ws.user.sub) || payload.ambassador_id || null,
    initial_structure,
  };

  // Attempt to generate a tour based on participants' selected interests for this appointment
  try {
    // 1) Find the school for this tour appointment
    const { data: tourAppt, error: tourApptError } = await supabase
      .from('tour_appointments')
      .select('school_id')
      .eq('id', tourId)
      .single();
    if (!tourApptError && tourAppt?.school_id) {
      const schoolId = tourAppt.school_id;

      // 2) Aggregate interests from analytics events tied to this tour appointment
      const { data: interestEvents, error: interestErr } = await supabase
        .from('analytics_events')
        .select('metadata')
        .eq('event_type', 'interests-chosen')
        .eq('tour_appointment_id', tourId);

      if (!interestErr && Array.isArray(interestEvents) && interestEvents.length > 0) {
        const allInterests = interestEvents
          .map(evt => Array.isArray(evt?.metadata?.selected_interests) ? evt.metadata.selected_interests : [])
          .flat()
          .filter(Boolean);
        const uniqueInterests = Array.from(new Set(allInterests));

        if (uniqueInterests.length > 0) {
          // 3) Fetch locations and prepare the structure for the AI caller
          const locations = await getLocations(schoolId, supabase);
          const locsArray = Array.isArray(locations) ? locations.map(location => ({
            id: location.id,
            name: location.name,
            description: location.description,
            interests: location.interests,
          })) : [];

          // 4) Generate the tour ordering from Gemini
          try {
            const generatedOrder = await GeminiCaller.generateTour(locsArray, uniqueInterests);
            if (generatedOrder && Array.isArray(generatedOrder) && generatedOrder.length > 0) {
              sessionData.initial_structure = {
                ...initial_structure,
                interests_used: uniqueInterests,
                generated_tour_order: generatedOrder,
              };
            }
          } catch (genErr) {
            console.error('Tour generation failed, proceeding without generated order:', genErr);
          }
        }
      }
    }
  } catch (aggErr) {
    console.error('Failed aggregating interests for tour generation:', aggErr);
  }

  // Persist with default status awaiting_start (DB default assumed). Ensure status if needed.
  const newSession = await createLiveTourSession(supabase, sessionData);
  if (!newSession) {
    ws.send(JSON.stringify({ type: 'error', message: 'Failed to create session in database.' }));
    return;
  }

  tourSessions.set(tourId, { ambassador: ws, members: new Set() });
  ws.tourId = tourId;
  console.log(`Tour session created: ${tourId}`);
  ws.send(JSON.stringify({ type: 'session_created', tourId, sessionData: newSession }));
}


async function handleJoinSession(ws, supabase, tourSessions, payload) {
  const { tourId } = payload;
  let session = tourSessions.get(tourId);
  if (!session) {
    // Create a new live tour session in DB with awaiting_start status for first joiner
    console.log(`No session found for ${tourId}. Creating new session in awaiting_start status.`);
    const sessionData = {
      tour_appointment_id: tourId,
      ambassador_id: (ws.user && ws.user.sub) || null,
      initial_structure: {},
    };
    // Attempt to pre-generate tour structure from interests
    try {
      const { data: tourAppt, error: tourApptError } = await supabase
        .from('tour_appointments')
        .select('school_id')
        .eq('id', tourId)
        .single();
      if (!tourApptError && tourAppt?.school_id) {
        const schoolId = tourAppt.school_id;
        const { data: interestEvents } = await supabase
          .from('analytics_events')
          .select('metadata')
          .eq('event_type', 'interests-chosen')
          .eq('tour_appointment_id', tourId);
        if (Array.isArray(interestEvents) && interestEvents.length > 0) {
          const allInterests = interestEvents
            .map(evt => Array.isArray(evt?.metadata?.selected_interests) ? evt.metadata.selected_interests : [])
            .flat()
            .filter(Boolean);
          const uniqueInterests = Array.from(new Set(allInterests));
          const locations = await getLocations(schoolId, supabase);
          const locsArray = Array.isArray(locations) ? locations.map(location => ({
            id: location.id,
            name: location.name,
            description: location.description,
            interests: location.interests,
          })) : [];
          try {
            const generatedOrder = uniqueInterests.length > 0
              ? await GeminiCaller.generateTour(locsArray, uniqueInterests)
              : [];
            sessionData.initial_structure = {
              interests_used: uniqueInterests,
              generated_tour_order: generatedOrder,
            };
          } catch (e) {
            console.error('Generation on join failed:', e);
          }
        }
      }
    } catch (e) {
      console.error('Error preparing session on join:', e);
    }

    const created = await createLiveTourSession(supabase, sessionData);
    if (!created) {
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to create session in database.' }));
      return;
    }
    session = { ambassador: null, members: new Set() };
    tourSessions.set(tourId, session);
    console.log(`Live tour session created in awaiting_start for ${tourId}`);
  }

  // Add this websocket as a member (ambassador will be set later on start)
  session.members.add(ws);
  ws.tourId = tourId;
  console.log(`Client ${ws.id} joined tour: ${tourId}`);
  ws.send(JSON.stringify({ type: 'session_joined', tourId }));
  if (session.ambassador && session.ambassador.readyState === 1) {
    session.ambassador.send(JSON.stringify({ type: 'member_joined', memberId: ws.id }));
  }
}

async function handleTourStart(ws, supabase, tourSessions, tourId, session) {
  console.log(`Starting tour ${tourId}`);
  // Bind ambassador to this session if not set yet
  if (!session.ambassador) {
    session.ambassador = ws;
  }
  await updateLiveTourSession(supabase, tourId, { status: 'active' });
  // Optionally broadcast a state; for now, just acknowledge
  ws.send(JSON.stringify({ type: 'tour_started_confirmation', tourId }));
}

async function handleTourStateUpdate(supabase, session, payload) {
  const { tourId, state } = payload;
  console.log(`Broadcasting and persisting state update for tour ${tourId}:`, state);

  await updateLiveTourSession(supabase, tourId, {
    current_location_id: state.current_location_id,
    visited_locations: state.visited_locations,
  });

  broadcastToMembers(session, { type: 'tour_state_updated', state });
}

async function handleTourStructureUpdate(supabase, session, payload) {
  const { tourId, changes } = payload;
  console.log(`Broadcasting and persisting structure update for tour ${tourId}:`, changes);

  await updateLiveTourSession(supabase, tourId, {
    live_tour_structure: changes.new_structure,
  });

  broadcastToMembers(session, { type: 'tour_structure_updated', changes });
}

async function handleTourEnd(ws, supabase, tourSessions, tourId, session) {
  console.log(`Ending tour ${tourId}`);

  await updateLiveTourSession(supabase, tourId, { status: 'ended' });

  broadcastToMembers(session, { type: 'session_ended', message: 'The ambassador has ended the tour.' });
  session.members.forEach(member => member.close());
  tourSessions.delete(tourId);
  ws.send(JSON.stringify({ type: 'tour_ended_confirmation' }));
}


function handleAmbassadorPing(ws, session, payload) {
  console.log(`Member ${ws.id} is pinging the ambassador for tour ${session.ambassador.tourId}`);
  session.ambassador.send(JSON.stringify({
    type: 'ambassador_ping',
    payload: {
      memberId: ws.id,
      message: payload.message || 'A member needs your attention.'
    }
  }));
}

async function handleDisconnect(ws, supabase, tourSessions) {
  console.log(`Client ${ws.id} disconnected`);
  const { tourId } = ws;
  if (tourId) {
    const session = tourSessions.get(tourId);
    if (session) {
      if (session.ambassador.id === ws.id) {
        console.log(`Ambassador for tour ${tourId} disconnected. Closing session.`);

        await updateLiveTourSession(supabase, tourId, { status: 'ended' });

        broadcastToMembers(session, { type: 'session_ended', message: 'The ambassador has disconnected.' });
        session.members.forEach(member => member.close());
        tourSessions.delete(tourId);
      } else if (session.members.has(ws)) {
        session.members.delete(ws);
        console.log(`Member ${ws.id} left tour ${tourId}.`);
        session.ambassador.send(JSON.stringify({ type: 'member_left', memberId: ws.id }));
      }
    }
  }
}

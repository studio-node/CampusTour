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
    'tour:tour-list-changed': (payload, session) => handleTourListChanged(supabase, session, payload),
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
        ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${data.type}` }));
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

// Ensures a session exists in memory and database. Creates it if it doesn't exist.
// Returns the session object or null if creation failed.
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
      // Session exists in DB but not in memory - restore it
      session = { ambassador: null, members: new Set() };
      tourSessions.set(tourId, session);
      console.log(`Restored session ${tourId} from database`);
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
  if (!tourId) {
    ws.send(JSON.stringify({ type: 'error', message: 'tourId is required.' }));
    return;
  }

  // Ensure session exists (creates if it doesn't)
  const session = await ensureSessionExists(ws, supabase, tourSessions, tourId, {
    ambassador_id: (ws.user && ws.user.sub) || payload.ambassador_id || null,
    initial_structure: initial_structure || {},
  });

  if (!session) {
    ws.send(JSON.stringify({ type: 'error', message: 'Failed to create session in database.' }));
    return;
  }

  // Set ambassador if not already set
  if (!session.ambassador) {
    session.ambassador = ws;
  }

  ws.tourId = tourId;
  console.log(`Ambassador ${ws.id} created/joined session: ${tourId}`);
  
  // Fetch the session data from DB to send back
  try {
    const { data: sessionData } = await supabase
      .from('live_tour_sessions')
      .select('*')
      .eq('tour_appointment_id', tourId)
      .single();
    ws.send(JSON.stringify({ type: 'session_created', tourId, sessionData: sessionData || null }));
  } catch (error) {
    ws.send(JSON.stringify({ type: 'session_created', tourId }));
  }
}


async function handleJoinSession(ws, supabase, tourSessions, payload) {
  const { tourId, leadId } = payload;
  
  if (!tourId) {
    ws.send(JSON.stringify({ type: 'error', message: 'tourId is required to join session.' }));
    return;
  }

  if (!leadId) {
    ws.send(JSON.stringify({ type: 'error', message: 'leadId is required to join session.' }));
    return;
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

  if (!session) {
    ws.send(JSON.stringify({ type: 'error', message: 'Failed to create session in database.' }));
    return;
  }

  // Fetch full lead information from database
  let leadInfo = null;
  try {
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();
    
    if (leadError || !lead) {
      console.error('Error fetching lead:', leadError);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid leadId.' }));
      return;
    }
    leadInfo = lead;
  } catch (error) {
    console.error('Exception fetching lead:', error);
    ws.send(JSON.stringify({ type: 'error', message: 'Failed to fetch lead information.' }));
    return;
  }

  // Update joined_members array in database
  try {
    // Get current joined_members array
    const { data: currentSession, error: fetchError } = await supabase
      .from('live_tour_sessions')
      .select('joined_members')
      .eq('tour_appointment_id', tourId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching session:', fetchError);
    } else {
      const currentJoined = currentSession?.joined_members || [];
      // Only add if not already present
      if (!currentJoined.includes(leadId)) {
        const updatedJoined = [...currentJoined, leadId];
        const { error: updateError } = await supabase
          .from('live_tour_sessions')
          .update({ joined_members: updatedJoined })
          .eq('tour_appointment_id', tourId);
        
        if (updateError) {
          console.error('Error updating joined_members:', updateError);
        } else {
          console.log(`Added leadId ${leadId} to joined_members for tour ${tourId}`);
        }
      }
    }
  } catch (error) {
    console.error('Exception updating joined_members:', error);
    // Continue even if update fails - we still want to add them to the session
  }

  // Store leadId on websocket for disconnect handling
  ws.leadId = leadId;

  // Add this websocket as a member (ambassador will be set later on start)
  session.members.add(ws);
  ws.tourId = tourId;
  console.log(`Client ${ws.id} (leadId: ${leadId}) joined tour: ${tourId}`);
  ws.send(JSON.stringify({ type: 'session_joined', tourId }));
  
  // Notify ambassador with full lead information
  if (session.ambassador && session.ambassador.readyState === 1) {
    session.ambassador.send(JSON.stringify({ 
      type: 'member_joined', 
      lead: {
        id: leadInfo.id,
        name: leadInfo.name,
        email: leadInfo.email,
        identity: leadInfo.identity,
        address: leadInfo.address,
        date_of_birth: leadInfo.date_of_birth,
        gender: leadInfo.gender,
        grad_year: leadInfo.grad_year,
      }
    }));
  }
}

async function handleTourStart(ws, supabase, tourSessions, tourId, session) {
  console.log(`Starting tour ${tourId}`);
  // Bind ambassador to this session if not set yet
  if (!session.ambassador) {
    session.ambassador = ws;
  }
  // Aggregate interests and generate tour ordering now
  let generatedOrder = [];
  let interestsUsed = [];
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
        interestsUsed = Array.from(new Set(allInterests));
      }
      const locations = await getLocations(schoolId, supabase);
      const locsArray = Array.isArray(locations) ? locations.map(location => ({
        id: location.id,
        name: location.name,
        description: location.description,
        interests: location.interests,
      })) : [];
      if (interestsUsed.length > 0) {
        try {
          generatedOrder = await GeminiCaller.generateTour(locsArray, interestsUsed);
        } catch (e) {
          console.error('Tour generation on start failed:', e);
        }
      }
    }
  } catch (e) {
    console.error('Error generating tour on start:', e);
  }

  // Persist session as active and save generated structure (just location IDs)
  await updateLiveTourSession(supabase, tourId, {
    status: 'active',
    live_tour_structure: generatedOrder, // Just the array of location IDs
  });

  // Return generated tour to ambassador (just the array of location IDs)
  ws.send(JSON.stringify({
    type: 'tour_started',
    payload: {
      tourId,
      generated_tour_order: generatedOrder, // Array of location IDs
    }
  }));

  // Also notify members of structure
  if (session && session.members) {
    broadcastToMembers(session, {
      type: 'tour_structure_updated',
      changes: { new_structure: generatedOrder } // Just the array of location IDs
    });
  }
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

  // Extract location IDs - handle both array format and object format for backward compatibility
  let locationIds = [];
  if (Array.isArray(changes.new_structure)) {
    // Already in simple array format
    locationIds = changes.new_structure;
  } else if (changes.new_structure.generated_tour_order && Array.isArray(changes.new_structure.generated_tour_order)) {
    // Object format with generated_tour_order
    locationIds = changes.new_structure.generated_tour_order;
  } else if (changes.new_structure.tour_stops && Array.isArray(changes.new_structure.tour_stops)) {
    // Extract location IDs from full objects
    locationIds = changes.new_structure.tour_stops.map(stop => 
      typeof stop === 'string' ? stop : stop.id
    );
  }

  // Store just the array of location IDs
  await updateLiveTourSession(supabase, tourId, {
    live_tour_structure: locationIds,
  });

  // Broadcast just the array of location IDs
  broadcastToMembers(session, { 
    type: 'tour_structure_updated', 
    changes: { new_structure: locationIds } 
  });
}

async function handleTourEnd(ws, supabase, tourSessions, tourId, session) {
  console.log(`Ending tour ${tourId}`);

  await updateLiveTourSession(supabase, tourId, { status: 'ended' });

  broadcastToMembers(session, { type: 'session_ended', message: 'The ambassador has ended the tour.' });
  session.members.forEach(member => member.close());
  tourSessions.delete(tourId);
  ws.send(JSON.stringify({ type: 'tour_ended_confirmation' }));
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
    } else if (newTourStructure.generated_tour_order && Array.isArray(newTourStructure.generated_tour_order)) {
      // Object format with generated_tour_order
      locationIds = newTourStructure.generated_tour_order;
    } else if (newTourStructure.tour_stops && Array.isArray(newTourStructure.tour_stops)) {
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
    broadcastToMembers(session, { 
      type: 'tour_list_changed', 
      payload: {
        tourId,
        newTourStructure: locationIds, // Just the array of location IDs
      }
    });

    console.log(`Tour list changes for ${tourId} successfully broadcasted to ${session.members.size} members`);
  } catch (error) {
    console.error(`Error handling tour list changes for ${tourId}:`, error);
    // Note: We don't send error back to ambassador here as it's a broadcast operation
    // The ambassador should handle errors on their end
  }
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
  const { tourId, leadId } = ws;
  if (tourId) {
    const session = tourSessions.get(tourId);
    if (session) {
      if (session.ambassador && session.ambassador.id === ws.id) {
        console.log(`Ambassador for tour ${tourId} disconnected. Closing session.`);

        await updateLiveTourSession(supabase, tourId, { status: 'ended' });

        broadcastToMembers(session, { type: 'session_ended', message: 'The ambassador has disconnected.' });
        session.members.forEach(member => member.close());
        tourSessions.delete(tourId);
      } else if (session.members.has(ws)) {
        session.members.delete(ws);
        console.log(`Member ${ws.id} (leadId: ${leadId}) left tour ${tourId}.`);
        
        // Remove leadId from joined_members array in database
        if (leadId) {
          try {
            const { data: currentSession, error: fetchError } = await supabase
              .from('live_tour_sessions')
              .select('joined_members')
              .eq('tour_appointment_id', tourId)
              .single();
            
            if (!fetchError && currentSession?.joined_members) {
              const updatedJoined = currentSession.joined_members.filter(id => id !== leadId);
              const { error: updateError } = await supabase
                .from('live_tour_sessions')
                .update({ joined_members: updatedJoined })
                .eq('tour_appointment_id', tourId);
              
              if (updateError) {
                console.error('Error removing leadId from joined_members:', updateError);
              } else {
                console.log(`Removed leadId ${leadId} from joined_members for tour ${tourId}`);
              }
            }
          } catch (error) {
            console.error('Exception removing leadId from joined_members:', error);
          }
        }
        
        // Notify ambassador
        if (session.ambassador && session.ambassador.readyState === 1) {
          session.ambassador.send(JSON.stringify({ 
            type: 'member_left', 
            leadId: leadId || null,
            memberId: ws.id 
          }));
        }
      }
    }
  }
}

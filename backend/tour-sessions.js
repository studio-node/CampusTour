import { v4 as uuidv4 } from 'uuid';



// --- Main Session Manager ---

export function sessionManager(ws, tourSessions) {
  ws.id = uuidv4();
  console.log(`Client connected with ID: ${ws.id}`);

  const messageHandlers = {
    'create_session': (payload) => handleCreateSession(ws, tourSessions, payload),
    'join_session': (payload) => handleJoinSession(ws, tourSessions, payload),
    'tour:state_update': (payload, session) => handleTourStateUpdate(session, payload),
    'tour:structure_update': (payload, session) => handleTourStructureUpdate(session, payload),
    'tour:end': (payload, session) => handleTourEnd(ws, tourSessions, payload.tourId, session),
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
        // Authorization checks
        if (['tour:state_update', 'tour:structure_update', 'tour:end'].includes(data.type)) {
          if (!session || session.ambassador.id !== ws.id) {
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

  ws.on('close', () => handleDisconnect(ws, tourSessions));
}




// --- Helper Functions ---

function broadcastToMembers(session, message) {
  session.members.forEach(member => {
    if (member.readyState === 1) { // WebSocket.OPEN
      member.send(JSON.stringify(message));
    }
  });
}

// --- Event Handlers ---

function handleCreateSession(ws, tourSessions, payload) {
  const { tourId } = payload;
  if (!tourId) {
    ws.send(JSON.stringify({ type: 'error', message: 'tourId is required to create a session.' }));
    return;
  }
  if (tourSessions.has(tourId)) {
    ws.send(JSON.stringify({ type: 'error', message: 'Session already exists.' }));
    return;
  }
  tourSessions.set(tourId, { ambassador: ws, members: new Set() });
  ws.tourId = tourId;
  console.log(`Tour session created: ${tourId}`);
  ws.send(JSON.stringify({ type: 'session_created', tourId }));
}

function handleJoinSession(ws, tourSessions, payload) {
  const { tourId } = payload;
  const session = tourSessions.get(tourId);
  if (session) {
    session.members.add(ws);
    ws.tourId = tourId;
    console.log(`Client ${ws.id} joined tour: ${tourId}`);
    ws.send(JSON.stringify({ type: 'session_joined', tourId }));
    session.ambassador.send(JSON.stringify({ type: 'member_joined', memberId: ws.id }));
  } else {
    console.log(`Session not found for tourId: ${tourId}`);
    ws.send(JSON.stringify({ type: 'error', message: 'Session not found.' }));
  }
}

function handleTourStateUpdate(session, payload) {
  console.log(`Broadcasting state update for tour ${session.ambassador.tourId}:`, payload);
  broadcastToMembers(session, { type: 'tour_state_updated', state: payload.state });
}

function handleTourStructureUpdate(session, payload) {
  console.log(`Broadcasting structure update for tour ${session.ambassador.tourId}:`, payload);
  broadcastToMembers(session, { type: 'tour_structure_updated', changes: payload.changes });
}

function handleTourEnd(ws, tourSessions, tourId, session) {
  console.log(`Ending tour ${tourId}`);
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

function handleDisconnect(ws, tourSessions) {
  console.log(`Client ${ws.id} disconnected`);
  const { tourId } = ws;
  if (tourId) {
    const session = tourSessions.get(tourId);
    if (session) {
      if (session.ambassador.id === ws.id) {
        console.log(`Ambassador for tour ${tourId} disconnected. Closing session.`);
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


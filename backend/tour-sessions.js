import { v4 as uuidv4 } from 'uuid';

// Helper function to broadcast messages to all members of a tour
function broadcastToMembers(session, message) {
  session.members.forEach(member => {
    member.send(JSON.stringify(message));
  });
}

export function sessionManager(ws, tourSessions) {
  console.log('Client connected');
  ws.id = uuidv4(); // Assign a unique ID to each connection

  ws.on('message', message => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);

      const { tourId } = data.payload || {};
      const session = tourId ? tourSessions.get(tourId) : undefined;

      // Ambassador-only event check
      if (['tour:state_update', 'tour:structure_update', 'tour:end'].includes(data.type)) {
        if (!session || session.ambassador.id !== ws.id) {
          ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized action.' }));
          return;
        }
      }

      switch (data.type) {
        case 'create_session': {
          if (!tourId) {
            ws.send(JSON.stringify({ type: 'error', message: 'tourId is required to create a session.' }));
            return;
          }

          if (tourSessions.has(tourId)) {
            ws.send(JSON.stringify({ type: 'error', message: 'Session already exists.' }));
            return;
          }

          tourSessions.set(tourId, {
            ambassador: ws,
            members: new Set(),
          });

          ws.tourId = tourId;

          console.log(`Tour session created: ${tourId}`);
          ws.send(JSON.stringify({ type: 'session_created', tourId }));
          break;
        }

        case 'join_session': {
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
          break;
        }

        case 'tour:state_update': {
          console.log(`Broadcasting state update for tour ${tourId}:`, data.payload);
          broadcastToMembers(session, { type: 'tour_state_updated', state: data.payload.state });
          break;
        }

        case 'tour:structure_update': {
          console.log(`Broadcasting structure update for tour ${tourId}:`, data.payload);
          broadcastToMembers(session, { type: 'tour_structure_updated', changes: data.payload.changes });
          break;
        }
        
        case 'tour:end': {
          console.log(`Ending tour ${tourId}`);
          broadcastToMembers(session, { type: 'session_ended', message: 'The ambassador has ended the tour.' });
          
          // Close all member connections and clear the session
          session.members.forEach(member => member.close());
          tourSessions.delete(tourId);
          ws.send(JSON.stringify({ type: 'tour_ended_confirmation' }));
          break;
        }

        default:
          console.log(`Unknown message type: ${data.type}`);
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type.' }));
      }
    } catch (error) {
      console.error('Failed to parse message or handle event:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format.' }));
    }
  });

  ws.on('close', () => {
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
  });
}

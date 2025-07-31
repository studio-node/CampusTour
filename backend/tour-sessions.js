import { v4 as uuidv4 } from 'uuid';

export function sessionManager(ws, tourSessions) {
  console.log('Client connected');
  ws.id = uuidv4(); // Assign a unique ID to each connection

  ws.on('message', message => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);

      switch (data.type) {
        case 'create_session': {
          // equal to: const tourId = data.payload.tourId;
          const { tourId } = data.payload;
          if (!tourId) {
            ws.send(JSON.stringify({ type: 'error', message: 'tourId is required to create a session.' }));
            return;
          }

          if (tourSessions.has(tourId)) {
            ws.send(JSON.stringify({ type: 'error', message: 'Session already exists.' }));
            return;
          }

          // Store session information
          tourSessions.set(tourId, {
            ambassador: ws,
            members: new Set(),
          });

          // Associate tourId with the WebSocket connection for easy lookup on disconnect
          ws.tourId = tourId;

          console.log(`Tour session created: ${tourId}`);
          ws.send(JSON.stringify({ type: 'session_created', tourId }));
          break;
        }

        case 'join_session': {
          const { tourId } = data.payload;
          const session = tourSessions.get(tourId);

          if (session) {
            session.members.add(ws);
            ws.tourId = tourId; // Associate tourId with the member's connection

            console.log(`Client ${ws.id} joined tour: ${tourId}`);
            ws.send(JSON.stringify({ type: 'session_joined', tourId }));

            // Notify the ambassador
            session.ambassador.send(JSON.stringify({ type: 'member_joined', memberId: ws.id }));
          } else {
            console.log(`Session not found for tourId: ${tourId}`);
            ws.send(JSON.stringify({ type: 'error', message: 'Session not found.' }));
          }
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
        // Check if the disconnected client is the ambassador
        if (session.ambassador === ws) {
          console.log(`Ambassador for tour ${tourId} disconnected. Closing session.`);
          // Notify all members that the tour has ended
          session.members.forEach(member => {
            member.send(JSON.stringify({ type: 'session_ended', message: 'The ambassador has ended the tour.' }));
            member.close();
          });
          tourSessions.delete(tourId);
        } else if (session.members.has(ws)) {
          // The disconnected client is a member
          session.members.delete(ws);
          console.log(`Member ${ws.id} left tour ${tourId}.`);
          // Notify the ambassador
          session.ambassador.send(JSON.stringify({ type: 'member_left', memberId: ws.id }));
        }
      }
    }
  });
}

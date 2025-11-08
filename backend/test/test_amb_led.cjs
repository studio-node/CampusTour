const WebSocket = require('ws');

// const WS_URL = 'wss://campustourbackend.onrender.com';
const WS_URL = 'ws://localhost:3000';

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.replace(/^--/, '');
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        parsed[key] = true;
      } else {
        parsed[key] = next;
        i++;
      }
    }
  }
  return parsed;
}

function usageAndExit() {
  console.log('Usage: node backend/test/test_amb_led.js --user-type <ambassador|group> [--tour-id <uuid>] [--ambassador-id <uuid>]');
  process.exit(1);
}

function logIncoming(prefix, data) {
  try {
    const obj = JSON.parse(data);
    console.log(`[${prefix}]`, JSON.stringify(obj, null, 2));
  } catch (e) {
    console.log(`[${prefix}]`, data);
  }
}

function send(ws, type, payload) {
  const msg = { type, payload };
  ws.send(JSON.stringify(msg));
}

async function run() {
  const args = parseArgs();
  const userType = args['user-type'];
  if (!userType || !['ambassador', 'group'].includes(userType)) {
    usageAndExit();
  }

  const tourId = args['tour-id'] || 'cdb9d53f-89de-4a57-8735-a052bfeb3dbc';
  const ambassadorId = args['ambassador-id'] || '0a939b8f-0d00-4895-bb08-f881bbdfe8c8';
  const email = args['email'] || 'pace.thomson@utahtech.edu';

  console.log(`Connecting to ${WS_URL} as ${userType}...`);

  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log('WebSocket open');
    if (userType === 'group') {
      send(ws, 'join_session', { tourId, email });
    } else if (userType === 'ambassador') {
      send(ws, 'auth', { sub: ambassadorId });
    }
  });

  let authed = false;
  let sessionCreated = false;
  let tourStarted = false;

  ws.on('message', (data) => {
    // logIncoming('recv', data);
    try {
      const message = JSON.parse(data);
      console.log('message', message);
      const { type, payload } = message;

      if (userType === 'ambassador') {
        if (type === 'auth_ok') {
          authed = true;
          if (!sessionCreated) {
            send(ws, 'create_session', {
              tourId,
              ambassador_id: ambassadorId,
              initial_structure: { stops: [] },
            });
          }
        }

        if (type === 'session_created') {
          sessionCreated = true;
          console.log('Starting Tour...');
          if (!tourStarted) {
            send(ws, 'tour:start', { tourId });
          }
        }

        if (type === 'tour_started') {
          tourStarted = true;
          setTimeout(() => {
            send(ws, 'tour:state_update', {
              tourId,
              state: {
                current_location_id: 'f2a12cf5-6108-4fba-99be-9dedd97f8a8b',
                visited_locations: ['f2a12cf5-6108-4fba-99be-9dedd97f8a8b'],
              },
            });
          }, 1500);
        }
      }
    } catch (_) {}
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message || err);
  });

  ws.on('close', (code, reason) => {
    console.log('WebSocket closed', code, reason && reason.toString());
  });

  process.on('SIGINT', () => {
    console.log('Closing...');
    ws.close();
    process.exit(0);
  });
}

run();



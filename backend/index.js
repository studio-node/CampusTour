import { WebSocketServer } from 'ws';
import GeminiCaller from './gemini_caller.mjs';
import { createClient } from '@supabase/supabase-js';
import { getLocations, closeInactiveSessions } from './supabase.mjs';
import { sessionManager } from './tour-sessions.js';
import { createApp, createIpRateLimiter, RATE_LIMIT_WINDOW_MS } from './app.js';

const port = process.env.PORT || 3000;

console.log('Env variable for NODE_ENV:\x1b[32m', process.env.NODE_ENV, "\x1b[0m\n\n");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const tourSessions = new Map();
const rateLimiter = createIpRateLimiter();
const serverApp = createApp({
  supabase,
  getLocationsFn: getLocations,
  generateTourFn: GeminiCaller.generateTour.bind(GeminiCaller),
  rateLimiter,
});

const server = serverApp.listen(port, () => {
  console.log(`Express is listening and running now on port ${port}`);
});


const wss = new WebSocketServer({ server });

// Pass the Supabase client into the session manager so handlers can auth and persist
wss.on('connection', ws => sessionManager(ws, supabase, tourSessions));

// Set up interval to check for inactive sessions every 10 minutes
const INACTIVE_SESSION_CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

setInterval(async () => {
  console.log('Checking for inactive sessions...');
  const closedCount = await closeInactiveSessions(supabase);
  if (closedCount > 0) {
    console.log(`Session timeout check completed: ${closedCount} session(s) closed.`);
  }
}, INACTIVE_SESSION_CHECK_INTERVAL_MS);

console.log(`Session timeout checker initialized: checking every ${INACTIVE_SESSION_CHECK_INTERVAL_MS / 1000 / 60} minutes`);

// Clean up expired rate limit entries every hour
setInterval(() => {
  rateLimiter.cleanupExpiredEntries();
}, RATE_LIMIT_WINDOW_MS);



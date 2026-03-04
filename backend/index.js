import express from 'express';
import { WebSocketServer } from 'ws';
import GeminiCaller from './gemini_caller.mjs';
import { createClient } from '@supabase/supabase-js';
import { getLocations, closeInactiveSessions } from './supabase.mjs';
import { sessionManager } from './tour-sessions.js';

const app = express();
const port = process.env.PORT || 3000;

console.log('Env variable for NODE_ENV:\x1b[32m', process.env.NODE_ENV, "\x1b[0m\n\n");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const tourSessions = new Map();

// IP-based rate limiting for /generate-tour (no account required)
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_REQUESTS = 20; // per window per IP
const rateLimitStore = new Map(); // ip -> { count, windowStart }

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

function ipRateLimit(req, res, next) {
  const ip = getClientIp(req);
  const now = Date.now();
  let record = rateLimitStore.get(ip);

  if (!record) {
    record = { count: 0, windowStart: now };
    rateLimitStore.set(ip, record);
  }

  if (now - record.windowStart >= RATE_LIMIT_WINDOW_MS) {
    record.count = 0;
    record.windowStart = now;
  }

  record.count += 1;

  if (record.count > RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((record.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Too many tour generation requests. Please try again later.' });
  }

  next();
}

function makeLocationsArrayTourGeneration(locations) {
  let locationObjects = [];
  for (let location of locations) {
    locationObjects.push({
      id: location.id,
      name: location.name,
      description: location.description,
      interests: location.interests,
    });
  }
  return locationObjects;
}

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/keep-alive', (req, res) => {
  res.send('ok');
});

app.post('/generate-tour', express.json(), ipRateLimit, async (req, res) => {
  if (!req.body) {
    return res.status(400).send("No body provided");
  }
  const { school_id, interests } = req.body;
  const locations = await getLocations(school_id, supabase);
  const locsArray = makeLocationsArrayTourGeneration(locations);
  const tour = await GeminiCaller.generateTour(locsArray, interests);
  res.json(tour);
});

const server = app.listen(port, () => {
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
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now - record.windowStart >= RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);



import express from 'express';

export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const RATE_LIMIT_MAX_REQUESTS = 20; // per window per IP

export const ROUTES_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const ROUTES_RATE_LIMIT_MAX_REQUESTS = 60; // per window per IP

export function makeLocationsArrayTourGeneration(locations) {
  const locationObjects = [];
  for (const location of locations) {
    locationObjects.push({
      id: location.id,
      name: location.name,
      description: location.description,
      interests: location.interests,
    });
  }
  return locationObjects;
}

export function createIpRateLimiter({
  windowMs = RATE_LIMIT_WINDOW_MS,
  maxRequests = RATE_LIMIT_MAX_REQUESTS,
  nowFn = Date.now,
} = {}) {
  const rateLimitStore = new Map(); // ip -> { count, windowStart }

  function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
  }

  function middleware(req, res, next) {
    const ip = getClientIp(req);
    const now = nowFn();
    let record = rateLimitStore.get(ip);

    if (!record) {
      record = { count: 0, windowStart: now };
      rateLimitStore.set(ip, record);
    }

    if (now - record.windowStart >= windowMs) {
      record.count = 0;
      record.windowStart = now;
    }

    record.count += 1;

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.windowStart + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many tour generation requests. Please try again later.' });
    }

    return next();
  }

  function cleanupExpiredEntries() {
    const now = nowFn();
    for (const [ip, record] of rateLimitStore.entries()) {
      if (now - record.windowStart >= windowMs) {
        rateLimitStore.delete(ip);
      }
    }
  }

  return { middleware, cleanupExpiredEntries, rateLimitStore };
}

const GOOGLE_ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const GOOGLE_ROUTES_FIELD_MASK =
  'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.routeLabels';

export function createApp({
  supabase,
  getLocationsFn,
  generateTourFn,
  rateLimiter = createIpRateLimiter(),
  routesRateLimiter = createIpRateLimiter({
    windowMs: ROUTES_RATE_LIMIT_WINDOW_MS,
    maxRequests: ROUTES_RATE_LIMIT_MAX_REQUESTS,
  }),
  routesApiKey = '',
  fetchFn = fetch,
}) {
  const app = express();

  app.get('/', (_req, res) => {
    res.send('Hello World!');
  });

  app.get('/keep-alive', (_req, res) => {
    res.send('ok');
  });

  app.post('/generate-tour', express.json(), rateLimiter.middleware, async (req, res) => {
    if (!req.body) {
      return res.status(400).send('No body provided');
    }

    const { school_id, interests } = req.body;
    const locations = await getLocationsFn(school_id, supabase);
    const locsArray = makeLocationsArrayTourGeneration(locations);
    const tour = await generateTourFn(locsArray, interests);
    return res.json(tour);
  });

  app.post('/walking-route', express.json(), routesRateLimiter.middleware, async (req, res) => {
    const { origin, destination } = req.body ?? {};

    if (
      typeof origin?.latitude !== 'number' ||
      typeof origin?.longitude !== 'number' ||
      typeof destination?.latitude !== 'number' ||
      typeof destination?.longitude !== 'number'
    ) {
      return res.status(400).json({ error: 'origin and destination with numeric latitude/longitude are required' });
    }

    try {
      const googleRes = await fetchFn(GOOGLE_ROUTES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': routesApiKey,
          'X-Goog-FieldMask': GOOGLE_ROUTES_FIELD_MASK,
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } } },
          destination: { location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } } },
          travelMode: 'WALK',
          computeAlternativeRoutes: true,
          languageCode: 'en-US',
          units: 'METRIC',
        }),
      });

      if (!googleRes.ok) {
        return res.status(502).json({ error: 'Routing service unavailable' });
      }

      const data = await googleRes.json();
      return res.json({ routes: data.routes ?? [] });
    } catch {
      return res.status(502).json({ error: 'Routing service unavailable' });
    }
  });

  return app;
}

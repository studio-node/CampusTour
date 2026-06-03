import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp, createIpRateLimiter } from '../../../app.js';

test('GET / returns hello world', async () => {
  const app = createApp({
    supabase: {},
    getLocationsFn: async () => [],
    generateTourFn: async () => [],
  });

  const res = await request(app).get('/');
  assert.equal(res.status, 200);
  assert.equal(res.text, 'Hello World!');
});

test('GET /keep-alive returns ok', async () => {
  const app = createApp({
    supabase: {},
    getLocationsFn: async () => [],
    generateTourFn: async () => [],
  });

  const res = await request(app).get('/keep-alive');
  assert.equal(res.status, 200);
  assert.equal(res.text, 'ok');
});

test('POST /generate-tour maps locations and returns generated tour', async () => {
  const fakeLocations = [
    {
      id: 'loc-1',
      name: 'Library',
      description: 'Main library',
      interests: ['academics'],
    },
  ];

  let generatedArgs = null;
  const app = createApp({
    supabase: { kind: 'fake' },
    getLocationsFn: async (_schoolId, _supabase) => fakeLocations,
    generateTourFn: async (locations, interests) => {
      generatedArgs = { locations, interests };
      return ['loc-1'];
    },
  });

  const res = await request(app)
    .post('/generate-tour')
    .send({ school_id: 'school-1', interests: ['academics'] });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, ['loc-1']);
  assert.deepEqual(generatedArgs, {
    locations: fakeLocations,
    interests: ['academics'],
  });
});

test('POST /walking-route returns routes from Google on success', async () => {
  const fakeRoutes = [
    { polyline: { encodedPolyline: 'abc' }, duration: '60s', distanceMeters: 200 },
    { polyline: { encodedPolyline: 'def' }, duration: '70s', distanceMeters: 210 },
  ];
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({ routes: fakeRoutes }),
  });

  const app = createApp({
    supabase: {},
    getLocationsFn: async () => [],
    generateTourFn: async () => [],
    routesApiKey: 'test-key',
    fetchFn: mockFetch,
  });

  const res = await request(app)
    .post('/walking-route')
    .send({ origin: { latitude: 40.0, longitude: -74.0 }, destination: { latitude: 40.1, longitude: -74.1 } });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { routes: fakeRoutes });
});

test('POST /walking-route returns 400 when origin or destination is missing', async () => {
  const app = createApp({
    supabase: {},
    getLocationsFn: async () => [],
    generateTourFn: async () => [],
    routesApiKey: 'test-key',
    fetchFn: async () => ({ ok: true, json: async () => ({}) }),
  });

  const missingDest = await request(app)
    .post('/walking-route')
    .send({ origin: { latitude: 40.0, longitude: -74.0 } });
  assert.equal(missingDest.status, 400);

  const missingOrigin = await request(app)
    .post('/walking-route')
    .send({ destination: { latitude: 40.1, longitude: -74.1 } });
  assert.equal(missingOrigin.status, 400);

  const emptyBody = await request(app).post('/walking-route').send({});
  assert.equal(emptyBody.status, 400);
});

test('POST /walking-route returns 502 when Google API returns an error', async () => {
  const mockFetch = async () => ({
    ok: false,
    json: async () => ({ error: { message: 'INVALID_ARGUMENT' } }),
  });

  const app = createApp({
    supabase: {},
    getLocationsFn: async () => [],
    generateTourFn: async () => [],
    routesApiKey: 'test-key',
    fetchFn: mockFetch,
  });

  const res = await request(app)
    .post('/walking-route')
    .send({ origin: { latitude: 40.0, longitude: -74.0 }, destination: { latitude: 40.1, longitude: -74.1 } });

  assert.equal(res.status, 502);
  assert.equal(res.body.error, 'Routing service unavailable');
});

test('POST /walking-route enforces IP rate limit and sets Retry-After', async () => {
  let now = 10_000;
  const app = createApp({
    supabase: {},
    getLocationsFn: async () => [],
    generateTourFn: async () => [],
    routesRateLimiter: createIpRateLimiter({
      windowMs: 1000,
      maxRequests: 2,
      nowFn: () => now,
    }),
    routesApiKey: 'test-key',
    fetchFn: async () => ({ ok: true, json: async () => ({ routes: [] }) }),
  });

  const body = { origin: { latitude: 40.0, longitude: -74.0 }, destination: { latitude: 40.1, longitude: -74.1 } };
  await request(app).post('/walking-route').set('x-forwarded-for', '1.2.3.4').send(body);
  await request(app).post('/walking-route').set('x-forwarded-for', '1.2.3.4').send(body);
  const blocked = await request(app).post('/walking-route').set('x-forwarded-for', '1.2.3.4').send(body);

  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers['retry-after'], '1');

  now += 1001;
  const allowedAgain = await request(app).post('/walking-route').set('x-forwarded-for', '1.2.3.4').send(body);
  assert.equal(allowedAgain.status, 200);
});

test('POST /generate-tour enforces IP rate limit and sets Retry-After', async () => {
  let now = 10_000;
  const app = createApp({
    supabase: {},
    getLocationsFn: async () => [],
    generateTourFn: async () => [],
    rateLimiter: createIpRateLimiter({
      windowMs: 1000,
      maxRequests: 2,
      nowFn: () => now,
    }),
  });

  await request(app).post('/generate-tour').set('x-forwarded-for', '1.2.3.4').send({});
  await request(app).post('/generate-tour').set('x-forwarded-for', '1.2.3.4').send({});
  const blocked = await request(app).post('/generate-tour').set('x-forwarded-for', '1.2.3.4').send({});

  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.error, 'Too many tour generation requests. Please try again later.');
  assert.equal(blocked.headers['retry-after'], '1');

  now += 1001;
  const allowedAgain = await request(app).post('/generate-tour').set('x-forwarded-for', '1.2.3.4').send({});
  assert.equal(allowedAgain.status, 200);
});

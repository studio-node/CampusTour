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

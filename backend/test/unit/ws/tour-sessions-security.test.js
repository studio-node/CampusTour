import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionManager, evictSessions } from '../../../tour-sessions.js';
import { FakeWs, emitClientMessage, flushAsync } from '../../helpers/fake-ws.js';
import { createSupabaseMock } from '../../helpers/mock-supabase.js';

function attachClient({ supabase, tourSessions }) {
  const ws = new FakeWs();
  sessionManager(ws, supabase, tourSessions);
  return ws;
}

test('messages with missing payload get an error reply instead of crashing', async () => {
  const supabase = createSupabaseMock();
  const tourSessions = new Map();
  const ws = attachClient({ supabase, tourSessions });

  emitClientMessage(ws, { type: 'join_session' });
  emitClientMessage(ws, { type: 'create_session' });
  emitClientMessage(ws, { type: 'get_members_snapshot' });
  await flushAsync();

  assert.equal(ws.sentMessages.length, 3);
  for (const message of ws.sentMessages) {
    assert.equal(message.type, 'error');
    assert.match(message.message, /tourId is required/i);
  }
});

test('tour:state_update with missing state gets an error reply instead of crashing', async () => {
  const supabase = createSupabaseMock();
  const tourSessions = new Map();
  const tourId = 'tour-state-missing';
  const ambassador = attachClient({ supabase, tourSessions });
  tourSessions.set(tourId, { ambassador, members: new Set() });

  emitClientMessage(ambassador, { type: 'tour:state_update', payload: { tourId } });
  await flushAsync();

  assert.equal(ambassador.sentMessages[0].type, 'error');
  assert.match(ambassador.sentMessages[0].message, /state are required/i);
});

test('auth accepts a valid token and attaches the verified user', async () => {
  const supabase = createSupabaseMock();
  supabase.setAuthUser('valid-token', 'amb-1');
  const tourSessions = new Map();
  const ws = attachClient({ supabase, tourSessions });

  emitClientMessage(ws, { type: 'auth', payload: { token: 'valid-token' } });
  await flushAsync();

  assert.equal(ws.sentMessages[0].type, 'auth_ok');
  assert.equal(ws.user.sub, 'amb-1');
});

test('auth rejects an invalid token and a raw user id', async () => {
  const supabase = createSupabaseMock();
  const tourSessions = new Map();
  const ws = attachClient({ supabase, tourSessions });

  emitClientMessage(ws, { type: 'auth', payload: { token: 'forged-token' } });
  emitClientMessage(ws, { type: 'auth', payload: { sub: 'amb-1' } });
  await flushAsync();

  // Replies can arrive out of order (token validation is async); assert on the set.
  const messages = ws.sentMessages.map((m) => `${m.type}:${m.message}`).sort();
  assert.deepEqual(messages, ['error:Invalid auth token.', 'error:Missing auth token.']);
  assert.equal(ws.user, undefined);
});

test('create_session requires authentication', async () => {
  const supabase = createSupabaseMock();
  const tourSessions = new Map();
  const ws = attachClient({ supabase, tourSessions });

  emitClientMessage(ws, { type: 'create_session', payload: { tourId: 'tour-1' } });
  await flushAsync();

  assert.equal(ws.sentMessages[0].type, 'error');
  assert.match(ws.sentMessages[0].message, /authentication required/i);
});

test('create_session rejects an authenticated user who is not the assigned ambassador', async () => {
  const supabase = createSupabaseMock();
  const tourSessions = new Map();
  const tourId = 'tour-wrong-amb';
  supabase.setSingleResponse('tour_appointments', tourId, {
    data: { ambassador_id: 'amb-real' },
    error: null,
  });

  const ws = attachClient({ supabase, tourSessions });
  ws.user = { sub: 'amb-imposter' };

  emitClientMessage(ws, { type: 'create_session', payload: { tourId } });
  await flushAsync();

  assert.equal(ws.sentMessages[0].type, 'error');
  assert.equal(ws.sentMessages[0].message, 'Unauthorized action.');
  assert.equal(tourSessions.get(tourId), undefined);
});

test('create_session rebinds the verified ambassador after a reconnect', async () => {
  const supabase = createSupabaseMock();
  const tourSessions = new Map();
  const tourId = 'tour-rebind';
  supabase.setSingleResponse('tour_appointments', tourId, {
    data: { ambassador_id: 'amb-1' },
    error: null,
  });
  supabase.setSingleResponse('live_tour_sessions', tourId, {
    data: { tour_appointment_id: tourId, joined_members: [] },
    error: null,
  });

  // Session exists in memory but ambassador disconnected earlier.
  tourSessions.set(tourId, { ambassador: null, members: new Set() });

  const ws = attachClient({ supabase, tourSessions });
  ws.user = { sub: 'amb-1' };

  emitClientMessage(ws, { type: 'create_session', payload: { tourId } });
  await flushAsync();

  const created = ws.sentMessages.find((m) => m.type === 'session_created');
  assert.ok(created);
  assert.equal(tourSessions.get(tourId).ambassador, ws);
});

test('tour:tour-list-changed is rejected for non-ambassadors', async () => {
  const supabase = createSupabaseMock();
  const tourSessions = new Map();
  const tourId = 'tour-list-guard';
  const ambassador = attachClient({ supabase, tourSessions });
  const member = attachClient({ supabase, tourSessions });
  tourSessions.set(tourId, { ambassador, members: new Set([member]) });

  emitClientMessage(member, {
    type: 'tour:tour-list-changed',
    payload: { tourId, newTourStructure: [] },
  });
  await flushAsync();

  assert.equal(member.sentMessages[0].type, 'error');
  assert.equal(member.sentMessages[0].message, 'Unauthorized action.');
});

test('tour:tour-list-changed from the ambassador broadcasts to members', async () => {
  const supabase = createSupabaseMock();
  const tourSessions = new Map();
  const tourId = 'tour-list-ok';
  const structure = ['11111111-1111-4111-8111-111111111111'];
  const ambassador = attachClient({ supabase, tourSessions });
  const member = attachClient({ supabase, tourSessions });
  tourSessions.set(tourId, { ambassador, members: new Set([member]) });

  emitClientMessage(ambassador, {
    type: 'tour:tour-list-changed',
    payload: { tourId, newTourStructure: structure },
  });
  await flushAsync();

  const changed = member.sentMessages.find((m) => m.type === 'tour_list_changed');
  assert.ok(changed);
  assert.deepEqual(changed.payload.newTourStructure, structure);
});

test('tour:state_update broadcasts the sanitized state that was persisted', async () => {
  const supabase = createSupabaseMock();
  const tourSessions = new Map();
  const tourId = 'tour-sanitize';
  const validId = '11111111-1111-4111-8111-111111111111';
  const ambassador = attachClient({ supabase, tourSessions });
  const member = attachClient({ supabase, tourSessions });
  tourSessions.set(tourId, { ambassador, members: new Set([member]) });

  emitClientMessage(ambassador, {
    type: 'tour:state_update',
    payload: {
      tourId,
      state: { current_location_id: '0', visited_locations: [validId, 'not-a-uuid'] },
    },
  });
  await flushAsync();

  const update = member.sentMessages.find((m) => m.type === 'tour_state_updated');
  assert.ok(update);
  assert.equal(update.state.current_location_id, null);
  assert.deepEqual(update.state.visited_locations, [validId]);
});

test('join_session scopes the lead lookup to the tour', async () => {
  const supabase = createSupabaseMock();
  const tourSessions = new Map();
  const tourId = 'tour-lead-scope';
  const leadId = '22222222-2222-4222-8222-222222222222';
  const ambassador = attachClient({ supabase, tourSessions });
  tourSessions.set(tourId, { ambassador, members: new Set() });
  supabase.setSingleResponse('live_tour_sessions', tourId, {
    data: { tour_appointment_id: tourId, joined_members: [] },
    error: null,
  });
  // No leads mock for this id -> the scoped lookup finds nothing.
  const member = attachClient({ supabase, tourSessions });

  emitClientMessage(member, { type: 'join_session', payload: { tourId, leadId } });
  await flushAsync();

  assert.equal(member.sentMessages[0].type, 'error');
  assert.match(member.sentMessages[0].message, /invalid leadid/i);
  assert.equal(tourSessions.get(tourId).members.has(member), false);
});

test('evictSessions closes member sockets and removes sessions from memory', () => {
  const tourSessions = new Map();
  const member = new FakeWs();
  const ambassador = new FakeWs();
  tourSessions.set('tour-evict', { ambassador, members: new Set([member]) });
  tourSessions.set('tour-keep', { ambassador: null, members: new Set() });

  const evicted = evictSessions(tourSessions, ['tour-evict', 'tour-unknown']);

  assert.equal(evicted, 1);
  assert.equal(tourSessions.has('tour-evict'), false);
  assert.equal(tourSessions.has('tour-keep'), true);
  assert.equal(member.closed, true);
  const ended = member.sentMessages.find((m) => m.type === 'session_ended');
  assert.ok(ended);
});

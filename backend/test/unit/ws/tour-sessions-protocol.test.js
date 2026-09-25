import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionManager } from '../../../tour-sessions.js';
import { FakeWs, emitClientMessage, flushAsync } from '../../helpers/fake-ws.js';
import { createSupabaseMock } from '../../helpers/mock-supabase.js';

function attachClient({ supabase, tourSessions }) {
  const ws = new FakeWs();
  sessionManager(ws, supabase, tourSessions);
  return ws;
}

// Records every update() payload so tests can see writes that aren't the last one.
function recordUpdates(supabase) {
  const updates = [];
  const from = supabase.from.bind(supabase);
  supabase.from = (table) => {
    const chain = from(table);
    const update = chain.update;
    chain.update = (payload) => {
      updates.push({ table, payload });
      return update(payload);
    };
    return chain;
  };
  return updates;
}

const MEMBER = { id: '33333333-3333-4333-8333-333333333333', first_name: 'Gia' };

test('ping gets a pong reply, not an error', async () => {
  const supabase = createSupabaseMock();
  const ws = attachClient({ supabase, tourSessions: new Map() });

  emitClientMessage(ws, { type: 'ping' });
  await flushAsync();

  assert.deepEqual(ws.sentMessages.map((m) => m.type), ['pong']);
});

test('create_session sent right behind auth is processed after auth is verified', async () => {
  const supabase = createSupabaseMock();
  const tourId = 'tour-ordered';
  supabase.setAuthUser('valid-token', 'amb-1');
  supabase.setSingleResponse('tour_appointments', tourId, { data: { ambassador_id: 'amb-1' }, error: null });
  supabase.setSingleResponse('live_tour_sessions', tourId, {
    data: { tour_appointment_id: tourId, status: 'awaiting_start', joined_members: [] },
    error: null,
  });
  const tourSessions = new Map();
  const ws = attachClient({ supabase, tourSessions });

  // Same back-to-back send the client does on reconnect (auth, then replayed create_session).
  emitClientMessage(ws, { type: 'auth', payload: { token: 'valid-token' } });
  emitClientMessage(ws, { type: 'create_session', payload: { tourId } });
  await flushAsync();

  assert.deepEqual(ws.sentMessages.map((m) => m.type), ['auth_ok', 'session_created']);
  assert.equal(tourSessions.get(tourId).ambassador, ws);
});

test('join_session does not restore a tour that already ended', async () => {
  const supabase = createSupabaseMock();
  const tourId = 'tour-ended';
  supabase.setSingleResponse('live_tour_sessions', tourId, {
    data: { tour_appointment_id: tourId, status: 'ended', joined_members: [] },
    error: null,
  });
  supabase.setSingleResponse('tour_appointments', tourId, {
    data: { ambassador_id: 'amb-1', status: 'completed' },
    error: null,
  });
  const tourSessions = new Map();
  const member = attachClient({ supabase, tourSessions });

  emitClientMessage(member, { type: 'join_session', payload: { tourId, member: MEMBER } });
  await flushAsync();

  assert.equal(member.sentMessages.length, 1);
  assert.equal(member.sentMessages[0].type, 'session_ended');
  assert.equal(member.sentMessages[0].payload.tourId, tourId);
  assert.equal(tourSessions.has(tourId), false);
});

test('a lobby the inactivity sweep ended before the tour started is reopened on join', async () => {
  const supabase = createSupabaseMock();
  const updates = recordUpdates(supabase);
  const tourId = 'tour-swept-lobby';
  supabase.setSingleResponse('live_tour_sessions', tourId, {
    data: { tour_appointment_id: tourId, status: 'ended', joined_members: [] },
    error: null,
  });
  supabase.setSingleResponse('tour_appointments', tourId, {
    data: { ambassador_id: 'amb-1', status: 'scheduled' },
    error: null,
  });
  const tourSessions = new Map();
  const member = attachClient({ supabase, tourSessions });

  emitClientMessage(member, { type: 'join_session', payload: { tourId, member: MEMBER } });
  await flushAsync();

  assert.ok(member.sentMessages.some((m) => m.type === 'session_joined'));
  assert.equal(tourSessions.get(tourId).members.has(member), true);
  assert.ok(updates.some((u) => u.table === 'live_tour_sessions' && u.payload.status === 'awaiting_start'));
});

test('get_members_snapshot is refused for sockets that are not the session ambassador', async () => {
  const supabase = createSupabaseMock();
  const tourId = 'tour-snapshot';
  const tourSessions = new Map();
  const ambassador = attachClient({ supabase, tourSessions });
  const member = attachClient({ supabase, tourSessions });
  const outsider = attachClient({ supabase, tourSessions });
  member.generalMemberId = MEMBER.id;
  member.generalFirstName = MEMBER.first_name;
  tourSessions.set(tourId, { ambassador, members: new Set([member]) });

  emitClientMessage(outsider, { type: 'get_members_snapshot', payload: { tourId } });
  emitClientMessage(member, { type: 'get_members_snapshot', payload: { tourId } });
  emitClientMessage(ambassador, { type: 'get_members_snapshot', payload: { tourId } });
  await flushAsync();

  assert.equal(outsider.sentMessages[0].message, 'Unauthorized action.');
  assert.equal(member.sentMessages[0].message, 'Unauthorized action.');
  assert.deepEqual(ambassador.sentMessages[0].payload.generalMembers, [MEMBER]);
});

test('tour:end tells members the session ended and closes their sockets', async () => {
  const supabase = createSupabaseMock();
  const tourId = 'tour-end';
  const tourSessions = new Map();
  const ambassador = attachClient({ supabase, tourSessions });
  const member = attachClient({ supabase, tourSessions });
  tourSessions.set(tourId, { ambassador, members: new Set([member]) });

  emitClientMessage(ambassador, { type: 'tour:end', payload: { tourId } });
  await flushAsync();

  const ended = member.sentMessages.find((m) => m.type === 'session_ended');
  assert.equal(ended.payload.tourId, tourId);
  assert.equal(member.closed, true);
  assert.equal(tourSessions.has(tourId), false);
  assert.ok(ambassador.sentMessages.some((m) => m.type === 'tour_ended_confirmation'));
});

test('server messages carry their data under payload', async () => {
  const supabase = createSupabaseMock();
  const tourId = 'tour-envelope';
  const validId = '11111111-1111-4111-8111-111111111111';
  const tourSessions = new Map();
  const ambassador = attachClient({ supabase, tourSessions });
  const member = attachClient({ supabase, tourSessions });
  tourSessions.set(tourId, { ambassador, members: new Set([member]) });

  emitClientMessage(ambassador, {
    type: 'tour:state_update',
    payload: { tourId, state: { current_location_id: validId, visited_locations: [] } },
  });
  emitClientMessage(ambassador, {
    type: 'tour:media:push-takeover',
    payload: { tourId, media: { id: 'm-1' } },
  });
  await flushAsync();

  const [state, takeover] = member.sentMessages;
  assert.equal(state.payload.state.current_location_id, validId);
  assert.deepEqual(takeover.payload.media, { id: 'm-1' });
});

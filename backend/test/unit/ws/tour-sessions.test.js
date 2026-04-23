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

test('join_session requires tourId and leadId', async () => {
  const supabase = createSupabaseMock();
  const tourSessions = new Map();
  const ws = attachClient({ supabase, tourSessions });

  emitClientMessage(ws, { type: 'join_session', payload: { leadId: 'lead-1' } });
  emitClientMessage(ws, { type: 'join_session', payload: { tourId: 'tour-1' } });
  await flushAsync();

  assert.equal(ws.sentMessages[0].type, 'error');
  assert.match(ws.sentMessages[0].message, /tourId is required/i);
  assert.equal(ws.sentMessages[1].type, 'error');
  assert.match(ws.sentMessages[1].message, /leadId is required/i);
});

test('non-ambassador cannot send tour mutation events', async () => {
  const supabase = createSupabaseMock();
  const tourSessions = new Map();
  const tourId = 'tour-unauthorized';
  const ws = attachClient({ supabase, tourSessions });
  tourSessions.set(tourId, { ambassador: null, members: new Set([ws]) });
  ws.tourId = tourId;

  emitClientMessage(ws, { type: 'tour:state_update', payload: { tourId, state: {} } });
  await flushAsync();

  assert.equal(ws.sentMessages[0].type, 'error');
  assert.equal(ws.sentMessages[0].message, 'Unauthorized action.');
});

test('tour:start sent by ambassador broadcasts structure update to members', async () => {
  const supabase = createSupabaseMock();
  const tourId = 'tour-start';
  const tourSessions = new Map();

  supabase.setSingleResponse('tour_appointments', tourId, {
    data: { school_id: 'school-1', ambassador_id: 'amb-1' },
    error: null,
  });

  const ambassador = attachClient({ supabase, tourSessions });
  const member = attachClient({ supabase, tourSessions });
  ambassador.user = { sub: 'amb-1' };
  tourSessions.set(tourId, { ambassador, members: new Set([member]) });

  emitClientMessage(ambassador, { type: 'tour:start', payload: { tourId } });
  await flushAsync();

  const memberEvents = member.sentMessages.map((m) => m.type);
  assert.ok(memberEvents.includes('tour_structure_updated'));

  const ambassadorEvents = ambassador.sentMessages.map((m) => m.type);
  assert.ok(ambassadorEvents.includes('tour_started'));
});

test('ambassador:ping from member reaches ambassador with lead metadata', async () => {
  const supabase = createSupabaseMock();
  const tourSessions = new Map();
  const tourId = 'tour-ping';
  const leadId = 'lead-42';
  const ambassador = attachClient({ supabase, tourSessions });
  const member = attachClient({ supabase, tourSessions });

  supabase.setSingleResponse('leads', leadId, {
    data: { id: leadId, first_name: 'Alex', last_name: 'Member' },
    error: null,
  });

  tourSessions.set(tourId, { ambassador, members: new Set([member]) });
  member.leadId = leadId;

  emitClientMessage(member, { type: 'ambassador:ping', payload: { tourId, message: 'Need help' } });
  await flushAsync();

  const ping = ambassador.sentMessages.find((m) => m.type === 'ambassador_ping');
  assert.ok(ping);
  assert.equal(ping.payload.leadId, leadId);
  assert.equal(ping.payload.memberName, 'Alex Member');
  assert.equal(ping.payload.message, 'Need help');
});

test('member disconnect removes them and notifies ambassador', async () => {
  const supabase = createSupabaseMock();
  const tourSessions = new Map();
  const tourId = 'tour-disconnect';
  const leadId = 'lead-99';

  supabase.setSingleResponse('live_tour_sessions', tourId, {
    data: { joined_members: [leadId] },
    error: null,
  });

  const ambassador = attachClient({ supabase, tourSessions });
  const member = attachClient({ supabase, tourSessions });
  member.tourId = tourId;
  member.leadId = leadId;
  tourSessions.set(tourId, { ambassador, members: new Set([member]) });

  member.close();
  await flushAsync();

  assert.equal(tourSessions.get(tourId).members.size, 0);
  const left = ambassador.sentMessages.find((m) => m.type === 'member_left');
  assert.ok(left);
  assert.equal(left.leadId, leadId);
});

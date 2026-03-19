import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getLocations,
  createLiveTourSession,
  updateLiveTourSession,
  closeInactiveSessions,
} from '../../../supabase.mjs';

function makeSupabaseDouble(resolvers) {
  const state = {
    table: null,
    updatePayload: null,
    insertPayload: null,
    inValues: null,
  };

  const chain = {
    select() {
      return chain;
    },
    eq() {
      return chain;
    },
    neq() {
      return chain;
    },
    lt() {
      return chain;
    },
    in(_column, values) {
      state.inValues = values;
      return chain;
    },
    update(payload) {
      state.updatePayload = payload;
      return chain;
    },
    insert(payload) {
      state.insertPayload = payload;
      return chain;
    },
    single: async () => {
      return resolvers.single?.(state.table, state) ?? { data: null, error: null };
    },
    then(resolve, reject) {
      return Promise.resolve(resolvers.then?.(state.table, state) ?? { data: null, error: null }).then(resolve, reject);
    },
  };

  return {
    state,
    from(table) {
      state.table = table;
      return chain;
    },
  };
}

test('getLocations maps data shape', async () => {
  const supabase = makeSupabaseDouble({
    then: () => ({
      data: [
        {
          id: 'loc-1',
          name: 'Library',
          description: 'Main library',
          interests: ['academics'],
        },
      ],
      error: null,
    }),
  });

  const locations = await getLocations('school-1', supabase);
  assert.deepEqual(locations, [
    {
      id: 'loc-1',
      name: 'Library',
      description: 'Main library',
      interests: ['academics'],
      careers: [],
      features: [],
    },
  ]);
});

test('getLocations returns [] on Supabase error', async () => {
  const supabase = makeSupabaseDouble({
    then: () => ({ data: null, error: { message: 'boom' } }),
  });

  const locations = await getLocations('school-1', supabase);
  assert.deepEqual(locations, []);
});

test('createLiveTourSession returns inserted row', async () => {
  const supabase = makeSupabaseDouble({
    single: (_table, state) => ({
      data: { id: 'session-1', ...state.insertPayload?.[0] },
      error: null,
    }),
  });

  const session = await createLiveTourSession(supabase, {
    tour_appointment_id: 'tour-1',
    ambassador_id: 'amb-1',
    initial_structure: ['loc-1'],
  });

  assert.equal(session.id, 'session-1');
  assert.equal(session.tour_appointment_id, 'tour-1');
});

test('updateLiveTourSession writes updated_at and returns row', async () => {
  const supabase = makeSupabaseDouble({
    single: (_table, state) => ({
      data: { id: 'session-1', ...state.updatePayload },
      error: null,
    }),
  });

  const updated = await updateLiveTourSession(supabase, 'tour-1', { status: 'active' });
  assert.equal(updated.status, 'active');
  assert.ok(updated.updated_at);
});

test('closeInactiveSessions ends stale active sessions', async () => {
  const staleSessions = [
    { tour_appointment_id: 'tour-a', status: 'active', updated_at: '2020-01-01T00:00:00.000Z' },
    { tour_appointment_id: 'tour-b', status: 'paused', updated_at: '2020-01-01T00:00:00.000Z' },
  ];

  let updateCall = 0;
  const supabase = makeSupabaseDouble({
    then: (_table, state) => {
      updateCall += 1;
      if (updateCall === 1) {
        return { data: staleSessions, error: null };
      }
      return {
        data: state.inValues.map((tour_appointment_id) => ({ tour_appointment_id })),
        error: null,
      };
    },
  });

  const closedCount = await closeInactiveSessions(supabase);
  assert.equal(closedCount, 2);
});

test('closeInactiveSessions returns 0 when nothing stale', async () => {
  const supabase = makeSupabaseDouble({
    then: () => ({ data: [], error: null }),
  });

  const closedCount = await closeInactiveSessions(supabase);
  assert.equal(closedCount, 0);
});

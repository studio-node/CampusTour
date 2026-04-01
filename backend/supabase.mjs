export async function getLocations(schoolId, supabase) {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('school_id', schoolId);

    if (error) {
      console.error('Error fetching locations:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      interests: item.interests || [],
      careers: item.careers || [],
      features: item.features || []
    }));

  } catch (error) {
    console.error('Exception fetching locations:', error);
    return [];
  }
}

export async function createLiveTourSession(supabase, { tour_appointment_id, ambassador_id, initial_structure }) {
  const { data, error } = await supabase
    .from('live_tour_sessions')
    .insert([{
      tour_appointment_id,
      ambassador_id,
      live_tour_structure: initial_structure,
    }])
    .select()
    .single();
  if (error) {
    console.error('Error creating live tour session:', error);
    return null;
  }
  return data;
}

/**
 * Ensures a `live_tour_sessions` row exists for the appointment. Use when the row was
 * removed from the DB (e.g. manual delete during testing) while the WebSocket server still
 * holds an in-memory session — otherwise UPDATEs match 0 rows and PostgREST returns
 * "The result contains 0 rows" (PGRST116).
 *
 * @param {object} partialUpdates - Fields to merge into a newly inserted row (same shape as updateLiveTourSession).
 */
export async function ensureLiveTourSessionRow(supabase, tour_appointment_id, partialUpdates = {}) {
  const { data: existingRows, error: selectError } = await supabase
    .from('live_tour_sessions')
    .select('*')
    .eq('tour_appointment_id', tour_appointment_id);

  if (selectError) {
    console.error('ensureLiveTourSessionRow: select failed', selectError);
    return null;
  }
  if (existingRows && existingRows.length > 0) {
    return existingRows[0];
  }

  const { data: appt, error: apptError } = await supabase
    .from('tour_appointments')
    .select('ambassador_id')
    .eq('id', tour_appointment_id)
    .single();

  if (apptError || !appt?.ambassador_id) {
    console.error('ensureLiveTourSessionRow: missing tour_appointment or ambassador_id', apptError);
    return null;
  }

  const ts = new Date().toISOString();
  const merged = {
    tour_appointment_id,
    ambassador_id: appt.ambassador_id,
    live_tour_structure: partialUpdates.live_tour_structure ?? [],
    visited_locations: partialUpdates.visited_locations ?? [],
    status: partialUpdates.status ?? 'active',
    current_location_id: partialUpdates.current_location_id ?? null,
    joined_members: Array.isArray(partialUpdates.joined_members) ? partialUpdates.joined_members : [],
    updated_at: partialUpdates.updated_at ?? ts,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('live_tour_sessions')
    .insert([merged])
    .select()
    .single();

  if (insertError) {
    // Unique violation: another request recreated the row
    if (insertError.code === '23505') {
      const { data: again, error: againErr } = await supabase
        .from('live_tour_sessions')
        .select('*')
        .eq('tour_appointment_id', tour_appointment_id);
      if (againErr || !again?.length) {
        console.error('ensureLiveTourSessionRow: race recovery failed', againErr);
        return null;
      }
      console.warn(
        `ensureLiveTourSessionRow: recreated row for tour ${tour_appointment_id} (concurrent insert)`
      );
      return again[0];
    }
    console.error('ensureLiveTourSessionRow: insert failed', insertError);
    return null;
  }

  console.warn(
    `ensureLiveTourSessionRow: inserted missing live_tour_sessions row for tour ${tour_appointment_id}`
  );
  return inserted;
}

export async function updateLiveTourSession(supabase, tour_appointment_id, updates) {
  // Always update the updated_at timestamp to track activity
  const updatesWithTimestamp = {
    ...updates,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('live_tour_sessions')
    .update(updatesWithTimestamp)
    .eq('tour_appointment_id', tour_appointment_id)
    .select();

  if (error) {
    console.error('Error updating live tour session:', error);
    return null;
  }

  if (data && data.length > 0) {
    return data[0];
  }

  console.warn(
    `updateLiveTourSession: no row for tour ${tour_appointment_id}; recreating then applying update`
  );

  const ensured = await ensureLiveTourSessionRow(supabase, tour_appointment_id, updatesWithTimestamp);
  if (!ensured) {
    return null;
  }

  const { data: after, error: err2 } = await supabase
    .from('live_tour_sessions')
    .update(updatesWithTimestamp)
    .eq('tour_appointment_id', tour_appointment_id)
    .select();

  if (err2) {
    console.error('Error updating live tour session after recreate:', err2);
    return ensured;
  }
  return after && after[0] ? after[0] : ensured;
}

/**
 * Closes inactive sessions that haven't been updated in the last hour.
 * Sessions with status 'ended' are excluded from this check.
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<number>} Number of sessions closed
 */
export async function closeInactiveSessions(supabase) {
  try {
    // Calculate the timestamp for 1 hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    // Find all sessions that haven't been updated in the last hour and are not already ended
    const { data: inactiveSessions, error: fetchError } = await supabase
      .from('live_tour_sessions')
      .select('tour_appointment_id, status, updated_at')
      .neq('status', 'ended')
      .lt('updated_at', oneHourAgo);
    
    if (fetchError) {
      console.error('Error fetching inactive sessions:', fetchError);
      return 0;
    }
    
    if (!inactiveSessions || inactiveSessions.length === 0) {
      return 0;
    }
    
    // Update all inactive sessions to 'ended' status
    const sessionIds = inactiveSessions.map(s => s.tour_appointment_id);
    const { data: updatedSessions, error: updateError } = await supabase
      .from('live_tour_sessions')
      .update({ 
        status: 'ended',
        updated_at: new Date().toISOString()
      })
      .in('tour_appointment_id', sessionIds)
      .select('tour_appointment_id');
    
    if (updateError) {
      console.error('Error closing inactive sessions:', updateError);
      return 0;
    }
    
    const closedCount = updatedSessions?.length || 0;
    if (closedCount > 0) {
      console.log(`Closed ${closedCount} inactive session(s):`, updatedSessions.map(s => s.tour_appointment_id));
    }
    
    return closedCount;
  } catch (error) {
    console.error('Exception closing inactive sessions:', error);
    return 0;
  }
}

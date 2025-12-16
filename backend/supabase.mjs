export async function getLocations(schoolId, supabase) {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('school_id', schoolId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching locations:', error);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      name: item.name,
      coordinates: {
        latitude: item.latitude,
        longitude: item.longitude
      },
      image: item.image_url,
      description: item.description,
      interests: item.interests || [],
      isTourStop: item.is_tour_stop,
      order_index: item.order_index,
      type: item.type
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
    .select()
    .single();
  if (error) {
    console.error('Error updating live tour session:', error);
    return null;
  }
  return data;
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

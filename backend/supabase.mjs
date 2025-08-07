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
  const { data, error } = await supabase
    .from('live_tour_sessions')
    .update(updates)
    .eq('tour_appointment_id', tour_appointment_id)
    .select()
    .single();
  if (error) {
    console.error('Error updating live tour session:', error);
    return null;
  }
  return data;
}

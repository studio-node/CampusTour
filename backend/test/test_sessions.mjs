import { createClient } from '@supabase/supabase-js';


// TO RUN USE THIS: node --env-file=../.env test_sessions.mjs

async function getJoinedMembers(tourAppointmentId) {
    try {
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { data, error } = await supabase
            .from('live_tour_sessions')
            .select('joined_members')
            .eq('tour_appointment_id', tourAppointmentId)
            .maybeSingle(); // Use maybeSingle() instead of single() to handle case where row might not exist

        console.error('data', data);
        if (error) {
            // PGRST116 means "no rows returned" - session doesn't exist yet, which is fine
            if (error.code === 'PGRST116') {
                return ['PGRST116'];
            }
            console.error('Error fetching joined members:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint,
                tourAppointmentId
            });
            return [];
        }

        // If no data (maybeSingle returns null when no row), return empty array
        if (!data) {
            return [];
        }

        // Return the joined_members array, ensuring it's an array
        const joinedMembers = data?.joined_members;
        if (Array.isArray(joinedMembers)) {
            return joinedMembers;
        }

        return [];
    } catch (error) {
        console.error('Exception fetching joined members:', error);
        return [];
    }
}

getJoinedMembers("cdb9d53f-89de-4a57-8735-a052bfeb3dbc").then(console.error);
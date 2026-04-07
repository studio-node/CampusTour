import { supabase } from '../supabase.js'

/**
 * Tour Appointments Service
 * Handles tour appointment/group operations for the webapp
 */

/**
 * List tour appointments for a school (admin).
 * @param {Object} params
 * @param {string} params.schoolId
 * @param {string} [params.startIso] - inclusive ISO timestamp
 * @param {string} [params.endIso] - inclusive ISO timestamp
 * @returns {Promise<Array>}
 */
export async function listAppointmentsForSchool({ schoolId, startIso, endIso } = {}) {
  if (!schoolId) throw new Error('schoolId is required')

  const query = supabase
    .from('tour_appointments')
    .select(`
      *,
      profiles (
        id,
        full_name,
        email
      )
    `)
    .eq('school_id', schoolId)
    .order('scheduled_date', { ascending: true })

  if (startIso) query.gte('scheduled_date', startIso)
  if (endIso) query.lte('scheduled_date', endIso)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

/**
 * Create a tour appointment (admin).
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function createAppointment(payload) {
  const { data, error } = await supabase
    .from('tour_appointments')
    .insert([payload])
    .select(`
      *,
      profiles (
        id,
        full_name,
        email
      )
    `)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new Error('Appointment was not created (no row returned). This is usually a row-level security (RLS) policy issue.')
  }
  return data
}

/**
 * Update a tour appointment (admin).
 * @param {string} appointmentId
 * @param {Object} patch
 * @returns {Promise<Object>}
 */
export async function updateAppointment(appointmentId, patch) {
  const { data, error } = await supabase
    .from('tour_appointments')
    .update(patch)
    .eq('id', appointmentId)
    .select(`
      *,
      profiles (
        id,
        full_name,
        email
      )
    `)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new Error('Appointment was not updated (0 rows affected). This is usually because RLS does not allow your user to update this appointment.')
  }
  return data
}

/**
 * Delete a tour appointment (admin).
 * @param {string} appointmentId
 * @returns {Promise<void>}
 */
export async function deleteAppointment(appointmentId) {
  const { error } = await supabase
    .from('tour_appointments')
    .delete()
    .eq('id', appointmentId)

  if (error) throw error
}

/**
 * List active ambassadors in a school (admin).
 * @param {string} schoolId
 * @returns {Promise<Array<{id:string, full_name:string, email?:string}>>}
 */
export async function listAmbassadorsForSchool(schoolId) {
  if (!schoolId) throw new Error('schoolId is required')

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active, school_id')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .ilike('role', 'ambassador')
    .order('full_name', { ascending: true })

  if (error) throw error
  return (data || []).map(({ id, full_name, email }) => ({ id, full_name, email }))
}

/**
 * List scheduled appointments assigned to the current ambassador (read-only).
 * @param {Object} [params]
 * @param {string} [params.startIso] - inclusive ISO timestamp
 * @returns {Promise<Array>}
 */
export async function listMyScheduledAppointments({ startIso } = {}) {
  const start = startIso || new Date().toISOString()

  const { data, error } = await supabase
    .from('tour_appointments')
    .select(`
      *,
      profiles (
        id,
        full_name,
        email
      )
    `)
    .eq('status', 'scheduled')
    .gte('scheduled_date', start)
    .order('scheduled_date', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get available tour appointments for a specific school
 * @param {string} schoolId - The school ID to filter by
 * @returns {Promise<Array>}
 */
export async function getAvailableTourGroups(schoolId) {
  try {
    const now = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('tour_appointments')
      .select(`
        *,
        profiles (
          full_name
        )
      `)
      .eq('school_id', schoolId)
      .eq('status', 'scheduled')
      .gte('scheduled_date', now)
      .order('scheduled_date', { ascending: true })

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error fetching available tour groups:', error)
    throw error
  }
}

/**
 * Get tour appointment details by ID
 * @param {string} appointmentId - The appointment ID
 * @returns {Promise<Object>}
 */
export async function getTourAppointmentById(appointmentId) {
  try {
    const { data, error } = await supabase
      .from('tour_appointments')
      .select(`
        *,
        profiles (
          id,
          full_name
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching tour appointment:', error)
    throw error
  }
}

/**
 * Join a tour group (for now, just return success - could track participants later)
 * @param {string} appointmentId - The appointment ID to join
 * @param {Object} userInfo - User information
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function joinTourGroup(appointmentId, userInfo) {
  try {
    // For now, we'll just return success
    // In the future, this could:
    // 1. Add the user to a tour_participants table
    // 2. Check if tour is full
    // 3. Send confirmation emails
    // 4. Generate QR codes for check-in
    
    return {
      success: true,
      message: 'Successfully joined tour group!'
    }
  } catch (error) {
    console.error('Error joining tour group:', error)
    return {
      success: false,
      error: 'Failed to join tour group. Please try again.'
    }
  }
}

/**
 * Check if a tour has available spots
 * @param {Object} tour - The tour appointment object
 * @param {number} currentParticipants - Current number of participants (for future use)
 * @returns {boolean}
 */
export function hasAvailableSpots(tour, currentParticipants = 0) {
  return currentParticipants < tour.max_participants
}

/**
 * Format tour date and time for display
 * @param {string} scheduledDate - ISO date string
 * @returns {Object} - Formatted date and time
 */
export function formatTourDateTime(scheduledDate) {
  const date = new Date(scheduledDate)
  
  return {
    date: date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }),
    time: date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }),
    dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
    shortDate: date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }
}

export const tourAppointmentsService = {
  listAppointmentsForSchool,
  listMyScheduledAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  listAmbassadorsForSchool,
  getAvailableTourGroups,
  getTourAppointmentById,
  joinTourGroup,
  hasAvailableSpots,
  formatTourDateTime
} 
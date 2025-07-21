import { supabase } from '../supabase.js'

/**
 * Tour Appointments Service
 * Handles tour appointment/group operations for the webapp
 */

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
        public_ambassador_profiles (
          full_name)
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
        public_ambassador_profiles (
          full_name)
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
  getAvailableTourGroups,
  getTourAppointmentById,
  joinTourGroup,
  hasAvailableSpots,
  formatTourDateTime
} 
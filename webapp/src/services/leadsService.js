import { supabase } from '../supabase.js'

/**
 * Leads Service
 * Handles lead data operations for the webapp
 */

/**
 * Create a new lead in the database
 * @param {Object} leadData - The lead data to save
 * @returns {Promise<{success: boolean, error?: string, data?: any}>}
 */
export async function createLead(leadData) {
  try {
    // Prepare the data for insertion
    const insertData = {
      school_id: leadData.school_id,
      name: leadData.name,
      identity: leadData.identity,
      address: leadData.address,
      email: leadData.email,
      date_of_birth: leadData.date_of_birth,
      gender: leadData.gender,
      grad_year: leadData.grad_year,
      tour_type: leadData.tour_type,
      tour_appointment_id: leadData.tour_appointment_id,
      created_at: new Date().toISOString()
    }

    // Insert the lead into the database
    const { data, error } = await supabase
      .from('leads')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Error creating lead:', error)
      return {
        success: false,
        error: error.message || 'Failed to save lead information'
      }
    }

    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('Error in createLead:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Get leads for a specific school
 * @param {string} schoolId - The school ID to filter by
 * @returns {Promise<Array>}
 */
export async function getLeadsBySchool(schoolId) {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error fetching leads by school:', error)
    throw error
  }
}

/**
 * Get all leads (for admin purposes)
 * @returns {Promise<Array>}
 */
export async function getAllLeads() {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        schools (
          name,
          city,
          state
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error fetching all leads:', error)
    throw error
  }
}

export const leadsService = {
  createLead,
  getLeadsBySchool,
  getAllLeads
} 
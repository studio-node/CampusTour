import { supabase } from '../supabase.js'

/**
 * Locations Service
 * Handles location data operations for the webapp
 */

/**
 * Get school_id from user's profile
 * @param {string} userId - The user ID from auth
 * @returns {Promise<string|null>} - The school_id or null if not found
 */
export async function getUserSchoolId(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('school_id')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data?.school_id || null
  } catch (error) {
    console.error('Error in getUserSchoolId:', error)
    return null
  }
}

/**
 * Create a new location in the database
 * @param {Object} locationData - The location data to save
 * @returns {Promise<{success: boolean, error?: string, data?: any}>}
 */
export async function createLocation(locationData) {
  try {
    // Prepare the data for insertion
    const insertData = {
      school_id: locationData.school_id,
      name: locationData.name,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      description: locationData.description || null,
      interests: locationData.interests || null,
      careers: locationData.careers || null,
      talking_points: locationData.talking_points || null,
      features: locationData.features || null,
      default_stop: locationData.default_stop !== undefined ? locationData.default_stop : true,
      order_index: locationData.order_index || null
    }

    // Insert the location into the database
    const { data, error } = await supabase
      .from('locations')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Error creating location:', error)
      return {
        success: false,
        error: error.message || 'Failed to save location'
      }
    }

    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('Error in createLocation:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Get locations for a specific school
 * @param {string} schoolId - The school ID to filter by
 * @returns {Promise<Array>}
 */
export async function getLocationsBySchool(schoolId) {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('school_id', schoolId)
      .order('order_index', { ascending: true, nullsLast: true })

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error fetching locations by school:', error)
    throw error
  }
}

/**
 * Update an existing location in the database
 * @param {string} locationId - The location ID to update
 * @param {Object} locationData - The location data to update
 * @returns {Promise<{success: boolean, error?: string, data?: any}>}
 */
export async function updateLocation(locationId, locationData) {
  try {
    // Prepare the data for update
    const updateData = {
      name: locationData.name,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      description: locationData.description || null,
      interests: locationData.interests || null,
      careers: locationData.careers || null,
      talking_points: locationData.talking_points || null,
      features: locationData.features || null,
      default_stop: locationData.default_stop !== undefined ? locationData.default_stop : true,
      order_index: locationData.order_index || null
    }

    // Update the location in the database
    const { data, error } = await supabase
      .from('locations')
      .update(updateData)
      .eq('id', locationId)

    if (error) {
      console.error('Error updating location:', error)
      return {
        success: false,
        error: error.message || 'Failed to update location'
      }
    }

    console.log('data from updateLocation:', data)
    return {
      success: true,
      data: data
    }
  } catch (error) {
    console.error('Error in updateLocation:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

export const locationsService = {
  createLocation,
  updateLocation,
  getUserSchoolId,
  getLocationsBySchool
}

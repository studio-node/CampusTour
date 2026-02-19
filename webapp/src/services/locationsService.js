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
      // PGRST116 = no rows returned (e.g. no profile row or RLS blocking)
      console.error('Error fetching user profile:', error.code, error.message)
      return null
    }

    return data?.school_id ?? null
  } catch (err) {
    console.error('Error in getUserSchoolId:', err)
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

/**
 * Delete a location from the database
 * @param {string} locationId - The location ID to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteLocation(locationId) {
  try {
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', locationId)

    if (error) {
      console.error('Error deleting location:', error)
      return {
        success: false,
        error: error.message || 'Failed to delete location'
      }
    }

    return {
      success: true
    }
  } catch (error) {
    console.error('Error in deleteLocation:', error)
    return {
      success: false,
      error: 'An unexpected error occurred'
    }
  }
}

/**
 * Get a single location by id (for builder edit page)
 * @param {string} locationId
 * @returns {Promise<Object|null>}
 */
export async function getLocationById(locationId) {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('id, school_id, name, description, interests, careers, talking_points, features')
      .eq('id', locationId)
      .single()

    if (error) {
      console.error('Error fetching location by id:', error)
      return null
    }

    return data || null
  } catch (error) {
    console.error('Error in getLocationById:', error)
    return null
  }
}

/**
 * Reset a location's builder passcode (admin only).
 * Returns plaintext passcode once so admin can share it.
 * @param {string} locationId
 * @returns {Promise<{success: boolean, data?: {location_id: string, passcode: string}, error?: string}>}
 */
export async function resetLocationBuilderPasscode(locationId) {
  try {
    const { data, error } = await supabase.functions.invoke('reset_location_builder_passcode', {
      body: { location_id: locationId }
    })

    if (error) {
      console.error('Error resetting builder passcode:', error)
      return { success: false, error: error.message || 'Failed to reset passcode' }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error in resetLocationBuilderPasscode:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Update location content as an unauthenticated builder (passcode-gated).
 * @param {string} locationId
 * @param {string} passcode
 * @param {Object} patch - Only content fields are allowed server-side
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function updateLocationAsBuilder(locationId, passcode, patch) {
  try {
    const { data, error } = await supabase.functions.invoke('update_location_as_builder', {
      body: { location_id: locationId, passcode, patch }
    })

    if (error) {
      console.error('Error updating location as builder:', error)
      return { success: false, error: error.message || 'Failed to update location' }
    }

    return { success: true, data: data?.data ?? data }
  } catch (error) {
    console.error('Error in updateLocationAsBuilder:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export const locationsService = {
  createLocation,
  updateLocation,
  deleteLocation,
  getUserSchoolId,
  getLocationsBySchool,
  getLocationById,
  resetLocationBuilderPasscode,
  updateLocationAsBuilder
}

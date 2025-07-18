import { supabase } from '../supabase.js'

/**
 * School Service
 * Handles school data operations for the webapp
 */

// Storage keys for localStorage
const STORAGE_KEYS = {
  SELECTED_SCHOOL: 'selectedSchool'
}

/**
 * Get all schools (for now, we'll get all instead of filtering by distance)
 * In the mobile app this was getClosestSchools() but for web we'll show all available schools
 */
export async function getSchools() {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('name')

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error fetching schools:', error)
    throw error
  }
}

/**
 * Get schools ordered by distance (placeholder - returns all schools for now)
 * TODO: Implement actual distance calculation if geolocation is needed
 */
export async function getClosestSchools(lat = null, lng = null) {
  try {
    // For now, just return all schools
    // In the future, this could calculate distance based on lat/lng
    return await getSchools()
  } catch (error) {
    console.error('Error fetching closest schools:', error)
    throw error
  }
}

/**
 * Get details for a specific school by ID
 */
export async function getSchoolById(schoolId) {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single()

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching school by ID:', error)
    throw error
  }
}

/**
 * Save selected school to localStorage
 */
export function setSelectedSchool(schoolId) {
  try {
    localStorage.setItem(STORAGE_KEYS.SELECTED_SCHOOL, schoolId)
    return true
  } catch (error) {
    console.error('Error setting selected school:', error)
    return false
  }
}

/**
 * Get selected school from localStorage
 */
export function getSelectedSchool() {
  try {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_SCHOOL)
  } catch (error) {
    console.error('Error getting selected school:', error)
    return null
  }
}

/**
 * Clear selected school from localStorage
 */
export function clearSelectedSchool() {
  try {
    localStorage.removeItem(STORAGE_KEYS.SELECTED_SCHOOL)
    return true
  } catch (error) {
    console.error('Error clearing selected school:', error)
    return false
  }
}

/**
 * Check if a school is currently selected
 */
export function hasSelectedSchool() {
  return !!getSelectedSchool()
}

export const schoolService = {
  getSchools,
  getClosestSchools,
  getSchoolById,
  setSelectedSchool,
  getSelectedSchool,
  clearSelectedSchool,
  hasSelectedSchool
} 
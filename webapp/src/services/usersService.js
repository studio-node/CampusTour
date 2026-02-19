import { supabase } from '../supabase.js'

/**
 * Users Service
 * Handles profile/user data for the admin User Management tab.
 * All operations are scoped by school_id (admin's school).
 */

/**
 * Fetch all users for a given school with email and last_sign_in_at from auth.users.
 * Uses RPC get_school_users_with_auth (joins profiles + auth.users).
 * @param {string} schoolId - UUID of the school
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getSchoolUsers(schoolId) {
  try {
    if (!schoolId) {
      return { success: false, error: 'School ID is required' }
    }

    const { data, error } = await supabase.rpc('get_school_users_with_auth', {
      p_school_id: schoolId
    })

    if (error) {
      console.error('Error fetching school users:', error)
      return { success: false, error: error.message, data: [] }
    }

    return { success: true, data: data || [] }
  } catch (err) {
    console.error('Error in getSchoolUsers:', err)
    return { success: false, error: err?.message || 'Failed to fetch users', data: [] }
  }
}

/**
 * Update a user's profile (full_name, email, role, is_active).
 * Uses RPC so same-school admin check is enforced in the DB; avoids RLS update policy issues.
 * @param {string} userId - Profile id (auth user id)
 * @param {{ full_name?: string, email?: string, role?: string, is_active?: boolean }} updates
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateProfile(userId, updates) {
  try {
    if (!userId) return { success: false, error: 'User ID is required' }

    const { data, error } = await supabase.rpc('update_school_user_profile', {
      p_target_id: userId,
      p_full_name: updates.full_name ?? undefined,
      p_email: updates.email ?? undefined,
      p_role: updates.role ?? undefined,
      p_is_active: updates.is_active ?? undefined
    })

    if (error) {
      console.error('Error updating profile:', error)
      return { success: false, error: error.message }
    }

    const result = data
    if (result && typeof result === 'object' && result.ok === false && result.error) {
      return { success: false, error: result.error }
    }
    if (result && typeof result === 'object' && result.ok === true) {
      return { success: true }
    }
    return { success: false, error: 'Update failed.' }
  } catch (err) {
    console.error('Error in updateProfile:', err)
    return { success: false, error: err?.message || 'Failed to update user' }
  }
}

/**
 * Deactivate a user (set is_active to false).
 * @param {string} userId - Profile id
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deactivateUser(userId) {
  return updateProfile(userId, { is_active: false })
}

/**
 * Reactivate a user (set is_active to true).
 * @param {string} userId - Profile id
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function reactivateUser(userId) {
  return updateProfile(userId, { is_active: true })
}

/**
 * Generate a random 6-digit PIN for user creation.
 * @returns {string} 6-digit PIN
 */
export function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Create a partial user (auth.users + profiles) with a creation_token PIN.
 * Uses Edge Function with Admin API to create user properly.
 * Admin must be in the same school. Email uniqueness enforced.
 * @param {{ email: string, full_name: string, role: string, creation_token: string }}
 * @returns {Promise<{success: boolean, error?: string, data?: { user_id: string }}>}
 */
export async function createPartialUser({ email, full_name, role, creation_token }) {
  try {
    if (!email || !full_name || !role || !creation_token) {
      return { success: false, error: 'All fields are required.' }
    }

    const { data, error } = await supabase.functions.invoke('create_partial_user', {
      body: {
        email: email.trim(),
        full_name: full_name.trim(),
        role: role,
        creation_token: creation_token
      }
    })

    if (error) {
      console.error('Error creating partial user:', error)
      return { success: false, error: error.message }
    }

    const result = data
    if (result && typeof result === 'object' && result.ok === false && result.error) {
      return { success: false, error: result.error }
    }
    if (result && typeof result === 'object' && result.ok === true) {
      return { success: true, data: { user_id: result.user_id } }
    }
    return { success: false, error: 'User creation failed.' }
  } catch (err) {
    console.error('Error in createPartialUser:', err)
    return { success: false, error: err?.message || 'Failed to create user' }
  }
}

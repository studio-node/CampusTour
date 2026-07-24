import { supabase } from '../supabase.js'

/**
 * Permanently deletes the currently signed-in user's own account (auth user + profile).
 * Any tour appointments assigned to them are unassigned rather than deleted, so the
 * school's scheduling records are preserved.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteOwnAccount() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return { success: false, error: 'You must be signed in to delete your account.' }
    }

    const { data, error } = await supabase.functions.invoke('delete_own_account', {
      body: {},
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })

    if (error) {
      // FunctionsHttpError exposes the raw Response on `.context` — read it for the
      // real message (ours, or the gateway's) instead of the generic wrapper text.
      let message = error.message
      if (error.context && typeof error.context.json === 'function') {
        try {
          const body = await error.context.json()
          if (body?.error) message = body.error
        } catch {
          // response body wasn't JSON — fall back to error.message
        }
      }
      console.error('Error deleting account:', message)
      return { success: false, error: message }
    }

    const result = data
    if (result && typeof result === 'object' && result.ok === false && result.error) {
      return { success: false, error: result.error }
    }
    if (result && typeof result === 'object' && result.ok === true) {
      return { success: true }
    }
    return { success: false, error: 'Account deletion failed.' }
  } catch (err) {
    console.error('Error in deleteOwnAccount:', err)
    return { success: false, error: err?.message || 'Failed to delete account' }
  }
}

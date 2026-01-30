import { supabase } from '../supabase.js'

const BUCKET = 'media'

/**
 * Get all media for a location
 * @param {string} locationId
 * @returns {Promise<Array>}
 */
export async function getMediaByLocation(locationId) {
  try {
    const { data, error } = await supabase
      .from('location_media')
      .select('id, location_id, stored_in_supabase, media_type, url, created_at')
      .eq('location_id', locationId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching location media:', error)
    return []
  }
}

/**
 * Get all cover photos for a school's locations
 * @param {string[]} locationIds
 * @returns {Promise<Array>}
 */
export async function getCoverPhotosByLocationIds(locationIds) {
  try {
    const { data, error } = await supabase
      .from('location_media')
      .select('id, location_id, stored_in_supabase, media_type, url, created_at')
      .in('location_id', locationIds)
      .eq('media_type', 'primaryImage')
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching location media by location IDs:', error)
    return []
  }
}

/**
 * Add media via URL (admin or builder)
 * @param {string} locationId
 * @param {Object} options
 * @param {string} options.mediaType - 'primaryImage' or 'additional'
 * @param {string} options.url - Public URL
 * @param {boolean} options.storedInSupabase - false for external URLs
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function addMediaByUrl(locationId, { mediaType, url, storedInSupabase = false }) {
  try {
    const { data, error } = await supabase
      .from('location_media')
      .insert({
        location_id: locationId,
        stored_in_supabase: storedInSupabase,
        media_type: mediaType,
        url: url.trim()
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error adding media by URL:', error)
    return { success: false, error: error.message || 'Failed to add media' }
  }
}

/**
 * Upload file to storage and add location_media row (admin only)
 * @param {string} locationId
 * @param {File} file
 * @param {Object} options - { mediaType: 'primaryImage' | 'additional' }
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function uploadMedia(locationId, file, { mediaType = 'additional' } = {}) {
  try {
    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `${crypto.randomUUID()}.${ext}`
    const path = `${locationId}/${filename}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    const { data, error } = await supabase
      .from('location_media')
      .insert({
        location_id: locationId,
        stored_in_supabase: true,
        media_type: mediaType,
        url: publicUrl
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error uploading media:', error)
    return { success: false, error: error.message || 'Failed to upload media' }
  }
}

/**
 * Delete media (admin only - direct supabase)
 * @param {string} mediaId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteMedia(mediaId) {
  try {
    const { data: media } = await supabase
      .from('location_media')
      .select('id, url, stored_in_supabase')
      .eq('id', mediaId)
      .single()

    if (!media) {
      return { success: false, error: 'Media not found' }
    }

    const { error: delErr } = await supabase
      .from('location_media')
      .delete()
      .eq('id', mediaId)

    if (delErr) throw delErr

    if (media.stored_in_supabase && media.url) {
      const pathMatch = media.url.match(/\/storage\/v1\/object\/public\/media\/(.+)$/)
      if (pathMatch) {
        await supabase.storage.from(BUCKET).remove([pathMatch[1]])
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting media:', error)
    return { success: false, error: error.message || 'Failed to delete media' }
  }
}

/**
 * Set primary image (demote current primary, promote new one)
 * @param {string} locationId
 * @param {string} mediaId - ID of media to set as primary
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function setPrimaryImage(locationId, mediaId) {
  try {
    const { data: allMedia } = await supabase
      .from('location_media')
      .select('id, media_type')
      .eq('location_id', locationId)

    const updates = []
    for (const m of allMedia || []) {
      updates.push(
        supabase
          .from('location_media')
          .update({ media_type: m.id === mediaId ? 'primaryImage' : 'additional' })
          .eq('id', m.id)
      )
    }
    await Promise.all(updates)
    return { success: true }
  } catch (error) {
    console.error('Error setting primary image:', error)
    return { success: false, error: error.message || 'Failed to set primary image' }
  }
}

// --- Builder (passcode-gated) ---

/**
 * Add media by URL as builder (no auth)
 * @param {string} locationId
 * @param {string} passcode
 * @param {Object} options - { mediaType, url }
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function addMediaByUrlAsBuilder(locationId, passcode, { mediaType, url }) {
  try {
    const { data, error } = await supabase.functions.invoke('manage_location_media_as_builder', {
      body: { action: 'add_url', location_id: locationId, passcode, media_type: mediaType, url: url?.trim() }
    })

    if (error) return { success: false, error: error.message || 'Failed to add media' }
    if (data?.error) return { success: false, error: data.error }
    return { success: true, data: data?.data ?? data }
  } catch (error) {
    console.error('Error adding media as builder:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Upload media as builder (passcode-gated, uses Edge Function)
 * Uses fetch directly for FormData support.
 * @param {string} locationId
 * @param {string} passcode
 * @param {File} file
 * @param {string} mediaType - 'primaryImage' or 'additional'
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function uploadMediaAsBuilder(locationId, passcode, file, mediaType) {
  try {
    const formData = new FormData()
    formData.append('location_id', locationId)
    formData.append('passcode', passcode)
    formData.append('media_type', mediaType)
    formData.append('file', file)

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage_location_media_as_builder`
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      body: formData
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { success: false, error: data.error || 'Upload failed' }
    }
    if (data.error) return { success: false, error: data.error }
    return { success: true, data: data.data ?? data }
  } catch (error) {
    console.error('Error uploading media as builder:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Delete media as builder (passcode-gated)
 * @param {string} locationId
 * @param {string} passcode
 * @param {string} mediaId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteMediaAsBuilder(locationId, passcode, mediaId) {
  try {
    const { data, error } = await supabase.functions.invoke('manage_location_media_as_builder', {
      body: { action: 'delete', location_id: locationId, passcode, media_id: mediaId }
    })

    if (error) return { success: false, error: error.message || 'Failed to delete media' }
    if (data?.error) return { success: false, error: data.error }
    return { success: true }
  } catch (error) {
    console.error('Error deleting media as builder:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export const locationMediaService = {
  getMediaByLocation,
  addMediaByUrl,
  uploadMedia,
  deleteMedia,
  setPrimaryImage,
  addMediaByUrlAsBuilder,
  uploadMediaAsBuilder,
  deleteMediaAsBuilder,
  getCoverPhotosByLocationIds
}

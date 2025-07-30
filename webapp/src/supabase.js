import { createClient } from '@supabase/supabase-js'
// import { supabaseUrl, supabaseAnonKey } from './supa.js'

// Create and export the Supabase client
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)

// Export individual functions for convenience
export const {
  from,
  select,
  insert,
  update,
  delete: deleteFrom,
  rpc
} = supabase

// Helper function for analytics events queries
export const getAnalyticsEvents = () => supabase.from('analytics_events')

// Helper function for locations queries  
export const getLocations = () => supabase.from('locations')

// Helper function for schools queries
export const getSchools = () => supabase.from('schools') 
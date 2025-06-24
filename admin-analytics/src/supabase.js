import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = 'https://xtntfkpwowsmzfgtjqxe.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0bnRma3B3b3dzbXpmZ3RqcXhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzODM2MjYsImV4cCI6MjA2Mzk1OTYyNn0.SiTNU_aOs5dyLLig6sbgCNlo3pjWw1j3DBl5DjS6RVM'

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
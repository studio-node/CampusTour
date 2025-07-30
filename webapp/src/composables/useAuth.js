import { ref, readonly, computed } from 'vue'
import { supabase } from '../supabase.js'

// Global auth state - shared across all components
const user = ref(null)
const loading = ref(true)
const isAuthenticated = ref(false)

let authSubscription = null
let isInitialized = false

export function useAuth() {
  
  // Initialize auth state listener (only once)
  const initAuth = async () => {
    if (isInitialized) return // Already initialized
    
    try {
      // Get initial session
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      
      if (session?.user) {
        user.value = session.user
        isAuthenticated.value = true
      }
      loading.value = false
      
      // Listen to auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user?.email || 'No user')
        
        if (session?.user) {
          user.value = session.user
          isAuthenticated.value = true
        } else {
          user.value = null
          isAuthenticated.value = false
        }
        loading.value = false
      })
      
      authSubscription = subscription
      isInitialized = true
      
    } catch (error) {
      console.error('Error initializing auth:', error)
      loading.value = false
    }
  }
  
  // Sign out function
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // State will be automatically updated by the auth listener
      return true
    } catch (error) {
      console.error('Error signing out:', error)
      return false
    }
  }
  
  // Get user profile/role data (if stored in a separate table)
  const getUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles') // Assuming you have a profiles table
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }
      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }
  
  // Computed values for convenience
  const userDisplayName = computed(() => {
    return user.value?.user_metadata?.name || user.value?.email || 'User'
  })
  
  const userRole = computed(() => {
    return user.value?.user_metadata?.role || 'user'
  })
  
  const userEmail = computed(() => {
    return user.value?.email || ''
  })
  
  return {
    // State
    user: readonly(user),
    loading: readonly(loading),
    isAuthenticated: readonly(isAuthenticated),
    
    // Computed values
    userDisplayName,
    userRole,
    userEmail,
    
    // Methods  
    initAuth,
    signOut,
    getUserProfile
  }
}

// Cleanup function for when the app unmounts
export function cleanupAuth() {
  if (authSubscription) {
    authSubscription.unsubscribe()
    authSubscription = null
    isInitialized = false
  }
}
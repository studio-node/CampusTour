<script setup>
import { ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { signIn } from '../services/authHandler'
import { useAuth } from '../composables/useAuth.js'
import { supabase } from '../supabase.js'

const router = useRouter()
const { isAuthenticated, loading: authLoading } = useAuth()

// State
const isSignUp = ref(false)
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

// PIN-based sign-up state
const pin = ref('')
const pinValidated = ref(false)
const validatingPin = ref(false)
const userInfo = ref(null) // Stores email, full_name, role from profile when PIN is validated

// Toggle between sign in and sign up
const toggleMode = () => {
  isSignUp.value = !isSignUp.value
  error.value = ''
  // Clear form
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
  pin.value = ''
  pinValidated.value = false
  userInfo.value = null
}

// Validate PIN and unlock password fields
const validatePin = async () => {
  if (!pin.value || pin.value.length !== 6) {
    error.value = 'Please enter a 6-digit PIN.'
    return
  }
  validatingPin.value = true
  error.value = ''
  try {
    // Use RPC to validate PIN (bypasses RLS for anonymous users)
    const { data, error: rpcError } = await supabase.rpc('validate_pin', {
      p_creation_token: pin.value
    })

    if (rpcError || !data || (typeof data === 'object' && data.ok === false)) {
      error.value = rpcError?.message || data?.error || 'Invalid PIN. Please check and try again.'
      return
    }

    // PIN is valid - unlock password fields
    userInfo.value = {
      email: data.email,
      full_name: data.full_name,
      role: data.role
    }
    email.value = data.email || ''
    pinValidated.value = true
    error.value = ''
  } catch (err) {
    error.value = 'Failed to validate PIN. Please try again.'
    console.error('PIN validation error:', err)
  } finally {
    validatingPin.value = false
  }
}


// Handle form submission
const handleSubmit = async () => {
  error.value = ''
  
  // PIN-based sign-up flow
  if (isSignUp.value && !pinValidated.value) {
    await validatePin()
    return
  }
  
  // Basic validation
  if (!email.value || !password.value) {
    error.value = 'Please fill in all required fields'
    return
  }
  
  if (isSignUp.value && password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }
  
  loading.value = true
  
  try {
    let data
    if (isSignUp.value && pinValidated.value) {
      // PIN-based sign-up: use RPC to set password
      const { data: rpcData, error: rpcError } = await supabase.rpc('signup_with_pin', {
        p_creation_token: pin.value,
        p_password: password.value
      })

      if (rpcError || !rpcData || (typeof rpcData === 'object' && rpcData.ok === false)) {
        error.value = rpcError?.message || rpcData?.error || 'Sign-up failed. Please try again.'
        return
      }

      // Sign in with the new credentials
      data = await signIn(email.value, password.value)
    } else {
      // Sign in
      data = await signIn(email.value, password.value)
    }
     
    if (data) { 
      // Redirect to admin dashboard - auth state will be handled by useAuth composable
      router.push('/admin')
    } else {
      error.value = 'Authentication failed. Please try again.'
    }
    
  } catch (err) {
    error.value = 'Authentication failed. Please try again.'
    console.error('Auth error:', err)
  } finally {
    loading.value = false
  }
}

// Go back to landing page
const goBack = () => {
  router.push('/')
}

// Redirect to admin if already authenticated
watchEffect(() => {
  if (!authLoading.value && isAuthenticated.value) {
    router.push('/admin')
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-900 flex flex-col">
    <!-- Header with back button -->
    <header class="bg-gray-800 shadow-sm border-b border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <button 
            @click="goBack"
            class="flex items-center text-gray-300 hover:text-white transition-colors duration-200"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 class="text-xl font-bold text-white">Campus Tour Admin</h1>
          <div></div> <!-- Spacer for centering -->
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full">
        <!-- Admin Access Card -->
        <div class="bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-8 mt-8">
          <!-- Header -->
          <div class="text-center mb-8">
            <div class="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-white mb-2">
              {{ isSignUp ? 'Create Account' : 'Admin Sign In' }}
            </h2>
            <p class="text-gray-400">
              {{ isSignUp ? 'Enter your PIN to complete account setup' : 'Access your administrative dashboard' }}
            </p>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="mb-6 bg-red-900 bg-opacity-50 border border-red-500 rounded-lg p-4">
            <p class="text-red-200 text-sm">{{ error }}</p>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSubmit" class="space-y-6">
            <!-- PIN field (only for PIN-based sign up) -->
            <div v-if="isSignUp && !pinValidated">
              <label for="pin" class="block text-sm font-medium text-gray-300 mb-2">
                Enter Your PIN *
              </label>
              <div class="flex gap-2">
                <input
                  id="pin"
                  v-model="pin"
                  type="text"
                  maxlength="6"
                  pattern="[0-9]{6}"
                  required
                  class="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
                  placeholder="000000"
                />
                <button
                  type="button"
                  @click="validatePin"
                  :disabled="validatingPin || pin.length !== 6"
                  class="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ validatingPin ? 'Validating...' : 'Validate' }}
                </button>
              </div>
              <p class="text-xs text-gray-400 mt-2">Enter the 6-digit PIN provided by your administrator</p>
            </div>

            <!-- User info display (after PIN validated) -->
            <div v-if="isSignUp && pinValidated && userInfo" class="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-4">
              <p class="text-green-200 text-sm mb-1"><strong>Email:</strong> {{ userInfo.email }}</p>
              <p class="text-green-200 text-sm mb-1"><strong>Name:</strong> {{ userInfo.full_name }}</p>
              <p class="text-green-200 text-sm"><strong>Role:</strong> {{ userInfo.role }}</p>
            </div>

            <!-- Email field (only shown for sign-in, hidden when PIN validated since it's in user info) -->
            <div v-if="!isSignUp || !pinValidated">
              <label for="email" class="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                v-model="email"
                type="email"
                required
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <!-- Password field (only shown if PIN validated or sign-in) -->
            <div v-if="!isSignUp || pinValidated">
              <label for="password" class="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                v-model="password"
                type="password"
                required
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                :placeholder="isSignUp ? 'Create your password' : 'Enter your password'"
              />
            </div>

            <!-- Confirm Password field (only for sign up after PIN validated) -->
            <div v-if="isSignUp && pinValidated">
              <label for="confirmPassword" class="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                type="password"
                required
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Confirm your password"
              />
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="loading || validatingPin || (isSignUp && !pinValidated && pin.length !== 6)"
              class="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="loading" class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isSignUp && pinValidated ? 'Creating Account...' : isSignUp ? 'Validating PIN...' : 'Signing In...' }}
              </span>
              <span v-else>
                {{ isSignUp && pinValidated ? 'Create Account' : isSignUp ? 'Validate PIN' : 'Sign In' }}
              </span>
            </button>
          </form>

          <!-- Toggle Mode -->
          <div class="mt-6 text-center">
            <p class="text-gray-400 text-sm">
              {{ isSignUp ? 'Already have an account?' : "Don't have an account?" }}
              <button 
                @click="toggleMode"
                class="text-green-400 hover:text-green-300 font-medium ml-1"
              >
                {{ isSignUp ? 'Sign In' : 'Sign Up' }}
              </button>
            </p>
          </div>
        </div>

        <!-- Help Text -->
        <div class="mt-6 text-center">
          <p class="text-gray-500 text-sm">
            For admin access issues, contact your system administrator
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style> 
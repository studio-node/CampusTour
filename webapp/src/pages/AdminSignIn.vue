<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// State
const isSignUp = ref(false)
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const name = ref('')
const loading = ref(false)
const error = ref('')

// Toggle between sign in and sign up
const toggleMode = () => {
  isSignUp.value = !isSignUp.value
  error.value = ''
  // Clear form
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
  name.value = ''
}

// Handle form submission
const handleSubmit = async () => {
  error.value = ''
  
  // Basic validation
  if (!email.value || !password.value) {
    error.value = 'Please fill in all required fields'
    return
  }
  
  if (isSignUp.value && password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }
  
  if (isSignUp.value && !name.value) {
    error.value = 'Name is required for sign up'
    return
  }
  
  loading.value = true
  
  try {
    // TODO: Implement actual authentication logic
    console.log(isSignUp.value ? 'Signing up...' : 'Signing in...', {
      email: email.value,
      password: password.value,
      name: name.value
    })
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // For now, just redirect to admin dashboard
    router.push('/admin')
    
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
              {{ isSignUp ? 'Create Admin Account' : 'Admin Sign In' }}
            </h2>
            <p class="text-gray-400">
              {{ isSignUp ? 'Set up your administrative account' : 'Access your administrative dashboard' }}
            </p>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="mb-6 bg-red-900 bg-opacity-50 border border-red-500 rounded-lg p-4">
            <p class="text-red-200 text-sm">{{ error }}</p>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSubmit" class="space-y-6">
            <!-- Name field (only for sign up) -->
            <div v-if="isSignUp">
              <label for="name" class="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <input
                id="name"
                v-model="name"
                type="text"
                required
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            <!-- Email field -->
            <div>
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

            <!-- Password field -->
            <div>
              <label for="password" class="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                v-model="password"
                type="password"
                required
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>

            <!-- Confirm Password field (only for sign up) -->
            <div v-if="isSignUp">
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
              :disabled="loading"
              class="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="loading" class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isSignUp ? 'Creating Account...' : 'Signing In...' }}
              </span>
              <span v-else>
                {{ isSignUp ? 'Create Account' : 'Sign In' }}
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
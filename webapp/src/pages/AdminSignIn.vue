<script setup>
import { ref, onMounted, computed, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { signIn, signUp } from '../services/authHandler'
import { schoolService } from '../services/schoolService.js'
import { useAuth } from '../composables/useAuth.js'

const router = useRouter()
const { isAuthenticated, loading: authLoading } = useAuth()

// State
const isSignUp = ref(false)
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const name = ref('')
const selectedRole = ref('')
const selectedSchool = ref('')
const selectedSchoolData = ref(null)
const schools = ref([])
const schoolsLoading = ref(false)
const schoolSearchQuery = ref('')
const loading = ref(false)
const error = ref('')

// Load schools on mount
onMounted(async () => {
  await loadSchools()
})

// Load schools from API
const loadSchools = async () => {
  schoolsLoading.value = true
  try {
    const schoolsData = await schoolService.getSchools()
    schools.value = schoolsData
  } catch (err) {
    console.error('Error loading schools:', err)
  } finally {
    schoolsLoading.value = false
  }
}

// Toggle between sign in and sign up
const toggleMode = () => {
  isSignUp.value = !isSignUp.value
  error.value = ''
  // Clear form
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
  name.value = ''
  selectedRole.value = ''
  selectedSchool.value = ''
  selectedSchoolData.value = null
  schoolSearchQuery.value = ''
}

// Handle role selection
const selectRole = (role) => {
  selectedRole.value = role
}

// Handle school selection
const selectSchool = (school) => {
  selectedSchool.value = school.id
  selectedSchoolData.value = school
}

// Computed property for filtered schools
const filteredSchools = computed(() => {
  if (schoolSearchQuery.value.trim() === '') {
    // Show top 5 schools when no search query
    return schools.value.slice(0, 5)
  } else {
    // Filter schools based on search query
    const query = schoolSearchQuery.value.toLowerCase().trim()
    return schools.value.filter(school => 
      school.name.toLowerCase().includes(query) ||
      school.city.toLowerCase().includes(query) ||
      school.state.toLowerCase().includes(query)
    ).slice(0, 8) // Limit to 8 results
  }
})

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
  
  if (isSignUp.value && !selectedRole.value) {
    error.value = 'Please select a role (Admin, Builder, or Ambassador)'
    return
  }
  
  if (isSignUp.value && !selectedSchool.value) {
    error.value = 'Please select a school'
    return
  }
  
  loading.value = true
  
  try {
    // TODO: Implement actual authentication logic
    console.log(isSignUp.value ? 'Signing up...' : 'Signing in...', {
      email: email.value,
      password: password.value,
      name: name.value,
      role: selectedRole.value,
      school: selectedSchool.value
    })
    
         let data;
     if (isSignUp.value) {
       data = await signUp(email.value, password.value, name.value, selectedRole.value, selectedSchool.value)
     } else {
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

            <!-- Role Selection (only for sign up) -->
            <div v-if="isSignUp">
              <label class="block text-sm font-medium text-gray-300 mb-3">
                Select Your Role *
              </label>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  @click="selectRole('admin')"
                  :class="[
                    'p-4 rounded-lg border-2 transition-all duration-200 text-center',
                    selectedRole === 'admin'
                      ? 'bg-green-600 border-green-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-600'
                  ]"
                >
                  <div class="flex flex-col items-center">
                    <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span class="font-semibold">Admin</span>
                    <span class="text-xs mt-1 opacity-75">Full system access</span>
                  </div>
                </button>
                
                <button
                  type="button"
                  @click="selectRole('builder')"
                  :class="[
                    'p-4 rounded-lg border-2 transition-all duration-200 text-center',
                    selectedRole === 'builder'
                      ? 'bg-green-600 border-green-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-600'
                  ]"
                >
                  <div class="flex flex-col items-center">
                    <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    <span class="font-semibold">Builder</span>
                    <span class="text-xs mt-1 opacity-75">Content management</span>
                  </div>
                </button>

                <button
                  type="button"
                  @click="selectRole('ambassador')"
                  :class="[
                    'p-4 rounded-lg border-2 transition-all duration-200 text-center',
                    selectedRole === 'ambassador'
                      ? 'bg-green-600 border-green-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-600'
                  ]"
                >
                  <div class="flex flex-col items-center">
                    <svg class="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                    </svg>
                    <span class="font-semibold">Ambassador</span>
                    <span class="text-xs mt-1 opacity-75">Tour leadership</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- School Selection (only for sign up) -->
            <div v-if="isSignUp">
              <label class="block text-sm font-medium text-gray-300 mb-3">
                Select Your School *
              </label>
              
              <!-- Selected School Display -->
              <div v-if="selectedSchoolData" class="mb-3 p-3 bg-green-600 rounded-lg border border-green-500">
                <div class="flex items-center">
                  <div v-if="selectedSchoolData.logo_url" class="mr-3">
                    <img 
                      :src="selectedSchoolData.logo_url" 
                      :alt="selectedSchoolData.name"
                      class="w-8 h-8 object-contain rounded"
                    />
                  </div>
                  <div class="flex-1">
                    <p class="font-semibold text-white text-sm">{{ selectedSchoolData.name }}</p>
                    <p class="text-green-200 text-xs">{{ selectedSchoolData.city }}, {{ selectedSchoolData.state }}</p>
                  </div>
                  <button 
                    type="button"
                    @click="selectedSchool = ''; selectedSchoolData = null"
                    class="text-green-200 hover:text-white"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- School Search and Selection -->
              <div v-if="!selectedSchoolData">
                <!-- Search Input -->
                <div class="mb-3">
                  <input
                    v-model="schoolSearchQuery"
                    type="text"
                    placeholder="Search schools by name, city, or state..."
                    class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  />
                </div>

                <!-- Schools List -->
                <div class="max-h-40 overflow-y-auto border border-gray-600 rounded-lg bg-gray-700">
                  <div v-if="schoolsLoading" class="p-4 text-center text-gray-400 text-sm">
                    Loading schools...
                  </div>
                  
                  <div v-else-if="filteredSchools.length === 0" class="p-4 text-center text-gray-400 text-sm">
                    No schools found. Try a different search term.
                  </div>
                  
                  <button
                    v-else
                    v-for="school in filteredSchools"
                    :key="school.id"
                    type="button"
                    @click="selectSchool(school)"
                    class="w-full p-3 text-left hover:bg-gray-600 transition-colors duration-200 border-b border-gray-600 last:border-b-0"
                  >
                    <div class="flex items-center">
                      <div v-if="school.logo_url" class="mr-3 flex-shrink-0">
                        <img 
                          :src="school.logo_url" 
                          :alt="school.name"
                          class="w-6 h-6 object-contain rounded"
                        />
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="font-medium text-white text-sm truncate">{{ school.name }}</p>
                        <p class="text-gray-400 text-xs">{{ school.city }}, {{ school.state }}</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
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
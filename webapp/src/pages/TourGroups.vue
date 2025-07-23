<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { schoolService } from '../services/schoolService.js'
import { tourAppointmentsService } from '../services/tourAppointmentsService.js'

const router = useRouter()

// State
const schoolId = ref(null)
const schoolData = ref(null)
const tourGroups = ref([])
const selectedTourGroup = ref(null)
const loading = ref(true)
const error = ref('')
const success = ref('')

// Storage keys
const SELECTED_TOUR_GROUP_KEY = 'selectedTourGroup'

// Load data on mount
onMounted(async () => {
  await loadTourGroups()
})

// Load available tour groups
const loadTourGroups = async () => {
  loading.value = true
  error.value = ''
  
  try {
    // Get selected school
    const selectedSchoolId = schoolService.getSelectedSchool()
    if (!selectedSchoolId) {
      error.value = 'No school selected. Please select a school first.'
      router.replace('/select-school')
      return
    }
    
    schoolId.value = selectedSchoolId
    
    // Get school details
    const school = await schoolService.getSchoolById(selectedSchoolId)
    schoolData.value = school
    
    // Get available tour groups
    const groups = await tourAppointmentsService.getAvailableTourGroups(selectedSchoolId)
    tourGroups.value = groups
    
    // Check if there's a previously selected tour group
    const savedTourGroupId = localStorage.getItem(SELECTED_TOUR_GROUP_KEY)
    if (savedTourGroupId) {
      const savedTourGroup = groups.find(group => group.id === savedTourGroupId)
      if (savedTourGroup) {
        // Add formatted date/time data to the saved tour group
        const formattedDateTime = tourAppointmentsService.formatTourDateTime(savedTourGroup.scheduled_date)
        const tourGroupWithFormatting = {
          ...savedTourGroup,
          formattedDateTime
        }
        selectedTourGroup.value = tourGroupWithFormatting
        // Only save the ID to localStorage, don't overwrite the formatted data
        localStorage.setItem(SELECTED_TOUR_GROUP_KEY, savedTourGroup.id)
      }
    }
    
  } catch (err) {
    error.value = 'Failed to load tour groups. Please try again.'
    console.error('Error loading tour groups:', err)
  } finally {
    loading.value = false
  }
}

// Handle tour group selection
const selectTourGroup = (tourGroup) => {
  selectedTourGroup.value = tourGroup
  localStorage.setItem(SELECTED_TOUR_GROUP_KEY, tourGroup.id)
}

// Handle continue to information form
const handleContinue = () => {
  if (selectedTourGroup.value) {
    router.push({
      path: '/information',
      query: { tour_appointment_id: selectedTourGroup.value.id }
    })
  }
}



// Handle back navigation
const handleBack = () => {
  router.push('/select-school')
}

// Group tours by date
const toursByDate = computed(() => {
  const grouped = {}
  
  tourGroups.value.forEach(tour => {
    const dateTime = tourAppointmentsService.formatTourDateTime(tour.scheduled_date)
    const dateKey = dateTime.date
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }
    
    grouped[dateKey].push({
      ...tour,
      formattedDateTime: dateTime
    })
  })
  
  return grouped
})
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <!-- Back Button -->
    <div class="mb-6">
      <button 
        @click="handleBack"
        class="flex items-center text-gray-300 hover:text-white transition-colors duration-200"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
    </div>

    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">
        Available Tour Groups
      </h1>
      <p class="text-xl text-gray-300 mb-6">
        Join an ambassador-led tour group
      </p>
      
      <!-- Selected School Display -->
      <div v-if="schoolData" class="bg-gray-800 rounded-lg p-4 border border-gray-700 inline-flex items-center">
        <div v-if="schoolData.logo_url" class="mr-3">
          <img 
            :src="schoolData.logo_url" 
            :alt="schoolData.name"
            class="w-10 h-10 object-contain rounded"
          />
        </div>
        <div class="text-left">
          <p class="text-white font-medium">{{ schoolData.name }}</p>
          <p class="text-gray-400 text-sm">{{ schoolData.city }}, {{ schoolData.state }}</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
      <p class="text-gray-400">Loading available tour groups...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-900 bg-opacity-50 border border-red-500 rounded-lg p-6 mb-8">
      <p class="text-red-200">{{ error }}</p>
      <button 
        @click="loadTourGroups"
        class="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
      >
        Try Again
      </button>
    </div>

    <!-- Success Message -->
    <div v-if="success" class="bg-green-900 bg-opacity-50 border border-green-500 rounded-lg p-4 mb-6">
      <p class="text-green-200">{{ success }}</p>
    </div>

    <!-- Tour Groups Content -->
    <div v-else class="space-y-8">
      <!-- No Tours Available -->
      <div v-if="tourGroups.length === 0" class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-8 text-center">
        <div class="mb-6">
          <svg class="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 class="text-2xl font-bold text-white mb-4">
            No Tour Groups Available
          </h2>
          <p class="text-gray-400 mb-8">
            There are currently no scheduled ambassador-led tours for this school.
          </p>
        </div>
        
        <div class="space-y-4">
          <div class="text-center">
            <p class="text-gray-500 text-sm">
              Or contact the school to schedule an ambassador-led tour
            </p>
          </div>
        </div>
      </div>

      <!-- Available Tours -->
      <div v-else class="space-y-6">
        <!-- Tour Groups by Date -->
        <div v-for="(tours, date) in toursByDate" :key="date" class="space-y-4">
          <h3 class="text-xl font-bold text-white border-b border-gray-700 pb-2">
            {{ date }}
          </h3>
          
          <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="tour in tours"
              :key="tour.id"
              @click="selectTourGroup(tour)"
              :class="[
                'bg-gray-800 rounded-lg shadow-lg border-2 p-4 cursor-pointer transition-all duration-200 relative',
                selectedTourGroup?.id === tour.id
                  ? 'border-blue-500 bg-blue-900 bg-opacity-50'
                  : 'border-gray-700 hover:border-gray-600 hover:bg-gray-750'
              ]"
            >
              <!-- Selected indicator -->
              <div v-if="selectedTourGroup?.id === tour.id" class="absolute top-2 right-2 text-blue-400">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>

              <div class="space-y-3">
                <!-- Ambassador Name -->
                <div class="flex items-center">
                  <svg class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span class="text-white font-medium text-sm truncate">
                    {{ tour.profiles?.full_name || 'TBA' }}
                  </span>
                </div>

                <!-- Participants -->
                <div class="flex items-center">
                  <svg class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span class="text-gray-300 text-sm">
                    {{ tour.participants_signed_up }} / {{ tour.max_participants }}
                  </span>
                </div>

                <!-- Time and Date -->
                <div class="flex items-center">
                  <svg class="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span class="text-gray-300 text-sm">
                    {{ tour.formattedDateTime.time }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
          <div class="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div class="text-center sm:text-left">
              <div v-if="selectedTourGroup" class="text-white">
                <p class="font-medium">Selected: {{ selectedTourGroup.title }}</p>
                <p class="text-sm text-gray-400">{{ selectedTourGroup.formattedDateTime?.date }} at {{ selectedTourGroup.formattedDateTime?.time }}</p>
              </div>
              <div v-else class="text-gray-400">
                <p>Select a tour group above to continue</p>
              </div>
            </div>
            
            <div class="flex flex-col sm:flex-row gap-3">
              <button
                @click="handleContinue"
                :disabled="!selectedTourGroup"
                :class="[
                  'px-8 py-3 rounded-lg font-medium transition-all duration-200',
                  selectedTourGroup
                    ? 'bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                ]"
              >
                Continue with Selected Tour
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style> 
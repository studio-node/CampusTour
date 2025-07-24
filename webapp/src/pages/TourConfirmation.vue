<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { schoolService } from '../services/schoolService.js'
import { tourAppointmentsService } from '../services/tourAppointmentsService.js'

const route = useRoute()
const tourAppointmentId = ref(null)
const schoolId = ref(null)
const selectedInterests = ref([])
const schoolData = ref(null)
const tourData = ref(null)
const loading = ref(true)
const error = ref('')

// Interest mapping for display
const interestNames = {
  "science_and_labs": "🔬 Science & Labs",
  "engineering": "⚙️ Engineering", 
  "business": "💼 Business",
  "computing": "💻 Computing",
  "arts_and_theater": "🎭 Arts & Theater",
  "music": "🎶 Music",
  "athletics": "🏟️ Athletics",
  "recreation_and_fitness": "🏋️ Recreation & Fitness",
  "dorm-life": "🛏️ Dorm Life",
  "campus-dining": "🍔 Campus Dining",
  "clubs": "🧑‍🤝‍🧑 Student Clubs",
  "library_and_study-spaces": "📚 Library & Study Spaces",
  "nature_and_outdoor-spots": "🌳 Nature & Outdoor Spots",
  "history_and_landmarks": "🏰 History & Landmarks",
  "health_and_wellness": "🩺 Health & Wellness",
  "faith_and_spirituality": "✝️ Faith & Spirituality",
  "community": "🤝 Community",
  "career-services": "🎓 Career Services"
}

onMounted(async () => {
  try {
    // Get data from query parameters
    tourAppointmentId.value = route.query.tour_appointment_id || null
    schoolId.value = schoolService.getSelectedSchool()
    
    // Parse selected interests from query parameter
    if (route.query.interests) {
      selectedInterests.value = route.query.interests.split(',')
    }

    if (!schoolId.value) {
      error.value = 'School information not found'
      return
    }

    // Fetch school details
    const school = await schoolService.getSchoolById(schoolId.value)
    schoolData.value = school

    // Fetch tour appointment details if available
    if (tourAppointmentId.value) {
      const appointment = await tourAppointmentsService.getTourAppointmentById(tourAppointmentId.value)
      tourData.value = appointment
    }

  } catch (err) {
    console.error('Error loading confirmation data:', err)
    error.value = 'Failed to load tour details'
  } finally {
    loading.value = false
  }
})

// Format date for display
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

// Format time for display
const formatTime = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p class="text-gray-300">Loading tour details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <div class="bg-red-900 border border-red-700 rounded-lg p-6">
        <h2 class="text-xl font-bold text-red-300 mb-2">Error</h2>
        <p class="text-red-200">{{ error }}</p>
      </div>
    </div>

    <!-- Success State -->
    <div v-else class="space-y-8">
      <!-- Header -->
      <div class="text-center">
        <div class="mb-6">
          <div class="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">
            Thank you for scheduling your tour!
          </h1>
          <p class="text-xl text-gray-300">
            We're excited to show you around {{ schoolData?.name }}
          </p>
        </div>
      </div>

      <!-- Tour Details Card -->
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-8">
        <h2 class="text-2xl font-bold text-white mb-6 flex items-center">
          <svg class="w-6 h-6 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          Your Tour Details
        </h2>

        <div class="grid md:grid-cols-2 gap-8">
          <!-- School & Tour Info -->
          <div class="space-y-4">
            <div>
              <h3 class="text-lg font-semibold text-blue-300 mb-2">School</h3>
              <p class="text-white text-lg">{{ schoolData?.name }}</p>
              <p class="text-gray-300">{{ schoolData?.city }}, {{ schoolData?.state }}</p>
            </div>

                         <div v-if="tourData">
               <h3 class="text-lg font-semibold text-blue-300 mb-2">Tour Type</h3>
               <p class="text-white">Ambassador-Led Tour</p>
               <p class="text-gray-300">Guided by {{ tourData.profiles?.full_name || 'Campus Ambassador' }}</p>
             </div>

            <div v-else>
              <h3 class="text-lg font-semibold text-blue-300 mb-2">Tour Type</h3>
              <p class="text-white">Self-Guided Tour</p>
              <p class="text-gray-300">Explore at your own pace with our mobile app</p>
            </div>
          </div>

          <!-- Date & Time -->
          <div class="space-y-4">
            <div v-if="tourData">
              <h3 class="text-lg font-semibold text-blue-300 mb-2">Date & Time</h3>
              <p class="text-white text-lg">{{ formatDate(tourData.scheduled_date) }}</p>
              <p class="text-gray-300">{{ formatTime(tourData.scheduled_date) }}</p>
            </div>

            <div v-if="tourData">
              <h3 class="text-lg font-semibold text-blue-300 mb-2">Group Size</h3>
              <p class="text-white">{{ tourData.participants_signed_up }} / {{ tourData.max_participants }} participants</p>
            </div>

            <div v-if="tourAppointmentId">
              <h3 class="text-lg font-semibold text-blue-300 mb-2">Confirmation ID</h3>
              <p class="text-white font-mono text-sm">{{ tourAppointmentId.slice(-8).toUpperCase() }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Selected Interests -->
      <div v-if="selectedInterests.length > 0" class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-8">
        <h2 class="text-2xl font-bold text-white mb-6 flex items-center">
          <svg class="w-6 h-6 mr-3 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
          </svg>
          Your Selected Interests
        </h2>
        
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div 
            v-for="interest in selectedInterests"
            :key="interest"
            class="bg-purple-900 border border-purple-700 rounded-lg p-3 text-center"
          >
            <span class="text-purple-200 text-sm font-medium">
              {{ interestNames[interest] || interest }}
            </span>
          </div>
        </div>
        
        <p class="text-gray-400 mt-4 text-center">
          Your tour will be personalized to highlight these areas of interest
        </p>
      </div>

      <!-- What's Next -->
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-8">
        <h2 class="text-2xl font-bold text-white mb-6 flex items-center">
          <svg class="w-6 h-6 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          What's Next?
        </h2>

        <div class="grid md:grid-cols-2 gap-6">
          <!-- Before Your Tour -->
          <div class="bg-gray-700 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-white mb-4">Before Your Tour</h3>
            <ul class="space-y-3 text-gray-300">
              <li class="flex items-start">
                <svg class="w-5 h-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Download our mobile app for interactive content
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Check the weather and dress comfortably
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Arrive 10 minutes early at the visitor center
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Bring your confirmation ID and a valid ID
              </li>
            </ul>
          </div>

          <!-- Day of Tour -->
          <div class="bg-gray-700 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-white mb-4">Day of Your Tour</h3>
            <ul class="space-y-3 text-gray-300">
              <li class="flex items-start">
                <svg class="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                Meet at the main visitor center entrance
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Tour duration: approximately 90 minutes
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Feel free to ask questions during the tour
              </li>
              <li class="flex items-start">
                <svg class="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                Photos are welcome and encouraged!
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Contact Information -->
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-8">
        <h2 class="text-2xl font-bold text-white mb-6 flex items-center">
          <svg class="w-6 h-6 mr-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
          </svg>
          Need Help?
        </h2>

        <div class="grid md:grid-cols-3 gap-6 text-center">
          <div>
            <h3 class="text-lg font-semibold text-white mb-2">Questions about your tour?</h3>
            <p class="text-gray-300 mb-2">Contact our admissions office</p>
            <p class="text-blue-400">(555) 123-4567</p>
          </div>
          
          <div>
            <h3 class="text-lg font-semibold text-white mb-2">Need to reschedule?</h3>
            <p class="text-gray-300 mb-2">Visit our scheduling portal</p>
            <button class="text-blue-400 hover:text-blue-300 underline">
              Manage Booking
            </button>
          </div>
          
          <div>
            <h3 class="text-lg font-semibold text-white mb-2">Technical support?</h3>
            <p class="text-gray-300 mb-2">App or website issues</p>
            <p class="text-blue-400">support@campustour.com</p>
          </div>
        </div>
      </div>

      <!-- Download App CTA -->
      <div class="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg shadow-lg border border-blue-700 p-8 text-center">
        <h2 class="text-2xl font-bold text-white mb-4">Be prepared for your tour</h2>
        <p class="text-blue-200 mb-6">
          Download our mobile app for interactive maps, exclusive content, and real-time information during your visit.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button class="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center">
            <svg class="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            App Store
          </button>
          <button class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center">
            <svg class="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.92 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
            </svg>
            Google Play
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style> 
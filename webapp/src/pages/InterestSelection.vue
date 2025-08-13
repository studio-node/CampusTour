<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { analyticsService } from '../services/analyticsService.js'
import { leadsService } from '../services/leadsService.js'
import { schoolService } from '../services/schoolService.js'

const route = useRoute()
const router = useRouter()
const tourAppointmentId = ref(null)
const schoolId = ref(null)

// Placeholder interests (will be extracted from mobile app later)
const interests = ref([
  { id: "science_and_labs", name: "🔬 Science & Labs" },
  { id: "engineering", name: "⚙️ Engineering" },
  { id: "business", name: "💼 Business" },
  { id: "computing", name: "💻 Computing" },
  { id: "arts_and_theater", name: "🎭 Arts & Theater" },
  { id: "music", name: "🎶 Music" },
  { id: "athletics", name: "🏟️ Athletics" },
  { id: "recreation_and_fitness", name: "🏋️ Recreation & Fitness" },
  { id: "dorm-life", name: "🛏️ Dorm Life" },
  { id: "campus-dining", name: "🍔 Campus Dining" },
  { id: "clubs", name: "🧑‍🤝‍🧑 Student Clubs" },
  { id: "library_and_study-spaces", name: "📚 Library & Study Spaces" },
  { id: "nature_and_outdoor-spots", name: "🌳 Nature & Outdoor Spots" },
  { id: "history_and_landmarks", name: "🏰 History & Landmarks" },
  { id: "health_and_wellness", name: "🩺 Health & Wellness" },
  { id: "faith_and_spirituality", name: "✝️ Faith & Spirituality" },
  { id: "community", name: "🤝 Community" },
  { id: "career-services", name: "🎓 Career Services" }
])

const selectedInterests = ref([])
const isGenerating = ref(false)

// Get tour appointment ID and school ID from query parameters and storage
onMounted(() => {
  tourAppointmentId.value = route.query.tour_appointment_id || null
  schoolId.value = schoolService.getSelectedSchool()
  
  console.log('Tour Appointment ID:', tourAppointmentId.value)
  console.log('School ID:', schoolId.value)
})

// Toggle interest selection
const toggleInterest = (interestId) => {
  if (selectedInterests.value.includes(interestId)) {
    selectedInterests.value = selectedInterests.value.filter(id => id !== interestId)
  } else {
    selectedInterests.value.push(interestId)
  }
}

// Generate tour (placeholder)
const generateTour = async () => {
  isGenerating.value = true
  
  try {
    // Export analytics for interest selection
    if (schoolId.value && selectedInterests.value.length > 0) {
      console.log('Exporting interest analytics:', {
        schoolId: schoolId.value,
        interests: selectedInterests.value,
        tourAppointmentId: tourAppointmentId.value
      })
      
      // Try to retrieve lead id from local storage (webapp should save it on lead capture flow)
      let leadId = null
      try {
        leadId = localStorage.getItem('LEAD_ID')
      } catch (e) {}

      const analyticsResult = await analyticsService.exportInterestsChosen(
        schoolId.value,
        selectedInterests.value,
        tourAppointmentId.value,
        leadId
      )
      
      if (!analyticsResult.success) {
        console.warn('Failed to export analytics:', analyticsResult.error)
        // Continue with tour generation even if analytics fails
      }
    }
    
    // Navigate to confirmation page with tour details
    const queryParams = {
      interests: selectedInterests.value.join(',')
    }
    
    if (tourAppointmentId.value) {
      queryParams.tour_appointment_id = tourAppointmentId.value
    }
    
    await router.push({
      name: 'TourConfirmation',
      query: queryParams
    })
    
  } catch (error) {
    console.error('Error generating tour:', error)
    alert('Error generating tour. Please try again.')
  } finally {
    isGenerating.value = false
  }
}

// Show default tour
const showDefaultTour = () => {
  generateTour()
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Hero Section -->
    <div class="text-center mb-12">
      <h1 class="text-4xl md:text-6xl font-bold text-white mb-6">
        Discover Your Campus
      </h1>
      <p class="text-xl text-gray-300 mb-8">
        Select your interests to create a personalized campus tour experience
      </p>
    </div>

    <!-- Interest Selection -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 sm:p-8 mb-8">
      <h2 class="text-2xl font-bold text-white mb-6 text-center">
        What interests you most?
      </h2>
      
      <!-- Interest Tags -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        <button
          v-for="interest in interests"
          :key="interest.id"
          @click="toggleInterest(interest.id)"
          :class="[
            'p-2 sm:p-4 rounded-lg border-2 transition-all duration-200 text-left',
            selectedInterests.includes(interest.id)
              ? 'bg-blue-600 border-blue-500 text-white transform scale-105'
              : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-600'
          ]"
        >
          <span class="text-sm font-medium">{{ interest.name }}</span>
        </button>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          @click="generateTour"
          :disabled="selectedInterests.length === 0 || isGenerating"
          :class="[
            'px-8 py-3 rounded-lg font-medium transition-all duration-200',
            selectedInterests.length === 0 || isGenerating
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105'
          ]"
        >
          <span v-if="isGenerating" class="flex items-center justify-center">
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating Tour...
          </span>
          <span v-else>Submit Interests</span>
        </button>
        
        <button
          @click="showDefaultTour"
          :disabled="isGenerating"
          class="px-8 py-3 rounded-lg font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-all duration-200"
        >
          Skip Interest Selection
        </button>
      </div>

      <!-- Selection Count -->
      <div class="text-center mt-6">
        <p class="text-gray-400">
          {{ selectedInterests.length }} interest{{ selectedInterests.length !== 1 ? 's' : '' }} selected
        </p>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style> 
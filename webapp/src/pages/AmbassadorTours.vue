<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../supabase.js'

// Form data for creating a new tour
const newTour = ref({
  title: '',
  description: '',
  ambassadorId: '',
  scheduledDate: '',
  scheduledTime: '',
  durationMinutes: 60,
  maxParticipants: 20,
  meetingLocation: '',
  schoolId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' // Default school - should be dynamic in production
})

// Data storage
const ambassadors = ref([])
const existingTours = ref([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Time slots (hourly from 8 AM to 6 PM)
const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
]

// Load ambassadors and existing tours
onMounted(async () => {
  await loadAmbassadors()
  await loadExistingTours()
})

// Load available ambassadors
const loadAmbassadors = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'ambassador')
      .eq('is_active', true)
      .order('full_name')

    if (error) throw error
    ambassadors.value = data || []
  } catch (error) {
    console.error('Error loading ambassadors:', error)
    errorMessage.value = 'Failed to load ambassadors'
  }
}

// Load existing tours for scheduling validation
const loadExistingTours = async () => {
  try {
    const { data, error } = await supabase
      .from('tour_appointments')
      .select('scheduled_date, ambassador_id')
      .gte('scheduled_date', new Date().toISOString())
      .order('scheduled_date')

    if (error) throw error
    existingTours.value = data || []
  } catch (error) {
    console.error('Error loading existing tours:', error)
  }
}

// Check if a time slot is available (max 2 tours per hour)
const isTimeSlotAvailable = computed(() => {
  return (date, time) => {
    if (!date || !time) return true
    
    const requestedDateTime = `${date}T${time}:00`
    const requestedHour = time.split(':')[0]
    
    // Count tours in the same hour block
    const conflictingTours = existingTours.value.filter(tour => {
      const tourDate = tour.scheduled_date.split('T')[0]
      const tourHour = tour.scheduled_date.split('T')[1].split(':')[0]
      return tourDate === date && tourHour === requestedHour
    })
    
    return conflictingTours.length < 2
  }
})

// Get available time slots for selected date
const availableTimeSlots = computed(() => {
  if (!newTour.value.scheduledDate) return timeSlots
  
  return timeSlots.filter(time => isTimeSlotAvailable.value(newTour.value.scheduledDate, time))
})

// Validate form
const isFormValid = computed(() => {
  return (
    newTour.value.title.trim() &&
    newTour.value.ambassadorId &&
    newTour.value.scheduledDate &&
    newTour.value.scheduledTime &&
    newTour.value.meetingLocation.trim() &&
    isTimeSlotAvailable.value(newTour.value.scheduledDate, newTour.value.scheduledTime)
  )
})

// Create tour appointment
const createTour = async () => {
  if (!isFormValid.value) return
  
  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    // Combine date and time
    const scheduledDateTime = `${newTour.value.scheduledDate}T${newTour.value.scheduledTime}:00`
    
    const { data, error } = await supabase
      .from('tour_appointments')
      .insert([
        {
          title: newTour.value.title.trim(),
          description: newTour.value.description.trim() || null,
          ambassador_id: newTour.value.ambassadorId,
          school_id: newTour.value.schoolId,
          scheduled_date: scheduledDateTime,
          duration_minutes: newTour.value.durationMinutes,
          max_participants: newTour.value.maxParticipants,
          meeting_location: newTour.value.meetingLocation.trim(),
          status: 'scheduled'
        }
      ])
      .select()

    if (error) throw error
    
    successMessage.value = 'Tour created successfully!'
    
    // Reset form
    newTour.value = {
      title: '',
      description: '',
      ambassadorId: '',
      scheduledDate: '',
      scheduledTime: '',
      durationMinutes: 60,
      maxParticipants: 20,
      meetingLocation: '',
      schoolId: newTour.value.schoolId
    }
    
    // Reload existing tours
    await loadExistingTours()
    
  } catch (error) {
    console.error('Error creating tour:', error)
    errorMessage.value = error.message || 'Failed to create tour'
  } finally {
    isSubmitting.value = false
  }
}

// Clear messages when form changes
const clearMessages = () => {
  errorMessage.value = ''
  successMessage.value = ''
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <h1 class="text-2xl font-bold text-white">Ambassador Tour Management</h1>
      <p class="text-gray-400 mt-1">Create and manage ambassador-led tour appointments</p>
    </div>

    <!-- Create Tour Section -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <h2 class="text-xl font-semibold text-white mb-6">Create New Tour</h2>
      
      <!-- Success/Error Messages -->
      <div v-if="successMessage" class="mb-4 p-4 bg-green-900 border border-green-700 rounded-lg">
        <p class="text-green-200">{{ successMessage }}</p>
      </div>
      
      <div v-if="errorMessage" class="mb-4 p-4 bg-red-900 border border-red-700 rounded-lg">
        <p class="text-red-200">{{ errorMessage }}</p>
      </div>

      <form @submit.prevent="createTour" class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Tour Title -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Tour Title *</label>
            <input
              v-model="newTour.title"
              @input="clearMessages"
              type="text"
              required
              placeholder="e.g., Engineering Campus Tour"
              class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>

          <!-- Assign Ambassador -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Assign Ambassador *</label>
            <select
              v-model="newTour.ambassadorId"
              @change="clearMessages"
              required
              class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select an ambassador</option>
              <option v-for="ambassador in ambassadors" :key="ambassador.id" :value="ambassador.id">
                {{ ambassador.full_name }} ({{ ambassador.email }})
              </option>
            </select>
            <p v-if="ambassadors.length === 0" class="text-sm text-yellow-400 mt-1">
              No ambassadors available. Please add ambassadors in User Management.
            </p>
          </div>

          <!-- Schedule Date -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Date *</label>
            <input
              v-model="newTour.scheduledDate"
              @input="clearMessages"
              type="date"
              required
              :min="new Date().toISOString().split('T')[0]"
              class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>

          <!-- Schedule Time -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Time *</label>
            <select
              v-model="newTour.scheduledTime"
              @change="clearMessages"
              required
              class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select time</option>
              <option 
                v-for="time in availableTimeSlots" 
                :key="time" 
                :value="time"
              >
                {{ time }}
              </option>
            </select>
            <p v-if="newTour.scheduledDate && availableTimeSlots.length < timeSlots.length" class="text-sm text-yellow-400 mt-1">
              Some time slots are full (max 2 tours per hour)
            </p>
          </div>

          <!-- Duration -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Duration (minutes)</label>
            <select
              v-model="newTour.durationMinutes"
              class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option :value="30">30 minutes</option>
              <option :value="45">45 minutes</option>
              <option :value="60">60 minutes</option>
              <option :value="90">90 minutes</option>
              <option :value="120">120 minutes</option>
            </select>
          </div>

          <!-- Max Participants -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Max Participants</label>
            <input
              v-model.number="newTour.maxParticipants"
              type="number"
              min="1"
              max="50"
              class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>

          <!-- Meeting Location -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-300 mb-2">Meeting Location *</label>
            <input
              v-model="newTour.meetingLocation"
              @input="clearMessages"
              type="text"
              required
              placeholder="e.g., Main Campus Entrance, Student Center Lobby"
              class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
          </div>

          <!-- Description -->
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
            <textarea
              v-model="newTour.description"
              @input="clearMessages"
              rows="3"
              placeholder="Additional details about the tour..."
              class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            ></textarea>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="!isFormValid || isSubmitting"
            class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            <span v-if="isSubmitting">Creating...</span>
            <span v-else>Create Tour</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Information Card -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <h3 class="text-lg font-medium text-white mb-2">📋 Tour Scheduling Guidelines</h3>
      <ul class="text-gray-400 space-y-1">
        <li>• Maximum 2 tours can be scheduled per hour block</li>
        <li>• Tours are available from 8:00 AM to 6:00 PM</li>
        <li>• Ambassadors will receive notifications about their assigned tours</li>
        <li>• A unique QR code will be generated for participants to join</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style> 
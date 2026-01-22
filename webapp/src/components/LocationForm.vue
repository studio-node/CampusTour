<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { locationsService } from '../services/locationsService.js'
import { schoolService } from '../services/schoolService.js'
import LocationMapPicker from './LocationMapPicker.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  schoolId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'location-created'])

// School coordinates for map initialization
const schoolCoordinates = ref({
  latitude: 37.7749,
  longitude: -122.4194
})

// Form data
const formData = ref({
  name: '',
  latitude: '',
  longitude: '',
  description: '',
  interests: [],
  careers: [],
  talking_points: [],
  features: [],
  default_stop: true,
  order_index: ''
})

// Map coordinates (for v-model binding)
const mapCoordinates = ref(null)

// Tag input state for array fields
const tagInputs = ref({
  interests: '',
  careers: '',
  talking_points: '',
  features: ''
})

// UI state
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isFormValid = computed(() => {
  return (
    formData.value.name.trim() !== '' &&
    mapCoordinates.value !== null &&
    mapCoordinates.value.latitude !== undefined &&
    mapCoordinates.value.longitude !== undefined &&
    !isNaN(parseFloat(mapCoordinates.value.latitude)) &&
    !isNaN(parseFloat(mapCoordinates.value.longitude))
  )
})

// Fetch school coordinates when form opens or when component mounts
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    resetForm()
    await fetchSchoolCoordinates()
  }
}, { immediate: true })

// Also fetch on mount in case component is created with modelValue already true
onMounted(async () => {
  if (props.modelValue) {
    resetForm()
    await fetchSchoolCoordinates()
  }
})

// Watch map coordinates and update form data
watch(mapCoordinates, (coords) => {
  if (coords) {
    formData.value.latitude = coords.latitude.toString()
    formData.value.longitude = coords.longitude.toString()
  }
})

// Fetch school coordinates
async function fetchSchoolCoordinates() {
  try {
    const school = await schoolService.getSchoolById(props.schoolId)
    if (school?.coordinates) {
      // Handle different coordinate formats
      if (typeof school.coordinates === 'object') {
        if (school.coordinates.latitude && school.coordinates.longitude) {
          schoolCoordinates.value = {
            latitude: school.coordinates.latitude,
            longitude: school.coordinates.longitude
          }
        } else if (Array.isArray(school.coordinates) && school.coordinates.length === 2) {
          // Format: [lat, lng]
          schoolCoordinates.value = {
            latitude: school.coordinates[0],
            longitude: school.coordinates[1]
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching school coordinates:', error)
    // Keep default coordinates
  }
}

// Reset form to initial state
function resetForm() {
  formData.value = {
    name: '',
    latitude: '',
    longitude: '',
    description: '',
    interests: [],
    careers: [],
    talking_points: [],
    features: [],
    default_stop: true,
    order_index: ''
  }
  mapCoordinates.value = null
  tagInputs.value = {
    interests: '',
    careers: '',
    talking_points: '',
    features: ''
  }
  errorMessage.value = ''
  successMessage.value = ''
}

// Add tag to array field
function addTag(field) {
  const input = tagInputs.value[field]
  if (input.trim() === '') return
  
  const trimmed = input.trim()
  if (!formData.value[field].includes(trimmed)) {
    formData.value[field].push(trimmed)
  }
  tagInputs.value[field] = ''
}

// Remove tag from array field
function removeTag(field, index) {
  formData.value[field].splice(index, 1)
}

// Handle tag input keydown
function handleTagKeydown(event, field) {
  if (event.key === 'Enter') {
    event.preventDefault()
    addTag(field)
  }
}

// Close form
function closeForm() {
  isOpen.value = false
}

// Handle form submission
async function handleSubmit() {
  if (!isFormValid.value) return
  
  isSubmitting.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    // Prepare location data
    const locationData = {
      school_id: props.schoolId,
      name: formData.value.name.trim(),
      latitude: mapCoordinates.value.latitude,
      longitude: mapCoordinates.value.longitude,
      description: formData.value.description.trim() || null,
      interests: formData.value.interests.length > 0 ? formData.value.interests : null,
      careers: formData.value.careers.length > 0 ? formData.value.careers : null,
      talking_points: formData.value.talking_points.length > 0 ? formData.value.talking_points : null,
      features: formData.value.features.length > 0 ? formData.value.features : null,
      default_stop: formData.value.default_stop,
      order_index: formData.value.order_index ? parseInt(formData.value.order_index) : null
    }
    
    const result = await locationsService.createLocation(locationData)
    
    if (result.success) {
      successMessage.value = 'Location created successfully!'
      
      // Emit event to parent
      emit('location-created', result.data)
      
      // Close form after a short delay
      setTimeout(() => {
        closeForm()
      }, 1500)
    } else {
      errorMessage.value = result.error || 'Failed to create location'
    }
  } catch (error) {
    console.error('Error submitting location form:', error)
    errorMessage.value = 'An unexpected error occurred'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="space-y-6">
    <!-- Header -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-white">Add New Location</h1>
          <p class="text-gray-400 mt-1">Create a new location for your school</p>
        </div>
        <button
          @click="closeForm"
          class="text-gray-400 hover:text-white transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Form Content -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
          <!-- Success/Error Messages -->
          <div v-if="successMessage" class="mb-4 p-4 bg-green-900 border border-green-700 rounded-lg">
            <p class="text-green-200">{{ successMessage }}</p>
          </div>
          
          <div v-if="errorMessage" class="mb-4 p-4 bg-red-900 border border-red-700 rounded-lg">
            <p class="text-red-200">{{ errorMessage }}</p>
          </div>
          
          <form @submit.prevent="handleSubmit" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Name (Required) -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Location Name *
                </label>
                <input
                  v-model="formData.name"
                  type="text"
                  required
                  placeholder="e.g., Smith Computing Center"
                  class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
              </div>
              
              <!-- Map Picker (Required) -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Location Coordinates *
                </label>
                <p class="text-xs text-gray-400 mb-2">Click on the map to place a pin, or drag the pin to adjust the location</p>
                <LocationMapPicker
                  v-model="mapCoordinates"
                  :initial-lat="schoolCoordinates.latitude"
                  :initial-lng="schoolCoordinates.longitude"
                />
                <div v-if="formData.latitude && formData.longitude" class="mt-2 text-sm text-gray-400">
                  Selected: {{ parseFloat(formData.latitude).toFixed(6) }}, {{ parseFloat(formData.longitude).toFixed(6) }}
                </div>
                <div v-else class="mt-2 text-sm text-yellow-400">
                  Please click on the map to select a location
                </div>
              </div>
              
              <!-- Description -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  v-model="formData.description"
                  rows="3"
                  placeholder="Brief description of the location..."
                  class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                ></textarea>
              </div>
              
              <!-- Interests (Tags) -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Interests
                </label>
                <div class="flex flex-wrap gap-2 mb-2">
                  <span
                    v-for="(interest, index) in formData.interests"
                    :key="index"
                    class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-900 text-blue-200"
                  >
                    {{ interest }}
                    <button
                      type="button"
                      @click="removeTag('interests', index)"
                      class="ml-2 text-blue-300 hover:text-blue-100"
                    >
                      ×
                    </button>
                  </span>
                </div>
                <input
                  v-model="tagInputs.interests"
                  @keydown="handleTagKeydown($event, 'interests')"
                  type="text"
                  placeholder="Type and press Enter to add interest"
                  class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
              </div>
              
              <!-- Careers (Tags) -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Careers
                </label>
                <div class="flex flex-wrap gap-2 mb-2">
                  <span
                    v-for="(career, index) in formData.careers"
                    :key="index"
                    class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-900 text-purple-200"
                  >
                    {{ career }}
                    <button
                      type="button"
                      @click="removeTag('careers', index)"
                      class="ml-2 text-purple-300 hover:text-purple-100"
                    >
                      ×
                    </button>
                  </span>
                </div>
                <input
                  v-model="tagInputs.careers"
                  @keydown="handleTagKeydown($event, 'careers')"
                  type="text"
                  placeholder="Type and press Enter to add career"
                  class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
              </div>
              
              <!-- Talking Points (Tags) -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Talking Points
                </label>
                <div class="flex flex-wrap gap-2 mb-2">
                  <span
                    v-for="(point, index) in formData.talking_points"
                    :key="index"
                    class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-900 text-green-200"
                  >
                    {{ point }}
                    <button
                      type="button"
                      @click="removeTag('talking_points', index)"
                      class="ml-2 text-green-300 hover:text-green-100"
                    >
                      ×
                    </button>
                  </span>
                </div>
                <input
                  v-model="tagInputs.talking_points"
                  @keydown="handleTagKeydown($event, 'talking_points')"
                  type="text"
                  placeholder="Type and press Enter to add talking point"
                  class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
              </div>
              
              <!-- Features (Tags) -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Features
                </label>
                <div class="flex flex-wrap gap-2 mb-2">
                  <span
                    v-for="(feature, index) in formData.features"
                    :key="index"
                    class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-900 text-yellow-200"
                  >
                    {{ feature }}
                    <button
                      type="button"
                      @click="removeTag('features', index)"
                      class="ml-2 text-yellow-300 hover:text-yellow-100"
                    >
                      ×
                    </button>
                  </span>
                </div>
                <input
                  v-model="tagInputs.features"
                  @keydown="handleTagKeydown($event, 'features')"
                  type="text"
                  placeholder="Type and press Enter to add feature"
                  class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
              </div>
              
              <!-- Default Stop -->
              <div>
                <label class="flex items-center space-x-2">
                  <input
                    v-model="formData.default_stop"
                    type="checkbox"
                    class="h-4 w-4 text-blue-600 border-gray-600 bg-gray-700 rounded focus:ring-blue-500"
                  >
                  <span class="text-sm font-medium text-gray-300">Default Tour Stop</span>
                </label>
                <p class="text-xs text-gray-400 mt-1">Include this location in default tours</p>
              </div>
              
              <!-- Order Index -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Order Index
                </label>
                <input
                  v-model="formData.order_index"
                  type="number"
                  min="0"
                  placeholder="Optional: for tour ordering"
                  class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                <p class="text-xs text-gray-400 mt-1">Lower numbers appear first in tours</p>
              </div>
            </div>
            
            <!-- Form Actions -->
            <div class="flex justify-end space-x-3 pt-4 border-t border-gray-700">
              <button
                type="button"
                @click="closeForm"
                :disabled="isSubmitting"
                class="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="!isFormValid || isSubmitting"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                <span v-if="isSubmitting">Creating...</span>
                <span v-else>Create Location</span>
              </button>
            </div>
          </form>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>

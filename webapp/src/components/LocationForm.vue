<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { locationsService } from '../services/locationsService.js'
import { schoolService } from '../services/schoolService.js'
import LocationMapPicker from './LocationMapPicker.vue'
import LocationsOverviewMap from './LocationsOverviewMap.vue'
import LocationMediaForm from './LocationMediaForm.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  schoolId: {
    type: String,
    required: true
  },
  editLocation: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'location-created', 'location-updated'])

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

// Existing locations for overview map
const existingLocations = ref([])
const isLoadingLocations = ref(false)

// Predefined interests list
const availableInterests = [
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
]

// Tag input state for array fields (excluding interests)
const tagInputs = ref({
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

// Fetch school coordinates and existing locations when form opens or when component mounts
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    if (props.editLocation) {
      populateFormForEdit()
    } else {
      resetForm()
    }
    await Promise.all([
      fetchSchoolCoordinates(),
      fetchExistingLocations()
    ])
  }
}, { immediate: true })

// Also fetch on mount in case component is created with modelValue already true
onMounted(async () => {
  if (props.modelValue) {
    if (props.editLocation) {
      populateFormForEdit()
    } else {
      resetForm()
    }
    await Promise.all([
      fetchSchoolCoordinates(),
      fetchExistingLocations()
    ])
  }
})

// Watch for editLocation changes
watch(() => props.editLocation, (newLocation) => {
  if (newLocation && props.modelValue) {
    populateFormForEdit()
  }
}, { deep: true })

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

// Fetch existing locations for overview map
async function fetchExistingLocations() {
  isLoadingLocations.value = true
  try {
    const locations = await locationsService.getLocationsBySchool(props.schoolId)
    existingLocations.value = locations || []
  } catch (error) {
    console.error('Error fetching existing locations:', error)
    existingLocations.value = []
  } finally {
    isLoadingLocations.value = false
  }
}

// Populate form with location data for editing
function populateFormForEdit() {
  if (!props.editLocation) return

  const location = props.editLocation
  
  formData.value = {
    name: location.name || '',
    latitude: location.latitude?.toString() || '',
    longitude: location.longitude?.toString() || '',
    description: location.description || '',
    interests: location.interests || [],
    careers: location.careers || [],
    talking_points: location.talking_points || [],
    features: location.features || [],
    default_stop: location.default_stop !== undefined ? location.default_stop : true,
    order_index: location.order_index !== null && location.order_index !== undefined ? location.order_index.toString() : ''
  }

  // Set map coordinates if latitude/longitude exist
  if (location.latitude && location.longitude) {
    mapCoordinates.value = {
      latitude: location.latitude,
      longitude: location.longitude
    }
  } else {
    mapCoordinates.value = null
  }

  tagInputs.value = {
    careers: '',
    talking_points: '',
    features: ''
  }
  errorMessage.value = ''
  successMessage.value = ''
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
    careers: '',
    talking_points: '',
    features: ''
  }
  errorMessage.value = ''
  successMessage.value = ''
}

// Toggle interest selection
function toggleInterest(interestId) {
  const index = formData.value.interests.indexOf(interestId)
  if (index > -1) {
    formData.value.interests.splice(index, 1)
  } else {
    formData.value.interests.push(interestId)
  }
}

// Check if interest is selected
function isInterestSelected(interestId) {
  return formData.value.interests.includes(interestId)
}

// Add tag to array field (for careers, talking_points, features)
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
    
    let result
    if (props.editLocation) {
      // Update existing location
      result = await locationsService.updateLocation(props.editLocation.id, locationData)
      if (result.success) {
        successMessage.value = 'Location updated successfully!'
        emit('location-updated', result.data)
      } else {
        errorMessage.value = result.error || 'Failed to update location'
      }
    } else {
      // Create new location
      result = await locationsService.createLocation(locationData)
      if (result.success) {
        successMessage.value = 'Location created successfully!'
        emit('location-created', result.data)
      } else {
        errorMessage.value = result.error || 'Failed to create location'
      }
    }
    
    if (result.success) {
      // Close form after a short delay
      setTimeout(() => {
        closeForm()
      }, 1500)
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
          <h1 class="text-2xl font-bold text-white">{{ editLocation ? 'Edit Location' : 'Add New Location' }}</h1>
          <p class="text-gray-400 mt-1">{{ editLocation ? 'Update location information' : 'Create a new location for your school' }}</p>
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
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div v-if="formData.latitude && formData.longitude" class="mt-2 text-lg text-gray-400">
                  Selected: <strong class="text-blue-400">{{ parseFloat(formData.latitude).toFixed(6) }}</strong>, <strong class="text-blue-400">{{ parseFloat(formData.longitude).toFixed(6) }}</strong>
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
              
              <!-- Interests (Checkboxes) -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Interests
                </label>
                <div class="border border-gray-600 bg-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label
                      v-for="interest in availableInterests"
                      :key="interest.id"
                      class="flex items-center space-x-2 cursor-pointer hover:bg-gray-600 p-2 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        :checked="isInterestSelected(interest.id)"
                        @change="toggleInterest(interest.id)"
                        class="h-4 w-4 text-blue-600 border-gray-500 bg-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                      >
                      <span class="text-sm text-gray-300">{{ interest.name }}</span>
                    </label>
                  </div>
                </div>
                <div v-if="formData.interests.length > 0" class="mt-3">
                  <p class="text-xs text-gray-400 mb-2">Selected interests:</p>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="interestId in formData.interests"
                      :key="interestId"
                      class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-900 text-blue-200"
                    >
                      {{ availableInterests.find(i => i.id === interestId)?.name || interestId }}
                      <button
                        type="button"
                        @click="toggleInterest(interestId)"
                        class="ml-2 text-blue-300 hover:text-blue-100"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                </div>
              </div>
              
              <!-- Careers (Tags) -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Careers
                </label>
                <input
                v-model="tagInputs.careers"
                @keydown="handleTagKeydown($event, 'careers')"
                type="text"
                placeholder="Type and press Enter to add career"
                class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                <div class="flex flex-wrap gap-2 mt-2">
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
              </div>
              
              <!-- Talking Points (Tags) -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Talking Points
                </label>
                <input
                v-model="tagInputs.talking_points"
                @keydown="handleTagKeydown($event, 'talking_points')"
                type="text"
                placeholder="Type and press Enter to add talking point"
                class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                <div class="flex flex-wrap gap-2 mt-2">
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
              </div>
              
              <!-- Features (Tags) -->
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Features
                </label>
                <input
                  v-model="tagInputs.features"
                  @keydown="handleTagKeydown($event, 'features')"
                  type="text"
                  placeholder="Type and press Enter to add feature"
                  class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                <div class="flex flex-wrap gap-2 mt-2">
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
            </div>

            <!-- Order Index Section (Full Width) -->
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Order Index
              </label>
              <p class="text-xs text-gray-400 mb-3">View existing locations below to determine the appropriate order index. Lower numbers appear first in tours.</p>
              
              <!-- Locations Overview Map -->
              <div class="mb-4">
                <LocationsOverviewMap
                  :locations="existingLocations"
                  :center-lat="schoolCoordinates.latitude"
                  :center-lng="schoolCoordinates.longitude"
                  :new-location-coords="mapCoordinates"
                />
                <p class="text-xs text-gray-400 mt-2">Each marker shows the location's order index number. The red "NEW" marker shows your selected location. Click markers to see location names.</p>
              </div>
              
              <!-- Order Index Input -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  Set Order Index for New Location
                </label>
                <input
                  v-model="formData.order_index"
                  type="number"
                  min="0"
                  placeholder="Enter order index (e.g., 0, 1, 2...)"
                  class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                <p class="text-xs text-gray-400 mt-1">Leave empty to add at the end, or enter a number to insert at a specific position</p>
              </div>
            </div>

            <!-- Location Media (only when editing existing location) -->
            <div v-if="editLocation?.id" class="md:col-span-2 pt-6 border-t border-gray-700">
              <LocationMediaForm
                :location-id="editLocation.id"
                :is-builder="false"
              />
            </div>
            <div v-else class="md:col-span-2 pt-6 border-t border-gray-700">
              <p class="text-sm text-gray-400">Save the location first to add primary image and additional media.</p>
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
                <span v-if="isSubmitting">{{ editLocation ? 'Updating...' : 'Creating...' }}</span>
                <span v-else>{{ editLocation ? 'Update Location' : 'Create Location' }}</span>
              </button>
            </div>
          </form>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>

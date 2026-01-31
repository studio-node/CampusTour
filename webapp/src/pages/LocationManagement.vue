<script setup>
import { ref, onMounted, watch } from 'vue'
import LocationForm from '../components/LocationForm.vue'
import LocationPreview from '../components/LocationPreview.vue'
import { locationsService } from '../services/locationsService.js'
import { locationMediaService } from '../services/locationMediaService.js'
import { useAuth } from '../composables/useAuth.js'
import { availableInterests } from '../services/interestsMap.js'
const { user } = useAuth()

const locations = ref([])
const showLocationForm = ref(false)
const editingLocation = ref(null)
const selectedLocation = ref(null)
const currentSchoolId = ref(null)
const isLoadingSchoolId = ref(false)
const isLoadingLocations = ref(false)

// Delete confirmation state
const showDeleteDialog = ref(false)
const locationToDelete = ref(null)
const isDeleting = ref(false)
const deleteError = ref('')

// Function to fetch school_id
async function fetchSchoolId() {
  if (!user.value?.id || currentSchoolId.value) return
  
  isLoadingSchoolId.value = true
  try {
    const schoolId = await locationsService.getUserSchoolId(user.value.id)
    if (schoolId) {
      currentSchoolId.value = schoolId
    } else {
      console.error('No school_id found for user')
    }
  } catch (error) {
    console.error('Error fetching school_id:', error)
  } finally {
    isLoadingSchoolId.value = false
  }
}

// Fetch school_id on mount
onMounted(() => {
  fetchSchoolId()
})

// Watch for user changes
watch(user, () => {
  fetchSchoolId()
}, { immediate: true })

// Watch for school_id to fetch locations
watch(currentSchoolId, async (schoolId) => {
  if (schoolId) {
    await fetchLocations()
    getMediaBySchool(schoolId)
  }
})

// Watch for form close to clear editing location
watch(showLocationForm, (isOpen) => {
  if (!isOpen) {
    editingLocation.value = null
  }
})

// Fetch locations for the school
async function fetchLocations() {
  if (!currentSchoolId.value) return
  
  isLoadingLocations.value = true
  try {
    const locationsData = await locationsService.getLocationsBySchool(currentSchoolId.value)
    locations.value = locationsData || []
    // console.log('Fetching media by school:', locations.value)

  } catch (error) {
    console.error('Error fetching locations:', error)
    locations.value = []
  } finally {
    isLoadingLocations.value = false
  }
}

async function getMediaBySchool() {
  try {
    var locationids = []
    locations.value.forEach(location => {
      locationids.push(location.id)
    })
    const coverPhotos = await locationMediaService.getCoverPhotosByLocationIds(locationids)
    console.log('Cover Photos:', coverPhotos)
    locations.value.forEach(location => {
      const coverPhoto = coverPhotos.find(m => m.location_id === location.id)
      location.cover_image = coverPhoto.url
    })
  } catch (error) {
    console.error('Error fetching location media:', error)
  }
}


// Open location form for adding
function openLocationForm() {
  if (!currentSchoolId.value) {
    console.error('School ID not available')
    return
  }
  editingLocation.value = null
  showLocationForm.value = true
}

// Select location to preview
function selectLocation(location) {
  selectedLocation.value = location
}

// Close preview
function closePreview() {
  selectedLocation.value = null
}

// Open location form for editing (from preview)
function openEditLocationForm(location) {
  if (!currentSchoolId.value) {
    console.error('School ID not available')
    return
  }
  editingLocation.value = location
  selectedLocation.value = null // Close preview
  showLocationForm.value = true
}

// Handle delete from preview
function handleDeleteFromPreview(location) {
  selectedLocation.value = null // Close preview
  confirmDeleteLocation(location)
}

// Handle location created event
function handleLocationCreated(locationData) {
  console.log('Location created:', locationData)
  // Refresh locations list
  fetchLocations()
}

// Handle location updated event
function handleLocationUpdated(locationData) {
  console.log('Location updated:', locationData)
  // Refresh locations list
  fetchLocations()
}

// Open delete confirmation dialog
function confirmDeleteLocation(location) {
  locationToDelete.value = location
  showDeleteDialog.value = true
  deleteError.value = ''
}

// Cancel delete
function cancelDelete() {
  showDeleteDialog.value = false
  locationToDelete.value = null
  deleteError.value = ''
}

// Delete location
async function deleteLocation() {
  if (!locationToDelete.value) return

  isDeleting.value = true
  deleteError.value = ''

  try {
    const result = await locationsService.deleteLocation(locationToDelete.value.id)

    if (result.success) {
      // Refresh locations list
      await fetchLocations()
      // Close dialog
      showDeleteDialog.value = false
      locationToDelete.value = null
    } else {
      deleteError.value = result.error || 'Failed to delete location'
    }
  } catch (error) {
    console.error('Error deleting location:', error)
    deleteError.value = 'An unexpected error occurred'
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Show Location Form when active -->
    <LocationForm
      v-if="showLocationForm"
      v-model="showLocationForm"
      :school-id="currentSchoolId"
      :edit-location="editingLocation"
      @location-created="handleLocationCreated"
      @location-updated="handleLocationUpdated"
    />
    
    <!-- Show Location Preview when a location is selected -->
    <LocationPreview
      v-else-if="selectedLocation"
      :location="selectedLocation"
      @edit="openEditLocationForm"
      @delete="handleDeleteFromPreview"
      @close="closePreview"
    />
    
    <!-- Default Location Management View -->
    <template v-else>
      <!-- Header -->
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-white">Location Management</h1>
            <p class="text-gray-400 mt-1">Manage locations for your school</p>
          </div>
          <div class="space-x-2">
            <button 
              @click="openLocationForm"
              :disabled="!currentSchoolId || isLoadingSchoolId"
              class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Add Location
            </button>
          </div>
        </div>
      </div>

      <!-- Locations Table -->
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
        <div class="p-6">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-700">
              <thead class="bg-gray-700">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Cover Image</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Location Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Interests</th>
                  <!-- <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th> -->
                </tr>
              </thead>
              <tbody class="bg-gray-800 divide-y divide-gray-700">
                <tr v-if="isLoadingLocations">
                  <td colspan="4" class="px-6 py-4 text-center text-gray-400">
                    Loading locations...
                  </td>
                </tr>
                <tr v-else-if="locations.length === 0">
                  <td colspan="4" class="px-6 py-4 text-center text-gray-400">
                    No locations found. Click "Add Location" to create one.
                  </td>
                </tr>
                <tr 
                  v-else 
                  v-for="location in locations" 
                  :key="location.id" 
                  @click="selectLocation(location)"
                  class="hover:bg-gray-700 cursor-pointer transition-colors"
                >
                <td class="px-6 py-4 whitespace-nowrap">
                  <!-- <div class="text-sm text-white">
                    {{ location.order_index !== null && location.order_index !== undefined ? location.order_index : 'Not set' }}
                  </div> -->
                  <img :src="location.cover_image" alt="Cover Image" class="w-30 h-20 object-cover rounded-lg border border-gray-600">
                </td>
                  <td class="px-6 py-4">
                    <div class="text-sm font-medium text-white">{{ location.name }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex flex-wrap gap-1">
                      <span v-for="interest in (location.interests || [])" :key="interest" 
                            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-900 text-blue-200">
                        {{ availableInterests.find(i => i.id === interest)?.name }}
                      </span>
                      <span v-if="!location.interests || location.interests.length === 0" class="text-xs text-gray-500">
                        No interests
                      </span>
                    </div>
                  </td>
                  
                  <!-- <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                          :class="location.default_stop ? 'bg-green-900 text-green-200' : 'bg-gray-700 text-gray-300'">
                      {{ location.default_stop ? 'Default Stop' : 'Optional' }}
                    </span>
                  </td> -->
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Delete Confirmation Dialog -->
    <div
      v-if="showDeleteDialog"
      class="fixed inset-0 z-50 overflow-y-auto"
      @click.self="cancelDelete"
    >
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
      
      <!-- Dialog Container -->
      <div class="flex min-h-full items-center justify-center p-4">
        <div
          class="relative bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-md"
          @click.stop
        >
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-700">
            <h3 class="text-xl font-bold text-white">Delete Location</h3>
            <p class="text-gray-400 text-sm mt-1">This action cannot be undone.</p>
          </div>
          
          <!-- Content -->
          <div class="px-6 py-4">
            <p class="text-gray-300">
              Are you sure you want to delete <strong class="text-white">{{ locationToDelete?.name }}</strong>?
            </p>
            
            <div v-if="deleteError" class="mt-4 p-3 bg-red-900 border border-red-700 rounded-lg">
              <p class="text-red-200 text-sm">{{ deleteError }}</p>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="px-6 py-4 border-t border-gray-700 flex justify-end space-x-3">
            <button
              @click="cancelDelete"
              :disabled="isDeleting"
              class="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              @click="deleteLocation"
              :disabled="isDeleting"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              <span v-if="isDeleting">Deleting...</span>
              <span v-else>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>

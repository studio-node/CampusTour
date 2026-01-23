<script setup>
import { ref, onMounted, watch } from 'vue'
import LocationForm from '../components/LocationForm.vue'
import { locationsService } from '../services/locationsService.js'
import { useAuth } from '../composables/useAuth.js'

const { user } = useAuth()

const tours = ref([
  { id: 1, name: 'Engineering Campus Tour', school: 'Utah Tech University', stops: 8, status: 'Active', created: '2 days ago' },
  { id: 2, name: 'Arts & Science Tour', school: 'Utah Tech University', stops: 6, status: 'Active', created: '1 week ago' },
  { id: 3, name: 'Business School Tour', school: 'Utah Tech University', stops: 5, status: 'Draft', created: '3 days ago' }
])

const locations = ref([
  { id: 1, name: 'Smith Computing Center', interests: ['Computing', 'Engineering'], tours: 2, status: 'Active' },
  { id: 2, name: 'Arts Building', interests: ['Arts', 'Theater'], tours: 1, status: 'Active' },
  { id: 3, name: 'Library', interests: ['Study', 'Research'], tours: 3, status: 'Active' }
])

const activeTab = ref('tours')
const showLocationForm = ref(false)
const currentSchoolId = ref(null)
const isLoadingSchoolId = ref(false)

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

// Open location form
function openLocationForm() {
  if (!currentSchoolId.value) {
    console.error('School ID not available')
    return
  }
  showLocationForm.value = true
}

// Handle location created event
function handleLocationCreated(locationData) {
  console.log('Location created:', locationData)
  // Optionally refresh locations list here in the future
  // For now, we'll just log it
}
</script>

<template>
  <div class="space-y-6">
    <!-- Show Location Form when active, otherwise show tabs -->
    <LocationForm
      v-if="showLocationForm"
      v-model="showLocationForm"
      :school-id="currentSchoolId"
      @location-created="handleLocationCreated"
    />
    
    <!-- Default Tour Management View -->
    <template v-else>
      <!-- Header -->
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-white">Tour Management</h1>
            <p class="text-gray-400 mt-1">Manage tours, locations, and tour configurations</p>
          </div>
          <div class="space-x-2">
            <button 
              @click="openLocationForm"
              :disabled="!currentSchoolId || isLoadingSchoolId"
              class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              Add Location
            </button>
            <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Create Tour
            </button>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
        <div class="border-b border-gray-700">
          <nav class="-mb-px flex space-x-8 px-6">
            <button
              @click="activeTab = 'tours'"
              :class="activeTab === 'tours' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              Tours
            </button>
            <button
              @click="activeTab = 'locations'"
              :class="activeTab === 'locations' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'"
              class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
            >
              Locations
            </button>
          </nav>
        </div>

        <!-- Tours Tab -->
        <div v-if="activeTab === 'tours'" class="p-6">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-700">
              <thead class="bg-gray-700">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tour Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Stops</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-gray-800 divide-y divide-gray-700">
                <tr v-for="tour in tours" :key="tour.id" class="hover:bg-gray-700">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-white">{{ tour.name }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-white">{{ tour.stops }} stops</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                          :class="tour.status === 'Active' ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'">
                      {{ tour.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {{ tour.created }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button class="text-blue-400 hover:text-blue-300">Edit</button>
                    <button class="text-green-400 hover:text-green-300">Preview</button>
                    <button class="text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Locations Tab -->
        <div v-if="activeTab === 'locations'" class="p-6">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-700">
              <thead class="bg-gray-700">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Location Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Interests</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Used in Tours</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-gray-800 divide-y divide-gray-700">
                <tr v-for="location in locations" :key="location.id" class="hover:bg-gray-700">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-white">{{ location.name }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex flex-wrap gap-1">
                      <span v-for="interest in location.interests" :key="interest" 
                            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-900 text-blue-200">
                        {{ interest }}
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-white">{{ location.tours }} tours</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-900 text-green-200">
                      {{ location.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button class="text-blue-400 hover:text-blue-300">Edit</button>
                    <button class="text-green-400 hover:text-green-300">View</button>
                    <button class="text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>

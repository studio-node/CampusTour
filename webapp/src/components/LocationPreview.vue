<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

const props = defineProps({
  location: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['edit', 'delete', 'close'])

const mapContainer = ref(null)
let map = null
let marker = null

// Predefined interests list (same as LocationForm)
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

// Get interest name by ID
function getInterestName(interestId) {
  const interest = availableInterests.find(i => i.id === interestId)
  return interest ? interest.name : interestId
}

// Map coordinates for display
const mapCoordinates = computed(() => {
  if (props.location?.latitude && props.location?.longitude) {
    return {
      latitude: props.location.latitude,
      longitude: props.location.longitude
    }
  }
  return null
})

// Initialize map for preview (read-only)
onMounted(() => {
  if (!mapContainer.value || !mapCoordinates.value) return

  // Create map
  map = L.map(mapContainer.value).setView([mapCoordinates.value.latitude, mapCoordinates.value.longitude], 15)

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map)

  // Add marker (non-draggable, read-only)
  marker = L.marker([mapCoordinates.value.latitude, mapCoordinates.value.longitude], {
    draggable: false
  }).addTo(map)

  // Add popup with location name
  marker.bindPopup(`
    <div class="text-sm">
      <strong>${props.location.name || 'Location'}</strong><br>
      ${mapCoordinates.value.latitude.toFixed(6)}, ${mapCoordinates.value.longitude.toFixed(6)}
    </div>
  `)
})

// Cleanup
onUnmounted(() => {
  if (map) {
    map.remove()
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header with Actions -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-white">{{ location.name }}</h1>
          <p class="text-gray-400 mt-1">Location Details</p>
        </div>
        <div class="flex items-center space-x-3">
          <button
            @click="emit('edit', location)"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Edit
          </button>
          <button
            @click="emit('delete', location)"
            class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
          <button
            @click="emit('close')"
            class="text-gray-400 hover:text-white transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Location Details -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 space-y-6">
      <!-- Basic Information -->
      <div>
        <h2 class="text-lg font-semibold text-white mb-4">Basic Information</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Name</label>
            <p class="text-white">{{ location.name }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Order Index</label>
            <p class="text-white">{{ location.order_index !== null && location.order_index !== undefined ? location.order_index : 'Not set' }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Default Tour Stop</label>
            <p class="text-white">{{ location.default_stop ? 'Yes' : 'No' }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-400 mb-1">Coordinates</label>
            <p class="text-white">
              {{ location.latitude?.toFixed(6) }}, {{ location.longitude?.toFixed(6) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div v-if="location.description">
        <h2 class="text-lg font-semibold text-white mb-4">Description</h2>
        <p class="text-gray-300">{{ location.description }}</p>
      </div>

      <!-- Map -->
      <div v-if="mapCoordinates">
        <h2 class="text-lg font-semibold text-white mb-4">Location on Map</h2>
        <div 
          ref="mapContainer" 
          class="w-full h-96 rounded-lg border border-gray-600"
          style="z-index: 0;"
        ></div>
      </div>

      <!-- Interests -->
      <div v-if="location.interests && location.interests.length > 0">
        <h2 class="text-lg font-semibold text-white mb-4">Interests</h2>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="interestId in location.interests"
            :key="interestId"
            class="inline-flex px-3 py-1 rounded-full text-sm bg-blue-900 text-blue-200"
          >
            {{ getInterestName(interestId) }}
          </span>
        </div>
      </div>

      <!-- Careers -->
      <div v-if="location.careers && location.careers.length > 0">
        <h2 class="text-lg font-semibold text-white mb-4">Careers</h2>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(career, index) in location.careers"
            :key="index"
            class="inline-flex px-3 py-1 rounded-full text-sm bg-purple-900 text-purple-200"
          >
            {{ career }}
          </span>
        </div>
      </div>

      <!-- Talking Points -->
      <div v-if="location.talking_points && location.talking_points.length > 0">
        <h2 class="text-lg font-semibold text-white mb-4">Talking Points</h2>
        <ul class="list-disc list-inside space-y-2 text-gray-300">
          <li v-for="(point, index) in location.talking_points" :key="index">
            {{ point }}
          </li>
        </ul>
      </div>

      <!-- Features -->
      <div v-if="location.features && location.features.length > 0">
        <h2 class="text-lg font-semibold text-white mb-4">Features</h2>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(feature, index) in location.features"
            :key="index"
            class="inline-flex px-3 py-1 rounded-full text-sm bg-yellow-900 text-yellow-200"
          >
            {{ feature }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Leaflet map container styles */
:deep(.leaflet-container) {
  background-color: #1f2937;
}

:deep(.leaflet-popup-content-wrapper) {
  background-color: #374151;
  color: #f3f4f6;
}

:deep(.leaflet-popup-tip) {
  background-color: #374151;
}
</style>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { locationsService } from '../services/locationsService.js'
import { locationMediaService } from '../services/locationMediaService.js'

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

// Builder link / passcode UI
const showBuilderDialog = ref(false)
const builderLink = computed(() => {
  try {
    return `${window.location.origin}/builder/location/${props.location?.id}`
  } catch {
    return `/builder/location/${props.location?.id}`
  }
})
const builderPasscode = ref('')
const builderIsLoading = ref(false)
const builderError = ref('')
const builderSuccess = ref('')

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

// Location media (read-only display)
const locationMedia = ref([])
const mediaLoading = ref(false)
const primaryImage = computed(() => locationMedia.value.find(m => m.media_type === 'primaryImage'))
const additionalMedia = computed(() => locationMedia.value.filter(m => m.media_type === 'additional'))

// Detect video by URL extension (for display)
function isVideoUrl(url) {
  if (!url || typeof url !== 'string') return false
  const lower = url.toLowerCase()
  return /\.(mp4|webm|mov|ogg|m4v|avi)(\?|$)/.test(lower)
}

async function fetchLocationMedia() {
  if (!props.location?.id) return
  mediaLoading.value = true
  try {
    locationMedia.value = await locationMediaService.getMediaByLocation(props.location.id)
  } catch (e) {
    locationMedia.value = []
  } finally {
    mediaLoading.value = false
  }
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

// Initialize map and fetch media for preview
onMounted(() => {
  fetchLocationMedia()
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

async function resetBuilderPasscode() {
  builderIsLoading.value = true
  builderError.value = ''
  builderSuccess.value = ''
  builderPasscode.value = ''
  try {
    const result = await locationsService.resetLocationBuilderPasscode(props.location.id)
    if (!result.success) {
      builderError.value = result.error || 'Failed to reset passcode'
      return
    }
    builderPasscode.value = result.data?.passcode || ''
    builderSuccess.value = 'New passcode generated. Copy it and share it with the builder.'
  } finally {
    builderIsLoading.value = false
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    builderSuccess.value = 'Copied to clipboard.'
    builderError.value = ''
  } catch (e) {
    builderError.value = 'Failed to copy. Please copy manually.'
  }
}
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
            @click="showBuilderDialog = true"
            class="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Builder Link
          </button>
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

      <!-- Location Media -->
      <div>
        <h2 class="text-lg font-semibold text-white mb-4">Location Media</h2>
        <div v-if="mediaLoading" class="text-gray-400 text-sm">Loading media…</div>
        <div v-else-if="!primaryImage && (!additionalMedia || additionalMedia.length === 0)" class="text-gray-500 text-sm">
          No media for this location.
        </div>
        <template v-else>
          <div v-if="primaryImage" class="mb-4">
            <label class="block text-sm font-medium text-gray-400 mb-2">Primary Image</label>
            <img
              :src="primaryImage.url"
              :alt="'Primary image'"
              class="max-w-full max-h-80 object-contain rounded-lg border border-gray-600"
            />
          </div>
          <div v-if="additionalMedia.length > 0">
            <label class="block text-sm font-medium text-gray-400 mb-2">Additional Media</label>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              <template v-for="item in additionalMedia" :key="item.id">
                <video
                  v-if="isVideoUrl(item.url)"
                  :src="item.url"
                  controls
                  class="w-full aspect-square object-cover rounded-lg border border-gray-600"
                  preload="metadata"
                />
                <img
                  v-else
                  :src="item.url"
                  :alt="'Media'"
                  class="w-full aspect-square object-cover rounded-lg border border-gray-600"
                />
              </template>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Builder Link / Passcode Dialog -->
    <div
      v-if="showBuilderDialog"
      class="fixed inset-0 z-50 overflow-y-auto"
      @click.self="showBuilderDialog = false"
    >
      <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>
      <div class="flex min-h-full items-center justify-center p-4">
        <div
          class="relative bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-lg"
          @click.stop
        >
          <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
            <div>
              <h3 class="text-xl font-bold text-white">Builder Edit Access</h3>
              <p class="text-gray-400 text-sm mt-1">Share the link + passcode with the faculty member.</p>
            </div>
            <button
              @click="showBuilderDialog = false"
              class="text-gray-400 hover:text-white transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="px-6 py-4 space-y-4">
            <div v-if="builderSuccess" class="p-3 bg-green-900 border border-green-700 rounded-lg">
              <p class="text-green-200 text-sm">{{ builderSuccess }}</p>
            </div>
            <div v-if="builderError" class="p-3 bg-red-900 border border-red-700 rounded-lg">
              <p class="text-red-200 text-sm">{{ builderError }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Builder link</label>
              <div class="flex gap-2">
                <input
                  :value="builderLink"
                  readonly
                  class="flex-1 border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 font-mono text-xs"
                />
                <button
                  type="button"
                  class="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  @click="copyText(builderLink)"
                >
                  Copy
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-300">Builder passcode</p>
                <p class="text-xs text-gray-400">Generate/reset to rotate access any time.</p>
              </div>
              <button
                type="button"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                :disabled="builderIsLoading"
                @click="resetBuilderPasscode"
              >
                <span v-if="builderIsLoading">Generating…</span>
                <span v-else>Generate / Reset</span>
              </button>
            </div>

            <div v-if="builderPasscode" class="space-y-2">
              <div class="flex gap-2 items-center">
                <input
                  :value="builderPasscode"
                  readonly
                  class="flex-1 border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 font-mono text-lg tracking-widest"
                />
                <button
                  type="button"
                  class="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  @click="copyText(builderPasscode)"
                >
                  Copy
                </button>
              </div>
              <p class="text-xs text-yellow-300">
                This is shown once. Copy it now.
              </p>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-gray-700 flex justify-end">
            <button
              @click="showBuilderDialog = false"
              class="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
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

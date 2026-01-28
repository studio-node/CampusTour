<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { locationsService } from '../services/locationsService.js'

const route = useRoute()

const locationId = computed(() => route.params.locationId)

const isLoading = ref(true)
const loadError = ref('')

const location = ref(null)

const passcode = ref('')
const unlocked = ref(false)

const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Predefined interests list (same ids as LocationForm)
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

const formData = ref({
  description: '',
  interests: [],
  careers: [],
  talking_points: [],
  features: []
})

const tagInputs = ref({
  careers: '',
  talking_points: '',
  features: ''
})

function populateForm(loc) {
  formData.value = {
    description: loc?.description || '',
    interests: loc?.interests || [],
    careers: loc?.careers || [],
    talking_points: loc?.talking_points || [],
    features: loc?.features || []
  }
  tagInputs.value = { careers: '', talking_points: '', features: '' }
}

function toggleInterest(interestId) {
  const idx = formData.value.interests.indexOf(interestId)
  if (idx > -1) formData.value.interests.splice(idx, 1)
  else formData.value.interests.push(interestId)
}

function isInterestSelected(interestId) {
  return formData.value.interests.includes(interestId)
}

function addTag(field) {
  const input = tagInputs.value[field]
  if (!input || input.trim() === '') return
  const trimmed = input.trim()
  if (!formData.value[field].includes(trimmed)) {
    formData.value[field].push(trimmed)
  }
  tagInputs.value[field] = ''
}

function removeTag(field, index) {
  formData.value[field].splice(index, 1)
}

function handleTagKeydown(event, field) {
  if (event.key === 'Enter') {
    event.preventDefault()
    addTag(field)
  }
}

async function fetchLocation() {
  isLoading.value = true
  loadError.value = ''
  try {
    const data = await locationsService.getLocationById(locationId.value)
    if (!data) {
      loadError.value = 'Location not found.'
      return
    }
    location.value = data
    populateForm(data)
  } catch (e) {
    loadError.value = 'Failed to load location.'
  } finally {
    isLoading.value = false
  }
}

async function unlockForEditing() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!passcode.value.trim()) {
    errorMessage.value = 'Passcode is required.'
    return
  }

  // We validate by performing a no-op-ish update (server allowlist will reject empty patch),
  // so instead we just try updating description to its current value.
  isSubmitting.value = true
  try {
    const patch = { description: formData.value.description || null }
    const result = await locationsService.updateLocationAsBuilder(locationId.value, passcode.value.trim(), patch)
    if (!result.success) {
      errorMessage.value = result.error || 'Invalid passcode.'
      unlocked.value = false
      return
    }
    unlocked.value = true
    successMessage.value = 'Unlocked. You can now edit and submit changes.'
    // Refresh from server (ensures we display canonical values)
    await fetchLocation()
  } finally {
    isSubmitting.value = false
  }
}

async function submitChanges() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!unlocked.value) {
    errorMessage.value = 'Enter the passcode to unlock editing.'
    return
  }
  if (!passcode.value.trim()) {
    errorMessage.value = 'Passcode is required.'
    return
  }

  isSubmitting.value = true
  try {
    const patch = {
      description: formData.value.description.trim() || null,
      interests: formData.value.interests.length > 0 ? formData.value.interests : null,
      careers: formData.value.careers.length > 0 ? formData.value.careers : null,
      talking_points: formData.value.talking_points.length > 0 ? formData.value.talking_points : null,
      features: formData.value.features.length > 0 ? formData.value.features : null
    }

    const result = await locationsService.updateLocationAsBuilder(locationId.value, passcode.value.trim(), patch)
    if (!result.success) {
      errorMessage.value = result.error || 'Failed to submit changes.'
      return
    }

    successMessage.value = 'Changes submitted successfully.'
    await fetchLocation()
  } finally {
    isSubmitting.value = false
  }
}

onMounted(fetchLocation)
</script>

<template>
  <div class="space-y-6">
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Update Location</h1>
        <p class="text-gray-400 mt-1">Edit location content for your building/department.</p>
      </div>
    </div>

    <div v-if="isLoading" class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <p class="text-gray-400">Loading location…</p>
    </div>

    <div v-else-if="loadError" class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <p class="text-red-200">{{ loadError }}</p>
    </div>

    <template v-else>
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <h2 class="text-xl font-bold text-white">{{ location?.name }}</h2>
        <p class="text-gray-400 text-sm mt-1">Location ID: <span class="font-mono">{{ locationId }}</span></p>
      </div>

      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 space-y-4">
        <div v-if="successMessage" class="p-4 bg-green-900 border border-green-700 rounded-lg">
          <p class="text-green-200">{{ successMessage }}</p>
        </div>

        <div v-if="errorMessage" class="p-4 bg-red-900 border border-red-700 rounded-lg">
          <p class="text-red-200">{{ errorMessage }}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-300 mb-2">Passcode *</label>
            <input
              v-model="passcode"
              type="password"
              placeholder="Enter passcode provided by admin"
              class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="button"
            @click="unlockForEditing"
            :disabled="isSubmitting"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            <span v-if="isSubmitting">Checking…</span>
            <span v-else>{{ unlocked ? 'Unlocked' : 'Unlock' }}</span>
          </button>
        </div>
      </div>

      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <form class="space-y-6" @submit.prevent="submitChanges">
          <fieldset :disabled="!unlocked || isSubmitting" class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                v-model="formData.description"
                rows="4"
                placeholder="Brief description of the location…"
                class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Interests</label>
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
                    />
                    <span class="text-sm text-gray-300">{{ interest.name }}</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Careers</label>
              <input
                v-model="tagInputs.careers"
                @keydown="handleTagKeydown($event, 'careers')"
                type="text"
                placeholder="Type and press Enter to add career"
                class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div class="flex flex-wrap gap-2 mt-2">
                <span
                  v-for="(career, index) in formData.careers"
                  :key="index"
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-900 text-purple-200"
                >
                  {{ career }}
                  <button type="button" @click="removeTag('careers', index)" class="ml-2 text-purple-300 hover:text-purple-100">×</button>
                </span>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Talking Points</label>
              <input
                v-model="tagInputs.talking_points"
                @keydown="handleTagKeydown($event, 'talking_points')"
                type="text"
                placeholder="Type and press Enter to add talking point"
                class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div class="flex flex-wrap gap-2 mt-2">
                <span
                  v-for="(point, index) in formData.talking_points"
                  :key="index"
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-900 text-green-200"
                >
                  {{ point }}
                  <button type="button" @click="removeTag('talking_points', index)" class="ml-2 text-green-300 hover:text-green-100">×</button>
                </span>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Features</label>
              <input
                v-model="tagInputs.features"
                @keydown="handleTagKeydown($event, 'features')"
                type="text"
                placeholder="Type and press Enter to add feature"
                class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div class="flex flex-wrap gap-2 mt-2">
                <span
                  v-for="(feature, index) in formData.features"
                  :key="index"
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-900 text-yellow-200"
                >
                  {{ feature }}
                  <button type="button" @click="removeTag('features', index)" class="ml-2 text-yellow-300 hover:text-yellow-100">×</button>
                </span>
              </div>
            </div>
          </fieldset>

          <div class="flex justify-end pt-4 border-t border-gray-700">
            <button
              type="submit"
              :disabled="!unlocked || isSubmitting"
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              <span v-if="isSubmitting">Submitting…</span>
              <span v-else>Submit Changes</span>
            </button>
          </div>
        </form>
      </div>
    </template>
  </div>
</template>


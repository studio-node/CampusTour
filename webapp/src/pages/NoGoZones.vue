<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'
import { locationsService } from '../services/locationsService.js'
import { schoolService } from '../services/schoolService.js'
import DeadzoneMap from '../components/DeadzoneMap.vue'

const router = useRouter()
const { user } = useAuth()

const currentSchoolId = ref(null)
const school = ref(null)
const deadzones = ref([])
const isLoading = ref(false)
const loadError = ref('')
const saveError = ref('')
const isSaving = ref(false)
const selectedIndex = ref(null)

function parseDeadzones(raw) {
  if (raw == null) return []
  if (!Array.isArray(raw)) return []
  const out = []
  for (const item of raw) {
    if (!Array.isArray(item)) continue
    const polygon = []
    for (const pt of item) {
      if (pt && typeof pt === 'object' && typeof pt.latitude === 'number' && typeof pt.longitude === 'number') {
        polygon.push({ latitude: pt.latitude, longitude: pt.longitude })
      }
    }
    if (polygon.length >= 3) out.push(polygon)
  }
  return out
}

async function fetchSchoolId() {
  if (!user.value?.id) return
  try {
    const schoolId = await locationsService.getUserSchoolId(user.value.id)
    currentSchoolId.value = schoolId || null
  } catch (e) {
    console.error('Error fetching school_id:', e)
    loadError.value = 'Could not load your school.'
  }
}

async function fetchSchool() {
  if (!currentSchoolId.value) return
  isLoading.value = true
  loadError.value = ''
  try {
    const data = await schoolService.getSchoolById(currentSchoolId.value)
    school.value = data
    deadzones.value = parseDeadzones(data?.deadzones || [])
  } catch (e) {
    console.error('Error fetching school:', e)
    loadError.value = 'Failed to load school data.'
    deadzones.value = []
  } finally {
    isLoading.value = false
  }
}

function goBack() {
  router.push({ name: 'LocationManagement' })
}

const mapCenter = ref({ lat: 37.7749, lng: -122.4194 })
watch(school, (s) => {
  if (s?.coordinates?.latitude != null && s?.coordinates?.longitude != null) {
    mapCenter.value = { lat: s.coordinates.latitude, lng: s.coordinates.longitude }
  }
}, { immediate: true })

function selectZone(index) {
  selectedIndex.value = index
}

function deleteZone(index) {
  deadzones.value = deadzones.value.filter((_, i) => i !== index)
  if (selectedIndex.value === index) selectedIndex.value = null
  else if (selectedIndex.value != null && selectedIndex.value > index) selectedIndex.value--
}

function validateDeadzones() {
  return deadzones.value.every(p => Array.isArray(p) && p.length >= 3)
}

function getValidDeadzones() {
  return deadzones.value.filter(p => Array.isArray(p) && p.length >= 3)
}

async function saveDeadzones() {
  if (!currentSchoolId.value) return
  const valid = getValidDeadzones()
  if (valid.length === 0 && deadzones.value.length > 0) {
    saveError.value = 'Each zone must have at least 3 points. Fix or remove invalid zones.'
    return
  }
  if (valid.length !== deadzones.value.length) {
    saveError.value = 'Some zones had fewer than 3 points and were omitted.'
  } else {
    saveError.value = ''
  }
  isSaving.value = true
  try {
    await schoolService.updateSchool(currentSchoolId.value, { deadzones: valid })
    deadzones.value = valid
  } catch (e) {
    console.error('Error saving no-go zones:', e)
    saveError.value = e?.message || 'Failed to save.'
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  fetchSchoolId()
})

watch(currentSchoolId, (id) => {
  if (id) fetchSchool()
}, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <div class="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white">No-go Zones</h1>
          <p class="text-gray-400 mt-1">Areas that walking directions will avoid. Draw, edit, or remove zones on the map.</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="goBack"
            class="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to locations
          </button>
          <button
            type="button"
            @click="saveDeadzones"
            :disabled="isSaving || !currentSchoolId"
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isSaving ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
      </div>
      <p v-if="saveError" class="mt-2 text-sm text-red-400">{{ saveError }}</p>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center text-gray-400">
      Loading school data…
    </div>

    <!-- Load error -->
    <div v-else-if="loadError" class="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <p class="text-red-400">{{ loadError }}</p>
      <button type="button" @click="fetchSchool" class="mt-2 text-blue-400 hover:text-blue-300">Try again</button>
    </div>

    <!-- No school -->
    <div v-else-if="!currentSchoolId" class="bg-gray-800 rounded-lg border border-gray-700 p-6 text-gray-400">
      No school associated with your account. You can only manage no-go zones when assigned to a school.
    </div>

    <!-- Map + list -->
    <template v-else>
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 h-[48em]">
        <DeadzoneMap
          :center-lat="mapCenter.lat"
          :center-lng="mapCenter.lng"
          :deadzones="deadzones"
          :selected-index="selectedIndex"
          @update:deadzones="deadzones = $event"
        />
      </div>

      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-white mb-3">No-go zones list</h2>
        <p v-if="deadzones.length === 0" class="text-gray-400">No zones yet. Use the map toolbar to draw a polygon (first button), or use “Edit” to move vertices and “Remove” to delete a zone.</p>
        <ul v-else class="space-y-2">
          <li
            v-for="(zone, index) in deadzones"
            :key="index"
            class="flex items-center justify-between py-2 px-3 rounded-lg transition-colors group"
            :class="selectedIndex === index ? 'bg-gray-600 text-white' : 'hover:bg-gray-700 text-gray-300'"
          >
            <button
              type="button"
              @click.stop="selectZone(index)"
              class="flex-1 text-left flex items-center justify-between"
            >
              <span>No-go zone {{ index + 1 }}</span>
              <span class="text-sm text-gray-400">{{ zone.length }} points</span>
            </button>
            <button
              type="button"
              @click.stop="deleteZone(index)"
              class="ml-2 px-2 py-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded text-sm"
              title="Delete this zone"
            >
              Delete
            </button>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

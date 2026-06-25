<script setup>
import { computed, onMounted, ref } from 'vue'
import draggable from 'vuedraggable'
import { useAuth } from '../composables/useAuth.js'
import { getLocationsBySchool, getUserSchoolId } from '../services/locationsService.js'
import {
  listPreconfiguredToursForSchool,
  createPreconfiguredTour,
  updatePreconfiguredTour,
  deletePreconfiguredTour
} from '../services/tourAppointmentsService.js'

const { user } = useAuth()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')

const schoolId = ref(null)
const tours = ref([])
const schoolLocations = ref([])

// Modal state
const modalOpen = ref(false)
const modalMode = ref('create') // 'create' | 'edit'
const editingId = ref(null)

const form = ref({
  name: '',
  description: '',
  is_active: true
})
const formStops = ref([]) // Array of stop objects currently in the tour

function clearMessages() {
  error.value = ''
  success.value = ''
}

// Locations that haven't been added as stops yet
const availableLocations = computed(() => {
  const addedIds = new Set(formStops.value.map((s) => s.location_id))
  return schoolLocations.value.filter((loc) => !addedIds.has(loc.id))
})

const formIsValid = computed(() => !!form.value.name.trim())

// ---- Data loading ----

async function loadAll() {
  loading.value = true
  error.value = ''
  try {
    const uid = user.value?.id
    if (!uid) throw new Error('Not authenticated.')

    const sid = await getUserSchoolId(uid)
    if (!sid) throw new Error('Your account is not linked to a school.')
    schoolId.value = sid

    const [tourData, locationData] = await Promise.all([
      listPreconfiguredToursForSchool(sid),
      getLocationsBySchool(sid)
    ])
    tours.value = tourData
    schoolLocations.value = locationData
  } catch (e) {
    error.value = e?.message || 'Failed to load data.'
  } finally {
    loading.value = false
  }
}

// ---- Modal open/close ----

function openCreateModal() {
  clearMessages()
  modalMode.value = 'create'
  editingId.value = null
  form.value = { name: '', description: '', is_active: true }
  formStops.value = []
  modalOpen.value = true
}

function openEditModal(tour) {
  clearMessages()
  modalMode.value = 'edit'
  editingId.value = tour.id
  form.value = {
    name: tour.name || '',
    description: tour.description || '',
    is_active: tour.is_active !== false
  }
  // Clone the stops so we can safely mutate them
  const existing = Array.isArray(tour.stops_json) ? tour.stops_json : []
  formStops.value = [...existing].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

// ---- Stop management ----

function addStop(location) {
  formStops.value.push({
    location_id: location.id,
    name: location.name,
    description: location.description || null,
    latitude: location.latitude,
    longitude: location.longitude,
    order_index: formStops.value.length
  })
}

function removeStop(index) {
  formStops.value.splice(index, 1)
}

// ---- CRUD ----

async function handleSave() {
  if (!formIsValid.value || saving.value) return
  clearMessages()
  saving.value = true

  try {
    if (form.value.is_active && formStops.value.length === 0) {
      throw new Error('Active tours must include at least one stop.')
    }

    // Reassign order_index by current list position
    const stops_json = formStops.value.map((stop, i) => ({ ...stop, order_index: i }))

    const payload = {
      school_id: schoolId.value,
      name: form.value.name.trim(),
      description: form.value.description.trim() || null,
      is_active: !!form.value.is_active,
      stops_json
    }

    if (modalMode.value === 'create') {
      payload.created_by = user.value?.id ?? null
      await createPreconfiguredTour(payload)
      success.value = 'Tour created.'
    } else {
      await updatePreconfiguredTour(editingId.value, payload)
      success.value = 'Tour updated.'
    }

    tours.value = await listPreconfiguredToursForSchool(schoolId.value)
    closeModal()
  } catch (e) {
    error.value = e?.message || 'Failed to save tour.'
  } finally {
    saving.value = false
  }
}

async function handleDelete(tour) {
  clearMessages()
  const ok = window.confirm(`Delete "${tour.name}"? This cannot be undone.`)
  if (!ok) return

  try {
    await deletePreconfiguredTour(tour.id)
    success.value = 'Tour deleted.'
    tours.value = await listPreconfiguredToursForSchool(schoolId.value)
  } catch (e) {
    error.value = e?.message || 'Failed to delete tour.'
  }
}

onMounted(loadAll)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white">Tour Templates</h1>
          <p class="text-gray-400 mt-1">Create named tour templates that ambassadors select when starting a tour.</p>
        </div>
        <button
          type="button"
          class="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          @click="openCreateModal"
        >
          New Template
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4"></div>
      <p class="text-gray-400">Loading templates...</p>
    </div>

    <div v-else class="space-y-4">
      <!-- Messages -->
      <div v-if="success" class="p-4 bg-green-900 border border-green-700 rounded-lg">
        <p class="text-green-200">{{ success }}</p>
      </div>
      <div v-if="error && !modalOpen" class="p-4 bg-red-900 border border-red-700 rounded-lg">
        <p class="text-red-200">{{ error }}</p>
      </div>

      <!-- Empty state -->
      <div v-if="tours.length === 0" class="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
        <p class="text-gray-400 text-lg mb-2">No tour templates yet</p>
        <p class="text-gray-500 text-sm">Create a template to let ambassadors start tours on their phones.</p>
      </div>

      <!-- Tour list -->
      <div v-else class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
        <div class="divide-y divide-gray-700">
          <div
            v-for="tour in tours"
            :key="tour.id"
            class="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-white font-medium">{{ tour.name }}</h3>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="tour.is_active ? 'bg-green-900 text-green-200' : 'bg-gray-700 text-gray-300'"
                >
                  {{ tour.is_active ? 'active' : 'inactive' }}
                </span>
              </div>
              <p class="text-sm text-gray-400 mt-1 truncate">{{ tour.description || 'No description' }}</p>
              <p class="text-xs text-gray-500 mt-1">
                {{ Array.isArray(tour.stops_json) ? tour.stops_json.length : 0 }} stop{{ (Array.isArray(tour.stops_json) ? tour.stops_json.length : 0) === 1 ? '' : 's' }}
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                type="button"
                class="px-3 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors text-sm"
                @click="openEditModal(tour)"
              >
                Edit
              </button>
              <button
                type="button"
                class="px-3 py-1 rounded bg-red-700 text-white hover:bg-red-600 transition-colors text-sm"
                @click="handleDelete(tour)"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="closeModal" />

      <div class="relative w-full max-w-2xl bg-gray-800 border border-gray-700 rounded-lg shadow-xl flex flex-col max-h-[90vh]">
        <!-- Modal header -->
        <div class="p-5 border-b border-gray-700 flex items-center justify-between shrink-0">
          <h3 class="text-lg font-semibold text-white">
            {{ modalMode === 'create' ? 'Create Tour Template' : 'Edit Tour Template' }}
          </h3>
          <button type="button" class="text-gray-400 hover:text-white" @click="closeModal" title="Close">✕</button>
        </div>

        <!-- Modal body (scrollable) -->
        <div class="p-5 space-y-5 overflow-y-auto">
          <!-- Error inside modal -->
          <div v-if="error" class="p-3 bg-red-900 border border-red-700 rounded-lg">
            <p class="text-red-200 text-sm">{{ error }}</p>
          </div>

          <!-- Name -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Name <span class="text-red-400">*</span></label>
            <input
              v-model="form.name"
              @input="clearMessages"
              type="text"
              placeholder="e.g., STEM Tour, Student Life, General Tour"
              class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              v-model="form.description"
              @input="clearMessages"
              rows="2"
              placeholder="Optional — shown to ambassadors when selecting a tour"
              class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <!-- Active toggle -->
          <label class="inline-flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              v-model="form.is_active"
              type="checkbox"
              class="rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
            />
            Template is active (visible to ambassadors)
          </label>

          <!-- Stop builder -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <label class="text-sm font-medium text-gray-300">Stops</label>
              <span class="text-xs text-gray-500">{{ formStops.length }} stop{{ formStops.length === 1 ? '' : 's' }} — drag to reorder</span>
            </div>

            <!-- Draggable stop list -->
            <div class="rounded-lg border border-gray-600 overflow-hidden bg-gray-900 mb-3">
              <draggable
                v-model="formStops"
                item-key="location_id"
                handle=".drag-handle"
                ghost-class="opacity-40"
                class="divide-y divide-gray-700"
              >
                <template #item="{ element, index }">
                  <div class="flex items-center gap-3 px-3 py-2.5 bg-gray-800 hover:bg-gray-750">
                    <span class="drag-handle cursor-grab text-gray-500 hover:text-gray-300 select-none shrink-0" title="Drag to reorder">☰</span>
                    <span class="flex-1 text-sm text-white truncate">{{ element.name }}</span>
                    <button
                      type="button"
                      class="text-gray-500 hover:text-red-400 transition-colors shrink-0 text-lg leading-none"
                      title="Remove stop"
                      @click="removeStop(index)"
                    >✕</button>
                  </div>
                </template>

                <template #header>
                  <div v-if="formStops.length === 0" class="px-3 py-4 text-sm text-gray-500 text-center">
                    No stops added yet. Select a location below to add one.
                  </div>
                </template>
              </draggable>
            </div>

            <!-- Add stop dropdown -->
            <div>
              <label class="block text-xs text-gray-400 mb-1">Add a stop</label>
              <select
                class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                @change="(e) => { const loc = schoolLocations.find(l => l.id === e.target.value); if (loc) addStop(loc); e.target.value = '' }"
              >
                <option value="">— select a location to add —</option>
                <option
                  v-for="loc in availableLocations"
                  :key="loc.id"
                  :value="loc.id"
                >
                  {{ loc.name }}
                </option>
              </select>
              <p v-if="availableLocations.length === 0 && schoolLocations.length > 0" class="text-xs text-gray-500 mt-1">
                All locations have been added.
              </p>
            </div>
          </div>
        </div>

        <!-- Modal footer -->
        <div class="p-5 border-t border-gray-700 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors"
            @click="closeModal"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            :disabled="!formIsValid || saving"
            @click="handleSave"
          >
            <span v-if="saving">{{ modalMode === 'create' ? 'Creating…' : 'Saving…' }}</span>
            <span v-else>{{ modalMode === 'create' ? 'Create Template' : 'Save Template' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hover\:bg-gray-750:hover {
  background-color: rgba(55, 65, 81, 0.6);
}
</style>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { DateTime } from 'luxon'
import { useAuth } from '../composables/useAuth.js'
import { getUserSchoolId } from '../services/locationsService.js'
import { schoolService } from '../services/schoolService.js'
import { supabase } from '../supabase.js'
import {
  listAmbassadorsForSchool,
  listAppointmentsForSchool,
  listMyScheduledAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment
} from '../services/tourAppointmentsService.js'

const { user } = useAuth()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')

const schoolId = ref(null)
const school = ref(null)
const schoolTimezone = ref(null)
const timezoneIsFallback = ref(false)

const viewMode = ref('list') // 'list' | 'calendar'

const myRole = ref(null)
const isAdmin = computed(() => {
  const r = (myRole.value || '').toString().trim().toLowerCase()
  return r === 'admin' || r === 'super_admin' || r === 'super-admin' || r === 'super admin'
})

const ambassadors = ref([])
const appointments = ref([])

const calendarMonth = ref(DateTime.local().startOf('month'))
const selectedCalendarDate = ref(null) // DateTime (school tz) or null

const modalOpen = ref(false)
const modalMode = ref('create') // 'create' | 'edit'
const editingAppointmentId = ref(null)

const form = ref({
  title: '',
  date: '',
  time: '',
  ambassadorId: '',
  status: 'scheduled'
})

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]

const timeOptions = computed(() => {
  const items = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      items.push(`${hh}:${mm}`)
    }
  }
  return items
})

function clearMessages() {
  error.value = ''
  success.value = ''
}

function getEffectiveTimezone() {
  return schoolTimezone.value || DateTime.local().zoneName
}

function parseScheduledDate(value) {
  if (!value) return DateTime.invalid('missing scheduled_date')
  if (value instanceof Date) return DateTime.fromJSDate(value, { setZone: true })

  const str = String(value)

  // PostgREST often returns ISO, but some environments surface SQL timestamps like:
  // "2025-07-30 09:00:00+00"
  let dt = DateTime.fromISO(str, { setZone: true })
  if (dt.isValid) return dt

  dt = DateTime.fromSQL(str, { setZone: true })
  if (dt.isValid) return dt

  // last-ditch: convert "YYYY-MM-DD HH:mm:ss+00" -> "YYYY-MM-DDTHH:mm:ss+00"
  if (str.includes(' ') && !str.includes('T')) {
    const guess = str.replace(' ', 'T')
    dt = DateTime.fromISO(guess, { setZone: true })
    if (dt.isValid) return dt
  }

  return dt
}

function formatInSchoolTz(isoString) {
  const tz = getEffectiveTimezone()
  return parseScheduledDate(isoString).setZone(tz)
}

function appointmentToFormValues(appt) {
  const dt = formatInSchoolTz(appt.scheduled_date)
  return {
    title: appt.title || '',
    date: dt.toFormat('yyyy-LL-dd'),
    time: dt.toFormat('HH:mm'),
    ambassadorId: appt.ambassador_id || '',
    status: appt.status || 'scheduled'
  }
}

function openCreateModal() {
  clearMessages()
  modalMode.value = 'create'
  editingAppointmentId.value = null
  form.value = {
    title: '',
    date: DateTime.local().toFormat('yyyy-LL-dd'),
    time: '09:00',
    ambassadorId: '',
    status: 'scheduled'
  }
  modalOpen.value = true
}

function openEditModal(appt) {
  clearMessages()
  modalMode.value = 'edit'
  editingAppointmentId.value = appt.id
  form.value = appointmentToFormValues(appt)
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

const formIsValid = computed(() => {
  return !!form.value.title.trim() && !!form.value.date && !!form.value.time
})

async function loadSchoolContext() {
  if (!user.value?.id) return

  const sid = await getUserSchoolId(user.value.id)
  schoolId.value = sid
  if (!sid) {
    throw new Error('Your account is not linked to a school (missing profiles.school_id).')
  }

  // Also read the caller's role (RLS should allow reading own profile row)
  const { data: myProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.value.id)
    .maybeSingle()
  if (!profileError) {
    myRole.value = myProfile?.role ?? null
  }

  const s = await schoolService.getSchoolById(sid)
  school.value = s

  const candidate = typeof s?.timezone === 'string' ? s.timezone.trim() : ''
  if (candidate && DateTime.now().setZone(candidate).isValid) {
    schoolTimezone.value = candidate
    timezoneIsFallback.value = false
    return
  }

  schoolTimezone.value = null
  timezoneIsFallback.value = true
}

async function loadAmbassadors() {
  if (!isAdmin.value) {
    ambassadors.value = []
    return
  }
  ambassadors.value = await listAmbassadorsForSchool(schoolId.value)
}

async function loadAppointmentsForMonth() {
  if (!isAdmin.value) {
    // Ambassador read-only view: just show their scheduled upcoming appointments.
    appointments.value = await listMyScheduledAppointments({ startIso: new Date().toISOString() })
    return
  }

  const tz = getEffectiveTimezone()
  const monthStart = calendarMonth.value.setZone(tz).startOf('month')
  const monthEnd = calendarMonth.value.setZone(tz).endOf('month')

  // Query in UTC boundaries, derived from school-local month boundaries
  const startIso = monthStart.toUTC().toISO()
  const endIso = monthEnd.toUTC().toISO()

  appointments.value = await listAppointmentsForSchool({
    schoolId: schoolId.value,
    startIso,
    endIso
  })
}

async function refreshAll() {
  loading.value = true
  error.value = ''
  try {
    await loadSchoolContext()
    await Promise.all([loadAmbassadors(), loadAppointmentsForMonth()])
  } catch (e) {
    console.error(e)
    error.value = e?.message || 'Failed to load tour appointments.'
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  if (!isAdmin.value) return
  if (!formIsValid.value || saving.value) return
  clearMessages()
  saving.value = true

  try {
    const tz = getEffectiveTimezone()
    const localDateTime = DateTime.fromFormat(
      `${form.value.date} ${form.value.time}`,
      'yyyy-LL-dd HH:mm',
      { zone: tz }
    )
    if (!localDateTime.isValid) throw new Error('Invalid date/time.')

    const scheduled_date = localDateTime.toUTC().toISO()

    const payload = {
      title: form.value.title.trim(),
      ambassador_id: form.value.ambassadorId || null,
      school_id: schoolId.value,
      scheduled_date,
      status: form.value.status || 'scheduled'
    }

    if (modalMode.value === 'create') {
      await createAppointment(payload)
      success.value = 'Appointment created.'
    } else {
      await updateAppointment(editingAppointmentId.value, payload)
      success.value = 'Appointment updated.'
    }

    await loadAppointmentsForMonth()
    modalOpen.value = false
  } catch (e) {
    console.error(e)
    error.value = e?.message || 'Failed to save appointment.'
  } finally {
    saving.value = false
  }
}

async function handleDelete(appt) {
  if (!isAdmin.value) return
  clearMessages()
  const ok = window.confirm('Delete this appointment? This cannot be undone.')
  if (!ok) return

  try {
    await deleteAppointment(appt.id)
    success.value = 'Appointment deleted.'
    await loadAppointmentsForMonth()
  } catch (e) {
    console.error(e)
    error.value = e?.message || 'Failed to delete appointment.'
  }
}

const appointmentsSorted = computed(() => {
  const tz = getEffectiveTimezone()
  return [...appointments.value].sort((a, b) => {
    const at = parseScheduledDate(a.scheduled_date).setZone(tz).toMillis()
    const bt = parseScheduledDate(b.scheduled_date).setZone(tz).toMillis()
    return at - bt
  })
})

const appointmentsForSelectedDay = computed(() => {
  if (!selectedCalendarDate.value) return []
  const tz = getEffectiveTimezone()
  const day = selectedCalendarDate.value.setZone(tz).toFormat('yyyy-LL-dd')
  return appointmentsSorted.value.filter(a => formatInSchoolTz(a.scheduled_date).toFormat('yyyy-LL-dd') === day)
})

const calendarGrid = computed(() => {
  const tz = getEffectiveTimezone()
  const start = calendarMonth.value.setZone(tz).startOf('month')
  const end = calendarMonth.value.setZone(tz).endOf('month')
  const daysInMonth = end.day

  // Luxon weekday: 1=Mon..7=Sun. We want grid starting Sunday=0..Saturday=6
  const firstWeekdayIndex = start.weekday % 7

  const cells = []
  for (let i = 0; i < firstWeekdayIndex; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(start.set({ day: d }))
  }

  // pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
})

function isSameDay(a, b) {
  if (!a || !b) return false
  return a.toFormat('yyyy-LL-dd') === b.toFormat('yyyy-LL-dd')
}

function appointmentsOnDay(day) {
  if (!day) return []
  const key = day.toFormat('yyyy-LL-dd')
  return appointmentsSorted.value.filter(a => formatInSchoolTz(a.scheduled_date).toFormat('yyyy-LL-dd') === key)
}

function prevMonth() {
  selectedCalendarDate.value = null
  calendarMonth.value = calendarMonth.value.minus({ months: 1 }).startOf('month')
}

function nextMonth() {
  selectedCalendarDate.value = null
  calendarMonth.value = calendarMonth.value.plus({ months: 1 }).startOf('month')
}

watch(calendarMonth, async () => {
  if (!schoolId.value) return
  if (!isAdmin.value) return
  try {
    await loadAppointmentsForMonth()
  } catch (e) {
    console.error(e)
    error.value = e?.message || 'Failed to load appointments.'
  }
})

onMounted(async () => {
  await refreshAll()
})
</script>

<template>
  <div class="space-y-6">
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white">Tour Appointments</h1>
          <p class="text-gray-400 mt-1">Create, edit, and manage ambassador-led tour appointments.</p>
          <p v-if="school?.name" class="text-sm text-gray-500 mt-2">
            School: <span class="text-gray-300">{{ school.name }}</span>
            <span v-if="timezoneIsFallback" class="ml-2 text-yellow-300">
              (timezone not set for this school — using your browser timezone)
            </span>
            <span v-else-if="schoolTimezone" class="ml-2 text-gray-500">
              (timezone: {{ schoolTimezone }})
            </span>
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div class="inline-flex rounded-lg border border-gray-700 bg-gray-900 overflow-hidden">
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium"
              :class="viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'"
              @click="viewMode = 'list'"
            >
              List
            </button>
            <button
              type="button"
              class="px-4 py-2 text-sm font-medium"
              :class="viewMode === 'calendar' ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'"
              @click="viewMode = 'calendar'"
              :disabled="!isAdmin"
              :title="!isAdmin ? 'Calendar view is available to admins only' : ''"
            >
              Calendar
            </button>
          </div>

          <button
            v-if="isAdmin"
            type="button"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            @click="openCreateModal"
          >
            Create Appointment
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
      <p class="text-gray-400">Loading appointments...</p>
    </div>

    <div v-else class="space-y-4">
      <div v-if="success" class="p-4 bg-green-900 border border-green-700 rounded-lg">
        <p class="text-green-200">{{ success }}</p>
      </div>
      <div v-if="error" class="p-4 bg-red-900 border border-red-700 rounded-lg">
        <p class="text-red-200">{{ error }}</p>
      </div>

      <!-- List view -->
      <div v-if="viewMode === 'list'" class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
        <div class="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-white">Appointments</h2>
          <button
            type="button"
            class="text-gray-300 hover:text-white text-sm"
            @click="refreshAll"
          >
            Refresh
          </button>
        </div>

        <div v-if="appointmentsSorted.length === 0" class="p-8 text-center text-gray-400">
          No appointments found for this month.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-700">
            <thead class="bg-gray-900">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">When</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Title</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ambassador</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-gray-800 divide-y divide-gray-700">
              <tr v-for="appt in appointmentsSorted" :key="appt.id" class="hover:bg-gray-750">
                <td class="px-4 py-3 text-sm text-gray-200">
                  <div class="text-white font-medium">
                    {{ formatInSchoolTz(appt.scheduled_date).toFormat('ccc, LLL d, yyyy') }}
                  </div>
                  <div class="text-gray-400">
                    {{ formatInSchoolTz(appt.scheduled_date).toFormat('h:mm a') }}
                  </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-200">
                  <span class="text-white font-medium">{{ appt.title || '(Untitled)' }}</span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-200">
                  <span class="text-gray-200">{{ appt.profiles?.full_name || 'TBA' }}</span>
                </td>
                <td class="px-4 py-3 text-sm">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="appt.status === 'scheduled'
                      ? 'bg-blue-900 text-blue-200'
                      : appt.status === 'active'
                        ? 'bg-green-900 text-green-200'
                        : appt.status === 'completed'
                          ? 'bg-gray-700 text-gray-200'
                          : 'bg-red-900 text-red-200'"
                  >
                    {{ appt.status }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-right space-x-2">
                  <template v-if="isAdmin">
                    <button
                      type="button"
                      class="px-3 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
                      @click="openEditModal(appt)"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      class="px-3 py-1 rounded bg-red-700 text-white hover:bg-red-600"
                      @click="handleDelete(appt)"
                    >
                      Delete
                    </button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Calendar view -->
      <div v-else-if="isAdmin" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
          <div class="p-4 border-b border-gray-700 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <button type="button" class="px-3 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600" @click="prevMonth">Prev</button>
              <button type="button" class="px-3 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600" @click="nextMonth">Next</button>
            </div>
            <div class="text-white font-semibold">
              {{ calendarMonth.setZone(getEffectiveTimezone()).toFormat('LLLL yyyy') }}
            </div>
            <button type="button" class="text-gray-300 hover:text-white text-sm" @click="refreshAll">Refresh</button>
          </div>

          <div class="grid grid-cols-7 gap-px bg-gray-700">
            <div class="bg-gray-900 p-2 text-xs text-gray-300 text-center">Sun</div>
            <div class="bg-gray-900 p-2 text-xs text-gray-300 text-center">Mon</div>
            <div class="bg-gray-900 p-2 text-xs text-gray-300 text-center">Tue</div>
            <div class="bg-gray-900 p-2 text-xs text-gray-300 text-center">Wed</div>
            <div class="bg-gray-900 p-2 text-xs text-gray-300 text-center">Thu</div>
            <div class="bg-gray-900 p-2 text-xs text-gray-300 text-center">Fri</div>
            <div class="bg-gray-900 p-2 text-xs text-gray-300 text-center">Sat</div>

            <button
              v-for="(day, idx) in calendarGrid"
              :key="idx"
              type="button"
              class="bg-gray-800 p-2 text-left hover:bg-gray-750 min-h-[86px]"
              :class="day && isSameDay(day, selectedCalendarDate) ? 'ring-2 ring-blue-500' : ''"
              @click="day ? (selectedCalendarDate = day) : null"
              :disabled="!day"
            >
              <div v-if="day" class="flex items-center justify-between">
                <div class="text-sm font-medium" :class="day.hasSame(DateTime.local(), 'day') ? 'text-blue-300' : 'text-white'">
                  {{ day.day }}
                </div>
                <div v-if="appointmentsOnDay(day).length" class="text-xs text-gray-300">
                  {{ appointmentsOnDay(day).length }}
                </div>
              </div>

              <div v-if="day" class="mt-2 space-y-1">
                <div
                  v-for="appt in appointmentsOnDay(day).slice(0, 2)"
                  :key="appt.id"
                  class="text-[11px] truncate text-gray-300"
                  :title="appt.title || ''"
                >
                  {{ formatInSchoolTz(appt.scheduled_date).toFormat('h:mm a') }} — {{ appt.title || '(Untitled)' }}
                </div>
                <div v-if="appointmentsOnDay(day).length > 2" class="text-[11px] text-gray-400">
                  +{{ appointmentsOnDay(day).length - 2 }} more
                </div>
              </div>
            </button>
          </div>
        </div>

        <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
          <div class="p-4 border-b border-gray-700">
            <h2 class="text-lg font-semibold text-white">
              {{ selectedCalendarDate ? selectedCalendarDate.toFormat('ccc, LLL d') : 'Select a day' }}
            </h2>
            <p class="text-sm text-gray-400 mt-1" v-if="selectedCalendarDate">
              {{ appointmentsForSelectedDay.length }} appointment(s)
            </p>
          </div>

          <div class="p-4 space-y-3">
            <div v-if="!selectedCalendarDate" class="text-gray-400 text-sm">
              Click a day in the calendar to view appointments.
            </div>
            <div v-else-if="appointmentsForSelectedDay.length === 0" class="text-gray-400 text-sm">
              No appointments on this day.
            </div>
            <div v-else class="space-y-2">
              <div v-for="appt in appointmentsForSelectedDay" :key="appt.id" class="border border-gray-700 rounded-lg p-3">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="text-white font-medium truncate">{{ appt.title || '(Untitled)' }}</div>
                    <div class="text-gray-400 text-sm">
                      {{ formatInSchoolTz(appt.scheduled_date).toFormat('h:mm a') }} · {{ appt.profiles?.full_name || 'TBA' }}
                    </div>
                  </div>
                  <div class="flex gap-2 shrink-0" v-if="isAdmin">
                    <button
                      type="button"
                      class="px-3 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
                      @click="openEditModal(appt)"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      class="px-3 py-1 rounded bg-red-700 text-white hover:bg-red-600"
                      @click="handleDelete(appt)"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 text-gray-300">
        Calendar view is available to admins only.
      </div>
    </div>

    <!-- Modal -->
    <div v-if="modalOpen && isAdmin" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="closeModal" />

      <div class="relative w-full max-w-2xl bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
        <div class="p-5 border-b border-gray-700 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">
            {{ modalMode === 'create' ? 'Create Appointment' : 'Edit Appointment' }}
          </h3>
          <button type="button" class="text-gray-300 hover:text-white" @click="closeModal" title="Close">✕</button>
        </div>

        <div class="p-5 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-300 mb-2">Title *</label>
              <input
                v-model="form.title"
                @input="clearMessages"
                type="text"
                placeholder="e.g., Campus Tour (Engineering)"
                class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Date *</label>
              <input
                v-model="form.date"
                @input="clearMessages"
                type="date"
                class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Time *</label>
              <select
                v-model="form.time"
                @change="clearMessages"
                class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Select time</option>
                <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
              </select>
              <p class="text-xs text-gray-400 mt-1">Times are in the school’s local timezone.</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Assigned Ambassador</label>
              <select
                v-model="form.ambassadorId"
                @change="clearMessages"
                class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">TBA</option>
                <option v-for="a in ambassadors" :key="a.id" :value="a.id">
                  {{ a.full_name }}<span v-if="a.email"> ({{ a.email }})</span>
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                v-model="form.status"
                @change="clearMessages"
                class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>
          </div>

          <div v-if="error" class="p-3 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
            {{ error }}
          </div>
        </div>

        <div class="p-5 border-t border-gray-700 flex items-center justify-end gap-3">
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600"
            @click="closeModal"
          >
            Cancel
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            :disabled="!formIsValid || saving"
            @click="handleSave"
          >
            <span v-if="saving">{{ modalMode === 'create' ? 'Creating…' : 'Saving…' }}</span>
            <span v-else>{{ modalMode === 'create' ? 'Create' : 'Save' }}</span>
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


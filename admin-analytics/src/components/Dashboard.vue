<template>
  <DashboardLayout>
    
    <!-- Stats Cards -->
    <template #stats-cards>
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <KPICard
          :value="dashboardStats.totalTours"
          label="Total Tours"
          icon="🚶"
          :loading="statsLoading"
          :error="statsError"
          format="number"
        />
      </div>
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <KPICard
          :value="dashboardStats.activeSchools"
          label="Active Schools"
          icon="🏫"
          :loading="statsLoading"
          :error="statsError"
          format="number"
        />
      </div>
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <KPICard
          :value="dashboardStats.avgDuration"
          label="Avg Duration"
          icon="⏱️"
          :loading="statsLoading"
          :error="statsError"
          format="duration"
          subtitle="minutes per tour"
        />
      </div>
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <KPICard
          :value="dashboardStats.completionRate"
          label="Completion Rate"
          icon="✅"
          :loading="statsLoading"
          :error="statsError"
          format="percentage"
          :precision="1"
        />
      </div>
    </template>

    <!-- Interests Chart -->
    <template #interests-chart>
      <BarChart
        :data="interestsData.data"
        :labels="interestsData.labels"
        title="Student Interests"
        horizontal
        :loading="interestsLoading"
        :error="interestsError"
        empty-message="No interest data available"
      />
    </template>

    <!-- Demo button for testing -->
    <template #interests-actions>
      <button 
        @click="loadInterestsData"
        :disabled="interestsLoading"
        class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
      >
        {{ interestsLoading ? 'Loading...' : 'Refresh' }}
      </button>
    </template>

    <!-- Locations Chart -->
    <template #locations-chart>
      <BarChart
        :data="locationsData.data"
        :labels="locationsData.labels"
        title="Average Visit Time (minutes)"
        :loading="locationsLoading"
        :error="locationsError"
        empty-message="No location data available"
      />
    </template>

    <!-- Locations Actions -->
    <template #locations-actions>
      <button 
        @click="loadLocationsData"
        :disabled="locationsLoading"
        class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
      >
        {{ locationsLoading ? 'Loading...' : 'Refresh' }}
      </button>
    </template>

    <!-- Tours Chart -->
    <template #tours-chart>
      <PieChart
        :data="toursData.data"
        :labels="toursData.labels"
        title="Tour Completion"
        :loading="toursLoading"
        :error="toursError"
        empty-message="No tour completion data available"
      />
    </template>

    <!-- Tours Actions -->
    <template #tours-actions>
      <button 
        @click="loadToursData"
        :disabled="toursLoading"
        class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
      >
        {{ toursLoading ? 'Loading...' : 'Refresh' }}
      </button>
    </template>

    <!-- Times Chart -->
    <template #times-chart>
      <AreaChart
        :data="timesData.data"
        :labels="timesData.labels"
        title="Tours by Time"
        color="#10B981"
        y-axis-label="Number of Tours"
        :loading="timesLoading"
        :error="timesError"
        empty-message="No time data available"
      />
    </template>

    <!-- Times Actions -->
    <template #times-actions>
      <button 
        @click="loadTimesData"
        :disabled="timesLoading"
        class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
      >
        {{ timesLoading ? 'Loading...' : 'Refresh' }}
      </button>
    </template>

    <!-- Tour Length Content -->
    <template #tour-length-content>
      <div class="h-full flex flex-col">
        <!-- KPI Summary -->
        <div class="mb-4 text-center">
          <div class="text-3xl font-bold text-blue-400 mb-1">
            {{ tourLengthData.average }}min
          </div>
          <div class="text-sm text-gray-400">
            Average Tour Length
          </div>
          <div class="text-xs text-gray-500 mt-1">
            Based on {{ tourLengthData.completedTours }} completed tours
          </div>
        </div>
        
        <!-- Area Chart for Duration Distribution -->
        <div class="flex-1">
          <AreaChart
            v-if="tourLengthData.distributionData && tourLengthData.distributionData.length > 0"
            :data="tourLengthData.distributionData"
            :labels="tourLengthData.distributionLabels"
            title="Tour Duration Distribution"
            color="#8B5CF6"
            y-axis-label="Number of Tours"
            :loading="tourLengthLoading"
            :error="tourLengthError"
            empty-message="No tour length data available"
          />
          <div v-else-if="tourLengthLoading" class="flex items-center justify-center h-full">
            <div class="text-center">
              <div class="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p class="text-gray-400 text-sm">Loading...</p>
            </div>
          </div>
          <div v-else class="flex items-center justify-center h-full text-gray-500">
            <p>No distribution data available</p>
          </div>
        </div>
      </div>
    </template>

    <!-- Tour Length Actions -->
    <template #tour-length-actions>
      <button 
        @click="loadTourLengthData"
        :disabled="tourLengthLoading"
        class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
      >
        {{ tourLengthLoading ? 'Loading...' : 'Refresh' }}
      </button>
    </template>

    <!-- Schools Chart -->
    <template #schools-chart>
      <BarChart
        :data="schoolsData.data"
        :labels="schoolsData.labels"
        title="Tours per School"
        horizontal
        :loading="schoolsLoading"
        :error="schoolsError"
        empty-message="No school data available"
      />
    </template>

    <!-- Schools Actions -->
    <template #schools-actions>
      <button 
        @click="loadSchoolsData"
        :disabled="schoolsLoading"
        class="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded"
      >
        {{ schoolsLoading ? 'Loading...' : 'Refresh' }}
      </button>
    </template>
  </DashboardLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import DashboardLayout from './DashboardLayout.vue'
import { BarChart, PieChart, AreaChart, KPICard } from './charts'
import {
  getInterestsPopularity,
  getLocationsPopularity,
  getTourCompletion,
  getPopularTimes,
  getSchoolsVisited,
  getAverageTourLength,
  getDashboardStats
} from '../services/analyticsService.js'

// Data state
const interestsData = ref({ data: [], labels: [] })
const locationsData = ref({ data: [], labels: [] })
const toursData = ref({ data: [], labels: [] })
const timesData = ref({ data: [], labels: [] })
const schoolsData = ref({ data: [], labels: [] })
const tourLengthData = ref({ average: 0, completedTours: 0 })
const dashboardStats = ref({
  totalTours: 0,
  activeSchools: 0,
  avgDuration: 0,
  completionRate: 0
})

// Loading states
const interestsLoading = ref(false)
const locationsLoading = ref(false)
const toursLoading = ref(false)
const timesLoading = ref(false)
const schoolsLoading = ref(false)
const tourLengthLoading = ref(false)
const statsLoading = ref(false)

// Error states
const interestsError = ref(null)
const locationsError = ref(null)
const toursError = ref(null)
const timesError = ref(null)
const schoolsError = ref(null)
const tourLengthError = ref(null)
const statsError = ref(null)

// Load interests data
async function loadInterestsData() {
  interestsLoading.value = true
  interestsError.value = null
  
  try {
    console.log('Loading interests data...')
    const data = await getInterestsPopularity()
    console.log('Interests data loaded:', data)
    interestsData.value = data
  } catch (error) {
    interestsError.value = 'Failed to load interests data'
    console.error('Error loading interests:', error)
  } finally {
    interestsLoading.value = false
  }
}

// Load locations data
async function loadLocationsData() {
  locationsLoading.value = true
  locationsError.value = null
  
  try {
    const data = await getLocationsPopularity()
    locationsData.value = data
  } catch (error) {
    locationsError.value = 'Failed to load locations data'
    console.error('Error loading locations:', error)
  } finally {
    locationsLoading.value = false
  }
}

// Load tour completion data
async function loadToursData() {
  toursLoading.value = true
  toursError.value = null
  
  try {
    console.log('Loading tours completion data...')
    const data = await getTourCompletion()
    console.log('Tours completion data loaded:', data)
    toursData.value = data
  } catch (error) {
    toursError.value = 'Failed to load tour data'
    console.error('Error loading tours:', error)
  } finally {
    toursLoading.value = false
  }
}

// Load popular times data
async function loadTimesData() {
  timesLoading.value = true
  timesError.value = null
  
  try {
    const data = await getPopularTimes()
    timesData.value = data
  } catch (error) {
    timesError.value = 'Failed to load time data'
    console.error('Error loading times:', error)
  } finally {
    timesLoading.value = false
  }
}

// Load schools data
async function loadSchoolsData() {
  schoolsLoading.value = true
  schoolsError.value = null
  
  try {
    const data = await getSchoolsVisited()
    schoolsData.value = data
  } catch (error) {
    schoolsError.value = 'Failed to load schools data'
    console.error('Error loading schools:', error)
  } finally {
    schoolsLoading.value = false
  }
}

// Load tour length data
async function loadTourLengthData() {
  tourLengthLoading.value = true
  tourLengthError.value = null
  
  try {
    console.log('Loading tour length data...')
    const data = await getAverageTourLength()
    console.log('Tour length data loaded:', data)
    tourLengthData.value = data
  } catch (error) {
    tourLengthError.value = 'Failed to load tour length data'
    console.error('Error loading tour length:', error)
  } finally {
    tourLengthLoading.value = false
  }
}

// Load dashboard stats
async function loadDashboardStats() {
  statsLoading.value = true
  statsError.value = null
  
  try {
    console.log('Loading dashboard stats...')
    const data = await getDashboardStats()
    console.log('Dashboard stats loaded:', data)
    dashboardStats.value = data
  } catch (error) {
    statsError.value = 'Failed to load dashboard stats'
    console.error('Error loading stats:', error)
  } finally {
    statsLoading.value = false
  }
}

// Load all data
async function loadAllData() {
  // Load all data in parallel for better performance
  await Promise.all([
    loadInterestsData(),
    loadLocationsData(), 
    loadToursData(),
    loadTimesData(),
    loadSchoolsData(),
    loadTourLengthData(),
    loadDashboardStats()
  ])
}

// Refresh all data
function refreshData() {
  loadAllData()
}

// Load data on mount
onMounted(async () => {
  console.log('Dashboard mounted, loading data...')
  await Promise.all([
    loadInterestsData(),
    loadLocationsData(),
    loadToursData(),
    loadTimesData(),
    loadSchoolsData(),
    loadTourLengthData(),
    loadDashboardStats()
  ])
})

// Expose refresh function for parent components
defineExpose({
  refreshData
})
</script>

<style scoped>
/* Component-specific styles if needed */
</style> 
<template>
  <div class="min-h-screen bg-gray-900 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-white mb-8">Supabase Connection Test</h1>
      
      <!-- Test Buttons -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 mb-8">
        <button 
          @click="testConnection"
          :disabled="testing"
          class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white p-4 rounded-lg"
        >
          {{ testing ? 'Testing...' : 'Test Connection' }}
        </button>
        
        <button 
          @click="testInterests"
          :disabled="testing"
          class="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white p-4 rounded-lg"
        >
          {{ testing ? 'Loading...' : 'Test Interests Query' }}
        </button>
        
        <button 
          @click="testLocations"
          :disabled="testing"
          class="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white p-4 rounded-lg"
        >
          {{ testing ? 'Loading...' : 'Test Locations Query' }}
        </button>
        
        <button 
          @click="testTours"
          :disabled="testing"
          class="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white p-4 rounded-lg"
        >
          {{ testing ? 'Loading...' : 'Test Tours Query' }}
        </button>
        
        <button 
          @click="testTourLength"
          :disabled="testing"
          class="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white p-4 rounded-lg"
        >
          {{ testing ? 'Loading...' : 'Test Tour Length' }}
        </button>
        
        <button 
          @click="testSchools"
          :disabled="testing"
          class="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white p-4 rounded-lg"
        >
          {{ testing ? 'Loading...' : 'Test Schools Query' }}
        </button>
        
        <button 
          @click="checkTables"
          :disabled="testing"
          class="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white p-4 rounded-lg"
        >
          {{ testing ? 'Checking...' : 'Check Tables' }}
        </button>
      </div>

      <!-- Results -->
      <div class="space-y-4">
        <div v-if="connectionResult" class="bg-gray-800 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-white mb-2">Connection Test Result:</h3>
          <pre class="text-green-400 text-sm overflow-auto">{{ JSON.stringify(connectionResult, null, 2) }}</pre>
        </div>

        <div v-if="interestResult" class="bg-gray-800 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-white mb-2">Interests Query Result:</h3>
          <pre class="text-green-400 text-sm overflow-auto">{{ JSON.stringify(interestResult, null, 2) }}</pre>
        </div>

        <div v-if="locationsResult" class="bg-gray-800 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-white mb-2">Locations Query Result:</h3>
          <pre class="text-green-400 text-sm overflow-auto">{{ JSON.stringify(locationsResult, null, 2) }}</pre>
        </div>

        <div v-if="toursResult" class="bg-gray-800 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-white mb-2">Tours Query Result:</h3>
          <pre class="text-green-400 text-sm overflow-auto">{{ JSON.stringify(toursResult, null, 2) }}</pre>
        </div>

        <div v-if="tourLengthResult" class="bg-gray-800 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-white mb-2">Tour Length Query Result:</h3>
          <pre class="text-green-400 text-sm overflow-auto">{{ JSON.stringify(tourLengthResult, null, 2) }}</pre>
        </div>

        <div v-if="schoolsResult" class="bg-gray-800 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-white mb-2">Schools Query Result:</h3>
          <pre class="text-green-400 text-sm overflow-auto">{{ JSON.stringify(schoolsResult, null, 2) }}</pre>
        </div>

        <div v-if="tablesResult" class="bg-gray-800 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-white mb-2">Tables Check Result:</h3>
          <pre class="text-green-400 text-sm overflow-auto">{{ JSON.stringify(tablesResult, null, 2) }}</pre>
        </div>

        <div v-if="error" class="bg-red-900 p-4 rounded-lg">
          <h3 class="text-lg font-semibold text-red-300 mb-2">Error:</h3>
          <pre class="text-red-400 text-sm overflow-auto">{{ error }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../supabase.js'
import { getInterestsPopularity, getLocationsPopularity, getTourCompletion, getAverageTourLength, getSchoolsVisited } from '../services/analyticsService.js'

const testing = ref(false)
const connectionResult = ref(null)
const interestResult = ref(null)
const locationsResult = ref(null)
const toursResult = ref(null)
const tourLengthResult = ref(null)
const schoolsResult = ref(null)
const tablesResult = ref(null)
const error = ref(null)

// Test basic connection
async function testConnection() {
  testing.value = true
  error.value = null
  connectionResult.value = null

  try {
    // Simple query to test connection
    const { data, error: dbError } = await supabase
      .from('analytics_events')
      .select('id')
      .limit(1)

    if (dbError) {
      throw dbError
    }

    connectionResult.value = {
      status: 'success',
      message: 'Connection successful',
      sampleRecord: data[0] || 'No data found'
    }
  } catch (err) {
    error.value = `Connection failed: ${err.message}`
  } finally {
    testing.value = false
  }
}

// Test interests query
async function testInterests() {
  testing.value = true
  error.value = null
  interestResult.value = null

  try {
    // First, let's see raw data from interests-chosen events
    const { data: rawData, error: rawError } = await supabase
      .from('analytics_events')
      .select('metadata')
      .eq('event_type', 'interests-chosen')
      .limit(3)

    if (rawError) {
      throw rawError
    }

    const result = await getInterestsPopularity()
    
    interestResult.value = {
      processedResult: result,
      rawSampleData: rawData,
      totalEvents: rawData.length
    }
  } catch (err) {
    error.value = `Interests query failed: ${err.message}`
  } finally {
    testing.value = false
  }
}

// Test locations query
async function testLocations() {
  testing.value = true
  error.value = null
  locationsResult.value = null

  try {
    // First, let's see raw data from location-duration events
    const { data: rawData, error: rawError } = await supabase
      .from('analytics_events')
      .select('location_id, metadata')
      .eq('event_type', 'location-duration')
      .limit(5)

    if (rawError) {
      throw rawError
    }

    const result = await getLocationsPopularity()
    
    locationsResult.value = {
      processedResult: result,
      rawSampleData: rawData,
      totalEvents: rawData.length
    }
  } catch (err) {
    error.value = `Locations query failed: ${err.message}`
  } finally {
    testing.value = false
  }
}

// Test tours completion query
async function testTours() {
  testing.value = true
  error.value = null
  toursResult.value = null

  try {
    // First, let's see raw data from tour-start and tour-finish events
    const { data: rawData, error: rawError } = await supabase
      .from('analytics_events')
      .select('event_type')
      .in('event_type', ['tour-start', 'tour-finish'])
      .limit(10)

    if (rawError) {
      throw rawError
    }

    const result = await getTourCompletion()
    
    // Count raw events for comparison
    const rawCounts = {
      'tour-start': 0,
      'tour-finish': 0
    }
    rawData.forEach(event => {
      rawCounts[event.event_type]++
    })
    
    toursResult.value = {
      processedResult: result,
      rawSampleData: rawData.slice(0, 5), // Show only first 5 for brevity
      rawCounts,
      totalSampleEvents: rawData.length
    }
  } catch (err) {
    error.value = `Tours query failed: ${err.message}`
  } finally {
    testing.value = false
  }
}

// Test tour length calculation
async function testTourLength() {
  testing.value = true
  error.value = null
  tourLengthResult.value = null

  try {
    // First, let's see raw data for tour length calculation
    const { data: rawData, error: rawError } = await supabase
      .from('analytics_events')
      .select('session_id, event_type, timestamp, metadata')
      .in('event_type', ['tour-start', 'tour-finish'])
      .limit(10)

    if (rawError) {
      throw rawError
    }

    const result = await getAverageTourLength()
    
    // Sample session pairing for verification
    const sessions = {}
    rawData.forEach(event => {
      if (!sessions[event.session_id]) {
        sessions[event.session_id] = {}
      }
      sessions[event.session_id][event.event_type] = event
    })
    
    tourLengthResult.value = {
      processedResult: result,
      rawSampleData: rawData.slice(0, 5),
      sampleSessions: Object.entries(sessions).slice(0, 3),
      totalSampleEvents: rawData.length
    }
  } catch (err) {
    error.value = `Tour length query failed: ${err.message}`
  } finally {
    testing.value = false
  }
}

// Test schools visited query
async function testSchools() {
  testing.value = true
  error.value = null
  schoolsResult.value = null

  try {
    // First, let's see raw data from tour-start events with school info
    const { data: rawData, error: rawError } = await supabase
      .from('analytics_events')
      .select(`
        school_id,
        schools (
          name
        )
      `)
      .eq('event_type', 'tour-start')
      .not('schools', 'is', null)
      .limit(5)

    if (rawError) {
      throw rawError
    }

    const result = await getSchoolsVisited()
    
    schoolsResult.value = {
      processedResult: result,
      rawSampleData: rawData,
      totalEvents: rawData.length
    }
  } catch (err) {
    error.value = `Schools query failed: ${err.message}`
  } finally {
    testing.value = false
  }
}

// Check what tables exist
async function checkTables() {
  testing.value = true
  error.value = null
  tablesResult.value = null

  try {
    // Try to get schema info for our main tables
    const analytics = await supabase.from('analytics_events').select('*').limit(1)
    const schools = await supabase.from('schools').select('*').limit(1)
    const locations = await supabase.from('locations').select('*').limit(1)

    tablesResult.value = {
      analytics_events: {
        accessible: !analytics.error,
        error: analytics.error?.message,
        sample: analytics.data?.[0]
      },
      schools: {
        accessible: !schools.error,
        error: schools.error?.message,
        sample: schools.data?.[0]
      },
      locations: {
        accessible: !locations.error,
        error: locations.error?.message,
        sample: locations.data?.[0]
      }
    }
  } catch (err) {
    error.value = `Tables check failed: ${err.message}`
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
pre {
  max-height: 300px;
}
</style> 
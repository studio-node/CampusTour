<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { schoolService } from '../services/schoolService.js'

const router = useRouter()

// State
const allSchools = ref([])
const selectedSchool = ref('')
const selectedSchoolData = ref(null)
const loading = ref(true)
const error = ref('')
const searchQuery = ref('')

// Load schools on mount
onMounted(async () => {
  await loadSchools()
})

// Load schools from API
const loadSchools = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const schoolsData = await schoolService.getSchools()
    allSchools.value = schoolsData
    
    // Check if there's already a selected school and pre-select it
    const savedSchoolId = schoolService.getSelectedSchool()
    if (savedSchoolId) {
      const savedSchool = schoolsData.find(school => school.id === savedSchoolId)
      if (savedSchool) {
        selectedSchool.value = savedSchool.id
        selectedSchoolData.value = savedSchool
      }
    }
  } catch (err) {
    error.value = 'Failed to load schools. Please try again.'
    console.error('Error loading schools:', err)
  } finally {
    loading.value = false
  }
}

// Computed property for filtered schools
const displayedSchools = computed(() => {
  if (searchQuery.value.trim() === '') {
    // Show top 10 closest schools when no search query
    return allSchools.value.slice(0, 10)
  } else {
    // Filter all schools based on search query
    const query = searchQuery.value.toLowerCase().trim()
    return allSchools.value.filter(school => 
      school.name.toLowerCase().includes(query) ||
      school.city.toLowerCase().includes(query) ||
      school.state.toLowerCase().includes(query)
    )
  }
})

// Handle school selection
const handleSchoolSelect = (school) => {
  selectedSchool.value = school.id
  selectedSchoolData.value = school
}

// Handle continue button
const handleContinue = () => {
  if (selectedSchool.value) {
    // Save selected school
    schoolService.setSelectedSchool(selectedSchool.value)
    // Navigate to tour groups screen
    router.push('/tour-groups')
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto">

    <!-- Hero Section -->
    <div class="text-center mb-12">
      <!-- Hero Image -->
      <div class="mb-8">
        <img 
          src="https://images.pexels.com/photos/1438072/pexels-photo-1438072.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          alt="Campus"
          class="w-full h-64 object-cover rounded-lg shadow-lg"
        />
      </div>
      
      <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">
        Campus Tour
      </h1>
      <p class="text-xl text-gray-300 mb-8">
        Please select the school you would like to tour.
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
      <p class="text-gray-400">Loading schools...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-900 bg-opacity-50 border border-red-500 rounded-lg p-6 mb-8">
      <p class="text-red-200">{{ error }}</p>
      <button 
        @click="loadSchools"
        class="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
      >
        Try Again
      </button>
    </div>

    <!-- School Selection -->
    <div v-else class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-8 mb-8">
      <h2 class="text-2xl font-bold text-white mb-6 text-center">
        Choose Your School
      </h2>

      <!-- Search Bar -->
      <div class="mb-6">
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search schools by name, city, or state..."
            class="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        <!-- Search Results Counter -->
        <p class="text-sm text-gray-400 mt-2">
          <span>
            {{ displayedSchools.length }} school{{ displayedSchools.length !== 1 ? 's' : '' }} found
          </span>
        </p>
      </div>

      <!-- Schools Grid -->
      <div class="mb-8">
        <div v-if="displayedSchools.length === 0" class="text-center py-12 text-gray-400">
          <svg class="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p>No schools found matching your search.</p>
          <button 
            @click="searchQuery = ''"
            class="mt-2 text-blue-400 hover:text-blue-300 text-sm"
          >
            Clear search to see all schools
          </button>
        </div>
        
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
          <button
            v-for="school in displayedSchools"
            :key="school.id"
            @click="handleSchoolSelect(school)"
            :class="[
              'p-4 rounded-lg border-2 transition-all duration-200 text-left',
              selectedSchool === school.id
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-600'
            ]"
          >
            <div class="flex items-center">
              <!-- School Logo -->
              <div v-if="school.logo_url" class="mr-4 flex-shrink-0">
                <img 
                  :src="school.logo_url" 
                  :alt="school.name"
                  class="w-12 h-12 object-contain rounded"
                />
              </div>
              
              <!-- School Info -->
              <div class="min-w-0 flex-1">
                <p class="font-semibold text-lg truncate">{{ school.name }}</p>
                <p class="text-sm opacity-75">{{ school.city }}, {{ school.state }}</p>
              </div>
              
              <!-- Selected Indicator -->
              <div v-if="selectedSchool === school.id" class="ml-2 flex-shrink-0">
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Selected School Summary -->
      <div v-if="selectedSchoolData" class="mb-6 p-4 bg-blue-600 rounded-lg border border-gray-600">
        <div class="flex items-center">
          <div v-if="selectedSchoolData.logo_url" class="mr-4">
            <img 
              :src="selectedSchoolData.logo_url" 
              :alt="selectedSchoolData.name"
              class="w-16 h-16 object-contain rounded"
            />
          </div>
          <div>
            <p class="text-lg font-semibold text-white">Selected: {{ selectedSchoolData.name }}</p>
            <p class="text-gray-400">{{ selectedSchoolData.city }}, {{ selectedSchoolData.state }}</p>
          </div>
        </div>
      </div>

      <!-- Continue Button -->
      <div class="text-center">
        <button
          @click="handleContinue"
          :disabled="!selectedSchool"
          :class="[
            'px-8 py-3 rounded-lg font-medium transition-all duration-200',
            selectedSchool
              ? 'bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          ]"
        >
          Continue
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style> 
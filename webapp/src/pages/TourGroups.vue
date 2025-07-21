<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const handleBack = () => {
  router.push('/information')
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Back Button -->
    <div class="mb-6">
      <button 
        @click="handleBack"
        class="flex items-center text-gray-300 hover:text-white transition-colors duration-200"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
    </div>

    <!-- Header -->
    <div class="text-center mb-12">
      <h1 class="text-4xl md:text-6xl font-bold text-white mb-6">
        Tour Groups
      </h1>
      <p class="text-xl text-gray-300 mb-8">
        Available tour groups for your selected school
      </p>
    </div>

    <!-- Placeholder Content -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-8 text-center">
      <div class="mb-6">
        <svg class="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h2 class="text-2xl font-bold text-white mb-4">
          Tour Groups Page - Coming Soon
        </h2>
        <p class="text-gray-400 mb-6">
          This page will display available tour groups for your selected school.
        </p>
      </div>
      
      <!-- Temporary Skip Button -->
      <button
        @click="router.push('/select-interests')"
        class="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Skip to Interest Selection
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style> 
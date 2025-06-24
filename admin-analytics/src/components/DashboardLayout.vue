<template>
  <div class="min-h-screen bg-gray-900">
    <!-- Header -->
    <header class="bg-gray-800 shadow-sm border-b border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center">
            <h1 class="text-2xl font-bold text-white">Campus Tour Analytics</h1>
          </div>
          <div class="flex items-center space-x-4">
            <div class="text-sm text-gray-400">
              Last updated: {{ lastUpdated }}
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Stats Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <slot name="stats-cards">
          <!-- Default stats cards if not provided -->
          <div v-for="stat in defaultStats" :key="stat.title" class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div class="flex items-center">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-400">{{ stat.title }}</p>
                <p class="text-2xl font-bold text-white">{{ stat.value }}</p>
                <p class="text-sm text-gray-500">{{ stat.subtitle }}</p>
              </div>
              <div class="ml-4">
                <div class="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
                  <component :is="stat.icon" class="w-4 h-4 text-blue-400" />
                </div>
              </div>
            </div>
          </div>
        </slot>
      </div>

      <!-- Charts Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Interests Popularity Chart -->
        <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">Interests Popularity</h3>
            <slot name="interests-actions"></slot>
          </div>
          <div class="h-80">
            <slot name="interests-chart">
              <div class="flex items-center justify-center h-full text-gray-500">
                <div class="text-center">
                  <div class="w-12 h-12 mx-auto mb-2 bg-gray-700 rounded-lg flex items-center justify-center">
                    📊
                  </div>
                  <p>Interests chart will go here</p>
                </div>
              </div>
            </slot>
          </div>
        </div>

        <!-- Popular Locations Chart -->
        <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">Most Popular Locations</h3>
            <slot name="locations-actions"></slot>
          </div>
          <div class="h-80">
            <slot name="locations-chart">
              <div class="flex items-center justify-center h-full text-gray-500">
                <div class="text-center">
                  <div class="w-12 h-12 mx-auto mb-2 bg-gray-700 rounded-lg flex items-center justify-center">
                    📍
                  </div>
                  <p>Locations chart will go here</p>
                </div>
              </div>
            </slot>
          </div>
        </div>

        <!-- Tours Started vs Finished -->
        <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">Tours Started vs Finished</h3>
            <slot name="tours-actions"></slot>
          </div>
          <div class="h-80">
            <slot name="tours-chart">
              <div class="flex items-center justify-center h-full text-gray-500">
                <div class="text-center">
                  <div class="w-12 h-12 mx-auto mb-2 bg-gray-700 rounded-lg flex items-center justify-center">
                    🎯
                  </div>
                  <p>Tours completion chart will go here</p>
                </div>
              </div>
            </slot>
          </div>
        </div>

        <!-- Popular Times of Day -->
        <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">Popular Times of Day</h3>
            <slot name="times-actions"></slot>
          </div>
          <div class="h-80">
            <slot name="times-chart">
              <div class="flex items-center justify-center h-full text-gray-500">
                <div class="text-center">
                  <div class="w-12 h-12 mx-auto mb-2 bg-gray-700 rounded-lg flex items-center justify-center">
                    🕐
                  </div>
                  <p>Time distribution chart will go here</p>
                </div>
              </div>
            </slot>
          </div>
        </div>
      </div>

      <!-- Bottom Section: Average Tour Length & Schools -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <!-- Average Tour Length KPI -->
        <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">Average Tour Length</h3>
            <slot name="tour-length-actions"></slot>
          </div>
          <div class="h-48">
            <slot name="tour-length-content">
              <div class="flex items-center justify-center h-full">
                <div class="text-center">
                  <div class="text-4xl font-bold text-blue-400 mb-2">--</div>
                  <p class="text-gray-400">Average duration</p>
                </div>
              </div>
            </slot>
          </div>
        </div>

        <!-- Schools Being Visited -->
        <div class="lg:col-span-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">Schools Being Visited</h3>
            <slot name="schools-actions"></slot>
          </div>
          <div class="h-48">
            <slot name="schools-chart">
              <div class="flex items-center justify-center h-full text-gray-500">
                <div class="text-center">
                  <div class="w-12 h-12 mx-auto mb-2 bg-gray-700 rounded-lg flex items-center justify-center">
                    🏫
                  </div>
                  <p>Schools chart will go here</p>
                </div>
              </div>
            </slot>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// Props
const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  }
})

// Reactive data
const lastUpdated = ref(new Date().toLocaleString())

// Default stats for placeholder
const defaultStats = ref([
  {
    title: 'Total Tours',
    value: '---',
    subtitle: 'Loading...',
    icon: 'div' // Will be replaced with actual icons
  },
  {
    title: 'Active Schools',
    value: '---',
    subtitle: 'Loading...',
    icon: 'div'
  },
  {
    title: 'Avg Duration',
    value: '---',
    subtitle: 'Loading...',
    icon: 'div'
  },
  {
    title: 'Completion Rate',
    value: '---',
    subtitle: 'Loading...',
    icon: 'div'
  }
])

// Methods
const updateTimestamp = () => {
  lastUpdated.value = new Date().toLocaleString()
}

// Expose methods to parent
defineExpose({
  updateTimestamp
})
</script>

<style scoped>
/* Additional custom styles can go here */
.grid {
  grid-template-rows: minmax(0, 1fr);
}
</style> 
<template>
  <div class="relative w-full h-full">
    <!-- Loading State -->
    <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50 rounded-lg">
      <div class="text-center">
        <div class="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p class="text-gray-400 text-sm">Loading chart...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="absolute inset-0 flex items-center justify-center">
      <div class="text-center">
        <div class="w-12 h-12 mx-auto mb-2 bg-red-900 rounded-lg flex items-center justify-center">
          ⚠️
        </div>
        <p class="text-red-400 text-sm">{{ error }}</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="isEmpty" class="absolute inset-0 flex items-center justify-center">
      <div class="text-center">
        <div class="w-12 h-12 mx-auto mb-2 bg-gray-700 rounded-lg flex items-center justify-center">
          📊
        </div>
        <p class="text-gray-500 text-sm">{{ emptyMessage || 'No data available' }}</p>
      </div>
    </div>

    <!-- Chart Content -->
    <div v-else class="w-full h-full">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  data: {
    type: [Array, Object],
    default: () => []
  },
  emptyMessage: {
    type: String,
    default: 'No data available'
  }
})

// Computed
const isEmpty = computed(() => {
  if (!props.data) return true
  if (Array.isArray(props.data)) return props.data.length === 0
  if (typeof props.data === 'object') return Object.keys(props.data).length === 0
  return false
})

// Dark theme chart options that can be used by child components
const darkThemeOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#D1D5DB' // gray-300
      }
    },
    tooltip: {
      backgroundColor: '#374151', // gray-700
      titleColor: '#F9FAFB', // gray-50
      bodyColor: '#F9FAFB', // gray-50
      borderColor: '#6B7280', // gray-500
      borderWidth: 1
    }
  },
  scales: {
    x: {
      ticks: {
        color: '#9CA3AF' // gray-400
      },
      grid: {
        color: '#4B5563' // gray-600
      }
    },
    y: {
      ticks: {
        color: '#9CA3AF' // gray-400
      },
      grid: {
        color: '#4B5563' // gray-600
      }
    }
  }
}

// Expose the dark theme options for child components
defineExpose({
  darkThemeOptions
})
</script>

<style scoped>
/* Custom animations */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style> 
<template>
  <div class="relative h-full flex items-center justify-center">
    <!-- Loading State -->
    <div v-if="loading" class="text-center">
      <div class="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
      <p class="text-gray-400 text-sm">Loading...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center">
      <div class="w-12 h-12 mx-auto mb-2 bg-red-900 rounded-lg flex items-center justify-center">
        ⚠️
      </div>
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <!-- Content -->
    <div v-else class="text-center w-full">
      <!-- Icon -->
      <div v-if="icon" class="w-16 h-16 mx-auto mb-4 bg-blue-900 rounded-full flex items-center justify-center">
        <span class="text-2xl">{{ icon }}</span>
      </div>

      <!-- Main Value -->
      <div class="mb-2">
        <div :class="valueClass">
          {{ formattedValue }}
        </div>
        <div class="text-sm text-gray-400 font-medium">
          {{ label }}
        </div>
      </div>

      <!-- Trend Indicator -->
      <div v-if="trend !== null" class="flex items-center justify-center space-x-1 text-sm">
        <span :class="trendClass">
          {{ trendIcon }}
        </span>
        <span :class="trendClass">
          {{ Math.abs(trend) }}{{ trendSuffix }}
        </span>
        <span class="text-gray-500">vs last period</span>
      </div>

      <!-- Subtitle -->
      <div v-if="subtitle" class="text-xs text-gray-500 mt-2">
        {{ subtitle }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  value: {
    type: [Number, String],
    required: true
  },
  label: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: null
  },
  icon: {
    type: String,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  format: {
    type: String,
    default: 'number', // 'number', 'currency', 'percentage', 'duration', 'custom'
    validator: (value) => ['number', 'currency', 'percentage', 'duration', 'custom'].includes(value)
  },
  precision: {
    type: Number,
    default: 0
  },
  prefix: {
    type: String,
    default: ''
  },
  suffix: {
    type: String,
    default: ''
  },
  trend: {
    type: Number,
    default: null // positive for increase, negative for decrease
  },
  trendFormat: {
    type: String,
    default: 'percentage' // 'percentage' or 'number'
  },
  size: {
    type: String,
    default: 'normal', // 'small', 'normal', 'large'
    validator: (value) => ['small', 'normal', 'large'].includes(value)
  }
})

// Computed properties
const formattedValue = computed(() => {
  if (props.loading || props.error) return '--'
  
  let formatted = props.value

  switch (props.format) {
    case 'number':
      formatted = Number(props.value).toLocaleString(undefined, {
        minimumFractionDigits: props.precision,
        maximumFractionDigits: props.precision
      })
      break
    case 'currency':
      formatted = Number(props.value).toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: props.precision,
        maximumFractionDigits: props.precision
      })
      break
    case 'percentage':
      formatted = (Number(props.value) * 100).toFixed(props.precision) + '%'
      break
    case 'duration':
      formatted = formatDuration(props.value)
      break
    case 'custom':
      formatted = props.value
      break
  }

  return props.prefix + formatted + props.suffix
})

const valueClass = computed(() => {
  const sizeClasses = {
    small: 'text-2xl',
    normal: 'text-4xl',
    large: 'text-5xl'
  }
  
  return `font-bold text-blue-400 ${sizeClasses[props.size]}`
})

const trendIcon = computed(() => {
  if (props.trend === null) return ''
  return props.trend > 0 ? '↗️' : props.trend < 0 ? '↘️' : '→'
})

const trendClass = computed(() => {
  if (props.trend === null) return 'text-gray-400'
  return props.trend > 0 ? 'text-green-400' : props.trend < 0 ? 'text-red-400' : 'text-gray-400'
})

const trendSuffix = computed(() => {
  return props.trendFormat === 'percentage' ? '%' : ''
})

// Helper functions
const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`
  } else {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }
}
</script>

<style scoped>
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style> 
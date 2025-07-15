<template>
  <BaseChart 
    :loading="loading" 
    :error="error" 
    :data="chartData" 
    :empty-message="emptyMessage"
  >
    <Pie
      v-if="chartData && chartData.datasets"
      :data="chartData"
      :options="mergedOptions"
    />
  </BaseChart>
</template>

<script setup>
import { computed } from 'vue'
import { Pie } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import BaseChart from './BaseChart.vue'

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend)

// Props
const props = defineProps({
  data: {
    type: Array,
    required: true
  },
  labels: {
    type: Array,
    required: true
  },
  title: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  emptyMessage: {
    type: String,
    default: 'No data to display'
  },
  colors: {
    type: Array,
    default: () => [
      '#3B82F6', // blue-500
      '#10B981', // emerald-500
      '#F59E0B', // amber-500
      '#EF4444', // red-500
      '#8B5CF6', // violet-500
      '#06B6D4', // cyan-500
      '#84CC16', // lime-500
      '#F97316', // orange-500
      '#EC4899', // pink-500
      '#6366F1'  // indigo-500
    ]
  },
  showPercentages: {
    type: Boolean,
    default: true
  }
})

// Computed chart data
const chartData = computed(() => {
  if (!props.data || !props.labels) return null

  return {
    labels: props.labels,
    datasets: [
      {
        label: props.title || 'Data',
        data: props.data,
        backgroundColor: props.colors.slice(0, props.data.length),
        borderColor: '#374151', // gray-700 for dark theme
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverBorderColor: '#D1D5DB' // gray-300
      }
    ]
  }
})

// Chart options with dark theme
const mergedOptions = computed(() => {
  const total = props.data.reduce((sum, value) => sum + value, 0)

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#D1D5DB', // gray-300
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: '#374151', // gray-700
        titleColor: '#F9FAFB', // gray-50
        bodyColor: '#F9FAFB', // gray-50
        borderColor: '#6B7280', // gray-500
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const label = context.label || ''
            const value = context.raw
            const percentage = props.showPercentages ? ` (${((value / total) * 100).toFixed(1)}%)` : ''
            return `${label}: ${value}${percentage}`
          }
        }
      }
    },
    animation: {
      animateRotate: true,
      duration: 1500,
      easing: 'easeInOutQuart'
    },
    elements: {
      arc: {
        borderJoinStyle: 'round'
      }
    }
  }
})
</script>

<style scoped>
/* Component-specific styles if needed */
</style> 
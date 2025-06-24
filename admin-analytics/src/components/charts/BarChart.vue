<template>
  <BaseChart 
    :loading="loading" 
    :error="error" 
    :data="chartData" 
    :empty-message="emptyMessage"
  >
    <Bar
      v-if="chartData && chartData.datasets"
      :data="chartData"
      :options="mergedOptions"
    />
  </BaseChart>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import BaseChart from './BaseChart.vue'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

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
  horizontal: {
    type: Boolean,
    default: false
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
        borderColor: props.colors.slice(0, props.data.length).map(color => color + '80'), // Add transparency
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }
    ]
  }
})

// Chart options with dark theme
const mergedOptions = computed(() => {
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: props.horizontal ? 'y' : 'x',
    plugins: {
      legend: {
        display: false, // Hide legend for single dataset
      },
      tooltip: {
        backgroundColor: '#374151',
        titleColor: '#F9FAFB',
        bodyColor: '#F9FAFB',
        borderColor: '#6B7280',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            // For horizontal charts, value is in x; for vertical charts, value is in y
            const value = props.horizontal ? context.parsed.x : context.parsed.y
            return `${value} ${props.title ? props.title.toLowerCase() : 'items'}`
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#9CA3AF',
          maxRotation: props.horizontal ? 0 : 45
        },
        grid: {
          color: '#4B5563',
          display: props.horizontal
        }
      },
      y: {
        ticks: {
          color: '#9CA3AF'
        },
        grid: {
          color: '#4B5563',
          display: !props.horizontal
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    }
  }

  return baseOptions
})
</script>

<style scoped>
/* Component-specific styles if needed */
</style> 
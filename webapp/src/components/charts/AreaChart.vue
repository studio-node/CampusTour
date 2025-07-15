<template>
  <BaseChart 
    :loading="loading" 
    :error="error" 
    :data="chartData" 
    :empty-message="emptyMessage"
  >
    <Line
      v-if="chartData && chartData.datasets"
      :data="chartData"
      :options="mergedOptions"
    />
  </BaseChart>
</template>

<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import BaseChart from './BaseChart.vue'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
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
  color: {
    type: String,
    default: '#3B82F6' // blue-500
  },
  fill: {
    type: Boolean,
    default: true
  },
  smooth: {
    type: Boolean,
    default: true
  },
  showPoints: {
    type: Boolean,
    default: true
  },
  yAxisLabel: {
    type: String,
    default: ''
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
        borderColor: props.color,
        backgroundColor: props.fill ? props.color + '40' : 'transparent',
        borderWidth: 3,
        fill: props.fill,
        tension: props.smooth ? 0.4 : 0,
        pointRadius: props.showPoints ? 4 : 0,
        pointHoverRadius: props.showPoints ? 6 : 0,
        pointBackgroundColor: props.color,
        pointBorderColor: '#374151', // gray-700
        pointBorderWidth: 2,
        pointHoverBackgroundColor: props.color,
        pointHoverBorderColor: '#D1D5DB', // gray-300
        pointHoverBorderWidth: 2
      }
    ]
  }
})

// Chart options with dark theme
const mergedOptions = computed(() => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        display: false // Hide legend for single dataset
      },
      tooltip: {
        backgroundColor: '#374151', // gray-700
        titleColor: '#F9FAFB', // gray-50
        bodyColor: '#F9FAFB', // gray-50
        borderColor: '#6B7280', // gray-500
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const value = context.raw
            const label = props.title || 'Value'
            return `${label}: ${value}`
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#9CA3AF', // gray-400
          maxRotation: 45
        },
        grid: {
          color: '#4B5563', // gray-600
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: '#9CA3AF', // gray-400
        },
        grid: {
          color: '#4B5563', // gray-600
        },
        title: {
          display: !!props.yAxisLabel,
          text: props.yAxisLabel,
          color: '#9CA3AF' // gray-400
        }
      }
    },
    elements: {
      point: {
        hoverBorderWidth: 3
      }
    },
    animation: {
      duration: 1500,
      easing: 'easeInOutQuart'
    }
  }
})
</script>

<style scoped>
/* Component-specific styles if needed */
</style> 
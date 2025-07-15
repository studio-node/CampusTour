<template>
  <DashboardLayout>
    <!-- Stats Cards -->
    <template #stats-cards>
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <KPICard
          :value="1247"
          label="Total Tours"
          icon="🚶"
          :trend="15.3"
          format="number"
        />
      </div>
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <KPICard
          :value="8"
          label="Active Schools"
          icon="🏫"
          :trend="-2"
          format="number"
        />
      </div>
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <KPICard
          :value="42.5"
          label="Avg Duration"
          icon="⏱️"
          format="duration"
          subtitle="minutes per tour"
        />
      </div>
      <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <KPICard
          :value="0.78"
          label="Completion Rate"
          icon="✅"
          :trend="5.2"
          format="percentage"
          :precision="1"
        />
      </div>
    </template>

    <!-- Interests Chart -->
    <template #interests-chart>
      <BarChart
        :data="interestsData"
        :labels="interestsLabels"
        title="Student Interests"
        horizontal
      />
    </template>

    <!-- Locations Chart -->
    <template #locations-chart>
      <BarChart
        :data="locationsData"
        :labels="locationsLabels"
        title="Average Visit Time (minutes)"
      />
    </template>

    <!-- Tours Chart -->
    <template #tours-chart>
      <PieChart
        :data="toursData"
        :labels="toursLabels"
        title="Tour Completion"
      />
    </template>

    <!-- Times Chart -->
    <template #times-chart>
      <AreaChart
        :data="timesData"
        :labels="timesLabels"
        title="Tours by Time"
        color="#10B981"
        y-axis-label="Number of Tours"
      />
    </template>

    <!-- Tour Length Content -->
    <template #tour-length-content>
      <KPICard
        :value="38.7"
        label="Average Tour Length"
        icon="📊"
        format="duration"
        size="large"
        subtitle="Based on 847 completed tours"
      />
    </template>

    <!-- Schools Chart -->
    <template #schools-chart>
      <BarChart
        :data="schoolsData"
        :labels="schoolsLabels"
        title="Tours per School"
        horizontal
      />
    </template>
  </DashboardLayout>
</template>

<script setup>
import { ref } from 'vue'
import DashboardLayout from './DashboardLayout.vue'
import { BarChart, PieChart, AreaChart, KPICard } from './charts'

// Sample data for demonstration
const interestsData = ref([45, 38, 32, 28, 25, 22, 18, 15])
const interestsLabels = ref(['Engineering', 'Business', 'Arts', 'Science', 'Medicine', 'Law', 'Education', 'Sports'])

const locationsData = ref([12.5, 8.7, 6.2, 5.8, 4.3])
const locationsLabels = ref(['Library', 'Student Center', 'Gym', 'Cafeteria', 'Auditorium'])

const toursData = ref([742, 105])
const toursLabels = ref(['Completed', 'Abandoned'])

const timesData = ref([5, 12, 28, 35, 42, 22])
const timesLabels = ref(['8-10 AM', '10-12 PM', '12-2 PM', '2-4 PM', '4-6 PM', '6-8 PM'])

const schoolsData = ref([234, 189, 156, 134, 98, 87, 65, 43])
const schoolsLabels = ref(['State University', 'Tech College', 'Community College', 'Private University', 'Art Institute', 'Medical School', 'Law School', 'Business School'])
</script>

<style scoped>
/* Component-specific styles if needed */
</style> 
<script setup>
import Dashboard from './components/Dashboard.vue'
import ChartDemo from './components/ChartDemo.vue'
import TestConnection from './components/TestConnection.vue'

// Toggle between different views
const useTest = false // Tour length calculation implemented!
const useDemo = true
</script>

<template>
  <!-- Test Supabase connection -->
  <TestConnection v-if="useTest" />
  
  <!-- Use real dashboard with Supabase data -->
  <Dashboard v-else-if="!useDemo" />
  
  <!-- Use demo with mock data -->
  <ChartDemo v-else />
</template>

<style scoped>

</style>

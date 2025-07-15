<script setup>
import { ref } from 'vue'

const stats = ref([
  { name: 'Total Tours Started', value: '1,234', icon: '��', color: 'bg-blue-600' },
  { name: 'Active Schools', value: '12', icon: '🏫', color: 'bg-green-600' },
  { name: 'Registered Users', value: '456', icon: '👥', color: 'bg-purple-600' },
  { name: 'Tours Completed', value: '987', icon: '✅', color: 'bg-orange-600' }
])

const quickActions = ref([
  { name: 'View Analytics', route: '/analytics', icon: '📈', description: 'Detailed analytics and charts' },
  { name: 'Manage Users', route: '/users', icon: '👥', description: 'User accounts and permissions' },
  { name: 'Tour Management', route: '/tours', icon: '🗺️', description: 'Configure tours and locations' },
  { name: 'Settings', route: '/profile', icon: '⚙️', description: 'Profile and system settings' }
])
</script>

<template>
  <div class="space-y-6">
    <!-- Welcome Header -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <h1 class="text-2xl font-bold text-white mb-2">Welcome to Campus Tour Admin</h1>
      <p class="text-gray-400">Monitor and manage your campus tour application from this dashboard.</p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="stat in stats" :key="stat.name" class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm" :class="stat.color">
              {{ stat.icon }}
            </div>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-400">{{ stat.name }}</p>
            <p class="text-2xl font-semibold text-white">{{ stat.value }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <h2 class="text-lg font-medium text-white mb-4">Quick Actions</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <router-link
          v-for="action in quickActions"
          :key="action.name"
          :to="action.route"
          class="p-4 border border-gray-600 rounded-lg hover:border-blue-500 hover:bg-gray-700 transition-all duration-200 block"
        >
          <div class="text-center">
            <div class="text-2xl mb-2">{{ action.icon }}</div>
            <h3 class="font-medium text-white">{{ action.name }}</h3>
            <p class="text-sm text-gray-400 mt-1">{{ action.description }}</p>
          </div>
        </router-link>
      </div>
    </div>

    <!-- Recent Activity (Placeholder) -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <h2 class="text-lg font-medium text-white mb-4">Recent Activity</h2>
      <div class="space-y-3">
        <div class="flex items-center space-x-3 text-sm">
          <div class="w-2 h-2 bg-green-400 rounded-full"></div>
          <span class="text-gray-300">New user registered</span>
          <span class="text-gray-500">2 minutes ago</span>
        </div>
        <div class="flex items-center space-x-3 text-sm">
          <div class="w-2 h-2 bg-blue-400 rounded-full"></div>
          <span class="text-gray-300">Tour completed at Utah Tech</span>
          <span class="text-gray-500">15 minutes ago</span>
        </div>
        <div class="flex items-center space-x-3 text-sm">
          <div class="w-2 h-2 bg-purple-400 rounded-full"></div>
          <span class="text-gray-300">New location added</span>
          <span class="text-gray-500">1 hour ago</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>

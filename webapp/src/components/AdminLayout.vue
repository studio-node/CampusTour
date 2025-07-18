<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const sidebarOpen = ref(true)

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: '📊' },
  { name: 'Analytics & Data', href: '/admin/analytics', icon: '📈' },
  { name: 'User Management', href: '/admin/users', icon: '👥' },
  { name: 'Tour Management', href: '/admin/tours', icon: '🗺️' },
  { name: 'Ambassador Tours', href: '/admin/ambassador-tours', icon: '🎓' },
  { name: 'Profile & Settings', href: '/admin/profile', icon: '⚙️' }
]
</script>

<template>
  <div class="min-h-screen bg-gray-900">
    <!-- Sidebar -->
    <div class="fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out border-r border-gray-700" :class="{ '-translate-x-full': !sidebarOpen }">
      <div class="flex items-center justify-center h-16 px-4 bg-gray-900 border-b border-gray-700">
        <h1 class="text-xl font-bold text-white">Campus Tour Admin</h1>
      </div>
      
      <nav class="mt-8">
        <div class="px-4 space-y-2">
          <router-link
            v-for="item in navigation"
            :key="item.name"
            :to="item.href"
            class="flex items-center px-4 py-3 text-sm font-medium text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors duration-200"
            :class="{
              'bg-gray-700 text-white border-r-2 border-blue-500': route.path === item.href
            }"
          >
            <span class="mr-3 text-lg">{{ item.icon }}</span>
            {{ item.name }}
          </router-link>
        </div>
      </nav>
      
      <!-- Back to Public Site -->
      <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
        <router-link
          to="/select-school"
          class="flex items-center px-4 py-2 text-sm font-medium text-gray-400 rounded-lg hover:bg-gray-700 hover:text-white transition-colors duration-200"
        >
          <span class="mr-3 text-lg">🌐</span>
          Public Site
        </router-link>
      </div>
    </div>

    <!-- Main content -->
    <div class="transition-all duration-300 ease-in-out" :class="{ 'ml-64': sidebarOpen, 'ml-0': !sidebarOpen }">
      <!-- Top bar -->
      <header class="bg-gray-800 shadow-sm border-b border-gray-700">
        <div class="flex items-center justify-between px-6 py-4">
          <button
            @click="sidebarOpen = !sidebarOpen"
            class="p-2 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <span class="sr-only">Open sidebar</span>
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div class="flex items-center space-x-4">
            <h2 class="text-xl font-semibold text-white">{{ route.meta?.title || 'Dashboard' }}</h2>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1">
        <div class="py-6">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <slot />
          </div>
        </div>
      </main>
    </div>

    <!-- Mobile sidebar backdrop -->
    <div v-if="sidebarOpen" class="fixed inset-0 z-40 lg:hidden" @click="sidebarOpen = false">
      <div class="fixed inset-0 bg-gray-600 bg-opacity-75"></div>
    </div>
  </div>
</template>

<style scoped>
/* Additional custom styles if needed */
</style> 
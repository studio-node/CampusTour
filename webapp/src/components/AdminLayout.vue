<script setup>
import { ref, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'

const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(true)

const { user, loading, isAuthenticated, userDisplayName, userRole, signOut } = useAuth()

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: '📊' },
  { name: 'Analytics & Data', href: '/admin/analytics', icon: '📈' },
  { name: 'User Management', href: '/admin/users', icon: '👥' },
  { name: 'Tour Management', href: '/admin/tours', icon: '🗺️' },
  { name: 'Location Management', href: '/admin/locations', icon: '📍' },
  { name: 'Ambassador Tours', href: '/admin/ambassador-tours', icon: '🎓' },
  { name: 'Profile & Settings', href: '/admin/profile', icon: '⚙️' }
]

// Handle sign out
const handleSignOut = async () => {
  const success = await signOut()
  if (success) {
    router.push('/admin/signin')
  }
}

// Redirect to sign-in if not authenticated (after loading)
watchEffect(() => {
  if (!loading.value && !isAuthenticated.value) {
    router.push('/admin/signin')
  }
})
</script>

<template>
  <!-- Loading state while checking authentication -->
  <div v-if="loading" class="min-h-screen bg-gray-900 flex items-center justify-center">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
      <p class="text-gray-400">Checking authentication...</p>
    </div>
  </div>

  <!-- Main admin layout (only shown if authenticated) -->
  <div v-else-if="isAuthenticated" class="min-h-screen bg-gray-900">
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
      
      <!-- User Info & Actions -->
      <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
        <!-- User Info -->
        <div v-if="user" class="mb-3 px-4 py-2">
          <p class="text-xs text-gray-400">Signed in as</p>
          <p class="text-sm font-medium text-white truncate">{{ userDisplayName }}</p>
          <p class="text-xs text-gray-400">{{ userRole }}</p>
        </div>
        
        <!-- Navigation Links -->
        <div class="space-y-1">
          <router-link
            to="/"
            class="flex items-center px-4 py-2 text-sm font-medium text-gray-400 rounded-lg hover:bg-gray-700 hover:text-white transition-colors duration-200"
          >
            <span class="mr-3 text-lg">🌐</span>
            Public Site
          </router-link>
          
          <button
            @click="handleSignOut"
            class="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-400 rounded-lg hover:bg-gray-700 hover:text-white transition-colors duration-200"
          >
            <span class="mr-3 text-lg">🚪</span>
            Sign Out
          </button>
        </div>
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
            
            <!-- User info in header (mobile friendly) -->
            <div v-if="user" class="hidden md:flex items-center space-x-3">
              <div class="text-right">
                <p class="text-sm font-medium text-white">{{ userDisplayName }}</p>
                <p class="text-xs text-gray-400">{{ userRole }}</p>
              </div>
              <button
                @click="handleSignOut"
                class="p-2 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                title="Sign Out"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
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
  
  <!-- If not authenticated and not loading, this will be empty as redirect happens in watchEffect -->
</template>

<style scoped>
/* Additional custom styles if needed */
</style> 
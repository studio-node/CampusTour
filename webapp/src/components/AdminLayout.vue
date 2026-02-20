<script setup>
import { ref, watchEffect, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth.js'

const route = useRoute()
const router = useRouter()

// Expanded = wide sidebar with labels; collapsed = narrow icons-only. Default by screen size.
const sidebarExpanded = ref(true)
const LG_BREAKPOINT = 1024
const isLgScreen = ref(true)

function updateScreenSize() {
  const lg = window.innerWidth >= LG_BREAKPOINT
  const crossed = lg !== isLgScreen.value
  isLgScreen.value = lg
  if (crossed) sidebarExpanded.value = lg
}

onMounted(() => {
  updateScreenSize()
  sidebarExpanded.value = isLgScreen.value
  window.addEventListener('resize', updateScreenSize)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateScreenSize)
})

const { user, loading, isAuthenticated, userDisplayName, userRole, signOut } = useAuth()

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: '🏠' },
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
    <!-- Sidebar: minimized (icons only) or expanded. Toggle at top of sidebar. -->
    <div
      class="fixed inset-y-0 left-0 z-50 bg-gray-800 shadow-lg border-r border-gray-700 transition-[width] duration-300 ease-in-out flex flex-col"
      :class="sidebarExpanded ? 'w-64' : 'w-16'"
    >
      <!-- Toggle at top of sidebar -->
      <div
        class="flex items-center h-16 border-b border-gray-700 shrink-0 px-2"
        :class="sidebarExpanded ? '' : 'justify-center'"
      >
        <button
          type="button"
          @click="sidebarExpanded = !sidebarExpanded"
          class="p-2 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          :title="sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'"
        >
          <span class="sr-only">{{ sidebarExpanded ? 'Collapse' : 'Expand' }} sidebar</span>
          <svg v-if="sidebarExpanded" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          <svg v-else class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
        <h1 v-show="sidebarExpanded" class="text-lg font-bold text-white truncate mr-4">Campus Tour Admin</h1>
      </div>

      <nav class="mt-4 flex-1 overflow-y-auto">
        <div class="px-2 space-y-1" :class="sidebarExpanded ? 'px-4 space-y-2' : ''">
          <router-link
            v-for="item in navigation"
            :key="item.name"
            :to="item.href"
            class="flex items-center text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors duration-200"
            :class="[
              sidebarExpanded ? 'px-4 py-3 text-sm font-medium' : 'justify-center p-3 text-lg',
              route.path === item.href ? 'bg-gray-700 text-white' : '',
              route.path === item.href && sidebarExpanded ? 'border-r-2 border-blue-500' : '',
              route.path === item.href && !sidebarExpanded ? 'border-l-2 border-blue-500' : ''
            ]"
          >
            <span :class="sidebarExpanded ? 'mr-3 text-lg' : ''">{{ item.icon }}</span>
            <span v-show="sidebarExpanded">{{ item.name }}</span>
          </router-link>
        </div>
      </nav>

      <!-- User Info & Actions -->
      <div class="border-t border-gray-700 p-2 shrink-0" :class="sidebarExpanded ? 'p-4' : ''">
        <div v-if="sidebarExpanded && user" class="mb-3 px-4 py-2">
          <p class="text-xs text-gray-400">Signed in as</p>
          <p class="text-sm font-medium text-white truncate">{{ userDisplayName }}</p>
          <p class="text-xs text-gray-400">{{ userRole }}</p>
        </div>
        <div class="space-y-1" :class="sidebarExpanded ? '' : 'flex flex-col items-center gap-1'">
          <router-link
            to="/"
            class="flex items-center text-gray-400 rounded-lg hover:bg-gray-700 hover:text-white transition-colors duration-200"
            :class="sidebarExpanded ? 'px-4 py-2 text-sm font-medium' : 'p-2 text-lg'"
          >
            <span :class="sidebarExpanded ? 'mr-3 text-lg' : ''">🌐</span>
            <span v-show="sidebarExpanded">Public Site</span>
          </router-link>
          <button
            @click="handleSignOut"
            class="w-full flex items-center text-gray-400 rounded-lg hover:bg-gray-700 hover:text-white transition-colors duration-200"
            :class="sidebarExpanded ? 'px-4 py-2 text-sm font-medium' : 'p-2 text-lg justify-center'"
          >
            <span :class="sidebarExpanded ? 'mr-3 text-lg' : ''">🚪</span>
            <span v-show="sidebarExpanded">Sign Out</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Main content: on lg+ use margin; on small screens expanded sidebar overlays (no margin) -->
    <div
      class="transition-[margin] duration-300 ease-in-out"
      :class="
        isLgScreen
          ? (sidebarExpanded ? 'ml-64' : 'ml-16')
          : (sidebarExpanded ? 'ml-0' : 'ml-16')
      "
    >
      <!-- Top bar -->
      <header class="bg-gray-800 shadow-sm border-b border-gray-700">
        <div class="flex items-center justify-between px-6 py-4">
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

    <!-- Small screen: light overlay when sidebar expanded so content stays visible underneath; click to collapse -->
    <div
      v-if="!isLgScreen && sidebarExpanded"
      class="fixed inset-0 z-40 lg:hidden"
      @click="sidebarExpanded = false"
      aria-hidden="true"
    >
      <div class="fixed inset-0 bg-black/25"></div>
    </div>
  </div>
  
  <!-- If not authenticated and not loading, this will be empty as redirect happens in watchEffect -->
</template>

<style scoped>
/* Additional custom styles if needed */
</style> 
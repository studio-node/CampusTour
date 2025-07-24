<script setup>
import { ref } from 'vue'

// Props for customization
const props = defineProps({
  title: {
    type: String,
    default: 'Campus Tour'
  },
  showAppDownload: {
    type: Boolean,
    default: true
  }
})

const currentYear = new Date().getFullYear()

const clearStorage = () => {
  console.log('Clearing storage')
  localStorage.clear()
  console.log(localStorage.length)
}
</script>

<template>
  <div class="min-h-screen bg-gray-900 flex flex-col">
    <!-- Public Header -->
    <header class="bg-gray-800 shadow-sm border-b border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo/Brand -->
          <div class="flex items-center">
            <router-link to="/select-school" class="flex items-center">
              <h1 class="text-xl font-bold text-white">{{ title }}</h1>
            </router-link>
          </div>
          
          <!-- Navigation -->
          <nav class="hidden md:flex items-center space-x-6">
            <button
              class="text-gray-300 hover:text-white transition-colors duration-200 bg-red-500 px-4 py-2 rounded-lg"
              @click="clearStorage()"
            >
              Clear Storage (for testing)
            </button>
            <router-link 
              to="/select-school" 
              class="text-gray-300 hover:text-white transition-colors duration-200"
            >
              Start Tour
            </router-link>
            <a 
              v-if="showAppDownload"
              href="#" 
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Download App
            </a>
          </nav>

          <!-- Mobile menu button -->
          <div class="md:hidden">
            <button class="p-2 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-700">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-gray-800 border-t border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- About -->
          <div>
            <h3 class="text-lg font-semibold text-white mb-4">Campus Tour</h3>
            <p class="text-gray-400 text-sm">
              Discover your campus with personalized, self-guided tours tailored to your interests.
            </p>
          </div>
          
          <!-- Download Links -->
          <div v-if="showAppDownload">
            <h3 class="text-lg font-semibold text-white mb-4">Get the App</h3>
            <div class="space-y-2">
              <a href="#" class="block text-gray-400 hover:text-white text-sm transition-colors">
                📱 Download for iOS
              </a>
              <a href="#" class="block text-gray-400 hover:text-white text-sm transition-colors">
                🤖 Download for Android
              </a>
            </div>
          </div>
          
          <!-- Contact -->
          <div>
            <h3 class="text-lg font-semibold text-white mb-4">Contact</h3>
            <div class="space-y-2 text-sm text-gray-400">
              <p>📧 support@campustour.edu</p>
              <p>📞 (555) 123-4567</p>
            </div>
          </div>
        </div>
        
        <!-- Copyright -->
        <div class="mt-8 pt-8 border-t border-gray-700">
          <div class="flex flex-col md:flex-row justify-between items-center">
            <p class="text-gray-400 text-sm">
              © {{ currentYear }} Campus Tour. All rights reserved.
            </p>
            <div class="flex space-x-6 mt-4 md:mt-0">
              <a href="#" class="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a>
              <a href="#" class="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style> 
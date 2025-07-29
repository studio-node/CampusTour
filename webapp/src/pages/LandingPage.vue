<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToTourSelection = () => {
  router.push('/select-school')
}

const goToAdminSignIn = () => {
  router.push('/admin/signin')
}
</script>

<template>
  <div class="min-h-screen bg-gray-900 flex flex-col">
    <!-- Hero Section -->
    <div class="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto text-center pt-10">
        <!-- Hero Image -->
        <!-- <div class="mb-12">
          <img 
            src="https://images.pexels.com/photos/159775/library-interior-reading-room-study-159775.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
            alt="Campus"
            class="w-full h-80 object-cover rounded-lg shadow-2xl"
          />
        </div> -->
        
        <!-- Main Heading -->
        <h1 class="text-5xl md:text-6xl font-bold text-white mb-6">
          Welcome to <span class="text-blue-400">Campus Tour</span>
        </h1>
        
        <p class="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
          Discover your perfect campus with personalized, ambassador-led tours tailored to your interests and goals.
        </p>

        <!-- Two Main Options -->
        <div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <!-- Student/Visitor Option -->
          <div class="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-blue-500 transition-all duration-300 transform hover:scale-105">
            <div class="mb-6">
              <div class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-white mb-3">Join a Campus Tour</h3>
              <p class="text-gray-400 mb-6">
                Connect with student ambassadors for a personalized guided tour experience. Perfect for prospective students and visitors.
              </p>
            </div>
            
            <button 
              @click="goToTourSelection"
              class="w-full bg-blue-600 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors duration-200 transform hover:scale-105"
            >
              Start Your Tour Journey
            </button>
            
            <div class="mt-4 text-sm text-gray-500">
              <p>✓ Connect with student ambassadors</p>
              <p>✓ Personalized tour experience</p>
              <p>✓ Explore areas that interest you</p>
            </div>
          </div>

          <!-- Admin/Staff Option -->
          <div class="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-green-500 transition-all duration-300 transform hover:scale-105">
            <div class="mb-6">
              <div class="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-white mb-3">Admin & Builder Access</h3>
              <p class="text-gray-400 mb-6">
                Access administrative tools, manage tours, view analytics, and configure campus tour experiences.
              </p>
            </div>
            
            <button 
              @click="goToAdminSignIn"
              class="w-full bg-green-600 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors duration-200 transform hover:scale-105"
            >
              Admin Sign In
            </button>
            
            <div class="mt-4 text-sm text-gray-500">
              <p>✓ Tour management tools</p>
              <p>✓ Analytics & reporting</p>
              <p>✓ User management</p>
            </div>
          </div>
        </div>

        <!-- Additional Info -->
        <div class="mt-16 text-center">
          <p class="text-gray-400 text-lg">
            Connecting prospective students with current students for authentic campus experiences
          </p>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="bg-gray-800 border-t border-gray-700 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center text-gray-400">
          <p>&copy; {{ new Date().getFullYear() }} Campus Tour. All rights reserved.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style> 
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PublicLayout from './components/PublicLayout.vue'
import AdminLayout from './components/AdminLayout.vue'

const route = useRoute()

// Determine which layout to use based on route meta
const currentLayout = computed(() => {
  return route.meta?.layout || 'public'
})
</script>

<template>
  <!-- Render the appropriate layout based on route -->
  <PublicLayout v-if="currentLayout === 'public'">
    <router-view />
  </PublicLayout>
  
  <AdminLayout v-else-if="currentLayout === 'admin'">
    <router-view />
  </AdminLayout>
          
  <!-- Fallback to public layout if no layout specified -->
  <PublicLayout v-else>
            <router-view />
  </PublicLayout>
</template>

<style scoped>
/* App-wide styles if needed */
</style>

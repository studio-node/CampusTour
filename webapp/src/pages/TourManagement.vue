<script setup>
import { ref } from 'vue'

const tours = ref([
  { id: 1, name: 'Engineering Campus Tour', school: 'Utah Tech University', stops: 8, status: 'Active', created: '2 days ago' },
  { id: 2, name: 'Arts & Science Tour', school: 'Utah Tech University', stops: 6, status: 'Active', created: '1 week ago' },
  { id: 3, name: 'Business School Tour', school: 'Utah Tech University', stops: 5, status: 'Draft', created: '3 days ago' }
])
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-white">Tour Management</h1>
          <p class="text-gray-400 mt-1">Manage tours and tour configurations</p>
        </div>
        <div class="space-x-2">
          <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Create Tour
          </button>
        </div>
      </div>
    </div>

    <!-- Tours Table -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
      <div class="p-6">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-700">
            <thead class="bg-gray-700">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tour Name</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Stops</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-gray-800 divide-y divide-gray-700">
              <tr v-for="tour in tours" :key="tour.id" class="hover:bg-gray-700">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-white">{{ tour.name }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-white">{{ tour.stops }} stops</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        :class="tour.status === 'Active' ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'">
                    {{ tour.status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {{ tour.created }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button class="text-blue-400 hover:text-blue-300">Edit</button>
                  <button class="text-green-400 hover:text-green-300">Preview</button>
                  <button class="text-red-400 hover:text-red-300">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>

<script setup>
import { ref } from 'vue'

const users = ref([
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Ambassador', status: 'Active', lastLogin: '2 hours ago' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Admin', status: 'Active', lastLogin: '1 day ago' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Ambassador', status: 'Inactive', lastLogin: '1 week ago' }
])
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-white">User Management</h1>
          <p class="text-gray-400 mt-1">Manage ambassadors, admins, and user accounts</p>
        </div>
        <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Add New User
        </button>
      </div>
    </div>

    <!-- Users Table -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-700">
        <h2 class="text-lg font-medium text-white">All Users</h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-700">
          <thead class="bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Role</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Last Login</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-gray-800 divide-y divide-gray-700">
            <tr v-for="user in users" :key="user.id" class="hover:bg-gray-700">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-white">{{ user.name }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-400">{{ user.email }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full" 
                      :class="user.role === 'Admin' ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'">
                  {{ user.role }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="user.status === 'Active' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'">
                  {{ user.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                {{ user.lastLogin }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button class="text-blue-400 hover:text-blue-300">Edit</button>
                <button class="text-red-400 hover:text-red-300">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>

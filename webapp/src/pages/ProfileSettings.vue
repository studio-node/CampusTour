<script setup>
import { ref } from 'vue'

const user = ref({
  name: 'Admin User',
  email: 'admin@utahtech.edu',
  role: 'Super Admin',
  phone: '+1 (555) 123-4567',
  organization: 'Utah Tech University'
})

const settings = ref({
  emailNotifications: true,
  smsNotifications: false,
  analyticsEmails: true,
  maintenanceMode: false,
  autoBackup: true
})

const activeTab = ref('profile')

const saveProfile = () => {
  // TODO: Save profile changes
  alert('Profile saved successfully!')
}

const saveSettings = () => {
  // TODO: Save settings changes  
  alert('Settings saved successfully!')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
      <h1 class="text-2xl font-bold text-white">Profile & Settings</h1>
      <p class="text-gray-400 mt-1">Manage your account and system preferences</p>
    </div>

    <!-- Tabs -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700">
      <div class="border-b border-gray-700">
        <nav class="-mb-px flex space-x-8 px-6">
          <button
            @click="activeTab = 'profile'"
            :class="activeTab === 'profile' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'"
            class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            Profile
          </button>
          <button
            @click="activeTab = 'settings'"
            :class="activeTab === 'settings' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'"
            class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            Settings
          </button>
          <button
            @click="activeTab = 'security'"
            :class="activeTab === 'security' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'"
            class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
          >
            Security
          </button>
        </nav>
      </div>

      <!-- Profile Tab -->
      <div v-if="activeTab === 'profile'" class="p-6">
        <div class="max-w-md space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <input v-model="user.name" type="text" class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <input v-model="user.email" type="email" class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
            <input v-model="user.phone" type="tel" class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Organization</label>
            <input v-model="user.organization" type="text" class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Role</label>
            <input v-model="user.role" type="text" disabled class="w-full border border-gray-600 bg-gray-600 text-gray-400 rounded-lg px-3 py-2 cursor-not-allowed">
          </div>
          
          <button @click="saveProfile" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Save Profile
          </button>
        </div>
      </div>

      <!-- Settings Tab -->
      <div v-if="activeTab === 'settings'" class="p-6">
        <div class="max-w-md space-y-6">
          <h3 class="text-lg font-medium text-white">Notification Preferences</h3>
          
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-300">Email Notifications</label>
              <input v-model="settings.emailNotifications" type="checkbox" class="h-4 w-4 text-blue-600 border-gray-600 bg-gray-700 rounded focus:ring-blue-500">
            </div>
            
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-300">SMS Notifications</label>
              <input v-model="settings.smsNotifications" type="checkbox" class="h-4 w-4 text-blue-600 border-gray-600 bg-gray-700 rounded focus:ring-blue-500">
            </div>
            
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-300">Weekly Analytics Emails</label>
              <input v-model="settings.analyticsEmails" type="checkbox" class="h-4 w-4 text-blue-600 border-gray-600 bg-gray-700 rounded focus:ring-blue-500">
            </div>
          </div>
          
          <h3 class="text-lg font-medium text-white pt-6">System Settings</h3>
          
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-300">Maintenance Mode</label>
              <input v-model="settings.maintenanceMode" type="checkbox" class="h-4 w-4 text-blue-600 border-gray-600 bg-gray-700 rounded focus:ring-blue-500">
            </div>
            
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-gray-300">Auto Backup</label>
              <input v-model="settings.autoBackup" type="checkbox" class="h-4 w-4 text-blue-600 border-gray-600 bg-gray-700 rounded focus:ring-blue-500">
            </div>
          </div>
          
          <button @click="saveSettings" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Save Settings
          </button>
        </div>
      </div>

      <!-- Security Tab -->
      <div v-if="activeTab === 'security'" class="p-6">
        <div class="max-w-md space-y-6">
          <h3 class="text-lg font-medium text-white">Change Password</h3>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Current Password</label>
            <input type="password" class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">New Password</label>
            <input type="password" class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
            <input type="password" class="w-full border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          </div>
          
          <button class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
            Update Password
          </button>
          
          <div class="border-t border-gray-700 pt-6">
            <h3 class="text-lg font-medium text-white mb-4">Two-Factor Authentication</h3>
            <p class="text-sm text-gray-400 mb-4">Add an extra layer of security to your account</p>
            <button class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
              Enable 2FA
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>

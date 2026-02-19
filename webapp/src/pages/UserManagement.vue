<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuth } from '../composables/useAuth.js'
import { getUserSchoolId } from '../services/locationsService.js'
import { getSchoolUsers, updateProfile, deactivateUser, createPartialUser, generatePin } from '../services/usersService.js'

const ROLES = ['admin', 'ambassador', 'builder', 'super-admin']

function formatLastLogin(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return '—'
  const now = new Date()
  const sec = Math.floor((now - d) / 1000)
  if (sec < 60) return 'Just now'
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`
  if (sec < 604800) return `${Math.floor(sec / 86400)} days ago`
  if (sec < 2592000) return `${Math.floor(sec / 604800)} weeks ago`
  return d.toLocaleDateString()
}

function displayRole(role) {
  if (!role) return '—'
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase().replace(/-/g, ' ')
}

const { user } = useAuth()
const users = ref([])
const loading = ref(true)
const errorMessage = ref('')
const successMessage = ref('')
const schoolId = ref(null)

const editUser = ref(null)
const editForm = ref({ full_name: '', email: '', role: '', is_active: true })
const editSaving = ref(false)
const deactivatingId = ref(null)

const showEditModal = computed(() => editUser.value !== null)

// Add User modal state
const showAddModal = ref(false)
const addForm = ref({ email: '', full_name: '', role: '' })
const generatedPin = ref('')
const creating = ref(false)

async function loadUsers() {
  loading.value = true
  errorMessage.value = ''
  try {
    const userId = user.value?.id
    if (!userId) {
      errorMessage.value = 'Not signed in.'
      return
    }
    const sid = await getUserSchoolId(userId)
    if (!sid) {
      errorMessage.value = 'Your account is not linked to a school. Check that your profile row in Supabase has a school_id set, and that the "profiles_select_own" RLS policy allows you to read your profile (see supabase/sql/007_profiles_select_own_guarantee.sql).'
      return
    }
    schoolId.value = sid
    const result = await getSchoolUsers(sid)
    if (!result.success) {
      errorMessage.value = result.error || 'Failed to load users.'
      return
    }
    users.value = (result.data || []).map((p) => ({
      id: p.id,
      full_name: p.full_name || '',
      email: p.email ?? '',
      role: p.role || '',
      is_active: p.is_active !== false,
      last_sign_in_at: p.last_sign_in_at,
      name: p.full_name || '—',
      emailDisplay: p.email ?? '—',
      roleDisplay: displayRole(p.role),
      status: p.is_active ? 'Active' : 'Inactive',
      lastLogin: formatLastLogin(p.last_sign_in_at)
    }))
  } catch (err) {
    console.error('UserManagement load error:', err)
    errorMessage.value = 'Failed to load users.'
  } finally {
    loading.value = false
  }
}

function openEdit(u) {
  editUser.value = u
  editForm.value = {
    full_name: u.full_name || '',
    email: u.email || '',
    role: u.role || '',
    is_active: u.is_active !== false
  }
}

function closeEdit() {
  editUser.value = null
}

async function saveEdit() {
  if (!editUser.value) return
  editSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const result = await updateProfile(editUser.value.id, {
      full_name: editForm.value.full_name || undefined,
      email: editForm.value.email || undefined,
      role: editForm.value.role || undefined,
      is_active: editForm.value.is_active
    })
    if (!result.success) {
      errorMessage.value = result.error || 'Failed to update user.'
      return
    }
    successMessage.value = 'User updated.'
    closeEdit()
    await loadUsers()
  } catch (err) {
    errorMessage.value = 'Failed to update user.'
  } finally {
    editSaving.value = false
  }
}

async function handleDeactivate(u) {
  if (!confirm(`Deactivate ${u.name || u.full_name}? They will no longer be able to sign in.`)) return
  deactivatingId.value = u.id
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const result = await deactivateUser(u.id)
    if (!result.success) {
      errorMessage.value = result.error || 'Failed to deactivate user.'
      return
    }
    successMessage.value = 'User deactivated.'
    await loadUsers()
  } catch (err) {
    errorMessage.value = 'Failed to deactivate user.'
  } finally {
    deactivatingId.value = null
  }
}

function openAddModal() {
  showAddModal.value = true
  addForm.value = { email: '', full_name: '', role: '' }
  generatedPin.value = ''
  errorMessage.value = ''
  successMessage.value = ''
}

function closeAddModal() {
  showAddModal.value = false
  addForm.value = { email: '', full_name: '', role: '' }
  generatedPin.value = ''
}

function handleGeneratePin() {
  generatedPin.value = generatePin()
}

async function handleCreateUser() {
  if (!addForm.value.email || !addForm.value.full_name || !addForm.value.role) {
    errorMessage.value = 'Please fill in all fields.'
    return
  }
  if (!generatedPin.value) {
    errorMessage.value = 'Please generate a PIN first.'
    return
  }
  creating.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const result = await createPartialUser({
      email: addForm.value.email,
      full_name: addForm.value.full_name,
      role: addForm.value.role,
      creation_token: generatedPin.value
    })
    if (!result.success) {
      errorMessage.value = result.error || 'Failed to create user.'
      return
    }
    successMessage.value = `User created! PIN: ${generatedPin.value} (share this with the user)`
    closeAddModal()
    await loadUsers()
  } catch (err) {
    errorMessage.value = 'Failed to create user.'
  } finally {
    creating.value = false
  }
}

onMounted(loadUsers)
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
        <button @click="openAddModal" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          Add New User
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div v-if="errorMessage" class="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
      {{ errorMessage }}
    </div>
    <div v-if="successMessage" class="bg-green-900/30 border border-green-700 text-green-200 px-4 py-3 rounded-lg">
      {{ successMessage }}
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="bg-gray-800 rounded-lg border border-gray-700 p-8 flex items-center justify-center">
      <div class="text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
        <p class="text-gray-400">Loading users...</p>
      </div>
    </div>

    <!-- Users Table (only when not loading) -->
    <div v-else class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-700">
        <h2 class="text-lg font-medium text-white">All Users</h2>
      </div>
      
      <div v-if="users.length === 0" class="px-6 py-8 text-center text-gray-400">
        No users found for your school.
      </div>
      
      <div v-else class="overflow-x-auto">
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
            <tr v-for="u in users" :key="u.id" class="hover:bg-gray-700">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-white">{{ u.name }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-400">{{ u.emailDisplay }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full" 
                      :class="u.roleDisplay.toLowerCase().startsWith('admin') ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'">
                  {{ u.roleDisplay }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="u.status === 'Active' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'">
                  {{ u.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                {{ u.lastLogin }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button class="text-blue-400 hover:text-blue-300" @click="openEdit(u)">Edit</button>
                <button
                  v-if="u.status === 'Active'"
                  class="text-amber-400 hover:text-amber-300"
                  :disabled="deactivatingId === u.id"
                  @click="handleDeactivate(u)"
                >
                  {{ deactivatingId === u.id ? 'Deactivating…' : 'Deactivate' }}
                </button>
                <span v-else class="text-gray-500">Inactive</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div v-if="showEditModal" class="fixed inset-0 z-50 overflow-y-auto" aria-modal="true" role="dialog">
      <div class="flex min-h-full items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/60" @click="closeEdit"></div>
        <div class="relative bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
          <h3 class="text-lg font-semibold text-white">Edit User</h3>
          <form @submit.prevent="saveEdit" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Full name</label>
              <input
                v-model="editForm.full_name"
                type="text"
                class="w-full rounded-lg bg-gray-700 border border-gray-600 text-white px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Full name"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                v-model="editForm.email"
                type="email"
                class="w-full rounded-lg bg-gray-700 border border-gray-600 text-white px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Email"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Role</label>
              <select
                v-model="editForm.role"
                class="w-full rounded-lg bg-gray-700 border border-gray-600 text-white px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select —</option>
                <option v-for="r in ROLES" :key="r" :value="r">{{ displayRole(r) }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Status</label>
              <select
                v-model="editForm.is_active"
                class="w-full rounded-lg bg-gray-700 border border-gray-600 text-white px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option :value="true">Active</option>
                <option :value="false">Inactive</option>
              </select>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                class="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700"
                @click="closeEdit"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                :disabled="editSaving"
              >
                {{ editSaving ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Add User Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 overflow-y-auto" aria-modal="true" role="dialog">
      <div class="flex min-h-full items-center justify-center p-4">
        <div class="fixed inset-0 bg-black/60" @click="closeAddModal"></div>
        <div class="relative bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
          <h3 class="text-lg font-semibold text-white">Add New User</h3>
          <form @submit.prevent="handleCreateUser" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                v-model="addForm.email"
                type="email"
                required
                class="w-full rounded-lg bg-gray-700 border border-gray-600 text-white px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Full name</label>
              <input
                v-model="addForm.full_name"
                type="text"
                required
                class="w-full rounded-lg bg-gray-700 border border-gray-600 text-white px-3 py-2 focus:ring-2 focus:ring-blue-500"
                placeholder="Full name"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Role</label>
              <select
                v-model="addForm.role"
                required
                class="w-full rounded-lg bg-gray-700 border border-gray-600 text-white px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select —</option>
                <option v-for="r in ROLES" :key="r" :value="r">{{ displayRole(r) }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">PIN (6-digit)</label>
              <div class="flex gap-2">
                <input
                  :value="generatedPin"
                  readonly
                  class="flex-1 rounded-lg bg-gray-700 border border-gray-600 text-white px-3 py-2 font-mono text-lg text-center"
                  placeholder="Click Generate"
                />
                <button
                  type="button"
                  @click="handleGeneratePin"
                  class="px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-500"
                >
                  Generate
                </button>
              </div>
              <p class="text-xs text-gray-400 mt-1">Share this PIN with the user for sign-up</p>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                class="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700"
                @click="closeAddModal"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                :disabled="creating || !generatedPin"
              >
                {{ creating ? 'Creating…' : 'Create User' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style>

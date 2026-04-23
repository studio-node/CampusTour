<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { schoolService } from '../services/schoolService.js'
import { leadsService } from '../services/leadsService.js'
import { getExpectedAttendanceOptions } from '../utils/expectedAttendance.js'

const router = useRouter()
const route = useRoute()

// Form data
const userInfo = ref({
  identity: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  email: '',
  phone: '',
  expectedAttendance: '',
})

const attendanceOptions = ref(getExpectedAttendanceOptions())

// State
const schoolId = ref(null)
const schoolData = ref(null)
const tourAppointmentId = ref(null)
const isSubmitting = ref(false)
const error = ref('')
const success = ref('')

// Validation errors
const errors = ref({})

// Identity options
const identityOptions = [
  { value: 'prospective-student', label: 'Prospective Student' },
  { value: 'friend-family', label: 'Friend/Family of Prospective Student' },
  { value: 'touring-campus', label: 'Just Touring Campus' }
]

/** Same pattern as mobile lead capture: extra fields only for prospective students. */
const showExtendedLeadFields = computed(
  () => userInfo.value.identity === 'prospective-student'
)

// Get selected school on mount
onMounted(async () => {
  // Get tour appointment ID from query parameters
  tourAppointmentId.value = route.query.tour_appointment_id || null
  
  const selectedSchoolId = schoolService.getSelectedSchool()
  if (!selectedSchoolId) {
    // If no school is selected, redirect back to school selection
    error.value = 'No school selected. Please select a school first.'
    router.replace('/select-school')
    return
  }
  
  schoolId.value = selectedSchoolId
  
  // Get school details for display
  try {
    const school = await schoolService.getSchoolById(selectedSchoolId)
    schoolData.value = school
  } catch (err) {
    console.error('Error fetching school details:', err)
  }
})

// Form validation
const validateField = (field, value) => {
  switch (field) {
    case 'identity':
      return value ? '' : 'Please select your identity'
    case 'firstName':
      return value.trim() ? '' : 'First name is required'
    case 'lastName':
      return value.trim() ? '' : 'Last name is required'
    case 'email':
      const emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      if (!value.trim()) return 'Email is required'
      if (!emailRegex.test(value)) return 'Please enter a valid email address'
      return ''
    case 'dateOfBirth':
      if (!value.trim()) return ''
      const dateRegex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/
      return dateRegex.test(value) ? '' : 'Please use MM/DD/YYYY format'
    case 'expectedAttendance':
      if (!value.trim()) return 'Select when you expect to start'
      return /^(fall|spring|summer)_[0-9]{4}$/i.test(value.trim())
        ? ''
        : 'Please select a term'
    default:
      return ''
  }
}

// Real-time validation
const validateAllFields = () => {
  if (!showExtendedLeadFields.value) {
    const err = validateField('identity', userInfo.value.identity)
    if (err) {
      errors.value = { identity: err }
    } else {
      errors.value = {}
    }
    return !err
  }
  const newErrors = {}
  Object.keys(userInfo.value).forEach((field) => {
    const e = validateField(field, userInfo.value[field])
    if (e) newErrors[field] = e
  })
  errors.value = newErrors
  return Object.keys(newErrors).length === 0
}

// Check if form is valid
const isFormValid = computed(() => {
  if (!userInfo.value.identity) return false
  if (!showExtendedLeadFields.value) {
    return !errors.value.identity
  }
  return (
    userInfo.value.firstName.trim() &&
    userInfo.value.lastName.trim() &&
    userInfo.value.email.trim() &&
    userInfo.value.expectedAttendance.trim() &&
    Object.keys(errors.value).length === 0
  )
})

// Update field and validate
const updateField = (field, value) => {
  userInfo.value[field] = value
  if (field === 'identity' && value !== 'prospective-student') {
    const err = validateField('identity', value)
    errors.value = err ? { identity: err } : {}
    return
  }
  if (field === 'identity' && value === 'prospective-student') {
    const err = validateField('identity', value)
    errors.value = err ? { identity: err } : {}
    return
  }
  const error = validateField(field, value)
  if (error) {
    errors.value[field] = error
  } else {
    delete errors.value[field]
  }
}

// Format date for database (YYYY-MM-DD)
const formatDateForDatabase = (dateString) => {
  if (!dateString.trim()) return null
  
  const parts = dateString.split('/')
  if (parts.length === 3) {
    const month = parts[0].padStart(2, '0')
    const day = parts[1].padStart(2, '0')
    const year = parts[2]
    
    // Basic validation
    if (year.length === 4 && parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
      return `${year}-${month}-${day}`
    }
  }
  
  return null
}


const generateConfirmationCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Handle form submission
const handleSubmit = async () => {
  // Validate all fields
  if (!validateAllFields()) {
    error.value = 'Please fix the errors below and try again.'
    return
  }

  if (!isFormValid.value) {
    error.value = 'Please fill out all required fields.'
    return
  }

  if (!schoolId.value) {
    error.value = 'No school selected. Please try again.'
    return
  }

  isSubmitting.value = true
  error.value = ''
  success.value = ''

  try {
    if (userInfo.value.identity !== 'prospective-student') {
      const query = {}
      if (tourAppointmentId.value) {
        query.tour_appointment_id = tourAppointmentId.value
      }
      await router.push({ path: '/select-interests', query })
      return
    }

    // Prepare lead data for database
    const leadData = {
      school_id: schoolId.value,
      first_name: userInfo.value.firstName.trim(),
      last_name: userInfo.value.lastName.trim(),
      identity: userInfo.value.identity,
      email: userInfo.value.email.trim().toLowerCase(),
      date_of_birth: formatDateForDatabase(userInfo.value.dateOfBirth),
      expected_attendance: userInfo.value.expectedAttendance.trim().toLowerCase(),
      tour_type: 'ambassador-led',
      tour_appointment_id: tourAppointmentId.value,
      appointment_confirmation: generateConfirmationCode()
    }

    // Save to database
    const result = await leadsService.createLead(leadData)

    console.log('result of creating lead:', result)

    if (result.success) {
      success.value = 'Information saved successfully!'
      router.push({
        path: '/select-interests',
        query: { 
          tour_appointment_id: tourAppointmentId.value,
          lead_id: result.data.id,
          confirmation_code: leadData.appointment_confirmation
        }
      })
    } else {
      error.value = result.error || 'Failed to save your information. Please try again.'
    }
  } catch (err) {
    console.error('Error saving lead:', err)
    error.value = 'An unexpected error occurred. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

// Handle back navigation
const handleBack = () => {
  router.push('/tour-groups')
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- Back Button -->
    <div class="mb-6">
      <button 
        @click="handleBack"
        class="flex items-center text-gray-300 hover:text-white transition-colors duration-200"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>
    </div>

    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">
        Tell us about yourself
      </h1>
      <p class="text-xl text-gray-300 mb-6">
        Help us personalize your campus tour experience
      </p>
      
      <!-- Selected School Display -->
      <div v-if="schoolData" class="bg-gray-800 rounded-lg p-4 border border-gray-700 inline-flex items-center">
        <div v-if="schoolData.logo_url" class="mr-3">
          <img 
            :src="schoolData.logo_url" 
            :alt="schoolData.name"
            class="w-10 h-10 object-contain rounded"
          />
        </div>
        <div class="text-left">
          <p class="text-white font-medium">{{ schoolData.name }}</p>
          <p class="text-gray-400 text-sm">{{ schoolData.city }}, {{ schoolData.state }}</p>
        </div>
      </div>
    </div>

    <!-- Success Message -->
    <div v-if="success" class="bg-green-900 bg-opacity-50 border border-green-500 rounded-lg p-4 mb-6">
      <p class="text-green-200">{{ success }}</p>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="bg-red-900 bg-opacity-50 border border-red-500 rounded-lg p-4 mb-6">
      <p class="text-red-200">{{ error }}</p>
    </div>

    <!-- Form -->
    <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-8">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Identity Field -->
        <div>
          <label class="block text-sm font-medium text-white mb-2">
            Identity <span class="text-red-400">*</span>
          </label>
          <select
            :value="userInfo.identity"
            @change="updateField('identity', $event.target.value)"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :class="{ 'border-red-500': errors.identity, 'text-gray-400': !userInfo.identity, 'text-white': userInfo.identity }"
            placeholder="Select your identity"
          >
            <option value="" disabled selected>Select your identity</option>
            <option class="text-white" v-for="option in identityOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <p v-if="errors.identity" class="mt-1 text-sm text-red-400">{{ errors.identity }}</p>
        </div>

        <template v-if="showExtendedLeadFields">
        <!-- Two Column Layout for larger screens -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-white mb-2">
              First name <span class="text-red-400">*</span>
            </label>
            <input
              type="text"
              :value="userInfo.firstName"
              @input="updateField('firstName', $event.target.value)"
              placeholder="First name"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="{ 'border-red-500': errors.firstName }"
            />
            <p v-if="errors.firstName" class="mt-1 text-sm text-red-400">{{ errors.firstName }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-white mb-2">
              Last name <span class="text-red-400">*</span>
            </label>
            <input
              type="text"
              :value="userInfo.lastName"
              @input="updateField('lastName', $event.target.value)"
              placeholder="Last name"
              class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              :class="{ 'border-red-500': errors.lastName }"
            />
            <p v-if="errors.lastName" class="mt-1 text-sm text-red-400">{{ errors.lastName }}</p>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-white mb-2">
            Email <span class="text-red-400">*</span>
          </label>
          <input
            type="email"
            :value="userInfo.email"
            @input="updateField('email', $event.target.value)"
            placeholder="Enter your email"
            class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :class="{ 'border-red-500': errors.email }"
          />
          <p v-if="errors.email" class="mt-1 text-sm text-red-400">{{ errors.email }}</p>
        </div>

        <!-- Optional Fields Section -->
        <div class="border-t border-gray-700 pt-6">
          <h3 class="text-lg font-medium text-white mb-4">Optional Information</h3>
          
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Date of Birth -->
            <div>
              <label class="block text-sm font-medium text-white mb-2">
                Date of Birth
              </label>
              <input
                type="text"
                :value="userInfo.dateOfBirth"
                @input="updateField('dateOfBirth', $event.target.value)"
                placeholder="MM/DD/YYYY"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="{ 'border-red-500': errors.dateOfBirth }"
              />
              <p v-if="errors.dateOfBirth" class="mt-1 text-sm text-red-400">{{ errors.dateOfBirth }}</p>
            </div>

            <div class="lg:col-span-2">
              <label class="block text-sm font-medium text-white mb-2">
                Expected {{ schoolData?.name || 'college' }} attendance <span class="text-red-400">*</span>
              </label>
              <select
                :value="userInfo.expectedAttendance"
                @change="updateField('expectedAttendance', $event.target.value)"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                :class="{ 'border-red-500': errors.expectedAttendance, 'text-gray-400': !userInfo.expectedAttendance, 'text-white': userInfo.expectedAttendance }"
              >
                <option value="" disabled selected>Select a term</option>
                <option class="text-white" v-for="opt in attendanceOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <p v-if="errors.expectedAttendance" class="mt-1 text-sm text-red-400">{{ errors.expectedAttendance }}</p>
            </div>

            <!-- Phone Number -->
            <div>
              <label class="block text-sm font-medium text-white mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                :value="userInfo.phone"
                @input="updateField('phone', $event.target.value)"
                placeholder="Enter your phone number"
                class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
        </template>

        <!-- Submit Button -->
        <div class="pt-6">
          <button
            type="submit"
            :disabled="!isFormValid || isSubmitting"
            :class="[
              'w-full py-3 px-6 rounded-lg font-medium transition-all duration-200',
              isFormValid && !isSubmitting
                ? 'bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            ]"
          >
            <span v-if="isSubmitting" class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
                         <span v-else>Continue to Interest Selection</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Additional styles if needed */
</style> 
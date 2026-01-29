<script setup>
import { ref, watch, onMounted } from 'vue'
import { locationMediaService } from '../services/locationMediaService.js'

const props = defineProps({
  locationId: {
    type: String,
    required: true
  },
  isBuilder: {
    type: Boolean,
    default: false
  },
  builderPasscode: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['media-changed'])

const media = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Primary image inputs
const primaryUrlInput = ref('')
const primaryFileInput = ref(null)
const primaryUploading = ref(false)

// Additional media inputs
const additionalUrlInput = ref('')
const additionalFileInput = ref(null)
const additionalUploading = ref(false)

const primaryImage = ref(null)
const additionalMedia = ref([])

function partitionMedia() {
  const primary = media.value.find(m => m.media_type === 'primaryImage')
  const additional = media.value.filter(m => m.media_type === 'additional')
  primaryImage.value = primary || null
  additionalMedia.value = additional
}

// Detect video by URL extension (for display)
function isVideoUrl(url) {
  if (!url || typeof url !== 'string') return false
  const lower = url.toLowerCase()
  return /\.(mp4|webm|mov|ogg|m4v|avi)(\?|$)/.test(lower)
}

async function fetchMedia() {
  if (!props.locationId) return
  isLoading.value = true
  errorMessage.value = ''
  try {
    media.value = await locationMediaService.getMediaByLocation(props.locationId)
    partitionMedia()
    emit('media-changed')
  } catch (e) {
    errorMessage.value = 'Failed to load media'
  } finally {
    isLoading.value = false
  }
}

async function removeExistingPrimary() {
  const existing = media.value.find(m => m.media_type === 'primaryImage')
  if (!existing) return
  if (props.isBuilder) {
    await locationMediaService.deleteMediaAsBuilder(props.locationId, props.builderPasscode, existing.id)
  } else {
    await locationMediaService.deleteMedia(existing.id)
  }
}

async function addPrimaryByUrl() {
  const url = primaryUrlInput.value?.trim()
  if (!url) return
  errorMessage.value = ''
  successMessage.value = ''
  primaryUploading.value = true
  try {
    await removeExistingPrimary()
    let result
    if (props.isBuilder) {
      result = await locationMediaService.addMediaByUrlAsBuilder(
        props.locationId,
        props.builderPasscode,
        { mediaType: 'primaryImage', url }
      )
    } else {
      result = await locationMediaService.addMediaByUrl(props.locationId, {
        mediaType: 'primaryImage',
        url,
        storedInSupabase: false
      })
    }
    if (result.success) {
      primaryUrlInput.value = ''
      await fetchMedia()
      successMessage.value = 'Primary image added'
    } else {
      errorMessage.value = result.error || 'Failed to add'
    }
  } finally {
    primaryUploading.value = false
  }
}

async function addPrimaryByUpload() {
  const input = primaryFileInput.value
  if (!input?.files?.length) return
  const file = input.files[0]
  if (!file) return
  errorMessage.value = ''
  successMessage.value = ''
  primaryUploading.value = true
  try {
    await removeExistingPrimary()
    let result
    if (props.isBuilder) {
      result = await locationMediaService.uploadMediaAsBuilder(
        props.locationId,
        props.builderPasscode,
        file,
        'primaryImage'
      )
    } else {
      result = await locationMediaService.uploadMedia(props.locationId, file, { mediaType: 'primaryImage' })
    }
    if (result.success) {
      input.value = ''
      await fetchMedia()
      successMessage.value = 'Primary image uploaded'
    } else {
      errorMessage.value = result.error || 'Failed to upload'
    }
  } finally {
    primaryUploading.value = false
  }
}

async function addAdditionalByUrl() {
  const url = additionalUrlInput.value?.trim()
  if (!url) return
  errorMessage.value = ''
  successMessage.value = ''
  additionalUploading.value = true
  try {
    let result
    if (props.isBuilder) {
      result = await locationMediaService.addMediaByUrlAsBuilder(
        props.locationId,
        props.builderPasscode,
        { mediaType: 'additional', url }
      )
    } else {
      result = await locationMediaService.addMediaByUrl(props.locationId, {
        mediaType: 'additional',
        url,
        storedInSupabase: false
      })
    }
    if (result.success) {
      additionalUrlInput.value = ''
      await fetchMedia()
      successMessage.value = 'Media added'
    } else {
      errorMessage.value = result.error || 'Failed to add'
    }
  } finally {
    additionalUploading.value = false
  }
}

async function addAdditionalByUpload() {
  const input = additionalFileInput.value
  if (!input?.files?.length) return
  const file = input.files[0]
  if (!file) return
  errorMessage.value = ''
  successMessage.value = ''
  additionalUploading.value = true
  try {
    let result
    if (props.isBuilder) {
      result = await locationMediaService.uploadMediaAsBuilder(
        props.locationId,
        props.builderPasscode,
        file,
        'additional'
      )
    } else {
      result = await locationMediaService.uploadMedia(props.locationId, file)
    }
    if (result.success) {
      input.value = ''
      await fetchMedia()
      successMessage.value = 'Media uploaded'
    } else {
      errorMessage.value = result.error || 'Failed to upload'
    }
  } finally {
    additionalUploading.value = false
  }
}

async function deleteMediaItem(item) {
  errorMessage.value = ''
  successMessage.value = ''
  try {
    let result
    if (props.isBuilder) {
      result = await locationMediaService.deleteMediaAsBuilder(
        props.locationId,
        props.builderPasscode,
        item.id
      )
    } else {
      result = await locationMediaService.deleteMedia(item.id)
    }
    if (result.success) {
      await fetchMedia()
      successMessage.value = 'Media removed'
    } else {
      errorMessage.value = result.error || 'Failed to delete'
    }
  } catch (e) {
    errorMessage.value = 'Failed to delete'
  }
}

async function setAsPrimary(item) {
  if (props.isBuilder) return
  errorMessage.value = ''
  successMessage.value = ''
  const result = await locationMediaService.setPrimaryImage(props.locationId, item.id)
  if (result.success) {
    await fetchMedia()
    successMessage.value = 'Primary image updated'
  } else {
    errorMessage.value = result.error || 'Failed to update'
  }
}

watch(() => props.locationId, fetchMedia, { immediate: true })
onMounted(fetchMedia)
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-lg font-semibold text-white">Location Media</h2>

    <div v-if="errorMessage" class="p-4 bg-red-900 border border-red-700 rounded-lg">
      <p class="text-red-200 text-sm">{{ errorMessage }}</p>
    </div>
    <div v-if="successMessage" class="p-4 bg-green-900 border border-green-700 rounded-lg">
      <p class="text-green-200 text-sm">{{ successMessage }}</p>
    </div>

    <div v-if="isLoading" class="text-gray-400 text-sm">Loading media…</div>

    <template v-else>
      <!-- Primary Image -->
      <div class="space-y-3">
        <label class="block text-sm font-medium text-gray-300">Primary Image</label>
        <p class="text-xs text-gray-400">The main image shown for this location. Only one primary image.</p>

        <div v-if="primaryImage" class="flex items-center gap-4 p-4 bg-gray-700 rounded-lg">
          <img
            :src="primaryImage.url"
            :alt="'Primary image'"
            class="w-24 h-24 object-cover rounded"
          />
          <div class="flex-1">
            <p class="text-xs text-gray-400 truncate max-w-xs">{{ primaryImage.url }}</p>
          </div>
          <button
            type="button"
            :disabled="disabled"
            @click="deleteMediaItem(primaryImage)"
            class="px-3 py-1 text-sm text-red-400 hover:text-red-200 disabled:opacity-50"
          >
            Remove
          </button>
        </div>

        <div class="flex flex-wrap gap-3">
          <input
            v-model="primaryUrlInput"
            type="url"
            placeholder="Or paste a public image URL"
            :disabled="disabled"
            class="flex-1 min-w-[200px] border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            @keydown.enter.prevent="addPrimaryByUrl"
          />
          <button
            type="button"
            :disabled="disabled || !primaryUrlInput?.trim() || primaryUploading"
            @click="addPrimaryByUrl"
            class="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 text-sm"
          >
            Add URL
          </button>
          <label class="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 cursor-pointer disabled:opacity-50 text-sm">
            <input
              ref="primaryFileInput"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              :disabled="disabled"
              class="hidden"
              @change="addPrimaryByUpload"
            />
            {{ primaryUploading ? 'Uploading…' : 'Upload' }}
          </label>
        </div>
      </div>

      <!-- Additional Media -->
      <div class="space-y-3">
        <label class="block text-sm font-medium text-gray-300">Additional Media</label>
        <p class="text-xs text-gray-400">Extra images and videos for this location.</p>

        <div v-if="additionalMedia.length" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <div
            v-for="item in additionalMedia"
            :key="item.id"
            class="relative group p-2 bg-gray-700 rounded-lg"
          >
            <template v-if="isVideoUrl(item.url)">
              <video
                :src="item.url"
                controls
                class="w-full aspect-square object-cover rounded"
                preload="metadata"
              />
            </template>
            <img
              v-else
              :src="item.url"
              :alt="'Media'"
              class="w-full aspect-square object-cover rounded"
            />
            <div class="flex justify-between items-center mt-2">
              <button
                v-if="!isBuilder && !isVideoUrl(item.url)"
                type="button"
                @click="setAsPrimary(item)"
                class="text-xs text-blue-400 hover:text-blue-200"
              >
                Set primary
              </button>
              <span v-else></span>
              <button
                type="button"
                :disabled="disabled"
                @click="deleteMediaItem(item)"
                class="text-xs text-red-400 hover:text-red-200 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-3">
          <input
            v-model="additionalUrlInput"
            type="url"
            placeholder="Paste image or video URL (mp4, webm, etc.)"
            :disabled="disabled"
            class="flex-1 min-w-[200px] border border-gray-600 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            @keydown.enter.prevent="addAdditionalByUrl"
          />
          <button
            type="button"
            :disabled="disabled || !additionalUrlInput?.trim() || additionalUploading"
            @click="addAdditionalByUrl"
            class="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 text-sm"
          >
            Add URL
          </button>
          <label class="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 cursor-pointer disabled:opacity-50 text-sm">
            <input
              ref="additionalFileInput"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,video/ogg,video/x-msvideo"
              :disabled="disabled"
              class="hidden"
              @change="addAdditionalByUpload"
            />
            {{ additionalUploading ? 'Uploading…' : 'Upload' }}
          </label>
        </div>
      </div>
    </template>
  </div>
</template>

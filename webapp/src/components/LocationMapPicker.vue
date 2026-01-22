<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon issue
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

const props = defineProps({
  initialLat: {
    type: Number,
    default: 37.7749 // Default to San Francisco if not provided
  },
  initialLng: {
    type: Number,
    default: -122.4194
  },
  modelValue: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const mapContainer = ref(null)
let map = null
let marker = null

// Initialize map
onMounted(() => {
  if (!mapContainer.value) return

  // Create map
  map = L.map(mapContainer.value).setView([props.initialLat, props.initialLng], 15)

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map)

  // Add click handler to place/update marker
  map.on('click', (e) => {
    const { lat, lng } = e.latlng
    
    if (marker) {
      marker.setLatLng([lat, lng])
    } else {
      marker = L.marker([lat, lng], {
        draggable: true
      }).addTo(map)
      
      // Update coordinates when marker is dragged
      marker.on('dragend', (e) => {
        const position = e.target.getLatLng()
        emit('update:modelValue', {
          latitude: position.lat,
          longitude: position.lng
        })
      })
    }
    
    // Emit coordinates
    emit('update:modelValue', {
      latitude: lat,
      longitude: lng
    })
  })

  // If initial coordinates are provided, place marker
  if (props.modelValue?.latitude && props.modelValue?.longitude) {
    marker = L.marker([props.modelValue.latitude, props.modelValue.longitude], {
      draggable: true
    }).addTo(map)
    
    marker.on('dragend', (e) => {
      const position = e.target.getLatLng()
      emit('update:modelValue', {
        latitude: position.lat,
        longitude: position.lng
      })
    })
  }
})

// Watch for initial coordinate changes (when school coordinates are fetched)
watch([() => props.initialLat, () => props.initialLng], ([lat, lng]) => {
  if (map && lat && lng) {
    map.setView([lat, lng], 15)
  }
})

// Watch for external coordinate changes
watch(() => props.modelValue, (newValue) => {
  if (newValue?.latitude && newValue?.longitude && marker) {
    marker.setLatLng([newValue.latitude, newValue.longitude])
    map.setView([newValue.latitude, newValue.longitude], map.getZoom())
  }
}, { deep: true })

// Cleanup
onUnmounted(() => {
  if (map) {
    map.remove()
  }
})
</script>

<template>
  <div 
    ref="mapContainer" 
    class="w-full h-96 rounded-lg border border-gray-600"
    style="z-index: 0;"
  ></div>
</template>

<style scoped>
/* Leaflet map container styles */
:deep(.leaflet-container) {
  background-color: #1f2937;
}

:deep(.leaflet-popup-content-wrapper) {
  background-color: #374151;
  color: #f3f4f6;
}

:deep(.leaflet-popup-tip) {
  background-color: #374151;
}
</style>

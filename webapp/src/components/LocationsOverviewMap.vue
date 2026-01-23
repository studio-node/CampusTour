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
  locations: {
    type: Array,
    default: () => []
  },
  centerLat: {
    type: Number,
    default: 37.7749
  },
  centerLng: {
    type: Number,
    default: -122.4194
  },
  newLocationCoords: {
    type: Object,
    default: null
  }
})

const mapContainer = ref(null)
let map = null
let markers = []
let newLocationMarker = null

// Create custom div icon with order index
function createOrderIndexIcon(orderIndex) {
  return L.divIcon({
    className: 'custom-order-marker',
    html: `<div class="order-marker-content">${orderIndex !== null && orderIndex !== undefined ? orderIndex : '?'}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  })
}

// Create custom div icon for new location (red, larger, "NEW")
function createNewLocationIcon() {
  return L.divIcon({
    className: 'custom-new-location-marker',
    html: `<div class="new-location-marker-content">NEW</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  })
}

// Initialize map
onMounted(() => {
  if (!mapContainer.value) return

  // Create map
  map = L.map(mapContainer.value).setView([props.centerLat, props.centerLng], 15)

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map)

  // Add markers for all locations and new location if present
  updateMarkers()
  
  // Also add new location marker if coordinates are already set
  if (props.newLocationCoords) {
    updateNewLocationMarker(props.newLocationCoords)
  }
})

// Watch for location changes
watch(() => props.locations, () => {
  updateMarkers()
}, { deep: true })

// Watch for new location coordinates changes
watch(() => props.newLocationCoords, (newCoords) => {
  updateNewLocationMarker(newCoords)
}, { deep: true })

// Update markers on map
function updateMarkers() {
  if (!map) return

  // Remove existing location markers
  markers.forEach(marker => map.removeLayer(marker))
  markers = []

  // Add markers for each location
  props.locations.forEach(location => {
    if (location.latitude && location.longitude) {
      const marker = L.marker([location.latitude, location.longitude], {
        icon: createOrderIndexIcon(location.order_index)
      }).addTo(map)

      // Add popup with location name
      marker.bindPopup(`
        <div class="text-sm">
          <strong>${location.name || 'Unnamed Location'}</strong><br>
          Order Index: ${location.order_index !== null && location.order_index !== undefined ? location.order_index : 'Not set'}
        </div>
      `)

      markers.push(marker)
    }
  })

  // Update new location marker
  updateNewLocationMarker(props.newLocationCoords)

  // Fit map to show all markers (including new location if present)
  fitMapToMarkers()
}

// Update new location marker
function updateNewLocationMarker(newCoords) {
  if (!map) return

  // Remove existing new location marker
  if (newLocationMarker) {
    map.removeLayer(newLocationMarker)
    newLocationMarker = null
  }

  // Add new location marker if coordinates are provided
  if (newCoords && newCoords.latitude && newCoords.longitude) {
    newLocationMarker = L.marker([newCoords.latitude, newCoords.longitude], {
      icon: createNewLocationIcon(),
      zIndexOffset: 1000 // Make sure it appears on top
    }).addTo(map)

    // Add popup
    newLocationMarker.bindPopup(`
      <div class="text-sm">
        <strong style="color: #ef4444;">New Location</strong><br>
        Coordinates: ${newCoords.latitude.toFixed(6)}, ${newCoords.longitude.toFixed(6)}
      </div>
    `)
  }

  // Update map bounds to include new marker
  fitMapToMarkers()
}

// Fit map to show all markers
function fitMapToMarkers() {
  if (!map) return

  const allMarkers = [...markers]
  if (newLocationMarker) {
    allMarkers.push(newLocationMarker)
  }

  if (allMarkers.length > 0) {
    const group = new L.featureGroup(allMarkers)
    map.fitBounds(group.getBounds().pad(0.1))
  }
}

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

/* Custom order index marker styles */
:deep(.custom-order-marker) {
  background: transparent;
  border: none;
}

:deep(.order-marker-content) {
  width: 30px;
  height: 30px;
  background-color: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* New location marker styles (red, larger) */
:deep(.custom-new-location-marker) {
  background: transparent;
  border: none;
}

:deep(.new-location-marker-content) {
  width: 40px;
  height: 40px;
  background-color: #ef4444;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 11px;
  border: 3px solid white;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
</style>

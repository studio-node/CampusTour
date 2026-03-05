<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import '@geoman-io/leaflet-geoman-free'

const props = defineProps({
  centerLat: { type: Number, default: 37.7749 },
  centerLng: { type: Number, default: -122.4194 },
  deadzones: {
    type: Array,
    default: () => []
  },
  selectedIndex: { type: Number, default: null }
})

const emit = defineEmits(['update:deadzones'])

const mapContainer = ref(null)
let map = null
let polygonLayerGroup = null

function latLngsToOurFormat(latlngs) {
  if (!latlngs || !latlngs.length) return []
  const ring = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs
  return ring.map(ll => ({
    latitude: typeof ll.lat === 'function' ? ll.lat() : ll.lat,
    longitude: typeof ll.lng === 'function' ? ll.lng() : ll.lng
  }))
}

function ourFormatToLatLngs(polygon) {
  if (!polygon || polygon.length < 3) return []
  return polygon.map(p => [p.latitude, p.longitude])
}

function emitLayerEdit(layer) {
  console.log('emitLayerEdit')
  const idx = layer._deadzoneIndex
  if (idx === undefined) return
  const latlngs = layer.getLatLngs()
  const newPolygon = latLngsToOurFormat(latlngs)
  if (newPolygon.length < 3) return
  const next = [...(props.deadzones || [])]
  next[idx] = newPolygon
  emit('update:deadzones', next)
}

function syncDeadzonesToMap() {
  if (!map || !polygonLayerGroup) return
  polygonLayerGroup.clearLayers()
  const raw = props.deadzones || []
  raw.forEach((polygon, index) => {
    const pts = ourFormatToLatLngs(polygon)
    if (pts.length < 3) return
    const layer = L.polygon(pts, {
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0.35,
      weight: 2
    })
    layer._deadzoneIndex = index
    layer.on('pm:edit', (e) => emitLayerEdit(e.layer))
    layer.on('pm:update', (e) => emitLayerEdit(e.layer))
    layer.addTo(polygonLayerGroup)
  })
}

onMounted(() => {
  if (!mapContainer.value) return
  map = L.map(mapContainer.value).setView([props.centerLat, props.centerLng], 15)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map)

  polygonLayerGroup = L.featureGroup().addTo(map)

  map.pm.addControls({
    drawMarker: false,
    drawPolyline: false,
    drawCircle: false,
    drawRectangle: false,
    drawCircleMarker: false,
    cutPolygon: false,
    drawText: false,
    drawPolygon: true,
    editMode: true,
    removalMode: true,
    rotateMode: false
  })

  map.pm.setPathOptions({
    color: '#ef4444',
    fillColor: '#ef4444',
    fillOpacity: 0.35,
    weight: 2
  })

  map.on('pm:create', (e) => {
    if (e.shape !== 'Polygon') return
    const layer = e.layer
    const latlngs = layer.getLatLngs()
    const ring = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs
    if (ring.length < 3) {
      map.removeLayer(layer)
      return
    }
    const newPolygon = latLngsToOurFormat(latlngs)
    map.removeLayer(layer)
    const current = props.deadzones || []
    emit('update:deadzones', [...current, newPolygon])
  })

  map.on('pm:remove', (e) => {
    const layer = e.layer
    const idx = layer._deadzoneIndex
    if (idx === undefined) return
    const next = (props.deadzones || []).filter((_, i) => i !== idx)
    emit('update:deadzones', next)
  })

  syncDeadzonesToMap()
})

watch(() => props.deadzones, () => {
  syncDeadzonesToMap()
}, { deep: true })

watch([() => props.centerLat, () => props.centerLng], ([lat, lng]) => {
  if (map && lat != null && lng != null) {
    map.setView([lat, lng], map.getZoom())
  }
})

watch(() => props.selectedIndex, (idx) => {
  if (!map || !polygonLayerGroup || idx == null || idx < 0) return
  const layers = polygonLayerGroup.getLayers()
  const layer = layers[idx]
  if (layer && layer.getBounds) {
    map.fitBounds(layer.getBounds(), { padding: [20, 20], maxZoom: 17 })
  }
})

onUnmounted(() => {
  if (map) {
    map.remove()
  }
})
</script>

<template>
  <div
    ref="mapContainer"
    class="w-full h-[60em] rounded-lg border border-gray-600"
    style="z-index: 0;"
  />
</template>

<style scoped>
:deep(.leaflet-container) {
  background-color: #1f2937;
}
:deep(.leaflet-pm-toolbar) {
  margin: 8px;
}
:deep(.leaflet-pm-actions-container) {
  background: #374151;
  border-radius: 8px;
}
</style>

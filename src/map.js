import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { compounds } from './data/compounds.js'
import { PHONE_TEL, WHATSAPP_URL } from './config.js'

/**
 * Branch coordinates
 * ----------------
 * Google share.google links were opaque (no public lat/lng redirect).
 * Coordinates reused from prior Marieliez PharmacyMap + public listings:
 *  - Al Golf / Nasr City: 30.081708, 31.3271294 (23 Ahmed Tayseer St.)
 *  - Highland Park / New Cairo: 29.991139, 31.5088302 (Highland Park Mall, El Andalus)
 * East Cairo compound polygons + logos: Sakneen SODIC public map API (2026-08-22).
 */

const WHATSAPP = WHATSAPP_URL

const BRANCH_FOCUS_ZOOM = 15
const FLY_DURATION_MS = 1400

const branches = [
  {
    id: 'golf',
    name: 'Al Golf Branch',
    area: 'Nasr City',
    address: '23 Ahmed Tayseer St., Al Golf, Nasr City',
    lat: 30.081708,
    lng: 31.3271294,
  },
  {
    id: 'tagamoa',
    name: 'Highland Park Branch',
    area: 'New Cairo',
    address: 'Highland Park Mall, El Andalus, South Investors, New Cairo',
    lat: 29.991139,
    lng: 31.5088302,
  },
]

const hospitals = [
  {
    name: 'Cleopatra Hospital',
    context: 'Near Al Golf / Heliopolis — well-known neighbour for the Nasr City branch.',
    lat: 30.0931614,
    lng: 31.3297425,
  },
  {
    name: 'Air Force Specialized Hospital',
    context: 'South 90th Street, New Cairo — major hospital near Fifth Settlement.',
    lat: 30.0176227,
    lng: 31.4345662,
  },
  {
    name: 'New Cairo Hospital',
    context: 'New Cairo medical landmark west of the Highland Park area.',
    lat: 29.978997,
    lng: 31.4362796,
  },
]

/** Compounds near New Cairo / Highland Park — used for the default camera frame. */
const LOCAL_COMPOUND_IDS = new Set([
  'akoya',
  'sodic-eastown',
  'sodic-vilette',
  'sodic-kattameya-plaza',
  'sodic-ednc',
])

const reduceMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Leaflet forces `.leaflet-marker-pane img { max-width:none !important; width:auto }`,
 * so <img> logos inside DivIcons paint at native size (compound PNGs ~700–850px,
 * pwa-192 at 192px). Use CSS background-image on fixed boxes instead.
 */
function pharmacyIcon() {
  return L.divIcon({
    className: 'map-marker-pharmacy',
    html: `<span class="map-marker-pharmacy-inner" aria-hidden="true"></span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -40],
  })
}

/** Initials logo from hospital name (e.g. "Air Force Specialized Hospital" → "AF"). */
function hospitalInitials(name) {
  const stop = new Set([
    'hospital',
    'specialized',
    'medical',
    'clinic',
    'centre',
    'center',
    'the',
    'of',
    'and',
  ])
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z]/g, ''))
    .filter((w) => w && !stop.has(w.toLowerCase()))
  if (words.length === 0) return name.slice(0, 2).toUpperCase()
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function hospitalIcon(hospital) {
  const initials = hospitalInitials(hospital.name)
  return L.divIcon({
    className: 'map-marker-hospital',
    html: `<span class="map-marker-hospital-inner" aria-hidden="true">
      <span class="map-marker-hospital-initials">${initials}</span>
    </span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -18],
  })
}

function compoundLogoIcon(compound) {
  if (!compound.logo) return null
  const safeUrl = String(compound.logo).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  return L.divIcon({
    className: 'map-marker-compound',
    html: `<span class="map-marker-compound-inner" style="--marker-logo:url('${safeUrl}')" aria-hidden="true"></span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -18],
  })
}

function ringCentroid(ring) {
  let lat = 0
  let lng = 0
  for (const [la, ln] of ring) {
    lat += la
    lng += ln
  }
  const n = ring.length || 1
  return [lat / n, lng / n]
}

function pharmacyPopup(branch) {
  return `
    <div class="map-popup">
      <strong>${branch.name}</strong>
      <p>${branch.address}</p>
      <div class="map-popup-actions">
        <a href="${WHATSAPP}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a href="${PHONE_TEL}">Call</a>
      </div>
    </div>
  `
}

function compoundPopup(compound) {
  const logo = compound.logo
    ? `<img class="map-popup-logo" src="${compound.logo}" alt="" width="72" height="36" style="width:88px;height:28px;max-width:88px;max-height:28px;object-fit:contain;display:block;" />`
    : ''
  return `
    <div class="map-popup map-popup-compound">
      ${logo}
      <strong>${compound.name}</strong>
      <p>${compound.context}</p>
    </div>
  `
}

function setActiveBranch(branchId) {
  document.querySelectorAll('.branch-list [data-branch-id]').forEach((el) => {
    const active = el.getAttribute('data-branch-id') === branchId
    el.classList.toggle('is-active', active)
    el.setAttribute('aria-current', active ? 'true' : 'false')
  })
}

function focusBranch(map, marker, branch, { open = true } = {}) {
  if (!map || !branch) return

  setActiveBranch(branch.id)

  const duration = reduceMotion() ? 0 : FLY_DURATION_MS / 1000
  map.flyTo([branch.lat, branch.lng], BRANCH_FOCUS_ZOOM, {
    animate: duration > 0,
    duration,
    easeLinearity: 0.22,
  })

  if (open && marker) {
    const openPopup = () => marker.openPopup()
    if (duration > 0) {
      map.once('moveend', openPopup)
    } else {
      openPopup()
    }
  }
}

function wireBranchList(map, markersById) {
  const list = document.querySelector('.branch-list')
  if (!list) return

  list.querySelectorAll('[data-branch-id]').forEach((el) => {
    const id = el.getAttribute('data-branch-id')
    const branch = branches.find((b) => b.id === id)
    const marker = markersById.get(id)
    if (!branch) return

    const activate = (event) => {
      event.preventDefault()
      focusBranch(map, marker, branch)
      const frame = document.getElementById('pharmacy-map')
      frame?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest' })
    }

    el.addEventListener('click', activate)
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') activate(event)
    })
  })
}

export function initPharmacyMap(container) {
  if (!container || container.dataset.mapReady === '1') return null

  const map = L.map(container, {
    scrollWheelZoom: false,
    tapTolerance: 22,
    zoomControl: true,
    attributionControl: true,
  })

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map)

  const compoundStyle = {
    color: 'rgba(61, 214, 195, 0.65)',
    weight: 1.5,
    fillColor: 'rgba(61, 214, 195, 0.14)',
    fillOpacity: 0.7,
    className: 'map-compound-poly',
  }

  const localBounds = L.latLngBounds(branches.map((b) => [b.lat, b.lng]))

  compounds.forEach((c) => {
    const layer = L.polygon(c.ring, compoundStyle).addTo(map)
    layer.bindPopup(compoundPopup(c))

    const center = ringCentroid(c.ring)
    const logoIcon = compoundLogoIcon(c)
    if (logoIcon) {
      L.marker(center, { icon: logoIcon, interactive: true, keyboard: false })
        .addTo(map)
        .bindPopup(compoundPopup(c))
    }

    if (LOCAL_COMPOUND_IDS.has(c.id)) {
      c.ring.forEach((ll) => localBounds.extend(ll))
    }
  })

  hospitals.forEach((h) => {
    L.marker([h.lat, h.lng], { icon: hospitalIcon(h) })
      .addTo(map)
      .bindPopup(
        `<div class="map-popup"><strong>${h.name}</strong><p>${h.context}</p></div>`,
      )
    localBounds.extend([h.lat, h.lng])
  })

  const markersById = new Map()
  const pharmacyMarkers = branches.map((b) => {
    const marker = L.marker([b.lat, b.lng], { icon: pharmacyIcon() })
      .addTo(map)
      .bindPopup(pharmacyPopup(b))
    markersById.set(b.id, marker)
    marker.on('click', () => setActiveBranch(b.id))
    return marker
  })

  map.fitBounds(localBounds.pad(0.18))

  container.dataset.mapReady = '1'

  const frame = container.closest('.map-frame')
  if (frame && !reduceMotion()) {
    frame.classList.add('map-animate-in')
    pharmacyMarkers.forEach((m, i) => {
      const el = m.getElement()
      if (!el) return
      el.style.animationDelay = `${0.18 + i * 0.12}s`
      el.classList.add('map-marker-enter')
    })
  }

  wireBranchList(map, markersById)

  // Touch-friendly: enable scroll zoom after focus / interaction
  const enableWheel = () => map.scrollWheelZoom.enable()
  container.addEventListener('pointerdown', enableWheel, { once: true })
  map.on('focus', enableWheel)

  requestAnimationFrame(() => map.invalidateSize())
  window.setTimeout(() => map.invalidateSize(), 400)

  return map
}

export { branches, compounds, focusBranch }

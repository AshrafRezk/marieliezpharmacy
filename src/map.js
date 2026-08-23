import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { compounds } from './data/compounds.js'
import { PHONE_TEL, WHATSAPP_URL } from './config.js'
import { getTheme, onThemeChange } from './theme.js'
import { onLangChange, t } from './i18n.js'

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

const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

function tileUrlForTheme(theme) {
  return theme === 'light' ? TILE_LIGHT : TILE_DARK
}

/** Zoom when a pin has no nearby neighbours in radius. */
const BRANCH_FOCUS_ZOOM = 15
/** Cap so flyToBounds does not over-zoom a tight cluster. */
const CONTEXT_MAX_ZOOM = 16
/** Include hospitals / compounds / branches within this distance of the pin. */
const NEIGHBOR_RADIUS_M = 4500
/** Fractional pad on neighbour bounds before fly. */
const CONTEXT_BOUNDS_PAD = 0.36
const FLY_PADDING = [52, 52]
const FLY_DURATION_MS = 1400

/** Bumps on each focus so stale moveend handlers do not open the wrong popup. */
let focusGeneration = 0

const branches = [
  {
    id: 'golf',
    nameKey: 'map.golfName',
    areaKey: 'map.golfArea',
    addressKey: 'map.golfAddr',
    name: 'Al Golf Branch',
    area: 'Nasr City',
    address: '23 Ahmed Tayseer St., Al Golf, Nasr City',
    lat: 30.081708,
    lng: 31.3271294,
  },
  {
    id: 'tagamoa',
    nameKey: 'map.hpName',
    areaKey: 'map.hpArea',
    addressKey: 'map.hpAddr',
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
    context: 'Near Al Golf / Heliopolis; well-known neighbour for the Nasr City branch.',
    lat: 30.0931614,
    lng: 31.3297425,
  },
  {
    name: 'Air Force Specialized Hospital',
    context: 'South 90th Street, New Cairo; major hospital near Fifth Settlement.',
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

const reduceMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Leaflet forces `.leaflet-marker-pane img { max-width:none !important; width:auto }`,
 * so <img> logos inside DivIcons paint at native size (compound PNGs ~700-850px,
 * pwa-192 at 192px). Pharmacy pins use CSS background-image for the logo;
 * compound chips use the same pattern on fixed boxes.
 */
function branchName(branch) {
  return branch.nameKey ? t(branch.nameKey) : branch.name
}

function branchArea(branch) {
  return branch.areaKey ? t(branch.areaKey) : branch.area
}

function branchAddress(branch) {
  return branch.addressKey ? t(branch.addressKey) : branch.address
}

function pharmacyIcon(branch) {
  const title = t('brand.wordmark')
  const sub = branchArea(branch) || ''
  return L.divIcon({
    className: 'map-marker-pharmacy',
    html: `<span class="map-pin-pharmacy-wrap" aria-hidden="true">
      <span class="map-pin-pharmacy">
        <span class="map-pin-pharmacy-glow"></span>
        <span class="map-pin-pharmacy-body">
          <span class="map-pin-pharmacy-face">
            <span class="map-pin-pharmacy-logo"></span>
          </span>
        </span>
        <span class="map-pin-pharmacy-point"></span>
      </span>
      <span class="map-pin-pharmacy-label">
        <span class="map-pin-pharmacy-label-title">${title}</span>
        ${sub ? `<span class="map-pin-pharmacy-label-sub">${sub}</span>` : ''}
      </span>
    </span>`,
    // Tall teardrop + label: tip sits on lat/lng; label sits to the right (overflow visible).
    // Head ~56px so pharmacies dominate vs 40px hospital/compound chips at city zoom.
    iconSize: [56, 90],
    iconAnchor: [28, 90],
    popupAnchor: [0, -96],
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

function mapsDirectionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

function pharmacyPopup(branch) {
  const navigateUrl = mapsDirectionsUrl(branch.lat, branch.lng)
  return `
    <div class="map-popup">
      <strong>${t('brand.wordmark')}</strong>
      <p class="map-popup-branch">${branchName(branch)}</p>
      <p>${branchAddress(branch)}</p>
      <div class="map-popup-actions">
        <a class="map-popup-navigate" href="${navigateUrl}" target="_blank" rel="noopener noreferrer">${t('map.navigate')}</a>
        <a href="${WHATSAPP}" target="_blank" rel="noopener noreferrer">${t('map.popupWa')}</a>
        <a href="${PHONE_TEL}">${t('map.popupCall')}</a>
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

/** All map points used for neighbour framing (branches, hospitals, compound centres). */
function contextPoints() {
  const points = []
  for (const b of branches) points.push(L.latLng(b.lat, b.lng))
  for (const h of hospitals) points.push(L.latLng(h.lat, h.lng))
  for (const c of compounds) {
    const [lat, lng] = ringCentroid(c.ring)
    points.push(L.latLng(lat, lng))
  }
  return points
}

function neighborsWithin(center, radiusM) {
  const origin = L.latLng(center.lat, center.lng)
  return contextPoints().filter((p) => {
    const d = origin.distanceTo(p)
    return d > 25 && d <= radiusM
  })
}

/**
 * Smooth fly that frames the target pin plus nearby markers when possible.
 * Falls back to a fixed zoom when nothing is within NEIGHBOR_RADIUS_M.
 */
function flyToPinContext(map, center, { marker = null, open = true } = {}) {
  if (!map || !center) return

  const duration = reduceMotion() ? 0 : FLY_DURATION_MS / 1000
  const animate = duration > 0
  const origin = L.latLng(center.lat, center.lng)
  const nearby = neighborsWithin(center, NEIGHBOR_RADIUS_M)

  if (nearby.length === 0) {
    map.flyTo(origin, BRANCH_FOCUS_ZOOM, {
      animate,
      duration,
      easeLinearity: 0.22,
    })
  } else {
    const bounds = L.latLngBounds([origin, ...nearby]).pad(CONTEXT_BOUNDS_PAD)
    map.flyToBounds(bounds, {
      padding: FLY_PADDING,
      maxZoom: CONTEXT_MAX_ZOOM,
      animate,
      duration,
      easeLinearity: 0.22,
    })
  }

  if (open && marker) {
    const gen = ++focusGeneration
    const openPopup = () => {
      if (gen !== focusGeneration) return
      marker.openPopup()
    }
    if (animate) {
      map.once('moveend', openPopup)
    } else {
      openPopup()
    }
  }
}

function focusBranch(map, marker, branch, { open = true } = {}) {
  if (!map || !branch) return

  setActiveBranch(branch.id)
  flyToPinContext(map, branch, { marker, open })
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

  const tiles = L.tileLayer(tileUrlForTheme(getTheme()), {
    attribution: TILE_ATTR,
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map)

  const compoundStyleForTheme = (theme) =>
    theme === 'light'
      ? {
          color: 'rgba(15, 118, 110, 0.55)',
          weight: 1.5,
          fillColor: 'rgba(15, 159, 144, 0.12)',
          fillOpacity: 0.75,
          className: 'map-compound-poly',
        }
      : {
          color: 'rgba(61, 214, 195, 0.65)',
          weight: 1.5,
          fillColor: 'rgba(61, 214, 195, 0.14)',
          fillOpacity: 0.7,
          className: 'map-compound-poly',
        }

  /** @type {import('leaflet').Polygon[]} */
  const compoundLayers = []

  onThemeChange((theme) => {
    tiles.setUrl(tileUrlForTheme(theme))
    const style = compoundStyleForTheme(theme)
    compoundLayers.forEach((layer) => layer.setStyle(style))
  })

  // Default camera frames the two pharmacy branches so pins stay readable.
  // Compounds/hospitals still render for context when the user pans or zooms out.
  const branchBounds = L.latLngBounds(branches.map((b) => [b.lat, b.lng]))

  compounds.forEach((c) => {
    const center = ringCentroid(c.ring)
    const centerLatLng = { lat: center[0], lng: center[1] }
    const popupOpts = { autoPan: false }

    const layer = L.polygon(c.ring, compoundStyleForTheme(getTheme())).addTo(map)
    compoundLayers.push(layer)
    layer.bindPopup(compoundPopup(c), popupOpts)
    layer.on('click', () => {
      flyToPinContext(map, centerLatLng, { marker: layer, open: true })
    })

    const logoIcon = compoundLogoIcon(c)
    if (logoIcon) {
      const logoMarker = L.marker(center, {
        icon: logoIcon,
        interactive: true,
        keyboard: false,
      })
        .addTo(map)
        .bindPopup(compoundPopup(c), popupOpts)
      logoMarker.on('click', () => {
        flyToPinContext(map, centerLatLng, { marker: logoMarker, open: true })
      })
    }
  })

  hospitals.forEach((h) => {
    const marker = L.marker([h.lat, h.lng], { icon: hospitalIcon(h) })
      .addTo(map)
      .bindPopup(
        `<div class="map-popup"><strong>${h.name}</strong><p>${h.context}</p></div>`,
        { autoPan: false },
      )
    marker.on('click', () => {
      flyToPinContext(map, h, { marker, open: true })
    })
  })

  // Pharmacy pins above compounds/hospitals, still under popups (700)
  if (!map.getPane('pharmacyPane')) {
    map.createPane('pharmacyPane')
    map.getPane('pharmacyPane').style.zIndex = 650
  }

  const markersById = new Map()
  const pharmacyMarkers = branches.map((b) => {
    const marker = L.marker([b.lat, b.lng], {
      icon: pharmacyIcon(b),
      pane: 'pharmacyPane',
      zIndexOffset: 1000,
      riseOnHover: true,
      title: `${t('brand.wordmark')}: ${branchName(b)}`,
    })
      .addTo(map)
      .bindPopup(pharmacyPopup(b), {
        offset: L.point(0, -4),
        autoPan: false,
        autoPanPadding: [48, 48],
      })
    markersById.set(b.id, marker)
    marker.on('click', () => {
      focusBranch(map, marker, b, { open: true })
    })
    marker.on('popupopen', () => {
      const el = marker.getElement()
      el?.classList.add('is-popup-open')
    })
    marker.on('popupclose', () => {
      const el = marker.getElement()
      el?.classList.remove('is-popup-open')
    })
    return marker
  })

  const refreshPharmacyI18n = () => {
    pharmacyMarkers.forEach((marker, i) => {
      const b = branches[i]
      const wasOpen = marker.isPopupOpen()
      marker.setIcon(pharmacyIcon(b))
      marker.setPopupContent(pharmacyPopup(b))
      marker.options.title = `${t('brand.wordmark')}: ${branchName(b)}`
      if (wasOpen) marker.openPopup()
    })
  }
  onLangChange(refreshPharmacyI18n)

  map.fitBounds(branchBounds.pad(0.42))

  container.dataset.mapReady = '1'

  const frame = container.closest('.map-frame')
  if (frame && !reduceMotion()) {
    frame.classList.add('map-animate-in')
    pharmacyMarkers.forEach((m, i) => {
      const el = m.getElement()
      if (!el) return
      // Opacity-only enter — never animate `transform` on Leaflet markers
      // (fill-mode would override Leaflet's translate3d and hide/misplace pins).
      el.style.animationDelay = `${0.18 + i * 0.12}s`
      el.classList.add('map-marker-enter')
      const clearEnter = () => {
        el.classList.remove('map-marker-enter')
        el.style.animationDelay = ''
        el.removeEventListener('animationend', clearEnter)
      }
      el.addEventListener('animationend', clearEnter)
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

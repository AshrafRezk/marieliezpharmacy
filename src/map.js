import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { compounds } from './data/compounds.js'
import { findClosestBranch, getBranchPhones, haversineKm } from './config.js'
import { phonesListHtml, renderBranchPhoneLists } from './phone-actions.js'
import { getTheme, onThemeChange } from './theme.js'
import { onLangChange, t } from './i18n.js'
import {
  getGeolocationPermissionState,
  isPermissionDeniedError,
  offerLocationRetry,
  openLocationHelpModal,
} from './location-permission.js'

/**
 * Branch coordinates
 * ----------------
 * Google share.google links were opaque (no public lat/lng redirect).
 * Coordinates reused from prior Marieliez PharmacyMap + public listings:
 *  - Al Golf / Nasr City: 30.081708, 31.3271294 (23 Ahmed Tayseer St.)
 *  - Highland Park / New Cairo (Tagamo3): 29.991139, 31.5088302 (Highland Park Mall, El Andalus)
 *  - El Katameya: 29.978741, 31.398024 (Google Maps place pin)
 * East Cairo compound polygons + logos: Sakneen SODIC public map API (2026-08-22).
 * Phones live in config.js (BRANCH_PHONES); mobiles get Call + WhatsApp icons, landlines Call only.
 */

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

/** Free OSRM public demo — driving profile (best free road graph for Cairo delivery). */
const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving'
/**
 * Typical Cairo motorcycle delivery average outside rush hour / quiet order load
 * (includes lights & compound gates — not peak Ring Road crawl).
 */
const MOTO_AVG_KMH = 24
/** Pharmacy pick / pack buffer before the rider leaves. */
const PREP_BUFFER_MIN = 5
/** When OSRM is down, inflate great-circle toward typical road distance. */
const HAVERSINE_ROAD_FACTOR = 1.35
const GEO_OPTS = { enableHighAccuracy: true, timeout: 14000, maximumAge: 60000 }

/** Bumps on each focus so stale moveend handlers do not open the wrong popup. */
let focusGeneration = 0
/** Cancels in-flight closest-route work when a newer locate starts. */
let routeGeneration = 0

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
  {
    id: 'katameya',
    nameKey: 'map.katameyaName',
    areaKey: 'map.katameyaArea',
    addressKey: 'map.katameyaAddr',
    name: 'El Katameya Branch',
    area: 'El Katameya',
    address: 'El Katameya, New Cairo',
    lat: 29.978741,
    lng: 31.398024,
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
      </span>
      <span class="map-pin-pharmacy-label">
        <span class="map-pin-pharmacy-label-title">${title}</span>
        ${sub ? `<span class="map-pin-pharmacy-label-sub">${sub}</span>` : ''}
      </span>
    </span>`,
    // Circular logo + label: centre of circle sits on lat/lng; label to the right.
    // ~56px so pharmacies dominate vs 40px hospital/compound chips at city zoom.
    iconSize: [56, 56],
    iconAnchor: [28, 28],
    popupAnchor: [0, -34],
  })
}

/** Shared medical-cross SVG for all hospital map chips. */
const HOSPITAL_MARKER_SVG = `<svg class="map-marker-hospital-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path fill="currentColor" d="M14.5 3.25h-5a1.25 1.25 0 0 0-1.25 1.25v4.75H3.5A1.25 1.25 0 0 0 2.25 10.5v3a1.25 1.25 0 0 0 1.25 1.25h4.75V19.5c0 .69.56 1.25 1.25 1.25h5c.69 0 1.25-.56 1.25-1.25v-4.75h4.75c.69 0 1.25-.56 1.25-1.25v-3c0-.69-.56-1.25-1.25-1.25h-4.75V4.5c0-.69-.56-1.25-1.25-1.25Z"/>
</svg>`

function hospitalIcon(_hospital) {
  return L.divIcon({
    className: 'map-marker-hospital',
    html: `<span class="map-marker-hospital-inner" aria-hidden="true">
      ${HOSPITAL_MARKER_SVG}
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

function formatRoadDistance(meters) {
  if (!Number.isFinite(meters) || meters < 0) return '—'
  if (meters < 1000) return `${Math.max(1, Math.round(meters))} m`
  const km = meters / 1000
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`
}

/** Non-rush motorcycle delivery ETA from road metres + small prep buffer. */
function estimateDeliveryMinutes(distanceM) {
  const km = Math.max(0, distanceM) / 1000
  const rideMin = (km / MOTO_AVG_KMH) * 60
  return Math.max(PREP_BUFFER_MIN + 2, Math.round(PREP_BUFFER_MIN + rideMin))
}

function userLocationIcon() {
  return L.divIcon({
    className: 'map-marker-user',
    html: `<span class="map-pin-user" aria-hidden="true">
      <span class="map-pin-user-pulse"></span>
      <span class="map-pin-user-dot"></span>
    </span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })
}

/**
 * Query OSRM for one origin→branch route. Returns null on failure.
 * @returns {Promise<{ branch: typeof branches[number], distanceM: number, coordinates: [number, number][] } | null>}
 */
async function fetchOsrmToBranch(origin, branch) {
  const url =
    `${OSRM_ROUTE_URL}/` +
    `${origin.lng},${origin.lat};${branch.lng},${branch.lat}` +
    `?overview=full&geometries=geojson`

  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const route = data?.routes?.[0]
  if (!route || !Number.isFinite(route.distance)) return null

  const coords = route.geometry?.coordinates
  if (!Array.isArray(coords) || coords.length < 2) return null

  return {
    branch,
    distanceM: route.distance,
    // GeoJSON is [lng, lat] → Leaflet wants [lat, lng]
    coordinates: coords.map(([lng, lat]) => [lat, lng]),
  }
}

/**
 * Closest branch by OSRM road distance when available; otherwise great-circle.
 * @returns {Promise<{ branch: typeof branches[number], distanceM: number, coordinates: [number, number][] | null, fromRouting: boolean } | null>}
 */
async function resolveClosestRoute(origin) {
  const results = await Promise.all(
    branches.map((branch) =>
      fetchOsrmToBranch(origin, branch).catch(() => null),
    ),
  )
  const ok = results.filter(Boolean)
  if (ok.length) {
    ok.sort((a, b) => a.distanceM - b.distanceM)
    return { ...ok[0], fromRouting: true }
  }

  const closest = findClosestBranch(origin.lat, origin.lng)
  if (!closest) return null
  const branch = branches.find((b) => b.id === closest.id)
  if (!branch) return null
  const distanceM = haversineKm(origin.lat, origin.lng, branch.lat, branch.lng) * 1000 * HAVERSINE_ROAD_FACTOR
  return {
    branch,
    distanceM,
    coordinates: [
      [origin.lat, origin.lng],
      [branch.lat, branch.lng],
    ],
    fromRouting: false,
  }
}

/**
 * Mobile-first Leaflet popup options: fit inside the map with padding clear of
 * zoom/locate controls (top-left) and floating actions (bottom-right).
 * @param {import('leaflet').Map} map
 * @param {import('leaflet').PopupOptions} [extras]
 */
function mapPopupOptions(map, extras = {}) {
  const size = map.getSize()
  const edgePad = Math.max(14, Math.min(24, Math.round(size.x * 0.04)))
  return {
    maxWidth: Math.min(300, Math.max(196, size.x - edgePad * 2)),
    minWidth: 160,
    autoPan: true,
    keepInView: true,
    autoPanPaddingTopLeft: L.point(56, 18),
    autoPanPaddingBottomRight: L.point(edgePad, 72),
    ...extras,
  }
}

function pharmacyPopup(branch) {
  const navigateUrl = mapsDirectionsUrl(branch.lat, branch.lng)
  const phones = getBranchPhones(branch.id)
  const phoneLines = phonesListHtml(phones)
  return `
    <div class="map-popup">
      <strong>${t('brand.wordmark')}</strong>
      <p class="map-popup-branch">${branchName(branch)}</p>
      <p>${branchAddress(branch)}</p>
      ${phoneLines ? `<p class="map-popup-phones">${phoneLines}</p>` : ''}
      <div class="map-popup-actions">
        <a class="map-popup-navigate" href="${navigateUrl}" target="_blank" rel="noopener noreferrer">${t('map.navigate')}</a>
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

  renderBranchPhoneLists(list)

  list.querySelectorAll('[data-branch-id]').forEach((el) => {
    const id = el.getAttribute('data-branch-id')
    const branch = branches.find((b) => b.id === id)
    const marker = markersById.get(id)
    if (!branch) return

    const activate = (event) => {
      if (event.target.closest('[data-branch-link]')) return
      event.preventDefault()
      focusBranch(map, marker, branch)
      const frame = document.getElementById('pharmacy-map')
      frame?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest' })
    }

    el.addEventListener('click', activate)
    el.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        if (event.target.closest('[data-branch-link]')) return
        activate(event)
      }
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

  // Default camera frames all pharmacy branches so pins stay readable.
  // Compounds/hospitals still render for context when the user pans or zooms out.
  const branchBounds = L.latLngBounds(branches.map((b) => [b.lat, b.lng]))

  const sharedPopupOpts = () => mapPopupOptions(map)

  compounds.forEach((c) => {
    const center = ringCentroid(c.ring)
    const centerLatLng = { lat: center[0], lng: center[1] }

    const layer = L.polygon(c.ring, compoundStyleForTheme(getTheme())).addTo(map)
    compoundLayers.push(layer)
    layer.bindPopup(compoundPopup(c), sharedPopupOpts())
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
        .bindPopup(compoundPopup(c), sharedPopupOpts())
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
        sharedPopupOpts(),
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
      .bindPopup(
        pharmacyPopup(b),
        mapPopupOptions(map, { offset: L.point(0, -4) }),
      )
    markersById.set(b.id, marker)
    marker.on('click', () => {
      focusBranch(map, marker, b, { open: true })
    })
    marker.on('popupopen', () => {
      const el = marker.getElement()
      el?.classList.add('is-popup-open')
      // Keep maxWidth in sync if the map was resized since bind.
      const popup = marker.getPopup()
      if (popup) {
        const next = mapPopupOptions(map, { offset: L.point(0, -4) })
        popup.options.maxWidth = next.maxWidth
        popup.options.autoPanPaddingTopLeft = next.autoPanPaddingTopLeft
        popup.options.autoPanPaddingBottomRight = next.autoPanPaddingBottomRight
      }
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

  // --- User location + closest-branch moto route (OSRM) ---
  const routeBanner = container.closest('.map-frame')?.querySelector('[data-map-route-banner]')

  const setRouteBanner = (message, { error = false } = {}) => {
    if (!routeBanner) return
    if (!message) {
      routeBanner.hidden = true
      routeBanner.textContent = ''
      routeBanner.classList.remove('is-error')
      return
    }
    routeBanner.hidden = false
    routeBanner.textContent = message
    routeBanner.classList.toggle('is-error', error)
  }

  if (!map.getPane('userPane')) {
    map.createPane('userPane')
    map.getPane('userPane').style.zIndex = 660
  }

  /** @type {import('leaflet').Marker | null} */
  let userMarker = null
  /** @type {import('leaflet').Polyline | null} */
  let routeLine = null
  /** @type {{ lat: number, lng: number } | null} */
  let lastUserPos = null
  /** @type {{ branchId: string, distanceM: number, fromRouting: boolean } | null} */
  let lastRouteMeta = null

  const clearRouteLine = () => {
    if (routeLine) {
      map.removeLayer(routeLine)
      routeLine = null
    }
  }

  const refreshRouteBannerI18n = () => {
    if (!lastRouteMeta || !lastUserPos) return
    const branch = branches.find((b) => b.id === lastRouteMeta.branchId)
    if (!branch) return
    const key = lastRouteMeta.fromRouting ? 'map.routeOk' : 'map.routeOkApprox'
    setRouteBanner(
      t(key, {
        branch: branchName(branch),
        distance: formatRoadDistance(lastRouteMeta.distanceM),
        eta: String(estimateDeliveryMinutes(lastRouteMeta.distanceM)),
      }),
    )
  }

  const drawClosestRoute = async (lat, lng) => {
    const gen = ++routeGeneration
    lastUserPos = { lat, lng }
    setRouteBanner(t('map.routeRouting'))

    if (!userMarker) {
      userMarker = L.marker([lat, lng], {
        icon: userLocationIcon(),
        pane: 'userPane',
        zIndexOffset: 1200,
        keyboard: false,
        title: t('map.userMarkerTitle'),
      }).addTo(map)
    } else {
      userMarker.setLatLng([lat, lng])
      userMarker.options.title = t('map.userMarkerTitle')
    }

    const resolved = await resolveClosestRoute({ lat, lng })
    if (gen !== routeGeneration) return

    clearRouteLine()

    if (!resolved) {
      lastRouteMeta = null
      setRouteBanner(t('map.routeUnavailable'), { error: true })
      return
    }

    lastRouteMeta = {
      branchId: resolved.branch.id,
      distanceM: resolved.distanceM,
      fromRouting: resolved.fromRouting,
    }

    const lineColor =
      getTheme() === 'light' ? 'rgba(15, 118, 110, 0.85)' : 'rgba(61, 214, 195, 0.9)'

    routeLine = L.polyline(resolved.coordinates, {
      color: lineColor,
      weight: 4.5,
      opacity: 0.92,
      lineJoin: 'round',
      lineCap: 'round',
      dashArray: resolved.fromRouting ? null : '8 10',
      className: 'map-route-line',
    }).addTo(map)

    const branchMarker = markersById.get(resolved.branch.id)
    setActiveBranch(resolved.branch.id)
    refreshRouteBannerI18n()

    const bounds = L.latLngBounds(resolved.coordinates)
    bounds.extend([lat, lng])
    bounds.extend([resolved.branch.lat, resolved.branch.lng])
    map.flyToBounds(bounds.pad(0.22), {
      padding: [56, 56],
      maxZoom: 15,
      animate: !reduceMotion(),
      duration: reduceMotion() ? 0 : 1.15,
    })

    if (branchMarker) {
      const openGen = ++focusGeneration
      const openPopup = () => {
        if (openGen !== focusGeneration) return
        branchMarker.openPopup()
      }
      if (reduceMotion()) openPopup()
      else map.once('moveend', openPopup)
    }
  }

  const requestUserLocation = ({ offerHelp = true } = {}) => {
    if (!window.isSecureContext) {
      setRouteBanner(t('map.routeInsecure'), { error: true })
      return
    }
    if (!navigator.geolocation) {
      setRouteBanner(t('map.routeUnsupported'), { error: true })
      return
    }

    const runGeo = () => {
      setRouteBanner(t('map.routePending'))
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          drawClosestRoute(pos.coords.latitude, pos.coords.longitude).catch(() => {
            setRouteBanner(t('map.routeUnavailable'), { error: true })
          })
        },
        (err) => {
          const denied = isPermissionDeniedError(err)
          setRouteBanner(t(denied ? 'map.routeDenied' : 'map.routeUnavailable'), {
            error: true,
          })
          if (denied && offerHelp) {
            offerLocationRetry(err, {
              context: 'map',
              onRetry: () => requestUserLocation(),
            })
          }
        },
        GEO_OPTS,
      )
    }

    if (!offerHelp) {
      runGeo()
      return
    }

    getGeolocationPermissionState().then((perm) => {
      if (perm === 'denied') {
        setRouteBanner(t('map.routeDenied'), { error: true })
        openLocationHelpModal({
          context: 'map',
          onRetry: () => requestUserLocation(),
        })
        return
      }
      runGeo()
    })
  }

  const LocateControl = L.Control.extend({
    options: { position: 'topright' },
    onAdd() {
      const wrap = L.DomUtil.create('div', 'leaflet-bar map-locate-control')
      const btn = L.DomUtil.create('a', 'map-locate-btn', wrap)
      btn.href = '#'
      btn.role = 'button'
      btn.title = t('map.locateTitle')
      btn.setAttribute('aria-label', t('map.locateAria'))
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6a1 1 0 0 1 1 1v1.06A8.004 8.004 0 0 1 20.94 11H22a1 1 0 1 1 0 2h-1.06A8.004 8.004 0 0 1 13 20.94V22a1 1 0 1 1-2 0v-1.06A8.004 8.004 0 0 1 3.06 13H2a1 1 0 1 1 0-2h1.06A8.004 8.004 0 0 1 11 3.06V2a1 1 0 0 1 1-1Zm0 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"/></svg>'
      L.DomEvent.disableClickPropagation(wrap)
      L.DomEvent.on(btn, 'click', (event) => {
        L.DomEvent.preventDefault(event)
        requestUserLocation()
      })
      this._btn = btn
      return wrap
    },
  })

  const locateControl = new LocateControl()
  locateControl.addTo(map)

  const refreshLocateI18n = () => {
    const btn = locateControl._btn
    if (btn) {
      btn.title = t('map.locateTitle')
      btn.setAttribute('aria-label', t('map.locateAria'))
    }
    if (userMarker) userMarker.options.title = t('map.userMarkerTitle')
    if (lastRouteMeta) refreshRouteBannerI18n()
  }

  onLangChange(() => {
    refreshPharmacyI18n()
    refreshLocateI18n()
  })

  onThemeChange((theme) => {
    tiles.setUrl(tileUrlForTheme(theme))
    const style = compoundStyleForTheme(theme)
    compoundLayers.forEach((layer) => layer.setStyle(style))
    if (routeLine) {
      routeLine.setStyle({
        color:
          theme === 'light' ? 'rgba(15, 118, 110, 0.85)' : 'rgba(61, 214, 195, 0.9)',
      })
    }
  })

  // Auto-locate once the map is ready (permission prompt when allowed).
  // Skip the help modal on this silent attempt — show it only when the user taps locate.
  requestUserLocation({ offerHelp: false })

  // Touch-friendly: enable scroll zoom after focus / interaction
  const enableWheel = () => map.scrollWheelZoom.enable()
  container.addEventListener('pointerdown', enableWheel, { once: true })
  map.on('focus', enableWheel)

  requestAnimationFrame(() => map.invalidateSize())
  window.setTimeout(() => map.invalidateSize(), 400)

  return map
}

export { branches, compounds, focusBranch }

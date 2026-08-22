import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/**
 * Branch coordinates
 * ----------------
 * Google share.google links were opaque (no public lat/lng redirect).
 * Coordinates reused from prior Marieliez PharmacyMap + public listings:
 *  - Al Golf / Nasr City: 30.081708, 31.3271294 (23 Ahmed Tayseer St.)
 *  - Highland Park / New Cairo: 29.991139, 31.5088302 (Highland Park Mall, El Andalus)
 * Compound polygons approx. from OpenStreetMap / Nominatim bounding boxes (2026).
 */

const PHONE_TEL = 'tel:+201121111605'
const WHATSAPP = 'https://wa.me/201121111605'

const branches = [
  {
    id: 'golf',
    name: 'Al Golf Branch',
    area: 'Nasr City',
    address: '23 Ahmed Tayseer St., Al Golf, Nasr City',
    // share.google/84zzKHMkdNZDd4l2v — resolved via prior store map + directory listings
    lat: 30.081708,
    lng: 31.3271294,
  },
  {
    id: 'tagamoa',
    name: 'Highland Park Branch',
    area: 'New Cairo',
    address: 'Highland Park Mall, El Andalus, South Investors, New Cairo',
    // share.google/qAyiHYPiT6OosXWCy — Highland Park / Tagamoa listing
    lat: 29.991139,
    lng: 31.5088302,
  },
]

/** Approximate compound footprints (lat/lng rings) near New Cairo branch */
const compounds = [
  {
    name: 'Akoya',
    context: 'Neighbouring compound beside Highland Park / South Investors.',
    // Nominatim bb: 29.9879–29.9910, 31.5056–31.5083
    ring: [
      [29.9879, 31.5056],
      [29.9879, 31.5083],
      [29.991, 31.5083],
      [29.991, 31.5056],
    ],
  },
  {
    name: 'SODIC Eastown',
    context: 'SODIC Eastown Residence — Lotus / Fifth Settlement corridor.',
    // Nominatim bb: 30.0065–30.0181, 31.5087–31.5213
    ring: [
      [30.0065, 31.5087],
      [30.0065, 31.5213],
      [30.0181, 31.5213],
      [30.0181, 31.5087],
    ],
  },
  {
    name: 'Mivida',
    context: 'Emaar Misr Mivida — New Cairo Golden Square / Fifth Settlement.',
    ring: [
      [30.002, 31.525],
      [30.002, 31.542],
      [30.014, 31.542],
      [30.014, 31.525],
    ],
  },
  {
    name: 'Mountain View Hyde Park',
    context: 'Mountain View / Hyde Park New Cairo residential clusters.',
    ring: [
      [29.974, 31.542],
      [29.974, 31.565],
      [29.988, 31.565],
      [29.988, 31.542],
    ],
  },
  {
    name: 'Villette SODIC',
    context: 'SODIC Villette — New Cairo compound near Eastown / 90th corridor.',
    ring: [
      [30.02, 31.49],
      [30.02, 31.505],
      [30.032, 31.505],
      [30.032, 31.49],
    ],
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

const reduceMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function pharmacyIcon() {
  return L.divIcon({
    className: 'map-marker-pharmacy',
    html: `<span class="map-marker-pharmacy-inner" aria-hidden="true">
      <img src="/pwa-192.png" alt="" width="36" height="36" />
    </span>`,
    iconSize: [44, 52],
    iconAnchor: [22, 50],
    popupAnchor: [0, -44],
  })
}

function hospitalIcon() {
  return L.divIcon({
    className: 'map-marker-hospital',
    html: `<span class="map-marker-hospital-inner" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
        <path d="M12 4.5v15M7.5 9.5h9M7.5 14.5h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <rect x="5.5" y="4.5" width="13" height="15" rx="3" stroke="currentColor" stroke-width="1.5"/>
      </svg>
    </span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -14],
  })
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
    color: 'rgba(243, 242, 238, 0.55)',
    weight: 1.25,
    fillColor: 'rgba(243, 242, 238, 0.1)',
    fillOpacity: 0.55,
    className: 'map-compound-poly',
  }

  compounds.forEach((c) => {
    const layer = L.polygon(c.ring, compoundStyle).addTo(map)
    layer.bindPopup(
      `<div class="map-popup"><strong>${c.name}</strong><p>${c.context}</p></div>`,
    )
  })

  hospitals.forEach((h) => {
    L.marker([h.lat, h.lng], { icon: hospitalIcon() })
      .addTo(map)
      .bindPopup(
        `<div class="map-popup"><strong>${h.name}</strong><p>${h.context}</p></div>`,
      )
  })

  const pharmacyMarkers = branches.map((b) =>
    L.marker([b.lat, b.lng], { icon: pharmacyIcon() })
      .addTo(map)
      .bindPopup(pharmacyPopup(b)),
  )

  const bounds = L.latLngBounds(branches.map((b) => [b.lat, b.lng]))
  compounds.forEach((c) => c.ring.forEach((ll) => bounds.extend(ll)))
  hospitals.forEach((h) => bounds.extend([h.lat, h.lng]))

  map.fitBounds(bounds.pad(0.18))

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

  // Touch-friendly: enable scroll zoom after focus / interaction
  const enableWheel = () => map.scrollWheelZoom.enable()
  container.addEventListener('pointerdown', enableWheel, { once: true })
  map.on('focus', enableWheel)

  requestAnimationFrame(() => map.invalidateSize())
  window.setTimeout(() => map.invalidateSize(), 400)

  return map
}

export { branches }

/** Shared contact / ordering config for Marieliez Pharmacy */

/** Digits only — tel: and wa.me must never include spaces or punctuation. */
const e164Digits = (value) => String(value).replace(/\D/g, '')

/**
 * Primary branch for site-wide WhatsApp (floating CTAs, emergency, visit default).
 * Order checkout uses the closest branch when geolocation is available.
 * Maps to Highland Park / Tagamo3 / New Cairo on the site.
 */
export const PRIMARY_BRANCH_ID = 'tagamoa'

/**
 * Ordered phones per branch. Index 0 is always WhatsApp + primary call for that branch.
 *
 * @type {Record<string, Array<{ e164: string, display: string }>>}
 */
export const BRANCH_PHONES = {
  /** Tagamo3 / New Cairo / Highland Park */
  tagamoa: [
    { e164: '201121111600', display: '+20 112 111 1600' },
    { e164: '201121111601', display: '+20 112 111 1601' },
    { e164: '201121111602', display: '+20 112 111 1602' },
  ],
  /** Ard El Golf / Girls College / Nasr City */
  golf: [
    { e164: '201286789937', display: '+20 128 678 9937' },
    { e164: '20224150507', display: '02 2415 0507' },
  ],
  /** El Katameya / القطامية */
  katameya: [
    { e164: '201108057225', display: '+20 110 805 7225' },
    { e164: '201108057226', display: '+20 110 805 7226' },
    { e164: '201108057227', display: '+20 110 805 7227' },
  ],
}

/**
 * Branch pins for closest-branch routing (must stay in sync with map.js).
 * @type {Array<{ id: string, lat: number, lng: number, nameKey: string, name: string }>}
 */
export const BRANCH_LOCATIONS = [
  {
    id: 'golf',
    lat: 30.081708,
    lng: 31.3271294,
    nameKey: 'map.golfName',
    name: 'Al Golf Branch',
  },
  {
    id: 'tagamoa',
    lat: 29.991139,
    lng: 31.5088302,
    nameKey: 'map.hpName',
    name: 'Highland Park Branch',
  },
  {
    id: 'katameya',
    lat: 29.978741,
    lng: 31.398024,
    nameKey: 'map.katameyaName',
    name: 'El Katameya Branch',
  },
]

/**
 * @param {{ e164: string, display: string }} phone
 */
function normalizePhone(phone) {
  const e164 = e164Digits(phone.e164)
  return {
    e164,
    display: phone.display,
    tel: `tel:+${e164}`,
    whatsappUrl: `https://wa.me/${e164}`,
  }
}

/** @param {string} branchId */
export function getBranchPhones(branchId) {
  return (BRANCH_PHONES[branchId] || []).map(normalizePhone)
}

/** First number for a branch — WhatsApp + primary call. */
export function getBranchPrimary(branchId) {
  return getBranchPhones(branchId)[0] || null
}

const primary = getBranchPrimary(PRIMARY_BRANCH_ID)

export const WHATSAPP_E164 = primary.e164
export const WHATSAPP_URL = primary.whatsappUrl
/** Human-readable label only; use PHONE_TEL / WHATSAPP_URL for hrefs. */
export const PHONE_DISPLAY = primary.display
export const PHONE_TEL = primary.tel

export const PRICE_DISCLAIMER = 'Prices are liable to change'
export const CURRENCY = 'EGP'

/** Format a catalog price with approximate marker (Talabat-sourced, may change). */
export function formatPrice(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) return `~ ${CURRENCY}`
  const formatted = Number.isInteger(n)
    ? String(n)
    : n.toLocaleString('en-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return `~ ${CURRENCY} ${formatted}`
}

function toRad(deg) {
  return (deg * Math.PI) / 180
}

/** Great-circle distance in kilometres. */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Closest pharmacy branch to a customer pin, or null if coords are missing.
 * @returns {{ id: string, lat: number, lng: number, nameKey: string, name: string, distanceKm: number } | null}
 */
export function findClosestBranch(lat, lng) {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }
  let best = null
  let bestDist = Infinity
  for (const branch of BRANCH_LOCATIONS) {
    const distanceKm = haversineKm(lat, lng, branch.lat, branch.lng)
    if (distanceKm < bestDist) {
      bestDist = distanceKm
      best = { ...branch, distanceKm }
    }
  }
  return best
}

/** Google Maps pin URL for WhatsApp / sharing. */
export function mapsLocationUrl(lat, lng) {
  if (lat == null || lng == null) return ''
  return `https://www.google.com/maps?q=${lat},${lng}`
}

/**
 * WhatsApp deep link. Defaults to Tagamo3 primary; pass a branchId for
 * closest-branch order routing.
 */
export function buildWhatsAppUrl(message, branchId = PRIMARY_BRANCH_ID) {
  const contact = getBranchPrimary(branchId) || primary
  return `${contact.whatsappUrl}?text=${encodeURIComponent(message)}`
}

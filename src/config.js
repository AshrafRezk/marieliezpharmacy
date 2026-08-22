/** Shared contact / ordering config for Marieliez Pharmacy */
export const WHATSAPP_E164 = '201121111605'
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_E164}`
export const PHONE_DISPLAY = '+20 112 111 1605'
export const PHONE_TEL = `tel:+${WHATSAPP_E164}`

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

export function buildWhatsAppUrl(message) {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`
}

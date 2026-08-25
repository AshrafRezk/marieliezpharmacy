/** Shared geolocation permission helpers + help modal for cart + map. */

import { onLangChange, t } from './i18n.js'

/** @typedef {'cart' | 'map'} LocationHelpContext */

/** @type {LocationHelpContext} */
let activeContext = 'cart'
/** @type {(() => void) | null} */
let retryHandler = null
/** @type {HTMLElement | null} */
let lastFocus = null
let wired = false
/** Last known permanently-denied flag while modal is open (for lang refresh). */
let lastPermanentlyDenied = false

/**
 * @param {GeolocationPositionError | null | undefined} err
 */
export function isPermissionDeniedError(err) {
  if (!err) return false
  return err.code === 1 || err.code === err.PERMISSION_DENIED
}

/**
 * @returns {Promise<'granted' | 'denied' | 'prompt' | 'unknown'>}
 */
export async function getGeolocationPermissionState() {
  try {
    if (!navigator.permissions?.query) return 'unknown'
    const result = await navigator.permissions.query({ name: 'geolocation' })
    if (result.state === 'granted' || result.state === 'denied' || result.state === 'prompt') {
      return result.state
    }
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

function overlay() {
  return document.querySelector('[data-location-help]')
}

function setText(el, value) {
  if (el) el.textContent = value
}

function applyCopy(permanentlyDenied) {
  const root = overlay()
  if (!root) return
  lastPermanentlyDenied = permanentlyDenied

  setText(root.querySelector('[data-location-help-title]'), t('locationHelp.title'))
  setText(
    root.querySelector('[data-location-help-body]'),
    t(permanentlyDenied ? 'locationHelp.bodyBlocked' : 'locationHelp.bodyPrompt'),
  )

  const howto = root.querySelector('[data-location-help-howto]')
  if (howto) howto.hidden = !permanentlyDenied

  setText(
    root.querySelector('[data-location-help-fallback]'),
    t(activeContext === 'map' ? 'locationHelp.fallbackMap' : 'locationHelp.fallbackCart'),
  )

  root.querySelectorAll('[data-location-help-howto] [data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n')
    if (key) el.textContent = t(key)
  })

  setText(
    root.querySelector('[data-location-help-retry-label]'),
    t(permanentlyDenied ? 'locationHelp.retryAfter' : 'locationHelp.retry'),
  )
  setText(root.querySelector('[data-location-help-dismiss-label]'), t('locationHelp.dismiss'))

  const backdrop = root.querySelector('.location-help-backdrop')
  if (backdrop) backdrop.setAttribute('aria-label', t('locationHelp.dismissAria'))
}

function wireOnce() {
  if (wired) return
  const root = overlay()
  if (!root) return
  wired = true

  root.querySelectorAll('[data-location-help-close], [data-location-help-dismiss]').forEach((el) => {
    el.addEventListener('click', () => closeLocationHelpModal())
  })

  root.querySelector('[data-location-help-retry]')?.addEventListener('click', () => {
    const retry = retryHandler
    closeLocationHelpModal()
    retry?.()
  })

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Escape') return
      if (!isLocationHelpOpen()) return
      event.preventDefault()
      event.stopPropagation()
      closeLocationHelpModal()
    },
    true,
  )

  onLangChange(() => {
    if (isLocationHelpOpen()) applyCopy(lastPermanentlyDenied)
  })
}

export function isLocationHelpOpen() {
  const root = overlay()
  return Boolean(root && !root.hidden && root.classList.contains('is-open'))
}

/**
 * @param {{ onRetry?: () => void, context?: LocationHelpContext }} [opts]
 */
export async function openLocationHelpModal(opts = {}) {
  const root = overlay()
  if (!root) return

  wireOnce()
  activeContext = opts.context === 'map' ? 'map' : 'cart'
  retryHandler = typeof opts.onRetry === 'function' ? opts.onRetry : null

  const perm = await getGeolocationPermissionState()
  applyCopy(perm === 'denied')

  lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  root.hidden = false
  document.documentElement.classList.add('location-help-open')
  requestAnimationFrame(() => {
    root.classList.add('is-open')
    root.querySelector('[data-location-help-retry]')?.focus()
  })
}

export function closeLocationHelpModal() {
  const root = overlay()
  if (!root) return
  root.classList.remove('is-open')
  document.documentElement.classList.remove('location-help-open')
  window.setTimeout(() => {
    if (root.classList.contains('is-open')) return
    root.hidden = true
  }, 280)
  retryHandler = null
  const focusBack = lastFocus
  lastFocus = null
  focusBack?.focus?.()
}

/**
 * Show help when geolocation failed due to permission (or Permissions API says denied).
 * @param {GeolocationPositionError | null | undefined} err
 * @param {{ onRetry?: () => void, context?: LocationHelpContext }} [opts]
 */
export async function offerLocationRetry(err, opts = {}) {
  const perm = await getGeolocationPermissionState()
  if (perm === 'denied' || isPermissionDeniedError(err)) {
    await openLocationHelpModal(opts)
    return true
  }
  return false
}

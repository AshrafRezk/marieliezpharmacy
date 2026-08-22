import { initShop } from './shop.js'
import { initFeedback } from './feedback.js'

const yearEl = document.getElementById('year')
if (yearEl) yearEl.textContent = String(new Date().getFullYear())

initFeedback()

const topBar = document.querySelector('[data-elevate]')
const dockItems = [...document.querySelectorAll('.dock-item')]
const sections = ['top', 'care', 'shop', 'emergency', 'brands', 'map', 'visit']
  .map((id) => document.getElementById(id))
  .filter(Boolean)

const setActiveNav = (id) => {
  dockItems.forEach((item) => {
    item.classList.toggle('is-active', item.dataset.nav === id)
  })
}

if (topBar) {
  const onScroll = () => {
    topBar.classList.toggle('is-elevated', window.scrollY > 12)
  }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
}

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-inview')
          revealObserver.unobserve(entry.target)
        }
      })
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  )

  document.querySelectorAll('[data-reveal]').forEach((el) => revealObserver.observe(el))

  const navObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible?.target?.id) setActiveNav(visible.target.id)
    },
    { rootMargin: '-35% 0px -45% 0px', threshold: [0.15, 0.4, 0.7] },
  )

  sections.forEach((section) => navObserver.observe(section))
} else {
  document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-inview'))
}

initShop()

/* Lazy-init Leaflet map when #map is near viewport */
const mapMount = document.getElementById('pharmacy-map')
if (mapMount) {
  const bootMap = async () => {
    const { initPharmacyMap } = await import('./map.js')
    initPharmacyMap(mapMount)
  }

  if ('IntersectionObserver' in window) {
    const mapObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          mapObserver.disconnect()
          bootMap()
        }
      },
      { rootMargin: '120px 0px', threshold: 0.05 },
    )
    mapObserver.observe(mapMount)
  } else {
    bootMap()
  }
}

/* PWA install prompt */
const toast = document.getElementById('install-toast')
const acceptBtn = document.getElementById('install-accept')
const dismissBtn = document.getElementById('install-dismiss')
const DISMISS_KEY = 'marieliez-install-dismissed'
let deferredPrompt = null

const showToast = () => {
  if (!toast || localStorage.getItem(DISMISS_KEY) === '1') return
  toast.hidden = false
  requestAnimationFrame(() => toast.classList.add('is-visible'))
}

const hideToast = () => {
  if (!toast) return
  toast.classList.remove('is-visible')
  window.setTimeout(() => {
    toast.hidden = true
  }, 320)
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferredPrompt = event
  window.setTimeout(showToast, 1800)
})

acceptBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) return
  deferredPrompt.prompt()
  await deferredPrompt.userChoice
  deferredPrompt = null
  hideToast()
})

dismissBtn?.addEventListener('click', () => {
  localStorage.setItem(DISMISS_KEY, '1')
  hideToast()
})

window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  hideToast()
})

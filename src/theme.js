import { onLangChange, t } from './i18n.js'

/** Light/dark theme with persistence + prefers-color-scheme fallback. */

const THEME_KEY = 'marieliez-theme'
const THEME_COLOR_DARK = '#0a1210'
const THEME_COLOR_LIGHT = '#f4fbf9'

/** @typedef {'light' | 'dark'} Theme */

/** @type {Set<(theme: Theme) => void>} */
const listeners = new Set()

/** @type {Theme} */
let currentTheme = 'dark'

/** @returns {Theme} */
export function getTheme() {
  return currentTheme
}

/**
 * Resolve initial theme: saved preference, else prefers-color-scheme, else dark.
 * @returns {Theme}
 */
export function resolvePreferredTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* ignore */
  }
  try {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
  } catch {
    /* ignore */
  }
  return 'dark'
}

/**
 * @param {Theme} theme
 * @param {{ persist?: boolean }} [opts]
 */
function applyTheme(theme, opts = {}) {
  const next = theme === 'light' ? 'light' : 'dark'
  const persist = opts.persist !== false
  currentTheme = next

  const root = document.documentElement
  root.setAttribute('data-theme', next)
  root.style.colorScheme = next

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', next === 'light' ? THEME_COLOR_LIGHT : THEME_COLOR_DARK)

  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, next)
    } catch {
      /* ignore */
    }
  }

  syncToggleUi()
  listeners.forEach((fn) => fn(next))
}

function syncToggleUi() {
  const isLight = currentTheme === 'light'
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.setAttribute('aria-label', isLight ? t('theme.toDark') : t('theme.toLight'))
    btn.setAttribute('aria-pressed', isLight ? 'true' : 'false')
    btn.dataset.themeState = currentTheme
  })
}

/** @param {Theme} theme */
export function setTheme(theme) {
  applyTheme(theme, { persist: true })
}

export function toggleTheme() {
  setTheme(currentTheme === 'light' ? 'dark' : 'light')
}

/** @param {(theme: Theme) => void} fn */
export function onThemeChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function initTheme() {
  onLangChange(() => syncToggleUi())

  const fromDom = document.documentElement.getAttribute('data-theme')
  const initial =
    fromDom === 'light' || fromDom === 'dark' ? fromDom : resolvePreferredTheme()
  applyTheme(initial, { persist: false })

  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => toggleTheme())
  })

  try {
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onScheme = () => {
      try {
        if (localStorage.getItem(THEME_KEY)) return
      } catch {
        return
      }
      applyTheme(mq.matches ? 'light' : 'dark', { persist: false })
    }
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onScheme)
    } else if (typeof mq.addListener === 'function') {
      mq.addListener(onScheme)
    }
  } catch {
    /* ignore */
  }
}

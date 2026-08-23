import { t } from './i18n.js'

/** One-time-per-session welcome video from the pharmacy owners. */

const WELCOME_KEY = 'marieliez-welcome-seen'

function hasSeenWelcome() {
  try {
    return sessionStorage.getItem(WELCOME_KEY) === '1'
  } catch {
    return false
  }
}

function markWelcomeSeen() {
  try {
    sessionStorage.setItem(WELCOME_KEY, '1')
  } catch {
    /* ignore */
  }
}

/**
 * @param {HTMLElement} root
 */
function closeWelcome(root) {
  const video = root.querySelector('video')
  if (video) {
    video.pause()
    video.removeAttribute('src')
    video.load()
  }
  root.classList.remove('is-open')
  root.setAttribute('hidden', '')
  document.documentElement.classList.remove('welcome-open')
  markWelcomeSeen()
}

export function initWelcome() {
  const root = document.querySelector('[data-welcome]')
  if (!root) return

  if (hasSeenWelcome()) {
    root.setAttribute('hidden', '')
    return
  }

  const video = root.querySelector('video')
  const unmuteBtn = root.querySelector('[data-welcome-unmute]')
  const skipBtn = root.querySelector('[data-welcome-skip]')
  const backdrop = root.querySelector('[data-welcome-dismiss]')

  root.removeAttribute('hidden')
  root.classList.add('is-open')
  document.documentElement.classList.add('welcome-open')

  const tryPlay = () => {
    if (!video) return
    video.muted = true
    video.playsInline = true
    const playPromise = video.play()
    if (playPromise?.catch) {
      playPromise.catch(() => {
        /* Autoplay may still fail; user can tap unmute/skip. */
      })
    }
  }

  tryPlay()

  unmuteBtn?.addEventListener('click', () => {
    if (!video) return
    const muted = !video.muted
    video.muted = muted
    unmuteBtn.setAttribute('aria-pressed', muted ? 'false' : 'true')
    unmuteBtn.setAttribute(
      'aria-label',
      muted ? t('welcome.unmuteAria') : t('welcome.muteAria'),
    )
    const label = unmuteBtn.querySelector('[data-i18n]')
    if (label) label.textContent = muted ? t('welcome.unmute') : t('welcome.mute')
    unmuteBtn.dataset.muted = muted ? '1' : '0'
    if (!muted) {
      video.play().catch(() => {})
    }
  })

  const dismiss = () => closeWelcome(root)
  skipBtn?.addEventListener('click', dismiss)
  backdrop?.addEventListener('click', dismiss)

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') dismiss()
  })

  requestAnimationFrame(() => skipBtn?.focus())
}

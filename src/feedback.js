/**
 * Shared interaction feedback: haptics, soft UI tones, and click-driven
 * ambient background motion (ripples + light motion blur).
 * Wired once via event delegation; does not block default map/link behavior.
 */

const MUTE_KEY = 'marieliez-sound-muted'
const INTERACTIVE =
  'a, button, [role="button"], .dock-item, .branch-item, .shop-chip, .chip-cta, .cart-fab, .leaflet-marker-icon, .leaflet-interactive, summary, input[type="button"], input[type="submit"], input[type="reset"]'

const MAX_RIPPLES = 6
const MAX_PARTICLES = 28
const TAP_COOLDOWN_MS = 45
const SOUND_COOLDOWN_MS = 55

/** @type {AudioContext | null} */
let audioCtx = null
let audioUnlocked = false
let lastTapAt = 0
let lastSoundAt = 0
let reducedMotion = false
let soundMuted = false
let rafId = 0
let blurUntil = 0

/** @type {HTMLCanvasElement | null} */
let canvas = null
/** @type {CanvasRenderingContext2D | null} */
let ctx = null

/** @type {{ x: number, y: number, r: number, max: number, life: number, age: number }[]} */
const ripples = []
/** @type {{ x: number, y: number, vx: number, vy: number, life: number, age: number, size: number }[]} */
const particles = []

function readMutePreference() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function syncMotionPreference() {
  reducedMotion = prefersReducedMotion()
  document.documentElement.classList.toggle('feedback-reduced', reducedMotion)
}

function ensureCanvas() {
  if (canvas) return
  canvas = document.createElement('canvas')
  canvas.className = 'feedback-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  // Sibling of .atmosphere so parent filter blur does not smear the ripples
  const atmosphere = document.querySelector('.atmosphere')
  if (atmosphere?.parentNode) {
    atmosphere.insertAdjacentElement('afterend', canvas)
  } else {
    document.body.prepend(canvas)
  }
  ctx = canvas.getContext('2d', { alpha: true })
  resizeCanvas()
}

function resizeCanvas() {
  if (!canvas || !ctx) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = window.innerWidth
  const h = window.innerHeight
  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function unlockAudio() {
  if (audioUnlocked) return
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return
  if (!audioCtx) audioCtx = new Ctx()
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  audioUnlocked = audioCtx.state === 'running'
}

/**
 * Soft UI tap via oscillators: low gain, brief.
 * @param {'tap' | 'soft' | 'confirm'} kind
 */
function playTone(kind = 'tap') {
  if (soundMuted || reducedMotion) return
  if (document.visibilityState === 'hidden') return
  const now = performance.now()
  if (now - lastSoundAt < SOUND_COOLDOWN_MS) return
  lastSoundAt = now

  unlockAudio()
  if (!audioCtx || audioCtx.state !== 'running') return

  const t0 = audioCtx.currentTime
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  const filter = audioCtx.createBiquadFilter()

  const profiles = {
    tap: { freq: 620, type: 'sine', peak: 0.028, dur: 0.055 },
    soft: { freq: 480, type: 'triangle', peak: 0.018, dur: 0.07 },
    confirm: { freq: 740, type: 'sine', peak: 0.022, dur: 0.08 },
  }
  const p = profiles[kind] || profiles.tap

  osc.type = p.type
  osc.frequency.setValueAtTime(p.freq, t0)
  osc.frequency.exponentialRampToValueAtTime(p.freq * 0.72, t0 + p.dur)

  filter.type = 'lowpass'
  filter.frequency.value = 1800
  filter.Q.value = 0.6

  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(p.peak, t0 + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + p.dur)

  osc.connect(filter)
  filter.connect(gain)
  gain.connect(audioCtx.destination)

  osc.start(t0)
  osc.stop(t0 + p.dur + 0.02)
  osc.onended = () => {
    osc.disconnect()
    filter.disconnect()
    gain.disconnect()
  }
}

/**
 * Short Vibration API patterns: tasteful taps only.
 * @param {'tap' | 'soft' | 'confirm'} kind
 */
function vibrate(kind = 'tap') {
  if (!('vibrate' in navigator)) return
  if (document.visibilityState === 'hidden') return

  if (reducedMotion) {
    // Barely-there pulse when motion is reduced
    if (kind === 'confirm') navigator.vibrate(6)
    return
  }

  const patterns = {
    tap: 12,
    soft: 8,
    confirm: [10, 30, 14],
  }
  try {
    navigator.vibrate(patterns[kind] || patterns.tap)
  } catch {
    /* ignore unsupported / blocked */
  }
}

function spawnBurst(clientX, clientY) {
  if (reducedMotion) return
  ensureCanvas()
  if (!ctx) return

  const intensity = 1
  while (ripples.length >= MAX_RIPPLES) ripples.shift()

  ripples.push({
    x: clientX,
    y: clientY,
    r: 8,
    max: 120 + Math.random() * 60,
    life: 0.85,
    age: 0,
  })

  const count = Math.min(7, MAX_PARTICLES - particles.length)
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4
    const speed = (0.35 + Math.random() * 0.9) * intensity
    particles.push({
      x: clientX,
      y: clientY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.15,
      life: 0.55 + Math.random() * 0.35,
      age: 0,
      size: 1.2 + Math.random() * 2.2,
    })
  }

  // Brief motion-blur stir on the atmosphere layer
  blurUntil = performance.now() + 280
  document.documentElement.style.setProperty('--feedback-blur', '1.6px')
  document.documentElement.classList.add('feedback-stirred')

  if (!rafId) rafId = requestAnimationFrame(tick)
}

function tick(now) {
  if (!canvas || !ctx) {
    rafId = 0
    return
  }

  const w = window.innerWidth
  const h = window.innerHeight
  ctx.clearRect(0, 0, w, h)

  // Soft directional smear while stir is active
  const blurActive = now < blurUntil
  if (blurActive) {
    const t = 1 - (blurUntil - now) / 280
    const smear = 1.2 * (1 - t)
    ctx.save()
    ctx.globalAlpha = 0.22
    ctx.filter = `blur(${1.4 + smear}px)`
  } else {
    document.documentElement.style.setProperty('--feedback-blur', '0px')
    document.documentElement.classList.remove('feedback-stirred')
    ctx.filter = 'none'
  }

  for (let i = ripples.length - 1; i >= 0; i -= 1) {
    const r = ripples[i]
    r.age += 1 / 60
    const progress = Math.min(1, r.age / r.life)
    r.r = r.max * (0.15 + progress * 0.85)
    const alpha = (1 - progress) * 0.28

    const grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.r)
    grad.addColorStop(0, `rgba(126, 232, 216, ${alpha * 0.55})`)
    grad.addColorStop(0.45, `rgba(61, 214, 195, ${alpha * 0.35})`)
    grad.addColorStop(1, 'rgba(61, 214, 195, 0)')

    ctx.beginPath()
    ctx.fillStyle = grad
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.strokeStyle = `rgba(126, 232, 216, ${alpha * 0.7})`
    ctx.lineWidth = 1.25
    ctx.arc(r.x, r.y, r.r * 0.72, 0, Math.PI * 2)
    ctx.stroke()

    if (progress >= 1) ripples.splice(i, 1)
  }

  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i]
    p.age += 1 / 60
    p.x += p.vx
    p.y += p.vy
    p.vx *= 0.97
    p.vy *= 0.97
    const progress = Math.min(1, p.age / p.life)
    const alpha = (1 - progress) * 0.5

    ctx.beginPath()
    ctx.fillStyle = `rgba(126, 232, 216, ${alpha})`
    ctx.arc(p.x, p.y, p.size * (1 - progress * 0.4), 0, Math.PI * 2)
    ctx.fill()

    if (progress >= 1) particles.splice(i, 1)
  }

  if (blurActive) ctx.restore()

  if (ripples.length || particles.length || blurActive) {
    rafId = requestAnimationFrame(tick)
  } else {
    rafId = 0
    ctx.clearRect(0, 0, w, h)
    ctx.filter = 'none'
  }
}

function classifyTarget(el) {
  if (!el) return 'tap'
  if (
    el.matches(
      '[data-cart-checkout], .btn-filled, a[href^="https://wa.me"], a[href^="tel:"]',
    )
  ) {
    return 'confirm'
  }
  if (el.matches('.dock-item, .top-nav a, .branch-item, .shop-chip')) {
    return 'soft'
  }
  return 'tap'
}

function closestInteractive(target) {
  if (!(target instanceof Element)) return null
  // Ignore pure map pan/zoom chrome; markers & branch list still count
  if (target.closest('.leaflet-control, .leaflet-control-container')) return null
  if (target.closest('.skip-link')) return null
  return target.closest(INTERACTIVE)
}

function onPointerDown(event) {
  if (event.button != null && event.button !== 0) return
  const el = closestInteractive(event.target)
  if (!el) return

  const now = performance.now()
  if (now - lastTapAt < TAP_COOLDOWN_MS) return
  lastTapAt = now

  unlockAudio()

  const kind = classifyTarget(el)
  vibrate(kind)
  playTone(kind)

  const x = event.clientX
  const y = event.clientY
  if (Number.isFinite(x) && Number.isFinite(y)) {
    spawnBurst(x, y)
  }
}

function onKeyActivate(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  const el = closestInteractive(event.target)
  if (!el) return
  // Avoid double-firing with click on buttons
  if (event.key === ' ' && el.matches('button, [role="button"]')) {
    /* space will click; skip here */
    return
  }
  unlockAudio()
  const kind = classifyTarget(el)
  vibrate(kind)
  playTone(kind)
  const rect = el.getBoundingClientRect()
  spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2)
}

/**
 * Optional: persist mute via localStorage (`marieliez-sound-muted` = "1").
 * Call from UI if you add a mute control later.
 */
export function setSoundMuted(muted) {
  soundMuted = Boolean(muted)
  try {
    localStorage.setItem(MUTE_KEY, soundMuted ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function isSoundMuted() {
  return soundMuted
}

export function initFeedback() {
  soundMuted = readMutePreference()
  syncMotionPreference()

  const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)')
  const onMotionChange = () => syncMotionPreference()
  if (motionMq.addEventListener) motionMq.addEventListener('change', onMotionChange)
  else motionMq.addListener(onMotionChange)

  // Capture unlock + feedback without preventing default / map behavior
  document.addEventListener('pointerdown', onPointerDown, { passive: true })
  document.addEventListener('keydown', onKeyActivate, { passive: true })

  // First gesture unlock (covers cases outside INTERACTIVE)
  const unlockOnce = () => {
    unlockAudio()
    document.removeEventListener('pointerdown', unlockOnce)
    document.removeEventListener('touchstart', unlockOnce)
  }
  document.addEventListener('pointerdown', unlockOnce, { passive: true })
  document.addEventListener('touchstart', unlockOnce, { passive: true })

  window.addEventListener('resize', resizeCanvas, { passive: true })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0)
      } catch {
        /* ignore */
      }
    }
  })
}

import {
  PRICE_DISCLAIMER,
  PRIMARY_BRANCH_ID,
  buildWhatsAppUrl,
  findClosestBranch,
  formatPrice,
  mapsLocationUrl,
} from './config.js'
import { categoryLabel, getLang, onLangChange, t } from './i18n.js'
import { searchProducts } from './search.js'
import { initSymptomBot } from './symptom-bot.js'

const CART_KEY = 'marieliez-cart-v1'
const BOT_NUDGE_KEY = 'marieliez-bot-nudge-session'
const PAGE_SIZE = 24

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const state = {
  products: [],
  categories: [],
  category: 'all',
  query: '',
  visible: PAGE_SIZE,
  cart: loadCart(),
  catalogReady: false,
  checkoutStep: 'cart',
  /** When true, delivery/WhatsApp is allowed even with an empty cart (symptom-bot flow). */
  checkoutFromBot: false,
  delivery: {
    name: '',
    lat: null,
    lng: null,
    building: '',
    street: '',
    area: '',
    notes: '',
  },
}

/** @type {ReturnType<typeof initSymptomBot> | null} */
let symptomBot = null

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(state.cart))
}

function cartCount() {
  return Object.values(state.cart).reduce((sum, qty) => sum + qty, 0)
}

function cartLines() {
  return Object.entries(state.cart)
    .map(([id, qty]) => {
      const product = state.products.find((p) => p.id === id)
      if (!product || qty < 1) return null
      return { product, qty }
    })
    .filter(Boolean)
}

function cartTotal() {
  return cartLines().reduce((sum, { product, qty }) => sum + product.price * qty, 0)
}

function filteredProducts() {
  return searchProducts(state.products, state.query, { category: state.category })
}

function setCartQty(productId, qty) {
  if (qty <= 0) delete state.cart[productId]
  else state.cart[productId] = qty
  saveCart()
  renderCartChrome()
  renderCartDrawer()
}

function branchLabel(branch) {
  if (!branch) return ''
  return branch.nameKey ? t(branch.nameKey) : branch.name
}

function readDeliveryFields() {
  state.delivery.name = document.querySelector('[data-cart-name]')?.value?.trim() || ''
  state.delivery.building = document.querySelector('[data-cart-building]')?.value?.trim() || ''
  state.delivery.street = document.querySelector('[data-cart-street]')?.value?.trim() || ''
  state.delivery.area = document.querySelector('[data-cart-area]')?.value?.trim() || ''
  state.delivery.notes = document.querySelector('[data-cart-notes]')?.value?.trim() || ''
}

/** Closest branch when pin exists; otherwise Tagamo3 primary for WhatsApp. */
function orderBranchId() {
  return findClosestBranch(state.delivery.lat, state.delivery.lng)?.id || PRIMARY_BRANCH_ID
}

function buildOrderMessage() {
  readDeliveryFields()
  const lines = cartLines()
  const rows = lines.map(
    ({ product, qty }) =>
      `• ${qty}× ${product.title}: ${formatPrice(product.price * qty)}`,
  )
  const intent = symptomBot?.getCustomerIntent?.() || { feelings: [], turns: [] }
  const feelings = intent.feelings || []
  const parts = [t('cart.orderHello'), '']

  if (feelings.length) {
    parts.push(t('cart.orderFeel', { feel: feelings.join(getLang() === 'ar' ? '، ' : ', ') }))
    parts.push('')
  }

  // Include short first-person conversation history when the user chatted with the bot
  const userTurns = (intent.turns || []).filter((turn) => turn.role === 'user')
  if (userTurns.length > 1) {
    parts.push(t('cart.orderHistoryIntro'))
    userTurns.forEach((turn) => {
      parts.push(`• ${turn.text}`)
    })
    parts.push('')
  }

  if (rows.length) {
    parts.push(t('cart.orderWant'))
    parts.push(...rows)
    parts.push('')
    parts.push(`${t('cart.orderTotal')} ${formatPrice(cartTotal())}`)
    parts.push('')
  } else if (feelings.length || userTurns.length) {
    parts.push(t('cart.orderAdvice'))
    parts.push('')
  }

  const { name, building, street, area, notes, lat, lng } = state.delivery
  const closest = findClosestBranch(lat, lng)
  const hasDetails =
    name || building || street || area || notes || (lat != null && lng != null)
  if (hasDetails) {
    parts.push(t('cart.orderAddressIntro'))
    if (name) parts.push(`${t('cart.orderName')} ${name}`)
    if (building) parts.push(`${t('cart.orderBuilding')} ${building}`)
    if (street) parts.push(`${t('cart.orderStreet')} ${street}`)
    if (area) parts.push(`${t('cart.orderArea')} ${area}`)
    if (notes) parts.push(`${t('cart.orderNotes')} ${notes}`)
    const link = mapsLocationUrl(lat, lng)
    if (link) parts.push(`${t('cart.orderMap')} ${link}`)
    if (closest) {
      parts.push(`${t('cart.orderBranch')} ${branchLabel(closest)}`)
    }
    parts.push('')
  }

  parts.push(t('shop.priceDisclaimer') || PRICE_DISCLAIMER)
  return parts.join('\n')
}

function canSendWhatsApp() {
  if (cartCount() > 0) return true
  if (!state.checkoutFromBot) return false
  const intent = symptomBot?.getCustomerIntent?.() || { feelings: [], turns: [] }
  return (intent.feelings?.length || 0) > 0 || (intent.turns || []).some((turn) => turn.role === 'user')
}

function productCountLabel(n) {
  const formatted = n.toLocaleString(getLang() === 'ar' ? 'ar-EG' : 'en-EG')
  if (getLang() === 'ar') {
    if (n === 1) return t('shop.products_one', { n: formatted })
    return t('shop.products_other', { n: formatted })
  }
  if (n === 1) return t('shop.products_one', { n: formatted })
  return t('shop.products_other', { n: formatted })
}

function renderCategories(root) {
  const chips = root.querySelector('[data-shop-categories]')
  if (!chips) return
  const items = [
    { slug: 'all', name: t('shop.all') },
    ...state.categories.map((c) => ({
      slug: c.slug,
      name: categoryLabel(c.slug, c.name),
    })),
  ]
  chips.innerHTML = items
    .map(
      (c) => `
      <button
        type="button"
        class="shop-chip${state.category === c.slug ? ' is-active' : ''}"
        data-category="${escapeHtml(c.slug)}"
      >${escapeHtml(c.name)}</button>`,
    )
    .join('')
  chips.setAttribute('aria-label', t('shop.categoriesAria'))
}

function productCard(product) {
  const qty = state.cart[product.id] || 0
  const img = product.image
    ? `<img src="${escapeHtml(product.image)}" alt="" width="120" height="120" loading="lazy" decoding="async" />`
    : `<span class="shop-card-placeholder" aria-hidden="true"></span>`

  return `
    <article class="shop-card" data-product-id="${escapeHtml(product.id)}">
      <div class="shop-card-media">${img}</div>
      <div class="shop-card-body">
        <p class="shop-card-cat">${escapeHtml(product.subcategory || product.category)}</p>
        <h3 class="shop-card-title">${escapeHtml(product.title)}</h3>
        <p class="shop-card-price">${escapeHtml(formatPrice(product.price))}</p>
        <div class="shop-card-actions">
          ${
            qty > 0
              ? `<div class="shop-qty" role="group" aria-label="${escapeHtml(t('shop.qtyAria', { title: product.title }))}">
                  <button type="button" class="shop-qty-btn" data-action="dec" aria-label="${escapeHtml(t('shop.dec'))}">−</button>
                  <span class="shop-qty-value" aria-live="polite">${qty}</span>
                  <button type="button" class="shop-qty-btn" data-action="inc" aria-label="${escapeHtml(t('shop.inc'))}">+</button>
                </div>`
              : `<button type="button" class="btn btn-tonal btn-sm shop-add" data-action="add">${escapeHtml(t('shop.add'))}</button>`
          }
        </div>
      </div>
    </article>`
}

function renderGrid(root) {
  const grid = root.querySelector('[data-shop-grid]')
  const meta = root.querySelector('[data-shop-meta]')
  const more = root.querySelector('[data-shop-more]')
  if (!grid) return

  const all = filteredProducts()
  const slice = all.slice(0, state.visible)

  if (!state.catalogReady) {
    grid.innerHTML = `<p class="shop-status">${escapeHtml(t('shop.loading'))}</p>`
    if (meta) meta.textContent = ''
    if (more) more.hidden = true
    return
  }

  if (!slice.length) {
    grid.innerHTML = `<p class="shop-status">${escapeHtml(t('shop.empty'))}</p>`
  } else {
    grid.innerHTML = slice.map(productCard).join('')
  }

  if (meta) meta.textContent = productCountLabel(all.length)
  if (more) {
    more.hidden = slice.length >= all.length
    const label = more.querySelector('span')
    if (label) label.textContent = t('shop.more')
  }
}

function renderCartChrome() {
  const count = cartCount()
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = String(count)
    el.hidden = count === 0
  })
  const fab = document.getElementById('cart-fab')
  if (fab) {
    fab.hidden = count === 0
    fab.setAttribute('aria-label', t('cart.openAria'))
  }
  document.getElementById('float-dock')?.classList.toggle('has-cart', count > 0)
  const botFab = document.getElementById('bot-fab')
  if (botFab) botFab.setAttribute('aria-label', t('bot.openAria'))
}

function setCheckoutStep(step) {
  state.checkoutStep = step
  const cartFooter = document.querySelector('[data-cart-footer-cart]')
  const deliveryFooter = document.querySelector('[data-cart-footer-delivery]')
  if (cartFooter) cartFooter.hidden = step !== 'cart'
  if (deliveryFooter) deliveryFooter.hidden = step !== 'delivery'
  const title = document.getElementById('cart-title')
  if (title) {
    title.textContent = step === 'delivery' ? t('cart.deliveryTitle') : t('cart.title')
  }
  const waBtn = document.querySelector('[data-cart-whatsapp]')
  if (waBtn) {
    const ok = step === 'delivery' ? canSendWhatsApp() : cartCount() > 0
    waBtn.disabled = !ok
    waBtn.setAttribute('aria-disabled', ok ? 'false' : 'true')
  }
}

function enterDeliveryStep() {
  setCheckoutStep('delivery')
  renderCartDrawer()
  if (state.delivery.lat == null) requestLocation({ silentUnsupported: true })
  window.setTimeout(() => {
    document.querySelector('[data-cart-name]')?.focus()
  }, 80)
}

function renderCartDrawer() {
  const body = document.querySelector('[data-cart-body]')
  const totalEl = document.querySelector('[data-cart-total]')
  const checkout = document.querySelector('[data-cart-checkout]')
  if (!body) return

  const lines = cartLines()
  if (!lines.length) {
    if (state.checkoutStep === 'delivery' && state.checkoutFromBot) {
      const intent = symptomBot?.getCustomerIntent?.() || { feelings: [], turns: [] }
      const feelings = intent.feelings || []
      const feelList = feelings.length
        ? `<ul class="cart-intent-list">${feelings
            .map((f) => `<li>${escapeHtml(f)}</li>`)
            .join('')}</ul>`
        : ''
      body.innerHTML = `
        <div class="cart-delivery-summary cart-delivery-summary--intent">
          <p class="cart-delivery-summary-label">${escapeHtml(t('cart.botIntentTitle'))}</p>
          ${feelList}
          <p class="shop-status">${escapeHtml(t('cart.emptyFromBot'))}</p>
        </div>`
    } else {
      body.innerHTML = `<p class="shop-status">${escapeHtml(t('cart.empty'))}</p>`
      if (state.checkoutStep !== 'cart') setCheckoutStep('cart')
    }
  } else if (state.checkoutStep === 'cart') {
    body.innerHTML = lines
      .map(({ product, qty }) => {
        const line = product.price * qty
        return `
          <div class="cart-line" data-product-id="${escapeHtml(product.id)}">
            <div class="cart-line-info">
              <strong>${escapeHtml(product.title)}</strong>
              <span>${escapeHtml(formatPrice(product.price))} ${escapeHtml(t('cart.each'))}</span>
            </div>
            <div class="cart-line-side">
              <div class="shop-qty" role="group" aria-label="${escapeHtml(t('cart.qty'))}">
                <button type="button" class="shop-qty-btn" data-action="dec" aria-label="${escapeHtml(t('shop.dec'))}">−</button>
                <span class="shop-qty-value">${qty}</span>
                <button type="button" class="shop-qty-btn" data-action="inc" aria-label="${escapeHtml(t('shop.inc'))}">+</button>
              </div>
              <span class="cart-line-price">${escapeHtml(formatPrice(line))}</span>
            </div>
          </div>`
      })
      .join('')
  } else {
    body.innerHTML = `
      <div class="cart-delivery-summary">
        <p class="cart-delivery-summary-label">${escapeHtml(t('cart.orderSummary'))}</p>
        <ul>
          ${lines
            .map(
              ({ product, qty }) =>
                `<li><span>${escapeHtml(`${qty}× ${product.title}`)}</span><strong>${escapeHtml(formatPrice(product.price * qty))}</strong></li>`,
            )
            .join('')}
        </ul>
        <p class="cart-delivery-summary-total">
          <span>${escapeHtml(t('cart.total'))}</span>
          <strong>${escapeHtml(formatPrice(cartTotal()))}</strong>
        </p>
      </div>`
  }

  if (totalEl) totalEl.textContent = formatPrice(cartTotal())
  if (checkout) {
    checkout.disabled = lines.length === 0
    checkout.setAttribute('aria-disabled', lines.length === 0 ? 'true' : 'false')
    const label = checkout.querySelector('span')
    if (label) label.textContent = t('cart.checkout')
  }
  if (state.checkoutStep === 'delivery') setCheckoutStep('delivery')
}

function openCart() {
  const drawer = document.getElementById('cart-drawer')
  if (!drawer) return
  state.checkoutFromBot = false
  setCheckoutStep('cart')
  drawer.hidden = false
  requestAnimationFrame(() => drawer.classList.add('is-open'))
  document.body.classList.add('cart-open')
  renderCartDrawer()
}

function closeCart() {
  const drawer = document.getElementById('cart-drawer')
  if (!drawer) return
  drawer.classList.remove('is-open')
  document.body.classList.remove('cart-open')
  state.checkoutFromBot = false
  setCheckoutStep('cart')
  window.setTimeout(() => {
    if (!drawer.classList.contains('is-open')) drawer.hidden = true
  }, 280)
}

/** Close symptom bot and open the shared delivery → WhatsApp checkout. */
function openDeliveryFromBot() {
  const drawer = document.getElementById('cart-drawer')
  if (!drawer) return
  state.checkoutFromBot = true
  drawer.hidden = false
  document.body.classList.add('cart-open')
  requestAnimationFrame(() => drawer.classList.add('is-open'))
  symptomBot?.close()
  enterDeliveryStep()
}

function applyShopQuery(query, categorySlug = 'all') {
  const root = document.getElementById('shop')
  if (!root) return
  state.query = query || ''
  state.category = categorySlug || 'all'
  state.visible = PAGE_SIZE
  const search = root.querySelector('[data-shop-search]')
  if (search) search.value = state.query
  renderCategories(root)
  renderGrid(root)
  root.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function setLocateStatus(message, isError = false) {
  const el = document.querySelector('[data-cart-locate-status]')
  if (!el) return
  if (!message) {
    el.hidden = true
    el.textContent = ''
    el.classList.remove('is-error')
    return
  }
  el.hidden = false
  el.textContent = message
  el.classList.toggle('is-error', isError)
}

function refreshLocateStatus() {
  const closest = findClosestBranch(state.delivery.lat, state.delivery.lng)
  if (closest) {
    setLocateStatus(t('cart.locateOkBranch', { branch: branchLabel(closest) }))
  } else if (state.delivery.lat != null) {
    setLocateStatus(t('cart.locateOk'))
  }
}

function requestLocation({ silentUnsupported = false } = {}) {
  if (!navigator.geolocation) {
    if (!silentUnsupported) setLocateStatus(t('cart.locateUnsupported'), true)
    return
  }
  setLocateStatus(t('cart.locatePending'))
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.delivery.lat = pos.coords.latitude
      state.delivery.lng = pos.coords.longitude
      refreshLocateStatus()
    },
    () => {
      setLocateStatus(t('cart.locateDenied'), true)
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
  )
}

function sendOrderOnWhatsApp() {
  if (!canSendWhatsApp()) return
  readDeliveryFields()
  if (!state.delivery.name) {
    setLocateStatus(t('cart.needName'), true)
    document.querySelector('[data-cart-name]')?.focus()
    return
  }
  const branchId = orderBranchId()
  const url = buildWhatsAppUrl(buildOrderMessage(), branchId)
  window.open(url, '_blank', 'noopener,noreferrer')
}

function dismissBotNudge() {
  const nudge = document.getElementById('bot-nudge')
  if (nudge) {
    nudge.classList.remove('is-visible')
    window.setTimeout(() => {
      nudge.hidden = true
    }, 280)
  }
  document.getElementById('bot-fab')?.classList.remove('is-nudge')
  try {
    sessionStorage.setItem(BOT_NUDGE_KEY, '1')
  } catch {
    /* ignore */
  }
}

function maybeShowBotNudge() {
  try {
    if (sessionStorage.getItem(BOT_NUDGE_KEY) === '1') return
  } catch {
    /* ignore */
  }
  const nudge = document.getElementById('bot-nudge')
  const fab = document.getElementById('bot-fab')
  if (!nudge || !fab) return

  window.setTimeout(() => {
    if (symptomBot?.isOpen?.()) return
    try {
      if (sessionStorage.getItem(BOT_NUDGE_KEY) === '1') return
    } catch {
      /* ignore */
    }
    nudge.hidden = false
    requestAnimationFrame(() => nudge.classList.add('is-visible'))
    fab.classList.add('is-nudge')
  }, 2200)
}

function wireShop(root) {
  const search = root.querySelector('[data-shop-search]')
  let searchTimer = 0

  search?.addEventListener('input', () => {
    window.clearTimeout(searchTimer)
    searchTimer = window.setTimeout(() => {
      state.query = search.value
      state.visible = PAGE_SIZE
      renderGrid(root)
    }, 180)
  })

  root.querySelector('[data-shop-categories]')?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-category]')
    if (!btn) return
    state.category = btn.dataset.category
    state.visible = PAGE_SIZE
    renderCategories(root)
    renderGrid(root)
  })

  root.querySelector('[data-shop-more]')?.addEventListener('click', () => {
    state.visible += PAGE_SIZE
    renderGrid(root)
  })

  root.querySelector('[data-shop-grid]')?.addEventListener('click', (event) => {
    const card = event.target.closest('[data-product-id]')
    const action = event.target.closest('[data-action]')?.dataset.action
    if (!card || !action) return
    const id = card.dataset.productId
    const current = state.cart[id] || 0
    if (action === 'add' || action === 'inc') setCartQty(id, current + 1)
    if (action === 'dec') setCartQty(id, current - 1)
    renderGrid(root)
  })

  root.querySelector('[data-symptom-open]')?.addEventListener('click', () => {
    dismissBotNudge()
    symptomBot?.open()
  })
}

function wireCart() {
  document.getElementById('cart-fab')?.addEventListener('click', openCart)
  document.getElementById('bot-fab')?.addEventListener('click', () => {
    dismissBotNudge()
    symptomBot?.open()
  })
  document.querySelector('[data-bot-nudge-dismiss]')?.addEventListener('click', (event) => {
    event.stopPropagation()
    dismissBotNudge()
  })
  document.getElementById('bot-nudge')?.addEventListener('click', (event) => {
    if (event.target.closest('[data-bot-nudge-dismiss]')) return
    dismissBotNudge()
    symptomBot?.open()
  })

  document.querySelectorAll('[data-cart-open]').forEach((el) =>
    el.addEventListener('click', (e) => {
      e.preventDefault()
      openCart()
    }),
  )
  document.querySelectorAll('[data-cart-close]').forEach((el) =>
    el.addEventListener('click', closeCart),
  )

  document.querySelector('[data-cart-body]')?.addEventListener('click', (event) => {
    const line = event.target.closest('[data-product-id]')
    const action = event.target.closest('[data-action]')?.dataset.action
    if (!line || !action) return
    const id = line.dataset.productId
    const current = state.cart[id] || 0
    if (action === 'inc') setCartQty(id, current + 1)
    if (action === 'dec') setCartQty(id, current - 1)
  })

  document.querySelector('[data-cart-checkout]')?.addEventListener('click', () => {
    if (!cartCount()) return
    enterDeliveryStep()
  })

  document.querySelector('[data-cart-back]')?.addEventListener('click', () => {
    setCheckoutStep('cart')
    renderCartDrawer()
  })

  document.querySelector('[data-cart-locate]')?.addEventListener('click', () => requestLocation())

  document.querySelector('[data-cart-whatsapp]')?.addEventListener('click', sendOrderOnWhatsApp)

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !symptomBot?.isOpen?.()) closeCart()
  })
}

function refreshShopUi() {
  const root = document.getElementById('shop')
  if (!root) return
  renderCategories(root)
  renderGrid(root)
  renderCartChrome()
  setCheckoutStep(state.checkoutStep)
  renderCartDrawer()
  symptomBot?.refresh()
  // Refresh delivery footer static labels
  document.querySelectorAll('[data-cart-footer-delivery] [data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n')
    if (key) el.textContent = t(key)
  })
  document.querySelectorAll('[data-cart-footer-delivery] [data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder')
    if (key) el.setAttribute('placeholder', t(key))
  })
  document.querySelectorAll('#float-dock [data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n')
    if (key) el.textContent = t(key)
  })
  document.querySelectorAll('#float-dock [data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria')
    if (key) el.setAttribute('aria-label', t(key))
  })
  if (state.delivery.lat != null) refreshLocateStatus()
}

export async function initShop() {
  const root = document.getElementById('shop')
  if (!root) return

  symptomBot = initSymptomBot({
    getProducts: () => state.products,
    formatPrice,
    onAddToCart: (id) => {
      setCartQty(id, (state.cart[id] || 0) + 1)
      renderGrid(root)
    },
    onShowInShop: applyShopQuery,
    getCartQty: (id) => state.cart[id] || 0,
    onContinueWhatsApp: openDeliveryFromBot,
  })

  wireShop(root)
  wireCart()
  renderCartChrome()
  renderGrid(root)
  maybeShowBotNudge()
  onLangChange(refreshShopUi)

  try {
    const res = await fetch('/data/products.json')
    if (!res.ok) throw new Error(`Failed to load catalog (${res.status})`)
    const data = await res.json()
    state.products = Array.isArray(data.products) ? data.products : []
    state.categories = Array.isArray(data.categories) ? data.categories : []
    state.catalogReady = true
    renderCategories(root)
    renderGrid(root)
    renderCartChrome()
  } catch (err) {
    console.error(err)
    const grid = root.querySelector('[data-shop-grid]')
    if (grid) {
      grid.innerHTML = `<p class="shop-status">${escapeHtml(t('shop.error'))}</p>`
    }
  }
}

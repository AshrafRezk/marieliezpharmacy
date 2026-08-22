import {
  PRICE_DISCLAIMER,
  buildWhatsAppUrl,
  formatPrice,
} from './config.js'

const CART_KEY = 'marieliez-cart-v1'
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
}

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
  const q = state.query.trim().toLowerCase()
  return state.products.filter((p) => {
    if (state.category !== 'all' && p.categorySlug !== state.category) return false
    if (!q) return true
    return (
      p.title.toLowerCase().includes(q) ||
      (p.subcategory && p.subcategory.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q)
    )
  })
}

function setCartQty(productId, qty) {
  if (qty <= 0) delete state.cart[productId]
  else state.cart[productId] = qty
  saveCart()
  renderCartChrome()
  renderCartDrawer()
}

function buildOrderMessage() {
  const lines = cartLines()
  const rows = lines.map(
    ({ product, qty }) =>
      `• ${qty}× ${product.title}: ${formatPrice(product.price * qty)}`,
  )
  return [
    'Hello Marieliez Pharmacy, I would like to order:',
    '',
    ...rows,
    '',
    `Approx. total: ${formatPrice(cartTotal())}`,
    '',
    PRICE_DISCLAIMER,
  ].join('\n')
}

function renderCategories(root) {
  const chips = root.querySelector('[data-shop-categories]')
  if (!chips) return
  const items = [
    { slug: 'all', name: 'All' },
    ...state.categories.map((c) => ({ slug: c.slug, name: c.name })),
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
              ? `<div class="shop-qty" role="group" aria-label="Quantity for ${escapeHtml(product.title)}">
                  <button type="button" class="shop-qty-btn" data-action="dec" aria-label="Decrease quantity">−</button>
                  <span class="shop-qty-value" aria-live="polite">${qty}</span>
                  <button type="button" class="shop-qty-btn" data-action="inc" aria-label="Increase quantity">+</button>
                </div>`
              : `<button type="button" class="btn btn-tonal btn-sm shop-add" data-action="add">Add</button>`
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
    grid.innerHTML = `<p class="shop-status">Loading products…</p>`
    if (meta) meta.textContent = ''
    if (more) more.hidden = true
    return
  }

  if (!slice.length) {
    grid.innerHTML = `<p class="shop-status">No products match your search.</p>`
  } else {
    grid.innerHTML = slice.map(productCard).join('')
  }

  if (meta) {
    meta.textContent = `${all.length.toLocaleString('en-EG')} product${all.length === 1 ? '' : 's'}`
  }
  if (more) {
    more.hidden = slice.length >= all.length
  }
}

function renderCartChrome() {
  const count = cartCount()
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = String(count)
    el.hidden = count === 0
  })
  const fab = document.getElementById('cart-fab')
  if (fab) fab.hidden = count === 0
}

function renderCartDrawer() {
  const body = document.querySelector('[data-cart-body]')
  const totalEl = document.querySelector('[data-cart-total]')
  const checkout = document.querySelector('[data-cart-checkout]')
  if (!body) return

  const lines = cartLines()
  if (!lines.length) {
    body.innerHTML = `<p class="shop-status">Your cart is empty. Browse products to add items.</p>`
  } else {
    body.innerHTML = lines
      .map(({ product, qty }) => {
        const line = product.price * qty
        return `
          <div class="cart-line" data-product-id="${escapeHtml(product.id)}">
            <div class="cart-line-info">
              <strong>${escapeHtml(product.title)}</strong>
              <span>${escapeHtml(formatPrice(product.price))} each</span>
            </div>
            <div class="cart-line-side">
              <div class="shop-qty" role="group" aria-label="Quantity">
                <button type="button" class="shop-qty-btn" data-action="dec" aria-label="Decrease">−</button>
                <span class="shop-qty-value">${qty}</span>
                <button type="button" class="shop-qty-btn" data-action="inc" aria-label="Increase">+</button>
              </div>
              <span class="cart-line-price">${escapeHtml(formatPrice(line))}</span>
            </div>
          </div>`
      })
      .join('')
  }

  if (totalEl) totalEl.textContent = formatPrice(cartTotal())
  if (checkout) {
    checkout.disabled = lines.length === 0
    checkout.setAttribute('aria-disabled', lines.length === 0 ? 'true' : 'false')
  }
}

function openCart() {
  const drawer = document.getElementById('cart-drawer')
  if (!drawer) return
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
  window.setTimeout(() => {
    if (!drawer.classList.contains('is-open')) drawer.hidden = true
  }, 280)
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
}

function wireCart() {
  document.getElementById('cart-fab')?.addEventListener('click', openCart)
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
    const url = buildWhatsAppUrl(buildOrderMessage())
    window.open(url, '_blank', 'noopener,noreferrer')
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCart()
  })
}

export async function initShop() {
  const root = document.getElementById('shop')
  if (!root) return

  wireShop(root)
  wireCart()
  renderCartChrome()
  renderGrid(root)

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
      grid.innerHTML = `<p class="shop-status">Couldn’t load products. Please refresh and try again.</p>`
    }
  }
}

import { getLang, t } from './i18n.js'
import { recommendByKeywords } from './search.js'
import { SYMPTOM_CHIPS, SYMPTOM_RULES } from './data/symptom-map.js'

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

function labelOf(entry) {
  const lang = getLang()
  return entry?.label?.[lang] || entry?.label?.en || ''
}

function noteOf(entry) {
  const lang = getLang()
  return entry?.note?.[lang] || entry?.note?.en || ''
}

function normalizeTrigger(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f\u064B-\u065F]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()
}

export function matchSymptomRules(text) {
  const q = normalizeTrigger(text)
  if (!q) return []

  const scored = SYMPTOM_RULES.map((rule) => {
    let score = 0
    for (const trig of rule.triggers) {
      const tNorm = normalizeTrigger(trig)
      if (!tNorm) continue
      if (q === tNorm) score += 20
      else if (q.includes(tNorm) || tNorm.includes(q)) score += 10
      else {
        const qTokens = q.split(/\s+/)
        const tTokens = tNorm.split(/\s+/)
        if (qTokens.some((qt) => tTokens.includes(qt) && qt.length > 2)) score += 4
      }
    }
    return { rule, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.map((x) => x.rule)
}

/**
 * @param {{
 *   getProducts: () => object[]
 *   formatPrice: (n: number) => string
 *   onAddToCart: (productId: string) => void
 *   onShowInShop: (query: string, categorySlug?: string) => void
 *   getCartQty: (productId: string) => number
 * }} api
 */
export function initSymptomBot(api) {
  const panel = document.getElementById('symptom-bot')
  if (!panel) return { open() {}, close() {}, refresh() {} }

  const thread = panel.querySelector('[data-bot-thread]')
  const form = panel.querySelector('[data-bot-form]')
  const input = panel.querySelector('[data-bot-input]')
  const chipsEl = panel.querySelector('[data-bot-chips]')

  const state = {
    open: false,
  }

  function scrollThread() {
    if (!thread) return
    thread.scrollTop = thread.scrollHeight
  }

  function appendBubble(role, html) {
    if (!thread) return
    const div = document.createElement('div')
    div.className = `bot-bubble bot-bubble-${role}`
    div.innerHTML = html
    thread.appendChild(div)
    scrollThread()
    return div
  }

  function renderChips() {
    if (!chipsEl) return
    chipsEl.innerHTML = SYMPTOM_CHIPS.map((id) => {
      const rule = SYMPTOM_RULES.find((r) => r.id === id)
      if (!rule) return ''
      return `<button type="button" class="bot-chip" data-bot-chip="${escapeHtml(id)}">${escapeHtml(labelOf(rule))}</button>`
    }).join('')
  }

  function resetConversation() {
    if (!thread) return
    thread.innerHTML = ''
    appendBubble('assist', `<p>${escapeHtml(t('bot.welcome'))}</p>`)
    renderChips()
  }

  function productListHtml(products, queryForShop, categorySlug) {
    if (!products.length) {
      return `<p>${escapeHtml(t('bot.none'))}</p>`
    }

    const cards = products
      .slice(0, 8)
      .map((p) => {
        const qty = api.getCartQty(p.id)
        return `
          <article class="bot-product" data-bot-product="${escapeHtml(p.id)}">
            <div class="bot-product-media">
              ${
                p.image
                  ? `<img src="${escapeHtml(p.image)}" alt="" width="56" height="56" loading="lazy" decoding="async" />`
                  : ''
              }
            </div>
            <div class="bot-product-body">
              <strong>${escapeHtml(p.title)}</strong>
              <span>${escapeHtml(api.formatPrice(p.price))}</span>
            </div>
            <button type="button" class="btn btn-tonal btn-sm" data-bot-add="${escapeHtml(p.id)}">
              ${escapeHtml(qty > 0 ? `${qty}` : t('bot.add'))}
            </button>
          </article>`
      })
      .join('')

    const viewBtn = `
      <button type="button" class="btn btn-tonal btn-sm bot-view-all" data-bot-view
        data-query="${escapeHtml(queryForShop || '')}"
        data-category="${escapeHtml(categorySlug || 'all')}">
        ${escapeHtml(t('bot.viewAll'))}
      </button>`

    return `${cards}<div class="bot-actions-row">${viewBtn}</div><p class="bot-follow">${escapeHtml(t('bot.followUp'))}</p>`
  }

  function showRecommendations(rule, keywords, categorySlugs, userText) {
    const products = recommendByKeywords(api.getProducts(), keywords, {
      categorySlugs,
      limit: 10,
    })
    const qLabel = userText || labelOf(rule)
    const note = rule ? noteOf(rule) : ''
    const html = `
      <p>${escapeHtml(t('bot.found', { q: qLabel }))}</p>
      ${note ? `<p class="bot-note">${escapeHtml(note)}</p>` : ''}
      <div class="bot-products">${productListHtml(products, keywords.slice(0, 3).join(' '), categorySlugs?.[0])}</div>
    `
    appendBubble('assist', html)
  }

  function presentRule(rule, userText) {
    if (rule.followUps?.length) {
      const options = rule.followUps
        .map(
          (f) =>
            `<button type="button" class="bot-chip" data-bot-follow="${escapeHtml(rule.id)}" data-follow-id="${escapeHtml(f.id)}">${escapeHtml(labelOf(f))}</button>`,
        )
        .join('')
      appendBubble(
        'assist',
        `<p>${escapeHtml(t('bot.clarify'))}</p><div class="bot-inline-chips">${options}
          <button type="button" class="bot-chip bot-chip-muted" data-bot-follow="${escapeHtml(rule.id)}" data-follow-id="__all">${escapeHtml(labelOf(rule))}</button>
        </div>`,
      )
      return
    }
    showRecommendations(rule, rule.keywords, rule.categorySlugs, userText)
  }

  function handleUserText(text) {
    const trimmed = text.trim()
    if (!trimmed) return
    appendBubble('user', `<p>${escapeHtml(trimmed)}</p>`)

    const matches = matchSymptomRules(trimmed)
    if (!matches.length) {
      // Fall back: treat free text as catalog search keywords
      const products = recommendByKeywords(api.getProducts(), [trimmed], { limit: 10 })
      if (products.length) {
        appendBubble(
          'assist',
          `<p>${escapeHtml(t('bot.found', { q: trimmed }))}</p><div class="bot-products">${productListHtml(products, trimmed)}</div>`,
        )
      } else {
        appendBubble('assist', `<p>${escapeHtml(t('bot.none'))}</p>`)
      }
      return
    }

    // If several strong matches, let user pick
    if (matches.length > 1) {
      const top = matches.slice(0, 4)
      const options = top
        .map(
          (r) =>
            `<button type="button" class="bot-chip" data-bot-chip="${escapeHtml(r.id)}">${escapeHtml(labelOf(r))}</button>`,
        )
        .join('')
      appendBubble(
        'assist',
        `<p>${escapeHtml(t('bot.clarify'))}</p><div class="bot-inline-chips">${options}</div>`,
      )
      return
    }

    presentRule(matches[0], trimmed)
  }

  function open() {
    panel.hidden = false
    state.open = true
    requestAnimationFrame(() => panel.classList.add('is-open'))
    document.body.classList.add('bot-open')
    if (thread && !thread.childElementCount) resetConversation()
    input?.focus()
  }

  function close() {
    panel.classList.remove('is-open')
    state.open = false
    document.body.classList.remove('bot-open')
    window.setTimeout(() => {
      if (!panel.classList.contains('is-open')) panel.hidden = true
    }, 280)
  }

  panel.querySelectorAll('[data-bot-close]').forEach((el) =>
    el.addEventListener('click', close),
  )

  panel.querySelector('[data-bot-reset]')?.addEventListener('click', () => {
    resetConversation()
  })

  form?.addEventListener('submit', (event) => {
    event.preventDefault()
    const value = input?.value || ''
    if (input) input.value = ''
    handleUserText(value)
  })

  panel.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-bot-chip]')
    if (chip) {
      const rule = SYMPTOM_RULES.find((r) => r.id === chip.dataset.botChip)
      if (!rule) return
      appendBubble('user', `<p>${escapeHtml(labelOf(rule))}</p>`)
      presentRule(rule, labelOf(rule))
      return
    }

    const follow = event.target.closest('[data-bot-follow]')
    if (follow) {
      const rule = SYMPTOM_RULES.find((r) => r.id === follow.dataset.botFollow)
      if (!rule) return
      const fid = follow.dataset.followId
      if (fid === '__all') {
        appendBubble('user', `<p>${escapeHtml(labelOf(rule))}</p>`)
        showRecommendations(rule, rule.keywords, rule.categorySlugs, labelOf(rule))
        return
      }
      const fu = rule.followUps?.find((f) => f.id === fid)
      if (!fu) return
      appendBubble('user', `<p>${escapeHtml(labelOf(fu))}</p>`)
      showRecommendations(rule, fu.keywords, fu.categorySlugs || rule.categorySlugs, labelOf(fu))
      return
    }

    const addBtn = event.target.closest('[data-bot-add]')
    if (addBtn) {
      api.onAddToCart(addBtn.dataset.botAdd)
      const qty = api.getCartQty(addBtn.dataset.botAdd)
      addBtn.textContent = String(qty)
      return
    }

    const viewBtn = event.target.closest('[data-bot-view]')
    if (viewBtn) {
      api.onShowInShop(viewBtn.dataset.query || '', viewBtn.dataset.category || 'all')
      close()
    }
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.open) close()
  })

  return {
    open,
    close,
    refresh() {
      renderChips()
      // Re-apply static strings inside panel
      panel.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n')
        if (key) el.textContent = t(key)
      })
      panel.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const key = el.getAttribute('data-i18n-placeholder')
        if (key) el.setAttribute('placeholder', t(key))
      })
      if (thread?.childElementCount) {
        // Keep history; only refresh chip bar labels
        renderChips()
      }
    },
    isOpen: () => state.open,
  }
}

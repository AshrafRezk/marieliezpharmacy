import { WHATSAPP_URL } from './config.js'
import { matchRedFlag } from './data/red-flags.js'
import { SYMPTOM_CHIPS, SYMPTOM_RULES } from './data/symptom-map.js'
import { getLang, t } from './i18n.js'
import { recommendByKeywords } from './search.js'
import { routeSymptomWithAi } from './symptom-ai.js'

const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

/** Drop filler words so free-text catalog fallback does not match "had" inside product names. */
const CATALOG_STOPWORDS = new Set([
  'i',
  'me',
  'my',
  'a',
  'an',
  'the',
  'had',
  'have',
  'has',
  'was',
  'were',
  'am',
  'is',
  'are',
  'been',
  'being',
  'to',
  'for',
  'of',
  'and',
  'or',
  'but',
  'with',
  'on',
  'in',
  'at',
  'by',
  'from',
  'that',
  'this',
  'it',
  'im',
  "i'm",
  'ive',
  "i've",
  'feel',
  'feeling',
  'felt',
  'got',
  'get',
  'getting',
  'like',
  'really',
  'very',
  'so',
  'just',
  'please',
  'help',
  'انا',
  'اني',
  'عندي',
  'عندى',
  'حاسس',
  'حاسة',
  'حاسه',
  'فيه',
  'في',
  'من',
  'او',
  'ال',
  'علي',
  'على',
  'بي',
  'لي',
])

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
    .replace(/['’]/g, "'")
    .trim()
}

/** Meaningful tokens for catalog keyword fallback (never the raw sentence alone). */
function catalogFallbackKeywords(text) {
  return normalizeTrigger(text)
    .split(/\s+/)
    .map((tok) => tok.replace(/^[^a-z0-9\u0600-\u06FF]+|[^a-z0-9\u0600-\u06FF]+$/gi, ''))
    .filter((tok) => tok.length > 2 && !CATALOG_STOPWORDS.has(tok))
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
 *   onContinueWhatsApp?: () => void
 * }} api
 */
export function initSymptomBot(api) {
  const panel = document.getElementById('symptom-bot')
  if (!panel) {
    return {
      open() {},
      close() {},
      refresh() {},
      isOpen: () => false,
      getCustomerIntent: () => ({ feelings: [], turns: [] }),
    }
  }

  const thread = panel.querySelector('[data-bot-thread]')
  const form = panel.querySelector('[data-bot-form]')
  const input = panel.querySelector('[data-bot-input]')
  const chipsEl = panel.querySelector('[data-bot-chips]')
  const waBar = panel.querySelector('[data-bot-wa-bar]')

  const state = {
    open: false,
    /** @type {{ role: 'user' | 'assist', text: string }[]} */
    turns: [],
    /** @type {string[]} */
    feelings: [],
  }

  function updateWhatsAppChrome() {
    if (!waBar) return
    const ready = state.feelings.length > 0
    waBar.hidden = !ready
    waBar.setAttribute('aria-hidden', ready ? 'false' : 'true')
  }

  function continueOnWhatsApp() {
    api.onContinueWhatsApp?.()
  }

  function recordTurn(role, text) {
    const cleaned = String(text || '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!cleaned) return
    state.turns.push({ role, text: cleaned })
    if (role === 'user') {
      const key = normalizeTrigger(cleaned)
      if (key && !state.feelings.some((f) => normalizeTrigger(f) === key)) {
        state.feelings.push(cleaned)
      }
      updateWhatsAppChrome()
    }
  }

  function scrollThread() {
    if (!thread) return
    thread.scrollTop = thread.scrollHeight
  }

  function appendBubble(role, html, plainText = '') {
    if (!thread) return
    if (plainText) recordTurn(role === 'user' ? 'user' : 'assist', plainText)
    const div = document.createElement('div')
    if (role === 'assist') {
      div.className = 'bot-msg bot-msg-assist'
      div.innerHTML = `
        <img
          class="bot-avatar"
          src="/images/dr-magdy.jpg"
          alt=""
          width="36"
          height="36"
          decoding="async"
        />
        <div class="bot-msg-body">
          <span class="bot-msg-name">${escapeHtml(t('bot.doctorName'))}</span>
          <div class="bot-bubble bot-bubble-assist">${html}</div>
        </div>`
    } else {
      div.className = `bot-bubble bot-bubble-${role}`
      div.innerHTML = html
    }
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
    state.turns = []
    state.feelings = []
    updateWhatsAppChrome()
    appendBubble('assist', `<p>${escapeHtml(t('bot.welcome'))}</p>`, t('bot.welcome'))
    renderChips()
  }

  function whatsappActionsHtml() {
    return `
      <div class="bot-actions-row">
        <button type="button" class="btn btn-filled btn-sm bot-wa-inline" data-bot-whatsapp>
          ${escapeHtml(t('bot.whatsapp'))}
        </button>
      </div>
      <p class="bot-follow">${escapeHtml(t('bot.followUp'))}</p>`
  }

  function productListHtml(products, queryForShop, categorySlug) {
    if (!products.length) {
      return `
        <p>${escapeHtml(t('bot.none'))}</p>
        <div class="bot-actions-row">
          <button type="button" class="btn btn-filled btn-sm bot-wa-inline" data-bot-whatsapp>
            ${escapeHtml(t('bot.whatsapp'))}
          </button>
        </div>`
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
    const waBtn = `
      <button type="button" class="btn btn-filled btn-sm bot-wa-inline" data-bot-whatsapp>
        ${escapeHtml(t('bot.whatsapp'))}
      </button>`

    return `${cards}<div class="bot-actions-row">${waBtn}${viewBtn}</div><p class="bot-follow">${escapeHtml(t('bot.followUp'))}</p>`
  }

  function showRecommendations(rule, keywords, categorySlugs, userText) {
    const products = recommendByKeywords(api.getProducts(), keywords, {
      categorySlugs,
      limit: 10,
    })
    const qLabel = userText || labelOf(rule)
    const note = rule ? noteOf(rule) : ''
    const foundText = t('bot.found', { q: qLabel })
    const html = `
      <p>${escapeHtml(foundText)}</p>
      ${note ? `<p class="bot-note">${escapeHtml(note)}</p>` : ''}
      <div class="bot-products">${productListHtml(products, keywords.slice(0, 3).join(' '), categorySlugs?.[0])}</div>
    `
    const plain = note ? `${foundText} ${note}` : foundText
    appendBubble('assist', html, plain)
  }

  function presentRule(rule, userText) {
    if (rule.followUps?.length) {
      const options = rule.followUps
        .map(
          (f) =>
            `<button type="button" class="bot-chip" data-bot-follow="${escapeHtml(rule.id)}" data-follow-id="${escapeHtml(f.id)}">${escapeHtml(labelOf(f))}</button>`,
        )
        .join('')
      const clarify = t('bot.clarify')
      appendBubble(
        'assist',
        `<p>${escapeHtml(clarify)}</p><div class="bot-inline-chips">${options}
          <button type="button" class="bot-chip bot-chip-muted" data-bot-follow="${escapeHtml(rule.id)}" data-follow-id="__all">${escapeHtml(labelOf(rule))}</button>
        </div>`,
        clarify,
      )
      return
    }
    showRecommendations(rule, rule.keywords, rule.categorySlugs, userText)
  }

  function showRedFlagResponse() {
    const title = t('bot.emergencyTitle')
    const body = t('bot.emergencyBody')
    const html = `
      <div class="bot-emergency" role="alert">
        <p class="bot-emergency-title">${escapeHtml(title)}</p>
        <p>${escapeHtml(body)}</p>
        <div class="bot-actions-row">
          <a class="btn btn-filled btn-sm" href="tel:123">${escapeHtml(t('bot.emergencyCall'))}</a>
          <a class="btn btn-tonal btn-sm" href="${escapeHtml(WHATSAPP_URL)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('bot.emergencyWa'))}</a>
        </div>
      </div>`
    appendBubble('assist', html, `${title} ${body}`)
  }

  function showCatalogFallback(userText) {
    const keywords = catalogFallbackKeywords(userText)
    if (!keywords.length) {
      appendBubble(
        'assist',
        `<p>${escapeHtml(t('bot.none'))}</p>${whatsappActionsHtml()}`,
        t('bot.none'),
      )
      return
    }

    const products = recommendByKeywords(api.getProducts(), keywords, { limit: 10 })
    if (products.length) {
      const foundText = t('bot.found', { q: userText })
      appendBubble(
        'assist',
        `<p>${escapeHtml(foundText)}</p><div class="bot-products">${productListHtml(products, keywords.join(' '))}</div>`,
        foundText,
      )
      return
    }

    appendBubble(
      'assist',
      `<p>${escapeHtml(t('bot.none'))}</p>${whatsappActionsHtml()}`,
      t('bot.none'),
    )
  }

  function presentFromRules(trimmed) {
    const matches = matchSymptomRules(trimmed)
    if (!matches.length) {
      showCatalogFallback(trimmed)
      return
    }

    if (matches.length > 1) {
      const top = matches.slice(0, 4)
      const options = top
        .map(
          (r) =>
            `<button type="button" class="bot-chip" data-bot-chip="${escapeHtml(r.id)}">${escapeHtml(labelOf(r))}</button>`,
        )
        .join('')
      const clarify = t('bot.clarify')
      appendBubble(
        'assist',
        `<p>${escapeHtml(clarify)}</p><div class="bot-inline-chips">${options}</div>`,
        clarify,
      )
      return
    }

    presentRule(matches[0], trimmed)
  }

  async function handleUserText(text) {
    const trimmed = text.trim()
    if (!trimmed) return
    appendBubble('user', `<p>${escapeHtml(trimmed)}</p>`, trimmed)

    // Safety gate first — never catalog-match emergencies like seizure.
    if (matchRedFlag(trimmed)) {
      showRedFlagResponse()
      return
    }

    // Optional free-tier LLM (Netlify + GROQ_API_KEY / GEMINI_API_KEY). Soft-fails offline.
    const ai = await routeSymptomWithAi(trimmed, getLang())
    if (ai?.kind === 'emergency' || (ai?.kind === 'rule' && matchRedFlag(trimmed))) {
      showRedFlagResponse()
      return
    }
    if (ai?.kind === 'rule' && ai.ruleId) {
      const rule = SYMPTOM_RULES.find((r) => r.id === ai.ruleId)
      if (rule) {
        presentRule(rule, trimmed)
        return
      }
    }
    if (ai?.kind === 'keywords' && ai.keywords?.length) {
      showRecommendations(null, ai.keywords, ai.categorySlugs, trimmed)
      return
    }

    presentFromRules(trimmed)
  }

  function open() {
    panel.hidden = false
    state.open = true
    requestAnimationFrame(() => panel.classList.add('is-open'))
    document.body.classList.add('bot-open')
    if (thread && !thread.childElementCount) resetConversation()
    input?.focus()
    document.getElementById('bot-fab')?.classList.remove('is-nudge')
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
    void handleUserText(value)
  })

  panel.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-bot-chip]')
    if (chip) {
      const rule = SYMPTOM_RULES.find((r) => r.id === chip.dataset.botChip)
      if (!rule) return
      const label = labelOf(rule)
      appendBubble('user', `<p>${escapeHtml(label)}</p>`, label)
      presentRule(rule, label)
      return
    }

    const follow = event.target.closest('[data-bot-follow]')
    if (follow) {
      const rule = SYMPTOM_RULES.find((r) => r.id === follow.dataset.botFollow)
      if (!rule) return
      const fid = follow.dataset.followId
      if (fid === '__all') {
        const label = labelOf(rule)
        appendBubble('user', `<p>${escapeHtml(label)}</p>`, label)
        showRecommendations(rule, rule.keywords, rule.categorySlugs, label)
        return
      }
      const fu = rule.followUps?.find((f) => f.id === fid)
      if (!fu) return
      const label = labelOf(fu)
      appendBubble('user', `<p>${escapeHtml(label)}</p>`, label)
      showRecommendations(rule, fu.keywords, fu.categorySlugs || rule.categorySlugs, label)
      return
    }

    const waBtn = event.target.closest('[data-bot-whatsapp]')
    if (waBtn) {
      continueOnWhatsApp()
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
      updateWhatsAppChrome()
      // Re-apply static strings inside panel
      panel.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n')
        if (key) el.textContent = t(key)
      })
      panel.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const key = el.getAttribute('data-i18n-placeholder')
        if (key) el.setAttribute('placeholder', t(key))
      })
      panel.querySelectorAll('[data-i18n-aria]').forEach((el) => {
        const key = el.getAttribute('data-i18n-aria')
        if (key) el.setAttribute('aria-label', t(key))
      })
      if (thread?.childElementCount) {
        // Keep history; only refresh chip bar labels
        renderChips()
      }
    },
    isOpen: () => state.open,
    /** Plain-language customer intent for WhatsApp checkout. */
    getCustomerIntent() {
      return {
        feelings: [...state.feelings],
        turns: state.turns.map((turn) => ({ ...turn })),
      }
    },
  }
}

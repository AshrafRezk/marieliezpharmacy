import { isKnownIngredientQuery } from './data/product-enrichment.js'
import { ARABIC_VARIANTS, SEARCH_ALIASES } from './data/search-aliases.js'

const DIACRITICS = /[\u064B-\u065F\u0670]/g

/** Normalize for bilingual matching (EN + AR). */
export function normalizeText(value) {
  let s = String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(DIACRITICS, '')

  for (const [from, to] of Object.entries(ARABIC_VARIANTS)) {
    s = s.replaceAll(from, to)
  }

  return s
    .replace(/['’]/g, '')
    .replace(/[_/|,+]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((t) => t.length > 1 || /[\u0600-\u06FF]/.test(t))
}

function expandToken(token) {
  const n = normalizeText(token)
  const out = new Set([n])
  const direct = SEARCH_ALIASES[n]
  if (direct) direct.forEach((x) => out.add(normalizeText(x)))

  // Phrase keys with spaces (e.g. "sore throat", "vitamin c")
  for (const [key, vals] of Object.entries(SEARCH_ALIASES)) {
    if (key.includes(' ') && (n.includes(normalizeText(key)) || normalizeText(key).includes(n))) {
      out.add(normalizeText(key))
      vals.forEach((x) => out.add(normalizeText(x)))
    }
  }
  return [...out]
}

/** Expand a full query into searchable terms (aliases + tokens). */
export function expandQuery(query) {
  const raw = normalizeText(query)
  if (!raw) return { primary: [], all: [] }

  const primary = new Set([raw, ...tokenize(raw)])
  const all = new Set(primary)

  const phraseHit = SEARCH_ALIASES[raw]
  if (phraseHit) phraseHit.forEach((x) => all.add(normalizeText(x)))

  for (const [key, vals] of Object.entries(SEARCH_ALIASES)) {
    const nk = normalizeText(key)
    if (nk.length >= 3 && (raw.includes(nk) || nk.includes(raw))) {
      all.add(nk)
      vals.forEach((x) => all.add(normalizeText(x)))
    }
  }

  for (const token of tokenize(raw)) {
    expandToken(token).forEach((t) => all.add(t))
  }

  return {
    primary: [...primary].filter(Boolean),
    all: [...all].filter(Boolean),
  }
}

function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  if (Math.abs(a.length - b.length) > 2) return 99
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 0; i < a.length; i++) {
    let prev = i + 1
    for (let j = 0; j < b.length; j++) {
      const cur = a[i] === b[j] ? row[j] : Math.min(row[j], row[j + 1], prev) + 1
      row[j] = prev
      prev = cur
    }
    row[b.length] = prev
  }
  return row[b.length]
}

function fuzzyHit(hayTokens, term) {
  if (term.length < 4) return false
  const maxDist = term.length >= 7 ? 2 : 1
  return hayTokens.some((tok) => tok.length >= 4 && levenshtein(tok, term) <= maxDist)
}

function productFieldText(product, field) {
  const value = product?.[field]
  if (Array.isArray(value)) return value.filter(Boolean).join(' ')
  return value || ''
}

function brandMatchesTerm(brandText, brandTokens, term) {
  if (!brandText || !term) return false
  if (brandText === term) return true
  // Multi-word brand prefix only: "bath & body" → "bath & body works"
  // Also single-token prefix of multi-word brand: "eva" → "eva skin clinic"
  if (term.length >= 3 && brandText.startsWith(`${term} `)) return true
  if (term.includes(' ') && brandText.startsWith(term)) return true
  // Single-token brand: exact token match only
  if (!term.includes(' ') && brandTokens.length === 1 && brandTokens[0] === term) return true
  if (!term.includes(' ') && brandTokens.includes(term) && term.length >= 4) return true
  return false
}

function ingredientMatchesTerm(ingredientText, ingredientTokens, term) {
  if (!ingredientText || term.length < 3) return false
  if (ingredientTokens.includes(term)) return true
  if (term.length >= 4 && ingredientText.includes(term)) return true
  return ingredientTokens.some(
    (tok) => tok.length >= 3 && (tok.startsWith(term) || (term.length >= 4 && term.startsWith(tok))),
  )
}

/**
 * Score a product against expanded search terms.
 * Higher is better; 0 = no match.
 * Brand and activeIngredients are indexed explicitly so company / ingredient queries
 * surface trade brands and therapeutic alternatives.
 */
export function scoreProduct(product, terms, primaryTerms = []) {
  const list = Array.isArray(terms) ? terms : terms?.all || []
  const primary = new Set(primaryTerms.length ? primaryTerms : list.slice(0, 1))
  if (!list.length) return 1

  const brandText = normalizeText(productFieldText(product, 'brand'))
  const ingredientText = normalizeText(productFieldText(product, 'activeIngredients'))
  const titleText = normalizeText(product.title)
  const hay = normalizeText(
    [
      product.title,
      product.brand,
      productFieldText(product, 'activeIngredients'),
      product.category,
      product.subcategory,
      product.slug,
    ]
      .filter(Boolean)
      .join(' '),
  )
  const hayTokens = tokenize(hay)
  const brandTokens = tokenize(brandText)
  const ingredientTokens = tokenize(ingredientText)
  let score = 0

  // Full-query brand phrase bonus (primary often includes the raw normalized query)
  for (const phrase of primary) {
    if (phrase.length >= 2 && brandMatchesTerm(brandText, brandTokens, phrase)) {
      score += phrase.includes(' ') ? 48 : 28
    }
  }

  for (const term of list) {
    if (!term) continue
    const weight = primary.has(term) ? 1.6 : 1
    let hit = false

    if (brandMatchesTerm(brandText, brandTokens, term)) {
      score += (term.length >= 4 ? 22 : 16) * weight
      hit = true
    }

    if (ingredientMatchesTerm(ingredientText, ingredientTokens, term)) {
      score += (term.length >= 5 ? 20 : 14) * weight
      hit = true
    }

    if (hit) continue

    // Short fragments ("had", "ha") create false catalog hits — require real tokens.
    if (term.length >= 3 && hayTokens.includes(term)) {
      score += (term.length >= 5 ? 12 : 8) * weight
      if (tokenize(titleText).includes(term)) score += 6 * weight
      continue
    }
    if (term.length >= 4 && hay.includes(term)) {
      score += (term.length >= 5 ? 12 : 8) * weight
      if (titleText.includes(term)) score += 6 * weight
      continue
    }
    if (
      term.length >= 3 &&
      hayTokens.some(
        (tok) =>
          tok.length >= 3 && (tok.startsWith(term) || (term.length >= 4 && term.startsWith(tok))),
      )
    ) {
      score += 5 * weight
      continue
    }
    if (fuzzyHit(hayTokens, term)) {
      score += 3 * weight
    }
  }

  return score
}

function isStrongBrandQuery(query, brandHits) {
  if (!brandHits.length) return false
  const q = normalizeText(query)
  if (!q || q.length < 2) return false
  // Ingredient searches must stay broad (alternatives across brands)
  if (isKnownIngredientQuery(q)) return false
  const exact = brandHits.some(({ p }) => {
    const b = normalizeText(p.brand || '')
    if (!b) return false
    if (b === q) return true
    if (q.includes(' ') && b.startsWith(q)) return true
    if (!q.includes(' ') && q.length >= 3 && b.startsWith(`${q} `)) return true
    return false
  })
  return exact
}

/**
 * Filter + rank products for cognitive bilingual search.
 * @param {object[]} products
 * @param {string} query
 * @param {{ category?: string }} [opts]
 */
export function searchProducts(products, query, opts = {}) {
  const category = opts.category || 'all'
  const q = query.trim()
  const expanded = q ? expandQuery(q) : { primary: [], all: [] }

  const pool = products.filter((p) => {
    if (category !== 'all' && p.categorySlug !== category) return false
    return true
  })

  if (!expanded.all.length) return pool

  const scored = pool
    .map((p) => ({ p, score: scoreProduct(p, expanded.all, expanded.primary) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.p.title.localeCompare(b.p.title))

  const qNorm = normalizeText(q)
  const brandHits = scored.filter(({ p }) => {
    const b = normalizeText(p.brand || '')
    if (!b) return false
    if (b === qNorm) return true
    // Prefix of a longer brand name: "eva" → "eva skin clinic", "bath & body" → "…"
    if (qNorm.includes(' ') && b.startsWith(qNorm)) return true
    if (!qNorm.includes(' ') && qNorm.length >= 3 && b.startsWith(`${qNorm} `)) return true
    return false
  })

  // When the query is clearly a brand/company name, don't flood with weak token matches
  if (isStrongBrandQuery(q, brandHits)) {
    return brandHits.map(({ p }) => p)
  }

  return scored.map(({ p }) => p)
}

/**
 * Recommend products from keyword list (symptom bot).
 */
export function recommendByKeywords(products, keywords, opts = {}) {
  const limit = opts.limit ?? 12
  const categorySlugs = opts.categorySlugs || null
  const expanded = expandQuery(keywords.join(' '))

  let pool = products
  if (categorySlugs?.length) {
    const set = new Set(categorySlugs)
    pool = products.filter((p) => set.has(p.categorySlug))
  }

  return pool
    .map((p) => ({ p, score: scoreProduct(p, expanded.all, expanded.primary) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p)
}

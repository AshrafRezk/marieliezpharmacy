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

/**
 * Score a product against expanded search terms.
 * Higher is better; 0 = no match.
 */
export function scoreProduct(product, terms, primaryTerms = []) {
  const list = Array.isArray(terms) ? terms : terms?.all || []
  const primary = new Set(primaryTerms.length ? primaryTerms : list.slice(0, 1))
  if (!list.length) return 1

  const hay = normalizeText(
    [product.title, product.category, product.subcategory, product.slug]
      .filter(Boolean)
      .join(' '),
  )
  const hayTokens = tokenize(hay)
  let score = 0

  for (const term of list) {
    if (!term) continue
    const weight = primary.has(term) ? 1.6 : 1
    if (hay.includes(term)) {
      score += (term.length >= 5 ? 12 : 8) * weight
      if (normalizeText(product.title).includes(term)) score += 6 * weight
      continue
    }
    if (hayTokens.some((tok) => tok.startsWith(term) || term.startsWith(tok))) {
      score += 5 * weight
      continue
    }
    if (fuzzyHit(hayTokens, term)) {
      score += 3 * weight
    }
  }

  return score
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

  return pool
    .map((p) => ({ p, score: scoreProduct(p, expanded.all, expanded.primary) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.p.title.localeCompare(b.p.title))
    .map(({ p }) => p)
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

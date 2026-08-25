/**
 * Extract brand/trade name and active ingredients from Talabat product titles.
 * Titles often start with the brand; medicines often include "Xmg IngredientName".
 */

/** Longest-first multi-word brand / house names seen in this catalog. */
const MULTI_WORD_BRANDS = [
  'Bath & Body Works',
  'Eva Skin Clinic',
  'Eva Skin Care',
  'Eva Optimum Care',
  'Eva Clinic',
  'Aloe Eva',
  "L'Oreal Paris",
  "L'Oréal Paris",
  'La Roche-Posay',
  'Head & Shoulders',
  'The Ordinary',
  "Johnson's Baby",
  'Hero Baby',
  'Wee Baby',
  'Pic Solution',
  'Limitless Naturals',
  'Care & More',
  'Raw African',
  'Five Fives',
  'Al Sayad',
  'Garnier Skin Active',
  'Garnier Color Naturals',
  'Pampers Premium Care',
  'Pampers Premium',
  'Sanosan Baby',
  'Sofico Kids',
  'Dabur Vatika',
  'Vaseline Intensive Care',
  'Nivea Men',
  'Dove Men',
  'Gillette Venus',
  'Pantene Pro-V',
  'Oral-B',
  'I-M',
  'StarVille',
  'Starville',
  'One Hair Removal',
  'Bless Leave In',
  'Zero Frizz',
  'Freshdays Natural',
  'Mustela Baby',
  'Beesline',
  'CeraVe',
].sort((a, b) => b.length - a.length)

/** First-token words that are rarely brand names. */
const BRAND_STOP = new Set(
  [
    'small',
    'large',
    'medium',
    'soft',
    'hard',
    'new',
    'the',
    'with',
    'for',
    'and',
    'anti',
    'extra',
    'super',
    'natural',
    'organic',
    'premium',
    'medical',
    'sterile',
    'elastic',
    'cotton',
    'vitamin',
    'vitamins',
    'paracetamol',
    'ibuprofen',
    'omeprazole',
    'acetylcistein',
    'acetylcysteine',
    'mupirocin',
    'acyclovir',
    'insulin',
  ].map((s) => s.toLowerCase()),
)

/** Product-form / filler words that end an ingredient phrase. */
const INGREDIENT_STOP = new Set(
  [
    'analgesic',
    'antipyretic',
    'anti',
    'antirheumatic',
    'anti-inflammatory',
    'antiinflammatory',
    'antiallergic',
    'antihistamine',
    'antihistaminic',
    'antiseptic',
    'antiviral',
    'antibacterial',
    'antifungal',
    'antispasmodic',
    'antiflatulence',
    'mucolytic',
    'laxative',
    'supplement',
    'supplements',
    'tablets',
    'tablet',
    'caplets',
    'caplet',
    'capsules',
    'capsule',
    'softgels',
    'softgel',
    'syrup',
    'suspension',
    'solution',
    'powder',
    'granules',
    'sachets',
    'sachet',
    'cream',
    'ointment',
    'gel',
    'lotion',
    'spray',
    'drops',
    'ampoules',
    'ampoule',
    'injection',
    'intravenous',
    'intramuscular',
    'ophthalmic',
    'nasal',
    'topical',
    'oral',
    'paediatric',
    'pediatric',
    'sterile',
    'effervescent',
    'instant',
    'flavored',
    'flavour',
    'flavor',
    'orange',
    'cherry',
    'menthol',
    'pieces',
    'piece',
    'pack',
    'packs',
    'for',
    'with',
    'and',
    'the',
    'non',
    'sedating',
    'local',
    'corticosteroid',
    'relieving',
    'reducing',
    'treating',
    'treatment',
    'relief',
    'pain',
    'fever',
    'cold',
    'flu',
    'cough',
    'diarrhea',
    'diarrhoea',
    'allergy',
    'allergic',
    'rhinitis',
    'ulcers',
    'ulcer',
    'gastric',
    'duodenal',
    'gastrointestinal',
    'motility',
    'muscle',
    'relaxant',
    'vitamin',
    'off',
    'plus',
    'extra',
    'advanced',
    'advance',
    'kids',
    'baby',
    'children',
    'adult',
    'years',
    'months',
    'immune',
    'system',
    'support',
    'oxide',
    'mg',
    'mcg',
    'ml',
    'g',
  ].map((s) => s.toLowerCase()),
)

/**
 * Common actives / micronutrients to detect as whole words when present in the title.
 * Kept lowercase; matching is case-insensitive.
 */
const KNOWN_INGREDIENTS = [
  'paracetamol',
  'acetaminophen',
  'ibuprofen',
  'diclofenac',
  'ketoprofen',
  'ketorolac',
  'naproxen',
  'aspirin',
  'acetylsalicylic',
  'caffeine',
  'chlorpheniramine',
  'pseudoephedrine',
  'phenylephrine',
  'dextromethorphan',
  'guaifenesin',
  'acetylcysteine',
  'acetylcistein',
  'ambroxol',
  'bromhexine',
  'cetirizine',
  'levocetirizine',
  'loratadine',
  'desloratadine',
  'fexofenadine',
  'ketotifen',
  'azelastine',
  'olopatadine',
  'diphenhydramine',
  'doxylamine',
  'hyoscine',
  'scopolamine',
  'mebeverine',
  'alverine',
  'trimebutine',
  'domperidone',
  'metoclopramide',
  'ondansetron',
  'omeprazole',
  'esomeprazole',
  'pantoprazole',
  'lansoprazole',
  'dexlansoprazole',
  'rabeprazole',
  'vonoprazan',
  'famotidine',
  'ranitidine',
  'nifuroxazide',
  'metronidazole',
  'tinidazole',
  'nitazoxanide',
  'amoxicillin',
  'clavulanate',
  'clavulanic',
  'azithromycin',
  'ciprofloxacin',
  'levofloxacin',
  'mupirocin',
  'fusidic',
  'gentamicin',
  'neomycin',
  'bacitracin',
  'clotrimazole',
  'miconazole',
  'ketoconazole',
  'terbinafine',
  'acyclovir',
  'aciclovir',
  'valacyclovir',
  'hydrocortisone',
  'betamethasone',
  'mometasone',
  'fluticasone',
  'budesonide',
  'prednisolone',
  'dexamethasone',
  'lidocaine',
  'benzocaine',
  'povidone',
  'iodine',
  'chlorhexidine',
  'hydrogen peroxide',
  'dexpanthenol',
  'panthenol',
  'simethicone',
  'dimethicone',
  'lactulose',
  'bisacodyl',
  'senna',
  'orlistat',
  'sildenafil',
  'tadalafil',
  'vardenafil',
  'dapoxetine',
  'finasteride',
  'minoxidil',
  'brimonidine',
  'timolol',
  'latanoprost',
  'nepafenac',
  'xylometazoline',
  'oxymetazoline',
  'salbutamol',
  'albuterol',
  'montelukast',
  'theophylline',
  'insulin',
  'metformin',
  'glimepiride',
  'sitagliptin',
  'atorvastatin',
  'rosuvastatin',
  'amlodipine',
  'bisoprolol',
  'losartan',
  'valsartan',
  'enalapril',
  'furosemide',
  'spironolactone',
  'warfarin',
  'clopidogrel',
  'aspirin',
  'iron',
  'ferrous',
  'folic acid',
  'folate',
  'zinc',
  'calcium',
  'magnesium',
  'potassium',
  'vitamin a',
  'vitamin b',
  'vitamin b12',
  'vitamin c',
  'vitamin d',
  'vitamin d3',
  'vitamin e',
  'biotin',
  'collagen',
  'hyaluronic acid',
  'retinol',
  'niacinamide',
  'salicylic acid',
  'benzoyl peroxide',
  'tea tree',
  'aloe vera',
  'prebiotic',
  'probiotic',
  'glucosamine',
  'chondroitin',
  'omega-3',
  'omega 3',
  'fish oil',
  'coenzyme q10',
  'melatonin',
  'itopride',
  'cinnarizine',
  'betahistine',
  'chlorzoxazone',
  'methocarbamol',
  'thiocolchicoside',
  'trypsin',
  'chymotrypsin',
  'papain',
  'dried ivy',
  'ivy leaf',
  'pyridoxine',
  'thiamine',
  'riboflavin',
  'nicotinamide',
  'ascorbic acid',
  'cholecalciferol',
]

const DOSAGE_INGREDIENT_RE =
  /(\d+(?:\.\d+)?)\s*(mg|mcg|µg|ug|g|ml|iu|i\.u\.|%)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:ml|g))?\s+([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*){0,4})/gi

const WITH_INGREDIENT_RE =
  /\bwith\s+([A-Za-z][A-Za-z0-9'+.-]*(?:\s*(?:&|and|,)\s*[A-Za-z][A-Za-z0-9'+.-]*){0,4})/gi

/** @type {Set<string>} */
const KNOWN_INGREDIENT_SET = new Set(KNOWN_INGREDIENTS.map((s) => s.toLowerCase()))

function normalizeBrandKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, "'")
    .trim()
}

function titleCaseBrand(value) {
  const s = String(value || '').trim()
  if (!s) return ''
  // Preserve known casing for short / punctuated brands
  if (/^(I-M|Oral-B|CeraVe|Fe|LM|YOLO|iSiS)$/i.test(s)) {
    const known = { 'i-m': 'I-M', 'oral-b': 'Oral-B', cerave: 'CeraVe', fe: 'Fe', lm: 'LM', yolo: 'YOLO', isis: 'iSiS' }
    return known[s.toLowerCase()] || s
  }
  return s
    .split(/(\s+|[&/-])/)
    .map((part) => {
      if (!part || /^\s+$/.test(part) || /[&/-]/.test(part)) return part
      if (part.length <= 2 && part === part.toUpperCase()) return part
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join('')
}

function cleanIngredientPhrase(raw) {
  if (!raw) return ''
  const words = String(raw)
    .replace(/[,;:].*$/, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  const kept = []
  for (const word of words) {
    const lower = word.toLowerCase().replace(/[^a-z0-9+-]/g, '')
    if (!lower) continue
    if (INGREDIENT_STOP.has(lower)) break
    if (/^\d/.test(lower)) break
    kept.push(word.replace(/[^A-Za-z0-9'+.-]/g, ''))
    if (kept.length >= 4) break
  }

  const phrase = kept.join(' ').trim()
  if (phrase.length < 3) return ''
  if (INGREDIENT_STOP.has(phrase.toLowerCase())) return ''
  return phrase
}

function addIngredient(set, value) {
  const cleaned = cleanIngredientPhrase(value)
  if (!cleaned) return
  // Prefer canonical casing: Title Case for multi-word, keep chemical-like names
  const normalized = cleaned
    .split(/\s+/)
    .map((w) => (w === w.toUpperCase() && w.length <= 4 ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ')
  const key = normalized.toLowerCase()
  // Dedupe by lowercase; keep first spelling
  if (![...set].some((x) => x.toLowerCase() === key)) {
    set.add(normalized)
  }
}

/**
 * Build a first-token brand lexicon from the full catalog (frequency ≥ 2).
 * @param {Array<{ title?: string }>} products
 * @returns {Set<string>} lowercase first tokens that look like brands
 */
export function buildBrandLexicon(products) {
  const counts = new Map()
  for (const p of products || []) {
    const first = String(p.title || '')
      .trim()
      .split(/\s+/)[0]
    if (!first) continue
    const key = normalizeBrandKey(first)
    if (!key || BRAND_STOP.has(key) || key.length < 2) continue
    if (/^\d+([.,]\d+)*$/.test(key)) continue
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  const lexicon = new Set()
  for (const [key, count] of counts) {
    if (count >= 2) lexicon.add(key)
  }
  return lexicon
}

/**
 * @param {string} title
 * @param {Set<string>} [brandLexicon]
 * @returns {string}
 */
export function extractBrand(title, brandLexicon = null) {
  const raw = String(title || '').trim()
  if (!raw) return ''

  const lower = normalizeBrandKey(raw)
  for (const brand of MULTI_WORD_BRANDS) {
    const nb = normalizeBrandKey(brand)
    if (lower === nb || lower.startsWith(`${nb} `) || lower.startsWith(`${nb},`)) {
      return titleCaseBrand(brand)
    }
  }

  const first = raw.split(/\s+/)[0]
  const firstKey = normalizeBrandKey(first)
  if (!firstKey || BRAND_STOP.has(firstKey)) {
    return ''
  }
  // Pure numeric / dosage-like tokens are not brands ("500mg", "1,2,3")
  if (/^\d+([.,]\d+)*$/.test(firstKey) || /^\d+(mg|mcg|ml|g|%)$/i.test(firstKey)) {
    return ''
  }

  // Two-word brand when second token is short connector-ish (&, Baby, Men, etc.) already handled above.
  // Accept first token if in lexicon or looks like a proper name (capitalized / hyphenated / alphanumeric like 3M).
  const looksProper =
    /^[A-ZÀ-ÖØ-Þ]/.test(first) ||
    /[-']/.test(first) ||
    /\d/.test(first) ||
    (first.length <= 3 && first === first.toUpperCase())

  if (brandLexicon?.has(firstKey) || looksProper) {
    return titleCaseBrand(first.replace(/,$/, ''))
  }

  return ''
}

/**
 * @param {string} title
 * @returns {string[]}
 */
export function extractActiveIngredients(title) {
  const raw = String(title || '')
  const found = new Set()

  let m
  const dosageRe = new RegExp(DOSAGE_INGREDIENT_RE.source, 'gi')
  while ((m = dosageRe.exec(raw))) {
    addIngredient(found, m[3])
  }

  const withRe = new RegExp(WITH_INGREDIENT_RE.source, 'gi')
  while ((m = withRe.exec(raw))) {
    const chunk = m[1]
    for (const part of chunk.split(/\s*(?:&|and|,)\s*/i)) {
      const candidate = cleanIngredientPhrase(part)
      if (!candidate) continue
      const key = candidate.toLowerCase()
      // "with …" marketing phrases are noisy — only keep known actives / micronutrients
      if (
        KNOWN_INGREDIENT_SET.has(key) ||
        [...KNOWN_INGREDIENT_SET].some((k) => k.includes(key) || key.includes(k))
      ) {
        addIngredient(found, candidate)
      }
    }
  }

  const lower = raw.toLowerCase()
  for (const ing of KNOWN_INGREDIENTS) {
    const escaped = ing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, 'i')
    if (re.test(lower)) {
      addIngredient(found, ing)
    }
  }

  return [...found]
}

/** True when a search query is itself a known active / micronutrient. */
export function isKnownIngredientQuery(query) {
  const q = String(query || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[_/|,+]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!q) return false
  if (KNOWN_INGREDIENT_SET.has(q)) return true
  // Avoid "fe" matching inside "ferrous", etc.
  if (q.length < 4) return false
  return [...KNOWN_INGREDIENT_SET].some(
    (k) => k.length >= 4 && (k === q || k.startsWith(`${q} `) || q.startsWith(`${k} `) || k.startsWith(q)),
  )
}

/**
 * Enrich a single product in place / return a shallow copy with brand + activeIngredients.
 * @param {object} product
 * @param {Set<string>} [brandLexicon]
 */
export function enrichProduct(product, brandLexicon = null) {
  const title = product?.title || ''
  const brand = extractBrand(title, brandLexicon)
  const activeIngredients = extractActiveIngredients(title)
  return {
    ...product,
    brand: brand || null,
    activeIngredients,
  }
}

/**
 * Enrich an entire catalog. Builds a brand lexicon from all titles first.
 * @param {object[]} products
 */
export function enrichProducts(products) {
  const list = Array.isArray(products) ? products : []
  const lexicon = buildBrandLexicon(list)
  return list.map((p) => enrichProduct(p, lexicon))
}

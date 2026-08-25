/**
 * One-off / refresh scraper: Talabat Marieliez Pharmacy catalog → public/data/products.json
 * Uses SSR __NEXT_DATA__ pages (durable for Netlify builds; not a live scrape at request time).
 *
 * Usage: node scripts/scrape-talabat.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { enrichProducts } from '../src/data/product-enrichment.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'public/data/products.json')

const BRANCH_ID = '718221'
const AREA_ID = '9288'
const BASE = `https://www.talabat.com/egypt/pharmacy/${BRANCH_ID}/marieliez-pharmacy`
const STORE_PAGE = `${BASE}?aid=${AREA_ID}`
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchText(url, attempt = 1) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en',
    },
    redirect: 'follow',
  })
  if (!res.ok) {
    if (attempt < 4 && (res.status === 429 || res.status >= 500)) {
      await sleep(800 * attempt)
      return fetchText(url, attempt + 1)
    }
    throw new Error(`HTTP ${res.status} for ${url}`)
  }
  return res.text()
}

function extractNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)
  if (!m) throw new Error('__NEXT_DATA__ not found')
  return JSON.parse(m[1])
}

function normalizeProduct(item, category, subcategory) {
  return {
    id: item.id,
    title: item.title,
    slug: item.slug,
    price: Number(item.price) || 0,
    originalPrice: Number(item.originalPrice) || Number(item.price) || 0,
    image: item.image || (item.images && item.images[0]) || '',
    category: category.name,
    categorySlug: category.slug,
    subcategory: subcategory?.name || null,
    subcategorySlug: subcategory?.slug || null,
    stockAmount: item.stockAmount ?? null,
  }
}

async function scrapeSubcategory(category, subcategory) {
  const products = []
  let page = 1
  let pageCount = 1

  while (page <= pageCount) {
    const url = `${BASE}/${category.slug}/${subcategory.slug}?aid=${AREA_ID}&page=${page}`
    process.stdout.write(`  ${category.slug}/${subcategory.slug} p${page}/${pageCount}… `)
    const html = await fetchText(url)
    const data = extractNextData(html)
    const itemsData = data?.props?.pageProps?.initialState?.itemsData
    if (!itemsData?.items?.length) {
      console.log('empty')
      break
    }
    pageCount = itemsData.pageCount || page
    for (const item of itemsData.items) {
      products.push(normalizeProduct(item, category, subcategory))
    }
    console.log(`+${itemsData.items.length} (total ${products.length})`)
    page += 1
    await sleep(250)
  }

  return products
}

async function main() {
  console.log('Fetching store categories…')
  const storeHtml = await fetchText(STORE_PAGE)
  const storeData = extractNextData(storeHtml)
  const initial = storeData.props.pageProps.initialState
  const categories = initial.categories || []
  const store = initial.groceryStore || {}

  console.log(`Found ${categories.length} categories`)

  const byId = new Map()
  for (const category of categories) {
    const subs = category.subCategories?.length
      ? category.subCategories
      : [{ name: category.name, slug: category.slug, id: category.id }]
    for (const sub of subs) {
      try {
        const items = await scrapeSubcategory(category, sub)
        for (const p of items) {
          if (!byId.has(p.id)) byId.set(p.id, p)
        }
      } catch (err) {
        console.error(`  FAILED ${category.slug}/${sub.slug}:`, err.message)
      }
    }
  }

  const products = enrichProducts(
    [...byId.values()].sort(
      (a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title),
    ),
  )

  const payload = {
    source: STORE_PAGE,
    scrapedAt: new Date().toISOString(),
    enrichedAt: new Date().toISOString(),
    currency: 'EGP',
    store: {
      name: store.name || 'Marieliez Pharmacy',
      branchId: store.talabatBranchId || BRANCH_ID,
      dhVendorId: store.dhVendorId || null,
    },
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: c.imageUrl || '',
      count: c.count ?? null,
      subcategories: (c.subCategories || []).map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        count: s.count ?? null,
      })),
    })),
    products,
  }

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify(payload))
  console.log(`\nWrote ${products.length} products → ${OUT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

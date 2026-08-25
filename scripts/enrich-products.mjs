/**
 * Enrich public/data/products.json with brand + activeIngredients fields.
 * Usage: node scripts/enrich-products.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { enrichProducts } from '../src/data/product-enrichment.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public/data/products.json')

const payload = JSON.parse(readFileSync(OUT, 'utf8'))
const before = payload.products?.length || 0
payload.products = enrichProducts(payload.products || [])
payload.enrichedAt = new Date().toISOString()

const withBrand = payload.products.filter((p) => p.brand).length
const withIng = payload.products.filter((p) => p.activeIngredients?.length).length
const brands = new Set(payload.products.map((p) => p.brand).filter(Boolean))

writeFileSync(OUT, JSON.stringify(payload))
console.log(
  `Enriched ${before} products → ${withBrand} with brand, ${withIng} with ingredients, ${brands.size} unique brands`,
)
console.log(`Wrote ${OUT}`)

/**
 * Optional free-text → symptom routing via Netlify function (Groq / Gemini).
 * Enable with VITE_SYMPTOM_AI=1 and set GROQ_API_KEY or GEMINI_API_KEY on Netlify.
 * Always fails soft — callers must keep offline rules + red-flags as the source of truth for safety.
 */

const TIMEOUT_MS = 3500

/**
 * @typedef {{
 *   kind: 'emergency' | 'rule' | 'keywords' | 'none'
 *   ruleId?: string
 *   keywords?: string[]
 *   categorySlugs?: string[]
 *   flagId?: string
 * }} SymptomAiRoute
 */

/**
 * @param {string} text
 * @param {string} [lang]
 * @returns {Promise<SymptomAiRoute | null>}
 */
export async function routeSymptomWithAi(text, lang = 'en') {
  if (import.meta.env.VITE_SYMPTOM_AI !== '1') return null

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch('/api/symptom-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || typeof data.kind !== 'string') return null
    return data
  } catch {
    return null
  } finally {
    window.clearTimeout(timer)
  }
}

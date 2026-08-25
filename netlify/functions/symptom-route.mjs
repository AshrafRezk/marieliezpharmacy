/**
 * Optional free-tier LLM router for Dr. Magdy free text.
 * Set GROQ_API_KEY (preferred) or GEMINI_API_KEY in Netlify env.
 * Without a key, returns 503 so the client falls back to offline rules.
 */

const RULE_IDS = [
  'headache',
  'fever',
  'cold-flu',
  'cough',
  'sore-throat',
  'allergy',
  'diarrhea',
  'constipation',
  'heartburn',
  'stomach-cramp',
  'nausea',
  'muscle-pain',
  'wound',
  'burn',
  'fatigue',
  'vitamins',
  'acne',
  'nasal',
]

const SYSTEM = `You route pharmacy symptom chat to a catalog category. Reply with ONLY compact JSON:
{"kind":"emergency"|"rule"|"keywords"|"none","ruleId":"...","keywords":["..."],"flagId":"..."}
Rules:
- kind=emergency for seizures, chest pain, stroke, severe breathing trouble, heavy bleeding, anaphylaxis, overdose, unconsciousness, suicidal thoughts. Set flagId.
- kind=rule when it clearly matches one ruleId from: ${RULE_IDS.join(', ')}
- kind=keywords for mild OTC-suitable symptoms with 2-5 English product search keywords
- kind=none if unclear or not a symptom
Never invent prescription advice. Prefer emergency when unsure about severity.`

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  }
}

function parseModelJson(raw) {
  const text = String(raw || '')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

function normalizeRoute(data) {
  if (!data || typeof data !== 'object') return { kind: 'none' }
  const kind = data.kind
  if (kind === 'emergency') {
    return { kind: 'emergency', flagId: String(data.flagId || 'emergency') }
  }
  if (kind === 'rule' && RULE_IDS.includes(data.ruleId)) {
    return { kind: 'rule', ruleId: data.ruleId }
  }
  if (kind === 'keywords' && Array.isArray(data.keywords)) {
    const keywords = data.keywords
      .map((k) => String(k || '').trim())
      .filter((k) => k.length > 1)
      .slice(0, 6)
    if (!keywords.length) return { kind: 'none' }
    return { kind: 'keywords', keywords }
  }
  return { kind: 'none' }
}

async function callGroq(text, lang) {
  const key = process.env.GROQ_API_KEY
  if (!key) return null
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0,
      max_tokens: 120,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `lang=${lang}\ntext=${text}` },
      ],
    }),
  })
  if (!res.ok) return null
  const payload = await res.json()
  return parseModelJson(payload?.choices?.[0]?.message?.content)
}

async function callGemini(text, lang) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${SYSTEM}\n\nlang=${lang}\ntext=${text}` }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 120 },
    }),
  })
  if (!res.ok) return null
  const payload = await res.json()
  const raw = payload?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || ''
  return parseModelJson(raw)
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'method_not_allowed' })
  }

  if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
    return response(503, { error: 'no_api_key', kind: 'none' })
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return response(400, { error: 'invalid_json' })
  }

  const text = String(body?.text || '').trim().slice(0, 500)
  const lang = body?.lang === 'ar' ? 'ar' : 'en'
  if (!text) return response(400, { error: 'empty_text', kind: 'none' })

  try {
    const raw = (await callGroq(text, lang)) || (await callGemini(text, lang))
    if (!raw) return response(502, { error: 'upstream', kind: 'none' })
    return response(200, normalizeRoute(raw))
  } catch {
    return response(502, { error: 'upstream', kind: 'none' })
  }
}

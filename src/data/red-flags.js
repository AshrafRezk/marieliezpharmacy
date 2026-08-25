/**
 * Offline emergency / red-flag triage for Dr. Magdy.
 * Runs before symptom rules and catalog search — free AI alone is not enough.
 */

/**
 * @typedef {{
 *   id: string
 *   triggers: string[]
 *   severity: 'emergency'
 * }} RedFlag
 */

/** @type {RedFlag[]} */
export const RED_FLAGS = [
  {
    id: 'seizure',
    severity: 'emergency',
    triggers: [
      'seizure',
      'seizures',
      'convulsion',
      'convulsions',
      'epileptic',
      'epilepsy fit',
      'fitting',
      'نوبة صرع',
      'نوبه صرع',
      'صرع',
      'تشنج',
      'تشنجات',
      'اختلاج',
    ],
  },
  {
    id: 'chest-pain',
    severity: 'emergency',
    triggers: [
      'chest pain',
      'chest pains',
      'heart attack',
      'crushing chest',
      'ألم في الصدر',
      'الم في الصدر',
      'ألم صدر',
      'الم صدر',
      'ذبحة',
      'جلطة قلب',
      'ازمة قلبية',
      'أزمة قلبية',
    ],
  },
  {
    id: 'stroke',
    severity: 'emergency',
    triggers: [
      'stroke',
      'face drooping',
      'slurred speech',
      'cannot move arm',
      'جلطة',
      'سكتة',
      'سكته',
      'فالج',
      'شلل نصفي',
    ],
  },
  {
    id: 'breathing',
    severity: 'emergency',
    triggers: [
      'cannot breathe',
      "can't breathe",
      'cant breathe',
      'difficulty breathing',
      'shortness of breath',
      'not breathing',
      'choking',
      'صعوبة تنفس',
      'صعوبه تنفس',
      'مقدرش اتنفس',
      'مش قادر اتنفس',
      'اختناق',
      'ضيق تنفس شديد',
    ],
  },
  {
    id: 'severe-bleeding',
    severity: 'emergency',
    triggers: [
      'severe bleeding',
      'wont stop bleeding',
      "won't stop bleeding",
      'bleeding heavily',
      'نزيف شديد',
      'نزف شديد',
      'دم كتير',
    ],
  },
  {
    id: 'anaphylaxis',
    severity: 'emergency',
    triggers: [
      'anaphylaxis',
      'anaphylactic',
      'throat closing',
      'throat swelling',
      'severe allergic reaction',
      'حساسية شديدة',
      'تورم الحلق',
      'حلق بيتقفل',
    ],
  },
  {
    id: 'suicidality',
    severity: 'emergency',
    triggers: [
      'kill myself',
      'suicide',
      'suicidal',
      'want to die',
      'end my life',
      'انتحار',
      'عايز اموت',
      'عاوز اموت',
      'اقتل نفسي',
    ],
  },
  {
    id: 'unconscious',
    severity: 'emergency',
    triggers: [
      'unconscious',
      'passed out',
      'not waking',
      'unresponsive',
      'فاقد الوعي',
      'غايب عن الوعي',
      'مش بيرد',
    ],
  },
  {
    id: 'overdose',
    severity: 'emergency',
    triggers: [
      'overdose',
      'took too many pills',
      'poisoned',
      'swallowed poison',
      'جرعة زايدة',
      'جرعه زايده',
      'تسمم',
      'بلعت سم',
    ],
  },
]

function normalize(text) {
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

/**
 * @param {string} text
 * @returns {RedFlag | null}
 */
export function matchRedFlag(text) {
  const q = normalize(text)
  if (!q) return null

  for (const flag of RED_FLAGS) {
    for (const trig of flag.triggers) {
      const tNorm = normalize(trig)
      if (!tNorm) continue
      if (q === tNorm || q.includes(tNorm)) return flag
    }
  }
  return null
}

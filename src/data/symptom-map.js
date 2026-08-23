/**
 * Symptom / feeling → catalog recommendation rules (offline, bilingual).
 * Each entry maps triggers to search keywords + optional category filters.
 */

/**
 * @typedef {{
 *   id: string
 *   label: { en: string, ar: string }
 *   triggers: string[]
 *   keywords: string[]
 *   categorySlugs?: string[]
 *   followUps?: { id: string, label: { en: string, ar: string }, keywords: string[], categorySlugs?: string[] }[]
 *   note?: { en: string, ar: string }
 * }} SymptomRule
 */

/** @type {SymptomRule[]} */
export const SYMPTOM_RULES = [
  {
    id: 'headache',
    label: { en: 'Headache', ar: 'صداع' },
    triggers: ['headache', 'migraine', 'صداع', 'صداعى', 'راس', 'رأس', 'الم راس', 'ألم رأس'],
    keywords: ['paracetamol', 'panadol', 'adol', 'headache', 'ibuprofen', 'brufen', 'pain relief'],
    categorySlugs: ['medicines'],
    followUps: [
      {
        id: 'headache-mild',
        label: { en: 'Mild pain / feverish', ar: 'ألم خفيف أو سخونية' },
        keywords: ['paracetamol', 'panadol', 'adol', 'fever'],
      },
      {
        id: 'headache-inflammation',
        label: { en: 'With inflammation / body aches', ar: 'مع التهاب أو آلام جسم' },
        keywords: ['ibuprofen', 'brufen', 'cataflam', 'diclofenac'],
      },
    ],
    note: {
      en: 'Persistent or severe headache needs pharmacist/doctor review.',
      ar: 'الصداع الشديد أو المستمر يحتاج مراجعة الصيدلي/الطبيب.',
    },
  },
  {
    id: 'fever',
    label: { en: 'Fever', ar: 'سخونية / حمى' },
    triggers: ['fever', 'temperature', 'حمى', 'سخونية', 'سخونه', 'حرارة'],
    keywords: ['fever', 'paracetamol', 'panadol', 'adol', 'antipyretic', 'ibuprofen'],
    categorySlugs: ['medicines'],
  },
  {
    id: 'cold-flu',
    label: { en: 'Cold & flu', ar: 'برد وإنفلونزا' },
    triggers: ['cold', 'flu', 'influenza', 'برد', 'انفلونزا', 'إنفلونزا', 'زكام', 'رشح'],
    keywords: ['cold', 'flu', 'congestal', 'flurest', 'cold & flu', 'pseudoephedrine'],
    categorySlugs: ['medicines'],
    followUps: [
      {
        id: 'cold-congestion',
        label: { en: 'Blocked nose', ar: 'انسداد الأنف' },
        keywords: ['otrivin', 'nasal', 'congestion', 'decongestant'],
      },
      {
        id: 'cold-cough',
        label: { en: 'Cough', ar: 'كحة' },
        keywords: ['cough', 'syrup', 'mucolytic', 'acetylcistein'],
      },
      {
        id: 'cold-aches',
        label: { en: 'Aches & fever', ar: 'آلام وسخونية' },
        keywords: ['paracetamol', 'panadol', 'cold & flu', 'congestal'],
      },
    ],
  },
  {
    id: 'cough',
    label: { en: 'Cough', ar: 'كحة / سعال' },
    triggers: ['cough', 'كحة', 'كحه', 'سعال'],
    keywords: ['cough', 'syrup', 'mucolytic', 'acetylcistein', 'expectorant'],
    categorySlugs: ['medicines'],
  },
  {
    id: 'sore-throat',
    label: { en: 'Sore throat', ar: 'التهاب حلق' },
    triggers: ['sore throat', 'throat', 'حلق', 'التهاب حلق', 'زور'],
    keywords: ['throat', 'strepsils', 'sore', 'lozenge', 'gargle'],
    categorySlugs: ['medicines'],
  },
  {
    id: 'allergy',
    label: { en: 'Allergy / hay fever', ar: 'حساسية' },
    triggers: ['allergy', 'allergic', 'hay fever', 'sneeze', 'حساسية', 'عطس', 'حكة', 'حكه', 'رمد'],
    keywords: ['allergy', 'antihistamine', 'zyrtec', 'telfast', 'claritin', 'levocetirizine', 'cetirizine'],
    categorySlugs: ['medicines'],
    followUps: [
      {
        id: 'allergy-skin',
        label: { en: 'Skin itch / rash', ar: 'حكة أو طفح جلدي' },
        keywords: ['antihistamine', 'cream', 'allergex', 'itch'],
      },
      {
        id: 'allergy-nose',
        label: { en: 'Runny / itchy nose', ar: 'رشح أو حكة أنف' },
        keywords: ['zyrtec', 'telfast', 'claritin', 'nasal', 'allergy'],
      },
    ],
  },
  {
    id: 'diarrhea',
    label: { en: 'Diarrhea', ar: 'إسهال' },
    triggers: ['diarrhea', 'diarrhoea', 'loose stool', 'اسهال', 'إسهال'],
    keywords: ['diarrhea', 'antinal', 'nifuroxazide', 'ors', 'rehydration'],
    categorySlugs: ['medicines'],
    note: {
      en: 'Seek care if diarrhea is severe, bloody, or lasts more than 2 days.',
      ar: 'راجع الرعاية إذا كان الإسهال شديدًا أو دمويًا أو استمر أكثر من يومين.',
    },
  },
  {
    id: 'constipation',
    label: { en: 'Constipation', ar: 'إمساك' },
    triggers: ['constipation', 'constipated', 'امساك', 'إمساك'],
    keywords: ['constipation', 'laxative', 'lactulose', 'agiola', 'senna'],
    categorySlugs: ['medicines'],
  },
  {
    id: 'heartburn',
    label: { en: 'Heartburn / acidity', ar: 'حموضة' },
    triggers: ['heartburn', 'acidity', 'acid reflux', 'gerd', 'حموضة', 'حرقان', 'ارتجاع'],
    keywords: ['heartburn', 'gaviscon', 'omeprazole', 'nexium', 'famotidine', 'antodine', 'acid'],
    categorySlugs: ['medicines'],
  },
  {
    id: 'stomach-cramp',
    label: { en: 'Stomach cramps', ar: 'مغص' },
    triggers: ['cramp', 'cramps', 'stomach pain', 'colic', 'مغص', 'مغص بطن', 'بطن'],
    keywords: ['buscopan', 'spasmomen', 'antispasmodic', 'simethicone', 'cramp'],
    categorySlugs: ['medicines'],
  },
  {
    id: 'nausea',
    label: { en: 'Nausea / vomiting', ar: 'غثيان / قيء' },
    triggers: ['nausea', 'vomiting', 'queasy', 'غثيان', 'قيء', 'ترجيع'],
    keywords: ['nausea', 'motilium', 'primperan', 'domperidone', 'vomiting'],
    categorySlugs: ['medicines'],
  },
  {
    id: 'muscle-pain',
    label: { en: 'Muscle / joint pain', ar: 'آلام عضلات أو مفاصل' },
    triggers: ['muscle', 'joint', 'back pain', 'sprain', 'عضلات', 'مفاصل', 'ظهر', 'روماتيزم'],
    keywords: ['voltaren', 'cataflam', 'diclofenac', 'ibuprofen', 'massage', 'analgesic cream'],
    categorySlugs: ['medicines'],
  },
  {
    id: 'wound',
    label: { en: 'Cut / wound / antiseptic', ar: 'جرح / مطهر' },
    triggers: ['wound', 'cut', 'antiseptic', 'injury', 'جرح', 'مطهر', 'نزيف'],
    keywords: ['betadine', 'antiseptic', 'wound', 'iodine', 'gauze', 'plaster'],
    categorySlugs: ['first-aid'],
  },
  {
    id: 'burn',
    label: { en: 'Minor burn', ar: 'حرق بسيط' },
    triggers: ['burn', 'scald', 'حرق', 'حروق'],
    keywords: ['burn', 'bepanthen', 'betadine', 'dexpanthenol'],
    categorySlugs: ['first-aid', 'medicines'],
  },
  {
    id: 'fatigue',
    label: { en: 'Tired / low energy', ar: 'تعب / إرهاق' },
    triggers: ['tired', 'fatigue', 'exhausted', 'weak', 'تعب', 'ارهاق', 'إرهاق', 'ضعف'],
    keywords: ['vitamin', 'iron', 'b12', 'feroglobin', 'centrum', 'energy'],
    categorySlugs: ['vitamins-supplements'],
    followUps: [
      {
        id: 'fatigue-iron',
        label: { en: 'Possible low iron', ar: 'ربما نقص حديد' },
        keywords: ['iron', 'feroglobin', 'folic', 'anemia'],
      },
      {
        id: 'fatigue-multi',
        label: { en: 'General multivitamin', ar: 'فيتامينات متعددة عامة' },
        keywords: ['centrum', 'multivitamin', 'vitamin'],
      },
    ],
  },
  {
    id: 'vitamins',
    label: { en: 'Vitamins & immunity', ar: 'فيتامينات ومناعة' },
    triggers: ['vitamin', 'vitamins', 'immunity', 'immune', 'فيتامين', 'فيتامينات', 'مناعة'],
    keywords: ['vitamin', 'vitamin c', 'vitamin d', 'zinc', 'omega', 'supplement'],
    categorySlugs: ['vitamins-supplements'],
  },
  {
    id: 'acne',
    label: { en: 'Acne / blemishes', ar: 'حبوب البشرة' },
    triggers: ['acne', 'pimple', 'blemishes', 'حبوب', 'بثور', 'حب الشباب'],
    keywords: ['acne', 'salicylic', 'benzoyl', 'normaderm', 'cleanser'],
    categorySlugs: ['skincare'],
  },
  {
    id: 'nasal',
    label: { en: 'Blocked nose', ar: 'انسداد الأنف' },
    triggers: ['blocked nose', 'stuffy', 'nasal congestion', 'انسداد', 'انف مسدود', 'أنف'],
    keywords: ['otrivin', 'nasal', 'spray', 'congestion', 'saline'],
    categorySlugs: ['medicines'],
  },
]

/** Quick-start chips shown in the bot UI */
export const SYMPTOM_CHIPS = [
  'headache',
  'cold-flu',
  'cough',
  'allergy',
  'diarrhea',
  'heartburn',
  'sore-throat',
  'wound',
  'fatigue',
]

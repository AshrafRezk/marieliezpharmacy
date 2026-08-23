/** Shop-focused EN/AR i18n with persistence + document dir/lang. */

const LANG_KEY = 'marieliez-lang'

/** @typedef {'en' | 'ar'} Lang */

/**
 * Arabic mix: clear modern UI chrome + warm Egyptian dialect for CTAs,
 * greetings, bot prompts, empty states, and marketing-ish copy (#treatslikefamily).
 * @type {Record<string, { en: string, ar: string }>}
 */
export const STRINGS = {
  'nav.care': { en: 'Care', ar: 'الرعاية' },
  'nav.shop': { en: 'Shop', ar: 'المتجر' },
  'nav.urgent': { en: 'Urgent', ar: 'طوارئ' },
  'nav.brands': { en: 'Brands', ar: 'الماركات' },
  'nav.map': { en: 'Map', ar: 'الخريطة' },
  'nav.faq': { en: 'FAQ', ar: 'أسئلة' },
  'nav.visit': { en: 'Visit', ar: 'زيارة' },
  'nav.cart': { en: 'Cart', ar: 'السلة' },
  'nav.home': { en: 'Home', ar: 'الرئيسية' },
  'nav.lang': { en: 'العربية', ar: 'English' },
  'nav.langAria': { en: 'Switch to Arabic', ar: 'التبديل إلى الإنجليزية' },
  'nav.primaryAria': { en: 'Primary', ar: 'القائمة الرئيسية' },
  'nav.dockAria': { en: 'Quick navigation', ar: 'تنقل سريع' },
  'nav.brandAria': {
    en: 'Marieliez Pharmacy home',
    ar: 'صيدلية ماريليز، الرئيسية',
  },
  'nav.skip': { en: 'Skip to content', ar: 'تخطّى إلى المحتوى' },

  /* EN: two-line Marieliez / Pharmacy. AR: full wordmark on name, empty sub. */
  'brand.name': { en: 'Marieliez', ar: 'صيدلية ماريليز' },
  'brand.sub': { en: 'Pharmacy', ar: '' },
  'brand.wordmark': { en: 'Marieliez Pharmacy', ar: 'صيدلية ماريليز' },

  'theme.toLight': { en: 'Switch to light mode', ar: 'التبديل للوضع الفاتح' },
  'theme.toDark': { en: 'Switch to dark mode', ar: 'التبديل للوضع الداكن' },

  'welcome.eyebrow': { en: 'A note from the owners', ar: 'كلمة من أصحاب الصيدلية' },
  'welcome.title': { en: 'Welcome to Marieliez.', ar: 'أهلاً بيك في ماريليز.' },
  'welcome.lede': {
    en: 'A short hello from our family pharmacy: care you can trust, close to home.',
    ar: 'سلام قصير من صيدلية العيلة: رعاية تقدر تعتمد عليها، قريبة من بيتك.',
  },
  'welcome.unmute': { en: 'Unmute', ar: 'شغّل الصوت' },
  'welcome.mute': { en: 'Mute', ar: 'اكتم الصوت' },
  'welcome.unmuteAria': { en: 'Unmute welcome video', ar: 'تشغيل صوت فيديو الترحيب' },
  'welcome.muteAria': { en: 'Mute welcome video', ar: 'كتم صوت فيديو الترحيب' },
  'welcome.skip': { en: 'Enter the pharmacy', ar: 'ادخل الصيدلية' },
  'welcome.dismissAria': { en: 'Close welcome video', ar: 'إغلاق فيديو الترحيب' },

  'hero.title': {
    en: 'Care you can trust, close to home.',
    ar: 'رعاية تقدر تعتمد عليها، قريبة من بيتك.',
  },
  'hero.lead': {
    en: 'Marieliez Pharmacy in Nasr City and New Cairo: prescriptions, wellness guidance, and personal attention, delivered with clarity and care.',
    ar: 'صيدلية ماريليز في مدينة نصر والتجمّع: روشتات، نصايح صحية، واهتمام شخصي، بكل وضوح وحرص.',
  },
  'hero.browse': { en: 'Browse products', ar: 'تصفّح المنتجات' },
  'hero.find': { en: 'Find a branch', ar: 'لاقي فرع قريب' },
  'hero.logoAlt': { en: 'Marieliez Pharmacy', ar: 'صيدلية ماريليز' },

  'care.eyebrow': { en: 'What we offer', ar: 'بنقدّم إيه' },
  'care.title': {
    en: 'Pharmacy support for everyday life',
    ar: 'دعم صيدلي ليومك العادي',
  },
  'care.lede': {
    en: 'From filling prescriptions to answering questions about your medications, Marieliez Pharmacy makes care simple and dependable for families across East Cairo and Nasr City.',
    ar: 'من صرف الروشتات لحد الإجابة عن أسئلتك عن أدويتك، صيدلية ماريليز بتخلي الرعاية بسيطة وموثوقة لعيلتك في شرق القاهرة ومدينة نصر.',
  },
  'care.rxTitle': { en: 'Prescriptions', ar: 'الروشتات' },
  'care.rxBody': {
    en: 'Reliable fills and refills you can count on.',
    ar: 'صرف وتجديد تعوّل عليه.',
  },
  'care.counselTitle': { en: 'Counseling', ar: 'الاستشارة' },
  'care.counselBody': {
    en: 'Clear guidance on dosing, interactions, and use.',
    ar: 'توضيح واضح عن الجرعة والتداخلات وطريقة الاستخدام.',
  },
  'care.wellTitle': { en: 'Wellness', ar: 'العافية' },
  'care.wellBody': {
    en: 'Everyday essentials curated for your health.',
    ar: 'أساسيات يومية مختارة لصحتك.',
  },

  'shop.eyebrow': { en: 'Order online', ar: 'اطلب أونلاين' },
  'shop.title': {
    en: 'Browse the pharmacy shelf',
    ar: 'تصفّح رف الصيدلية',
  },
  'shop.lede': {
    en: 'Search our catalog, add items to your cart, then message us on WhatsApp to place your order.',
    ar: 'دور في الكتالوج، ضيف اللي محتاجه للسلة، وبعدين ابعتلنا على واتساب نكمّل طلبك.',
  },
  'shop.priceDisclaimer': {
    en: 'Prices are liable to change',
    ar: 'الأسعار تقريبية وقابلة للتغيير',
  },
  'shop.searchLabel': { en: 'Search products', ar: 'ابحث عن منتجات' },
  'shop.searchPlaceholder': {
    en: 'Search medicines, skincare, vitamins…',
    ar: 'دور على أدوية، عناية بالبشرة، فيتامينات…',
  },
  'shop.categoriesAria': { en: 'Product categories', ar: 'فئات المنتجات' },
  'shop.all': { en: 'All', ar: 'الكل' },
  'shop.loading': { en: 'Loading products…', ar: 'بنحمّل المنتجات…' },
  'shop.empty': {
    en: 'No products match your search.',
    ar: 'مفيش منتجات مطابقة لبحثك.',
  },
  'shop.error': {
    en: 'Couldn’t load products. Please refresh and try again.',
    ar: 'مقدرتش أحمّل المنتجات. حدّث الصفحة وحاول تاني.',
  },
  'shop.products_one': { en: '{n} product', ar: 'منتج واحد' },
  'shop.products_other': { en: '{n} products', ar: '{n} منتج' },
  'shop.more': { en: 'Show more', ar: 'عرض المزيد' },
  'shop.add': { en: 'Add', ar: 'ضيف' },
  'shop.qtyAria': { en: 'Quantity for {title}', ar: 'الكمية لـ {title}' },
  'shop.dec': { en: 'Decrease quantity', ar: 'تقليل الكمية' },
  'shop.inc': { en: 'Increase quantity', ar: 'زيادة الكمية' },
  'shop.feelCta': { en: 'How do you feel?', ar: 'إزيك؟ حاسس بإيه؟' },
  'shop.feelHint': {
    en: 'Describe a symptom, and we’ll suggest catalog items to discuss with a pharmacist.',
    ar: 'قولنا حاسس بإيه، وهنقترحلك حاجات من الرف تتكلم عليها مع الصيدلي.',
  },
  'shop.catalogNote': {
    en: 'Product names may appear in English (supplier catalog).',
    ar: 'أسماء المنتجات ممكن تظهر بالإنجليزي (من كتالوج المورّد).',
  },

  'cart.title': { en: 'Your cart', ar: 'سلتك' },
  'cart.close': { en: 'Close', ar: 'إغلاق' },
  'cart.empty': {
    en: 'Your cart is empty. Browse products to add items.',
    ar: 'سلتك فاضية. تصفّح المنتجات وضيف اللي محتاجه.',
  },
  'cart.each': { en: 'each', ar: 'للقطعة' },
  'cart.qty': { en: 'Quantity', ar: 'الكمية' },
  'cart.total': { en: 'Approx. total', ar: 'الإجمالي التقريبي' },
  'cart.checkout': { en: 'Order on WhatsApp', ar: 'اطلب على واتساب' },
  'cart.openAria': { en: 'Open cart', ar: 'فتح السلة' },
  'cart.orderHello': {
    en: 'Hello Marieliez Pharmacy, I would like to order:',
    ar: 'أهلاً صيدلية ماريليز، عايز أطلب:',
  },
  'cart.orderTotal': { en: 'Approx. total:', ar: 'الإجمالي التقريبي:' },

  'bot.title': { en: 'Dr. Magdy', ar: 'د. مجدي' },
  'bot.subtitle': { en: 'Symptom guide', ar: 'دليل الأعراض' },
  'bot.doctorName': { en: 'Dr. Magdy', ar: 'د. مجدي' },
  'bot.close': { en: 'Close', ar: 'إغلاق' },
  'bot.chipsAria': { en: 'Common symptoms', ar: 'أعراض شائعة' },
  'bot.welcome': {
    en: 'Hi — I’m Dr. Magdy. Tell me how you feel, or pick a common symptom. I’ll suggest products from our shelf.',
    ar: 'أهلاً — أنا د. مجدي. قول لي حاسس بإيه، أو اختار عَرَض شائع. هقترحلك منتجات من الرف.',
  },
  'bot.placeholder': {
    en: 'e.g. headache, sore throat, حموضة…',
    ar: 'مثال: صداع، زور، حموضة…',
  },
  'bot.send': { en: 'Send', ar: 'ابعت' },
  'bot.disclaimer': {
    en: 'Informational only, not medical advice. Always consult a Marieliez pharmacist, especially for prescriptions or if symptoms are severe.',
    ar: 'للمعلومة بس، مش نصيحة طبية. استشير دايمًا صيدلي ماريليز، خاصة للروشتات أو لو الأعراض شديدة.',
  },
  'bot.clarify': {
    en: 'A few options that may fit: tap one, or type more detail:',
    ar: 'شوية اختيارات ممكن تناسبك: اختار واحدة، أو اكتب تفاصيل أكتر:',
  },
  'bot.found': {
    en: 'Based on “{q}”, here are catalog suggestions:',
    ar: 'بناءً على «{q}»، دي اقتراحات من الكتالوج:',
  },
  'bot.none': {
    en: 'We couldn’t match that symptom to products yet. Try another word, or ask a pharmacist on WhatsApp.',
    ar: 'لسه مش لاقيين مطابقة للعرض ده. جرّب كلمة تانية، أو كلّم الصيدلي على واتساب.',
  },
  'bot.add': { en: 'Add', ar: 'ضيف' },
  'bot.viewAll': { en: 'Show in shop', ar: 'ورّيني في المتجر' },
  'bot.reset': { en: 'Start over', ar: 'من الأول' },
  'bot.followUp': {
    en: 'You can add items to your cart, then order on WhatsApp.',
    ar: 'تقدر تضيف المنتجات للسلة وبعدين تطلب على واتساب.',
  },

  'emergency.badge': { en: 'Emergency', ar: 'طوارئ' },
  'emergency.eyebrow': { en: 'We always care', ar: 'دايمًا بنهتم' },
  'emergency.title': {
    en: 'Urgent orders come first',
    ar: 'الطلبات العاجلة لها الأولوية',
  },
  'emergency.lede': {
    en: 'Emergency items are available when you need them most. In urgent cases, we prioritize these orders despite traffic, because Marieliez <span class="brand-tag">#treatslikefamily</span>.',
    ar: 'مستلزمات الطوارئ متاحة لما تحتاجها أكتر. في الحالات العاجلة بنقدّم الطلبات دي حتى مع الزحمة، لأن ماريليز <span class="brand-tag">#treatslikefamily</span>.',
  },
  'emergency.laneCosmetics': { en: 'Cosmetics', ar: 'تجميل' },
  'emergency.laneUrgent': { en: 'Emergency', ar: 'طوارئ' },
  'emergency.wa': { en: 'WhatsApp for emergencies', ar: 'واتساب للطوارئ' },
  'emergency.call': { en: 'Call +20 112 111 1605', ar: 'اتصل بينا: +20 112 111 1605' },

  'brands.eyebrow': { en: 'Cosmetics', ar: 'تجميل' },
  'brands.title': {
    en: 'Top-notch beauty brands, in store',
    ar: 'ماركات تجميل ممتازة، موجودة عندنا',
  },
  'brands.lede': {
    en: 'Dermocosmetics and haircare you trust, curated for Cairo’s everyday routines.',
    ar: 'مستحضرات ديرمو وعناية بالشعر تثق فيها، مختارة لروتين القاهرة اليومي.',
  },
  'brands.aria': { en: 'Featured cosmetics brands', ar: 'ماركات تجميل مميزة' },
  'brands.note': {
    en: 'Ask our pharmacists for guidance on Vichy, Kérastase, La Roche-Posay, L\'Oréal, and similar dermocosmetic lines.',
    ar: 'اسأل صيادلتنا عن Vichy وKérastase وLa Roche-Posay وL\'Oréal وخطوط ديرمو مشابهة.',
  },

  'map.eyebrow': { en: 'Locations', ar: 'الفروع' },
  'map.title': {
    en: 'Find a Marieliez branch',
    ar: 'لاقي فرع ماريليز',
  },
  'map.lede': {
    en: 'Two neighbourhood pharmacies in Nasr City and New Cairo. Tap a branch to fly the map there, with East Cairo compounds and hospitals highlighted nearby.',
    ar: 'فرعين قريبين في مدينة نصر والتجمّع. اضغط على الفرع عشان الخريطة تودّيك هناك، مع كمباوندات ومستشفيات شرق القاهرة حواليها.',
  },
  'map.regionAria': {
    en: 'Interactive map of Marieliez Pharmacy branches',
    ar: 'خريطة تفاعلية لفروع صيدلية ماريليز',
  },
  'map.mapAria': { en: 'Map of pharmacy branches', ar: 'خريطة فروع الصيدلية' },
  'map.legendAria': { en: 'Map legend', ar: 'مفتاح الخريطة' },
  'map.legendPharmacy': { en: 'Pharmacy', ar: 'صيدلية' },
  'map.legendHospital': { en: 'Hospital', ar: 'مستشفى' },
  'map.legendCompound': { en: 'Compound', ar: 'كمباوند' },
  'map.golfName': { en: 'Al Golf Branch', ar: 'فرع الجولف' },
  'map.golfAddr': {
    en: '23 Ahmed Tayseer St., Al Golf, Nasr City',
    ar: '٢٣ شارع أحمد تيسير، الجولف، مدينة نصر',
  },
  'map.golfArea': { en: 'Nasr City', ar: 'مدينة نصر' },
  'map.golfAria': {
    en: 'Show Al Golf Branch on the map',
    ar: 'عرض فرع الجولف على الخريطة',
  },
  'map.hpName': { en: 'Highland Park Branch', ar: 'فرع هايلاند بارك' },
  'map.hpAddr': {
    en: 'Highland Park Mall, El Andalus, New Cairo',
    ar: 'مول هايلاند بارك، الأندلس، التجمع الخامس',
  },
  'map.hpArea': { en: 'New Cairo', ar: 'التجمع الخامس' },
  'map.hpAria': {
    en: 'Show Highland Park Branch on the map',
    ar: 'عرض فرع هايلاند بارك على الخريطة',
  },
  'map.popupWa': { en: 'WhatsApp', ar: 'واتساب' },
  'map.popupCall': { en: 'Call', ar: 'اتصال' },

  'faq.eyebrow': { en: 'Questions', ar: 'أسئلة' },
  'faq.title': {
    en: 'Common questions about Marieliez',
    ar: 'أسئلة شائعة عن ماريليز',
  },
  'faq.lede': {
    en: 'Straight answers about our branches, service areas, ordering, and urgent care.',
    ar: 'إجابات واضحة عن فروعنا، مناطق الخدمة، الطلب، والطوارئ.',
  },
  'faq.q1': { en: 'Where are your branches?', ar: 'أين توجد فروعكم؟' },
  'faq.a1': {
    en: 'Marieliez Pharmacy has two Cairo locations: Al Golf Branch at 23 Ahmed Tayseer St., Al Golf, Nasr City, and Highland Park Branch at Highland Park Mall, El Andalus, New Cairo. Call or WhatsApp <a class="inline-link" href="tel:+201121111605">+20 112 111 1605</a>.',
    ar: 'لصيدلية ماريليز فرعان في القاهرة: فرع الجولف في ٢٣ شارع أحمد تيسير، الجولف، مدينة نصر، وفرع هايلاند بارك في مول هايلاند بارك، الأندلس، التجمع الخامس. اتصل أو راسلنا على واتساب <a class="inline-link" href="tel:+201121111605">+20 112 111 1605</a>.',
  },
  'faq.q2': {
    en: 'Which areas and compounds do you serve?',
    ar: 'ما المناطق والكمباوندات التي تخدمونها؟',
  },
  'faq.a2': {
    en: 'We serve Nasr City and New Cairo / East Cairo neighbourhoods, including communities around Highland Park such as Akoya, SODIC Eastown, Villette, Kattameya Plaza, and EDNC. Message us on WhatsApp to confirm delivery for your compound.',
    ar: 'نخدم مدينة نصر والتجمع / شرق القاهرة، بما في ذلك المجتمعات حول هايلاند بارك مثل أكويا، سوديك إيستاون، فيليت، قطامية بلازا، وEDNC. راسلنا على واتساب لتأكيد التوصيل لكمباوندك.',
  },
  'faq.q3': { en: 'How do I order online?', ar: 'كيف أطلب أونلاين؟' },
  'faq.a3': {
    en: 'Browse the <a class="inline-link" href="#shop">product catalog</a>, add items to your cart, then send the order on WhatsApp. You can also message <a class="inline-link" href="https://wa.me/201121111605" target="_blank" rel="noopener noreferrer">+20 112 111 1605</a> with a prescription or product list.',
    ar: 'تصفّح <a class="inline-link" href="#shop">كتالوج المنتجات</a>، أضِف إلى السلة، ثم أرسل الطلب على واتساب. يمكنك أيضًا مراسلة <a class="inline-link" href="https://wa.me/201121111605" target="_blank" rel="noopener noreferrer">+20 112 111 1605</a> بالروشتة أو قائمة المنتجات.',
  },
  'faq.q4': {
    en: 'What about urgent or emergency orders?',
    ar: 'ماذا عن الطلبات العاجلة أو الطوارئ؟',
  },
  'faq.a4': {
    en: 'Urgent orders are prioritized. Contact us right away by <a class="inline-link" href="#emergency">WhatsApp or phone</a> so the pharmacy team can help quickly.',
    ar: 'الطلبات العاجلة لها أولوية. تواصل معنا فورًا عبر <a class="inline-link" href="#emergency">واتساب أو الهاتف</a> ليساعدك فريق الصيدلية بسرعة.',
  },
  'faq.q5': {
    en: 'Which beauty brands do you carry?',
    ar: 'ما ماركات التجميل المتوفرة لديكم؟',
  },
  'faq.a5': {
    en: 'We stock dermocosmetics and haircare from Vichy, Kérastase, La Roche-Posay, L\'Oréal, and similar lines. Ask a pharmacist in store for guidance.',
    ar: 'نوفّر مستحضرات ديرمو وعناية بالشعر من Vichy وKérastase وLa Roche-Posay وL\'Oréal وخطوط مشابهة. اسأل الصيدلي في الفرع ليوجّهك.',
  },

  'visit.eyebrow': { en: 'Visit us', ar: 'زورنا' },
  'visit.title': {
    en: 'We’re ready when you need us',
    ar: 'إحنا جاهزين لما تحتاجنا',
  },
  'visit.lede': {
    en: 'Message us on WhatsApp, call the pharmacy, or follow updates on Facebook, then <a class="inline-link" href="#map">jump to the map</a> to find your branch.',
    ar: 'ابعتلنا على واتساب، اتصل بالصيدلية، أو تابعنا على فيسبوك، وبعدين <a class="inline-link" href="#map">روح للخريطة</a> تلاقي فرعك.',
  },
  'visit.waAria': { en: 'Chat on WhatsApp', ar: 'دردشة على واتساب' },
  'visit.waLabel': { en: 'WhatsApp', ar: 'واتساب' },
  'visit.waValue': { en: 'Chat with us', ar: 'كلّمنا' },
  'visit.callAria': {
    en: 'Call Marieliez Pharmacy at +20 112 111 1605',
    ar: 'اتصل بصيدلية ماريليز على +20 112 111 1605',
  },
  'visit.callLabel': { en: 'Call', ar: 'اتصال' },
  'visit.fbAria': {
    en: 'Marieliez Pharmacy on Facebook',
    ar: 'صيدلية ماريليز على فيسبوك',
  },
  'visit.fbLabel': { en: 'Facebook', ar: 'فيسبوك' },
  'visit.deliveryBadge': { en: '24/7 delivery', ar: 'توصيل على مدار الساعة' },
  'visit.delivery': {
    en: '<p class="delivery-note-badge">24/7 delivery</p><p class="delivery-note-copy">Marieliez will always deliver your orders to your doorstep in the quickest time possible and will prioritize your order if you have an urgent case even during traffic, because Marieliez <span class="brand-tag">#treatslikefamily</span>.</p>',
    ar: '<p class="delivery-note-badge">توصيل على مدار الساعة</p><p class="delivery-note-copy">ماريليز هتوصّل طلباتك لباب بيتك في أسرع وقت، وهتدي أولوية لطلبك لو الحالة طارئة حتى وسط الزحمة، لأن ماريليز <span class="brand-tag">#treatslikefamily</span>.</p>',
  },

  'map.navigate': { en: 'Navigate to pharmacy', ar: 'التوجيه للصيدلية' },

  'footer.locations': {
    en: 'Al Golf, Nasr City · Highland Park, New Cairo',
    ar: 'الجولف، مدينة نصر · هايلاند بارك، التجمع',
  },
  'footer.tax': { en: 'Tax ID 239-850-394', ar: 'البطاقة الضريبية ٢٣٩-٨٥٠-٣٩٤' },
  'footer.powered': {
    en: 'powered by love by Cloudastick Systems Salesforce Partner',
    ar: 'بصُنع بحب من Cloudastick Systems، شريك Salesforce',
  },

  'install.title': { en: 'Install Marieliez', ar: 'ثبّت ماريليز' },
  'install.body': {
    en: 'Add to your Home Screen for quick access.',
    ar: 'ضيفها لشاشة الرئيسية عشان توصل بسرعة.',
  },
  'install.dismiss': { en: 'Not now', ar: 'مش دلوقتي' },
  'install.accept': { en: 'Install', ar: 'تثبيت' },

  'cat.medicines': { en: 'Medicines', ar: 'أدوية' },
  'cat.first-aid': { en: 'First Aid', ar: 'إسعافات أولية' },
  'cat.skincare': { en: 'Skincare', ar: 'العناية بالبشرة' },
  'cat.vitamins-supplements': {
    en: 'Vitamins & Supplements',
    ar: 'فيتامينات ومكملات',
  },
  'cat.fitness-diet': { en: 'Fitness & Diet', ar: 'لياقة ورجيم' },
  'cat.equipment-homecare': {
    en: 'Equipment & Homecare',
    ar: 'أجهزة ورعاية منزلية',
  },
  'cat.beauty-cosmetics': { en: 'Beauty & Cosmetics', ar: 'تجميل ومستحضرات' },
  'cat.mother-baby': { en: 'Mother & Baby', ar: 'الأم والطفل' },
  'cat.personal-care': { en: 'Personal Care', ar: 'العناية الشخصية' },
  'cat.optics': { en: 'Optics', ar: 'البصريات' },
  'cat.women-care': { en: 'Women Care', ar: 'العناية النسائية' },
}

/** @type {Lang} */
let currentLang = 'en'

/** @type {Set<() => void>} */
const listeners = new Set()

export function getLang() {
  return currentLang
}

export function t(key, vars = {}) {
  const entry = STRINGS[key]
  let text = entry ? entry[currentLang] || entry.en : key
  for (const [k, v] of Object.entries(vars)) {
    text = text.replaceAll(`{${k}}`, String(v))
  }
  return text
}

export function categoryLabel(slug, fallbackName) {
  const key = `cat.${slug}`
  if (STRINGS[key]) return t(key)
  return fallbackName || slug
}

function applyDocumentLang(lang) {
  const root = document.documentElement
  root.lang = lang
  root.dir = lang === 'ar' ? 'rtl' : 'ltr'
  root.dataset.lang = lang
}

function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n')
    if (!key) return
    el.textContent = t(key)
  })
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html')
    if (!key) return
    el.innerHTML = t(key)
  })
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder')
    if (!key) return
    el.setAttribute('placeholder', t(key))
  })
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria')
    if (!key) return
    el.setAttribute('aria-label', t(key))
  })
  document.querySelectorAll('[data-i18n-alt]').forEach((el) => {
    const key = el.getAttribute('data-i18n-alt')
    if (!key) return
    el.setAttribute('alt', t(key))
  })
  document.querySelectorAll('.brand-sub').forEach((el) => {
    el.hidden = !el.textContent.trim()
  })
  document.querySelectorAll('[data-lang-toggle]').forEach((el) => {
    el.textContent = t('nav.lang')
    el.setAttribute('aria-label', t('nav.langAria'))
  })
}

export function setLang(lang) {
  const next = lang === 'ar' ? 'ar' : 'en'
  if (next === currentLang && document.documentElement.dataset.lang === next) {
    applyStaticI18n()
    listeners.forEach((fn) => fn())
    return
  }
  currentLang = next
  try {
    localStorage.setItem(LANG_KEY, next)
  } catch {
    /* ignore */
  }
  applyDocumentLang(next)
  applyStaticI18n()
  listeners.forEach((fn) => fn())
}

export function onLangChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function initI18n() {
  let saved = 'en'
  try {
    const raw = localStorage.getItem(LANG_KEY)
    if (raw === 'ar' || raw === 'en') saved = raw
  } catch {
    /* ignore */
  }
  currentLang = saved
  applyDocumentLang(saved)
  applyStaticI18n()

  document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setLang(currentLang === 'en' ? 'ar' : 'en')
    })
  })
}

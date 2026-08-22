import { type ReactNode, Suspense, lazy, useState } from "react";
import MotionSystem from "./MotionSystem";

const PharmacyMap = lazy(() => import("./PharmacyMap"));

const WHATSAPP_NUMBER = "201121111605";
const categories = [
  { icon: "Rx", title: "Prescription Medicines", copy: "Your prescribed medication, handled with care and pharmacist guidance.", tone: "blue" },
  { icon: "✦", title: "Vitamins & Supplements", copy: "Everyday wellness, immunity, energy and nutritional support.", tone: "amber" },
  { icon: "♡", title: "Mother & Baby", copy: "Trusted care for pregnancy, newborns, feeding and little ones.", tone: "rose" },
  { icon: "◌", title: "Skin & Beauty", copy: "Dermocosmetics, skincare routines, haircare and personal beauty.", tone: "lilac" },
  { icon: "+", title: "First Aid & Medical Supplies", copy: "Essentials for home care, monitoring, mobility and recovery.", tone: "mint" },
  { icon: "☼", title: "Personal Care", copy: "Daily hygiene, oral care, feminine care and grooming essentials.", tone: "peach" },
  { icon: "●", title: "Chronic Care", copy: "Ongoing support and supplies for diabetes, heart health and more.", tone: "cyan" },
  { icon: "⌁", title: "Fitness & Nutrition", copy: "Protein, healthy nutrition and support for an active lifestyle.", tone: "green" },
];

const Icon = ({ name }: { name: "pin" | "phone" | "mail" | "clock" | "arrow" | "menu" | "close" }) => {
  const paths: Record<string, ReactNode> = {
    pin: <><path d="M12 21s7-5.2 7-12A7 7 0 1 0 5 9c0 6.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></>,
    phone: <path d="M6.6 3.8 9 7.6 7.4 9.2c1.2 2.6 3 4.4 5.6 5.6l1.6-1.6 3.8 2.4-.9 4.1c-7.7.7-13.9-5.5-13.2-13.2l2.3-2.7Z"/>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>, menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>, close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
};

function whatsappLink(category?: string) {
  const message = category ? `Hello Marieliez Pharmacy! I would like to inquire about ${category}.` : "Hello Marieliez Pharmacy! I would like some assistance.";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState(categories[0].title);
  return <main>
    <MotionSystem />
    <header className="nav-wrap">
      <a className="brand" href="#top" aria-label="Marieliez Pharmacy home"><img className="brand-logo" src="/marieliez-logo.jpg" alt="Marieliez Pharmacy" /></a>
      <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation" aria-expanded={menuOpen}><Icon name={menuOpen ? "close" : "menu"} /></button>
      <nav className={menuOpen ? "open" : ""} onClick={() => setMenuOpen(false)}><a href="#about">About</a><a href="#categories">Categories</a><a href="#locations">Locations</a><a href="#contact">Contact</a><a className="nav-cta" href={whatsappLink()} target="_blank" rel="noreferrer">Chat on WhatsApp</a></nav>
    </header>

    <section className="hero" id="top"><div className="hero-copy"><p className="eyebrow">YOUR NEIGHBOURHOOD PHARMACY</p><h1>Care that feels<br/><em>like family.</em></h1><p className="hero-sub">From everyday wellness to expert pharmacist advice, we&apos;re here to help you and your family feel your best.</p><div className="hero-actions"><a className="button primary" href={whatsappLink()} target="_blank" rel="noreferrer">Chat with a pharmacist <Icon name="arrow" /></a><a className="button secondary" href="#locations"><Icon name="pin" /> Find a branch</a></div><div className="trust-row"><span>Licensed pharmacists</span><span>Genuine products</span><span>Personal care</span></div></div>
      <div className="hero-visual" aria-label="Marieliez Pharmacy care illustration"><div className="hero-image-shell motion-layer" data-depth="0.8"><img src="/pharmacist-care.webp" alt="Marieliez pharmacist helping a customer" /></div><div className="sun-orb motion-layer" data-depth="0.25"/><div className="cross-shape motion-layer" data-depth="0.45"><i/><i/></div><div className="care-card one motion-layer" data-depth="1.15"><b>♡</b><span>Family care</span></div><div className="care-card two motion-layer" data-depth="0.95"><b>✦</b><span>Wellness</span></div><div className="pharmacy-badge motion-layer" data-depth="0.65"><img src="/marieliez-logo.jpg" alt="" /><p>Here for your<br/><strong>health, every day.</strong></p></div></div>
    </section>

    <section className="social-section" id="social"><div className="social-heading"><div><p className="eyebrow">FROM OUR PHARMACISTS</p><h2>Helpful advice.<br/><em>Real people.</em></h2></div><p>Meet Dr. Marieliez and discover quick, practical health and wellness tips from the people who care for you every day.</p></div><div className="video-grid"><article className="featured-video"><div className="video-frame"><iframe src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent("https://www.facebook.com/MarieliezPharmacyeg/videos/1224033248340886/")}&show_text=false&width=560`} width="560" height="315" scrolling="no" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowFullScreen title="Helpful tips by Dr. Marieliez" /></div><div><span>MEET DR. MARIELIEZ</span><h3>Helpful tips from the heart of our pharmacy</h3><a href="https://www.facebook.com/MarieliezPharmacyeg/videos/1224033248340886/" target="_blank" rel="noreferrer">Watch on Facebook ↗</a></div></article><article className="featured-video reverse"><div className="video-frame"><iframe src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent("https://www.facebook.com/MarieliezPharmacyeg/videos/295892912732294/")}&show_text=false&width=560`} width="560" height="315" scrolling="no" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowFullScreen title="Who treats you better than Marieliez" /></div><div><span>TREATS LIKE FAMILY</span><h3>Who treats you better than Marieliez?</h3><a href="https://www.facebook.com/MarieliezPharmacyeg/videos/295892912732294/" target="_blank" rel="noreferrer">Watch on Facebook ↗</a></div></article></div></section>

    <section className="about" id="about"><div><p className="eyebrow">ABOUT MARIELIEZ</p><h2>A pharmacy with a<br/><em>human touch.</em></h2></div><div className="about-copy"><p>We believe healthcare starts with listening. At Marieliez Pharmacy, our team combines professional knowledge with genuine care, helping every customer make confident choices for their health.</p><p>Whether you need your daily essentials, advice on a new routine, or help finding the right product, you&apos;ll always be welcomed and cared for.</p><a href="#contact">Get to know us <Icon name="arrow" /></a></div></section>

    <section className="categories" id="categories"><div className="section-heading"><div><p className="eyebrow">WHAT WE OFFER</p><h2>Everything for your<br/><em>everyday wellbeing.</em></h2></div><p>Choose a category and send us a quick inquiry. Our team will help with availability, alternatives and recommendations.</p></div><div className="category-grid">{categories.map(item => <article className={`category-card ${item.tone}`} key={item.title}><div className="category-icon">{item.icon}</div><h3>{item.title}</h3><p>{item.copy}</p><a href={whatsappLink(item.title)} target="_blank" rel="noreferrer">Inquire on WhatsApp <Icon name="arrow" /></a></article>)}</div>
      <div className="quick-inquiry"><div><span className="whatsapp-dot">◔</span><div><strong>Looking for something specific?</strong><p>Tell us the category and we&apos;ll take it from there.</p></div></div><div className="inquiry-control"><label htmlFor="category">Product category</label><select id="category" value={category} onChange={e => setCategory(e.target.value)}>{categories.map(item => <option key={item.title}>{item.title}</option>)}</select></div><a className="button primary" href={whatsappLink(category)} target="_blank" rel="noreferrer">Send inquiry <Icon name="arrow" /></a></div>
    </section>

    <section className="beauty-banner"><div className="beauty-kicker"><span>BEAUTY &amp; DERMO</span><strong>All your favourites are here.</strong><p>Explore the full beauty and professional haircare destination at Marieliez. Ask us for any product, shade or routine.</p><a className="button primary" href={whatsappLink("L'Oréal, La Roche-Posay, YSL Beauty or Kérastase products")} target="_blank" rel="noreferrer">Ask about a beauty product <Icon name="arrow" /></a></div><div className="beauty-visual"><img src="/beauty-editorial.webp" alt="Premium skincare and haircare collection" /><div className="brand-wall"><span>L&apos;ORÉAL</span><span>LA ROCHE-POSAY</span><span>YSL<small>BEAUTY</small></span><span>KÉRASTASE</span></div></div></section>

    <section className="care-promises"><div className="promise emergency"><span className="promise-number">01</span><div><p className="eyebrow">WHEN IT MATTERS</p><h2>Urgent essentials,<br/><em>treated urgently.</em></h2><p>When an important medicine or respiratory product such as an Evohaler is needed, our pharmacists make the search and availability check a priority.</p><a href={whatsappLink("an urgent or emergency medicine, including Evohalers")} target="_blank" rel="noreferrer">Check urgent availability <Icon name="arrow" /></a><small>For life-threatening emergencies, contact emergency services immediately. Prescription medicines are supplied according to applicable requirements.</small></div></div><div className="promise storage"><span className="promise-number">02</span><div><p className="eyebrow">MEDICINE FIRST</p><h2>Safe storage is<br/><em>part of the treatment.</em></h2><p>Medicine integrity comes before convenience. We prioritise appropriate storage conditions, temperature awareness, careful handling and expiry control so products are protected until they reach you.</p><div className="storage-points"><span>Temperature aware</span><span>Expiry controlled</span><span>Carefully handled</span></div></div></div></section>

    <section className="locations-section" id="locations"><div className="location-title"><div><p className="eyebrow">FIND US</p><h2>Two branches.<br/><em>One standard of care.</em></h2></div><p>Tap a branch and watch the map take you there. Zoom, pan or open Google Maps for turn-by-turn directions.</p></div><Suspense fallback={<div className="map-experience" aria-busy="true" />}><PharmacyMap /></Suspense></section>

    <section className="contact" id="contact"><div className="contact-intro"><p className="eyebrow">LET&apos;S TALK</p><h2>How can we<br/><em>help today?</em></h2><p>Our friendly team is just a message, call or visit away.</p></div><div className="contact-links"><a href={whatsappLink()} target="_blank" rel="noreferrer"><span><Icon name="phone" /></span><div><small>WHATSAPP OR CALL</small><strong>+20 11 2111 1605</strong></div><Icon name="arrow" /></a><a href="mailto:info@marieliezpharmacy.com"><span><Icon name="mail" /></span><div><small>EMAIL US</small><strong>info@marieliezpharmacy.com</strong></div><Icon name="arrow" /></a><div className="hours"><span><Icon name="clock" /></span><div><small>OPENING HOURS</small><strong>Contact your nearest branch</strong><p>for today&apos;s working hours</p></div></div></div></section>
    <footer><a className="brand light" href="#top"><img className="brand-logo" src="/marieliez-logo.jpg" alt="Marieliez Pharmacy" /></a><p>Professional care. Personal connection.</p><div><a href="#about">About</a><a href="#categories">Categories</a><a href="#locations">Locations</a><a href="#contact">Contact</a></div><small>© {new Date().getFullYear()} Marieliez Pharmacy. All rights reserved.</small></footer>
  </main>;
}

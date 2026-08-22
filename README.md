# Marieliez Pharmacy Landing Page

Production-ready responsive pharmacy landing page built with React, TypeScript, Vite, Tailwind CSS and Leaflet/OpenStreetMap.

## Included

- Official Marieliez logo and favicon
- Interactive product-category WhatsApp inquiries
- Embedded official Facebook videos
- Animated OpenStreetMap branch experience
- Responsive motion system with reduced-motion accessibility
- Optimized WebP editorial imagery
- SEO metadata and production build configuration

## Requirements

- Node.js 22.13 or later
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by the development server (usually `http://localhost:5173`).

## Production build

```bash
npm install
npm run build
```

The production artifact is written to `dist/`.

## Before deployment

The primary contact settings are centralized near the top of `src/App.tsx`:

```ts
const WHATSAPP_NUMBER = "201121111605";
```

Email, branch addresses, Google Maps links and coordinates are also in `src/App.tsx` and `src/PharmacyMap.tsx`.

## Hosting (Netlify)

Connect the GitHub repository and deploy the `main` branch. The checked-in `netlify.toml` supplies:

- Build command: `npm run build`
- Publish directory: `dist`
- Node.js: 22

After the first successful deployment, attach `marieliezpharmacy.com` in Netlify domain settings.

Do not commit `node_modules` or `dist`.

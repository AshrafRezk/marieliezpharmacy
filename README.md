# Marieliez Pharmacy Landing Page

Production-ready responsive pharmacy landing page built with React, TypeScript, Tailwind CSS, Vinext and Leaflet/OpenStreetMap.

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

Open the local URL printed by the development server.

## Production build

```bash
npm install
npm run build
```

The production artifact is written to `dist/`.

## Before deployment

The primary contact settings are centralized near the top of `app/page.tsx`:

```ts
const WHATSAPP_NUMBER = "201121111605";
```

Email, branch addresses, Google Maps links and coordinates are also in `app/page.tsx` and `app/PharmacyMap.tsx`.

## Hosting

The repository supports both the Sites/Vinext build and Netlify's current Next.js runtime.

For Netlify, connect the GitHub repository and deploy the `main` branch. The checked-in `netlify.toml` supplies the required settings:

- Build command: `npm run build:netlify`
- Publish directory: `.next`
- Node.js: 22

Netlify automatically applies its current Next.js adapter during the build. After the first successful deployment, attach `marieliezpharmacy.com` in Netlify's domain settings.

Do not commit `node_modules`, `dist`, `.sites-runtime` or `.wrangler`.

# 100 in 1 Tool - Free Online Tools

100 Free Online Tools in One Place. Image edits, PDFs, Generators, Minifiers, and Calculators working locally in your browser.

## Deployment & Build Architecture
This project is built using a custom vanilla JavaScript static site generator. We avoided bloated frameworks per the requirements.

### How it works:
1. `tools.json` contains the metadata for all tools.
2. `generator.js` is the canonical page template for all generated tool pages and outputs them into `tools/`.
3. Auto-generates `sitemap.xml` and `robots.txt`.

### Tool UI Template Contract
The current shared UI is the template for future tool generation. New tools should be added as metadata in `tools.json` or `scripts/create-tools.js`, then implemented in `assets/js/tools-logic.js` and styled through `assets/css/style.css`.

Do not create one-off page wrappers, upload panels, or old-style per-tool layouts in generated HTML. Future generated tools should use the shared `tool-page`, `card`, `tool-ui`, `drag-drop-zone`, file validation, PDF page-count, and action-row patterns already provided by the current assets.

### Build Instructions:
1. Ensure Node.js is installed.
2. Run `npm install`
3. Run `npm run build`
4. The site is now completely statically generated. You can serve the root directory on **Netlify**, **GitHub Pages**, **Vercel**, or **Hostinger**!

### Development Server:
Run `npm run dev` to start a local static server on `localhost:3000`.

## Features
- **Individual Tool Pages** generated automatically with SEO-friendly meta tags.
- **Vanilla JavaScript**: All processing runs securely in the browser. 
- **Dark Mode**: Persisted local state via `localStorage`.
- **Search Functionality**: Instant tool discovery.
- **Categories**: Image, PDF, Text, SEO, QR, Dev, Calc.
- **Installable PWA**: Android/desktop native install prompts, iOS Add to Home Screen guidance, an offline app shell, cached tool pages and local tool execution where supported.

### PWA
See `docs/pwa.md` for phone installation, offline behavior and deployment requirements. Run `npx playwright install --with-deps chromium` once, then `npm run test:pwa` for service-worker and browser install/offline tests. Cloudflare Pages deployment instructions are in `docs/cloudflare-pages.md`.

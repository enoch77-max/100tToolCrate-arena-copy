# 100ToolCrate PWA

The site is an installable Progressive Web App on Cloudflare Pages and the VPS/Node deployment.

## Install on a phone

- **Android/Chrome/Edge:** after a short visit or first interaction, the install banner appears. Tap **Install** when the browser offers a native prompt. If that prompt is unavailable, choose **How to install** and use browser menu → **Install app** or **Add to Home screen**.
- **iPhone/iPad:** tap **How to install** in the banner or the footer **Install app** link. Use Safari's **Share → Add to Home Screen**, then confirm **Add**. If the action is missing in another browser, open the site in Safari.
- **Desktop:** use the browser's install icon or the footer **Install app** link. Chrome/Edge can show the native install prompt when the PWA criteria are met.

The banner respects a 14-day dismissal cooldown and is suppressed in standalone/already-installed mode. The instruction sheet closes with Escape, backdrop, or **Got it**, and the banner no longer obscures it.

## Offline behavior

`sw.js` precaches the app shell, offline page, shared tool engine, manifest, icons and several core tools. Other pages are cached after a successful visit.

- Navigation requests use **network first**, then clean-URL and `.html` cache fallbacks, then `/offline.html`.
- Same-origin static files use **cache first**, with network fallback.
- Tool libraries/fonts from a small explicit CDN allowlist are cached when the browser permits their responses to be stored.
- `/api/*`, MCP, ads, analytics and unrelated third-party requests are **never cached** by this worker.
- Dynamic runtime cache is bounded to 90 entries; the shell cache is not evicted by that limit.

Offline support is not a promise that every third-party library, PDF feature or API will work without a connection. Browser-local tools can work after their page and required libraries are cached. REST/MCP execution, Open Graph fetching, form submission and new uncached pages require connectivity.

## Deployment requirements

- HTTPS is required outside localhost.
- `/manifest.json` is served as `application/manifest+json`.
- `/sw.js` is served at the origin root as JavaScript with `Service-Worker-Allowed: /` and `Cache-Control: no-cache, no-store, must-revalidate`.
- Manifest icons include any/maskable/monochrome PNGs at 192×192 and 512×512, plus narrow/wide screenshots.
- The Cloudflare build copies `sw.js` to `dist/` and preserves `pwa.js` registration; it no longer unregisters workers or clears their caches.

## Test commands

```bash
npm run build

# Manifest, icons, page heads and HTTP headers (start the server first)
NODE_ENV=production HOST=127.0.0.1 PORT=3002 DATABASE_PATH=:memory: node server.js
node scripts/qa-pwa.mjs http://127.0.0.1:3002

# Service-worker unit tests plus browser install/offline suite
npx playwright install --with-deps chromium
npm run test:pwa

# Optional: run the same browser suite against Cloudflare Pages runtime
npx wrangler pages dev dist --port 8788
node scripts/qa-pwa-browser.mjs http://127.0.0.1:8788
```

Browser screenshots and results are written to `scratch/pwa-qa/`.

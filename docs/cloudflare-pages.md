# Cloudflare Pages Deployment

This project deploys to Cloudflare Pages as a static multi-page site plus Pages Functions. The VPS/Node backend remains available, but Pages does not run Express or native SQLite.

## GitHub-connected deployment

1. Push the repository to GitHub.
2. In Cloudflare Dashboard, go to **Workers & Pages → Create → Pages → Connect to Git**.
3. Select the repository and branch, usually `main`.
4. Use these build settings:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `npm ci --omit=optional && npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |
| Node version | `20` or newer |

Set `NODE_VERSION=20` in Pages environment variables if the dashboard does not already provide Node 20+.

Every push to the production branch triggers a new Cloudflare build. The build regenerates all pages, inlines assets for reliable rendering, prepares Pages Functions, and rewrites `sitemap.xml` from the actual deployable HTML. You do not need to commit sitemap changes manually.

## What the build produces

- `dist/` — static pages, assets, discovery documents, `_headers`, `_redirects`, `_routes.json`, and `sitemap.xml`.
- `functions/` — Cloudflare Pages Functions for `/api/*`, `/healthz`, and `/readyz`.
- `functions/_lib/tool-execution.js` and `functions/_lib/site-data.js` — generated during build from the shared execution registry and tool catalog.
- `wrangler.toml` — Pages output directory and `nodejs_compat` compatibility flag.

The sitemap excludes `404.html`, `offline.html`, and pages marked `noindex`, including the legacy comparison pages. It includes tool, workflow, blog, service, agent, and policy pages that are actually present in `dist`.

## Custom domain

Add `100toolcrate.com` and/or `www.100toolcrate.com` under **Pages project → Custom domains**. Cloudflare provisions the certificate and DNS when the domain is on Cloudflare.

The default canonical origin is `https://100toolcrate.com`. If you deploy under a different permanent domain, set this Pages build environment variable:

```text
PUBLIC_SITE_URL=https://your-domain.com
```

The build will rewrite canonical URLs, Open Graph URLs, sitemap, robots, feed, and discovery documents to that origin. Do not set this to a temporary `*.pages.dev` preview URL unless you intentionally want preview URLs indexed.

## Optional durable usage counters

Pages Functions can run without a database. In that mode:

- Static pages and agent execution work.
- `/api/top-tools` returns the seeded legacy popularity list.
- `/api/track` returns HTTP 503 because there is no durable counter storage.

To persist counters with D1:

```bash
npx wrangler d1 create 100toolcrate-usage
npx wrangler d1 execute 100toolcrate-usage --file=migrations/d1/0001_tool_usage.sql
```

Then bind the database as `DB` in **Pages project → Settings → Functions → D1 database bindings**, or uncomment the `[[d1_databases]]` block in `wrangler.toml` and set the real `database_id`. Keep dashboard and Wrangler bindings consistent. Redeploy after binding.

For local development with D1:

```bash
npm run build
npx wrangler pages dev dist --d1 DB=100toolcrate-usage
```

## Agent API on Pages

The following endpoints are served by Pages Functions:

- `GET /api/status`
- `GET /api/top-tools`
- `POST /api/track`
- `GET /api/v1/tools`
- `GET /api/v1/tools/{toolId}`
- `POST /api/v1/tools/{toolId}/execute`
- `POST /api/mcp`
- `GET /api/og-preview?url=https://...`
- `GET /healthz`
- `GET /readyz`

`/api/openapi.json` is a static asset generated from the same execution registry. Discovery documents are written to `dist/.well-known/`.

Execution inputs are transient and are not persisted by the execution endpoint. Do not send secrets or unnecessary personal data. The Open Graph previewer fetches the submitted public URL from Cloudflare’s edge, blocks private-network targets, limits redirects/time/size, and returns only parsed metadata.

## Advertising and forms

- AdSense loads only on the production domain after the visitor chooses **Allow ads**. Preview deployments do not load Google advertising.
- Service, sponsorship, and contact forms submit to FormSubmit. Ensure the destination mailbox is verified in FormSubmit before relying on inquiries.
- Sponsorship placements are controlled by `content/sponsors.json`; empty configuration renders no fake sponsor.

## GitHub validation workflow

`.github/workflows/ci.yml` runs the build, SEO audit, claims audit, and backend/Pages function tests on pushes and pull requests. It does not deploy, so it will not create duplicate deployments alongside Cloudflare’s Git integration.

If you prefer GitHub Actions deployment instead of Cloudflare Git integration, disable Cloudflare automatic builds first, then use `cloudflare/wrangler-action` with `pages deploy dist --project-name=YOUR_PROJECT`. Do not enable both deployment paths for the same branch.

## Troubleshooting

| Symptom | Check |
|---|---|
| Build succeeds but site is blank/unstyled | Confirm output directory is `dist`, not repository root. |
| `/tools/slug` 404s | Confirm the corresponding `dist/tools/slug.html` exists and `_redirects` is in `dist`. |
| API returns 404 | Confirm `functions/` is at repository root and `_routes.json` includes `/api/*`. |
| `node:crypto` or Buffer error | Confirm `compatibility_flags = ["nodejs_compat"]` is active in Pages Functions settings. |
| Counters return 503 | Bind D1 as `DB` and apply `migrations/d1/0001_tool_usage.sql`. |
| Sitemap missing new pages | Run `npm run build`; sitemap is generated from actual `dist` HTML, not a manual list. |
| Old content after deploy | Check the latest Pages deployment commit, hard refresh, and confirm service worker cache is not pinning an old shell. |
| Preview origin blocked by MCP | MCP validates Origin against the request origin or `PUBLIC_ORIGIN`. Do not set a production-only runtime origin on previews unless intended. |

# 100ToolCrate Growth Operations

This runbook covers external account and deployment actions. The build does not claim that these steps have happened automatically.

## 1. Build and validate

```bash
npm install
npm run build
node scripts/seo-audit.mjs
node scripts/submit-indexnow.mjs
```

The last command is a dry run. A successful build creates `dist/` for static hosting and the generated root pages for the existing Node/Vercel deployment.

## 2. Deploy before requesting indexing

Deploy the generated pages, `sitemap.xml`, `feed.xml`, `ads.txt`, assets, and the IndexNow key file named in `indexnow.json`. If using `server.js`, its routes serve these files directly. Confirm these production URLs return 200:

- `https://100toolcrate.com/workflows`
- `https://100toolcrate.com/sitemap.xml`
- `https://100toolcrate.com/feed.xml`
- `https://100toolcrate.com/advertise`
- `https://100toolcrate.com/{key}.txt` using the key in `indexnow.json`

## 3. Search Console and Bing

1. Verify the `100toolcrate.com` property in Google Search Console. Verification requires the owner's DNS or Google account and is intentionally not automated here.
2. Submit `https://100toolcrate.com/sitemap.xml`.
3. Inspect the homepage, workflow hub, and each new workflow. Request indexing only after the live canonical URL returns 200 and renders its content.
4. Keep Bing Webmaster Tools connected and submit the same sitemap. The existing Bing verification meta is preserved.
5. After the IndexNow key file is live, run:

```bash
node scripts/submit-indexnow.mjs --live
```

The script verifies the deployed key before submitting. HTTP 200/202 means the notification was accepted, not that indexing or ranking is guaranteed.

## 4. Advertising

The publisher ID is read from `ads.txt` and currently resolves to `ca-pub-5986395187107423`. `ADSENSE_CLIENT_ID` can override it at build time.

- The Google script loads only on `100toolcrate.com` and `www.100toolcrate.com`.
- Preview hosts never load it.
- It loads only after the visitor chooses **Allow ads**. **Essential only** stores the choice without loading Google.
- AdSense site approval and Auto ads must be enabled in the publisher account. Code alone cannot approve an account or create earnings.
- The production CSP already allows the required Google script and frame origins.
- Do not click your own ads or buy invalid traffic. Use AdSense reports for actual revenue, not estimates shown on the site.

## 5. Direct sponsorships

`/advertise` contains a real FormSubmit inquiry form. It does not take payment or pretend an inquiry is a completed sale.

Activate an agreed sponsor by adding an object to `content/sponsors.json` and rebuilding:

```json
[
  {
    "name": "Example sponsor",
    "url": "https://sponsor.example/landing",
    "description": "A concise, reviewed sponsor message.",
    "placement": "workflow:prepare-pdf-for-email",
    "startsOn": "2026-12-01",
    "endsOn": "2026-12-30"
  }
]
```

Use `placement: "hub"` for the workflow directory. Only HTTPS URLs are accepted. Active entries render with a visible **Sponsored** label and `rel="sponsored noopener noreferrer"`; expired entries disappear on the next build. With an empty array, no sponsor placeholder or fake partner appears.

## 6. Editorial workflow

- Add or revise workflows in `content/workflows.json`. Every referenced tool ID and related workflow slug is validated at build time.
- Tool pages use the individually authored `content` and `faqs` in `tools.json`; keep those entries specific to the real tool behavior.
- Blog dates and RSS entries come from Markdown front matter in `content/posts/`.
- Run the SEO audit after every content deployment. It checks broken internal references, duplicate metadata, JSON-LD, canonicals, and sitemap coverage.
- Use Search Console query/page data and privacy-friendly Cloudflare analytics to choose the next revision. Do not invent traffic figures in sponsor materials.

## 7. What still requires time and external evidence

Search engines decide crawling, indexing, and ranking. Sponsors decide whether to buy. AdSense decides approval and serving. The code provides the technical and editorial surface, but traffic and revenue must be measured from the live accounts rather than promised.

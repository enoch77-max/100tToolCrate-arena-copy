import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import frontMatter from 'front-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const postsDir = path.resolve(__dirname, '../content/posts');
const outDir = path.resolve(__dirname, '../blog');
const templatePath = path.resolve(__dirname, '../content/templates/post.html');
const indexTemplatePath = path.resolve(__dirname, '../content/templates/index.html');
const ASSET_VERSION = '2026-11-10-v88-agent-growth';
const SITE_LAST_UPDATED = '2026-11-10';

// Ensure directories exist
if (!fs.existsSync(postsDir)) fs.mkdirSync(postsDir, { recursive: true });
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Read templates
const postTemplate = fs.readFileSync(templatePath, 'utf8');
const indexTemplate = fs.readFileSync(indexTemplatePath, 'utf8');

const posts = [];

// HTML escape utility — front matter is author-controlled but still interpolated
// into HTML/attribute contexts, so it must be escaped.
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Attribute-safe URL: allow only characters that are legal and harmless in CSS/HTML URLs.
function sanitizeUrl(url) {
  const u = String(url ?? '').trim();
  if (!u) return '';
  return /^[a-zA-Z0-9\-._~:/?#[\]@!$&*+,;=%]+$/.test(u) ? u : '';
}

function getCategoryChipClass(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('dev') || c.includes('code') || c.includes('api')) return 'chip-cyan';
  if (c.includes('design') || c.includes('ui') || c.includes('pdf')) return 'chip-violet';
  if (c.includes('tutorial') || c.includes('guide') || c.includes('text')) return 'chip-rose';
  return 'chip-emerald'; // SEO, Performance, default
}

function getCategoryGradient(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('dev') || c.includes('code')) return 'linear-gradient(135deg, #0f172a 0%, #06b6d4 100%)';
  if (c.includes('design') || c.includes('pdf')) return 'linear-gradient(135deg, #0f172a 0%, #8b5cf6 100%)';
  if (c.includes('tutorial') || c.includes('text')) return 'linear-gradient(135deg, #0f172a 0%, #fb7185 100%)';
  return 'linear-gradient(135deg, #0f172a 0%, #10b981 100%)';
}

fs.readdirSync(postsDir).forEach(file => {
  if (file.endsWith('.md')) {
    const filePath = path.join(postsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Parse front matter
    const parsed = frontMatter(content);
    const htmlContent = marked.parse(parsed.body);

    const slug = file.replace('.md', '');
    const outPath = path.join(outDir, `${slug}.html`);
    const date = parsed.attributes.date || SITE_LAST_UPDATED;
    const category = parsed.attributes.category || 'SEO & Web';
    const title = parsed.attributes.title || slug;
    const description = parsed.attributes.description || '';
    const postUrl = `https://100toolcrate.com/blog/${slug}`;

    // Extract first image if present
    const imageMatch = content.match(/!\[.*?\]\((.*?)\)/);
    const image = parsed.attributes.image || (imageMatch ? imageMatch[1] : null);

    // Build the post HTML (all front matter values are escaped)
    let finalHtml = postTemplate
      .replace(/{{TITLE}}/g, escapeHtml(title))
      .replace(/{{DESCRIPTION}}/g, escapeHtml(description))
      .replace(/{{AUTHOR}}/g, escapeHtml(parsed.attributes.author || 'Max'))
      .replace(/{{DATE}}/g, escapeHtml(String(date)))
      .replace(/{{CONTENT}}/g, htmlContent)
      .replace(/{{URL}}/g, escapeHtml(postUrl))
      .replace(/2026-07-22-v73-blog-redesign|2026-11-03-v79-qa-overhaul/g, ASSET_VERSION);

    const articleSchema = {
      '@context': 'https://schema.org', '@type': 'Article', headline: title,
      description, datePublished: String(date), dateModified: String(date),
      author: { '@type': 'Person', name: parsed.attributes.author || 'Max' },
      publisher: { '@type': 'Organization', name: '100ToolCrate', url: 'https://100toolcrate.com/' },
      mainEntityOfPage: postUrl
    };
    if (image) articleSchema.image = new URL(image, 'https://100toolcrate.com/').href;
    const articleHead = `<meta property="article:published_time" content="${escapeHtml(String(date))}">\n<script type="application/ld+json">${JSON.stringify(articleSchema).replace(/</g, '\\u003c')}</script>`;
    finalHtml = finalHtml.replace(/<\/head>/i, `${articleHead}\n</head>`);

    fs.writeFileSync(outPath, finalHtml);
    console.log(`Generated: blog/${slug}.html`);

    posts.push({
      title,
      description,
      slug,
      date: String(date),
      category,
      author: parsed.attributes.author || 'Max',
      image
    });
  }
});

// Sort posts by date descending
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

// A real RSS feed gives feed readers and discovery services a canonical update
// source. Dates come from post front matter, never from an artificial build time.
function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
const latestPostDate = posts.length && !Number.isNaN(Date.parse(posts[0].date))
  ? new Date(posts[0].date).toUTCString()
  : new Date(`${SITE_LAST_UPDATED}T00:00:00Z`).toUTCString();
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>100ToolCrate Blog</title>
<link>https://100toolcrate.com/blog</link>
<description>Practical guides for private, browser-based PDF, image, developer and SEO workflows.</description>
<language>en</language><lastBuildDate>${latestPostDate}</lastBuildDate>
<atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="https://100toolcrate.com/feed.xml" rel="self" type="application/rss+xml"/>
${posts.map(post => {
  const url = `https://100toolcrate.com/blog/${post.slug}`;
  const date = Number.isNaN(Date.parse(post.date)) ? new Date(`${SITE_LAST_UPDATED}T00:00:00Z`) : new Date(post.date);
  return `<item><title>${escapeXml(post.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${date.toUTCString()}</pubDate><description>${escapeXml(post.description)}</description><category>${escapeXml(post.category)}</category></item>`;
}).join('\n')}
</channel></rss>`;
fs.writeFileSync(path.resolve(__dirname, '../feed.xml'), feed);
console.log(`Generated: feed.xml (${posts.length} posts)`);

// Build Featured Hero (Most Recent Post)
let featuredHeroHtml = '';
if (posts.length > 0) {
  const heroPost = posts[0];
  const chipClass = getCategoryChipClass(heroPost.category);
  const safeImage = sanitizeUrl(heroPost.image);
  const bgStyle = safeImage
    ? `background-image: url('${safeImage}');`
    : `background: ${getCategoryGradient(heroPost.category)};`;

  featuredHeroHtml = `
    <a href="/blog/${escapeHtml(heroPost.slug)}" class="blog-featured-hero">
      <div class="blog-hero-image-wrap">
        <div class="blog-hero-image" style="${bgStyle}"></div>
        <div class="blog-hero-overlay"></div>
      </div>
      <div class="blog-hero-content">
        <div class="blog-chip-row">
          <span class="blog-chip ${chipClass}">FEATURED</span>
          <span class="blog-date-text">${escapeHtml(heroPost.date)}</span>
        </div>
        <h1 class="blog-hero-title">${escapeHtml(heroPost.title)}</h1>
        <p class="blog-hero-excerpt">${escapeHtml(heroPost.description)}</p>
        <span class="blog-hero-link">
          Read Article <span class="material-symbols-outlined" style="font-size: 18px;">arrow_forward</span>
        </span>
      </div>
    </a>
  `;
}

// Build Unique Categories Filter Pills
const categoriesSet = new Set(['all']);
posts.forEach(p => categoriesSet.add(p.category));

let categoryPillsHtml = '';
categoriesSet.forEach(cat => {
  const label = cat === 'all' ? 'All Posts' : cat;
  const activeClass = cat === 'all' ? 'active' : '';
  categoryPillsHtml += `
    <button class="blog-filter-btn ${activeClass}" data-category="${escapeHtml(cat)}">${escapeHtml(label)}</button>
  `;
});

// Build 3-column Grid for Remaining Posts (or all posts)
let postsGridHtml = '';
const gridPosts = posts.length > 1 ? posts.slice(1) : posts;

gridPosts.forEach(post => {
  const chipClass = getCategoryChipClass(post.category);
  const safeImage = sanitizeUrl(post.image);
  const bgStyle = safeImage
    ? `background-image: url('${safeImage}');`
    : `background: ${getCategoryGradient(post.category)};`;

  postsGridHtml += `
    <a href="/blog/${escapeHtml(post.slug)}" class="blog-card-item" data-category="${escapeHtml(post.category)}">
      <div class="blog-card-thumb-wrap">
        <div class="blog-card-thumb" style="${bgStyle}"></div>
      </div>
      <div class="blog-card-body">
        <div class="blog-card-top-row">
          <span class="blog-chip ${chipClass}">${escapeHtml(post.category)}</span>
          <span class="blog-date-text">${escapeHtml(post.date)}</span>
        </div>
        <h3 class="blog-card-item-title">${escapeHtml(post.title)}</h3>
        <p class="blog-card-item-excerpt">${escapeHtml(post.description)}</p>
        <span class="blog-card-read-link">
          Read More <span class="material-symbols-outlined" style="font-size: 16px; margin-left: 4px;">north_east</span>
        </span>
      </div>
    </a>
  `;
});

let finalIndexHtml = indexTemplate
  .replace(/{{FEATURED_POST_HERO}}/g, featuredHeroHtml)
  .replace(/{{CATEGORY_PILLS}}/g, categoryPillsHtml)
  .replace(/{{POSTS_LIST}}/g, postsGridHtml || '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No articles published yet.</p>')
  .replace(/2026-07-22-v73-blog-redesign|2026-11-03-v79-qa-overhaul/g, ASSET_VERSION);

fs.writeFileSync(path.join(outDir, 'index.html'), finalIndexHtml);
console.log('Generated: blog/index.html');
// Note: sitemap.xml is generated exclusively by generator.js (single source of truth).

// Final build steps: synchronize acquisition/monetization metadata, emit a
// preview-safe self-contained dist/ bundle, then prepare Cloudflare Pages
// routing, discovery documents and an automatically regenerated sitemap.
await import('./growth-build.mjs');
await import('./inline-assets.mjs');
await import('./cloudflare-pages.mjs');

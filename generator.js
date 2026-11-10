import fs from 'fs';
import path from 'path';
import { cleanEditorialText } from './scripts/editorial-standards.mjs';

// Load tools data and apply specific implementation-accurate overrides before
// normalizing legacy marketing claims.
const editorialOverrides = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', 'editorial-overrides.json'), 'utf8'));
const toolLimitations = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', 'tool-limitations.json'), 'utf8'));
const rawToolsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tools.json'), 'utf8'));
const toolsData = rawToolsData.map(tool => {
  const override = editorialOverrides[tool.id] || {};
  const merged = { ...tool, ...override };
  for (const key of ['title', 'desc', 'seoTitle', 'seoDesc', 'content']) merged[key] = cleanEditorialText(merged[key]);
  if (override.content && !override.faqs) {
    merged.faqs = [{ q: 'What should I check before using the output?', a: toolLimitations[tool.id] || 'Review the output against your source and intended use; browser support and practical file limits vary.' }];
  }
  merged.faqs = (merged.faqs || []).map(faq => ({ q: cleanEditorialText(faq.q), a: cleanEditorialText(faq.a) }));
  return merged;
});
const workflowsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', 'workflows.json'), 'utf8'));
const servicesData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', 'services.json'), 'utf8'));
const toolStrategy = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', 'tool-strategy.json'), 'utf8'));
const agentToolIds = new Set(['word-counter','character-counter','case-converter','slug-generator','url-encoder','base64-encoder','json-formatter','json-validator','json-minifier','json-to-csv','hash-generator','uuid-generator','unix-timestamp-converter','date-diff','percentage-calculator','discount-calculator','profit-margin','read-time-calculator']);
const toolById = new Map(toolsData.map(tool => [tool.id, tool]));
const workflowBySlug = new Map(workflowsData.map(workflow => [workflow.slug, workflow]));
const sponsorsPath = path.join(process.cwd(), 'content', 'sponsors.json');
const sponsorsData = fs.existsSync(sponsorsPath) ? JSON.parse(fs.readFileSync(sponsorsPath, 'utf8')) : [];

// Fail the build rather than publishing a workflow with a dead tool or relation.
workflowsData.forEach(workflow => {
  workflow.steps.forEach(step => {
    if (!toolById.has(step.tool)) throw new Error(`Workflow ${workflow.slug} references unknown tool: ${step.tool}`);
  });
  (workflow.related || []).forEach(slug => {
    if (!workflowBySlug.has(slug)) throw new Error(`Workflow ${workflow.slug} references unknown workflow: ${slug}`);
  });
});

// Interleave tools across categories so "All Tools" in the Utility Grid displays a vibrant mix of category colors
function getMixedToolsData(data) {
  const categories = {};
  data.forEach(t => {
    const cat = t.cat || 'Other';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(t);
  });

  const catKeys = Object.keys(categories);
  const mixed = [];
  let maxLen = 0;
  catKeys.forEach(k => {
    if (categories[k].length > maxLen) maxLen = categories[k].length;
  });

  for (let i = 0; i < maxLen; i++) {
    for (const key of catKeys) {
      if (i < categories[key].length) {
        mixed.push(categories[key][i]);
      }
    }
  }
  return mixed;
}

const mixedToolsData = getMixedToolsData(toolsData);
const homepageTools = toolStrategy.homepage.map(id => {
  const tool = toolById.get(id);
  if (!tool) throw new Error(`Homepage strategy references unknown tool: ${id}`);
  return tool;
});
const recordedStats = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'tool-stats.json'), 'utf8'));
const popularTools = toolsData.slice().sort((a, b) => (recordedStats[b.id] || 0) - (recordedStats[a.id] || 0) || a.title.localeCompare(b.title)).slice(0, 4);
// Fixed date reflecting when site content last changed; used for sitemap lastmod
// so builds don't churn every lastmod to today's date.
const SITE_LAST_UPDATED = '2026-11-10';
const ASSET_VERSION = '2026-11-10-v88-agent-growth';
const TOOL_UI_TEMPLATE_VERSION = 'tool-ui-2026-11-10-trending';

// Single source of truth for category metadata: colors, filter slugs and labels.
// Sidebar counts, dropdown links and filter pills are all generated from this.
const CATEGORY_META = [
  { cat: 'Image', label: 'Image Tools', color: '#60A5FA', filter: 'image' },
  { cat: 'Dev', label: 'Dev Tools', color: '#06B6D4', filter: 'dev' },
  { cat: 'PDF', label: 'PDF Utilities', color: '#FB7185', filter: 'pdf' },
  { cat: 'Text', label: 'Text Tools', color: '#EAB308', filter: 'text' },
  { cat: 'Calc', label: 'Calculators', color: '#FBBF24', filter: 'calc' },
  { cat: 'Productivity', label: 'Productivity', color: '#FB923C', filter: 'productivity' },
  { cat: 'QR', label: 'QR Tools', color: '#818CF8', filter: 'qr' },
  { cat: 'SEO', label: 'SEO Tools', color: '#34D399', filter: 'seo' },
  { cat: 'Personality', label: 'Personality Tests', color: '#F472B6', filter: 'personality' },
];
const CATEGORY_COUNT = {};
for (const m of CATEGORY_META) CATEGORY_COUNT[m.cat] = toolsData.filter(t => t.cat === m.cat).length;
const TOTAL_TOOL_COUNT = toolsData.length;
const CATEGORY_BY_NAME = Object.fromEntries(CATEGORY_META.map((m) => [m.cat, m]));

// Short, category-aware tips shown in the tool page sidebar.
const CATEGORY_TIPS = {
  Image: [
    'Use PNG for transparency, JPG for photos and WebP for the smallest web files.',
    'Crop and resize first, then compress the final export and inspect its quality.',
    'Check the output preview before downloading to confirm quality.'
  ],
  PDF: [
    'Everything runs on your device - large PDFs can take a few seconds.',
    'Merge or split first, then compress the final document.',
    'Keep the original file until you have checked the downloaded result.'
  ],
  Text: [
    'Paste directly into the editor - counts update as you type.',
    'Use copy or download to move the result into your own workflow.',
    'Clear the editor between unrelated documents to avoid mixing data.'
  ],
  Dev: [
    'Use the copy button to move formatted output straight into your editor.',
    'Validation errors point to the exact position in your input.',
    'All formatting and checks happen locally - nothing is uploaded.'
  ],
  Calc: [
    'Results recalculate instantly as you change any value.',
    'Use the reset action to start a fresh calculation.',
    'Check the units and currency before relying on a result.'
  ],
  Productivity: [
    'Everything runs in this tab - no account, timer server or uploads.',
    'Keep this tab open while a timer or typing test is running.',
    'Notes and settings that use browser storage stay on this device.'
  ],
  QR: [
    'Test the generated QR code with your phone camera before printing.',
    'Keep good contrast between the code and background for reliable scans.',
    'Shorter links create simpler, easier-to-scan codes.'
  ],
  SEO: [
    'Aim for a unique title and description on every page.',
    'Preview how search and social platforms will display your content.',
    'Use the generated markup as a starting point, then refine the copy.'
  ],
  Personality: [
    'Answer honestly and quickly - your first instinct is usually the most accurate.',
    'There are no right or wrong answers, only useful patterns.'
  ]
};
const DEFAULT_TIPS = [
  'Everything runs locally in your browser - nothing is uploaded.',
  'Use the reset action to start over at any time.',
  'Results are ready instantly, with copy and download options where relevant.'
];

const categoryPillsHtml = [
  '<button class="filter-btn category-btn active" data-filter="all">All Tools</button>',
  ...CATEGORY_META.map(m => `<button class="filter-btn category-btn" data-filter="${m.filter}">${escapeHtml(m.label)}</button>`)
].join('\n        ');

const dropdownLinksHtml = CATEGORY_META
  .map(m => `<a href="/tools?cat=${m.filter}">${escapeHtml(m.label)}</a>`)
  .join('\n          ');

const sidebarCategoryLinksHtml = [
  `<a href="/tools" class="sidebar-sublink">
        <span style="width:8px;height:8px;border-radius:50%;background:#F8FAFC;flex-shrink:0;"></span>
        All Tools
        <span style="margin-left:auto;font-size:0.78rem;color:var(--text-muted);">${TOTAL_TOOL_COUNT}</span>
      </a>`,
  ...CATEGORY_META.map(m => `<a href="/tools?cat=${m.filter}" class="sidebar-sublink">
        <span style="width:8px;height:8px;border-radius:50%;background:${m.color};flex-shrink:0;"></span>
        ${escapeHtml(m.label)}
        <span style="margin-left:auto;font-size:0.78rem;color:var(--text-muted);">${CATEGORY_COUNT[m.cat]}</span>
      </a>`)
].join('\n      ');
// Use the publisher ID already declared in ads.txt unless deployment overrides it.
// The external Google script itself is loaded only after consent on production.
const adsTxt = fs.existsSync(path.join(process.cwd(), 'ads.txt'))
  ? fs.readFileSync(path.join(process.cwd(), 'ads.txt'), 'utf8')
  : '';
const declaredPublisher = adsTxt.match(/google\.com,\s*(pub-\d+)/i);
const ADSENSE_CLIENT_ID = process.env.ADSENSE_CLIENT_ID || (declaredPublisher ? `ca-${declaredPublisher[1]}` : '');
const adsenseScript = ADSENSE_CLIENT_ID
  ? `<script>window.TC_ADSENSE_CLIENT=${JSON.stringify(ADSENSE_CLIENT_ID)};</script>\n<script src="/assets/js/monetization.js?v=${ASSET_VERSION}" defer></script>`
  : '';

// HTML escape utility to prevent XSS
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const TOOL_ICON_MAP = {
  // Image Tools (Purple)
  'image-compressor': 'compress',
  'image-resizer': 'aspect_ratio',
  'jpg-to-png': 'transform',
  'png-to-jpg': 'flip',
  'image-to-webp': 'auto_fix_high',
  'webp-to-jpg': 'swap_horiz',
  'image-cropper': 'crop',
  'profile-picture-maker': 'account_box',
  'passport-photo-maker': 'badge',
  'gradient-generator-img': 'gradient',
  'image-flip': 'flip_camera_android',
  'image-watermark': 'branding_watermark',
  'remove-image-metadata': 'layers_clear',
  'image-metadata-viewer': 'info',
  'blur-face': 'blur_on',
  'pixelate-image': 'grid_on',
  'color-picker-image': 'colorize',
  'image-palette': 'palette',
  'grayscale-image': 'filter_b_and_w',
  'bg-color-changer': 'format_color_fill',
  'image-to-url': 'add_to_photos',
  'image-to-base64': 'raw_on',
  'color-palette-generator': 'palette',

  // PDF Tools (Rose)
  'pdf-merger': 'merge_type',
  'pdf-splitter': 'call_split',
  'pdf-compressor': 'picture_in_picture',
  'images-to-pdf': 'collections',
  'text-to-pdf': 'article',
  'jpg-to-pdf': 'photo_library',
  'pdf-to-images': 'perm_media',
  'pdf-rotator': 'rotate_right',
  'pdf-reorder': 'reorder',
  'pdf-extractor': 'output',
  'pdf-counter': 'format_list_numbered',
  'pdf-metadata-viewer': 'find_in_page',
  'pdf-metadata-remover': 'cleaning_services',
  'add-page-numbers': 'numbers',
  'pdf-lock': 'lock',
  'pdf-text-extractor': 'description',
  'pdf-form-filler': 'edit_note',
  'pdf-signature': 'draw',
  'pdf-watermark': 'branding_watermark',
  'pdf-to-zip': 'folder_zip',

  // Text Tools (Yellow)
  'paragraph-counter': 'segment',
  'word-counter': 'short_text',
  'character-counter': 'spellcheck',
  'sentence-counter': 'notes',
  'case-converter': 'text_fields',
  'remove-extra-spaces': 'space_bar',
  'remove-duplicate-lines': 'filter_list',
  'sort-lines': 'sort_by_alpha',
  'reverse-text': 'swap_horizontal_circle',
  'find-replace-text': 'find_replace',
  'text-diff': 'difference',
  'markdown-previewer': 'markdown',
  'html-entity-encoder': 'code_off',
  'url-encoder': 'link_off',
  'base64-encoder': 'password',
  'slug-generator': 'link',
  'read-time-calculator': 'timer',
  'lorem-ipsum': 'format_quote',
  'readability-checker': 'menu_book',
  'text-to-speech': 'record_voice_over',

  // SEO Tools (Green)
  'meta-title-checker': 'title',
  'meta-desc-checker': 'subtitles',
  'keyword-density': 'analytics',
  'utm-builder': 'add_link',
  'og-previewer': 'preview',

  // QR & Link Tools (Indigo)
  'qr-generator': 'qr_code_2',
  'qr-scanner': 'qr_code_scanner',
  'wifi-qr': 'wifi_tethering',
  'vcard-qr': 'contact_page',
  'whatsapp-link': 'chat',
  'mailto-link': 'mail',
  'tel-link': 'call',
  'short-link': 'link_sharp',
  'qr-label-maker': 'label',

  // Dev Tools (Cyan)
  'json-formatter': 'data_object',
  'json-validator': 'fact_check',
  'json-minifier': 'unfold_less',
  'css-beautifier': 'css',
  'css-minifier': 'compress',
  'js-beautifier': 'javascript',
  'js-minifier': 'terminal',
  'html-beautifier': 'html',
  'html-minifier': 'integration_instructions',
  'regex-tester': 'rule',
  'uuid-generator': 'fingerprint',
  'hash-generator': 'tag',
  'password-generator': 'key',
  'color-converter': 'tune',
  'css-gradient': 'gradient',
  'box-shadow': 'shadow',
  'border-radius': 'rounded_corner',
  'css-clamp': 'straighten',
  'flexbox-play': 'dashboard_customize',
  'css-grid': 'grid_view',
  'sql-formatter': 'database',
  'json-to-csv': 'schema',
  'llm-token-counter': 'token',
  'llms-txt-generator': 'smart_toy',
  'ai-crawler-robots-generator': 'robot_2',
  'jwt-decoder': 'key',
  'unix-timestamp-converter': 'schedule',

  // Personality Tests (Pink)
  'big-five-personality-test': 'psychology',
  'enneagram-personality-test': 'diversity_3',

  // Calc Tools (Amber)
  'percentage-calculator': 'percent',
  'discount-calculator': 'sell',
  'profit-margin': 'trending_up',
  'vat-tax': 'receipt_long',
  'loan-emi': 'account_balance',
  'date-diff': 'calendar_month',
  'age-calculator': 'cake',
  'time-duration': 'schedule',
  'unit-converter': 'square_foot',
  'invoice-generator': 'receipt',
  'bmi-calculator': 'monitor_weight',
  'calorie-macro-calculator': 'local_fire_department',
  'tip-calculator': 'restaurant',

  // Productivity Tools (Orange)
  'pomodoro-timer': 'timer',
  'typing-speed-test': 'keyboard',
  'online-notepad': 'edit_note'
};

// Map tool to Material Symbol Icon Name
function getMaterialIconName(title, cat, id) {
  if (id && TOOL_ICON_MAP[id]) {
    return TOOL_ICON_MAP[id];
  }
  const t = (title || '').toLowerCase();
  if (t.includes('compress')) return 'compress';
  if (t.includes('crop')) return 'crop';
  if (t.includes('resize')) return 'aspect_ratio';
  if (t.includes('convert') || /\bto\b/.test(t)) return 'transform';
  if (t.includes('color') || t.includes('palette')) return 'palette';
  if (t.includes('qr') || t.includes('barcode')) return 'qr_code_2';
  if (t.includes('json')) return 'data_object';
  if (t.includes('css')) return 'code_blocks';
  if (t.includes('word') || t.includes('character') || t.includes('text') || t.includes('sentence')) return 'text_fields';
  if (t.includes('password') || t.includes('lock') || t.includes('secure')) return 'lock';
  if (t.includes('pdf')) return 'description';
  if (t.includes('hash')) return 'fingerprint';
  if (t.includes('base64')) return 'tag';
  if (t.includes('html')) return 'html';
  if (t.includes('link') || t.includes('url')) return 'link';
  if (cat === 'Image') return 'image';
  if (cat === 'PDF') return 'picture_as_pdf';
  if (cat === 'Dev') return 'code';
  if (cat === 'SEO') return 'search';
  if (cat === 'Calc') return 'calculate';
  if (cat === 'Productivity') return 'task_alt';
  if (cat === 'Personality') return 'psychology';
  if (cat === 'QR') return 'qr_code_2';
  return 'build';
}

// Single source of truth for per-category badge colors (used by cards, badges and template variables)
const CAT_COLOR_MAP = {
  'Image': { text: '#60A5FA', border: 'rgba(96, 165, 250, 0.3)', bg: 'rgba(96, 165, 250, 0.12)' },
  'Dev': { text: '#06B6D4', border: 'rgba(6, 182, 212, 0.3)', bg: 'rgba(6, 182, 212, 0.12)' },
  'PDF': { text: '#FB7185', border: 'rgba(251, 113, 133, 0.3)', bg: 'rgba(251, 113, 133, 0.12)' },
  'Text': { text: '#EAB308', border: 'rgba(234, 179, 8, 0.3)', bg: 'rgba(234, 179, 8, 0.12)' },
  'SEO': { text: '#34D399', border: 'rgba(52, 211, 153, 0.3)', bg: 'rgba(52, 211, 153, 0.12)' },
  'QR': { text: '#818CF8', border: 'rgba(129, 140, 248, 0.3)', bg: 'rgba(129, 140, 248, 0.12)' },
  'Calc': { text: '#FBBF24', border: 'rgba(251, 191, 36, 0.3)', bg: 'rgba(251, 191, 36, 0.12)' },
  'Productivity': { text: '#FB923C', border: 'rgba(251, 146, 60, 0.3)', bg: 'rgba(251, 146, 60, 0.12)' },
  'Personality': { text: '#F472B6', border: 'rgba(244, 114, 182, 0.35)', bg: 'rgba(244, 114, 182, 0.12)' },
};
const CAT_COLOR_FALLBACK = { text: '#06B6D4', border: 'rgba(6, 182, 212, 0.3)', bg: 'rgba(6, 182, 212, 0.12)' };

// Head partial (No external JS tailwind compiler dependencies)
const head = `
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<link rel="icon" href="/assets/favicon.png">
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><rect x='43' y='10' width='14' height='40' rx='2' fill='%2306b6d4'/><polygon points='50,95 5,70 5,35 50,60' fill='%230a2a5e'/><polygon points='50,95 95,70 95,35 50,60' fill='%230a2a5e'/></svg>">
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/assets/pwa/apple-touch-icon.png">
<link rel="api-catalog" href="/.well-known/api-catalog">
<link rel="service-doc" href="/docs/api">
<meta name="theme-color" content="#0B0E14">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="100ToolCrate">
<meta name="msvalidate.01" content="ABE9D58FD670A809B29645CC7CCA575E" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Inter:wght@300..800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css?v=${ASSET_VERSION}">
${adsenseScript}
<script src="/assets/js/theme.js?v=${ASSET_VERSION}"></script>
<script src="/assets/js/pwa.js?v=${ASSET_VERSION}" defer></script>
<script src="/assets/js/webmcp.js?v=${ASSET_VERSION}" defer></script>
<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "6aa3328b8b2c4002bbcc18d0f5215960"}'></script><!-- End Cloudflare Web Analytics -->
`;

// Header Navigation + Sidebar Drawer
const header = `
<a class="skip-link" href="#main-content">Skip to content</a>
<nav class="site-nav" aria-label="Primary">
  <div class="nav-wrapper">
    <div class="nav-brand-group">
      <a href="/" class="logo-text">
        100ToolCrate
      </a>
    </div>

    <div class="nav-links">
      <a href="/">Home</a>
      <div class="nav-dropdown">
        <button type="button" class="nav-dropdown-trigger" aria-expanded="false" aria-controls="nav-categories-menu" id="nav-categories-btn">
          Categories <span class="material-symbols-outlined" style="font-size: 18px;">expand_more</span>
        </button>
        <div class="nav-dropdown-content" id="nav-categories-menu" role="group" aria-labelledby="nav-categories-btn">
          ${dropdownLinksHtml}
        </div>
      </div>
      <a href="/workflows">Workflows</a>
      <a href="/services">Services</a>
      <a href="/blog">Blog</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </div>

    <div class="nav-actions">
      <button id="themeToggle" aria-label="Toggle Dark Mode" class="theme-toggle-btn">
        <span class="material-symbols-outlined" style="font-size: 20px;">dark_mode</span>
      </button>
      <button class="menu-toggle" aria-label="Open sidebar navigation">
        <span class="material-symbols-outlined">menu</span>
      </button>
    </div>
  </div>
</nav>

<!-- Sidebar Overlay -->
<div class="sidebar-overlay" id="sidebarOverlay"></div>

<!-- Sidebar Drawer -->
<aside class="sidebar-drawer" id="sidebarDrawer" aria-label="Site navigation sidebar" inert>
  <div class="sidebar-header">
    <a href="/" class="logo-text" style="font-size: 1.15rem;">100ToolCrate</a>
    <button class="sidebar-close-btn" id="sidebarClose" aria-label="Close sidebar">
      <span class="material-symbols-outlined" style="font-size: 20px;">close</span>
    </button>
  </div>
  <div class="sidebar-content">
    <nav class="sidebar-nav" aria-label="Main navigation">
      <div class="sidebar-section-title">Navigation</div>
      <a href="/" class="sidebar-link">
        <span class="material-symbols-outlined" style="font-size: 20px;">home</span>
        Home
      </a>
      <a href="/tools" class="sidebar-link">
        <span class="material-symbols-outlined" style="font-size: 20px;">star</span>
        Popular
      </a>
      <a href="/workflows" class="sidebar-link">
        <span class="material-symbols-outlined" style="font-size: 20px;">checklist</span>
        Workflows
      </a>
      <a href="/blog" class="sidebar-link">
        <span class="material-symbols-outlined" style="font-size: 20px;">article</span>
        Blog
      </a>
      <a href="/about" class="sidebar-link">
        <span class="material-symbols-outlined" style="font-size: 20px;">info</span>
        About
      </a>
      <a href="/contact" class="sidebar-link">
        <span class="material-symbols-outlined" style="font-size: 20px;">mail</span>
        Contact
      </a>

      <div class="sidebar-divider"></div>
      <div class="sidebar-section-title">Categories</div>

      ${sidebarCategoryLinksHtml}

      <div class="sidebar-divider"></div>

      <a href="/privacy-policy" class="sidebar-sublink">
        <span class="material-symbols-outlined" style="font-size: 18px;">policy</span>
        Privacy Policy
      </a>
      <a href="/terms" class="sidebar-sublink">
        <span class="material-symbols-outlined" style="font-size: 18px;">gavel</span>
        Terms of Service
      </a>
      <a href="/disclaimer" class="sidebar-sublink">
        <span class="material-symbols-outlined" style="font-size: 18px;">warning</span>
        Disclaimer
      </a>
    </nav>
  </div>
</aside>
`;

// Footer
const footer = `
<footer class="site-footer">
  <div class="footer-container">
    <div class="footer-features-row">
      <div class="footer-feature-item">
        <div class="feature-icon" style="color: #8B5CF6;">
          <span class="material-symbols-outlined">auto_fix_high</span>
        </div>
        <div class="feature-title">100% Free</div>
        <div class="feature-sub">No hidden fees ever.</div>
      </div>
      <div class="footer-feature-item">
        <div class="feature-icon" style="color: #06B6D4;">
          <span class="material-symbols-outlined">shield_lock</span>
        </div>
        <div class="feature-title">Privacy First</div>
        <div class="feature-sub">Files deleted locally.</div>
      </div>
      <div class="footer-feature-item">
        <div class="feature-icon" style="color: #F43F5E;">
          <span class="material-symbols-outlined">no_accounts</span>
        </div>
        <div class="feature-title">No Registration</div>
        <div class="feature-sub">Start using instantly.</div>
      </div>
      <div class="footer-feature-item">
        <div class="feature-icon" style="color: #EAB308;">
          <span class="material-symbols-outlined">bolt</span>
        </div>
        <div class="feature-title">Lightning Fast</div>
        <div class="feature-sub">Client-side processing.</div>
      </div>
    </div>

    <div class="footer-line-divider"></div>

    <div class="footer-main-row">
      <div class="footer-brand-side">
        <h3 class="footer-brand-name">100ToolCrate</h3>
        <p class="footer-brand-desc">
          Precision built utilities for the modern web.<br>
          Always free, always private.
        </p>
        <div class="footer-brand-copyright">
          © 2026 100ToolCrate.
        </div>
      </div>

      <div class="footer-columns-side">
        <div class="footer-nav-col">
          <span class="footer-col-heading">NAVIGATION</span>
          <a href="/">Home</a>
          <a href="/tools">All Tools</a>
          <a href="/workflows">Workflows</a>
          <a href="/blog">Blog</a>
          <a href="/about">About Us</a>
          <a href="/contact">Contact Us</a>
          <a href="/advertise">Advertise</a>
        </div>
        <div class="footer-nav-col">
          <span class="footer-col-heading">FOR BUILDERS</span>
          <a href="/agents">AI agent API & MCP</a>
          <a href="/services">Done-for-you services</a>
          <a href="/advertise">Sponsorships</a>
          <a href="/editorial-policy">Editorial policy</a>
        </div>
        <div class="footer-nav-col">
          <span class="footer-col-heading">PLATFORM</span>
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
          <a href="/disclaimer">Disclaimer</a>
          <button type="button" class="pwa-install-link" data-ad-choices>
            <span class="material-symbols-outlined" aria-hidden="true">ad_group</span>
            Ad choices
          </button>
          <button type="button" class="pwa-install-link" data-pwa-install>
            <span class="material-symbols-outlined" aria-hidden="true">install_mobile</span>
            Install app
          </button>
        </div>
      </div>
    </div>
  </div>
</footer>
<script src="/assets/js/main.js?v=${ASSET_VERSION}" defer></script>
`;

// Helper for generating Bento Cards
function getToolHtml(t, index) {
  const c = CAT_COLOR_MAP[t.cat] || CAT_COLOR_FALLBACK;
  const iconName = getMaterialIconName(t.title, t.cat, t.id);

  return `
    <a class="tool-card bento-card" href="/tools/${escapeHtml(t.id)}" data-category="${escapeHtml(t.cat.toLowerCase())}" data-tool-id="${escapeHtml(t.id)}">
      <span class="card-category-badge" data-cat="${escapeHtml(t.cat.toLowerCase())}">${escapeHtml(t.cat.toUpperCase())}</span>
      <div class="icon-box" style="color: ${c.text}; background-color: ${c.bg};">
        <span class="material-symbols-outlined" style="font-size: 26px;">${iconName}</span>
      </div>
      <h3>${escapeHtml(t.title)}</h3>
      <p>${escapeHtml(t.desc)}</p>
    </a>
  `.trim();
}

// Normalize template output so generated HTML never carries trailing whitespace.
function stripLineEndWhitespace(html) {
  return html.replace(/[ \t]+(?=\n)/g, '').replace(/[ \t]+$/, '');
}

// Canonical tool page template
const toolTemplate = `
<!DOCTYPE html>
<html class="dark" lang="en">
<head>
  ${head}
  <title>{{seoTitle}}</title>
  <meta name="description" content="{{seoDesc}}">
  <meta property="og:title" content="{{seoTitle}}">
  <meta property="og:description" content="{{seoDesc}}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://100toolcrate.com/tools/{{id}}">
  <meta property="og:site_name" content="100ToolCrate">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{{seoTitle}}">
  <meta name="twitter:description" content="{{seoDesc}}">
  <link rel="canonical" href="https://100toolcrate.com/tools/{{id}}">
  <script type="application/ld+json">
  {{schemas}}
  </script>
</head>
<body>
  ${header}
  <main class="main-content tool-page" id="main-content" tabindex="-1">
    <div class="tool-topline">
      <a id="nav-back-btn" class="nav-back-btn" href="/" aria-label="Go back to parent page" style="display: none;">
        <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
        <span class="back-text">Back</span>
      </a>
      <nav class="breadcrumb-nav tool-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span class="breadcrumb-sep" aria-hidden="true">/</span>
        <a href="/tools?cat={{catFilter}}">{{catLabel}}</a>
        <span class="breadcrumb-sep" aria-hidden="true">/</span>
        <span class="breadcrumb-current" aria-current="page">{{title}}</span>
      </nav>
    </div>

    <header class="tool-head">
      <div class="tool-head-icon" style="color: {{catColor}}; background: {{catBg}}; border-color: {{catBorder}};">
        <span class="material-symbols-outlined">{{iconName}}</span>
      </div>
      <div class="tool-head-copy">
        <div class="tool-head-titleline">
          <h1 class="tool-header-title">{{title}}</h1>
          <span class="tool-kicker" style="color: {{catColor}}; border-color: {{catBorder}}; background: {{catBg}};">{{catUpper}}</span>
        </div>
        <p class="tool-header-desc">{{desc}}</p>
      </div>
      <span class="tool-head-meta">
        <span class="material-symbols-outlined">shield_lock</span>
        Private &amp; on-device
      </span>
    </header>

    <section class="tool-workspace-panel" aria-label="{{title}} workspace">
      <div class="workspace-topbar">
        <div class="workspace-eyebrow">
          <span class="workspace-live-dot" aria-hidden="true"></span>
          Live workspace
        </div>
        <div class="workspace-tools">
          <span class="workspace-status" id="tool-status" role="status" aria-live="polite" data-state="loading">Preparing&hellip;</span>
          <button type="button" class="tool-copy-btn" id="tool-copy-link">
            <span class="material-symbols-outlined">link</span>
            <span class="tool-copy-label">Copy link</span>
          </button>
          <button type="button" class="workspace-reset" id="tool-reset-btn" title="Reset this tool">
            <span class="material-symbols-outlined">restart_alt</span>
            Reset
          </button>
        </div>
      </div>
      <div id="tool-app-container" class="tool-workspace" data-tool-id="{{id}}" data-category="{{cat}}" data-title="{{title}}" data-ui-template="${TOOL_UI_TEMPLATE_VERSION}">
        <div class="tool-skeleton" aria-hidden="true">
          <div class="tool-skeleton-line" style="width: 42%;"></div>
          <div class="tool-skeleton-block"></div>
          <div class="tool-skeleton-line" style="width: 68%;"></div>
        </div>
      </div>
      <div class="workspace-footnote">
        <span class="material-symbols-outlined">lock</span>
        {{processingNote}}
      </div>
    </section>

    <section class="tool-info-card" aria-label="About this tool">
      {{content}}
    </section>

    <section class="tool-faq-card" id="faq" aria-label="Frequently asked questions">
      <div class="tool-section-head">
        <span class="tool-section-kicker">Answers</span>
        <h2>Frequently asked questions</h2>
      </div>
      <div class="tool-faq-list">
        {{faqs}}
      </div>
    </section>

    <div class="tool-support-grid">
      <section class="tool-support-card" aria-label="Quick tips">
        <h2>Quick tips</h2>
        <ul class="tool-tips-list">
          {{quickTips}}
        </ul>
      </section>
      {{relatedTools}}
    </div>
    {{relatedWorkflows}}
  </main>
  ${footer}
  <script src="/assets/js/tools-logic.js?v=${ASSET_VERSION}" defer></script>
</body>
</html>
`;

if (!fs.existsSync(path.join(process.cwd(), 'tools'))) {
  fs.mkdirSync(path.join(process.cwd(), 'tools'));
}

// Category-aware wording for the "how to use" steps.
const STEP_INPUT_TEXT = {
  Image: 'Upload an image or drag and drop it into the workspace.',
  PDF: 'Upload your PDF, or select several files when the tool supports it.',
  Text: 'Paste or type your text directly into the editor.',
  Dev: 'Paste your code, JSON or data into the workspace.',
  Calc: 'Enter your values into the fields above.',
  Productivity: 'Start the timer, open the notepad or begin typing when you are ready.',
  QR: 'Enter the text, URL or details you want to encode.',
  SEO: 'Paste your content or enter your page details.',
  Personality: 'Work through the questions at your own pace.'
};

// Generate unique SEO content per tool. Prefer the individually authored copy in
// tools.json; the category guide below is only a fallback for incomplete entries.
function sanitizeAuthoredContent(html) {
  return String(html || '')
    .replace(/<(script|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '')
    .replace(/Clean and Ad-Free Experience/gi, 'Clean, Focused Experience')
    .replace(/Ad-Free Experience/gi, 'Focused Experience')
    .replace(/without intrusive advertisements/gi, 'with a focused, efficient interface');
}

function generateToolContent(tool) {
  const title = tool.title;
  const desc = tool.desc;
  const stepOne = STEP_INPUT_TEXT[tool.cat] || 'Upload a file or paste your content into the workspace above.';
  const authored = sanitizeAuthoredContent(tool.content).trim();

  if (authored) {
    return `
      <div class="tool-section-head">
        <span class="tool-section-kicker">In-depth guide</span>
        <h2>About ${escapeHtml(title)}</h2>
      </div>
      <div class="tool-authored-content">${authored}</div>
      ${toolLimitations[tool.id] ? `<aside class="workflow-info-card" style="margin-top:1.25rem;border-left:3px solid var(--primary);"><h3 style="margin-top:0;">Accuracy &amp; limitations</h3><p style="margin-bottom:0;color:var(--text-muted);line-height:1.75;">${escapeHtml(toolLimitations[tool.id])}</p></aside>` : ''}
      ${agentToolIds.has(tool.id) ? `<p style="margin-top:1rem;"><a class="workflow-share" style="margin:0;" href="/agents#${escapeHtml(tool.id)}"><span class="material-symbols-outlined" aria-hidden="true">smart_toy</span>Run through the agent API</a></p>` : ''}
    `;
  }

  return `
    <div class="tool-section-head">
      <span class="tool-section-kicker">Guide</span>
      <h2>About ${escapeHtml(title)}</h2>
    </div>
    <p class="tool-about-text">${escapeHtml(desc)} Everything runs directly inside your browser, so no files or text are sent to an external server. That keeps your content private and makes the tool respond instantly.</p>
    <div class="tool-howto">
      <h3>How to use it</h3>
      <ol class="tool-steps">
        <li>
          <span class="tool-step-num" aria-hidden="true">1</span>
          <div class="tool-step-copy">
            <strong>Add your input</strong>
            <p>${escapeHtml(stepOne)}</p>
          </div>
        </li>
        <li>
          <span class="tool-step-num" aria-hidden="true">2</span>
          <div class="tool-step-copy">
            <strong>Adjust the settings</strong>
            <p>Fine-tune the options until the live preview matches what you need.</p>
          </div>
        </li>
        <li>
          <span class="tool-step-num" aria-hidden="true">3</span>
          <div class="tool-step-copy">
            <strong>Copy or download the result</strong>
            <p>Use the actions in the workspace to copy the output or save it to your device.</p>
          </div>
        </li>
      </ol>
    </div>
  `;
}

// Generate the compact related-tools rail shown in the tool sidebar
function generateRelatedTools(tool) {
  const cat = tool.cat.toLowerCase();
  const sameCategory = toolsData.filter(t => t.cat.toLowerCase() === cat && t.id !== tool.id);
  if (sameCategory.length < 2) return '';

  const seed = Array.from(tool.id).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const start = seed % sameCategory.length;
  // Wrap around so small categories still produce a full list
  const selected = [...sameCategory, ...sameCategory].slice(start, start + 4);
  const meta = CATEGORY_BY_NAME[tool.cat] || { filter: 'all', label: tool.cat };

  const items = selected.map((t) => {
    const c = CAT_COLOR_MAP[t.cat] || CAT_COLOR_FALLBACK;
    const icon = getMaterialIconName(t.title, t.cat, t.id);
    return `
      <a class="tool-related-item" href="/tools/${escapeHtml(t.id)}">
        <span class="tool-related-icon" style="color: ${c.text}; background: ${c.bg}; border-color: ${c.border};">
          <span class="material-symbols-outlined">${icon}</span>
        </span>
        <span class="tool-related-copy">
          <strong>${escapeHtml(t.title)}</strong>
          <small>${escapeHtml(t.desc)}</small>
        </span>
        <span class="material-symbols-outlined tool-related-arrow" aria-hidden="true">chevron_right</span>
      </a>
    `;
  }).join('');

  return `
    <section class="tool-support-card tool-related-card" aria-label="Related tools">
      <h2>Related tools</h2>
      <div class="tool-related-list">
        ${items}
      </div>
      <a class="tool-related-all" href="/tools?cat=${meta.filter}">
        View all ${escapeHtml(meta.label)}
        <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
      </a>
    </section>
  `;
}

function renderSponsor(placement) {
  const today = new Date().toISOString().slice(0, 10);
  const sponsor = sponsorsData.find(item => item.placement === placement && item.startsOn <= today && item.endsOn >= today);
  if (!sponsor) return '';
  let url;
  try {
    url = new URL(sponsor.url);
    if (url.protocol !== 'https:') throw new Error('Sponsor URLs must use HTTPS');
  } catch (error) {
    throw new Error(`Invalid sponsor URL for ${sponsor.name || placement}: ${error.message}`);
  }
  return `
    <aside class="workflow-info-card" style="margin: 1.5rem 0; border-style: dashed;" aria-label="Sponsored message">
      <span class="workflow-eyebrow">Sponsored</span>
      <h2 style="margin: .55rem 0; font-size: 1.1rem;">${escapeHtml(sponsor.name)}</h2>
      <p style="color: var(--text-muted); line-height: 1.65;">${escapeHtml(sponsor.description)}</p>
      <a class="workflow-share" href="${escapeHtml(url.href)}" target="_blank" rel="sponsored noopener noreferrer">Visit sponsor <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span></a>
    </aside>`;
}

function workflowCard(workflow, heading = 'h2') {
  const tag = heading === 'h3' ? 'h3' : 'h2';
  return `
    <a class="workflow-card" href="/workflows/${escapeHtml(workflow.slug)}" data-workflow-card="${escapeHtml(workflow.slug)}" data-category="${escapeHtml(workflow.category)}" data-step-count="${workflow.steps.length}">
      <span class="workflow-card-icon" aria-hidden="true"><span class="material-symbols-outlined">${escapeHtml(workflow.icon)}</span></span>
      <span class="workflow-card-category">${escapeHtml(workflow.category)} workflow</span>
      <${tag}>${escapeHtml(workflow.shortTitle)}</${tag}>
      <p>${escapeHtml(workflow.description)}</p>
      <span class="workflow-card-footer"><span>${workflow.steps.length} steps · ${escapeHtml(workflow.duration)}</span><span class="workflow-card-progress" data-card-progress>Open workflow →</span></span>
    </a>
  `;
}

function generateRelatedWorkflows(tool) {
  const matches = workflowsData.filter(workflow => workflow.steps.some(step => step.tool === tool.id)).slice(0, 3);
  if (!matches.length) return '';
  return `
    <section class="workflow-related-section" aria-labelledby="tool-workflows-title">
      <div class="section-header">
        <h2 id="tool-workflows-title">Use ${escapeHtml(tool.title)} in a complete workflow</h2>
        <a class="section-link" href="/workflows">All workflows <span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></a>
      </div>
      <div class="workflow-home-grid">${matches.map(workflow => workflowCard(workflow, 'h3')).join('')}</div>
    </section>
  `;
}

toolsData.forEach(tool => {
  const c = CAT_COLOR_MAP[tool.cat] || CAT_COLOR_FALLBACK;
  const iconName = getMaterialIconName(tool.title, tool.cat, tool.id);

  let html = toolTemplate;
  html = html.replace(/{{title}}/g, escapeHtml(tool.title));
  html = html.replace(/{{desc}}/g, escapeHtml(tool.desc));
  html = html.replace(/{{id}}/g, escapeHtml(tool.id));
  html = html.replace(/{{cat}}/g, escapeHtml(tool.cat));
  html = html.replace(/{{catUpper}}/g, escapeHtml((tool.cat || '').toUpperCase()));
  html = html.replace(/{{catColor}}/g, c.text);
  html = html.replace(/{{catBorder}}/g, c.border);
  html = html.replace(/{{catBg}}/g, c.bg);
  html = html.replace(/{{iconName}}/g, iconName);
  html = html.replace(/{{seoTitle}}/g, escapeHtml(tool.seoTitle));
  html = html.replace(/{{seoDesc}}/g, escapeHtml(tool.seoDesc));

  const catMeta = CATEGORY_BY_NAME[tool.cat] || { label: tool.cat, filter: 'all' };
  const tips = CATEGORY_TIPS[tool.cat] || DEFAULT_TIPS;
  html = html.replace(/{{catFilter}}/g, escapeHtml(catMeta.filter));
  html = html.replace(/{{catLabel}}/g, escapeHtml(catMeta.label));
  html = html.replace(/{{toolCount}}/g, String(TOTAL_TOOL_COUNT));
  html = html.replace(/{{processingNote}}/g, tool.id === 'og-previewer'
    ? 'The public URL you enter is fetched by our server to extract metadata. HTML is handled transiently; only the parsed preview data is returned.'
    : 'Your files and text are processed in this browser and never uploaded.');
  html = html.replace(/{{quickTips}}/g, tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join(''));

  html = html.replace(/{{content}}/g, generateToolContent(tool));
  html = html.replace(/{{relatedTools}}/g, generateRelatedTools(tool));
  html = html.replace(/{{relatedWorkflows}}/g, generateRelatedWorkflows(tool));

  let faqsHtml = '';
  let faqMainEntity = [];
  if (tool.faqs) {
    tool.faqs.forEach(f => {
      faqsHtml += `<details class="tool-faq-item"><summary class="tool-faq-question"><span>${escapeHtml(f.q)}</span><span class="material-symbols-outlined tool-faq-icon" aria-hidden="true">add</span></summary><p class="tool-faq-answer">${escapeHtml(f.a)}</p></details>`;
      faqMainEntity.push({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": { "@type": "Answer", "text": f.a }
      });
    });
  }
  html = html.replace(/{{faqs}}/g, faqsHtml);

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": tool.title,
      "description": tool.seoDesc,
      "applicationCategory": "UtilityApplication",
      "operatingSystem": "All",
      "url": `https://100toolcrate.com/tools/${tool.id}`,
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://100toolcrate.com/" },
        { "@type": "ListItem", "position": 2, "name": "Tools", "item": "https://100toolcrate.com/tools" },
        { "@type": "ListItem", "position": 3, "name": tool.title, "item": `https://100toolcrate.com/tools/${tool.id}` }
      ]
    }
  ];
  if (faqMainEntity.length) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqMainEntity
    });
  }
  // Escape "<" so the JSON-LD block can never break out of the <script> element
  html = html.replace(/{{schemas}}/g, JSON.stringify(schemas, null, 2).replace(/</g, '\\u003c'));

  fs.writeFileSync(path.join(process.cwd(), 'tools', `${tool.id}.html`), stripLineEndWhitespace(html));
});

// Generate Static Pages
function writePage(filename, title, content, options = {}) {
  const cleanPath = filename.replace('.html', '');
  const description = options.description || `${title} from 100ToolCrate: practical browser tools, transparent limitations and privacy-first defaults.`;
  const html = `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
  ${head}
  <title>${escapeHtml(options.seoTitle || `${title} - 100ToolCrate`)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(options.seoTitle || title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
  <link rel="canonical" href="https://100toolcrate.com/${cleanPath}">${options.noindex ? '\n  <meta name="robots" content="noindex,follow">' : ''}
  ${options.extraHead || ''}
</head>
<body>
  ${header}
  <main class="main-content" id="main-content" tabindex="-1">
    <div class="tool-page-container" style="padding-top: 2rem; padding-bottom: 3.5rem;">
      <div style="margin-bottom: 1.25rem;">
        <a id="nav-back-btn" class="nav-back-btn" href="/" aria-label="Go back to parent page" style="display: none;">
          <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
          <span class="back-text">Back</span>
        </a>
      </div>
      <h1 style="font-size: 2.25rem; font-weight: 900; margin-bottom: 1.75rem; color: var(--text-color); letter-spacing: -0.02em;">${escapeHtml(title)}</h1>
      <div style="color: var(--text-muted); line-height: 1.75;">
        ${content}
      </div>
    </div>
  </main>
  ${footer}
${filename === 'contact.html' ? `<script src="/assets/js/contact.js?v=${ASSET_VERSION}" defer></script>` : ''}
${options.scripts || ''}
</body>
</html>`;
  fs.writeFileSync(path.join(process.cwd(), filename), stripLineEndWhitespace(html));
}

// 1. About Us Content
const aboutContent = `
<div class="static-page-content" style="max-width: 900px; margin: 0 auto;">
  <p style="font-size: 1.15rem; line-height: 1.8; color: var(--text-color); margin-bottom: 2rem;">
    Welcome to <strong>100ToolCrate</strong> — a modern, privacy-focused digital suite of over 100 web utilities engineered specifically for developers, designers, writers, marketers, and digital creators worldwide.
  </p>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">Our Mission: Privacy-First Digital Tools</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    100ToolCrate provides local-first browser utilities for tasks such as image compression, JSON formatting, calculations and PDF assembly. Supported browser tools avoid sending selected files to our server. A separate, clearly documented execution API handles selected text/data requests transiently, while forms and paid-service transfers use third-party or agreed delivery channels.
  </p>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">How Our Client-Side Architecture Works</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    Every utility housed within 100ToolCrate leverages modern browser technologies including HTML5 APIs, WebAssembly (WASM), Canvas rendering engines, Web Crypto API, and client-side JavaScript execution. When you drag and drop an image or paste confidential code into 100ToolCrate:
  </p>
  <ul style="padding-left: 1.5rem; margin-bottom: 1.5rem; color: var(--text-muted); line-height: 1.8;">
    <li style="margin-bottom: 0.5rem;"><strong>Zero Server Uploads:</strong> Your files remain 100% locally stored on your computer or mobile device.</li>
    <li style="margin-bottom: 0.5rem;"><strong>Instant Computation:</strong> Processing occurs locally using your device's hardware, eliminating internet latency and bandwidth limits.</li>
    <li style="margin-bottom: 0.5rem;"><strong>Complete Confidentiality:</strong> No server logs, no stored copies, and no risk of third-party data breaches.</li>
  </ul>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">Comprehensive Tool Suite</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    Our platform offers 9 distinct utility categories designed to cover every technical need:
  </p>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 2.25rem;">
    <div style="background: var(--bg-subtle); border: 1px solid var(--border-light); padding: 1.25rem; border-radius: 0.75rem;">
      <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-color); margin-bottom: 0.5rem;">📸 Image Utilities</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted);">Compress, crop, resize, convert formats (PNG, JPG, WebP), and remove EXIF metadata locally.</p>
    </div>
    <div style="background: var(--bg-subtle); border: 1px solid var(--border-light); padding: 1.25rem; border-radius: 0.75rem;">
      <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-color); margin-bottom: 0.5rem;">⚡ Developer Tools</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted);">Format JSON/XML/SQL, encode/decode Base64, generate JWT tokens, minify code, and test regex patterns.</p>
    </div>
    <div style="background: var(--bg-subtle); border: 1px solid var(--border-light); padding: 1.25rem; border-radius: 0.75rem;">
      <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-color); margin-bottom: 0.5rem;">📄 PDF Tools</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted);">Merge, split, protect, compress, and convert PDF documents in high-fidelity sandbox isolates.</p>
    </div>
    <div style="background: var(--bg-subtle); border: 1px solid var(--border-light); padding: 1.25rem; border-radius: 0.75rem;">
      <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-color); margin-bottom: 0.5rem;">📝 Text & Content</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted);">Word counts, diff checker, case converters, readability scores, text-to-speech, and lorem ipsum generators.</p>
    </div>
    <div style="background: var(--bg-subtle); border: 1px solid var(--border-light); padding: 1.25rem; border-radius: 0.75rem;">
      <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-color); margin-bottom: 0.5rem;">⏱️ Productivity</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted);">Pomodoro focus sessions, typing speed tests, and an autosaving browser notepad.</p>
    </div>
  </div>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">Our Core Operating Principles</h2>
  <ol style="padding-left: 1.5rem; margin-bottom: 2rem; color: var(--text-muted); line-height: 1.8;">
    <li style="margin-bottom: 0.5rem;"><strong>Free core tools:</strong> Browser utilities do not require an account or subscription. Practical device, browser and file-format limits still apply.</li>
    <li style="margin-bottom: 0.5rem;"><strong>No tool account required:</strong> Start work without registering an email address. Paid service inquiries are handled separately.</li>
    <li style="margin-bottom: 0.5rem;"><strong>Transparent data paths:</strong> Local browser processing, transient server execution, forms and paid-service transfers are distinguished in our <a href="/editorial-policy" style="color: var(--primary);">editorial policy</a>. Local processing reduces uploads but is not a promise of complete isolation.</li>
  </ol>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">Get In Touch</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    We review bug reports and update tools when issues are reproduced or requirements change. For feature requests, corrections or security reports, use our <a href="/contact" style="color: var(--primary); font-weight: 600;">Contact Page</a> or email <a href="mailto:support@100toolcrate.com" style="color: var(--primary); font-weight: 600;">support@100toolcrate.com</a>.
  </p>
</div>
`;

// 2. Privacy Policy Content
const privacyContent = `
<div class="static-page-content" style="max-width: 900px; margin: 0 auto;">
  <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1.5rem;"><em>Last Updated: 2026-11-10</em></p>

  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    At <strong>100ToolCrate</strong> (accessible from <a href="https://100toolcrate.com" style="color: var(--primary);">https://100toolcrate.com</a>), the privacy of our visitors is one of our highest priorities. This Privacy Policy document outlines the types of information collected and recorded by 100ToolCrate and how we protect your personal data.
  </p>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">1. Browser Processing, Public Execution and Service Data</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    Supported browser tools process selected files, images, text and documents locally using browser APIs and client-side libraries. Library code may be downloaded from listed CDNs, but the selected tool input is not sent to our application server by those browser tools. The separate public REST/MCP execution API processes only the selected text, JSON, time or calculation inputs listed in its catalog; execution inputs and outputs are transient and are not persisted by that endpoint. Standard hosting logs and rate-limit infrastructure still apply.
  </p>
  <div style="background: rgba(6, 182, 212, 0.08); border-left: 4px solid #06B6D4; padding: 1.25rem; margin-bottom: 1.75rem; border-radius: 0 0.5rem 0.5rem 0;">
    <strong style="color: var(--text-color); display: block; margin-bottom: 0.35rem;">Choose the appropriate data path:</strong> Use browser tools when you need local file processing. Do not send secrets or unnecessary personal data to the execution API. Contact, sponsorship and service forms use FormSubmit. Paid-service files are not local-only and are transferred only after a written scope and approved channel are agreed.
  </div>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">2. Log Files & Server Metrics</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    100ToolCrate follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting services do this as part of hosting services' analytics. The information collected by log files includes internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering the site, tracking users' movement on the website, and gathering demographic information.
  </p>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">3. Cookies & Web Beacons</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    Like any other website, 100ToolCrate uses "cookies". These cookies are used to store information including visitors' preferences (such as Light Mode / Dark Mode state) and the pages on the website that the visitor accessed or visited. The information is used to optimize the users' experience by customizing our web page content based on visitors' browser type and/or other information.
  </p>

  <h2 id="advertising" style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">4. Google AdSense & Third-Party Advertising</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    On the production site, optional advertising is provided by Google AdSense. The Google advertising script is not loaded on preview hosts and is not loaded until you choose <strong>Allow ads</strong>. Choosing <strong>Essential only</strong> keeps the tools available without loading AdSense. Your choice is stored in local browser storage under <code>tc-ad-consent-v1</code>; workflow checklist progress is stored separately under <code>tc-workflow-progress-v1</code>. You can revisit this choice using <button type="button" data-ad-choices style="color: var(--primary); background: none; border: 0; padding: 0; font: inherit; cursor: pointer; text-decoration: underline;">Ad choices</button> in the footer or here.
  </p>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    When enabled, Google and its partners may use cookies or similar technologies to serve and measure ads, including personalized ads where permitted. Google's advertising privacy information is available at <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" style="color: var(--primary);">https://policies.google.com/technologies/ads</a>. Availability of ads depends on account approval, regional rules, browser settings and Google policies.
  </p>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    Third-party ad servers or ad networks use technologies like cookies, JavaScript, or Web Beacons that are used in their respective advertisements and links that appear on 100ToolCrate, which are sent directly to users' browsers. They automatically receive your IP address when this occurs. These technologies are used to measure the effectiveness of their advertising campaigns and/or to personalize the advertising content that you see on websites that you visit.
  </p>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">5. Privacy Rights (GDPR & CCPA Compliance)</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    Under the General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA), consumers have specific data privacy rights:
  </p>
  <ul style="padding-left: 1.5rem; margin-bottom: 1.5rem; color: var(--text-muted); line-height: 1.8;">
    <li style="margin-bottom: 0.4rem;"><strong>Right to Know / Access:</strong> Request disclosure of collected personal data categories and specific pieces of data.</li>
    <li style="margin-bottom: 0.4rem;"><strong>Right to Erasure / Deletion:</strong> Request deletion of any personal data collected about the consumer.</li>
    <li style="margin-bottom: 0.4rem;"><strong>Right to Opt-Out:</strong> Request that a business does not sell or share the consumer's personal data.</li>
  </ul>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    100ToolCrate does not require tool user accounts or maintain a database of browser-tool file contents. SQLite stores anonymous aggregate tool counters, not visitor identifiers. Contact and service messages are delivered through FormSubmit and may exist in the operator's email. For a privacy inquiry, contact <a href="mailto:privacy@100toolcrate.com" style="color: var(--primary);">privacy@100toolcrate.com</a>.
  </p>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">6. Children's Information (COPPA Compliance)</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    Another part of our priority is adding protection for children while using the internet. We encourage parents and guardians to observe, participate in, and/or monitor and guide their online activity. 100ToolCrate does not knowingly collect any Personal Identifiable Information from children under the age of 13.
  </p>
  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">7. Contact Form Processing</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    When you submit a contact, advertising or service form, the details you enter are transmitted to FormSubmit (formsubmit.co), a third-party form delivery service, and forwarded to <a href="mailto:support@100toolcrate.com" style="color: var(--primary);">support@100toolcrate.com</a>. The operator may retain correspondence in email and service records for response, delivery, accounting and abuse-prevention purposes. We do not sell these submissions. Do not include secrets or unnecessary personal data; you can email directly instead.
  </p>
</div>
`;

// 3. Terms of Service Content
const termsContent = `
<div class="static-page-content" style="max-width: 900px; margin: 0 auto;">
  <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1.5rem;"><em>Last Updated: 2026-11-10</em></p>

  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    Welcome to <strong>100ToolCrate</strong>. By accessing or using our website located at <a href="https://100toolcrate.com" style="color: var(--primary);">https://100toolcrate.com</a> and its suite of browser utilities, you agree to be bound by these Terms of Service. If you do not agree to all terms, please refrain from using our platform.
  </p>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">1. Use License & Intellectual Property</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    Permission is granted to temporarily access and utilize the tools on 100ToolCrate for personal, educational, non-commercial, or commercial purposes. All branding, design assets, original web code, and interface layouts remain the intellectual property of 100ToolCrate.
  </p>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">2. Acceptable Use Policy</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    You agree to use 100ToolCrate only for lawful purposes. You must not:
  </p>
  <ul style="padding-left: 1.5rem; margin-bottom: 1.5rem; color: var(--text-muted); line-height: 1.8;">
    <li style="margin-bottom: 0.4rem;">Attempt to decompile, reverse engineer, or exploit malicious code into the web utilities.</li>
    <li style="margin-bottom: 0.4rem;">Use automated scrapers or bots to disrupt platform availability or overwhelm client connections.</li>
    <li style="margin-bottom: 0.4rem;">Utilize tools to process illegal content, infringe third-party copyrights, or generate malicious payloads.</li>
  </ul>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">3. Client Execution & User Responsibilities</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    Supported browser tools process inputs locally in your browser workspace. The public REST/MCP execution API instead processes selected text/data/calculation inputs transiently on the server, subject to published schemas and limits. You are responsible for choosing the appropriate path, avoiding secrets in API calls, backing up original source files and verifying output before production use.
  </p>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">4. Limitation of Liability</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    To the maximum extent permitted by applicable law, 100ToolCrate and its operators are not liable for indirect, incidental, consequential or special damages arising from use of or inability to use the utilities. Nothing in these terms excludes liability that cannot lawfully be excluded or limited. Paid-service liability, if any, is addressed in the applicable written quote.
  </p>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">5. Paid Services, Quotes and Sponsorships</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    Website estimates and inquiries do not charge a card, reserve capacity or create a service engagement. A paid engagement begins only when both parties accept a written scope covering deliverables, price, payment schedule, delivery target, data handling, revisions, cancellation and refunds. Delivery dates are targets unless the quote explicitly makes them binding. Customers must have authority to share supplied files and access, and must not send credentials through public forms. Rankings, traffic, revenue, agent recommendations, official acceptance and compliance outcomes are not guaranteed. Sponsorship does not purchase followed links, search rankings or favorable editorial treatment.
  </p>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">6. Changes to Terms</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    We reserve the right to revise or modify these Terms of Service at any time without prior notice. Continued use of 100ToolCrate following updates constitutes full acceptance of the updated terms.
  </p>
</div>
`;

// 4. Disclaimer Content
const disclaimerContent = `
<div class="static-page-content" style="max-width: 900px; margin: 0 auto;">
  <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1.5rem;"><em>Last Updated: June 2026</em></p>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">1. "As-Is" Service Basis</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    All online tools, calculators, file converters, code formatters, and utilities hosted on <strong>100ToolCrate</strong> are provided on an "as is" and "as available" basis without warranties of any kind, either express or implied, including but not limited to fitness for a particular purpose or accuracy of results.
  </p>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">2. Calculation & Conversion Accuracy</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    We aim for reliable calculations, conversions and formatting, but output can contain implementation errors, rounding differences or browser/library-specific behavior. Independently verify critical output before relying on it for official, legal, financial, medical or other high-impact applications.
  </p>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">3. No Professional Advice</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    The information and calculation results provided on 100ToolCrate do not constitute legal, tax, financial, engineering, or professional advice. Always seek the advice of a qualified professional for matters requiring official certification.
  </p>

  <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-color); margin-top: 2rem; margin-bottom: 1rem;">4. External Links Disclaimer</h2>
  <p style="margin-bottom: 1.25rem; color: var(--text-muted); line-height: 1.75;">
    100ToolCrate may contain links to external third-party websites or services. We do not monitor, endorse, or assume responsibility for the accuracy or practices of third-party external resources.
  </p>
</div>
`;

// 5. Contact Us Content
const contactContent = `
<div class="static-page-content" style="max-width: 900px; margin: 0 auto;">
  <p style="font-size: 1.05rem; line-height: 1.8; color: var(--text-color); margin-bottom: 2rem;">
    Have questions, feedback, bug reports, or partnership inquiries? We would love to hear from you. Please fill out the form below or send an email directly to our support team.
  </p>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2.5rem; margin-bottom: 3rem;">
    <!-- Working Form UI (FormSubmit AJAX with native POST fallback) -->
    <form id="contact-form" action="https://formsubmit.co/support@100toolcrate.com" method="POST" style="display: flex; flex-direction: column; gap: 1.25rem; background: var(--bg-subtle); border: 1px solid var(--border-light); padding: 2rem; border-radius: 1rem;">
      <input type="hidden" name="_subject" value="100ToolCrate Contact Form">
      <input type="text" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true" style="display: none;">
      <div>
        <label for="contact-name" style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-color); margin-bottom: 0.4rem;">Your Name *</label>
        <input id="contact-name" name="name" required type="text" maxlength="100" autocomplete="name" placeholder="John Doe" style="width: 100%; padding: 0.75rem 1rem; border-radius: 0.5rem; border: 1px solid var(--border-light); background: var(--card-bg); color: var(--text-color); font-size: 0.9rem;">
      </div>
      <div>
        <label for="contact-email" style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-color); margin-bottom: 0.4rem;">Your Email Address *</label>
        <input id="contact-email" name="email" required type="email" maxlength="200" autocomplete="email" placeholder="john@example.com" style="width: 100%; padding: 0.75rem 1rem; border-radius: 0.5rem; border: 1px solid var(--border-light); background: var(--card-bg); color: var(--text-color); font-size: 0.9rem;">
      </div>
      <div>
        <label for="contact-subject" style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-color); margin-bottom: 0.4rem;">Subject Category *</label>
        <select id="contact-subject" name="subject" required style="width: 100%; padding: 0.75rem 1rem; border-radius: 0.5rem; border: 1px solid var(--border-light); background: var(--card-bg); color: var(--text-color); font-size: 0.9rem;">
          <option value="general">General Support / Inquiry</option>
          <option value="bug">Report a Tool Bug</option>
          <option value="feature">Request a New Tool</option>
          <option value="adsense">AdSense & Sponsorships</option>
          <option value="privacy">Privacy & Security Disclosure</option>
        </select>
      </div>
      <div>
        <label for="contact-message" style="display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-color); margin-bottom: 0.4rem;">Your Message *</label>
        <textarea id="contact-message" name="message" required rows="5" maxlength="5000" placeholder="Describe your question or feedback in detail..." style="width: 100%; padding: 0.75rem 1rem; border-radius: 0.5rem; border: 1px solid var(--border-light); background: var(--card-bg); color: var(--text-color); font-size: 0.9rem; resize: vertical;"></textarea>
      </div>
      <div id="contact-form-status" class="form-status" role="status" aria-live="polite" style="display: none;"></div>
      <button type="submit" id="contact-submit-btn" class="btn btn-primary" style="padding: 0.85rem 1.5rem; font-weight: 700; cursor: pointer; border: none; border-radius: 0.5rem; background: var(--primary); color: #fff; font-size: 0.95rem;">Send Message</button>
    </form>

    <!-- Support Info Sidebar -->
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <div style="background: var(--bg-subtle); border: 1px solid var(--border-light); padding: 1.5rem; border-radius: 0.75rem;">
        <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-color); margin-bottom: 0.5rem;">📧 Direct Email Support</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.75rem;">For urgent technical questions or privacy inquiries:</p>
        <a href="mailto:support@100toolcrate.com" style="color: var(--primary); font-weight: 700; font-size: 0.95rem;">support@100toolcrate.com</a>
      </div>

      <div style="background: var(--bg-subtle); border: 1px solid var(--border-light); padding: 1.5rem; border-radius: 0.75rem;">
        <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-color); margin-bottom: 0.5rem;">⏱️ Response Expectations</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted);">We aim to review messages within 2–5 business days. This is a target, not a guaranteed response time; reproducible security issues are prioritized.</p>
      </div>

      <div style="background: var(--bg-subtle); border: 1px solid var(--border-light); padding: 1.5rem; border-radius: 0.75rem;">
        <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-color); margin-bottom: 0.5rem;">🛡️ Security Disclosures</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted);">Notice a security vulnerability? Please select "Privacy & Security Disclosure" in the contact form to reach our engineering team directly.</p>
      </div>
    </div>
  </div>
</div>
`;

const advertiseContent = `
<div class="static-page-content" style="max-width: 960px; margin: 0 auto;">
  <p style="color: var(--text-muted); font-size: 1.05rem; line-height: 1.8;">Reach people while they complete a specific task—not while they scroll past another generic banner. 100ToolCrate offers a small number of clearly labeled workflow sponsorships alongside optional AdSense advertising.</p>
  <div class="workflow-two-col" style="margin-top: 2rem;">
    <section class="workflow-info-card"><span class="workflow-eyebrow">30-day pilot · from $99</span><h2 style="margin-top: .6rem;">Workflow sponsor</h2><p style="color: var(--text-muted); line-height: 1.7;">One labeled card on a relevant workflow page. Suitable for a focused product, service, event, or educational resource. Placement is configured only after a written agreement.</p></section>
    <section class="workflow-info-card"><span class="workflow-eyebrow">30-day pilot · from $249</span><h2 style="margin-top: .6rem;">Workflow hub sponsor</h2><p style="color: var(--text-muted); line-height: 1.7;">One labeled card on the workflow directory. Best for a broader developer, design, document, or small-business offer. Limited to one hub sponsor at a time.</p></section>
  </div>
  <section style="margin: 2rem 0;">
    <h2 style="color: var(--text-color);">What is included</h2>
    <ul style="color: var(--text-muted); line-height: 1.9; padding-left: 1.3rem;">
      <li>A visible <strong>Sponsored</strong> label and a link with <code>rel="sponsored"</code>.</li>
      <li>A fixed 30-day pilot; no invented impression, click, lead, or conversion guarantees.</li>
      <li>Current privacy-friendly traffic evidence available on request before purchase.</li>
      <li>Editorial review for relevance, clarity, security, and accessibility.</li>
    </ul>
    <p style="color: var(--text-muted); line-height: 1.75;">Sponsorship does not buy search rankings, tool rankings, editorial reviews, user data, or followed links. Malware, deceptive claims, prohibited ad categories, and disguised advertising are not accepted. Rates are starting quotes, finalized in an insertion order; submitting this form does not charge you.</p>
  </section>
  <section class="workflow-info-card" id="inquiry">
    <span class="workflow-eyebrow">Sponsorship inquiry</span>
    <h2 style="margin: .6rem 0 1rem;">Tell us what you want to promote</h2>
    <form action="https://formsubmit.co/support@100toolcrate.com" method="POST" style="display: grid; gap: 1rem;">
      <input type="hidden" name="_subject" value="100ToolCrate sponsorship inquiry">
      <input type="hidden" name="_template" value="table">
      <input type="text" name="_honey" tabindex="-1" autocomplete="off" style="display:none" aria-hidden="true">
      <label style="display:grid;gap:.4rem;color:var(--text-color);font-weight:650;">Name or company<input required name="company" autocomplete="organization" style="min-height:44px;padding:.75rem;border:1px solid var(--border-light);border-radius:.65rem;background:var(--bg-subtle);color:var(--text-color);"></label>
      <label style="display:grid;gap:.4rem;color:var(--text-color);font-weight:650;">Work email<input required type="email" name="email" autocomplete="email" style="min-height:44px;padding:.75rem;border:1px solid var(--border-light);border-radius:.65rem;background:var(--bg-subtle);color:var(--text-color);"></label>
      <label style="display:grid;gap:.4rem;color:var(--text-color);font-weight:650;">Website<input required type="url" name="website" inputmode="url" placeholder="https://" style="min-height:44px;padding:.75rem;border:1px solid var(--border-light);border-radius:.65rem;background:var(--bg-subtle);color:var(--text-color);"></label>
      <label style="display:grid;gap:.4rem;color:var(--text-color);font-weight:650;">Placement<select name="placement" style="min-height:44px;padding:.75rem;border:1px solid var(--border-light);border-radius:.65rem;background:var(--bg-subtle);color:var(--text-color);"><option>Relevant workflow — 30-day pilot</option><option>Workflow hub — 30-day pilot</option><option>Not sure; recommend a fit</option></select></label>
      <label style="display:grid;gap:.4rem;color:var(--text-color);font-weight:650;">Budget range<select name="budget" style="min-height:44px;padding:.75rem;border:1px solid var(--border-light);border-radius:.65rem;background:var(--bg-subtle);color:var(--text-color);"><option>$99–$248</option><option>$249–$499</option><option>$500+</option></select></label>
      <label style="display:grid;gap:.4rem;color:var(--text-color);font-weight:650;">Offer and target workflow<textarea required name="message" rows="5" minlength="30" placeholder="What is the offer, who is it for, and which workflow or audience should it reach?" style="padding:.75rem;border:1px solid var(--border-light);border-radius:.65rem;background:var(--bg-subtle);color:var(--text-color);resize:vertical;"></textarea></label>
      <button class="workflow-primary-link" type="submit" style="border:0;cursor:pointer;justify-self:start;">Send sponsorship inquiry</button>
      <p style="margin:0;color:var(--text-muted);font-size:.78rem;line-height:1.6;">This form is delivered by FormSubmit to support@100toolcrate.com. Prefer email? <a href="mailto:support@100toolcrate.com?subject=Sponsorship%20inquiry" style="color:var(--primary);">Write directly</a>.</p>
    </form>
  </section>
</div>`;

const agentsContent = `
<div class="static-page-content" style="max-width: 1050px; margin: 0 auto;">
  <section class="workflow-hero">
    <div><span class="workflow-eyebrow">REST + Model Context Protocol</span><h2 style="font-size: clamp(1.8rem,4vw,3rem); line-height: 1.1; margin: .6rem 0; color: var(--text-color);">Discoverable tools that agents can actually execute.</h2><p>${agentToolIds.size} deterministic text, JSON, time and calculation tools are available through a real server API. The other ${TOTAL_TOOL_COUNT - agentToolIds.size} file, canvas, camera and document tools remain browser-only because they need local user input and browser APIs.</p></div>
    <div class="workflow-hero-meta"><div class="workflow-meta-item"><small>Discovery</small><strong>GET /api/v1/tools</strong></div><div class="workflow-meta-item"><small>MCP endpoint</small><strong>POST /api/mcp · 2025-06-18</strong></div></div>
  </section>
  <div class="workflow-two-col">
    <section class="workflow-info-card"><h2>REST quick start</h2><p>List executable tools and their schemas:</p><pre class="agent-code">curl https://100toolcrate.com/api/v1/tools</pre><p>Format JSON with a real execution call:</p><pre class="agent-code">curl -X POST https://100toolcrate.com/api/v1/tools/json-formatter/execute \\
  -H 'Content-Type: application/json' \\
  -d '{"json":"{\\"ok\\":true}","indent":2}'</pre></section>
    <section class="workflow-info-card"><h2>MCP quick start</h2><p>Connect a client to <code>https://100toolcrate.com/api/mcp</code>. The server supports initialize, ping, tools/list and tools/call over Streamable HTTP JSON responses.</p><pre class="agent-code">{"jsonrpc":"2.0","id":1,"method":"tools/call",
 "params":{"name":"word-counter",
 "arguments":{"text":"one two three"}}}</pre><p><a href="/.well-known/mcp/server-card.json" style="color:var(--primary);">Machine-readable server card</a> · <a href="/api/openapi.json" style="color:var(--primary);">OpenAPI specification</a></p></section>
  </div>
  <section class="workflow-info-card" style="margin: 1.5rem 0;"><h2>Data handling and limits</h2><p>Execution inputs and outputs are processed transiently and are not persisted by the execution endpoint. Do not send secrets, personal data, access tokens or regulated datasets. Requests are limited to 16 KB, results to 256 KB, and calls are rate limited. This is different from free browser tools, where supported file processing stays on your device, and from paid services, where files are transferred only through an agreed channel.</p></section>
  <section data-agent-playground aria-labelledby="agent-playground-title">
    <div class="section-header"><h2 id="agent-playground-title">Live API playground</h2><span class="workflow-save-status" id="agent-tool-status" role="status">Loading the real tool catalog…</span></div>
    <div class="workflow-two-col">
      <div class="workflow-info-card"><label style="display:grid;gap:.5rem;color:var(--text-color);font-weight:700;">Executable tool<select id="agent-tool-select" class="workflow-search" style="width:100%;"></select></label><p id="agent-tool-description" style="margin-top:1rem;"></p><label style="display:grid;gap:.5rem;color:var(--text-color);font-weight:700;">JSON arguments<textarea id="agent-tool-input" class="agent-input" rows="12" spellcheck="false">{}</textarea></label><button id="agent-tool-execute" type="button" class="workflow-primary-link" style="border:0;cursor:pointer;margin-top:1rem;">Execute on server</button></div>
      <div class="workflow-info-card"><h3 style="margin-top:0;">Response</h3><pre id="agent-tool-output" class="agent-output" aria-live="polite">Waiting for the catalog.</pre><details><summary>Input schema</summary><pre id="agent-tool-schema" class="agent-output"></pre></details></div>
    </div>
  </section>
  <section class="workflow-info-card" style="margin-top:1.5rem;"><h2>Need an integration delivered?</h2><p>The Agent Tool Integration service can wire up to three of these tools into one existing agent workflow, including validation, error handling and repeatable tests. It does not buy placement in ChatGPT, Claude, Gemini or any other agent's recommendations.</p><a class="workflow-primary-link" href="/services?service=agent-tool-integration">View integration scope — from $399</a></section>
</div>`;

const servicesContent = `
<div data-services-catalog style="max-width: 1100px; margin: 0 auto;">
  <script type="application/json" id="services-data">${JSON.stringify(servicesData).replace(/</g, '\\u003c')}</script>
  <p style="font-size:1.05rem;line-height:1.8;">Productized, manually delivered work for people who would rather delegate than operate the tools themselves. Every engagement starts with scope approval. The estimate below is not a charge, a booking, or a guarantee of availability.</p>
  <div class="workflow-grid" style="margin:2rem 0;">
    ${servicesData.map(service => `<article class="workflow-info-card" id="${escapeHtml(service.slug)}"><span class="workflow-card-icon" aria-hidden="true"><span class="material-symbols-outlined">${escapeHtml(service.icon)}</span></span><span class="workflow-eyebrow">From $${service.price} USD</span><h2 style="margin:.6rem 0;">${escapeHtml(service.name)}</h2><p>${escapeHtml(service.summary)}</p><h3>Included</h3><ul class="workflow-settings">${service.deliverables.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul><p><strong>${escapeHtml(service.delivery)}</strong></p><details style="margin:1rem 0;"><summary>Requirements and exclusions</summary><p><strong>What we need:</strong> ${escapeHtml(service.requirements)}</p><p><strong>Not included:</strong> ${escapeHtml(service.notIncluded)}</p></details><button type="button" class="workflow-primary-link" style="border:0;cursor:pointer;" data-select-service="${escapeHtml(service.slug)}">Configure this service</button></article>`).join('\n')}
  </div>
  <section class="workflow-info-card" id="service-inquiry">
    <span class="workflow-eyebrow">Scope estimator + inquiry</span><h2 style="margin:.6rem 0;">Build a written starting brief</h2>
    <form action="https://formsubmit.co/support@100toolcrate.com" method="POST" style="display:grid;gap:1rem;">
      <input type="hidden" name="_subject" value="100ToolCrate service inquiry"><input type="hidden" name="_template" value="table"><input type="text" name="_honey" tabindex="-1" autocomplete="off" style="display:none" aria-hidden="true">
      <input type="hidden" name="selected_service"><input type="hidden" name="scope_estimate"><input type="hidden" name="selected_addons">
      <label style="display:grid;gap:.45rem;font-weight:700;color:var(--text-color);">Service<select id="service-select" name="service" class="workflow-search" style="width:100%;"></select></label>
      <div id="service-addons" style="display:grid;gap:.65rem;"></div>
      <div class="workflow-progress-panel" style="margin:0;"><strong id="service-estimate" style="font-size:1.15rem;color:var(--text-color);"></strong><p id="service-summary" style="margin:.5rem 0 0;"></p></div>
      <div class="workflow-two-col" style="margin:0;"><label style="display:grid;gap:.45rem;font-weight:700;color:var(--text-color);">Name<input required name="name" autocomplete="name" class="workflow-search" style="width:100%;"></label><label style="display:grid;gap:.45rem;font-weight:700;color:var(--text-color);">Work email<input required type="email" name="email" autocomplete="email" class="workflow-search" style="width:100%;"></label></div>
      <label style="display:grid;gap:.45rem;font-weight:700;color:var(--text-color);">Website or project URL (optional)<input type="url" name="project_url" inputmode="url" placeholder="https://" class="workflow-search" style="width:100%;"></label>
      <label style="display:grid;gap:.45rem;font-weight:700;color:var(--text-color);">What outcome do you need?<textarea required name="brief" rows="6" minlength="40" placeholder="Describe the current state, desired deliverable, constraints, and any deadline. Do not include passwords, secret keys or unnecessary personal data." class="agent-input"></textarea></label>
      <label class="service-addon"><input required type="checkbox" name="terms_acknowledged" value="yes"><span>I understand this sends an inquiry through FormSubmit, does not take payment, and requires written scope confirmation before work or file transfer.</span></label>
      <button type="submit" class="workflow-primary-link" style="border:0;cursor:pointer;justify-self:start;">Send inquiry for a written quote</button>
    </form>
  </section>
  <section style="margin:2rem 0;"><h2>How engagement works</h2><ol style="line-height:1.9;padding-left:1.3rem;"><li>You send the brief; no card is charged.</li><li>We confirm fit, scope, price, delivery target and an approved data-transfer channel in writing.</li><li>Only after agreement do you provide access or files. Remove secrets and unnecessary personal data first.</li><li>You review the deliverables listed for the selected service. Ongoing work, refunds and change requests are governed by the written quote.</li></ol><p>Free browser tools remain free. Paid work is separate, and no ranking, agent-recommendation, revenue, acceptance or compliance outcome is guaranteed.</p></section>
</div>`;

const editorialContent = `
<div class="static-page-content" style="max-width: 900px; margin: 0 auto;">
  <p style="font-size:1.05rem;">This policy explains how 100ToolCrate handles accuracy, tool lifecycle, comparisons, authors, testing, monetization and corrections. It exists to make limitations visible rather than to imply certification.</p>
  <h2>What we test</h2><p>The build validates every tool's registered handler, generated metadata, canonical URL, sitemap coverage and internal references. Backend tests exercise the real REST/MCP protocol, security boundaries, SQLite counters and deterministic execution functions. Production route tests check canonical URLs.</p><p>These checks do not prove that every file, browser, device, camera, PDF feature or third-party CDN response works. File-format support and practical size limits depend on the implementation and device. A page must not claim universal compatibility, lossless compression, guaranteed acceptance or “100% accuracy.”</p>
  <h2>Who writes and reviews</h2><p>Existing blog bylines identify <strong>Max, site maintainer</strong>, based on the repository's authorship data; no academic, medical, legal, tax or other professional credential is implied. Generated layout and validation scripts assist publication, but a large number of pages is not treated as evidence of quality. We do not use fabricated reviewer names, credentials, testimonials, user counts or traffic figures.</p>
  <h2>Tool lifecycle</h2><p>All ${TOTAL_TOOL_COUNT} current tools have registered browser handlers and recorded activity in the legacy aggregate counters. That small dataset is not enough to declare low-use tools unwanted. Tools are retired for verified obsolescence, unfixable security risk, or replacement by a maintained equivalent—not simply to make the catalog look smaller. Homepage placement is editorial and usage-informed; the full directory remains searchable.</p>
  <h2>Comparison pages</h2><p>The previous five competitor-alternative pages measured approximately 83–84% similarity and included unverified pricing, limit and superiority claims. They are marked <code>noindex,follow</code>, removed from the sitemap and unlinked from primary navigation until each can be rewritten with dated primary-source research. They are not presented as independent reviews.</p>
  <h2>Privacy distinctions</h2><ul><li><strong>Free browser tools:</strong> supported file/text transformations run locally; third-party library files may still be downloaded from CDNs.</li><li><strong>Public execution API/MCP:</strong> the selected text/data/calculation inputs are processed transiently on the server and are not persisted by that endpoint. Network infrastructure may keep standard logs.</li><li><strong>Contact, service and sponsor forms:</strong> submissions go to FormSubmit for delivery to the site operator.</li><li><strong>Paid service files:</strong> are not local-only. Transfer happens only after a written scope and approved channel are agreed.</li></ul>
  <h2>Money and independence</h2><p>Revenue options include consent-gated AdSense, labeled sponsorships, productized services and future paid products. Advertising does not buy followed links, tool rankings, editorial reviews or search rankings. Prices and scopes are published where practical; no invented conversion, revenue or client results are displayed.</p>
  <h2>Corrections</h2><p>Report a broken tool or incorrect claim through the <a href="/contact" style="color:var(--primary);">contact page</a>. Include the tool URL, browser, input type (not the sensitive file itself), expected behavior and observed error. Security reports should omit secrets and use the security-disclosure subject.</p>
  <p><strong>Last policy review:</strong> 2026-11-10. This date reflects an actual editorial change, not an automatically refreshed “updated” label.</p>
</div>`;

writePage('agents.html', 'For AI Agents & Developers', agentsContent, {
  seoTitle: 'AI Agent Tools API & MCP Server | 100ToolCrate',
  description: `Discover and execute ${agentToolIds.size} real text, JSON, time and calculation tools through REST or MCP. Includes schemas, live playground, limits and data handling.`,
  extraHead: `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebAPI', name: '100ToolCrate Public Tool API', description: 'Deterministic public text, JSON, time and calculator execution tools.', documentation: 'https://100toolcrate.com/agents', endpointDescription: 'https://100toolcrate.com/api/openapi.json', termsOfService: 'https://100toolcrate.com/terms', provider: { '@type': 'Organization', name: '100ToolCrate', url: 'https://100toolcrate.com/' } }).replace(/</g, '\\u003c')}</script>`,
  scripts: `<script src="/assets/js/agent-playground.js?v=${ASSET_VERSION}" defer></script>`
});
writePage('services.html', 'Done-for-You Digital Services', servicesContent, {
  seoTitle: 'Agent Integration, Technical SEO, Image & Data Services | 100ToolCrate',
  description: 'Scoped done-for-you services: AI agent integration, private VPS deployment, technical SEO, website image optimization and JSON/CSV cleanup. Request a written quote.',
  extraHead: `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList', name: '100ToolCrate digital services', itemListElement: servicesData.map((service, index) => ({ '@type': 'ListItem', position: index + 1, item: { '@type': 'Service', name: service.name, description: service.summary, provider: { '@type': 'Organization', name: '100ToolCrate' }, offers: { '@type': 'Offer', priceCurrency: 'USD', priceSpecification: { '@type': 'PriceSpecification', minPrice: service.price, priceCurrency: 'USD' }, url: `https://100toolcrate.com/services?service=${service.slug}` } } })) }).replace(/</g, '\\u003c')}</script>`,
  scripts: `<script src="/assets/js/services.js?v=${ASSET_VERSION}" defer></script>`
});
writePage('editorial-policy.html', 'Editorial, Testing & Monetization Policy', editorialContent, {
  seoTitle: 'Editorial, Tool Testing & Monetization Policy | 100ToolCrate',
  description: 'How 100ToolCrate handles accuracy, tool testing and retirement, authors, comparisons, privacy distinctions, monetization and corrections.'
});
writePage('about.html', 'About Us', aboutContent);
writePage('advertise.html', 'Advertise', advertiseContent);
writePage('privacy-policy.html', 'Privacy Policy', privacyContent);
writePage('terms.html', 'Terms of Service', termsContent);
writePage('disclaimer.html', 'Disclaimer', disclaimerContent);
writePage('contact.html', 'Contact Us', contactContent);

// Generate Homepage (index.html)
const homeHtml = `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
  ${head}
  <title>Free Online Tools: PDF, Image, JSON & SEO | 100ToolCrate</title>
  <meta name="description" content="Use 122 free, private browser tools for PDFs, images, text, JSON, SEO and QR codes. No uploads or sign-up, plus practical step-by-step workflows.">
  <meta property="og:title" content="Free Online Tools & Practical Workflows | 100ToolCrate">
  <meta property="og:description" content="Private, browser-based PDF, image, developer, SEO and QR tools—plus step-by-step workflows for real tasks.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://100toolcrate.com/">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://100toolcrate.com/">
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Organization', '@id': 'https://100toolcrate.com/#organization', name: '100ToolCrate', url: 'https://100toolcrate.com/', logo: 'https://100toolcrate.com/assets/icon-512.png', email: 'support@100toolcrate.com', contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: 'support@100toolcrate.com', url: 'https://100toolcrate.com/contact' } },
      { '@type': 'WebSite', '@id': 'https://100toolcrate.com/#website', name: '100ToolCrate', url: 'https://100toolcrate.com/', publisher: { '@id': 'https://100toolcrate.com/#organization' }, potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: 'https://100toolcrate.com/tools?q={search_term_string}' }, 'query-input': 'required name=search_term_string' } }
    ]
  }).replace(/</g, '\\u003c')}</script>
</head>
<body>
  ${header}

  <main class="main-content" id="main-content" tabindex="-1">
    <!-- Hero Section -->
    <section class="hero-section">
      <h1 class="hero-title">
        The Utility Crate for Modern Creators
      </h1>
      <p class="hero-subtitle">
        ${TOTAL_TOOL_COUNT} free online tools for developers, designers, and students. No uploads, no sign-up, just practical workflows and precise browser-based utilities.
      </p>

      <!-- Search Box -->
      <div class="hero-search-box">
        <input id="global-search" placeholder="Search for a tool... (e.g., 'JSON Format', 'Compress JPG')" type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="search-preview" aria-label="Search tools" spellcheck="false"/>
        <button id="search-submit-btn" class="search-submit-btn" aria-label="Submit search">
          <span class="material-symbols-outlined" style="font-size: 22px;">search</span>
        </button>
        <div id="search-preview" class="search-preview" role="listbox" aria-label="Search suggestions"></div>
      </div>

      <!-- Filter Pills -->
      <div class="filter-pills" id="home-categories">
        ${categoryPillsHtml}
      </div>
    </section>

    <!-- Featured Modules Section (Bento Grid) -->
    <section class="most-used-section" style="margin-bottom: 3rem;">
      <div class="section-header">
        <h2 class="section-title">Most Used Modules</h2>
        <a class="section-link" href="/tools">
          View All <span class="material-symbols-outlined" style="font-size: 18px;">arrow_forward</span>
        </a>
      </div>
      <p style="margin: -0.5rem 0 1.25rem; color: var(--text-muted); font-size: 0.88rem;">Ranked by the site's anonymous aggregate tool counters, not by estimated global traffic.</p>
      <div class="featured-bento-grid">
        ${popularTools.map(tool => getToolHtml(tool)).join('\n        ')}
      </div>
    </section>

    <!-- High-intent task workflows -->
    <section class="most-used-section" style="margin-bottom: 3.5rem;" aria-labelledby="home-workflows-title">
      <div class="section-header">
        <div>
          <span class="tool-section-kicker">Finish the whole task</span>
          <h2 class="section-title" id="home-workflows-title">Step-by-step workflows</h2>
        </div>
        <a class="section-link" href="/workflows">Explore all ${workflowsData.length} <span class="material-symbols-outlined" style="font-size: 18px;">arrow_forward</span></a>
      </div>
      <p style="max-width: 720px; margin: -0.5rem 0 1.25rem; color: var(--text-muted); line-height: 1.7;">Follow a practical sequence instead of guessing which tool comes next. Progress stays on your device.</p>
      <div class="workflow-home-grid">
        ${workflowsData.slice(0, 4).map(workflow => workflowCard(workflow, 'h3')).join('')}
      </div>
    </section>

    <section class="workflow-info-card" style="margin-bottom: 3.5rem; display: flex; gap: 1.25rem; align-items: center; justify-content: space-between; flex-wrap: wrap;" aria-labelledby="home-services-title">
      <div style="max-width: 760px;"><span class="workflow-eyebrow">Prefer a done-for-you result?</span><h2 id="home-services-title" style="margin: .55rem 0; color: var(--text-color);">Delegate the workflow, not just the tool.</h2><p style="margin: 0; color: var(--text-muted); line-height: 1.7;">Scoped agent integrations, technical SEO remediation, image optimization and data cleanup—with explicit deliverables and no ranking or revenue promises. AI agents can also execute ${agentToolIds.size} tools through the public REST and MCP interfaces.</p></div>
      <div style="display:flex;gap:.65rem;flex-wrap:wrap;"><a class="workflow-primary-link" href="/services">View services</a><a class="workflow-share" style="margin:0;" href="/agents">For AI agents</a></div>
    </section>

    <!-- Utility Grid -->
    <section style="margin-bottom: 3.5rem;">
      <div class="section-header">
        <h2 class="section-title">Utility Grid</h2>
      </div>
      <div class="section-header" style="margin-top: -1rem; margin-bottom: 1rem;">
        <p style="color: var(--text-muted); margin: 0;">A focused starting set. The full directory and search include all ${TOTAL_TOOL_COUNT} tools.</p>
        <a class="section-link" href="/tools">All ${TOTAL_TOOL_COUNT} tools <span class="material-symbols-outlined" style="font-size: 18px;">arrow_forward</span></a>
      </div>
      <div class="tools-grid" id="featured-tools">
        ${homepageTools.map((t, i) => getToolHtml(t, i)).join('')}
      </div>
      <div id="search-no-results" style="display:none; text-align: center; padding: 3rem; color: var(--text-muted);">
        No featured tool matches. <a href="/tools" style="color: var(--primary);">Search the full directory</a>.
      </div>
    </section>
  </main>

  ${footer}
  <script src="/assets/js/search.js?v=${ASSET_VERSION}" defer></script>
</body>
</html>`;
fs.writeFileSync(path.join(process.cwd(), 'index.html'), stripLineEndWhitespace(homeHtml));

// Generate tools.html (Categories / All Tools Page)
const toolsHtml = `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
  ${head}
  <title>All Tools - 100ToolCrate</title>
  <meta name="description" content="Browse 120+ free, private, browser-based tools - image, PDF, text, SEO, QR, calculators, productivity timers and developer utilities. No sign-up, 100% client-side.">
  <link rel="canonical" href="https://100toolcrate.com/tools">
</head>
<body>
  ${header}
  <main class="main-content" id="main-content" tabindex="-1">
    <div style="max-width: 1280px; margin: 0 auto 1.25rem; padding: 0 1rem;">
      <a id="nav-back-btn" class="nav-back-btn" href="/" aria-label="Go back to parent page" style="display: none;">
        <span class="material-symbols-outlined" style="font-size: 18px;">arrow_back</span>
        <span class="back-text">Back</span>
      </a>
    </div>
    <div style="text-align: center; margin-bottom: 2.5rem;">
      <h1 style="font-size: 2.5rem; font-weight: 900; color: var(--text-color); margin-bottom: 0.5rem; letter-spacing: -0.03em;">All Tools Directory</h1>
      <p style="color: var(--text-muted); font-size: 1.05rem; max-width: 36rem; margin: 0 auto;">Browse our complete collection of 100+ browser-based tools categorized by functionality.</p>

      <!-- Filter Pills -->
      <div class="filter-pills" id="tools-categories" style="margin-top: 1.5rem;">
        ${categoryPillsHtml}
      </div>
    </div>
    <h2 class="sr-only">Browse all tools</h2>
    <div class="tools-grid" id="all-tools-grid">
      ${mixedToolsData.map((t, i) => getToolHtml(t, i)).join('')}
    </div>
    <div id="search-no-results" style="display:none; text-align: center; padding: 3rem; color: var(--text-muted);">
      No tools found matching your search.
    </div>
  </main>
  ${footer}
  <script src="/assets/js/search.js?v=${ASSET_VERSION}" defer></script>
</body>
</html>`;
fs.writeFileSync(path.join(process.cwd(), 'tools.html'), stripLineEndWhitespace(toolsHtml));

// Build assets/js/search.js with embedded tools catalog for universal search support across all pages
const searchCatalog = toolsData.map(t => ({
  id: t.id,
  title: t.title,
  desc: t.desc,
  cat: t.cat,
  icon: getMaterialIconName(t.title, t.cat, t.id)
}));

const searchJsCode = `document.addEventListener('DOMContentLoaded', () => {
    const ALL_TOOLS = ${JSON.stringify(searchCatalog)};

    const searchInput = document.getElementById('global-search') || document.getElementById('global-search-input');
    const searchSubmitBtn = document.getElementById('search-submit-btn');
    const searchPreview = document.getElementById('search-preview');
    const toolsGrid = document.getElementById('featured-tools') || document.getElementById('all-tools-grid');
    const noResults = document.getElementById('search-no-results');
    const catBtns = document.querySelectorAll('.filter-btn');

    const catColorMap = {
        'image': { text: '#60A5FA', border: 'rgba(96, 165, 250, 0.3)', bg: 'rgba(96, 165, 250, 0.12)' },
        'dev': { text: '#06B6D4', border: 'rgba(6, 182, 212, 0.3)', bg: 'rgba(6, 182, 212, 0.12)' },
        'pdf': { text: '#FB7185', border: 'rgba(251, 113, 133, 0.3)', bg: 'rgba(251, 113, 133, 0.12)' },
        'text': { text: '#EAB308', border: 'rgba(234, 179, 8, 0.3)', bg: 'rgba(234, 179, 8, 0.12)' },
        'seo': { text: '#34D399', border: 'rgba(52, 211, 153, 0.3)', bg: 'rgba(52, 211, 153, 0.12)' },
        'qr': { text: '#818CF8', border: 'rgba(129, 140, 248, 0.3)', bg: 'rgba(129, 140, 248, 0.12)' },
        'calc': { text: '#FBBF24', border: 'rgba(251, 191, 36, 0.3)', bg: 'rgba(251, 191, 36, 0.12)' },
        'productivity': { text: '#FB923C', border: 'rgba(251, 146, 60, 0.3)', bg: 'rgba(251, 146, 60, 0.12)' },
        'personality': { text: '#F472B6', border: 'rgba(244, 114, 182, 0.35)', bg: 'rgba(244, 114, 182, 0.12)' }
    };

    let currentFilter = 'all';
    let currentQuery = '';
    let showAllTools = false;
    let debounceTimer;

    function cleanText(text) {
        return (text || '').toLowerCase().trim();
    }

    function editDistance(a, b, maxDist) {
        if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
        const m = a.length, n = b.length;
        let prev = Array.from({length: n + 1}, (_, i) => i);
        let curr = new Array(n + 1);
        for (let i = 1; i <= m; i++) {
            curr[0] = i;
            let rowMin = i;
            for (let j = 1; j <= n; j++) {
                const cost = a[i-1] === b[j-1] ? 0 : 1;
                curr[j] = Math.min(prev[j] + 1, curr[j-1] + 1, prev[j-1] + cost);
            }
            rowMin = Math.min(...curr);
            if (rowMin > maxDist) return maxDist + 1;
            [prev, curr] = [curr, prev];
        }
        return prev[n];
    }

    function matchToolQuery(q, title, desc, cat, toolId) {
        const cleanQ = cleanText(q);
        if (!cleanQ) return true;

        const qWords = cleanQ.split(/\\s+/).filter(w => w.length > 0);
        if (qWords.length === 0) return true;

        const fullText = (title + ' ' + desc + ' ' + cat + ' ' + (toolId || '')).toLowerCase();
        const textWords = fullText.split(/[\\s\\-\\/\\,\\.]+/).filter(w => w.length > 0);

        return qWords.every(qWord => {
            if (fullText.includes(qWord)) return true;
            for (let i = 0; i < textWords.length; i++) {
                const tw = textWords[i];
                if (tw.startsWith(qWord)) return true;
                if (qWord.length >= 4 && tw.length >= 4) {
                    const maxDist = qWord.length <= 5 ? 1 : 2;
                    if (editDistance(qWord, tw, maxDist) <= maxDist) return true;
                }
            }
            return false;
        });
    }

    function getMatchingTools(query) {
        const cleanQ = cleanText(query);
        if (!cleanQ) return [];

        return ALL_TOOLS.filter(tool => {
            return matchToolQuery(cleanQ, tool.title, tool.desc, tool.cat, tool.id);
        });
    }

    function hidePreview() {
        if (!searchPreview) return;
        searchPreview.classList.remove('active');
        searchPreview.replaceChildren();
        if (searchInput) searchInput.setAttribute('aria-expanded', 'false');
    }

    function renderPreview(query) {
        if (!searchPreview) return;
        const q = cleanText(query);
        if (!q) {
            hidePreview();
            return;
        }

        const matches = getMatchingTools(q).slice(0, 7);
        searchPreview.replaceChildren();

        if (!matches.length) {
            const empty = document.createElement('div');
            empty.className = 'search-preview-empty';
            empty.style.cssText = 'padding: 0.85rem; color: var(--text-muted); font-size: 0.9rem; text-align: center;';
            empty.textContent = 'No tools found matching your search';
            searchPreview.appendChild(empty);
        } else {
            matches.forEach(tool => {
                const item = document.createElement('a');
                item.className = 'search-preview-item';
                item.href = \`/tools/\${tool.id}\`;
                item.setAttribute('role', 'option');

                const catKey = (tool.cat || '').toLowerCase();
                const c = catColorMap[catKey] || { text: '#06B6D4', border: 'rgba(6, 182, 212, 0.3)', bg: 'rgba(6, 182, 212, 0.12)' };

                const iconBox = document.createElement('div');
                iconBox.className = 'icon-box';
                iconBox.style.cssText = \`margin-bottom:0; width:2.25rem; height:2.25rem; border-radius:0.5rem; color:\${c.text}; background-color:\${c.bg}; display:flex; align-items:center; justify-content:center; flex-shrink:0;\`;

                const iconSpan = document.createElement('span');
                iconSpan.className = 'material-symbols-outlined';
                iconSpan.style.fontSize = '20px';
                iconSpan.textContent = tool.icon || 'build';
                iconBox.appendChild(iconSpan);

                const info = document.createElement('div');
                info.className = 'search-preview-info';

                const title = document.createElement('span');
                title.className = 'search-preview-title';
                title.textContent = tool.title;
                info.appendChild(title);

                const badge = document.createElement('span');
                badge.className = 'card-category-badge';
                badge.dataset.cat = catKey;
                badge.style.cssText = 'position:static; top:auto; right:auto; margin-left:auto; flex-shrink:0; font-size:0.65rem; font-weight:800; padding:0.2rem 0.55rem; border-radius:9999px; text-transform:uppercase;';
                badge.textContent = (tool.cat || '').toUpperCase();

                item.append(iconBox, info, badge);
                searchPreview.appendChild(item);
            });
        }

        searchPreview.classList.add('active');
        if (searchInput) searchInput.setAttribute('aria-expanded', 'true');
    }

    function updateGrid() {
        if (!toolsGrid) return;
        const cards = toolsGrid.querySelectorAll('.tool-card');
        let visibleCount = 0;
        const qClean = cleanText(currentQuery);
        const isSearching = qClean.length > 0;

        const mostUsedSection = document.querySelector('.most-used-section');
        if (mostUsedSection) {
            mostUsedSection.style.display = isSearching ? 'none' : 'block';
        }

        cards.forEach((card, index) => {
            const titleEl = card.querySelector('h4, h3');
            const title = titleEl ? titleEl.textContent : '';
            const descEl = card.querySelector('p');
            const desc = descEl ? descEl.textContent : '';
            const cat = card.getAttribute('data-category') || '';
            const toolId = card.getAttribute('data-tool-id') || '';

            const matchesSearch = isSearching ? matchToolQuery(qClean, title, desc, cat, toolId) : true;
            const matchesCat = currentFilter === 'all' || cat.toLowerCase() === currentFilter.toLowerCase();

            const shouldShow = matchesSearch && matchesCat;

            if (shouldShow) {
                if (!isSearching && currentFilter === 'all' && toolsGrid.id === 'featured-tools') {
                    card.style.display = showAllTools || index < 16 ? 'flex' : 'none';
                } else {
                    card.style.display = 'flex';
                }
                if (card.style.display === 'flex') visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (noResults) {
            noResults.style.display = visibleCount === 0 ? 'block' : 'none';
        }
    }

    function performSearchExecution() {
        hidePreview();
        const q = searchInput ? searchInput.value.trim() : '';
        if (!q) return;

        if (toolsGrid && toolsGrid.id !== 'featured-tools') {
            currentQuery = q.toLowerCase();
            showAllTools = true;
            currentFilter = 'all';
            catBtns.forEach(b => {
                if (b.getAttribute('data-filter') === 'all') {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });
            updateGrid();
            const gridSection = toolsGrid.closest('section') || toolsGrid;
            gridSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            window.location.href = \`/tools?q=\${encodeURIComponent(q)}\`;
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const val = e.target.value;
            renderPreview(val);
            if (toolsGrid) {
                currentQuery = val.toLowerCase().trim();
                debounceTimer = setTimeout(updateGrid, 250);
            }
        });

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim()) {
                renderPreview(searchInput.value);
            }
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearchExecution();
            } else if (e.key === 'Escape') {
                hidePreview();
            }
        });
    }

    if (searchSubmitBtn) {
        searchSubmitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            performSearchExecution();
        });
    }

    document.addEventListener('click', (e) => {
        if (!searchPreview || !searchPreview.classList.contains('active')) return;
        if (searchInput && (e.target === searchInput || searchInput.contains(e.target))) return;
        if (searchPreview.contains(e.target)) return;
        if (searchSubmitBtn && (e.target === searchSubmitBtn || searchSubmitBtn.contains(e.target))) return;
        hidePreview();
    });

    catBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            hidePreview();
            catBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentFilter = btn.getAttribute('data-filter');
            showAllTools = currentFilter === 'all';
            updateGrid();
        });
    });

    const urlParams = new URLSearchParams(window.location.search);
    const qParam = urlParams.get('q');
    if (qParam && searchInput) {
        searchInput.value = qParam;
        currentQuery = qParam.toLowerCase().trim();
        showAllTools = true;
        updateGrid();
    }

    // Deep-linking: /tools?cat=image (used by the Categories nav dropdown and sidebar)
    const validFilters = ['image', 'dev', 'pdf', 'text', 'seo', 'qr', 'calc', 'productivity', 'personality'];
    const catParam = (urlParams.get('cat') || '').toLowerCase().trim();
    if (toolsGrid && catParam) {
        if (catParam === 'all') {
            // default view; nothing to do
        } else if (validFilters.includes(catParam)) {
            currentFilter = catParam;
            showAllTools = false;
            catBtns.forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-filter') === catParam);
            });
            updateGrid();
            const gridSection = toolsGrid.closest('main') || toolsGrid;
            gridSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
});`;

fs.writeFileSync(path.join(process.cwd(), 'assets/js/search.js'), searchJsCode);

// Generate search-intent workflow pages from the individually authored dataset.
function generateWorkflowPages() {
  const outDir = path.join(process.cwd(), 'workflows');
  fs.mkdirSync(outDir, { recursive: true });
  const categories = [...new Set(workflowsData.map(workflow => workflow.category))];
  const workflowScript = `<script src="/assets/js/workflows.js?v=${ASSET_VERSION}" defer></script>`;

  const indexSchemas = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '100ToolCrate step-by-step workflows',
    numberOfItems: workflowsData.length,
    itemListElement: workflowsData.map((workflow, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: workflow.title,
      url: `https://100toolcrate.com/workflows/${workflow.slug}`
    }))
  };

  const indexHtml = `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
  ${head}
  <title>Free Step-by-Step Online Tool Workflows | 100ToolCrate</title>
  <meta name="description" content="Complete real tasks with free, private browser tools: prepare email PDFs, optimize product images, debug JSON, check SEO and build trackable QR campaigns.">
  <meta property="og:title" content="Step-by-Step Online Tool Workflows">
  <meta property="og:description" content="Practical, privacy-first workflows that connect the right free tools in the right order.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://100toolcrate.com/workflows">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://100toolcrate.com/workflows">
  <script type="application/ld+json">${JSON.stringify(indexSchemas).replace(/</g, '\\u003c')}</script>
</head>
<body>
  ${header}
  <main class="main-content" id="main-content" tabindex="-1">
    <section class="workflow-hero">
      <div>
        <span class="workflow-eyebrow">Task playbooks · ${workflowsData.length} guides</span>
        <h1>Finish the task, not just one step.</h1>
        <p>Each workflow connects proven browser tools in a deliberate order, with concrete settings, quality checks and common mistakes. No account, no uploads, and no artificial progress tracking—your checklist stays on this device.</p>
      </div>
      <div class="workflow-hero-meta">
        <div class="workflow-meta-item"><small>Best for</small><strong>Recurring document, web, marketing and developer tasks</strong></div>
        <div class="workflow-meta-item"><small>Privacy</small><strong>Files are processed locally; progress uses local browser storage</strong></div>
      </div>
    </section>
    <div class="workflow-toolbar">
      <input class="workflow-search" id="workflow-search" type="search" placeholder="Search workflows, outcomes or tools" aria-label="Search workflows">
      <span class="workflow-result-count" id="workflow-result-count" role="status">${workflowsData.length} workflows</span>
    </div>
    <div class="workflow-filter-row" style="margin-bottom: 1.5rem;" aria-label="Filter workflows">
      <button type="button" class="filter-btn active" data-workflow-filter="all" aria-pressed="true">All workflows</button>
      ${categories.map(category => `<button type="button" class="filter-btn" data-workflow-filter="${escapeHtml(category)}" aria-pressed="false">${escapeHtml(category)}</button>`).join('\n      ')}
    </div>
    <div class="workflow-grid" data-workflow-grid>
      ${workflowsData.map(workflow => workflowCard(workflow)).join('\n      ')}
    </div>
    <div class="workflow-info-card" id="workflow-no-results" hidden style="margin-top: 1rem; text-align: center; color: var(--text-muted);">No workflow matches those filters. Try a broader task or choose All workflows.</div>
    ${renderSponsor('hub')}
  </main>
  ${footer}
  ${workflowScript}
</body>
</html>`;
  fs.writeFileSync(path.join(outDir, 'index.html'), stripLineEndWhitespace(indexHtml));

  workflowsData.forEach(workflow => {
    const canonical = `https://100toolcrate.com/workflows/${workflow.slug}`;
    const related = (workflow.related || []).map(slug => workflowBySlug.get(slug)).filter(Boolean);
    const stepsHtml = workflow.steps.map((step, index) => {
      const tool = toolById.get(step.tool);
      return `
        <article class="workflow-step-card" id="step-${index + 1}">
          <div class="workflow-step-head">
            <span class="workflow-step-number" aria-hidden="true">${index + 1}</span>
            <h2>${escapeHtml(step.title)}</h2>
            <label class="workflow-check"><input type="checkbox" data-workflow-step="${index}" aria-label="Mark step ${index + 1} complete"><span>Done</span></label>
          </div>
          <div class="workflow-step-body">
            <p>${escapeHtml(step.body)}</p>
            <ul class="workflow-settings">${step.settings.map(setting => `<li>${escapeHtml(setting)}</li>`).join('')}</ul>
            <a class="workflow-tool-link" href="/tools/${escapeHtml(step.tool)}" target="_blank" rel="noopener"><span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>${escapeHtml(step.action)}<span class="sr-only"> using ${escapeHtml(tool.title)} (opens in a new tab)</span></a>
            <div style="margin-top: 0.55rem; color: var(--text-muted); font-size: 0.78rem;">Tool: ${escapeHtml(tool.title)} · ${escapeHtml(tool.desc)}</div>
          </div>
        </article>`;
    }).join('\n');

    const faqsHtml = workflow.faqs.map(faq => `<details class="tool-faq-item"><summary class="tool-faq-question"><span>${escapeHtml(faq.q)}</span><span class="material-symbols-outlined tool-faq-icon" aria-hidden="true">add</span></summary><p class="tool-faq-answer">${escapeHtml(faq.a)}</p></details>`).join('\n');
    const schemas = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': canonical,
          url: canonical,
          name: workflow.seoTitle,
          description: workflow.description,
          isPartOf: { '@type': 'WebSite', name: '100ToolCrate', url: 'https://100toolcrate.com/' }
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://100toolcrate.com/' },
            { '@type': 'ListItem', position: 2, name: 'Workflows', item: 'https://100toolcrate.com/workflows' },
            { '@type': 'ListItem', position: 3, name: workflow.shortTitle, item: canonical }
          ]
        },
        {
          '@type': 'HowTo',
          name: workflow.title,
          description: workflow.description,
          step: workflow.steps.map((step, index) => ({
            '@type': 'HowToStep',
            position: index + 1,
            name: step.title,
            text: `${step.body} ${step.settings.join('. ')}`,
            url: `https://100toolcrate.com/tools/${step.tool}`
          })),
          tool: workflow.steps.map(step => ({ '@type': 'HowToTool', name: toolById.get(step.tool).title }))
        },
        {
          '@type': 'FAQPage',
          mainEntity: workflow.faqs.map(faq => ({
            '@type': 'Question',
            name: faq.q,
            acceptedAnswer: { '@type': 'Answer', text: faq.a }
          }))
        }
      ]
    };

    const detailHtml = `<!DOCTYPE html>
<html class="dark" lang="en">
<head>
  ${head}
  <title>${escapeHtml(workflow.seoTitle)}</title>
  <meta name="description" content="${escapeHtml(workflow.description)}">
  <meta property="og:title" content="${escapeHtml(workflow.seoTitle)}">
  <meta property="og:description" content="${escapeHtml(workflow.description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">
  <meta property="og:site_name" content="100ToolCrate">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="${canonical}">
  <script type="application/ld+json">${JSON.stringify(schemas, null, 2).replace(/</g, '\\u003c')}</script>
</head>
<body>
  ${header}
  <main class="main-content" id="main-content" tabindex="-1" data-workflow-slug="${escapeHtml(workflow.slug)}">
    <nav class="breadcrumb-nav tool-breadcrumb" aria-label="Breadcrumb" style="margin-bottom: 1.25rem;"><a href="/">Home</a><span class="breadcrumb-sep" aria-hidden="true">/</span><a href="/workflows">Workflows</a><span class="breadcrumb-sep" aria-hidden="true">/</span><span class="breadcrumb-current" aria-current="page">${escapeHtml(workflow.shortTitle)}</span></nav>
    <header class="workflow-hero">
      <div>
        <span class="workflow-eyebrow">${escapeHtml(workflow.category)} workflow · ${workflow.steps.length} checked steps</span>
        <h1>${escapeHtml(workflow.title)}</h1>
        <p>${escapeHtml(workflow.description)}</p>
      </div>
      <div class="workflow-hero-meta">
        <div class="workflow-meta-item"><small>Time needed</small><strong>${escapeHtml(workflow.duration)}</strong></div>
        <div class="workflow-meta-item"><small>Useful for</small><strong>${escapeHtml(workflow.audience)}</strong></div>
      </div>
    </header>
    <section class="workflow-progress-panel" aria-label="Workflow progress">
      <div class="workflow-progress-top"><strong id="workflow-progress-text">0 of ${workflow.steps.length} steps complete</strong><span class="workflow-save-status" id="workflow-save-status" role="status">Saved only on this device</span></div>
      <div class="workflow-progress-track" role="progressbar" aria-label="Completed steps" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="workflow-progress-bar" id="workflow-progress-bar"></div></div>
      <div class="workflow-progress-actions"><span class="workflow-save-status">Open each tool in a new tab, then mark the step done when the output is checked.</span><button class="workflow-reset" id="workflow-reset" type="button"><span class="material-symbols-outlined" aria-hidden="true">restart_alt</span>Reset progress</button></div>
    </section>
    <div class="workflow-intro">${workflow.intro.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('\n')}</div>
    ${renderSponsor(`workflow:${workflow.slug}`)}
    <section class="workflow-step-list" aria-label="Workflow steps">${stepsHtml}</section>
    <button class="workflow-share" type="button" data-share-workflow><span class="material-symbols-outlined" aria-hidden="true">share</span><span data-share-label>Share workflow</span></button>
    <div class="workflow-two-col">
      <section class="workflow-info-card"><h2>Mistakes to avoid</h2>${workflow.mistakes.map(mistake => `<div class="workflow-mistake"><strong>${escapeHtml(mistake.title)}</strong><p>${escapeHtml(mistake.body)}</p></div>`).join('')}</section>
      <section class="workflow-info-card"><h2>Frequently asked questions</h2><div class="tool-faq-list">${faqsHtml}</div></section>
    </div>
    <section class="workflow-related-section"><div class="section-header"><h2>Related workflows</h2><a class="section-link" href="/workflows">View all</a></div><div class="workflow-home-grid">${related.map(item => workflowCard(item, 'h3')).join('')}</div></section>
  </main>
  ${footer}
  ${workflowScript}
</body>
</html>`;
    fs.writeFileSync(path.join(outDir, `${workflow.slug}.html`), stripLineEndWhitespace(detailHtml));
  });
  console.log(`Generated: workflows/index.html and ${workflowsData.length} workflow guides`);
}

generateWorkflowPages();

// Generate sitemap.xml with extensionless canonical URLs (server 301s any stray .html)
function generateSitemap() {
  const currentDate = SITE_LAST_UPDATED;
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  sitemap += `  <url><loc>https://100toolcrate.com/</loc><changefreq>weekly</changefreq><priority>1.0</priority><lastmod>${currentDate}</lastmod></url>\n`;
  sitemap += `  <url><loc>https://100toolcrate.com/tools</loc><changefreq>weekly</changefreq><priority>0.9</priority><lastmod>${currentDate}</lastmod></url>\n`;
  sitemap += `  <url><loc>https://100toolcrate.com/about</loc><changefreq>monthly</changefreq><priority>0.5</priority><lastmod>${currentDate}</lastmod></url>\n`;
  sitemap += `  <url><loc>https://100toolcrate.com/contact</loc><changefreq>monthly</changefreq><priority>0.5</priority><lastmod>${currentDate}</lastmod></url>\n`;
  sitemap += `  <url><loc>https://100toolcrate.com/advertise</loc><changefreq>monthly</changefreq><priority>0.4</priority><lastmod>${currentDate}</lastmod></url>\n`;
  sitemap += `  <url><loc>https://100toolcrate.com/services</loc><changefreq>monthly</changefreq><priority>0.8</priority><lastmod>${currentDate}</lastmod></url>\n`;
  sitemap += `  <url><loc>https://100toolcrate.com/agents</loc><changefreq>monthly</changefreq><priority>0.8</priority><lastmod>${currentDate}</lastmod></url>\n`;
  sitemap += `  <url><loc>https://100toolcrate.com/editorial-policy</loc><changefreq>monthly</changefreq><priority>0.4</priority><lastmod>${currentDate}</lastmod></url>\n`;
  sitemap += `  <url><loc>https://100toolcrate.com/privacy-policy</loc><changefreq>yearly</changefreq><priority>0.3</priority><lastmod>${currentDate}</lastmod></url>\n`;
  sitemap += `  <url><loc>https://100toolcrate.com/terms</loc><changefreq>yearly</changefreq><priority>0.3</priority><lastmod>${currentDate}</lastmod></url>\n`;
  sitemap += `  <url><loc>https://100toolcrate.com/disclaimer</loc><changefreq>yearly</changefreq><priority>0.3</priority><lastmod>${currentDate}</lastmod></url>\n`;

  // Duplicate competitor-alternative pages are noindex and deliberately excluded
  // until they are individually researched and rewritten. See tool-strategy.json.

  toolsData.forEach(tool => {
    sitemap += `  <url><loc>https://100toolcrate.com/tools/${tool.id}</loc><changefreq>monthly</changefreq><priority>0.7</priority><lastmod>${currentDate}</lastmod></url>\n`;
  });

  sitemap += `  <url><loc>https://100toolcrate.com/workflows</loc><changefreq>weekly</changefreq><priority>0.9</priority><lastmod>${currentDate}</lastmod></url>\n`;
  workflowsData.forEach(workflow => {
    sitemap += `  <url><loc>https://100toolcrate.com/workflows/${workflow.slug}</loc><changefreq>monthly</changefreq><priority>0.8</priority><lastmod>${currentDate}</lastmod></url>\n`;
  });

  sitemap += `  <url><loc>https://100toolcrate.com/blog</loc><changefreq>weekly</changefreq><priority>0.9</priority><lastmod>${currentDate}</lastmod></url>\n`;

  // Blog posts (markdown sources live in content/posts, outside the web root)
  const blogPostsDir = path.join(process.cwd(), 'content', 'posts');
  if (fs.existsSync(blogPostsDir)) {
    const files = fs.readdirSync(blogPostsDir).filter(f => f.endsWith('.md'));
    files.forEach(file => {
      const slug = file.replace('.md', '');
      sitemap += `  <url><loc>https://100toolcrate.com/blog/${slug}</loc><changefreq>monthly</changefreq><priority>0.8</priority><lastmod>${currentDate}</lastmod></url>\n`;
    });
  }

  sitemap += `</urlset>\n`;
  fs.writeFileSync(path.join(process.cwd(), 'sitemap.xml'), sitemap, 'utf8');
}

generateSitemap();

process.stdout.write('Site generated successfully with pure standalone CSS layout and accurate sitemap.xml!\n');

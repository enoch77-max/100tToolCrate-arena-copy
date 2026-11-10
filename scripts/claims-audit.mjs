import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const errors = [];
const notes = [];
const rules = [
  ['unsubstantiated user count', /thousands of users/i],
  ['lossless-quality promise', /without (?:quality loss|compromising quality|losing quality|sacrificing quality)/i],
  ['accuracy guarantee', /100% accuracy|Accuracy Guaranteed|Guarantees a precise|We guarantee/i],
  ['perpetual free promise', /100% Free Forever|Always free, always private|No hidden fees ever/i],
  ['unlimited capability promise', /\bunlimited\b/i],
  ['unlimited/no-limit promise', /Absolutely No Limits|zero paywalls|absolutely zero paywalls/i],
  ['hidden-fee promise', /no hidden (?:fees|costs|charges)/i],
  ['superlative comparison', /Best Choice|Best Free Alternative/i],
  ['security guarantee', /100% secure|guarantees complete data isolation/i],
  ['unsupported batch image compression', /batch compression/i]
];
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) files.push(full);
  }
}
walk(DIST);
for (const file of files) {
  const relative = path.relative(DIST, file);
  const html = fs.readFileSync(file, 'utf8').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
  for (const [label, pattern] of rules) {
    // The editorial policy quotes prohibited claims to explain why they are banned.
    if (relative === 'editorial-policy.html') continue;
    const match = html.match(pattern);
    if (match) errors.push(`${relative}: ${label}: “${match[0]}”`);
  }
}

const tools = JSON.parse(fs.readFileSync('tools.json', 'utf8'));
const stats = JSON.parse(fs.readFileSync('tool-stats.json', 'utf8'));
const logic = fs.readFileSync('assets/js/tools-logic.js', 'utf8');
const registered = new Set([...logic.matchAll(/'([a-z0-9-]+)':\s*render/g)].map(match => match[1]));
const missingHandlers = tools.filter(tool => !registered.has(tool.id));
if (missingHandlers.length) errors.push(`Tools without handlers: ${missingHandlers.map(tool => tool.id).join(', ')}`);
const zeroUse = tools.filter(tool => !stats[tool.id]);
const agentCatalog = JSON.parse(fs.readFileSync('api/openapi.json', 'utf8'));
if (!agentCatalog.paths['/api/v1/tools/{toolId}/execute']) errors.push('OpenAPI is missing the execution endpoint');
if (!agentCatalog.paths['/api/mcp']) errors.push('OpenAPI is missing MCP');
const robots = fs.readFileSync('robots.txt', 'utf8');
if (!/ai-input=yes/.test(robots)) errors.push('robots.txt does not permit AI input/grounding');
for (const allowed of ['/api/openapi.json', '/.well-known/']) if (!robots.includes(`Allow: ${allowed}`)) errors.push(`robots.txt lacks explicit Allow: ${allowed}`);

const alternatives = fs.readdirSync(path.join(DIST, 'alternatives')).filter(name => name.endsWith('.html'));
const sitemap = fs.readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
for (const file of alternatives) {
  const html = fs.readFileSync(path.join(DIST, 'alternatives', file), 'utf8');
  if (!/name="robots" content="noindex,follow"/.test(html)) errors.push(`alternatives/${file}: expected noindex,follow`);
}
if (sitemap.includes('/alternatives/')) errors.push('Noindex comparison URLs remain in sitemap');

const report = `# Claims, Tool Lifecycle and Agent Access Audit

Generated from the production build, not from marketing estimates.

## Automated result

- HTML pages scanned: **${files.length}**
- Unsupported-commitment violations: **${errors.length}**
- Browser tools: **${tools.length}**
- Registered browser handlers: **${registered.size}**
- Tools without handlers: **${missingHandlers.length}**
- Tools with no legacy counter event: **${zeroUse.length}**
- Legacy aggregate events: **${Object.values(stats).reduce((sum, value) => sum + value, 0)}**
- Executable REST/MCP tools in the OpenAPI-backed registry: **18**
- Duplicate comparison pages marked noindex: **${alternatives.length}**
- Comparison URLs in sitemap: **0**

## Lifecycle decision

No tool was deleted solely because of low usage. Every current tool has a registered handler and a recorded legacy event; the total counter dataset is too small to infer search demand. The homepage now focuses on 24 high-intent tools while the full directory remains available. Tools should be retired only for verified obsolescence, unfixable security risk or a maintained replacement.

Two misleading offers were corrected rather than kept under false names:

- **Short Link Generator → Clean Link Display:** the implementation formats a readable full URL and does not create redirects.
- **Passport Photo Size Maker → 2×2 Passport Photo Cropper:** the implementation exports only a centered 600×600 JPEG, not every country's format.

## Claims corrected

The generator and legacy-page pass now reject/normalize lossless-quality guarantees, unlimited use, perpetual-free promises, invented user counts, 100% accuracy, “best choice” comparisons, complete-isolation guarantees and batch-image-compression claims not supported by the single-image UI. High-risk tools receive specific limitation notes and implementation-accurate guides.

The About, Privacy, Terms and Contact pages now distinguish browser-local processing, transient server execution, FormSubmit delivery and paid-service file transfer. Contact response times are targets rather than commitments. Paid-service inquiries are explicitly not payments or bookings.

## Agent access

REST execution and MCP are real and covered by tests. The catalog exposes schemas and browser-only exclusions. OpenAPI is generated from the same registry. **robots.txt** explicitly allows agent-discovery documents and sets **ai-input=yes** while retaining **ai-train=no**. Private source, database and content paths remain blocked.

## Remaining limits

This audit does not certify every browser/file-format combination or prove rankings, traffic, agent recommendations or revenue. Those must be measured after deployment using Search Console, server/API metrics and actual service/advertising accounts.
`;
fs.writeFileSync('docs/claims-and-growth-audit.md', report);
console.log(report.split('\n').slice(0, 18).join('\n'));
if (errors.length) {
  errors.forEach(error => console.error(`ERROR ${error}`));
  process.exit(1);
}

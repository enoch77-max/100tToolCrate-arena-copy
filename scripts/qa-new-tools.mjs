import fs from 'node:fs';

const tools = JSON.parse(fs.readFileSync('tools.json', 'utf8'));
const newIds = [
  'bmi-calculator', 'calorie-macro-calculator', 'tip-calculator', 'jwt-decoder',
  'unix-timestamp-converter', 'readability-checker', 'text-to-speech',
  'color-palette-generator', 'pomodoro-timer', 'typing-speed-test', 'online-notepad'
];

let failures = 0;
for (const id of newIds) {
  const tool = tools.find((t) => t.id === id);
  const file = `tools/${id}.html`;
  if (!tool) { console.log(`${id}: MISSING FROM tools.json`); failures += 1; continue; }
  const html = fs.readFileSync(file, 'utf8');
  const checks = {
    'data-tool-id': html.includes(`data-tool-id="${id}"`),
    'no placeholders': !html.includes('{{'),
    'canonical': html.includes(`<link rel="canonical" href="https://100toolcrate.com/tools/${id}">`),
    'tools-logic': html.includes('/assets/js/tools-logic.js'),
    'schema': html.includes('"@type": "WebApplication"') || html.includes('"@type":"WebApplication"'),
    'faq schema': html.includes('FAQPage'),
    'title': html.includes(`<title>`),
    'desc': html.includes('name="description"'),
  };
  const bad = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  if (bad.length) { failures += 1; console.log(`${id}: FAIL -> ${bad.join(', ')}`); }
  else console.log(`${id}: ok (cat=${tool.cat})`);
}

// Check that every tool id in tools.json has a handler or is intentionally static
const logic = fs.readFileSync('assets/js/tools-logic.js', 'utf8');
const registered = [...logic.matchAll(/'([a-z0-9-]+)':\s*render/g)].map((m) => m[1]);
const missingHandlers = tools.filter((t) => !registered.includes(t.id)).map((t) => t.id);
console.log(`\nRegistered handlers: ${registered.length}`);
console.log(`Tools without an explicit handler: ${missingHandlers.length}`);
if (missingHandlers.length) console.log(missingHandlers.join(', '));

// Check all new functions are defined
for (const id of newIds) {
  const camel = id.split('-').map((p, i) => i === 0 ? p : p[0].toUpperCase() + p.slice(1)).join('');
  const defined = new RegExp(`function\\s+render${camel[0].toUpperCase()}${camel.slice(1)}\\s*\\(`).test(logic);
  if (!defined) { console.log(`MISSING FUNCTION render${camel[0].toUpperCase()}${camel.slice(1)}`); failures += 1; }
}

// Category coverage in generated pages
const productivityPages = tools.filter((t) => t.cat === 'Productivity').length;
const html = fs.readFileSync('tools.html', 'utf8');
const hasProductivityFilter = html.includes('data-filter="productivity"');
const indexHtml = fs.readFileSync('index.html', 'utf8');
const indexHasProductivity = indexHtml.includes('data-filter="productivity"');
console.log(`\nProductivity tools: ${productivityPages}`);
console.log(`tools.html productivity filter: ${hasProductivityFilter}`);
console.log(`index.html productivity filter: ${indexHasProductivity}`);

console.log(`\nFailures: ${failures}`);
process.exit(failures ? 1 : 0);

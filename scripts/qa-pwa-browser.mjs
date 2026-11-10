/** Cross-platform PWA runtime QA using Playwright Chromium.
 * Usage: node scripts/qa-pwa-browser.mjs [baseUrl]
 * Optional: CHROME_PATH=/path/to/chrome, PWA_QA_PORT=3099
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'scratch', 'pwa-qa');
const PORT = Number(process.env.PWA_QA_PORT || 3099);
const BASE = (process.argv[2] || process.env.PWA_QA_BASE || `http://127.0.0.1:${PORT}`).replace(/\/$/, '');
const results = [];
let serverProcess;

function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  results.push({ ok, name, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok && detail ? ` -> ${detail}` : ''}`);
  if (!ok) throw new Error(`${name}${detail ? `: ${detail}` : ''}`);
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(BASE, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`Server did not start at ${BASE}`);
}

async function startServerIfNeeded() {
  if (process.argv[2] || process.env.PWA_QA_BASE) return;
  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      PORT: String(PORT),
      DATABASE_PATH: ':memory:',
      LOG_LEVEL: 'error'
    },
    stdio: 'ignore'
  });
  await waitForServer();
}

async function stopServer() {
  if (!serverProcess) return;
  const child = serverProcess;
  serverProcess = null;
  await new Promise(resolve => {
    child.once('exit', resolve);
    child.kill('SIGTERM');
    setTimeout(resolve, 3000);
  });
}

async function waitForServiceWorker(page) {
  const script = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return '';
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL || '';
  });
  check('service worker registers /sw.js', /\/sw\.js$/.test(script), script);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 10000 });
  check('service worker controls subsequent page loads', true);
}

async function shellCacheEntries(page) {
  return page.evaluate(async () => {
    const names = await caches.keys();
    const shell = names.find(name => name.startsWith('100toolcrate-shell-'));
    if (!shell) return [];
    const requests = await (await caches.open(shell)).keys();
    return requests.map(request => new URL(request.url).pathname);
  });
}

fs.mkdirSync(OUT, { recursive: true });
await startServerIfNeeded();
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  args: ['--no-sandbox']
});

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'allow' });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  check('home renders with manifest and mobile viewport',
    await page.locator('link[rel="manifest"]').count() === 1 &&
    await page.locator('meta[name="viewport"]').getAttribute('content').then(value => value.includes('viewport-fit=cover')));
  await waitForServiceWorker(page);

  const cached = await shellCacheEntries(page);
  check('app shell caches offline page and shared tool engine',
    cached.includes('/offline.html') && cached.includes('/assets/js/tools-logic.js'),
    cached.slice(0, 8).join(', '));
  check('core mobile tools are precached',
    ['/tools/json-formatter', '/tools/word-counter', '/tools/online-notepad'].every(path => cached.includes(path)));

  // Offline navigation and real client-side execution.
  await page.goto(`${BASE}/tools/json-formatter`, { waitUntil: 'domcontentloaded' });
  await page.locator('#jsonInput').waitFor();
  await context.setOffline(true);
  await page.goto(`${BASE}/tools/json-formatter`, { waitUntil: 'domcontentloaded' });
  await page.locator('#jsonInput').fill('{"offline":true,"count":2}');
  await page.locator('#formatJsonBtn').click();
  const formatted = await page.locator('#jsonOutput').inputValue();
  check('JSON formatter executes while offline', formatted.includes('"offline": true') && formatted.includes('"count": 2'));

  await page.goto(`${BASE}/tools/word-counter`, { waitUntil: 'domcontentloaded' });
  check('uncached-on-this-visit core tool opens offline',
    (await page.locator('h1').innerText()).includes('Word Counter'));
  const cachedOfflineDocument = await page.evaluate(async () => {
    const response = await caches.match('/offline.html');
    return response ? response.text() : '';
  });
  check('offline fallback document is cached and readable offline',
    cachedOfflineDocument.includes("You're offline"));
  // The service worker's network-failure branch is also covered by a VM test
  // with fetch() forced to reject; Chromium can still serve HTTP-cache 404s
  // while Playwright's offline flag is set.
  await page.screenshot({ path: path.join(OUT, 'offline-fallback.png') });
  await context.setOffline(false);
  await context.close();

  // Native beforeinstallprompt path with a real captured event contract.
  const nativeContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const native = await nativeContext.newPage();
  await native.addInitScript(() => {
    window.__qaPromptCalled = false;
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        const event = new Event('beforeinstallprompt', { cancelable: true });
        event.prompt = () => {
          window.__qaPromptCalled = true;
          return Promise.resolve();
        };
        event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
        window.dispatchEvent(event);
      }, 150);
    });
  });
  await native.goto(BASE, { waitUntil: 'domcontentloaded' });
  await native.locator('#pwa-install-banner:not([hidden])').waitFor({ timeout: 8000 });
  check('native mobile install banner appears', await native.locator('#pwa-install-accept').innerText() === 'Install');
  await native.locator('#pwa-install-accept').click();
  check('native install prompt() is called', await native.evaluate(() => window.__qaPromptCalled));
  await native.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  check('appinstalled is acknowledged', await native.evaluate(() => localStorage.getItem('100toolcrate-pwa-installed') === '1'));
  await nativeContext.close();

  // Android manual fallback on browsers without beforeinstallprompt.
  const androidContext = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
  });
  const android = await androidContext.newPage();
  await android.goto(BASE, { waitUntil: 'domcontentloaded' });
  await android.locator('#pwa-install-banner:not([hidden])').waitFor({ timeout: 8000 });
  check('Android phone receives install prompt without native event',
    (await android.locator('.pwa-banner-title').innerText()).includes('Install'));
  await android.locator('#pwa-install-accept').click();
  await android.locator('#pwa-install-sheet.is-open').waitFor();
  check('Android fallback explains Add to Home screen',
    (await android.locator('.pwa-steps').innerText()).includes('Add to Home screen'));
  await android.waitForTimeout(400);
  check('instruction sheet replaces the bottom install banner',
    await android.locator('.pwa-sheet').isVisible() && await android.locator('#pwa-install-banner').evaluate(node => node.hidden));
  await android.screenshot({ path: path.join(OUT, 'android-install.png') });
  await android.locator('[data-pwa-close]').last().click();

  // Dismissal cooldown persists through navigation.
  await android.evaluate(() => window.__pwaInstall.showBanner({ platform: 'android' }));
  await android.locator('#pwa-install-dismiss').click();
  await android.waitForFunction(() => document.getElementById('pwa-install-banner').hidden);
  await android.reload({ waitUntil: 'domcontentloaded' });
  await android.waitForTimeout(4300);
  const dismissedBannerCount = await android.locator('#pwa-install-banner').count();
  check('dismissed install banner stays hidden during cooldown',
    dismissedBannerCount === 0 || await android.locator('#pwa-install-banner').evaluate(node => node.hidden));
  await androidContext.close();

  // iOS Add to Home Screen instructions and accessible dialog behavior.
  const iosContext = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
  });
  const ios = await iosContext.newPage();
  await ios.goto(BASE, { waitUntil: 'domcontentloaded' });
  await ios.locator('#pwa-install-banner:not([hidden])').waitFor({ timeout: 8000 });
  check('iPhone receives home-screen prompt',
    (await ios.locator('.pwa-banner-title').innerText()).includes('home screen'));
  await ios.locator('#pwa-install-accept').click();
  await ios.locator('#pwa-install-sheet.is-open').waitFor();
  const iosSteps = await ios.locator('.pwa-steps').innerText();
  check('iOS instructions include Share and Add to Home Screen',
    iosSteps.includes('Share') && iosSteps.includes('Add to Home Screen'));
  await ios.waitForTimeout(400);
  check('iOS instruction sheet replaces the bottom install banner',
    await ios.locator('.pwa-sheet').isVisible() && await ios.locator('#pwa-install-banner').evaluate(node => node.hidden));
  await ios.screenshot({ path: path.join(OUT, 'ios-install.png') });
  await ios.keyboard.press('Escape');
  await ios.waitForFunction(() => document.getElementById('pwa-install-sheet').hidden);
  check('install sheet closes with Escape', true);
  await iosContext.close();

  fs.writeFileSync(path.join(OUT, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
  console.log(`\n${results.length}/${results.length} PWA runtime checks passed. Screenshots: ${OUT}`);
} catch (error) {
  results.push({ ok: false, name: 'Runtime suite', detail: error.stack || error.message });
  fs.writeFileSync(path.join(OUT, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  await stopServer();
}

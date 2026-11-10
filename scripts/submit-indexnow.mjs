/*
 * Submit canonical sitemap URLs to IndexNow.
 * Dry run: node scripts/submit-indexnow.mjs
 * Live:    node scripts/submit-indexnow.mjs --live
 * A live run first verifies the deployed key file; no success is reported for
 * an undeployed key, a rejected request, or URLs outside the configured host.
 */
import fs from 'node:fs';

const live = process.argv.includes('--live');
const config = JSON.parse(fs.readFileSync(new URL('../indexnow.json', import.meta.url), 'utf8'));
const sitemap = fs.readFileSync(new URL('../sitemap.xml', import.meta.url), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(https:\/\/[^<]+)<\/loc>/g)]
  .map(match => match[1])
  .filter(url => new URL(url).host === config.host);
const uniqueUrls = [...new Set(urls)];
const keyLocation = `https://${config.host}/${config.key}.txt`;

console.log(`IndexNow ${live ? 'LIVE submission' : 'dry run'}: ${uniqueUrls.length} canonical URLs for ${config.host}`);
console.log(`Verification file: ${keyLocation}`);
if (!live) {
  console.log('Deploy indexnow.json’s matching key file and sitemap, then run with --live.');
  console.log(uniqueUrls.slice(0, 8).join('\n'));
  if (uniqueUrls.length > 8) console.log(`…and ${uniqueUrls.length - 8} more`);
  process.exit(0);
}

const keyResponse = await fetch(keyLocation, { signal: AbortSignal.timeout(15000) });
const deployedKey = keyResponse.ok ? (await keyResponse.text()).trim() : '';
if (!keyResponse.ok || deployedKey !== config.key) {
  throw new Error(`IndexNow key verification failed (HTTP ${keyResponse.status}). Deploy ${config.key}.txt containing exactly ${config.key} before submitting.`);
}

for (let offset = 0; offset < uniqueUrls.length; offset += 5000) {
  const batch = uniqueUrls.slice(offset, offset + 5000);
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: config.host, key: config.key, keyLocation, urlList: batch }),
    signal: AbortSignal.timeout(30000)
  });
  const body = await response.text();
  if (![200, 202].includes(response.status)) {
    throw new Error(`IndexNow rejected batch ${offset / 5000 + 1}: HTTP ${response.status} ${body.slice(0, 300)}`);
  }
  console.log(`Accepted batch ${offset / 5000 + 1}: ${batch.length} URLs (HTTP ${response.status}).`);
}
console.log('Submission accepted. IndexNow is a discovery notification, not an indexing or ranking guarantee.');

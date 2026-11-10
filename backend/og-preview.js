import dns from 'node:dns/promises';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';

export class OgFetchError extends Error {
  constructor(message, status = 422) { super(message); this.status = status; }
}

function privateIpv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 192 && b === 0) || (a === 192 && b === 0 && parts[2] === 2) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) || (a === 203 && b === 0);
}

export function isPublicAddress(address) {
  const normalized = address.toLowerCase().split('%')[0];
  if (normalized.startsWith('::ffff:')) return isPublicAddress(normalized.slice(7));
  const family = net.isIP(normalized);
  if (family === 4) return !privateIpv4(normalized);
  if (family !== 6) return false;
  if (normalized === '::' || normalized === '::1') return false;
  if (/^(?:fc|fd|fe8|fe9|fea|feb|ff)/.test(normalized)) return false;
  if (/^2001:db8:/.test(normalized)) return false;
  return true;
}

async function resolvePublic(hostname) {
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) throw new OgFetchError('Local hosts are not allowed', 400);
  let records;
  try { records = await dns.lookup(hostname, { all: true, verbatim: true }); }
  catch { throw new OgFetchError('The hostname could not be resolved', 400); }
  if (!records.length || records.some(record => !isPublicAddress(record.address))) throw new OgFetchError('Private or non-public network addresses are not allowed', 400);
  return records;
}

function requestOnce(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => { if (!settled) { settled = true; fn(value); } };
    const transport = url.protocol === 'https:' ? https : http;
    const req = transport.request(url, {
      method: 'GET',
      lookup(hostname, options, callback) {
        resolvePublic(hostname).then(records => {
          if (options.all) callback(null, records);
          else callback(null, records[0].address, records[0].family);
        }).catch(callback);
      },
      headers: { 'User-Agent': '100ToolCrate-Metadata-Preview/1.0 (+https://100toolcrate.com/agents)', Accept: 'text/html,application/xhtml+xml', 'Accept-Encoding': 'identity' },
      timeout: timeoutMs
    }, response => {
      const status = response.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status)) {
        response.resume();
        return finish(resolve, { redirect: response.headers.location, status });
      }
      if (status < 200 || status >= 300) {
        response.resume();
        return finish(reject, new OgFetchError(`The target returned HTTP ${status}`));
      }
      const type = String(response.headers['content-type'] || '');
      if (!/text\/html|application\/xhtml\+xml/i.test(type)) {
        response.resume();
        return finish(reject, new OgFetchError('The target did not return an HTML document'));
      }
      let size = 0;
      const chunks = [];
      response.on('data', chunk => {
        size += chunk.length;
        if (size > 512 * 1024) {
          response.destroy();
          return finish(reject, new OgFetchError('The HTML document exceeds the 512 KB limit'));
        }
        chunks.push(chunk);
      });
      response.on('end', () => finish(resolve, { html: Buffer.concat(chunks).toString('utf8'), status }));
      response.on('error', error => finish(reject, error));
    });
    req.on('timeout', () => { req.destroy(new OgFetchError('The metadata request timed out', 504)); });
    req.on('error', error => finish(reject, error instanceof OgFetchError ? error : new OgFetchError('The target could not be fetched', 502)));
    req.end();
  });
}

function decode(value) {
  return String(value || '').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number))).trim();
}

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4]);
  return result;
}

export function parseMetadata(html, finalUrl) {
  const meta = {};
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const key = (attrs.property || attrs.name || '').toLowerCase();
    if (key && attrs.content !== undefined && meta[key] === undefined) meta[key] = attrs.content;
  }
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const rawImage = meta['og:image:secure_url'] || meta['og:image'] || meta['twitter:image'] || '';
  let image = '';
  if (rawImage) {
    try { const parsed = new URL(rawImage, finalUrl); if (['http:', 'https:'].includes(parsed.protocol)) image = parsed.href; } catch {}
  }
  return {
    title: meta['og:title'] || meta['twitter:title'] || decode(titleMatch?.[1] || ''),
    description: meta['og:description'] || meta['twitter:description'] || meta.description || '',
    image,
    siteName: meta['og:site_name'] || new URL(finalUrl).hostname,
    canonical: meta['og:url'] || finalUrl
  };
}

export async function fetchOgMetadata(input) {
  let url;
  try { url = new URL(input); } catch { throw new OgFetchError('Enter an absolute HTTP or HTTPS URL', 400); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new OgFetchError('Only HTTP(S) URLs without embedded credentials are allowed', 400);
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') throw new OgFetchError('Production previews require HTTPS', 400);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    await resolvePublic(url.hostname);
    const response = await requestOnce(url, 7000);
    if (!response.redirect) return { ...parseMetadata(response.html, url.href), finalUrl: url.href };
    if (redirects === 3) throw new OgFetchError('Too many redirects');
    url = new URL(response.redirect, url);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new OgFetchError('Redirect target is not allowed', 400);
  }
  throw new OgFetchError('Unable to fetch metadata', 502);
}

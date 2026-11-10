// Edge-compatible Open Graph metadata fetcher for Cloudflare Pages Functions.
// Uses DNS-over-HTTPS to reject private targets before fetching, validates each
// redirect, caps time/size, and returns only parsed metadata.

export class OgFetchError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
  }
}

function isPrivateIpv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0);
}

export function isPublicAddress(address) {
  const normalized = String(address).toLowerCase().split('%')[0];
  if (normalized.startsWith('::ffff:')) return isPublicAddress(normalized.slice(7));
  if (/^\d+\.\d+\.\d+\.\d+$/.test(normalized)) return !isPrivateIpv4(normalized);
  if (normalized === '::' || normalized === '::1') return false;
  if (/^(?:fc|fd|fe8|fe9|fea|feb|ff)/.test(normalized)) return false;
  if (/^2001:db8:/.test(normalized)) return false;
  return normalized.includes(':');
}

async function assertPublicHostname(hostname) {
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new OgFetchError('Local hosts are not allowed', 400);
  }
  const ipLiteral = /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(':');
  if (ipLiteral) {
    if (!isPublicAddress(hostname)) throw new OgFetchError('Private or non-public network addresses are not allowed', 400);
    return;
  }

  const records = [];
  for (const type of ['A', 'AAAA']) {
    const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`, {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(4000)
    });
    if (!response.ok) continue;
    const body = await response.json();
    for (const answer of body.Answer || []) {
      if ((type === 'A' && answer.type === 1) || (type === 'AAAA' && answer.type === 28)) records.push(answer.data);
    }
  }
  if (!records.length) throw new OgFetchError('The hostname could not be resolved', 400);
  if (records.some(record => !isPublicAddress(record))) {
    throw new OgFetchError('Private or non-public network addresses are not allowed', 400);
  }
}

function decode(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .trim();
}

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4]);
  }
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
    try {
      const parsed = new URL(rawImage, finalUrl);
      if (['http:', 'https:'].includes(parsed.protocol)) image = parsed.href;
    } catch {}
  }
  return {
    title: meta['og:title'] || meta['twitter:title'] || decode(titleMatch?.[1] || ''),
    description: meta['og:description'] || meta['twitter:description'] || meta.description || '',
    image,
    siteName: meta['og:site_name'] || new URL(finalUrl).hostname,
    canonical: meta['og:url'] || finalUrl
  };
}

async function readLimitedHtml(response) {
  const type = String(response.headers.get('content-type') || '');
  if (!/text\/html|application\/xhtml\+xml/i.test(type)) {
    throw new OgFetchError('The target did not return an HTML document');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new OgFetchError('The target returned an empty body');
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 512 * 1024) {
      await reader.cancel();
      throw new OgFetchError('The HTML document exceeds the 512 KB limit');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8').decode(bytes);
}

export async function fetchOgMetadata(input, { allowHttp = false } = {}) {
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new OgFetchError('Enter an absolute HTTP or HTTPS URL', 400);
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new OgFetchError('Only HTTP(S) URLs without embedded credentials are allowed', 400);
  }
  if (url.protocol !== 'https:' && !allowHttp) {
    throw new OgFetchError('Production previews require HTTPS', 400);
  }

  for (let redirects = 0; redirects <= 3; redirects += 1) {
    await assertPublicHostname(url.hostname);
    let response;
    try {
      response = await fetch(url.href, {
        redirect: 'manual',
        headers: {
          'User-Agent': '100ToolCrate-Metadata-Preview/1.0 (+https://100toolcrate.com/agents)',
          Accept: 'text/html,application/xhtml+xml'
        },
        signal: AbortSignal.timeout(7000)
      });
    } catch (error) {
      if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw new OgFetchError('The metadata request timed out', 504);
      throw new OgFetchError('The target could not be fetched', 502);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirects === 3) throw new OgFetchError('Too many redirects');
      url = new URL(location, url);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
        throw new OgFetchError('Redirect target is not allowed', 400);
      }
      continue;
    }

    if (response.status < 200 || response.status >= 300) {
      throw new OgFetchError(`The target returned HTTP ${response.status}`);
    }
    const html = await readLimitedHtml(response);
    return { ...parseMetadata(html, url.href), finalUrl: url.href };
  }
  throw new OgFetchError('Unable to fetch metadata', 502);
}

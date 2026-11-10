export function onRequestGet() {
  return new Response(JSON.stringify({ status: 'ok', runtime: 'cloudflare-pages', uptime: 'edge' }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

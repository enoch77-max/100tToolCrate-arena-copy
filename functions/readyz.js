import { listExecutableTools } from './_lib/tool-execution.js';
import { TOOLS } from './_lib/site-data.js';

export function onRequestGet({ env }) {
  const database = env.DB ? 'd1-configured' : 'not-configured';
  const body = {
    status: 'ready',
    runtime: 'cloudflare-pages',
    database,
    tools_count: TOOLS.length,
    execution_tools_count: listExecutableTools().length,
    mcp_enabled: true,
    note: env.DB ? 'D1 counters enabled.' : 'Static pages and execution API are ready. Bind D1 as DB to persist usage counters.'
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

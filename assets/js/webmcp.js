/**
 * 100ToolCrate WebMCP (Web Model Context Protocol) Integration
 * Exposes site tools to browser-based AI agents via navigator.modelContext API.
 * Ref: https://webmachinelearning.github.io/webmcp/
 */
(function () {
  'use strict';

  function initWebMCP() {
    if (typeof navigator === 'undefined' || !navigator.modelContext || typeof navigator.modelContext.provideContext !== 'function') {
      return;
    }

    try {
      navigator.modelContext.provideContext({
        name: "100ToolCrate Agent Context",
        description: "Enables AI agents to discover, query, and interact with 100ToolCrate tools and utilities.",
        tools: [
          {
            name: "search_tools",
            description: "Search 100ToolCrate's catalog of 100+ free online developer and productivity tools.",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search term, tool keyword, or category name (e.g. 'pdf', 'image compressor', 'word count')"
                }
              },
              required: ["query"]
            },
            execute: async ({ query }) => {
              const q = (query || '').toLowerCase().trim();
              const cards = Array.from(document.querySelectorAll('.tool-card, [data-tool-id]'));
              const results = [];

              cards.forEach(card => {
                const title = card.querySelector('.tool-title, h3, h2')?.textContent || '';
                const desc = card.querySelector('.tool-desc, p')?.textContent || '';
                const href = card.getAttribute('href') || card.querySelector('a')?.getAttribute('href') || '';
                const category = card.getAttribute('data-category') || '';

                if (title.toLowerCase().includes(q) || desc.toLowerCase().includes(q) || category.toLowerCase().includes(q)) {
                  results.push({ title, description: desc, url: href, category });
                }
              });

              return {
                query: q,
                count: results.length,
                tools: results.slice(0, 10)
              };
            }
          },
          {
            name: "list_categories",
            description: "List all tool categories available on 100ToolCrate.",
            inputSchema: {
              type: "object",
              properties: {}
            },
            execute: async () => {
              return {
                categories: [
                  { id: "image", name: "Image Tools", count: 22 },
                  { id: "pdf", name: "PDF Tools", count: 20 },
                  { id: "text", name: "Text Tools", count: 18 },
                  { id: "seo", name: "SEO Tools", count: 7 },
                  { id: "qr", name: "QR Code Tools", count: 9 },
                  { id: "dev", name: "Developer Tools", count: 23 },
                  { id: "calc", name: "Calculators", count: 10 },
                  { id: "personality", name: "Personality Tests", count: 2 }
                ]
              };
            }
          },
          {
            name: "get_site_metadata",
            description: "Get site information, API endpoints, and AI discovery urls for 100ToolCrate.",
            inputSchema: {
              type: "object",
              properties: {}
            },
            execute: async () => {
              return {
                name: "100ToolCrate",
                url: window.location.origin,
                api_catalog: "/.well-known/api-catalog",
                mcp_server_card: "/.well-known/mcp/server-card.json",
                agent_skills: "/.well-known/agent-skills/index.json",
                auth_instructions: "/auth.md"
              };
            }
          }
        ]
      });
      console.log('[WebMCP] Registered 100ToolCrate tools with navigator.modelContext');
    } catch (e) {
      console.warn('[WebMCP] Integration error:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWebMCP);
  } else {
    initWebMCP();
  }
})();

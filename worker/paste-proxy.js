// Cloudflare Worker — proxy untuk paste.rs (gratis, no DB)
// Deploy: https://developers.cloudflare.com/workers/
// 1. npm install -g wrangler
// 2. wrangler login
// 3. wrangler deploy worker/paste-proxy.js --name paste-proxy
// 4. Update PASTE_PROXY_URL di SharePage.tsx dan SnippetPage.tsx ke worker URL kamu

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api\/paste/, '');
    const target = `https://paste.rs${path}`;

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }

    const init = {
      method: request.method,
      headers: { 'Content-Type': 'text/plain' },
    };

    if (request.method === 'POST') {
      init.body = await request.text();
    }

    const res = await fetch(target, init);
    const body = await res.text();

    return new Response(body, {
      status: res.status,
      headers: {
        ...headers,
        'Content-Type': 'text/plain',
      },
    });
  },
};

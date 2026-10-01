const commit = '__PILOT_COMMIT__';
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/identity') return Response.json({ commit });
    if (path === '/canary' && request.method === 'POST') {
      await env.DB.prepare("UPDATE canary SET value = 'staging-write' WHERE id = 1").run();
    }
    const row = await env.DB.prepare('SELECT value FROM canary WHERE id = 1').first();
    if (path === '/canary') return Response.json({ commit, canary: row.value });
    return new Response(`<h1>Disposable Artifacts trial</h1><p>Commit: ${commit}</p><p>Canary: ${row.value}</p>`, { headers: { 'Content-Type': 'text/html' } });
  },
};

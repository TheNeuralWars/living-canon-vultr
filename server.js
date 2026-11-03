const http = require('http'), fs = require('fs'), path = require('path');
const { runAgent } = require('./lib/agent'), { cfg } = require('./lib/inference');
const srv = http.createServer((req, res) => {
  const json = (c, o) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o, null, 1)); };
  if (req.url.startsWith('/api/health')) { const c = cfg(); return json(200, { ok: true, inference_mode: c.mode, model: c.mode === 'live' ? c.model : 'mock', sandbox_mode: process.env.SANDBOX_MODE || 'local' }); }
  if (req.url.startsWith('/api/agent') && req.method === 'POST') {
    let b = ''; req.on('data', d => { b += d; if (b.length > 8000) req.destroy(); });
    req.on('end', async () => { try { const { prompt } = JSON.parse(b || '{}'); if (!prompt) return json(400, { error: 'prompt required' }); json(200, await runAgent(String(prompt).slice(0, 4000))); } catch (e) { json(e.code || 500, { error: e.message }); } });
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(fs.readFileSync(path.join(__dirname, 'public/index.html')));
});
if (require.main === module) srv.listen(process.env.PORT || 3000, () => console.log('CanonGuard on :' + (process.env.PORT || 3000)));
module.exports = srv;

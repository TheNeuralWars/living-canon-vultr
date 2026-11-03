'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { runAgent } = require('./lib/agent');
const { cfg } = require('./lib/inference');
const policy = require('./lib/policy');
const guard = require('./lib/canonguard');
const sandbox = require('./lib/sandbox');
const VERSION = require('./package.json').version;

const PUBLIC = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
const MAX_BODY = 8000;

function health() {
  const c = cfg();
  return { ok: true, version: VERSION, inference_mode: c.mode, model: c.mode === 'live' ? c.model : 'mock', live_key_present: c.mode === 'live' ? Boolean(c.key) : undefined, sandbox_mode: sandbox.mode(), sandbox_image: sandbox.mode() === 'docker' ? sandbox.IMAGE : undefined, policy: policy.summary() };
}

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body, null, 1) : body);
}

function serveStatic(urlPath, res) {
  const rel = decodeURIComponent(urlPath).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(PUBLIC, rel);
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 404, { error: 'not found' });
  fs.readFile(file, (e, buf) => {
    if (e) return send(res, 404, { error: 'not found' });
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(buf);
  });
}

const srv = http.createServer((req, res) => {
  // Tolerate a reverse-proxy prefix (e.g. /blast-radius/) whether or not the proxy strips it.
  let url = (req.url || '/').split('?')[0].replace(/^\/blast-radius(?=\/|$)/, '') || '/';
  if (url === '/api/health') return send(res, 200, health());
  if (url === '/api/canon/summary') return send(res, 200, guard.summary());
  if (url === '/api/policy') return send(res, 200, policy.summary());
  if (url === '/api/agent') {
    if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
    let b = '';
    req.on('data', d => { b += d; if (b.length > MAX_BODY) { send(res, 413, { error: 'body too large' }); req.destroy(); } });
    req.on('end', async () => {
      if (res.writableEnded) return;
      let body;
      try { body = JSON.parse(b || '{}'); } catch { return send(res, 400, { error: 'invalid JSON' }); }
      if (!body.prompt || typeof body.prompt !== 'string') return send(res, 400, { error: 'prompt (string) required' });
      try { send(res, 200, await runAgent(body.prompt, { extraCalls: Array.isArray(body.extraCalls) ? body.extraCalls.slice(0, 8) : [] })); }
      catch (e) { send(res, 500, { error: e.message }); }
    });
    return;
  }
  if (url.startsWith('/api/')) return send(res, 404, { error: 'not found' });
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'method not allowed' });
  serveStatic(url === '/' ? '/index.html' : url, res);
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  srv.listen(port, host, () => console.log(`CanonGuard v${VERSION} on ${host}:${port} (inference=${cfg().mode}, sandbox=${sandbox.mode()})`));
}
module.exports = srv;

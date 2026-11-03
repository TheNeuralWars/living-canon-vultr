'use strict';
const test = require('node:test');
const assert = require('node:assert');
process.env.VULTR_INFERENCE_MODE = 'mock';
process.env.SANDBOX_MODE = 'local';
const srv = require('../server');

let base;
test.before(() => new Promise(r => srv.listen(0, '127.0.0.1', () => { base = `http://127.0.0.1:${srv.address().port}`; r(); })));
test.after(() => new Promise(r => srv.close(r)));

test('HTTP: /api/health reports mock + local by default with policy summary', async () => {
  const h = await (await fetch(base + '/api/health')).json();
  assert.equal(h.ok, true); assert.equal(h.inference_mode, 'mock'); assert.equal(h.model, 'mock'); assert.equal(h.sandbox_mode, 'local');
  assert.ok(h.policy.docker_flags.includes('--network=none'));
});
test('HTTP: works under /blast-radius/ prefix and serves static assets with relative URLs', async () => {
  const r = await fetch(base + '/blast-radius/');
  const html = await r.text();
  assert.equal(r.status, 200); assert.match(html, /CanonGuard/);
  assert.match(html, /href="\.\/styles\.css"/); assert.match(html, /src="\.\/app\.js"/);
  assert.equal((await fetch(base + '/blast-radius/styles.css')).status, 200);
  assert.equal((await fetch(base + '/blast-radius/api/health')).status, 200);
});
test('HTTP: static path traversal rejected', async () => {
  const r = await fetch(base + '/..%2fserver.js');
  assert.equal(r.status, 404);
});
test('HTTP: POST /api/agent validates input and returns rich report', async () => {
  assert.equal((await fetch(base + '/api/agent', { method: 'POST', body: '{nope' })).status, 400);
  assert.equal((await fetch(base + '/api/agent', { method: 'POST', body: '{}' })).status, 400);
  assert.equal((await fetch(base + '/api/agent')).status, 405);
  const j = await (await fetch(base + '/api/agent', { method: 'POST', body: JSON.stringify({ prompt: 'read ../../etc/passwd' }) })).json();
  for (const k of ['verdict', 'violations', 'plan', 'tools', 'llm', 'blast_radius', 'meta']) assert.ok(k in j, k);
  assert.ok(j.blast_radius.blocked_calls >= 1);
});
test('HTTP: canon summary lists keys only', async () => {
  const j = await (await fetch(base + '/api/canon/summary')).json();
  assert.ok(j.characters.some(c => c.key === 'mileo_chen')); assert.ok(j.locations.includes('tunnel_six')); assert.ok(j.rules.length >= 8);
});

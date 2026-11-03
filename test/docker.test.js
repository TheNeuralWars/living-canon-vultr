'use strict';
// Real one-shot container integration. Runs only where docker + the sandbox image exist (e.g. the Vultr VM).
const test = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('child_process');
const s = require('../lib/sandbox');
let ok = false;
try { execFileSync('docker', ['image', 'inspect', s.IMAGE], { stdio: 'ignore' }); ok = true; } catch {}

test('docker: allowed read runs in one-shot container and returns canon', { skip: !ok && 'docker/image unavailable' }, async () => {
  const r = await s.run({ tool: 'read_canon', path: 'canon.json' }, 'docker');
  assert.equal(r.decision, 'allowed'); assert.equal(r.exit, 0); assert.match(r.output, /mileo_chen/);
  assert.ok(r.docker_argv.includes('--network=none'));
});
test('docker: container cannot write to /canon (ro mount) nor reach network', { skip: !ok && 'docker/image unavailable' }, () => {
  const base = ['run', '--rm', '--network=none', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--user=65534:65534', '-v', `${s.HOST_CANON}:/canon:ro`, s.IMAGE];
  assert.throws(() => execFileSync('docker', [...base, 'sh', '-c', 'echo x > /canon/pwn'], { stdio: 'pipe' }));
  assert.throws(() => execFileSync('docker', [...base, 'wget', '-T', '3', '-q', '-O-', 'http://1.1.1.1'], { stdio: 'pipe' }));
});

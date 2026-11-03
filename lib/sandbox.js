// One-shot Docker sandbox runner. SANDBOX_MODE=docker|local (local = same policy, in-process read for dev/tests).
const { execFile } = require('child_process');
const fs = require('fs'), path = require('path');
const { checkTool, DOCKER_FLAGS, CANON_ROOT } = require('./policy');
const HOST_CANON = process.env.CANON_DIR || path.join(__dirname, '..', 'canon');
const IMAGE = process.env.SANDBOX_IMAGE || 'alpine:3.20';
function argv(dec) {
  const cmd = dec.tool === 'list_canon' ? ['ls', '-1', CANON_ROOT] : ['head', '-c', '65536', dec.path];
  return ['run', ...DOCKER_FLAGS, '-v', HOST_CANON + ':' + CANON_ROOT + ':ro', IMAGE, ...cmd];
}
async function run(call, mode = process.env.SANDBOX_MODE || 'local') {
  const dec = checkTool(call), t0 = Date.now();
  const report = { tool: call.tool, requested: call.path || null, decision: dec.allowed ? 'allowed' : 'blocked', reason: dec.reason || null, mode,
    blast_radius: dec.allowed ? 'container fs (ro /canon, 4MB tmpfs) + its own pids; network=none; no host write' : 'zero (never executed)' };
  if (!dec.allowed) return { ...report, output: null, ms: 0 };
  if (mode === 'docker') {
    const out = await new Promise(res => execFile('docker', argv(dec), { timeout: 15000, maxBuffer: 1 << 17 }, (e, so, se) => res(e ? { error: String(se || e.message).slice(0, 300) } : { stdout: so })));
    return { ...report, docker_argv: argv(dec), output: out.stdout ?? null, error: out.error || null, ms: Date.now() - t0 };
  }
  const rel = path.posix.relative(CANON_ROOT, dec.path);
  const out = dec.tool === 'list_canon' ? fs.readdirSync(HOST_CANON).join('\n') : fs.readFileSync(path.join(HOST_CANON, rel), 'utf8').slice(0, 65536);
  return { ...report, output: out, ms: Date.now() - t0 };
}
module.exports = { run, argv };

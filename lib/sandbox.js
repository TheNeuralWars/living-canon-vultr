'use strict';
/**
 * One-shot sandbox runner.
 *  SANDBOX_MODE=docker → every allowed call is `docker run` with DOCKER_FLAGS, canon mounted :ro.
 *  SANDBOX_MODE=local  → same policy decision, in-process read (dev/tests; still read-only, still jailed).
 * Blocked calls return before any execution path is reached.
 */
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { checkTool, DOCKER_FLAGS, CANON_ROOT } = require('./policy');

const HOST_CANON = process.env.CANON_DIR || path.join(__dirname, '..', 'canon');
const IMAGE = process.env.SANDBOX_IMAGE || 'alpine:3.20';
const MAX_READ = 65536;

function mode() { return (process.env.SANDBOX_MODE || 'local') === 'docker' ? 'docker' : 'local'; }

function argv(dec) {
  const cmd = dec.tool === 'list_canon' ? ['ls', '-1', dec.path || CANON_ROOT] : ['head', '-c', String(MAX_READ), dec.path];
  return ['run', ...DOCKER_FLAGS, '-v', `${HOST_CANON}:${CANON_ROOT}:ro`, IMAGE, ...cmd];
}

function envelope(dec, m) {
  if (!dec.allowed) return { executed: false, scope: 'none', network: 'n/a', host_writes: 0, summary: 'zero — call rejected by policy, never executed' };
  return {
    executed: true,
    scope: m === 'docker' ? 'one-shot container: ro rootfs, ro /canon, 4 MB noexec tmpfs' : 'in-process read-only fs call on jailed path (local dev mode)',
    network: m === 'docker' ? 'none (--network=none)' : 'none (no network API used)',
    host_writes: 0,
    summary: m === 'docker' ? 'container fs + own pids; dies after call' : 'read-only read of canon dir',
  };
}

function runDocker(dec) {
  return new Promise(res => execFile('docker', argv(dec), { timeout: 15000, maxBuffer: 1 << 17 }, (e, so, se) =>
    res(e ? { error: String(se || e.message).slice(0, 300), exit: e.code ?? 1 } : { stdout: so, exit: 0 })));
}

function runLocal(dec) {
  const rel = path.posix.relative(CANON_ROOT, dec.path);
  const host = path.resolve(HOST_CANON, rel);
  // Defence in depth: re-check the jail on the host side too.
  if (host !== path.resolve(HOST_CANON) && !host.startsWith(path.resolve(HOST_CANON) + path.sep)) return { error: 'host_jail_violation', exit: 1 };
  try {
    if (dec.tool === 'list_canon') return { stdout: fs.readdirSync(host).join('\n') + '\n', exit: 0 };
    const fd = fs.openSync(host, 'r');
    try { const buf = Buffer.alloc(MAX_READ); const n = fs.readSync(fd, buf, 0, MAX_READ, 0); return { stdout: buf.subarray(0, n).toString('utf8'), exit: 0 }; }
    finally { fs.closeSync(fd); }
  } catch (e) { return { error: e.code || e.message, exit: 1 }; }
}

async function run(call, m = mode()) {
  const t0 = Date.now();
  const dec = checkTool(call);
  const report = {
    tool: call && call.tool,
    requested: (call && call.path) ?? null,
    resolved: dec.path || dec.resolved || null,
    why: (call && call.why) || null,
    decision: dec.allowed ? 'allowed' : 'blocked',
    reason: dec.allowed ? 'allowlisted + jailed' : dec.reason,
    explain: dec.explain || null,
    mode: m,
    blast_radius: envelope(dec, m),
  };
  if (!dec.allowed) return { ...report, output: null, bytes: 0, exit: null, ms: Date.now() - t0 };
  const out = m === 'docker' ? await runDocker(dec) : runLocal(dec);
  return {
    ...report,
    docker_argv: m === 'docker' ? argv(dec) : null,
    output: out.stdout ?? null,
    bytes: out.stdout ? Buffer.byteLength(out.stdout) : 0,
    error: out.error || null,
    exit: out.exit,
    ms: Date.now() - t0,
  };
}

module.exports = { run, argv, mode, HOST_CANON, IMAGE, MAX_READ };

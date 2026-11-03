'use strict';
/**
 * Sandbox policy — the ONLY layer that decides whether a tool call may run.
 *  1. Tool allowlist (read-only tools only; anything else is blocked before execution).
 *  2. Path jail: every path resolves under CANON_ROOT; NUL bytes, escapes, symlink-ish tricks rejected.
 *  3. Execution envelope: one-shot Docker container with DOCKER_FLAGS (no network, ro rootfs, no caps).
 */
const path = require('path');

const CANON_ROOT = '/canon';
const MAX_PATH_LEN = 256;

const ALLOWED_TOOLS = Object.freeze({
  list_canon: { access: 'read', description: 'List files in the read-only canon mount' },
  read_canon: { access: 'read', description: 'Read one file (≤64 KB) under /canon' },
});

/** Tools the planner may request but the policy will never run (documented for the UI). */
const KNOWN_DENIED = Object.freeze({
  write_canon: 'write access to canon is never granted to the agent',
  http_fetch: 'no network: container runs with --network=none and no egress tool exists',
  exec_shell: 'no arbitrary command execution; only fixed argv for allowlisted tools',
});

function jailPath(p) {
  if (typeof p !== 'string' || !p.trim()) return { ok: false, reason: 'invalid_path' };
  if (p.includes('\0')) return { ok: false, reason: 'nul_byte' };
  if (p.length > MAX_PATH_LEN) return { ok: false, reason: 'path_too_long' };
  if (/^~/.test(p)) return { ok: false, reason: 'path_escape', resolved: p };
  if (/%2e|%2f|\\/i.test(p)) return { ok: false, reason: 'encoded_or_backslash_path' };
  const resolved = path.posix.resolve(CANON_ROOT, p);
  if (resolved !== CANON_ROOT && !resolved.startsWith(CANON_ROOT + '/')) return { ok: false, reason: 'path_escape', resolved };
  return { ok: true, resolved };
}

function checkTool(call) {
  const tool = call && call.tool;
  if (!tool || !Object.prototype.hasOwnProperty.call(ALLOWED_TOOLS, tool)) {
    return { allowed: false, tool, reason: 'tool_not_allowlisted', explain: KNOWN_DENIED[tool] || 'tool is not on the allowlist' };
  }
  if (tool === 'read_canon') {
    const j = jailPath(call.path);
    if (!j.ok) return { allowed: false, tool, reason: j.reason, resolved: j.resolved || null, explain: `path must resolve inside ${CANON_ROOT}` };
    if (j.resolved === CANON_ROOT) return { allowed: false, tool, reason: 'is_directory', explain: 'use list_canon for the directory' };
    return { allowed: true, tool, path: j.resolved };
  }
  const j = jailPath(call.path || '.');
  if (!j.ok) return { allowed: false, tool, reason: j.reason, resolved: j.resolved || null, explain: `path must resolve inside ${CANON_ROOT}` };
  return { allowed: true, tool, path: j.resolved };
}

const DOCKER_FLAGS = Object.freeze([
  '--rm',
  '--network=none',
  '--read-only',
  '--cap-drop=ALL',
  '--security-opt=no-new-privileges',
  '--pids-limit=32',
  '--memory=64m',
  '--cpus=0.5',
  '--user=65534:65534',
  '--tmpfs=/tmp:rw,size=4m,noexec',
]);

function summary() {
  return {
    canon_root: CANON_ROOT,
    allowlist: Object.entries(ALLOWED_TOOLS).map(([name, t]) => ({ name, ...t })),
    denied_examples: Object.entries(KNOWN_DENIED).map(([name, why]) => ({ name, why })),
    path_jail: ['resolve under /canon', 'reject ../ escapes and absolute paths outside', 'reject NUL, ~, %2e/%2f, backslashes', `max ${MAX_PATH_LEN} chars`],
    docker_flags: [...DOCKER_FLAGS],
    canon_mount: `${CANON_ROOT}:ro`,
    human: [
      'Only list_canon and read_canon can run.',
      'Every path is jailed to /canon (mounted read-only).',
      'Each allowed call runs in a fresh container: no network, read-only rootfs, all capabilities dropped, nobody user, 64 MB / 32 pids.',
      'Blocked calls are never executed — their blast radius is zero.',
    ],
  };
}

module.exports = { CANON_ROOT, ALLOWED_TOOLS, KNOWN_DENIED, jailPath, checkTool, DOCKER_FLAGS, summary };

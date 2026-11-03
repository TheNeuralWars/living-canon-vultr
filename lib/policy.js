// Sandbox policy: path jail + tool allowlist. Blast radius = read-only canon dir inside a one-shot container.
const path = require('path');
const CANON_ROOT = '/canon';
const ALLOWED_TOOLS = { read_canon: 'read', list_canon: 'read' };
function jailPath(p) {
  if (typeof p !== 'string' || !p || p.includes('\0')) return { ok: false, reason: 'invalid_path' };
  const resolved = path.posix.resolve(CANON_ROOT, p);
  if (resolved !== CANON_ROOT && !resolved.startsWith(CANON_ROOT + '/')) return { ok: false, reason: 'path_escape', resolved };
  return { ok: true, resolved };
}
function checkTool(call) {
  if (!call || !ALLOWED_TOOLS[call.tool]) return { allowed: false, reason: 'tool_not_allowlisted', tool: call && call.tool };
  if (call.tool === 'read_canon') { const j = jailPath(call.path); if (!j.ok) return { allowed: false, reason: j.reason, tool: call.tool }; return { allowed: true, tool: call.tool, path: j.resolved }; }
  return { allowed: true, tool: call.tool, path: CANON_ROOT };
}
const DOCKER_FLAGS = ['--rm', '--network=none', '--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges', '--pids-limit=32', '--memory=64m', '--cpus=0.5', '--user=65534:65534', '--tmpfs=/tmp:rw,size=4m,noexec'];
module.exports = { CANON_ROOT, ALLOWED_TOOLS, jailPath, checkTool, DOCKER_FLAGS };

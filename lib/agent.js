'use strict';
/**
 * CanonGuard orchestration:
 *   plan → policy-gated sandbox calls → deterministic rules → LLM critique → blast-radius report.
 * The verdict is decided by deterministic rules; the LLM only explains. Safety is decided by policy only.
 */
const guard = require('./canonguard');
const sandbox = require('./sandbox');
const llm = require('./inference');
const policy = require('./policy');
const VERSION = require('../package.json').version;

const TRUNC = 280;
const trunc = s => (s == null ? null : s.length > TRUNC ? s.slice(0, TRUNC) + `… (+${s.length - TRUNC} bytes)` : s);

async function runAgent(prompt, { extraCalls = [] } = {}) {
  const t0 = Date.now();
  const text = String(prompt || '').slice(0, 4000);
  const calls = guard.plan(text, extraCalls);

  const results = [];
  for (const c of calls) results.push(await sandbox.run(c));

  // In-process focus over the canon that was read *through the sandbox*.
  let canonObj = null;
  const canonRead = results.find(r => r.tool === 'read_canon' && r.decision === 'allowed' && r.resolved === '/canon/canon.json' && r.output);
  try { canonObj = canonRead ? JSON.parse(canonRead.output) : null; } catch { canonObj = null; }
  const focus = canonObj ? guard.focus(canonObj, text) : { characters: {}, locations: [] };

  const blocked = results.filter(r => r.decision === 'blocked');
  // A prompt that tries to make the agent write, escape, exfiltrate or exec is itself a finding.
  const violations = guard.check(text).concat(blocked.map(b => ({
    rule: 'unsafe_tool_request',
    severity: 'high',
    detail: `Prompt induced ${b.tool}${b.requested ? ' ' + b.requested : ''} → blocked by policy (${b.reason}); never executed.`,
    evidence_span: { start: 0, end: 0, text: `${b.tool}(${b.requested ?? ''})` },
  })));
  const executed = results.filter(r => r.decision === 'allowed');

  const note = await llm.critique({ prompt: text, violations, blocked, focus, chars: Object.keys(focus.characters) });
  const sbMode = sandbox.mode();

  return {
    verdict: violations.length ? 'REVISE' : 'PASS',
    prompt: text,
    violations,
    focus: { characters: Object.keys(focus.characters), locations: focus.locations },
    plan: calls.map((c, i) => ({ step: i + 1, tool: c.tool, path: c.path ?? null, why: c.why })),
    tools: results.map((r, i) => ({ step: i + 1, ...r, output: trunc(r.output) })),
    llm: note,
    blast_radius: {
      network: 'none',
      host_writes: 0,
      blocked_calls: blocked.length,
      executed_calls: executed.length,
      errored_calls: executed.filter(r => r.error).length,
      scope: sbMode === 'docker' ? 'read-only /canon inside one-shot containers' : 'read-only /canon (local dev mode, same policy)',
      docker_flags_summary: policy.DOCKER_FLAGS.join(' '),
      blocked_reasons: blocked.map(b => ({ tool: b.tool, requested: b.requested, reason: b.reason })),
    },
    meta: { inference_mode: note.mode, sandbox_mode: sbMode, version: VERSION, ms: Date.now() - t0 },
  };
}

module.exports = { runAgent };

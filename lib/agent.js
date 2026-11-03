const guard = require('./canonguard'), sandbox = require('./sandbox'), llm = require('./inference');
async function runAgent(prompt, { extraCalls = [] } = {}) {
  const calls = guard.plan(prompt, extraCalls), tools = [];
  for (const c of calls) tools.push(await sandbox.run(c));
  const violations = guard.check(prompt);
  const vs = violations.length ? violations.map(v => v.rule + ':' + v.detail).join('; ') : 'none';
  const ans = await llm.chat([{ role: 'system', content: 'You are CanonGuard, a continuity validator for Fractured Code / Neural Wars. Be concise.' },
    { role: 'user', content: 'PROMPT: ' + prompt + '\nVIOLATIONS: ' + vs }]);
  const blocked = tools.filter(t => t.decision === 'blocked');
  return { verdict: violations.length ? 'REVISE' : 'PASS', violations, plan: calls, tools: tools.map(t => ({ ...t, output: t.output ? t.output.slice(0, 200) + '…' : null })), llm: ans,
    blast_radius: { network: 'none', host_writes: 0, blocked_calls: blocked.length, executed_calls: tools.length - blocked.length, scope: 'read-only /canon inside one-shot container' } };
}
module.exports = { runAgent };

// OpenAI-compatible client for Vultr Serverless Inference. VULTR_INFERENCE_MODE=mock (default) | live.
function cfg() { return { mode: process.env.VULTR_INFERENCE_MODE || 'mock', url: (process.env.VULTR_INFERENCE_URL || 'https://api.vultrinference.com/v1').replace(/\/$/, ''), key: process.env.VULTR_INFERENCE_API_KEY, model: process.env.VULTR_INFERENCE_MODEL || 'llama-3.3-70b-instruct-fp8' }; }
function mock(messages) {
  const u = messages[messages.length - 1].content;
  const v = (u.match(/VIOLATIONS: (.*)/) || [])[1] || 'none';
  return v === 'none' ? 'CanonGuard (mock LLM): prompt is canon-consistent. Proceed; continuity locks respected.'
    : 'CanonGuard (mock LLM): REVISE. Violations: ' + v + '. Suggested fix: align with canon invariants (e.g. Coil on LEFT wrist, known characters/locations only).';
}
async function chat(messages, opts = {}) {
  const c = cfg(), t0 = Date.now();
  if (c.mode !== 'live') return { text: mock(messages), model: 'mock', mode: 'mock', ms: Date.now() - t0 };
  if (!c.key) { const e = new Error('VULTR_INFERENCE_API_KEY not set (mode=live)'); e.code = 503; throw e; }
  const r = await fetch(c.url + '/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + c.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: c.model, messages, max_tokens: opts.max_tokens || 500, temperature: opts.temperature ?? 0.3 }), signal: AbortSignal.timeout(60000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error('Vultr Inference ' + r.status); e.code = 502; throw e; }
  return { text: j.choices?.[0]?.message?.content || '', model: c.model, mode: 'live', usage: j.usage, ms: Date.now() - t0 };
}
module.exports = { chat, cfg };

'use strict';
/**
 * OpenAI-compatible client for Vultr Serverless Inference.
 * VULTR_INFERENCE_MODE=mock (default) | live. The mode is always reported back — never faked.
 * The LLM gets text only (prompt + deterministic findings). It has no tools.
 */
function cfg() {
  return {
    mode: process.env.VULTR_INFERENCE_MODE === 'live' ? 'live' : 'mock',
    url: (process.env.VULTR_INFERENCE_URL || 'https://api.vultrinference.com/v1').replace(/\/$/, ''),
    key: process.env.VULTR_INFERENCE_API_KEY || '',
    model: process.env.VULTR_INFERENCE_MODEL || 'llama-3.3-70b-instruct-fp8',
  };
}

const FIXES = {
  coil_right_wrist: 'move the Serpent Coil to the LEFT wrist',
  sierra_scar_right_cheek: 'put Sierra\'s pale scar on the LEFT cheek, temple to jaw',
  readable_badge: 'render the badge as blank hexagonal geometry',
  global_negative_text: 'remove readable text / logos / HUD / watermarks from the frame',
  panel_language: 'describe one continuous frame (no split-screen or panels)',
  kora_vest_misattributed: 'keep the copper-bronze vest on Kora Vega only',
  eye_color_mismatch: 'restore the locked eye colour',
  unknown_character: 'use a canon character tag (e.g. @mileo_chen) or register the character first',
  unknown_location: 'use a canon location tag (e.g. #tunnel_six)',
  unsafe_tool_request: 'drop the instruction; CanonGuard is read-only by construction',
};

/** Deterministic mock that reasons over the actual findings (so mock output is still meaningful). */
function mock(ctx) {
  const v = ctx.violations || [];
  const blocked = ctx.blocked || [];
  const lines = [];
  if (!v.length) lines.push('PASS — prompt is canon-consistent. Continuity locks respected' + (ctx.chars && ctx.chars.length ? ` for ${ctx.chars.join(', ')}` : '') + '.');
  else {
    lines.push(`REVISE — ${v.length} continuity issue${v.length > 1 ? 's' : ''}:`);
    for (const x of v) lines.push(`• [${x.severity}] ${x.rule}: "${x.evidence_span.text}" → ${FIXES[x.rule] || 'align with canon'}.`);
  }
  if (blocked.length) lines.push(`Policy blocked ${blocked.length} tool call${blocked.length > 1 ? 's' : ''} (${blocked.map(b => `${b.tool}:${b.reason}`).join(', ')}); nothing was executed or written.`);
  return lines.join('\n');
}

function messages(ctx) {
  const vs = ctx.violations.length ? ctx.violations.map(v => `- ${v.rule} [${v.severity}] "${v.evidence_span.text}": ${v.detail}`).join('\n') : 'none';
  const bl = ctx.blocked.length ? ctx.blocked.map(b => `- ${b.tool} ${b.requested ?? ''} → ${b.reason}`).join('\n') : 'none';
  return [
    { role: 'system', content: 'You are CanonGuard, a continuity editor for Fractured Code / The Neural Wars. Given a scene prompt, deterministic rule findings, and blocked tool calls, reply in ≤6 short lines: verdict, concrete fixes, and note blocked calls. Never invent canon.' },
    { role: 'user', content: `PROMPT:\n${ctx.prompt}\n\nCANON IN SCOPE:\n${JSON.stringify(ctx.focus).slice(0, 2500)}\n\nVIOLATIONS:\n${vs}\n\nBLOCKED CALLS:\n${bl}` },
  ];
}

async function critique(ctx, opts = {}) {
  const c = cfg(), t0 = Date.now();
  if (c.mode !== 'live') return { text: mock(ctx), mode: 'mock', model: 'mock (deterministic)', ms: Date.now() - t0 };
  if (!c.key) return { text: 'Live inference requested but VULTR_INFERENCE_API_KEY is not set. Deterministic verdict still applies.', mode: 'live', model: c.model, error: 'missing_api_key', ms: Date.now() - t0 };
  try {
    const r = await fetch(c.url + '/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + c.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: c.model, messages: messages(ctx), max_tokens: opts.max_tokens || 400, temperature: opts.temperature ?? 0.2 }),
      signal: AbortSignal.timeout(opts.timeout || 45000),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { text: `Vultr Inference HTTP ${r.status}. Deterministic verdict still applies.`, mode: 'live', model: c.model, error: 'http_' + r.status, ms: Date.now() - t0 };
    return { text: j.choices?.[0]?.message?.content || '', mode: 'live', model: c.model, usage: j.usage || null, ms: Date.now() - t0 };
  } catch (e) {
    return { text: `Vultr Inference unreachable (${e.name}). Deterministic verdict still applies.`, mode: 'live', model: c.model, error: e.name, ms: Date.now() - t0 };
  }
}

module.exports = { cfg, critique, mock, messages, FIXES };

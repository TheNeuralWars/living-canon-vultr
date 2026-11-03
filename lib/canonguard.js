'use strict';
/**
 * CanonGuard — deterministic continuity rules for Fractured Code / The Neural Wars.
 *
 * Rules are pure functions over (prompt text, canon.json). They never call the LLM
 * and never touch the filesystem, so the verdict is reproducible and testable.
 * Each violation: { rule, severity: 'high'|'medium'|'low', detail, evidence_span: {start,end,text} }
 */
const canon = require('../canon/canon.json');

const CHARS = Object.keys(canon.characters);
const LOCS = Object.keys(canon.locations);
const GLOBAL_NEGATIVES = canon.global_negatives || [];

const norm = s => String(s).toLowerCase().trim().replace(/[\s-]+/g, '_');

/** Alias table: every way a prompt may name a character → canonical key. */
function buildCharacterAliases() {
  const map = new Map();
  for (const key of CHARS) {
    const dn = canon.characters[key].display_name || key;
    const words = dn.replace(/^dr\.?\s+/i, '').split(/\s+/);
    const aliases = new Set([key, norm(dn), ...key.split('_'), ...words.map(w => w.toLowerCase())]);
    for (const a of aliases) if (a.length >= 3) map.set(norm(a), key);
  }
  return map;
}
const CHAR_ALIASES = buildCharacterAliases();

function buildLocationAliases() {
  const map = new Map();
  for (const key of LOCS) {
    map.set(key, key);
    for (const a of canon.locations[key].aliases || []) map.set(norm(a), key);
  }
  return map;
}
const LOC_ALIASES = buildLocationAliases();

/** Split prompt into sentence-ish clauses with absolute offsets, so rules don't bleed across sentences. */
function clauses(text) {
  const out = [];
  const re = /[^.!?;\n]+/g;
  let m;
  while ((m = re.exec(text))) out.push({ text: m[0], start: m.index });
  return out;
}

function span(text, start, end) {
  return { start, end, text: text.slice(start, end).trim() };
}

/** Which canon characters are mentioned (by @tag, display name or first/last name). */
function mentionedCharacters(text) {
  const t = text.toLowerCase();
  const found = new Set();
  for (const [alias, key] of CHAR_ALIASES) {
    const re = new RegExp('(^|[^a-z_])@?' + alias.replace(/_/g, '[ _-]') + '(?![a-z])', 'i');
    if (re.test(t)) found.add(key);
  }
  return [...found];
}

// ---------- individual rules ----------

const RULES = [];
const rule = (id, fn) => RULES.push({ id, fn });

// Serpent Coil is LEFT wrist only (Mileo, post-cut).
rule('coil_right_wrist', (text) => {
  const v = [];
  for (const c of clauses(text)) {
    const l = c.text.toLowerCase();
    if (/\b(serpent\s+)?coil\b/.test(l) && /\bright\s+(wrist|arm|forearm|hand)\b/.test(l)) {
      v.push({ severity: 'high', detail: 'Serpent Coil is canon on the LEFT wrist only (Mileo Chen, post-cut). "Coil NEVER on right wrist".', evidence_span: span(text, c.start, c.start + c.text.length) });
    }
  }
  return v;
});

// Sierra Catalano's scar is on the LEFT cheek, temple to jaw.
rule('sierra_scar_right_cheek', (text, ctx) => {
  const v = [];
  for (const c of clauses(text)) {
    const l = c.text.toLowerCase();
    const sierraHere = /\bsierra\b|\bcatalano\b|@sierra_catalano/.test(l) || (ctx.chars.includes('sierra_catalano') && /\b(her|she)\b/.test(l));
    if (sierraHere && /\bscar/.test(l) && /\bright\s+(cheek|side of (her )?face|jaw|temple)\b/.test(l)) {
      v.push({ severity: 'high', detail: 'Sierra Catalano: pale scar on the LEFT cheek, temple to jaw. "Scar NEVER on right cheek".', evidence_span: span(text, c.start, c.start + c.text.length) });
    }
  }
  return v;
});

// Badges are blank hexagonal geometry — no readable text, letters or logos.
rule('readable_badge', (text) => {
  const v = [];
  for (const c of clauses(text)) {
    const l = c.text.toLowerCase();
    if (/\bbadge/.test(l) && /\b(text|reads|reading|says|saying|logo|letter(s|ing)?|name|engraved|printed|inscri\w+|label(led)?|"|')/.test(l) && !/\b(blank|no (readable )?text|without text)\b/.test(l)) {
      v.push({ severity: 'high', detail: 'Mileo\'s badge is blank hexagonal geometry only — no readable text / lettering / logos.', evidence_span: span(text, c.start, c.start + c.text.length) });
    }
  }
  return v;
});

// Global negatives: readable text, logos, HUD, watermarks, signage, panel language …
const NEGATIVE_PATTERNS = [
  { re: /\breadable\s+text\b/i, label: 'readable text' },
  { re: /\b(logo|logos|branding|brand\s+mark)\b/i, label: 'logo' },
  { re: /\bwatermark(s|ed)?\b/i, label: 'watermarks' },
  { re: /\bhud(\s+text|\s+overlay)?\b/i, label: 'HUD text' },
  { re: /\b(signage|neon\s+sign(s)?|street\s+signs?|carteles)\b/i, label: 'signage' },
  { re: /\b(letters?|lettering|words?)\s+on\s+(his|her|their|the)?\s*(clothes|clothing|jacket|vest|apron|shirt)\b/i, label: 'letters on clothing' },
  { re: /\bneurosys\s+(lettering|logo|text)\b/i, label: 'NeuroSys lettering' },
  { re: /\bnivel\s*7\s+badge\s+text\b/i, label: 'Nivel 7 badge text' },
  { re: /\b(resistencia|resistance)\b[^.]{0,30}\b(printed|label|patch|lettering)\b/i, label: 'faction name labels on clothes' },
  { re: /\btitle\s+cards?\b|\bsubtitles?\b|\bcaptions?\s+on\s+screen\b/i, label: 'title cards' },
];
rule('global_negative_text', (text) => {
  const v = [];
  for (const p of NEGATIVE_PATTERNS) {
    const m = p.re.exec(text);
    if (m) v.push({ severity: 'medium', detail: `Global negative "${p.label}" — canon frames carry no readable text, logos, HUD or watermarks.`, evidence_span: span(text, m.index, m.index + m[0].length) });
  }
  return v;
});

// Panel language: split-screen, diptych, quad-split, storyboard tiles…
rule('panel_language', (text) => {
  const m = /\b(split[\s-]?screen|diptych|triptych|quad[\s-]?split|multi[\s-]?panel|storyboard\s+tiles|collage|upper\s+frame|lower\s+frame|side[\s-]by[\s-]side\s+panels?)\b/i.exec(text);
  return m ? [{ severity: 'medium', detail: 'Single continuous frame only — split-screen / multi-panel / storyboard language is a global negative.', evidence_span: span(text, m.index, m.index + m[0].length) }] : [];
});

// Kora's copper-bronze vest is a female-Kora-only signature.
rule('kora_vest_misattributed', (text) => {
  const v = [];
  for (const c of clauses(text)) {
    const l = c.text.toLowerCase();
    if (/copper[\s-]?bronze\s+vest|bronze\s+vest|copper\s+vest/.test(l)) {
      const maleSubject = /\b(he|his|him|man|male|boy|guy)\b/.test(l) || /\b(mileo|okafor|marcus|riv)\b/.test(l);
      if (maleSubject && !/\bkora\b[^.]{0,20}\b(her|she)\b/.test(l)) {
        v.push({ severity: 'medium', detail: 'Copper-bronze vest belongs to female Kora Vega only — never on a male character.', evidence_span: span(text, c.start, c.start + c.text.length) });
      }
    }
  }
  return v;
});

// Eye colour locks (cheap, high-signal continuity check).
rule('eye_color_mismatch', (text) => {
  const v = [];
  const locks = { mileo_chen: /green/, kora_vega: /brown|indigo/, sierra_catalano: /hazel/ };
  const colors = /\b(blue|green|brown|hazel|grey|gray|amber|red|violet|black)\s+eyes\b/i;
  for (const c of clauses(text)) {
    const m = colors.exec(c.text);
    if (!m) continue;
    const who = mentionedCharacters(c.text).filter(k => locks[k]);
    if (who.length === 1 && !locks[who[0]].test(m[1].toLowerCase())) {
      v.push({ severity: 'low', detail: `${canon.characters[who[0]].display_name} has ${canon.characters[who[0]].eyes} eyes (canon lock).`, evidence_span: span(text, c.start + m.index, c.start + m.index + m[0].length) });
    }
  }
  return v;
});

// Unknown @character / #location tags.
rule('unknown_character', (text) => {
  const v = [];
  for (const m of text.matchAll(/@([A-Za-z][\w-]*)/g)) {
    if (!CHAR_ALIASES.has(norm(m[1]))) v.push({ severity: 'high', detail: `@${m[1]} is not in canon.characters (known: ${CHARS.join(', ')}).`, evidence_span: span(text, m.index, m.index + m[0].length) });
  }
  return v;
});
rule('unknown_location', (text) => {
  const v = [];
  for (const m of text.matchAll(/#([A-Za-z0-9][\w-]*)/g)) {
    if (!LOC_ALIASES.has(norm(m[1]))) v.push({ severity: 'high', detail: `#${m[1]} is not in canon.locations (known: ${LOCS.length} locations).`, evidence_span: span(text, m.index, m.index + m[0].length) });
  }
  return v;
});

/** Run every rule; returns structured violations sorted by severity then position. */
function check(prompt) {
  const text = String(prompt || '');
  const ctx = { chars: mentionedCharacters(text) };
  const order = { high: 0, medium: 1, low: 2 };
  const out = [];
  for (const r of RULES) for (const x of r.fn(text, ctx)) out.push({ rule: r.id, ...x });
  return out.sort((a, b) => order[a.severity] - order[b.severity] || a.evidence_span.start - b.evidence_span.start);
}

// ---------- planner ----------

const WRITE_INTENT = /\b(write|edit|overwrite|modify|update|patch|append|delete|remove|rm|truncate|wipe|chmod|mv)\b/i;

/**
 * Plan the sandbox tool calls for a prompt. The planner is deliberately "naive":
 * it plans whatever the prompt asks for (including writes and escapes) so that the
 * POLICY layer is what visibly stops them. Safety never depends on the planner.
 */
function plan(prompt, extra = []) {
  const text = String(prompt || '');
  const calls = [
    { tool: 'list_canon', path: '.', why: 'enumerate canon files available to the agent' },
    { tool: 'read_canon', path: 'canon.json', why: 'load characters, locations and global negatives' },
  ];
  const chars = mentionedCharacters(text);
  if (chars.length) calls[1].why += ` (focus: ${chars.join(', ')})`;
  for (const m of text.matchAll(/\b(?:read|open|cat|load|show)\s+((?:\.{1,2}\/|\/)?[\w./~-]+\.?\w*)/gi)) {
    const p = m[1];
    if (p !== 'canon.json' && /[./]/.test(p)) calls.push({ tool: 'read_canon', path: p, why: 'user asked to read this path' });
  }
  if (WRITE_INTENT.test(text)) {
    const target = (text.match(/\b(?:write|edit|overwrite|modify|update|patch|append|delete|remove|rm|truncate|wipe)\s+(?:to\s+)?([\w./~-]+\.\w+)/i) || [])[1] || 'canon.json';
    calls.push({ tool: 'write_canon', path: target, why: 'prompt expresses write/delete intent' });
  }
  if (/\b(curl|wget|fetch|http:\/\/|https:\/\/|exfiltrate|upload)\b/i.test(text)) calls.push({ tool: 'http_fetch', path: null, why: 'prompt asks for network access' });
  if (/\b(run|exec|execute|shell|bash|sh -c)\b/i.test(text)) calls.push({ tool: 'exec_shell', path: null, why: 'prompt asks to execute a command' });
  for (const e of extra || []) if (e && typeof e === 'object') calls.push({ ...e, why: e.why || 'extraCalls (API)' });
  return calls;
}

/** Narrow the full canon to the entities in scope (done in-process after the sandboxed read). */
function focus(canonObj, prompt) {
  const chars = mentionedCharacters(String(prompt || ''));
  const out = { characters: {}, locations: [] };
  for (const k of chars) if (canonObj.characters && canonObj.characters[k]) out.characters[k] = canonObj.characters[k];
  for (const m of String(prompt || '').matchAll(/#([\w-]+)/g)) { const k = LOC_ALIASES.get(norm(m[1])); if (k) out.locations.push(k); }
  return out;
}

function summary() {
  return {
    characters: CHARS.map(k => ({ key: k, display_name: canon.characters[k].display_name })),
    locations: LOCS,
    global_negatives: GLOBAL_NEGATIVES.length,
    rules: RULES.map(r => r.id),
  };
}

module.exports = { check, plan, focus, summary, mentionedCharacters, RULES, CHARS, LOCS, GLOBAL_NEGATIVES, norm };

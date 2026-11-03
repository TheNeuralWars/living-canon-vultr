// Deterministic CanonGuard rules (Fractured Code / Neural Wars) + planner.
const canon = require('../canon/canon.json');
const CHARS = Object.keys(canon.characters), LOCS = Object.keys(canon.locations);
const norm = s => s.toLowerCase().replace(/[\s-]+/g, '_');
function check(prompt) {
  const v = [], t = String(prompt).toLowerCase();
  if (/coil[^.]{0,40}right wrist|right wrist[^.]{0,40}coil/.test(t)) v.push({ rule: 'coil_right_wrist', detail: 'Serpent Coil is LEFT wrist only' });
  if (/badge[^.]{0,40}(text|reads|says|logo|letters)/.test(t)) v.push({ rule: 'readable_badge', detail: 'badges are blank hexagonal geometry' });
  for (const m of t.matchAll(/@([a-z_]+)/g)) if (!CHARS.includes(m[1])) v.push({ rule: 'unknown_character', detail: m[1] });
  for (const m of t.matchAll(/#([a-z0-9_]+)/g)) if (!LOCS.includes(m[1])) v.push({ rule: 'unknown_location', detail: m[1] });
  return v;
}
// Planner: which sandbox tools to call. Write/exec intents are planned (so the policy can visibly block them).
function plan(prompt, extra = []) {
  const t = String(prompt).toLowerCase(), calls = [{ tool: 'read_canon', path: 'canon.json' }];
  if (/write|edit|overwrite|delete|rm /.test(t)) calls.push({ tool: 'write_canon', path: 'canon.json' });
  const m = t.match(/read (\S+)/); if (m) calls.push({ tool: 'read_canon', path: m[1] });
  return calls.concat(extra);
}
module.exports = { check, plan, CHARS, LOCS, norm };

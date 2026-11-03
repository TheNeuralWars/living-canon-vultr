# LabLab.ai submit draft — Vultr Agent Rush
**Working title:** Living Canon · CanonGuard (Blast Radius Zero)
**Track:** Blast Radius Zero
**Deadline:** Sun 8 Nov 2026 ~23:00 Europe/Rome (prefer ≤20:00)
**Repo:** https://github.com/TheNeuralWars/living-canon-vultr
**Team / contact:** Diego Nicolas Lopez Del Bel · nico@goalworld.fun · @nicopez

## One-liner
CanonGuard is a Fractured Code / Neural Wars canon critic whose every tool call is allowlisted and executed in a throwaway Docker sandbox with zero host writes and no network — blast radius = one disposable container.

## What we built
- Deterministic canon checks (characters, locations, visual invariants e.g. Serpent Coil LEFT wrist only).
- Policy gate: allowlist + path jail; writes/deletes/path escapes blocked *before* execution.
- One-shot Docker sandbox: `--network=none --read-only --cap-drop=ALL --no-new-privileges --user 65534`, canon `:ro`, tiny noexec tmpfs.
- Blast-radius report on every response (executed vs blocked, host_writes always 0).
- Vultr Serverless Inference client (OpenAI-compatible); **mock mode by default** so the full demo runs offline; flip to live via env only.

## Vultr products used
| Piece | Product |
|---|---|
| App + Docker host | Vultr Cloud Compute VM (see `deploy/vultr-vm.md`) |
| LLM critic | Vultr Serverless Inference `/chat/completions` (`lib/inference.js`) |

## Demo (judges)
1. UI → default prompt → **PASS**, 1 sandboxed read, 0 blocked.
2. Bad example (coil on right wrist / overwrite canon) → **REVISE**, write **blocked**, host_writes 0.
3. Escape (`read ../../etc/passwd`) → path_escape **blocked**, never executed.
4. `GET /api/health` → inference mode mock|live + sandbox mode.

## Run offline (mock)
```bash
cp .env.example .env
npm test          # 8/8
npm start         # http://localhost:3000
```

## Live Inference (when credits available)
```
VULTR_INFERENCE_MODE=live
VULTR_INFERENCE_URL=https://api.vultrinference.com/v1
VULTR_INFERENCE_API_KEY=...
VULTR_INFERENCE_MODEL=...
```

## Links (fill before submit)
- Demo URL: _pending (Nico OK for public demo / VM)_
- Video: _pending mock 2–3 min_
- Architecture: `docs/ARCHITECTURE.md`

## Notes for form
- Free / MIT
- No paid Vultr credits used in this build (mock Inference); wiring documented for live.

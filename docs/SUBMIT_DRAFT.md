# lablab submission draft — Vultr Agent Rush (DRAFT, not submitted)
Deadline: ≤ 20:00 Europe/Rome, Sun 8 Nov 2026. Needs Nico OK before submit.

**Project name:** CanonGuard — Living Canon × Vultr
**Track:** Blast Radius Zero
**Team / contact:** Diego Nicolas Lopez Del Bel · nico@goalworld.fun · @nicopez

**One-liner:** A story-canon AI agent whose tool calls can't hurt anything: allowlisted, path-checked, and run in one-shot network-less read-only containers.

**Description:**
Writers on *Fractured Code* use AI agents that read — and try to edit — the canon (e.g. the Serpent Coil is on Mileo's LEFT wrist only; only known characters). CanonGuard sits between the agent and its tools. A policy gate allowlists tools and normalises paths (no `../` escapes); every allowed call executes in a fresh `docker run --rm --network=none --read-only` container with the canon mounted read-only, a 4 MB tmpfs and a pids limit. Disallowed calls (e.g. `write_canon`, `../../etc/passwd`) are never executed. Every response returns a `blast_radius` report (network, host_writes, blocked/executed calls, scope) plus a continuity verdict (PASS / REVISE) from the LLM.

**How Vultr is used:**
- Vultr Cloud Compute VM hosts the Node app + Docker sandbox behind Caddy TLS (guide: `deploy/vultr-vm.md`).
- Vultr Serverless Inference (OpenAI-compatible) produces the continuity verdict — wired via env (`VULTR_INFERENCE_API_KEY`, `VULTR_INFERENCE_MODEL`, `VULTR_INFERENCE_URL`, `VULTR_INFERENCE_MODE`).
- **Honest status:** the submitted demo runs in **mock inference mode** — Vultr keys/credits not yet provisioned. Code path for live mode exists; `/api/health` reports `inference_mode`.

**Repo:** https://github.com/TheNeuralWars/living-canon-vultr (MIT)
**Video (local):** `media/blast_radius_zero_demo.mp4` (2:38 1080p, MOCK INFERENCE labelled) — needs Nico OK to upload (Drive/YT) for a public link.
**Demo URL:** TBD (Nico OK; do not use well/fit/lukoo tunnels). Local VPS preview: `http://127.0.0.1:3077` (PORT=3077; 3000 was occupied).

**Judge demo steps:**
1. UI → default prompt → **PASS**, 1 sandboxed read, 0 blocked.
2. Bad example (coil on right wrist / overwrite canon) → **REVISE**, write **blocked**, host_writes 0.
3. Escape (`read ../../etc/passwd`) → path_escape **blocked**, never executed.
4. `GET /api/health` → inference mode mock|live + sandbox mode.

**Run locally:**
```
git clone https://github.com/TheNeuralWars/living-canon-vultr && cd living-canon-vultr
npm test          # 8/8
npm start         # http://localhost:3000 (PORT env to override)
# optional: VULTR_INFERENCE_MODE=live + keys; SANDBOX_MODE=docker
```

**Architecture:**
- `server.js` — HTTP: `/api/health`, `POST /api/agent`, static UI (3 demo buttons)
- `lib/` — planner → policy gate → sandbox runner → LLM verdict
- Sandbox: one-shot Docker, `--network=none`, ro canon, tmpfs, pids limit; socket-proxy hardening noted in `docs/ARCHITECTURE.md`

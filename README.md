# CanonGuard · Living Canon — Blast Radius Zero

![tests](https://img.shields.io/badge/tests-33%20(31%20%2B%202%20docker)-brightgreen) ![inference](https://img.shields.io/badge/inference-mock%20default%20%C2%B7%20live%20via%20env-orange) ![track](https://img.shields.io/badge/Vultr%20Agent%20Rush-Blast%20Radius%20Zero-3F00FF)

## 30 seconds for judges
- **What:** CanonGuard is a continuity agent for the sci-fi series *Fractured Code / The Neural Wars*. It reads a locked canon bible (`canon/canon.json`) and checks scene prompts: *Serpent Coil only on the LEFT wrist*, *Sierra's scar only on the LEFT cheek*, *badges are blank — no readable text*, no logos/HUD/watermarks, no split-screen, known `@characters` / `#locations` only. Verdict `PASS` / `REVISE` with evidence spans.
- **Why Blast Radius Zero:** the agent is *built to be prompt-injected safely*. The planner deliberately plans whatever the prompt asks (overwrite canon, read `/etc/passwd`, curl it out, run bash). A separate **policy** layer is the only thing that decides: allowlist (`list_canon`, `read_canon` only) + path jail to `/canon`. Allowed calls run in a **one-shot Docker container** — `--network=none --read-only --cap-drop=ALL --security-opt=no-new-privileges --user=65534:65534 --pids-limit=32 --memory=64m`, canon mounted `:ro`. Blocked calls are never executed. Every response ships a **blast-radius report** (executed vs blocked, host writes = 0, network = none).
- **Vultr:** runs on a **Vultr Cloud Compute VM** (app + Docker sandbox host); the critic note uses **Vultr Serverless Inference** (OpenAI-compatible `/chat/completions`).
- **Honesty:** inference is **mock by default**. The header badge and `/api/health` always say `MOCK` or `LIVE`. In mock mode the critic note is deterministic (it lists the real rule hits) and no LLM is called. The verdict never depends on the LLM.

| Piece | Vultr product |
|---|---|
| App + one-shot Docker sandbox host | Vultr Cloud Compute VM — `deploy/vultr-vm.md` |
| Critic / explanation LLM | Vultr Serverless Inference (`lib/inference.js`) |

## Run
```bash
npm test                                   # 31 tests (+2 real-docker tests when docker + alpine:3.20 exist)
PORT=3077 npm start                        # http://localhost:3077  (mock inference, SANDBOX_MODE=local)
SANDBOX_MODE=docker PORT=3077 npm start    # every allowed tool call = fresh container (needs docker + alpine:3.20)
```
Go live (needs your own key; not used in the submitted evidence):
```
VULTR_INFERENCE_MODE=live
VULTR_INFERENCE_URL=https://api.vultrinference.com/v1
VULTR_INFERENCE_API_KEY=<key>
VULTR_INFERENCE_MODEL=<model id>
```
Live failures (missing key, HTTP error, timeout) degrade to an explicit error note; the deterministic verdict still stands.

## Demo (3 clicks)
1. **01 · PASS — Canon-true scene** → `PASS`, 2 sandboxed reads, 0 blocked.
2. **02 · REVISE — Broken continuity** → `REVISE`: coil on right wrist, scar on right cheek, badge reads "NIVEL 7", `@ghost_x`, `#mars`; the `overwrite canon.json` becomes a **blocked** `write_canon`. Host writes 0.
3. **03 · BLOCKED — Escape attempt** → `read ../../etc/passwd`, `/root/.ssh/id_rsa`, `curl`, `bash`, `delete` → 5 calls blocked (`path_escape`, `tool_not_allowlisted`), never executed; only `/canon` was touched.

Deep links: `#demo=good`, `#demo=bad`, `#demo=escape`. The app uses relative URLs and also tolerates the `/blast-radius/` prefix server-side, so it can sit behind a path-prefixed reverse proxy.

## API
| Route | |
|---|---|
| `GET /api/health` | `{ok, version, inference_mode, model, sandbox_mode, policy}` |
| `POST /api/agent` `{prompt, extraCalls?}` | `{verdict, violations[], plan[], tools[], llm, blast_radius, meta, focus}` |
| `GET /api/policy` | allowlist, denied tools, path-jail rules, docker flags, plain-English summary |
| `GET /api/canon/summary` | character/location keys + rule ids (no canon dump) |

## Layout
```
lib/canonguard.js  deterministic rules + planner + in-process canon focus
lib/policy.js      allowlist, path jail, DOCKER_FLAGS, human summary
lib/sandbox.js     docker|local runner, per-call blast-radius envelope
lib/inference.js   Vultr Serverless Inference client (mock|live), honest degrade
lib/agent.js       orchestration → rich JSON report
server.js          static UI + API, prefix-tolerant
public/            index.html · styles.css · app.js (vanilla, no build)
test/              node --test: rules, planner, policy, sandbox, inference, E2E, HTTP, docker
evidence/          test output, smoke JSON, screenshots, checklist
```
Docs: `docs/ARCHITECTURE.md`, `docs/SUBMIT_DRAFT.md`, `deploy/vultr-vm.md`. MIT.

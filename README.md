# Living Canon · CanonGuard — Blast Radius Zero

![tests](https://img.shields.io/badge/tests-8%2F8-brightgreen) ![inference](https://img.shields.io/badge/inference-mock%20default-orange)


Vultr Agent Rush entry (track **Blast Radius Zero**). CanonGuard is an agent that checks story prompts for *Fractured Code / The Neural Wars* against a locked canon (characters, locations, visual invariants such as "Serpent Coil only on the LEFT wrist"). It is built so that a confused or prompt-injected agent **cannot damage anything**:

- Every tool call goes through an **allowlist + path jail** (`lib/policy.js`). Writes, deletes and path escapes (`../../etc/passwd`) are blocked *before* execution.
- Allowed calls run in a **one-shot Docker container**: `--network=none --read-only --cap-drop=ALL --no-new-privileges --user 65534 --pids-limit 32 --memory 64m`, canon mounted `:ro`, 4 MB noexec tmpfs.
- Every response carries a **blast-radius report**: executed vs blocked calls, host writes (always 0), network (none).

**Blast radius = the filesystem and processes of a throwaway container that can read the canon and nothing else.**

## How it uses Vultr
| Piece | Vultr product |
|---|---|
| App + Docker sandbox host | **Vultr Cloud Compute VM** (Docker + Caddy TLS) — see `deploy/vultr-vm.md` |
| LLM reasoning (CanonGuard critic) | **Vultr Serverless Inference**, OpenAI-compatible `/chat/completions` (`lib/inference.js`) |

The inference client defaults to **mock mode** so the full demo runs offline. Flip to live with env only:

```
VULTR_INFERENCE_MODE=live
VULTR_INFERENCE_URL=https://api.vultrinference.com/v1
VULTR_INFERENCE_API_KEY=<your key>
VULTR_INFERENCE_MODEL=<model id from your Vultr Inference subscription>
```
The LLM never receives tool capabilities; it only gets the prompt + the deterministic violations. Its own network egress is the app process, not the sandbox.

## Run
```bash
cp .env.example .env
npm test                       # 8 unit/E2E tests, mock mode, no network
npm start                      # http://localhost:3000  (SANDBOX_MODE=local)
SANDBOX_MODE=docker npm start  # real one-shot containers (needs docker + alpine:3.20)
docker compose up --build      # containerised app
```

## Demo steps
1. Open the UI, run the default prompt → **PASS**, 1 sandboxed read, 0 blocked.
2. Click **Bad example** (coil on right wrist, unknown `@ghost_x`, "overwrite canon.json") → **REVISE**, write call **blocked**, host_writes 0.
3. Click **Escape attempt** (`read ../../etc/passwd`) → path_escape **blocked**, never executed.
4. `GET /api/health` shows inference mode (mock/live) + sandbox mode.

## API
`POST /api/agent {"prompt": "..."}` → `{verdict, violations, plan, tools[], llm, blast_radius}`

Docs: `docs/ARCHITECTURE.md`, `docs/VIDEO_SCRIPT.md`. Derived from [living-canon-amd](https://github.com/TheNeuralWars/living-canon-amd). MIT.

## Health
`GET /api/health` returns JSON with `ok`, `inference_mode` (`mock`|`live`), and `sandbox_mode` (`local`|`docker`). Use it to prove mock vs live without guessing.


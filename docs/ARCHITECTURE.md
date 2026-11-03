# Architecture — CanonGuard (Blast Radius Zero)

```
 prompt ──► planner (canonguard.plan) ──► [calls]          naive on purpose: plans writes/escapes too
                                            │
                                            ▼
                               policy.checkTool(call)        allowlist + path jail  ← the only gate
                                 │ allowed        │ blocked
                                 ▼                ▼
                    sandbox.run (docker|local)   report {decision:'blocked', reason, blast_radius: zero}
                    docker run --rm --network=none --read-only --cap-drop=ALL
                      --security-opt=no-new-privileges --user=65534:65534
                      --pids-limit=32 --memory=64m --cpus=0.5 --tmpfs /tmp:noexec,4m
                      -v canon:/canon:ro alpine:3.20  {ls -1 | head -c 65536} <jailed path>
                                 │
                                 ▼
               canon.json (read via sandbox) ──► guard.focus (in-process, entities in scope)
 prompt ──► guard.check  (deterministic rules) ──► violations[] {rule, severity, detail, evidence_span}
 blocked calls ──► unsafe_tool_request findings
                                 │
                                 ▼
               inference.critique  (Vultr Serverless Inference; mock default)  → explanation only
                                 │
                                 ▼
               agent → {verdict, violations, plan, tools, llm, blast_radius, meta}
```

## Threat model
| Threat | Control | Test |
|---|---|---|
| Prompt injection asks to overwrite/delete canon | `write_canon` not allowlisted; canon mounted `:ro` | `plan: overwrite…`, `sandbox: write_canon blocked, canon file untouched`, `docker: container cannot write` |
| Path traversal (`../../etc/passwd`, `/root/.ssh`, `~`, `%2f`, `\`, NUL, long) | `policy.jailPath` + host-side re-check in local mode | `policy: path jail…`, `E2E escape` |
| Exfiltration (`curl`, upload) | no network tool; container `--network=none` | `E2E escape`, `docker: … nor reach network` |
| Arbitrary exec (`run bash`) | no exec tool; fixed argv only | `E2E escape` |
| Blocked call side effects | blocked branch returns before any exec path | `sandbox: blocked call never executes (docker mode too)` |
| Resource abuse | `--pids-limit=32 --memory=64m --cpus=0.5`, 64 KB read cap, 8 KB body cap, 15 s timeout | argv test |
| LLM hallucinated verdict | verdict = deterministic rules; LLM only explains | E2E tests in mock |
| Fake "live" claim | mode from env, echoed in `/api/health`, UI badge, `meta`, `llm.mode` | `inference: mock is the default…`, `HTTP: /api/health…` |
| Static file traversal | resolved under `public/` only | `HTTP: static path traversal rejected` |

## Rules (lib/canonguard.js)
`coil_right_wrist`, `sierra_scar_right_cheek`, `readable_badge`, `global_negative_text` (readable text, logo, watermark, HUD, signage, letters on clothing, NeuroSys lettering, faction labels, title cards), `panel_language` (split-screen, diptych, quad-split, storyboard tiles…), `kora_vest_misattributed`, `eye_color_mismatch`, `unknown_character`, `unknown_location`, plus agent-level `unsafe_tool_request`. Rules are clause-scoped to avoid cross-sentence false positives.

## Modes
- `SANDBOX_MODE=docker` — production on the Vultr VM. `local` — same policy, in-process read-only fs (dev/tests); the UI badge says which.
- `VULTR_INFERENCE_MODE=mock|live` — see README.

## Limits (honest)
- Rules are regex/clause heuristics over English prompts, not a parser; they are tuned to this canon.
- Local mode does not provide container isolation; it exists for tests and is labelled `dev` in the UI.
- Live inference has not been exercised in the evidence pack (no key used).

# QUALITY_BAR → evidence · Vultr Agent Rush / CanonGuard (Hermes, 2026-11-03)

| QUALITY_BAR item | How it is met | Evidence |
|---|---|---|
| 1. Ambición (edge cases, failure modes, blast radius) | 10 canon rules w/ severity + evidence spans; planner deliberately plans hostile calls; policy blocks write/http/exec + 12 path-jail variants; docker one-shot envelope; live-inference failure degrades honestly | `agent-*.json`, `agent-*-docker.json`, `docker-cleanup.txt`, repo `docs/ARCHITECTURE.md` (threat-model table) |
| 2. Complejidad útil (layers, contract tests) | `lib/` canonguard / policy / sandbox / inference / agent + server; 33 tests (rules, planner, policy, sandbox, inference, E2E, HTTP, real docker) | `npm-test.txt` (33 pass / 0 fail, incl. 2 real-docker), `loc.txt` |
| 3. Buen gusto (UI, docs in 30s) | Dark cinematic UI (Chakra Petch + JetBrains Mono, indigo/plum/copper), 3 demo cards, verdict chip, blast-radius stats + docker flags, tool timeline, critic note, raw JSON; mobile layout; README "30 seconds for judges" | `ui-landing.png`, `ui-good.png`, `ui-bad.png`, `ui-escape.png`, `ui-mobile.png`, `ui-snapshot.html` |
| 4. Evidencia (tests + smoke curl + screenshot) | npm test green; curl smoke vs 127.0.0.1:3077 in local AND docker sandbox modes; headless-Chrome screenshots of the docker-mode server (via SSH port-forward, not public) | `npm-test.txt`, `health.json`, `health-docker.json`, `agent-{good,bad,escape}[-docker].json`, PNGs |
| 5. Honestidad (mock vs live) | `inference_mode: mock` in health, UI badge, `meta`, `llm.mode`; footer honesty line; no demo URL claimed; live path not exercised (no key) | `health.json`, header badge in PNGs |
| Anti-pattern: 1-line HTML | split index.html / styles.css / app.js | `loc.txt` |
| Anti-pattern: agent < 50 LOC | lib/ real canon + policy layers | `loc.txt` |
| Anti-pattern: done w/o public smoke | **OPEN** — public smoke awaits October deploy at goalworld.fun/blast-radius/ | STATUS.md blockers |

Smoke: good → PASS (2 exec / 0 blocked); bad → REVISE, 6 findings, write_canon blocked; escape → REVISE, 5 blocked (2× path_escape, write_canon, http_fetch, exec_shell), only /canon read. host_writes 0, network none in all. Docker mode: 0 leftover containers.

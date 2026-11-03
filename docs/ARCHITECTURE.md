# Architecture
```
Browser ──POST /api/agent──▶ server.js
                              │
                    lib/agent.js (CanonGuard)
     ┌────────────────────────┼─────────────────────────┐
 canonguard.plan()      sandbox.run(call)          canonguard.check()
 (tool calls)           policy.checkTool ─blocked─▶ report (never runs)
                              │allowed
                 docker run --rm --network=none --read-only
                 --cap-drop=ALL -v canon:/canon:ro alpine head …
                              │
                    inference.chat()  ── mock | Vultr Serverless Inference (OpenAI API)
                              ▼
           {verdict, violations, tools, llm, blast_radius}
```
- **Policy first**: allowlist (`read_canon`, `list_canon`) + POSIX path jail under `/canon`.
- **Sandbox**: fixed argv, no shell interpolation, 15 s timeout, 128 KB output cap.
- **Inference**: deterministic rules decide the verdict; the LLM explains/repairs. Mock by default.
- **Host**: one Vultr Cloud Compute VM, Docker, Caddy TLS in front of 127.0.0.1:3000.
- Known trade-off: in compose, the app holds docker.sock to spawn sandboxes; mitigation path = rootless Docker or a socket proxy allowing only `containers/create|start|wait|logs`.

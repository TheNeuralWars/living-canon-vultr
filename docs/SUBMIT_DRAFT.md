# LabLab submit draft — Vultr Agent Rush (NOT SUBMITTED; awaits REVIEW: approved)

**Track:** Blast Radius Zero
**Name:** CanonGuard · Living Canon
**Tagline:** A continuity agent you can prompt-inject all day — it can only read the canon, in a box with no network.

**Problem.** Writers' rooms and AI image pipelines for *Fractured Code / The Neural Wars* keep breaking continuity (coil on the wrong wrist, scar on the wrong cheek, readable badges). An agent that fixes this needs canon access — and that access is exactly what a prompt injection would abuse.

**Solution.** CanonGuard separates *planning* from *permission*. The planner plans whatever the prompt asks — including "overwrite canon.json", "read ../../etc/passwd", "curl it out", "run bash". A policy layer (allowlist of two read-only tools + path jail to `/canon`) decides; allowed calls run in a one-shot container (`--network=none --read-only --cap-drop=ALL --no-new-privileges --user 65534`, canon `:ro`). Each answer carries a blast-radius report: executed vs blocked calls, host writes 0, network none. Deterministic canon rules produce the verdict with evidence spans; Vultr Serverless Inference writes the critic note.

**Vultr usage.** Cloud Compute VM (app + Docker sandbox host). Serverless Inference via OpenAI-compatible client — **mock by default; the demo states MOCK/LIVE in the header and `/api/health`.** (Update this line truthfully before submitting if live was enabled.)

**Proof.** 31 automated tests (+2 real-docker tests on the VM): rules, planner, path-jail variants, allowlist, docker argv, blocked-never-executes, canon file untouched, E2E PASS/REVISE/escape, HTTP. Evidence pack in `evidence/`.

**Demo URL:** _to be filled by October after deploy (planned path /blast-radius/)._
**Repo:** https://github.com/TheNeuralWars/living-canon-vultr
**Video:** _to re-record against the new UI (old media/ captures predate the rewrite)._

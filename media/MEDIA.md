# Blast Radius Zero — media
- Video: `blast_radius_zero_demo.mp4` — 2:43 (163 s), 1920x1080 H.264 30fps, silent AAC track, 4,326,926 B (~4.1 MB). Re-recorded 2026-11-03 from the LIVE cinematic UI.
- Source: real headless-Chrome (CDP) screenshots of https://goalworld.fun/blast-radius/ — landing, demo 01 Good (PASS), 02 Bad (REVISE, write_canon blocked), 03 Escape (REVISE, path_escape + write + http_fetch + exec_shell blocked), mobile 430x932.
- Health at capture: inference_mode=mock, sandbox_mode=docker (alpine:3.20). Every frame carries LIVE URL + MOCK INFERENCE label; no live Vultr inference claimed.
- Cover: `cover.png` (1920x1080, live landing).
- Screenshots + capture/build scripts: `media/live/` (cap.py, build.py). Old slides kept in `media/slides/` (superseded).
- Built: PIL captions + ffmpeg concat (no TTS, no spend).

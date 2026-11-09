# 017: VLM spike (offline)

- type: HITL
- blocked_by: 012

## What to build
Run a small vision-language model through Ollama on your RTX 5070 against the benchmark for layout
understanding. Add its results to `results.md` as a "model-only" and "combined" method. Decide whether to
ship a browser (WebGPU) version: only if it clearly beats the heuristics and is small (about 500 MB or
less), lazy-loaded and opt-in.

## Acceptance criteria
- `results.md` shows rules-only, heuristics, model-only and combined side by side.
- A written ship/don't-ship decision with model name, size and rationale.
- Benchmark images only; no real screenshots are sent to any model.
- If shipped: opt-in, lazy-loaded, self-hosted; otherwise documented as future work.

## Decision (2026-11-09): DON'T SHIP a browser VLM in v1
- Model: `gemma3:12b` via Ollama (only vision model installed; 8.2 GB, ~16x the 500 MB budget). Subset of 60 benchmark images, synthetic only, local.
- Results: model-only is worse than heuristics (57.0% vs 70.5% recall). Combined gains +3.3 pts recall and +1.3 pts fully covered, but precision falls from 63.5% to 36.9% (many extra false boxes).
- It misses tokens entirely (0/4 in the first sample) and takes ~8 s/image on a desktop GPU; a WebGPU browser version would be slower and far larger.
- Future work: a much smaller (<500 MB) vision model, or using the VLM to propose column regions rather than strings. Caveat: strings are mapped to boxes via OCR, so OCR misses cap model-only recall; the model was not asked for coordinates.

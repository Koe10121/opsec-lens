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

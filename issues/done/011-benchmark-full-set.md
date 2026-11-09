# 011: Benchmark full set

- type: AFK
- blocked_by: 010, 008, 009

## What to build
Expand the generator to 5 layouts (terminal, SIEM table, dashboard, chat, form) × 3 themes × varied
fonts and sizes, about 300 seeded images, plus negatives (version numbers, UUIDs, clean
screenshots). Add a "fully covered" metric alongside IoU matching. `results.md` reports recall and
precision per detector and per method (rules-only for now; structure ready for heuristics, VLM and
combined).

## Acceptance criteria
- Generator produces about 300 images deterministically from a seed, with exact labels.
- `results.md` has per-detector and per-method tables including the "fully covered" metric.
- Negatives and clean screenshots are included and counted in precision.
- Generated image set is reproducible and not committed if large (script plus seed is committed).
- `npm test` and `npm run typecheck` pass.

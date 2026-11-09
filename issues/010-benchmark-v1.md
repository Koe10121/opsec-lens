# 010: Benchmark v1: generator + scorer

- type: AFK
- blocked_by: 002

## What to build
`benchmark/generate` (Python, works on Windows): one terminal-style HTML template filled from seeded
fake data (emails on example.com, documentation-range IPs), rendered to PNG with Playwright, with a
`labels.json` of boxes and types taken from DOM bounding boxes. `benchmark/score` (TypeScript): runs
the real OCR and detectors on the generated images, matches findings to labels at IoU >= 0.5 with the
same type, and writes `results.md` with recall and precision per detector.

## Acceptance criteria
- `python benchmark/generate ... --seed 1 --n 20` is deterministic (same seed → same images and labels).
- Running the scorer prints/writes a `results.md` table for email and IP detectors.
- Scorer has unit tests with small hand-written label sets for IoU matching and recall/precision.
- Includes negative cases (version numbers) so precision is meaningful.
- All data synthetic; IPs only in documentation ranges.
- `npm test` and `npm run typecheck` pass.

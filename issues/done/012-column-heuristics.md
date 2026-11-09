# 012: Column heuristics

- type: AFK
- blocked_by: 011, 004

## What to build
`detectors/layout`: find header words such as "Source IP" or "Username", then flag all words in the same
x-range below the header as a column finding (including values matching no pattern). Findings appear in
the review screen with a "column" label and can be toggled as a unit. Benchmark reports rules-only vs
rules + heuristics.

## Acceptance criteria
- On a synthetic SIEM table, the whole "Source IP"/"Username" column is boxed, including non-pattern values.
- Header-like words in prose do not trigger column redaction (negative fixtures).
- Unit tests on hand-built `Word[]` table fixtures.
- `results.md` shows rules-only vs rules + heuristics.
- `npm test` and `npm run typecheck` pass.

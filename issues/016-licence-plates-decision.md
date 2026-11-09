# 016: Licence plates: decide

- type: HITL
- blocked_by: 015

## What to build
A short spike: is there a good, small, licence-compatible plate detector that runs in the browser? If yes,
add it to `detectors/visual` and the review screen. If not, drop plates from v1 and record that in the
README limitations.

## Acceptance criteria
- A written decision (ship or drop) with the model name, size and licence considered.
- If shipped: plates are boxed on a synthetic fixture, model is self-hosted and lazy-loaded, tests pass.
- If dropped: PRD/README limitations updated.
- `npm test` and `npm run typecheck` pass.

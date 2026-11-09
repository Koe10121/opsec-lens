# 009: Contact detectors

- type: AFK
- blocked_by: 002

## What to build
Extend `detectors/contact` with phone numbers and tokens/API keys (common formats such as prefixed keys,
long high-entropy strings, bearer tokens). Confidence values and guards against false positives
(e.g. long hashes in commit lists, dates).

## Acceptance criteria
- A synthetic screenshot with a fake phone number, a fake API key and a fake bearer token shows a box
  for each.
- Commit hashes, dates and plain long numbers are not flagged (or are low confidence and unticked).
- Unit tests cover positives, negatives and confidences.
- All fake keys are clearly synthetic and match no real provider key.
- `npm test` and `npm run typecheck` pass.

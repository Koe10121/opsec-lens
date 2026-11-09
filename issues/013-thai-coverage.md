# 013: Thai coverage

- type: AFK
- blocked_by: 003, 011

## What to build
Lazy-load Thai OCR data (`tha`) only when needed, self-hosted. Add `detectors/thai`: national ID (13
digits with valid check digit), Thai phone numbers (`0[689]x-xxx-xxxx`, `+66`), student IDs, and
best-effort Thai names (dictionary/NER, labelled "best effort" in the UI). Add Thai variants to the
benchmark.

## Acceptance criteria
- English-only users do not download Thai data.
- A synthetic Thai screenshot shows boxes for ID, phone, student ID and name.
- IDs with a bad check digit are not flagged (or are low confidence).
- Thai variants are in the benchmark with per-category results; names are reported as best effort.
- Unit tests cover valid/invalid IDs and phone formats; all IDs are synthetic.
- `npm test` and `npm run typecheck` pass.

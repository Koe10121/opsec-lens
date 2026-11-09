# 014: IP-to-organisation

- type: HITL (you choose the dataset and approve the licence)
- blocked_by: 002

## What to build
Pick a source (e.g. DB-IP Lite, CC BY 4.0, or RIR delegation files) and record its licence and source in
the repo. Build a script that trims it to a small offline CIDR/ASN → organisation table (education,
government, major cloud), 2 MB gzipped or less, lazy-loaded. `detectors/network` uses it to label public
IPs ("belongs to X") and raise confidence. The review screen shows the organisation name.

## Acceptance criteria
- Licence and data source documented in the repo; you have approved them.
- Table is 2 MB gzipped or less and lazy-loaded (not in the initial bundle).
- Lookup works fully offline in the browser.
- Unit tests use a tiny synthetic table (documentation ranges mapped to fake orgs), not real data.
- Benchmark (if available) shows effect on precision/recall.
- `npm test` and `npm run typecheck` pass.

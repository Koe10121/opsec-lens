# 008: Network detectors

- type: AFK
- blocked_by: 002

## What to build
Extend `detectors/network` with private/internal IPv4 ranges, IPv6, hostnames, and internal URLs
(`.internal`, `.local`, `.test`, intranet-style hosts). Regex/rules only, with confidence values and
lookalike guards. Findings show in the review screen with distinct type labels.

## Acceptance criteria
- A synthetic screenshot with `10.0.0.5`, `host01.corp.example.test`, `http://wiki.internal/` and an
  IPv6 address (2001:db8::/32 documentation range) shows boxes for each.
- Lookalikes (file names, version strings, timestamps) are not flagged.
- Unit tests cover positives, negatives and confidences.
- `npm test` and `npm run typecheck` pass.

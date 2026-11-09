# 002: IPv4 detection with false-positive guards

- type: AFK
- blocked_by: 001

## What to build
Add IPv4 detection to `detectors/network`. Findings carry a confidence. Guard against lookalikes:
reject dotted quads preceded by `v`, `version` or `==`; validate octets (0-255); documentation ranges
(192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24) get lower confidence so sample data still demos.
Boxes appear in the UI alongside emails.

## Acceptance criteria
- A synthetic screenshot with `203.0.113.7` shows a box; `v1.2.3.4`, `version 2.0.1.5` and `999.1.1.1` do not.
- Unit tests cover positives, invalid octets, version-number lookalikes and confidence values.
- `Finding.confidence` is populated for emails and IPs.
- `npm test` and `npm run typecheck` pass.

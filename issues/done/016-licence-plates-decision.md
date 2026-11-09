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

## Decision (2026-11-09): DROP plates from v1
- Considered: open-image-models `yolo-v9-t-416-license-plates-end2end` (7.8 MB ONNX; repo MIT, but the
  weights licence and training dataset are not stated, and the YOLOv9 lineage is GPL-3.0/AGPL tooling).
  OpenCV Zoo LPD_YuNet (Apache 2.0) is trained on Chinese plates only.
- No model with a clear weights licence and general plate coverage, so shipping would be a licence risk.
- Plates can still be redacted by drawing a manual box. README limitations must say plates are not auto-detected.
- Revisit if the author confirms the weights licence; a ~8 MB self-hosted lazy-loaded ONNX would fit the face-model pattern.

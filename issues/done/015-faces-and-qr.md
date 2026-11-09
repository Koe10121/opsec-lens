# 015: Faces and QR codes

- type: AFK
- blocked_by: 004

## What to build
`detectors/visual`: `(image) → Finding[]` for faces (small ONNX face detector, self-hosted, lazy-loaded)
and QR codes (`BarcodeDetector` or `jsQR`). Findings flow into the review screen. We only detect that a
face exists; no identification.

## Acceptance criteria
- A synthetic image with a generated/illustration face and a QR code shows boxes for both.
- Model files are self-hosted and lazy-loaded; no third-party CDN.
- No real people's photos in the repo; fixtures are synthetic or clearly licensed illustrations.
- Unit/integration tests at the `visual` boundary.
- `npm test` and `npm run typecheck` pass.

# 006: Redaction styles

- type: AFK
- blocked_by: 004

## What to build
Extend `redact.apply` with `pixelate` and `blur` alongside `solid` (default). Add a style picker to the
UI. State on the page that the export is re-encoded from the canvas, which strips EXIF metadata.

## Acceptance criteria
- Style picker changes the download; solid remains the default.
- Tests check each style alters pixels inside the box and leaves the outside untouched.
- Exported file contains no EXIF (test on an input image that has EXIF).
- Page text mentions metadata is stripped.
- `npm test` and `npm run typecheck` pass.

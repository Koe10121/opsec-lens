# 003: Large screenshots: speed and progress

- type: AFK
- blocked_by: 001

## What to build
Measure OCR time on a 1920x1080 synthetic screenshot. If it exceeds about 10s, add downscale or tiling
inside `ocr` (mapping boxes back to original coordinates). Add a progress indicator in the UI. Handle
huge images with a clear message.

## Acceptance criteria
- Timing check on a 1920x1080 synthetic image is recorded in the issue/PR and in a test or script.
- Boxes from downscaled/tiled OCR still line up with the original image (test with known text position).
- UI shows progress while OCR runs.
- A very large image gives a clear message rather than freezing the page.
- `npm test` and `npm run typecheck` pass.

## Done notes
- Timing (`npm run time-ocr`, Node, synthetic): 1920x1080 = 2.1s, 960x540 = 0.6s. Under the 10s threshold, so
  1080p is not downscaled; images above 2.5 MP are downscaled before OCR and boxes mapped back (`src/scale.ts`).
- Images above 100 MP get a clear "too large" message; OCR progress % shown in the status line.

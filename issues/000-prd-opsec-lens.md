# PRD: OpSec Lens

## 1. Problem

People post screenshots (README, portfolio, bug report, chat) that leak more than passwords: an
organisation's public IPs, hostnames, internal URLs, IDs, faces, QR codes. On 7 Nov 2026 a screenshot
on the author's portfolio showed real public IPs of a university network in a SIEM-style table. No
password or key was present, so secret scanners would not have flagged it.

Existing tools do not cover this:
- Manual blur (phone markup, Snipping Tool): people miss things.
- Face blur (e.g. Signal): faces only.
- Code secret scanners (GitHub secret scanning, TruffleHog, gitleaks): text files, not images.
- Screenshot Guard: finds secrets (API keys, tokens) in images, but not organisational identity or
  personal data, and it only warns; it does not redact.

## 2. Solution

A static web app. The user drops in a screenshot; OpSec Lens runs OCR and a set of detectors (rules
first, layout heuristics later, optional model later) entirely in the browser, draws a box over each
finding, lets the user accept or undo each box (and add boxes by hand), then downloads a redacted
image. Detection quality is measured on a public, synthetic benchmark with recall and precision per
detector and per method.

Images never leave the device, and the page says so.

## 3. User stories

1. As a developer about to post a screenshot, I want to drop it into a page and see what is unsafe in
   it, so that I do not leak data by accident.
2. As a user, I want emails and IP addresses found automatically, so that I do not have to hunt for them.
3. As a user, I want every finding drawn as a box over the image, so that I can see exactly what was found.
4. As a user, I want to accept or undo each box, so that I control what gets redacted.
5. As a user, I want to add a box by hand, so that I can cover something the tool missed.
6. As a user, I want to download the redacted image, so that I can share the safe version.
7. As a user, I want redaction to be solid by default (with pixelate and blur optional), so that hidden
   text cannot be recovered.
8. As a user, I want the exported image to carry no EXIF metadata, so that the file leaks nothing extra.
9. As a user, I want private/internal IPs, hostnames and internal URLs found, so that internal
   infrastructure is not exposed.
10. As a user, I want public IPs identified by owning organisation (e.g. a university network), so that
    organisational identity is protected, not only secrets.
11. As a user, I want version numbers and similar lookalikes not flagged as IPs, so that the tool does not
    annoy me with false positives.
12. As a user, I want low-confidence findings to start unticked, so that I review them deliberately.
13. As a user, I want a whole table column redacted when its header says "Source IP" or "Username", so
    that values that match no pattern are still covered.
14. As a Thai user, I want Thai national IDs (13 digits with valid check digit), phone numbers, student
    IDs and names found, so that Thai personal data is covered.
15. As a user, I want faces, QR codes (and licence plates where feasible) found, so that visual
    identifiers are covered.
16. As a keyboard user, I want to review, toggle, move between and draw boxes without a mouse, so that
    the tool is accessible.
17. As a user, I want clear messages for no findings, huge images and OCR failure, so that I know what
    happened.
18. As a user, I want a plain statement that detection is not a guarantee and I should review, so that I
    do not over-trust it.
19. As a recruiter, I want a "Try it" button with a sample screenshot that works in under 10 seconds, so
    that I can evaluate the project quickly.
20. As a reader of the repo, I want a published results table (recall and precision per category and per
    method), so that I can judge how well it works.
21. As the author, I want each detector testable and benchmarkable alone, so that I can learn what each
    contributes (rules-only vs heuristics vs model vs combined).
22. As a privacy-conscious user, I want assurance that no image data or extracted text is sent over the
    network, so that I can use it on sensitive screenshots.

## 4. Modules

Deep modules with small interfaces. Detectors are pure TypeScript with no DOM or OCR dependency.

| Module | Interface (in → out) | Inside |
|---|---|---|
| `ocr` | `recognise(image, {langs}) → Word[]`, `Word = {text, box, conf}` | Tesseract.js wrapper, lazy language loading, downscale or tile for large images. Engine swappable. |
| `detectors/types` | `Detector = (words, ctx) → Finding[]`, `Finding = {type, box, confidence, source}`; `runDetectors(words, enabled[])` | Shared types and registry. |
| `detectors/network` | `Detector` | IPv4/IPv6, private/internal ranges, hostnames, internal URLs, version-number guards. Later: IP-to-organisation lookup. |
| `detectors/contact` | `Detector` | Emails, phones, tokens and API keys. |
| `detectors/thai` | `Detector` | Thai ID with check digit, phones, student IDs, best-effort names. |
| `detectors/layout` | `Detector` | Column heuristics: header word plus x-range flags the whole column. |
| `detectors/visual` | `(image) → Finding[]` | Faces, QR codes, plates (later slice). Takes the image, not OCR words, so it is separate from the shared signature. |
| `redact` | `apply(image, findings[], style) → Blob` | Solid, pixelate or blur drawing; re-encode from canvas (strips EXIF). |
| `review` | State of `Finding[]` with accepted flags; actions `toggle`, `add`, `undo`, `redo` | Pure state machine, no DOM. Confidence thresholds decide initial ticked state. |
| `ui` | DOM only | Dropzone, canvas overlay, findings list, keyboard handling, privacy notice. Minimal logic. |
| `benchmark/generate` (Python) | `seed, n → images + labels.json` | HTML templates, seeded fake data, Playwright rendering, labels from DOM bounding boxes. |
| `benchmark/score` (TypeScript) | `(images, labels, methods[]) → results.md` | Runs the real OCR and detectors, IoU matching, per-detector and per-method recall and precision. |

**Slice 1 builds only:** `ocr`, `detectors/types`, `detectors/network` (IPv4 only),
`detectors/contact` (email only), `redact` (solid style), and a thin `ui`. Everything else is a later
slice.

## 5. Implementation decisions

- **Stack:** Vite + vanilla TypeScript, no UI framework in slice 1 (one page, one canvas, a list of
  boxes). A framework can be added later if the review screen needs it. Vitest for `npm test`,
  `tsc --noEmit` for `npm run typecheck`.
- **Layout:** `src/detectors/`, `src/ocr/`, `src/redact/`, `src/review/`, `src/ui/`; `benchmark/` holds
  the Python generator.
- **Python scope:** data generation and model experiments only; never shipped to the browser. The scorer
  is TypeScript so the benchmark measures the code that ships. Python is run on Windows.
- **OCR:** Tesseract.js, English first. Thai (`tha`) traineddata lazy-loaded in a later slice so English
  users do not download it. Benchmark speed early on a 1920x1080 screenshot; downscale or tile if
  slow (target roughly 10s). Behind an interface so PaddleOCR (ONNX/WebGPU) can replace it if Thai
  accuracy is poor.
- **Layout understanding:** heuristics in v1 (header word plus x-range). A vision-language model is an
  offline Ollama experiment on the RTX 5070 and ships only if it clearly beats heuristics and is small
  (about 500 MB or less), lazy-loaded and opt-in.
- **IP-to-organisation:** small offline CIDR/ASN table (education, government, major cloud), under 2 MB
  gzipped, lazy-loaded, source and licence recorded in the repo. Check licence before choosing (e.g.
  DB-IP Lite is CC BY 4.0, RIR delegation files are free). Private IPs, hostnames and internal URLs are
  regex only.
- **False positives:** context checks (e.g. reject dotted quads preceded by `v`, `version`, `==`; validate
  octets; documentation ranges lower confidence so sample data still demos). Each finding has a
  confidence; only high-confidence findings start ticked.
- **Thai:** ID with check-digit validation; phones `0[689]x-xxx-xxxx` and `+66`; Thai names
  dictionary/NER based and labelled "best effort".
- **Visual:** small ONNX face detector, `BarcodeDetector` or `jsQR` for QR; plates only if a good small
  model exists, otherwise dropped from v1. Detect only that a face exists; never identify who.
- **Redaction:** solid box by default; pixelate and blur optional. Export re-encodes from canvas
  (strips EXIF); the page says so.
- **Review screen:** findings list beside canvas; toggle with Space/Enter, move with arrows/Tab, draw
  boxes by mouse or keyboard, undo/redo; colour is never the only signal (labels and outlines).
- **Benchmark:** Python renders HTML templates (terminal, SIEM table, dashboard, chat, form) to PNG with
  Playwright; labels come from DOM bounding boxes. About 300 seeded images (5 layouts x 3 themes x
  varied fonts/sizes, plus Thai variants) with negatives (version numbers, UUIDs, clean screenshots).
  A finding is correct at IoU >= 0.5 with the same type; also report a "fully covered" metric. Output
  `results.md`, embedded in the README.
- **Privacy:** a CI test asserts no network requests during image processing. Models and data are
  self-hosted, not loaded from a third-party CDN. A repo check rejects test IPs outside the
  documentation ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24).
- **Honesty:** the page states detection is not a guarantee; handles huge images, no findings and OCR
  failure with clear messages.
- **Deploy:** static Vite build on Vercel, $0, no paid APIs. COOP/COEP headers only if WASM threading
  needs them (verify with Tesseract.js first). The sample screenshots come from the benchmark generator.
- **Issue order after this PRD:**
  1. Slice 1: upload, OCR, email and IPv4 rules, boxes, solid-box download.
  2. Review screen.
  3. More network and contact detectors plus false-positive guards.
  4. Benchmark generator and scorer.
  5. Column heuristics.
  6. Thai.
  7. IP-to-organisation.
  8. Faces and QR.
  9. VLM spike.
  10. README, results and portfolio case file.

## 6. Testing decisions

- **TDD (red, green, refactor)** for detector and redaction logic. `npm test` and `npm run typecheck`
  must pass before committing.
- **Detectors (unit):** tested at the `Detector` boundary with hand-built `Word[]` fixtures, with no OCR
  or DOM. Cover positives, negatives and lookalikes (version numbers, UUIDs, invalid octets, bad
  Thai ID check digits).
- **`review` (unit):** state-machine tests for toggle, add, undo, redo and initial ticked state from
  confidence thresholds.
- **`redact` (unit/integration):** apply findings to a small synthetic image and assert the pixels under
  each box are changed, that pixels outside are untouched, and that the output has no EXIF.
- **`ocr` (integration):** a few synthetic screenshots with known text; assert expected words and rough
  boxes. Includes a timing check on a 1920x1080 image.
- **End to end (Playwright):** drop a sample image, see boxes, toggle one, download, and assert the file
  was produced. A separate test asserts no network requests are made during processing.
- **Keyboard accessibility:** e2e test completes the review flow with keyboard only.
- **Benchmark:** the generator is seeded and deterministic; scorer unit tests use small hand-written
  label sets to check IoU matching and recall/precision arithmetic.
- **Fixtures:** all synthetic, generated by scripts in this repo. Example IPs use documentation ranges
  and example.com/.test domains only. No real screenshots, people, organisations' IPs/hostnames or IDs
  are ever committed.

## 7. Out of scope

- Long videos and live screen recording (short clips possibly later; not v1).
- Redacting PDFs or Word documents.
- A browser extension or GitHub Action (possible later, not v1).
- Recognising which person a face is; we only detect that a face exists.
- Any server-side processing, paid APIs, or sending image data or extracted text over the network.
- A guarantee of complete detection; the tool assists review and does not certify safety.
- Shipping a browser VLM in v1 (offline experiment only unless it clearly beats heuristics).
- Licence plate detection: dropped from v1 (issue 016). No small model with a clear weights licence; plates can be boxed by hand on the review screen.
- Slice 1 itself excludes: review screen, Thai, IP-to-organisation, column layout, faces/QR/plates,
  benchmark, video.

**Definition of done (project):** live on Vercel with sample screenshots; public GitHub repo;
benchmark generator and published results table; README with demo GIF, architecture diagram, results,
limitations and "what I learned"; added as a case file on the portfolio with Live and Repo links.

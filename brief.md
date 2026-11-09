# Brief: OpSec Lens

> The raw idea, the input to a grilling session, not a spec.
> Workflow: `/grill-me @brief.md` → `/write-prd` → `/prd-to-issues` → `.\ralph-once.ps1` per issue → QA.

## The idea

Drop a screenshot (or a short video) into a web page. OpSec Lens finds everything that makes it
unsafe to share, blurs it, and shows me what it blurred so I can accept or undo each one before
I download the safe version.

**One-line pitch:** OpSec Lens finds what makes a screenshot unsafe to share, even when it isn't a
password (an organisation's IPs, hostnames, IDs, faces), blurs it in your browser, and is measured
on a public benchmark.

## Why this exists (the origin story)

On 7 Nov 2026 I found that a screenshot on my own portfolio showed real public IP addresses belonging
to my university's network, in a SIEM-style alerts table. It contained no password or API key,
so normal secret scanners would not have caught it. OpSec Lens is the tool that would have.

## What already exists (don't rebuild it)

- Many apps are literally called "Redact" (iPhone AI redaction app, Redact.dev, Redact It, Redact Shield,
  Redact Guard). Hence the name OpSec Lens: a security tool, not a photo-blur app.

- Manual blur tools (phone markup, Snipping Tool): people miss things.
- Face blur in apps like Signal: faces only.
- Code secret scanners (GitHub secret scanning, TruffleHog, gitleaks): text files, not images.
- Screenshot Guard: OCR + secret patterns (API keys, tokens) in images, local, with a GitHub Action.
  Closest tool, but it looks for *secrets*, not organisational identity or personal data, and it
  only warns; it doesn't redact.

## What makes OpSec Lens different

1. **Organisational identity, not just secrets:** IP addresses checked against who owns them
   (e.g. "this IP belongs to a university network"), private/internal IPs, hostnames, internal URLs.
2. **Reads the screenshot like a person:** if a table column is headed "Source IP" or "Username",
   redact the whole column, including values that don't match a pattern. Layout understanding comes
   from a vision-language model; exact formats come from rules.
3. **Thai coverage:** Thai national ID (13 digits with check digit), Thai phone numbers, student IDs,
   Thai names, alongside the usual emails, phones, API keys and tokens.
4. **Redacts, not just warns:** produces the blurred image, with a review screen (accept / undo each
   box, add a box by hand). Covers faces, licence plates and QR codes too.
5. **Public benchmark:** a generated set of realistic screenshots (terminals, dashboards, SIEM tables,
   chats, forms) with known planted private data. Report recall and precision per detector and for
   rules-only vs model-only vs combined.

## Who it's for

- Developers, students and security people about to post a screenshot (README, portfolio, bug report, chat).
- Recruiters visiting my portfolio: "Try it" in under 10 seconds with a sample screenshot.
- Me: learning OCR, detection models, combining models with rules, synthetic data and evaluation.

## Constraints

- Runs 100% in the browser for the live demo. Images never leave the device; say so on the page.
- $0 to run: static site on Vercel, no paid APIs in the product. During development I can use local
  models on my RTX 5070 (8 GB) via Ollama for benchmarking.
- No real sensitive data in the repo, ever. All test data is synthetic (see CLAUDE.md).
- Accessible: the review screen works with keyboard and mouse.
- I'm on Windows; Python tooling (benchmark generator, model experiments) must work there.

## Not in scope (for now)

- Long videos or live screen recording (short clips at most, later).
- Redacting PDFs or Word documents.
- A browser extension or GitHub Action (possible later, not v1).
- Recognising *which* person a face is. We only detect that a face exists.

## Done looks like

- Live on Vercel, public GitHub repo, sample screenshots to try.
- Benchmark generator + published results table (recall/precision per category, per method).
- README: demo GIF, architecture diagram, results, limitations, "what I learned".
- Added as a case file on my portfolio with Live + Repo links.

## Questions I haven't answered yet (grill me on these)

- Which OCR runs well in the browser for English + Thai, and how fast is it on a big screenshot?
- Which small vision-language model can run in the browser (WebGPU) for layout understanding, and is
  it good enough? If not, is layout done with heuristics in v1 and the model added later?
- Which IP-to-organisation database (and licence), and how big is it to ship to the browser?
- How should detectors be structured as modules so each can be tested and benchmarked alone?
- What does the benchmark generator produce: HTML templates rendered to PNG? How many images,
  what layouts, what kinds of planted data, and how are labels (boxes + types) stored?
- Blur vs solid box vs pixelate? (Blur can sometimes be reversed for text; solid boxes are safer.)
- How do I avoid false positives that annoy users (e.g. version numbers that look like IPs)?
- What's the thinnest first vertical slice: upload → detect emails/IPs with OCR + rules → show boxes → download?

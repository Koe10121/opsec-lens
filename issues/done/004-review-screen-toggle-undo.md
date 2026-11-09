# 004: Review screen: accept/undo, undo/redo

- type: AFK
- blocked_by: 002

## What to build
A `review` module (pure state machine): holds `Finding[]` with accepted flags; actions `toggle`,
`undo`, `redo`; findings above a confidence threshold start ticked, others start unticked. UI: a
findings list beside the canvas; toggling a finding shows/hides its box and changes what Download
redacts. Mouse support.

## Acceptance criteria
- Unticking a finding removes its box from the download; ticking restores it.
- Low-confidence findings start unticked; high-confidence start ticked.
- Undo/redo work for toggles.
- `review` has unit tests for toggle, undo, redo and initial state.
- `npm test` and `npm run typecheck` pass.

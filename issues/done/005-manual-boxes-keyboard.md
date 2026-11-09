# 005: Manual boxes and keyboard-only review

- type: AFK
- blocked_by: 004

## What to build
Add `review.add(box)` and UI to draw a box by mouse or by keyboard. Make the whole review flow usable
with the keyboard: move between boxes (arrows/Tab), toggle with Space/Enter, add a box, undo/redo,
download. Never rely on colour alone (labels and outlines).

## Acceptance criteria
- A box drawn by hand is included in the download.
- An e2e test completes upload → review → manual box → download using only the keyboard.
- Focus is visible; each box has an accessible label (type, accepted state).
- `npm test` and `npm run typecheck` pass.

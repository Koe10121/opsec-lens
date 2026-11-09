import type { Box, Finding } from '../detectors/types';

export type ReviewItem = { finding: Finding; accepted: boolean };

/** Findings at or above this confidence start ticked. */
export const TICK_THRESHOLD = 0.8;

type Action = { kind: 'toggle'; i: number } | { kind: 'add' };

/** Pure state machine for reviewing findings: toggle, add, undo, redo. No DOM. */
export function createReview(findings: Finding[], threshold = TICK_THRESHOLD) {
  const state: ReviewItem[] = findings.map((finding) => ({ finding, accepted: finding.confidence >= threshold }));
  const undoStack: Action[] = [];
  const redoStack: { action: Action; item?: ReviewItem }[] = [];

  const flip = (i: number) => { state[i].accepted = !state[i].accepted; };

  return {
    items: (): readonly ReviewItem[] => state.map((s) => ({ ...s })),
    accepted: (): Finding[] => state.filter((s) => s.accepted).map((s) => s.finding),
    toggle(i: number) {
      if (i < 0 || i >= state.length) return;
      flip(i);
      undoStack.push({ kind: 'toggle', i });
      redoStack.length = 0;
    },
    /** Add a hand-drawn box. It is accepted at once. Returns its index, or -1 if the box is empty. */
    add(box: Box): number {
      if (box.w <= 0 || box.h <= 0) return -1;
      state.push({ finding: { type: 'manual', box: { ...box }, confidence: 1, source: 'manual' }, accepted: true });
      undoStack.push({ kind: 'add' });
      redoStack.length = 0;
      return state.length - 1;
    },
    undo() {
      const action = undoStack.pop();
      if (!action) return;
      if (action.kind === 'toggle') { flip(action.i); redoStack.push({ action }); }
      else redoStack.push({ action, item: state.pop() });
    },
    redo() {
      const r = redoStack.pop();
      if (!r) return;
      if (r.action.kind === 'toggle') flip(r.action.i);
      else if (r.item) state.push(r.item);
      undoStack.push(r.action);
    },
  };
}

/** Keyboard editing of a box being drawn: arrows move, shift+arrows resize. Clamped to the image. */
export function nudgeBox(box: Box, key: string, resize: boolean, bounds: { w: number; h: number }, step = 10): Box {
  const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[key];
  if (!d) return box;
  let { x, y, w, h } = box;
  if (resize) { w = Math.max(step, w + d[0]); h = Math.max(step, h + d[1]); }
  else { x += d[0]; y += d[1]; }
  w = Math.min(w, bounds.w);
  h = Math.min(h, bounds.h);
  x = Math.min(Math.max(0, x), bounds.w - w);
  y = Math.min(Math.max(0, y), bounds.h - h);
  return { x, y, w, h };
}

/** Turn two drag points into a normalised box. */
export function boxFromPoints(a: { x: number; y: number }, b: { x: number; y: number }): Box {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

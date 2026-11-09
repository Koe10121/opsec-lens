import type { Finding } from '../detectors/types';

export type ReviewItem = { finding: Finding; accepted: boolean };

/** Findings at or above this confidence start ticked. */
export const TICK_THRESHOLD = 0.8;

/** Pure state machine for reviewing findings: toggle, undo, redo. No DOM. */
export function createReview(findings: Finding[], threshold = TICK_THRESHOLD) {
  const state = findings.map((finding) => ({ finding, accepted: finding.confidence >= threshold }));
  const undoStack: number[] = [];
  const redoStack: number[] = [];

  const flip = (i: number) => { state[i].accepted = !state[i].accepted; };

  return {
    items: (): readonly ReviewItem[] => state.map((s) => ({ ...s })),
    accepted: (): Finding[] => state.filter((s) => s.accepted).map((s) => s.finding),
    toggle(i: number) {
      if (i < 0 || i >= state.length) return;
      flip(i);
      undoStack.push(i);
      redoStack.length = 0;
    },
    undo() {
      const i = undoStack.pop();
      if (i === undefined) return;
      flip(i);
      redoStack.push(i);
    },
    redo() {
      const i = redoStack.pop();
      if (i === undefined) return;
      flip(i);
      undoStack.push(i);
    },
  };
}

import { describe, it, expect } from 'vitest';
import { createReview } from '../src/review/review';
import type { Finding } from '../src/detectors/types';

const f = (confidence: number, x = 0): Finding => ({
  type: 'ip', box: { x, y: 0, w: 10, h: 10 }, confidence, source: 'rules',
});

describe('review', () => {
  it('ticks high-confidence findings and leaves low-confidence unticked', () => {
    const r = createReview([f(0.9), f(0.5)]);
    expect(r.items().map((i) => i.accepted)).toEqual([true, false]);
  });

  it('accepted() returns only ticked findings', () => {
    const hi = f(0.9, 1);
    const r = createReview([hi, f(0.5, 2)]);
    expect(r.accepted()).toEqual([hi]);
  });

  it('toggle flips a finding', () => {
    const r = createReview([f(0.9), f(0.5)]);
    r.toggle(0);
    r.toggle(1);
    expect(r.items().map((i) => i.accepted)).toEqual([false, true]);
  });

  it('undo and redo revert and reapply toggles', () => {
    const r = createReview([f(0.9)]);
    r.toggle(0);
    r.undo();
    expect(r.items()[0].accepted).toBe(true);
    r.redo();
    expect(r.items()[0].accepted).toBe(false);
  });

  it('a new toggle clears the redo stack; undo/redo with nothing are no-ops', () => {
    const r = createReview([f(0.9), f(0.9)]);
    r.undo();
    r.redo();
    r.toggle(0);
    r.undo();
    r.toggle(1);
    r.redo();
    expect(r.items().map((i) => i.accepted)).toEqual([true, false]);
  });

  it('ignores out-of-range toggles', () => {
    const r = createReview([f(0.9)]);
    r.toggle(5);
    r.undo();
    expect(r.items()[0].accepted).toBe(true);
  });
});

import { nudgeBox, boxFromPoints } from '../src/review/review';

describe('review.add', () => {
  it('adds an accepted manual finding that is included in accepted()', () => {
    const r = createReview([f(0.9)]);
    const i = r.add({ x: 5, y: 5, w: 20, h: 10 });
    expect(i).toBe(1);
    expect(r.accepted().map((a) => a.source)).toEqual(['rules', 'manual']);
  });

  it('rejects empty boxes', () => {
    const r = createReview([]);
    expect(r.add({ x: 0, y: 0, w: 0, h: 5 })).toBe(-1);
    expect(r.items()).toHaveLength(0);
  });

  it('undo removes the box and redo restores it', () => {
    const r = createReview([]);
    r.add({ x: 1, y: 1, w: 5, h: 5 });
    r.undo();
    expect(r.items()).toHaveLength(0);
    r.redo();
    expect(r.items()).toHaveLength(1);
    expect(r.items()[0].accepted).toBe(true);
  });

  it('mixes with toggles in undo order', () => {
    const r = createReview([f(0.9)]);
    r.add({ x: 1, y: 1, w: 5, h: 5 });
    r.toggle(1);
    r.undo();
    r.undo();
    expect(r.items()).toHaveLength(1);
  });
});

describe('box helpers', () => {
  const bounds = { w: 100, h: 50 };
  it('moves with arrows and clamps to the image', () => {
    expect(nudgeBox({ x: 5, y: 5, w: 20, h: 20 }, 'ArrowLeft', false, bounds)).toMatchObject({ x: 0 });
    expect(nudgeBox({ x: 5, y: 5, w: 20, h: 20 }, 'ArrowDown', false, bounds)).toMatchObject({ y: 15 });
    expect(nudgeBox({ x: 75, y: 5, w: 20, h: 20 }, 'ArrowRight', false, bounds)).toMatchObject({ x: 80 });
  });
  it('resizes with shift and keeps a minimum size', () => {
    expect(nudgeBox({ x: 0, y: 0, w: 20, h: 20 }, 'ArrowRight', true, bounds)).toMatchObject({ w: 30 });
    expect(nudgeBox({ x: 0, y: 0, w: 10, h: 10 }, 'ArrowLeft', true, bounds)).toMatchObject({ w: 10 });
  });
  it('ignores other keys', () => {
    const b = { x: 1, y: 1, w: 5, h: 5 };
    expect(nudgeBox(b, 'a', false, bounds)).toBe(b);
  });
  it('normalises drag points', () => {
    expect(boxFromPoints({ x: 30, y: 40 }, { x: 10, y: 20 })).toEqual({ x: 10, y: 20, w: 20, h: 20 });
  });
});

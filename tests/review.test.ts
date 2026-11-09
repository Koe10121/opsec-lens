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

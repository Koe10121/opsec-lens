import { describe, it, expect } from 'vitest';
import { iou, scoreImage, aggregate, renderResults, type Label } from '../benchmark/metrics';
import type { Finding } from '../src/detectors/types';

const box = (x: number, y = 0, w = 10, h = 10) => ({ x, y, w, h });
const f = (type: string, b = box(0)): Finding => ({ type, box: b, confidence: 0.9, source: 'rules' });
const l = (type: string, b = box(0)): Label => ({ type, box: b });

describe('iou', () => {
  it('is 1 for identical, 0 for disjoint, partial otherwise', () => {
    expect(iou(box(0), box(0))).toBe(1);
    expect(iou(box(0), box(20))).toBe(0);
    expect(iou(box(0), box(5))).toBeCloseTo(50 / 150);
  });
});

describe('scoreImage', () => {
  it('matches same type at IoU >= 0.5', () => {
    const r = scoreImage([l('ip')], [f('ip', box(1))]);
    expect(r.ip).toEqual({ tp: 1, fp: 0, fn: 0 });
  });
  it('does not match across types or below threshold', () => {
    const r = scoreImage([l('ip')], [f('email')]);
    expect(r.ip).toEqual({ tp: 0, fp: 0, fn: 1 });
    expect(r.email).toEqual({ tp: 0, fp: 1, fn: 0 });
    expect(scoreImage([l('ip')], [f('ip', box(8))]).ip).toEqual({ tp: 0, fp: 1, fn: 1 });
  });
  it('matches one-to-one', () => {
    const r = scoreImage([l('ip')], [f('ip'), f('ip')]);
    expect(r.ip).toEqual({ tp: 1, fp: 1, fn: 0 });
  });
  it('counts findings on a negative image (no labels) as false positives', () => {
    expect(scoreImage([], [f('ip')]).ip).toEqual({ tp: 0, fp: 1, fn: 0 });
  });
});

describe('aggregate + render', () => {
  it('computes recall and precision per type', () => {
    const a = aggregate([
      { ip: { tp: 1, fp: 0, fn: 0 } },
      { ip: { tp: 1, fp: 2, fn: 2 } },
    ]);
    expect(a.ip.recall).toBeCloseTo(2 / 4);
    expect(a.ip.precision).toBeCloseTo(2 / 4);
  });
  it('handles zero denominators as null and renders a markdown table', () => {
    const a = aggregate([{ email: { tp: 0, fp: 0, fn: 0 } }]);
    expect(a.email.recall).toBeNull();
    const md = renderResults(aggregate([{ ip: { tp: 3, fp: 1, fn: 0 } }]), 5);
    expect(md).toContain('| ip | 3 | 1 | 0 | 100.0% | 75.0% |');
    expect(md).toContain('5 images');
  });
});

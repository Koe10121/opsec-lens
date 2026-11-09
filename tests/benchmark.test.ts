import { describe, it, expect } from 'vitest';
import {
  iou,
  scoreImage,
  aggregate,
  coverImage,
  aggregateCoverage,
  renderReport,
  type Label,
} from '../benchmark/metrics';
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

describe('aggregate', () => {
  it('computes recall and precision per type', () => {
    const a = aggregate([
      { ip: { tp: 1, fp: 0, fn: 0 } },
      { ip: { tp: 1, fp: 2, fn: 2 } },
    ]);
    expect(a.ip.recall).toBeCloseTo(2 / 4);
    expect(a.ip.precision).toBeCloseTo(2 / 4);
  });
  it('handles zero denominators as null', () => {
    expect(aggregate([{ email: { tp: 0, fp: 0, fn: 0 } }]).email.recall).toBeNull();
  });
});

describe('coverImage (fully covered)', () => {
  it('counts a label covered when findings together hide >= 95% of it', () => {
    const lab = l('ip', box(0, 0, 100, 10));
    // Two findings of the wrong type and split in two still hide the text.
    const r = coverImage([lab], [f('email', box(0, 0, 50, 10)), f('email', box(50, 0, 50, 10))]);
    expect(r.ip).toEqual({ covered: 1, total: 1 });
  });
  it('does not count partial cover (IoU-matched but text still visible)', () => {
    const r = coverImage([l('ip', box(0, 0, 100, 10))], [f('ip', box(0, 0, 80, 10))]);
    expect(r.ip).toEqual({ covered: 0, total: 1 });
  });
  it('does not double count overlapping findings', () => {
    const r = coverImage([l('ip', box(0, 0, 100, 10))], [f('ip', box(0, 0, 60, 10)), f('ip', box(0, 0, 60, 10))]);
    expect(r.ip.covered).toBe(0);
  });
  it('aggregates and yields a rate', () => {
    const a = aggregateCoverage([{ ip: { covered: 1, total: 1 } }, { ip: { covered: 0, total: 1 } }]);
    expect(a.ip).toEqual({ covered: 1, total: 2, rate: 0.5 });
  });
});

describe('renderReport', () => {
  const methods = [
    {
      name: 'rules-only',
      perType: aggregate([{ ip: { tp: 3, fp: 1, fn: 0 } }]),
      coverage: aggregateCoverage([{ ip: { covered: 2, total: 3 } }]),
    },
    { name: 'heuristics', perType: {}, coverage: {} },
  ];
  it('renders one per-detector table per method with fully covered column', () => {
    const md = renderReport({ images: 5, negatives: { images: 2, withFalsePositive: 1 }, methods });
    expect(md).toContain('## Method: rules-only');
    expect(md).toContain('## Method: heuristics');
    expect(md).toContain('| ip | 3 | 1 | 0 | 100.0% | 75.0% | 66.7% |');
    expect(md).toContain('5 images');
  });
  it('renders a per-method summary table and negatives line', () => {
    const md = renderReport({ images: 5, negatives: { images: 2, withFalsePositive: 1 }, methods });
    expect(md).toContain('| rules-only | 100.0% | 75.0% | 66.7% |');
    expect(md).toContain('| heuristics | n/a | n/a | n/a |');
    expect(md).toContain('2 negative images, 1 with at least one false positive');
  });
});

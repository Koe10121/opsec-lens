import type { Box, Finding } from '../src/detectors/types';

export type Label = { type: string; box: Box };
export type Counts = { tp: number; fp: number; fn: number };
export type PerType = Record<string, Counts>;
export type Aggregate = Record<string, Counts & { recall: number | null; precision: number | null }>;

export const IOU_THRESHOLD = 0.5;

export function iou(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (w <= 0 || h <= 0) return 0;
  const inter = w * h;
  return inter / (a.w * a.h + b.w * b.h - inter);
}

/** Greedy one-to-one matching, best IoU first, same type only. Unmatched findings are false positives. */
export function scoreImage(labels: Label[], findings: Finding[]): PerType {
  const out: PerType = {};
  const c = (t: string) => (out[t] ??= { tp: 0, fp: 0, fn: 0 });
  const pairs: { li: number; fi: number; v: number }[] = [];
  labels.forEach((lb, li) =>
    findings.forEach((fd, fi) => {
      if (lb.type !== fd.type) return;
      const v = iou(lb.box, fd.box);
      if (v >= IOU_THRESHOLD) pairs.push({ li, fi, v });
    }),
  );
  pairs.sort((a, b) => b.v - a.v);
  const usedL = new Set<number>();
  const usedF = new Set<number>();
  for (const p of pairs) {
    if (usedL.has(p.li) || usedF.has(p.fi)) continue;
    usedL.add(p.li);
    usedF.add(p.fi);
    c(labels[p.li].type).tp++;
  }
  labels.forEach((lb, i) => usedL.has(i) || c(lb.type).fn++);
  findings.forEach((fd, i) => usedF.has(i) || c(fd.type).fp++);
  return out;
}

export function aggregate(results: PerType[]): Aggregate {
  const sum: Record<string, Counts> = {};
  for (const r of results)
    for (const [t, v] of Object.entries(r)) {
      const s = (sum[t] ??= { tp: 0, fp: 0, fn: 0 });
      s.tp += v.tp;
      s.fp += v.fp;
      s.fn += v.fn;
    }
  const out: Aggregate = {};
  for (const [t, s] of Object.entries(sum))
    out[t] = {
      ...s,
      recall: s.tp + s.fn ? s.tp / (s.tp + s.fn) : null,
      precision: s.tp + s.fp ? s.tp / (s.tp + s.fp) : null,
    };
  return out;
}

export const COVERED_THRESHOLD = 0.95;

export type Cover = { covered: number; total: number };
export type CoverAggregate = Record<string, Cover & { rate: number | null }>;

/**
 * "Fully covered": a label counts when the union of ALL findings (any type) hides at least 95% of its
 * area. This is what matters to the person sharing the screenshot, however the boxes were split or typed.
 */
export function coverImage(labels: Label[], findings: Finding[]): Record<string, Cover> {
  const out: Record<string, Cover> = {};
  for (const lb of labels) {
    const c = (out[lb.type] ??= { covered: 0, total: 0 });
    c.total++;
    const { x, y, w, h } = lb.box;
    let hit = 0;
    for (let px = x; px < x + w; px++)
      for (let py = y; py < y + h; py++)
        if (findings.some((f) => px >= f.box.x && px < f.box.x + f.box.w && py >= f.box.y && py < f.box.y + f.box.h))
          hit++;
    if (w * h > 0 && hit / (w * h) >= COVERED_THRESHOLD) c.covered++;
  }
  return out;
}

export function aggregateCoverage(results: Record<string, Cover>[]): CoverAggregate {
  const sum: Record<string, Cover> = {};
  for (const r of results)
    for (const [t, v] of Object.entries(r)) {
      const s = (sum[t] ??= { covered: 0, total: 0 });
      s.covered += v.covered;
      s.total += v.total;
    }
  const out: CoverAggregate = {};
  for (const [t, s] of Object.entries(sum)) out[t] = { ...s, rate: s.total ? s.covered / s.total : null };
  return out;
}

export type MethodResult = { name: string; perType: Aggregate; coverage: CoverAggregate };

const pct = (v: number | null) => (v === null ? 'n/a' : `${(v * 100).toFixed(1)}%`);
const ratio = (n: number, d: number) => (d ? n / d : null);

export function renderReport(opts: {
  images: number;
  negatives: { images: number; withFalsePositive: number };
  methods: MethodResult[];
}): string {
  const summary = opts.methods.map((m) => {
    const v = Object.values(m.perType);
    const tp = v.reduce((a, c) => a + c.tp, 0);
    const fp = v.reduce((a, c) => a + c.fp, 0);
    const fn = v.reduce((a, c) => a + c.fn, 0);
    const cv = Object.values(m.coverage);
    const covered = cv.reduce((a, c) => a + c.covered, 0);
    const total = cv.reduce((a, c) => a + c.total, 0);
    return `| ${m.name} | ${pct(ratio(tp, tp + fn))} | ${pct(ratio(tp, tp + fp))} | ${pct(ratio(covered, total))} |`;
  });
  const sections = opts.methods.flatMap((m) => {
    const rows = Object.keys({ ...m.perType, ...m.coverage })
      .sort()
      .map((t) => {
        const a = m.perType[t] ?? { tp: 0, fp: 0, fn: 0, recall: null, precision: null };
        return `| ${t} | ${a.tp} | ${a.fp} | ${a.fn} | ${pct(a.recall)} | ${pct(a.precision)} | ${pct(m.coverage[t]?.rate ?? null)} |`;
      });
    return [
      `## Method: ${m.name}`,
      '',
      '| Detector | TP | FP | FN | Recall | Precision | Fully covered |',
      '|---|---|---|---|---|---|---|',
      ...rows,
      '',
    ];
  });
  return [
    '# Benchmark results',
    '',
    `${opts.images} images, synthetic data, IoU >= ${IOU_THRESHOLD}, same type. ` +
      `"Fully covered" = at least ${COVERED_THRESHOLD * 100}% of a labelled item is hidden by the union of findings.`,
    `${opts.negatives.images} negative images, ${opts.negatives.withFalsePositive} with at least one false positive (all false positives count against precision).`,
    '',
    '## Summary',
    '',
    '| Method | Recall | Precision | Fully covered |',
    '|---|---|---|---|',
    ...summary,
    '',
    ...sections,
  ].join('\n');
}

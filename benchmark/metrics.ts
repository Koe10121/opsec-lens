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

const pct = (v: number | null) => (v === null ? 'n/a' : `${(v * 100).toFixed(1)}%`);

export function renderResults(a: Aggregate, images: number): string {
  const rows = Object.keys(a)
    .sort()
    .map((t) => `| ${t} | ${a[t].tp} | ${a[t].fp} | ${a[t].fn} | ${pct(a[t].recall)} | ${pct(a[t].precision)} |`);
  return [
    '# Benchmark results',
    '',
    `Method: rules-only. ${images} images, synthetic data, IoU >= ${IOU_THRESHOLD}, same type.`,
    '',
    '| Detector | TP | FP | FN | Recall | Precision |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
}

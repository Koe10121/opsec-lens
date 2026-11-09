// Usage: tsx benchmark/vlm/score.ts [model]
// Scores rules+heuristics vs VLM-only vs combined on the same subset the VLM was queried on.
// The VLM names sensitive strings; they are mapped back to boxes by matching OCR words.
import { readFileSync, writeFileSync } from 'node:fs';
import { recognise } from '../../src/ocr';
import { runDetectors, type Detector, type Word } from '../../src/detectors/types';
import { emailDetector, phoneDetector, tokenDetector } from '../../src/detectors/contact';
import { networkDetector } from '../../src/detectors/network';
import { layoutDetector } from '../../src/detectors/layout';
import { aggregate, aggregateCoverage, coverImage, renderReport, scoreImage, type Label } from '../metrics';
import { subset } from './query';

const model = process.argv[2] ?? 'gemma3:12b';
const dir = 'benchmark/out';
const cache: Record<string, { items: { type: string; text: string }[]; ms: number }> = JSON.parse(
  readFileSync(`${dir}/vlm-${model.replace(/[^\w.-]/g, '_')}.json`, 'utf8'),
);
const labels: Record<string, Label[]> = JSON.parse(readFileSync(`${dir}/labels.json`, 'utf8'));
const names = subset(labels).filter((n) => cache[n]);

const clean = (s: string) => s.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '');
const isInternal = (s: string) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(s.trim());

/** Map each VLM string to the OCR words that spell it (sequence match on cleaned text). */
function vlmDetector(items: { type: string; text: string }[]): Detector {
  return (words: Word[]) => {
    const out: ReturnType<Detector> = [];
    for (const it of items) {
      const type = it.type === 'ip' && isInternal(it.text) ? 'internal-ip' : it.type;
      const parts = it.text.split(/\s+/).map(clean).filter(Boolean);
      if (!parts.length) continue;
      for (let i = 0; i + parts.length <= words.length; i++) {
        if (parts.every((p, k) => clean(words[i + k].text) === p)) {
          const ws = words.slice(i, i + parts.length).map((w) => w.box);
          const x = Math.min(...ws.map((b) => b.x)), y = Math.min(...ws.map((b) => b.y));
          out.push({
            type, confidence: 0.5, source: 'model',
            box: { x, y, w: Math.max(...ws.map((b) => b.x + b.w)) - x, h: Math.max(...ws.map((b) => b.y + b.h)) - y },
          });
        }
      }
    }
    return out;
  };
}

const heur = [emailDetector, phoneDetector, tokenDetector, networkDetector, layoutDetector];
const METHODS = [
  { name: 'rules + heuristics', mk: () => heur },
  { name: 'VLM only (' + model + ')', mk: (n: string) => [vlmDetector(cache[n].items)] },
  { name: 'combined (heuristics + VLM)', mk: (n: string) => [...heur, vlmDetector(cache[n].items)] },
];
const per = METHODS.map(() => ({ s: [] as ReturnType<typeof scoreImage>[], c: [] as ReturnType<typeof coverImage>[], neg: 0 }));
for (const n of names) {
  const words = await recognise(readFileSync(`${dir}/${n}`), { langs: ['eng'], langPath: 'public/tessdata' });
  METHODS.forEach((m, i) => {
    const f = runDetectors(words, m.mk(n));
    per[i].s.push(scoreImage(labels[n], f));
    per[i].c.push(coverImage(labels[n], f));
    if (!labels[n].length && f.length) per[i].neg++;
  });
}
const md = renderReport({
  images: names.length,
  negatives: { images: names.filter((n) => !labels[n].length).length, withFalsePositive: per[0].neg },
  methods: METHODS.map((m, i) => ({ name: m.name, perType: aggregate(per[i].s), coverage: aggregateCoverage(per[i].c) })),
});
const ms = names.map((n) => cache[n].ms).sort((a, b) => a - b);
const note = `\nSubset: every ${5}th non-Thai image (${names.length} images). VLM latency on RTX 5070 Laptop (8 GB), Ollama: median ${(ms[ms.length >> 1] / 1000).toFixed(1)}s per image.\nNote: a VLM-"only" row is the VLM naming strings that OCR then locates, so OCR misses cap its recall.\n`;
writeFileSync(`benchmark/results-vlm.md`, md + note);
console.log(md + note);

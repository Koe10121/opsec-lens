// Usage: npm run benchmark:score [dir]
// Runs the real OCR once per image, then every method's detectors, and writes results.md.
// Add heuristics / VLM / combined by pushing another entry onto METHODS.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { recognise } from '../src/ocr';
import { runDetectors, type Detector } from '../src/detectors/types';
import { emailDetector, phoneDetector, tokenDetector } from '../src/detectors/contact';
import { networkDetector } from '../src/detectors/network';
import { layoutDetector } from '../src/detectors/layout';
import { thaiDetectors } from '../src/detectors/thai';
import {
  aggregate,
  aggregateCoverage,
  coverImage,
  renderReport,
  scoreImage,
  type Label,
  type MethodResult,
} from './metrics';

const METHODS: { name: string; detectors: Detector[] }[] = [
  { name: 'rules-only', detectors: [emailDetector, phoneDetector, tokenDetector, networkDetector] },
  { name: 'rules + heuristics', detectors: [emailDetector, phoneDetector, tokenDetector, networkDetector, layoutDetector] },
  { name: 'rules + heuristics + thai', detectors: [emailDetector, phoneDetector, tokenDetector, networkDetector, layoutDetector, ...thaiDetectors] },
];

const dir = process.argv[2] ?? 'benchmark/out';
const labels: Record<string, Label[]> = JSON.parse(readFileSync(join(dir, 'labels.json'), 'utf8'));
const names = Object.keys(labels).sort();
const negatives = names.filter((n) => labels[n].length === 0);

const per = METHODS.map(() => ({ scores: [] as ReturnType<typeof scoreImage>[], covers: [] as ReturnType<typeof coverImage>[], negFp: 0 }));
for (const name of names) {
  const words = await recognise(readFileSync(join(dir, name)), { langs: name.startsWith('thai-') ? ['eng', 'tha'] : ['eng'], langPath: 'public/tessdata' });
  METHODS.forEach((m, i) => {
    const findings = runDetectors(words, m.detectors);
    per[i].scores.push(scoreImage(labels[name], findings));
    per[i].covers.push(coverImage(labels[name], findings));
    if (labels[name].length === 0 && findings.length > 0) per[i].negFp++;
  });
  console.log(`${name}: ${labels[name].length} labels`);
}
const methods: MethodResult[] = METHODS.map((m, i) => ({
  name: m.name,
  perType: aggregate(per[i].scores),
  coverage: aggregateCoverage(per[i].covers),
}));
const md = renderReport({
  images: names.length,
  negatives: { images: negatives.length, withFalsePositive: per[0].negFp },
  methods,
});
const note = [
  '',
  'Note: `thai-*` rows come from the Thai form variants (eng+tha OCR); `thai-name` is best effort (title + two Thai words), so read its numbers as indicative.',
  'Note: `column` findings are whole-column boxes with no matching column labels, so they count as false positives in precision. The honest gain from heuristics is the "Fully covered" column.',
  '',
].join(String.fromCharCode(10));
writeFileSync(join(dir, 'results.md'), md + note);
console.log(md);

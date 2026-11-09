// Usage: npm run benchmark:score [dir]
// Runs the real OCR and detectors on generated images and writes results.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { recognise } from '../src/ocr';
import { runDetectors } from '../src/detectors/types';
import { emailDetector, phoneDetector, tokenDetector } from '../src/detectors/contact';
import { networkDetector } from '../src/detectors/network';
import { aggregate, renderResults, scoreImage, type Label } from './metrics';

const dir = process.argv[2] ?? 'benchmark/out';
const labels: Record<string, Label[]> = JSON.parse(readFileSync(join(dir, 'labels.json'), 'utf8'));
const results = [];
for (const name of Object.keys(labels).sort()) {
  const words = await recognise(readFileSync(join(dir, name)));
  const findings = runDetectors(words, [emailDetector, phoneDetector, tokenDetector, networkDetector]);
  results.push(scoreImage(labels[name], findings));
  console.log(`${name}: ${findings.length} findings, ${labels[name].length} labels`);
}
const md = renderResults(aggregate(results), results.length);
writeFileSync(join(dir, 'results.md'), md);
console.log(md);

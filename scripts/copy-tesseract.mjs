// Copies the Tesseract worker and WASM core into public/tesseract so the app serves them from its own origin
// (tesseract.js otherwise fetches them from cdn.jsdelivr.net). Output is gitignored. Runs before dev and build.
import { cpSync, mkdirSync, readdirSync } from 'node:fs';

mkdirSync('public/tesseract', { recursive: true });
cpSync('node_modules/tesseract.js/dist/worker.min.js', 'public/tesseract/worker.min.js');
for (const f of readdirSync('node_modules/tesseract.js-core'))
  if (/-lstm\.wasm\.js$/.test(f)) cpSync(`node_modules/tesseract.js-core/${f}`, `public/tesseract/${f}`);
console.log('copied tesseract worker + core to public/tesseract');

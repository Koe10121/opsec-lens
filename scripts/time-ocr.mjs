// Times OCR on a synthetic 1920x1080 screenshot, full-size vs downscaled. Run: npm run time-ocr
import { createCanvas } from '@napi-rs/canvas';
import { createWorker } from 'tesseract.js';

const mk = (w, h) => {
  const c = createCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#000'; g.font = `${Math.round(h / 40)}px monospace`;
  for (let i = 0; i < 36; i++) g.fillText(`row ${i}  203.0.113.${i + 1}  user${i}@example.com  GET /index ${200 + i}`, 40, 40 + i * 28);
  return c.toBuffer('image/png');
};
const worker = await createWorker('eng');
for (const [w, h] of [[1920, 1080], [960, 540]]) {
  const t = performance.now();
  await worker.recognize(mk(w, h));
  console.log(`${w}x${h}: ${((performance.now() - t) / 1000).toFixed(1)}s`);
}
await worker.terminate();

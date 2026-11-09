import { createCanvas, type Canvas } from '@napi-rs/canvas';
import QRCode from 'qrcode';
import type { Pixels } from '../src/detectors/visual';

/** Synthetic fixtures only: a generated QR for example.com and a cartoon face. */
export function blank(w: number, h: number) {
  const c = createCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, w, h);
  return { c: c as Canvas, g };
}
export const pixels = (c: Canvas): Pixels => {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height);
  return { data: d.data as unknown as Uint8ClampedArray, width: d.width, height: d.height };
};
export async function drawQr(g: any, x: number, y: number, size: number) {
  const qr = QRCode.create('https://example.com/join', { errorCorrectionLevel: 'M' });
  const n = qr.modules.size, cell = Math.floor(size / (n + 8));
  g.fillStyle = '#fff'; g.fillRect(x, y, cell * (n + 8), cell * (n + 8));
  g.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) if (qr.modules.get(r, q)) g.fillRect(x + (q + 4) * cell, y + (r + 4) * cell, cell, cell);
}
export function drawFace(g: any, cx: number, cy: number, r: number) {
  g.fillStyle = '#f1c27d'; g.beginPath(); g.ellipse(cx, cy, r * 0.8, r, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#3b2a1a'; g.beginPath(); g.ellipse(cx, cy - r * 0.7, r * 0.85, r * 0.45, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#fff';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * r * 0.35, cy - r * 0.1, r * 0.17, r * 0.1, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#222';
  for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * r * 0.35, cy - r * 0.1, r * 0.07, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = '#8a4b3a'; g.lineWidth = r * 0.05;
  g.beginPath(); g.moveTo(cx, cy - r * 0.05); g.lineTo(cx - r * 0.06, cy + r * 0.25); g.lineTo(cx + r * 0.06, cy + r * 0.25); g.stroke();
  g.strokeStyle = '#a33'; g.lineWidth = r * 0.07;
  g.beginPath(); g.arc(cx, cy + r * 0.3, r * 0.3, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
}

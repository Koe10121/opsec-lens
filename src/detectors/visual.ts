import jsQR from 'jsqr';
import type { Box, Finding } from './types';

export type Pixels = { data: Uint8ClampedArray; width: number; height: number };
/** Face model output: per-anchor [background, face] scores and normalised [x1,y1,x2,y2] boxes. */
export type FaceRunner = (input: Float32Array) => Promise<{ scores: Float32Array; boxes: Float32Array }>;

export const FACE_W = 320;
export const FACE_H = 240;

export function findQr(img: Pixels): Finding[] {
  const q = jsQR(img.data, img.width, img.height);
  if (!q) return [];
  const xs = [q.location.topLeftCorner, q.location.topRightCorner, q.location.bottomLeftCorner, q.location.bottomRightCorner];
  const x0 = Math.min(...xs.map((p) => p.x)), x1 = Math.max(...xs.map((p) => p.x));
  const y0 = Math.min(...xs.map((p) => p.y)), y1 = Math.max(...xs.map((p) => p.y));
  const box: Box = { x: Math.floor(x0), y: Math.floor(y0), w: Math.ceil(x1 - x0), h: Math.ceil(y1 - y0) };
  return [{ type: 'qr', box, confidence: 0.95, source: 'model' }];
}

/** Resize to 320x240 (bilinear via nearest sampling is enough for a detector) and normalise to NCHW. */
export function faceInput(img: Pixels): Float32Array {
  const out = new Float32Array(3 * FACE_W * FACE_H);
  const plane = FACE_W * FACE_H;
  for (let y = 0; y < FACE_H; y++) {
    const sy = Math.min(img.height - 1, Math.floor(((y + 0.5) * img.height) / FACE_H));
    for (let x = 0; x < FACE_W; x++) {
      const sx = Math.min(img.width - 1, Math.floor(((x + 0.5) * img.width) / FACE_W));
      const i = (sy * img.width + sx) * 4;
      for (let c = 0; c < 3; c++) out[c * plane + y * FACE_W + x] = (img.data[i + c] - 127) / 128;
    }
  }
  return out;
}

const iou = (a: number[], b: number[]) => {
  const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
  const h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
  if (w <= 0 || h <= 0) return 0;
  const inter = w * h;
  return inter / ((a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter);
};

/** Threshold, non-max suppress and scale normalised boxes to the original image. */
export function decodeFaces(scores: Float32Array, boxes: Float32Array, width: number, height: number, threshold = 0.7): Finding[] {
  const cands: { s: number; b: number[] }[] = [];
  for (let i = 0; i < scores.length / 2; i++) {
    const s = scores[i * 2 + 1];
    if (s >= threshold) cands.push({ s, b: [boxes[i * 4], boxes[i * 4 + 1], boxes[i * 4 + 2], boxes[i * 4 + 3]] });
  }
  cands.sort((a, b) => b.s - a.s);
  const kept: typeof cands = [];
  for (const c of cands) if (kept.every((k) => iou(k.b, c.b) < 0.3)) kept.push(c);
  return kept.map(({ s, b }) => {
    const x0 = Math.max(0, b[0] * width), y0 = Math.max(0, b[1] * height);
    const x1 = Math.min(width, b[2] * width), y1 = Math.min(height, b[3] * height);
    return { type: 'face', box: { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) }, confidence: s, source: 'model' as const };
  });
}

/** Faces (via an injected model runner, so the model stays lazy) and QR codes. Detection only; no identification. */
export async function detectVisual(img: Pixels, runFaces?: FaceRunner): Promise<Finding[]> {
  const found = findQr(img);
  if (runFaces) {
    const { scores, boxes } = await runFaces(faceInput(img));
    found.push(...decodeFaces(scores, boxes, img.width, img.height));
  }
  return found;
}

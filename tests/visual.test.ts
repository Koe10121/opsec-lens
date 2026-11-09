import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { detectVisual, decodeFaces, faceInput, findQr, FACE_W, FACE_H } from '../src/detectors/visual';
import { loadFaceRunner } from '../src/detectors/face-model';
import { blank, pixels, drawQr, drawFace } from './visual-fixtures';

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

describe('QR detection', () => {
  it('boxes a generated QR code', async () => {
    const { c, g } = blank(400, 300);
    await drawQr(g, 200, 60, 180);
    const f = findQr(pixels(c));
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ type: 'qr', source: 'model' });
    expect(near(f[0].box.x, 200 + 4 * 6, 20)).toBe(true);
    expect(f[0].box.w).toBeGreaterThan(100);
  });
  it('finds nothing on a blank image', () => {
    expect(findQr(pixels(blank(200, 200).c))).toEqual([]);
  });
});

describe('face decoding', () => {
  it('thresholds, suppresses overlaps and scales to the image', () => {
    const scores = new Float32Array([0, 0.1, 0.1, 0.95, 0.2, 0.9, 0.9, 0.99]);
    const boxes = new Float32Array([0, 0, 0.1, 0.1, 0.1, 0.1, 0.3, 0.3, 0.11, 0.1, 0.3, 0.3, 0.5, 0.5, 0.7, 0.9]);
    // anchor 0 background, 1 and 2 overlap (keep 1), 3 separate
    const f = decodeFaces(scores, boxes, 1000, 500);
    expect(f.map((x) => x.box)).toEqual([{ x: 500, y: 250, w: 200, h: 200 }, { x: 100, y: 50, w: 200, h: 100 }]);
  });
  it('input is NCHW 320x240 normalised', () => {
    const data = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    const t = faceInput({ data, width: 4, height: 4 });
    expect(t.length).toBe(3 * FACE_W * FACE_H);
    expect(t[0]).toBeCloseTo(1, 2);
  });
});

describe('real face model (self-hosted file)', () => {
  it('detects a drawn face and a QR together, and not a blank page', async () => {
    const run = await loadFaceRunner(new Uint8Array(readFileSync('public/models/version-RFB-320.onnx')), '');
    const { c, g } = blank(640, 480);
    drawFace(g, 200, 240, 130);
    await drawQr(g, 400, 150, 200);
    const f = await detectVisual(pixels(c), run);
    const types = f.map((x) => x.type).sort();
    expect(types).toEqual(['face', 'qr']);
    const face = f.find((x) => x.type === 'face')!;
    expect(near(face.box.x + face.box.w / 2, 200, 70)).toBe(true);
    expect(await detectVisual(pixels(blank(640, 480).c), run)).toEqual([]);
  }, 60000);
});

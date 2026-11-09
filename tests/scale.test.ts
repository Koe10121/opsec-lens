import { describe, it, expect } from 'vitest';
import { planScale, unscaleWords, MAX_INPUT_PIXELS } from '../src/scale';

describe('planScale', () => {
  it('leaves small images alone', () => {
    expect(planScale(1280, 720)).toEqual({ ok: true, scale: 1, width: 1280, height: 720 });
  });
  it('downscales images above the OCR pixel budget, keeping aspect ratio', () => {
    const p = planScale(3840, 2160, { maxPixels: 1920 * 1080 });
    expect(p.ok).toBe(true);
    if (p.ok) {
      expect(p.scale).toBeCloseTo(0.5, 2);
      expect(p.width).toBe(1920);
      expect(p.height).toBe(1080);
    }
  });
  it('rejects huge images with a clear message', () => {
    const p = planScale(20000, 20000);
    expect(p.ok).toBe(false);
    if (!p.ok) expect(p.message).toMatch(/too large/i);
    expect(MAX_INPUT_PIXELS).toBeGreaterThan(0);
  });
});

describe('unscaleWords', () => {
  it('maps boxes found on the downscaled image back to original coordinates', () => {
    const words = [{ text: 'a', conf: 90, box: { x: 100, y: 50, w: 40, h: 10 } }];
    const out = unscaleWords(words, 0.5);
    expect(out[0].box).toEqual({ x: 200, y: 100, w: 80, h: 20 });
    expect(out[0].text).toBe('a');
  });
  it('is identity at scale 1', () => {
    const words = [{ text: 'a', conf: 90, box: { x: 1, y: 2, w: 3, h: 4 } }];
    expect(unscaleWords(words, 1)).toEqual(words);
  });
});

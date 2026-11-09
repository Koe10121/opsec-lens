import type { Word } from './detectors/types';

/** Above this the browser may run out of memory decoding/canvasing; refuse with a clear message. */
export const MAX_INPUT_PIXELS = 100_000_000;
/** OCR pixel budget: larger images are downscaled before recognition. */
export const OCR_PIXEL_BUDGET = 2_500_000;

export type ScalePlan =
  | { ok: true; scale: number; width: number; height: number }
  | { ok: false; message: string };

export function planScale(width: number, height: number, opts: { maxPixels?: number } = {}): ScalePlan {
  const px = width * height;
  if (px > MAX_INPUT_PIXELS)
    return { ok: false, message: `Image is too large (${width}x${height}). Crop or resize it below ${Math.round(MAX_INPUT_PIXELS / 1e6)} megapixels and try again.` };
  const budget = opts.maxPixels ?? OCR_PIXEL_BUDGET;
  if (px <= budget) return { ok: true, scale: 1, width, height };
  const scale = Math.sqrt(budget / px);
  return { ok: true, scale, width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Map word boxes found on a scaled image back to original-image coordinates. */
export function unscaleWords(words: Word[], scale: number): Word[] {
  if (scale === 1) return words;
  const k = 1 / scale;
  return words.map((w) => ({
    ...w,
    box: { x: Math.round(w.box.x * k), y: Math.round(w.box.y * k), w: Math.round(w.box.w * k), h: Math.round(w.box.h * k) },
  }));
}

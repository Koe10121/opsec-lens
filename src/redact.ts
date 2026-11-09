import type { Finding } from './detectors/types';

export type Pixels = { width: number; height: number; data: Uint8ClampedArray };
export type Style = 'solid' | 'pixelate' | 'blur';
export const STYLES: Style[] = ['solid', 'pixelate', 'blur'];

/** Paints opaque black over each finding box, in place. Boxes are clipped to the image. */
export function applySolid(img: Pixels, findings: Finding[]): void {
  for (const { box } of findings) {
    const x0 = Math.max(0, Math.floor(box.x));
    const y0 = Math.max(0, Math.floor(box.y));
    const x1 = Math.min(img.width, Math.ceil(box.x + box.w));
    const y1 = Math.min(img.height, Math.ceil(box.y + box.h));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * img.width + x) * 4;
        img.data[i] = 0;
        img.data[i + 1] = 0;
        img.data[i + 2] = 0;
        img.data[i + 3] = 255;
      }
    }
  }
}

type Rect = { x0: number; y0: number; x1: number; y1: number };
function clip(img: Pixels, box: Finding['box']): Rect {
  return {
    x0: Math.max(0, Math.floor(box.x)),
    y0: Math.max(0, Math.floor(box.y)),
    x1: Math.min(img.width, Math.ceil(box.x + box.w)),
    y1: Math.min(img.height, Math.ceil(box.y + box.h)),
  };
}

/** Replaces each block of the box with its average colour, in place. */
export function applyPixelate(img: Pixels, findings: Finding[], block = 8): void {
  for (const { box } of findings) {
    const r = clip(img, box);
    for (let by = r.y0; by < r.y1; by += block) {
      for (let bx = r.x0; bx < r.x1; bx += block) {
        const ex = Math.min(bx + block, r.x1);
        const ey = Math.min(by + block, r.y1);
        const sum = [0, 0, 0];
        for (let y = by; y < ey; y++)
          for (let x = bx; x < ex; x++)
            for (let c = 0; c < 3; c++) sum[c] += img.data[(y * img.width + x) * 4 + c];
        const n = (ex - bx) * (ey - by);
        for (let y = by; y < ey; y++)
          for (let x = bx; x < ex; x++) {
            const i = (y * img.width + x) * 4;
            for (let c = 0; c < 3; c++) img.data[i + c] = Math.round(sum[c] / n);
            img.data[i + 3] = 255;
          }
      }
    }
  }
}

/** Box-blurs the inside of each box (reads only the original pixels in the box), in place. */
export function applyBlur(img: Pixels, findings: Finding[], radius = 6, passes = 3): void {
  for (const { box } of findings) {
    const r = clip(img, box);
    const w = r.x1 - r.x0;
    const h = r.y1 - r.y0;
    if (w <= 0 || h <= 0) continue;
    let cur = new Float32Array(w * h * 3);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        for (let c = 0; c < 3; c++) cur[(y * w + x) * 3 + c] = img.data[((r.y0 + y) * img.width + r.x0 + x) * 4 + c];
    for (let p = 0; p < passes; p++) {
      const next = new Float32Array(cur.length);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          for (let c = 0; c < 3; c++) {
            let s = 0, n = 0;
            for (let dy = -radius; dy <= radius; dy++)
              for (let dx = -radius; dx <= radius; dx++) {
                const yy = y + dy, xx = x + dx;
                if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue;
                s += cur[(yy * w + xx) * 3 + c];
                n++;
              }
            next[(y * w + x) * 3 + c] = s / n;
          }
      cur = next;
    }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = ((r.y0 + y) * img.width + r.x0 + x) * 4;
        for (let c = 0; c < 3; c++) img.data[i + c] = Math.round(cur[(y * w + x) * 3 + c]);
        img.data[i + 3] = 255;
      }
  }
}

export function applyStyle(img: Pixels, findings: Finding[], style: Style): void {
  if (style === 'pixelate') applyPixelate(img, findings);
  else if (style === 'blur') applyBlur(img, findings);
  else applySolid(img, findings);
}

/** Redacts and re-encodes from a canvas, which drops any EXIF from the source file. */
export async function apply(image: ImageBitmap, findings: Finding[], style: Style = 'solid'): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyStyle(data, findings, style);
  ctx.putImageData(data, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png'),
  );
}

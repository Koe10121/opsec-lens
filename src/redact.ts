import type { Finding } from './detectors/types';

export type Pixels = { width: number; height: number; data: Uint8ClampedArray };
export type Style = 'solid';

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

/** Redacts and re-encodes from a canvas, which drops any EXIF from the source file. */
export async function apply(image: ImageBitmap, findings: Finding[], _style: Style = 'solid'): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applySolid(data, findings);
  ctx.putImageData(data, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png'),
  );
}

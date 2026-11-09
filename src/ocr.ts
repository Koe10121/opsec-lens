import { createWorker } from 'tesseract.js';
import type { Word } from './detectors/types';
import { planScale, unscaleWords } from './scale';

export type OcrOptions = { langs: string[]; langPath?: string; onProgress?: (fraction: number) => void };

/** Downscale big images before OCR; throws a clear error for absurdly large ones. */
async function prepare(image: Blob | Uint8Array): Promise<{ input: Blob | Uint8Array; scale: number }> {
  if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') return { input: image, scale: 1 };
  const bmp = await createImageBitmap(image instanceof Blob ? image : new Blob([image as BlobPart]));
  try {
    const plan = planScale(bmp.width, bmp.height);
    if (!plan.ok) throw new Error(plan.message);
    if (plan.scale === 1) return { input: image, scale: 1 };
    const c = new OffscreenCanvas(plan.width, plan.height);
    c.getContext('2d')!.drawImage(bmp, 0, 0, plan.width, plan.height);
    return { input: await c.convertToBlob({ type: 'image/png' }), scale: plan.scale };
  } finally {
    bmp.close();
  }
}

/** OCR runs in the browser. Only the engine's own language data is fetched; the image never is sent. */
export async function recognise(image: Blob | Uint8Array, opts: OcrOptions = { langs: ['eng'] }): Promise<Word[]> {
  const { input, scale } = await prepare(image);
  const worker = await createWorker(opts.langs.join('+'), undefined, {
    // In the browser everything is served from our own origin: worker + core (public/tesseract, copied at build),
    // language data (public/tessdata). Thai data is only fetched when a Thai page needs it. Node (benchmark) keeps defaults.
    ...(typeof window !== 'undefined'
      ? { workerPath: '/tesseract/worker.min.js', corePath: '/tesseract', langPath: opts.langPath ?? '/tessdata' }
      : opts.langs.includes('tha') ? { langPath: opts.langPath ?? '/tessdata' } : {}),
    logger: (m) => { if (m.status === 'recognizing text') opts.onProgress?.(m.progress); },
  });
  try {
    const { data } = await worker.recognize(input as Blob, {}, { blocks: true });
    const words: Word[] = [];
    for (const b of data.blocks ?? [])
      for (const p of b.paragraphs)
        for (const l of p.lines)
          for (const w of l.words)
            words.push({
              text: w.text,
              conf: w.confidence,
              box: { x: w.bbox.x0, y: w.bbox.y0, w: w.bbox.x1 - w.bbox.x0, h: w.bbox.y1 - w.bbox.y0 },
            });
    return unscaleWords(words, scale);
  } finally {
    await worker.terminate();
  }
}

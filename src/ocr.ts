import { createWorker } from 'tesseract.js';
import type { Word } from './detectors/types';

/** OCR runs in the browser. Only the engine's own language data is fetched; the image never is sent. */
export async function recognise(image: Blob, opts: { langs: string[] } = { langs: ['eng'] }): Promise<Word[]> {
  const worker = await createWorker(opts.langs.join('+'));
  try {
    const { data } = await worker.recognize(image, {}, { blocks: true });
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
    return words;
  } finally {
    await worker.terminate();
  }
}

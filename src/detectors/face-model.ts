import type { FaceRunner } from './visual';
import { FACE_W, FACE_H } from './visual';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import mjsUrl from 'onnxruntime-web/ort-wasm-simd-threaded.mjs?url';

/** Lazy-loads onnxruntime-web and the self-hosted UltraFace model (MIT). Nothing here touches the network except same-origin files. */
export async function loadFaceRunner(model: string | Uint8Array = `${import.meta.env?.BASE_URL ?? '/'}models/version-RFB-320.onnx`, wasmPaths: string | { mjs: string; wasm: string } = { mjs: mjsUrl, wasm: wasmUrl }): Promise<FaceRunner> {
  const ort = await import('onnxruntime-web/wasm');
  if (wasmPaths) ort.env.wasm.wasmPaths = wasmPaths; // wasm is bundled by Vite and served from our own origin; no CDN
  ort.env.logLevel = 'error';
  ort.env.wasm.numThreads = 1;
  const session = await ort.InferenceSession.create(model as string, { executionProviders: ['wasm'] });
  return async (input) => {
    const out = await session.run({ input: new ort.Tensor('float32', input, [1, 3, FACE_H, FACE_W]) });
    return { scores: out.scores.data as Float32Array, boxes: out.boxes.data as Float32Array };
  };
}

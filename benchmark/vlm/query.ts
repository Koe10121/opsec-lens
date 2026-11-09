// Usage: tsx benchmark/vlm/query.ts [model] [step]
// Offline spike (issue 017). Sends SYNTHETIC benchmark images only to a LOCAL Ollama (localhost).
// Caches responses in benchmark/out/vlm-<model>.json so it can be resumed.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

export const SUBSET_STEP = Number(process.argv[3] ?? 5);
export const PROMPT =
  'This is a synthetic screenshot. List every piece of sensitive text visible that should be redacted before sharing: ' +
  'email addresses, IP addresses, hostnames, URLs, access tokens or keys, phone numbers. ' +
  'Reply with JSON only: {"items":[{"type":"email|ip|hostname|url|phone|token","text":"exact text as shown"}]}';

const model = process.argv[2] ?? 'gemma3:12b';
const dir = 'benchmark/out';
const cachePath = `${dir}/vlm-${model.replace(/[^\w.-]/g, '_')}.json`;

export function subset(labels: Record<string, unknown>, step = SUBSET_STEP): string[] {
  return Object.keys(labels).sort().filter((n, i) => !n.startsWith('thai-') && i % step === 0);
}

if (process.argv[1]?.endsWith('query.ts')) {
  const labels = JSON.parse(readFileSync(`${dir}/labels.json`, 'utf8'));
  const cache: Record<string, { items: { type: string; text: string }[]; ms: number }> = existsSync(cachePath)
    ? JSON.parse(readFileSync(cachePath, 'utf8'))
    : {};
  const names = subset(labels);
  for (const n of names) {
    if (cache[n]) continue;
    const t = Date.now();
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        model, prompt: PROMPT, stream: false, format: 'json', options: { temperature: 0 },
        images: [readFileSync(`${dir}/${n}`).toString('base64')],
      }),
    });
    const raw = ((await res.json()) as { response: string }).response;
    let items: { type: string; text: string }[] = [];
    try { items = (JSON.parse(raw).items ?? []).filter((i: any) => i && typeof i.text === 'string'); } catch { /* keep empty */ }
    cache[n] = { items, ms: Date.now() - t };
    writeFileSync(cachePath, JSON.stringify(cache));
    console.log(`${n}: ${items.length} items, ${((Date.now() - t) / 1000).toFixed(1)}s (${Object.keys(cache).length}/${names.length})`);
  }
}

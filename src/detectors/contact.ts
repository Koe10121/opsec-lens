import type { Detector, Finding } from './types';

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;

export const emailDetector: Detector = (words) =>
  words
    .filter((w) => EMAIL.test(w.text))
    .map((w) => ({ type: 'email', box: w.box, confidence: 0.95, source: 'rules' as const }));

const LEAD = /^[(\[<"'`]+/;
const TRAIL = /[,.;:)\]>"'`!?]+$/;
const strip = (t: string) => t.replace(/^["'`<\[]+/, '').replace(TRAIL, '');

const DATE = /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}(?:[T ].*)?$|^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/;
const IPV4_SHAPE = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const PHONE_SHAPE = /^\+?[\d().\-]+$/;

function phoneConfidence(t: string): number {
  if (!PHONE_SHAPE.test(t) || DATE.test(t) || IPV4_SHAPE.test(t)) return 0;
  const digits = t.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return 0;
  if (t.startsWith('+')) return 0.85;
  if (/[-.()]/.test(t) && /^(?:\(\d+\)|\d+)[-.]?/.test(t)) return t.includes('(') ? 0.8 : 0.7;
  return 0;
}

export const phoneDetector: Detector = (words) => {
  const out: Finding[] = [];
  for (let i = 0; i < words.length; i++) {
    const t = strip(words[i].text.replace(LEAD, (m) => m.replace(/[^(]/g, '')));
    const c = phoneConfidence(t);
    if (c) {
      out.push({ type: 'phone', box: words[i].box, confidence: c, source: 'rules' });
      continue;
    }
    // "(202)" followed by "555-0143"
    const next = words[i + 1];
    const area = words[i].text.replace(/[,;:]+$/, '');
    if (next && /^\(\d{2,4}\)$/.test(area)) {
      const joined = `${area}${strip(next.text)}`;
      if (/^\(\d{2,4}\)\d{3}[-.]?\d{3,4}$/.test(joined) && phoneConfidence(`${area}-${strip(next.text)}`)) {
        const a = words[i].box, b = next.box;
        const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
        out.push({
          type: 'phone',
          box: { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y },
          confidence: 0.8,
          source: 'rules',
        });
        i++;
      }
    }
  }
  return out;
};

const PREFIXED_KEY = /^(?:sk|pk|api|key|token|secret|tok|ghp|xox[a-z])[-_][A-Za-z0-9][A-Za-z0-9_-]{15,}$/i;
const BEARER_VALUE = /^[A-Za-z0-9._~+/=-]{16,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function entropy(s: string): number {
  const n = new Map<string, number>();
  for (const ch of s) n.set(ch, (n.get(ch) ?? 0) + 1);
  let h = 0;
  for (const c of n.values()) h -= (c / s.length) * Math.log2(c / s.length);
  return h;
}

function looksRandom(t: string): boolean {
  if (t.length < 32 || !/^[A-Za-z0-9+/_=-]+$/.test(t)) return false;
  if (/^[0-9a-f]+$/i.test(t) || UUID.test(t) || DATE.test(t)) return false;
  if (!/\d/.test(t) || !/[a-z]/.test(t) || !/[A-Z]/.test(t)) return false;
  return entropy(t) >= 4.0;
}

export const tokenDetector: Detector = (words) =>
  words.flatMap((w, i) => {
    const t = strip(w.text);
    const f = (confidence: number): Finding[] => [{ type: 'token', box: w.box, confidence, source: 'rules' }];
    if (i > 0 && /^bearer$/i.test(strip(words[i - 1].text)) && BEARER_VALUE.test(t)) return f(0.9);
    if (PREFIXED_KEY.test(t)) return f(0.95);
    if (looksRandom(t)) return f(0.6);
    return [];
  });

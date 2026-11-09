import type { Detector } from './types';

const IPV4 = /(?<![\d.])(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?![\d]|\.\d)/;
const VERSION_PREFIX = /(?:^|[^A-Za-z0-9])v$|==$/i;
const VERSION_WORD = /^(?:version|ver\.?|v)[:=]?$|^==$/i;

function isDocRange(o: number[]): boolean {
  const [a, b, c] = o;
  return (a === 192 && b === 0 && c === 2) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113);
}

export const ipv4Detector: Detector = (words) =>
  words.flatMap((w, i) => {
    const m = IPV4.exec(w.text);
    if (!m) return [];
    const octets = m.slice(1, 5).map(Number);
    if (octets.some((o) => o > 255)) return [];
    if (VERSION_PREFIX.test(w.text.slice(0, m.index))) return [];
    if (i > 0 && VERSION_WORD.test(words[i - 1].text)) return [];
    return [{ type: 'ip', box: w.box, confidence: isDocRange(octets) ? 0.5 : 0.9, source: 'rules' as const }];
  });

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
    if (isPrivate(octets)) return [{ type: 'internal-ip', box: w.box, confidence: 0.95, source: 'rules' as const }];
    return [{ type: 'ip', box: w.box, confidence: isDocRange(octets) ? 0.5 : 0.9, source: 'rules' as const }];
  });

function isPrivate([a, b]: number[]): boolean {
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

const LEAD = /^[(\[<"'`]+/;
const TRAIL = /[,.;:)\]>"'`!?]+$/;
const clean = (t: string) => t.replace(LEAD, '').replace(TRAIL, '');

const INTERNAL_HOST = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:internal|local|lan|corp|intranet|test)$/i;
const URL_RE = /^[a-z][a-z0-9+.-]*:\/\/([^/?#:@]+)(?::\d+)?(?:[/?#]|$)/i;

export const hostDetector: Detector = (words) =>
  words.flatMap((w) => {
    const t = clean(w.text);
    const u = URL_RE.exec(t);
    if (u) {
      const host = u[1];
      const o = host.split('.').map(Number);
      const internal =
        INTERNAL_HOST.test(host) || !host.includes('.') || (o.length === 4 && o.every((n) => n <= 255) && isPrivate(o));
      return internal ? [{ type: 'url', box: w.box, confidence: 0.85, source: 'rules' as const }] : [];
    }
    if (INTERNAL_HOST.test(t)) return [{ type: 'hostname', box: w.box, confidence: 0.85, source: 'rules' as const }];
    return [];
  });

const HEX_GROUP = /^[0-9a-f]{1,4}$/i;

export const ipv6Detector: Detector = (words) =>
  words.flatMap((w) => {
    let t = w.text.replace(LEAD, '').replace(/[,;.)>"'`!?]+$/, '').replace(/\](?::\d+)?$/, '');
    t = t.replace(/%\w+$/, '').replace(/\/\d{1,3}$/, '');
    if (!/^[0-9a-f:]+$/i.test(t) || !/[0-9a-f]/i.test(t)) return [];
    const compressed = t.includes('::');
    if (compressed && t.split('::').length !== 2) return [];
    const groups = t.split(':').filter((g) => g !== '');
    if (!groups.every((g) => HEX_GROUP.test(g))) return [];
    if (compressed ? groups.length > 7 : groups.length !== 8) return [];
    const doc = /^2001:0*db8(:|$)/i.test(t);
    return [{ type: 'ipv6', box: w.box, confidence: doc ? 0.5 : 0.9, source: 'rules' as const }];
  });

export const networkDetector: Detector = (words, ctx) => [
  ...ipv4Detector(words, ctx),
  ...ipv6Detector(words, ctx),
  ...hostDetector(words, ctx),
];

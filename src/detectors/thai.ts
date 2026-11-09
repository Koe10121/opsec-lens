import type { Detector, Finding, Word, Box } from './types';

const TH_DIGITS = '๐๑๒๓๔๕๖๗๘๙';
const norm = (t: string) => t.replace(/[๐-๙]/g, (c) => String(TH_DIGITS.indexOf(c))).replace(/^[("'\[<]+|[,.;:)"'\]>]+$/g, '');
const THAI = /[฀-๿]/;

export const hasThai = (words: Word[]) => words.some((w) => THAI.test(w.text));

function validThaiId(d: string): boolean {
  if (!/^\d{13}$/.test(d) || d[0] === '0') return false;
  const sum = [...d.slice(0, 12)].reduce((a, c, i) => a + Number(c) * (13 - i), 0);
  return (11 - (sum % 11)) % 10 === Number(d[12]);
}

export const thaiIdDetector: Detector = (words) =>
  words
    .filter((w) => /^[\d-]+$/.test(norm(w.text)) && validThaiId(norm(w.text).replace(/-/g, '')))
    .map((w) => ({ type: 'thai-id', box: w.box, confidence: 0.95, source: 'rules' as const }));

const PHONE = /^(?:0[689]\d[-\s]?\d{3}[-\s]?\d{4}|\+66[-\s]?[689]\d[-\s]?\d{3}[-\s]?\d{4})$/;

export const thaiPhoneDetector: Detector = (words) =>
  words
    .filter((w) => PHONE.test(norm(w.text)))
    .map((w) => ({ type: 'thai-phone', box: w.box, confidence: 0.85, source: 'rules' as const }));

const STUDENT_LABEL = /^(?:รหัสนักศึกษา|รหัสนิสิต|รหัสนักเรียน|student|studentid|student-id|id:?)$/i;
const THAI_LABELS = ['รหัสนักศึกษา', 'รหัสนิสิต', 'รหัสนักเรียน'];

const union = (a: Box, b: Box): Box => {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

const sameLine = (a: Box, b: Box) => {
  const ov = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ov >= 0.3 * Math.min(a.h, b.h);
};

type Run = { text: string; words: Word[]; box: Box };

/**
 * Tesseract's Thai model often returns one word per glyph and no spaces, so reassemble runs of
 * consecutive Thai fragments on one line. A run breaks at a gap wider than the typical text height.
 */
function thaiRuns(words: Word[]): Run[] {
  const hs = words.map((w) => w.box.h).sort((a, b) => a - b);
  const maxGap = hs.length ? hs[Math.floor(hs.length / 2)] : 0;
  const runs: Run[] = [];
  let cur: Run | null = null;
  for (const w of words) {
    if (!THAI.test(w.text)) { cur = null; continue; }
    const t = norm(w.text);
    if (cur && sameLine(cur.box, w.box) && w.box.x - (cur.box.x + cur.box.w) <= maxGap) {
      cur.text += t; cur.words.push(w); cur.box = union(cur.box, w.box);
    } else {
      cur = { text: t, words: [w], box: w.box };
      runs.push(cur);
    }
  }
  return runs;
}

export const thaiStudentIdDetector: Detector = (words) => {
  const out: Finding[] = [];
  const runs = thaiRuns(words);
  for (let i = 0; i < words.length; i++) {
    const v = norm(words[i].text);
    if (!/^\d{8,10}$/.test(v)) continue;
    const prev = i ? norm(words[i - 1].text).replace(/:$/, '') : '';
    const prev2 = i > 1 ? norm(words[i - 2].text) : '';
    let labelled = STUDENT_LABEL.test(prev) && (prev.toLowerCase() !== 'id' || /^student$/i.test(prev2));
    // fragmented Thai label: the nearest run to the left on the same line must end with a known label
    if (!labelled) {
      const left = runs.filter((r) => r.box.x + r.box.w <= words[i].box.x && sameLine(r.box, words[i].box));
      const near = left.sort((a, b) => b.box.x - a.box.x)[0];
      labelled = !!near && THAI_LABELS.some((l) => near.text.replace(/:$/, '').endsWith(l));
    }
    if (labelled) out.push({ type: 'thai-student-id', box: words[i].box, confidence: 0.8, source: 'rules' });
  }
  return out;
};

const TITLES = ['นางสาว', 'น.ส.', 'นาย', 'นาง', 'คุณ', 'ดร.', 'ผศ.', 'รศ.', 'ศ.'];

/** Best effort: a run that starts with a title; the rest of the run (at least two glyphs) is the name. */
export const thaiNameDetector: Detector = (words) => {
  const out: Finding[] = [];
  for (const run of thaiRuns(words)) {
    const title = TITLES.find((t) => run.text.startsWith(t));
    if (!title) continue;
    let used = 0;
    let k = 0;
    while (k < run.words.length && used < title.length) used += norm(run.words[k++].text).length;
    const rest = run.words.slice(k);
    if (rest.reduce((n, w) => n + norm(w.text).length, 0) < 2) continue;
    out.push({ type: 'thai-name', box: rest.map((w) => w.box).reduce(union), confidence: 0.5, source: 'rules' });
  }
  return out;
};

export const thaiDetectors: Detector[] = [thaiIdDetector, thaiPhoneDetector, thaiStudentIdDetector, thaiNameDetector];

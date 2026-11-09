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

export const thaiStudentIdDetector: Detector = (words) => {
  const out: Finding[] = [];
  for (let i = 1; i < words.length; i++) {
    const v = norm(words[i].text);
    if (!/^\d{8,10}$/.test(v)) continue;
    // label directly before, or "Student ID:" two words before
    const prev = norm(words[i - 1].text).replace(/:$/, '');
    const prev2 = i > 1 ? norm(words[i - 2].text) : '';
    if (STUDENT_LABEL.test(prev) && (prev.toLowerCase() !== 'id' || /^student$/i.test(prev2)))
      out.push({ type: 'thai-student-id', box: words[i].box, confidence: 0.8, source: 'rules' });
  }
  return out;
};

const TITLES = new Set(['นาย', 'นาง', 'นางสาว', 'น.ส.', 'คุณ', 'ดร.', 'ผศ.', 'รศ.', 'ศ.']);

const union = (a: Box, b: Box): Box => {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

/** Best effort: title word followed by up to two Thai words (first name, surname). */
export const thaiNameDetector: Detector = (words) => {
  const out: Finding[] = [];
  for (let i = 0; i < words.length; i++) {
    if (!TITLES.has(norm(words[i].text))) continue;
    let box: Box | null = null;
    let j = i + 1;
    for (; j < words.length && j <= i + 2 && THAI.test(words[j].text) && !TITLES.has(norm(words[j].text)); j++)
      box = box ? union(box, words[j].box) : words[j].box;
    if (box) {
      out.push({ type: 'thai-name', box, confidence: 0.5, source: 'rules' });
      i = j - 1;
    }
  }
  return out;
};

export const thaiDetectors: Detector[] = [thaiIdDetector, thaiPhoneDetector, thaiStudentIdDetector, thaiNameDetector];

import { describe, it, expect } from 'vitest';
import { thaiIdDetector, thaiPhoneDetector, thaiStudentIdDetector, thaiNameDetector, hasThai } from '../src/detectors/thai';
import type { Word } from '../src/detectors/types';

const words = (...t: string[]): Word[] => t.map((text, i) => ({ text, box: { x: i * 100, y: 10, w: 90, h: 16 }, conf: 90 }));

// check digit: sum(d[i]*(13-i)) for i<12, then (11 - sum%11) % 10
function withCheck(d12: string): string {
  const s = [...d12].reduce((a, c, i) => a + Number(c) * (13 - i), 0);
  return d12 + ((11 - (s % 11)) % 10);
}

describe('thai national id', () => {
  const good = withCheck('110000000001');
  it('flags a valid 13-digit id, plain or hyphenated', () => {
    expect(thaiIdDetector(words(good), {})).toHaveLength(1);
    const h = `${good[0]}-${good.slice(1, 5)}-${good.slice(5, 10)}-${good.slice(10, 12)}-${good[12]}`;
    expect(thaiIdDetector(words(h), {})[0]).toMatchObject({ type: 'thai-id', source: 'rules' });
  });
  it('does not flag a bad check digit or other lengths', () => {
    const bad = good.slice(0, 12) + ((Number(good[12]) + 1) % 10);
    expect(thaiIdDetector(words(bad, '123456789012', '12345678901234'), {})).toEqual([]);
  });
});

describe('thai phone', () => {
  it('flags mobile formats and +66', () => {
    for (const p of ['081-234-5678', '0812345678', '+66812345678', '+66-81-234-5678'])
      expect(thaiPhoneDetector(words(p), {}), p).toHaveLength(1);
  });
  it('does not flag non-mobile prefixes or short numbers', () => {
    expect(thaiPhoneDetector(words('051-234-5678', '081-234', '2024-05-17'), {})).toEqual([]);
  });
});

describe('thai student id', () => {
  it('flags the value after a label, not the label', () => {
    const f = thaiStudentIdDetector(words('รหัสนักศึกษา', '6401234567'), {});
    expect(f).toHaveLength(1);
    expect(f[0].box.x).toBe(100);
    expect(thaiStudentIdDetector(words('Student', 'ID:', '6401234567'), {})).toHaveLength(1);
  });
  it('ignores bare numbers without a label', () => {
    expect(thaiStudentIdDetector(words('6401234567'), {})).toEqual([]);
  });
});

describe('thai name (best effort)', () => {
  it('flags the name after a title, at low confidence', () => {
    const f = thaiNameDetector(words('นาย', 'สมชาย', 'ใจดี'), {});
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ type: 'thai-name' });
    expect(f[0].confidence).toBeLessThan(0.7);
    expect(f[0].box.w).toBeGreaterThan(90);
  });
  it('ignores a title with no name after it', () => {
    expect(thaiNameDetector(words('นาย'), {})).toEqual([]);
  });
});

// Tesseract's Thai model often returns one word per glyph; detectors must reassemble them.
const frags = (text: string, x0: number, y = 10): Word[] =>
  [...text].map((c, i) => ({ text: c, box: { x: x0 + i * 9, y, w: 7, h: 16 }, conf: 80 }));
const num = (text: string, x: number): Word => ({ text, box: { x, y: 10, w: 100, h: 16 }, conf: 90 });

describe('thai detectors on glyph-fragmented OCR', () => {
  it('finds the student id after a fragmented label', () => {
    const ws = [...frags('รหัสนักศึกษา', 0), num('6401234567', 300)];
    const f = thaiStudentIdDetector(ws, {});
    expect(f).toHaveLength(1);
    expect(f[0].box.x).toBe(300);
  });
  it('does not flag a number whose preceding Thai text is not a label', () => {
    expect(thaiStudentIdDetector([...frags('ชื่อ', 0), num('6401234567', 300)], {})).toEqual([]);
  });
  it('finds the name after a fragmented title, excluding the title', () => {
    const ws = [...frags('นาง', 200), ...frags('ประเสริฐ', 232)];
    const f = thaiNameDetector(ws, {});
    expect(f).toHaveLength(1);
    expect(f[0].box.x).toBe(232);
  });
  it('does not join a title to text on another line or far away', () => {
    expect(thaiNameDetector([...frags('นาง', 0), ...frags('ประเสริฐ', 400)], {})).toEqual([]);
  });
});

describe('hasThai', () => {
  it('detects Thai script', () => {
    expect(hasThai(words('hello', 'สวัสดี'))).toBe(true);
    expect(hasThai(words('hello'))).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { emailDetector } from '../src/detectors/contact';
import { runDetectors, type Word } from '../src/detectors/types';

const w = (text: string, x = 0): Word => ({ text, box: { x, y: 10, w: text.length * 8, h: 16 }, conf: 90 });

describe('email detector', () => {
  it('flags an email word', () => {
    const f = emailDetector([w('Contact:'), w('user@example.com', 100)], {});
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ type: 'email', box: { x: 100, y: 10, w: 128, h: 16 }, source: 'rules' });
  });
  it('ignores trailing punctuation but still flags', () => {
    expect(emailDetector([w('(a.b+c@mail.example.com),')], {})).toHaveLength(1);
  });
  it('does not flag non-emails', () => {
    const words = ['hello', '@handle', 'user@', 'a@b', '192.0.2.1', 'v1.2@3'].map((t) => w(t));
    expect(emailDetector(words, {})).toEqual([]);
  });
  it('runDetectors runs only enabled detectors', () => {
    const words = [w('user@example.com')];
    expect(runDetectors(words, [emailDetector])).toHaveLength(1);
    expect(runDetectors(words, [])).toEqual([]);
  });
});

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

import { phoneDetector, tokenDetector } from '../src/detectors/contact';

describe('phone detector', () => {
  const run = (...t: string[]) => phoneDetector(t.map((x, i) => w(x, i * 100)), {});
  it('flags international and separated numbers', () => {
    for (const p of ['+1-202-555-0143', '+44.20.7946.0000', '202-555-0143', '(202)-555-0143', '+66812345678']) {
      expect(run(p), p).toHaveLength(1);
    }
    expect(run('+1-202-555-0143')[0]).toMatchObject({ type: 'phone', source: 'rules' });
  });
  it('merges "(202)" + "555-0143" into one box', () => {
    const f = run('Call', '(202)', '555-0143');
    expect(f).toHaveLength(1);
    expect(f[0].box.x).toBe(100);
    expect(f[0].box.w).toBeGreaterThan(40);
  });
  it('gives + prefixed numbers higher confidence than bare separated ones', () => {
    expect(run('+1-202-555-0143')[0].confidence).toBeGreaterThan(run('202-555-0143')[0].confidence);
  });
  it('does not flag dates, IPs, plain numbers, versions, hashes', () => {
    for (const t of ['2024-05-17', '17/05/2024', '2024-05-17T10:20:30', '192.168.100.200', '1234567890123', '1.2.3', '4111', 'a1b2c3d4e5f6']) {
      expect(run(t), t).toEqual([]);
    }
  });
});

describe('token detector', () => {
  const run = (...t: string[]) => tokenDetector(t.map((x, i) => w(x, i * 300)), {});
  it('flags prefixed keys', () => {
    const f = run('sk-synthetic-AAAABBBBCCCCDDDD1111');
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ type: 'token', source: 'rules' });
    expect(f[0].confidence).toBeGreaterThanOrEqual(0.9);
  });
  it('flags the token after Bearer, not the word Bearer', () => {
    const f = run('Authorization:', 'Bearer', 'eyJzeW50aGV0aWMiOiJ0b2tlbiJ9.c3ludGhldGlj');
    expect(f).toHaveLength(1);
    expect(f[0].box.x).toBe(600);
  });
  it('flags long mixed high-entropy strings', () => {
    expect(run('Zx9Qm2LpV7nRt4Kd8WbY3cHs6JfGa1Ue5Xo0')).toHaveLength(1);
  });
  it('does not flag commit hashes, uuids, dates, long numbers, words, paths', () => {
    for (const t of [
      'a1b2c3d4', '3f786850e387550fdab836ed7e6dc881de23001b', '3f786850e387550fdab836ed7e6dc881',
      '123e4567-e89b-12d3-a456-426614174000', '2024-05-17T10:20:30Z', '12345678901234567890123456789012345',
      'internationalization_configuration_manager', '/usr/local/share/applications/example',
    ]) {
      expect(run(t), t).toEqual([]);
    }
  });
});

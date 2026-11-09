import { describe, it, expect } from 'vitest';
import { layoutDetector } from '../src/detectors/layout';
import type { Word } from '../src/detectors/types';

const w = (text: string, x: number, y: number): Word => ({ text, box: { x, y, w: text.length * 8, h: 16 }, conf: 90 });

// Hand-built SIEM table: columns Time(0) | Source IP(100) | Username(240) | Action(380)
const row = (y: number, t: string, ip: string, user: string, act: string): Word[] => [
  w(t, 0, y), w(ip, 100, y), w(user, 240, y), w(act, 380, y),
];
const header: Word[] = [w('Time', 0, 10), w('Source', 100, 10), w('IP', 156, 10), w('Username', 240, 10), w('Action', 380, 10)];
const table: Word[] = [
  ...header,
  ...row(40, '10:01', '203.0.113.7', 'zk4471', 'blocked'),
  ...row(70, '10:02', '198.51.100.9', 'mthu', 'allowed'),
  ...row(100, '10:03', '192.0.2.55', 'adm-ops', 'blocked'),
];

describe('layout detector (column heuristics)', () => {
  it('boxes the whole Source IP and Username columns as one finding each', () => {
    const f = layoutDetector(table, {});
    expect(f).toHaveLength(2);
    expect(f.every((x) => x.type === 'column' && x.source === 'layout')).toBe(true);
    const ipCol = f.find((x) => x.box.x < 140)!;
    // covers every IP value (below the header), including the wide one
    for (const y of [40, 70, 100]) {
      expect(ipCol.box.y).toBeLessThanOrEqual(y);
      expect(ipCol.box.y + ipCol.box.h).toBeGreaterThanOrEqual(y + 16);
    }
    expect(ipCol.box.x).toBeLessThanOrEqual(100);
    expect(ipCol.box.x + ipCol.box.w).toBeGreaterThanOrEqual(100 + 12 * 8);
    // does not swallow the neighbouring Username column
    expect(ipCol.box.x + ipCol.box.w).toBeLessThan(240);
  });
  it('includes values that match no pattern (usernames)', () => {
    const user = layoutDetector(table, {}).find((x) => x.box.x >= 200 && x.box.x < 300)!;
    expect(user.box.x + user.box.w).toBeGreaterThanOrEqual(240 + 7 * 8);
    expect(user.box.x + user.box.w).toBeLessThan(380);
  });
  it('does not flag header-like words in prose', () => {
    const prose = [
      w('Enter', 0, 10), w('your', 50, 10), w('username', 100, 10), w('to', 180, 10), w('continue', 210, 10),
      w('We', 0, 40), w('never', 30, 40), w('share', 90, 40), w('it', 150, 40),
    ];
    expect(layoutDetector(prose, {})).toEqual([]);
  });
  it('needs values below the header', () => {
    expect(layoutDetector(header, {})).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { ipv4Detector } from '../src/detectors/network';
import type { Word } from '../src/detectors/types';

const w = (text: string, x = 0): Word => ({ text, box: { x, y: 10, w: text.length * 8, h: 16 }, conf: 90 });

describe('ipv4 detector', () => {
  it('flags a valid IPv4 word with its box', () => {
    const f = ipv4Detector([w('IP:'), w('198.18.0.7', 50)], {});
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ type: 'ip', box: { x: 50, y: 10, w: 80, h: 16 }, source: 'rules' });
    expect(f[0].confidence).toBeGreaterThanOrEqual(0.8);
  });
  it('flags IPs wrapped in punctuation', () => {
    expect(ipv4Detector([w('(198.18.0.7),')], {})).toHaveLength(1);
    expect(ipv4Detector([w('198.18.0.7:8080')], {})).toHaveLength(1);
  });
  it('gives documentation ranges lower confidence but still flags them', () => {
    const [doc] = ipv4Detector([w('203.0.113.7')], {});
    const [real] = ipv4Detector([w('198.18.0.7')], {});
    expect(doc).toBeDefined();
    expect(doc.confidence).toBeLessThan(real.confidence);
    expect(doc.confidence).toBeGreaterThan(0.3);
    for (const ip of ['192.0.2.1', '198.51.100.9']) expect(ipv4Detector([w(ip)], {})).toHaveLength(1);
  });
  it('rejects invalid octets', () => {
    for (const t of ['999.1.1.1', '256.1.1.1', '1.2.3.300', '1.2.3', '1.2.3.4.5'])
      expect(ipv4Detector([w(t)], {})).toEqual([]);
  });
  it('rejects version-number lookalikes', () => {
    expect(ipv4Detector([w('v1.2.3.4')], {})).toEqual([]);
    expect(ipv4Detector([w('V1.2.3.4')], {})).toEqual([]);
    expect(ipv4Detector([w('==1.2.3.4')], {})).toEqual([]);
    expect(ipv4Detector([w('version'), w('2.0.1.5')], {})).toEqual([]);
    expect(ipv4Detector([w('Version:'), w('2.0.1.5')], {})).toEqual([]);
    expect(ipv4Detector([w('=='), w('2.0.1.5')], {})).toEqual([]);
  });
});

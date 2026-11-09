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

import { networkDetector } from '../src/detectors/network';

describe('network detector', () => {
  const run = (...t: string[]) => networkDetector(t.map((x, i) => w(x, i * 100)), {});
  const types = (...t: string[]) => run(...t).map((f) => f.type);

  it('labels private IPv4 ranges as internal-ip', () => {
    for (const ip of ['10.0.0.5', '172.16.4.1', '172.31.255.1', '192.168.1.20'])
      expect(types(ip)).toEqual(['internal-ip']);
    expect(types('172.32.0.1')).toEqual(['ip']);
    expect(types('203.0.113.7')).toEqual(['ip']);
  });
  it('flags internal hostnames', () => {
    expect(types('host01.corp.example.test')).toEqual(['hostname']);
    expect(types('db.internal,')).toEqual(['hostname']);
    expect(types('printer.local')).toEqual(['hostname']);
    expect(types('nas.lan')).toEqual(['hostname']);
  });
  it('flags internal URLs as url', () => {
    expect(types('http://wiki.internal/')).toEqual(['url']);
    expect(types('https://intranet/home')).toEqual(['url']);
    expect(types('https://app.corp.example.test/x?y=1')).toEqual(['url']);
  });
  it('does not flag public URLs or hostnames', () => {
    expect(types('https://example.com/')).toEqual([]);
    expect(types('www.example.com')).toEqual([]);
  });
  it('flags IPv6 addresses, doc range at lower confidence', () => {
    const [doc] = run('2001:db8::1');
    expect(doc).toMatchObject({ type: 'ipv6', source: 'rules' });
    const [real] = run('[fd12:3456:789a::1]:443');
    expect(real.type).toBe('ipv6');
    expect(doc.confidence).toBeLessThan(real.confidence);
    expect(types('2001:0db8:0000:0000:0000:ff00:0042:8329')).toEqual(['ipv6']);
  });
  it('ignores lookalikes: files, versions, timestamps, MACs', () => {
    expect(types('app.test.ts', 'config.local.json', 'notes.internal.txt')).toEqual([]);
    expect(types('v1.2.3', '12:30:45', '2024-01-02T10:20:30', 'aa:bb:cc:dd:ee:ff', '::', 'Note:')).toEqual([]);
    expect(types('e.g.', 'foo.test()', 'a.b')).toEqual([]);
  });
  it('keeps the word box and does not double-flag', () => {
    const f = networkDetector([w('http://wiki.internal/', 50)], {});
    expect(f).toHaveLength(1);
    expect(f[0].box).toMatchObject({ x: 50, y: 10 });
  });
});

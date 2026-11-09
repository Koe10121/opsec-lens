import { describe, it, expect } from 'vitest';
import { buildOrgTable, lookupOrg, ipToInt } from '../src/detectors/orgs';
import { networkDetector } from '../src/detectors/network';
import type { Word } from '../src/detectors/types';

// Synthetic ip2asn-style TSV: start, end, ASN, country, description. Documentation ranges + fake orgs only.
const TSV = [
  '192.0.2.0\t192.0.2.255\t64500\tZZ\tEXAMPLE-UNIVERSITY - Example University',
  '198.51.100.0\t198.51.100.127\t64501\tZZ\tEXAMPLE-GOV - Example Ministry of Testing',
  '198.51.100.128\t198.51.100.255\t64501\tZZ\tEXAMPLE-GOV - Example Ministry of Testing',
  '203.0.113.0\t203.0.113.255\t64502\tZZ\tEXAMPLE-HOSTING - Example Hosting Ltd',
  '0.0.0.0\t0.255.255.255\t0\tNone\tNot routed',
].join('\n');

const keep = (asn: number, desc: string) => /university|ministry/i.test(desc) || asn === 64502;

describe('org table', () => {
  const table = buildOrgTable(TSV, keep);
  it('converts dotted quads to ints', () => {
    expect(ipToInt('192.0.2.1')).toBe(3221225985);
    expect(ipToInt('999.0.0.1')).toBeUndefined();
  });
  it('looks up an IP inside a kept range', () => {
    expect(lookupOrg(table, '192.0.2.77')).toBe('Example University');
    expect(lookupOrg(table, '203.0.113.5')).toBe('Example Hosting Ltd');
  });
  it('matches range edges and merges adjacent ranges of one org', () => {
    expect(lookupOrg(table, '198.51.100.0')).toBe('Example Ministry of Testing');
    expect(lookupOrg(table, '198.51.100.255')).toBe('Example Ministry of Testing');
    expect(table.starts.length).toBe(3);
  });
  it('returns undefined for unknown, unrouted or invalid IPs', () => {
    expect(lookupOrg(table, '192.0.3.1')).toBeUndefined();
    expect(lookupOrg(table, '0.0.0.5')).toBeUndefined();
    expect(lookupOrg(table, 'not-an-ip')).toBeUndefined();
  });
  it('drops ranges the filter rejects', () => {
    const t = buildOrgTable(TSV, () => false);
    expect(t.starts).toEqual([]);
  });
});

describe('network detector with org table', () => {
  const table = buildOrgTable(TSV, keep);
  const w = (text: string): Word => ({ text, box: { x: 0, y: 0, w: 80, h: 16 }, conf: 90 });
  it('adds the organisation and raises confidence for a matched public IP', () => {
    const [f] = networkDetector([w('192.0.2.9')], { orgs: table });
    const [plain] = networkDetector([w('192.0.2.9')], {});
    expect(f).toMatchObject({ type: 'ip', org: 'Example University' });
    expect(f.confidence).toBeGreaterThan(plain.confidence);
    expect(plain.org).toBeUndefined();
  });
  it('leaves unmatched and private IPs unlabelled', () => {
    const [a] = networkDetector([w('198.18.0.7')], { orgs: table });
    const [b] = networkDetector([w('10.0.0.5')], { orgs: table });
    expect(a.org).toBeUndefined();
    expect(b.org).toBeUndefined();
  });
});

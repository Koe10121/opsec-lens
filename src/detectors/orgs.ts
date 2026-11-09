/** IPv4 -> organisation lookup over a compact sorted range table (built from iptoasn.com data, see DATA-SOURCES.md). */
export type OrgTable = { orgs: string[]; starts: number[]; ends: number[]; org: number[] };

export function ipToInt(ip: string): number | undefined {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return undefined;
  const o = m.slice(1).map(Number);
  if (o.some((n) => n > 255)) return undefined;
  return ((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3];
}

export function lookupOrg(t: OrgTable, ip: string): string | undefined {
  const n = ipToInt(ip);
  if (n === undefined) return undefined;
  let lo = 0;
  let hi = t.starts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (n < t.starts[mid]) hi = mid - 1;
    else if (n > t.ends[mid]) lo = mid + 1;
    else return t.orgs[t.org[mid]];
  }
  return undefined;
}

/** Parse ip2asn-v4 TSV (start, end, ASN, country, "HANDLE - Description"), keeping rows the filter accepts. */
export function buildOrgTable(tsv: string, keep: (asn: number, desc: string) => boolean): OrgTable {
  const t: OrgTable = { orgs: [], starts: [], ends: [], org: [] };
  const index = new Map<string, number>();
  for (const line of tsv.split('\n')) {
    const [s, e, asnText, , raw] = line.split('\t');
    const asn = Number(asnText);
    if (!raw || !asn) continue; // ASN 0 = not routed
    const start = ipToInt(s);
    const end = ipToInt(e);
    if (start === undefined || end === undefined || !keep(asn, raw)) continue;
    const name = raw.includes(' - ') ? raw.slice(raw.indexOf(' - ') + 3) : raw;
    let id = index.get(name);
    if (id === undefined) {
      id = t.orgs.push(name) - 1;
      index.set(name, id);
    }
    const last = t.starts.length - 1;
    if (last >= 0 && t.org[last] === id && t.ends[last] + 1 === start) t.ends[last] = end;
    else {
      t.starts.push(start);
      t.ends.push(end);
      t.org.push(id);
    }
  }
  return t;
}

// Fetches iptoasn.com ip2asn-v4 (PDDL) at build time and trims it to education, government and major cloud
// organisations. Output: public/data/ip-orgs.json (gitignored, lazy-loaded by the app).
// Fail-soft: if the download fails and no table exists, writes an empty one so the build still works.
import { gunzipSync, gzipSync } from 'node:zlib';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { buildOrgTable } from '../src/detectors/orgs';

const URL_V4 = 'https://iptoasn.com/data/ip2asn-v4.tsv.gz';
const OUT = 'public/data/ip-orgs.json';
const MAX_GZ_BYTES = 2 * 1024 * 1024;

const CLOUD_ASNS = new Set([16509, 14618, 15169, 396982, 8075, 13335, 14061, 63949, 16276, 24940]);
const SECTOR = /universit|college|institut(e|o) of|\bedu\b|academi|ministry|government|\bgov\b|department of|national research/i;
const keep = (asn: number, desc: string) => CLOUD_ASNS.has(asn) || SECTOR.test(desc);

mkdirSync('public/data', { recursive: true });
try {
  const res = await fetch(URL_V4);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const tsv = gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf8');
  const table = buildOrgTable(tsv, keep);
  const json = JSON.stringify(table);
  writeFileSync(OUT, json);
  const gz = gzipSync(json).length;
  console.log(`ip-orgs: ${table.orgs.length} orgs, ${table.starts.length} ranges, ${(gz / 1024).toFixed(0)} KB gzipped`);
  if (gz > MAX_GZ_BYTES) throw new Error('table exceeds 2 MB gzipped; tighten the filter');
} catch (e) {
  console.warn(`ip-orgs: could not build (${(e as Error).message}).`);
  if (!existsSync(OUT)) writeFileSync(OUT, JSON.stringify({ orgs: [], starts: [], ends: [], org: [] }));
  if ((e as Error).message.includes('2 MB')) process.exit(1);
}

import type { Box, Detector, Finding, Word } from './types';

const PHRASES = [
  'source ip', 'src ip', 'client ip', 'dest ip', 'destination ip', 'remote ip', 'ip address',
  'user name', 'host name', 'source host', 'client host',
];
const SINGLES = ['username', 'user', 'hostname', 'host', 'email', 'login', 'account', 'ip'];
const norm = (t: string) => t.toLowerCase().replace(/[:|]+$/, '');

const cy = (b: Box) => b.y + b.h / 2;
const union = (boxes: Box[]): Box => {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return {
    x,
    y,
    w: Math.max(...boxes.map((b) => b.x + b.w)) - x,
    h: Math.max(...boxes.map((b) => b.y + b.h)) - y,
  };
};

/** Group words into visual lines by vertical centre. */
function lines(words: Word[]): Word[][] {
  const sorted = [...words].sort((a, b) => cy(a.box) - cy(b.box));
  const out: Word[][] = [];
  for (const w of sorted) {
    const line = out.find((l) => Math.abs(cy(l[0].box) - cy(w.box)) <= w.box.h / 2);
    if (line) line.push(w);
    else out.push([w]);
  }
  return out.map((l) => l.sort((a, b) => a.box.x - b.box.x));
}

const MIN_ROW = 3; // a header row has at least 3 cells; prose containing "username" rarely does so spaced out
const MIN_VALUES = 2;

/**
 * Finds table header words ("Source IP", "Username") and boxes the whole column below as one finding,
 * including values that match no pattern. Words in prose do not trigger it: a header needs a
 * multi-cell row, and at least two aligned values below it.
 */
export const layoutDetector: Detector = (words) => {
  const rows = lines(words);
  const out: Finding[] = [];
  rows.forEach((row, ri) => {
    if (row.length < MIN_ROW) return;
    for (let i = 0; i < row.length; i++) {
      let span = 0;
      if (i + 1 < row.length && PHRASES.includes(`${norm(row[i].text)} ${norm(row[i + 1].text)}`)) span = 2;
      else if (SINGLES.includes(norm(row[i].text))) span = 1;
      if (!span) continue;
      const head = union(row.slice(i, i + span).map((w) => w.box));
      const tol = head.h * 0.75;
      const left = head.x - tol;
      const next = row[i + span];
      const right = next ? next.box.x - tol : Infinity;
      // The header row must be a real row of cells: the column must not sit in prose-like flow.
      const values: Box[] = [];
      let valueRows = 0;
      let last = head;
      for (const r of rows.slice(ri + 1)) {
        const cells = r.filter((w) => w.box.x >= left && w.box.x < right);
        const first = cells[0];
        if (!first || Math.abs(first.box.x - head.x) > tol * 2) break;
        if (first.box.y - (last.y + last.h) > head.h * 3) break;
        values.push(...cells.map((c) => c.box));
        valueRows++;
        last = union(cells.map((c) => c.box));
      }
      if (valueRows < MIN_VALUES) continue;
      out.push({ type: 'column', box: union([head, ...values]), confidence: 0.75, source: 'layout' });
      i += span - 1;
    }
  });
  return out;
};

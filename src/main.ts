import { recognise } from './ocr';
import { planScale } from './scale';
import { runDetectors, type Finding } from './detectors/types';
import { emailDetector, phoneDetector, tokenDetector } from './detectors/contact';
import { networkDetector } from './detectors/network';
import { layoutDetector } from './detectors/layout';
import { apply, STYLES, type Style } from './redact';
import { createReview, nudgeBox, boxFromPoints } from './review/review';
import type { Box } from './detectors/types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const drop = $('drop');
const file = $<HTMLInputElement>('file');
const status = $('status');
const view = $<HTMLCanvasElement>('view');
const download = $<HTMLButtonElement>('download');
const undoBtn = $<HTMLButtonElement>('undo');
const redoBtn = $<HTMLButtonElement>('redo');
const list = $('findings');
const addBtn = $<HTMLButtonElement>('add');
let draft: Box | null = null; // box being placed by keyboard
let drag: { x: number; y: number } | null = null; // mouse drag start, image coords
let dragNow: Box | null = null;
let focusIdx = -1;
const styleSel = $<HTMLSelectElement>('style');
for (const s of STYLES) styleSel.add(new Option(s, s));

let bitmap: ImageBitmap | null = null;
let review = createReview([]);

const label = (f: Finding) => `${f.type} (${Math.round(f.confidence * 100)}%)`;

function render() {
  if (!bitmap) return;
  const ctx = view.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 3;
  for (const { box } of review.accepted()) ctx.strokeRect(box.x, box.y, box.w, box.h);
  const pending = draft ?? dragNow;
  if (pending) {
    ctx.save();
    ctx.strokeStyle = 'blue';
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(pending.x, pending.y, pending.w, pending.h);
    ctx.restore();
  }
  list.replaceChildren(
    ...review.items().map((item, i) => {
      const li = document.createElement('li');
      const lab = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = item.accepted;
      cb.dataset.i = String(i);
      cb.setAttribute('aria-label', `${label(item.finding)}, ${item.finding.source === 'manual' ? 'drawn by hand' : 'detected'}, ${item.accepted ? 'will be redacted' : 'not redacted'}`);
      cb.addEventListener('change', () => { review.toggle(i); focusIdx = i; render(); });
      lab.append(cb, ` ${label(item.finding)}`);
      li.append(lab);
      return li;
    }),
  );
  if (focusIdx >= 0) list.querySelector<HTMLInputElement>(`input[data-i="${focusIdx}"]`)?.focus();
  const n = review.accepted().length;
  if (!draft) status.textContent = `${review.items().length} finding(s), ${n} will be redacted.`;
}

async function handle(f: File) {
  download.disabled = true;
  status.textContent = 'Reading text in your browser…';
  try {
    const bm = await createImageBitmap(f);
    const plan = planScale(bm.width, bm.height);
    if (!plan.ok) { bm.close(); status.textContent = plan.message; return; }
    bitmap = bm;
    view.width = bitmap.width;
    view.height = bitmap.height;
    view.getContext('2d')!.drawImage(bitmap, 0, 0);
    view.hidden = false;
    review = createReview(runDetectors(await recognise(f, { langs: ['eng'], onProgress: (p) => { status.textContent = `Reading text in your browser… ${Math.round(p * 100)}%`; } }), [emailDetector, phoneDetector, tokenDetector, networkDetector, layoutDetector]));
    render();
    download.disabled = false;
    undoBtn.disabled = false;
    redoBtn.disabled = false;
    addBtn.disabled = false;
  } catch (e) {
    status.textContent = `Could not process image: ${(e as Error).message}`;
  }
}

file.addEventListener('change', () => file.files?.[0] && handle(file.files[0]));
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('over');
  const f = e.dataTransfer?.files[0];
  if (f) handle(f);
});
download.addEventListener('click', async () => {
  if (!bitmap) return;
  const blob = await apply(bitmap, review.accepted(), styleSel.value as Style);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'redacted.png';
  a.click();
  URL.revokeObjectURL(a.href);
});
undoBtn.addEventListener('click', () => { review.undo(); render(); });
redoBtn.addEventListener('click', () => { review.redo(); render(); });

const bounds = () => ({ w: view.width, h: view.height });

function startDraft() {
  if (!bitmap) return;
  draft = { x: Math.round(view.width / 2 - 50), y: Math.round(view.height / 2 - 15), w: 100, h: 30 };
  focusIdx = -1;
  view.focus();
  render();
  status.textContent = 'Placing a box: arrows move, Shift+arrows resize, Enter adds, Escape cancels.';
}
function endDraft(commit: boolean) {
  const box = draft;
  draft = null;
  if (commit && box) focusIdx = review.add(box);
  render();
  if (!commit) { view.focus(); status.textContent = 'Cancelled.'; }
}
addBtn.addEventListener('click', startDraft);

view.addEventListener('keydown', (e) => {
  if (!draft) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startDraft(); } return; }
  if (e.key === 'Enter') { e.preventDefault(); endDraft(true); }
  else if (e.key === 'Escape') { e.preventDefault(); endDraft(false); }
  else if (e.key.startsWith('Arrow')) { e.preventDefault(); draft = nudgeBox(draft, e.key, e.shiftKey, bounds()); render(); }
});

const toImage = (e: MouseEvent) => {
  const r = view.getBoundingClientRect();
  return { x: ((e.clientX - r.left) * view.width) / r.width, y: ((e.clientY - r.top) * view.height) / r.height };
};
view.addEventListener('mousedown', (e) => { if (bitmap) { drag = toImage(e); dragNow = null; } });
view.addEventListener('mousemove', (e) => { if (drag) { dragNow = boxFromPoints(drag, toImage(e)); render(); } });
window.addEventListener('mouseup', () => {
  if (!drag) return;
  const box = dragNow;
  drag = null;
  dragNow = null;
  if (box && box.w >= 4 && box.h >= 4) { focusIdx = -1; review.add(box); }
  render();
});

// Findings list: arrows move between boxes (Space toggles the focused checkbox natively).
list.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const boxes = [...list.querySelectorAll<HTMLInputElement>('input')];
  const at = boxes.indexOf(document.activeElement as HTMLInputElement);
  const next = boxes[at + (e.key === 'ArrowDown' ? 1 : -1)];
  if (next) { e.preventDefault(); next.focus(); focusIdx = Number(next.dataset.i); }
});

window.addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement).tagName === 'SELECT') return;
  const k = e.key.toLowerCase();
  if (k === 'z' && !e.shiftKey) { e.preventDefault(); review.undo(); render(); }
  else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); review.redo(); render(); }
});

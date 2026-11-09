import { recognise } from './ocr';
import { planScale } from './scale';
import { runDetectors, type Finding } from './detectors/types';
import { emailDetector, phoneDetector, tokenDetector } from './detectors/contact';
import { networkDetector } from './detectors/network';
import type { OrgTable } from './detectors/orgs';
import { layoutDetector } from './detectors/layout';
import { thaiDetectors, hasThai } from './detectors/thai';
import { detectVisual, type FaceRunner } from './detectors/visual';
import { apply, STYLES, type Style } from './redact';
import { createReview, nudgeBox, boxFromPoints } from './review/review';
import type { Box } from './detectors/types';
import { describe, CATEGORY_COLOR, CATEGORY_NAME, type Category } from './ui/labels';

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
const workspace = $('workspace');
const summary = $('summary');
let hoverIdx = -1;
const legend = $('legend');
legend.replaceChildren(...(Object.keys(CATEGORY_NAME) as Category[]).filter((c) => c !== 'manual').map((c) => { const li = document.createElement('li'); li.style.setProperty('--c', CATEGORY_COLOR[c]); li.innerHTML = `<i></i>${CATEGORY_NAME[c]}`; return li; }));
let draft: Box | null = null; // box being placed by keyboard
let drag: { x: number; y: number } | null = null; // mouse drag start, image coords
let dragNow: Box | null = null;
let focusIdx = -1;
const styleSel = $<HTMLSelectElement>('style');
for (const s of STYLES) styleSel.add(new Option(s, s));

let faceRunner: Promise<FaceRunner | undefined> | null = null;
const faces = () => (faceRunner ??= import('./detectors/face-model').then((m) => m.loadFaceRunner()).catch(() => undefined)); // lazy; face check is skipped if the model cannot load

let orgTable: Promise<OrgTable | undefined> | null = null;
const orgs = () => (orgTable ??= fetch('/data/ip-orgs.json').then((r) => (r.ok ? (r.json() as Promise<OrgTable>) : undefined)).catch(() => undefined)); // lazy, same-origin; labels are skipped if unavailable

let bitmap: ImageBitmap | null = null;
let review = createReview([]);

const label = (f: Finding) => `${f.type} (${Math.round(f.confidence * 100)}%${f.type === 'thai-name' ? ', best effort' : ''})${f.org ? `, belongs to ${f.org}` : ''}`;

function drawCanvas() {
  if (!bitmap) return;
  const ctx = view.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  const items = review.items();
  const unit = Math.max(1, view.width / 900); // keep strokes and tags readable on big screenshots
  items.forEach((item, i) => {
    const { box } = item.finding;
    const d = describe(item.finding);
    ctx.save();
    if (item.accepted) {
      ctx.fillStyle = d.color + (i === hoverIdx ? '66' : '33');
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.strokeStyle = d.color;
      ctx.lineWidth = (i === hoverIdx ? 4 : 2.5) * unit;
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      const size = Math.round(13 * unit);
      ctx.font = `700 ${size}px system-ui, sans-serif`;
      const t = String(i + 1);
      const tw = ctx.measureText(t).width + 8 * unit;
      const th = size + 4 * unit;
      const ty = box.y - th >= 0 ? box.y - th : box.y;
      ctx.fillStyle = d.color;
      ctx.fillRect(box.x, ty, tw, th);
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.fillText(t, box.x + 4 * unit, ty + th / 2);
    } else {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5 * unit;
      ctx.setLineDash([6 * unit, 4 * unit]);
      ctx.strokeRect(box.x, box.y, box.w, box.h);
    }
    ctx.restore();
  });
  const pending = draft ?? dragNow;
  if (pending) {
    ctx.save();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2.5 * unit;
    ctx.setLineDash([8 * unit, 6 * unit]);
    ctx.strokeRect(pending.x, pending.y, pending.w, pending.h);
    ctx.restore();
  }
}

function render() {
  if (!bitmap) return;
  drawCanvas();
  const items = review.items();
  list.replaceChildren(
    ...items.map((item, i) => {
      const d = describe(item.finding);
      const li = document.createElement('li');
      li.style.setProperty('--c', d.color);
      li.classList.toggle('off', !item.accepted);
      li.classList.toggle('hover', i === hoverIdx);
      // Hover only repaints the canvas: rebuilding the list would destroy the card under the pointer.
      li.addEventListener('mouseenter', () => { hoverIdx = i; li.classList.add('hover'); drawCanvas(); });
      li.addEventListener('mouseleave', () => { hoverIdx = -1; li.classList.remove('hover'); drawCanvas(); });
      const lab = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = item.accepted;
      cb.dataset.i = String(i);
      cb.setAttribute('aria-label', `${label(item.finding)}, ${item.finding.source === 'manual' ? 'drawn by hand' : 'detected'}, ${item.accepted ? 'will be redacted' : 'not redacted'}`);
      cb.addEventListener('change', () => { review.toggle(i); focusIdx = i; render(); });
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = String(i + 1);
      const meta = document.createElement('span');
      meta.className = 'meta';
      const name = document.createElement('span');
      name.className = 'name';
      const f = item.finding;
      name.textContent = d.name;
      const conf = document.createElement('span');
      conf.className = 'conf';
      conf.textContent = f.source === 'manual' ? 'by hand' : `${Math.round(f.confidence * 100)}% sure${f.type === 'thai-name' ? ', best effort' : ''}`;
      name.append(conf);
      const why = document.createElement('span');
      why.className = 'why';
      why.textContent = f.org ? `Belongs to ${f.org}. ${d.why}` : d.why;
      meta.append(name, why);
      lab.append(cb, num, meta);
      li.append(lab);
      return li;
    }),
  );
  if (!items.length) list.innerHTML = '<li class="empty">Nothing found.</li>';
  if (focusIdx >= 0) list.querySelector<HTMLInputElement>(`input[data-i="${focusIdx}"]`)?.focus();
  const n = review.accepted().length;
  summary.textContent = items.length ? `${items.length} found, ${n} will be covered. Untick any you want to keep.` : '';
  if (!draft)
    status.textContent = items.length
      ? `${items.length} finding(s), ${n} will be redacted.`
      : 'No sensitive items found. Detection is not a guarantee, so check the image yourself or add a box by hand.';
}

async function handle(f: File) {
  download.disabled = true;
  status.classList.add('busy');
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
    workspace.hidden = false;
    list.replaceChildren();
    summary.textContent = '';
    const onProgress = (p: number) => { status.textContent = `Reading text in your browser… ${Math.round(p * 100)}%`; };
    const thaiBox = $<HTMLInputElement>('thai');
    let words = await recognise(f, { langs: thaiBox.checked ? ['eng', 'tha'] : ['eng'], onProgress });
    if (!thaiBox.checked && hasThai(words)) words = await recognise(f, { langs: ['eng', 'tha'], onProgress }); // Thai data loads only when needed
    const hasIp = words.some((w) => /\d{1,3}(\.\d{1,3}){3}/.test(w.text));
    const found = runDetectors(words, [emailDetector, phoneDetector, tokenDetector, networkDetector, layoutDetector, ...thaiDetectors], { orgs: hasIp ? await orgs() : undefined });
    status.textContent = 'Looking for faces and QR codes…';
    const px = view.getContext('2d')!.getImageData(0, 0, view.width, view.height);
    found.push(...(await detectVisual(px, await faces())));
    review = createReview(found);
    render();
    download.disabled = false;
    undoBtn.disabled = false;
    redoBtn.disabled = false;
    addBtn.disabled = false;
  } catch (e) {
    status.textContent = `Could not read this image or run text detection. Try a different PNG screenshot. (${(e as Error).message})`;
  } finally {
    status.classList.remove('busy');
  }
}

$('try').addEventListener('click', async () => {
  const r = await fetch('/sample-email.png'); // synthetic sample shipped with the app
  handle(new File([await r.blob()], 'sample-email.png', { type: 'image/png' }));
});
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

drop.addEventListener('keydown', (e) => { if (e.target === drop && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); file.click(); } });

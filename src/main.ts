import { recognise } from './ocr';
import { runDetectors, type Finding } from './detectors/types';
import { emailDetector } from './detectors/contact';
import { ipv4Detector } from './detectors/network';
import { apply } from './redact';
import { createReview } from './review/review';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const drop = $('drop');
const file = $<HTMLInputElement>('file');
const status = $('status');
const view = $<HTMLCanvasElement>('view');
const download = $<HTMLButtonElement>('download');
const undoBtn = $<HTMLButtonElement>('undo');
const redoBtn = $<HTMLButtonElement>('redo');
const list = $('findings');

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
  list.replaceChildren(
    ...review.items().map((item, i) => {
      const li = document.createElement('li');
      const lab = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = item.accepted;
      cb.addEventListener('change', () => { review.toggle(i); render(); });
      lab.append(cb, ` ${label(item.finding)}`);
      li.append(lab);
      return li;
    }),
  );
  const n = review.accepted().length;
  status.textContent = `${review.items().length} finding(s), ${n} will be redacted.`;
}

async function handle(f: File) {
  download.disabled = true;
  status.textContent = 'Reading text in your browser…';
  try {
    bitmap = await createImageBitmap(f);
    view.width = bitmap.width;
    view.height = bitmap.height;
    view.getContext('2d')!.drawImage(bitmap, 0, 0);
    view.hidden = false;
    review = createReview(runDetectors(await recognise(f), [emailDetector, ipv4Detector]));
    render();
    download.disabled = false;
    undoBtn.disabled = false;
    redoBtn.disabled = false;
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
  const blob = await apply(bitmap, review.accepted(), 'solid');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'redacted.png';
  a.click();
  URL.revokeObjectURL(a.href);
});
undoBtn.addEventListener('click', () => { review.undo(); render(); });
redoBtn.addEventListener('click', () => { review.redo(); render(); });

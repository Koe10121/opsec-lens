import { recognise } from './ocr';
import { runDetectors, type Finding } from './detectors/types';
import { emailDetector } from './detectors/contact';
import { ipv4Detector } from './detectors/network';
import { apply } from './redact';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const drop = $('drop');
const file = $<HTMLInputElement>('file');
const status = $('status');
const view = $<HTMLCanvasElement>('view');
const download = $<HTMLButtonElement>('download');

let bitmap: ImageBitmap | null = null;
let findings: Finding[] = [];

async function handle(f: File) {
  download.disabled = true;
  status.textContent = 'Reading text in your browser…';
  try {
    bitmap = await createImageBitmap(f);
    view.width = bitmap.width;
    view.height = bitmap.height;
    const ctx = view.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    view.hidden = false;
    findings = runDetectors(await recognise(f), [emailDetector, ipv4Detector]);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    for (const { box } of findings) ctx.strokeRect(box.x, box.y, box.w, box.h);
    status.textContent = `${findings.length} finding(s).`;
    download.disabled = false;
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
  const blob = await apply(bitmap, findings, 'solid');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'redacted.png';
  a.click();
  URL.revokeObjectURL(a.href);
});

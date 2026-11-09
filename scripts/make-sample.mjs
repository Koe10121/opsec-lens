// Generates a synthetic sample screenshot (example.com only). Run: npm run make-sample
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'node:fs';

const c = createCanvas(640, 190);
const g = c.getContext('2d');
g.fillStyle = '#fff';
g.fillRect(0, 0, 640, 190);
g.fillStyle = '#000';
g.font = '28px sans-serif';
g.fillText('Support ticket #1042', 30, 50);
g.fillText('Contact: user@example.com', 30, 100);
g.fillText('Server: 203.0.113.7  (v1.2.3.4)', 30, 140);
mkdirSync('public', { recursive: true });
writeFileSync('public/sample-email.png', c.toBuffer('image/png'));
console.log('wrote public/sample-email.png');

// Second sample: phone, API key, bearer token (all clearly synthetic)
const c2 = createCanvas(900, 230);
const g2 = c2.getContext('2d');
g2.fillStyle = '#fff';
g2.fillRect(0, 0, 900, 230);
g2.fillStyle = '#000';
g2.font = '26px monospace';
g2.fillText('Phone: +1-202-555-0143', 30, 50);
g2.fillText('API key: sk-synthetic-AAAABBBBCCCCDDDD1111', 30, 100);
g2.fillText('Authorization: Bearer SYNTHETICtoken0123456789abcdef', 30, 150);
g2.fillText('commit 3f786850e387550f  2024-05-17', 30, 200);
writeFileSync('public/sample-contact.png', c2.toBuffer('image/png'));
console.log('wrote public/sample-contact.png');

// Third sample: Thai form. All values synthetic (valid-checksum fake ID, fake name, fictional numbers).
// Needs a Thai-capable font; uses Tahoma if present (Windows), else the default font.
for (const f of ['C:/Windows/Fonts/tahoma.ttf', '/usr/share/fonts/truetype/tlwg/Garuda.ttf']) {
  try { GlobalFonts.registerFromPath(f, 'ThaiSample'); break; } catch {}
}
const thaiId = (d12) => d12 + ((11 - ([...d12].reduce((a, c, i) => a + Number(c) * (13 - i), 0) % 11)) % 10);
const c3 = createCanvas(760, 260);
const g3 = c3.getContext('2d');
g3.fillStyle = '#fff';
g3.fillRect(0, 0, 760, 260);
g3.fillStyle = '#000';
g3.font = '28px ThaiSample, sans-serif';
const rows = [['ชื่อ', 'นาย สมชาย ใจดี'], ['เลขบัตร', thaiId('110000000001')], ['โทรศัพท์', '081-234-5678'], ['รหัสนักศึกษา', '6401234567']];
rows.forEach(([k, v], i) => { g3.fillText(k, 30, 50 + i * 55); g3.fillText(v, 280, 50 + i * 55); });
writeFileSync('public/sample-thai.png', c3.toBuffer('image/png'));
console.log('wrote public/sample-thai.png');

// Clean sample: nothing sensitive, used to test the "no findings" message
const cClean = createCanvas(640, 120);
const gClean = cClean.getContext('2d');
gClean.fillStyle = '#fff';
gClean.fillRect(0, 0, 640, 120);
gClean.fillStyle = '#000';
gClean.font = '28px sans-serif';
gClean.fillText('Build finished successfully', 30, 70);
writeFileSync('public/sample-clean.png', cClean.toBuffer('image/png'));
console.log('wrote public/sample-clean.png');

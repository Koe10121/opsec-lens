// Generates a synthetic sample screenshot (example.com only). Run: npm run make-sample
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'node:fs';

const c = createCanvas(640, 160);
const g = c.getContext('2d');
g.fillStyle = '#fff';
g.fillRect(0, 0, 640, 160);
g.fillStyle = '#000';
g.font = '28px sans-serif';
g.fillText('Support ticket #1042', 30, 50);
g.fillText('Contact: user@example.com', 30, 100);
mkdirSync('public', { recursive: true });
writeFileSync('public/sample-email.png', c.toBuffer('image/png'));
console.log('wrote public/sample-email.png');

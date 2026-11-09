// Generates a synthetic sample screenshot (example.com only). Run: npm run make-sample
import { createCanvas } from '@napi-rs/canvas';
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

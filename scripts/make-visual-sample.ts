// Generates public/sample-visual.png: a cartoon face and a QR code for example.com. Fully synthetic.
import { writeFileSync } from 'node:fs';
import { blank, drawFace, drawQr } from '../tests/visual-fixtures';

const { c, g } = blank(640, 480);
drawFace(g, 200, 240, 130);
await drawQr(g, 400, 150, 200);
writeFileSync('public/sample-visual.png', c.toBuffer('image/png'));

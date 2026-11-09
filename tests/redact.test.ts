import { describe, it, expect } from 'vitest';
import { applySolid } from '../src/redact';

function white(width: number, height: number) {
  return { width, height, data: new Uint8ClampedArray(width * height * 4).fill(255) };
}
const px = (img: { width: number; data: Uint8ClampedArray }, x: number, y: number) =>
  Array.from(img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 4));

describe('applySolid', () => {
  it('covers pixels under the box and leaves the rest unchanged', () => {
    const img = white(20, 20);
    const before = white(20, 20);
    applySolid(img, [{ type: 'email', box: { x: 5, y: 5, w: 6, h: 4 }, confidence: 1, source: 'rules' }]);
    expect(px(img, 5, 5)).toEqual([0, 0, 0, 255]);
    expect(px(img, 10, 8)).toEqual([0, 0, 0, 255]);
    expect(px(img, 4, 5)).toEqual(px(before, 4, 5));
    expect(px(img, 11, 5)).toEqual(px(before, 11, 5));
    expect(px(img, 5, 9)).toEqual(px(before, 5, 9));
  });
  it('clips boxes that extend past the image', () => {
    const img = white(10, 10);
    applySolid(img, [{ type: 'email', box: { x: 8, y: 8, w: 50, h: 50 }, confidence: 1, source: 'rules' }]);
    expect(px(img, 9, 9)).toEqual([0, 0, 0, 255]);
  });
});

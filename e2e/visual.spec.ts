import { test, expect } from '@playwright/test';

test('faces and QR codes get boxes, using only same-origin model files', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => { const u = new URL(r.url()); if (!u.protocol.startsWith('data') && u.origin !== 'http://localhost:5183') external.push(r.url()); });
  await page.goto('/');
  await page.setInputFiles('#file', 'public/sample-visual.png');
  await expect(page.locator('#findings input[aria-label^="face"]')).toHaveCount(1, { timeout: 60_000 });
  await expect(page.locator('#findings input[aria-label^="qr"]')).toHaveCount(1);
  // Tesseract assets still come from a CDN until issue 007 self-hosts them; the face model and ORT must not.
  expect(external.filter((u) => /onnx|ort|models|face/i.test(u))).toEqual([]);
});

import { test, expect } from '@playwright/test';

test('processing an image makes no third-party requests and sends no image data', async ({ page }) => {
  const external: string[] = [];
  const posts: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol.startsWith('http')) external.push(r.url());
    if (r.method() !== 'GET') posts.push(`${r.method()} ${r.url()}`);
  });
  await page.goto('/');
  await page.setInputFiles('#file', 'public/sample-email.png');
  await expect(page.locator('#findings input').first()).toBeVisible({ timeout: 60_000 });
  expect(external).toEqual([]);
  expect(posts).toEqual([]);
});

test('Try it loads the synthetic sample and shows boxes', async ({ page }) => {
  await page.goto('/');
  await page.click('#try');
  await expect(page.locator('#findings input').first()).toBeVisible({ timeout: 60_000 });
});

test('both notices are visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('never leave your browser')).toBeVisible();
  await expect(page.getByText('not a guarantee')).toBeVisible();
});

test('says so when nothing is found', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('#file', 'public/sample-clean.png');
  await expect(page.locator('#status')).toContainText(/no sensitive items found/i, { timeout: 60_000 });
});

test('shows a clear message when the file is not a readable image', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('#file', { name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.locator('#status')).toContainText(/could not (read|process)/i);
});

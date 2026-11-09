import { test, expect } from '@playwright/test';

test('English-only users never fetch Thai data; opting in finds Thai items', async ({ page }) => {
  const thaiRequests: string[] = [];
  page.on('request', (r) => { if (r.url().includes('tha.traineddata')) thaiRequests.push(r.url()); });

  await page.goto('/');
  await page.setInputFiles('#file', 'public/sample-email.png');
  await expect(page.locator('#findings input').first()).toBeVisible({ timeout: 60_000 });
  expect(thaiRequests).toEqual([]);

  await page.reload();
  await page.check('#thai');
  await page.setInputFiles('#file', 'public/sample-thai.png');
  await expect(page.locator('#findings input[aria-label^="thai-name"]')).toHaveCount(1, { timeout: 90_000 });
  for (const t of ['thai-id', 'thai-phone', 'thai-student-id'])
    await expect(page.locator(`#findings input[aria-label^="${t}"]`)).toHaveCount(1);
  await expect(page.locator('#findings input[aria-label^="thai-name"]')).toHaveAttribute('aria-label', /best effort/);
  expect(thaiRequests.length).toBeGreaterThan(0);
});

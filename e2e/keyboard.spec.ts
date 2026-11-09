import { test, expect } from '@playwright/test';

test('upload → review → manual box → download using the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.setInputFiles('#file', 'public/sample-email.png');
  await expect(page.locator('#findings input').first()).toBeVisible({ timeout: 60_000 });
  const before = await page.locator('#findings input').count();

  // Keyboard: focus the list, move down/up, toggle with Space.
  await page.locator('#findings input').first().focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  const first = page.locator('#findings input').first();
  const was = await first.isChecked();
  await page.keyboard.press('Space');
  await expect(first).toBeChecked({ checked: !was });
  await page.keyboard.press('Control+z');
  await expect(first).toBeChecked({ checked: was });

  // Keyboard: place a manual box on the canvas.
  await page.locator('#view').focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.locator('#findings input')).toHaveCount(before + 1);
  const added = page.locator('#findings input').last();
  await expect(added).toBeChecked();
  await expect(added).toBeFocused();
  await expect(added).toHaveAttribute('aria-label', /manual.*drawn by hand.*will be redacted/);

  // Undo removes it, redo restores it.
  await page.keyboard.press('Control+z');
  await expect(page.locator('#findings input')).toHaveCount(before);
  await page.keyboard.press('Control+y');
  await expect(page.locator('#findings input')).toHaveCount(before + 1);

  // Download via keyboard.
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#download').focus();
  await page.keyboard.press('Enter');
  const dl = await downloadPromise;
  expect(dl.suggestedFilename()).toBe('redacted.png');
});

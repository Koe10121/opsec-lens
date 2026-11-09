import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  use: { baseURL: 'http://localhost:5183', channel: 'chrome' },
  webServer: { command: 'npm run dev -- --port 5183 --strictPort', url: 'http://localhost:5183', reuseExistingServer: false },
});

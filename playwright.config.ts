import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4010',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm start -p 4010',
    port: 4010,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'iPhone 14 Pro', use: { ...devices['iPhone 14 Pro'] } },
    { name: 'Pixel 7', use: { ...devices['Pixel 7'] } },
  ],
});


const path = require('path');
const fs = require('fs');
const { defineConfig, devices } = require('@playwright/test');
const { seedStore } = require('./helpers/seed-store');

const e2eStore = path.join(__dirname, 'fixtures', 'e2e-store.json');
fs.mkdirSync(path.dirname(e2eStore), { recursive: true });
fs.writeFileSync(e2eStore, JSON.stringify(seedStore(), null, 2));

const frontendEnv = {
  VITE_API_PROXY: 'http://127.0.0.1:3101',
  VITE_TRIMBLE_CLIENT_ID: process.env.VITE_TRIMBLE_CLIENT_ID || 'local-dev-placeholder',
  VITE_APP_BASE_URL: 'http://127.0.0.1:5174/',
  VITE_TRIMBLE_CONFIG_ENDPOINT: 'https://id.trimble.com/.well-known/openid-configuration',
};

module.exports = defineConfig({
  testDir: path.join(__dirname, 'frontend'),
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node server.js',
      cwd: path.join(__dirname, '..', 'backend'),
      url: 'http://127.0.0.1:3101/api/slots',
      reuseExistingServer: false,
      env: {
        PORT: '3101',
        WORKRIDE_STORE_FILE: e2eStore,
      },
    },
    {
      command: 'npx vite --host 127.0.0.1 --port 5174',
      cwd: path.join(__dirname, '..', 'frontend'),
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
      env: frontendEnv,
    },
  ],
});

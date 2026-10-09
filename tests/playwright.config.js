// Opens index.html over file:// — nothing to build or serve.
const { defineConfig } = require('@playwright/test');
const path = require('path');
module.exports = defineConfig({
  testDir: './specs',
  timeout: 60000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'file://' + path.resolve(__dirname, '..', 'index.html'),
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {},
  },
});

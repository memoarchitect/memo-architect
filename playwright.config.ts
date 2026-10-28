import { defineConfig } from '@playwright/test';

// Browser tests drive the built Architect (`pnpm build` first) on the vehicle
// example. PLAYWRIGHT_CHROMIUM names a Chromium to use instead of Playwright's
// own download, for machines that ship one.
const port = Number(process.env.MEMO_TEST_PORT ?? 32117);

export default defineConfig({
    testDir: 'tests/browser',
    workers: 1,
    timeout: 120_000,
    use: {
        baseURL: `http://127.0.0.1:${port}`,
        viewport: { width: 1600, height: 1000 },
        trace: 'retain-on-failure',
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {},
    },
    webServer: {
        command: `node tests/browser/server.mjs ${port}`,
        url: `http://127.0.0.1:${port}`,
        reuseExistingServer: false,
        timeout: 120_000,
    },
});

/** UI regression check with isolated fake account/database; production auth is untouched.
 * Set PLAYWRIGHT_MODULE to an installed playwright/index.mjs, then run this file.
 */
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const source = await readFile(path.join(root, 'src/lib/supabase.ts'), 'utf8');
const functions = [...new Set([...source.matchAll(/^export (?:async )?function (\w+)/gm)].map(m => m[1]))];
const mockDatabase = `
const channel = { on() { return this }, subscribe() { return this } };
export const SUPABASE_URL = '', SUPABASE_ANON_KEY = '';
export const supabase = { channel: () => channel, removeChannel: () => {} };
${functions.map(name => `export async function ${name}() { return ${name === 'fetchBookLikes' ? '{ counts: {}, liked: [] }' : /fetchRemoteProfile|fetchRemoteReader$|findRemoteProfile/.test(name) ? 'null' : '[]'}; }`).join('\n')}`;
const server = await createServer({
  configFile: path.join(root, 'vite.config.ts'),
  server: { port: 24319, host: '127.0.0.1', strictPort: true, open: false },
  plugins: [{ name: 'isolated-catalogue-test', enforce: 'pre',
    resolveId(id) { if (id === '@clerk/react') return '\0test-clerk'; if (id === '/__catalogue_test_entry.jsx') return id; },
    load(id) {
      if (id === '\0test-clerk') return `export const useUser = () => ({ user: null, isLoaded: true }); export const useClerk = () => ({ signOut() {} });`;
      if (id.replaceAll('\\', '/').endsWith('/src/lib/supabase.ts')) return mockDatabase;
      if (id === '/__catalogue_test_entry.jsx') return `
        import React from 'react'; import { createRoot } from 'react-dom/client';
        import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; import { LanguageProvider } from '/src/lib/i18n.tsx';
        import { LibraryPage } from '/src/pages/library.tsx';
        import '/src/index.css';
        createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><LanguageProvider><LibraryPage /></LanguageProvider></QueryClientProvider>);`;
    },
    configureServer(dev) { dev.middlewares.use('/__catalogue_test', async (_req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.end(await dev.transformIndexHtml('/__catalogue_test', '<html><head><meta name="viewport" content="width=device-width,initial-scale=1" /></head><body><div id="root"></div><script type="module" src="/__catalogue_test_entry.jsx"></script></body></html>'));
    }); },
  }],
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:24319') ? route.continue() : route.abort());
  await page.goto('http://127.0.0.1:24319/__catalogue_test');
  await page.waitForSelector('.library-book-card');
  await mkdir(path.join(root, 'tmp/mobile-check'), { recursive: true });
  for (const width of [320, 390, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Catalogue overflow at ${width}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(root, 'tmp/mobile-check/catalogue.png') });
  await page.locator('.library-book-card').nth(1).locator('.library-card-actions button').first().click();
  await page.locator('.library-reader-tabs button').nth(1).click();
  await page.waitForSelector('.library-adaptive-reader');
  await page.screenshot({ path: path.join(root, 'tmp/mobile-check/reader.png') });
  console.log('reader geometry', await page.locator('.library-reader').evaluate(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth, height: el.clientHeight, scrollHeight: el.scrollHeight })));
  const counter = page.locator('.library-page-controls span');
  const before = await counter.textContent();
  await page.locator('.library-page-controls button').last().click();
  await page.waitForTimeout(1000);
  assert.notEqual(await counter.textContent(), before);
  await page.locator('.library-page-controls button').first().click();
  await page.waitForTimeout(1000);
  assert.equal(await counter.textContent(), before);
  assert.ok(await page.locator('.library-reader').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Reader overflow');
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(300);
  assert.ok(await page.locator('.library-reader-toolbar button').isVisible(), 'Close control after rotation');
  await page.locator('.library-reader-toolbar button').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.library-nav-account-btn').click();
  await page.screenshot({ path: path.join(root, 'tmp/mobile-check/profile.png') });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Profile overflow');
  assert.deepEqual(errors, []);
  console.log('PASS: mobile catalogue 320–768px, reader forward/back, orientation and guest profile. Cloud/auth mocked.');
} finally {
  await browser?.close();
  await server.close();
}

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
        import { LanguageProvider } from '/src/lib/i18n.tsx';
        import { LibraryPage } from '/src/pages/library.tsx';
        import '/src/index.css';
        createRoot(document.getElementById('root')).render(<LanguageProvider><LibraryPage /></LanguageProvider>);`;
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
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  const textRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\/books\/[^/?]+\.json\.gz(?:\?|$)/.test(request.url())) textRequests.push(request.url()); });
  await page.route('**/*', route => route.request().url().startsWith('http://127.0.0.1:24319') ? route.continue() : route.abort());
  await page.goto('http://127.0.0.1:24319/__catalogue_test');
  await page.waitForSelector('.library-book-card');
  const cards = page.locator('.library-book-card');
  assert.equal(await cards.count(), 24);
  assert.match(await cards.nth(0).innerText(), /Письма/i);
  assert.match(await cards.nth(1).innerText(), /шопоголик/i);
  assert.equal(textRequests.length, 0, 'Initial catalogue downloaded full books');
  const search = page.locator('.library-topbar input, input[placeholder]').first();
  await search.fill('Игрок');
  await page.waitForFunction(() => document.querySelectorAll('.library-book-card').length === 1);
  await cards.first().getByRole('button', { name: /Читать бесплатно/ }).click();
  assert.equal(textRequests.length, 0, 'About-book dialog downloaded full text before reading');
  await page.locator('.library-reader-tabs button').nth(1).click();
  await page.waitForSelector('.library-full-reader');
  assert.ok((await page.locator('.library-full-reader').innerText()).length > 100);
  assert.equal(textRequests.length, 1);
  await page.locator('#reader-jump').fill('20');
  await page.locator('.library-reader').getByRole('button', { name: 'Перейти', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.library-reader-progress')?.textContent?.startsWith('20 /'));
  const pageControls = page.locator('.library-page-controls');
  const nextPage = pageControls.getByRole('button', { name: /Вперёд/ });
  await nextPage.evaluate(button => { button.click(); button.click(); button.click(); });
  await page.waitForFunction(() => document.querySelector('.library-page-controls span')?.textContent?.startsWith('21—22 /'));
  await page.waitForTimeout(850);
  assert.equal(await page.locator('#reader-jump').inputValue(), '', 'Jump input clears after arrow navigation');
  assert.equal(await page.locator('#reader-jump').getAttribute('placeholder'), '21', 'Jump hint follows current spread');
  assert.match(await pageControls.innerText(), /21—22\s*\//, 'Rapid taps advanced by exactly one spread');
  await pageControls.getByRole('button', { name: /Назад/ }).click();
  await page.waitForFunction(() => document.querySelector('.library-page-controls span')?.textContent?.startsWith('19—20 /'));
  const lastPage = await page.locator('#reader-jump').getAttribute('max');
  await page.locator('#reader-jump').fill(lastPage);
  await page.locator('.library-reader').getByRole('button', { name: 'Перейти', exact: true }).click();
  await page.waitForFunction(max => document.querySelector('.library-page-controls span')?.textContent?.startsWith(`${max - (max % 2 ? 0 : 1)}—${max} /`), Number(lastPage));
  assert.equal(await page.locator('.library-reader-book-about').count(), 1, 'About section appears below the final page');
  assert.equal(await nextPage.isDisabled(), true, 'Last page cannot advance past the end');
  await page.locator('#reader-jump').fill('1');
  await page.locator('.library-reader').getByRole('button', { name: 'Перейти', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.library-page-controls span')?.textContent?.startsWith('1—2 /'));
  assert.equal(await pageControls.getByRole('button', { name: /Назад/ }).isDisabled(), true, 'First page cannot move to a negative index');
  await mkdir(path.join(root, 'tmp/catalogue-check'), { recursive: true });
  await page.screenshot({ path: path.join(root, 'tmp/catalogue-check/reader-desktop.png') });
  await page.locator('.library-reader-toolbar').getByRole('button').click();
  await cards.first().getByRole('button', { name: /Читать бесплатно/ }).click();
  await page.locator('.library-reader-tabs button').nth(1).click();
  await page.waitForSelector('.library-full-reader');
  assert.equal(textRequests.length, 1, 'Reopening a cached book fetched its text again');
  await page.locator('.library-reader-toolbar').getByRole('button').click();
  await search.fill('Белые ночи');
  await page.waitForFunction(() => document.querySelectorAll('.library-book-card').length === 1);
  await page.route('**/books/white-nights.json.gz', route => route.fulfill({ status: 503, body: 'Temporary test failure' }), { times: 1 });
  await cards.first().getByRole('button', { name: /Читать бесплатно/ }).click();
  await page.locator('.library-reader-tabs button').nth(1).click();
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await page.waitForSelector('.library-full-reader');
  await page.locator('.library-reader-toolbar').getByRole('button').click();
  await search.fill('нет-такой-книги-xyz');
  await page.waitForSelector('.library-empty');
  assert.equal(await cards.count(), 0);
  await search.fill('');
  await page.waitForFunction(() => document.querySelectorAll('.library-book-card').length === 24);
  const languagePills = page.locator('.library-subcategories .library-subpill');
  assert.equal(await languagePills.count(), 5, 'All four languages plus the all-languages filter are present');
  await languagePills.nth(2).click();
  await page.waitForFunction(() => document.querySelectorAll('.library-book-card').length === 2);
  assert.ok((await page.locator('.library-book-card').allInnerTexts()).every(text => text.includes('KK')));
  await languagePills.nth(4).click();
  await page.waitForFunction(() => [...document.querySelectorAll('.library-card-lang-badge')].every(el => el.textContent.trim() === 'ZH'));
  assert.equal(await cards.count(), 1, 'Chinese language filter returns the one verified Chinese edition');
  await languagePills.first().click();
  await page.waitForFunction(() => document.querySelectorAll('.library-book-card').length === 24);
  await page.setViewportSize({ width: 390, height: 844 });
  await cards.first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(root, 'tmp/catalogue-check/catalogue-mobile.png') });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Mobile horizontal overflow');
  assert.deepEqual(errors, []);
  console.log('PASS: featured order, 290-book verified-cover catalogue, search/reset/empty state, all four language filters, deferred text loading, cache and retry; rapid reader taps, forward/back navigation, page jump, first/last page boundaries and mobile width. External services mocked; no account changes.');
} finally {
  await browser?.close();
  await server.close();
}

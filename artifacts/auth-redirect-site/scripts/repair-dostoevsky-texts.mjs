import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { parse } from 'parse5';
import { extractWikisourceText } from './wikisource-text.mjs';

const root = new URL('../', import.meta.url);
const books = JSON.parse(await readFile(new URL('src/data/russian-classics.json', root), 'utf8'));
const provenancePath = new URL('public/books/wikisource-provenance.json', root);
const provenance = JSON.parse(await readFile(provenancePath, 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
const splitPages = (text, title) => {
  const pages = [];
  let rest = text;
  while (rest.length) {
    let end = Math.min(rest.length, 800);
    if (end < rest.length) {
      const boundary = rest.lastIndexOf('\n\n', end);
      if (boundary > 400) end = boundary;
      else { const space = rest.lastIndexOf(' ', end); if (space > 400) end = space; }
    }
    const page = rest.slice(0, end).trim();
    if (page) pages.push({ kicker: title, title: pages.length ? '' : 'Полный текст', text: page });
    rest = rest.slice(end).trimStart();
  }
  return pages;
};
async function render(page) {
  const url = new URL(`https://ru.wikisource.org/wiki/${encodeURIComponent(page).replaceAll('%2F', '/')}`);
  url.searchParams.set('action', 'render');
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'RussianReadingLibrary/1.0 (text-source correction)' } });
  if (!response.ok) throw new Error(`Wikisource HTTP ${response.status} for ${page}`);
  const html = await response.text();
  const text = extractWikisourceText(html);
  if (text.length < 4000) throw new Error(`Too little text (${text.length}) at ${page}`);
  return { html, text, url: response.url };
}

const corrections = [];
const poor = books.find(book => book.id === 42070);
const poorPage = decodeURIComponent(new URL(poor.sourceUrl).pathname.split('/wiki/')[1]);
const poorData = await render(poorPage);
if (!/Бедные люди/u.test(poorData.text.slice(0, 250))) throw new Error('Poor Folk source title did not match the text.');
corrections.push({ book: poor, html: poorData.html, text: poorData.text, sources: [poorData.url] });

const idiot = books.find(book => book.id === 42576);
const idiotPage = decodeURIComponent(new URL(idiot.sourceUrl).pathname.split('/wiki/')[1]);
const links = [];
function visit(node) {
  if (node.tagName === 'a') {
    const href = node.attrs?.find(attr => attr.name === 'href')?.value;
    const decoded = href?.startsWith('/wiki/') ? decodeURIComponent(href.slice('/wiki/'.length)) : '';
    if (decoded.startsWith('Идиот_(Достоевский)/')) links.push(decoded);
  }
  for (const child of node.childNodes || []) visit(child);
}
visit(parse(await (await fetch(`https://ru.wikisource.org/wiki/${encodeURIComponent(idiotPage).replaceAll('%2F', '/') }?action=render`, { headers: { 'User-Agent': 'RussianReadingLibrary/1.0' } })).text()));
const chapters = [...new Set(links)];
if (chapters.length < 40) throw new Error(`Expected all Idiot chapters, found ${chapters.length}`);
let cursor = 0;
const chapterData = new Array(chapters.length);
await Promise.all(Array.from({ length: 5 }, async () => {
  while (cursor < chapters.length) {
    const index = cursor++;
    const chapter = chapters[index];
    let error;
    for (let attempt = 0; attempt < 3; attempt++) {
      try { chapterData[index] = await render(chapter); error = null; break; }
      catch (reason) { error = reason; await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 800)); }
    }
    if (error) throw error;
  }
}));
const idiotText = chapterData.map(item => item.text).join('\n\n');
if (!/Князь Мышкин|Идиот/u.test(idiotText) || idiotText.length < 100000) throw new Error(`Idiot text validation failed (${idiotText.length} chars).`);
corrections.push({ book: idiot, html: chapterData.map(item => item.html).join('\n'), text: idiotText, sources: chapterData.map(item => item.url) });

await mkdir(new URL('source-cache/books/sources/', root), { recursive: true });
await mkdir(new URL('public/books/', root), { recursive: true });
for (const item of corrections) {
  const { book, html, text, sources } = item;
  const pages = splitPages(text, book.title);
  const pageFile = `books/${book.textPath.split('/').at(-1)}`;
  const htmlPath = `source-cache/books/sources/ru-ws-${book.id}-verified.html`;
  await writeFile(new URL(htmlPath, root), html, 'utf8');
  await writeFile(new URL(pageFile, new URL('public/', root)), gzipSync(Buffer.from(JSON.stringify(pages, null, 2))));
  book.textPath = pageFile;
  book.sourceArchivePath = htmlPath;
  book.pageCount = pages.length;
  const record = provenance.find(entry => entry.bookId === book.id);
  record.originalSha256 = hash(html);
  record.bodySha256 = hash(text);
  record.characters = text.length;
  record.pages = pages.length;
  record.sourcePages = sources;
}
await writeFile(new URL('src/data/russian-classics.json', root), JSON.stringify(books, null, 2), 'utf8');
await writeFile(provenancePath, JSON.stringify(provenance, null, 2), 'utf8');
console.log(`Rebuilt «Бедные люди» (${corrections[0].text.length} chars) and «Идиот» (${corrections[1].text.length} chars, ${chapters.length} chapters) from Wikisource.`);

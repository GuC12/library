import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { parse } from 'parse5';
import { extractWikisourceText } from './wikisource-text.mjs';

const root = path.resolve('.');
const archive = JSON.parse(await readFile(path.join(root, 'src/data/russian-classics.json'), 'utf8'));
const visible = JSON.parse(await readFile(path.join(root, 'src/data/curated-books.json'), 'utf8'));
const alreadyVisible = new Set(visible.map(book => book.id));
const candidates = archive.filter(book => !alreadyVisible.has(book.id) && book.coverKind === 'catalog-art' && book.pageCount >= 20)
  .sort((a, b) => b.pageCount - a.pageCount);
const hash = value => createHash('sha256').update(value).digest('hex');
const userAgent = 'RussianReadingLibrary/1.0 (public-domain book import)';

function collectChapterLinks(html, sourceTitle) {
  const found = [];
  const prefix = decodeURIComponent(sourceTitle.split('/')[0]);
  function visit(node) {
    if (node.tagName === 'a') {
      const href = node.attrs?.find(attr => attr.name === 'href')?.value;
      if (href?.startsWith('/wiki/')) {
        const title = decodeURIComponent(href.slice('/wiki/'.length));
        if (title.startsWith(`${prefix}/`) && !title.includes('#')) found.push(title);
      }
    }
    for (const child of node.childNodes || []) visit(child);
  }
  visit(parse(html));
  return [...new Set(found)];
}

async function render(title) {
  const url = new URL(`https://ru.wikisource.org/wiki/${encodeURIComponent(title).replaceAll('%2F', '/')}`);
  url.searchParams.set('action', 'render');
  const response = await fetch(url, { signal: AbortSignal.timeout(25000), headers: { 'User-Agent': userAgent } });
  if (!response.ok) throw new Error(`Wikisource HTTP ${response.status}`);
  const html = await response.text();
  return { html, text: extractWikisourceText(html), url: response.url };
}

function paginate(text, title) {
  const pages = [];
  let rest = text;
  while (rest.length) {
    let end = Math.min(rest.length, 800);
    if (end < rest.length) {
      const boundary = rest.lastIndexOf('\n\n', end);
      if (boundary > 400) end = boundary;
      else { const space = rest.lastIndexOf(' ', end); if (space > 400) end = space; }
    }
    const content = rest.slice(0, end).trim();
    if (content) pages.push({ kicker: title, title: pages.length ? '' : 'Full text', text: content });
    rest = rest.slice(end).trimStart();
  }
  return pages;
}

const provenance = JSON.parse(await readFile(path.join(root, 'public/books/wikisource-provenance.json'), 'utf8'));
const additions = [];
let cursor = 0;
let successes = 0;
let failures = 0;
const maxCandidates = Math.min(candidates.length, 220);
await mkdir(path.join(root, 'public/books'), { recursive: true });
await mkdir(path.join(root, 'source-cache/books/sources'), { recursive: true });

async function importCandidate(book) {
  const title = decodeURIComponent(new URL(book.sourceUrl).pathname.split('/wiki/')[1]);
  const parent = await render(title);
  let text = parent.text;
  let html = parent.html;
  let sourcePages = [parent.url];
  if (text.length < 8000) {
    const chapters = collectChapterLinks(parent.html, title);
    if (chapters.length > 1 && chapters.length < 150) {
      const rendered = [];
      for (const chapter of chapters) rendered.push(await render(chapter));
      const combined = rendered.map(item => item.text).join('\n\n');
      if (combined.length > text.length) {
        text = combined;
        html = rendered.map(item => item.html).join('\n');
        sourcePages = rendered.map(item => item.url);
      }
    }
  }
  if (text.length < 5000) throw new Error(`Text too short (${text.length})`);
  const pages = paginate(text, book.title);
  const archivePath = `source-cache/books/sources/ru-ws-${book.id}-verified-batch.html`;
  await writeFile(path.join(root, archivePath), html, 'utf8');
  await writeFile(path.join(root, 'public', book.textPath), gzipSync(Buffer.from(JSON.stringify(pages, null, 2))));
  book.pageCount = pages.length;
  book.sourceArchivePath = archivePath;
  const record = provenance.find(item => item.bookId === book.id);
  if (record) Object.assign(record, { originalSha256: hash(html), bodySha256: hash(text), characters: text.length, pages: pages.length, sourcePages });
  const passage = text.split(/\n\s*\n/u).map(item => item.trim())
    .find(item => {
      const plain = item.replace(/\s+/gu, ' ').trim();
      const lines = item.split('\n').map(line => line.trim()).filter(Boolean);
      const contentsLike = lines.length > 4 && lines.filter(line => /^(?:[IVXLCDM]+|\d+|=|глава\s+\S+)$/iu.test(line)).length / lines.length > 0.6;
      return plain.length >= 100 && plain !== book.title && !contentsLike &&
        !/(?:ISBN|copyright|published|издание|издательство|собрание сочинений|том первый|том второй|перевод|роман)/iu.test(plain) &&
        !/^(?:[А-ЯЁ]\.\s*){1,3}[А-ЯЁ][а-яё-]+/u.test(plain);
    }) || text;
  const plainPassage = passage.replace(/\s+/gu, ' ').trim();
  const snippet = plainPassage.slice(0, 320).replace(/\s+\S*$/u, '');
  additions.push({
    ...book,
    category: 'Классика',
    summary: snippet.length > 30 ? `${snippet}${snippet.length === 320 ? '…' : ''}` : `Full Russian text of “${book.title}” by ${book.author}.`,
    coverImage: `books/covers/catalog-art-${book.id}.svg`,
    coverKind: 'library-original',
    coverEdition: 'Original illustrated catalogue cover created for this project; not a scan of a published edition.',
    coverLicense: 'Project-created SVG artwork.',
  });
  successes++;
  if (successes % 10 === 0) console.log(`Verified ${successes}/100 Russian works.`);
}

while (successes < 100 && cursor < maxCandidates) {
  const batch = [];
  for (let i = 0; i < 4 && cursor < maxCandidates && successes + batch.length < 100; i++) batch.push(candidates[cursor++]);
  await Promise.all(batch.map(async book => {
    try { await importCandidate(book); }
    catch (error) { failures++; console.log(`Skipped ${book.id} (${book.title}): ${error.message}`); }
  }));
}
if (successes !== 100) throw new Error(`Only ${successes} verified Russian books found after ${cursor} candidates; no batch manifest written.`);
await writeFile(path.join(root, 'src/data/russian-batch-100.json'), `${JSON.stringify(additions, null, 2)}\n`, 'utf8');
await writeFile(path.join(root, 'src/data/russian-classics.json'), `${JSON.stringify(archive, null, 2)}\n`, 'utf8');
await writeFile(path.join(root, 'public/books/wikisource-provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`, 'utf8');
console.log(`Imported 100 Russian works; ${failures} candidates skipped; ${cursor} candidates checked.`);

/** Import the complete public-domain Wikisource text with the actual 1867 cover scan. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { extractWikisourceText } from './wikisource-text.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), 'utf8'));
const writeJson = (relative, value) => writeFile(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const title = '\u041f\u0440\u0435\u0441\u0442\u0443\u043f\u043b\u0435\u043d\u0438\u0435 \u0438 \u043d\u0430\u043a\u0430\u0437\u0430\u043d\u0438\u0435';
const fullTitle = `${title} (\u0414\u043e\u0441\u0442\u043e\u0435\u0432\u0441\u043a\u0438\u0439)`;
const sourcePageUrl = 'https://ru.wikisource.org/wiki/%D0%9F%D1%80%D0%B5%D1%81%D1%82%D1%83%D0%BF%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5_%D0%B8_%D0%BD%D0%B0%D0%BA%D0%B0%D0%B7%D0%B0%D0%BD%D0%B8%D0%B5_(%D0%94%D0%BE%D1%81%D1%82%D0%BE%D0%B5%D0%B2%D1%81%D0%BA%D0%B8%D0%B9)';
const sourceUrl = sourcePageUrl;
const coverSourceUrl = 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Cover_of_the_first_edition_of_Crime_and_Punishment.jpg';
const coverPageUrl = 'https://commons.wikimedia.org/wiki/File:Cover_of_the_first_edition_of_Crime_and_Punishment.jpg';
const bookId = 31998;
const agent = 'LibraryCatalogueStudent/1.0 (complete public-domain reading text)';
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function get(url) {
  const response = await fetch(url, { headers: { 'user-agent': agent }, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}: ${url}`);
  return response;
}

const curated = await readJson('src/data/curated-books.json');
if (curated.some((book) => book.id === bookId)) {
  console.log(`Book ${bookId} already exists; no change.`);
  process.exit(0);
}

const rootHtml = await (await get(sourcePageUrl)).text();
if (!rootHtml.includes('PD-old-70')) throw new Error('Wikisource no longer marks this work as public domain (PD-old-70).');
const rootPath = new URL(sourcePageUrl).pathname;
const chapterPrefix = `${rootPath}/`;
const chapterLinks = [...new Set([...rootHtml.matchAll(/href="(\/wiki\/[^"#?]+)"/g)]
  .map((match) => match[1])
  .filter((href) => href.startsWith(chapterPrefix)))];
if (chapterLinks.length !== 41) throw new Error(`Expected all 41 chapters and epilogue sections; found ${chapterLinks.length}.`);

const chapters = [];
for (const href of chapterLinks) {
  if (chapters.length) await pause(1400);
  const url = new URL(href, 'https://ru.wikisource.org').href;
  const html = await (await get(url)).text();
  const text = extractWikisourceText(html);
  if (!text || text.length < 500) throw new Error(`Chapter text is missing or short: ${url}`);
  chapters.push({ url, html, text });
}
const text = chapters.map((chapter) => chapter.text.trim()).join('\n\n');
if (text.length < 500000) throw new Error(`The novel looks incomplete (${text.length.toLocaleString()} characters).`);

const pages = [];
let cursor = 0;
while (cursor < text.length) {
  let end = Math.min(cursor + 1000, text.length);
  if (end < text.length) {
    const paragraph = text.lastIndexOf('\n\n', end);
    const line = text.lastIndexOf('\n', end);
    const space = text.lastIndexOf(' ', end);
    if (paragraph > cursor + 450) end = paragraph;
    else if (line > cursor + 450) end = line;
    else if (space > cursor + 450) end = space;
  }
  const pageText = text.slice(cursor, end).trim();
  if (pageText) pages.push({ kicker: '\u0424. \u041c. \u0414\u043e\u0441\u0442\u043e\u0435\u0432\u0441\u043a\u0438\u0439', title: pages.length ? '' : title, text: pageText });
  cursor = end;
  while (/\s/.test(text[cursor] || '') && cursor < text.length) cursor++;
}
if (!pages.length || pages.map((page) => page.text).join('').replace(/\s/gu, '') !== text.replace(/\s/gu, '')) {
  throw new Error('Pagination changed or lost the novel text.');
}

const coverResponse = await get(coverSourceUrl);
if (!(coverResponse.headers.get('content-type') || '').startsWith('image/jpeg')) throw new Error('Commons cover did not return JPEG.');
const coverBytes = Buffer.from(await coverResponse.arrayBuffer());
if (coverBytes.length < 25000 || !coverBytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) throw new Error('The Commons cover image is incomplete.');

const archivePath = 'source-cache/books/sources/crime-and-punishment.json';
const archiveBytes = Buffer.from(JSON.stringify({ sourceUrl, rootHtml, chapters }));
const rightsPath = 'books/CRIME-AND-PUNISHMENT-SOURCES.md';
const book = {
  id: bookId,
  title,
  author: '\u0424\u0451\u0434\u043e\u0440 \u041c\u0438\u0445\u0430\u0439\u043b\u043e\u0432\u0438\u0447 \u0414\u043e\u0441\u0442\u043e\u0435\u0432\u0441\u043a\u0438\u0439',
  category: '\u0420\u0443\u0441\u0441\u043a\u0430\u044f \u043b\u0438\u0442\u0435\u0440\u0430\u0442\u0443\u0440\u0430',
  price: 0,
  spine: '#57473f',
  summary: '\u0420\u043e\u0434\u0438\u043e\u043d \u0420\u0430\u0441\u043a\u043e\u043b\u044c\u043d\u0438\u043a\u043e\u0432, \u0431\u0435\u0434\u043d\u044b\u0439 \u0431\u044b\u0432\u0448\u0438\u0439 \u0441\u0442\u0443\u0434\u0435\u043d\u0442, \u0440\u0435\u0448\u0430\u0435\u0442\u0441\u044f \u043d\u0430 \u0443\u0431\u0438\u0439\u0441\u0442\u0432\u043e \u0441\u0442\u0430\u0440\u0443\u0445\u0438-\u043f\u0440\u043e\u0446\u0435\u043d\u0442\u0449\u0438\u0446\u044b, \u043f\u044b\u0442\u0430\u044f\u0441\u044c \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0438\u0434\u0435\u044e \u043e \u043f\u0440\u0430\u0432\u0435 \u0447\u0435\u043b\u043e\u0432\u0435\u043a\u0430 \u043f\u0435\u0440\u0435\u0441\u0442\u0443\u043f\u0438\u0442\u044c \u0437\u0430\u043a\u043e\u043d. \u0421\u043e\u0432\u0435\u0440\u0448\u0451\u043d\u043d\u043e\u0435 \u043f\u0440\u0435\u0441\u0442\u0443\u043f\u043b\u0435\u043d\u0438\u0435 \u043f\u043e\u0433\u0440\u0443\u0436\u0430\u0435\u0442 \u0435\u0433\u043e \u0432 \u0441\u0442\u0440\u0430\u0445 \u0438 \u043c\u0443\u0447\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0435 \u043f\u043e\u0438\u0441\u043a\u0438 \u043e\u043f\u0440\u0430\u0432\u0434\u0430\u043d\u0438\u044f. \u0420\u0430\u0441\u0441\u043b\u0435\u0434\u043e\u0432\u0430\u043d\u0438\u0435 \u043f\u043e\u043b\u0438\u0446\u0435\u0439\u0441\u043a\u043e\u0433\u043e \u0438 \u0432\u0441\u0442\u0440\u0435\u0447\u0430 \u0441 \u0421\u043e\u043d\u0435\u0439 \u043f\u043e\u0441\u0442\u0435\u043f\u0435\u043d\u043d\u043e \u0437\u0430\u0441\u0442\u0430\u0432\u043b\u044f\u044e\u0442 \u0435\u0433\u043e \u0432\u044b\u0431\u0438\u0440\u0430\u0442\u044c \u043c\u0435\u0436\u0434\u0443 \u0433\u043e\u0440\u0434\u044b\u043d\u0435\u0439 \u0438 \u043f\u0440\u0438\u0437\u043d\u0430\u043d\u0438\u0435\u043c.',
  pages: [],
  language: 'ru',
  publicationYear: 1866,
  pageCount: pages.length,
  textPath: 'books/crime-and-punishment-31998.json.gz',
  sourceArchivePath: archivePath,
  coverImage: 'books/covers/russian-edition-31998.jpg',
  coverKind: 'edition',
  coverEdition: '\u041f\u0435\u0440\u0432\u043e\u0435 \u0438\u0437\u0434\u0430\u043d\u0438\u0435, \u0442\u043e\u043c I, \u0421\u0430\u043d\u043a\u0442-\u041f\u0435\u0442\u0435\u0440\u0431\u0443\u0440\u0433, 1867',
  coverSourceUrl,
  coverLicense: 'Public domain; Wikimedia Commons Public Domain Mark 1.0. The scan shows the actual first-edition cover, 1867.',
  sourceUrl,
  sourceName: '\u0420\u0443\u0441\u0441\u043a\u0430\u044f \u0412\u0438\u043a\u0438\u0442\u0435\u043a\u0430',
  sourceLicense: 'Public domain in Russia (PD-old-70); Wikisource transcription CC BY-SA 4.0.',
  rightsPath,
  excerpt: text.slice(0, 400),
};

const provenancePath = path.join(root, 'public/books/wikisource-provenance.json');
const provenance = JSON.parse(await readFile(provenancePath, 'utf8'));
if (provenance.some((item) => item.bookId === bookId)) throw new Error('A provenance record for this ID already exists.');
provenance.push({ bookId, title, sourceUrl, originalSha256: hash(archiveBytes), bodySha256: hash(text), characters: text.length, pages: pages.length });
await mkdir(path.join(root, 'public/books/covers'), { recursive: true });
await writeFile(path.join(root, 'public/books/covers/russian-edition-31998.jpg'), coverBytes);
await writeFile(path.join(root, archivePath), archiveBytes);
await writeFile(path.join(root, 'public/books/crime-and-punishment-31998.json.gz'), gzipSync(Buffer.from(JSON.stringify(pages))));
await writeJson('public/books/wikisource-provenance.json', provenance);
await writeJson('src/data/real-cover-sources.json', [...await readJson('src/data/real-cover-sources.json'), {
  bookId, imageUrl: coverSourceUrl, sourceUrl: coverPageUrl, edition: book.coverEdition, license: book.coverLicense,
}]);
await writeJson('src/data/curated-books.json', [...curated, book]);
await mkdir(path.join(root, 'public/books'), { recursive: true });
await writeFile(path.join(root, 'public', rightsPath), `# ${title} — ${book.author}\n\n` +
  `Full text: ${sourceUrl}\n\nText status: public domain in Russia (PD-old-70); Wikisource transcription under CC BY-SA 4.0. The original chapter HTML and SHA-256 are preserved in source-cache/books/sources/crime-and-punishment.json and public/books/wikisource-provenance.json.\n\n` +
  `Cover: ${coverPageUrl}\n\nEdition: volume I, St Petersburg, 1867. Wikimedia Commons marks the actual first-edition cover public domain and provides the Public Domain Mark 1.0.\n\n` +
  `Reading text: all six parts and the two epilogue sections were imported from the linked Wikisource chapter pages. Pagination preserves all non-whitespace characters.\n`);
console.log(`Imported ${title}: ${text.length.toLocaleString()} characters, ${pages.length} pages, ${chapters.length} source chapters, actual 1867 cover.`);

/** Import Chekhov's complete public-domain play with the actual 1901 edition cover. */
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
const title = '\u0422\u0440\u0438 \u0441\u0435\u0441\u0442\u0440\u044b';
const fullTitle = `${title} (\u0427\u0435\u0445\u043e\u0432)`;
const sourceUrl = 'https://ru.wikisource.org/w/index.php?title=%D0%A2%D1%80%D0%B8_%D1%81%D0%B5%D1%81%D1%82%D1%80%D1%8B_(%D0%A7%D0%B5%D1%85%D0%BE%D0%B2)&oldid=5680744';
const sourcePageUrl = 'https://ru.wikisource.org/wiki/%D0%A2%D1%80%D0%B8_%D1%81%D0%B5%D1%81%D1%82%D1%80%D1%8B_(%D0%A7%D0%B5%D1%85%D0%BE%D0%B2)';
const coverSourceUrl = 'https://upload.wikimedia.org/wikipedia/commons/1/13/Three_Sisters_cover_1901.jpg';
const coverPageUrl = 'https://commons.wikimedia.org/wiki/File:Three_Sisters_cover_1901.jpg';
const userAgent = 'LibraryCatalogueStudent/1.0 (complete public-domain reading text)';
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function get(url) {
  const response = await fetch(url, { headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}: ${url}`);
  return response;
}

const curated = await readJson('src/data/curated-books.json');
const bookId = 31999;
if (curated.some((book) => book.id === bookId)) {
  console.log(`Book ${bookId} already exists; no change.`);
  process.exit(0);
}

const rootHtml = await (await get(sourcePageUrl)).text();
if (!rootHtml.includes('PD-old-70')) throw new Error('Wikisource no longer marks the work as public domain (PD-old-70).');
const actLinks = [...new Set([...rootHtml.matchAll(/href="(\/wiki\/[^"]+)"/g)]
  .map((match) => match[1])
  .filter((href) => href.includes('%D0%94%D0%B5%D0%B9%D1%81%D1%82%D0%B2%D0%B8%D0%B5_')))] ;
if (actLinks.length !== 4) throw new Error(`Expected the four linked acts; found ${actLinks.length}.`);

const actSources = [];
for (const href of actLinks) {
  if (actSources.length) await pause(2200);
  const url = new URL(href, 'https://ru.wikisource.org').href;
  const html = await (await get(url)).text();
  let text = extractWikisourceText(html);
  if (!actSources.length) text = text.replace(/^.*?\n\n(?=\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043f\u0435\u0440\u0432\u043e\u0435\n\n)/s, '');
  if (!text || !text.startsWith('\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435')) throw new Error(`Unexpected act content at ${url}.`);
  actSources.push({ url, html, text });
}

// Keep the complete acts and their scholarly notes.
const text = actSources.map((act) => act.text.trim()).join('\n\n');
if (text.length < 85000) throw new Error(`The imported play looks incomplete (${text.length} characters).`);

const pages = [];
let cursor = 0;
while (cursor < text.length) {
  let end = Math.min(cursor + 950, text.length);
  if (end < text.length) {
    const paragraph = text.lastIndexOf('\n\n', end);
    const line = text.lastIndexOf('\n', end);
    const space = text.lastIndexOf(' ', end);
    if (paragraph > cursor + 450) end = paragraph;
    else if (line > cursor + 450) end = line;
    else if (space > cursor + 450) end = space;
  }
  const pageText = text.slice(cursor, end).trim();
  if (pageText) pages.push({ kicker: '\u0410. \u041f. \u0427\u0435\u0445\u043e\u0432', title: pages.length ? '' : title, text: pageText });
  cursor = end;
  while (/\s/.test(text[cursor] || '') && cursor < text.length) cursor++;
}
if (!pages.length || pages.map((page) => page.text).join('').replace(/\s/gu, '') !== text.replace(/\s/gu, '')) {
  throw new Error('Pagination changed or lost the play text.');
}

const coverResponse = await get(coverSourceUrl);
if (!(coverResponse.headers.get('content-type') || '').startsWith('image/jpeg')) throw new Error('Commons cover did not return a JPEG image.');
const coverBytes = Buffer.from(await coverResponse.arrayBuffer());
if (coverBytes.length < 100000 || !coverBytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) throw new Error('The Commons cover image is incomplete.');

const archivePath = 'source-cache/books/sources/three-sisters.json';
const archiveBytes = Buffer.from(JSON.stringify({ sourceUrl, rootHtml, acts: actSources }));
const rightsPath = 'books/THREE-SISTERS-SOURCES.md';
const book = {
  id: bookId,
  title,
  author: '\u0410\u043d\u0442\u043e\u043d \u041f\u0430\u0432\u043b\u043e\u0432\u0438\u0447 \u0427\u0435\u0445\u043e\u0432',
  category: '\u0414\u0440\u0430\u043c\u0430 \u0438 \u043f\u044c\u0435\u0441\u044b',
  price: 0,
  spine: '#675449',
  summary: '\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u0440\u0430\u0437\u0432\u043e\u0440\u0430\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u0432 \u043f\u0440\u043e\u0432\u0438\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u043c \u0433\u043e\u0440\u043e\u0434\u0435 \u0432\u043e\u043a\u0440\u0443\u0433 \u0441\u0435\u0441\u0442\u0451\u0440 \u041e\u043b\u044c\u0433\u0438, \u041c\u0430\u0448\u0438 \u0438 \u0418\u0440\u0438\u043d\u044b \u041f\u0440\u043e\u0437\u043e\u0440\u043e\u0432\u044b\u0445. \u041e\u043d\u0438 \u043c\u0435\u0447\u0442\u0430\u044e\u0442 \u0432\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u0432 \u041c\u043e\u0441\u043a\u0432\u0443, \u043d\u043e \u0433\u043e\u0434\u044b, \u0440\u0430\u0431\u043e\u0442\u0430, \u043b\u044e\u0431\u043e\u0432\u044c \u0438 \u043f\u0435\u0440\u0435\u043c\u0435\u043d\u044b \u043f\u043e\u0441\u0442\u0435\u043f\u0435\u043d\u043d\u043e \u043c\u0435\u043d\u044f\u044e\u0442 \u0438\u0445 \u043f\u043b\u0430\u043d\u044b. \u0427\u0435\u0445\u043e\u0432 \u043f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u0442 \u0436\u0438\u0437\u043d\u044c \u0441\u0435\u043c\u044c\u0438 \u0438 \u043e\u0444\u0438\u0446\u0435\u0440\u0441\u043a\u043e\u0433\u043e \u043a\u0440\u0443\u0433\u0430 \u0447\u0435\u0440\u0435\u0437 \u0438\u0445 \u0440\u0430\u0437\u0433\u043e\u0432\u043e\u0440\u044b, \u043d\u0430\u0434\u0435\u0436\u0434\u044b \u0438 \u0440\u0430\u0441\u0441\u0442\u0430\u0432\u0430\u043d\u0438\u044f.',
  pages: [],
  language: 'ru',
  publicationYear: 1901,
  pageCount: pages.length,
  textPath: 'books/three-sisters-31999.json.gz',
  sourceArchivePath: archivePath,
  coverImage: 'books/covers/russian-edition-31999.jpg',
  coverKind: 'edition',
  coverEdition: '\u041f\u0435\u0440\u0432\u043e\u0435 \u043e\u0442\u0434\u0435\u043b\u044c\u043d\u043e\u0435 \u0438\u0437\u0434\u0430\u043d\u0438\u0435, \u0410. \u0424. \u041c\u0430\u0440\u043a\u0441, \u0421\u0430\u043d\u043a\u0442-\u041f\u0435\u0442\u0435\u0440\u0431\u0443\u0440\u0433, 1901',
  coverSourceUrl,
  coverLicense: 'Public domain; Wikimedia Commons Public Domain Mark 1.0. The scan shows the actual 1901 first separate edition.',
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
await writeFile(path.join(root, 'public/books/covers/russian-edition-31999.jpg'), coverBytes);
await writeFile(path.join(root, 'source-cache/books/sources/three-sisters.json'), archiveBytes);
await writeFile(path.join(root, 'public/books/three-sisters-31999.json.gz'), gzipSync(Buffer.from(JSON.stringify(pages))));
await writeJson('public/books/wikisource-provenance.json', provenance);
await writeJson('src/data/real-cover-sources.json', [...await readJson('src/data/real-cover-sources.json'), {
  bookId, imageUrl: coverSourceUrl, sourceUrl: coverPageUrl, edition: book.coverEdition, license: book.coverLicense,
}]);
await writeJson('src/data/curated-books.json', [...curated, book]);
await writeFile(path.join(root, 'public/books/THREE-SISTERS-SOURCES.md'), `# ${title} — ${book.author}\n\n` +
  `Full text: ${sourceUrl}\n\nText status: public domain in Russia (PD-old-70); Wikisource transcription under CC BY-SA 4.0. The source HTML and SHA-256 are preserved in source-cache/books/sources/three-sisters.json and public/books/wikisource-provenance.json.\n\n` +
  `Cover: ${coverPageUrl}\n\nEdition: first separate edition, A. F. Marx, St Petersburg, 1901. Wikimedia Commons labels the scan Public domain and Public Domain Mark 1.0.\n\n` +
  `Reading text: all four acts were retained. The archival image caption before Act I was omitted; the source's scholarly notes remain. Pagination preserves all non-whitespace characters.\n`);

console.log(`Imported ${title}: ${text.length.toLocaleString()} characters, ${pages.length} pages, actual 1901 edition cover (${coverBytes.length.toLocaleString()} bytes).`);

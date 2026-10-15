/** Import the complete five-volume public-domain novel with its actual 1912 cover. */
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
const title = '\u0412\u043e\u0439\u043d\u0430 \u0438 \u043c\u0438\u0440';
const author = '\u041b\u0435\u0432 \u041d\u0438\u043a\u043e\u043b\u0430\u0435\u0432\u0438\u0447 \u0422\u043e\u043b\u0441\u0442\u043e\u0439';
const rootUrl = 'https://ru.wikisource.org/wiki/%D0%92%D0%BE%D0%B9%D0%BD%D0%B0_%D0%B8_%D0%BC%D0%B8%D1%80_(%D0%A2%D0%BE%D0%BB%D1%81%D1%82%D0%BE%D0%B9)';
const rootHtml = await (await fetch(rootUrl, { headers: { 'user-agent': 'LibraryCatalogueStudent/1.0' }, signal: AbortSignal.timeout(45000) })).text();
if (!rootHtml.includes('PD-old-70')) throw new Error('Wikisource public-domain notice is missing.');
const partPaths = ['%D0%A2%D0%BE%D0%BC_1', '%D0%A2%D0%BE%D0%BC_2', '%D0%A2%D0%BE%D0%BC_3', '%D0%A2%D0%BE%D0%BC_4', '%D0%AD%D0%BF%D0%B8%D0%BB%D0%BE%D0%B3'];
const parts = [];
for (const suffix of partPaths) {
  const url = `${rootUrl}/${suffix}`;
  const response = await fetch(url, { headers: { 'user-agent': 'LibraryCatalogueStudent/1.0' }, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Wikisource returned HTTP ${response.status}: ${url}`);
  const html = await response.text();
  const text = extractWikisourceText(html);
  if (text.length < 100000) throw new Error(`Incomplete volume: ${url} (${text.length} characters)`);
  parts.push({ url, html, text });
}
const fullText = parts.map((part) => part.text.trim()).join('\n\n');
if (fullText.length < 2500000) throw new Error(`The novel appears incomplete (${fullText.length} characters).`);
const pages = [];
let cursor = 0;
while (cursor < fullText.length) {
  let end = Math.min(cursor + 1100, fullText.length);
  if (end < fullText.length) {
    const paragraph = fullText.lastIndexOf('\n\n', end);
    const line = fullText.lastIndexOf('\n', end);
    const space = fullText.lastIndexOf(' ', end);
    if (paragraph > cursor + 500) end = paragraph;
    else if (line > cursor + 500) end = line;
    else if (space > cursor + 500) end = space;
  }
  const text = fullText.slice(cursor, end).trim();
  if (text) pages.push({ kicker: author, title: pages.length ? '' : title, text });
  cursor = end;
  while (/\s/.test(fullText[cursor] || '') && cursor < fullText.length) cursor++;
}
if (pages.map((page) => page.text).join('').replace(/\s/gu, '') !== fullText.replace(/\s/gu, '')) throw new Error('Pagination lost text characters.');

const coverTitle = 'File:\u0422\u043e\u043b\u0441\u0442\u043e\u0439 \u041b. \u041d. \u0412\u043e\u0439\u043d\u0430 \u0438 \u043c\u0438\u0440, \u0422. 1. \u041e\u0431\u043b\u043e\u0436\u043a\u0430 \u0438\u0437\u0434.1912\u0433,\u0420\u043e\u0441\u0441\u0438\u044f.jpg';
const commonsApi = `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ action: 'query', titles: coverTitle, prop: 'imageinfo', iiprop: 'url|extmetadata', format: 'json' })}`;
const commons = await (await fetch(commonsApi, { headers: { 'user-agent': 'LibraryCatalogueStudent/1.0' }, signal: AbortSignal.timeout(45000) })).json();
const coverInfo = Object.values(commons.query.pages)[0]?.imageinfo?.[0];
if (!coverInfo?.url || !/Public domain/i.test(coverInfo.extmetadata?.LicenseShortName?.value || '')) throw new Error('Could not verify the historical cover and its public-domain status.');
const coverResponse = await fetch(coverInfo.url, { headers: { 'user-agent': 'LibraryCatalogueStudent/1.0' }, signal: AbortSignal.timeout(45000) });
if (!coverResponse.ok || !(coverResponse.headers.get('content-type') || '').startsWith('image/jpeg')) throw new Error('The historical cover image could not be downloaded as JPEG.');
const coverBytes = Buffer.from(await coverResponse.arrayBuffer());
if (coverBytes.length < 50000 || !coverBytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) throw new Error('The cover download is incomplete.');

const bookId = 31997;
const curated = await readJson('src/data/curated-books.json');
if (curated.some((book) => book.id === bookId)) throw new Error(`Book ${bookId} already exists; refusing to overwrite it.`);
const archivePath = 'source-cache/books/sources/war-and-peace.json';
const archiveBytes = Buffer.from(JSON.stringify({ rootUrl, rootHtml, parts }));
const rightsPath = 'books/WAR-AND-PEACE-SOURCES.md';
const coverPageUrl = `https://commons.wikimedia.org/wiki/${encodeURIComponent(coverTitle).replaceAll('%3A', ':')}`;
const coverLicense = `Public domain; Wikimedia Commons marks the image Public domain (${coverInfo.extmetadata.LicenseShortName.value}).`;
const book = {
  id: bookId, title, author, category: '\u0420\u0443\u0441\u0441\u043a\u0430\u044f \u043b\u0438\u0442\u0435\u0440\u0430\u0442\u0443\u0440\u0430', price: 0, spine: '#604a39',
  summary: '\u042d\u043f\u043e\u043f\u0435\u044f \u043e \u0436\u0438\u0437\u043d\u0438 \u0440\u043e\u0441\u0441\u0438\u0439\u0441\u043a\u043e\u0433\u043e \u043e\u0431\u0449\u0435\u0441\u0442\u0432\u0430 \u0432 \u044d\u043f\u043e\u0445\u0443 \u043d\u0430\u043f\u043e\u043b\u0435\u043e\u043d\u043e\u0432\u0441\u043a\u0438\u0445 \u0432\u043e\u0439\u043d. \u0421\u0443\u0434\u044c\u0431\u044b \u041f\u044c\u0435\u0440\u0430 \u0411\u0435\u0437\u0443\u0445\u043e\u0432\u0430, \u0410\u043d\u0434\u0440\u0435\u044f \u0411\u043e\u043b\u043a\u043e\u043d\u0441\u043a\u043e\u0433\u043e, \u041d\u0430\u0442\u0430\u0448\u0438 \u0420\u043e\u0441\u0442\u043e\u0432\u043e\u0439 \u0438 \u0438\u0445 \u0431\u043b\u0438\u0437\u043a\u0438\u0445 \u043f\u0435\u0440\u0435\u043f\u043b\u0435\u0442\u0430\u044e\u0442\u0441\u044f \u0441 \u0441\u043e\u0431\u044b\u0442\u0438\u044f\u043c\u0438 1812 \u0433\u043e\u0434\u0430 \u0438 \u0440\u0430\u0437\u043c\u044b\u0448\u043b\u0435\u043d\u0438\u044f\u043c\u0438 \u0430\u0432\u0442\u043e\u0440\u0430 \u043e \u0432\u043e\u0439\u043d\u0435, \u0438\u0441\u0442\u043e\u0440\u0438\u0438 \u0438 \u0447\u0435\u043b\u043e\u0432\u0435\u0447\u0435\u0441\u043a\u043e\u043c \u0432\u044b\u0431\u043e\u0440\u0435.',
  pages: [], language: 'ru', publicationYear: 1869, pageCount: pages.length,
  textPath: 'books/war-and-peace-31997.json.gz', sourceArchivePath: archivePath,
  coverImage: 'books/covers/russian-edition-31997.jpg', coverKind: 'edition',
  coverEdition: '\u0422\u043e\u043c I, \u043e\u0431\u043b\u043e\u0436\u043a\u0430 \u0438\u0437\u0434\u0430\u043d\u0438\u044f 1912 \u0433\u043e\u0434\u0430', coverSourceUrl: coverInfo.url, coverLicense,
  sourceUrl: rootUrl, sourceName: '\u0420\u0443\u0441\u0441\u043a\u0430\u044f \u0412\u0438\u043a\u0438\u0442\u0435\u043a\u0430',
  sourceLicense: 'Public domain in Russia (PD-old-70); Wikisource transcription CC BY-SA 4.0.', rightsPath, excerpt: fullText.slice(0, 400),
};
const provenancePath = 'public/books/wikisource-provenance.json';
const provenance = await readJson(provenancePath);
provenance.push({ bookId, title, sourceUrl: rootUrl, originalSha256: hash(archiveBytes), bodySha256: hash(fullText), characters: fullText.length, pages: pages.length });
const coverSources = await readJson('src/data/real-cover-sources.json');
coverSources.push({ bookId, imageUrl: coverInfo.url, sourceUrl: coverPageUrl, edition: book.coverEdition, license: coverLicense });
await mkdir(path.join(root, 'public/books/covers'), { recursive: true });
await mkdir(path.join(root, 'source-cache/books/sources'), { recursive: true });
await writeFile(path.join(root, 'public/books/covers/russian-edition-31997.jpg'), coverBytes);
await writeFile(path.join(root, archivePath), archiveBytes);
await writeFile(path.join(root, 'public/books/war-and-peace-31997.json.gz'), gzipSync(Buffer.from(JSON.stringify(pages))));
await writeJson(provenancePath, provenance);
await writeJson('src/data/real-cover-sources.json', coverSources);
await writeJson('src/data/curated-books.json', [...curated, book]);
await writeFile(path.join(root, 'public', rightsPath), `# ${title} — ${author}\n\nFull text: ${rootUrl}\n\nAll four volumes and the epilogue were imported in full from Russian Wikisource. Russia's PD-old-70 status applies to Tolstoy's work; the Wikisource transcription is CC BY-SA 4.0. Source HTML and SHA-256 are preserved in ${archivePath} and ${provenancePath}.\n\nActual edition cover: ${coverPageUrl}\n\nThe scan is the cover of volume I of the 1912 edition. Wikimedia Commons marks it Public domain. The local scan and its source metadata are recorded in the catalogue.\n\nPagination preserves all non-whitespace characters from the extracted volumes.\n`);
console.log(`Imported ${title}: ${fullText.length.toLocaleString()} characters, ${pages.length} pages, ${parts.length} volumes and epilogue, actual 1912 cover.`);

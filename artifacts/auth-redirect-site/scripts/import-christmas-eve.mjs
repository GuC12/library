/** Import Gogol's complete public-domain story and its 1901 scanned edition cover. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { extractWikisourceText } from './wikisource-text.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = async relative => JSON.parse(await readFile(path.join(root, relative), 'utf8'));
const writeJson = (relative, value) => writeFile(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const title = 'Ночь перед Рождеством';
const author = 'Николай Васильевич Гоголь';
const sourceUrl = 'https://ru.wikisource.org/wiki/Ночь_перед_Рождеством_(Гоголь)';
const headers = { 'user-agent': 'LibraryCatalogueStudent/1.0 (public-domain catalogue import)' };

const sourceResponse = await fetch(sourceUrl, { headers, signal: AbortSignal.timeout(45000) });
if (!sourceResponse.ok) throw new Error(`Wikisource returned HTTP ${sourceResponse.status}`);
const sourceHtml = await sourceResponse.text();
if (!sourceHtml.includes('PD-old-70')) throw new Error('Wikisource public-domain status was not confirmed.');
const fullText = extractWikisourceText(sourceHtml);
if (fullText.length < 50000 || !fullText.startsWith('Последний день перед Рождеством прошел.') || !fullText.includes('А окна все были обведены кругом')) {
  throw new Error(`Unexpected or incomplete story text (${fullText.length} characters).`);
}

const pages = [];
let cursor = 0;
while (cursor < fullText.length) {
  let end = Math.min(cursor + 1050, fullText.length);
  if (end < fullText.length) {
    const paragraph = fullText.lastIndexOf('\n\n', end);
    const line = fullText.lastIndexOf('\n', end);
    const space = fullText.lastIndexOf(' ', end);
    if (paragraph > cursor + 450) end = paragraph;
    else if (line > cursor + 450) end = line;
    else if (space > cursor + 450) end = space;
  }
  const text = fullText.slice(cursor, end).trim();
  if (text) pages.push({ kicker: author, title: pages.length ? '' : title, text });
  cursor = end;
  while (/\s/.test(fullText[cursor] || '') && cursor < fullText.length) cursor++;
}
if (pages.map(page => page.text).join('').replace(/\s/gu, '') !== fullText.replace(/\s/gu, '')) {
  throw new Error('Pagination did not preserve the complete text.');
}

const commonsFile = 'File:Гоголь Н.В. Ночь перед Рождеством. (1901).pdf';
const commonsApi = `https://commons.wikimedia.org/w/api.php?${new URLSearchParams({
  action: 'query', titles: commonsFile, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '900', format: 'json',
})}`;
const commonsData = await (await fetch(commonsApi, { headers, signal: AbortSignal.timeout(45000) })).json();
const coverInfo = Object.values(commonsData.query.pages)[0]?.imageinfo?.[0];
if (!coverInfo?.thumburl || !/Public domain/i.test(coverInfo.extmetadata?.LicenseShortName?.value || '')) {
  throw new Error('Could not verify the real 1901 edition cover and its public-domain status.');
}
const coverResponse = await fetch(coverInfo.thumburl, { headers, signal: AbortSignal.timeout(45000) });
if (!coverResponse.ok || !(coverResponse.headers.get('content-type') || '').includes('image/jpeg')) {
  throw new Error('Could not download the Commons cover scan.');
}
const coverBytes = Buffer.from(await coverResponse.arrayBuffer());
if (coverBytes.length < 10000 || !coverBytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
  throw new Error('The downloaded edition cover is invalid.');
}

const bookId = 32000;
const curated = await readJson('src/data/curated-books.json');
if (curated.some(book => book.id === bookId || book.title.toLocaleLowerCase() === title.toLocaleLowerCase())) {
  throw new Error('This book or ID is already present; refusing to create a duplicate.');
}
const rightsPath = 'books/CHRISTMAS-EVE-32000-SOURCES.md';
const sourceArchivePath = 'source-cache/books/sources/christmas-eve-32000.json';
const textPath = 'books/christmas-eve-32000.json.gz';
const coverPath = 'books/covers/russian-edition-32000.jpg';
const coverPageUrl = coverInfo.descriptionurl;
const coverLicense = `Public domain; Wikimedia Commons labels the 1901 scan Public domain (${coverInfo.extmetadata.LicenseShortName.value}).`;
const book = {
  id: bookId,
  title,
  author,
  category: 'Русская литература',
  price: 0,
  spine: '#755137',
  summary: 'Фантастическая повесть из цикла «Вечера на хуторе близ Диканьки». В рождественскую ночь чёрт крадёт месяц, чтобы помешать кузнецу Вакуле добиться руки красавицы Оксаны. Нечистая сила, колядки и казацкий быт переплетаются в истории о смелости, любви и народном юморе.',
  pages: [],
  language: 'ru',
  publicationYear: 1832,
  pageCount: pages.length,
  textPath,
  sourceArchivePath,
  coverImage: coverPath,
  coverKind: 'edition',
  coverEdition: 'Скан титульной обложки издания 1901 года',
  coverSourceUrl: coverPageUrl,
  coverLicense,
  sourceUrl,
  sourceName: 'Русская Викитека',
  sourceLicense: 'Произведение Николая Гоголя (умер в 1852 году) — общественное достояние; текстовая страница Викитеки доступна по CC BY-SA 4.0.',
  rightsPath,
  excerpt: fullText.slice(0, 400),
};

const archive = Buffer.from(JSON.stringify({ sourceUrl, sourceHtml }));
const provenancePath = 'public/books/wikisource-provenance.json';
const provenance = await readJson(provenancePath);
provenance.push({ bookId, title, sourceUrl, originalSha256: hash(archive), bodySha256: hash(fullText), characters: fullText.length, pages: pages.length });
const coverSources = await readJson('src/data/real-cover-sources.json');
coverSources.push({ bookId, imageUrl: coverInfo.thumburl, sourceUrl: coverPageUrl, edition: book.coverEdition, license: coverLicense });

await Promise.all([
  mkdir(path.join(root, 'public/books/covers'), { recursive: true }),
  mkdir(path.join(root, 'source-cache/books/sources'), { recursive: true }),
]);
await Promise.all([
  writeFile(path.join(root, 'public', coverPath), coverBytes),
  writeFile(path.join(root, sourceArchivePath), archive),
  writeFile(path.join(root, 'public', textPath), gzipSync(Buffer.from(JSON.stringify(pages)))),
  writeJson(provenancePath, provenance),
  writeJson('src/data/real-cover-sources.json', coverSources),
  writeJson('src/data/curated-books.json', [...curated, book]),
  writeFile(path.join(root, 'public', rightsPath), `# ${title} — ${author}\n\nПолный текст: ${sourceUrl}\n\nПроизведение Николая Гоголя (1809–1852) находится в общественном достоянии. Текст взят из Русской Викитеки; страница распространяется по CC BY-SA 4.0. Исходный HTML сохранён в ${sourceArchivePath}, SHA-256 и контрольная длина записаны в ${provenancePath}.\n\nОбложка: скан титульной обложки издания 1901 года из Wikimedia Commons: ${coverPageUrl}\nЛицензия файла на Commons: Public domain.\n\nТекст разбит на страницы без потери букв и цифр; исходная орфография произведения сохранена.\n`),
]);

console.log(`Imported ${title}: ${fullText.length} characters, ${pages.length} pages, verified public-domain 1901 edition cover.`);

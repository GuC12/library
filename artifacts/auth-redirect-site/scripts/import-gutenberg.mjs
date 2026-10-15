/** Repeatable, resumable import. Run: node scripts/import-gutenberg.mjs [count=100] */
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { coverSvg } from './generate-illustrated-covers.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'public/books');
const sourceArchive = path.join(root, 'source-cache/books/sources');
const cache = path.join(root, '.catalog-sources/gutenberg');
const manifest = path.join(root, 'src/data/gutenberg.json');
const target = Number(process.argv[2] || 100);
if (!Number.isInteger(target) || target < 1 || target > 1000) throw Error('Count must be 1–1000');
for (const dir of [cache, output, path.join(output, 'covers'), sourceArchive]) await mkdir(dir, { recursive: true });
const hash = (data) => createHash('sha256').update(data).digest('hex');
const readJson = async (file, fallback) => {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
};
async function atomic(file, value) {
  const temporary = `${file}.tmp`;
  await writeFile(temporary, value);
  for (let attempt = 0; ; attempt++) {
    try { await rename(temporary, file); return; }
    catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 5) throw error;
      await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }
}
let lastRequest = 0;
let requestQueue = Promise.resolve();
async function requestSlot() {
  let release;
  const currentTurn = new Promise(resolve => { release = resolve; });
  const previousTurn = requestQueue;
  requestQueue = currentTurn;
  await previousTurn;
  await new Promise(resolve => setTimeout(resolve, Math.max(0, 1000 - (Date.now() - lastRequest))));
  lastRequest = Date.now();
  release();
}
async function download(url, file) {
  try { return await readFile(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (let attempt = 0; attempt < 3; attempt++) {
    await requestSlot();
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(45000), headers: { 'User-Agent': 'LibraryCatalogue/1.0 (public-domain ebook import)' } });
      if (!response.ok) throw Error(`HTTP ${response.status}: ${url}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.length) throw Error(`Empty response: ${url}`);
      await atomic(file, bytes);
      return bytes;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 3000));
    }
  }
}
function paginate(text, title, language) {
  const pages = [];
  const limit = language === 'zh' ? 380 : 800;
  let position = 0;
  while (position < text.length) {
    let end = Math.min(position + limit, text.length);
    if (end < text.length) {
      const paragraph = text.lastIndexOf('\n\n', end);
      const space = text.lastIndexOf(' ', end);
      if (paragraph > position + limit / 2) end = paragraph;
      else if (space > position + limit / 2) end = space;
    }
    const part = text.slice(position, end).trim();
    if (part) pages.push({ kicker: title, title: pages.length ? '' : ({ ru: 'Полный текст', en: 'Complete text', zh: '全文', fr: 'Texte intégral', de: 'Vollständiger Text', es: 'Texto completo', it: 'Testo completo', pt: 'Texto completo' }[language] || 'Complete text'), text: part });
    position = end;
    while (/\s/.test(text[position] || '') && position < text.length) position++;
  }
  if (pages.map(p => p.text).join('').replace(/\s/g, '') !== text.replace(/\s/g, '')) throw Error('Pagination lost text');
  return pages;
}
function readingText(body, description) {
  let text = body.replace(/\r/g, '').replace(/[’‘]/g, "'").replace(/[\t ]+\n/g, '\n');
  // Remove editorial front matter that otherwise looks like the book's opening text.
  text = text.replace(/^\s*Transcriber's Notes?\s*:?[^\n]*(?:\n[^\n]*)?/im, '');
  text = text.replace(/^\s*\[(?:Illustration|Frontispiece|Blank Page):?[^\]]*\]\s*$/gim, '');
  // A contents heuristic can mistake a section near the end of verse/prose-poetry
  // for the start of the book. Preserve the entire source for poetry collections
  // and prose poems; a printed contents page is preferable to losing chapters.
  const isVerse = /poetry|poems|drama|plays|verse|mathematics/i.test(description);
  const contents = isVerse ? null : /^\s*(?:TABLE OF )?CONTENTS\s*:?\s*$/im.exec(text);
  if (contents) {
    const remainder = text.slice(contents.index + contents[0].length);
    const blocks = [...remainder.matchAll(/\S[\s\S]*?(?=\n\s*\n|$)/g)];
    const firstProse = blocks.findIndex(match => {
      const block = match[0].trim();
      const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
      const contentsRows = lines.filter(line => /^(?:[IVXLCDM]+\.|[A-Z][A-Z\s'’,:-]{5,})/.test(line)).length;
      const looksLikeContents = lines.length > 4 && contentsRows / lines.length > 0.55;
      const letters = (block.match(/[\p{L}]{2,}/gu) || []).join('').length;
      return block.length >= 260 && letters / Math.max(1, block.length) > 0.55 &&
        !/(?:_to face p\.|\b(?:page|p\.)\s*\d|\s\d{1,4}\s*$)/i.test(block) &&
        !/^\s*\d+[.)]/.test(block) && !looksLikeContents;
    });
    if (firstProse >= 0) {
      let start = contents.index + contents[0].length + blocks[firstProse].index;
      const previous = blocks[firstProse - 1];
      const heading = previous?.[0]?.trim();
      if (heading && heading.length < 100 && !/\d\s*$/.test(heading) && /\p{L}/u.test(heading) &&
          (heading === heading.toLocaleUpperCase() || /^[IVXLCDM]+\.\s+\p{Lu}/u.test(heading))) {
        start = contents.index + contents[0].length + previous.index;
      }
      text = text.slice(start);
    }
  }
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  if (isVerse) return text;
  // Reflow Gutenberg's fixed-width prose, but retain verse and short/indented lines.
  return text.split(/\n\s*\n/).map(paragraph => {
    const lines = paragraph.split('\n');
    return lines.length > 1 && lines.slice(0, -1).every(line => line.length >= 50 && !/^\s/.test(line))
      ? lines.join(' ') : paragraph;
  }).join('\n\n');
}
const originals = await readJson(path.join(root, 'src/data/catalogue.json'), []);
const russianOriginals = await readJson(path.join(root, 'src/data/russian-classics.json'), []);
const cleanTitle = title => title.replace(/\s*\$[a-z]\s*/g, ' ').replace(/\s+/g, ' ').trim();
const normalize = value => value.toLocaleLowerCase().split(/[:;—]/)[0].replace(/^the\s+/, '').replace(/,?\s+(complete|illustrated)$/i, '').replace(/[^\p{L}\p{N}]/gu, '');
const excludedTitle = title => /linked index|complete.*works|collected works|\b(part \d+ of|volume [ivx\d]+|vol\. [ivx\d]+|v\.\s*\d)\b/i.test(title);
const existingTitles = new Set([...originals, ...russianOriginals].map(book => normalize(book.title)));
const imported = (await readJson(manifest, [])).filter(book => {
  book.title = cleanTitle(book.title);
  const title = normalize(book.title);
  if (existingTitles.has(title) || excludedTitle(book.title)) { console.log(`Duplicate edition or collected index omitted: ${book.title}`); return false; }
  existingTitles.add(title);
  return true;
});
const provenanceFile = path.join(output, 'gutenberg-provenance.json');
const provenance = (await readJson(provenanceFile, [])).filter(p => imported.some(book => book.id === p.id + 100000));
const existingSources = new Set([...originals, ...russianOriginals, ...imported].map(book => book.sourceUrl));
const colors = ['#183c50', '#55392e', '#394c3a', '#753e45', '#284d62', '#42604e'];

async function save() {
  await atomic(manifest, JSON.stringify(imported, null, 2) + '\n');
  await atomic(provenanceFile, JSON.stringify(provenance, null, 2) + '\n');
  const lines = ['# Imported Project Gutenberg editions', '',
    'Metadata: https://gutendex.com/ (Project Gutenberg catalogue). Only copyright=false records are imported; authors and translators must have died before 1956. The source identifies these editions as unrestricted under US copyright law.',
    'Original Project Gutenberg thumbnails are downloaded for source reference, but are not displayed because they are geometric catalogue placeholders. Display covers are locally generated, clearly labelled Library Edition artwork and are not historical scans.',
    'Original UTF-8 TXT downloads retain all credits and license terms. The reader removes the Gutenberg wrapper, reflows fixed-width prose and splits the entire work into pages without losing non-whitespace characters. Verse and short lines are retained. The complete original is available using Download TXT.',
    'Descriptions list catalogue subjects; no generated plot summaries are used. Import checkpoints after each successful book; running it again does not add duplicates.', '',
    ...provenance.flatMap(p => [`## ${p.title}`, `Source: ${p.sourceUrl}`, `Text: ${p.textUrl}`, `Original thumbnail (not displayed): ${p.coverUrl}`, `Displayed cover: books/covers/catalog-art-${p.id + 100000}.svg (generated catalogue artwork)`, `Original SHA-256: ${p.originalSha256}`, `Thumbnail SHA-256: ${p.coverSha256}`, `Reading pages: ${p.pages}; body characters: ${p.characters}`, ''])];
  await atomic(path.join(output, 'GUTENBERG-SOURCES.md'), lines.join('\n'));
}
async function importBook(book) {
  book = { ...book, title: cleanTitle(book.title) };
  const sourceUrl = `https://www.gutenberg.org/ebooks/${book.id}`;
  if (existingSources.has(sourceUrl) || existingTitles.has(normalize(book.title))) return;
  if (book.languages.some(lang => !['ru', 'en', 'kk', 'zh'].includes(lang))) return;
  const language = book.languages.find(lang => ['ru', 'en', 'zh'].includes(lang));
  const people = [...book.authors, ...(book.translators || [])];
  if (!language || book.copyright !== false || book.media_type !== 'Text' || !book.authors.length ||
      people.some(person => !person.death_year || person.death_year >= 1956)) return;
  if (!Object.keys(book.formats).some(key => key.startsWith('text/plain')) || !book.formats['image/jpeg']) return;
  // Different ebook IDs can be alternative editions of the same work.
  if (excludedTitle(book.title)) return;
  const slug = `pg-${book.id}`;
  const textUrl = `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.txt`;
  const coverUrl = book.formats['image/jpeg'];
  const [raw, cover] = await Promise.all([
    download(textUrl, path.join(sourceArchive, `${slug}.txt`)),
    download(coverUrl, path.join(output, 'covers', `${slug}.jpg`)),
  ]);
  const original = new TextDecoder('utf-8', { fatal: true }).decode(raw).replace(/\r\n/g, '\n');
  const start = /\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i.exec(original);
  const end = /\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i.exec(original);
  if (!start || !end || end.index <= start.index) throw Error('Missing complete text delimiters');
  if (!/FULL PROJECT GUTENBERG LICENSE/i.test(original)) throw Error('Missing original license');
  const body = original.slice(start.index + start[0].length, end.index).trim();
  if (body.length < 3000) return; // Prefer books and substantial stories to single short poems.
  if (cover.length < 1000 || cover[0] !== 0xff || cover[1] !== 0xd8) throw Error('Invalid JPEG cover');
  const subjects = (book.subjects || []).slice(0, 5).join('; ');
  const pages = paginate(readingText(body, subjects), book.title, language);
  if (pages.length > 3000) return; // Avoid oversized editions that make mobile reading sluggish.
  await atomic(path.join(output, `${slug}.json.gz`), gzipSync(Buffer.from(JSON.stringify(pages))));
  const categoryText = [...book.subjects, ...book.bookshelves].join(' ');
  const category = /detective|mystery|crime|thriller/i.test(categoryText) ? 'Детективы' :
    /science fiction|utopia/i.test(categoryText) ? 'Научная фантастика' :
    /fantasy|fairy tales?|mythology/i.test(categoryText) ? 'Фэнтези' :
    /philosophy|ethics/i.test(categoryText) ? 'Философия' :
    /juvenile|children|young adult/i.test(categoryText) ? 'Детская литература' :
    /poetry|poems|verse/i.test(categoryText) ? 'Поэзия' :
    /drama|plays|traged(y|ies)/i.test(categoryText) ? 'Драма и пьесы' :
    /romance|love stories/i.test(categoryText) ? 'Любовные романы' :
    /historical fiction/i.test(categoryText) ? 'Историческая проза' :
    /travel|voyages|travel writing/i.test(categoryText) ? 'Путешествия' :
    /adventure|sea stories/i.test(categoryText) ? 'Приключения' :
    /fiction|literature|novels|stories|fairy|humor/i.test(categoryText) ? 'Художественная литература' :
      'Познавательная литература';
  const record = { id: 100000 + book.id, title: book.title,
    author: book.authors.map(a => a.name.split(', ').reverse().join(' ')).join(', '),
    category, price: 0, spine: colors[imported.length % colors.length],
    summary: subjects ? `Темы из каталога источника: ${subjects}.` : `Полное произведение: ${book.title}.`,
    pages: [], language, publicationYear: null, pageCount: pages.length,
    textPath: `books/${slug}.json.gz`, sourceArchivePath: `source-cache/books/sources/${slug}.txt`, coverImage: `books/covers/catalog-art-${100000 + book.id}.svg`,
    coverKind: 'catalog-art', coverEdition: 'Созданная обложка библиотеки; не является сканом исторического издания.',
    sourceUrl, sourceName: 'Project Gutenberg', sourceLicense: 'Public domain in the USA · Original credits and Project Gutenberg license included in TXT',
    rightsPath: 'books/GUTENBERG-SOURCES.md', excerpt: body.slice(0, 400) };
  await atomic(path.join(output, 'covers', `catalog-art-${record.id}.svg`), coverSvg(record));
  imported.push(record);
  provenance.push({ id: book.id, title: book.title, sourceUrl, metadataUrl: `https://gutendex.com/books/${book.id}/`,
    textUrl, coverUrl, originalSha256: hash(raw), coverSha256: hash(cover), bodySha256: hash(body), characters: body.length, pages: pages.length });
  existingSources.add(sourceUrl);
  existingTitles.add(normalize(book.title));
  await save();
  console.log(`${imported.length}/${target} ${language} ${book.title} (${pages.length} pages)`);
}

if (process.argv.includes('--refresh')) {
  for (const book of imported) {
    const original = (await readFile(path.join(root, book.sourceArchivePath), 'utf8')).replace(/\r\n/g, '\n');
    const start = /\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i.exec(original);
    const end = /\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i.exec(original);
    if (!start || !end) throw Error(`Incomplete cached original: ${book.title}`);
    const body = original.slice(start.index + start[0].length, end.index).trim();
    const pages = paginate(readingText(body, book.summary), book.title, book.language);
    await atomic(path.join(root, 'public', book.textPath), gzipSync(Buffer.from(JSON.stringify(pages))));
    book.pageCount = pages.length;
    provenance.find(p => p.id + 100000 === book.id).pages = pages.length;
  }
  await save();
}

// Keep the imported catalogue in the requested languages. Gutendex has no Kazakh
// editions; the existing catalogue retains its verified Kazakh works.
const russianCap = Math.min(10, target);
const chineseCap = Math.min(90, Math.max(0, target - russianCap));
for (const language of ['ru', 'zh', 'en']) {
  const cap = language === 'en'
    ? Math.max(0, target - imported.filter(book => book.language !== 'en').length)
    : language === 'ru' ? russianCap : chineseCap;
  if (imported.filter(book => book.language === language).length >= cap) continue;
  const firstUrl = `https://gutendex.com/books/?languages=${language}`;
  let url = firstUrl;
  let page = 0;
  while (url && imported.filter(book => book.language === language).length < cap && page++ < 100) {
    console.log(`Catalogue: ${url}`);
    const metadata = JSON.parse((await download(url, path.join(cache, `${hash(url)}.json`))).toString('utf8'));
    for (const book of metadata.results) {
      if (imported.filter(item => item.language === language).length >= cap) break;
      try { await importBook(book); } catch (error) { console.warn(`Skipped #${book.id}: ${error.message}`); }
    }
    url = metadata.next;
  }
}
await save();
if (imported.length < target) throw Error(`Imported ${imported.length}/${target}; rerun to retry incomplete downloads`);
console.log(`Complete: ${imported.length} Gutenberg books plus ${russianOriginals.length} Russian editions; ${originals.length + imported.length + russianOriginals.length + 2} total including the two featured books.`);

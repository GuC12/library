import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceRows = JSON.parse(await readFile(path.join(root, 'src/data/real-cover-sources.json'), 'utf8'));
const byId = new Map(sourceRows.map((row) => [row.bookId, row]));
for (const manifest of ['src/data/catalogue.json', 'src/data/russian-classics.json']) {
  const file = path.join(root, manifest);
  const entries = JSON.parse(await readFile(file, 'utf8'));
  let changed = 0;
  for (const book of entries) {
    const cover = byId.get(book.id);
    if (!cover) continue;
    book.coverImage = cover.imageUrl;
    book.coverSourceUrl = cover.sourceUrl;
    book.coverEdition = cover.edition;
    book.coverLicense = cover.license;
    changed++;
  }
  await writeFile(file, `${JSON.stringify(entries, null, 2)}\n`);
  console.log(`${manifest}: ${changed} genuine cover images linked`);
}

const lines = [
  '# Cover image sources',
  '',
  'The entries below identify matching edition covers or scans and link to their image sources. Other titles use locally stored original catalogue artwork marked “Library Edition”; it is not presented as a historical scan. Project Gutenberg geometric thumbnails are retained only as source records and are not displayed.',
  '',
  ...sourceRows.flatMap((row) => [`## ${row.title || row.edition}`, `Book ID: ${row.bookId}`, `Edition: ${row.edition}`, `Image: ${row.imageUrl}`, `Source: ${row.sourceUrl}`, '']),
  'Open Library requests that public-facing cover images use its Covers host and that a courtesy link back to Open Library be provided. See https://openlibrary.org/dev/docs/api/covers.',
];
await writeFile(path.join(root, 'public/books/COVER-IMAGE-SOURCES.md'), `${lines.join('\n')}\n`);

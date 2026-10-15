/** Fix links and identify genuine editions versus source illustrations and portraits. */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
let repairedSources = 0;
let editions = 0;
let portraits = 0;
let illustrations = 0;

for (const name of ['catalogue.json', 'russian-classics.json', 'kazakh-classics.json', 'gutenberg.json']) {
  const file = path.join(root, 'src/data', name);
  const books = JSON.parse(await readFile(file, 'utf8'));
  for (const book of books) {
    if (book.sourceUrl?.includes('?oldid=undefined')) {
      book.sourceUrl = book.sourceUrl.replace(/\?oldid=undefined$/, '');
      repairedSources++;
    }
    const description = `${book.coverEdition || ''} ${book.coverSourceUrl || ''}`.toLocaleLowerCase();
    if (book.coverKind === 'catalog-art') continue;
    if (/портрет|portrait/.test(description)) { book.coverKind = 'portrait'; portraits++; }
    else if (/иллюстрац|illustration|ertostik\.jpg/.test(description)) { book.coverKind = 'illustration'; illustrations++; }
    else if (book.coverSourceUrl || name === 'gutenberg.json') { book.coverKind = 'edition'; editions++; }
  }
  await writeFile(file, `${JSON.stringify(books, null, 2)}\n`);
}

const sourceDoc = path.join(root, 'public/books/COVER-IMAGE-SOURCES.md');
const text = await readFile(sourceDoc, 'utf8');
const note = '\n\n## Library artwork and author portraits\n\nProject Gutenberg\'s default JPEG thumbnails were catalogue graphics with geometric filler, so this library uses illustrated catalogue covers with the title, author and a genre-specific scene. These covers are original library artwork and are not scans of historical editions. Wikisource works with a Wikimedia author portrait or illustration use that source image with the book title and author overlaid; they are not described as edition scans. Individual genuine edition scans and their sources remain listed above.\n';
if (!text.includes('## Library artwork and author portraits')) await writeFile(sourceDoc, text + note);
console.log(`Removed ${repairedSources} broken Wikisource revision suffixes; labelled ${editions} edition images, ${portraits} portraits and ${illustrations} illustrations.`);

/** Re-extract Russian Wikisource text from saved original HTML without losing inline link/span text. */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { extractWikisourceText } from './wikisource-text.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifestPath = path.join(root, 'src/data/russian-classics.json');
const provenancePath = path.join(root, 'public/books/wikisource-provenance.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const provenance = JSON.parse(await readFile(provenancePath, 'utf8'));
const hash = (text) => createHash('sha256').update(text).digest('hex');
function paginate(text, title) {
  const pages = [];
  let cursor = 0;
  while (cursor < text.length) {
    let end = Math.min(cursor + 800, text.length);
    if (end < text.length) {
      const paragraph = text.lastIndexOf('\n\n', end);
      const line = text.lastIndexOf('\n', end);
      const space = text.lastIndexOf(' ', end);
      if (paragraph > cursor + 400) end = paragraph;
      else if (line > cursor + 400) end = line;
      else if (space > cursor + 400) end = space;
    }
    const part = text.slice(cursor, end).trim();
    if (part) pages.push({ kicker: title, title: pages.length ? '' : 'Полный текст', text: part });
    cursor = end;
    while (/\s/.test(text[cursor] || '') && cursor < text.length) cursor++;
  }
  if (!pages.length || pages.some((page) => !page.text.trim())) throw new Error('Empty or incomplete pages');
  if (pages.map((page) => page.text).join('').replace(/\s/gu, '') !== text.replace(/\s/gu, '')) throw new Error('Pagination changed the source text');
  return pages;
}

let repaired = 0;
for (const book of manifest) {
  const sourcePath = path.join(root, book.sourceArchivePath);
  const html = await readFile(sourcePath, 'utf8');
  const text = extractWikisourceText(html);
  if (text.length < 4000) throw new Error(`${book.title}: extracted text is suspiciously short (${text.length})`);
  const pages = paginate(text, book.title);
  await writeFile(path.join(root, 'public', book.textPath), gzipSync(Buffer.from(JSON.stringify(pages))));
  book.pageCount = pages.length;
  book.excerpt = text.slice(0, 400);
  const source = provenance.find((item) => item.bookId === book.id);
  if (!source) throw new Error(`${book.title}: missing source provenance`);
  source.bodySha256 = hash(text);
  source.characters = text.length;
  source.pages = pages.length;
  repaired++;
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`);
console.log(`Re-extracted ${repaired} complete Russian works from original Wikisource HTML.`);

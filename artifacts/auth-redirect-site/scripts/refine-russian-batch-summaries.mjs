import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

const file = path.resolve('src/data/russian-batch-100.json');
const books = JSON.parse(await readFile(file, 'utf8'));
for (const book of books) {
  const pages = JSON.parse(gunzipSync(await readFile(path.resolve('public', book.textPath))).toString('utf8'));
  const text = pages.map(page => page.text).join('\n\n');
  const passage = text.split(/\n\s*\n/u).map(item => item.trim()).find(item => {
    const plain = item.replace(/\s+/gu, ' ').trim();
    const lines = item.split('\n').map(line => line.trim()).filter(Boolean);
    const contentsLike = lines.length > 4 && lines.filter(line => /^(?:[IVXLCDM]+|\d+|=|глава\s+\S+)$/iu.test(line)).length / lines.length > 0.6;
    return plain.length >= 100 && plain !== book.title && !contentsLike &&
      !/(?:ISBN|copyright|published|издание|издательство|собрание сочинений|том первый|том второй|перевод|роман)/iu.test(plain) &&
      !/^(?:[А-ЯЁ]\.\s*){1,3}[А-ЯЁ][а-яё-]+/u.test(plain);
  }) || text;
  const snippet = passage.replace(/\s+/gu, ' ').trim().slice(0, 300).replace(/\s+\S*$/u, '');
  book.summary = `${book.title} — ${book.author}. ${snippet}`;
}
await writeFile(file, `${JSON.stringify(books, null, 2)}\n`, 'utf8');
console.log(`Refined ${books.length} book blurbs from the opening prose.`);

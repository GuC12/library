import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const file = path.join(root, 'src/data/russian-batch-100.json');
const books = JSON.parse(await readFile(file, 'utf8'));
const palettes = [
  ['#17212b', '#243747', '#c8a56a', '#f2e8d7'],
  ['#282027', '#503640', '#d2ae72', '#f4ead9'],
  ['#192923', '#304b3e', '#c5ad74', '#f1e9d8'],
  ['#20243a', '#3b4261', '#d5bc83', '#f5efdf'],
  ['#2b241e', '#55432e', '#d6b578', '#f4ead7'],
];
const esc = (s) => String(s ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const hash = (s) => [...String(s)].reduce((n, c) => (n * 33 + c.codePointAt(0)) >>> 0, 5381);
function wrap(text, max, limit) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    if (!line || `${line} ${word}`.length <= max) line = line ? `${line} ${word}` : word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  if (lines.length > limit) return [...lines.slice(0, limit - 1), `${lines.slice(limit - 1).join(' ').slice(0, max - 1)}…`];
  return lines;
}
function cover(book) {
  const [dark, mid, gold, cream] = palettes[hash(book.id) % palettes.length];
  const titleLines = wrap(book.title, book.title.length > 55 ? 23 : 29, 5);
  const titleSize = titleLines.length >= 4 ? 28 : titleLines.length >= 3 ? 32 : 37;
  const title = titleLines.map((line, i) => `<tspan x="300" dy="${i ? 42 : 0}">${esc(line)}</tspan>`).join('');
  const authors = wrap(book.author, 32, 2).map((line, i) => `<tspan x="300" dy="${i ? 30 : 0}">${esc(line)}</tspan>`).join('');
  const category = esc(book.category || 'КЛАССИКА');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900" role="img" aria-label="${esc(book.title)} — ${esc(book.author)}">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${dark}"/><stop offset=".52" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></linearGradient><linearGradient id="foil"><stop stop-color="${cream}"/><stop offset=".5" stop-color="${gold}"/><stop offset="1" stop-color="${cream}"/></linearGradient></defs>
  <rect width="600" height="900" fill="${dark}"/><rect x="20" y="20" width="560" height="860" fill="url(#bg)" stroke="url(#foil)" stroke-width="2"/><rect x="34" y="34" width="532" height="832" fill="none" stroke="${gold}" stroke-opacity=".42"/>
  <path d="M58 118H542M58 782H542" stroke="${gold}" stroke-opacity=".65"/><path d="M74 80h94m264 0h94M74 820h94m264 0h94" stroke="${gold}" stroke-opacity=".6"/>
  <circle cx="300" cy="450" r="130" fill="none" stroke="${gold}" stroke-opacity=".16" stroke-width="2"/><circle cx="300" cy="450" r="112" fill="none" stroke="${cream}" stroke-opacity=".1"/>
  <path d="M270 450h60M300 420v60" stroke="${gold}" stroke-opacity=".32" stroke-width="2"/>
  <text x="300" y="94" text-anchor="middle" fill="${cream}" font-family="Georgia,'Times New Roman',serif" font-size="14" letter-spacing="3">${category.toLocaleUpperCase('ru')}</text>
  <text x="300" y="316" text-anchor="middle" fill="${cream}" font-family="Georgia,'Times New Roman',serif" font-size="${titleSize}" font-weight="700">${title}</text>
  <path d="M180 524h240" stroke="url(#foil)" stroke-width="2"/>
  <text x="300" y="715" text-anchor="middle" fill="${cream}" font-family="Georgia,'Times New Roman',serif" font-size="24" font-weight="600">${authors}</text>
  <text x="300" y="824" text-anchor="middle" fill="${gold}" font-family="Georgia,serif" font-size="11" letter-spacing="3">КЛАССИЧЕСКОЕ ИЗДАНИЕ</text>
  <title>${esc(book.title)} — ${esc(book.author)}</title></svg>`;
}

let changed = 0;
for (const book of books) {
  if (book.coverKind === 'edition') continue;
  const name = `catalog-art-${book.id}.svg`;
  await writeFile(path.join(root, 'public/books/covers', name), cover(book), 'utf8');
  book.coverImage = `books/covers/${name}`;
  book.coverKind = 'library-original';
  book.coverEdition = 'Авторская типографская обложка проекта; скан издания пока не найден.';
  book.coverLicense = 'Project-created SVG artwork.';
  changed++;
}
await writeFile(file, `${JSON.stringify(books, null, 2)}\n`, 'utf8');
console.log(`Normalized ${changed} catalogue covers without verified edition scans.`);

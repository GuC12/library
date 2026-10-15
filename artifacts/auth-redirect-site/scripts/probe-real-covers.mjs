import { readFile } from 'node:fs/promises';
const books = JSON.parse(await readFile('src/data/russian-batch-100.json', 'utf8'));
const table = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
const translit = (s) => [...s.toLowerCase()].map(c => table[c] ?? c).join('').replace(/[^a-z0-9]+/g, ' ').trim();
const results = [];
let next = 0;
async function worker() {
  while (next < books.length) {
    const book = books[next++];
    const titleQuery = translit(book.title);
    const authorQuery = translit(book.author.split(';')[0]);
    try {
      const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(titleQuery)}&author=${encodeURIComponent(authorQuery)}&fields=title,author_name,cover_i,first_publish_year&limit=10`;
      const response = await fetch(url, { headers: { 'user-agent': 'LibraryCoverAudit/1.0 (cover research)' } });
      if (!response.ok) continue;
      const data = await response.json();
      const docs = (data.docs || []).filter(d => d.cover_i && d.title && translit(d.title).split(' ').some(w => titleQuery.split(' ').some(q => w === q && q.length > 3)));
      for (const doc of docs.slice(0, 2)) results.push({ id: book.id, wanted: book.title, author: book.author, found: doc.title, by: doc.author_name, cover_i: doc.cover_i, year: doc.first_publish_year });
    } catch {}
  }
}
await Promise.all(Array.from({ length: 5 }, worker));
console.log(JSON.stringify(results.sort((a,b)=>a.id-b.id), null, 2));

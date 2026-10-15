import fs from 'node:fs/promises';
const books=JSON.parse(await fs.readFile('src/data/russian-batch-100.json','utf8')).filter(b=>b.coverKind!=='edition');
const norm=s=>String(s||'').toLowerCase().replace(/¸/g,'å').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const tokens=s=>norm(s).split(/\s+/).filter(x=>x.length>3);
const results=[]; let next=0;
async function worker(){while(next<books.length){const b=books[next++]; const title=b.title.replace(/\s*[—–-].*$/,''); const author=b.author.split(';')[0];
try{const u='https://openlibrary.org/search.json?'+new URLSearchParams({title,author,fields:'title,author_name,cover_i,first_publish_year',limit:'5'}); const r=await fetch(u); if(!r.ok)continue; const j=await r.json(); const ts=tokens(title); for(const d of j.docs||[]){const dt=tokens(d.title); const overlap=ts.filter(x=>dt.includes(x)).length/Math.max(1,ts.length); if(d.cover_i&&overlap>=0.5)results.push({id:b.id,wanted:b.title,author,found:d.title,by:d.author_name,cover_i:d.cover_i,year:d.first_publish_year,overlap});}}catch{}}
}
await Promise.all(Array.from({length:8},worker));
console.log(JSON.stringify(results.sort((a,b)=>b.overlap-a.overlap),null,2));

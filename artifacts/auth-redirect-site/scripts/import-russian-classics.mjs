/** Import complete Russian public-domain works with explicitly marked PD-old-70 sources. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { extractWikisourceText } from './wikisource-text.mjs';
import { coverSvg } from './generate-illustrated-covers.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicBooks = path.join(root, 'public/books');
const sourceArchive = path.join(root, 'source-cache/books/sources');
const manifestPath = path.join(root, 'src/data/russian-classics.json');
const provenancePath = path.join(publicBooks, 'wikisource-provenance.json');
const hash = value => createHash('sha256').update(value).digest('hex');
const normalize = value => value.toLocaleLowerCase().normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu, '');

// Keep the hand-curated, cited title list beside the existing proven import
// metadata. Reading it also makes repairs and interrupted reruns repeatable.
const sourceManifest = await readFile(path.join(root, 'scripts/import-classics.py'), 'utf8');
const rows = [...sourceManifest.matchAll(/^\s*\((\d+),'([^']+)','([^']+)','([^']+)','ru',(\d+),'([^']*)','([^']+)','([^']+)'\),$/gm)];
if (rows.length < 1) throw Error(`Expected at least one hand-picked Russian source; found ${rows.length}`);
const specs = rows.map(m => ({ id: Number(m[1]), slug: m[2], title: m[3], author: m[4], year: Number(m[5]), summary: m[6], sourceTitle: m[7], color: m[8] }));
const readJson = async (file, fallback) => { try { return JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return fallback; throw error; } };
const classics = await readJson(manifestPath, []);
const oldCatalogue = await readJson(path.join(root, 'src/data/catalogue.json'), []);
const firstBatch = await readJson(path.join(root, 'src/data/gutenberg.json'), []);
const colors = ['#183c50', '#55392e', '#394c3a', '#753e45', '#284d62', '#42604e'];
const knownTitles = new Set([...classics, ...oldCatalogue, ...firstBatch].map(book => normalize(book.title)));
// Supplement the hand-picked set from Wikisource's public-domain novel and
// short-story indexes so the import can reach its target without inventing
// titles or substituting synthetic reading text.
let dynamicId = 42000;
for (const category of ['\u0420\u043e\u043c\u0430\u043d\u044b', '\u0420\u0430\u0441\u0441\u043a\u0430\u0437\u044b']) {
  let continuation = null;
  for (let batch = 0; batch < 4; batch++) {
    const api = new URL('https://ru.wikisource.org/w/api.php');
    const params = { action: 'query', list: 'categorymembers', cmtitle: '\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f:' + category, cmlimit: '500', cmnamespace: '0', format: 'json' };
    if (continuation) params.cmcontinue = continuation;
    api.search = new URLSearchParams(params).toString();
    const response = await fetch(api, { signal: AbortSignal.timeout(45000), headers: { 'User-Agent': 'LibraryCatalogue/1.0 (public-domain reader; contact: maintainer@example.com)' } });
    if (!response.ok) throw Error('Wikisource category HTTP ' + response.status);
    const data = await response.json();
    for (const page of data.query?.categorymembers || []) {
      const match = page.title.match(/^(.+?)\s*\(([^()]+)\)(?:\/.*)?$/);
      if (!match) continue;
      const title = match[1].replace(/^\u00ab|\u00bb$/g, '').trim();
      const author = match[2].trim();
      const sourceTitle = page.title;
      const slug = 'ru-ws-' + dynamicId;
      if (knownTitles.has(normalize(title)) || specs.some(spec => normalize(spec.title) === normalize(title))) continue;
      specs.push({ id: dynamicId++, slug, title, author, year: null, summary: '\u041f\u043e\u043b\u043d\u044b\u0439 \u0442\u0435\u043a\u0441\u0442 \u043f\u0440\u043e\u0438\u0437\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u00ab' + title + '\u00bb \u0430\u0432\u0442\u043e\u0440\u0430 ' + author + ' \u0438\u0437 \u0440\u0443\u0441\u0441\u043a\u043e\u0439 \u0412\u0438\u043a\u0438\u0442\u0435\u043a\u0438; \u0441\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u043e\u0431 \u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0435 \u043f\u0440\u0438\u0432\u0435\u0434\u0435\u043d\u044b \u043d\u0438\u0436\u0435.', sourceTitle, color: colors[dynamicId % colors.length] });
    }
    continuation = data.continue?.cmcontinue || null;
    if (!continuation) break;
  }
}
const records = await readJson(provenancePath, []);
// 552 English public-domain works are already in the catalogue. These 547
// Wikisource additions bring the Russian total to the same level once the
// existing Russian titles in the other manifests and featured books are counted.
const target = 547;

async function save() {
  await writeFile(manifestPath, JSON.stringify(classics, null, 2) + '\n');
  await writeFile(provenancePath, JSON.stringify(records, null, 2) + '\n');
  const lines = ['# Источники русских классических произведений','',
    'Викитека указывает PD-old-70 для каждого включённого произведения; страницы лицензирования оговаривают срок охраны авторского права для оригинала и перевода. Транскрипция Викитеки распространяется под CC BY-SA 4.0. Сохранены ссылка на первоисточник, версия страницы, полный исходный HTML и SHA-256. Постраничный текст является техническим преобразованием транскрипции и распространяется под CC BY-SA 4.0.',
    'Обложки — оригинальные векторные оформления каталога, а не сканы исторических обложек.',''];
  for (const book of classics) {
    const record = records.find(item => item.bookId === book.id);
    if (record) lines.push(`## ${book.title} — ${book.author}`,`Источник: ${book.sourceUrl}`,
      `Читательские страницы: ${book.textPath}`,`Контрольная сумма HTML: ${record.originalSha256}`,
      `Знаков: ${record.characters}; страниц: ${record.pages}`,'');
  }
  await writeFile(path.join(publicBooks,'WIKISOURCE-SOURCES.md'), lines.join('\n'));
}

let lastRequest = 0;
async function getWikiPage(sourceTitle) {
  const url = new URL('https://ru.wikisource.org/w/api.php');
  url.search = new URLSearchParams({ action:'parse', page:sourceTitle.replaceAll(' ','_'), prop:'text|categories', disablelimitreport:'1', format:'json', maxlag:'5' }).toString();
  for (let attempt=0; attempt<4; attempt++) {
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 2000-(Date.now()-lastRequest))));
    lastRequest=Date.now();
    const response=await fetch(url,{signal:AbortSignal.timeout(45000),headers:{'User-Agent':'LibraryCatalogue/1.0 (public-domain reader; contact: library-maintainer@example.invalid)'}});
    const raw=await response.text();
    if (response.status===429 || response.status===503) { await new Promise(resolve => setTimeout(resolve,(attempt+1)*8000)); continue; }
    if (!response.ok) throw Error(`Wikisource HTTP ${response.status}`);
    const parsed=JSON.parse(raw);
    if (parsed.error) throw Error(parsed.error.info || parsed.error.code);
    const html=parsed.parse?.text?.['*'];
    const categories=(parsed.parse?.categories||[]).map(category=>category['*']);
    if (!html || !categories.includes('PD-old-70')) throw Error('Source page is missing PD-old-70 rights metadata');
    return {html,revid:parsed.parse.revid||null,title:parsed.parse.title||sourceTitle,url:`https://ru.wikisource.org/wiki/${encodeURIComponent(sourceTitle.replaceAll(' ','_'))}`};
  }
  throw Error('Wikisource rate limit; rerun importer after a short wait');
}

async function makeBook(spec) {
  const existing=classics.find(book=>book.id===spec.id);
  if (existing) return null;
  const cachedHtmlPath=path.join(sourceArchive,`${spec.slug}.html`);
  const cachedPagesPath=path.join(publicBooks,`${spec.slug}.json.gz`);
  let source, body, pages;
  try {
    const html=await readFile(cachedHtmlPath,'utf8');
    pages=JSON.parse(gunzipSync(await readFile(cachedPagesPath)).toString('utf8'));
    body=extractWikisourceText(html);
    source={html,revid:null,title:spec.sourceTitle,url:`https://ru.wikisource.org/wiki/${encodeURIComponent(spec.sourceTitle.replaceAll(' ','_'))}`};
  } catch(error) {
    if (error.code !== 'ENOENT') throw error;
    source=await getWikiPage(spec.sourceTitle);
    body=extractWikisourceText(source.html);
  }
  if (body.length<4000) throw Error(`Source has only ${body.length} readable characters`);
  if (!pages) {
    pages=[];
    let remaining=body;
    while(remaining.length){
      let end=Math.min(remaining.length,800);
      if(end<remaining.length){const boundary=remaining.lastIndexOf('\n\n',end);if(boundary>400)end=boundary;else{const space=remaining.lastIndexOf(' ',end);if(space>400)end=space;}}
      const pageText=remaining.slice(0,end).trim();
      if(pageText) pages.push({kicker:spec.title,title:pages.length?'':'\u041f\u043e\u043b\u043d\u044b\u0439 \u0442\u0435\u043a\u0441\u0442',text:pageText});
      remaining=remaining.slice(end).trimStart();
    }
    if(pages.map(page=>page.text).join('').replace(/\s/gu,'')!==body.replace(/\s/gu,'')) throw Error('Pagination lost text');
    await mkdir(sourceArchive,{recursive:true});
    await writeFile(cachedHtmlPath,source.html);
    await writeFile(cachedPagesPath,gzipSync(Buffer.from(JSON.stringify(pages))));
  }
  const slug=spec.slug, origPath=cachedHtmlPath;
  const raw=await readFile(origPath);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><rect width="600" height="900" fill="${spec.color}"/><rect x="24" y="24" width="552" height="852" fill="none" stroke="#d6bb80" stroke-width="2"/><circle cx="300" cy="430" r="76" fill="none" stroke="#d6bb80" stroke-width="2"/><path d="M90 510 Q300 410 510 510 M90 534 Q300 434 510 534 M90 558 Q300 458 510 558" fill="none" stroke="#d6bb80" stroke-width="2" opacity=".65"/><text x="300" y="115" fill="#d6bb80" font-family="Georgia,serif" font-size="18" text-anchor="middle" letter-spacing="5">РУССКАЯ КЛАССИКА</text><text x="300" y="235" fill="#fff3d7" font-family="Georgia,serif" font-size="38" text-anchor="middle">${spec.title.replaceAll('&','&amp;').replaceAll('<','&lt;')}</text><path d="M205 680h190" stroke="#d6bb80"/><text x="300" y="750" fill="#f2dfb4" font-family="Georgia,serif" font-size="24" text-anchor="middle">${spec.author.replaceAll('&','&amp;').replaceAll('<','&lt;')}</text></svg>`;
  await writeFile(path.join(publicBooks,'covers',`${slug}.svg`),svg);
  const sourceUrl=source.revid?`${source.url}?oldid=${source.revid}`:source.url;
  const item={id:spec.id,title:spec.title,author:spec.author,category:'Художественная литература',price:0,
    spine:spec.color,summary:spec.summary,pages:[],language:'ru',publicationYear:spec.year,pageCount:pages.length,
    textPath:`books/${slug}.json.gz`,sourceArchivePath:`source-cache/books/sources/${slug}.html`,coverImage:`books/covers/catalog-art-${spec.id}.svg`,
    coverKind:'catalog-art',coverEdition:'Созданная обложка библиотеки; не является сканом исторического издания.',
    sourceUrl,sourceName:'Викитека',sourceLicense:'Общественное достояние (PD-old-70); транскрипция — CC BY-SA 4.0',rightsPath:'books/WIKISOURCE-SOURCES.md',excerpt:body.slice(0,400)};
  await writeFile(path.join(publicBooks,'covers',`catalog-art-${spec.id}.svg`),coverSvg(item),'utf8');
  return {book:item,record:{bookId:item.id,title:item.title,sourceUrl,sourceName:'Викитека',revision:source.revid,
    originalSha256:hash(raw),bodySha256:hash(body),characters:body.length,pages:pages.length}};
}

const results=new Map(classics.map(book=>[book.id,{book,record:records.find(record=>record.bookId===book.id)}]));
const candidates=specs.filter(spec=>!knownTitles.has(normalize(spec.title))&&!results.has(spec.id));
let cursor=0;let failures=0;let finished=0;
async function worker(){
  while(results.size<target && cursor<candidates.length){
    const spec=candidates[cursor++];
    try{
      const result=await makeBook(spec);
      if(result){
        if(knownTitles.has(normalize(result.book.title))){console.log(`DUPLICATE ${result.book.title}`);continue;}
        results.set(spec.id,result);knownTitles.add(normalize(result.book.title));
      }
      finished++;
      if(result)console.log(`${results.size-classics.length}/${target} RU ${spec.title} (${result.record.characters} знаков)`);
    }catch(error){failures++;console.log(`SKIP ${spec.title}: ${error.message}`);}
  }
}
await Promise.all(Array.from({length:4},worker));
if(results.size<target) throw Error(`Imported ${results.size}/${target} Russian works; ${failures} skipped. Retry to fetch more source pages.`);
const ordered=specs.map(spec=>results.get(spec.id)).filter(Boolean).slice(0,target);
classics.splice(0,classics.length,...ordered.map(result=>result.book));
records.splice(0,records.length,...ordered.map(result=>result.record).filter(Boolean));
await save();
console.log(`Complete: ${classics.length} Russian classics available offline.`);

"""Import complete public-domain works. Run from any directory; uses only Python stdlib.
Original downloads are retained; SOURCES.md records provenance and transformations.
"""
from pathlib import Path
from html.parser import HTMLParser
from html import escape
import urllib.request, urllib.parse, json, re, hashlib, concurrent.futures, sys, textwrap, zipfile, io
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/books'
RAW=OUT/'sources'
COVERS=OUT/'covers'
ARCHIVES=ROOT/'.catalog-sources'
ARCHIVES.mkdir(exist_ok=True)
for p in (OUT,RAW,COVERS): p.mkdir(parents=True,exist_ok=True)
# Stable, new IDs prevent old demonstration bookmarks/likes from attaching to other works.
SPECS=[
(31001,'white-nights','Белые ночи','Фёдор Достоевский','ru',1848,'Романтическая история петербургского мечтателя и Настеньки: четыре ночи надежды, разговоров и первой любви.','Белые ночи (Достоевский)','#183c50'),
(31002,'overcoat','Шинель','Николай Гоголь','ru',1842,'Повесть об Акакии Акакиевиче, его новой шинели и равнодушии большого города.','Шинель (Гоголь)/ПСС 1938 (СО)','#55392e'),
(31003,'mumu','Муму','Иван Тургенев','ru',1854,'История крепостного дворника Герасима, его привязанности к маленькой собаке и жестокой власти барыни.','Муму (Тургенев)','#394c3a'),
(31004,'asya','Ася','Иван Тургенев','ru',1858,'Встреча на берегу Рейна становится для молодого путешественника воспоминанием о любви и упущенном счастье.','Ася (Тургенев)','#753e45'),
(31005,'alice','Alice’s Adventures in Wonderland','Lewis Carroll','en',1865,'Follow Alice down the rabbit hole into a world of curious creatures, impossible conversations and playful logic.',11,'#284d62'),
(31006,'pride-prejudice','Pride and Prejudice','Jane Austen','en',1813,'Elizabeth Bennet and Mr Darcy confront first impressions, family expectations and their own pride.',1342,'#42604e'),
(31007,'sherlock-holmes','The Adventures of Sherlock Holmes','Arthur Conan Doyle','en',1892,'Twelve detective stories featuring Sherlock Holmes and Dr Watson, from a scandal in Bohemia to the mystery of the copper beeches.',1661,'#4a3547'),
(31008,'treasure-island','Treasure Island','Robert Louis Stevenson','en',1883,'A map, a voyage and a dangerous crew lead young Jim Hawkins into a classic adventure of pirates and buried treasure.',120,'#72502e'),
(31009,'eskendir','Ескендір','Абай Құнанбайұлы','kk',None,'Ескендірдің тойымсыздығы мен Аристотельдің даналығы туралы поэма. Адамның ашкөздігі мен қанағат жайындағы ойлар.','Ескендір','#255d58'),
(31010,'masgut','Масғұт','Абай Құнанбайұлы','kk',1887,'Ақыл, байлық және адамдық туралы таңдау жасайтын Масғұттың хикаясы. Абайдың толық поэмасы.','Масғұт','#775032'),
(31011,'analects','論語','孔子及其弟子','zh',None,'記錄孔子及其弟子的言行，探討學習、仁德、禮與君子之道。中文原文。',23839,'#663b35'),
(31012,'tao-te-ching','道德經','老子','zh',None,'以八十一章論述道與德、自然與無為，是中國古典思想的重要著作。中文原文。',7337,'#314b48'),
]
def download(url,path):
 if path.exists(): return path.read_bytes()
 req=urllib.request.Request(url,headers={'User-Agent':'LibraryCatalogue/1.0'})
 for attempt in range(3):
  try:
   with urllib.request.urlopen(req,timeout=45) as r: data=r.read()
   break
  except Exception:
   if attempt == 2: raise
 path.write_bytes(data)
 return data
class Node:
 def __init__(self,tag='',attrs=(),parent=None):self.tag=tag;self.attrs=dict(attrs);self.children=[];self.parent=parent
 def walk(self):
  yield self
  for c in self.children:
   if isinstance(c,Node):yield from c.walk()
 def text(self):
  if self.tag=='br':return '\n'
  if self.tag in ('script','style','sup') or 'mw-editsection' in self.attrs.get('class',''):return ''
  return ''.join(c.text() if isinstance(c,Node) else c for c in self.children)
class Parser(HTMLParser):
 def __init__(self):super().__init__();self.root=Node();self.current=self.root
 def handle_starttag(self,tag,attrs):
  n=Node(tag,attrs,self.current);self.current.children.append(n)
  if tag not in ('br','img','meta','link','hr','input','wbr','source'):self.current=n
 def handle_endtag(self,tag):
  n=self.current
  while n.parent:
   if n.tag==tag:self.current=n.parent;break
   n=n.parent
 def handle_data(self,s):self.current.children.append(s)
def wiki_text(raw,lang):
 p=Parser();p.feed(raw)
 main=next(n for n in p.root.walk() if 'mw-parser-output' in n.attrs.get('class','').split())
 if lang=='kk':
  poems=[n for n in main.walk() if 'poem' in n.attrs.get('class','').split()]
  assert poems,'Missing poem'
  return '\n\n'.join(n.text().strip() for n in poems)
 blocks=[]
 for n in main.walk():
  if n.tag not in ('p','h2','h3'):continue
  parent=n.parent;skip=False
  while parent and parent!=main:
   classes=parent.attrs.get('class','')
   if parent.tag in ('table','nav') or any(x in classes for x in ('license','metadata','references','ws-noexport','catlinks','noprint')):skip=True
   parent=parent.parent
  if skip:continue
  t=n.text().strip()
  if t in ('Примечания','Ссылки','Источники','См. также'):break
  if t:blocks.append(t)
 return '\n\n'.join(blocks)
def paginate(text,lang,title):
 # Preserve all characters other than whitespace. Never truncate long paragraphs.
 limit=380 if lang=='zh' else 800
 chunks=[];remaining=text.strip()
 while remaining:
  if len(remaining)<=limit:chunks.append(remaining);break
  end=remaining.rfind('\n\n',int(limit*.5),limit+1)
  if end<0:end=remaining.rfind(' ',int(limit*.5),limit+1)
  if end<0:end=limit
  chunks.append(remaining[:end].strip());remaining=remaining[end:].lstrip()
 assert re.sub(r'\s','',text)==re.sub(r'\s','',''.join(chunks))
 label={'ru':'Полный текст','en':'Complete text','kk':'Толық мәтін','zh':'全文'}[lang]
 return [dict(kicker=title,title=label if i==0 else '',text=s) for i,s in enumerate(chunks)]
def svg_cover(title,author,lang,color,idx):
 # Native vector edition cover: live SVG typography, no raster enlargement.
 width=14 if lang in ('ru','kk') else 18
 lines=[title] if lang=='zh' else textwrap.wrap(title,width=width,break_long_words=False)
 size=66 if lang=='zh' else 44
 title_svg=''.join(f'<tspan x="300" dy="{0 if i==0 else 55}">{escape(line)}</tspan>' for i,line in enumerate(lines))
 author_lines=textwrap.wrap(author,width=24,break_long_words=False)
 author_svg=''.join(f'<tspan x="300" dy="{0 if i==0 else 31}">{escape(line)}</tspan>' for i,line in enumerate(author_lines))
 # Engraved moon, horizon and flowing lines evoke classic literary bindings.
 return f'''<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><rect width="600" height="900" fill="{color}"/><rect x="24" y="24" width="552" height="852" rx="3" fill="none" stroke="#d6bb80" stroke-width="2"/><rect x="34" y="34" width="532" height="832" fill="none" stroke="#d6bb80" stroke-opacity=".35"/><path d="M80 508 Q300 390 520 508 M80 525 Q300 407 520 525 M80 542 Q300 424 520 542 M80 559 Q300 441 520 559" fill="none" stroke="#d6bb80" stroke-width="2" opacity=".6"/><circle cx="300" cy="418" r="64" fill="none" stroke="#d6bb80" stroke-width="2"/><circle cx="300" cy="418" r="49" fill="none" stroke="#d6bb80" stroke-opacity=".4"/><path d="M300 340v-18m0 192v-18m-78-78h-18m192 0h-18" stroke="#d6bb80"/><text x="300" y="106" fill="#d6bb80" font-family="Georgia,serif" font-size="20" text-anchor="middle" letter-spacing="5">{lang.upper()} · {idx:02d}</text><text x="300" y="190" fill="#fff3d7" font-family="Georgia,serif" font-size="{size}" text-anchor="middle">{title_svg}</text><path d="M210 650h180" stroke="#d6bb80"/><text x="300" y="714" fill="#f2dfb4" font-family="Georgia,serif" font-size="25" text-anchor="middle">{author_svg}</text><path d="M285 804l15-12 15 12-15 12z" fill="none" stroke="#d6bb80"/></svg>'''
def build(spec):
 ident,slug,title,author,lang,year,summary,source,color=spec
 pg=isinstance(source,int)
 url=f'https://www.gutenberg.org/ebooks/{source}' if pg else 'https://'+('wikisource.org' if lang=='kk' else 'ru.wikisource.org')+'/wiki/'+urllib.parse.quote(source.replace(' ','_'))
 if pg:
  raw=download(f'https://www.gutenberg.org/cache/epub/{source}/pg{source}.txt',RAW/f'{slug}.txt')
  original=raw.decode('utf-8-sig').replace('\r\n','\n')
  start=re.search(r'\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*',original,re.S)
  end=re.search(r'\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK',original)
  assert start and end,slug+' missing Gutenberg delimiters'
  body=original[start.end():end.start()].strip()
  if lang=='zh':
   marker='學而第一' if source==23839 else '老子《道德經》'
   body=body[body.index(marker):]
  # Join line-wrapped prose, keeping paragraph boundaries.
  if lang!='zh':body='\n\n'.join(re.sub(r'(?<!\n)\n(?!\n)',' ',p) for p in re.split(r'\n\s*\n',body))
 else:
  raw=download(url,RAW/f'{slug}.html');body=wiki_text(raw.decode('utf-8'),lang)
 body=body.replace('\u00a0',' ')
 assert len(body)>4000,(slug,len(body))
 pages=paginate(body,lang,title)
 (OUT/f'{slug}.json').write_text(json.dumps(pages,ensure_ascii=False),encoding='utf-8')
 (OUT/f'{slug}.txt').write_text(body,encoding='utf-8')
 cover=COVERS/f'{slug}.svg';cover.write_text(svg_cover(title,author,lang,color,ident-31000),encoding='utf-8')
 cover_source='Original vector cover created for this library; not a facsimile of a publisher edition.'
 if pg and lang=='en' and source != 1342:
  try:
   epub=download(f'https://www.gutenberg.org/ebooks/{source}.epub3.images',ARCHIVES/f'{slug}.epub')
   z=zipfile.ZipFile(io.BytesIO(epub));matches=[n for n in z.namelist() if re.search(r'(cover|titlepage).*\.(jpg|jpeg|png)$',n,re.I)]
   if matches:
    name=max(matches,key=lambda n:z.getinfo(n).file_size);cover=COVERS/(slug+Path(name).suffix);cover.write_bytes(z.read(name));cover_source=f'Project Gutenberg EPUB: {name}'
  except Exception as e:print('Cover fallback:',slug,str(e))
 item=dict(id=ident,title=title,author=author,category='Художественная литература' if lang!='zh' else 'Философия',price=0,spine=color,summary=summary,pages=[],language=lang,publicationYear=year,pageCount=len(pages),textPath=f'books/{slug}.json',downloadPath=f'books/{slug}.txt',coverImage=f'books/covers/{cover.name}',sourceUrl=url,sourceName='Project Gutenberg' if pg else 'Wikisource',sourceLicense='Public domain · Project Gutenberg' if pg else 'Public domain text · Wikisource contributors, CC BY-SA 4.0',excerpt=pages[0]['text'][:400])
 provenance=dict(slug=slug,url=url,originalSha256=hashlib.sha256(raw).hexdigest(),characters=len(body),pages=len(pages),cover=cover_source)
 print(slug,len(body),len(pages),'START',body[:100].replace('\n',' / '),'END',body[-130:].replace('\n',' / '),flush=True)
 return item,provenance
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:result=list(pool.map(build,SPECS))
 catalog=[r[0] for r in result];provenance=[r[1] for r in result]
 (ROOT/'src/data/catalogue.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf-8')
 (OUT/'provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2),encoding='utf-8')
 lines=['# Catalogue sources','', 'Complete original-language public-domain works. No modern translations are used. Original Gutenberg files retain their license. Wikisource transcription attribution: linked source pages and contributors (CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/).','', 'Reader transformations: HTML navigation and source editorial notes removed, nonbreaking spaces normalized, Gutenberg line-wrapped prose reflowed, text split into reading pages without removing non-whitespace characters. Original text/HTML downloads in sources/, EPUB cover archives in .catalog-sources/; checksums in provenance.json.','', 'Covers: original vector edition designs; Alice, Sherlock Holmes and Treasure Island use cover images extracted from their Gutenberg EPUB archives.','']
 for b,p in result:lines.extend([f"## {b['title']} — {b['author']}",f"Language: {b['language']}. Source: {b['sourceUrl']}",f"Cover: {p['cover']}",f"Characters: {p['characters']}; reading pages: {p['pages']}",''])
 (OUT/'SOURCES.md').write_text('\n'.join(lines),encoding='utf-8')
 print('Imported',len(catalog),'complete works')
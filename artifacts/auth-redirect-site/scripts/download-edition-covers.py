from pathlib import Path
import urllib.request,concurrent.futures,sys,json,hashlib
sys.stdout.reconfigure(encoding='utf-8')
root=Path('C:/Users/TigayS/Desktop/library-main/artifacts/auth-redirect-site')
items={
'white-nights':('https://cdn.ast.ru/v2/ASE000000000875081/COVER/cover1__w820.jpg','https://ast.ru/book/belye-nochi-875081/','АСТ · ISBN 978-5-17-158450-4'),
'overcoat':('https://content.img-gorod.ru/pim/products/images/c0/2d/018ee7a1-79e0-7f82-bdbd-f3831e39c02d.jpg','https://www.chitai-gorod.ru/product/shinel-2901892','Стрекоза · ISBN 978-5-9951-5175-3'),
'mumu':('https://cdn.ast.ru/v2/AST000000000173593/COVER/cover1__w820.jpg','https://ast.ru/book/mumu-173593/','АСТ · ISBN 978-5-17-087185-8'),
'asya':('https://cdn.litres.ru/pub/c/cover/72452512.jpg','https://www.litres.ru/book/ivan-turgenev/asya-72452512/','Литрес: Классика'),
'pride-prejudice':('https://www.gutenberg.org/files/1342/1342-h/images/cover.jpg','https://www.gutenberg.org/ebooks/1342','George Allen · 1894 · Hugh Thomson'),
'eskendir':('https://simg.marwin.kz/media/catalog/product/cache/8d1771fdd19ec2393e47701ba45e606d/_/_/abay_nanbaev_eskendr.jpg','https://www.meloman.kz/calssics-in-kazakh-language/abaj-nanbaev-eskendir.html','RS · ISBN 978-601-7983-22-2'),
'masgut':('https://www.litres.ru/pub/c/cover/22578974.jpg','https://www.litres.ru/book/abay-nanbay-ly/masgut-22578974/','Литрес · 2017'),
'analects':('https://www.moscowbooks.ru/image/book/830/orig/i830878.jpg','https://www.moscowbooks.ru/book/1217519/','АСТ · ISBN 978-5-17-169049-6'),
 'tao-te-ching':('https://image12.bookschina.com/2018/20180515/7577861.jpg','https://www.bookschina.com/7577861.htm','吉林美术出版社'),
}
out=root/'public/books/covers'
def download(item):
 slug,(url,source,edition)=item
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
  with urllib.request.urlopen(req,timeout=30) as res:data=res.read()
  assert data[:3]==b'\xff\xd8\xff',(slug,'Not a JPEG')
  assert len(data)>5000,(slug,'Suspiciously small image')
  (out/(slug+'-edition.jpg')).write_bytes(data)
  print(slug,len(data),'OK',flush=True)
  return slug,dict(file='books/covers/'+slug+'-edition.jpg',imageUrl=url,sourceUrl=source,edition=edition,sha256=hashlib.sha256(data).hexdigest())
 except Exception as error:print(slug,'FAILED',str(error),flush=True);return slug,None
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=dict(pool.map(download,items.items()))
(root/'.catalog-sources/edition-covers.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
const urls = [
 'https://books.google.com/books?id=O71qCwAAQBAJ',
 'https://fantlab.ru/edition148244',
 'https://ast.ru/book/gryadushchaya-rasa-890617/',
 'https://www.chitai-gorod.ru/product/v-lesah-tom-ii-3097461',
];
for (const url of urls) try {
 const r = await fetch(url, {headers:{'user-agent':'Mozilla/5.0'}}); const html = await r.text();
 const images=[...html.matchAll(/(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)/gi)].map(x=>x[1]);
 const candidates=[...html.matchAll(/(?:src|data-src)=["']([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)["']/gi)].map(x=>x[1]);
 console.log(JSON.stringify({url,status:r.status,images:images.slice(0,3),candidates:candidates.slice(0,5),size:html.length}));
} catch(e) { console.log(JSON.stringify({url,error:e.message})); }

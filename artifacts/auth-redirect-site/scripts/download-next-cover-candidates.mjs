const items = [
 ['dvav-ivana', 'https://books.google.com/books/content?id=O71qCwAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api'],
 ['eight-clock', 'https://fantlab.ru/images/editions/big/148244?r=1635156808'],
 ['future-race', 'https://cdn.ast.ru/v2/ASE000000000890617/COVER/cover1__w600.jpg'],
 ['forest-book-2', 'https://content.img-gorod.ru/pim/products/images/1c/04/019bfe0e-9d67-7cb7-be81-ca42f2211c04.jpg'],
 ['brynsky-forest', 'https://content.img-gorod.ru/pim/products/images/c2/f3/018edb2a-0ff8-7371-8a75-45425759c2f3.jpg'],
 ['swanns-way', 'https://api.azbooka.ru/upload/iblock/549/5496d67f35721aea37f7ecd50bee617f.jpg'],
];
for (const [name,url] of items) {
 const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0'}});const b=Buffer.from(await r.arrayBuffer());
 console.log(name,r.status,r.headers.get('content-type'),b.length);
 if(r.ok&&r.headers.get('content-type')?.startsWith('image/'))await (await import('node:fs/promises')).writeFile(`public/books/covers/candidate-${name}.jpg`,b);
}

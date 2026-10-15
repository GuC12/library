import { writeFile } from 'node:fs/promises';
const candidates = [8272336,12227245,2187330,6049889,13187254,6868278];
for (const id of candidates) {
  const response = await fetch(`https://images.weserv.nl/?url=${encodeURIComponent(`covers.openlibrary.org/b/id/${id}-L.jpg`)}&default=404`);
  const bytes = Buffer.from(await response.arrayBuffer());
  console.log(id, response.status, response.headers.get('content-type'), bytes.length);
  if (response.ok && response.headers.get('content-type')?.includes('image/')) await writeFile(`public/books/covers/openlibrary-${id}.jpg`, bytes);
}

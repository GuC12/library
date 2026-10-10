import type { Book, BookPage } from '@/data/books';

const cache = new Map<string, Promise<BookPage[]>>();
export function loadBookPages(book: Book): Promise<BookPage[]> {
  if (book.pages.length || !book.textPath) return Promise.resolve(book.pages);
  const path = book.textPath;
  const cached = cache.get(path);
  if (cached) return cached;
  const request = fetch(`${import.meta.env.BASE_URL}${path}`).then(async (response) => {
    if (!response.ok) throw new Error(`Book text: HTTP ${response.status}`);
    const pages: unknown = await response.json();
    if (!Array.isArray(pages) || pages.length !== book.pageCount || !pages.every((page) =>
      page && typeof page.text === 'string' && page.text.trim() && typeof page.title === 'string' && typeof page.kicker === 'string')) {
      throw new Error('Incomplete book text');
    }
    return pages as BookPage[];
  }).catch((error) => { cache.delete(path); throw error; });
  cache.set(path, request);
  return request;
}

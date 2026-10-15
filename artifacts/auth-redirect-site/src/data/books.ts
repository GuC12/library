export type BookPage = {
  kicker: string;
  title: string;
  text: string;
  /** Optional: path to a rendered page image (used instead of text rendering). */
  pageImage?: string;
};

export type BookPublicationStatus = 'draft' | 'queued' | 'publishing' | 'published' | 'failed';

export type Book = {
  id: number;
  title: string;
  author: string;
  category: string;
  communityCategory?: string;
  price: number;
  spine: string;
  summary: string;
  pages: BookPage[];
  coverImage?: string;
  coverSourceUrl?: string;
  coverLicense?: string;
  coverEdition?: string;
  /** Distinguishes an edition scan from catalogue art or an author portrait. */
  coverKind?: 'edition' | 'portrait' | 'illustration' | 'catalog-art';
  pageCount?: number;
  textPath?: string;
  downloadPath?: string;
  /** Original source snapshot kept out of the production site's public assets. */
  sourceArchivePath?: string;
  publicationYear?: number | null;
  sourceUrl?: string;
  sourceName?: string;
  sourceLicense?: string;
  rightsPath?: string;
  excerpt?: string;
  authorAvatar?: string;
  isUserBook?: boolean;
  language?: 'ru' | 'en' | 'kk' | 'zh';
  /** Clerk user id of the reader who published the book. */
  ownerId?: string;
  likesCount?: number;
  /** Local publication state; remote books are published and this is not stored in Supabase. */
  publicationStatus?: BookPublicationStatus;
};

import curatedBooks from './curated-books.json';
import { SPECIAL_BOOK } from './special-book';
import specialReadablePages from './special-book-readable.json';
import { MISS_SHOPAHOLIC_BOOK } from './miss-shopaholic-book';

/**
 * The public catalogue intentionally contains only books with an identifiable
 * edition cover. The larger source manifests are retained for provenance and
 * verification, but author portraits and generated catalogue art are not shown
 * as if they were book covers.
 */
const sourcedEditionBooks = curatedBooks.map((entry) => ({
  ...entry,
  language: entry.language as Book['language'],
  coverKind: entry.coverKind as Book['coverKind'],
  coverImage: entry.coverImage?.startsWith('https://') ? entry.coverImage : `${import.meta.env.BASE_URL}${entry.coverImage}`,
}));

const pdfBase = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/special-book/pages`;
const specialPdfPages: BookPage[] = Array.from({ length: 18 }, (_, spreadIndex) => {
  const pdfPage = spreadIndex + 1;
  return (['left', 'right'] as const).map((side, sideIndex) => {
    const readableIndex = pdfPage >= 3 && pdfPage <= 18 ? (pdfPage - 3) * 2 + sideIndex : -1;
    return {
      kicker: '',
      title: '',
      text: readableIndex >= 0 ? specialReadablePages[readableIndex]?.text || '' : '',
      pageImage: `${pdfBase}/page_spread_${pdfPage + 1}_${side}.png`,
    };
  });
}).flat();

export const books: Book[] = [{
  ...SPECIAL_BOOK,
  coverImage: `${import.meta.env.BASE_URL.replace(/\/$/, '')}/special-book/pages/page_pdf_cover.png`,
  pages: specialPdfPages,
}, MISS_SHOPAHOLIC_BOOK, ...sourcedEditionBooks];

// Community works come from real authors, not seeded examples.
export const initialUserBooks: Book[] = [];
export function isLegacyDemoBook(book: Book): boolean {
  return !book.ownerId && [101, 102, 103, 104, 105].includes(book.id) && !book.isUserBook;
}

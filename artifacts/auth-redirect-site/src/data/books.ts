export type BookPage = {
  kicker: string;
  title: string;
  text: string;
  /** Optional: path to a rendered page image (used instead of text rendering). */
  pageImage?: string;
};

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
  pageCount?: number;
  textPath?: string;
  downloadPath?: string;
  publicationYear?: number | null;
  sourceUrl?: string;
  sourceName?: string;
  sourceLicense?: string;
  excerpt?: string;
  authorAvatar?: string;
  isUserBook?: boolean;
  language?: 'ru' | 'en' | 'kk' | 'zh';
  /** Clerk user id of the reader who published the book. */
  ownerId?: string;
  likesCount?: number;
};

import catalogue from './catalogue.json';
import { SPECIAL_BOOK } from './special-book';
import { MISS_SHOPAHOLIC_BOOK } from './miss-shopaholic-book';

export const books: Book[] = [SPECIAL_BOOK, MISS_SHOPAHOLIC_BOOK, ...catalogue.map((entry) => ({
  ...entry,
  language: entry.language as Book['language'],
  coverImage: `${import.meta.env.BASE_URL}${entry.coverImage}`,
}))];

// Community works come from real authors, not seeded examples.
export const initialUserBooks: Book[] = [];
export function isLegacyDemoBook(book: Book): boolean {
  return !book.ownerId && [101, 102, 103, 104, 105].includes(book.id) && !book.isUserBook;
}

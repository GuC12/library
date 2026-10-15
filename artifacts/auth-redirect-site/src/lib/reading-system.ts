export interface ReadingStats {
  xp: number;
  level: number;
  streakDays: number;
  lastReadDate: string; // YYYY-MM-DD
  pagesRead: number;
  booksFinished: number;
}

const STATS_KEY = 'library_reader_stats';
let activeReaderId: string | null = null;
const awardedPageFallback = new Set<string>();

export function setActiveReaderId(id: string | null): void {
  activeReaderId = id;
  if (!id || typeof window === 'undefined') return;

  // Before Clerk accounts were connected, progress lived in one browser-wide
  // key. Move that legacy record to the first signed-in account once, instead
  // of silently starting that reader at level 1.
  const migratedKey = `${STATS_KEY}:legacy-migrated`;
  try {
    if (window.localStorage.getItem(migratedKey)) return;
    const legacyRaw = window.localStorage.getItem(STATS_KEY);
    if (!legacyRaw) return;
    const accountKey = `${STATS_KEY}:${id}`;
    const legacy = JSON.parse(legacyRaw) as Partial<ReadingStats>;
    const existingRaw = window.localStorage.getItem(accountKey);
    const existing = existingRaw ? JSON.parse(existingRaw) as Partial<ReadingStats> : {};
    const xp = Math.max(Number(legacy.xp) || 0, Number(existing.xp) || 0);
    const restored: ReadingStats = {
      xp,
      level: calculateLevel(xp).level,
      streakDays: Math.max(Number(legacy.streakDays) || 1, Number(existing.streakDays) || 1),
      lastReadDate: String(existing.lastReadDate || legacy.lastReadDate || getTodayDateString()),
      pagesRead: Math.max(Number(legacy.pagesRead) || 0, Number(existing.pagesRead) || 0),
      booksFinished: Math.max(Number(legacy.booksFinished) || 0, Number(existing.booksFinished) || 0),
    };
    window.localStorage.setItem(accountKey, JSON.stringify(restored));
    window.localStorage.setItem(migratedKey, id);
    // Keep a recovery copy while preventing guest mode or another account
    // from displaying the old shared progress.
    window.localStorage.setItem(`${STATS_KEY}:legacy-backup`, legacyRaw);
    window.localStorage.removeItem(STATS_KEY);
  } catch {
    // If storage is unavailable, keep the original record and continue safely.
  }
}

function statsKey(): string {
  return activeReaderId ? `${STATS_KEY}:${activeReaderId}` : STATS_KEY;
}

/** Опыт за публикацию книги: база + награда за каждую страницу. */
export const BOOK_XP_BASE = 40;
export const BOOK_XP_PER_PAGE = 15;

/** Чем больше страниц в книге, тем больше опыта получает автор. */
export function xpForBookPages(pagesCount: number): number {
  const safeCount = Number.isFinite(pagesCount) ? Math.max(1, Math.floor(pagesCount)) : 1;
  return BOOK_XP_BASE + safeCount * BOOK_XP_PER_PAGE;
}

/** Award XP once per page per account, including across browser reloads. */
export function awardUniqueReadingPages(bookId: number, pageIndexes: number[]): { stats: ReadingStats; leveledUp: boolean; gainedXp: number; awardedPages: number } {
  const storageKey = `library-reading-pages:${activeReaderId || 'guest'}`;
  let awarded: Record<string, number[]> = {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || '{}') as Record<string, unknown>;
    awarded = Object.fromEntries(Object.entries(parsed).map(([id, pages]) => [
      id,
      Array.isArray(pages) ? pages.filter((page): page is number => Number.isSafeInteger(page) && page >= 0) : [],
    ]));
  } catch { /* Use the in-memory guard when storage is unavailable. */ }

  const bookKey = String(bookId);
  const known = new Set([...(awarded[bookKey] || []), ...[...awardedPageFallback].filter((key) => key.startsWith(`${storageKey}:${bookKey}:`)).map((key) => Number(key.split(':').at(-1)))]);
  const unique = [...new Set(pageIndexes.filter((page) => Number.isSafeInteger(page) && page >= 0))].filter((page) => !known.has(page));
  if (!unique.length) return { stats: getStoredReadingStats(), leveledUp: false, gainedXp: 0, awardedPages: 0 };

  const next = [...known, ...unique].sort((a, b) => a - b);
  awarded[bookKey] = next;
  for (const page of unique) awardedPageFallback.add(`${storageKey}:${bookKey}:${page}`);
  try { window.localStorage.setItem(storageKey, JSON.stringify(awarded)); } catch { /* In-memory guard still prevents repeats in this session. */ }

  const result = addReadingXp(unique.length * BOOK_XP_PER_PAGE, true, unique.length);
  return { ...result, awardedPages: unique.length };
}

// Опыт, необходимый для каждого следующего уровня: уровень * 100 XP
export function calculateLevel(xp: number): { level: number; currentXp: number; nextLevelXp: number; progress: number } {
  let level = 1;
  let needed = 100;
  let remainingXp = Math.max(0, xp || 0);

  while (remainingXp >= needed) {
    remainingXp -= needed;
    level += 1;
    needed = level * 100;
  }

  const progress = Math.min(100, Math.round((remainingXp / needed) * 100));

  return {
    level,
    currentXp: remainingXp,
    nextLevelXp: needed,
    progress,
  };
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const EMPTY_STATS: ReadingStats = {
  xp: 0,
  level: 1,
  streakDays: 1,
  lastReadDate: '',
  pagesRead: 0,
  booksFinished: 0,
};

export function saveStoredReadingStats(stats: ReadingStats): ReadingStats {
  if (typeof window === 'undefined') return stats;
  try {
    window.localStorage.setItem(statsKey(), JSON.stringify(stats));
  } catch {
    // Приватный режим или переполнение хранилища — просто продолжаем работу.
  }
  return stats;
}

export function getStoredReadingStats(): ReadingStats {
  if (typeof window === 'undefined') {
    return { ...EMPTY_STATS, lastReadDate: getTodayDateString() };
  }

  try {
    const raw = window.localStorage.getItem(statsKey());
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ReadingStats>;
      const normalized: ReadingStats = {
        xp: Number(parsed.xp) || 0,
        level: Number(parsed.level) || calculateLevel(Number(parsed.xp) || 0).level,
        streakDays: Number(parsed.streakDays) || 1,
        lastReadDate: parsed.lastReadDate || getTodayDateString(),
        pagesRead: Number(parsed.pagesRead) || 0,
        booksFinished: Number(parsed.booksFinished) || 0,
      };
      // Уровень всегда пересчитывается из опыта, чтобы данные не разъезжались.
      normalized.level = calculateLevel(normalized.xp).level;
      return normalized;
    }
  } catch {
    // Повреждённые данные — начнём заново.
  }

  const initial: ReadingStats = { ...EMPTY_STATS, lastReadDate: getTodayDateString() };
  return saveStoredReadingStats(initial);
}

export function addReadingXp(amount: number, isNewPage = true, pagesRead = isNewPage ? 1 : 0): { stats: ReadingStats; leveledUp: boolean; gainedXp: number } {
  const current = getStoredReadingStats();
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  let streak = current.streakDays || 1;
  if (!current.lastReadDate) {
    streak = 1;
  } else if (current.lastReadDate === yesterday) {
    streak += 1;
  } else if (current.lastReadDate !== today) {
    // Пропущен день
    streak = 1;
  }

  const gainedXp = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  const newXp = (current.xp || 0) + gainedXp;
  const oldLevelInfo = calculateLevel(current.xp || 0);
  const newLevelInfo = calculateLevel(newXp);
  const leveledUp = newLevelInfo.level > oldLevelInfo.level;

  const updated: ReadingStats = {
    xp: newXp,
    level: newLevelInfo.level,
    streakDays: streak,
    lastReadDate: today,
    pagesRead: (current.pagesRead || 0) + Math.max(0, Math.floor(pagesRead || 0)),
    booksFinished: current.booksFinished || 0,
  };

  saveStoredReadingStats(updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('library-stats-changed', { detail: updated }));
  }

  return { stats: updated, leveledUp, gainedXp };
}

/**
 * Запись настоящего пользователя сайта для топа читателей.
 * Никаких выдуманных имён: список строится только из реальных аккаунтов,
 * которые открывали библиотеку или публиковали книги.
 */
export interface ReaderRecord {
  id: string;
  nickname: string;
  avatar: string;
  xp: number;
  level: number;
  streakDays: number;
  pagesRead: number;
  booksFinished: number;
  booksPublished: number;
  updatedAt: number;
  readingLists?: SharedReadingLists;
  isCurrentUser?: boolean;
}

export interface SharedReadingListItem {
  bookId: number;
  title: string;
  author: string;
  summary: string;
}

export interface SharedReadingLists {
  want: SharedReadingListItem[];
  reading: SharedReadingListItem[];
  done: SharedReadingListItem[];
}

export function readerRecordFromStats(
  id: string,
  nickname: string,
  avatar: string,
  stats: ReadingStats,
  booksPublished: number,
): ReaderRecord {
  return {
    id,
    nickname,
    avatar,
    xp: stats.xp,
    level: calculateLevel(stats.xp).level,
    streakDays: stats.streakDays || 1,
    pagesRead: stats.pagesRead || 0,
    booksFinished: stats.booksFinished || 0,
    booksPublished,
    updatedAt: Date.now(),
  };
}

/** Опыт, который читатель получил бы за уже опубликованные книги. */
export function xpFromPublishedBooks(books: { pages?: unknown[] }[]): number {
  return books.reduce((sum, book) => sum + xpForBookPages(Array.isArray(book.pages) ? book.pages.length : 1), 0);
}

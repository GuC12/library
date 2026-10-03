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

export function setActiveReaderId(id: string | null): void {
  activeReaderId = id;
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

export function addReadingXp(amount: number, isNewPage = true): { stats: ReadingStats; leveledUp: boolean; gainedXp: number } {
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

  const gainedXp = Math.max(0, amount || 0);
  const newXp = (current.xp || 0) + gainedXp;
  const oldLevelInfo = calculateLevel(current.xp || 0);
  const newLevelInfo = calculateLevel(newXp);
  const leveledUp = newLevelInfo.level > oldLevelInfo.level;

  const updated: ReadingStats = {
    xp: newXp,
    level: newLevelInfo.level,
    streakDays: streak,
    lastReadDate: today,
    pagesRead: (current.pagesRead || 0) + (isNewPage ? 1 : 0),
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
  isCurrentUser?: boolean;
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

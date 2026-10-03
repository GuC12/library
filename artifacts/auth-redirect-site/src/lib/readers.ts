import type { Book } from '@/data/books';
import {
  calculateLevel,
  getStoredReadingStats,
  readerRecordFromStats,
  xpForBookPages,
  type ReaderRecord,
  type ReadingStats,
} from './reading-system';
import { fetchRemoteReader, fetchRemoteReaders, upsertRemoteReader } from './supabase';

const READERS_KEY = 'library_readers_registry';

/** Событие, по которому открытые вкладки перечитывают список читателей. */
export const READERS_CHANGED_EVENT = 'library-readers-changed';

/** Префикс локального идентификатора, когда у книги нет id аккаунта. */
const NAME_ID_PREFIX = 'name:';

function isReaderRecord(value: unknown): value is ReaderRecord {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ReaderRecord>;
  return typeof candidate.id === 'string' && typeof candidate.nickname === 'string';
}

function readRegistry(): ReaderRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(READERS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isReaderRecord) : [];
  } catch {
    return [];
  }
}

function writeRegistry(readers: ReaderRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(READERS_KEY, JSON.stringify(readers));
  } catch {
    // Хранилище недоступно — данные всё равно уйдут в облако.
  }
}

export function getLocalReaders(): ReaderRecord[] {
  return readRegistry();
}

/** Сохраняет/обновляет читателя в локальном реестре реальных аккаунтов. */
export function upsertLocalReader(record: ReaderRecord): ReaderRecord[] {
  const existing = readRegistry();
  const index = existing.findIndex((reader) => reader.id === record.id);
  const next = index >= 0
    ? existing.map((reader, i) => (i === index ? { ...reader, ...record } : reader))
    : [...existing, record];

  writeRegistry(next);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(READERS_CHANGED_EVENT, { detail: next }));
  }

  return next;
}

/** Реальные авторы, которых видно по опубликованным на сайте книгам. */
export function readersFromUserBooks(userBooks: Book[]): ReaderRecord[] {
  const byKey = new Map<string, ReaderRecord>();

  for (const book of userBooks) {
    if (!book.isUserBook) continue;

    const key = book.ownerId ? book.ownerId : `${NAME_ID_PREFIX}${book.author.trim()}`;
    const pagesCount = Array.isArray(book.pages) ? book.pages.length : 1;
    const bookXp = xpForBookPages(pagesCount);
    const existing = byKey.get(key);

    if (existing) {
      existing.xp += bookXp;
      existing.pagesRead += pagesCount;
      existing.booksPublished += 1;
      existing.level = calculateLevel(existing.xp).level;
    } else {
      byKey.set(key, {
        id: key,
        nickname: book.author,
        avatar: book.authorAvatar || '',
        xp: bookXp,
        level: calculateLevel(bookXp).level,
        streakDays: 1,
        pagesRead: pagesCount,
        booksFinished: 0,
        booksPublished: 1,
        updatedAt: Date.now(),
      });
    }
  }

  return [...byKey.values()];
}

function mergePair(previous: ReaderRecord, incoming: ReaderRecord): ReaderRecord {
  const merged: ReaderRecord = {
    ...previous,
    nickname: previous.nickname || incoming.nickname,
    avatar: previous.avatar || incoming.avatar,
    xp: Math.max(previous.xp, incoming.xp),
    streakDays: Math.max(previous.streakDays, incoming.streakDays),
    pagesRead: Math.max(previous.pagesRead, incoming.pagesRead),
    booksFinished: Math.max(previous.booksFinished, incoming.booksFinished),
    booksPublished: Math.max(previous.booksPublished, incoming.booksPublished),
    updatedAt: Math.max(previous.updatedAt, incoming.updatedAt),
  };
  merged.level = calculateLevel(merged.xp).level;
  return merged;
}

/** Сливает источники без удвоения опыта: берётся максимум, а не сумма. */
export function mergeReaders(...groups: ReaderRecord[][]): ReaderRecord[] {
  const byId = new Map<string, ReaderRecord>();

  for (const group of groups) {
    for (const reader of group) {
      if (!reader?.id) continue;
      const previous = byId.get(reader.id);
      byId.set(reader.id, previous ? mergePair(previous, reader) : { ...reader });
    }
  }

  return [...byId.values()];
}

function hasAccountId(reader: ReaderRecord): boolean {
  return !reader.id.startsWith(NAME_ID_PREFIX);
}

function preferReader(a: ReaderRecord, b: ReaderRecord): ReaderRecord {
  if (a.xp !== b.xp) return a.xp > b.xp ? a : b;
  if (a.booksPublished !== b.booksPublished) return a.booksPublished > b.booksPublished ? a : b;
  if (hasAccountId(a) !== hasAccountId(b)) return hasAccountId(a) ? a : b;
  return a.updatedAt >= b.updatedAt ? a : b;
}

/** Убирает дубли, когда у одной книги нет id автора и человек попал дважды. */
export function dedupeReadersByName(readers: ReaderRecord[]): ReaderRecord[] {
  const byName = new Map<string, ReaderRecord>();

  for (const reader of readers) {
    const key = reader.nickname.trim().toLowerCase();
    if (!key) {
      key;
      continue;
    }
    const previous = byName.get(key);
    byName.set(key, previous ? preferReader(previous, reader) : reader);
  }

  return [...byName.values()];
}

export function sortReaders(readers: ReaderRecord[]): ReaderRecord[] {
  return [...readers].sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    if (b.booksPublished !== a.booksPublished) return b.booksPublished - a.booksPublished;
    if (b.pagesRead !== a.pagesRead) return b.pagesRead - a.pagesRead;
    return a.nickname.localeCompare(b.nickname);
  });
}

export interface CurrentReaderInput {
  userId: string;
  nickname: string;
  avatar: string;
  booksPublished: number;
  stats?: ReadingStats;
}

export function buildCurrentReader(input: CurrentReaderInput): ReaderRecord {
  const stats = input.stats ?? getStoredReadingStats();
  return readerRecordFromStats(input.userId, input.nickname, input.avatar, stats, input.booksPublished);
}

/** Считает опыт автора по его собственным книгам (для показа прогресса). */
export function xpFromOwnBooks(books: Book[]): number {
  return books.reduce((sum, book) => {
    const pagesCount = Array.isArray(book.pages) ? book.pages.length : 1;
    return sum + xpForBookPages(pagesCount);
  }, 0);
}

export interface LoadLeaderboardInput {
  userBooks: Book[];
  currentUserId?: string;
  currentNickname: string;
  currentAvatar: string;
  booksPublished: number;
  stats: ReadingStats;
}

/**
 * Топ читателей строится только из настоящих пользователей сайта:
 * локальный реестр аккаунтов + облачная таблица reader_stats + реальные
 * авторы опубликованных книг. Выдуманных имён здесь быть не может.
 */
export async function loadLeaderboard(input: LoadLeaderboardInput): Promise<ReaderRecord[]> {
  const remoteReaders = (await fetchRemoteReaders()).filter((reader) => hasAccountId(reader));
  const currentReader = input.currentUserId
    ? [buildCurrentReader({
        userId: input.currentUserId,
        nickname: input.currentNickname,
        avatar: input.currentAvatar,
        booksPublished: input.booksPublished,
        stats: input.stats,
      })]
    : [];

  // Только записи, синхронизированные из вошедших аккаунтов Clerk.
  // Книга или локальный реестр браузера не доказывают существование аккаунта.
  const merged = mergeReaders(remoteReaders, currentReader);

  return sortReaders(merged).map((reader) => ({
    ...reader,
    isCurrentUser: Boolean(input.currentUserId) && reader.id === input.currentUserId,
  }));
}

/** Сохраняет прогресс читателя локально и в облаке, чтобы он не терялся. */
export async function syncCurrentReader(input: CurrentReaderInput): Promise<ReaderRecord> {
  const record = buildCurrentReader(input);
  // В другом браузере прогресс может быть новее: не перезаписываем его нулём.
  const remote = await fetchRemoteReader(input.userId);
  const merged = remote ? {
    ...record,
    nickname: record.nickname && record.nickname !== 'Читатель' ? record.nickname : (remote.nickname || record.nickname),
    avatar: record.avatar || remote.avatar || '',
    xp: Math.max(record.xp, remote.xp),
    level: calculateLevel(Math.max(record.xp, remote.xp)).level,
    pagesRead: Math.max(record.pagesRead, remote.pagesRead),
    booksFinished: Math.max(record.booksFinished, remote.booksFinished),
    booksPublished: Math.max(record.booksPublished, remote.booksPublished),
  } : record;
  if (!(await upsertRemoteReader(merged))) throw new Error('Не удалось сохранить читателя в Supabase');
  upsertLocalReader(merged);
  return merged;
}

export { calculateLevel };

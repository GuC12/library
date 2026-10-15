import { createClient } from '@supabase/supabase-js';
import type { Book, BookPage } from '@/data/books';
import type { ReaderRecord, SharedReadingListItem, SharedReadingLists } from './reading-system';
import { createId } from './create-id';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let clerkAccessToken: (() => Promise<string | null>) | null = null;

/** Connects the shared Supabase client to the current Clerk session. */
export function setSupabaseAccessTokenProvider(provider: (() => Promise<string | null>) | null) {
  clerkAccessToken = provider;
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  accessToken: async () => (clerkAccessToken ? clerkAccessToken() : null),
});

const BOOKS_TABLE = 'community_books';
const READERS_TABLE = 'reader_stats';
const BOOK_LIKES_TABLE = 'book_likes';
const PROFILES_TABLE = 'user_profiles';
const FRIENDS_TABLE = 'friendships';
const MESSAGES_TABLE = 'chat_messages';

export interface CommunityBookRow {
  id: number;
  title: string;
  author: string;
  author_avatar?: string | null;
  owner_id?: string | null;
  category: string;
  community_category?: string | null;
  language?: string | null;
  price: number;
  spine: string;
  summary: string;
  cover_image?: string | null;
  pages: BookPage[];
  is_user_book: boolean;
  likes_count?: number;
  created_at?: string;
}

function readPages(value: unknown): BookPage[] {
  return Array.isArray(value) ? (value as BookPage[]) : [];
}

export function rowToBook(row: CommunityBookRow): Book {
  return {
    id: Number(row.id),
    title: row.title,
    author: row.author,
    authorAvatar: row.author_avatar || undefined,
    ownerId: row.owner_id || undefined,
    category: row.category,
    communityCategory: row.community_category || undefined,
    language: (row.language as Book['language']) || 'ru',
    price: Number(row.price || 0),
    spine: row.spine || '#8C704B',
    summary: row.summary,
    coverImage: row.cover_image || undefined,
    pages: readPages(row.pages),
    isUserBook: true,
    likesCount: Number(row.likes_count) || 0,
    publicationStatus: 'published',
  };
}

export function bookToRow(book: Book): CommunityBookRow {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    author_avatar: book.authorAvatar || null,
    owner_id: book.ownerId || null,
    category: book.category,
    community_category: book.communityCategory || null,
    language: book.language || 'ru',
    price: book.price || 0,
    spine: book.spine || '#8C704B',
    summary: book.summary,
    cover_image: book.coverImage || null,
    pages: book.pages || [],
    is_user_book: true,
  };
}

export async function fetchRemoteBooks(ownerId?: string): Promise<Book[]> {
  const books: Book[] = [];
  for (let from = 0; ; from += 100) {
    const { data, error } = await supabase.from(BOOKS_TABLE).select('*')
      .order('id', { ascending: false }).range(from, from + 99);
    if (error) throw new Error(error.message);
    books.push(...(data || []).map(row => rowToBook(row as CommunityBookRow)));
    if (!data || data.length < 100) break;
  }
  if (ownerId) {
    for (let index = 0; index < books.length; index++) {
      const book = books[index];
      if (book.ownerId !== ownerId || !book.coverImage?.startsWith('data:image/')) continue;
      try {
        const coverImage = await migrateInlineBookCover(book.coverImage, ownerId);
        const migrated = { ...book, coverImage };
        if (await updateRemoteBook(migrated)) books[index] = migrated;
      } catch (error) {
        console.warn('Could not migrate a legacy book cover yet:', error);
      }
    }
  }
  return books;
}

export async function reportCommunityBook(book: Book, reporterId: string, reason: string): Promise<boolean> {
  const trimmedReason = reason.trim().slice(0, 1000);
  if (!reporterId || !trimmedReason) return false;
  const { error } = await supabase.from('content_reports').insert({
    reporter_id: reporterId,
    content_type: 'book',
    content_id: String(book.id),
    content_title: book.title.slice(0, 200),
    reason: trimmedReason,
  });
  if (error) {
    console.error('Book report submit error:', error.message);
    return false;
  }
  return true;
}

export async function deleteMyLibraryData(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_library_data');
  if (error) throw new Error(error.message);
}

export interface RemoteReadingAward {
  xp: number;
  level: number;
  streakDays: number;
  pagesRead: number;
  gainedXp: number;
  awardedPages: number;
}

/** Awards authenticated reading activity through the idempotent server ledger. */
export async function awardRemoteReadingPages(bookId: number, pageIndexes: number[]): Promise<RemoteReadingAward> {
  const uniquePages = [...new Set(pageIndexes.filter(page => Number.isSafeInteger(page) && page >= 0))];
  if (!uniquePages.length) return { xp: 0, level: 1, streakDays: 1, pagesRead: 0, gainedXp: 0, awardedPages: 0 };
  const { data, error } = await supabase.rpc('award_reading_pages', { p_book_id: bookId, p_page_indexes: uniquePages });
  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'object') throw new Error('Invalid reading award response');
  const result = data as RemoteReadingAward;
  if (![result.xp, result.level, result.streakDays, result.pagesRead, result.gainedXp, result.awardedPages].every(Number.isFinite)) {
    throw new Error('Invalid reading award response');
  }
  if (result.awardedPages > 0) window.dispatchEvent(new Event('library-reading-awarded'));
  return result;
}

export type BookSaveResult = { ok: true } | { ok: false; message: string };

function bookSyncError(error: unknown): string {
  const detail = error as { code?: string; message?: string } | null;
  const code = detail?.code || '';
  const message = detail?.message || '';
  if (code === '42501') return 'Облако отклонило запись: проверьте права community_books и подключение Clerk в Supabase.';
  if (['PGRST301', 'PGRST302', 'PGRST303'].includes(code) || /jwt|token.*expired/i.test(message)) return 'Сессия не принята облаком. Выйдите и войдите в аккаунт снова.';
  if (['42P01', '42703', 'PGRST204', 'PGRST205', '42883'].includes(code)) return 'В облачной базе не хватает таблицы, поля или функции. Нужно проверить SQL-настройку проекта.';
  if (/fetch|network|offline/i.test(message)) return 'Нет связи с облаком. Повторим отправку после восстановления соединения.';
  return `Облако не приняло книгу${code ? ` (код ${code})` : ''}. Подробности ошибки записаны в консоль браузера.`;
}

export async function saveRemoteBook(book: Book): Promise<BookSaveResult> {
  try {
    if (book.coverImage?.startsWith('data:image/')) throw new Error('Legacy inline cover must be migrated before publishing');
    const { error } = await supabase.from(BOOKS_TABLE).upsert(bookToRow(book), { onConflict: 'id' });
    if (error) {
      console.error('Supabase insert error:', error);
      return { ok: false, message: bookSyncError(error) };
    }
    return { ok: true };
  } catch (err) {
    console.error('Failed to save book to Supabase:', err);
    return { ok: false, message: bookSyncError(err) };
  }
}

export async function updateRemoteBook(book: Book): Promise<boolean> {
  try {
    if (book.coverImage?.startsWith('data:image/')) throw new Error('Legacy inline cover must be migrated before publishing');
    const { error } = await supabase
      .from(BOOKS_TABLE)
      .upsert(bookToRow(book), { onConflict: 'id' });
    if (error) {
      console.error('Supabase update error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to update book in Supabase:', err);
    return false;
  }
}

export async function deleteRemoteBook(bookId: number): Promise<boolean> {
  try {
    const { error } = await supabase.from(BOOKS_TABLE).delete().eq('id', bookId);
    if (error) {
      console.error('Supabase delete error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to delete book from Supabase:', err);
    return false;
  }
}

export interface UserProfileRow {
  user_id: string;
  nickname: string;
  avatar: string;
  created_at?: string;
}

export interface FriendProfile extends UserProfileRow {
  friendship_id?: number;
  friendship_status?: 'pending' | 'accepted';
  direction?: 'incoming' | 'outgoing';
}

export interface ChatMessage {
  id: number;
  sender_id: string;
  receiver_id: string;
  body: string;
  attachment_url?: string | null;
  created_at?: string;
}

export async function fetchRemoteProfile(userId: string): Promise<UserProfileRow | null> {
  try {
    const { data, error } = await supabase
      .from(PROFILES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.warn('Supabase fetchRemoteProfile error:', error.message);
      return null;
    }
    return data as UserProfileRow | null;
  } catch (err) {
    console.warn('Failed to fetch remote profile:', err);
    return null;
  }
}

export async function updateAuthorInCommunityBooks(userId: string, nickname: string, avatar: string): Promise<void> {
  try {
    await supabase
      .from(BOOKS_TABLE)
      .update({
        author: nickname,
        author_avatar: avatar || null,
      })
      .eq('owner_id', userId);
  } catch (err) {
    console.warn('Failed to update author info in community books:', err);
  }
}

export async function saveRemoteProfile(profile: UserProfileRow): Promise<boolean> {
  const { error } = await supabase.from(PROFILES_TABLE).upsert(profile, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
  return true;
}

export async function findRemoteProfileByNickname(nickname: string): Promise<UserProfileRow | null> {
  const { data, error } = await supabase.from(PROFILES_TABLE).select('*').ilike('nickname', nickname.trim()).maybeSingle();
  if (error) throw new Error(error.message);
  return data as UserProfileRow | null;
}

export async function fetchFriendRequests(userId: string): Promise<FriendProfile[]> {
  const { data: rows, error } = await supabase.from(FRIENDS_TABLE).select('id,user_id').eq('friend_id', userId).eq('status', 'pending');
  if (error) throw new Error(error.message);
  const ids = (rows || []).map((row) => String((row as { user_id: string }).user_id));
  if (!ids.length) return [];
  const { data: profiles, error: profileError } = await supabase.from(PROFILES_TABLE).select('*').in('user_id', ids);
  if (profileError) throw new Error(profileError.message);
  return (profiles || []).map((profile) => {
    const typed = profile as UserProfileRow;
    const row = (rows || []).find((item) => String((item as { user_id: string }).user_id) === typed.user_id) as { id: number } | undefined;
    return { ...typed, friendship_id: row?.id, friendship_status: 'pending', direction: 'incoming' };
  });
}

export async function fetchFriends(userId: string): Promise<FriendProfile[]> {
  const { data: rows, error } = await supabase.from(FRIENDS_TABLE).select('id,friend_id,status').eq('user_id', userId).eq('status', 'accepted');
  if (error) throw new Error(error.message);
  const ids = (rows || []).map((row) => String((row as { friend_id: string }).friend_id));
  if (!ids.length) return [];
  const { data: profiles, error: profileError } = await supabase.from(PROFILES_TABLE).select('*').in('user_id', ids);
  if (profileError) throw new Error(profileError.message);
  return (profiles || []).map((profile) => {
    const typed = profile as UserProfileRow;
    const row = (rows || []).find((item) => String((item as { friend_id: string }).friend_id) === typed.user_id) as { id: number } | undefined;
    return { ...typed, friendship_id: row?.id, friendship_status: 'accepted' };
  });
}

export async function addFriend(userId: string, friendId: string): Promise<boolean> {
  const { error } = await supabase.from(FRIENDS_TABLE).upsert(
    { user_id: userId, friend_id: friendId, status: 'pending' },
    { onConflict: 'user_id,friend_id', ignoreDuplicates: true }
  );
  if (error) throw new Error(error.message);
  return true;
}

export async function acceptFriendRequest(requestId: number, userId: string, senderId: string): Promise<boolean> {
  void senderId; // The database reads the sender from the pending request itself.
  const { error } = await supabase.rpc('accept_friend_request', { p_request_id: requestId });
  if (error) throw new Error(error.message);
  return true;
}

export async function rejectFriendRequest(requestId: number, userId: string): Promise<boolean> {
  const { error } = await supabase.from(FRIENDS_TABLE).delete().eq('id', requestId).eq('friend_id', userId).eq('status', 'pending');
  if (error) throw new Error(error.message);
  return true;
}

export async function removeFriend(userId: string, friendId: string): Promise<boolean> {
  const first = await supabase.from(FRIENDS_TABLE).delete().or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);
  if (first.error) throw new Error(first.error.message);
  return true;
}

export async function fetchChatMessages(userId: string, friendId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase.from(MESSAGES_TABLE).select('*').or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`).order('created_at', { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  return Promise.all([...((data || []) as ChatMessage[])].reverse().map(async (message) => {
    const body = message.body || '';
    const isPhotoOnly = /^((https?:\/\S+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s]*)?)|(data:image\/[^;]+;base64,[\s\S]+))$/i.test(body);
    const normalized = isPhotoOnly ? { ...message, body: '', attachment_url: body } : message;
    return { ...normalized, attachment_url: await resolveChatPhoto(normalized.attachment_url) };
  }));
}

export async function sendChatMessage(senderId: string, receiverId: string, body: string, attachmentUrl?: string): Promise<ChatMessage> {
  const messageBody = body.trim();
  const { data, error } = await supabase.from(MESSAGES_TABLE).insert({
    sender_id: senderId,
    receiver_id: receiverId,
    body: messageBody || (attachmentUrl ? '📷' : ''),
    attachment_url: attachmentUrl || null,
  }).select('*').single();
  if (error) throw new Error(error.message);
  const message = data as ChatMessage;
  return { ...message, attachment_url: await resolveChatPhoto(message.attachment_url) };
}

async function resolveChatPhoto(value?: string | null): Promise<string | null> {
  if (!value) return null;
  let path: string;
  if (value.startsWith('chat-photos/')) path = value.slice('chat-photos/'.length);
  else if (value.startsWith(SUPABASE_URL + '/storage/v1/object/public/chat-photos/')) {
    path = decodeURIComponent(value.slice((SUPABASE_URL + '/storage/v1/object/public/chat-photos/').length));
  } else return value; // Existing external images and legacy inline photos.
  const { data, error } = await supabase.storage.from('chat-photos').createSignedUrl(path, 300);
  if (error) return null; // A failed permission check must never fall back to a public URL.
  return data.signedUrl;
}

export async function uploadChatPhoto(file: File, userId: string, receiverId: string): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('photo-type-not-supported');
  if (file.size > 5 * 1024 * 1024) throw new Error('photo-too-large');
  const extension = file.type.split('/')[1];
  const path = userId + '/' + receiverId + '/' + createId() + '.' + extension;
  const { error } = await supabase.storage.from('chat-photos').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return 'chat-photos/' + path;
}

export async function uploadBookIllustration(file: File, userId: string): Promise<string> {
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!allowedTypes.has(file.type)) throw new Error('illustration-type-not-supported');
  if (file.size > 5 * 1024 * 1024) throw new Error('illustration-too-large');

  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const uniqueId = createId();
  const path = `${userId}/${uniqueId}.${extension}`;
  const { error } = await supabase.storage.from('book-illustrations').upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return supabase.storage.from('book-illustrations').getPublicUrl(path).data.publicUrl;
}

/** Moves a legacy data URL into Storage after validating type and bucket size. */
export async function migrateInlineBookCover(value: string, userId: string): Promise<string> {
  if (!value.startsWith('data:image/')) return value;
  const response = await fetch(value);
  const blob = await response.blob();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type)) throw new Error('cover-type-not-supported');
  let storedBlob = blob;
  if (blob.size > 5 * 1024 * 1024) {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, 1800 / bitmap.width, 2600 / bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('cover-compression-failed');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    storedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('cover-compression-failed')), 'image/webp', 0.82);
    });
  }
  if (storedBlob.size > 5 * 1024 * 1024) throw new Error('cover-too-large');
  const extension = storedBlob.type === 'image/jpeg' ? 'jpg' : storedBlob.type === 'image/png' ? 'png' : 'webp';
  return uploadBookIllustration(new File([storedBlob], `legacy-cover.${extension}`, { type: storedBlob.type }), userId);
}

export async function updateChatMessage(messageId: number, userId: string, body: string): Promise<ChatMessage> {
  const { data, error } = await supabase.from(MESSAGES_TABLE).update({ body }).eq('id', messageId).eq('sender_id', userId).select('*').single();
  if (error) throw new Error(error.message);
  const message = data as ChatMessage;
  return { ...message, attachment_url: await resolveChatPhoto(message.attachment_url) };
}

export async function deleteChatMessage(messageId: number, userId: string): Promise<boolean> {
  const { error } = await supabase.from(MESSAGES_TABLE).delete().eq('id', messageId).eq('sender_id', userId);
  if (error) throw new Error(error.message);
  return true;
}

export async function isNicknameAvailable(nickname: string, ownUserId: string): Promise<boolean> {
  const profile = await findRemoteProfileByNickname(nickname);
  return !profile || profile.user_id === ownUserId;
}

export interface ReaderStatsRow {
  id: string;
  nickname: string;
  avatar: string;
  xp: number;
  level: number;
  streak_days: number;
  pages_read: number;
  books_finished: number;
  books_published: number;
  updated_at?: string;
}

interface ReaderListsRow {
  owner_id: string;
  want: unknown;
  reading: unknown;
  done: unknown;
  updated_at?: string;
}

function readSharedReadingLists(value: unknown): SharedReadingLists | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const data = value as Record<string, unknown>;
  const readItems = (items: unknown): SharedReadingListItem[] => Array.isArray(items)
    ? items.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const candidate = item as Partial<SharedReadingListItem>;
        if (!Number.isFinite(candidate.bookId) || typeof candidate.title !== 'string') return [];
        return [{ bookId: Number(candidate.bookId), title: candidate.title, author: typeof candidate.author === 'string' ? candidate.author : '', summary: typeof candidate.summary === 'string' ? candidate.summary : '' }];
      })
    : [];
  return { want: readItems(data.want), reading: readItems(data.reading), done: readItems(data.done) };
}

export function rowToReader(row: ReaderStatsRow): ReaderRecord {
  return {
    id: String(row.id),
    nickname: row.nickname || 'Читатель',
    avatar: row.avatar || '',
    xp: Number(row.xp) || 0,
    level: Number(row.level) || 1,
    streakDays: Number(row.streak_days) || 1,
    pagesRead: Number(row.pages_read) || 0,
    booksFinished: Number(row.books_finished) || 0,
    booksPublished: Number(row.books_published) || 0,
    updatedAt: row.updated_at ? Date.parse(row.updated_at) || Date.now() : Date.now(),
  };
}

export function readerToRow(reader: ReaderRecord): ReaderStatsRow {
  return {
    id: reader.id,
    nickname: reader.nickname,
    avatar: reader.avatar,
    xp: reader.xp,
    level: reader.level,
    streak_days: reader.streakDays,
    pages_read: reader.pagesRead,
    books_finished: reader.booksFinished,
    books_published: reader.booksPublished,
    updated_at: new Date(reader.updatedAt || Date.now()).toISOString(),
  };
}

async function fetchReaderLists(userId: string): Promise<SharedReadingLists | undefined> {
  const { data, error } = await supabase
    .from('friend_reading_lists')
    .select('owner_id,want,reading,done')
    .eq('owner_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  const row = data as ReaderListsRow;
  return readSharedReadingLists({ want: row.want, reading: row.reading, done: row.done });
}

async function saveReaderLists(userId: string, lists: SharedReadingLists): Promise<void> {
  const { error } = await supabase.from('friend_reading_lists').upsert({
    owner_id: userId,
    want: lists.want,
    reading: lists.reading,
    done: lists.done,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'owner_id' });
  if (error) throw new Error(error.message);
}

/** Читает реальные аккаунты сайта. Если таблицы ещё нет — вернёт пустой список. */
export async function fetchRemoteReaders(): Promise<ReaderRecord[]> {
  try {
    const pageSize = 1000;
    const allRows: ReaderStatsRow[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from(READERS_TABLE)
        .select('*')
        .order('xp', { ascending: false })
        .range(from, from + pageSize - 1);
      if (error) {
        console.warn('Supabase readers fetch error:', error.message);
        return [];
      }
      allRows.push(...((data || []) as ReaderStatsRow[]));
      if (!data || data.length < pageSize) break;
    }
    return allRows.map((row) => rowToReader(row));
  } catch (err) {
    console.warn('Failed to fetch readers from Supabase:', err);
    return [];
  }
}

export async function fetchRemoteReader(userId: string, options: { requireReadingLists?: boolean } = {}): Promise<ReaderRecord | null> {
  const { data, error } = await supabase.from(READERS_TABLE).select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const reader = rowToReader(data as ReaderStatsRow);
  try {
    reader.readingLists = await fetchReaderLists(userId);
  } catch (listsError) {
    if (options.requireReadingLists) throw listsError;
    // A private reading-list policy or a missing optional table must not hide XP/profile stats.
    console.warn('Could not load reader lists; keeping profile stats:', listsError);
  }
  return reader;
}

export async function toggleBookLike(bookId: number, userId: string, liked: boolean): Promise<boolean> {
  try {
    const result = liked
      ? await supabase.from(BOOK_LIKES_TABLE).insert({ book_id: bookId, user_id: userId })
      : await supabase.from(BOOK_LIKES_TABLE).delete().eq('book_id', bookId).eq('user_id', userId);
    if (result.error) throw new Error(result.error.message);
    return true;
  } catch (error) {
    console.warn('Не удалось сохранить лайк:', error);
    return false;
  }
}

export async function fetchBookLikes(bookIds: number[], userId?: string): Promise<{ counts: Record<number, number>; liked: number[] }> {
  if (!bookIds.length) return { counts: {}, liked: [] };
  try {
    const { data, error } = await supabase.from(BOOK_LIKES_TABLE).select('book_id,user_id').in('book_id', bookIds);
    if (error) throw new Error(error.message);
    const counts: Record<number, number> = {};
    const liked: number[] = [];
    for (const row of data || []) {
      const id = Number((row as { book_id: number }).book_id);
      counts[id] = (counts[id] || 0) + 1;
      if (userId && (row as { user_id: string }).user_id === userId) liked.push(id);
    }
    return { counts, liked };
  } catch (error) {
    console.warn('Не удалось загрузить лайки:', error);
    throw error;
  }
}

export async function upsertRemoteReader(reader: ReaderRecord): Promise<boolean> {
  try {
    // XP and reading totals are server-owned. Only profile fields are written
    // by this client; column grants also enforce this boundary in Postgres.
    const row = {
      id: reader.id,
      nickname: reader.nickname,
      avatar: reader.avatar,
      books_published: reader.booksPublished,
      updated_at: new Date(reader.updatedAt || Date.now()).toISOString(),
    };
    const { error } = await supabase.from(READERS_TABLE).upsert(row, { onConflict: 'id' });
    if (error) throw new Error(error.message);
    if (reader.readingLists) await saveReaderLists(reader.id, reader.readingLists);
    return true;
  } catch (error) {
    console.warn('Не удалось сохранить читателя:', error);
    return false;
  }
}


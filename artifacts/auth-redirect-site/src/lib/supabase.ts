import { createClient } from '@supabase/supabase-js';
import type { Book, BookPage } from '@/data/books';
import type { ReaderRecord } from './reading-system';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

export async function fetchRemoteBooks(): Promise<Book[]> {
  try {
    const { data, error } = await supabase
      .from(BOOKS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch error:', error.message);
      return [];
    }

    return (data || []).map((row) => rowToBook(row as CommunityBookRow));
  } catch (err) {
    console.warn('Failed to fetch books from Supabase:', err);
    return [];
  }
}

export async function saveRemoteBook(book: Book): Promise<boolean> {
  try {
    const { error } = await supabase.from(BOOKS_TABLE).insert(bookToRow(book));
    if (error) {
      console.error('Supabase insert error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to save book to Supabase:', err);
    return false;
  }
}

export async function updateRemoteBook(book: Book): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(BOOKS_TABLE)
      .update(bookToRow(book))
      .eq('id', book.id);
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
  const { error } = await supabase.from(FRIENDS_TABLE).upsert({ user_id: userId, friend_id: friendId, status: 'pending' }, { onConflict: 'user_id,friend_id' });
  if (error) throw new Error(error.message);
  return true;
}

export async function acceptFriendRequest(requestId: number, userId: string, senderId: string): Promise<boolean> {
  const { error } = await supabase.from(FRIENDS_TABLE).update({ status: 'accepted' }).eq('id', requestId).eq('friend_id', userId);
  if (error) throw new Error(error.message);
  const reverse = await supabase.from(FRIENDS_TABLE).upsert({ user_id: userId, friend_id: senderId, status: 'accepted' }, { onConflict: 'user_id,friend_id' });
  if (reverse.error) throw new Error(reverse.error.message);
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
  return [...((data || []) as ChatMessage[])].reverse().map((message) => {
    const body = message.body || '';
    const isPhotoOnly = /^((https?:\/\S+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s]*)?)|(data:image\/[^;]+;base64,[\s\S]+))$/i.test(body);
    return isPhotoOnly ? { ...message, body: '', attachment_url: body } : message;
  });
}

export async function sendChatMessage(senderId: string, receiverId: string, body: string, attachmentUrl?: string): Promise<ChatMessage> {
  const messageBody = body.trim();
  const { data, error } = await supabase.from(MESSAGES_TABLE).insert({
    sender_id: senderId,
    receiver_id: receiverId,
    body: messageBody || (attachmentUrl ? '📷' : ''),
    attachment_url: attachmentUrl || null,
  }).select('*').single();
  if (error) {
    // Текстовые сообщения остаются совместимыми со старой схемой.
    const legacy = await supabase.from(MESSAGES_TABLE).insert({
      sender_id: senderId,
      receiver_id: receiverId,
      body: messageBody || attachmentUrl || '📷',
    }).select('*').single();
    if (legacy.error) throw new Error(legacy.error.message);
    return { ...(legacy.data as ChatMessage), attachment_url: attachmentUrl || null };
  }
  return data as ChatMessage;
}

export async function uploadChatPhoto(file: File, userId: string): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('photo-type-not-supported');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-') || 'photo.jpg';
  const uniqueId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${userId}/${uniqueId}-${safeName}`;
  const uploaded = await supabase.storage.from('chat-photos').upload(path, file, { contentType: file.type, upsert: false });
  if (!uploaded.error) {
    const { data } = supabase.storage.from('chat-photos').getPublicUrl(path);
    return data.publicUrl;
  }

  // Если Storage ещё не настроен, отправляем небольшую сжатую копию.
  // Это временный fallback: после применения supabase-schema.sql будет использоваться Storage.
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(uploaded.error?.message || 'photo-read-error'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('photo-decode-error'));
      image.onload = () => {
        // В старой схеме body ограничен 4000 символами. Сжимаем fallback так,
        // чтобы фото всё равно прошло даже без attachment_url и Storage bucket.
        let size = 128;
        let result = '';
        while (size >= 16) {
          const scale = Math.min(1, size / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
          result = canvas.toDataURL('image/jpeg', 0.12);
          if (result.length <= 3000) break;
          size -= 8;
        }
        if (!result || result.length > 3900) reject(new Error('photo-too-large'));
        else resolve(result);
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function updateChatMessage(messageId: number, userId: string, body: string): Promise<ChatMessage> {
  const { data, error } = await supabase.from(MESSAGES_TABLE).update({ body }).eq('id', messageId).eq('sender_id', userId).select('*').single();
  if (error) throw new Error(error.message);
  return data as ChatMessage;
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

export async function fetchRemoteReader(userId: string): Promise<ReaderRecord | null> {
  const { data, error } = await supabase.from(READERS_TABLE).select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToReader(data as ReaderStatsRow) : null;
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
    const { error } = await supabase.from(READERS_TABLE).upsert(readerToRow(reader), { onConflict: 'id' });
    if (error) throw new Error(error.message);
    return true;
  } catch (error) {
    console.warn('Не удалось сохранить читателя:', error);
    return false;
  }
}

/* legacy implementation kept below for compatibility */
/*
export async function fetchRemoteReaders(): Promise<ReaderRecord[]> {
  try {
    const { data, error } = await supabase
      .from(READERS_TABLE)
      .select('*')
      .order('xp', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('Supabase readers fetch error:', error.message);
      return [];
    }

    return (data || []).map((row) => rowToReader(row as ReaderStatsRow));
  } catch (err) {
    console.warn('Failed to fetch readers from Supabase:', err);
    return [];
  }
}

export async function upsertRemoteReader(reader: ReaderRecord): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(READERS_TABLE)
      .upsert(readerToRow(reader), { onConflict: 'id' });
    if (error) {
      console.warn('Supabase reader upsert error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to sync reader stats to Supabase:', err);
    return false;
  }
}
*/

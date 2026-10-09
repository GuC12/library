import { useClerk, useUser } from '@clerk/react';
import {
  Award,
  Bookmark,
  BookOpen,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Heart,
  MessageCircle,
  LogOut,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Search,
  ShoppingCart,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { books, initialUserBooks, type Book, type BookPage } from '@/data/books';
import { quotes } from '@/data/quotes';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLanguage } from '@/lib/i18n';
import { DEFAULT_AVATAR, useUserProfile } from '@/lib/user-profile';
import { Interactive3DBook } from '@/components/interactive-3d-book';
import {
  addReadingXp,
  calculateLevel,
  getStoredReadingStats,
  saveStoredReadingStats,
  setActiveReaderId,
  xpForBookPages,
  type ReadingStats,
} from '@/lib/reading-system';
import { loadLeaderboard, syncCurrentReader } from '@/lib/readers';
import type { ReaderRecord } from '@/lib/reading-system';

import {
  deleteRemoteBook,
  fetchBookLikes,
  acceptFriendRequest,
  rejectFriendRequest,
  fetchChatMessages,
  fetchFriendRequests,
  fetchFriends,
  fetchRemoteBooks,
  fetchRemoteReader,
  findRemoteProfileByNickname,
  addFriend,
  removeFriend,
  rowToBook,
  saveRemoteProfile,
  sendChatMessage,
  uploadChatPhoto,
  updateChatMessage,
  deleteChatMessage,
  saveRemoteBook,
  supabase,
  toggleBookLike,
  updateRemoteBook,
} from '@/lib/supabase';
import './library.css';

const COMMUNITY_SUBCATEGORIES = [
  { id: 'fiction', key: 'communitySubFiction' },
  { id: 'poetry', key: 'communitySubPoetry' },
  { id: 'fantasy', key: 'communitySubFantasy' },
  { id: 'mystery', key: 'communitySubMystery' },
  { id: 'romance', key: 'communitySubRomance' },
  { id: 'scifi', key: 'communitySubScifi' },
  { id: 'memoir', key: 'communitySubMemoir' },
  { id: 'self-help', key: 'communitySubSelfHelp' },
  { id: 'education', key: 'communitySubEducation' },
  { id: 'business', key: 'communitySubBusiness' },
  { id: 'technology', key: 'communitySubTechnology' },
  { id: 'children', key: 'communitySubChildren' },
  { id: 'other', key: 'communitySubOther' },
] as const;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const PAGE_TURN_MS = 780;

type BookmarkEntry = {
  title: string;
  page: number;
};

type FlyingBook = {
  id: number;
  book: Book;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  targetX: number;
  targetY: number;
};

type CoverTranslationKey = 'coverVintageLeather' | 'coverDarkEmerald' | 'coverRoyalNavy' | 'coverBurgundyWine' | 'coverGoldenAmber' | 'coverObsidianNight';

export const READY_COVERS: Array<{ id: string; translationKey: CoverTranslationKey; name: string; gradient: string; spine: string; pattern: string; border: string }> = [
  {
    id: 'cover-vintage-leather',
    translationKey: 'coverVintageLeather' as const,
    name: 'Кожаный переплёт',
    gradient: 'linear-gradient(145deg, #2D1B0F 0%, #4A3320 50%, #6E4A2A 100%)',
    spine: '#2D1B0F',
    pattern: 'radial-gradient(circle at 50% 30%, rgba(217, 199, 170, 0.15) 0%, transparent 70%)',
    border: '#B1844D',
  },
  {
    id: 'cover-dark-emerald',
    translationKey: 'coverDarkEmerald' as const,
    name: 'Изумрудный бархат',
    gradient: 'linear-gradient(145deg, #0F2D20 0%, #1D4A38 50%, #2E6B52 100%)',
    spine: '#0F2D20',
    pattern: 'radial-gradient(circle at 50% 40%, rgba(200, 240, 220, 0.12) 0%, transparent 65%)',
    border: '#7CC9A5',
  },
  {
    id: 'cover-royal-navy',
    translationKey: 'coverRoyalNavy' as const,
    name: 'Морская глубина',
    gradient: 'linear-gradient(145deg, #0C1E36 0%, #1A3456 50%, #294D7B 100%)',
    spine: '#0C1E36',
    pattern: 'radial-gradient(circle at 50% 50%, rgba(180, 210, 255, 0.14) 0%, transparent 60%)',
    border: '#82B1E8',
  },
  {
    id: 'cover-burgundy-wine',
    translationKey: 'coverBurgundyWine' as const,
    name: 'Бордовое вино',
    gradient: 'linear-gradient(145deg, #380C14 0%, #561823 50%, #7D2636 100%)',
    spine: '#380C14',
    pattern: 'radial-gradient(circle at 50% 30%, rgba(255, 200, 210, 0.15) 0%, transparent 70%)',
    border: '#E898A6',
  },
  {
    id: 'cover-golden-amber',
    translationKey: 'coverGoldenAmber' as const,
    name: 'Золотистый янтарь',
    gradient: 'linear-gradient(145deg, #4A330B 0%, #755219 50%, #A6762B 100%)',
    spine: '#4A330B',
    pattern: 'radial-gradient(circle at 50% 40%, rgba(255, 235, 180, 0.18) 0%, transparent 65%)',
    border: '#F2C879',
  },
  {
    id: 'cover-obsidian-night',
    translationKey: 'coverObsidianNight' as const,
    name: 'Чёрный обсидиан',
    gradient: 'linear-gradient(145deg, #121214 0%, #212226 50%, #35373E 100%)',
    spine: '#121214',
    pattern: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.09) 0%, transparent 70%)',
    border: '#A0A4B0',
  },
];

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

function PageSheet({
  page,
  number,
  side,
  onTurn,
  disabled,
}: {
  page?: BookPage;
  number: number;
  side: 'left' | 'right';
  onTurn?: () => void;
  disabled?: boolean;
}) {
  if (!page) {
    return <article className={`library-page library-page-${side} library-page-empty`} aria-hidden="true" />;
  }

  const interactive = Boolean(onTurn) && !disabled;

  return (
    <article
      className={`library-page library-page-${side}${interactive ? ' is-interactive' : ''}${page.pageImage ? ' library-page-has-image' : ''}`}
      onClick={interactive ? onTurn : undefined}
      onKeyDown={interactive ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onTurn?.(); } } : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {page.pageImage ? (
        <div className="library-page-image-wrapper">
          <img
            src={page.pageImage}
            alt={page.title || `Страница ${number}`}
            className="library-page-pdf-image"
            loading="eager"
          />
        </div>
      ) : (
        <>
          <span>{page.kicker}</span>
          <h3>{page.title}</h3>
          <p>{page.text}</p>
          <small>{number}</small>
        </>
      )}
    </article>
  );
}

function BookCover({ book, small = false, categoryLabels }: { book: Book; small?: boolean; categoryLabels: Record<string, string> }) {
  const translatedCategory = categoryLabels[book.category] || book.category;
  if (book.id === 100 || book.id === 1000) {
    return (
      <div
        className={`library-book-cover ${small ? 'library-book-cover-small' : ''} library-custom-cover overflow-hidden`}
        style={{
          '--spine-color': book.spine || '#4A151B',
          backgroundImage: `url(${book.coverImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
        } as CSSProperties}
      />
    );
  }

  const isReadyCover = book.coverImage?.startsWith('cover-');
  const readyCoverTemplate = isReadyCover ? READY_COVERS.find((c) => c.id === book.coverImage) : null;

  if (readyCoverTemplate) {
    return (
      <div
        className={`library-book-cover ${small ? 'library-book-cover-small' : ''} library-custom-cover`}
        style={{
          '--spine-color': book.spine || readyCoverTemplate.spine,
          background: `${readyCoverTemplate.pattern}, ${readyCoverTemplate.gradient}`,
          borderColor: readyCoverTemplate.border,
        } as CSSProperties}
      >
        <div className="library-custom-cover-overlay library-ready-cover-overlay" style={{ borderColor: readyCoverTemplate.border }}>
          <span className="library-cover-category">{translatedCategory}</span>
          <strong>{book.title}</strong>
          <span className="library-cover-author">{book.author}</span>
        </div>
      </div>
    );
  }

  if (book.coverImage) {
    return (
      <div
        className={`library-book-cover ${small ? 'library-book-cover-small' : ''} library-custom-cover`}
        style={{
          '--spine-color': book.spine || '#8C704B',
          backgroundImage: `url(${book.coverImage})`,
        } as CSSProperties}
      >
        <div className="library-custom-cover-overlay">
          <span className="library-cover-category">{translatedCategory}</span>
          <strong>{book.title}</strong>
          <span className="library-cover-author">{book.author}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`library-book-cover ${small ? 'library-book-cover-small' : ''}`} style={{ '--spine-color': book.spine } as CSSProperties}>
      <span className="library-cover-category">{translatedCategory}</span>
      <strong>{book.title}</strong>
      <span className="library-cover-author">{book.author}</span>
    </div>
  );
}

export function LibraryPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { t, language } = useLanguage();
  const { nickname, avatar, updateProfile, saveAvatarFile, resetAvatar, isSaving: isProfileSaving } = useUserProfile();

  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * quotes.length));

  const pickNextQuote = () => {
    setQuoteIndex((prev) => {
      let next = Math.floor(Math.random() * quotes.length);
      if (next === prev && quotes.length > 1) {
        next = (next + 1) % quotes.length;
      }
      return next;
    });
  };

  const currentQuote = quotes[quoteIndex] ?? quotes[0];
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [readerTab, setReaderTab] = useState<'summary' | 'full'>('summary');
  const [pageIndex, setPageIndex] = useState(0);
  const [isTurning, setIsTurning] = useState(false);
  const [turnDirection, setTurnDirection] = useState<'next' | 'previous'>('next');
  const [turningTo, setTurningTo] = useState<number | null>(null);
  const turnTimer = useRef<number | null>(null);
  const [cart, setCart] = useState<number[]>(() => readStorage<number[]>('library-cart', []));
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [bookmarks, setBookmarks] = useState<Record<string, BookmarkEntry>>(() => readStorage<Record<string, BookmarkEntry>>('library-bookmarks', {}));
  const [bookLikes, setBookLikes] = useState<Record<number, number>>({});
  const [likedBooks, setLikedBooks] = useState<number[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [socialTab, setSocialTab] = useState<'friends' | 'chat'>('friends');
  const [leaderboard, setLeaderboard] = useState<ReaderRecord[]>([]);
  const [friends, setFriends] = useState<import('@/lib/supabase').FriendProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<import('@/lib/supabase').FriendProfile[]>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [foundUser, setFoundUser] = useState<import('@/lib/supabase').UserProfileRow | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<import('@/lib/supabase').FriendProfile | null>(null);
  const [viewedProfile, setViewedProfile] = useState<import('@/lib/supabase').FriendProfile | null>(null);
  const [viewedFriendStats, setViewedFriendStats] = useState<ReaderRecord | null>(null);
  const [messages, setMessages] = useState<import('@/lib/supabase').ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
  const [editingBookId, setEditingBookId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const bookParam = new URLSearchParams(window.location.search).get('book');
    if (bookParam) {
      const found = books.find((b) => String(b.id) === bookParam);
      if (found) {
        setSelectedBook(found);
        setPageIndex(0);
        setReaderTab('full');
      }
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([fetchFriends(user.id), fetchFriendRequests(user.id)]).then(([nextFriends, nextRequests]) => { setFriends(nextFriends); setFriendRequests(nextRequests); }).catch(() => { setFriends([]); setFriendRequests([]); });
    const friendId = new URLSearchParams(window.location.search).get('friend');
    if (friendId && friendId !== user.id) supabase.from('user_profiles').select('*').eq('user_id', friendId).maybeSingle().then(({ data }) => setFoundUser((data as import('@/lib/supabase').UserProfileRow | null) || null));
  }, [user?.id]);

  useEffect(() => {
    if (socialTab === 'chat' && !selectedFriend && friends.length) setSelectedFriend(friends[0]);
  }, [friends, selectedFriend, socialTab]);

  useEffect(() => {
    if (!selectedFriend || !user?.id) return;
    setMessages([]);
    const refresh = () => fetchChatMessages(user.id, selectedFriend.user_id).then(setMessages).catch(() => { setMessages([]); setNotice(t('chatLoadError')); window.setTimeout(() => setNotice(''), 3000); });
    refresh();
    const channel = supabase.channel(`chat:${user.id}:${selectedFriend.user_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload) => {
        const row = payload.new as import('@/lib/supabase').ChatMessage;
        const oldRow = payload.old as import('@/lib/supabase').ChatMessage;
        if ([row.sender_id, row.receiver_id, oldRow.sender_id, oldRow.receiver_id].some((id) => id === user.id || id === selectedFriend.user_id)) refresh();
      }).subscribe();
    const timer = window.setInterval(refresh, 10000);
    return () => { window.clearInterval(timer); supabase.removeChannel(channel); };
  }, [selectedFriend, user?.id]);

  const openEditBook = (book: Book) => {
    if (book.ownerId !== user?.id) return;
    setEditingBookId(book.id);
    setNewTitle(book.title);
    setNewCategory('Пользовательские книги');
    setNewCommunityCategory(book.communityCategory || 'other');
    setNewLanguage(book.language || 'ru');
    setNewSummary(book.summary);
    setNewPrice(String(book.price));
    setNewSpine(book.spine);
    setNewCover(book.coverImage || '');
    setNewPages(book.pages);
    setUploadModalOpen(true);
  };
  const [levelUpBanner, setLevelUpBanner] = useState<string | null>(null);
  const [cartBumping, setCartBumping] = useState(false);
  const [flyingBooks, setFlyingBooks] = useState<FlyingBook[]>([]);
  const cartButtonRef = useRef<HTMLButtonElement | null>(null);

  // Система опыта чтения и серии дней
  const [readingStats, setReadingStats] = useState<ReadingStats>(() => getStoredReadingStats());

  useEffect(() => {
    if (!user?.id) return;
    setActiveReaderId(user.id);
    setReadingStats(getStoredReadingStats());
    return () => setActiveReaderId(null);
  }, [user?.id]);

  useEffect(() => {
    const handleStatsChange = (e: Event) => {
      const customEvent = e as CustomEvent<ReadingStats>;
      if (customEvent.detail) {
        setReadingStats(customEvent.detail);
      } else {
        setReadingStats(getStoredReadingStats());
      }
    };
    window.addEventListener('library-stats-changed', handleStatsChange);
    return () => window.removeEventListener('library-stats-changed', handleStatsChange);
  }, []);

  // Подкатегории по языкам и тематике книг сообщества.
  const [subLang, setSubLang] = useState<'all' | 'ru' | 'en' | 'kk' | 'zh'>('all');
  const [communitySubcategory, setCommunitySubcategory] = useState('all');

  // Пользовательские книги (синхронизируются с облачной базой Supabase в реальном времени)
  const [userBooks, setUserBooks] = useState<Book[]>(() => {
    const stored = readStorage<Book[]>('library-user-books', []);
    const storedIds = new Set(stored.map((b) => b.id));
    const merged = [...stored, ...initialUserBooks.filter((b) => !storedIds.has(b.id))];
    return merged;
  });

  // Загрузка настоящих книг из Supabase + подписка на добавления в реальном времени
  useEffect(() => {
    let isMounted = true;

    // 1. Первичная загрузка из облака
    fetchRemoteBooks().then((remoteBooks) => {
      if (!isMounted || !remoteBooks.length) return;
      setUserBooks((prev) => {
        const existingIds = new Set(prev.map((b) => b.id));
        const newFromRemote = remoteBooks.filter((b) => !existingIds.has(b.id));
        if (!newFromRemote.length) return prev;
        const merged = [...newFromRemote, ...prev];
        window.localStorage.setItem('library-user-books', JSON.stringify(merged));
        return merged;
      });
    });

    // 2. Realtime подписка на добавление новых книг от любых пользователей через Supabase
    const channel = supabase
      .channel('realtime:community_books')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_books' },
        (payload) => {
          if (!isMounted || !payload.new) return;
          const newBook = rowToBook(payload.new as any);
          setUserBooks((prev) => {
            if (prev.some((b) => b.id === newBook.id)) return prev;
            const updated = [newBook, ...prev];
            window.localStorage.setItem('library-user-books', JSON.stringify(updated));
            return updated;
          });
        }
      )
      .subscribe();

    // 3. Локальные события между соседними вкладками браузера
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'library-user-books' && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue) as Book[];
          const updatedIds = new Set(updated.map((b) => b.id));
          const merged = [...updated, ...initialUserBooks.filter((b) => !updatedIds.has(b.id))];
          setUserBooks(merged);
        } catch {
          // ignore
        }
      }
    };

    const handleLocalBroadcast = () => {
      const stored = readStorage<Book[]>('library-user-books', []);
      const storedIds = new Set(stored.map((b) => b.id));
      const merged = [...stored, ...initialUserBooks.filter((b) => !storedIds.has(b.id))];
      setUserBooks(merged);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('library-user-books-updated', handleLocalBroadcast);

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('library-user-books-updated', handleLocalBroadcast);
    };
  }, []);

  const allBooks = useMemo(() => {
    const featuredBook = books[0];
    const featuredTitle = featuredBook.title.trim().toLocaleLowerCase();
    const otherUserBooks = userBooks.filter((book) => book.title.trim().toLocaleLowerCase() !== featuredTitle);
    return [featuredBook, ...otherUserBooks, ...books.slice(1)];
  }, [userBooks]);
  const categoryLabels: Record<string, string> = {
    'Пользовательские книги': t('categoryCommunity'),
    'Художественная литература': t('categoryFiction'),
    Основы: t('categoryBasics'),
    Архитектура: t('categoryArchitecture'),
    Алгоритмы: t('categoryAlgorithms'),
    Практика: t('categoryPractice'),
    Языки: t('categoryLanguages'),
    [t('all')]: t('all'),
    [t('myBooks')]: t('myBooks'),
    [t('topBooks')]: t('topBooks'),
    [t('userBooks')]: t('userBooks'),
    [t('fiction')]: t('fiction'),
    [t('categoryCommunity')]: t('categoryCommunity'),
    [t('categoryFiction')]: t('categoryFiction'),
    [t('categoryBasics')]: t('categoryBasics'),
    [t('categoryArchitecture')]: t('categoryArchitecture'),
    [t('categoryAlgorithms')]: t('categoryAlgorithms'),
    [t('categoryPractice')]: t('categoryPractice'),
    [t('categoryLanguages')]: t('categoryLanguages'),
  };
  const ownBooks = useMemo(() => userBooks.filter((book) => book.ownerId === user?.id), [userBooks, user?.id]);

  const addFriendByNickname = async () => {
    if (!user?.id || !friendSearch.trim()) return;
    try {
      const profile = await findRemoteProfileByNickname(friendSearch);
      if (!profile || profile.user_id === user.id) throw new Error('not-found');
      setFoundUser(profile);
      setNotice(t('userSelected'));

    } catch { setNotice(t('friendNotFound')); }
    window.setTimeout(() => setNotice(''), 2500);
  };

  const copyFriendLink = async () => {
    if (!user?.id) return;
    const link = `${window.location.origin}${window.location.pathname}?friend=${encodeURIComponent(user.id)}`;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(link);
      else throw new Error('clipboard-unavailable');
    } catch {
      const field = document.createElement('textarea');
      field.value = link;
      field.style.position = 'fixed'; field.style.opacity = '0';
      document.body.appendChild(field); field.focus(); field.select();
      document.execCommand('copy'); field.remove();
    }
    setNotice(t('friendLinkCopied'));
    window.setTimeout(() => setNotice(''), 2500);
  };

  const sendMessage = async (attachmentUrl?: string) => {
    if (!user?.id || !selectedFriend || (!messageText.trim() && !attachmentUrl)) return;
    try {
      if (editingMessageId) {
        const updated = await updateChatMessage(editingMessageId, user.id, messageText.trim());
        setMessages((current) => current.map((message) => message.id === updated.id ? updated : message));
        setEditingMessageId(null);
      } else {
        const sent = await sendChatMessage(user.id, selectedFriend.user_id, messageText.trim(), attachmentUrl);
        setMessages((current) => [...current.slice(-199), sent]);
      }
      setMessageText('');
    } catch {
      setNotice(t('messageSendError'));
      window.setTimeout(() => setNotice(''), 3000);
    }
  };

  const handleChatPhoto = async (file?: File) => {
    if (!file || !user?.id) return;
    try {
      const url = await uploadChatPhoto(file, user.id);
      await sendMessage(url);
    } catch (error) {
      console.error('Chat photo upload failed:', error);
      setNotice(t('photoUploadError'));
      window.setTimeout(() => setNotice(''), 3000);
    }
  };

  useEffect(() => {
    if (chatMessagesRef.current) chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
  }, [messages, selectedFriend]);

  const persistUserBooks = (updated: Book[]) => {
    setUserBooks(updated);
    window.localStorage.setItem('library-user-books', JSON.stringify(updated));
    window.dispatchEvent(new Event('library-user-books-updated'));
  };

  const deleteOwnBook = async (book: Book) => {
    if (book.ownerId !== user?.id || !window.confirm(t('deleteBookConfirm'))) return;
    persistUserBooks(userBooks.filter((item) => item.id !== book.id));
    await deleteRemoteBook(book.id);
    setNotice(t('bookDeleted'));
    window.setTimeout(() => setNotice(''), 2200);
  };

  useEffect(() => {
    if (!user?.id) return;
    syncCurrentReader({ userId: user.id, nickname, avatar, booksPublished: ownBooks.length, stats: readingStats })
      .then((record) => {
        if (record.xp > readingStats.xp) {
          const updated = saveStoredReadingStats({ ...readingStats, xp: record.xp, level: record.level, pagesRead: record.pagesRead });
          setReadingStats(updated);
        }
      })
      .catch((error) => console.warn('Синхронизация рейтинга:', error));
  }, [avatar, nickname, ownBooks.length, readingStats, user?.id]);

  useEffect(() => {
    const refresh = () => fetchBookLikes(allBooks.map((book) => book.id), user?.id)
      .then(({ counts, liked }) => { setBookLikes(counts); setLikedBooks(liked); })
      .catch((error) => console.warn('Загрузка лайков:', error));
    refresh();
    const timer = window.setInterval(refresh, 20000);
    return () => window.clearInterval(timer);
  }, [allBooks, user?.id]);

  const handleLike = async (book: Book) => {
    if (!user?.id) return;
    const liked = !likedBooks.includes(book.id);
    setLikedBooks((current) => liked ? [...current, book.id] : current.filter((id) => id !== book.id));
    setBookLikes((current) => ({ ...current, [book.id]: Math.max(0, (current[book.id] || 0) + (liked ? 1 : -1)) }));
    if (!(await toggleBookLike(book.id, user.id, liked))) {
      setLikedBooks((current) => liked ? current.filter((id) => id !== book.id) : [...current, book.id]);
      setBookLikes((current) => ({ ...current, [book.id]: Math.max(0, (current[book.id] || 0) + (liked ? -1 : 1)) }));
      setNotice(t('likeSaveError'));
      window.setTimeout(() => setNotice(''), 3500);
    }
  };

  useEffect(() => {
    if (!leaderboardOpen || !user?.id) return;
    loadLeaderboard({
      userBooks,
      currentUserId: user.id,
      currentNickname: nickname,
      currentAvatar: avatar,
      booksPublished: ownBooks.length,
      stats: readingStats,
    }).then(setLeaderboard).catch(() => setLeaderboard([]));
  }, [avatar, leaderboardOpen, nickname, ownBooks.length, readingStats, user?.id, userBooks]);

  // Форма добавления и редактирования книги
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Пользовательские книги');
  const [newCommunityCategory, setNewCommunityCategory] = useState('other');
  const [newLanguage, setNewLanguage] = useState<'ru' | 'en' | 'kk' | 'zh'>(language === 'zh' ? 'zh' : language);
  const [newSummary, setNewSummary] = useState('');
  const [newPrice, setNewPrice] = useState('0');
  const [newSpine, setNewSpine] = useState('#8C704B');
  const [newCover, setNewCover] = useState('');
  const [coverType, setCoverType] = useState<'ready' | 'custom'>('ready');
  const [selectedReadyCoverId, setSelectedReadyCoverId] = useState(READY_COVERS[0].id);
  const [newPages, setNewPages] = useState<BookPage[]>(() => [
    { kicker: t('defaultPage1Kicker'), title: t('defaultPage1Title'), text: t('defaultPage1Text') },
    { kicker: t('defaultPage2Kicker'), title: t('defaultPage2Title'), text: t('defaultPage2Text') },
  ]);
  const coverFileRef = useRef<HTMLInputElement | null>(null);

  // Редактирование профиля в кабинете
  const [inputNickname, setInputNickname] = useState(nickname);
  const [profileSaved, setProfileSaved] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setInputNickname(nickname);
  }, [nickname]);

  const isCommunityCategory = (book: Book) => book.isUserBook || book.category === 'Пользовательские книги';

  const categories = useMemo(() => {
    const fixed = [t('all'), t('myBooks'), t('topBooks'), t('userBooks'), t('fiction')];
    const rest = [...new Set(allBooks.map((book) => categoryLabels[book.category] || book.category))].filter((label) => !fixed.includes(label));
    return [...fixed, ...rest];
  }, [allBooks, t]);

  const filteredBooks = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    const sortedBooks = category === t('topBooks')
      ? [...allBooks].sort((a, b) => (bookLikes[b.id] || 0) - (bookLikes[a.id] || 0))
      : allBooks;
    const result = sortedBooks.filter((book) => {
      const matchesQuery = !normalized || `${book.title} ${book.author}`.toLowerCase().includes(normalized);
      if (!matchesQuery) return false;

      // Фильтрация по основной категории
      // Начальное значение категории — внутренний ключ `all`, а кнопка
      // категории использует локализованный текст из переводов.
      if (category !== 'all' && category !== t('all')) {
        if (category === t('myBooks')) {
          if (book.ownerId !== user?.id) return false;
        } else if (category === t('topBooks')) {
          // В разделе топа показываем все книги, отсортированные по числу лайков ниже.
          // Книги без лайков остаются в конце списка.
          if (!allBooks.some((item) => item.id === book.id)) return false;
        } else if (category === t('userBooks')) {
          if (!isCommunityCategory(book)) return false;
        } else if (category === t('fiction')) {
          if (book.category !== 'Художественная литература') return false;
        } else if ((categoryLabels[book.category] || book.category) !== category) {
          return false;
        }
      }

      if (category === t('userBooks') && communitySubcategory !== 'all' && isCommunityCategory(book)) {
        const selectedCommunityCategory = book.communityCategory || 'other';
        if (selectedCommunityCategory !== communitySubcategory) return false;
      }

      // Подкатегория по языку написания
      if (subLang !== 'all') {
        const bookLang = book.language || 'ru';
        if (bookLang !== subLang) return false;
      }

      return true;
    });

    // Keep the featured special edition at the front of the catalog.
    const special = result.find((book) => book.id === 100);
    return special ? [special, ...result.filter((book) => book.id !== 100)] : result;
  }, [allBooks, bookLikes, category, communitySubcategory, query, subLang, t, user?.id]);

  useEffect(() => {
    window.localStorage.setItem('library-cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    window.localStorage.setItem('library-bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    document.body.style.overflow = selectedBook || cartOpen || bookmarksOpen || accountOpen || photoPreview ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [accountOpen, bookmarksOpen, cartOpen, photoPreview, selectedBook]);

  useEffect(() => {
    if (!selectedBook || readerTab !== 'full') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') turnPages('next');
      if (event.key === 'ArrowLeft') turnPages('previous');
      if (event.key === 'Escape') setSelectedBook(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readerTab, selectedBook, isTurning, pageIndex]);

  const turnPages = (direction: 'next' | 'previous') => {
    if (!selectedBook || isTurning) return;
    const lastStart = Math.max(0, selectedBook.pages.length - 2);
    const nextIndex = direction === 'next'
      ? Math.min(pageIndex + 2, lastStart)
      : Math.max(pageIndex - 2, 0);
    if (nextIndex === pageIndex) return;
    setTurnDirection(direction);
    setTurningTo(nextIndex);
    setIsTurning(true);

    // Начисление опыта за чтение (каждый переворот страниц = +15 XP)
    const res = addReadingXp(15, true);
    setReadingStats(res.stats);
    if (res.leveledUp) {
      setLevelUpBanner(`🎉 ${t('levelUpNotice')} ${t('levelShort')} ${res.stats.level}!`);
      setTimeout(() => setLevelUpBanner(null), 3500);
    }

    if (turnTimer.current) window.clearTimeout(turnTimer.current);
    turnTimer.current = window.setTimeout(() => {
      setPageIndex(nextIndex);
      setTurningTo(null);
      setIsTurning(false);
      turnTimer.current = null;
    }, PAGE_TURN_MS);
  };

  const openReader = (book: Book, startPage = 0) => {
    if (turnTimer.current) window.clearTimeout(turnTimer.current);
    setSelectedBook(book);
    setPageIndex(Math.min(startPage, Math.max(0, book.pages.length - 2)));
    setReaderTab('summary');
    setIsTurning(false);
    setTurningTo(null);

    // Вход в книгу также дает ежедневную активность и +10 XP
    const res = addReadingXp(10, false);
    setReadingStats(res.stats);
    if (res.leveledUp) {
      setLevelUpBanner(`🎉 ${t('levelUpNotice')} ${t('levelShort')} ${res.stats.level}!`);
      setTimeout(() => setLevelUpBanner(null), 3500);
    }
  };

  const addToCart = (book: Book, event?: React.MouseEvent<HTMLButtonElement>) => {
    if (cart.includes(book.id)) {
      setCartOpen(true);
      return;
    }

    let startRect: DOMRect | null = null;
    if (event) {
      const card = event.currentTarget.closest('.library-book-card');
      const cover = card?.querySelector('.library-book-cover') as HTMLElement | null;
      if (cover) {
        startRect = cover.getBoundingClientRect();
      }
    }

    const targetRect = cartButtonRef.current?.getBoundingClientRect();

    if (startRect && targetRect) {
      const flyId = Date.now() + Math.random();
      const newFly: FlyingBook = {
        id: flyId,
        book,
        startX: startRect.left,
        startY: startRect.top,
        startWidth: startRect.width,
        startHeight: startRect.height,
        targetX: targetRect.left + targetRect.width / 2 - startRect.width / 2,
        targetY: targetRect.top + targetRect.height / 2 - startRect.height / 2,
      };

      setFlyingBooks((current) => [...current, newFly]);

      window.setTimeout(() => {
        setFlyingBooks((current) => current.filter((item) => item.id !== flyId));
        setCart((current) => (current.includes(book.id) ? current : [...current, book.id]));
        setCartBumping(true);
        window.setTimeout(() => setCartBumping(false), 450);
        setNotice(`«${book.title}» ${t('addedToCart')}`);
        window.setTimeout(() => setNotice(''), 2200);
      }, 700);
    } else {
      setCart((current) => [...current, book.id]);
      setNotice(`«${book.title}» ${t('addedToCart')}`);
      window.setTimeout(() => setNotice(''), 2200);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setNewCover(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddPage = () => {
    setNewPages((prev) => [
      ...prev,
      { kicker: `${t('pageKickerPrefix')} ${prev.length + 1}`, title: `${t('pageKickerPrefix')} ${prev.length + 1}`, text: t('pageTextPlaceholder') },
    ]);
  };

  const handleUpdatePage = (index: number, field: keyof BookPage, value: string) => {
    setNewPages((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const detectBookLanguage = (title: string, summary: string, pages: BookPage[]) => {
    const sample = [title, summary, ...pages.flatMap((page) => [page.title, page.text])].join(' ');
    const counts = { ru: 0, en: 0, kk: 0, zh: 0 };
    for (const char of sample) {
      if (/[әғқңөұүһі]/i.test(char)) counts.kk += 3;
      else if (/[а-яё]/i.test(char)) counts.ru += 1;
      else if (/\p{Script=Han}/u.test(char)) counts.zh += 1;
      else if (/[a-z]/i.test(char)) counts.en += 1;
    }
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const winner = ranked[0];
    const runnerUp = ranked[1];
    if (!winner || winner[1] < 8 || (runnerUp && winner[1] < runnerUp[1] * 1.2)) return null;
    return winner[0] as 'ru' | 'en' | 'kk' | 'zh';
  };

  const detectedBookLanguage = detectBookLanguage(newTitle, newSummary, newPages);
  const effectiveBookLanguage = detectedBookLanguage || newLanguage;

  useEffect(() => {
    if (detectedBookLanguage) setNewLanguage(detectedBookLanguage);
  }, [detectedBookLanguage]);

  const handleRemovePage = (index: number) => {
    if (newPages.length <= 1) return;
    setNewPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim()) {
      setNotice(t('needTitleSummary'));
      setTimeout(() => setNotice(''), 2500);
      return;
    }

    const finalCover = coverType === 'ready' ? selectedReadyCoverId : (newCover || undefined);
    const selectedTemplate = coverType === 'ready' ? READY_COVERS.find((c) => c.id === selectedReadyCoverId) : null;

    const created: Book = {
      id: editingBookId ?? Date.now(),
      title: newTitle.trim(),
      author: nickname,
      authorAvatar: avatar || DEFAULT_AVATAR,
      ownerId: user?.id,
      category: 'Пользовательские книги',
      communityCategory: newCommunityCategory,
      language: effectiveBookLanguage,
      price: Math.max(0, parseInt(newPrice, 10) || 0),
      spine: selectedTemplate ? selectedTemplate.spine : (coverType === 'custom' ? 'transparent' : (newSpine || '#8C704B')),
      summary: newSummary.trim(),
      coverImage: finalCover,
      pages: newPages.length > 0 ? newPages : [
        { kicker: `${t('pageKickerPrefix')} 1`, title: newTitle.trim(), text: newSummary.trim() }
      ],
      isUserBook: true,
    };

    const updatedBooks = editingBookId
      ? userBooks.map((book) => book.id === editingBookId && book.ownerId === user?.id ? created : book)
      : [created, ...userBooks];
    persistUserBooks(updatedBooks);

    // Сохранение в облачную базу Supabase для всех пользователей мира
    (editingBookId ? updateRemoteBook(created) : saveRemoteBook(created)).catch((err) => console.warn('Supabase cloud sync:', err));

    // Опыт начисляется только за новую публикацию и зависит от числа страниц.
    if (!editingBookId) {
      const xpRes = addReadingXp(xpForBookPages(created.pages.length), false);
      setReadingStats(xpRes.stats);
      if (xpRes.leveledUp) {
        setLevelUpBanner(`🎉 ${t('levelUpNotice')} ${t('levelShort')} ${xpRes.stats.level}!`);
        setTimeout(() => setLevelUpBanner(null), 3500);
      }
    }

    setUploadModalOpen(false);
    setEditingBookId(null);
    setCommunitySubcategory('all');
    setSubLang('all');
    setCategory(t('userBooks'));
    setNotice(t('bookPublished'));
    setTimeout(() => setNotice(''), 2500);

    setNewTitle('');
    setNewCategory('Пользовательские книги');
    setNewCommunityCategory('other');
    setNewSummary('');
    setNewCover('');
    setNewPages([
      { kicker: t('defaultPage1Kicker'), title: t('defaultPage1Title'), text: t('defaultPage1Text') },
      { kicker: t('defaultPage2Kicker'), title: t('defaultPage2Title'), text: t('defaultPage2Text') },
    ]);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await saveAvatarFile(file);
    if (res.success) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2200);
    } else {
      setNotice(res.error === 'nicknameTaken' ? t('nicknameTaken') : t('avatarSaveError'));
      setTimeout(() => setNotice(''), 3000);
    }
    if (avatarFileRef.current) avatarFileRef.current.value = '';
  };

  const handleResetAvatar = async () => {
    const res = await resetAvatar();
    if (res.success) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2200);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextNickname = inputNickname.trim() || nickname;
    const res = await updateProfile(nextNickname, avatar);
    if (res.success) {
      setProfileSaved(true);
      window.setTimeout(() => setProfileSaved(false), 2200);
    } else {
      setNotice(res.error === 'nicknameTaken' ? t('nicknameTaken') : t('profileSaveError'));
      window.setTimeout(() => setNotice(''), 2500);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm(t('deleteAccountConfirm'))) return;
    try {
      if (user) {
        await user.delete();
      }
      window.localStorage.clear();
      window.location.href = `${window.location.origin}${basePath}/sign-up`;
    } catch (err) {
      console.error(err);
      window.localStorage.clear();
      await signOut({ redirectUrl: `${window.location.origin}${basePath}/sign-up` });
    }
  };

  const saveBookmark = () => {
    if (!selectedBook) return;
    setBookmarks((current) => ({
      ...current,
      [selectedBook.id]: { title: selectedBook.title, page: pageIndex + 1 },
    }));
    setNotice(t('placeSavedNotice'));
    window.setTimeout(() => setNotice(''), 2200);
  };

  const cartBooks = allBooks.filter((book) => cart.includes(book.id));
  const total = cartBooks.reduce((sum, book) => sum + book.price, 0);
  const closeCart = () => {
    setCartOpen(false);
    setCheckoutOpen(false);
    setOrderSubmitted(false);
  };
  const submitOrder = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cartBooks.length) return;
    setCart([]);
    setCheckoutOpen(false);
    setOrderSubmitted(true);
  };
  const currentPages = selectedBook?.pages.slice(pageIndex, pageIndex + 2) ?? [];
  const incomingPages = selectedBook && turningTo !== null ? selectedBook.pages.slice(turningTo, turningTo + 2) : [];
  const leftPage = isTurning && turnDirection === 'previous' ? incomingPages[0] : currentPages[0];
  const rightPage = isTurning && turnDirection === 'next' ? incomingPages[1] : currentPages[1];
  const leftNumber = (isTurning && turnDirection === 'previous' && turningTo !== null ? turningTo : pageIndex) + 1;
  const rightNumber = (isTurning && turnDirection === 'next' && turningTo !== null ? turningTo : pageIndex) + 2;
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.username ?? t('reader');

  return (
    <div className="library-app">
      <header className="library-header">
        <a className="library-logo" href="#top" aria-label={`${t('brand')} — ${t('all')}`}>
          <span className="library-logo-mark"><BookOpen size={19} strokeWidth={1.8} /></span>
          <span>{t('brand')}</span>
        </a>
        <label className="library-search">
          <Search size={18} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} aria-label={t('searchAria')} />
        </label>
        <nav className="library-nav" aria-label={t('libraryNavigation')}>
          <button type="button" onClick={() => setLeaderboardOpen(true)} className="library-nav-leaderboard-btn" title={t('leaderboard')}>
            <Trophy size={15} /> {t('leaderboard')}
          </button>
          <button type="button" onClick={() => { setSocialTab('friends'); setFriendsOpen(true); }} title={t('friends')}>
            <UserRound size={15} /> {t('friends')} <span>{friends.length}</span>
          </button>
          <button type="button" onClick={() => { setSocialTab('chat'); setFriendsOpen(true); if (!selectedFriend && friends[0]) setSelectedFriend(friends[0]); }} title={t('chat')}>
            <MessageCircle size={15} /> {t('chat')}
          </button>
          <button type="button" onClick={() => setBookmarksOpen(true)}><Bookmark size={15} /> {t('bookmarks')} <span>{Object.keys(bookmarks).length}</span></button>
          <button
            ref={cartButtonRef}
            type="button"
            className={`library-nav-cart-btn ${cartBumping ? 'is-bumping' : ''}`}
            onClick={() => { setOrderSubmitted(false); setCartOpen(true); }}
          >
            <ShoppingCart size={15} /> {t('cart')} <span>{cart.length}</span>
          </button>
          <button type="button" onClick={() => setAccountOpen(true)} className="library-nav-account-btn">
            <img src={avatar || DEFAULT_AVATAR} alt="" className="library-header-avatar" />
            <span>{nickname}</span>
            <span className="library-header-level-badge">{t('levelShort')} {readingStats.level}</span>
          </button>
        </nav>
        <div className="library-header-actions">
          <LanguageSwitcher />
          <button
            type="button"
            className="library-return-link"
            onClick={() => { window.location.href = `${window.location.origin}${basePath}/sign-up`; }}
          >
            {t('backToRegistration')}
          </button>
        </div>
      </header>

      {levelUpBanner ? (
        <div className="library-level-up-banner" role="alert">
          <Sparkles size={18} />
          <span>{levelUpBanner}</span>
        </div>
      ) : null}

      <main id="top">
        <div className="library-quote-bar">
          <button
            type="button"
            className="library-quote-btn"
            onClick={pickNextQuote}
            title={t('nextQuoteHint')}
            aria-label={`${t('quoteOfTheDay')}: ${currentQuote.text[language] ?? currentQuote.text.ru}`}
          >
            <span className="library-quote-tag">
              <Sparkles size={14} aria-hidden="true" />
              <span>{t('quoteOfTheDay')}</span>
            </span>
            <span className="library-quote-text">
              «{currentQuote.text[language] ?? currentQuote.text.ru}»
            </span>
            <span className="library-quote-author">
              — {currentQuote.author[language] ?? currentQuote.author.ru}
            </span>
            <span className="library-quote-icon" aria-hidden="true">
              <RefreshCw size={14} />
            </span>
          </button>
        </div>

        <section className="library-hero">
          <div>
            <p className="library-kicker">{t('librarySpace')}</p>
            <h1>{t('libraryHero')}</h1>
            <p className="library-hero-copy">{t('libraryHeroCopy')}</p>
          </div>
          <div className="library-shelf" aria-hidden="true">
            <span className="shelf-book shelf-book-one" />
            <span className="shelf-book shelf-book-two" />
            <span className="shelf-book shelf-book-three" />
            <span className="shelf-book shelf-book-four" />
            <span className="shelf-book shelf-book-five" />
            <span className="shelf-book shelf-book-six" />
            <span className="shelf-line" />
          </div>
        </section>
      </main>

      <section className="library-catalog-section" aria-labelledby="catalog-title">
        <div className="library-catalog-container">
          <div className="library-catalog-heading">
            <div>
              <p className="library-kicker">{t('readerShelf')}</p>
              <h2 id="catalog-title">{t('books')}</h2>
            </div>
            <span className="library-count">{filteredBooks.length} {t('foundOf')} {allBooks.length}</span>
          </div>
          <div className="library-filters" role="tablist" aria-label={t('bookCategories')}>
            {categories.map((item) => {
              const isActive = category === item || (category === 'all' && item === t('all'));
              return (
                <button key={item} type="button" role="tab" aria-selected={isActive} className={isActive ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>
              );
            })}
          </div>

          {category === t('userBooks') && (
            <div className="library-subcategories" aria-label={t('communityCategories')}>
              <span className="library-subcategory-label">{t('communityCategories')}:</span>
              <div className="library-subcategory-pills">
                <button type="button" className={`library-subpill ${communitySubcategory === 'all' ? 'is-active' : ''}`} onClick={() => setCommunitySubcategory('all')}>
                  {t('allCommunityCategories')}
                </button>
                {COMMUNITY_SUBCATEGORIES.map((subcategory) => (
                  <button key={subcategory.id} type="button" className={`library-subpill ${communitySubcategory === subcategory.id ? 'is-active' : ''}`} onClick={() => setCommunitySubcategory(subcategory.id)}>
                    {t(subcategory.key)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filter by the language a book is written in. */}
          <div className="library-subcategories" aria-label={t('bookLanguage')}>
            <span className="library-subcategory-label">{t('bookLanguage')}:</span>
            <div className="library-subcategory-pills">
              <button
                type="button"
                className={`library-subpill ${subLang === 'all' ? 'is-active' : ''}`}
                onClick={() => setSubLang('all')}
              >
                {t('allLanguages')}
              </button>
              <button
                type="button"
                className={`library-subpill ${subLang === 'ru' ? 'is-active' : ''}`}
                onClick={() => setSubLang('ru')}
              >
                🇷🇺 {t('langRu')}
              </button>
              <button
                type="button"
                className={`library-subpill ${subLang === 'en' ? 'is-active' : ''}`}
                onClick={() => setSubLang('en')}
              >
                🇬🇧 {t('langEn')}
              </button>
              <button
                type="button"
                className={`library-subpill ${subLang === 'kk' ? 'is-active' : ''}`}
                onClick={() => setSubLang('kk')}
              >
                🇰🇿 {t('langKk')}
              </button>
              <button
                type="button"
                className={`library-subpill ${subLang === 'zh' ? 'is-active' : ''}`}
                onClick={() => setSubLang('zh')}
              >
                🇨🇳 {t('langZh')}
              </button>
            </div>
          </div>

          {filteredBooks.length ? (
            <div className="library-book-grid">
              {filteredBooks.map((book) => (
                <article className={`library-book-card ${book.id === 100 || book.id === 1000 ? 'library-book-card-special' : ''}`} key={book.id}>
                  {book.id === 100 || book.id === 1000 ? (
                    <div className="library-card-3d-stage flex flex-col items-center justify-center relative min-h-[290px] pt-1">
                      <Interactive3DBook
                        compact={true}
                        book={book}
                        showDetailsButton={false}
                        showControls={false}
                        onOpenReader={() => openReader(book)}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="library-cover-button"
                      onClick={() => openReader(book)}
                      aria-label={`${t('openBook')} «${book.title}»`}
                    >
                      <BookCover book={book} categoryLabels={categoryLabels} />
                    </button>
                  )}
                  <div className="library-card-title-row">
                    <h3>{book.title}</h3>
                    <span className="library-card-lang-badge">
                      {(book.language || 'ru').toUpperCase()}
                    </span>
                  </div>
                  <div className="library-card-author-row">
                    <img
                      src={book.authorAvatar || DEFAULT_AVATAR}
                      alt=""
                      className="library-author-avatar-badge"
                    />
                    <p>{book.author}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <strong>{book.price === 0 ? t('free') : `${book.price} ₸`}</strong>
                  </div>
                  <div className="library-card-actions">
                    <button type="button" className="library-primary-button" onClick={() => openReader(book)}>
                      {book.price === 0 ? t('readFree') : t('openBook')}
                    </button>
                    <button type="button" className={`library-like-button ${likedBooks.includes(book.id) ? 'is-liked' : ''}`} onClick={() => handleLike(book)} aria-label={t('likeBook')}><Heart size={15} fill={likedBooks.includes(book.id) ? 'currentColor' : 'none'} /> {bookLikes[book.id] || 0}</button>
                    {book.price > 0 ? (
                      cart.includes(book.id) ? (
                        <button
                          type="button"
                          className="library-primary-button library-in-cart-button"
                          onClick={() => setCartOpen(true)}
                          title={t('inCart')}
                        >
                          <Check size={14} /> {t('inCart')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="library-outline-button"
                          onClick={(event) => addToCart(book, event)}
                        >
                          {t('addToCart')}
                        </button>
                      )
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="library-empty">{t('noBooks')}</p>}

          {/* Секция загрузки книг от пользователей внизу каталога */}
          <div className="library-upload-section">
            <div className="library-upload-card">
              <div className="library-upload-info">
                <span className="library-upload-tag">{t('myBooks')}: {ownBooks.length}</span>
                <span className="library-upload-tag">
                  <Sparkles size={14} /> {t('userBooks')}
                </span>
                <h3>{t('uploadBookTitle')}</h3>
                <p>{t('uploadBookDesc')}</p>
              </div>
              <button
                type="button"
                className="library-primary-button library-upload-cta-btn"
                onClick={() => { setEditingBookId(null); setUploadModalOpen(true); }}
              >
                <PlusCircle size={18} /> {t('uploadBook')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="library-footer">{t('libraryFooter')}</footer>

      {selectedBook ? (
        <div className="library-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedBook(null); }}>
          <section className="library-reader" role="dialog" aria-modal="true" aria-labelledby="reader-title">
            <div className="library-reader-toolbar">
              <span><span className="library-reader-dot" /> {selectedBook.title}</span>
              <span className="library-reader-progress">{readerTab === 'summary' ? t('summary') : `${Math.min(pageIndex + 2, selectedBook.pages.length)} / ${selectedBook.pages.length} ${t('pages')}`}</span>
              <button type="button" onClick={() => setSelectedBook(null)} aria-label={t('close')}>{t('close')} <X size={18} /></button>
            </div>
            <div className="library-reader-tabs">
              <button type="button" className={readerTab === 'summary' ? 'active' : ''} onClick={() => setReaderTab('summary')}>{t('aboutBook')}</button>
              <button type="button" className={readerTab === 'full' ? 'active' : ''} onClick={() => setReaderTab('full')}>{t('readBook')}</button>
            </div>
            {readerTab === 'summary' ? (
              <div className="library-summary">
                <BookCover book={selectedBook} categoryLabels={categoryLabels} small />
                <div>
                  <h2 id="reader-title">{selectedBook.title}</h2>
                  <p className="library-reader-author">{selectedBook.author} · {selectedBook.category}</p>
                  <span className="library-summary-label">{t('aboutBook')}</span>
                  <p className="library-summary-copy">{selectedBook.summary}</p>
                  <div className="library-book-owner-actions">
                    {selectedBook.ownerId === user?.id ? (
                      <>
                        <button type="button" className="library-outline-button" onClick={() => { setSelectedBook(null); openEditBook(selectedBook); }}>✎ {t('editBook')}</button>
                        <button type="button" className="library-outline-button" onClick={() => { setSelectedBook(null); deleteOwnBook(selectedBook); }}><Trash2 size={14} /> {t('deleteBook')}</button>
                      </>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" className="library-primary-button" onClick={() => setReaderTab('full')}>{t('startReading')} <ChevronRight size={16} /></button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="library-full-reader">
                <div className={`library-book-spread ${isTurning ? `is-turning turn-${turnDirection}` : ''}`}>
                  <div className="library-spread-static">
                    <PageSheet page={leftPage} number={leftNumber} side="left" disabled={isTurning} onTurn={pageIndex === 0 ? undefined : () => turnPages('previous')} />
                    <PageSheet page={rightPage} number={rightNumber} side="right" disabled={isTurning} onTurn={pageIndex >= selectedBook.pages.length - 2 ? undefined : () => turnPages('next')} />
                  </div>
                  {isTurning ? (
                    <div className="library-flip-leaf" aria-hidden="true">
                      <div className="library-flip-face library-flip-front">
                        {turnDirection === 'next'
                          ? <PageSheet page={currentPages[1]} number={pageIndex + 2} side="right" />
                          : <PageSheet page={currentPages[0]} number={pageIndex + 1} side="left" />}
                      </div>
                      <div className="library-flip-face library-flip-back">
                        {turnDirection === 'next'
                          ? <PageSheet page={incomingPages[0]} number={(turningTo ?? 0) + 1} side="left" />
                          : <PageSheet page={incomingPages[1]} number={(turningTo ?? 0) + 2} side="right" />}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="library-page-controls">
                  <button type="button" disabled={pageIndex === 0 || isTurning} onClick={() => turnPages('previous')}><ChevronLeft size={16} /> {t('previous')}</button>
                  <span>{pageIndex + 1}—{Math.min(pageIndex + 2, selectedBook.pages.length)} / {selectedBook.pages.length} {t('pages')}</span>
                  <button type="button" disabled={pageIndex >= selectedBook.pages.length - 2 || isTurning} onClick={() => turnPages('next')}>{t('next')} <ChevronRight size={16} /></button>
                </div>
              </div>
            )}
            <div className="library-reader-bottom">
              <button type="button" onClick={saveBookmark}><Bookmark size={15} /> {bookmarks[selectedBook.id] ? t('placeSaved') : t('savePlace')}</button>
              <span>{t('turnHint')}</span>
            </div>
          </section>
        </div>
      ) : null}

      {cartOpen ? (
        <div className="library-overlay library-drawer-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCart(); }}>
          <aside className="library-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
            <button type="button" className="library-close-button" onClick={closeCart}>{t('close')} <X size={18} /></button>
            <h2 id="cart-title">{orderSubmitted ? t('orderSuccessTitle') : t('cart')}</h2>
            {orderSubmitted ? (
              <div className="library-order-success">
                <span className="library-order-success-icon"><Check size={22} /></span>
                <p>{t('orderSuccessCopy')}</p>
                <button type="button" className="library-primary-button library-wide-button" onClick={closeCart}>{t('continueShopping')}</button>
              </div>
            ) : checkoutOpen ? (
              <>
                <p className="library-muted library-checkout-intro">{t('checkoutIntro')}</p>
                {cartBooks.map((book) => (
                  <div className="library-cart-item" key={book.id}><span>{book.title}</span><strong>{book.price} ₸</strong></div>
                ))}
                <strong className="library-total">{t('total')}: {total} ₸</strong>
                <form className="library-checkout-form" onSubmit={submitOrder}>
                  <div className="library-form-group">
                    <label htmlFor="checkout-name">{t('customerName')}</label>
                    <input id="checkout-name" name="name" className="library-form-input" autoComplete="name" required />
                  </div>
                  <div className="library-form-group">
                    <label htmlFor="checkout-phone">{t('customerPhone')}</label>
                    <input id="checkout-phone" name="phone" className="library-form-input" type="tel" autoComplete="tel" required />
                  </div>
                  <div className="library-form-group">
                    <label htmlFor="checkout-address">{t('deliveryAddress')}</label>
                    <textarea id="checkout-address" name="address" className="library-form-input library-form-textarea" autoComplete="street-address" rows={3} required />
                  </div>
                  <p className="library-checkout-note">{t('orderDemoNotice')}</p>
                  <button type="submit" className="library-primary-button library-wide-button">{t('placeOrder')}</button>
                  <button type="button" className="library-checkout-back" onClick={() => setCheckoutOpen(false)}>{t('backToCart')}</button>
                </form>
              </>
            ) : (
              <>
                {cartBooks.length ? cartBooks.map((book) => (
                  <div className="library-cart-item" key={book.id}>
                    <span>{book.title}</span>
                    <span className="library-cart-item-actions"><strong>{book.price} ₸</strong><button type="button" onClick={() => setCart((current) => current.filter((id) => id !== book.id))}>{t('remove')}</button></span>
                  </div>
                )) : <p className="library-muted">{t('cartEmpty')}</p>}
                <strong className="library-total">{cartBooks.length ? `${t('total')}: ${total} ₸` : ''}</strong>
                {cartBooks.length ? <button type="button" className="library-primary-button library-wide-button" onClick={() => setCheckoutOpen(true)}>{t('checkout')}</button> : null}
              </>
            )}
          </aside>
        </div>
      ) : null}

      {bookmarksOpen ? (
        <div className="library-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBookmarksOpen(false); }}>
          <section className="library-small-modal" role="dialog" aria-modal="true" aria-labelledby="bookmarks-title">
            <button type="button" className="library-close-button" onClick={() => setBookmarksOpen(false)}>{t('close')} <X size={18} /></button>
            <h2 id="bookmarks-title">{t('myBookmarks')}</h2>
            {Object.entries(bookmarks).length ? Object.entries(bookmarks).map(([id, bookmark]) => (
              <button type="button" className="library-bookmark-item" key={id} onClick={() => { setBookmarksOpen(false); const book = books.find((item) => item.id === Number(id)); if (book) openReader(book, Math.max(0, bookmark.page - 1)); }}>
                <span>{bookmark.title}</span><span>{t('page')} {bookmark.page}</span>
              </button>
            )) : <p className="library-muted">{t('noBookmarks')}</p>}
          </section>
        </div>
      ) : null}

      {uploadModalOpen ? (
        <div
          className="library-overlay"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setUploadModalOpen(false); }}
        >
          <section className="library-upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-modal-title">
            <button type="button" className="library-close-button" onClick={() => setUploadModalOpen(false)}>
              {t('close')} <X size={18} />
            </button>
            <span className="library-kicker">{t('userBooks')}</span>
            <h2 id="upload-modal-title">{editingBookId ? t('editBookTitle') : t('uploadBookTitle')}</h2>
            <p className="library-muted">{t('uploadBookDesc')}</p>

            <form onSubmit={handleCreateBook} className="library-upload-form">
              <div className="library-upload-grid">
                {/* Левая колонка: обложка, корешок, автор */}
                <div className="library-upload-left">
                  {/* Переключатель: готовая обложка или своя */}
                  <div className="library-cover-type-toggle">
                    <button
                      type="button"
                      className={`library-cover-type-btn ${coverType === 'ready' ? 'is-active' : ''}`}
                      onClick={() => setCoverType('ready')}
                    >
                      {t('readyCovers')}
                    </button>
                    <button
                      type="button"
                      className={`library-cover-type-btn ${coverType === 'custom' ? 'is-active' : ''}`}
                      onClick={() => setCoverType('custom')}
                    >
                      {t('customCover')}
                    </button>
                  </div>

                  <div className="library-upload-cover-preview">
                    {coverType === 'ready' ? (
                      (() => {
                        const template = READY_COVERS.find((c) => c.id === selectedReadyCoverId) || READY_COVERS[0];
                        return (
                          <div
                            className="library-book-cover library-preview-cover library-custom-cover"
                            style={{
                              '--spine-color': template.spine,
                              background: `${template.pattern}, ${template.gradient}`,
                              borderColor: template.border,
                            } as CSSProperties}
                          >
                            <div className="library-custom-cover-overlay library-ready-cover-overlay" style={{ borderColor: template.border }}>
                              <span className="library-cover-category">{newCategory}</span>
                              <strong>{newTitle || t('yourBookTitle')}</strong>
                              <span className="library-cover-author">{nickname}</span>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div
                        className={`library-book-cover library-preview-cover${newCover ? ' library-custom-cover library-upload-custom-preview has-uploaded-cover' : ''}`}
                        style={{
                          '--spine-color': newSpine,
                          borderLeft: newCover ? 0 : undefined,
                          backgroundImage: newCover ? `url(${newCover})` : undefined,
                        } as CSSProperties}
                      >
                        {!newCover ? (
                          <div className="library-custom-cover-overlay">
                            <span className="library-cover-category">{newCategory}</span>
                            <strong>{newTitle || t('yourBookTitle')}</strong>
                            <span className="library-cover-author">{nickname}</span>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {coverType === 'ready' ? (
                      <div className="library-ready-covers-gallery">
                        <label className="library-field-sublabel">{t('chooseCoverStyle')}</label>
                        <div className="library-ready-covers-grid">
                          {READY_COVERS.map((cov) => (
                            <button
                              key={cov.id}
                              type="button"
                              className={`library-ready-cover-thumb ${selectedReadyCoverId === cov.id ? 'is-selected' : ''}`}
                              style={{ background: cov.gradient }}
                              onClick={() => {
                                setSelectedReadyCoverId(cov.id);
                                setNewSpine(cov.spine);
                              }}
                              title={t(cov.translationKey)}
                            >
                              <span>{t(cov.translationKey)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="library-cover-controls">
                        <button
                          type="button"
                          onClick={() => coverFileRef.current?.click()}
                          className="library-custom-upload-cta-btn"
                        >
                          <Upload size={16} />
                          <span>{t('uploadCustomCover')}</span>
                        </button>
                        <p className="library-upload-cover-hint">
                          {t('customCoverHint')}
                        </p>
                        <input
                          ref={coverFileRef}
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          className="hidden"
                        />
                        {newCover ? (
                          <div className="library-cover-active-actions">
                            <span className="library-cover-loaded-badge">✓ {t('coverUploaded')}</span>
                            <button
                              type="button"
                              onClick={() => setNewCover('')}
                              className="library-text-btn"
                            >
                              {t('cancel')}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {coverType === 'custom' ? (
                    <div className="library-form-group">
                      <label>{t('bookSpine')}</label>
                      <div className="library-spine-palette">
                        {['#8C704B', '#5A422B', '#2D2418', '#5C1D24', '#283645', '#2E5A3C', '#B1844D'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`library-spine-swatch ${newSpine === c ? 'is-selected' : ''}`}
                            style={{ backgroundColor: c }}
                            onClick={() => setNewSpine(c)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="library-author-preview-box">
                    <img src={avatar || DEFAULT_AVATAR} alt="" className="library-author-avatar-badge" />
                    <div>
                      <span className="library-author-preview-label">{t('bookAuthor')}:</span>
                      <strong>{nickname}</strong>
                    </div>
                  </div>
                </div>

                {/* Правая колонка: название, категория, язык, описание, главы */}
                <div className="library-upload-right">
                  <div className="library-form-group">
                    <label>{t('bookTitle')}</label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder={t('bookTitlePlaceholder')}
                      className="library-form-input"
                    />
                  </div>

                  <div className="library-form-row">
                    <div className="library-form-group">
                      <label>{t('communityCategories')}</label>
                      <select
                        value={newCommunityCategory}
                        onChange={(e) => setNewCommunityCategory(e.target.value)}
                        className="library-form-input"
                      >
                        {COMMUNITY_SUBCATEGORIES.map((subcategory) => (
                          <option key={subcategory.id} value={subcategory.id}>{t(subcategory.key)}</option>
                        ))}
                      </select>
                      <p className="library-field-hint">{t('communityBookCategoryHint')}</p>
                    </div>

                    <div className="library-form-group">
                      <label>{t('bookLanguage')}</label>
                      <select
                        value={effectiveBookLanguage}
                        onChange={(e) => setNewLanguage(e.target.value as 'ru' | 'en' | 'kk' | 'zh')}
                        className="library-form-input"
                      >
                        <option value="ru">{t('langRu')} (RU)</option>
                        <option value="en">{t('langEn')} (EN)</option>
                        <option value="kk">{t('langKk')} (KZ)</option>
                        <option value="zh">{t('langZh')} (ZH)</option>
                      </select>
                      <p className="library-field-hint">{t('bookLanguageAutoHint')}</p>
                    </div>

                    <div className="library-form-group">
                      <label>{t('bookPrice')}</label>
                      <input
                        type="number"
                        min="0"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        placeholder="0"
                        className="library-form-input"
                      />
                    </div>
                  </div>

                  <div className="library-form-group">
                    <label>{t('bookSummary')}</label>
                    <textarea
                      required
                      rows={2}
                      value={newSummary}
                      onChange={(e) => setNewSummary(e.target.value)}
                      placeholder={t('bookSummaryPlaceholder')}
                      className="library-form-input library-form-textarea"
                    />
                  </div>

                  <div className="library-form-group">
                    <div className="library-pages-header">
                      <label>{t('bookPages')} ({newPages.length})</label>
                      <button
                        type="button"
                        onClick={handleAddPage}
                        className="library-add-page-btn"
                      >
                        {t('addPage')}
                      </button>
                    </div>

                    <div className="library-pages-list">
                      {newPages.map((pg, idx) => (
                        <div key={idx} className="library-page-item-edit">
                          <div className="library-page-item-top">
                            <input
                              type="text"
                              value={pg.kicker}
                              onChange={(e) => handleUpdatePage(idx, 'kicker', e.target.value)}
                              placeholder={t('pageKicker')}
                              className="library-page-input-kicker"
                            />
                            <input
                              type="text"
                              value={pg.title}
                              onChange={(e) => handleUpdatePage(idx, 'title', e.target.value)}
                              placeholder={t('pageTitle')}
                              className="library-page-input-title"
                            />
                            {newPages.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => handleRemovePage(idx)}
                                className="library-page-remove-btn"
                                title={t('removePage')}
                              >
                                <X size={14} />
                              </button>
                            ) : null}
                          </div>
                          <textarea
                            rows={3}
                            value={pg.text}
                            onChange={(e) => handleUpdatePage(idx, 'text', e.target.value)}
                            placeholder={t('pageTextPlaceholder')}
                            className="library-form-input library-page-textarea"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="library-upload-actions">
                    <button
                      type="button"
                      className="library-outline-button library-cancel-upload-btn"
                      onClick={() => setUploadModalOpen(false)}
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="submit"
                      className="library-primary-button"
                    >
                      <Check size={16} /> {editingBookId ? t('saveChanges') : t('publishBook')}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {accountOpen ? (
        <div className="library-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAccountOpen(false); }}>
          <section className="library-small-modal" role="dialog" aria-modal="true" aria-labelledby="account-title">
            <button type="button" className="library-close-button" onClick={() => setAccountOpen(false)}>{t('close')} <X size={18} /></button>

            {/* Аватарка и управление фото */}
            <div className="library-account-profile-header">
              <div className="library-avatar-wrapper">
                <img
                  src={avatar || DEFAULT_AVATAR}
                  alt={nickname}
                  className="library-account-avatar-img"
                />
                <button
                  type="button"
                  onClick={() => avatarFileRef.current?.click()}
                  className="library-avatar-upload-trigger"
                  title={t('uploadAvatar')}
                >
                  <Camera size={16} />
                </button>
                <input
                  ref={avatarFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              <div className="library-avatar-actions">
                <button
                  type="button"
                  onClick={() => avatarFileRef.current?.click()}
                  className="library-outline-button library-mini-btn"
                >
                  <Camera size={13} /> {t('uploadAvatar')}
                </button>
                <button
                  type="button"
                  onClick={handleResetAvatar}
                  className="library-outline-button library-mini-btn library-muted-btn"
                >
                  <RotateCcw size={13} /> {t('defaultAvatar')}
                </button>
              </div>
            </div>

            {/* Блок опыта, уровня и серии чтения */}
            {(() => {
              const levelData = calculateLevel(readingStats.xp);
              return (
                <div className="library-profile-stats-card">
                  <div className="library-stats-header">
                    <div className="library-level-badge-large">
                      <Award size={20} />
                      <div>
                        <span className="library-stats-sublabel">{t('readingLevel')}</span>
                        <strong>{levelData.level}</strong>
                      </div>
                    </div>
                    <div className="library-streak-badge">
                      <Flame size={20} className="library-flame-icon" />
                      <div>
                        <span className="library-stats-sublabel">{t('readingStreak')}</span>
                        <strong>{readingStats.streakDays || 1} {t('daysCount')}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="library-xp-progress-block">
                    <div className="library-xp-labels">
                      <span><Zap size={13} /> {t('readingXp')}</span>
                      <strong>{levelData.currentXp} / {levelData.nextLevelXp} XP</strong>
                    </div>
                    <div className="library-xp-bar-bg">
                      <div
                        className="library-xp-bar-fill"
                        style={{ width: `${levelData.progress}%` }}
                      />
                    </div>
                    <small>{t('nextLevel')}: {levelData.nextLevelXp - levelData.currentXp} XP</small>
                  </div>

                  <div className="library-stats-mini-row">
                    <span>{t('pagesReadCount')}: <strong>{readingStats.pagesRead || 0}</strong></span>
                    <button
                      type="button"
                      className="library-text-link-btn"
                      onClick={() => {
                        setAccountOpen(false);
                        setLeaderboardOpen(true);
                      }}
                    >
                      <Trophy size={13} /> {t('leaderboard')} →
                    </button>
                  </div>
                </div>
              );
            })()}

            <p className="library-kicker">{t('profile')}</p>
            <h2 id="account-title">{t('profileTitle')}</h2>

            {/* Форма изменения никнейма */}
            <form onSubmit={handleSaveProfile} className="library-nickname-edit-form">
              <label>{t('nickname')}</label>
              <div className="library-nickname-input-group">
                <input
                  type="text"
                  value={inputNickname}
                  onChange={(e) => setInputNickname(e.target.value)}
                  placeholder={t('nickname')}
                  className="library-form-input"
                />
                <button type="submit" disabled={isProfileSaving} className="library-primary-button">
                  {isProfileSaving ? '...' : profileSaved ? <Check size={15} /> : t('saveProfile')}
                </button>
              </div>
              {profileSaved && <p className="library-saved-notice">✓ {t('profileSaved')}</p>}
            </form>

            <div className="library-account-row">
              <span>{t('loginEmail')}</span>
              <strong>{email}</strong>
            </div>

            <p className="library-muted">{t('passwordHidden')}</p>

            <div className="library-account-footer-actions">
              <button
                type="button"
                className="library-outline-button library-danger-btn"
                onClick={handleDeleteAccount}
                title={t('deleteAccount')}
              >
                <Trash2 size={15} /> {t('deleteAccount')}
              </button>

              <div className="library-account-right-actions">
                <button
                  type="button"
                  className="library-outline-button library-signout-btn"
                  onClick={() => signOut({ redirectUrl: `${window.location.origin}${basePath}/sign-up` })}
                >
                  <LogOut size={15} /> {t('signOutAccount')}
                </button>
                <button type="button" className="library-primary-button" onClick={() => setAccountOpen(false)}>
                  <Check size={15} /> {t('done')}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {friendsOpen ? (
        <div className="library-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFriendsOpen(false); }}>
          <section className="library-friends-modal" role="dialog" aria-modal="true" aria-labelledby="friends-title">
            <button type="button" className="library-close-button library-friends-close-button" onClick={() => setFriendsOpen(false)} aria-label={t('close')} title={t('close')}><X size={20} /></button>
            <div className="library-friends-heading">
              <div>
                <span className="library-kicker"><Users size={14} /> {t('friends')}</span>
                <h2 id="friends-title">{t('friends')} <span>/ {t('chat')}</span></h2>
                <p className="library-friends-intro">{t('friendsIntro')}</p>
              </div>
              <div className="library-friends-count"><Users size={17} /><strong>{friends.length}</strong><span>{t('friends')}</span></div>
            </div>
            <div className="library-social-tabs" role="tablist">
              <button type="button" className={socialTab === 'friends' ? 'is-active' : ''} onClick={() => setSocialTab('friends')}>{t('friends')}</button>
              <button type="button" className={socialTab === 'chat' ? 'is-active' : ''} onClick={() => setSocialTab('chat')}>{t('chat')}</button>
            </div>
            {socialTab === 'friends' ? <>
            <div className="library-friend-add-row">
              <input className="library-form-input" value={friendSearch} onChange={(event) => setFriendSearch(event.target.value)} placeholder={t('friendSearch')} />
              <button type="button" className="library-primary-button" onClick={addFriendByNickname}>{t('findUser')}</button>
            </div>
            {foundUser ? <div className="library-user-result"><img src={foundUser.avatar || DEFAULT_AVATAR} alt="" /><span>{foundUser.nickname}</span><button type="button" className="library-primary-button" onClick={async () => { if (!user?.id) return; await addFriend(user.id, foundUser.user_id); setFoundUser(null); setFriendSearch(''); setNotice(t('friendRequestSent')); }}>{t('addFriend')}</button></div> : null}
            <button type="button" className="library-outline-button library-friend-link-button" onClick={copyFriendLink}>🔗 {t('friendLink')}</button>
            {friendRequests.length ? <div className="library-friend-requests"><strong>{t('friendRequests')}</strong>{friendRequests.map((request) => <div className="library-friend-request" key={request.user_id}><span className="library-person-cell"><img className="library-person-avatar" src={request.avatar || DEFAULT_AVATAR} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = DEFAULT_AVATAR; }} alt="" />{request.nickname}</span><span><button type="button" className="library-primary-button" onClick={async () => { if (!user?.id || !request.friendship_id) return; await acceptFriendRequest(request.friendship_id, user.id, request.user_id); setFriendRequests(await fetchFriendRequests(user.id)); setFriends(await fetchFriends(user.id)); }}>{t('acceptFriend')}</button><button type="button" className="library-reject-button" onClick={async () => { if (!user?.id || !request.friendship_id) return; await rejectFriendRequest(request.friendship_id, user.id); setFriendRequests(await fetchFriendRequests(user.id)); }}>{t('rejectFriend')}</button></span></div>)}</div> : null}
            </> : null}
            <div className={`library-friends-layout ${socialTab === 'chat' ? 'is-chat-tab' : 'is-friends-tab'}`}>
              <div className="library-friends-list">
                {friends.length ? friends.map((friend) => (
                  <div className={`library-friend-item ${selectedFriend?.user_id === friend.user_id ? 'is-active' : ''}`} key={friend.user_id}>
                    <button type="button" className="library-friend-select" onClick={() => { setSelectedFriend(friend); setSocialTab('chat'); }}>
                      <img className="library-person-avatar" src={friend.avatar || DEFAULT_AVATAR} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = DEFAULT_AVATAR; }} alt="" />
                      <span className="library-friend-details"><strong>{friend.nickname}</strong><small>{selectedFriend?.user_id === friend.user_id ? t('chat') : t('openChat')}</small></span>
                      <MessageCircle size={16} className="library-friend-chat-icon" aria-hidden="true" />
                    </button>
                    <div className="library-friend-actions">
                      <button type="button" className="library-profile-button" onClick={async () => { setViewedProfile(friend); setViewedFriendStats(null); try { setViewedFriendStats(await fetchRemoteReader(friend.user_id)); } catch { setViewedFriendStats(null); } }}><UserRound size={14} /> <span>{t('profile')}</span></button>
                      <button type="button" className="library-friend-remove" onClick={async () => { if (!user?.id || !window.confirm(t('removeFriendConfirm'))) return; await removeFriend(user.id, friend.user_id); setFriends(await fetchFriends(user.id)); if (selectedFriend?.user_id === friend.user_id) setSelectedFriend(null); }} aria-label={t('removeFriend')} title={t('removeFriend')}><Trash2 size={14} /> <span>{t('removeFriend')}</span></button>
                    </div>
                  </div>
                )) : <p className="library-muted">{t('noFriends')}</p>}
              </div>
              <div className="library-chat-panel">
                {selectedFriend ? <>
                  <h3>{t('chat')}: {selectedFriend.nickname}</h3>
                  <div className="library-chat-messages" ref={chatMessagesRef}>{messages.map((message) => <div key={message.id} className={`library-chat-message-row ${message.sender_id === user?.id ? 'is-mine' : ''}`}><div className="library-chat-bubble"><p>{message.body}</p>{message.attachment_url ? <button type="button" className="library-chat-photo-button" onClick={() => setPhotoPreview(message.attachment_url || null)} aria-label={t('sentPhoto')}><img className="library-chat-photo" src={message.attachment_url} alt={t('sentPhoto')} /></button> : null}<time className="library-chat-time" dateTime={message.created_at}>{message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</time></div>{message.sender_id === user?.id ? <span className="library-chat-message-actions"><button type="button" onClick={() => { setEditingMessageId(message.id); setMessageText(message.body); }}>✎</button><button type="button" onClick={async () => { await deleteChatMessage(message.id, user.id); setMessages((current) => current.filter((item) => item.id !== message.id)); }}>×</button></span> : null}</div>)}</div>
                  <div className="library-chat-compose"><input className="library-form-input" value={messageText} onChange={(event) => setMessageText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }} placeholder={t('messagePlaceholder')} /><label className="library-photo-button">📷<input type="file" accept="image/*" hidden onChange={(event) => { handleChatPhoto(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label><button type="button" className="library-primary-button" onClick={() => sendMessage()}>{editingMessageId ? t('saveChanges') : t('sendMessage')}</button></div>
                </> : <p className="library-muted">{t('friends')}</p>}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {photoPreview ? (
        <div className="library-overlay library-photo-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPhotoPreview(null); }}>
          <section className="library-photo-modal" role="dialog" aria-modal="true" aria-label={t('sentPhoto')}>
            <button type="button" className="library-close-button library-photo-close" onClick={() => setPhotoPreview(null)} aria-label={t('close')} title={t('close')}><X size={20} /></button>
            <img src={photoPreview} alt={t('sentPhoto')} />
          </section>
        </div>
      ) : null}

      {viewedProfile ? (
        <div className="library-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewedProfile(null); }}>
          <section className="library-profile-modal" role="dialog" aria-modal="true" aria-labelledby="friend-profile-title">
            <button type="button" className="library-close-button" onClick={() => setViewedProfile(null)}>{t('close')} <X size={18} /></button>
            <img className="library-profile-modal-avatar" src={viewedProfile.avatar || DEFAULT_AVATAR} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = DEFAULT_AVATAR; }} alt="" />
            <h2 id="friend-profile-title">{viewedProfile.nickname}</h2>
            <p className="library-profile-stat"><span>{t('friendExperience')}</span><strong>{viewedFriendStats?.xp ?? 0} XP</strong></p>
            <p className="library-profile-stat"><span>{t('levelShort')}</span><strong>{viewedFriendStats?.level ?? 1}</strong></p>
            <p className="library-muted">{t('friendProfileHint')}</p>
          </section>
        </div>
      ) : null}

      {leaderboardOpen ? (
        <div
          className="library-overlay"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setLeaderboardOpen(false); }}
        >
          <section className="library-leaderboard-modal" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title">
            <button type="button" className="library-close-button" onClick={() => setLeaderboardOpen(false)}>
              {t('close')} <X size={18} />
            </button>
            <div className="library-leaderboard-header">
              <span className="library-kicker"><Trophy size={14} /> {t('leaderboard')}</span>
              <h2 id="leaderboard-title">{t('leaderboard')}</h2>
              <p className="library-muted">{t('leaderboardDesc')}</p>
            </div>

            {/* Карточка текущего пользователя в топе */}
            {(() => {
              const currentUserLevel = calculateLevel(readingStats.xp);
              return (
                <div className="library-leaderboard-my-rank">
                  <div className="library-leaderboard-user-info">
                    <img src={avatar || DEFAULT_AVATAR} alt="" className="library-leaderboard-avatar" />
                    <div>
                      <strong>{nickname} (Вы)</strong>
                      <span>{readingStats.xp} XP · <Flame size={12} className="inline-icon" /> {readingStats.streakDays || 1} {t('daysCount')}</span>
                    </div>
                  </div>
                  <span className="library-leaderboard-level-pill">
                    {t('levelShort')} {currentUserLevel.level}
                  </span>
                </div>
              );
            })()}

            <div className="library-leaderboard-list">
              {leaderboard.map((leader, index) => {
                const isTop3 = index < 3;
                return (
                  <div key={leader.id} className={`library-leaderboard-item ${isTop3 ? `is-rank-${index + 1}` : ''}`}>
                    <div className="library-leaderboard-rank-badge">
                      {index === 0 ? '🥇 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : `#${index + 1}`}
                    </div>
                    <img src={leader.avatar} alt="" className="library-leaderboard-avatar" />
                    <div className="library-leaderboard-details">
                      <strong>{leader.nickname}{leader.isCurrentUser ? ` (${t('youBadge')})` : ''}</strong>
                      <span>{leader.xp} XP · <Flame size={12} className="inline-icon" /> {leader.streakDays} {t('daysCount')}</span>
                    </div>
                    <span className="library-leaderboard-level-pill">
                      {t('levelShort')} {leader.level}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {flyingBooks.map((item) => (
        <div
          key={item.id}
          className="library-flying-book"
          style={{
            '--start-x': `${item.startX}px`,
            '--start-y': `${item.startY}px`,
            '--start-w': `${item.startWidth}px`,
            '--start-h': `${item.startHeight}px`,
            '--target-x': `${item.targetX}px`,
            '--target-y': `${item.targetY}px`,
            '--spine-color': item.book.spine,
            '--fly-rotation': `${item.startX < item.targetX ? 15 : -15}deg`,
          } as CSSProperties}
        >
          <div className="library-book-cover library-flying-cover">
            <span className="library-cover-category">{categoryLabels[item.book.category] || item.book.category}</span>
            <strong>{item.book.title}</strong>
            <span className="library-cover-author">{item.book.author}</span>
          </div>
        </div>
      ))}

      {notice ? <div className="library-toast" role="status">{notice}</div> : null}
    </div>
  );
}

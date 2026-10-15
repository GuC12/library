import { ReaderAchievements, type ReaderJourney } from '@/components/reader-journey';
import { useReaderSync } from '@/hooks/use-reader-sync';
import { ReaderNoteHistory } from '@/components/reader-note-history';
import { reconcileCommunityBooks, removeSyncedRevisions } from '@/lib/community-sync';
import { PageSheet } from '@/components/book-page-sheet';
import { AdaptiveReader, type AdaptiveReaderHandle } from '@/components/adaptive-reader';
import { loadBookPages } from '@/lib/book-text';
import { catalogueCopy } from '@/data/catalogue-copy';
import { LibraryBrandIcon } from '@/components/library-brand-icon';
import { useClerk, useUser } from '@clerk/react';
import {
  Award,
  Bold,
  Bookmark,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Heading2,
  Heart,
  ImagePlus,
  Italic,
  MessageCircle,
  LogOut,
  Minus,
  Moon,
  Plus,
  PlusCircle,
  Quote,
  RefreshCw,
  Flag,
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
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { books, initialUserBooks, isLegacyDemoBook, type Book, type BookPage } from '@/data/books';
import { quotes } from '@/data/quotes';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLanguage } from '@/lib/i18n';
import { DEFAULT_AVATAR, useUserProfile } from '@/lib/user-profile';
import { clearAccountLocalData } from '@/lib/account-storage';
import { Interactive3DBook } from '@/components/interactive-3d-book';
import { BookCoverArt, getBookArtwork } from '@/components/book-cover-art';
import { LibraryGuide } from '@/components/library-guide';
import { guideCopy } from '@/data/library-guide';
import {
  addReadingXp,
  awardUniqueReadingPages,
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
  awardRemoteReadingPages,
  deleteRemoteBook,
  deleteMyLibraryData,
  fetchBookLikes,
  acceptFriendRequest,
  rejectFriendRequest,
  fetchChatMessages,
  fetchFriendRequests,
  fetchFriends,
  fetchRemoteBooks,
  fetchRemoteReader,
  findRemoteProfileByNickname,
  migrateInlineBookCover,
  addFriend,
  removeFriend,
  rowToBook,
  saveRemoteProfile,
  sendChatMessage,
  uploadChatPhoto,
  uploadBookIllustration,
  updateChatMessage,
  deleteChatMessage,
  saveRemoteBook,
  supabase,
  toggleBookLike,
  reportCommunityBook,
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
type BookSort = 'catalog' | 'title' | 'author' | 'year' | 'popular';
type ReaderTheme = 'paper' | 'night';
type ReaderWidth = 'narrow' | 'medium' | 'wide';
type ReadingStatus = 'want' | 'reading' | 'done';
const sortCopy = {
  ru: { label: 'Сортировка', catalog: 'Порядок каталога', title: 'Название: А—Я', author: 'Автор: А—Я', year: 'Сначала новые', popular: 'Сначала популярные', smaller: 'Уменьшить шрифт', larger: 'Увеличить шрифт', paper: 'Светлая страница', night: 'Тёмная страница', resume: 'Продолжить с', page: 'стр.', continue: 'Продолжить чтение' },
  en: { label: 'Sort by', catalog: 'Catalog order', title: 'Title: A—Z', author: 'Author: A—Z', year: 'Newest first', popular: 'Most popular', smaller: 'Decrease text size', larger: 'Increase text size', paper: 'Light page', night: 'Dark page', resume: 'Continue from', page: 'p.', continue: 'Continue reading' },
  kk: { label: 'Сұрыптау', catalog: 'Каталог реті', title: 'Атауы: А—Я', author: 'Автор: А—Я', year: 'Жаңалары алдымен', popular: 'Танымалдары алдымен', smaller: 'Қаріпті кішірейту', larger: 'Қаріпті үлкейту', paper: 'Ашық бет', night: 'Қараңғы бет', resume: 'Жалғастыру:', page: 'бет', continue: 'Оқуды жалғастыру' },
  zh: { label: '排序', catalog: '目录顺序', title: '书名：A—Z', author: '作者：A—Z', year: '最新优先', popular: '热门优先', smaller: '缩小字体', larger: '放大字体', paper: '浅色页面', night: '深色页面', resume: '从此页继续', page: '页', continue: '继续阅读' },
} as const;

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
const accountStorageKey = (key: string, userId?: string) => `${key}:${userId || 'guest'}`;

function BookCover({ book, small = false, categoryLabels }: { book: Book; small?: boolean; categoryLabels: Record<string, string> }) {
  const translatedCategory = categoryLabels[book.category] || book.category;
  if (getBookArtwork(book)) {
    return (
      <div className={`library-book-cover library-photo-cover ${small ? 'library-book-cover-small' : ''}`}
        style={{ '--spine-color': book.spine } as CSSProperties}>
        <BookCoverArt book={book} compact={small} categoryLabel={translatedCategory} />
      </div>
    );
  }

  if (book.coverKind === 'edition' && book.coverImage) {
    return (
      <div
        className={`library-book-cover library-edition-cover ${small ? 'library-book-cover-small' : ''}`}
        style={{ '--spine-color': book.spine } as CSSProperties}
      >
        <img
          className="library-edition-cover-image"
          src={book.coverImage}
          alt={`${book.title} — ${book.author}, обложка издания${book.publicationYear ? ` ${book.publicationYear} года` : ''}`}
          loading="lazy"
          decoding="async"
        />
      </div>
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
  const catalogText = catalogueCopy[language];
  const readerControls = sortCopy[language];
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
  const [guideOpenRequest, setGuideOpenRequest] = useState(0);
  const [query, setQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<BookSort>(() => readStorage<BookSort>('library-sort-order', 'catalog'));
  const [visibleBookCount, setVisibleBookCount] = useState(24);
  const [category, setCategory] = useState('all');
  const [readingListFilter, setReadingListFilter] = useState<'all' | ReadingStatus>('all');
  useEffect(() => { setCategory('all'); }, [language]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [readerTab, setReaderTab] = useState<'summary' | 'full'>('summary');
  const [readerError, setReaderError] = useState(false);
  const [readerRetry, setReaderRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setReaderError(false);
    if (readerTab === 'full' && selectedBook?.textPath && !selectedBook.pages.length) {
      const requestedBook = selectedBook;
      loadBookPages(requestedBook).then((pages) => {
        if (active) setSelectedBook((current) => current?.id === requestedBook.id ? { ...current, pages } : current);
      }).catch(() => { if (active) setReaderError(true); });
    }
    return () => { active = false; };
  }, [selectedBook?.id, readerTab, readerRetry]);

  const [pageIndex, setPageIndex] = useState(0);
  const [readerOffset, setReaderOffset] = useState(0);
  const [visibleReaderSources, setVisibleReaderSources] = useState<number[]>([]);
  const adaptiveReaderRef = useRef<AdaptiveReaderHandle>(null);
  const syncVisibleReaderSources = useCallback((sources: number[]) => {
    setVisibleReaderSources(current => current.length === sources.length && current.every((source, index) => source === sources[index]) ? current : sources);
  }, []);
  const explicitReaderStart = useRef(false);
  const readerSync = useReaderSync(user?.id || 'guest');
  const { progress: readingProgress, bookmarks, notes: readerNotes } = readerSync;
  const [readerFontSize, setReaderFontSize] = useState(() => {
    const stored = readStorage<number>('library-reader-font-size', 17);
    return Number.isFinite(stored) ? Math.max(15, Math.min(23, stored)) : 17;
  });
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>(() => readStorage<ReaderTheme>('library-reader-theme', 'paper') === 'night' ? 'night' : 'paper');
  const [readerWidth, setReaderWidth] = useState<ReaderWidth>(() => {
    const stored = readStorage<ReaderWidth>('library-reader-width', 'medium');
    return ['narrow', 'medium', 'wide'].includes(stored) ? stored : 'medium';
  });
  const [readerSearchOpen, setReaderSearchOpen] = useState(false);
  const [readerSearchQuery, setReaderSearchQuery] = useState('');
  const [cart, setCart] = useState<number[]>(() => readStorage<number[]>(accountStorageKey('library-cart', user?.id), []));
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [readingStatuses, setReadingStatuses] = useState<Record<string, ReadingStatus>>(() => {
    const stored = readStorage<Record<string, unknown>>(accountStorageKey('library-reading-statuses', user?.id), {});
    return Object.fromEntries(Object.entries(stored).filter((entry): entry is [string, ReadingStatus] => ['want', 'reading', 'done'].includes(String(entry[1]))));
  });
  const [readingListsHydrated, setReadingListsHydrated] = useState(false);
  const [bookLikes, setBookLikes] = useState<Record<number, number>>({});
  const [likedBooks, setLikedBooks] = useState<number[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [profileReadingTab, setProfileReadingTab] = useState<ReadingStatus>('want');
  const [profileReadingVisibleCount, setProfileReadingVisibleCount] = useState(12);
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
  const [viewedFriendListTab, setViewedFriendListTab] = useState<ReadingStatus>('want');
  const [viewedFriendProfileLoading, setViewedFriendProfileLoading] = useState(false);
  const [messages, setMessages] = useState<import('@/lib/supabase').ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
  const [editingBookId, setEditingBookId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

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
    setPreviewPageIndex(null);
    setRightsConfirmed(false);
    setUploadModalOpen(true);
  };
  const [levelUpBanner, setLevelUpBanner] = useState<string | null>(null);
  const [cartBumping, setCartBumping] = useState(false);
  const [flyingBooks, setFlyingBooks] = useState<FlyingBook[]>([]);
  const cartButtonRef = useRef<HTMLButtonElement | null>(null);

  // Система опыта чтения и серии дней
  const [readingStats, setReadingStats] = useState<ReadingStats>(() => getStoredReadingStats());
  const [statsOwnerId, setStatsOwnerId] = useState<string | null>(null);
  // Prevent overlapping animations from rapid taps, keyboard repeats, and double-clicks.
  const pageIndexRef = useRef(pageIndex);
  const setReaderPage = (index: number) => {
    pageIndexRef.current = index;
    setPageIndex(index);
    setReaderOffset(0);
  };

  useEffect(() => {
    const readerId = user?.id ?? null;
    setActiveReaderId(readerId);
    setReadingStats(getStoredReadingStats());
    setStatsOwnerId(readerId);
    return () => setActiveReaderId(null);
  }, [user?.id]);

  useEffect(() => {
    const handleStatsChange = (e: Event) => {
      const customEvent = e as CustomEvent<ReadingStats>;
      if (customEvent.detail) {
        const xp = Number.isFinite(customEvent.detail.xp) ? Math.max(0, customEvent.detail.xp) : 0;
        setReadingStats({ ...customEvent.detail, xp, level: calculateLevel(xp).level });
      } else {
        setReadingStats(getStoredReadingStats());
      }
    };
    window.addEventListener('library-stats-changed', handleStatsChange);
    return () => window.removeEventListener('library-stats-changed', handleStatsChange);
  }, []);

  // Подкатегории по языкам и тематике книг сообщества.
  useEffect(() => {
    const update = (event: Event) => {
      const { userId, journey } = (event as CustomEvent<{ userId: string; journey: ReaderJourney }>).detail;
      if (userId !== user?.id || statsOwnerId !== userId) return;
      setReadingStats(current => saveStoredReadingStats({ ...current, xp: journey.xp, level: journey.level,
        pagesRead: journey.pagesRead, streakDays: journey.streakDays }));
    };
    window.addEventListener('library-journey-changed', update);
    return () => window.removeEventListener('library-journey-changed', update);
  }, [user?.id, statsOwnerId]);

  const [subLang, setSubLang] = useState<string>('all');
  const [communitySubcategory, setCommunitySubcategory] = useState('all');

  // Пользовательские книги (синхронизируются с облачной базой Supabase в реальном времени)
  const [userBooks, setUserBooks] = useState<Book[]>(() => {
    const stored = readStorage<Book[]>('library-user-books', []).filter((book) => !isLegacyDemoBook(book));
    const storedIds = new Set(stored.map((b) => b.id));
    const merged = [...stored, ...initialUserBooks.filter((b) => !storedIds.has(b.id))];
    return merged;
  });
  const pendingBookSyncKey = accountStorageKey('library-pending-book-sync', user?.id);
  const [pendingBookSyncState, setPendingBookSyncState] = useState(() => ({
    key: pendingBookSyncKey,
    books: readStorage<Book[]>(pendingBookSyncKey, []),
  }));
  const pendingCloudBooks = pendingBookSyncState.key === pendingBookSyncKey
    ? pendingBookSyncState.books
    : readStorage<Book[]>(pendingBookSyncKey, []);
  const setPendingCloudBooks: React.Dispatch<React.SetStateAction<Book[]>> = (update) => {
    setPendingBookSyncState(current => {
      const currentBooks = current.key === pendingBookSyncKey ? current.books : readStorage<Book[]>(pendingBookSyncKey, []);
      return { key: pendingBookSyncKey, books: typeof update === 'function' ? update(currentBooks) : update };
    });
  };
  const pendingBooksRef = useRef(pendingCloudBooks);
  pendingBooksRef.current = pendingCloudBooks;
  const [bookSyncRevision, setBookSyncRevision] = useState(0);
  const bookUploads = useRef(new Map<number, ReturnType<typeof saveRemoteBook>>());
  const deletingBooks = useRef(new Set<number>());
  useEffect(() => {
    setPendingBookSyncState(current => current.key === pendingBookSyncKey
      ? current
      : { key: pendingBookSyncKey, books: readStorage<Book[]>(pendingBookSyncKey, []) });
  }, [pendingBookSyncKey]);
  useEffect(() => {
    if (pendingBookSyncState.key !== pendingBookSyncKey) return;
    try { window.localStorage.setItem(pendingBookSyncKey, JSON.stringify(pendingCloudBooks)); }
    catch { setNotice(t('storageSaveError')); }
  }, [pendingBookSyncKey, pendingBookSyncState.key, pendingCloudBooks, t]);
  useEffect(() => {
    let stopped = false;
    const sync = async () => {
      if (!user?.id || !navigator.onLine) return;
      for (const book of pendingBooksRef.current) {
        if (stopped) return;
        if (book.ownerId !== user.id || deletingBooks.current.has(book.id) || bookUploads.current.has(book.id)) continue;
        let uploadBook = book;
        if (book.coverImage?.startsWith('data:image/')) {
          try {
            uploadBook = { ...book, coverImage: await migrateInlineBookCover(book.coverImage, user.id) };
            setPendingCloudBooks(current => current.map(item => item === book ? uploadBook : item));
            setUserBooks(current => {
              const updated = current.map(item => item.id === uploadBook.id && item.ownerId === user.id ? uploadBook : item);
              try { window.localStorage.setItem('library-user-books', JSON.stringify(updated)); } catch { /* Cloud migration can still finish. */ }
              return updated;
            });
          } catch (error) {
            console.warn('Could not migrate a pending book cover yet:', error);
            setNotice(t('coverMigrationPending'));
            continue;
          }
        }
        setUserBooks(current => current.map(item => item.id === book.id && item.ownerId === user.id
          ? { ...item, publicationStatus: 'publishing' as const } : item));
        const upload = saveRemoteBook(uploadBook);
        bookUploads.current.set(book.id, upload);
        const result = await upload;
        bookUploads.current.delete(book.id);
        if (stopped) return;
        if (result.ok) {
          setUserBooks(current => {
            const updated = current.map(item => item.id === uploadBook.id && item.ownerId === user.id
              ? { ...item, publicationStatus: 'published' as const } : item);
            try { window.localStorage.setItem('library-user-books', JSON.stringify(updated)); } catch { /* Cloud remains authoritative. */ }
            return updated;
          });
          if (statsOwnerId === user.id) {
            try {
              const remote = await fetchRemoteReader(user.id);
              if (!stopped && remote && statsOwnerId === user.id) {
                setReadingStats(current => saveStoredReadingStats({ ...current, xp: remote.xp, level: remote.level,
                  streakDays: remote.streakDays, pagesRead: remote.pagesRead, booksFinished: remote.booksFinished }));
              }
            } catch (error) { console.warn('Не удалось обновить опыт после публикации:', error); }
          }
          setPendingCloudBooks(current => removeSyncedRevisions(current, [uploadBook]));
          setNotice(t('bookPublished'));
        } else {
          setPendingCloudBooks(current => current.map(item => item.id === uploadBook.id ? { ...item, publicationStatus: 'failed' } : item));
          setUserBooks(current => {
            const updated = current.map(item => item.id === uploadBook.id && item.ownerId === user.id ? { ...item, publicationStatus: 'failed' as const } : item);
            try { window.localStorage.setItem('library-user-books', JSON.stringify(updated)); } catch { /* Keep the in-memory retry available. */ }
            return updated;
          });
          setNotice(`Книга сохранена на этом устройстве. ${result.message}`);
        }
      }
    };
    void sync();
    const interval = window.setInterval(sync, 30000);
    window.addEventListener('online', sync);
    return () => { stopped = true; window.clearInterval(interval); window.removeEventListener('online', sync); };
  }, [bookSyncRevision, statsOwnerId, user?.id, t]);

  useEffect(() => {
    let mounted = true;
    let generation = 0;
    const refresh = async () => {
      const request = ++generation;
      try {
        const remote = await fetchRemoteBooks(user?.id);
        if (!mounted || request !== generation) return;
        const next = reconcileCommunityBooks(remote, pendingBooksRef.current, user?.id || '');
        setUserBooks(next);
        try { window.localStorage.setItem('library-user-books', JSON.stringify(next)); } catch { /* Cloud remains authoritative. */ }
      } catch {
        if (mounted && request === generation) setNotice(t('catalogLoadError'));
      }
    };
    void refresh();
    const channel = supabase.channel('realtime:community_books')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_books' }, refresh).subscribe();
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [user?.id, t]);

  const allBooks = useMemo(() => {
    const featuredTitles = new Set(books.slice(0, 2).map((book) => book.title.trim().toLocaleLowerCase()));
    const otherUserBooks = userBooks.filter((book) => !isLegacyDemoBook(book) && !featuredTitles.has(book.title.trim().toLocaleLowerCase()));
    return [...books.slice(0, 2), ...otherUserBooks, ...books.slice(2)];
  }, [userBooks]);
  useEffect(() => {
    let active = true;
    let loading = false;
    setReadingListsHydrated(false);
    if (!user?.id) {
      setReadingListsHydrated(true);
      return () => { active = false; };
    }
    const loadLists = () => {
      if (loading) return;
      loading = true;
      fetchRemoteReader(user.id, { requireReadingLists: true }).then((reader) => {
        if (!active) return;
        const lists = reader?.readingLists;
        if (lists) {
          const next: Record<string, ReadingStatus> = {};
          for (const status of ['want', 'reading', 'done'] as const) {
            for (const item of lists[status] || []) next[String(item.bookId)] = status;
          }
          setReadingStatuses(next);
        }
        setReadingListsHydrated(true);
      }).catch((error) => {
        console.warn('Could not load reading lists before sync:', error);
        // A failed cloud read must not overwrite the current local list.
      }).finally(() => { loading = false; });
    };
    loadLists();
    window.addEventListener('online', loadLists);
    return () => { active = false; window.removeEventListener('online', loadLists); };
  }, [user?.id]);
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    const bookParam = new URLSearchParams(window.location.search).get('book');
    if (!bookParam || deepLinkHandled.current) return;
    const found = allBooks.find((book) => String(book.id) === bookParam);
    if (!found) return;
    deepLinkHandled.current = true;
    setSelectedBook(found);
    setReaderPage(0);
    setReaderTab('full');
  }, [allBooks]);
  const categoryLabels: Record<string, string> = {
    'Пользовательские книги': t('categoryCommunity'),
    'Художественная литература': t('categoryFiction'),
    'Классика': t('genreClassics'),
    'Познавательная литература': t('genreEducational'),
    'Казахская литература': t('genreKazakhLit'),
    'Русская литература': t('genreRussianLit'),
    'Детективы': t('genreMystery'),
    'Фэнтези': t('genreFantasy'),
    'Научная фантастика': t('genreScienceFiction'),
    'Приключения': t('genreAdventure'),
    'Любовные романы': t('genreRomance'),
    'Поэзия': t('genrePoetry'),
    'Драма и пьесы': t('genreDrama'),
    'Историческая проза': t('genreHistorical'),
    'Философия': t('genrePhilosophy'),
    'Детская литература': t('genreChildren'),
    'Путешествия': t('genreTravel'),
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
  const readingListCounts = useMemo(() => ({
    all: allBooks.filter((book) => readingStatuses[String(book.id)]).length,
    want: allBooks.filter((book) => readingStatuses[String(book.id)] === 'want').length,
    reading: allBooks.filter((book) => readingStatuses[String(book.id)] === 'reading').length,
    done: allBooks.filter((book) => readingStatuses[String(book.id)] === 'done').length,
  }), [allBooks, readingStatuses]);
  const sharedReadingLists = useMemo(() => ({
    want: allBooks.filter((book) => readingStatuses[String(book.id)] === 'want').map(({ id, title, author, summary }) => ({ bookId: id, title, author, summary })),
    reading: allBooks.filter((book) => readingStatuses[String(book.id)] === 'reading').map(({ id, title, author, summary }) => ({ bookId: id, title, author, summary })),
    done: allBooks.filter((book) => readingStatuses[String(book.id)] === 'done').map(({ id, title, author, summary }) => ({ bookId: id, title, author, summary })),
  }), [allBooks, readingStatuses]);

  const updateReadingStatus = (bookId: number, status: string) => {
    setReadingStatuses((current) => {
      const next = { ...current };
      if (status === 'want' || status === 'reading' || status === 'done') next[String(bookId)] = status;
      else delete next[String(bookId)];
      return next;
    });
  };

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
    if (!file || !user?.id || !selectedFriend) return;
    try {
      const url = await uploadChatPhoto(file, user.id, selectedFriend.user_id);
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
    try { window.localStorage.setItem('library-user-books', JSON.stringify(updated)); } catch { setNotice(t('storageSaveError')); }
    window.dispatchEvent(new Event('library-user-books-updated'));
  };

  const deleteOwnBook = async (book: Book) => {
    if (book.ownerId !== user?.id || deletingBooks.current.has(book.id) || !window.confirm(t('deleteBookConfirm'))) return;
    deletingBooks.current.add(book.id);
    try {
      await bookUploads.current.get(book.id);
      if (!(await deleteRemoteBook(book.id))) throw new Error('delete-failed');
      setPendingCloudBooks(current => current.filter(item => item.id !== book.id));
      setUserBooks(current => {
        const next = current.filter(item => item.id !== book.id);
        try { window.localStorage.setItem('library-user-books', JSON.stringify(next)); } catch { /* Cloud deletion succeeded. */ }
        return next;
      });
      setNotice(t('bookDeleted'));
    } catch { setNotice(t('bookDeleteError')); }
    finally { deletingBooks.current.delete(book.id); }
    window.setTimeout(() => setNotice(''), 3500);
  };

  useEffect(() => {
    // Clerk can change accounts before account-scoped stats have loaded.
    // Never upload the previous render's XP to the newly active account.
    if (!user?.id || statsOwnerId !== user.id || !readingListsHydrated) return;
    let active = true;
    syncCurrentReader({ userId: user.id, nickname, avatar, booksPublished: ownBooks.length, stats: readingStats, readingLists: sharedReadingLists })
      .then((record) => {
        if (!active || user?.id !== record.id) return;
        setReadingStats(current => {
          const authoritative = { ...current, xp: record.xp, level: record.level, pagesRead: record.pagesRead,
            booksFinished: record.booksFinished, streakDays: record.streakDays };
          if (current.xp === authoritative.xp && current.level === authoritative.level
            && current.pagesRead === authoritative.pagesRead && current.booksFinished === authoritative.booksFinished
            && current.streakDays === authoritative.streakDays) return current;
          return saveStoredReadingStats(authoritative);
        });
      })
      .catch((error) => console.warn('Синхронизация рейтинга:', error));
    return () => { active = false; };
  }, [avatar, nickname, ownBooks.length, readingListsHydrated, readingStats, sharedReadingLists, statsOwnerId, user?.id]);

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
    if (!leaderboardOpen || !user?.id || statsOwnerId !== user.id) return;
    let active = true;
    loadLeaderboard({
      userBooks,
      currentUserId: user.id,
      currentNickname: nickname,
      currentAvatar: avatar,
      booksPublished: ownBooks.length,
      stats: readingStats,
    }).then((readers) => {
      if (!active) return;
      setLeaderboard(readers);
      const cloudRecord = readers.find((reader) => reader.id === user.id);
      if (cloudRecord && cloudRecord.xp > readingStats.xp) {
        setReadingStats((current) => {
          if (!active || current.xp >= cloudRecord.xp) return current;
          const restored = saveStoredReadingStats({
            ...current,
            xp: cloudRecord.xp,
            level: calculateLevel(cloudRecord.xp).level,
            pagesRead: Math.max(current.pagesRead, cloudRecord.pagesRead),
            booksFinished: Math.max(current.booksFinished, cloudRecord.booksFinished),
            streakDays: Math.max(current.streakDays, cloudRecord.streakDays),
          });
          return restored;
        });
      }
    }).catch(() => { if (active) setLeaderboard([]); });
    return () => { active = false; };
  }, [avatar, leaderboardOpen, nickname, ownBooks.length, readingStats, statsOwnerId, user?.id, userBooks]);

  // Форма добавления и редактирования книги
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Пользовательские книги');
  const [newCommunityCategory, setNewCommunityCategory] = useState('other');
  const [newLanguage, setNewLanguage] = useState<NonNullable<Book['language']>>(language === 'zh' ? 'zh' : language);
  const [newSummary, setNewSummary] = useState('');
  const [newPrice, setNewPrice] = useState('0');
  const [newSpine, setNewSpine] = useState('#8C704B');
  const [newCover, setNewCover] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const coverUploadGeneration = useRef(0);
  const [coverType, setCoverType] = useState<'ready' | 'custom'>('ready');
  const [selectedReadyCoverId, setSelectedReadyCoverId] = useState(READY_COVERS[0].id);
  const [newPages, setNewPages] = useState<BookPage[]>(() => [
    { kicker: t('defaultPage1Kicker'), title: t('defaultPage1Title'), text: '' },
  ]);
  const [previewPageIndex, setPreviewPageIndex] = useState<number | null>(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const coverFileRef = useRef<HTMLInputElement | null>(null);
  const pageTextareasRef = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const illustrationFileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const bookDraftKey = user?.id ? `library-book-draft-${user.id}` : null;

  useEffect(() => {
    if (!uploadModalOpen || editingBookId || !bookDraftKey) return;
    const timeout = window.setTimeout(() => {
      try {
        const draft = JSON.stringify({
          title: newTitle,
          communityCategory: newCommunityCategory,
          language: newLanguage,
          summary: newSummary,
          price: newPrice,
          spine: newSpine,
          cover: newCover.length < 1_500_000 ? newCover : '',
          coverType,
          selectedReadyCoverId,
          pages: newPages,
          savedAt: Date.now(),
        });
        if (draft.length < 2_500_000) window.localStorage.setItem(bookDraftKey, draft);
      } catch (error) {
        console.warn('Unable to save the local book draft:', error);
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [bookDraftKey, coverType, editingBookId, newCommunityCategory, newCover, newLanguage, newPages, newPrice, newSpine, newSummary, newTitle, selectedReadyCoverId, uploadModalOpen]);

  useEffect(() => {
    if (!uploadModalOpen || !user?.id || !newCover.startsWith('data:image/')) return;
    const generation = ++coverUploadGeneration.current;
    setCoverUploading(true);
    void migrateInlineBookCover(newCover, user.id).then((url) => {
      if (coverUploadGeneration.current === generation) setNewCover(url);
    }).catch((error) => {
      console.warn('Could not migrate a saved cover yet:', error);
      if (coverUploadGeneration.current === generation) setNotice(t('coverMigrationPending'));
    }).finally(() => {
      if (coverUploadGeneration.current === generation) setCoverUploading(false);
    });
    return () => {
      if (coverUploadGeneration.current === generation) {
        coverUploadGeneration.current++;
        setCoverUploading(false);
      }
    };
  }, [newCover, t, uploadModalOpen, user?.id]);

  const openNewBookEditor = () => {
    setEditingBookId(null);
    setPreviewPageIndex(null);
    setRightsConfirmed(false);
    let draft: Record<string, unknown> | null = null;
    try {
      const stored = bookDraftKey ? window.localStorage.getItem(bookDraftKey) : null;
      draft = stored ? JSON.parse(stored) as Record<string, unknown> : null;
    } catch {
      draft = null;
    }
    if (draft) {
      if (typeof draft.title === 'string') setNewTitle(draft.title);
      if (typeof draft.communityCategory === 'string') setNewCommunityCategory(draft.communityCategory);
      if (draft.language === 'ru' || draft.language === 'en' || draft.language === 'kk' || draft.language === 'zh') setNewLanguage(draft.language);
      if (typeof draft.summary === 'string') setNewSummary(draft.summary);
      if (typeof draft.price === 'string') setNewPrice(draft.price);
      if (typeof draft.spine === 'string') setNewSpine(draft.spine);
      if (typeof draft.cover === 'string') setNewCover(draft.cover);
      if (draft.coverType === 'ready' || draft.coverType === 'custom') setCoverType(draft.coverType);
      if (typeof draft.selectedReadyCoverId === 'string') setSelectedReadyCoverId(draft.selectedReadyCoverId);
      if (Array.isArray(draft.pages) && draft.pages.every((page) => page && typeof page === 'object' && typeof (page as BookPage).text === 'string')) {
        setNewPages(draft.pages as BookPage[]);
      }
    } else {
      setNewTitle('');
      setNewCommunityCategory('other');
      setNewLanguage(language);
      setNewSummary('');
      setNewPrice('0');
      setNewSpine('#8C704B');
      setNewCover('');
      setCoverType('ready');
      setSelectedReadyCoverId(READY_COVERS[0].id);
      setNewPages([{ kicker: t('defaultPage1Kicker'), title: t('defaultPage1Title'), text: '' }]);
    }
    setUploadModalOpen(true);
  };

  // Редактирование профиля в кабинете
  const [inputNickname, setInputNickname] = useState(nickname);
  const [profileSaved, setProfileSaved] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setInputNickname(nickname);
  }, [nickname]);

  const isCommunityCategory = (book: Book) => book.isUserBook || book.category === 'Пользовательские книги';

  const categories = useMemo(() => {
    const fixed = [t('all'), t('myBooks'), t('topBooks'), t('userBooks'), t('fiction'), t('readingLists')];
    const rest = [...new Set(allBooks.map((book) => categoryLabels[book.category] || book.category))].filter((label) => !fixed.includes(label));
    return [...fixed, ...rest];
  }, [allBooks, t]);
  const categoryBookCount = (item: string) => {
    if (item === t('all')) return allBooks.length;
    if (item === t('myBooks')) return ownBooks.length;
    if (item === t('topBooks')) return allBooks.length;
    if (item === t('userBooks')) return allBooks.filter(isCommunityCategory).length;
    if (item === t('readingLists')) return readingListCounts.all;
    if (item === t('fiction')) return allBooks.filter((book) => categoryLabels[book.category] === t('categoryFiction')).length;
    return allBooks.filter((book) => (categoryLabels[book.category] || book.category) === item).length;
  };

  const filteredBooks = useMemo(() => {
    const normalizeSearch = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase().trim();
    const normalized = normalizeSearch(query);
    const result = allBooks.filter((book) => {
      const searchable = normalizeSearch(`${book.title} ${book.author} ${book.summary} ${categoryLabels[book.category] || book.category}`);
      const matchesQuery = !normalized || searchable.includes(normalized);
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
        } else if (category === t('readingLists')) {
          const status = readingStatuses[String(book.id)];
          if (!status || (readingListFilter !== 'all' && status !== readingListFilter)) return false;
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

    const collator = new Intl.Collator(language, { sensitivity: 'base', numeric: true });
    if (sortOrder === 'title') result.sort((a, b) => collator.compare(a.title, b.title));
    else if (sortOrder === 'author') result.sort((a, b) => collator.compare(a.author, b.author) || collator.compare(a.title, b.title));
    else if (sortOrder === 'year') result.sort((a, b) => (b.publicationYear || -Infinity) - (a.publicationYear || -Infinity) || collator.compare(a.title, b.title));
    else if (sortOrder === 'popular' || (sortOrder === 'catalog' && category === t('topBooks'))) {
      result.sort((a, b) => (bookLikes[b.id] || 0) - (bookLikes[a.id] || 0) || collator.compare(a.title, b.title));
    }
    return result;
  }, [allBooks, bookLikes, category, categoryLabels, communitySubcategory, language, query, readingListFilter, readingStatuses, sortOrder, subLang, t, user?.id]);

  useEffect(() => {
    setVisibleBookCount(24);
  }, [category, communitySubcategory, query, readingListFilter, sortOrder, subLang]);

  useEffect(() => {
    setProfileReadingVisibleCount(12);
  }, [profileReadingTab]);

  useEffect(() => {
    window.localStorage.setItem(accountStorageKey('library-cart', user?.id), JSON.stringify(cart));
  }, [cart, user?.id]);


  useEffect(() => {
    window.localStorage.setItem(accountStorageKey('library-reading-statuses', user?.id), JSON.stringify(readingStatuses));
  }, [readingStatuses, user?.id]);

  useEffect(() => {
    window.localStorage.setItem('library-sort-order', JSON.stringify(sortOrder));
  }, [sortOrder]);


  useEffect(() => {
    window.localStorage.setItem('library-reader-font-size', JSON.stringify(readerFontSize));
  }, [readerFontSize]);

  useEffect(() => {
    window.localStorage.setItem('library-reader-theme', JSON.stringify(readerTheme));
  }, [readerTheme]);

  useEffect(() => {
    window.localStorage.setItem('library-reader-width', JSON.stringify(readerWidth));
  }, [readerWidth]);

  const lastReadingPage = useRef<{ book: number; page: number; offset: number } | null>(null);
  useEffect(() => {
    if (!selectedBook || readerTab !== 'full' || !selectedBook.pages.length) {
      lastReadingPage.current = null;
      return;
    }
    const page = Math.min(pageIndex + 1, selectedBook.pages.length);
    const previous = lastReadingPage.current;
    lastReadingPage.current = { book: selectedBook.id, page, offset: readerOffset };
    // Opening a book must not overwrite a position still arriving from the cloud.
    if (previous?.book === selectedBook.id && (previous.page !== page || previous.offset !== readerOffset)) {
      readerSync.setEntry('progress', String(selectedBook.id), { title: selectedBook.title, page, offset: readerOffset });
    }
  }, [pageIndex, readerOffset, readerTab, selectedBook?.id, selectedBook?.pages.length, selectedBook?.title, readerSync.setEntry]);

  useEffect(() => {
    document.body.style.overflow = selectedBook || cartOpen || bookmarksOpen || accountOpen || photoPreview ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [accountOpen, bookmarksOpen, cartOpen, photoPreview, selectedBook]);

  useEffect(() => {
    if (!selectedBook || readerTab !== 'full') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')) return;
      if (event.key === 'ArrowRight') turnPages('next');
      if (event.key === 'ArrowLeft') turnPages('previous');
      if (event.key === 'Escape') {
        setSelectedBook(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readerTab, selectedBook, pageIndex]);

  const turnPages = (direction: 'next' | 'previous') => adaptiveReaderRef.current?.turn(direction);

  const openReader = (book: Book, startPage?: number, startOffset?: number) => {
    explicitReaderStart.current = startPage !== undefined;
    setSelectedBook(book);
    const savedPage = readingProgress[String(book.id)]?.page;
    const requestedPage = startPage ?? (savedPage ? savedPage - 1 : 0);
    const safeStart = Math.max(0, Math.min(requestedPage, (book.pageCount || book.pages.length) - 1));
    setReaderPage(safeStart);
    setReaderOffset(startOffset ?? readingProgress[String(book.id)]?.offset ?? 0);
    setReaderTab('summary');

    // Вход в книгу также дает ежедневную активность и +10 XP

  };

  useEffect(() => {
    if (!selectedBook || readerTab !== 'full' || !selectedBook.pages.length) return;
    const visiblePages = (visibleReaderSources.length ? visibleReaderSources : [pageIndex]).filter((page) => page < selectedBook.pages.length);
    if (user?.id) {
      if (statsOwnerId !== user.id) return;
      let active = true;
      void awardRemoteReadingPages(selectedBook.id, visiblePages).then((result) => {
        if (!active || !user?.id || statsOwnerId !== user.id) return;
        setReadingStats(current => saveStoredReadingStats({ ...current, xp: result.xp, level: result.level,
          streakDays: result.streakDays, pagesRead: result.pagesRead }));
        if (result.gainedXp > 0 && result.level > readingStats.level) {
          setLevelUpBanner(`🎉 ${t('levelUpNotice')} ${t('levelShort')} ${result.level}!`);
          window.setTimeout(() => setLevelUpBanner(null), 3500);
        }
      }).catch((error) => console.warn('Не удалось начислить опыт за чтение:', error));
      return () => { active = false; };
    }
    const result = awardUniqueReadingPages(selectedBook.id, visiblePages);
    if (!result.gainedXp) return;
    setReadingStats(result.stats);
    if (result.leveledUp) {
      setLevelUpBanner(`?? ${t('levelUpNotice')} ${t('levelShort')} ${result.stats.level}!`);
      window.setTimeout(() => setLevelUpBanner(null), 3500);
    }
    return undefined;
  }, [pageIndex, readerTab, selectedBook?.id, selectedBook?.pages.length, t, user?.id, statsOwnerId, visibleReaderSources]);

  const closeReader = () => {
    setSelectedBook(null);
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

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!user?.id) {
      setNotice(t('coverSignInRequired'));
      window.setTimeout(() => setNotice(''), 3500);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setNotice(t('illustrationWrongType'));
      window.setTimeout(() => setNotice(''), 3500);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice(t('illustrationTooLarge'));
      window.setTimeout(() => setNotice(''), 3500);
      return;
    }
    const generation = ++coverUploadGeneration.current;
    setCoverUploading(true);
    setNotice(t('uploading'));
    try {
      const url = await uploadBookIllustration(file, user.id);
      if (coverUploadGeneration.current === generation) {
        setNewCover(url);
        setNotice('');
      }
    } catch (error) {
      console.warn('Book cover upload failed:', error);
      if (coverUploadGeneration.current === generation) setNotice(t('illustrationUploadError'));
      window.setTimeout(() => setNotice(''), 4000);
    } finally {
      if (coverUploadGeneration.current === generation) setCoverUploading(false);
    }
  };

  const handleAddPage = () => {
    setNewPages((prev) => [
      ...prev,
      { kicker: `${t('pageKickerPrefix')} ${prev.length + 1}`, title: `${t('pageKickerPrefix')} ${prev.length + 1}`, text: '' },
    ]);
  };

  const handleUpdatePage = (index: number, field: keyof BookPage, value: string) => {
    setNewPages((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const insertPageMarkup = (index: number, before: string, after = '', placeholder = '') => {
    const textarea = pageTextareasRef.current[index];
    const page = newPages[index];
    if (!page) return;
    const value = page.text || '';
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? start;
    const selected = value.slice(start, end) || placeholder;
    const updatedText = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    handleUpdatePage(index, 'text', updatedText);
    const selectionStart = start + before.length;
    const selectionEnd = selectionStart + selected.length;
    window.requestAnimationFrame(() => {
      const activeTextarea = pageTextareasRef.current[index];
      activeTextarea?.focus();
      activeTextarea?.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const handleIllustrationUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setNotice(t('illustrationWrongType'));
      window.setTimeout(() => setNotice(''), 3500);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setNotice(t('illustrationTooLarge'));
      window.setTimeout(() => setNotice(''), 3500);
      return;
    }
    if (!user?.id) {
      setNotice(t('illustrationUploadError'));
      window.setTimeout(() => setNotice(''), 3500);
      return;
    }

    const caret = pageTextareasRef.current[index]?.selectionStart ?? newPages[index]?.text.length ?? 0;
    const description = window.prompt(t('illustrationAltPrompt'), file.name.replace(/\.[^.]+$/, ''));
    if (description === null) return;
    const caption = window.prompt(t('illustrationCaptionPrompt'), '') ?? '';
    setNotice(t('uploading'));
    try {
      const url = await uploadBookIllustration(file, user.id);
      const safeAlt = description.replace(/[\]\\]/g, ' ').trim() || file.name;
      const safeCaption = caption.replace(/["\\\n\r]/g, ' ').trim();
      const markdown = `![${safeAlt}](${url}${safeCaption ? ` "${safeCaption}"` : ''})`;
      const value = newPages[index]?.text || '';
      const insertion = `${value && caret > 0 && value[caret - 1] !== '\n' ? '\n\n' : ''}${markdown}\n\n`;
      const updatedText = `${value.slice(0, caret)}${insertion}${value.slice(caret)}`;
      handleUpdatePage(index, 'text', updatedText);
      window.setTimeout(() => {
        const textarea = pageTextareasRef.current[index];
        textarea?.focus();
        textarea?.setSelectionRange(caret + insertion.length, caret + insertion.length);
      }, 0);
      setNotice('');
    } catch (error) {
      console.warn('Book illustration upload failed:', error);
      setNotice(t('illustrationUploadError'));
      window.setTimeout(() => setNotice(''), 4000);
    }
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

  const retryBookPublication = (book: Book) => {
    setPendingCloudBooks(current => current.map(item => item.id === book.id ? { ...item, publicationStatus: 'queued' } : item));
    setUserBooks(current => current.map(item => item.id === book.id && item.ownerId === user?.id ? { ...item, publicationStatus: 'queued' } : item));
    setBookSyncRevision(current => current + 1);
    setNotice(t('bookSyncPending'));
  };

  const saveBookDraft = () => {
    if (!bookDraftKey) { setNotice(t('draftSignInRequired')); return; }
    try {
      const draft = JSON.stringify({ title: newTitle, communityCategory: newCommunityCategory, language: newLanguage,
        summary: newSummary, price: newPrice, spine: newSpine, cover: newCover.length < 1_500_000 ? newCover : '',
        coverType, selectedReadyCoverId, pages: newPages, savedAt: Date.now() });
      if (draft.length < 2_500_000) { window.localStorage.setItem(bookDraftKey, draft); setNotice(t('draftSavedNotice')); }
      else setNotice(t('storageSaveError'));
    } catch { setNotice(t('storageSaveError')); }
  };

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (coverUploading || newCover.startsWith('data:image/')) {
      setNotice(user?.id ? t('coverMigrationPending') : t('coverSignInRequired'));
      window.setTimeout(() => setNotice(''), 3500);
      return;
    }
    if (!newTitle.trim() || !newSummary.trim()) {
      setNotice(t('needTitleSummary'));
      setTimeout(() => setNotice(''), 2500);
      return;
    }
    if (!newPages.some((page) => page.text.trim() || page.pageImage)) {
      setNotice(t('bookContentRequired'));
      window.setTimeout(() => setNotice(''), 3000);
      return;
    }
    if (!rightsConfirmed) {
      setNotice(t('rightsConfirmation'));
      window.setTimeout(() => setNotice(''), 3500);
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
      pages: newPages.filter((page) => page.text.trim() || page.pageImage).length > 0 ? newPages.filter((page) => page.text.trim() || page.pageImage) : [
        { kicker: `${t('pageKickerPrefix')} 1`, title: newTitle.trim(), text: newSummary.trim() }
      ],
      isUserBook: true,
      publicationStatus: user?.id ? 'queued' : 'draft',
    };

    const updatedBooks = editingBookId
      ? userBooks.map((book) => book.id === editingBookId && book.ownerId === user?.id ? created : book)
      : [created, ...userBooks];
    persistUserBooks(updatedBooks);

    // Сохранение в облачную базу Supabase для всех пользователей мира
    // Keep the local copy and retry cloud publication while offline or after a transient failure.
    setPendingCloudBooks((current) => [...current.filter((book) => book.id !== created.id), created]);
    setBookSyncRevision(current => current + 1);

    // Опыт начисляется только за новую публикацию и зависит от числа страниц.
    if (!editingBookId && !user?.id) {
      const xpRes = addReadingXp(xpForBookPages(created.pages.length), false);
      setReadingStats(xpRes.stats);
      if (xpRes.leveledUp) {
        setLevelUpBanner(`🎉 ${t('levelUpNotice')} ${t('levelShort')} ${xpRes.stats.level}!`);
        setTimeout(() => setLevelUpBanner(null), 3500);
      }
    }

    setUploadModalOpen(false);
    setEditingBookId(null);
    setRightsConfirmed(false);
    if (bookDraftKey) window.localStorage.removeItem(bookDraftKey);
    setCommunitySubcategory('all');
    setSubLang('all');
    setCategory(t('userBooks'));
    setNotice(t('bookSyncPending'));
    setTimeout(() => setNotice(''), 2500);

    setNewTitle('');
    setNewCategory('Пользовательские книги');
    setNewCommunityCategory('other');
    setNewSummary('');
    setNewCover('');
    setNewPages([{ kicker: t('defaultPage1Kicker'), title: t('defaultPage1Title'), text: '' }]);
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
      if (!user) throw new Error('No active account');
      await deleteMyLibraryData();
      await user.delete();
      clearAccountLocalData(user.id);
      window.location.href = `${window.location.origin}${basePath}/sign-up`;
    } catch (err) {
      console.error('Account deletion failed:', err);
      setNotice(t('deleteAccountError'));
      window.setTimeout(() => setNotice(''), 4000);
    }
  };

  const saveBookmark = () => {
    if (!selectedBook) return;
    readerSync.setEntry('bookmark', String(selectedBook.id), { title: selectedBook.title, page: pageIndex + 1, offset: readerOffset });
    setNotice(t('placeSavedNotice'));
    window.setTimeout(() => setNotice(''), 2200);
  };

  const updateReaderNote = (page: number, value: string) => {
    if (selectedBook) readerSync.setEntry('note', selectedBook.id + ':' + page, value);
  };

  const downloadReaderText = async (book: Book) => {
    try {
      const pages = await loadBookPages(book);
      if (!pages.length) throw new Error('The book has no text pages.');
      const content = pages.map((page) => [page.title, page.text].filter(Boolean).join('\n\n')).join('\n\n');
      const blobUrl = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${book.title.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'book'}.txt`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      setNotice(catalogText.error);
      window.setTimeout(() => setNotice(''), 3000);
    }
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
  const readerSearchHits = useMemo(() => {
    const needle = readerSearchQuery.toLocaleLowerCase().trim();
    if (!selectedBook || !needle) return [];
    return selectedBook.pages.flatMap((page, index) => {
      const match = page.text.toLocaleLowerCase().indexOf(needle);
      if (match < 0) return [];
      const start = Math.max(0, match - 70);
      const end = Math.min(page.text.length, match + needle.length + 110);
      return [{ page: index, offset: match, title: page.title || page.kicker, excerpt: page.text.slice(start, end).replace(/\s+/g, ' ').trim() }];
    }).slice(0, 50);
  }, [readerSearchQuery, selectedBook?.id, selectedBook?.pages]);
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.username ?? t('reader');
  const profileReadingBooks = allBooks.filter((book) => readingStatuses[String(book.id)] === profileReadingTab);

  return (
    <div className="library-app">
      <header className="library-header">
        <a className="library-logo" href="#top" aria-label={`${t('brand')} — ${t('all')}`}>
          <LibraryBrandIcon className="library-logo-image" />
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
            <span className="library-header-level-badge">{t('levelShort')} {calculateLevel(readingStats.xp).level}</span>
          </button>
        </nav>
        <div className="library-header-actions">
          <button type="button" className="library-guide-nav-button" data-testid="button-library-guide" onClick={() => setGuideOpenRequest((count) => count + 1)} title={guideCopy[language].open} aria-label={guideCopy[language].open}><MessageCircle size={17} aria-hidden="true" /><span>{guideCopy[language].open}</span></button>
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
            <p className="library-hero-copy">{catalogText.intro}</p>
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
          <div className="library-filters" role="group" aria-label={t('bookCategories')}>
            {categories.map((item) => {
              const isActive = category === item || (category === 'all' && item === t('all'));
              return (
                <button key={item} type="button" aria-pressed={isActive} className={isActive ? 'active' : ''} onClick={() => setCategory(item)}>
                  <span>{item}</span><span className="library-filter-count">{categoryBookCount(item)}</span>
                </button>
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

          {category === t('readingLists') && (
            <div className="library-subcategories" aria-label={t('readingLists')}>
              <span className="library-subcategory-label">{t('readingListStatus')}:</span>
              <div className="library-subcategory-pills">
                {(['all', 'want', 'reading', 'done'] as const).map((status) => {
                  const label = status === 'all' ? t('statusAll') : t(`status${status[0].toUpperCase()}${status.slice(1)}` as 'statusWant' | 'statusReading' | 'statusDone');
                  return <button key={status} type="button" className={`library-subpill ${readingListFilter === status ? 'is-active' : ''}`} onClick={() => setReadingListFilter(status)}>{label} <span>({readingListCounts[status]})</span></button>;
                })}
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
                {t('allLanguages')} <span>{allBooks.length}</span>
              </button>
              {(['ru', 'en', 'kk', 'zh'] as const).filter((code) => allBooks.some((book) => (book.language || 'ru') === code)).map((code) => {
                const names: Record<string, string> = {
                  ru: t('langRu'), en: t('langEn'), kk: t('langKk'), zh: t('langZh'),
                };
                const count = allBooks.filter((book) => (book.language || 'ru') === code).length;
                return (
                  <button key={code} type="button" className={`library-subpill ${subLang === code ? 'is-active' : ''}`} onClick={() => setSubLang(code)}>
                    {names[code] || code.toUpperCase()} <span>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="library-sort-control">
            <span>{readerControls.label}</span>
            <select aria-label={readerControls.label} value={sortOrder} onChange={(event) => setSortOrder(event.target.value as BookSort)}>
              <option value="catalog">{readerControls.catalog}</option>
              <option value="title">{readerControls.title}</option>
              <option value="author">{readerControls.author}</option>
              <option value="year">{readerControls.year}</option>
              <option value="popular">{readerControls.popular}</option>
            </select>
          </label>

          {filteredBooks.length ? (
            <div className="library-book-grid">
              {filteredBooks.slice(0, visibleBookCount).map((book) => (
                <article className={`library-book-card ${book.id === books[0].id || book.id === books[1].id ? 'library-book-card-special' : ''}`} key={book.id}>
                  {book.id === books[0].id || book.id === books[1].id ? (
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
                  <div className="library-card-meta">
                    <span>{categoryLabels[book.category] || book.category}</span>
                    {book.publicationYear ? <span>{book.publicationYear}</span> : null}
                  </div>
                  <p className="library-book-card-summary">{book.summary}</p>
                  <div className="flex items-center justify-between">
                    <strong>{book.price === 0 ? t('free') : `${book.price} ₸`}</strong>
                  </div>
                  {book.ownerId && book.ownerId === user?.id && book.publicationStatus ? (
                    <div className={`library-publication-status is-${book.publicationStatus}`}>
                      <span>{t(book.publicationStatus === 'draft' ? 'publicationDraft' : book.publicationStatus === 'queued' ? 'publicationQueued' : book.publicationStatus === 'publishing' ? 'publicationPublishing' : book.publicationStatus === 'published' ? 'publicationPublished' : 'publicationFailed')}</span>
                      {book.publicationStatus === 'failed' ? <button type="button" onClick={() => retryBookPublication(book)}>{t('retryPublication')}</button> : null}
                    </div>
                  ) : null}
                  <label className="library-reading-status-row">
                    <span>{t('readingListStatus')}</span>
                    <select aria-label={`${t('readingListStatus')}: ${book.title}`} value={readingStatuses[String(book.id)] || ''} onChange={(event) => updateReadingStatus(book.id, event.target.value)}>
                      <option value="">{t('statusNone')}</option>
                      <option value="want">{t('statusWant')}</option>
                      <option value="reading">{t('statusReading')}</option>
                      <option value="done">{t('statusDone')}</option>
                    </select>
                  </label>
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

          {visibleBookCount < filteredBooks.length && (
            <div className="flex justify-center py-8">
              <button type="button" className="library-outline-button" onClick={() => setVisibleBookCount(count => count + 24)}>
                {({ ru: 'Показать ещё', en: 'Show more', kk: 'Тағы көрсету', zh: '显示更多' })[language]}
                {' '}({Math.min(24, filteredBooks.length - visibleBookCount)})
              </button>
            </div>
          )}

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
                onClick={openNewBookEditor}
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
              <span id="reader-title"><span className="library-reader-dot" /> {selectedBook.title}</span>
              {readerTab === 'summary' && <span className="library-reader-progress">{t('summary')}</span>}
              <button type="button" onClick={closeReader} aria-label={t('close')}>{t('close')} <X size={18} /></button>
            </div>
            <div className="library-reader-tabs">
              <button type="button" className={readerTab === 'summary' ? 'active' : ''} onClick={() => setReaderTab('summary')}>{t('aboutBook')}</button>
              <button type="button" className={readerTab === 'full' ? 'active' : ''} onClick={() => setReaderTab('full')}>{t('readBook')}</button>
            </div>
            {readerTab === 'summary' ? (
              <div className="library-summary">
                <BookCover book={selectedBook} categoryLabels={categoryLabels} small />
                <div>
                  <h2>{selectedBook.title}</h2>
                  <p className="library-reader-author">{selectedBook.author} · {selectedBook.category}</p>
                  <span className="library-summary-label">{t('aboutBook')}</span>
                  <p className="library-summary-copy">{selectedBook.summary}</p>
                  {readingProgress[String(selectedBook.id)]?.page > 1 && (
                    <p className="library-reading-resume">{readerControls.resume} {readerControls.page} {readingProgress[String(selectedBook.id)].page}</p>
                  )}
                  {selectedBook.sourceUrl && <div className="library-source-details">
                    <span>{catalogText.complete} · {selectedBook.language?.toUpperCase()} · {selectedBook.pageCount} {t('pages')}{selectedBook.publicationYear ? ` · ${selectedBook.publicationYear}` : ''}</span>
                    <a href={selectedBook.sourceUrl} target="_blank" rel="noopener noreferrer">{catalogText.source}: {selectedBook.sourceName} ↗</a>
                    {selectedBook.coverSourceUrl && <a href={selectedBook.coverSourceUrl} target="_blank" rel="noopener noreferrer">{catalogText.coverSource} ↗</a>}
                    {selectedBook.coverLicense && <small>{t('coverLicense')}: {selectedBook.coverLicense}</small>}
                    <small>{selectedBook.sourceLicense}</small>
                    <a href={`${import.meta.env.BASE_URL}${selectedBook.rightsPath || 'books/SOURCES.md'}`} target="_blank" rel="noopener noreferrer">{catalogText.rights} ↗</a>
                    {selectedBook.downloadPath && <a href={`${import.meta.env.BASE_URL}${selectedBook.downloadPath}`} download>{catalogText.download} ↓</a>}
                    {(selectedBook.textPath || selectedBook.pages.length > 0) && !selectedBook.downloadPath && <button type="button" className="library-inline-download" onClick={() => void downloadReaderText(selectedBook)}>{catalogText.download} ↓</button>}
                  </div>}
                  <label className="library-reading-status-row library-summary-status-row">
                    <span>{t('readingListStatus')}</span>
                    <select aria-label={`${t('readingListStatus')}: ${selectedBook.title}`} value={readingStatuses[String(selectedBook.id)] || ''} onChange={(event) => updateReadingStatus(selectedBook.id, event.target.value)}>
                      <option value="">{t('statusNone')}</option>
                      <option value="want">{t('statusWant')}</option>
                      <option value="reading">{t('statusReading')}</option>
                      <option value="done">{t('statusDone')}</option>
                    </select>
                  </label>
                  <div className="library-book-owner-actions">
                    {selectedBook.ownerId === user?.id ? (
                      <>
                        <button type="button" className="library-outline-button" onClick={() => { setSelectedBook(null); openEditBook(selectedBook); }}>✎ {t('editBook')}</button>
                        <button type="button" className="library-outline-button" onClick={() => { setSelectedBook(null); deleteOwnBook(selectedBook); }}><Trash2 size={14} /> {t('deleteBook')}</button>
                      </>
                    ) : null}
                    {selectedBook.isUserBook && selectedBook.ownerId !== user?.id && user?.id ? (
                      <button type="button" className="library-outline-button" onClick={async () => {
                        const reason = window.prompt(t('reportBookPrompt'));
                        if (!reason?.trim()) return;
                        const sent = await reportCommunityBook(selectedBook, user.id, reason);
                        setNotice(t(sent ? 'reportSent' : 'reportFailed'));
                        window.setTimeout(() => setNotice(''), 3500);
                      }}><Flag size={14} /> {t('reportBook')}</button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" className="library-primary-button" onClick={() => {
                      const saved = readingProgress[String(selectedBook.id)]?.page;
                      if (!explicitReaderStart.current && saved) {
                        const last = Math.max(0, (selectedBook.pageCount || selectedBook.pages.length) - 1);
                        setReaderPage(Math.floor(Math.min(saved - 1, last) / 2) * 2);
                      }
                      setReaderTab('full');
                    }}>{readingProgress[String(selectedBook.id)]?.page > 1 ? readerControls.continue : t('startReading')} <ChevronRight size={16} /></button>
                  </div>
                </div>
              </div>
            ) : !selectedBook.pages.length ? (
              <div className="library-reader-status" role="status">
                <p>{readerError ? catalogText.error : catalogText.loading}</p>
                {readerError && <button type="button" className="library-primary-button" onClick={() => setReaderRetry((value) => value + 1)}>{catalogText.retry}</button>}
              </div>
            ) : (
              <div className={`library-full-reader${selectedBook.id === 1000 ? ' library-compact-book' : ''}`} lang={selectedBook.language}>
                <div className="library-reader-sync" role="status" aria-live="polite">
                  {t(({ syncing: 'readerSyncing', saved: 'readerSynced', pending: 'readerSyncPending', offline: 'readerSyncOffline', error: 'readerSyncError', setupRequired: 'readerSyncSetupRequired', storageError: 'readerSyncStorageError' } as const)[readerSync.status])}
                  {['error', 'offline', 'setupRequired', 'storageError'].includes(readerSync.status) && <button type="button" onClick={readerSync.retry}>{t('readerSyncRetry')}</button>}
                </div>
                {selectedBook.id !== 100 && <div className="library-reading-tools" aria-label={readerControls.label}>
                  <button type="button" aria-label={t('readerSearch')} title={t('readerSearch')} aria-expanded={readerSearchOpen} onClick={() => setReaderSearchOpen((open) => !open)}><Search size={16} /><span>{t('readerSearch')}</span></button>
                  <button type="button" aria-label={readerControls.smaller} title={readerControls.smaller} disabled={readerFontSize <= 15} onClick={() => setReaderFontSize(size => Math.max(15, size - 1))}><Minus size={16} /></button>
                  <span aria-live="polite">{readerFontSize}px</span>
                  <button type="button" aria-label={readerControls.larger} title={readerControls.larger} disabled={readerFontSize >= 23} onClick={() => setReaderFontSize(size => Math.min(23, size + 1))}><Plus size={16} /></button>
                  <button type="button" aria-label={readerTheme === 'paper' ? readerControls.night : readerControls.paper} title={readerTheme === 'paper' ? readerControls.night : readerControls.paper} aria-pressed={readerTheme === 'night'} onClick={() => setReaderTheme(theme => theme === 'paper' ? 'night' : 'paper')}><Moon size={16} /><span>{readerTheme === 'paper' ? readerControls.night : readerControls.paper}</span></button>
                  <label className="library-reader-width-control"><span>{t('lineWidth')}</span><select aria-label={t('lineWidth')} value={readerWidth} onChange={(event) => setReaderWidth(event.target.value as ReaderWidth)}><option value="narrow">{t('widthNarrow')}</option><option value="medium">{t('widthMedium')}</option><option value="wide">{t('widthWide')}</option></select></label>
                </div>}
                {readerSearchOpen && selectedBook.id !== 100 && <section className="library-reader-search-panel" aria-label={t('readerSearch')}>
                  <label htmlFor="reader-search">{t('searchText')}</label>
                  <input id="reader-search" value={readerSearchQuery} onChange={(event) => setReaderSearchQuery(event.target.value)} placeholder={t('searchText')} autoFocus />
                  {readerSearchQuery.trim() && <span className="library-muted">{t('searchResults')}: {readerSearchHits.length}</span>}
                  {readerSearchHits.length > 0 && <div className="library-reader-search-results">{readerSearchHits.map((hit) => <button type="button" key={hit.page} onClick={() => { setReaderPage(hit.page); setReaderOffset(hit.offset); setReaderSearchOpen(false); }}><strong>{hit.title} · {hit.page + 1}</strong><span>{hit.excerpt}</span></button>)}</div>}
                </section>}
                <AdaptiveReader
                  ref={adaptiveReaderRef}
                  pages={selectedBook.pages}
                  location={{ source: pageIndex, offset: readerOffset }}
                  fontSize={readerFontSize}
                  width={readerWidth}
                  theme={readerTheme}
                  onVisibleSources={syncVisibleReaderSources}
                  onNavigate={({ source, offset }) => { setReaderPage(source); setReaderOffset(offset); }}
                />
                {selectedBook.id !== 100 && <section className="library-reader-note">
                  <label htmlFor="reader-page-note">{t('readerNote')} · {pageIndex + 1}</label>
                  <textarea id="reader-page-note" value={readerNotes[`${selectedBook.id}:${pageIndex}`] || ''} onChange={(event) => updateReaderNote(pageIndex, event.target.value)} placeholder={t('notePlaceholder')} rows={3} maxLength={4000} />
                  <small>{t('readerNotePrivacy')}</small>
                  <ReaderNoteHistory key={selectedBook.id + ':' + pageIndex} owner={user?.id || ''} noteKey={selectedBook.id + ':' + pageIndex} onRestore={value => updateReaderNote(pageIndex, value)} />
                </section>}
                {selectedBook.id !== 100 && pageIndex + 2 >= selectedBook.pages.length && (
                  <section className="library-reader-book-about" aria-labelledby="reader-book-about-title">
                    <span>{t('aboutBook')}</span>
                    <h3 id="reader-book-about-title">{selectedBook.title}</h3>
                    <p>{selectedBook.summary}</p>
                    <small>{selectedBook.author}{selectedBook.publicationYear ? ` · ${selectedBook.publicationYear}` : ''}</small>
                  </section>
                )}
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
              <button type="button" className="library-bookmark-item" key={id} onClick={() => { setBookmarksOpen(false); const book = allBooks.find((item) => item.id === Number(id)); if (book) openReader(book, Math.max(0, bookmark.page - 1), bookmark.offset || 0); }}>
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
            {!editingBookId ? <p className="library-draft-note">{t('draftAutoSaved')}</p> : null}

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
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleCoverUpload}
                          className="hidden"
                        />
                        {newCover ? (
                          <div className="library-cover-active-actions">
                            <span className="library-cover-loaded-badge">✓ {t('coverUploaded')}</span>
                            <button
                              type="button"
                              onClick={() => { coverUploadGeneration.current++; setCoverUploading(false); setNewCover(''); }}
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
                            <button
                              type="button"
                              className="library-page-preview-btn"
                              onClick={() => setPreviewPageIndex(previewPageIndex === idx ? null : idx)}
                              aria-expanded={previewPageIndex === idx}
                            >
                              {previewPageIndex === idx ? t('close') : t('previewPage')}
                            </button>
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
                          <p className="library-editor-format-hint">{t('editorFormatHint')}</p>
                          <div className="library-editor-toolbar" role="toolbar" aria-label={t('pageText')}>
                            <button type="button" title={t('formatBold')} aria-label={t('formatBold')} onMouseDown={(event) => event.preventDefault()} onClick={() => insertPageMarkup(idx, '**', '**', 'текст')}><Bold size={15} /></button>
                            <button type="button" title={t('formatItalic')} aria-label={t('formatItalic')} onMouseDown={(event) => event.preventDefault()} onClick={() => insertPageMarkup(idx, '*', '*', 'текст')}><Italic size={15} /></button>
                            <button type="button" title={t('formatHeading')} aria-label={t('formatHeading')} onMouseDown={(event) => event.preventDefault()} onClick={() => insertPageMarkup(idx, '# ', '', 'Заголовок')}><Heading2 size={15} /></button>
                            <button type="button" title={t('formatQuote')} aria-label={t('formatQuote')} onMouseDown={(event) => event.preventDefault()} onClick={() => insertPageMarkup(idx, '> ', '', 'Цитата')}><Quote size={15} /></button>
                            <button type="button" title={t('insertIllustration')} aria-label={t('insertIllustration')} onMouseDown={(event) => event.preventDefault()} onClick={() => illustrationFileRefs.current[idx]?.click()}><ImagePlus size={15} /><span>{t('insertIllustration')}</span></button>
                            <input
                              ref={(node) => { illustrationFileRefs.current[idx] = node; }}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(event) => void handleIllustrationUpload(idx, event)}
                            />
                          </div>
                          <textarea
                            ref={(node) => { pageTextareasRef.current[idx] = node; }}
                            rows={6}
                            value={pg.text}
                            onChange={(e) => handleUpdatePage(idx, 'text', e.target.value)}
                            placeholder={t('pageTextPlaceholder')}
                            className="library-form-input library-page-textarea"
                          />
                          {previewPageIndex === idx ? (
                            <div className="library-page-editor-preview">
                              <span>{t('previewPage')} · {idx + 1}</span>
                              <PageSheet page={pg} number={idx + 1} side="right" />
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="library-upload-actions">
                    {!editingBookId ? <button type="button" className="library-outline-button" onClick={saveBookDraft}>{t('saveDraft')}</button> : null}
                    <label className="library-rights-confirmation">
                      <input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} />
                      <span>{t('rightsConfirmation')}</span>
                    </label>
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

            <ReaderAchievements userId={user?.id} />
            <p className="library-kicker">{t('profile')}</p>
            <h2 id="account-title">{t('profileTitle')}</h2>

            <section className="library-profile-reading-lists" aria-labelledby="profile-reading-title">
              <h3 id="profile-reading-title">{t('profileReadingLists')}</h3>
              <p className="library-muted">{t('friendListShareInfo')}</p>
              <div className="library-profile-reading-tabs" role="tablist" aria-label={t('profileReadingLists')}>
                {(['want', 'reading', 'done'] as const).map((status) => (
                  <button key={status} type="button" role="tab" aria-selected={profileReadingTab === status} className={profileReadingTab === status ? 'is-active' : ''} onClick={() => setProfileReadingTab(status)}>
                    {t(`status${status[0].toUpperCase()}${status.slice(1)}` as 'statusWant' | 'statusReading' | 'statusDone')} <span>{readingListCounts[status]}</span>
                  </button>
                ))}
              </div>
              <div className="library-profile-reading-items">
                {profileReadingBooks.length ? profileReadingBooks.slice(0, profileReadingVisibleCount).map((book) => (
                  <button type="button" className="library-profile-reading-item" key={book.id} onClick={() => { setAccountOpen(false); openReader(book); }}>
                    <BookCover book={book} small categoryLabels={categoryLabels} />
                    <span className="library-profile-reading-copy">
                      <strong>{book.title}</strong>
                      <small>{book.author}</small>
                      <span>{book.summary}</span>
                    </span>
                  </button>
                )) : <p className="library-muted">{t('emptyReadingList')}</p>}
                {profileReadingVisibleCount < profileReadingBooks.length && <button type="button" className="library-outline-button library-profile-reading-more" onClick={() => setProfileReadingVisibleCount(count => count + 12)}>{({ ru: 'Показать ещё', en: 'Show more', kk: 'Тағы көрсету', zh: '显示更多' })[language]} ({Math.min(12, profileReadingBooks.length - profileReadingVisibleCount)})</button>}
              </div>
            </section>

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
                      <button type="button" className="library-profile-button" onClick={async () => { setViewedProfile(friend); setViewedFriendStats(null); setViewedFriendListTab('want'); setViewedFriendProfileLoading(true); try { setViewedFriendStats(await fetchRemoteReader(friend.user_id)); } catch { setViewedFriendStats(null); } finally { setViewedFriendProfileLoading(false); } }}><UserRound size={14} /> <span>{t('profile')}</span></button>
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
            <section className="library-friend-reading-lists" aria-labelledby="friend-reading-title">
              <h3 id="friend-reading-title">{t('friendReadingLists')}</h3>
              <div className="library-profile-reading-tabs" role="tablist" aria-label={t('friendReadingLists')}>
                {(['want', 'reading', 'done'] as const).map((status) => {
                  const count = viewedFriendStats?.readingLists?.[status].length ?? 0;
                  return <button key={status} type="button" role="tab" aria-selected={viewedFriendListTab === status} className={viewedFriendListTab === status ? 'is-active' : ''} onClick={() => setViewedFriendListTab(status)}>{t(`status${status[0].toUpperCase()}${status.slice(1)}` as 'statusWant' | 'statusReading' | 'statusDone')} <span>{count}</span></button>;
                })}
              </div>
              {viewedFriendProfileLoading ? <p className="library-muted">{catalogText.loading}</p> : (
                <div className="library-friend-reading-items">
                  {(viewedFriendStats?.readingLists?.[viewedFriendListTab] || []).length ? (viewedFriendStats?.readingLists?.[viewedFriendListTab] || []).map((entry) => {
                    const book = allBooks.find((item) => item.id === entry.bookId);
                    return (
                      <button type="button" className="library-friend-reading-item" key={entry.bookId} disabled={!book} onClick={() => { if (!book) return; setViewedProfile(null); openReader(book); }}>
                        <strong>{entry.title}</strong>
                        <small>{entry.author}</small>
                        <span>{entry.summary}</span>
                      </button>
                    );
                  }) : <p className="library-muted">{t('emptyReadingList')}</p>}
                </div>
              )}
            </section>
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

      <LibraryGuide openRequest={guideOpenRequest} blocked={Boolean(selectedBook || cartOpen || bookmarksOpen || accountOpen || photoPreview || friendsOpen || leaderboardOpen || uploadModalOpen)} />
      {notice ? <div className="library-toast" role="status">{notice}</div> : null}
    </div>
  );
}

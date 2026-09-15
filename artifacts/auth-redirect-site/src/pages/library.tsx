import { useClerk, useUser } from '@clerk/react';
import {
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import './library.css';

type BookPage = {
  kicker: string;
  title: string;
  text: string;
};

type Book = {
  id: number;
  title: string;
  author: string;
  category: string;
  price: number;
  spine: string;
  summary: string;
  pages: BookPage[];
};

type BookmarkEntry = {
  title: string;
  page: number;
};

const books: Book[] = [
  {
    id: 1,
    title: 'Чистый код',
    author: 'Роберт Мартин',
    category: 'Основы',
    price: 0,
    spine: '#69553D',
    summary: 'Как писать код, который легко читать и поддерживать: именование, функции, форматирование.',
    pages: [
      { kicker: 'Глава 1', title: 'Имена имеют значение', text: 'Хорошее имя требует времени, но экономит его в будущем. Имя переменной, функции или класса должно отвечать на главный вопрос: зачем этот объект существует?' },
      { kicker: 'Чистый код', title: 'Говорите точнее', text: 'Избегайте имён, которые ничего не объясняют. Чем меньше читателю приходится догадываться о смысле кода, тем спокойнее он может работать с системой.' },
      { kicker: 'Глава 2', title: 'Функции должны быть маленькими', text: 'Функция выполняет одну задачу, делает её хорошо и не пытается заодно решить ещё пять проблем. Маленькие функции проще читать, проверять и менять.' },
      { kicker: 'Практика', title: 'Код как хороший текст', text: 'Сложность не исчезает сама. Но ясная структура, точные названия и последовательный стиль делают её видимой — а значит, управляемой.' },
    ],
  },
  {
    id: 2,
    title: 'Паттерны проектирования',
    author: 'GoF',
    category: 'Архитектура',
    price: 0,
    spine: '#8C704B',
    summary: '23 классических паттерна проектирования с примерами применения.',
    pages: [
      { kicker: 'Введение', title: 'Повторяемые решения', text: 'Паттерн — это не готовый фрагмент кода, а проверенная схема взаимодействия объектов. Она помогает назвать проблему и обсудить решение на общем языке.' },
      { kicker: 'Наблюдатель', title: 'Объекты и события', text: 'Когда один объект меняется, другие могут узнать об этом через понятный контракт. Так система остаётся гибкой и не связывает каждый компонент с каждым.' },
      { kicker: 'Фабрика', title: 'Создание без лишних деталей', text: 'Пусть клиентский код знает, что ему нужен продукт, но не обязан знать все детали его создания. Это снижает связность и упрощает расширение.' },
      { kicker: 'Практика', title: 'Не применяйте паттерны вслепую', text: 'Паттерн полезен, когда он убирает конкретную сложность. Если решение становится тяжелее самой задачи, это сигнал остановиться и выбрать простоту.' },
    ],
  },
  {
    id: 3,
    title: 'Совершенный алгоритм',
    author: 'Р. Седжвик',
    category: 'Алгоритмы',
    price: 4200,
    spine: '#3E2F1C',
    summary: 'Базовые структуры данных и алгоритмы с разбором сложности.',
    pages: [
      { kicker: 'Основы', title: 'Думайте о данных', text: 'Алгоритм начинается не с цикла, а с вопроса: как устроены данные? Правильная структура часто делает решение короче и быстрее, чем оптимизация отдельных строк.' },
      { kicker: 'Оценка', title: 'Сложность — это разговор', text: 'Оценка порядка роста помогает заранее увидеть границы решения. Она не заменяет измерения, но показывает, где система начнёт испытывать давление.' },
      { kicker: 'Поиск', title: 'От полного перебора к идее', text: 'Иногда самый понятный способ — перебрать все варианты. Но если данные упорядочены или повторяются, алгоритм может использовать эту информацию и не делать лишнюю работу.' },
      { kicker: 'Практика', title: 'Скорость и ясность', text: 'Лучший алгоритм — не тот, что выглядит самым хитрым. Это решение, которое достаточно быстро работает и остаётся понятным следующему человеку.' },
    ],
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

function BookCover({ book, small = false }: { book: Book; small?: boolean }) {
  return (
    <div className={`library-book-cover ${small ? 'library-book-cover-small' : ''}`} style={{ '--spine-color': book.spine } as CSSProperties}>
      <span className="library-cover-category">{book.category}</span>
      <strong>{book.title}</strong>
      <span className="library-cover-author">{book.author}</span>
    </div>
  );
}

export function LibraryPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Все');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [readerTab, setReaderTab] = useState<'summary' | 'full'>('summary');
  const [pageIndex, setPageIndex] = useState(0);
  const [cart, setCart] = useState<number[]>(() => readStorage<number[]>('library-cart', []));
  const [bookmarks, setBookmarks] = useState<Record<string, BookmarkEntry>>(() => readStorage<Record<string, BookmarkEntry>>('library-bookmarks', {}));
  const [cartOpen, setCartOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const categories = useMemo(() => ['Все', ...new Set(books.map((book) => book.category))], []);
  const filteredBooks = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return books.filter((book) => (
      (category === 'Все' || book.category === category) &&
      (!normalized || `${book.title} ${book.author}`.toLowerCase().includes(normalized))
    ));
  }, [category, query]);

  useEffect(() => {
    window.localStorage.setItem('library-cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    window.localStorage.setItem('library-bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    document.body.style.overflow = selectedBook || cartOpen || bookmarksOpen || accountOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [accountOpen, bookmarksOpen, cartOpen, selectedBook]);

  useEffect(() => {
    if (!selectedBook || readerTab !== 'full') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setPageIndex((current) => Math.min(current + 2, selectedBook.pages.length - 1));
      if (event.key === 'ArrowLeft') setPageIndex((current) => Math.max(current - 2, 0));
      if (event.key === 'Escape') setSelectedBook(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [readerTab, selectedBook]);

  const openReader = (book: Book, startPage = 0) => {
    setSelectedBook(book);
    setPageIndex(startPage);
    setReaderTab('summary');
  };

  const addToCart = (book: Book) => {
    if (cart.includes(book.id)) return;
    setCart((current) => [...current, book.id]);
    setNotice(`«${book.title}» добавлена в корзину`);
    window.setTimeout(() => setNotice(''), 2200);
  };

  const saveBookmark = () => {
    if (!selectedBook) return;
    setBookmarks((current) => ({
      ...current,
      [selectedBook.id]: { title: selectedBook.title, page: pageIndex + 1 },
    }));
    setNotice('Место чтения сохранено');
    window.setTimeout(() => setNotice(''), 2200);
  };

  const cartBooks = books.filter((book) => cart.includes(book.id));
  const total = cartBooks.reduce((sum, book) => sum + book.price, 0);
  const currentPages = selectedBook?.pages.slice(pageIndex, pageIndex + 2) ?? [];
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.username ?? 'читатель';

  return (
    <div className="library-app">
      <header className="library-header">
        <a className="library-logo" href="#top" aria-label="Библиотека — на главную">
          <span className="library-logo-mark"><BookOpen size={19} strokeWidth={1.8} /></span>
          <span>Библиотека</span>
        </a>
        <label className="library-search">
          <Search size={18} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти книгу или автора..." aria-label="Найти книгу или автора" />
        </label>
        <nav className="library-nav" aria-label="Навигация библиотеки">
          <button type="button" onClick={() => setBookmarksOpen(true)}><Bookmark size={15} /> Закладки <span>{Object.keys(bookmarks).length}</span></button>
          <button type="button" onClick={() => setCartOpen(true)}><ShoppingCart size={15} /> Корзина <span>{cart.length}</span></button>
          <button type="button" onClick={() => setAccountOpen(true)}><UserRound size={15} /> Кабинет</button>
        </nav>
      </header>

      <main id="top">
        <section className="library-hero">
          <div>
            <p className="library-kicker">Ваше читальное пространство</p>
            <h1>Книги, к которым хочется возвращаться.</h1>
            <p className="library-hero-copy">Читаем о разработке спокойно и вдумчиво. Сохраняйте место, открывайте книги и собирайте собственную полку.</p>
          </div>
          <div className="library-shelf" aria-hidden="true">
            <span className="shelf-book shelf-book-one" />
            <span className="shelf-book shelf-book-two" />
            <span className="shelf-book shelf-book-three" />
            <span className="shelf-book shelf-book-four" />
            <span className="shelf-line" />
          </div>
        </section>

        <section className="library-catalog" aria-labelledby="catalog-title">
          <div className="library-catalog-heading">
            <div>
              <p className="library-kicker">Полка читателя</p>
              <h2 id="catalog-title">Книги</h2>
            </div>
            <span className="library-count">{filteredBooks.length} из {books.length}</span>
          </div>
          <div className="library-filters" role="tablist" aria-label="Категории книг">
            {categories.map((item) => (
              <button key={item} type="button" className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>
            ))}
          </div>
          {filteredBooks.length ? (
            <div className="library-book-grid">
              {filteredBooks.map((book) => (
                <article className="library-book-card" key={book.id}>
                  <button type="button" className="library-cover-button" onClick={() => openReader(book)} aria-label={`Открыть книгу «${book.title}»`}>
                    <BookCover book={book} />
                  </button>
                  <h3>{book.title}</h3>
                  <p>{book.author}</p>
                  <strong>{book.price === 0 ? 'Бесплатно' : `${book.price} ₸`}</strong>
                  <div className="library-card-actions">
                    <button type="button" className="library-primary-button" onClick={() => openReader(book)}>{book.price === 0 ? 'Читать бесплатно' : 'Открыть книгу'}</button>
                    {book.price > 0 ? <button type="button" className="library-outline-button" onClick={() => addToCart(book)}>В корзину</button> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="library-empty">По этому запросу ничего нет на полке.</p>}
        </section>
      </main>

      <footer className="library-footer">Библиотека — книги для разработчиков</footer>

      {selectedBook ? (
        <div className="library-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedBook(null); }}>
          <section className="library-reader" role="dialog" aria-modal="true" aria-labelledby="reader-title">
            <div className="library-reader-toolbar">
              <span><span className="library-reader-dot" /> {selectedBook.title}</span>
              <span className="library-reader-progress">{readerTab === 'summary' ? 'Краткое содержание' : `${Math.min(pageIndex + 2, selectedBook.pages.length)} из ${selectedBook.pages.length} страниц`}</span>
              <button type="button" onClick={() => setSelectedBook(null)} aria-label="Закрыть книгу">Закрыть <X size={18} /></button>
            </div>
            <div className="library-reader-tabs">
              <button type="button" className={readerTab === 'summary' ? 'active' : ''} onClick={() => setReaderTab('summary')}>О книге</button>
              <button type="button" className={readerTab === 'full' ? 'active' : ''} onClick={() => setReaderTab('full')}>Читать книгу</button>
            </div>
            {readerTab === 'summary' ? (
              <div className="library-summary">
                <BookCover book={selectedBook} small />
                <div>
                  <h2 id="reader-title">{selectedBook.title}</h2>
                  <p className="library-reader-author">{selectedBook.author} · {selectedBook.category}</p>
                  <span className="library-summary-label">О книге</span>
                  <p className="library-summary-copy">{selectedBook.summary}</p>
                  <button type="button" className="library-primary-button" onClick={() => setReaderTab('full')}>Начать чтение <ChevronRight size={16} /></button>
                </div>
              </div>
            ) : (
              <div className="library-full-reader">
                <div className="library-book-spread">
                  {currentPages.map((page, index) => (
                    <article className="library-page" key={`${page.title}-${index}`}>
                      <span>{page.kicker}</span>
                      <h3>{page.title}</h3>
                      <p>{page.text}</p>
                      <small>{pageIndex + index + 1}</small>
                    </article>
                  ))}
                </div>
                <div className="library-page-controls">
                  <button type="button" disabled={pageIndex === 0} onClick={() => setPageIndex((current) => Math.max(current - 2, 0))}><ChevronLeft size={16} /> Назад</button>
                  <span>{pageIndex + 1}—{Math.min(pageIndex + 2, selectedBook.pages.length)} из {selectedBook.pages.length}</span>
                  <button type="button" disabled={pageIndex >= selectedBook.pages.length - 2} onClick={() => setPageIndex((current) => Math.min(current + 2, selectedBook.pages.length - 1))}>Дальше <ChevronRight size={16} /></button>
                </div>
              </div>
            )}
            <div className="library-reader-bottom">
              <button type="button" onClick={saveBookmark}><Bookmark size={15} /> {bookmarks[selectedBook.id] ? 'Место сохранено' : 'Сохранить место'}</button>
              <span>Перелистывайте кнопками или клавишами ← →</span>
            </div>
          </section>
        </div>
      ) : null}

      {cartOpen ? (
        <div className="library-overlay library-drawer-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}>
          <aside className="library-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
            <button type="button" className="library-close-button" onClick={() => setCartOpen(false)}>Закрыть <X size={18} /></button>
            <h2 id="cart-title">Корзина</h2>
            {cartBooks.length ? cartBooks.map((book) => (
              <div className="library-cart-item" key={book.id}><span>{book.title}</span><button type="button" onClick={() => setCart((current) => current.filter((id) => id !== book.id))}>Убрать</button></div>
            )) : <p className="library-muted">Корзина пуста.</p>}
            <strong className="library-total">{cartBooks.length ? `Итого: ${total} ₸` : ''}</strong>
            <button type="button" className="library-primary-button library-wide-button" onClick={() => setNotice('Оплата пока не подключена')}>Оформить покупку</button>
          </aside>
        </div>
      ) : null}

      {bookmarksOpen ? (
        <div className="library-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBookmarksOpen(false); }}>
          <section className="library-small-modal" role="dialog" aria-modal="true" aria-labelledby="bookmarks-title">
            <button type="button" className="library-close-button" onClick={() => setBookmarksOpen(false)}>Закрыть <X size={18} /></button>
            <h2 id="bookmarks-title">Мои закладки</h2>
            {Object.entries(bookmarks).length ? Object.entries(bookmarks).map(([id, bookmark]) => (
              <button type="button" className="library-bookmark-item" key={id} onClick={() => { setBookmarksOpen(false); const book = books.find((item) => item.id === Number(id)); if (book) openReader(book, Math.max(0, bookmark.page - 1)); }}>
                <span>{bookmark.title}</span><span>стр. {bookmark.page}</span>
              </button>
            )) : <p className="library-muted">Пока нет сохранённых мест.</p>}
          </section>
        </div>
      ) : null}

      {accountOpen ? (
        <div className="library-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAccountOpen(false); }}>
          <section className="library-small-modal" role="dialog" aria-modal="true" aria-labelledby="account-title">
            <button type="button" className="library-close-button" onClick={() => setAccountOpen(false)}>Закрыть <X size={18} /></button>
            <div className="library-account-icon"><UserRound size={24} /></div>
            <p className="library-kicker">Личный кабинет</p>
            <h2 id="account-title">Ваш читательский профиль</h2>
            <div className="library-account-row"><span>Логин / email</span><strong>{email}</strong></div>
            <p className="library-muted">Пароль не отображается из соображений безопасности. При необходимости его можно изменить через настройки аккаунта Clerk.</p>
            <div className="library-account-actions">
              <button type="button" className="library-outline-button" onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL })}>Выйти</button>
              <button type="button" className="library-primary-button" onClick={() => setAccountOpen(false)}><Check size={15} /> Готово</button>
            </div>
          </section>
        </div>
      ) : null}

      {notice ? <div className="library-toast" role="status">{notice}</div> : null}
    </div>
  );
}
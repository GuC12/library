import type { Language } from '@/lib/i18n';

export type Quote = {
  id: number;
  text: Record<Language, string>;
  author: Record<Language, string>;
};

export const quotes: Quote[] = [
  {
    id: 1,
    text: {
      ru: 'Книги — это корабли мысли, странствующие по волнам времени и бережно несущие свой драгоценный груз от поколения к поколению.',
      en: 'Books are ships which pass through the vast seas of time, carrying their precious cargo from generation to generation.',
      kk: 'Кітаптар — уақыт толқынында жүзіп, өзінің асыл жүгін ұрпақтан ұрпаққа аялай жеткізетін ой кемелері.',
      zh: '书籍是穿梭于浩瀚时间之海的航船，小心翼翼地把珍贵的货物从一代人运载给另一代人。',
    },
    author: {
      ru: 'Фрэнсис Бэкон',
      en: 'Francis Bacon',
      kk: 'Фрэнсис Бэкон',
      zh: '弗朗西斯·培根',
    },
  },
  {
    id: 2,
    text: {
      ru: 'Комната без книг подобна телу без души.',
      en: 'A room without books is like a body without a soul.',
      kk: 'Кітабы жоқ бөлме — жаны жоқ тән сияқты.',
      zh: '没有书的房间，犹如没有灵魂的躯体。',
    },
    author: {
      ru: 'Марк Туллий Цицерон',
      en: 'Marcus Tullius Cicero',
      kk: 'Марк Туллий Цицерон',
      zh: '西塞罗',
    },
  },
  {
    id: 3,
    text: {
      ru: 'Я всегда представлял себе рай чем-то вроде библиотеки.',
      en: 'I have always imagined that Paradise will be a kind of a library.',
      kk: 'Мен жұмақты әрқашан кітапхана кейпінде елестететінмін.',
      zh: '我心里一直暗自设想，天堂应该是图书馆的模样。',
    },
    author: {
      ru: 'Хорхе Луис Борхес',
      en: 'Jorge Luis Borges',
      kk: 'Хорхе Луис Борхес',
      zh: '豪尔赫·路易斯·博尔赫斯',
    },
  },
  {
    id: 4,
    text: {
      ru: 'Артық ғылым кітапта, ерінбей оқып көруге. Книга — сокровищница знания и мудрости.',
      en: 'Great knowledge lies in books; never tire of seeking and reading it.',
      kk: 'Артық ғылым кітапта, ерінбей оқып көруге.',
      zh: '高深的学问尽在书籍中，当不知疲倦地去研读它。',
    },
    author: {
      ru: 'Абай Кунанбаев',
      en: 'Abai Kunanbayev',
      kk: 'Абай Құнанбайұлы',
      zh: '阿拜·库南巴耶夫',
    },
  },
  {
    id: 5,
    text: {
      ru: 'Есть преступления хуже, чем сжигать книги. Одно из них — не читать их.',
      en: 'There are worse crimes than burning books. One of them is not reading them.',
      kk: 'Кітапты өртеуден де ауыр қылмыстар бар. Солардың бірі — оны оқымау.',
      zh: '比烧书更严重的罪行，就是不去阅读它们。',
    },
    author: {
      ru: 'Рэй Брэдбери',
      en: 'Ray Bradbury',
      kk: 'Рэй Брэдбери',
      zh: '雷·布拉德伯里',
    },
  },
  {
    id: 6,
    text: {
      ru: 'Учиться и не размышлять — напрасный труд; размышлять и не учиться — пагубно.',
      en: 'Learning without thought is labor lost; thought without learning is perilous.',
      kk: 'Оқу ойланбаса — бос әурешілік, ойлану оқымаса — қауіпті.',
      zh: '学而不思则罔，思而不学则殆。',
    },
    author: {
      ru: 'Конфуций',
      en: 'Confucius',
      kk: 'Конфуций',
      zh: '孔子',
    },
  },
  {
    id: 7,
    text: {
      ru: 'Хорошая книга — точно беседа с умным человеком.',
      en: 'A good book is like a conversation with a wise person.',
      kk: 'Жақсы кітап — ақылды адаммен сырласқанмен бірдей.',
      zh: '读一本好书，就像与智者进行一场亲切的谈话。',
    },
    author: {
      ru: 'Лев Толстой',
      en: 'Leo Tolstoy',
      kk: 'Лев Толстой',
      zh: '列夫·托尔斯泰',
    },
  },
  {
    id: 8,
    text: {
      ru: 'Чтение хороших книг — это разговор с самыми лучшими людьми прошедших времен.',
      en: 'The reading of all good books is like a conversation with the finest minds of past centuries.',
      kk: 'Жақсы кітаптарды оқу — өткен ғасырлардың ең ұлы даналарымен сұхбаттасу.',
      zh: '读一切好书，就是和许多高尚的人谈话。',
    },
    author: {
      ru: 'Рене Декарт',
      en: 'René Descartes',
      kk: 'Рене Декарт',
      zh: '笛卡尔',
    },
  },
  {
    id: 9,
    text: {
      ru: 'Книги — это уникальное портативное волшебство, доступное каждому в любое время.',
      en: 'Books are a uniquely portable magic, available to anyone at any time.',
      kk: 'Кітаптар — кез келген уақытта қолыңда болатын ерекше сиқыр.',
      zh: '书籍是一种独一无二且便于携带的魔法。',
    },
    author: {
      ru: 'Стивен Кинг',
      en: 'Stephen King',
      kk: 'Стивен Кинг',
      zh: '斯蒂芬·金',
    },
  },
  {
    id: 10,
    text: {
      ru: 'Чтение для ума — то же, что физические упражнения для тела.',
      en: 'Reading is to the mind what exercise is to the body.',
      kk: 'Кітап оқу ақыл-ой үшін — дене шынықтырудың дене үшін пайдалы болғанындай.',
      zh: '读书之于头脑，正如运动之于身体。',
    },
    author: {
      ru: 'Джозеф Аддисон',
      en: 'Joseph Addison',
      kk: 'Джозеф Аддисон',
      zh: '约瑟夫·艾迪生',
    },
  },
];


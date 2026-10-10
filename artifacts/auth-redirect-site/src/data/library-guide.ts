import type { Language } from '@/lib/i18n';

export type GuideTopic = 'read' | 'search' | 'bookmark' | 'publish' | 'friends' | 'level' | 'cart' | 'language';
type GuideCopy = {
  name: string; role: string; intro: string; invite: string; open: string; hide: string;
  minimize: string; placeholder: string; send: string; popular: string; fallback: string;
  topics: Record<GuideTopic, [string, string]>;
};
export const guideCopy: Record<Language, GuideCopy> = {
  ru: {
    name: 'Умный призрак', role: 'Ваш гид по библиотеке',
    intro: 'Привет! Помогу освоиться в библиотеке.', invite: 'Задайте вопрос о сайте или выберите готовый.',
    open: 'Спросить гида', hide: 'Убрать гида', minimize: 'Свернуть ответы',
    placeholder: 'Что хотите узнать о библиотеке?', send: 'Отправить вопрос', popular: 'Частые вопросы',
    fallback: 'Пока я знаю ответы на частые вопросы о библиотеке. Попробуйте спросить о чтении, поиске, закладках, публикации, друзьях, уровнях или корзине — либо выберите вопрос ниже.',
    topics: {
      read: ['Как начать читать?', 'Нажмите на книгу или кнопку чтения рядом с ней. В открывшемся окне выберите вкладку «Читать». Перелистывайте страницы кнопками «Назад» и «Вперёд» или стрелками клавиатуры.'],
      search: ['Как найти нужную книгу?', 'Введите название или автора в строку поиска наверху. В каталоге можно выбрать категорию и язык книги. Если ничего не найдено, очистите поиск и сбросьте фильтры.'],
      bookmark: ['Как сохранить место чтения?', 'В окне книги нажмите «Добавить закладку» внизу. Затем откройте «Закладки» в верхнем меню и выберите сохранённую книгу. На вкладке чтения можно продолжить с этой страницы.'],
      publish: ['Как добавить свою книгу?', 'Нажмите кнопку добавления книги, заполните название, автора, описание и страницы. Выберите готовую обложку или загрузите свою, затем опубликуйте книгу. Управлять своими книгами можно в профиле.'],
      friends: ['Как добавить друга и написать ему?', 'Откройте «Друзья», найдите пользователя по никнейму и отправьте запрос. После принятия запроса выберите друга в разделе «Чат», чтобы обмениваться сообщениями и фотографиями.'],
      level: ['Для чего нужны уровни и XP?', 'Опыт начисляется за активность в библиотеке: открытие и чтение книг, а также публикации. Ваш уровень и статистика видны в профиле. В «Рейтинге читателей» можно сравнить свой прогресс с другими.'],
      cart: ['Как работает корзина?', 'Добавьте книгу кнопкой корзины на её карточке, затем откройте «Корзина» вверху. Там можно удалить книги и перейти к оформлению. Сейчас оформление демонстрационное: настоящий платёж и доставка не выполняются.'],
      language: ['Как поменять язык?', 'Выберите язык интерфейса в переключателе справа сверху. Язык самих книг выбирается отдельно — фильтром в каталоге. Переключение интерфейса не переводит текст книги.'],
    },
  },
  en: {
    name: 'Wise Ghost', role: 'Your library guide', intro: 'Hi! I can help you explore the library.', invite: 'Ask about the site or choose a question.',
    open: 'Ask the guide', hide: 'Hide guide', minimize: 'Minimize answers', placeholder: 'What would you like to know?', send: 'Send question', popular: 'Popular questions',
    fallback: 'I currently answer common library questions. Ask about reading, search, bookmarks, publishing, friends, levels or the cart, or choose a question below.',
    topics: {
      read: ['How do I start reading?', 'Open a book or its reading button, then select the reading tab. Turn pages with the Previous and Next buttons or the arrow keys.'],
      search: ['How can I find a book?', 'Enter its title or author in the search bar at the top. Filter the catalogue by category and book language. Clear the search and filters if there are no results.'],
      bookmark: ['How do I save my place?', 'Click Add bookmark at the bottom of the reader. Open Bookmarks in the top menu, select your book and switch to the reading tab to continue from that page.'],
      publish: ['How do I publish my own book?', 'Use the add-book button and fill in the title, author, description and pages. Pick a cover or upload your own, then publish. Manage your books in your profile.'],
      friends: ['How do I add a friend or chat?', 'Open Friends, search by nickname and send a request. Once accepted, choose your friend in Chat to exchange messages and photos.'],
      level: ['What are levels and XP?', 'You earn experience through library activity, including opening, reading and publishing books. See your level and stats in your profile and compare progress in the reader leaderboard.'],
      cart: ['How does the cart work?', 'Add a book using its cart button and open Cart in the top menu. Remove items or proceed to checkout there. Checkout is currently a demo; no real payment or delivery takes place.'],
      language: ['How do I change the language?', 'Use the language switcher at the top right for the interface. Use the catalogue filter for book languages. Changing the interface language does not translate books.'],
    },
  },
  kk: {
    name: 'Ақылды елес', role: 'Кітапханадағы көмекшіңіз', intro: 'Сәлем! Кітапхананы қолдануға көмектесемін.', invite: 'Сайт туралы сұраңыз немесе дайын сұрақты таңдаңыз.',
    open: 'Көмекшіден сұрау', hide: 'Көмекшіні жасыру', minimize: 'Жауаптарды жию', placeholder: 'Кітапхана туралы не білгіңіз келеді?', send: 'Сұрақты жіберу', popular: 'Жиі қойылатын сұрақтар',
    fallback: 'Әзірге кітапхана туралы жиі қойылатын сұрақтарға жауап беремін. Оқу, іздеу, бетбелгі, жариялау, достар, деңгей немесе себет туралы сұраңыз, не төмендегі сұрақты таңдаңыз.',
    topics: {
      read: ['Оқуды қалай бастаймын?', 'Кітапты немесе оқу батырмасын басып, оқу қойындысын таңдаңыз. Беттерді «Алдыңғы» және «Келесі» батырмаларымен немесе пернетақта бағыттауыштарымен ауыстырыңыз.'],
      search: ['Кітапты қалай табамын?', 'Жоғарғы іздеу жолына атауын немесе авторын енгізіңіз. Каталогта санат пен кітап тілін таңдауға болады. Нәтиже болмаса, іздеу мен сүзгілерді тазалаңыз.'],
      bookmark: ['Оқыған жерімді қалай сақтаймын?', 'Оқу терезесінің төменгі жағындағы сақтау батырмасын басыңыз. Жоғарғы мәзірдегі бетбелгілерден кітапты таңдап, оқу қойындысында жалғастырыңыз.'],
      publish: ['Өз кітабымды қалай қосамын?', 'Кітап қосу батырмасын басып, атауын, авторын, сипаттамасын және беттерін толтырыңыз. Мұқаба таңдаңыз немесе жүктеңіз, содан кейін жариялаңыз. Кітаптарыңызды профильде басқарыңыз.'],
      friends: ['Дос қосып, қалай хат жазамын?', '«Достар» бөлімінде пайдаланушыны лақап атымен тауып, сұрау жіберіңіз. Ол қабылданған соң, «Чат» арқылы хабарламалар мен фотосуреттер жіберуге болады.'],
      level: ['Деңгей мен XP не үшін керек?', 'Кітап ашу, оқу және жариялау үшін тәжірибе беріледі. Деңгей мен статистика профильде көрсетіледі. Оқырмандар рейтингінде жетістіктеріңізді салыстырыңыз.'],
      cart: ['Себет қалай жұмыс істейді?', 'Кітапты карточкасындағы себет батырмасымен қосыңыз. Жоғарғы мәзірден себетті ашып, кітаптарды алып тастауға немесе тапсырысқа өтуге болады. Қазір бұл демонстрация: нақты төлем мен жеткізу жоқ.'],
      language: ['Тілді қалай ауыстырамын?', 'Интерфейс тілін жоғарғы оң жақтағы ауыстырғышпен өзгертіңіз. Кітап тілін каталог сүзгісінен таңдаңыз. Интерфейс тілі кітап мәтінін аудармайды.'],
    },
  },
  zh: {
    name: '聪明幽灵', role: '你的图书馆向导', intro: '你好！我来帮你熟悉图书馆。', invite: '询问网站功能，或选择一个常见问题。',
    open: '询问向导', hide: '隐藏向导', minimize: '收起回答', placeholder: '想了解图书馆的什么功能？', send: '发送问题', popular: '常见问题',
    fallback: '目前我能回答图书馆的常见问题。可以询问阅读、搜索、书签、发布、好友、等级或购物车，也可以选择下面的问题。',
    topics: {
      read: ['如何开始阅读？', '打开书籍或点击阅读按钮，然后选择阅读选项卡。使用上一页、下一页按钮或键盘方向键翻页。'],
      search: ['如何查找书籍？', '在顶部搜索栏输入书名或作者。也可以按类别和书籍语言筛选。没有结果时，请清空搜索和筛选条件。'],
      bookmark: ['如何保存阅读位置？', '点击阅读窗口底部的保存位置按钮。在顶部菜单打开书签，选择书籍，然后切换到阅读选项卡继续阅读。'],
      publish: ['如何发布自己的书？', '点击添加书籍，填写标题、作者、简介和页面。选择或上传封面，然后发布。在个人资料中管理自己的书籍。'],
      friends: ['如何添加好友并聊天？', '打开好友，通过昵称查找用户并发送请求。对方接受后，在聊天中选择好友，即可发送消息和照片。'],
      level: ['等级和XP有什么用？', '打开、阅读和发布书籍等活动可以获得经验。在个人资料中查看等级和统计，在读者排行榜中比较进度。'],
      cart: ['购物车如何使用？', '使用书籍卡片上的购物车按钮添加书籍，然后在顶部打开购物车。可以移除书籍或进入结账。目前结账为演示，不会实际付款或配送。'],
      language: ['如何切换语言？', '使用右上角的语言切换器更改界面语言。在目录中筛选书籍语言。更改界面语言不会翻译书籍内容。'],
    },
  },
};

const keywords: Record<GuideTopic, string[]> = {
  read: ['читать', 'чтени', 'открыть книг', 'страниц', 'листать', 'перелист', 'read', 'page', 'оқу', 'оқы', 'беттер', '阅读', '翻页'],
  search: ['найти нужную', 'найти книг', 'поиск', 'искать', 'фильтр', 'категори', 'search', 'find a book', 'filter', 'іздеу', 'табам', '搜索', '查找', '筛选'],
  bookmark: ['заклад', 'сохранить место', 'сохранить страниц', 'продолжить', 'bookmark', 'save my place', 'save place', 'resume', 'бетбелгі', 'сақтай', '书签', '保存', '位置'],
  publish: ['добавить книг', 'добавить свою', 'загруз', 'опубликов', 'публика', 'свою книг', 'создать книг', 'publish', 'upload', 'own book', 'add a book', 'кітабымды', 'жария', '发布', '上传'],
  friends: ['друг', 'друз', 'чат', 'сообщени', 'написать', 'никнейм', 'friend', 'chat', 'message', 'nickname', 'дос', 'хат', '好友', '聊天', '消息'],
  level: ['уров', 'опыт', 'рейтинг', 'xp', 'level', 'experience', 'leaderboard', 'деңгей', 'тәжірибе', '等级', '经验', '排行'],
  cart: ['корзин', 'оплат', 'купить', 'покуп', 'заказ', 'доставк', 'платеж', 'cart', 'checkout', 'buy', 'payment', 'deliver', 'себет', 'төлем', 'тапсырыс', '购物车', '结账', '付款', '配送'],
  language: ['язык', 'перевод', 'language', 'translate', 'тіл', '语言', '翻译'],
};

export function findGuideTopic(question: string): GuideTopic | undefined {
  const normalized = question.toLocaleLowerCase().replaceAll('ё', 'е');
  let bestTopic: GuideTopic | undefined;
  let bestScore = 0;
  for (const [topic, terms] of Object.entries(keywords)) {
    const score = terms.reduce((sum, term) => sum + (normalized.includes(term) ? term.length : 0), 0);
    if (score > bestScore) { bestTopic = topic as GuideTopic; bestScore = score; }
  }
  return bestTopic;
}
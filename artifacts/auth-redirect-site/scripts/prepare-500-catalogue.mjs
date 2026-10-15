import { readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJson = async relative => JSON.parse(await readFile(path.join(root, relative), 'utf8'));
const writeJson = (relative, value) => writeFile(path.join(root, relative), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
const [current, gutenberg, russian, kazakh, coverExclusions, catalogue, russianBatch] = await Promise.all([
  readJson('src/data/curated-books.json'), readJson('src/data/gutenberg.json'),
  readJson('src/data/russian-classics.json'), readJson('src/data/kazakh-classics.json'),
  readJson('src/data/generated-cover-exclusions.json'), readJson('src/data/catalogue.json'), readJson('src/data/russian-batch-100.json'),
]);
const excludedGutenbergIds = new Set(coverExclusions.ebookIds);
const hasVerifiedEditionCover = book => !excludedGutenbergIds.has(Number(book.textPath.match(/pg-(\d+)\.json\.gz/)?.[1]));

// The first 13 records are the hand-checked starter set; regenerate the
// appended selection idempotently if this script is run again.
const starter = catalogue.filter(book => book.coverKind === 'edition' && ['ru', 'en'].includes(book.language))
  .map(({ excerpt, sourceArchivePath, descriptionSource, ...book }) => {
    if (!book.coverImage.startsWith('https://')) return book;
    const extension = new URL(book.coverImage).pathname.match(/\.(jpe?g|png|webp)$/iu)?.[0]?.toLowerCase() || '.jpg';
    return {
      ...book,
      coverImageSourceUrl: book.coverImage,
      coverImage: `books/covers/edition-${book.id}${extension}`,
      coverKind: 'edition',
      coverEdition: book.coverEdition || 'Изображение реального издания из каталога продавца',
      coverLicense: book.coverLicense || 'Источник изображения указан; лицензия перепечатки у продавца отдельно не указана.',
    };
  });
const manualEditionAdditions = current.filter(book => [31997, 31998, 31999, 32000].includes(book.id));
if (starter.length !== 8) throw new Error('The hand-checked starter catalogue is incomplete.');
const selectedRussianIds = [42000, 42004, 42006, 42010, 42011, 42012, 42018, 42020, 42026, 42027, 42028, 42032, 42034, 42036, 42041, 42048, 42058, 42063, 42067, 42068, 42007, 42008, 42052, 42291, 42300, 42070, 42576, 42037, 42383, 42464, 42575];
const selectedKazakh = [
  { id: 33105, cover: 'https://www.litres.ru/pub/c/cover/23127696.jpg', label: 'Бай мен жарлы баласы', description: 'Әңгіме екі баланың сапар үстіндегі мінезін салыстырады: еңбекке дағдыланған кедей баласы жолдағы қиындықтарды еңсерсе, бай баласы өз бетімен әрекет ете алмайды.' },
  { id: 33103, cover: 'https://files.marfu.kz/2022/09/21/2022092106370200e_medium.png', label: 'Әке мен бала', description: 'Ыбырай Алтынсариннің қысқа тәрбиелік әңгімесі әке мен баланың жол үстіндегі әңгімесі арқылы еңбектің, байқағыштықтың және пайдалы істің қадірін көрсетеді.' },
];
const russianDescriptions = new Map([
  [42010, 'Исторический роман французского писателя Жана Ломбара в переводе начала XX века. В центре повествования — судьбы людей на фоне политических и общественных потрясений Франции.'],
  [42011, 'Роман бельгийского писателя Камиля Лемонье в переводе С. А. Лопашова. Герой, переживший предательство и потерю состояния, уходит из города и пытается начать новую жизнь вдали от прежнего общества.'],
  [42007, 'Второй том исторического романа Эжена Сю о Париже и французском обществе XIX века. Продолжение истории семейства Реннепон и связанных с ним поколений.'],
  [42008, 'Третий том романа Эжена Сю продолжает историю нескольких поколений семьи Реннепон на фоне перемен французского общества XIX века.'],
  [42000, 'В романе М. Н. Волконского художник Варгин получает заказ на роспись нового дворца Павла I. Придворная служба втягивает его в интриги Петербурга конца XVIII века.'],
  [42004, 'Приключенческий роман Гюстава Эмара начинается во Франции и ведёт героев к морским странствиям и опасным столкновениям. Это одна из историй автора о путешественниках и авантюристах.'],
  [42006, 'Первый том исторического романа Эжена Сю о Париже и европейском обществе XIX века; сюжет связывает судьбы нескольких поколений семьи Реннепон.'],
  [42012, 'Оккультный роман Веры Крыжановской знакомит с Настей, которая приходит в дом, полный тайн. История соединяет семейную драму с мистическими мотивами.'],
  [42018, 'Исторический роман Валерия Брюсова переносит читателя в Рим VI века, во время войны с готами, и соединяет судьбу героя с падением древнего города.'],
  [42020, 'В романе Ганса Эверса учёный эксперимент приводит к рождению Альрауне — необычного существа, чья судьба ставит вопросы о природе, наследственности и ответственности создателя.'],
  [42026, 'Роман Степняка-Кравчинского рассказывает о русском революционном движении XIX века и подпольной борьбе Андрея Кожухова.'],
  [42027, 'Историко-приключенческий роман Георга Борна переносит действие ко двору Анны Австрийской и показывает борьбу за влияние при французском дворе начала XVII века.'],
  [42028, 'Во втором томе романа Георга Борна продолжается история интриг французского двора и борьбы за положение рядом с королевой Анной Австрийской.'],
  [42032, 'Исторический роман Евгения Салиаса начинается с путешествия по зимней дороге у Волхова и разворачивает историю, связанную с именем графа Аракчеева и его эпохой.'],
  [42034, 'Незавершённая историческая повесть Пушкина обращается к юности Абрама Ганнибала и петровской эпохе.'],
  [42036, 'Роман-утопия А. Ярославского рассказывает о путешествии на космическом корабле «Победитель» и мечте о дальних мирах. Среди глав — полёт на ракете и путешествие в пространстве.'],
  [42041, 'Исторический роман Михаила Загоскина переносит действие в Киевскую Русь времён князя Владимира и рассказывает о борьбе за власть и веру.'],
  [42048, 'Исторический роман Феликса Дана посвящён Аттиле и гуннам. Судьбы героев разворачиваются на фоне походов и борьбы за власть у берегов Дуная.'],
  [42058, 'В «Бамбочаде» Константин Вагинов показывает повседневную жизнь в карикатурном ключе; в центре первых глав — Матреша Белоусова и люди её окружения.'],
  [42063, 'Исторический роман Ивана Лажечникова о России XVII века раскрывает столкновение старых порядков с преобразованиями Петра I.'],
  [42067, 'Роман Григория Данилевского начинается с пути двух беглецов из старых украинских губерний к Азовскому побережью. Их дорога становится историей переселения и борьбы за новую жизнь.'],
  [42068, 'Роман Александра Грина о любви, море и свободе: странное судно «Бегущая по волнам» связывает судьбы героев с чередой загадочных событий.'],
  [42052, 'Инженер Лось отправляется на Марс и встречает загадочную Аэлиту. Роман соединяет космическое путешествие, приключения и размышления о жизни на другой планете.'],
  [42291, 'Инженер Гарин создаёт лучевое оружие невероятной силы. Его планы выходят за пределы научного опыта: приключенческий роман о власти, амбициях и цене безграничных стремлений.'],
  [42300, 'Профессор Доуэль погибает во время опыта, но его голову удаётся поддерживать жизнь. Фантастический роман Беляева исследует, что происходит, когда научное открытие оказывается в чужих руках.'],
  [42070, 'Роман в письмах о бедном чиновнике Макаре Девушкине и Варваре Добросёловой. В переписке раскрываются одиночество, доброта и достоинство людей, которых общество почти не замечает.'],
  [42576, 'Князь Мышкин возвращается в Петербург и оказывается среди людей, чьи страсти и расчёты сталкиваются с его открытостью и состраданием. Один из самых известных романов Достоевского о доброте и её испытаниях.'],
  [42575, "Алексей Иванович приезжает на европейский курорт, где азартная рулетка становится испытанием для его чувств и свободы. Роман Достоевского о страсти, зависимости и цене риска."],
  [42383, "Фёдор Лаврецкий возвращается в родовое имение и встречает Лизу Калитину. Тихий роман Тургенева о несбывшейся любви, семейных ожиданиях и попытке начать жизнь заново."],
  [42464, "Григорий Литвинов приезжает в немецкий курортный город и сталкивается с прежней любовью. Роман Тургенева о выборе, самообмане и переменах в русском обществе."],
  [42037, 'Юноша Ариэль обладает необыкновенной способностью летать. Выйдя за стены закрытого индийского учебного заведения, он отправляется в путешествие, которое приводит его к семье, свободе и собственному предназначению.'],
]);

const existingEnglishTitles = new Set(starter.filter(book => book.language === 'en').map(book => book.title.toLocaleLowerCase()));
const russianPicks = selectedRussianIds.map(id => russian.find(book => book.id === id)).filter(Boolean);
if (russianPicks.length !== selectedRussianIds.length) throw new Error('A selected Russian edition entry is missing.');
const kazakhPicks = selectedKazakh.map(({ id, ...extra }) => {
  const source = kazakh.find(book => book.id === id);
  if (!source) throw new Error(`Kazakh text entry ${id} is missing.`);
  return { ...source, ...extra };
});

const englishPicks = gutenberg.filter(book => book.language === 'en' && hasVerifiedEditionCover(book) && !existingEnglishTitles.has(book.title.toLocaleLowerCase())).slice(0, 264);
const chinesePicks = gutenberg.filter(book => book.language === 'zh' && hasVerifiedEditionCover(book));
const russianGutenberg = gutenberg.filter(book => book.language === 'ru' && hasVerifiedEditionCover(book));
if (englishPicks.length !== 264 || chinesePicks.length !== 1 || russianGutenberg.length !== 1) {
  throw new Error(`Unexpected source counts: en ${englishPicks.length}, zh ${chinesePicks.length}, ru ${russianGutenberg.length}`);
}

const pgPicks = [...englishPicks, ...chinesePicks, ...russianGutenberg];
const books = [];
for (const book of pgPicks) {
  const { excerpt, sourceArchivePath, ...metadata } = book;
  const pgId = Number(book.textPath.match(/pg-(\d+)\.json\.gz/)[1]);
  const imageUrl = `https://www.gutenberg.org/cache/epub/${pgId}/pg${pgId}.cover.medium.jpg`;
  const coverImage = `books/covers/gutenberg-edition-${pgId}.jpg`;
  books.push({
    ...metadata,
    coverImage,
    coverSourceUrl: imageUrl,
    coverKind: 'edition',
    coverEdition: `Project Gutenberg scanned cover for ebook ${pgId}`,
    summary: `Complete ${book.language === 'zh' ? 'Chinese-language' : book.language === 'ru' ? 'Russian-language' : 'English-language'} text of “${book.title}” by ${book.author}. The Project Gutenberg catalogue classifies it under ${book.category.toLocaleLowerCase()} and records these subjects: ${book.summary.replace(/^Темы из каталога источника:\s*/i, '').replace(/[.\s]+$/, '')}.`,
  });
}

for (const book of russianPicks) {
  const { excerpt, sourceArchivePath, descriptionSource, ...metadata } = book;
  if (!russianDescriptions.has(book.id)) throw new Error(`Russian book ${book.id} is missing an editor-written description.`);
  const sourceExtension = (book.coverImage.startsWith('http') ? new URL(book.coverImage).pathname : book.coverImage).match(/\.(jpe?g|png|webp)$/iu)?.[0] || '.jpg';
  const filename = book.coverImage.startsWith('books/covers/') ? book.coverImage : `books/covers/russian-edition-${book.id}${sourceExtension}`;
  books.push({
    ...metadata,
    category: [42052, 42291, 42300, 42037].includes(book.id) ? 'Фантастика' : [42070, 42576, 42383, 42464, 42575].includes(book.id) ? 'Классика' : book.category || 'Русская литература',
    summary: russianDescriptions.get(book.id),
    publicationYear: book.id === 42052 ? 1923 : book.id === 42291 ? 1927 : book.id === 42300 ? 1925 : book.id === 42070 ? 1847 : book.id === 42576 ? 1869 : book.publicationYear,
    coverSourceUrl: book.coverSourceUrl || book.coverImage,
    coverImageSourceUrl: book.coverImage.startsWith('http') ? book.coverImage : null,
    coverImage: filename,
    coverEdition: book.coverEdition || `Изображение обложки из каталога реального издания: ${book.coverImage}`,
    coverLicense: book.coverLicense || 'Изображение обложки взято из каталога продавца; отдельная лицензия на изображение источником не указана.',
    coverKind: 'edition',
  });
}

for (const book of russianBatch) {
  const { excerpt, sourceArchivePath, ...metadata } = book;
  const { coverSourceUrl, coverImageSourceUrl, ...originalMetadata } = metadata;
  books.push({
    ...originalMetadata,
    coverKind: book.coverKind === 'edition' ? 'edition' : 'library-original',
    ...(coverSourceUrl ? { coverSourceUrl } : {}),
    ...(coverImageSourceUrl ? { coverImageSourceUrl } : {}),
  });
}

for (const book of kazakhPicks) {
  const { excerpt, sourceArchivePath, descriptionSource, ...metadata } = book;
  const originalCover = book.cover;
  const filename = `books/covers/kazakh-edition-${book.id}.${book.id === 33103 ? 'png' : 'jpg'}`;
  books.push({
    ...metadata,
    category: 'Казахская литература',
    coverKind: 'edition',
    coverImage: filename,
    coverSourceUrl: originalCover,
    coverEdition: `Обложка конкретного издания; источник изображения: ${originalCover}`,
    sourceName: 'Wikisource, Kazakh',
    sourceLicense: 'Текст в общественном достоянии; обложка используется как изображение соответствующего издания из каталога продавца.',
  });
  delete books.at(-1).cover;
}

const newBooks = [...books];
const seen = new Set(starter.map(book => book.id));
for (const book of newBooks) {
  if (seen.has(book.id)) throw new Error(`Duplicate ID ${book.id}`);
  seen.add(book.id);
}
const combined = [...starter, ...newBooks, ...manualEditionAdditions];
if (combined.length !== 411) throw new Error(`Expected 411 sourced entries plus the two featured books; found ${combined.length}`);

await mkdir(path.join(root, 'public/books/covers'), { recursive: true });
const cache = new Map();
const booksNeedingCovers = [...starter, ...newBooks];
let next = 0;
const workers = Array.from({ length: 12 }, async () => {
  while (next < booksNeedingCovers.length) {
    const book = booksNeedingCovers[next++];
    const outputPath = path.join(root, 'public', book.coverImage);
    try {
      const existing = await stat(outputPath);
      // Project SVG covers are deliberately compact; 500 bytes is enough to
      // confirm that the locally generated image is already present.
      if (existing.size > (outputPath.endsWith('.svg') ? 500 : 2500)) continue;
    } catch {}
    const url = book.coverImageSourceUrl || book.coverSourceUrl;
    let result = cache.get(url);
    if (!result) {
      result = (async () => {
        let lastError;
        for (let attempt = 1; attempt <= 4; attempt++) {
          try {
            const response = await fetch(url, { headers: { 'user-agent': 'OpenLibraryStudentProject/1.0 (cover catalogue)' } });
            if (!response.ok) throw new Error(`Cover HTTP ${response.status}: ${url}`);
            const type = response.headers.get('content-type') || '';
            if (!type.startsWith('image/')) throw new Error(`Cover URL did not return an image (${type}): ${url}`);
            const bytes = Buffer.from(await response.arrayBuffer());
            if (bytes.length < 2500) throw new Error(`Cover image is unexpectedly small (${bytes.length} bytes): ${url}`);
            return bytes;
          } catch (error) {
            lastError = error;
            if (attempt < 4) await new Promise(resolve => setTimeout(resolve, 500 * attempt));
          }
        }
        throw lastError;
      })();
      cache.set(url, result);
    }
    const bytes = await result;
    await writeFile(outputPath, bytes);
  }
});
await Promise.all(workers);
for (const ebookId of excludedGutenbergIds) {
  if (!Number.isSafeInteger(ebookId) || ebookId <= 0) throw new Error(`Invalid excluded Gutenberg ebook ID: ${ebookId}`);
  await rm(path.join(root, 'public/books/covers', `gutenberg-edition-${ebookId}.jpg`), { force: true });
}
await writeJson('src/data/curated-books.json', combined);
console.log(`Prepared ${combined.length + 2} visible books: ${combined.filter(book => book.language === 'ru').length + 2} ru, ${combined.filter(book => book.language === 'en').length} en, ${combined.filter(book => book.language === 'kk').length} kk, ${combined.filter(book => book.language === 'zh').length} zh.`);

import fs from 'node:fs';

const d = JSON.parse(fs.readFileSync('kazakh_fetched.json', 'utf8'));
const titles = [
  'Ер Төстік', 'Әзім әңгімесі', 'Таза бұлақ', 'Әке мен бала', 'Бақша ағаштары',
  'Бай мен жарлы баласы', 'Қыпшақ Сейітқұл', 'Мейірімді бала', 'Шеше мен бала',
  'Қарға мен түлкі', 'Түлкі мен ешкі', 'Өрмекші, құмырсқа, қарлығаш', 'Бір уыс мақта',
  'Сауысқан мен қарға', 'Ананың сүюі', 'Өзен', 'Мен жастарға сенемін', 'Қазақ тілі',
  'Адамдық диқаншысы', 'Аққу, шортан һәм шаян', 'Сегіз аяқ', 'Көзімнің қарасы',
  'Ғылым таппай мақтанба', 'Интернатта оқып жүр', 'Сабырсыз, арсыз, еріншек',
  'Алланың өзi де рас, сөзi де рас', 'Жасымда ғылым бар деп ескермедім',
  'Қараша, желтоқсан мен сол бір-екі ай', 'Жазғытұры', 'Күз', 'Қыс', 'Жаз'
];

function cleanWikiText(raw) {
  return raw
    .replace(/^''[^']+''\s*/, '')
    .replace(/<poem>[\s\S]*?<\/poem>/gi, m => m.replace(/<\/?poem>/gi, ''))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1')
    .replace(/'''?/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function paginate(text, maxChars = 750) {
  const paragraphs = text.split(/\n\n+/);
  const pages = [];
  let current = '';

  for (const para of paragraphs) {
    if (!current) {
      if (para.length <= maxChars) {
        current = para;
      } else {
        const lines = para.split('\n');
        for (const line of lines) {
          if (!current) {
            current = line;
          } else if ((current + '\n' + line).length <= maxChars) {
            current += '\n' + line;
          } else {
            pages.push(current);
            current = line;
          }
        }
      }
    } else if ((current + '\n\n' + para).length <= maxChars) {
      current += '\n\n' + para;
    } else {
      pages.push(current);
      if (para.length <= maxChars) {
        current = para;
      } else {
        current = '';
        const lines = para.split('\n');
        for (const line of lines) {
          if (!current) {
            current = line;
          } else if ((current + '\n' + line).length <= maxChars) {
            current += '\n' + line;
          } else {
            pages.push(current);
            current = line;
          }
        }
      }
    }
  }
  if (current.trim()) pages.push(current);
  return pages;
}

let startId = 33100;
const newBooks = [];

for (const t of titles) {
  const item = d.find(x => x.title === t);
  const cleaned = cleanWikiText(item.text);
  const rawPages = paginate(cleaned);
  const pagesObj = rawPages.map((txt, idx) => ({
    kicker: t,
    title: idx === 0 ? 'Толық мәтін' : '',
    text: txt
  }));

  const slug = 'kk-ws-' + startId;
  const jsonPath = 'books/' + slug + '.json';
  fs.writeFileSync('artifacts/auth-redirect-site/public/' + jsonPath, JSON.stringify(pagesObj, null, 2), 'utf8');

  // cover
  let cover = 'books/covers/kk-ws-' + startId + '.svg';
  let coverSource = undefined;
  let coverEdition = undefined;

  if (t === 'Ер Төстік') {
    cover = 'books/covers/Ertostik.jpg';
    coverSource = 'https://commons.wikimedia.org/wiki/File:Ertostik.jpg';
    coverEdition = 'Wikimedia Commons · Ер Төстік ертегісі иллюстрациясы';
  } else if (['Әзім әңгімесі', 'Сегіз аяқ', 'Көзімнің қарасы', 'Ғылым таппай мақтанба', 'Интернатта оқып жүр', 'Сабырсыз, арсыз, еріншек', 'Алланың өзi де рас, сөзi де рас', 'Жасымда ғылым бар деп ескермедім', 'Қараша, желтоқсан мен сол бір-екі ай', 'Жазғытұры', 'Күз', 'Қыс', 'Жаз'].includes(t)) {
    cover = 'books/covers/Abai_Kunanbaev.jpg';
    coverSource = 'https://commons.wikimedia.org/wiki/File:Abai_Kunanbaev.jpg';
    coverEdition = 'Wikimedia Commons · Абай Құнанбайұлы портреті';
  } else if (['Таза бұлақ', 'Әке мен бала', 'Бақша ағаштары', 'Бай мен жарлы баласы', 'Қыпшақ Сейітқұл', 'Мейірімді бала', 'Шеше мен бала', 'Қарға мен түлкі', 'Түлкі мен ешкі', 'Өрмекші, құмырсқа, қарлығаш', 'Бір уыс мақта', 'Сауысқан мен қарға', 'Ананың сүюі', 'Өзен'].includes(t)) {
    cover = 'books/covers/Altynsarin.jpg';
    coverSource = 'https://commons.wikimedia.org/wiki/File:Altynsarin.jpg';
    coverEdition = 'Wikimedia Commons · Ыбырай Алтынсарин портреті';
  }

  // Meta
  let author = 'Абай Құнанбайұлы';
  let category = 'Поэзия';
  let pubYear = null;
  let summary = '';

  if (t === 'Ер Төстік') {
    author = 'Қазақ халық ертегісі';
    category = 'Фэнтези';
    summary = 'Ер Төстіктің басынан кешкен ғажайып оқиғалары мен ерліктері туралы әйгілі қазақ халық ертегісі.';
  } else if (t === 'Әзім әңгімесі') {
    category = 'Приключения';
    pubYear = 1887;
    summary = 'Мың бір түн желісі бойынша жазылған, сиқыр мен хикаяға толы Абайдың белгілі поэмасы.';
  } else if (t === 'Бай мен жарлы баласы') {
    author = 'Ыбырай Алтынсарин';
    category = 'Приключения';
    summary = 'Асан мен Үсеннің далада адасып, еңбек пен тапқырлықтың арқасында аман қалған хикаясы.';
  } else if (t === 'Қыпшақ Сейітқұл') {
    author = 'Ыбырай Алтынсарин';
    category = 'Историческая проза';
    summary = 'Еңбекқор Сейітқұлдың елді отырықшылыққа, егіншілік пен бейбіт еңбекке баулыған өнегелі тарихы.';
  } else if (['Таза бұлақ', 'Әке мен бала', 'Бақша ағаштары', 'Мейірімді бала', 'Шеше мен бала', 'Бір уыс мақта', 'Қарға мен түлкі', 'Түлкі мен ешкі', 'Өрмекші, құмырсқа, қарлығаш', 'Сауысқан мен қарға'].includes(t)) {
    author = 'Ыбырай Алтынсарин';
    category = 'Детская литература';
    summary = 'Ыбырай Алтынсариннің өнегелі ғибратты шығармасы: «' + t + '».';
  } else if (['Ананың сүюі', 'Өзен'].includes(t)) {
    author = 'Ыбырай Алтынсарин';
    category = 'Поэзия';
    summary = 'Ыбырай Алтынсариннің балаларға арналған өлеңі: «' + t + '».';
  } else if (['Мен жастарға сенемін', 'Қазақ тілі'].includes(t)) {
    author = 'Мағжан Жұмабаев';
    category = 'Поэзия';
    summary = 'Мағжан Жұмабаевтың рухты, сыршыл өлеңі: «' + t + '».';
  } else if (['Адамдық диқаншысы', 'Аққу, шортан һәм шаян'].includes(t)) {
    author = 'Ахмет Байтұрсынұлы';
    category = 'Поэзия';
    summary = 'Ахмет Байтұрсынұлының тағылымды өлең-мысалы: «' + t + '».';
  } else if (t === 'Алланың өзi де рас, сөзi де рас') {
    category = 'Философия';
    pubYear = 1902;
    summary = 'Абайдың жаратылыс, ақиқат, иман мен адамгершілік хақындағы терең философиялық толғауы.';
  } else {
    author = 'Абай Құнанбайұлы';
    category = 'Поэзия';
    summary = 'Абай Құнанбайұлының белгілі туындысы: «' + t + '».';
  }

  newBooks.push({
    id: startId,
    title: t,
    author: author,
    category: category,
    price: 0,
    spine: '#255d58',
    summary: summary,
    pages: [],
    language: 'kk',
    publicationYear: pubYear,
    pageCount: pagesObj.length,
    textPath: jsonPath,
    downloadPath: jsonPath,
    coverImage: cover,
    sourceUrl: 'https://wikisource.org/wiki/' + encodeURIComponent(t),
    sourceName: 'Wikisource',
    sourceLicense: 'Public domain text · Wikisource contributors, CC BY-SA 4.0',
    excerpt: rawPages[0].slice(0, 400),
    coverSourceUrl: coverSource,
    coverEdition: coverEdition
  });

  startId++;
}

console.log('Generated', newBooks.length, 'new Kazakh books');
fs.writeFileSync('new_kazakh_books.json', JSON.stringify(newBooks, null, 2), 'utf8');


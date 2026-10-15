import { readFile, writeFile } from 'node:fs/promises';
const books = JSON.parse(await readFile('src/data/russian-batch-100.json', 'utf8'));
const replacements = [
  { id: 42299, cover: 12227245, source: 'https://openlibrary.org/search.json?q=Golem%20Gustav%20Meyrink', edition: 'Обложка издания Gustav Meyrink, Golem; Open Library.' },
  { id: 42356, cover: 2187330, source: 'https://openlibrary.org/search.json?q=La%20Daniella%20George%20Sand', edition: 'Обложка издания George Sand, La Daniella; Open Library.' },
  { id: 42405, cover: 13187254, source: 'https://openlibrary.org/search.json?q=Jack%20Vosmerkin%20the%20American%20Nikolay%20Smirnov', edition: 'Обложка русского издания «Джек Восьмеркин — американец»; Open Library.' },
  { id: 42523, cover: 6868278, source: 'https://openlibrary.org/search.json?q=Za%20chertopolokhom%20Pyotr%20Krasnov', edition: 'Обложка издания П. Н. Краснова «За чертополохом», 1928; Open Library.' },
];
const foundElsewhere = [
  { id: 42362, name: 'dvav-ivana', source: 'https://books.google.com/books?id=O71qCwAAQBAJ', edition: 'Обложка русского издания «Два Ивана, или Страсть к тяжбам»; Google Books.' },
  { id: 42256, name: 'eight-clock', source: 'https://fantlab.ru/edition148244', edition: 'Издание «Восемь ударов стенных часов. Хрустальная пробка. 813»; FantLab.' },
  { id: 42133, name: 'future-race', source: 'https://ast.ru/book/gryadushchaya-rasa-890617/', edition: 'Издание Э. Бульвер-Литтона «Грядущая раса»; издательство АСТ.' },
  { id: 42159, name: 'forest-book-2', source: 'https://www.chitai-gorod.ru/product/v-lesah-tom-ii-3097461', edition: 'Издание Павла Мельникова-Печерского «В лесах», том II; 2025.' },
  { id: 42131, name: 'brynsky-forest', source: 'https://www.chitai-gorod.ru/product/brynskiy-lec-2497438', edition: 'Издание Михаила Загоскина «Брынский лес»; 2015.' },
  { id: 42186, name: 'swanns-way', source: 'https://azbooka.ru/books/v-storonu-svanna-u4xl', edition: 'Русское издание Марселя Пруста «В сторону Свана»; Азбука.' },
];
for (const item of replacements) {
  const book = books.find((candidate) => candidate.id === item.id);
  if (!book) throw new Error(`Missing book ${item.id}`);
  book.coverImage = `books/covers/openlibrary-${item.cover}.jpg`;
  book.coverKind = 'edition';
  book.coverEdition = item.edition;
  book.coverSourceUrl = item.source;
  book.coverLicense = 'Источник обложки указан; условия повторного распространения отдельно не указаны.';
}
for (const item of foundElsewhere) {
  const book = books.find((candidate) => candidate.id === item.id);
  if (!book) throw new Error(`Missing book ${item.id}`);
  book.coverImage = `books/covers/candidate-${item.name}.jpg`;
  book.coverKind = 'edition';
  book.coverEdition = item.edition;
  book.coverSourceUrl = item.source;
  book.coverLicense = 'Источник обложки указан; условия повторного распространения отдельно не указаны.';
}
await writeFile('src/data/russian-batch-100.json', `${JSON.stringify(books, null, 2)}\n`, 'utf8');
console.log(`Applied ${replacements.length + foundElsewhere.length} matching edition covers.`);

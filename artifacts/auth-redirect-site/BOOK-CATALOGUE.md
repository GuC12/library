# Library Catalogue

The visible catalogue contains 307 books with complete texts and source records: 36 in Russian, 268 in English, 2 in Kazakh, and 1 in Chinese. The two featured project books remain at the front.

Three Russian-language science-fiction books were added:

- Аэлита ? Толстой; full text: https://ru.wikisource.org/wiki/%D0%90%D1%8D%D0%BB%D0%B8%D1%82%D0%B0_(%D0%A2%D0%BE%D0%BB%D1%81%D1%82%D0%BE%D0%B9); cover record: https://commons.wikimedia.org/wiki/File:Aelita_(cover_by_Shillingovsky).jpg.
- Гиперболоид инженера Гарина ? Толстой; full text: https://ru.wikisource.org/wiki/%D0%93%D0%B8%D0%BF%D0%B5%D1%80%D0%B1%D0%BE%D0%BB%D0%BE%D0%B8%D0%B4_%D0%B8%D0%BD%D0%B6%D0%B5%D0%BD%D0%B5%D1%80%D0%B0_%D0%93%D0%B0%D1%80%D0%B8%D0%BD%D0%B0_(%D0%A2%D0%BE%D0%BB%D1%81%D1%82%D0%BE%D0%B9); cover record: https://commons.wikimedia.org/wiki/File:%D0%93%D0%B8%D0%BF%D0%B5%D1%80%D0%B1%D0%BE%D0%BB%D0%BE%D0%B8%D0%B4_%D0%B8%D0%BD%D0%B6%D0%B5%D0%BD%D0%B5%D1%80%D0%B0_%D0%93%D0%B0%D1%80%D0%B8%D0%BD%D0%B0%2C_1_%D0%B8%D0%B7%D0%B4%D0%B0%D0%BD%D0%B8%D0%B5%2C_%D0%93%D0%BE%D1%81%D0%B8%D0%B7%D0%B4%D0%B0%D1%82_1927.png.
- Голова профессора Доуэля ? Беляев; full text: https://ru.wikisource.org/wiki/%D0%93%D0%BE%D0%BB%D0%BE%D0%B2%D0%B0_%D0%BF%D1%80%D0%BE%D1%84%D0%B5%D1%81%D1%81%D0%BE%D1%80%D0%B0_%D0%94%D0%BE%D1%83%D1%8D%D0%BB%D1%8F_(%D0%91%D0%B5%D0%BB%D1%8F%D0%B5%D0%B2)%2F1925_(%D0%A1%D0%9E)%2F%D0%92%D0%B5%D1%80%D1%81%D0%B8%D1%8F_2; cover record: https://commons.wikimedia.org/wiki/File:%D0%93%D0%BE%D0%BB%D0%BE%D0%B2%D0%B0_%D0%BF%D1%80%D0%BE%D1%84%D0%B5%D1%81%D1%81%D0%BE%D1%80%D0%B0_%D0%94%D0%BE%D1%83%D1%8D%D0%BB%D1%8F.jpg.

Historic cover images from 1925-1927 are stored locally. Their edition details and rights notes are recorded in [COVER-IMAGE-SOURCES.md](public/books/COVER-IMAGE-SOURCES.md). Text source revisions and transcription licences are recorded in [WIKISOURCE-SOURCES.md](public/books/WIKISOURCE-SOURCES.md).

The visible selection is generated from the source manifests by:

```powershell
pnpm books:prepare-verified
pnpm books:verify
pnpm typecheck
pnpm build
```

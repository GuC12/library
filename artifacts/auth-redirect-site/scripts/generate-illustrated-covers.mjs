/** Create clearly labelled catalogue artwork where a matching edition scan was unavailable. */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const palettes = [
  ['#101b2b', '#304c5d', '#d7b875', '#f3e8cf'],
  ['#281a24', '#68434a', '#e1b16f', '#fff0d6'],
  ['#192c25', '#42614a', '#d5bd81', '#f2e8cf'],
  ['#1c2035', '#414c70', '#d9bd85', '#f7efd9'],
  ['#302319', '#73532f', '#e4c47d', '#fff2d9'],
  ['#172c36', '#315a65', '#d9a879', '#faeed7'],
];
const xml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const hash = (value) => [...String(value)].reduce((result, char) => (result * 33 + char.codePointAt(0)) >>> 0, 5381);
const words = (value, width, limit = 5) => {
  const lines = [];
  let line = '';
  for (const word of String(value).split(/\s+/)) {
    if (!line || `${line} ${word}`.length <= width) line = line ? `${line} ${word}` : word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  if (lines.length <= limit) return lines;
  const retained = lines.slice(0, limit);
  retained[limit - 1] = `${retained[limit - 1].replace(/[.…]+$/, '')}…`;
  return retained;
};

function sceneFor(book, ink, gold, paper) {
  const title = `${book.title} ${book.excerpt || ''} ${book.summary || ''}`.toLocaleLowerCase();
  const category = book.category;
  // Classify the Russian titles and excerpts before the legacy English fallbacks.
  if (/детектив|убий|преступ|сыщик|тайн|следств|похищ|заговор|шпион/.test(title)) return `
    <path d="M80 610 L100 540 L150 540 L150 590 L205 590 L205 520 L255 520 L255 600 L315 600 L315 500 L365 500 L365 580 L430 580 L430 545 L500 545 L500 650 H80Z" fill="${ink}"/>
    <path d="M98 540 L235 455 L370 540 M270 520 L385 430 L502 520" fill="none" stroke="${gold}" stroke-width="4"/>
    <circle cx="455" cy="635" r="42" fill="none" stroke="${paper}" stroke-width="8"/><path d="M485 665 L530 710" stroke="${paper}" stroke-width="12" stroke-linecap="round"/>`;
  if (/море|моряк|океан|остров|кораб|капитан|путешеств|экспедиц|приключен|пираты?|робинзон/.test(title)) return `
    <path d="M48 680 L145 552 L220 625 L324 465 L415 605 L470 535 L570 680Z" fill="${ink}"/>
    <path d="M100 700 Q180 675 258 700 T420 700 T575 700" fill="none" stroke="${gold}" stroke-width="5"/>
    <path d="M354 655 V555 M354 560 L405 635 H354 M346 570 L302 638 H346" fill="none" stroke="${paper}" stroke-width="5"/><path d="M290 660 Q350 645 430 660 L405 690 H315Z" fill="${gold}"/>`;
  if (/царь|царев|император|императриц|корол|княз|дворян|рим|цезар|войн|осад|рыцар|историческ|герцог/.test(title)) return `
    <path d="M115 689 V553 H485 V689 M90 553 L300 455 L510 553Z" fill="${ink}" stroke="${gold}" stroke-width="4"/>
    <path d="M160 680 V573 Q160 550 185 550 Q210 550 210 573 V680 M255 680 V573 Q255 550 280 550 Q305 550 305 573 V680 M350 680 V573 Q350 550 375 550 Q400 550 400 573 V680 M445 680 V573 Q445 550 470 550 Q495 550 495 573 V680" fill="none" stroke="${paper}" stroke-width="8" opacity=".88"/>
    <path d="M80 690 H520 M140 715 H460" stroke="${gold}" stroke-width="5"/>`;
  if (/любов|страст|влюб|невест|свадьб|брак|сердц|женщин|девушк/.test(title)) return `
    <path d="M300 705 C210 620 135 565 178 505 C218 448 277 486 300 532 C330 476 393 456 430 510 C474 575 385 646 300 705Z" fill="${ink}" stroke="${gold}" stroke-width="5"/>
    <path d="M300 698 C287 633 304 565 365 512 M304 631 Q236 620 218 565 M315 590 Q365 604 400 566" fill="none" stroke="${paper}" stroke-width="4"/>`;
  if (/лес|дерев|цвет|сад|птиц|снег|весн|болот|природ|охот|звер/.test(title)) return `
    <path d="M50 690 L160 420 L270 690 M145 690 L280 385 L415 690 M330 690 L455 450 L565 690Z" fill="${ink}"/>
    <path d="M160 470 V700 M280 430 V700 M455 490 V700" stroke="${gold}" stroke-width="10"/>
    <path d="M80 710 Q180 685 280 710 T520 710" fill="none" stroke="${paper}" stroke-width="4"/>`;
  if (category === 'Казахская литература' || category === 'Русская литература' || /kazakh/.test(category)) return `
    <path d="M55 620 Q160 520 255 620 T455 620 T600 612 V760 H55Z" fill="${ink}" opacity=".76"/>
    <path d="M55 648 Q170 560 275 648 T495 640 T600 640" fill="none" stroke="${gold}" stroke-width="3" opacity=".75"/>
    <path d="M270 620 Q245 565 260 505 Q275 555 292 570 Q287 520 315 480 Q330 550 307 590 Q345 550 375 540 Q360 600 318 625Z" fill="${gold}" opacity=".84"/>
    <path d="M110 680 Q180 625 252 680 M346 690 Q430 615 523 680" fill="none" stroke="${paper}" stroke-width="2" opacity=".45"/>`;
  if (category === 'Детективы' || /mystery|detective|crime|murder|detective|secret/.test(title)) return `
    <path d="M80 610 L100 540 L150 540 L150 590 L205 590 L205 520 L255 520 L255 600 L315 600 L315 500 L365 500 L365 580 L430 580 L430 545 L500 545 L500 650 H80Z" fill="${ink}"/>
    <path d="M98 540 L235 455 L370 540 M270 520 L385 430 L502 520" fill="none" stroke="${gold}" stroke-width="4"/>
    <path d="M390 455 L435 455 L435 535 L390 535Z" fill="${gold}" opacity=".8"/>
    <circle cx="455" cy="635" r="42" fill="none" stroke="${paper}" stroke-width="8"/><path d="M485 665 L530 710" stroke="${paper}" stroke-width="12" stroke-linecap="round"/>`;
  if (category === 'Фэнтези' || /fantasy|dragon|magic|wizard|fairy|myth/.test(title)) return `
    <path d="M45 690 L145 565 L202 620 L295 470 L363 575 L426 520 L560 690Z" fill="${ink}"/>
    <path d="M100 665 V620 L155 575 L210 620 V665 M145 665 V625 H168 V665 M365 660 V600 L420 560 L475 600 V660" fill="none" stroke="${gold}" stroke-width="5"/>
    <path d="M195 620 Q255 555 319 573 Q350 585 374 557 Q349 620 307 615 Q257 610 234 653Z" fill="${paper}" opacity=".82"/>
    <path d="M260 573 L250 550 L275 560 L295 540 L298 568" fill="${gold}"/>`;
  if (category === 'Приключения' || category === 'Путешествия' || /adventure|voyage|travel|sea|island|expedition/.test(title)) return `
    <path d="M48 680 L145 552 L220 625 L324 465 L415 605 L470 535 L570 680Z" fill="${ink}"/>
    <path d="M324 465 L282 525 L327 508 L360 542Z" fill="${paper}" opacity=".75"/>
    <path d="M100 700 Q180 675 258 700 T420 700 T575 700" fill="none" stroke="${gold}" stroke-width="5"/>
    <path d="M354 655 V555 M354 560 L405 635 H354 M346 570 L302 638 H346" fill="none" stroke="${paper}" stroke-width="5"/>
    <path d="M290 660 Q350 645 430 660 L405 690 H315Z" fill="${gold}"/>`;
  if (category === 'Любовные романы' || /romance|love|lover|heart|wedding/.test(title)) return `
    <path d="M300 705 C210 620 135 565 178 505 C218 448 277 486 300 532 C330 476 393 456 430 510 C474 575 385 646 300 705Z" fill="${ink}" stroke="${gold}" stroke-width="5"/>
    <path d="M300 698 C287 633 304 565 365 512 M304 631 Q236 620 218 565 M315 590 Q365 604 400 566" fill="none" stroke="${paper}" stroke-width="4"/>
    <path d="M365 512 C333 500 338 465 364 461 C385 458 395 481 382 496 C412 476 433 494 425 512 C415 534 387 526 365 512Z" fill="${gold}"/>`;
  if (category === 'Поэзия' || category === 'Драма и пьесы' || /poem|poetry|verse|drama|play|tragedy/.test(title)) return `
    <path d="M112 667 Q204 618 300 666 Q396 618 488 667 V714 Q396 675 300 722 Q204 675 112 714Z" fill="${ink}" stroke="${gold}" stroke-width="4"/>
    <path d="M300 666 V719 M148 684 Q220 664 270 688 M330 688 Q382 663 454 684" fill="none" stroke="${paper}" stroke-width="3" opacity=".85"/>
    <path d="M165 630 Q130 573 178 527 Q226 576 190 630 M202 628 Q204 560 265 538 Q267 598 220 637 M420 631 Q465 580 432 535 Q380 579 406 637" fill="${gold}" opacity=".85"/>
    <path d="M193 641 Q210 576 248 558 M410 645 Q413 578 440 555" stroke="${ink}" fill="none" stroke-width="5"/>`;
  if (category === 'Детская литература') return `
    <path d="M65 677 Q175 602 275 663 Q380 584 535 667 V738 H65Z" fill="${ink}"/>
    <path d="M172 643 Q195 584 240 600 Q276 618 260 658 Q236 685 193 671Z" fill="${gold}"/>
    <path d="M188 628 Q207 617 216 633 M232 630 Q248 618 255 635 M199 654 Q220 670 243 653" fill="none" stroke="${ink}" stroke-width="5"/>
    <path d="M360 682 V548 M360 563 Q306 554 326 511 Q360 518 369 550 Q390 506 428 516 Q428 556 369 568" fill="${paper}" opacity=".85"/>
    <path d="M65 710 Q170 685 280 712 T535 709" fill="none" stroke="${gold}" stroke-width="4"/>`;
  if (category === 'Историческая проза' || /history|historical|war|king|queen|roman|empire|revolution/.test(title)) return `
    <path d="M115 689 V553 H485 V689 M90 553 L300 455 L510 553Z" fill="${ink}" stroke="${gold}" stroke-width="4"/>
    <path d="M160 680 V573 Q160 550 185 550 Q210 550 210 573 V680 M255 680 V573 Q255 550 280 550 Q305 550 305 573 V680 M350 680 V573 Q350 550 375 550 Q400 550 400 573 V680 M445 680 V573 Q445 550 470 550 Q495 550 495 573 V680" fill="none" stroke="${paper}" stroke-width="8" opacity=".88"/>
    <path d="M80 690 H520 M140 715 H460" stroke="${gold}" stroke-width="5"/>`;
  if (category === 'Философия' || category === 'Познавательная литература' || /philosophy|ethics|science|mathematics|education|knowledge/.test(title)) return `
    <path d="M92 565 L300 465 L508 565Z" fill="${gold}"/>
    <path d="M112 576 H488 M130 581 V692 M210 581 V692 M290 581 V692 M370 581 V692 M450 581 V692 M112 698 H488" stroke="${paper}" stroke-width="7"/>
    <path d="M72 717 H528" stroke="${gold}" stroke-width="5"/>
    <path d="M270 460 V410 M240 435 H300" stroke="${paper}" stroke-width="4"/>`;
  return `
    <path d="M70 680 Q95 560 185 555 Q245 550 270 610 Q292 500 390 495 Q490 510 520 680Z" fill="${ink}"/>
    <path d="M255 680 V580 Q255 520 300 520 Q345 520 345 580 V680 M275 680 V586 Q275 545 300 545 Q325 545 325 586 V680" fill="none" stroke="${gold}" stroke-width="6"/>
    <path d="M90 700 H510 M130 724 H470" stroke="${paper}" stroke-width="3" opacity=".75"/>
    <path d="M195 655 Q215 632 235 655 M365 655 Q385 632 405 655" fill="none" stroke="${gold}" stroke-width="4"/>`;
}

export function coverSvg(book) {
  const palette = palettes[hash(`${book.id}:${book.title}`) % palettes.length];
  const [dark, ink, gold, paper] = palette;
  const titleLines = words(book.title, book.title.length > 70 ? 24 : 29, 5);
  const titleSize = titleLines.length >= 4 ? 27 : titleLines.length >= 3 ? 31 : 36;
  const title = titleLines.map((line, index) => `<tspan x="300" dy="${index ? 39 : 0}">${xml(line)}</tspan>`).join('');
  const authorLines = words(book.author, 34, 2);
  const author = authorLines.map((line, index) => `<tspan x="300" dy="${index ? 30 : 0}">${xml(line)}</tspan>`).join('');
  const category = xml(book.category.toLocaleUpperCase());
  const summary = xml((book.summary || '').replace(/\s+/g, ' ').slice(0, 94));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900" role="img" aria-label="${xml(book.title)} — ${xml(book.author)}">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${dark}"/><stop offset=".55" stop-color="${ink}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
    <linearGradient id="foil" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${paper}"/><stop offset=".52" stop-color="${gold}"/><stop offset="1" stop-color="${paper}"/></linearGradient>
    <radialGradient id="light"><stop stop-color="${gold}" stop-opacity=".23"/><stop offset="1" stop-color="${dark}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="600" height="900" fill="url(#paper)"/>
  <path d="M0 570 Q130 480 250 555 T600 515 V900 H0Z" fill="url(#light)"/>
  <path d="M0 90 Q150 30 300 90 T600 72 M0 815 Q150 755 300 815 T600 795" fill="none" stroke="${gold}" stroke-opacity=".18" stroke-width="2"/>
  <rect x="24" y="24" width="552" height="852" rx="4" fill="none" stroke="url(#foil)" stroke-width="2"/>
  <rect x="34" y="34" width="532" height="832" rx="3" fill="none" stroke="${gold}" stroke-opacity=".36"/>
  <path d="M48 84 Q78 48 108 84 M492 84 Q522 48 552 84 M48 816 Q78 852 108 816 M492 816 Q522 852 552 816" fill="none" stroke="${gold}" stroke-width="2"/>
  <path d="M66 110 H534" stroke="${gold}" stroke-opacity=".45"/>
  <text x="300" y="94" text-anchor="middle" fill="${paper}" font-family="Georgia,serif" font-size="13" letter-spacing="2.5">${category}</text>
  <text x="300" y="194" text-anchor="middle" fill="${gold}" font-family="Georgia,serif" font-size="14" letter-spacing="4">${xml(book.language.toUpperCase())} · ${xml(book.publicationYear || 'CLASSIC EDITION')}</text>
  <text x="300" y="256" text-anchor="middle" fill="${paper}" font-family="Georgia,'Times New Roman',serif" font-size="${titleSize}" font-weight="700">${title}</text>
  <path d="M145 438 Q220 423 300 438 T455 438" fill="none" stroke="${gold}" stroke-opacity=".65" stroke-width="2"/>
  <g>${sceneFor(book, ink, gold, paper)}</g>
  <path d="M145 754 Q220 740 300 754 T455 754" fill="none" stroke="${gold}" stroke-opacity=".65" stroke-width="2"/>
  <text x="300" y="792" text-anchor="middle" fill="${paper}" font-family="Georgia,'Times New Roman',serif" font-size="23" font-weight="600">${author}</text>
  <text x="300" y="834" text-anchor="middle" fill="${gold}" font-family="Georgia,serif" font-size="10" letter-spacing="3">LIBRARY EDITION</text>
  <title>${xml(book.title)} — ${xml(book.author)}. ${summary}</title>
</svg>`;
}

export async function generateIllustratedCovers() {
for (const manifest of ['src/data/gutenberg.json', 'src/data/russian-classics.json']) {
  const file = path.join(root, manifest);
  const books = JSON.parse(await readFile(file, 'utf8'));
  let changed = 0;
  for (const book of books) {
    // Keep scanned/current edition covers. Replace generated SVGs and Gutenberg's geometric auto-covers.
    const isGenerated = manifest.endsWith('gutenberg.json') || book.coverImage?.endsWith('.svg');
    if (!isGenerated) continue;
    const slug = `catalog-art-${book.id}.svg`;
    await writeFile(path.join(root, 'public/books/covers', slug), coverSvg(book), 'utf8');
    book.coverImage = `books/covers/${slug}`;
    book.coverKind = 'catalog-art';
    book.coverEdition = 'Созданная обложка библиотеки, оформлена по жанру и названию; не скан исторического издания.';
    changed++;
  }
  await writeFile(file, `${JSON.stringify(books, null, 2)}\n`, 'utf8');
  console.log(`${manifest}: generated ${changed} illustrated catalogue covers`);
}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await generateIllustratedCovers();

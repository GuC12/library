import fs from 'node:fs';

const ru = JSON.parse(fs.readFileSync('artifacts/auth-redirect-site/src/data/russian-classics.json', 'utf8'));

function createRichCoverSvg(title, author, category, color, spine) {
  const esc = (str) => (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeTitle = esc(title);
  const safeAuthor = esc(author);
  const safeCategory = esc(category || 'КЛАССИЧЕСКАЯ ЛИТЕРАТУРА').toUpperCase();
  
  // Wrap title lines
  const words = safeTitle.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if ((cur + ' ' + w).length <= 22) {
      cur += ' ' + w;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > 4) {
    lines.length = 4;
    lines[3] += '...';
  }

  const titleTspans = lines.map((l, i) => {
    const dy = i === 0 ? 0 : 42;
    return '<tspan x="300" dy="' + dy + '">' + l + '</tspan>';
  }).join('');

  return '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">' +
    '<defs>' +
      '<linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
        '<stop offset="0%" stop-color="' + color + '"/>' +
        '<stop offset="40%" stop-color="#111622"/>' +
        '<stop offset="100%" stop-color="' + (spine || '#0d111a') + '"/>' +
      '</linearGradient>' +
      '<linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
        '<stop offset="0%" stop-color="#f3e0aa"/>' +
        '<stop offset="50%" stop-color="#d4af37"/>' +
        '<stop offset="100%" stop-color="#aa820a"/>' +
      '</linearGradient>' +
      '<radialGradient id="glow" cx="50%" cy="45%" r="50%">' +
        '<stop offset="0%" stop-color="rgba(212,175,55,0.18)"/>' +
        '<stop offset="100%" stop-color="rgba(0,0,0,0)"/>' +
      '</radialGradient>' +
    '</defs>' +
    '<!-- Book Texture Background -->' +
    '<rect width="600" height="900" fill="url(#bgGrad)"/>' +
    '<rect width="600" height="900" fill="url(#glow)"/>' +
    '<!-- Outer Ornamental Frame -->' +
    '<rect x="28" y="28" width="544" height="844" rx="4" fill="none" stroke="url(#goldGrad)" stroke-width="2.5"/>' +
    '<rect x="36" y="36" width="528" height="828" rx="2" fill="none" stroke="#d4af37" stroke-width="1" stroke-opacity="0.4" stroke-dasharray="6 3"/>' +
    '<!-- Corner Ornaments -->' +
    '<path d="M42 60 L60 42 M42 42 L70 42 M42 42 L42 70" stroke="url(#goldGrad)" stroke-width="2" fill="none"/>' +
    '<path d="M558 60 L540 42 M558 42 L530 42 M558 42 L558 70" stroke="url(#goldGrad)" stroke-width="2" fill="none"/>' +
    '<path d="M42 840 L60 858 M42 858 L70 858 M42 858 L42 830" stroke="url(#goldGrad)" stroke-width="2" fill="none"/>' +
    '<path d="M558 840 L540 858 M558 858 L530 858 M558 858 L558 830" stroke="url(#goldGrad)" stroke-width="2" fill="none"/>' +
    '<!-- Header Ribbon / Category -->' +
    '<rect x="130" y="88" width="340" height="36" rx="18" fill="rgba(0,0,0,0.45)" stroke="url(#goldGrad)" stroke-width="1.5"/>' +
    '<text x="300" y="112" fill="#f5e6be" font-family="Georgia, serif" font-size="14" font-weight="bold" text-anchor="middle" letter-spacing="3.5">' + safeCategory + '</text>' +
    '<!-- Title Vignette Banner -->' +
    '<path d="M100 170 Q300 155 500 170" stroke="url(#goldGrad)" stroke-width="1.5" fill="none"/>' +
    '<circle cx="300" cy="162" r="4" fill="#d4af37"/>' +
    '<!-- Book Title -->' +
    '<text x="300" y="240" fill="#ffffff" font-family="Georgia, \'Times New Roman\', serif" font-size="32" font-weight="bold" text-anchor="middle" filter="drop-shadow(0 2px 8px rgba(0,0,0,0.7))">' +
      titleTspans +
    '</text>' +
    '<!-- Central Illustration Emblem -->' +
    '<g transform="translate(300, 500)">' +
      '<circle cx="0" cy="0" r="85" fill="rgba(0,0,0,0.3)" stroke="url(#goldGrad)" stroke-width="2"/>' +
      '<circle cx="0" cy="0" r="76" fill="none" stroke="#d4af37" stroke-width="1" stroke-opacity="0.4" stroke-dasharray="4 4"/>' +
      '<!-- Book and Quill Heraldry -->' +
      '<path d="M-42 16 C-24 5 -8 10 0 16 C8 10 24 5 42 16 L40 -20 C22 -30 8 -26 0 -20 C-8 -26 -22 -30 -40 -20 Z" fill="rgba(212,175,55,0.25)" stroke="url(#goldGrad)" stroke-width="2.5"/>' +
      '<line x1="0" y1="-18" x2="0" y2="18" stroke="url(#goldGrad)" stroke-width="2"/>' +
      '<path d="M-12 -38 Q18 -48 34 -14 Q20 -10 -2 -22 Z" fill="url(#goldGrad)"/>' +
    '</g>' +
    '<!-- Separator Flourish -->' +
    '<path d="M160 670 Q240 680 300 670 Q360 680 440 670" stroke="url(#goldGrad)" stroke-width="1.5" fill="none"/>' +
    '<circle cx="300" cy="673" r="3.5" fill="#d4af37"/>' +
    '<!-- Author Name -->' +
    '<text x="300" y="734" fill="#f5e6be" font-family="Georgia, \'Times New Roman\', serif" font-size="24" font-weight="600" text-anchor="middle" letter-spacing="1.5">' + safeAuthor + '</text>' +
    '<!-- Bottom Publisher Seal -->' +
    '<text x="300" y="810" fill="#c4a868" font-family="Georgia, serif" font-size="12" text-anchor="middle" letter-spacing="4">ИЗДАНИЕ БИБЛИОТЕКИ</text>' +
  '</svg>';
}

let count = 0;
for (const b of ru) {
  if (b.coverImage && b.coverImage.endsWith('.svg')) {
    const fullSvg = createRichCoverSvg(b.title, b.author, b.category, b.spine || '#183c50', '#0d111a');
    fs.writeFileSync('artifacts/auth-redirect-site/public/' + b.coverImage, fullSvg, 'utf8');
    count++;
  }
}
console.log('Regenerated rich book covers for ' + count + ' Russian classic books!');


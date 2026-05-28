// characters.js — Character-Lookup und prozedurale SVG-Avatare.
// Keine externen Bilder — Avatare werden aus Index + Farbe generiert.

let CHAR_MAP = null;
let DYNAMIC_HOOK = null;

export function setCharacters(list) {
  CHAR_MAP = new Map();
  for (const c of list) CHAR_MAP.set(c.id, c);
}

// Anderer Modul (typischerweise main.js) kann eine Funktion registrieren, die
// den dynamischen Charakter-Zustand (Bio nach NPC-Arc) nachschiebt.
// Ohne Hook bleibt das Verhalten unverändert.
export function setDynamicHook(fn) {
  DYNAMIC_HOOK = typeof fn === 'function' ? fn : null;
}

export function getCharacter(id) {
  if (!CHAR_MAP) return null;
  const base = CHAR_MAP.get(id) || { id, name: id, handle: '@' + id, avatar: 0, bio: '' };
  if (!DYNAMIC_HOOK) return base;
  const overlay = DYNAMIC_HOOK(id, base);
  if (!overlay) return base;
  return { ...base, ...overlay };
}

/**
 * Generiert eine SVG-Avatar-Datenstruktur aus einem Integer.
 * Deterministisch: gleiche Zahl → gleicher Avatar.
 * Kombiniert unabhängige Merkmale (Hautton, Frisur, Brille,
 * Accessoires, Augen, Mund) zu vielfältigen Charakter-Portraits.
 */
export function avatarSvg(seed = 0) {
  // Knuth-Hash für bessere Streuung der Merkmale über den Seed.
  const h = (((seed | 0) + 1) * 2654435761) >>> 0;
  const pick = (n, mix) => Math.floor((((h ^ (mix * 2246822519)) >>> 0) / 4294967296) * n);

  const skinTones = [
    '#fde0c8', '#f7c9a4', '#eab892', '#d49e74', '#b57746',
    '#8d5a36', '#6a3f22', '#4a2c1a',
    '#a5d8ff', '#b8f2c9', '#f4b8e4'
  ];
  const hairColors = [
    '#1a1412', '#3d2418', '#6b3e22', '#a56b3a',
    '#d9a441', '#ead9a8', '#b8b8b8', '#ffffff',
    '#c83a5c', '#7a3aa5', '#3a7ac8', '#3ac8a5', '#e85a7a'
  ];
  const bgColors = [
    '#ff2e88', '#22d3ee', '#facc15', '#4ade80',
    '#a78bfa', '#fb7185', '#60a5fa', '#f97316',
    '#34d399', '#f472b6', '#e879f9', '#f43f5e'
  ];
  const shirtColors = [
    '#1f2937', '#ef4444', '#f59e0b', '#10b981',
    '#3b82f6', '#8b5cf6', '#ec4899', '#64748b',
    '#0ea5e9', '#a3e635'
  ];

  const skin   = skinTones[pick(skinTones.length, 1)];
  const hair   = hairColors[pick(hairColors.length, 2)];
  const bg     = bgColors[pick(bgColors.length, 3)];
  const shirt  = shirtColors[pick(shirtColors.length, 4)];
  const accent = bgColors[pick(bgColors.length, 11)];

  const hairStyle  = pick(10, 5);
  const eyeStyle   = pick(5, 6);
  const mouthStyle = pick(5, 7);
  const glasses    = pick(5, 8);   // 0/1 keine, 2 rund, 3 eckig, 4 Sonnenbrille
  const accessory  = pick(6, 9);   // 0 nichts, 1 Blush, 2 Ohrringe, 3 Muttermal, 4 Sommersprossen, 5 Nasenring
  const faceShape  = pick(3, 10);
  const browStyle  = pick(3, 12);

  // Hintergrund (farbiger „Portrait-Kreis")
  const bgCircle = `<circle cx="50" cy="50" r="50" fill="${bg}"/>`;

  // T-Shirt / Kragen
  const shirtSvg = `<path d="M 18 100 Q 22 84 36 82 Q 42 90 50 90 Q 58 90 64 82 Q 78 84 82 100 Z" fill="${shirt}"/>`;
  const neckSvg  = `<path d="M 44 76 Q 44 84 50 86 Q 56 84 56 76 Z" fill="${skin}"/>
    <path d="M 44 82 Q 50 86 56 82" stroke="#000" stroke-width="0.6" stroke-opacity="0.18" fill="none"/>`;

  // Kopfform
  let head;
  if (faceShape === 0) {
    head = `<ellipse cx="50" cy="52" rx="26" ry="30" fill="${skin}"/>`;
  } else if (faceShape === 1) {
    head = `<path d="M 24 46 Q 24 26 50 26 Q 76 26 76 46 Q 76 70 62 78 Q 50 84 38 78 Q 24 70 24 46 Z" fill="${skin}"/>`;
  } else {
    head = `<path d="M 26 44 Q 26 24 50 24 Q 74 24 74 44 L 74 60 Q 74 78 50 82 Q 26 78 26 60 Z" fill="${skin}"/>`;
  }
  // Kinn-Schatten für etwas Tiefe
  const shading = `<ellipse cx="50" cy="74" rx="14" ry="5" fill="#000" opacity="0.08"/>`;

  // Ohren (nur wenn Frisur sie nicht verdeckt)
  const earsVisible = ![1, 3, 4, 7].includes(hairStyle);
  const ears = earsVisible
    ? `<ellipse cx="23" cy="55" rx="3" ry="5" fill="${skin}"/>
       <ellipse cx="77" cy="55" rx="3" ry="5" fill="${skin}"/>`
    : '';

  // Frisuren / Kopfbedeckung
  let hairSvg = '';
  if (hairStyle === 0) {
    // Kurze, leicht strubbelige Frisur
    hairSvg = `<path d="M 24 48 Q 22 22 50 22 Q 78 22 76 48 Q 72 36 66 34 Q 58 28 50 30 Q 42 28 34 34 Q 28 36 24 48 Z" fill="${hair}"/>`;
  } else if (hairStyle === 1) {
    // Lange, gerade Haare (über die Ohren)
    hairSvg = `<path d="M 20 46 Q 20 22 50 22 Q 80 22 80 46 L 80 82 L 72 82 L 72 40 Q 50 30 28 40 L 28 82 L 20 82 Z" fill="${hair}"/>`;
  } else if (hairStyle === 2) {
    // Seitenscheitel
    hairSvg = `<path d="M 24 46 Q 24 22 50 22 Q 78 22 78 46 Q 70 36 54 38 Q 46 30 34 34 Q 28 38 24 46 Z" fill="${hair}"/>`;
  } else if (hairStyle === 3) {
    // Dutt / Zopf oben
    hairSvg = `<circle cx="50" cy="18" r="9" fill="${hair}"/>
      <path d="M 24 46 Q 24 24 50 24 Q 76 24 76 46 Q 68 36 50 36 Q 32 36 24 46 Z" fill="${hair}"/>`;
  } else if (hairStyle === 4) {
    // Afro / Lockenkopf
    hairSvg = `<circle cx="30" cy="36" r="11" fill="${hair}"/>
      <circle cx="42" cy="22" r="11" fill="${hair}"/>
      <circle cx="58" cy="22" r="11" fill="${hair}"/>
      <circle cx="70" cy="36" r="11" fill="${hair}"/>
      <circle cx="22" cy="50" r="9"  fill="${hair}"/>
      <circle cx="78" cy="50" r="9"  fill="${hair}"/>
      <circle cx="50" cy="18" r="10" fill="${hair}"/>`;
  } else if (hairStyle === 5) {
    // Pony (Bangs)
    hairSvg = `<path d="M 22 48 Q 22 22 50 22 Q 78 22 78 48 Q 64 38 50 44 Q 36 38 22 48 Z" fill="${hair}"/>`;
  } else if (hairStyle === 6) {
    // Mohawk / Undercut
    hairSvg = `<path d="M 42 14 L 58 14 Q 60 30 56 42 L 44 42 Q 40 30 42 14 Z" fill="${hair}"/>
      <path d="M 24 50 Q 28 46 36 46 M 64 46 Q 72 46 76 50" stroke="${hair}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  } else if (hairStyle === 7) {
    // Beanie / Mütze
    hairSvg = `<path d="M 22 46 Q 22 16 50 16 Q 78 16 78 46 L 78 50 L 22 50 Z" fill="${accent}"/>
      <rect x="22" y="48" width="56" height="5" fill="#000" opacity="0.25"/>
      <circle cx="50" cy="12" r="4" fill="${accent}"/>`;
  } else if (hairStyle === 8) {
    // Kahl / kurz rasiert
    hairSvg = `<path d="M 26 44 Q 28 30 50 30 Q 72 30 74 44" stroke="${hair}" stroke-width="1.5" fill="none" opacity="0.7"/>`;
  } else {
    // Pferdeschwanz hinter dem Kopf
    hairSvg = `<path d="M 24 46 Q 24 22 50 22 Q 76 22 76 46 Q 70 36 56 36 Q 50 28 44 36 Q 30 36 24 46 Z" fill="${hair}"/>
      <path d="M 76 42 Q 90 52 84 74 Q 80 66 76 58 Z" fill="${hair}"/>`;
  }

  // Augenbrauen
  const by = 46;
  let brows;
  if (browStyle === 0) {
    brows = `<path d="M 34 ${by} Q 40 ${by - 2} 46 ${by}" stroke="${hair}" stroke-width="2" stroke-linecap="round" fill="none"/>
      <path d="M 54 ${by} Q 60 ${by - 2} 66 ${by}" stroke="${hair}" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  } else if (browStyle === 1) {
    brows = `<path d="M 34 ${by} L 46 ${by}" stroke="${hair}" stroke-width="2" stroke-linecap="round"/>
      <path d="M 54 ${by} L 66 ${by}" stroke="${hair}" stroke-width="2" stroke-linecap="round"/>`;
  } else {
    brows = `<path d="M 34 ${by + 1} Q 40 ${by - 3} 46 ${by - 1}" stroke="${hair}" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      <path d="M 54 ${by - 1} Q 60 ${by - 3} 66 ${by + 1}" stroke="${hair}" stroke-width="2.2" stroke-linecap="round" fill="none"/>`;
  }

  // Augen
  const eyeY = 54;
  let eyes;
  if (eyeStyle === 0) {
    eyes = `<circle cx="40" cy="${eyeY}" r="2.2" fill="#1a1a1a"/>
            <circle cx="60" cy="${eyeY}" r="2.2" fill="#1a1a1a"/>`;
  } else if (eyeStyle === 1) {
    eyes = `<path d="M 36 ${eyeY} Q 40 ${eyeY - 3} 44 ${eyeY} Q 40 ${eyeY + 2} 36 ${eyeY} Z" fill="#1a1a1a"/>
            <path d="M 56 ${eyeY} Q 60 ${eyeY - 3} 64 ${eyeY} Q 60 ${eyeY + 2} 56 ${eyeY} Z" fill="#1a1a1a"/>`;
  } else if (eyeStyle === 2) {
    eyes = `<path d="M 36 ${eyeY} Q 40 ${eyeY - 3} 44 ${eyeY}" stroke="#1a1a1a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
            <path d="M 56 ${eyeY} Q 60 ${eyeY - 3} 64 ${eyeY}" stroke="#1a1a1a" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  } else if (eyeStyle === 3) {
    eyes = `<circle cx="40" cy="${eyeY}" r="3" fill="#1a1a1a"/>
            <circle cx="60" cy="${eyeY}" r="3" fill="#1a1a1a"/>
            <circle cx="41" cy="${eyeY - 1}" r="1" fill="#fff"/>
            <circle cx="61" cy="${eyeY - 1}" r="1" fill="#fff"/>`;
  } else {
    // Offene Augen mit Iris in Akzentfarbe
    eyes = `<ellipse cx="40" cy="${eyeY}" rx="3.2" ry="2.4" fill="#fff"/>
            <ellipse cx="60" cy="${eyeY}" rx="3.2" ry="2.4" fill="#fff"/>
            <circle cx="40" cy="${eyeY}" r="1.8" fill="${accent}"/>
            <circle cx="60" cy="${eyeY}" r="1.8" fill="${accent}"/>
            <circle cx="40.5" cy="${eyeY - 0.5}" r="0.6" fill="#fff"/>
            <circle cx="60.5" cy="${eyeY - 0.5}" r="0.6" fill="#fff"/>`;
  }

  // Brille / Sonnenbrille
  let glassesSvg = '';
  if (glasses === 2) {
    glassesSvg = `<circle cx="40" cy="${eyeY}" r="6" fill="none" stroke="#1a1a1a" stroke-width="1.4"/>
      <circle cx="60" cy="${eyeY}" r="6" fill="none" stroke="#1a1a1a" stroke-width="1.4"/>
      <line x1="46" y1="${eyeY}" x2="54" y2="${eyeY}" stroke="#1a1a1a" stroke-width="1.4"/>`;
  } else if (glasses === 3) {
    glassesSvg = `<rect x="33" y="${eyeY - 5}" width="14" height="10" rx="1.5" fill="none" stroke="#1a1a1a" stroke-width="1.4"/>
      <rect x="53" y="${eyeY - 5}" width="14" height="10" rx="1.5" fill="none" stroke="#1a1a1a" stroke-width="1.4"/>
      <line x1="47" y1="${eyeY}" x2="53" y2="${eyeY}" stroke="#1a1a1a" stroke-width="1.4"/>`;
  } else if (glasses === 4) {
    glassesSvg = `<rect x="32" y="${eyeY - 5}" width="16" height="10" rx="4" fill="#1a1a1a"/>
      <rect x="52" y="${eyeY - 5}" width="16" height="10" rx="4" fill="#1a1a1a"/>
      <line x1="48" y1="${eyeY}" x2="52" y2="${eyeY}" stroke="#1a1a1a" stroke-width="1.4"/>
      <rect x="35" y="${eyeY - 4}" width="4" height="3" rx="1" fill="#fff" opacity="0.35"/>
      <rect x="55" y="${eyeY - 4}" width="4" height="3" rx="1" fill="#fff" opacity="0.35"/>`;
  }

  // Nase (dezent)
  const nose = `<path d="M 50 56 Q 48 62 50 64 Q 52 62 50 56" fill="#000" opacity="0.08"/>`;

  // Mund
  const my = 70;
  let mouth;
  if (mouthStyle === 0) {
    mouth = `<path d="M 44 ${my} Q 50 ${my + 4} 56 ${my}" stroke="#4a2518" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  } else if (mouthStyle === 1) {
    mouth = `<path d="M 42 ${my - 1} Q 50 ${my + 6} 58 ${my - 1} Q 50 ${my + 2} 42 ${my - 1} Z" fill="#c83a5c"/>
      <path d="M 42 ${my - 1} Q 50 ${my + 2} 58 ${my - 1}" stroke="#fff" stroke-width="0.8" fill="none" opacity="0.5"/>`;
  } else if (mouthStyle === 2) {
    mouth = `<line x1="46" y1="${my + 1}" x2="54" y2="${my + 1}" stroke="#4a2518" stroke-width="1.6" stroke-linecap="round"/>`;
  } else if (mouthStyle === 3) {
    mouth = `<path d="M 43 ${my - 1} Q 50 ${my + 7} 57 ${my - 1} Z" fill="#4a2518"/>
      <path d="M 45 ${my + 1} Q 50 ${my + 3} 55 ${my + 1}" stroke="#fff" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  } else {
    mouth = `<path d="M 44 ${my + 1} Q 48 ${my - 1} 52 ${my + 1} Q 56 ${my - 1} 58 ${my + 1}" stroke="#4a2518" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  }

  // Accessoires
  let acc = '';
  if (accessory === 1) {
    acc = `<ellipse cx="34" cy="66" rx="3" ry="2" fill="#ff7aa2" opacity="0.4"/>
      <ellipse cx="66" cy="66" rx="3" ry="2" fill="#ff7aa2" opacity="0.4"/>`;
  } else if (accessory === 2 && earsVisible) {
    acc = `<circle cx="23" cy="62" r="2" fill="${accent}"/>
      <circle cx="77" cy="62" r="2" fill="${accent}"/>`;
  } else if (accessory === 3) {
    acc = `<circle cx="42" cy="66" r="1" fill="#4a2518"/>`;
  } else if (accessory === 4) {
    acc = `<circle cx="38" cy="60" r="0.8" fill="#8d5a36" opacity="0.7"/>
      <circle cx="44" cy="62" r="0.8" fill="#8d5a36" opacity="0.7"/>
      <circle cx="56" cy="62" r="0.8" fill="#8d5a36" opacity="0.7"/>
      <circle cx="62" cy="60" r="0.8" fill="#8d5a36" opacity="0.7"/>`;
  } else if (accessory === 5) {
    acc = `<circle cx="46" cy="64" r="1.1" fill="none" stroke="#d9a441" stroke-width="0.8"/>`;
  }

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${bgCircle}
    ${shirtSvg}
    ${neckSvg}
    ${ears}
    ${head}
    ${shading}
    ${hairSvg}
    ${brows}
    ${eyes}
    ${glassesSvg}
    ${nose}
    ${mouth}
    ${acc}
  </svg>`;
}

/**
 * Erzeugt ein kontextbezogenes SVG-Motiv als Post-Bild.
 * Erkennt Stichwörter im Text und wählt ein passendes Motiv
 * (Kaffee, Gaming-Controller, Mond, Roboter, Wahlurne, Auge, …).
 * Deterministisch basierend auf Post-ID.
 */
export function memeSvg(postId, tags = [], text = '') {
  const colorMap = {
    'politik-rechts': ['#3a1518','#f97316','#fde68a'],
    'politik-links':  ['#0c2855','#60a5fa','#dbeafe'],
    'politik-mitte':  ['#1a2233','#94a3b8','#e2e8f0'],
    'klima':          ['#093821','#4ade80','#dcfce7'],
    'gaming':         ['#1b1736','#a78bfa','#ede9fe'],
    'wissenschaft':   ['#0b2530','#22d3ee','#ccfbf1'],
    'verschwoerung':  ['#2a1133','#fbbf24','#fef3c7'],
    'feminismus':     ['#2a0b3c','#ec4899','#fce7f3'],
    'humor':          ['#2b2a0a','#fde68a','#fef9c3'],
    'lifestyle':      ['#1c1a2e','#ff2e88','#fce7f3'],
    'musik':          ['#142b26','#2dd4bf','#ccfbf1'],
    'sport':          ['#1a2a10','#84cc16','#ecfccb'],
    'hass':           ['#3a0b0d','#f87171','#fee2e2'],
    'anti-feminismus':['#1e1333','#fb7185','#ffe4e6'],
    'true-crime':     ['#101010','#9ca3af','#e5e7eb']
  };
  const [bg, fg, tone] = colorMap[tags[0]] || ['#1a1d29','#ff2e88','#e8ebf3'];
  const motif = detectMotif((text || '').toLowerCase(), tags);
  const seed = [...postId].reduce((a, c) => a + c.charCodeAt(0), 0);
  const scene = renderMotif(motif, bg, fg, tone, seed);

  return `<svg viewBox="0 0 200 125" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="200" height="125" fill="${bg}" />
    ${scene}
  </svg>`;
}

function detectMotif(t, tags) {
  if (/kaffee|filterkaffee|café|latte|kakao|tee /.test(t)) return 'coffee';
  if (/roboter|null-pointer|projektroboter|robot/.test(t)) return 'robot';
  if (/radweg|fahrrad|kreisverkehr/.test(t)) return 'bike';
  if (/mond|wolken|regen|sturm|fähren/.test(t)) return 'weather';
  if (/playlist|album|track|song |dj |karaoke|studio|set im |jazz|punk|gig/.test(t)) return 'music';
  if (/buch|autor|rezension|buchhandlung|thriller|dystopie|roman/.test(t)) return 'book';
  if (/deepfake|faktencheck|manipuliert|desinformation|bildersuche/.test(t)) return 'deepfake';
  if (/wahl|wahlergebnis|kandidat|stimme|ankreuzen|kumulieren/.test(t)) return 'ballot';
  if (/demo|protest|bürgerversammlung|fleetplatz|kundgebung|marktplatz/.test(t)) return 'protest';
  if (/gilde|patch|emote|queue|skin|ranked|platin|turnier/.test(t)) return 'gaming';
  if (/studie|universität|uni |korrelation|kausalität|physik|forschung|streuung/.test(t)) return 'science';
  if (/mainstream|zensur|verschwör|gelder|akten|umverteilung|recherche/.test(t)) return 'eye';
  if (/klimakrise|kohleausstieg|klimaziele/.test(t)) return 'earth';
  if (/timeline|scrollen|scrolle|followtrain|follower|algorithm/.test(t)) return 'phone';
  if (/shitstorm|viral|40k|tausend follower/.test(t)) return 'fire';
  if (/fußball|sonntag|altstadtturnier/.test(t)) return 'sport';
  if (/jahresrückblick|wrapped|funkel/.test(t)) return 'sparkle';
  if (/equal pay|zahlen sind|gehalt|statistik/.test(t)) return 'chart';
  if (/hass|angepöbelt|diskriminier|chatgruppe/.test(t)) return 'shield';
  if (/debatte|argument|fernsehen|diskutier/.test(t)) return 'speech';
  if (/zeitung|redaktion|kolumne/.test(t)) return 'news';

  if (tags.includes('gaming'))       return 'gaming';
  if (tags.includes('musik'))        return 'music';
  if (tags.includes('klima'))        return 'earth';
  if (tags.includes('verschwoerung'))return 'eye';
  if (tags.includes('wissenschaft')) return 'science';
  if (tags.includes('feminismus') || tags.includes('anti-feminismus')) return 'protest';
  if (tags.includes('politik-rechts') || tags.includes('politik-links') || tags.includes('politik-mitte')) return 'ballot';
  if (tags.includes('true-crime'))   return 'news';
  if (tags.includes('humor'))        return 'speech';
  if (tags.includes('lifestyle'))    return 'phone';
  return 'default';
}

function renderMotif(m, bg, fg, tone, seed) {
  switch (m) {
    case 'coffee':
      return `<path d="M 60 50 h 60 v 32 q 0 14 -14 14 h -32 q -14 0 -14 -14 z" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <path d="M 120 58 q 14 0 14 11 q 0 11 -14 11" fill="none" stroke="${fg}" stroke-width="2"/>
        <ellipse cx="90" cy="100" rx="46" ry="4" fill="${fg}" opacity="0.35"/>
        <path d="M 75 40 q 0 -8 -4 -12 M 90 40 q 0 -8 4 -12 M 105 40 q 0 -8 -4 -12" stroke="${fg}" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>
        <circle cx="170" cy="35" r="14" fill="${fg}" opacity="0.25"/>`;
    case 'robot':
      return `<rect x="70" y="40" width="60" height="50" rx="8" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <circle cx="85" cy="58" r="5" fill="${fg}"/>
        <circle cx="115" cy="58" r="5" fill="${fg}"/>
        <rect x="87" y="73" width="26" height="4" rx="2" fill="${fg}"/>
        <line x1="100" y1="30" x2="100" y2="40" stroke="${fg}" stroke-width="2"/>
        <circle cx="100" cy="27" r="3" fill="${fg}"/>
        <rect x="55" y="52" width="15" height="6" rx="2" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <rect x="130" y="52" width="15" height="6" rx="2" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <rect x="82" y="93" width="10" height="12" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <rect x="108" y="93" width="10" height="12" fill="${tone}" stroke="${fg}" stroke-width="2"/>`;
    case 'bike':
      return `<circle cx="60" cy="85" r="20" fill="none" stroke="${fg}" stroke-width="3"/>
        <circle cx="140" cy="85" r="20" fill="none" stroke="${fg}" stroke-width="3"/>
        <circle cx="60" cy="85" r="3" fill="${fg}"/>
        <circle cx="140" cy="85" r="3" fill="${fg}"/>
        <line x1="60" y1="85" x2="100" y2="55" stroke="${fg}" stroke-width="3"/>
        <line x1="100" y1="55" x2="140" y2="85" stroke="${fg}" stroke-width="3"/>
        <line x1="100" y1="55" x2="85" y2="85" stroke="${fg}" stroke-width="3"/>
        <line x1="90" y1="48" x2="108" y2="48" stroke="${fg}" stroke-width="3" stroke-linecap="round"/>
        <line x1="140" y1="85" x2="128" y2="50" stroke="${fg}" stroke-width="3"/>
        <line x1="124" y1="48" x2="138" y2="48" stroke="${fg}" stroke-width="3" stroke-linecap="round"/>`;
    case 'weather':
      return `<ellipse cx="80" cy="45" rx="30" ry="14" fill="${tone}" opacity="0.9"/>
        <ellipse cx="110" cy="48" rx="24" ry="12" fill="${tone}" opacity="0.8"/>
        <ellipse cx="95" cy="40" rx="26" ry="13" fill="${tone}"/>
        <line x1="75" y1="62" x2="68" y2="82" stroke="${fg}" stroke-width="2" stroke-linecap="round"/>
        <line x1="92" y1="62" x2="85" y2="88" stroke="${fg}" stroke-width="2" stroke-linecap="round"/>
        <line x1="108" y1="62" x2="101" y2="82" stroke="${fg}" stroke-width="2" stroke-linecap="round"/>
        <line x1="124" y1="62" x2="117" y2="88" stroke="${fg}" stroke-width="2" stroke-linecap="round"/>
        <line x1="140" y1="62" x2="133" y2="80" stroke="${fg}" stroke-width="2" stroke-linecap="round"/>`;
    case 'music':
      return `<circle cx="65" cy="82" r="8" fill="${fg}"/>
        <circle cx="125" cy="72" r="8" fill="${fg}"/>
        <line x1="72" y1="82" x2="72" y2="28" stroke="${fg}" stroke-width="3"/>
        <line x1="132" y1="72" x2="132" y2="18" stroke="${fg}" stroke-width="3"/>
        <path d="M 72 28 Q 102 18 132 18 L 132 28 Q 102 28 72 38 Z" fill="${fg}"/>
        <path d="M 25 75 l 6 -10 l 6 10 l 6 -18 l 6 18 l 6 -8" stroke="${tone}" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M 150 88 l 6 -10 l 6 10 l 6 -18 l 6 18" stroke="${tone}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    case 'book':
      return `<path d="M 100 40 Q 72 34 50 40 L 50 96 Q 72 90 100 96 Q 128 90 150 96 L 150 40 Q 128 34 100 40 Z" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <line x1="100" y1="40" x2="100" y2="96" stroke="${fg}" stroke-width="2"/>
        <line x1="60" y1="54" x2="90" y2="54" stroke="${fg}" stroke-width="1" opacity="0.6"/>
        <line x1="60" y1="62" x2="90" y2="62" stroke="${fg}" stroke-width="1" opacity="0.6"/>
        <line x1="60" y1="70" x2="85" y2="70" stroke="${fg}" stroke-width="1" opacity="0.6"/>
        <line x1="60" y1="78" x2="88" y2="78" stroke="${fg}" stroke-width="1" opacity="0.6"/>
        <line x1="110" y1="54" x2="140" y2="54" stroke="${fg}" stroke-width="1" opacity="0.6"/>
        <line x1="110" y1="62" x2="140" y2="62" stroke="${fg}" stroke-width="1" opacity="0.6"/>
        <line x1="110" y1="70" x2="135" y2="70" stroke="${fg}" stroke-width="1" opacity="0.6"/>
        <line x1="110" y1="78" x2="138" y2="78" stroke="${fg}" stroke-width="1" opacity="0.6"/>`;
    case 'deepfake':
      return `<rect x="55" y="28" width="90" height="72" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <circle cx="100" cy="60" r="18" fill="${fg}" opacity="0.6"/>
        <path d="M 74 88 q 26 -14 52 0" fill="none" stroke="${fg}" stroke-width="2"/>
        <text x="64" y="24" font-family="sans-serif" font-weight="900" font-size="10" fill="${fg}">&#9888; LIVE</text>
        <line x1="55" y1="50" x2="145" y2="52" stroke="${bg}" stroke-width="1" opacity="0.55"/>
        <line x1="55" y1="68" x2="145" y2="66" stroke="${bg}" stroke-width="1" opacity="0.55"/>
        <line x1="55" y1="82" x2="145" y2="84" stroke="${bg}" stroke-width="1" opacity="0.55"/>
        <path d="M 100 54 l -4 4 l 4 4 l 4 -4 z" fill="${bg}"/>`;
    case 'ballot':
      return `<rect x="55" y="45" width="90" height="58" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <path d="M 55 55 L 145 55" stroke="${fg}" stroke-width="1.5"/>
        <rect x="88" y="28" width="24" height="22" fill="${fg}"/>
        <line x1="100" y1="32" x2="100" y2="50" stroke="${bg}" stroke-width="2"/>
        <line x1="70" y1="70" x2="118" y2="70" stroke="${fg}" stroke-width="1"/>
        <line x1="70" y1="80" x2="118" y2="80" stroke="${fg}" stroke-width="1"/>
        <line x1="70" y1="90" x2="118" y2="90" stroke="${fg}" stroke-width="1"/>
        <path d="M 122 68 l 5 5 l 11 -15" stroke="${fg}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 'protest':
      return `<rect x="28" y="30" width="48" height="34" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <line x1="50" y1="64" x2="50" y2="108" stroke="${fg}" stroke-width="3"/>
        <rect x="92" y="20" width="62" height="30" fill="${fg}" stroke="${tone}" stroke-width="2"/>
        <line x1="118" y1="50" x2="118" y2="108" stroke="${fg}" stroke-width="3"/>
        <text x="52" y="52" font-family="sans-serif" font-weight="900" font-size="13" fill="${bg}" text-anchor="middle">JETZT</text>
        <text x="122" y="40" font-family="sans-serif" font-weight="900" font-size="11" fill="${bg}" text-anchor="middle">GENUG</text>
        <path d="M 160 88 l 4 -6 l 4 6 l 4 -6 l 4 6" stroke="${tone}" stroke-width="2" fill="none"/>`;
    case 'gaming':
      return `<rect x="38" y="48" width="124" height="52" rx="20" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <circle cx="62" cy="74" r="12" fill="${fg}" opacity="0.18"/>
        <line x1="56" y1="74" x2="68" y2="74" stroke="${fg}" stroke-width="3" stroke-linecap="round"/>
        <line x1="62" y1="68" x2="62" y2="80" stroke="${fg}" stroke-width="3" stroke-linecap="round"/>
        <circle cx="134" cy="68" r="4" fill="${fg}"/>
        <circle cx="146" cy="74" r="4" fill="${fg}"/>
        <circle cx="134" cy="80" r="4" fill="${fg}"/>
        <circle cx="122" cy="74" r="4" fill="${fg}"/>
        <path d="M 40 55 l -8 -8 M 160 55 l 8 -8" stroke="${fg}" stroke-width="2"/>`;
    case 'science':
      return `<circle cx="100" cy="62" r="10" fill="${fg}"/>
        <ellipse cx="100" cy="62" rx="46" ry="16" fill="none" stroke="${fg}" stroke-width="2"/>
        <ellipse cx="100" cy="62" rx="46" ry="16" fill="none" stroke="${tone}" stroke-width="2" transform="rotate(60 100 62)"/>
        <ellipse cx="100" cy="62" rx="46" ry="16" fill="none" stroke="${tone}" stroke-width="2" transform="rotate(120 100 62)"/>
        <circle cx="146" cy="62" r="3" fill="${tone}"/>
        <circle cx="77" cy="86" r="3" fill="${tone}"/>
        <circle cx="77" cy="38" r="3" fill="${tone}"/>`;
    case 'earth':
      return `<circle cx="100" cy="62" r="38" fill="${tone}"/>
        <path d="M 72 55 q 8 -6 16 0 q 6 8 -3 13 q -10 3 -13 -6 z" fill="${fg}" opacity="0.65"/>
        <path d="M 104 72 q 13 -4 22 3 q 4 10 -8 13 q -16 0 -14 -9 z" fill="${fg}" opacity="0.65"/>
        <path d="M 95 40 q 6 -3 11 1" fill="none" stroke="${fg}" stroke-width="2"/>
        <circle cx="100" cy="62" r="38" fill="none" stroke="${fg}" stroke-width="2"/>
        <path d="M 150 25 q 5 5 0 10 M 155 25 q -5 5 0 10" stroke="${tone}" stroke-width="2" fill="none" opacity="0.6"/>`;
    case 'eye':
      return `<path d="M 45 62 Q 100 28 155 62 Q 100 98 45 62 Z" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <circle cx="100" cy="62" r="19" fill="${fg}"/>
        <circle cx="100" cy="62" r="9" fill="${bg}"/>
        <circle cx="96" cy="58" r="3" fill="${tone}"/>
        <path d="M 35 80 l 10 -10 M 165 80 l -10 -10 M 35 44 l 10 10 M 165 44 l -10 10" stroke="${fg}" stroke-width="2"/>
        <path d="M 30 30 L 40 35 M 170 30 L 160 35 M 30 95 L 40 90 M 170 95 L 160 90" stroke="${tone}" stroke-width="1" opacity="0.5"/>`;
    case 'phone':
      return `<rect x="75" y="18" width="50" height="92" rx="9" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <rect x="82" y="30" width="36" height="66" fill="${bg}"/>
        <line x1="85" y1="42" x2="115" y2="42" stroke="${fg}" stroke-width="2"/>
        <line x1="85" y1="52" x2="110" y2="52" stroke="${fg}" stroke-width="1" opacity="0.6"/>
        <line x1="85" y1="60" x2="114" y2="60" stroke="${fg}" stroke-width="1" opacity="0.6"/>
        <line x1="85" y1="72" x2="115" y2="72" stroke="${fg}" stroke-width="2"/>
        <line x1="85" y1="82" x2="108" y2="82" stroke="${fg}" stroke-width="1" opacity="0.6"/>
        <line x1="85" y1="90" x2="113" y2="90" stroke="${fg}" stroke-width="1" opacity="0.6"/>
        <circle cx="100" cy="104" r="2" fill="${fg}"/>
        <path d="M 40 40 q 10 -5 20 0 M 40 48 q 15 -5 25 0" stroke="${fg}" stroke-width="1" fill="none" opacity="0.4"/>
        <path d="M 140 80 q 10 -5 20 0 M 140 88 q 15 -5 25 0" stroke="${fg}" stroke-width="1" fill="none" opacity="0.4"/>`;
    case 'fire':
      return `<path d="M 100 18 Q 88 42 82 58 Q 72 52 76 72 Q 62 68 68 88 Q 74 108 100 108 Q 126 108 132 88 Q 138 68 124 72 Q 128 52 118 58 Q 112 42 100 18 Z" fill="${fg}"/>
        <path d="M 100 44 Q 94 60 90 72 Q 84 68 87 80 Q 84 92 100 94 Q 116 92 113 80 Q 116 68 110 72 Q 106 60 100 44 Z" fill="${tone}" opacity="0.8"/>
        <circle cx="100" cy="85" r="5" fill="${bg}" opacity="0.6"/>`;
    case 'sport':
      return `<circle cx="100" cy="62" r="32" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <polygon points="100,40 114,52 109,68 91,68 86,52" fill="${fg}"/>
        <line x1="100" y1="40" x2="100" y2="30" stroke="${fg}" stroke-width="2"/>
        <line x1="86" y1="52" x2="72" y2="48" stroke="${fg}" stroke-width="2"/>
        <line x1="114" y1="52" x2="128" y2="48" stroke="${fg}" stroke-width="2"/>
        <line x1="91" y1="68" x2="83" y2="88" stroke="${fg}" stroke-width="2"/>
        <line x1="109" y1="68" x2="117" y2="88" stroke="${fg}" stroke-width="2"/>`;
    case 'sparkle':
      return `<path d="M 60 38 l 6 14 l 14 6 l -14 6 l -6 14 l -6 -14 l -14 -6 l 14 -6 z" fill="${fg}"/>
        <path d="M 140 68 l 8 18 l 18 8 l -18 8 l -8 18 l -8 -18 l -18 -8 l 18 -8 z" fill="${tone}"/>
        <path d="M 112 22 l 4 8 l 8 4 l -8 4 l -4 8 l -4 -8 l -8 -4 l 8 -4 z" fill="${tone}"/>
        <circle cx="30" cy="90" r="3" fill="${tone}"/>
        <circle cx="180" cy="30" r="2" fill="${fg}"/>`;
    case 'chart':
      return `<line x1="40" y1="100" x2="168" y2="100" stroke="${fg}" stroke-width="2"/>
        <line x1="40" y1="28" x2="40" y2="100" stroke="${fg}" stroke-width="2"/>
        <rect x="55" y="66" width="18" height="34" fill="${fg}" opacity="0.55"/>
        <rect x="80" y="48" width="18" height="52" fill="${fg}"/>
        <rect x="105" y="72" width="18" height="28" fill="${tone}" opacity="0.55"/>
        <rect x="130" y="58" width="18" height="42" fill="${tone}"/>
        <path d="M 55 74 L 80 54 L 105 78 L 130 62 L 148 64" stroke="${tone}" stroke-width="2" fill="none"/>`;
    case 'shield':
      return `<path d="M 100 20 L 58 36 L 58 68 Q 58 96 100 110 Q 142 96 142 68 L 142 36 Z" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <path d="M 84 62 l 10 12 l 24 -28" stroke="${fg}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    case 'speech':
      return `<path d="M 32 32 L 108 32 Q 124 32 124 48 L 124 68 Q 124 84 108 84 L 62 84 L 42 98 L 48 84 L 32 84 Q 22 84 22 70 L 22 48 Q 22 32 32 32 Z" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <circle cx="52" cy="58" r="3" fill="${fg}"/>
        <circle cx="72" cy="58" r="3" fill="${fg}"/>
        <circle cx="92" cy="58" r="3" fill="${fg}"/>
        <path d="M 138 44 L 178 44 Q 186 44 186 52 L 186 72 Q 186 80 178 80 L 160 80 L 144 92 L 150 80 L 138 80 Q 130 80 130 72 L 130 52 Q 130 44 138 44 Z" fill="${fg}" stroke="${tone}" stroke-width="2"/>`;
    case 'news':
      return `<rect x="40" y="30" width="120" height="70" fill="${tone}" stroke="${fg}" stroke-width="2"/>
        <rect x="48" y="38" width="104" height="14" fill="${fg}"/>
        <line x1="48" y1="60" x2="100" y2="60" stroke="${fg}" stroke-width="1"/>
        <line x1="48" y1="66" x2="96" y2="66" stroke="${fg}" stroke-width="1"/>
        <line x1="48" y1="72" x2="100" y2="72" stroke="${fg}" stroke-width="1"/>
        <line x1="48" y1="78" x2="92" y2="78" stroke="${fg}" stroke-width="1"/>
        <line x1="48" y1="84" x2="98" y2="84" stroke="${fg}" stroke-width="1"/>
        <rect x="108" y="60" width="44" height="32" fill="${fg}" opacity="0.3"/>
        <circle cx="130" cy="76" r="8" fill="${fg}"/>`;
    default: {
      const sx = (seed * 7) % 60;
      const sy = (seed * 3) % 40;
      return `<circle cx="${40+sx}" cy="${40+sy/2}" r="30" fill="${fg}" opacity="0.45"/>
        <circle cx="${150-sx/2}" cy="${80-sy/3}" r="22" fill="${tone}" opacity="0.55"/>
        <rect x="30" y="${70+sy/10}" width="140" height="3" fill="${tone}" opacity="0.4"/>
        <path d="M 40 ${90+sy/20} q 40 -15 120 0" stroke="${fg}" stroke-width="2" fill="none" opacity="0.5"/>`;
    }
  }
}

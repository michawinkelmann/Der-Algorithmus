// Auto-generated bundle. Regenerate with: python tools/make_bundle.py
(function(){
var __M = {};

// ===== state.js =====
(function(){
// state.js — Zentraler Gamestate mit localStorage-Persistenz.
// Ein einziger Key: algo_save_v1

const SAVE_KEY = 'algo_save_v1';

const INITIAL_PROFILE = {
  interests: {
    gaming: 0, 'politik-links': 0, 'politik-rechts': 0, 'politik-mitte': 0,
    lifestyle: 0, wissenschaft: 0, verschwoerung: 0, humor: 0,
    hass: 0, feminismus: 0, 'anti-feminismus': 0, musik: 0,
    sport: 0, klima: 0, 'true-crime': 0
  },
  political_lean_estimated: 0,   // -1..+1
  outrage_tolerance: 0.2,         // 0..1
  followed: [],
  muted: [],
  weekly_screentime: 0,
  hiddenTopics: []
};

const INITIAL_WEIGHTS = {
  affinity: 1.0,
  engagement: 0.9,
  recency: 0.3,
  social: 0.6,
  ads: 0.4,
  diversity: 0.08,   // niedrig = Filterblase
  quality: 0.1,
  outragePenalty: 0.0,
  balance: 0.0
};

function freshSave() {
  const now = Date.now();
  return {
    meta: { version: 1, createdAt: now, lastSavedAt: now, day: 1 },
    character: { name: 'Alex', pronoun: 'sie/ihr', avatar: 0, interests_initial: [], city: 'Greifshafen' },
    currentWeek: 0,
    weekFeedIndex: 0,
    history: [],
    userProfile: structuredClone(INITIAL_PROFILE),
    weights: structuredClone(INITIAL_WEIGHTS),
    unlockedMechanics: [],
    seenPosts: [],
    actionsThisWeek: [],
    ownPosts: [],
    reflections: { halftime: null, mid: null, final: null, manifest: null },
    guildMemberships: [],
    guildReactions: {},
    electionVote: null,
    electionData: null,
    shitstormHistory: [],
    badges: [],
    sandboxRules: null,
    contentWarningsAccepted: {},
    random_seed: Math.floor(Math.random() * 1e9)
  };
}

const Store = {
  data: null,

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        this.data = JSON.parse(raw);
        this._migrate();
        return true;
      }
    } catch (e) {
      console.warn('Save konnte nicht gelesen werden', e);
    }
    return false;
  },

  _migrate() {
    // Defensiv: fehlende Keys ergänzen, falls Save alt ist.
    const base = freshSave();
    for (const k of Object.keys(base)) {
      if (!(k in this.data)) this.data[k] = base[k];
    }
    for (const k of Object.keys(base.userProfile.interests)) {
      if (!(k in this.data.userProfile.interests)) {
        this.data.userProfile.interests[k] = 0;
      }
    }
    for (const k of Object.keys(base.weights)) {
      if (!(k in this.data.weights)) this.data.weights[k] = base.weights[k];
    }
  },

  hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
  },

  start(character) {
    this.data = freshSave();
    this.data.character = { ...this.data.character, ...character };
    // Startinteressen ins Profil einspeisen
    for (const tag of character.interests_initial || []) {
      this.data.userProfile.interests[tag] = 0.4;
    }
    this.save();
  },

  save() {
    try {
      this.data.meta.lastSavedAt = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Speichern fehlgeschlagen (Privat-Modus?)', e);
    }
  },

  reset() {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    this.data = null;
  },

  exportJson() {
    return JSON.stringify(this.data, null, 2);
  },

  // ---- Profile-Updates ----
  recordAction(postId, type, post) {
    // Gewichtung der Interaktionstypen (didaktisch: Empörung boostet Thema trotzdem)
    const weight = {
      like: 3,
      comment: 5,
      angry_comment: 5,     // boostet gleich wie neutral — das ist der Witz
      share: 8,
      dwell: 1,
      profile_click: 2,
      skip: -0.2,
      mute: -4,
      follow: 6,
      tw_view: 2,
      tw_skip: -1
    }[type] || 1;

    const p = this.data.userProfile;
    const step = weight * 0.05;

    for (const tag of post.tags || []) {
      if (!(tag in p.interests)) p.interests[tag] = 0;
      p.interests[tag] = clamp(p.interests[tag] + step, 0, 1);
    }
    // Political lean driften lassen
    if (post.political_lean !== undefined && weight > 0) {
      p.political_lean_estimated = clamp(
        p.political_lean_estimated + post.political_lean * step * 0.6,
        -1, 1
      );
    }
    // Outrage-Toleranz
    if (post.outrage_score !== undefined && weight > 0) {
      p.outrage_tolerance = clamp(p.outrage_tolerance + post.outrage_score * step * 0.3, 0, 1);
    }

    this.data.actionsThisWeek.push({ postId, type, week: this.data.currentWeek, ts: Date.now() });
    this.data.seenPosts.push(postId);
    this.save();
  },

  endWeek(feedSeen) {
    const snap = structuredClone(this.data.userProfile);
    this.data.history.push({
      week: this.data.currentWeek,
      actions: this.data.actionsThisWeek.slice(),
      feedSeen: feedSeen.slice(),
      profileSnapshot: snap
    });
    this.data.actionsThisWeek = [];
    this.data.weekFeedIndex = 0;
    this.data.currentWeek += 1;
    this.save();
  },

  unlock(name) {
    if (!this.data.unlockedMechanics.includes(name)) {
      this.data.unlockedMechanics.push(name);
      this.save();
      return true;
    }
    return false;
  },

  isUnlocked(name) {
    return this.data.unlockedMechanics.includes(name);
  },

  addBadge(title, desc) {
    if (!this.data.badges.some(b => b.title === title)) {
      this.data.badges.push({ title, desc, week: this.data.currentWeek });
      this.save();
      return true;
    }
    return false;
  },

  follow(charId) {
    if (!this.data.userProfile.followed.includes(charId)) {
      this.data.userProfile.followed.push(charId);
      this.save();
    }
  },

  unfollow(charId) {
    this.data.userProfile.followed = this.data.userProfile.followed.filter(x => x !== charId);
    this.save();
  },

  mute(charId) {
    if (!this.data.userProfile.muted.includes(charId)) {
      this.data.userProfile.muted.push(charId);
      this.save();
    }
  },

  addOwnPost(post) {
    this.data.ownPosts.push({ ...post, week: this.data.currentWeek, ts: Date.now() });
    this.save();
  },

  getDay() {
    // Tag leitet sich aus currentWeek ab (didaktisch)
    const w = this.data.currentWeek;
    if (w < 9) return 1;
    if (w < 19) return 2;
    return 3;
  }
};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// Deterministischer Seed für reproduzierbare Feeds (pro Woche)
function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

  __M.Store = Store;
  __M.clamp = clamp;
  __M.seededRandom = seededRandom;
})();

// ===== algorithm.js =====
(function(){
  var clamp = __M.clamp;
// algorithm.js — Die Empfehlungs-Engine.
// Didaktisches Herz: nachvollziehbar, manipulierbar, ausstellbar.

/**
 * Affinity: Übereinstimmung Post-Tags vs. User-Interessen.
 * @returns {number} 0..1
 */
function affinity(post, profile) {
  const tags = post.tags || [];
  if (!tags.length) return 0.1;
  let sum = 0;
  for (const t of tags) sum += profile.interests[t] || 0;
  return clamp(sum / tags.length, 0, 1);
}

/**
 * Engagement-Boost: empörungslastige / engagement-bait Posts werden belohnt.
 * Das ist genau der Effekt, den wir zeigen wollen.
 */
function engagementBoost(post) {
  const bait = post.engagement_bait_score || 0;
  const outrage = post.outrage_score || 0;
  return clamp(0.5 * bait + 0.7 * outrage, 0, 1.5);
}

/**
 * Recency: jüngere Posts höher gewichten (simuliert, Post-Index).
 * post.weekOffset = wie viele Wochen alt (0 = aktuell).
 */
function recency(post) {
  const age = post.weekOffset || 0;
  return Math.exp(-age * 0.5);
}

/**
 * Social-Boost: Post stammt von einem gefolgten Account.
 */
function followedAuthorBoost(post, profile) {
  return profile.followed.includes(post.author) ? 1 : 0;
}

/**
 * Paid-Boost: bezahlte Anzeigen, die nach Ziel-Profil gematcht sind.
 */
function paidBoost(post, profile) {
  if (!post.isAd) return 0;
  if (!post.targetTags || !post.targetTags.length) return 0.3;
  let match = 0;
  for (const t of post.targetTags) match += profile.interests[t] || 0;
  return clamp(0.3 + (match / post.targetTags.length) * 1.2, 0, 2);
}

/**
 * Diversity-Strafe: hat der Nutzer diese Art Content in dieser Woche bereits mehrfach gesehen?
 * Niedrige Diversity = Filterblase.
 */
function diversityPenalty(post, recentTags) {
  const tags = post.tags || [];
  let overlap = 0;
  for (const t of tags) if (recentTags[t]) overlap += recentTags[t];
  return clamp(overlap * 0.3, 0, 3);
}

/**
 * Qualitäts-Bonus (in Sandbox aktivierbar).
 */
function qualityBonus(post) {
  return post.quality_score || 0.5;
}

/**
 * Balance: belohnt Posts, deren political_lean entgegengesetzt zur geschätzten Neigung des Nutzers ist.
 */
function balanceBonus(post, profile) {
  if (post.political_lean === undefined || post.political_lean === null) return 0;
  const diff = Math.abs(post.political_lean - profile.political_lean_estimated);
  return clamp(diff * 0.5, 0, 1);
}

/**
 * Zentrale Score-Funktion.
 * @returns {{total: number, parts: Object}}
 */
function scorePost(post, profile, weights, recentTags = {}) {
  const parts = {
    affinity: affinity(post, profile) * weights.affinity,
    engagement: engagementBoost(post) * weights.engagement,
    recency: recency(post) * weights.recency,
    social: followedAuthorBoost(post, profile) * weights.social,
    ads: paidBoost(post, profile) * weights.ads,
    diversity: -diversityPenalty(post, recentTags) * weights.diversity,
    quality: qualityBonus(post) * weights.quality,
    outrage: -(post.outrage_score || 0) * (weights.outragePenalty || 0),
    balance: balanceBonus(post, profile) * (weights.balance || 0)
  };
  let total = 0;
  for (const k of Object.keys(parts)) total += parts[k];
  return { total, parts };
}

/**
 * Feed für eine Woche zusammenstellen.
 * @param {Array} posts - Pool aller Posts
 * @param {Array} ads - Pool aller Ads
 * @param {Object} profile - User-Profil
 * @param {Object} weights - Gewichte
 * @param {Object} opts - { limit, unlocked, seed, muted }
 */
function buildFeed(posts, ads, profile, weights, opts = {}) {
  const {
    limit = 10,
    unlocked = [],
    weekOffset = 0,
    muted = []
  } = opts;

  // Ads nur, wenn freigeschaltet
  const adsEnabled = unlocked.includes('ads');
  const pool = [...posts];
  if (adsEnabled) {
    for (const a of ads) pool.push({ ...a, isAd: true });
  }

  // Muted-Autoren rausfiltern
  const filtered = pool.filter(p => !muted.includes(p.author));

  const recentTags = {};
  const chosen = [];
  const indices = filtered.map((_, i) => i);

  // Iterativ den Top-Post ziehen, Tags notieren, Diversity-Penalty wächst.
  for (let i = 0; i < Math.min(limit, filtered.length); i++) {
    let bestIdx = -1;
    let bestScore = -Infinity;
    let bestBreakdown = null;

    for (const idx of indices) {
      if (chosen.includes(idx)) continue;
      const p = filtered[idx];
      const pWithOffset = { ...p, weekOffset };
      const { total, parts } = scorePost(pWithOffset, profile, weights, recentTags);
      if (total > bestScore) {
        bestScore = total;
        bestIdx = idx;
        bestBreakdown = parts;
      }
    }
    if (bestIdx < 0) break;
    chosen.push(bestIdx);
    const post = filtered[bestIdx];
    for (const t of post.tags || []) {
      recentTags[t] = (recentTags[t] || 0) + 1;
    }
    post._algoBreakdown = bestBreakdown;
    post._algoScore = bestScore;
  }

  return chosen.map(i => filtered[i]);
}

/**
 * Ein einzelner "Warum sehe ich das?"-Text auf Basis des letzten Breakdowns.
 */
function explainPost(post) {
  if (!post._algoBreakdown) {
    return { summary: 'Keine Daten vorhanden.', reasons: [] };
  }
  const b = post._algoBreakdown;
  const reasons = Object.entries(b)
    .map(([k, v]) => ({ k, v }))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    .filter(r => Math.abs(r.v) > 0.02)
    .slice(0, 4);

  const labels = {
    affinity: 'Passt zu deinen bisherigen Interessen',
    engagement: 'Hoher Engagement-Wert (viele Likes/Empörung)',
    recency: 'Ist neu',
    social: 'Kommt von einem Account, dem du folgst',
    ads: 'Ist bezahlte Werbung — auf dein Profil zugeschnitten',
    diversity: 'Wurde trotz ähnlicher Inhalte gezeigt',
    quality: 'Journalistische Qualität',
    outrage: 'Empörungs-Strafe',
    balance: 'Gegen-Perspektive (Ausgleich)'
  };
  return {
    summary: post.isAd ? 'Dieser Beitrag ist eine bezahlte Anzeige.' :
      'Das System hat diesen Post oben sortiert, weil folgende Faktoren am stärksten waren:',
    reasons: reasons.map(r => ({
      label: labels[r.k] || r.k,
      value: r.v,
      key: r.k
    }))
  };
}

  __M.scorePost = scorePost;
  __M.buildFeed = buildFeed;
  __M.explainPost = explainPost;
})();

// ===== warnings.js =====
(function(){
  var Store = __M.Store;
// warnings.js — Inhaltswarnungs-System.
// Zeigt Overlay vor Posts mit trigger_warning, trackt Accept/Skip.

const TW_TEXTS = {
  'rechtsextremismus': 'Inhalte mit rechtsextremer/verschwörungsideologischer Rhetorik',
  'hass': 'Hate Speech gegen eine Gruppe (als fiktives Zitat)',
  'anti-feminismus': 'antifeministische / Incel-nahe Rhetorik',
  'verschwoerung': 'Verschwörungsnarrative (z.B. „geheime Eliten")',
  'gewalt-rhetorik': 'gewaltverherrlichende Sprache (keine Darstellung)',
  'querfront': 'Querfront-Rhetorik (politische Vermengung)',
  'radikal-gaming': 'Radikalisierung aus Gaming-Communities'
};

function describeTW(key) {
  return TW_TEXTS[key] || 'belastende Inhalte';
}

/**
 * Zeigt Warnhinweis-Overlay und liefert ein Promise mit {show: true|false}.
 */
function askWarning(twKey) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('tw-overlay');
    const txt = document.getElementById('tw-text');
    const skip = document.getElementById('tw-skip');
    const show = document.getElementById('tw-show');

    txt.textContent = `Im folgenden Beitrag werden Inhalte gezeigt: ${describeTW(twKey)}.`;
    overlay.hidden = false;

    const cleanup = () => {
      overlay.hidden = true;
      skip.onclick = null;
      show.onclick = null;
    };

    skip.onclick = () => {
      Store.data.contentWarningsAccepted[twKey] =
        (Store.data.contentWarningsAccepted[twKey] || { shown: 0, skipped: 0 });
      Store.data.contentWarningsAccepted[twKey].skipped++;
      Store.save();
      cleanup();
      resolve({ show: false });
    };
    show.onclick = () => {
      Store.data.contentWarningsAccepted[twKey] =
        (Store.data.contentWarningsAccepted[twKey] || { shown: 0, skipped: 0 });
      Store.data.contentWarningsAccepted[twKey].shown++;
      Store.save();
      cleanup();
      resolve({ show: true });
    };
  });
}

  __M.describeTW = describeTW;
  __M.askWarning = askWarning;
})();

// ===== characters.js =====
(function(){
// characters.js — Character-Lookup und prozedurale SVG-Avatare.
// Keine externen Bilder — Avatare werden aus Index + Farbe generiert.

let CHAR_MAP = null;

function setCharacters(list) {
  CHAR_MAP = new Map();
  for (const c of list) CHAR_MAP.set(c.id, c);
}

function getCharacter(id) {
  if (!CHAR_MAP) return null;
  return CHAR_MAP.get(id) || { id, name: id, handle: '@' + id, avatar: 0, bio: '' };
}

/**
 * Generiert eine SVG-Avatar-Datenstruktur aus einem Integer.
 * Deterministisch: gleiche Zahl → gleicher Avatar.
 */
function avatarSvg(seed = 0) {
  const palette = [
    ['#ff2e88','#7a003d'],
    ['#22d3ee','#034354'],
    ['#facc15','#5a4400'],
    ['#4ade80','#093821'],
    ['#a78bfa','#2d1b5a'],
    ['#fb7185','#5a1322'],
    ['#60a5fa','#0c2855'],
    ['#f97316','#59210a']
  ];
  const [fg, bg] = palette[seed % palette.length];
  const shape = seed % 4;
  const eyeY = 42 + (seed % 3) * 2;
  const smile = (seed % 2) ? 'M 38 65 Q 50 72 62 65' : 'M 38 68 Q 50 62 62 68';
  let head;
  if (shape === 0) head = `<circle cx="50" cy="50" r="40" fill="${bg}" />`;
  else if (shape === 1) head = `<rect x="12" y="12" width="76" height="76" rx="14" fill="${bg}" />`;
  else if (shape === 2) head = `<polygon points="50,10 90,50 50,90 10,50" fill="${bg}" />`;
  else head = `<ellipse cx="50" cy="50" rx="40" ry="36" fill="${bg}" />`;

  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${head}
    <circle cx="38" cy="${eyeY}" r="4" fill="${fg}" />
    <circle cx="62" cy="${eyeY}" r="4" fill="${fg}" />
    <path d="${smile}" stroke="${fg}" stroke-width="3" stroke-linecap="round" fill="none" />
  </svg>`;
}

/**
 * Erzeugt ein kontextbezogenes SVG-Motiv als Post-Bild.
 * Erkennt Stichwörter im Text und wählt ein passendes Motiv
 * (Kaffee, Gaming-Controller, Mond, Roboter, Wahlurne, Auge, …).
 * Deterministisch basierend auf Post-ID.
 */
function memeSvg(postId, tags = [], text = '') {
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

  __M.setCharacters = setCharacters;
  __M.getCharacter = getCharacter;
  __M.avatarSvg = avatarSvg;
  __M.memeSvg = memeSvg;
})();

// ===== feed.js =====
(function(){
  var Store = __M.Store;
  var buildFeed = __M.buildFeed;
  var explainPost = __M.explainPost;
  var getCharacter = __M.getCharacter;
  var avatarSvg = __M.avatarSvg;
  var memeSvg = __M.memeSvg;
  var askWarning = __M.askWarning;
// feed.js — Feed-Rendering und Interaktionen.




let POSTS = [];
let ADS = [];
let WEEKS = [];
let onWeekEnd = null;      // Callback wenn Woche zuende
let onOpenCompose = null;
let currentFeed = [];      // Für Woche sichtbarer Feed

function initFeed(data) {
  POSTS = data.posts;
  ADS = data.ads;
  WEEKS = data.weeks;
}

function setCallbacks({ onWeekEnd: wEnd, onOpenCompose: oc }) {
  onWeekEnd = wEnd;
  onOpenCompose = oc;
}

/**
 * Baut den Feed für die aktuelle Woche.
 */
function computeCurrentFeed() {
  const d = Store.data;
  const w = WEEKS[d.currentWeek] || WEEKS[WEEKS.length - 1];
  // Posts dürfen pro Woche "reifen": wir erlauben alle Posts, Recency steuert Relevanz
  const eligible = POSTS.filter(p => {
    // Politik-rechts und Verschwörung erst ab W5 (didaktischer Bogen)
    const tags = p.tags || [];
    if (d.currentWeek < 3 && (tags.includes('politik-rechts') || tags.includes('politik-links') || tags.includes('verschwoerung'))) return false;
    if (d.currentWeek < 5 && tags.includes('politik-rechts') && (p.outrage_score || 0) > 0.5) return false;
    if (d.currentWeek < 8 && tags.includes('hass')) return false;
    if (d.currentWeek < 10 && tags.includes('anti-feminismus')) return false;
    // Wahl-Posts nur ab W19
    if ((tags.includes('politik-rechts') || tags.includes('politik-links') || tags.includes('politik-mitte')) && p.text.toLowerCase().includes('wahl') && d.currentWeek < 19) return false;
    // Nicht doppelt in Folge
    if (d.seenPosts.includes(p.id)) return false;
    return true;
  });

  // Bot-Accounts erst ab W12
  const finalEligible = eligible.filter(p => {
    const c = getCharacter(p.author);
    if (!c) return true;
    if (c.type && c.type.startsWith('bot') && !Store.isUnlocked('bots')) return false;
    return true;
  });

  currentFeed = buildFeed(
    finalEligible,
    ADS,
    d.userProfile,
    d.weights,
    {
      limit: 10,
      unlocked: d.unlockedMechanics,
      muted: d.userProfile.muted,
      weekOffset: 0
    }
  );
  return currentFeed;
}

/**
 * Rendert den Feed ins #feed-root.
 */
async function renderFeed(view = 'feed') {
  const root = document.getElementById('feed-root');
  root.innerHTML = '';
  const d = Store.data;
  const w = WEEKS[d.currentWeek] || WEEKS[WEEKS.length - 1];

  if (view === 'feed') {
    const header = document.createElement('div');
    header.className = 'feed-header';
    header.innerHTML = `
      <h2>Woche ${d.currentWeek}: ${escapeHtml(w.title)}</h2>
      <p>${escapeHtml(w.intro)}</p>
    `;
    root.appendChild(header);

    const list = document.createElement('div');
    list.className = 'feed-list';
    root.appendChild(list);

    const feed = computeCurrentFeed();
    for (const post of feed) {
      list.appendChild(renderPost(post));
    }

    const end = document.createElement('div');
    end.className = 'end-of-week';
    end.innerHTML = `<h3>Ende von Woche ${d.currentWeek}</h3>
      <p class="muted">Das war der Feed dieser Woche. Weiter zum Wochenrückblick?</p>`;
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = 'Wochenrückblick →';
    btn.onclick = () => {
      if (onWeekEnd) onWeekEnd(feed.map(p => p.id));
    };
    end.appendChild(btn);
    root.appendChild(end);
  } else if (view === 'explore') {
    root.innerHTML = '<div class="feed-header"><h2>Entdecken</h2><p class="muted">Posts, die der Algorithmus sonst noch für dich hätte — eine zweite Auswahl.</p></div>';
    const list = document.createElement('div');
    list.className = 'feed-list';
    root.appendChild(list);
    // Zweite Runde — bisschen anders gewichtet
    const explore = buildFeed(
      POSTS.filter(p => !d.seenPosts.includes(p.id)),
      ADS,
      d.userProfile,
      { ...d.weights, diversity: 0.4, recency: 0.1 },
      { limit: 8, unlocked: d.unlockedMechanics, muted: d.userProfile.muted }
    );
    for (const p of explore) list.appendChild(renderPost(p));
  } else if (view === 'compose') {
    root.innerHTML = '';
    const h = document.createElement('div');
    h.className = 'feed-header';
    h.innerHTML = `<h2>Posten</h2><p class="muted">Was willst du heute schreiben? Dein Post beeinflusst, was der Algorithmus dir zurückspielt.</p>`;
    root.appendChild(h);
    root.appendChild(buildComposeBox());
    // Eigene Posts drunter
    if (Store.data.ownPosts.length) {
      const h2 = document.createElement('h3');
      h2.textContent = 'Deine bisherigen Posts';
      h2.style.marginTop = '20px';
      root.appendChild(h2);
      const list = document.createElement('div');
      list.className = 'feed-list';
      for (const op of [...Store.data.ownPosts].reverse()) {
        list.appendChild(renderOwnPost(op));
      }
      root.appendChild(list);
    }
  } else if (view === 'notifications') {
    root.innerHTML = '';
    const h = document.createElement('div');
    h.className = 'feed-header';
    h.innerHTML = `<h2>Inbox</h2><p class="muted">Einladungen, Shitstorms, Badges.</p>`;
    root.appendChild(h);
    root.appendChild(renderNotifications());
  }
}

function renderPost(post) {
  const card = document.createElement('article');
  card.className = 'post-card' + (post.isAd ? ' ad' : '');
  card.dataset.postId = post.id;
  const char = getCharacter(post.author);
  const hasMedia = (post.outrage_score || 0) > 0.4 || (post.engagement_bait_score || 0) > 0.5 || post.tags?.includes('meme');

  const head = `
    <div class="post-head">
      <div class="avatar" aria-hidden="true">${avatarSvg(char.avatar || 0)}</div>
      <div class="name-block">
        <div class="name">${escapeHtml(char.name)} ${char.type === 'journalist' || char.type === 'linker_journalist' ? '<span class="verified">· verifiziert</span>' : ''}</div>
        <div class="meta">${escapeHtml(char.handle)} · W ${Store.data.currentWeek}</div>
      </div>
      ${Store.isUnlocked('algorithm_panel') ? `<button class="why-btn" data-why="${post.id}">Warum?</button>` : ''}
    </div>
  `;

  const body = post.trigger_warning && !Store.data.contentWarningsAccepted[post.trigger_warning]?.shown
    ? `<div class="post-body"></div>
       <div class="post-tw-shield">
         <strong>Inhaltswarnung:</strong> ${escapeHtml((post.trigger_warning === 'rechtsextremismus' ? 'rechtsextreme / verschwörungsideologische Rhetorik' : post.trigger_warning))}.
         <br/><button class="btn btn-ghost" data-tw="${post.trigger_warning}" data-post="${post.id}">Anzeigen</button>
       </div>`
    : `<div class="post-body">${escapeHtml(post.text)}</div>` +
      (post.article ? renderArticleCard(post.article) : '') +
      (hasMedia ? `<div class="post-media">${memeSvg(post.id, post.tags, post.text)}</div>` : '');

  const actions = `
    <div class="actions">
      <button class="action-btn like-btn" data-act="like">❤ <span>Like</span></button>
      <button class="action-btn" data-act="comment">💬 <span>Antworten</span></button>
      <button class="action-btn" data-act="share">↗ <span>Teilen</span></button>
      <button class="action-btn" data-act="follow">${Store.data.userProfile.followed.includes(char.id) ? '✓ Folgst du' : '+ Folgen'}</button>
      <button class="action-btn dislike" data-act="mute">🚫</button>
    </div>
  `;

  card.innerHTML = head + body + actions;

  // Event-Wiring
  const twShield = card.querySelector('[data-tw]');
  if (twShield) {
    twShield.onclick = async () => {
      const result = await askWarning(post.trigger_warning);
      if (result.show) {
        Store.recordAction(post.id, 'tw_view', post);
        twShield.parentElement.outerHTML = `<div class="post-body">${escapeHtml(post.text)}</div>` + (post.article ? renderArticleCard(post.article) : '') + (hasMedia ? `<div class="post-media">${memeSvg(post.id, post.tags, post.text)}</div>` : '');
      } else {
        Store.recordAction(post.id, 'tw_skip', post);
        twShield.parentElement.outerHTML = `<div class="muted small" style="padding:10px">Beitrag übersprungen.</div>`;
      }
    };
  }

  // Why-Button
  const whyBtn = card.querySelector('[data-why]');
  if (whyBtn) {
    whyBtn.onclick = (e) => {
      e.stopPropagation();
      showWhy(post);
    };
  }

  // Action-Buttons
  card.querySelectorAll('[data-act]').forEach(btn => {
    btn.onclick = () => handleAction(btn.dataset.act, post, btn, card);
  });

  return card;
}

function renderOwnPost(op) {
  const card = document.createElement('article');
  card.className = 'post-card';
  card.innerHTML = `
    <div class="post-head">
      <div class="avatar" aria-hidden="true">${avatarSvg(Store.data.character.avatar || 0)}</div>
      <div class="name-block">
        <div class="name">${escapeHtml(Store.data.character.name)} <span class="verified">· du</span></div>
        <div class="meta">Woche ${op.week}</div>
      </div>
    </div>
    <div class="post-body">${escapeHtml(op.text)}</div>
    <div class="muted small" style="padding-top:8px">Tags: ${(op.tags || []).join(', ')}</div>
  `;
  return card;
}

function buildComposeBox() {
  const wrap = document.createElement('div');
  wrap.className = 'compose-box';
  const topics = ['lifestyle','humor','gaming','musik','sport','wissenschaft','klima','politik-links','politik-mitte','politik-rechts','feminismus','verschwoerung'];
  const chosen = new Set();

  wrap.innerHTML = `
    <textarea id="compose-text" maxlength="280" placeholder="Was ist los?"></textarea>
    <div class="muted small">Wähle 1–3 Themen:</div>
    <div class="compose-topic-grid" id="compose-topics"></div>
    <div class="compose-row">
      <span class="muted small" id="compose-status"></span>
      <button class="btn btn-primary" id="btn-publish">Posten</button>
    </div>
  `;
  const grid = wrap.querySelector('#compose-topics');
  for (const t of topics) {
    const b = document.createElement('button');
    b.textContent = t;
    b.onclick = () => {
      if (chosen.has(t)) { chosen.delete(t); b.classList.remove('selected'); }
      else if (chosen.size < 3) { chosen.add(t); b.classList.add('selected'); }
    };
    grid.appendChild(b);
  }
  wrap.querySelector('#btn-publish').onclick = () => {
    const text = wrap.querySelector('#compose-text').value.trim();
    const status = wrap.querySelector('#compose-status');
    if (!text) { status.textContent = 'Du hast noch nichts geschrieben.'; return; }
    if (chosen.size === 0) { status.textContent = 'Wähle mindestens ein Thema.'; return; }
    const tags = [...chosen];
    const outrage = tags.some(t => ['politik-rechts','politik-links','verschwoerung','hass','feminismus','anti-feminismus'].includes(t)) ? 0.3 : 0.1;
    Store.addOwnPost({ text, tags, outrage });
    // Eigenes Posten verstärkt die gewählten Themen
    for (const t of tags) {
      Store.data.userProfile.interests[t] = Math.min(1, (Store.data.userProfile.interests[t] || 0) + 0.1);
    }
    Store.save();
    if (onOpenCompose) onOpenCompose('posted');
    renderFeed('compose');
    toast('Gepostet.');
  };
  return wrap;
}

function renderNotifications() {
  const wrap = document.createElement('div');
  wrap.className = 'feed-list';

  // Badges
  if (Store.data.badges.length) {
    const h = document.createElement('div');
    h.className = 'feed-header';
    h.innerHTML = '<h3>Erreichte Abzeichen</h3>';
    wrap.appendChild(h);
    for (const b of Store.data.badges) {
      const card = document.createElement('div');
      card.className = 'badge-card';
      card.innerHTML = `🏅 <strong>${escapeHtml(b.title)}</strong><br/><span class="small">${escapeHtml(b.desc)} · W${b.week}</span>`;
      wrap.appendChild(card);
    }
  }

  // Shitstorms
  for (const s of Store.data.shitstormHistory) {
    const card = document.createElement('div');
    card.className = 'viral-card ' + (s.kind?.startsWith('positive') ? 'positive' : '');
    card.innerHTML = `<h4>${escapeHtml(s.title)}</h4><p>${escapeHtml(s.body)}</p><span class="small muted">Woche ${s.week}</span>`;
    wrap.appendChild(card);
  }

  if (!Store.data.badges.length && !Store.data.shitstormHistory.length) {
    wrap.innerHTML = '<p class="muted">Noch keine Benachrichtigungen. Spiele weiter.</p>';
  }
  return wrap;
}

async function handleAction(act, post, btn, card) {
  const char = getCharacter(post.author);
  if (act === 'like') {
    Store.recordAction(post.id, 'like', post);
    btn.classList.toggle('active');
    btn.querySelector('span').textContent = btn.classList.contains('active') ? 'Geliked' : 'Like';
  } else if (act === 'share') {
    Store.recordAction(post.id, 'share', post);
    toast('Geteilt.');
    btn.classList.add('active');
  } else if (act === 'follow') {
    if (Store.data.userProfile.followed.includes(char.id)) {
      Store.unfollow(char.id);
      btn.innerHTML = '+ Folgen';
    } else {
      Store.follow(char.id);
      Store.recordAction(post.id, 'follow', post);
      btn.innerHTML = '✓ Folgst du';
      toast(`Du folgst jetzt ${char.name}.`);
    }
  } else if (act === 'mute') {
    Store.mute(char.id);
    Store.recordAction(post.id, 'mute', post);
    card.style.opacity = '0.3';
    toast(`${char.name} stummgeschaltet.`);
  } else if (act === 'comment') {
    showCommentOptions(post);
  }
}

function showCommentOptions(post) {
  const overlay = document.getElementById('comment-overlay');
  const list = document.getElementById('comment-options');
  list.innerHTML = '';
  const opts = generateCommentOptions(post);
  for (const o of opts) {
    const b = document.createElement('button');
    b.textContent = o.text;
    b.onclick = () => {
      Store.recordAction(post.id, o.type, post);
      overlay.hidden = true;
      toast('Kommentar abgeschickt.');
    };
    list.appendChild(b);
  }
  document.getElementById('comment-cancel').onclick = () => overlay.hidden = true;
  overlay.hidden = false;
}

function generateCommentOptions(post) {
  // Post-spezifische Antworten, wenn im Datensatz definiert.
  if (Array.isArray(post.replies) && post.replies.length) {
    return post.replies.map(r => (typeof r === 'string' ? { text: r, type: 'comment' } : r));
  }
  return contextualCommentOptions(post);
}

function contextualCommentOptions(post) {
  // Vier Tonlagen, aber inhaltlich an den Post angepasst: zustimmend, skeptisch, empört, humorvoll.
  const tags = post.tags || [];
  const t = (post.text || '').toLowerCase();

  // Keyword-basierte Spezialfälle
  if (/kaffee|café|tee /.test(t)) return [
    { text: '„Welches Café? Brauche ich."',                  type: 'comment' },
    { text: '„Stimmt. Kaffee hier ist eine Enttäuschung."',  type: 'comment' },
    { text: '„Du und dein Kaffee, jede Woche."',             type: 'angry_comment' },
    { text: '„Morgens ohne geht eh nicht."',                 type: 'comment' }
  ];
  if (/roboter|projekt/.test(t) && tags.includes('wissenschaft')) return [
    { text: '„Sick! Gibt’s Video?"',                         type: 'comment' },
    { text: '„Welcher Mikrocontroller?"',                    type: 'comment' },
    { text: '„Meiner rollt nur im Kreis, hilf mir."',        type: 'comment' },
    { text: '„Bis er dich verrät, ist das ok."',             type: 'comment' }
  ];
  if (/gilde|patch|queue|emote|skin|ranked|platin|turnier/.test(t)) return [
    { text: '„Bin dabei, ping mich."',                       type: 'comment' },
    { text: '„Das Patch ist broken, komm schon."',           type: 'angry_comment' },
    { text: '„Gilde heute Abend?"',                          type: 'comment' },
    { text: '„Meine Mutter sagt das auch."',                 type: 'comment' }
  ];
  if (/playlist|album|track|song |dj |karaoke|studio|set im |gig/.test(t)) return [
    { text: '„Link? Jetzt? Bitte?"',                         type: 'comment' },
    { text: '„Klang gestern im ZEK wirklich gut."',          type: 'comment' },
    { text: '„Nicht wieder 90er-Nostalgie."',                type: 'angry_comment' },
    { text: '„Auf Repeat. Danke."',                          type: 'comment' }
  ];
  if (/buch|autor|rezension|buchhandlung|roman|dystopie/.test(t)) return [
    { text: '„Auf die Liste. Danke."',                       type: 'comment' },
    { text: '„Hab ich angefangen, konnte nicht weiter."',    type: 'comment' },
    { text: '„Nele, dein Geschmack, immer."',                type: 'comment' },
    { text: '„Lieber Hörbuch — gibt’s das?"',                type: 'comment' }
  ];
  if (/deepfake|manipuliert|faktencheck|bildersuche/.test(t)) return [
    { text: '„Wichtig. Teile ich weiter."',                  type: 'comment' },
    { text: '„Faktenchecker sind selbst befangen."',         type: 'angry_comment' },
    { text: '„Gute Checkliste, speichere ich."',             type: 'comment' },
    { text: '„Bin trotzdem reingefallen. Peinlich."',        type: 'comment' }
  ];
  if (/wahl|wahlergebnis|kandidat|stimme|ankreuzen/.test(t)) return [
    { text: '„Danke für die Erinnerung."',                   type: 'comment' },
    { text: '„Ergebnis ist doch Show, Wahlen ändern nichts."', type: 'angry_comment' },
    { text: '„Bin schon im Wahllokal, gleich."',             type: 'comment' },
    { text: '„Gibt es eine Wahl-Hilfe für die Stadt?"',      type: 'comment' }
  ];
  if (/klima|kohle|klimakrise|klimaziele/.test(t)) return [
    { text: '„Fakten > Bauchgefühl."',                       type: 'comment' },
    { text: '„Strukturell ja, individuell auch."',           type: 'comment' },
    { text: '„Hört auf, uns Angst zu machen."',              type: 'angry_comment' },
    { text: '„Kann man das nachlesen?"',                     type: 'comment' }
  ];
  if (/equal pay|gehalt|statistik/.test(t)) return [
    { text: '„Danke, dass du dranbleibst."',                 type: 'comment' },
    { text: '„Zahlen sind bekannt, bitte handeln."',         type: 'comment' },
    { text: '„Die Methodik ist doch fragwürdig."',           type: 'angry_comment' },
    { text: '„Habe letztes Jahr endlich verhandelt."',       type: 'comment' }
  ];
  if (/mainstream|zensur|verschwör|akten|gelder verschoben/.test(t)) return [
    { text: '„Endlich sagt’s jemand."',                      type: 'comment' },
    { text: '„Quelle? Ernsthaft, bitte."',                   type: 'comment' },
    { text: '„Das ist Stimmungsmache."',                     type: 'angry_comment' },
    { text: '„Ich warte auf die Doku."',                     type: 'comment' }
  ];
  if (/studie|universität|korrelation|kausalität|forschung/.test(t)) return [
    { text: '„Endlich mal sauber differenziert."',           type: 'comment' },
    { text: '„Link zur Primärquelle?"',                      type: 'comment' },
    { text: '„Wissenschaft ist nicht Demokratie."',          type: 'angry_comment' },
    { text: '„Screenshot für die Lerngruppe."',              type: 'comment' }
  ];
  if (/radweg|fahrrad|kreisverkehr/.test(t)) return [
    { text: '„Gute Nachricht für die Stadt."',               type: 'comment' },
    { text: '„Mal sehen, ob sie’s wirklich bauen."',         type: 'comment' },
    { text: '„Und die Autofahrer?"',                         type: 'angry_comment' },
    { text: '„Endlich, nach Jahren."',                       type: 'comment' }
  ];
  if (/regen|sturm|wolken|mond|wetter/.test(t)) return [
    { text: '„Greifshafen-Stimmung."',                       type: 'comment' },
    { text: '„Hab ich auch gesehen — krass."',               type: 'comment' },
    { text: '„Ich liebe das Wetter hier nicht."',            type: 'angry_comment' },
    { text: '„Jacke an, Kamera raus."',                      type: 'comment' }
  ];
  if (/demo|protest|kundgebung|bürgerversammlung|fleetplatz/.test(t)) return [
    { text: '„Bin dabei."',                                  type: 'comment' },
    { text: '„Weniger Symbolik, mehr Plan."',                type: 'comment' },
    { text: '„Das bringt gar nichts."',                      type: 'angry_comment' },
    { text: '„Danke für die Info, teile ich."',              type: 'comment' }
  ];
  if (/hass|angepöbelt|hasskommentare|chatgruppe/.test(t)) return [
    { text: '„Tut mir leid, das zu lesen."',                 type: 'comment' },
    { text: '„Meldet das. Jedes Mal."',                      type: 'comment' },
    { text: '„Übertreibt ihr nicht ein bisschen?"',          type: 'angry_comment' },
    { text: '„Ihr seid nicht allein."',                      type: 'comment' }
  ];
  if (/testosteron|männer|männlich|dating/.test(t) && tags.includes('anti-feminismus')) return [
    { text: '„Stark formuliert. Keep going."',               type: 'comment' },
    { text: '„Das ist kein Mindset, das ist Angst."',        type: 'angry_comment' },
    { text: '„Hast du Quellen oder nur Parolen?"',           type: 'comment' },
    { text: '„Klingt nach Verkaufscoach."',                  type: 'comment' }
  ];

  // Tag-basierte Fallbacks mit Abwechslung
  if (tags.includes('politik-rechts') || tags.includes('verschwoerung') || tags.includes('hass')) {
    return [
      { text: '„Da ist was dran."',                          type: 'comment' },
      { text: '„Quelle? Ich glaube das nicht."',             type: 'comment' },
      { text: '„So redet man nicht über Menschen."',         type: 'angry_comment' },
      { text: '„Hab genug von der Stimmung."',               type: 'comment' }
    ];
  }
  if (tags.includes('politik-links') || tags.includes('feminismus')) {
    return [
      { text: '„Richtig wichtig."',                          type: 'comment' },
      { text: '„Hast du Quellen?"',                          type: 'comment' },
      { text: '„Zu viel Moralisieren."',                     type: 'angry_comment' },
      { text: '„Sehe ich anders, lass uns reden."',          type: 'comment' }
    ];
  }
  if (tags.includes('humor')) {
    return [
      { text: '„Haha, gut."',                                type: 'comment' },
      { text: '„Zu früh für mich."',                         type: 'comment' },
      { text: '„War nicht witzig."',                         type: 'angry_comment' },
      { text: '„Geklaut, aber ok."',                         type: 'comment' }
    ];
  }
  return [
    { text: '„Cool."',                                       type: 'comment' },
    { text: '„Interessant, erzähl mehr."',                   type: 'comment' },
    { text: '„Meh."',                                        type: 'angry_comment' },
    { text: '„Danke fürs Teilen."',                          type: 'comment' }
  ];
}

function renderArticleCard(article) {
  if (!article) return '';
  const src = article.source ? `<span class="article-source">${escapeHtml(article.source)}</span>` : '';
  const date = article.date ? ` · ${escapeHtml(article.date)}` : '';
  const title = article.title ? `<div class="article-title">${escapeHtml(article.title)}</div>` : '';
  const excerpt = article.excerpt ? `<div class="article-excerpt">${escapeHtml(article.excerpt)}</div>` : '';
  const kicker = article.kicker ? `<div class="article-kicker">${escapeHtml(article.kicker)}</div>` : '';
  return `<div class="article-card">${kicker}${title}${excerpt}<div class="article-meta">${src}${date}</div></div>`;
}

function showWhy(post) {
  const overlay = document.getElementById('why-overlay');
  const body = document.getElementById('why-body');
  const exp = explainPost(post);
  let html = `<p>${escapeHtml(exp.summary)}</p><ul>`;
  for (const r of exp.reasons) {
    const sign = r.value > 0 ? '↑' : '↓';
    html += `<li><strong>${escapeHtml(r.label)}</strong> ${sign} (${r.value.toFixed(2)})</li>`;
  }
  html += '</ul>';
  if (post.isAd) html += '<p class="muted small">Anzeigen sind nach deinen Interessen-Schätzwerten gezielt.</p>';
  body.innerHTML = html;
  document.getElementById('why-close').onclick = () => overlay.hidden = true;
  overlay.hidden = false;
}

function toast(msg, opts = {}) {
  const root = document.getElementById('toast-root');
  const t = document.createElement('div');
  t.className = 'toast' + (opts.badge ? ' badge' : '');
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => t.remove(), opts.long ? 4500 : 2500);
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

  __M.initFeed = initFeed;
  __M.setCallbacks = setCallbacks;
  __M.computeCurrentFeed = computeCurrentFeed;
  __M.renderFeed = renderFeed;
  __M.toast = toast;
})();

// ===== events.js =====
(function(){
  var Store = __M.Store;
  var clamp = __M.clamp;
  var toast = __M.toast;
// events.js — Wöchentliche Events: Shitstorms, Gilden, Wahl, Hate-Incident.


let EVENTS = [];
let GUILDS = [];
let PARTIES = [];
let SHITSTORM_OUT = {};
let HATE_INCIDENT = {};

function initEvents(data) {
  EVENTS = data.events;
  GUILDS = data.guilds;
  PARTIES = data.parties;
  SHITSTORM_OUT = data.shitstorm_outcomes;
  HATE_INCIDENT = data.hate_incident;
}

function getGuildList() { return GUILDS; }
function getGuildById(id) { return GUILDS.find(g => g.id === id); }
function getParties() { return PARTIES; }

/**
 * Events für aktuelle Woche auslösen.
 * @returns {Array<{event,result}>} Ergebnisse für Wochen-Karte
 */
function triggerWeekEvents(weekNum) {
  const results = [];
  const weekEvents = EVENTS.filter(e => e.week === weekNum);
  for (const e of weekEvents) {
    const res = processEvent(e);
    if (res) results.push({ event: e, result: res });
  }
  return results;
}

function processEvent(ev) {
  if (ev.type === 'guild_invite') {
    // Einladung speichern
    if (!Store.data.guildInvites) Store.data.guildInvites = [];
    if (!Store.data.guildInvites.includes(ev.guildId)) {
      Store.data.guildInvites.push(ev.guildId);
      Store.save();
      return { kind: 'invite', guildId: ev.guildId };
    }
  }
  if (ev.type === 'shitstorm_check') {
    const outcome = computeShitstorm();
    if (outcome) {
      Store.data.shitstormHistory.push({
        ...outcome, week: Store.data.currentWeek, kind: outcome.kind
      });
      Store.save();
      return { kind: 'shitstorm', outcome };
    }
  }
  if (ev.type === 'deepfake') {
    return { kind: 'deepfake' };
  }
  if (ev.type === 'hate_incident') {
    return { kind: 'hate_incident' };
  }
  if (ev.type === 'election_start') {
    return { kind: 'election_start' };
  }
  if (ev.type === 'election_vote') {
    // Ergebnis basierend auf User-Profil „perzipiert"
    const perceived = computePerceivedElectionResult();
    Store.data.electionData = perceived;
    Store.save();
    return { kind: 'election_vote', result: perceived };
  }
  return null;
}

function computeShitstorm() {
  // Braucht mindestens einen eigenen Post
  if (!Store.data.ownPosts.length) return null;
  const lastOwn = Store.data.ownPosts[Store.data.ownPosts.length - 1];
  const outrage = lastOwn.outrage || 0;
  const hasPolitical = (lastOwn.tags || []).some(t =>
    ['politik-rechts','politik-links','verschwoerung','hass','feminismus','anti-feminismus'].includes(t));

  let key;
  if (hasPolitical && outrage > 0.2) key = 'negative_political';
  else if (outrage > 0.2) key = 'negative_outrage';
  else if ((lastOwn.tags || []).includes('wissenschaft')) key = 'positive_wissenschaft';
  else key = 'positive_lifestyle';

  const base = SHITSTORM_OUT[key];
  return { ...base, kind: key };
}

/**
 * Wahlergebnis aus Sicht des User-Feeds (perzipiert)
 * + objektives Ergebnis
 */
function computePerceivedElectionResult() {
  const objective = [
    { id: 'p_buerger', name: 'Bürgerliste',        share: 0.29 },
    { id: 'p_zukunft', name: 'Zukunft Greifshafen', share: 0.26 },
    { id: 'p_alt',     name: 'Neue Alternative',    share: 0.23 },
    { id: 'p_heimat',  name: 'Heimat Zuerst',       share: 0.12 },
    { id: 'sonst',     name: 'Sonstige',            share: 0.10 }
  ];
  // Perzipierte Verteilung: verzerrt durch political_lean_estimated
  const lean = Store.data.userProfile.political_lean_estimated;
  const perceived = objective.map(p => {
    const party = PARTIES.find(x => x.id === p.id);
    const partyLean = party ? party.lean : 0;
    const agreement = 1 - Math.abs(partyLean - lean) / 2;  // 0..1
    const boost = 1 + (agreement - 0.5) * 0.8 * Math.abs(lean);
    return { ...p, perceived: p.share * boost };
  });
  // Normalisieren
  const sum = perceived.reduce((a, b) => a + b.perceived, 0);
  perceived.forEach(p => p.perceived = p.perceived / sum);
  return { objective, perceived };
}

/**
 * Hate-Incident-Chat-Daten.
 */
function getHateIncidentData() { return HATE_INCIDENT; }

/**
 * Reaktion auf eine Gilden-Nachricht verbuchen.
 */
function applyGuildReaction(guildId, choiceId, choice) {
  const effect = choice.effect || {};
  const p = Store.data.userProfile;
  if (effect.tags) {
    for (const [t, v] of Object.entries(effect.tags)) {
      p.interests[t] = clamp((p.interests[t] || 0) + v, 0, 1);
    }
  }
  if (effect.leaveGuild) {
    Store.data.guildMemberships = Store.data.guildMemberships.filter(x => x !== guildId);
  } else {
    if (!Store.data.guildMemberships.includes(guildId)) {
      Store.data.guildMemberships.push(guildId);
    }
  }
  if (!Store.data.guildReactions[guildId]) Store.data.guildReactions[guildId] = [];
  Store.data.guildReactions[guildId].push({ choiceId, week: Store.data.currentWeek });
  Store.save();
}

/**
 * Badge-Vergabe-Logik am Ende jeder Woche.
 */
function checkBadges() {
  const awarded = [];
  const actions = Store.data.history.flatMap(h => h.actions || []);
  const likes = actions.filter(a => a.type === 'like').length;
  const comments = actions.filter(a => a.type === 'comment' || a.type === 'angry_comment').length;
  const follows = actions.filter(a => a.type === 'follow').length;
  const angry = actions.filter(a => a.type === 'angry_comment').length;

  if (likes >= 20 && Store.addBadge('Early Adopter', '20 Likes in der ersten Phase')) awarded.push('Early Adopter');
  if (angry >= 5 && Store.addBadge('Flammenwerfer', 'Du hast wütend kommentiert')) awarded.push('Flammenwerfer');
  if (comments === 0 && Store.data.currentWeek >= 5 && Store.addBadge('Stiller Beobachter', 'Lesen statt Schreiben')) awarded.push('Stiller Beobachter');
  if (follows >= 10 && Store.addBadge('Netzwerker', 'Du folgst 10+ Accounts')) awarded.push('Netzwerker');
  if (Store.data.guildMemberships.includes('echte_werte') && Store.addBadge('Tief im Loch', 'Rabbit-Hole betreten')) awarded.push('Tief im Loch');
  if (Store.data.guildMemberships.includes('lese_runde') && Store.addBadge('Bücherwurm', 'Der Leserunde beigetreten')) awarded.push('Bücherwurm');
  return awarded;
}

  __M.initEvents = initEvents;
  __M.getGuildList = getGuildList;
  __M.getGuildById = getGuildById;
  __M.getParties = getParties;
  __M.triggerWeekEvents = triggerWeekEvents;
  __M.getHateIncidentData = getHateIncidentData;
  __M.applyGuildReaction = applyGuildReaction;
  __M.checkBadges = checkBadges;
})();

// ===== sandbox.js =====
(function(){
  var Store = __M.Store;
  var buildFeed = __M.buildFeed;
  var getCharacter = __M.getCharacter;
// sandbox.js — Editor für den eigenen Algorithmus.
// GUI-Slider → Weights → Live-Vorschau + 10-Wochen-Simulation.



let POSTS = [];
let ADS = [];

const SLIDER_DEFS = [
  { key: 'affinity',        label: 'Interessen-Affinität',    min: 0, max: 2, step: 0.05,
    desc: 'Wie stark passt der Feed zu dem, was du bisher gemocht hast?' },
  { key: 'engagement',      label: 'Engagement-Boost',         min: 0, max: 2, step: 0.05,
    desc: 'Belohnt Posts, die viele Likes/Kommentare/Empörung erzeugen.' },
  { key: 'recency',         label: 'Aktualität',               min: 0, max: 2, step: 0.05,
    desc: 'Wie sehr zählt, dass ein Post frisch ist?' },
  { key: 'social',          label: 'Soziales Gewicht',         min: 0, max: 2, step: 0.05,
    desc: 'Wie stark zählen Accounts, denen du folgst?' },
  { key: 'ads',             label: 'Anzeigen',                  min: 0, max: 2, step: 0.05,
    desc: 'Wie prominent werden Anzeigen einsortiert?' },
  { key: 'diversity',       label: 'Vielfalt-Strafe',          min: 0, max: 1.5, step: 0.05,
    desc: 'Hoch = weniger gleiche Inhalte hintereinander.' },
  { key: 'quality',         label: 'Qualitäts-Bonus',          min: 0, max: 2, step: 0.05,
    desc: 'Belohnt Posts mit journalistischer Qualität.' },
  { key: 'outragePenalty',  label: 'Empörungs-Strafe',         min: 0, max: 2, step: 0.05,
    desc: 'Bestraft empörungslastige Posts.' },
  { key: 'balance',         label: 'Gegen-Perspektive',        min: 0, max: 2, step: 0.05,
    desc: 'Bonus für Posts, die deiner politischen Richtung entgegenstehen.' }
];

function initSandbox(posts, ads) {
  POSTS = posts;
  ADS = ads;
}

function renderSandbox(onClose) {
  const d = Store.data;
  const current = d.sandboxRules || { ...d.weights };
  // Slider-Liste
  const sliders = document.getElementById('sandbox-sliders');
  sliders.innerHTML = '<h3>Deine Regeln</h3>';
  for (const def of SLIDER_DEFS) {
    const row = document.createElement('div');
    row.className = 'slider-row';
    row.innerHTML = `
      <div class="slider-top">
        <label>${def.label}</label><b data-key="${def.key}">${Number(current[def.key] ?? 0).toFixed(2)}</b>
      </div>
      <input type="range" min="${def.min}" max="${def.max}" step="${def.step}"
             value="${current[def.key] ?? 0}" data-slider="${def.key}" aria-label="${def.label}" />
      <div class="slider-desc">${def.desc}</div>
    `;
    sliders.appendChild(row);
  }

  const presetRow = document.createElement('div');
  presetRow.style.display = 'flex';
  presetRow.style.gap = '6px';
  presetRow.style.flexWrap = 'wrap';
  presetRow.style.marginTop = '10px';
  presetRow.innerHTML = `
    <button class="btn btn-ghost" data-preset="current">Wie bisher</button>
    <button class="btn btn-ghost" data-preset="quality">Qualität</button>
    <button class="btn btn-ghost" data-preset="chrono">Chronologisch</button>
    <button class="btn btn-ghost" data-preset="balance">Ausgleich</button>
  `;
  sliders.appendChild(presetRow);

  const rules = { ...current };
  sliders.querySelectorAll('[data-slider]').forEach(el => {
    el.oninput = () => {
      rules[el.dataset.slider] = parseFloat(el.value);
      sliders.querySelector(`[data-key="${el.dataset.slider}"]`).textContent = rules[el.dataset.slider].toFixed(2);
      Store.data.sandboxRules = { ...rules };
      Store.save();
      previewFeed(rules);
    };
  });
  presetRow.querySelectorAll('[data-preset]').forEach(b => {
    b.onclick = () => applyPreset(b.dataset.preset, rules, sliders);
  });

  previewFeed(rules);

  document.getElementById('btn-sim').onclick = () => simulate(rules);
  document.getElementById('btn-sandbox-close').onclick = () => onClose && onClose();
}

function applyPreset(name, rules, container) {
  const presets = {
    current: { ...Store.data.weights },
    quality: { affinity: 0.3, engagement: 0.2, recency: 0.5, social: 0.3, ads: 0.2, diversity: 0.7, quality: 1.5, outragePenalty: 1.0, balance: 0.5 },
    chrono:  { affinity: 0.0, engagement: 0.0, recency: 1.8, social: 1.0, ads: 0.2, diversity: 0.0, quality: 0.2, outragePenalty: 0.0, balance: 0.0 },
    balance: { affinity: 0.3, engagement: 0.2, recency: 0.5, social: 0.5, ads: 0.2, diversity: 0.8, quality: 0.8, outragePenalty: 0.8, balance: 1.5 }
  };
  const p = presets[name];
  if (!p) return;
  for (const k of Object.keys(p)) {
    rules[k] = p[k];
    const slider = container.querySelector(`[data-slider="${k}"]`);
    const lbl = container.querySelector(`[data-key="${k}"]`);
    if (slider) slider.value = p[k];
    if (lbl) lbl.textContent = p[k].toFixed(2);
  }
  Store.data.sandboxRules = { ...rules };
  Store.save();
  previewFeed(rules);
}

function previewFeed(rules) {
  const feed = buildFeed(
    POSTS,
    ADS,
    Store.data.userProfile,
    rules,
    { limit: 6, unlocked: ['ads'], muted: Store.data.userProfile.muted }
  );
  const root = document.getElementById('sandbox-feed');
  root.innerHTML = '';
  for (const p of feed) {
    const c = getCharacter(p.author);
    const card = document.createElement('div');
    card.className = 'post-card';
    card.innerHTML = `
      <div class="post-head">
        <div class="name-block">
          <div class="name">${escapeHtml(c?.name || p.author)}</div>
          <div class="meta">${escapeHtml(c?.handle || '')}</div>
        </div>
      </div>
      <div class="post-body">${escapeHtml(truncate(p.text, 140))}</div>
    `;
    root.appendChild(card);
  }
}

function simulate(rules) {
  // Einfache Simulation: 10 Wochen-Iterationen, in jeder Woche Feed bauen, Top-3 „liken", Profil updaten.
  const simProfile = structuredClone(Store.data.userProfile);
  const statsBefore = scoreProfile(Store.data.userProfile);
  for (let i = 0; i < 10; i++) {
    const feed = buildFeed(POSTS, ADS, simProfile, rules, { limit: 10, unlocked: ['ads'], muted: [] });
    for (let j = 0; j < Math.min(3, feed.length); j++) {
      const p = feed[j];
      for (const t of p.tags || []) {
        simProfile.interests[t] = Math.min(1, (simProfile.interests[t] || 0) + 0.05);
      }
      if (p.political_lean !== undefined) {
        simProfile.political_lean_estimated = clamp(
          simProfile.political_lean_estimated + p.political_lean * 0.03, -1, 1
        );
      }
    }
  }
  const statsAfter = scoreProfile(simProfile);

  const result = document.getElementById('sim-result');
  result.classList.add('visible');
  result.innerHTML = `
    <h4>Nach 10 Wochen mit deinen Regeln:</h4>
    <div class="wrapped-bars">
      ${renderProfileRow('Wissenschaft', statsBefore.wissenschaft, statsAfter.wissenschaft)}
      ${renderProfileRow('Politik-rechts', statsBefore.politikRechts, statsAfter.politikRechts)}
      ${renderProfileRow('Politik-links', statsBefore.politikLinks, statsAfter.politikLinks)}
      ${renderProfileRow('Verschwörung', statsBefore.verschwoerung, statsAfter.verschwoerung)}
      ${renderProfileRow('Vielfalt', statsBefore.diversity, statsAfter.diversity)}
    </div>
    <p class="muted small">Politische Neigung: ${statsBefore.lean.toFixed(2)} → <strong>${statsAfter.lean.toFixed(2)}</strong>.</p>
    <p class="muted small">Vergleich mit dem Original-Algorithmus: Schiebe die Slider → sieh, wie sich alles ändert.</p>
  `;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function scoreProfile(p) {
  const diversity = 1 - stddev(Object.values(p.interests));
  return {
    wissenschaft: p.interests.wissenschaft || 0,
    politikRechts: p.interests['politik-rechts'] || 0,
    politikLinks: p.interests['politik-links'] || 0,
    verschwoerung: p.interests.verschwoerung || 0,
    diversity: clamp(diversity, 0, 1),
    lean: p.political_lean_estimated
  };
}
function stddev(arr) {
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
  return Math.sqrt(v);
}

function renderProfileRow(label, before, after) {
  const delta = after - before;
  const arrow = delta > 0.02 ? '↑' : delta < -0.02 ? '↓' : '→';
  return `
    <div class="row">
      <span class="lbl">${label}</span>
      <div class="bar"><div class="fill" style="width:${Math.round(after*100)}%"></div></div>
      <span>${Math.round(after*100)}% ${arrow}</span>
    </div>
  `;
}

function truncate(s, n) {
  if (!s) return '';
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

  __M.initSandbox = initSandbox;
  __M.renderSandbox = renderSandbox;
})();

// ===== wrapped.js =====
(function(){
  var Store = __M.Store;
// wrapped.js — Jahresrückblick im "Wrapped"-Stil.

let POSTS_LOOKUP = null;

function setPostsLookup(posts) {
  POSTS_LOOKUP = new Map(posts.map(p => [p.id, p]));
}

/**
 * Analysiert die gespielte Historie und erzeugt Slides.
 */
function buildWrapped() {
  const d = Store.data;
  const actions = d.history.flatMap(h => h.actions || []);
  const feedSeen = d.history.flatMap(h => h.feedSeen || []);

  // Top-Interessen
  const interests = { ...d.userProfile.interests };
  const topInterests = Object.entries(interests)
    .filter(([, v]) => v > 0.05)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topWord = topInterests[0] ? labelFor(topInterests[0][0]) : 'Lifestyle';

  // Anteil politischer Likes nach Richtung
  let leftActions = 0, rightActions = 0, totalPolitical = 0;
  for (const a of actions) {
    const post = POSTS_LOOKUP?.get(a.postId);
    if (!post) continue;
    const lean = post.political_lean || 0;
    if (Math.abs(lean) > 0.1 && ['like','comment','share','angry_comment'].includes(a.type)) {
      totalPolitical++;
      if (lean > 0) rightActions++;
      else leftActions++;
    }
  }
  const dominantShare = totalPolitical > 0
    ? Math.max(leftActions, rightActions) / totalPolitical
    : 0;

  // Rabbit-Hole-Pfad: Abfolge der dominanten Tags pro Woche
  const pathway = [];
  for (const h of d.history) {
    const counts = {};
    for (const a of h.actions || []) {
      const post = POSTS_LOOKUP?.get(a.postId);
      if (!post) continue;
      for (const t of post.tags || []) counts[t] = (counts[t] || 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top) pathway.push({ week: h.week, tag: top[0] });
  }

  // „Werbeprofil"
  const adProfile = generateAdProfile(topInterests, d.userProfile);

  // Was wurde NICHT gezeigt? (gegenteilige Richtung)
  const missed = generateMissedList(d.userProfile, feedSeen);

  // Screen-Time
  const totalActions = actions.length;
  const estimatedMinutes = totalActions * 2.3 + d.history.length * 5;

  // Zeit mit Warnhinweisen
  const twStats = d.contentWarningsAccepted || {};
  const twShown = Object.values(twStats).reduce((a, b) => a + (b.shown || 0), 0);
  const twSkipped = Object.values(twStats).reduce((a, b) => a + (b.skipped || 0), 0);

  // Eigene Posts
  const ownCount = d.ownPosts.length;

  // Lean-Score
  const lean = d.userProfile.political_lean_estimated;

  return [
    {
      id: 's1',
      html: `
        <h1>Dein Streem-Rückblick</h1>
        <p>Ein halbes Jahr. ${d.history.length} Aktionen. Tausende Entscheidungen. Los.</p>
      `
    },
    {
      id: 's2',
      html: `
        <h2>Dein Jahres-Wort</h2>
        <div class="big-word">${escapeHtml(topWord)}</div>
        <p>Dein Feed wurde von diesem Thema dominiert.</p>
      `
    },
    {
      id: 's3',
      html: `
        <h2>Deine Top-Interessen laut Algorithmus</h2>
        <div class="wrapped-bars">
          ${topInterests.map(([k, v]) => `
            <div class="row">
              <span class="lbl">${escapeHtml(labelFor(k))}</span>
              <div class="bar"><div class="fill" style="width:${Math.round(v*100)}%"></div></div>
              <span>${Math.round(v*100)}%</span>
            </div>
          `).join('')}
        </div>
        <p class="muted small">Das System hat aus ${actions.length} Interaktionen gelernt.</p>
      `
    },
    {
      id: 's4',
      html: `
        <h2>Dein Echokammer-Score</h2>
        <div class="big-num">${Math.round(dominantShare * 100)}%</div>
        <p>${dominantShare > 0.7
          ? 'deiner politischen Likes gingen in eine einzige Richtung.'
          : dominantShare > 0.5
          ? 'deiner politischen Likes gingen in eine dominante Richtung.'
          : 'deiner politischen Likes waren über Richtungen verteilt.'}</p>
        <div class="wrapped-lean">
          <div class="lean-track"><div class="lean-dot" style="left:${Math.round((lean+1)*50)}%"></div></div>
          <div class="labels"><span>links</span><span>Mitte</span><span>rechts</span></div>
        </div>
        <p class="muted small">${totalPolitical} politische Interaktionen insgesamt.</p>
      `
    },
    {
      id: 's5',
      html: `
        <h2>Dein Pfad durchs Rabbit Hole</h2>
        <div class="wrapped-pathway">
          <div class="pathway-line">
            ${pathway.map((p, i) => `
              <span class="pathway-node ${isRadical(p.tag) ? 'radical' : ''}">W${p.week} · ${escapeHtml(labelFor(p.tag))}</span>
              ${i < pathway.length - 1 ? '<span class="pathway-arrow">→</span>' : ''}
            `).join('')}
          </div>
        </div>
        <p class="muted small">Jedes Kästchen ist das Thema, auf das du in dieser Woche am meisten reagiert hast.</p>
      `
    },
    {
      id: 's6',
      html: `
        <h2>Wer der Algorithmus denkt, dass du bist</h2>
        <div class="wrapped-ads">
          <div class="ad-label">Werbeprofil · für Anzeigenkunden</div>
          <ul>
            ${adProfile.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
          </ul>
        </div>
        <p class="muted small">So würde ein Werbetreibender dich ansprechen.</p>
      `
    },
    {
      id: 's7',
      html: `
        <h2>Was du nicht gesehen hast</h2>
        <div class="wrapped-missed">
          ${missed.map(m => `<div class="card"><strong>${escapeHtml(m.title)}</strong><br/>${escapeHtml(m.desc)}</div>`).join('')}
        </div>
        <p class="muted small">Diese Themen und Perspektiven hat dein Feed dir selten gezeigt.</p>
      `
    },
    {
      id: 's8',
      html: `
        <h2>Deine Streem-Zeit</h2>
        <div class="big-num">${Math.round(estimatedMinutes)} min</div>
        <p>Ungefähr auf der App verbracht. ${ownCount} eigene Posts. ${twShown} Inhaltswarnungen angeschaut, ${twSkipped} übersprungen.</p>
      `
    },
    {
      id: 's9',
      html: `
        <h2>Und jetzt?</h2>
        <p>Du hast gerade gesehen, wie ein Algorithmus dich ausliest, gewichtet und zurückspielt.</p>
        <p>Das Spiel ist nicht echt. Die Mechanik ist es.</p>
        <div class="wrapped-final-actions">
          <button class="btn btn-primary" id="btn-go-sandbox">Dein eigener Algorithmus →</button>
          <button class="btn btn-ghost" id="btn-go-manifest">Medien-Manifest →</button>
        </div>
      `
    }
  ];
}

function labelFor(tag) {
  const m = {
    gaming: 'Gaming',
    'politik-links': 'Politik (links)',
    'politik-rechts': 'Politik (rechts)',
    'politik-mitte': 'Politik (Mitte)',
    lifestyle: 'Lifestyle',
    wissenschaft: 'Wissenschaft',
    verschwoerung: 'Verschwörung',
    humor: 'Humor',
    hass: 'Hass',
    feminismus: 'Feminismus',
    'anti-feminismus': 'Anti-Feminismus',
    musik: 'Musik',
    sport: 'Sport',
    klima: 'Klima',
    'true-crime': 'True Crime'
  };
  return m[tag] || tag;
}

function isRadical(tag) {
  return ['politik-rechts','verschwoerung','hass','anti-feminismus'].includes(tag);
}

function generateAdProfile(topInterests, profile) {
  const lines = [];
  const lean = profile.political_lean_estimated;
  if (lean > 0.35) lines.push('politisch: konservativ bis rechts');
  else if (lean < -0.35) lines.push('politisch: progressiv bis links');
  else lines.push('politisch: Mitte');

  if (profile.interests['gaming'] > 0.3) lines.push('Zielgruppe: Gaming');
  if (profile.interests['klima'] > 0.3) lines.push('affin für: Nachhaltigkeit');
  if (profile.interests['verschwoerung'] > 0.2) lines.push('empfänglich für: „alternative Erklärungen"');
  if (profile.interests['anti-feminismus'] > 0.2) lines.push('empfänglich für: Männer-Coaching-Angebote');
  if (profile.interests['feminismus'] > 0.3) lines.push('affin für: progressive Marken, Diversity');
  if (profile.interests['lifestyle'] > 0.4) lines.push('hoher Konsumindex');
  if (profile.outrage_tolerance > 0.4) lines.push('toleriert Empörungsmarketing');
  if (lines.length < 2) lines.push('Interessen-Cluster: ' + topInterests.slice(0, 3).map(([k]) => labelFor(k)).join(', '));
  return lines;
}

function generateMissedList(profile, feedSeen) {
  const items = [];
  if (profile.political_lean_estimated > 0.25) {
    items.push({ title: 'Linke Argumente zur Klimapolitik', desc: 'Dein Feed hat sie kaum gezeigt.' });
    items.push({ title: 'Wissenschaftliche Einordnungen', desc: 'Oft zugunsten lauter Meinungen ausgeblendet.' });
  } else if (profile.political_lean_estimated < -0.25) {
    items.push({ title: 'Konservative Wirtschaftsargumente', desc: 'Wurden selten oben sortiert.' });
    items.push({ title: 'Ländlich-konservative Stimmen', desc: 'Kaum Reichweite in deinem Feed.' });
  }
  if ((profile.interests['wissenschaft'] || 0) < 0.2) {
    items.push({ title: 'Faktenchecks', desc: 'Wurden von Empörungsposts verdrängt.' });
  }
  if ((profile.interests['politik-mitte'] || 0) < 0.2) {
    items.push({ title: 'Stimmen der politischen Mitte', desc: 'Sie bekommen selten Reichweite.' });
  }
  items.push({ title: 'Lokale, konstruktive Lösungen', desc: 'Greifshafen hat mehr als nur Empörung.' });
  return items.slice(0, 4);
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/**
 * Rendert alle Slides und steuert die Navigation.
 */
function renderWrapped(onSandbox, onManifest) {
  const slides = buildWrapped();
  const root = document.getElementById('wrapped-root');
  root.innerHTML = '';

  for (let i = 0; i < slides.length; i++) {
    const s = document.createElement('div');
    s.className = 'wrapped-slide' + (i === 0 ? ' active' : '');
    s.dataset.idx = i;
    s.innerHTML = slides[i].html;
    root.appendChild(s);
  }

  const dots = document.createElement('div');
  dots.className = 'wrapped-dots';
  for (let i = 0; i < slides.length; i++) {
    const d = document.createElement('span');
    if (i === 0) d.className = 'on';
    dots.appendChild(d);
  }
  root.appendChild(dots);

  const nav = document.createElement('div');
  nav.className = 'wrapped-nav';
  nav.innerHTML = `
    <button class="btn btn-ghost" id="wr-back">Zurück</button>
    <button class="btn btn-primary" id="wr-next">Weiter</button>
  `;
  root.appendChild(nav);

  let idx = 0;
  const show = (n) => {
    if (n < 0 || n >= slides.length) return;
    root.querySelectorAll('.wrapped-slide').forEach(el => el.classList.toggle('active', +el.dataset.idx === n));
    root.querySelectorAll('.wrapped-dots span').forEach((d, i) => d.classList.toggle('on', i === n));
    idx = n;
    // letzte Slide: Buttons wiring
    if (n === slides.length - 1) {
      setTimeout(() => {
        const sbx = root.querySelector('#btn-go-sandbox');
        if (sbx) sbx.onclick = () => onSandbox && onSandbox();
        const mf = root.querySelector('#btn-go-manifest');
        if (mf) mf.onclick = () => onManifest && onManifest();
      }, 20);
    }
  };
  nav.querySelector('#wr-back').onclick = () => show(idx - 1);
  nav.querySelector('#wr-next').onclick = () => show(idx + 1);

  // Tastatur
  document.addEventListener('keydown', wrappedKey);
  function wrappedKey(e) {
    const active = document.getElementById('screen-wrapped').classList.contains('active');
    if (!active) { document.removeEventListener('keydown', wrappedKey); return; }
    if (e.key === 'ArrowRight' || e.key === ' ') show(idx + 1);
    if (e.key === 'ArrowLeft') show(idx - 1);
  }
}

  __M.setPostsLookup = setPostsLookup;
  __M.buildWrapped = buildWrapped;
  __M.renderWrapped = renderWrapped;
})();

// ===== main.js =====
(function(){
  var Store = __M.Store;
  var initFeed = __M.initFeed;
  var renderFeed = __M.renderFeed;
  var setFeedCallbacks = __M.setCallbacks;
  var computeCurrentFeed = __M.computeCurrentFeed;
  var toast = __M.toast;
  var initEvents = __M.initEvents;
  var triggerWeekEvents = __M.triggerWeekEvents;
  var getGuildList = __M.getGuildList;
  var getGuildById = __M.getGuildById;
  var getParties = __M.getParties;
  var applyGuildReaction = __M.applyGuildReaction;
  var checkBadges = __M.checkBadges;
  var getHateIncidentData = __M.getHateIncidentData;
  var setCharacters = __M.setCharacters;
  var avatarSvg = __M.avatarSvg;
  var getCharacter = __M.getCharacter;
  var setPostsLookup = __M.setPostsLookup;
  var renderWrapped = __M.renderWrapped;
  var initSandbox = __M.initSandbox;
  var renderSandbox = __M.renderSandbox;
  var explainPost = __M.explainPost;
// main.js — Einstieg, Routing, Orchestrierung aller Module.







// ===== Daten-Bundle (statt fetch, damit file:// funktioniert) =====
// Die JSONs werden zur Laufzeit geladen — funktioniert per fetch() auch bei file://
// nicht in allen Browsern. Daher: wir importieren sie per script-tags als ES-module-wrapped JSON.
// Alternative: fetch mit Fallback. Wir nutzen fetch + try/catch.

const DATA_FILES = ['posts.json','characters.json','events.json','ads.json','weeks.json'];
let DATA = {};

async function loadData() {
  for (const f of DATA_FILES) {
    try {
      const res = await fetch('data/' + f);
      if (!res.ok) throw new Error(res.statusText);
      DATA[f.replace('.json','')] = await res.json();
    } catch (e) {
      // file:// fallback: JSON wurde als window-Variable bereitgestellt
      const key = f.replace('.json','').toUpperCase().replace(/-/g,'_');
      if (window['__DATA_' + key]) {
        DATA[f.replace('.json','')] = window['__DATA_' + key];
      } else {
        console.warn('Konnte ' + f + ' nicht laden. Per file:// muss Chrome ggf. mit --allow-file-access-from-files gestartet werden.');
        throw e;
      }
    }
  }
}

// ===== Routing ======
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
}

// ===== Setup ======
async function boot() {
  try {
    await loadData();
  } catch (e) {
    document.body.innerHTML = `<div style="padding:40px;color:#eee;font-family:sans-serif;max-width:640px;margin:auto">
      <h1>Daten konnten nicht geladen werden</h1>
      <p>Die App nutzt lokale JSON-Dateien. Einige Browser blockieren das bei Doppelklick auf <code>index.html</code>.</p>
      <p><strong>Lösung:</strong> Starte einen kleinen lokalen Webserver im Projektordner, z.B.:</p>
      <pre style="background:#222;padding:10px;border-radius:6px">python -m http.server 8080</pre>
      <p>Öffne dann <code>http://localhost:8080</code>.</p>
      <p>Auf dem iPad funktioniert Safari direkt mit <code>file://</code>. Details siehe README.md.</p>
    </div>`;
    return;
  }

  setCharacters(DATA.characters.characters);
  initFeed({
    posts: DATA.posts.posts,
    ads: DATA.ads.ads,
    weeks: DATA.weeks.weeks
  });
  initEvents({
    events: DATA.events.events,
    guilds: DATA.events.guilds,
    parties: DATA.events.parties,
    shitstorm_outcomes: DATA.events.shitstorm_outcomes,
    hate_incident: DATA.events.hate_incident
  });
  setPostsLookup(DATA.posts.posts);
  initSandbox(DATA.posts.posts, DATA.ads.ads);

  setFeedCallbacks({
    onWeekEnd: handleWeekEnd,
    onOpenCompose: () => {}
  });

  bindGlobal();

  // Spielstand?
  if (Store.load()) {
    document.getElementById('btn-continue').hidden = false;
  }
  showScreen('screen-start');
}

// ===== Start-Actions ======
function bindGlobal() {
  document.getElementById('btn-new-game').onclick = () => openIntro();
  document.getElementById('btn-continue').onclick = () => enterMain();
  document.getElementById('btn-about').onclick = () => showScreen('screen-about');
  document.getElementById('btn-about-close').onclick = () => showScreen('screen-start');

  // Intro
  buildIntroForm();
  document.getElementById('btn-start-game').onclick = startGame;

  // Weekend
  document.getElementById('btn-weekend-next').onclick = advanceWeek;

  // Reflection
  document.getElementById('btn-reflection-next').onclick = finishReflection;

  // Algo-Panel
  document.getElementById('btn-algo-panel').onclick = openAlgoPanel;
  document.getElementById('btn-algo-close').onclick = () => showScreen('screen-main');

  // Guilds
  document.getElementById('btn-guilds').onclick = openGuilds;
  document.getElementById('btn-guilds-close').onclick = () => showScreen('screen-main');

  // Settings
  document.getElementById('btn-settings').onclick = () => showScreen('screen-settings');
  document.getElementById('btn-settings-close').onclick = () => showScreen('screen-main');
  document.getElementById('btn-reset').onclick = () => {
    if (confirm('Spielstand wirklich löschen?')) {
      Store.reset();
      location.reload();
    }
  };
  document.getElementById('btn-save-export').onclick = () => {
    const blob = new Blob([Store.exportJson()], { type: 'application/json' });
    downloadBlob(blob, 'streem-save.json');
  };
  document.getElementById('btn-show-wrapped-now').onclick = () => {
    showScreen('screen-wrapped');
    renderWrapped(() => showScreen('screen-sandbox') | renderSandbox(() => showScreen('screen-main')),
                  () => showScreen('screen-manifest') | renderManifestForm());
  };
  document.getElementById('btn-show-sandbox-now').onclick = () => {
    showScreen('screen-sandbox');
    renderSandbox(() => showScreen('screen-main'));
  };

  // Profile Button (klein)
  document.getElementById('btn-profile').onclick = openProfileModal;

  // Bottom-Nav
  document.querySelectorAll('.navbtn').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.navbtn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      renderFeed(b.dataset.view);
    };
  });

  // Manifest
  document.getElementById('btn-manifest-back').onclick = () => showScreen('screen-main');
  document.getElementById('btn-export-manifest').onclick = exportManifest;
}

// ===== Intro / Charakter-Erstellung =====
const INTERESTS = [
  { k: 'gaming', label: 'Gaming' },
  { k: 'musik', label: 'Musik' },
  { k: 'lifestyle', label: 'Lifestyle' },
  { k: 'sport', label: 'Sport' },
  { k: 'wissenschaft', label: 'Wissenschaft' },
  { k: 'klima', label: 'Klima' },
  { k: 'politik-mitte', label: 'Politik' },
  { k: 'humor', label: 'Humor' },
  { k: 'feminismus', label: 'Feminismus' },
  { k: 'true-crime', label: 'True Crime' }
];

function buildIntroForm() {
  // Avatare
  const ap = document.getElementById('avatar-picker');
  ap.innerHTML = '';
  let chosenAvatar = 0;
  for (let i = 0; i < 12; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = avatarSvg(i);
    if (i === 0) b.classList.add('selected');
    b.onclick = () => {
      ap.querySelectorAll('button').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      chosenAvatar = i;
    };
    b.dataset.idx = i;
    ap.appendChild(b);
  }

  const ig = document.getElementById('interest-grid');
  ig.innerHTML = '';
  const chosen = new Set();
  for (const t of INTERESTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t.label;
    b.onclick = () => {
      if (chosen.has(t.k)) { chosen.delete(t.k); b.classList.remove('selected'); }
      else if (chosen.size < 4) { chosen.add(t.k); b.classList.add('selected'); }
    };
    ig.appendChild(b);
  }

  // Merker — über window scope, damit startGame es findet
  window.__introState = { get avatar() { return chosenAvatar; }, get interests() { return [...chosen]; } };
}

function openIntro() { showScreen('screen-intro'); }

function startGame() {
  const name = document.getElementById('inp-name').value.trim() || 'Alex';
  const pronoun = document.getElementById('inp-pronoun').value;
  const avatar = window.__introState.avatar;
  const interests = window.__introState.interests.length ? window.__introState.interests : ['lifestyle','humor'];
  Store.start({ name, pronoun, avatar, interests_initial: interests, city: 'Greifshafen' });
  enterMain();
  toast('Willkommen bei Streem!', { long: true });
}

// ===== Main-Loop =====
function enterMain() {
  showScreen('screen-main');
  updateTopbar();
  renderFeed('feed');
  maybeUnlockForWeek();
}

function updateTopbar() {
  const ind = document.getElementById('week-indicator');
  const w = Store.data.currentWeek;
  ind.textContent = `W ${w} · Tag ${Store.getDay()}`;
  document.getElementById('btn-algo-panel').hidden = !Store.isUnlocked('algorithm_panel');
  document.getElementById('btn-guilds').hidden = !Store.isUnlocked('discord');
}

function maybeUnlockForWeek() {
  const w = Store.data.currentWeek;
  const weekDef = DATA.weeks.weeks[w];
  if (!weekDef) return;
  for (const u of weekDef.unlock || []) Store.unlock(u);
  updateTopbar();
}

function handleWeekEnd(seenIds) {
  // End-of-week: Events triggern, Wrapped-Card zeigen
  const week = Store.data.currentWeek;
  const eventResults = triggerWeekEvents(week);
  const badges = checkBadges();
  Store.endWeek(seenIds);
  maybeUnlockForWeek();
  showWeekendCard(week, eventResults, badges);
}

function showWeekendCard(weekNum, eventResults, badges) {
  const title = document.getElementById('weekend-title');
  const stats = document.getElementById('weekend-stats');
  const story = document.getElementById('weekend-story');

  title.textContent = `Wochenrückblick · Woche ${weekNum}`;
  const d = Store.data;

  // Statistiken — Δ aus letztem Snapshot
  const lastTwoSnaps = d.history.slice(-2).map(h => h.profileSnapshot);
  const prev = lastTwoSnaps[0];
  const now = lastTwoSnaps[lastTwoSnaps.length - 1] || d.userProfile;

  const followedDelta = (now?.followed?.length || 0) - (prev?.followed?.length || 0);
  const topInterest = Object.entries(now?.interests || {}).sort((a,b)=>b[1]-a[1])[0];
  const leanDelta = (now?.political_lean_estimated || 0) - (prev?.political_lean_estimated || 0);

  stats.innerHTML = `
    <div class="stat"><div class="num">${d.userProfile.followed.length}</div><div class="lbl">du folgst</div><div class="delta ${followedDelta>=0?'up':'down'}">${followedDelta>=0?'+':''}${followedDelta}</div></div>
    <div class="stat"><div class="num">${(d.history[d.history.length-1]?.actions||[]).length}</div><div class="lbl">Interaktionen</div></div>
    <div class="stat"><div class="num">${topInterest ? topInterest[0] : '—'}</div><div class="lbl">Top-Thema</div></div>
    <div class="stat"><div class="num">${(d.userProfile.political_lean_estimated).toFixed(2)}</div><div class="lbl">Lean</div><div class="delta">${leanDelta>=0?'+':''}${leanDelta.toFixed(2)}</div></div>
  `;

  let storyHtml = '';
  // Events
  for (const r of eventResults) {
    const e = r.event, res = r.result;
    if (res.kind === 'invite') {
      const g = getGuildById(e.guildId);
      storyHtml += `<div class="invite-card ${g?.type === 'radical' ? 'radical' : ''}">
        <h4>${escapeHtml(e.title)}</h4>
        <p>${escapeHtml(e.body)}</p>
        <button class="btn btn-primary" data-open-guild="${g?.id}">Zur Gilde</button>
      </div>`;
    }
    if (res.kind === 'shitstorm' && res.outcome) {
      storyHtml += `<div class="viral-card ${res.outcome.kind?.startsWith('positive') ? 'positive' : ''}">
        <h4>${escapeHtml(res.outcome.title)}</h4>
        <p>${escapeHtml(res.outcome.body)}</p>
      </div>`;
    }
    if (res.kind === 'deepfake') {
      storyHtml += `<div class="event-card"><h4>Deepfake im Umlauf</h4>
        <p>Ein Video der OB kursiert. Der Faktencheck widerspricht. Dein Feed wird sich gleich streiten.</p></div>`;
    }
    if (res.kind === 'hate_incident') {
      storyHtml += `<div class="event-card"><h4>Eskalation</h4>
        <p>In einer deiner Gilden läuft gerade etwas aus dem Ruder.</p>
        <button class="btn btn-primary" id="open-hate">Hinschauen</button></div>`;
    }
    if (res.kind === 'election_start') {
      storyHtml += `<div class="event-card"><h4>Wahlkampf beginnt</h4>
        <p>Vier Parteien. Dein Feed wird sie sehr unterschiedlich zeigen.</p></div>`;
    }
    if (res.kind === 'election_vote') {
      storyHtml += `<div class="event-card"><h4>Wahl-Tag</h4>
        <p>Du kannst deine Stimme abgeben — und sehen, wie dein Feed dich beeinflusst hat.</p>
        <button class="btn btn-primary" id="open-election">Zur Wahl</button></div>`;
    }
  }

  // Badges
  for (const bt of badges) {
    storyHtml += `<div class="badge-card">🏅 Neues Abzeichen: <strong>${escapeHtml(bt)}</strong></div>`;
  }

  // Story-Intro für nächste Woche
  const nextWeekDef = DATA.weeks.weeks[weekNum + 1];
  if (nextWeekDef) {
    storyHtml += `<div class="event-card">
      <h4>Woche ${weekNum + 1}: ${escapeHtml(nextWeekDef.title)}</h4>
      <p>${escapeHtml(nextWeekDef.intro)}</p>
    </div>`;
  }

  story.innerHTML = storyHtml;

  // Reflections?
  const weekDef = DATA.weeks.weeks[weekNum];
  const btn = document.getElementById('btn-weekend-next');
  btn.textContent = (weekNum + 1 >= DATA.weeks.weeks.length) ? 'Jahresrückblick ansehen →' : 'Weiter';

  // Event-Buttons in story html
  showScreen('screen-weekend');
  story.querySelectorAll('[data-open-guild]').forEach(b => {
    b.onclick = () => { showScreen('screen-main'); setTimeout(openGuilds, 50); };
  });
  const hateBtn = document.getElementById('open-hate');
  if (hateBtn) hateBtn.onclick = openHateIncident;
  const electionBtn = document.getElementById('open-election');
  if (electionBtn) electionBtn.onclick = openElection;

  // Reflexions-Momente
  if (weekDef?.unlock?.includes('reflection_half1')) queueReflection('halftime');
  if (weekDef?.unlock?.includes('reflection_mid')) queueReflection('mid');
}

let pendingReflection = null;
function queueReflection(which) {
  pendingReflection = which;
}

function advanceWeek() {
  // Wrapped?
  if (Store.data.currentWeek >= DATA.weeks.weeks.length) {
    showScreen('screen-wrapped');
    renderWrapped(
      () => { showScreen('screen-sandbox'); renderSandbox(() => { showScreen('screen-main'); renderFeed('feed'); }); },
      () => { showScreen('screen-manifest'); renderManifestForm(); }
    );
    return;
  }
  if (pendingReflection) {
    openReflection(pendingReflection);
    return;
  }
  enterMain();
}

// ===== Reflexionen =====
function openReflection(which) {
  const intros = {
    halftime: 'Du bist jetzt ein paar Wochen auf Streem. Bevor es weitergeht: kurzer Moment für dich.',
    mid: 'Zweites Drittel geschafft. Das Spiel wird intensiver — lohnt sich, kurz innezuhalten.',
    final: 'Letzter Blick zurück, bevor der Jahresrückblick startet.'
  };
  document.getElementById('reflection-title').textContent = 'Reflexion';
  document.getElementById('reflection-intro').textContent = intros[which] || '';

  const qs = {
    halftime: [
      'Was hat dich heute überrascht?',
      'Welche Muster hast du in deinem Feed erkannt?',
      'Was würdest du in deinem echten Leben anders machen?'
    ],
    mid: [
      'Welche Inhalte sind dir im zweiten Drittel aufgefallen?',
      'Hast du bemerkt, dass dein Feed anders geworden ist?',
      'Was denkst du gerade über Algorithmen?'
    ]
  };
  const container = document.getElementById('reflection-questions');
  container.innerHTML = '';
  for (const q of qs[which] || []) {
    const label = document.createElement('label');
    label.innerHTML = `<span>${escapeHtml(q)}</span><textarea data-q="${escapeHtml(q)}"></textarea>`;
    container.appendChild(label);
  }
  container.dataset.which = which;
  showScreen('screen-reflection');
}

function finishReflection() {
  const container = document.getElementById('reflection-questions');
  const which = container.dataset.which;
  const answers = {};
  container.querySelectorAll('textarea').forEach(t => answers[t.dataset.q] = t.value);
  Store.data.reflections[which] = answers;
  Store.save();
  pendingReflection = null;
  enterMain();
}

// ===== Algo-Panel =====
function openAlgoPanel() {
  const body = document.getElementById('algo-panel-body');
  const p = Store.data.userProfile;
  const tags = Object.entries(p.interests)
    .sort((a,b)=>b[1]-a[1])
    .filter(([,v])=>v>0.02)
    .slice(0,8);

  let html = `
    <div class="algo-section">
      <h3>Deine 3 wichtigsten Interessen laut System</h3>
      <div class="tag-bars">
        ${tags.slice(0,8).map(([k,v]) => `
          <div class="tag-bar-row">
            <span class="lbl">${escapeHtml(k)}</span>
            <div class="tag-bar"><div class="tag-bar-fill" style="width:${Math.round(v*100)}%"></div></div>
            <span>${Math.round(v*100)}%</span>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="algo-section">
      <h3>Politische Einschätzung</h3>
      <div class="algo-lean">
        <span>links</span>
        <div class="lean-track"><div class="lean-dot" style="left:${Math.round((p.political_lean_estimated+1)*50)}%"></div></div>
        <span>rechts</span>
      </div>
      <p class="muted small">${p.political_lean_estimated.toFixed(2)} · geschätzt aus deinen Interaktionen.</p>
    </div>
    <div class="algo-section">
      <h3>Anzeigen-Targeting</h3>
      <div class="ads-target">
        Du giltst als: <strong>${describeAudience(p)}</strong>.<br/>
        Empörungs-Toleranz: <strong>${Math.round(p.outrage_tolerance*100)}%</strong>.<br/>
        Stummgeschaltet: ${p.muted.length} Accounts. · Du folgst: ${p.followed.length}.
      </div>
    </div>
    <div class="algo-section">
      <h3>Aktive Algorithmus-Gewichte</h3>
      <div class="tag-bars">
        ${Object.entries(Store.data.weights).map(([k,v])=>`
          <div class="tag-bar-row">
            <span class="lbl">${k}</span>
            <div class="tag-bar"><div class="tag-bar-fill" style="width:${Math.min(100, Math.round(v*60))}%"></div></div>
            <span>${Number(v).toFixed(2)}</span>
          </div>
        `).join('')}
      </div>
      <p class="muted small">Ab Tag 3 kannst du diese Gewichte in der Sandbox verändern.</p>
    </div>
  `;
  body.innerHTML = html;
  showScreen('screen-algo');
}

function describeAudience(profile) {
  const labels = [];
  if (profile.political_lean_estimated > 0.3) labels.push('politisch rechts der Mitte');
  else if (profile.political_lean_estimated < -0.3) labels.push('politisch links der Mitte');
  else labels.push('politisch Mitte');
  if (profile.interests.gaming > 0.3) labels.push('Gaming-Segment');
  if (profile.interests.klima > 0.3) labels.push('nachhaltig');
  if (profile.interests.lifestyle > 0.4) labels.push('konsumfreudig');
  if (profile.interests.verschwoerung > 0.2) labels.push('empfänglich für „alternative Erklärungen"');
  return labels.join(', ') || 'Allgemein';
}

// ===== Gilden =====
function openGuilds() {
  const body = document.getElementById('guilds-body');
  const list = getGuildList();
  const invited = Store.data.guildInvites || [];
  const memberships = Store.data.guildMemberships || [];

  let html = '<div class="guild-list">';
  for (const g of list) {
    const isInvited = invited.includes(g.id) || memberships.includes(g.id);
    if (!isInvited) continue;
    html += `<div class="guild-card ${g.type === 'radical' ? 'radical' : ''}">
      <div>
        <div class="name">${escapeHtml(g.name)}${memberships.includes(g.id) ? ' · <span class="verified">beigetreten</span>' : ''}</div>
        <div class="desc">${escapeHtml(g.desc)}</div>
      </div>
      <button class="btn btn-ghost join-btn" data-guild="${g.id}">Öffnen</button>
    </div>`;
  }
  html += '</div><div id="guild-chat-slot"></div>';
  if (!invited.length) html = '<p class="muted">Du hast noch keine Einladungen bekommen. Spiele weiter.</p>';
  body.innerHTML = html;
  body.querySelectorAll('[data-guild]').forEach(b => {
    b.onclick = () => openGuildChat(b.dataset.guild);
  });
  showScreen('screen-guilds');
}

async function openGuildChat(id) {
  const g = getGuildById(id);
  if (!g) return;
  // Trigger warning für radikale Gilden
  if (g.type === 'radical' && g.trigger_warning) {
    const { askWarning } = await import('./warnings.js');
    const r = await askWarning(g.trigger_warning);
    if (!r.show) return;
  }
  const slot = document.getElementById('guild-chat-slot');
  slot.innerHTML = `<div class="guild-chat">
    ${g.messages.map(m => {
      if (m.who === 'system') return `<div class="chat-msg system">${escapeHtml(m.text)}</div>`;
      return `<div class="chat-msg"><span class="who">@${escapeHtml(m.who)}</span><span>${escapeHtml(m.text)}</span></div>`;
    }).join('')}
  </div>
  <div class="chat-reactions">
    ${g.choices.map(c => `<button class="btn btn-ghost" data-choice="${c.id}">${escapeHtml(c.text)}</button>`).join('')}
  </div>`;
  slot.querySelectorAll('[data-choice]').forEach(b => {
    b.onclick = () => {
      const choice = g.choices.find(c => c.id === b.dataset.choice);
      applyGuildReaction(g.id, choice.id, choice);
      toast('Reaktion gespeichert.');
      openGuilds();
    };
  });
}

function openHateIncident() {
  const data = getHateIncidentData();
  const body = document.getElementById('guilds-body');
  body.innerHTML = `
    <h3>Eskalation in „Echte Werte"</h3>
    <div class="guild-chat">
      ${data.chat.map(m => `<div class="chat-msg"><span class="who">@${escapeHtml(m.who)}</span><span>${escapeHtml(m.text)}</span></div>`).join('')}
    </div>
    <div class="chat-reactions">
      ${data.choices.map(c => `<button class="btn btn-ghost" data-choice="${c.id}">${escapeHtml(c.text)}</button>`).join('')}
    </div>
  `;
  body.querySelectorAll('[data-choice]').forEach(b => {
    b.onclick = () => {
      const choice = data.choices.find(c => c.id === b.dataset.choice);
      applyGuildReaction('echte_werte', choice.id, choice);
      toast('Reaktion gespeichert.');
      showScreen('screen-main');
    };
  });
  showScreen('screen-guilds');
}

// ===== Wahl =====
function openElection() {
  const parties = getParties();
  const res = Store.data.electionData;
  const body = document.getElementById('election-body');
  body.innerHTML = `
    <p class="muted">Wen willst du wählen? Die Parteien, wie dein Feed sie dir gezeigt hat:</p>
    <div class="party-grid">
      ${parties.map(p => {
        const cov = estimateCoverageFor(p);
        return `
        <div class="party-card">
          <div class="name">${escapeHtml(p.name)}</div>
          <div class="slogan">„${escapeHtml(p.slogan)}"</div>
          <div class="coverage">In deinem Feed: ${cov}</div>
          <div class="party-vote-bar">
            <button class="btn btn-primary" data-vote="${p.id}">Für ${escapeHtml(p.name)} stimmen</button>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div id="election-result-slot"></div>
  `;
  body.querySelectorAll('[data-vote]').forEach(b => {
    b.onclick = () => {
      Store.data.electionVote = b.dataset.vote;
      Store.save();
      showElectionResult();
    };
  });
  showScreen('screen-election');
}

function estimateCoverageFor(party) {
  // Abschätzung: wie oft tauchte diese Richtung im User-Feed auf?
  const seen = Store.data.history.flatMap(h => h.feedSeen || []);
  const posts = DATA.posts.posts.filter(p => seen.includes(p.id));
  let close = 0, total = 0;
  for (const p of posts) {
    if (p.political_lean === undefined) continue;
    total++;
    if (Math.abs(p.political_lean - party.lean) < 0.25) close++;
  }
  if (!total) return 'kaum Daten';
  const pct = Math.round(close / total * 100);
  if (pct > 40) return `<strong>sehr präsent</strong> (~${pct}% deiner politischen Posts)`;
  if (pct > 20) return `spürbar (~${pct}%)`;
  if (pct > 5) return `am Rand (~${pct}%)`;
  return 'so gut wie unsichtbar';
}

function showElectionResult() {
  const slot = document.getElementById('election-result-slot');
  const data = Store.data.electionData;
  if (!data) return;
  const voted = Store.data.electionVote;
  const parties = getParties();
  const votedName = parties.find(p => p.id === voted)?.name || 'keine';
  slot.innerHTML = `
    <h3>Du hast für: ${escapeHtml(votedName)}</h3>
    <p class="muted small">Das fiktive Ergebnis in Greifshafen — links das objektive Ergebnis, rechts das, was dein Feed dir vermittelt hat:</p>
    <div class="wrapped-bars">
      ${data.objective.map((p, i) => {
        const pc = data.perceived[i];
        const obj = Math.round(p.share*100);
        const per = Math.round(pc.perceived*100);
        return `
          <div class="row">
            <span class="lbl">${escapeHtml(p.name)}</span>
            <div class="bar"><div class="fill" style="width:${obj}%"></div></div>
            <span>${obj}%</span>
          </div>
          <div class="row">
            <span class="lbl muted">in deinem Feed</span>
            <div class="bar"><div class="fill" style="width:${per}%;background:linear-gradient(90deg,var(--warn),var(--accent))"></div></div>
            <span>${per}%</span>
          </div>
        `;
      }).join('')}
    </div>
    <button class="btn btn-primary" id="btn-elec-close" style="margin-top:14px">Zurück</button>
  `;
  slot.querySelector('#btn-elec-close').onclick = () => showScreen('screen-main');
}

// ===== Profile-Modal (kleine Variante) =====
function openProfileModal() {
  const c = Store.data.character;
  const profile = Store.data.userProfile;
  const body = document.createElement('div');
  body.className = 'profile-box';
  body.innerHTML = `
    <div class="big-avatar">${avatarSvg(c.avatar || 0)}</div>
    <h2 style="text-align:center;margin:0">${escapeHtml(c.name)}</h2>
    <p class="muted small" style="text-align:center">${escapeHtml(c.pronoun || '')} · ${escapeHtml(c.city)}</p>
    <p class="muted small" style="text-align:center">Woche ${Store.data.currentWeek} · Tag ${Store.getDay()}</p>
    <div class="stat-row" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0">
      <div class="stat"><div class="num">${profile.followed.length}</div><div class="lbl">folgst du</div></div>
      <div class="stat"><div class="num">${Store.data.ownPosts.length}</div><div class="lbl">Posts</div></div>
      <div class="stat"><div class="num">${Store.data.badges.length}</div><div class="lbl">Badges</div></div>
    </div>
    <button class="btn btn-primary" id="profile-close">Schließen</button>
  `;
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.appendChild(body);
  document.body.appendChild(overlay);
  body.querySelector('#profile-close').onclick = () => overlay.remove();
}

// ===== Manifest =====
function renderManifestForm() {
  const fields = document.getElementById('manifest-fields');
  fields.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const l = document.createElement('label');
    l.innerHTML = `<span>Leitsatz ${i}</span><textarea data-i="${i}" placeholder="z.B. „Ich verlasse Apps, die mich wütend machen."">${Store.data.reflections.manifest?.[i] || ''}</textarea>`;
    fields.appendChild(l);
  }
}

function exportManifest() {
  const vals = {};
  document.querySelectorAll('#manifest-fields textarea').forEach(t => vals[t.dataset.i] = t.value);
  Store.data.reflections.manifest = vals;
  Store.save();
  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><title>Mein Medien-Manifest</title>
<style>
  body { font-family: -apple-system, "Segoe UI", sans-serif; max-width: 640px; margin: 2rem auto; padding: 1rem; color: #222; }
  h1 { color: #c026d3; }
  ol li { margin: 1rem 0; font-size: 18px; }
  .foot { color: #666; font-size: 14px; margin-top: 2rem; border-top: 1px solid #ddd; padding-top: 1rem; }
</style></head>
<body>
  <h1>Mein Medien-Manifest</h1>
  <p><em>Geschrieben nach der Projektwoche „Der Algorithmus" von ${escapeHtml(Store.data.character.name)}</em></p>
  <ol>
    ${[1,2,3,4,5].map(i => `<li>${escapeHtml(vals[i] || '(leer)')}</li>`).join('')}
  </ol>
  <div class="foot">
    <p><strong>Hilfreiche Anlaufstellen:</strong></p>
    <ul>
      <li>bpb.de — Bundeszentrale für politische Bildung</li>
      <li>klicksafe.de — Infos für sichere Mediennutzung</li>
      <li>hateaid.org — Hilfe bei digitaler Gewalt</li>
      <li>beratung-gegen-rechtsextremismus.de</li>
      <li>Telefonseelsorge: 0800 111 0 111 (kostenlos, 24/7)</li>
    </ul>
  </div>
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html' });
  downloadBlob(blob, 'medien-manifest.html');
  toast('Manifest exportiert.', { long: true });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 500);
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ===== Go =====
boot();

})();

})();

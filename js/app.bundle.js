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
    meta: { version: 2, createdAt: now, lastSavedAt: now, day: 1 },
    character: { name: 'Alex', pronoun: 'sie/ihr', avatar: 0, interests_initial: [], city: 'Greifshafen', bio: '', protagonist: 'alex' },
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
    weekFeedCache: {},
    postReplies: {},
    commentSelections: {},
    likedPosts: {},
    sharedPosts: {},
    initialProfileSnapshot: null,
    dmThreads: {},
    dmReplies: {},
    dmUnread: 0,
    npcArcs: { lea_close: 0, finn_path: 0, mira_close: 0, self_aware: 0 },
    storiesViewed: {},
    placesVisited: {},
    soundEnabled: true,
    theme: 'dark',
    challengeMode: null,
    minigameResults: {},
    ending: null,
    placeEvents: {},
    microReflections: {},
    ownPostReplies: {},
    pushNotificationsSeen: {},
    tutorialDone: false,
    trendingViewed: {},
    conceptsSeen: {},
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
    // Snapshot des Start-Profils für die Sandbox-Vergleichs-Simulation.
    this.data.initialProfileSnapshot = structuredClone(this.data.userProfile);
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
    if (!this.data.seenPosts.includes(postId)) {
      this.data.seenPosts.push(postId);
    }
    if (!this.data.postReplies) this.data.postReplies = {};
    if (type === 'comment' || type === 'angry_comment') {
      if (!this.data.postReplies[postId]) this.data.postReplies[postId] = [];
      this.data.postReplies[postId].push({ type, week: this.data.currentWeek, ts: Date.now() });
    }
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

  cacheWeekFeed(weekNum, postIds) {
    if (!this.data.weekFeedCache) this.data.weekFeedCache = {};
    this.data.weekFeedCache[weekNum] = postIds.slice();
    this.save();
  },

  getWeekFeedCache(weekNum) {
    return this.data.weekFeedCache?.[weekNum] || null;
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
 * Mischung aus Summe (mehr Treffer = besser) und Max (ein Top-Tag schlägt durch).
 * @returns {number} 0..1
 */
function affinity(post, profile) {
  const tags = post.tags || [];
  if (!tags.length) return 0.1;
  let sum = 0, max = 0;
  for (const t of tags) {
    const v = profile.interests[t] || 0;
    sum += v;
    if (v > max) max = v;
  }
  return clamp(0.5 * max + 0.5 * Math.min(1, sum), 0, 1);
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
 * Recency: jüngere Posts höher gewichten.
 * weekOffset = wie viele Wochen alt (0 = aktuell). Fehlt der Wert,
 * wird der Post als "frisch" behandelt (≈ 1).
 */
function recency(post) {
  const age = Math.max(0, post.weekOffset || 0);
  return Math.exp(-age * 0.45);
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
 * Spreizt den im Datensatz oft flachen quality_score, damit der Slider
 * "Qualitäts-Bonus" sichtbar differenziert. Empörung + Engagement-Bait
 * drücken die wahrgenommene Qualität, ein Artikel-Anhang hebt sie.
 */
function qualityBonus(post) {
  let q = post.quality_score;
  if (q === undefined || q === null) q = 0.5;
  q -= 0.45 * (post.outrage_score || 0);
  q -= 0.2 * (post.engagement_bait_score || 0);
  if (post.article) q += 0.15;
  return clamp(q, 0, 1);
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
    // Fokus auf "Überspringen" (sichere Default-Aktion).
    setTimeout(() => skip.focus(), 30);

    const onKey = (e) => {
      if (e.key === 'Escape') finish(false);
    };
    const finish = (showIt) => {
      Store.data.contentWarningsAccepted[twKey] =
        (Store.data.contentWarningsAccepted[twKey] || { shown: 0, skipped: 0 });
      Store.data.contentWarningsAccepted[twKey][showIt ? 'shown' : 'skipped']++;
      Store.save();
      overlay.hidden = true;
      skip.onclick = null;
      show.onclick = null;
      document.removeEventListener('keydown', onKey);
      resolve({ show: showIt });
    };
    document.addEventListener('keydown', onKey);
    skip.onclick = () => finish(false);
    show.onclick = () => finish(true);
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
let DYNAMIC_HOOK = null;

function setCharacters(list) {
  CHAR_MAP = new Map();
  for (const c of list) CHAR_MAP.set(c.id, c);
}

// Anderer Modul (typischerweise main.js) kann eine Funktion registrieren, die
// den dynamischen Charakter-Zustand (Bio nach NPC-Arc) nachschiebt.
// Ohne Hook bleibt das Verhalten unverändert.
function setDynamicHook(fn) {
  DYNAMIC_HOOK = typeof fn === 'function' ? fn : null;
}

function getCharacter(id) {
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
function avatarSvg(seed = 0) {
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
  __M.setDynamicHook = setDynamicHook;
  __M.getCharacter = getCharacter;
  __M.avatarSvg = avatarSvg;
  __M.memeSvg = memeSvg;
})();

// ===== sound.js =====
(function(){
  var Store = __M.Store;
// sound.js — Mini-Synth über WebAudio. Keine externen Audio-Files,
// damit die file://-Auslieferung funktioniert.

let ctx = null;
function ensureCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch (e) { return null; }
  return ctx;
}

function enabled() {
  if (!Store.data) return false;
  return Store.data.soundEnabled !== false;
}

function beep({ freq = 440, duration = 0.08, type = 'sine', volume = 0.15, attack = 0.005, release = 0.05 } = {}) {
  if (!enabled()) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration + release);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + duration + release + 0.01);
}

const SFX = {
  like()    { beep({ freq: 880, duration: 0.06, type: 'sine', volume: 0.18 });
              setTimeout(() => beep({ freq: 1320, duration: 0.05, type: 'sine', volume: 0.14 }), 50); },
  share()   { beep({ freq: 660, duration: 0.05, type: 'triangle', volume: 0.14 }); },
  swipe()   { beep({ freq: 220, duration: 0.04, type: 'sine', volume: 0.08 }); },
  dm()      { beep({ freq: 520, duration: 0.07, type: 'triangle', volume: 0.18 });
              setTimeout(() => beep({ freq: 392, duration: 0.07, type: 'triangle', volume: 0.14 }), 70); },
  badge()   { [523, 659, 784].forEach((f, i) => setTimeout(() => beep({ freq: f, duration: 0.12, type: 'triangle', volume: 0.18 }), i * 90)); },
  toast()   { beep({ freq: 330, duration: 0.04, type: 'sine', volume: 0.08 }); },
  error()   { beep({ freq: 180, duration: 0.18, type: 'sawtooth', volume: 0.12 }); },
  weekend() { [392, 523, 659].forEach((f, i) => setTimeout(() => beep({ freq: f, duration: 0.16, type: 'sine', volume: 0.16 }), i * 110)); }
};

function setSoundEnabled(enabled) {
  if (!Store.data) return;
  Store.data.soundEnabled = !!enabled;
  Store.save();
}

  __M.SFX = SFX;
  __M.setSoundEnabled = setSoundEnabled;
})();

// ===== modals.js =====
(function(){
// modals.js — Konsistente Modal-Mechanik (ESC, Backdrop, Focus-Trap).
// Statt jedes Modul rollt das selbst, nutzen es alle neuen Overlays gleich.

const TRAPPED = [];

function getFocusable(root) {
  return Array.from(root.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.hidden && el.offsetParent !== null);
}

function onKey(e) {
  if (!TRAPPED.length) return;
  const top = TRAPPED[TRAPPED.length - 1];
  if (e.key === 'Escape') { e.preventDefault(); top.close(); return; }
  if (e.key !== 'Tab') return;
  const items = getFocusable(top.el);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus();
  }
}
document.addEventListener('keydown', onKey, true);

/**
 * Macht ein Overlay-Element zu einem barrierearmen Modal:
 *  - role="dialog" / aria-modal
 *  - ESC schließt
 *  - Klick auf Backdrop schließt (nur direktes Overlay-Target)
 *  - Tab bleibt innerhalb
 *  - vorheriger Fokus wird wiederhergestellt
 */
function attachModal(overlay, { onClose, initialFocus } = {}) {
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const restoreFocus = document.activeElement;

  const handle = {
    el: overlay,
    close() {
      const idx = TRAPPED.indexOf(handle);
      if (idx >= 0) TRAPPED.splice(idx, 1);
      overlay.removeEventListener('click', onBackdrop);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (restoreFocus && typeof restoreFocus.focus === 'function') {
        try { restoreFocus.focus(); } catch (e) { /* ignore */ }
      }
      if (typeof onClose === 'function') onClose();
    }
  };
  function onBackdrop(e) {
    if (e.target === overlay) handle.close();
  }
  overlay.addEventListener('click', onBackdrop);
  TRAPPED.push(handle);

  // Initialer Fokus auf erstes interaktives Element.
  setTimeout(() => {
    const target = (typeof initialFocus === 'function' ? initialFocus(overlay) : initialFocus)
      || getFocusable(overlay)[0];
    if (target && typeof target.focus === 'function') {
      try { target.focus(); } catch (e) { /* ignore */ }
    }
  }, 30);

  return handle;
}

  __M.attachModal = attachModal;
})();

// ===== microreflect.js =====
(function(){
  var Store = __M.Store;
// microreflect.js — Eine-Frage-Reflexionen unmittelbar nach Wendepunkten.
// Anders als die geplanten 3-Fragen-Reflexionen sind diese unmittelbar nach
// dem Ereignis und haben nur eine einzige Frage. Antworten werden ins Save
// geschrieben und landen im Lehr-Bericht.

const PROMPTS = {
  marc_dm: {
    title: 'Kurzer Moment',
    intro: 'Marc — der „Stay Based"-Account — hat dich gerade angeschrieben.',
    question: 'Was war dein Bauchgefühl in dem Moment, als du die Nachricht gesehen hast?',
    placeholder: 'Stichworte reichen.'
  },
  hate_incident: {
    title: 'Kurzer Moment',
    intro: 'In der Gilde ist gerade etwas eskaliert. Lara Weiss wurde wüst beleidigt.',
    question: 'Wie hast du dich entschieden zu reagieren — und warum?',
    placeholder: 'Stichworte reichen.'
  },
  first_shitstorm: {
    title: 'Kurzer Moment',
    intro: 'Einer deiner Posts ist gerade viral gegangen.',
    question: 'Hat sich das gut angefühlt, schlecht — oder beides? Versuch das in einem Satz zu fassen.',
    placeholder: 'Stichworte reichen.'
  }
};

function maybeQueueMicroReflection(key) {
  if (!PROMPTS[key]) return false;
  if (Store.data.microReflections?.[key]) return false;
  showMicroReflection(key);
  return true;
}

function showMicroReflection(key) {
  const p = PROMPTS[key];
  if (!p) return;
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay micro-reflect';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="tw-box micro-box">
      <h3>${escapeHtml(p.title)}</h3>
      <p class="muted small">${escapeHtml(p.intro)}</p>
      <label class="micro-q">
        <span>${escapeHtml(p.question)}</span>
        <textarea id="micro-input" rows="3" placeholder="${escapeHtml(p.placeholder)}"></textarea>
      </label>
      <div class="tw-actions">
        <button class="btn btn-ghost" id="micro-skip">Überspringen</button>
        <button class="btn btn-primary" id="micro-save">Speichern</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const ta = overlay.querySelector('#micro-input');
  setTimeout(() => ta.focus(), 30);
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#micro-skip').onclick = () => {
    if (!Store.data.microReflections) Store.data.microReflections = {};
    Store.data.microReflections[key] = { skipped: true, week: Store.data.currentWeek, ts: Date.now() };
    Store.save();
    close();
  };
  overlay.querySelector('#micro-save').onclick = () => {
    if (!Store.data.microReflections) Store.data.microReflections = {};
    Store.data.microReflections[key] = {
      answer: ta.value.trim(),
      week: Store.data.currentWeek,
      ts: Date.now(),
      question: p.question
    };
    Store.save();
    close();
  };
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

  __M.maybeQueueMicroReflection = maybeQueueMicroReflection;
})();

// ===== postreplies.js =====
(function(){
  var Store = __M.Store;
// postreplies.js — Generiert NPC-Antworten auf eigene User-Posts.
// Aufgerufen am Wochen-Ende für alle Posts der gerade beendeten Woche,
// damit die Antworten in der darauffolgenden Woche im Notifications-Tab auftauchen.

// Tag → Liste plausibler Reaktionen [author, text, stance]
const REPLY_POOL = {
  'klima': [
    ['char_mira',    'danke fürs Posten. wenn wir leise bleiben, hört uns niemand.', 'support'],
    ['char_bens',    'schon wieder klimathema. langsam wird das zur sekte.',        'pushback'],
    ['char_tariq',   'die zahlen dazu sind nicht so eindeutig, wie es klingt — quelle?', 'curious'],
    ['char_sophia',  'sauber differenziert. teile ich.',                            'support']
  ],
  'politik-links': [
    ['char_mira',    'genau. weiter so.',                                           'support'],
    ['char_bens',    'naive sichtweise. ihr versteht die wirtschaft nicht.',        'pushback'],
    ['char_noah',    'sehe ich anders, aber gut formuliert.',                       'curious']
  ],
  'politik-rechts': [
    ['char_bens',    'endlich sagt mal jemand was.',                                'support'],
    ['char_mira',    'das ist gefährlich. überleg, was du da reproduzierst.',       'pushback'],
    ['char_marla',   'mit dem framing arbeitet auch die afd. bewusst?',             'curious']
  ],
  'politik-mitte': [
    ['char_buerger', 'pragmatisch — danke.',                                        'support'],
    ['char_mira',    'mitte ist auch eine entscheidung.',                           'pushback']
  ],
  'wissenschaft': [
    ['char_tariq',   'guter punkt. methodisch sauber gedacht.',                     'support'],
    ['char_sophia',  'an welcher studie hängst du das fest?',                       'curious'],
    ['char_nele',    'kann ich in der leserunde aufnehmen?',                        'support']
  ],
  'verschwoerung': [
    ['char_bens',    'ja. genau. nicht nachgeben.',                                 'support'],
    ['char_tariq',   'hast du dafür eine primärquelle? ernsthaft, ich frag.',       'curious'],
    ['char_marla',   'das ist ein bekanntes muster. bitte vorsicht.',               'pushback']
  ],
  'feminismus': [
    ['char_fem',     'danke. ich weiß nicht, wie oft das schon gesagt wurde, aber: danke.', 'support'],
    ['char_mira',    'stehe dahinter.',                                              'support'],
    ['char_redpill', 'klassisches victim narrative. langweilig.',                    'pushback']
  ],
  'anti-feminismus': [
    ['char_redpill', 'stark. so sieht das aus.',                                     'support'],
    ['char_fem',     'das brauchen wir nicht. wirklich nicht.',                      'pushback'],
    ['char_lea',     'ehrlich, das ist nicht du. dachte, wir wären weiter.',         'pushback']
  ],
  'hass': [
    ['char_fem',     'das melde ich. tut mir leid, dass du das sagst.',              'pushback'],
    ['char_lea',     'bitte nicht.',                                                 'pushback']
  ],
  'lifestyle': [
    ['char_lea',     'fühl ich. ist greifshafen halt.',                              'support'],
    ['char_jule',    'kommentier auch deine story. so wholesome.',                   'support']
  ],
  'humor': [
    ['char_jule',    'haha. genau das.',                                             'support'],
    ['char_finn',    'mein humor 100%.',                                             'support'],
    ['char_lea',     'der musste sein.',                                             'support']
  ],
  'gaming': [
    ['char_finn',    'pog. spielst du das wirklich noch?',                           'support'],
    ['char_moritz',  'queue heute abend?',                                           'support']
  ],
  'musik': [
    ['char_ana',     'gönn dir. an welcher stelle?',                                 'support'],
    ['char_jule',    'auf meine playlist.',                                          'support']
  ],
  'sport': [
    ['char_moritz',  'training morgen halb sechs. dabei?',                           'support']
  ],
  'true-crime': [
    ['char_tc',      'wir sind dran. mehr nächste woche.',                           'support'],
    ['char_marla',   'kurzer reminder: opferperspektive bleibt wichtig.',            'curious']
  ]
};

const GENERIC = [
  ['char_lea',    'gesehen.',         'support'],
  ['char_moritz', '👀',               'curious'],
  ['char_jule',   'hochgeladen.',     'support']
];

function pickFor(tags) {
  const candidates = [];
  for (const t of tags || []) {
    const arr = REPLY_POOL[t];
    if (arr) for (const r of arr) candidates.push(r);
  }
  if (!candidates.length) return GENERIC.slice();
  return candidates;
}

// Erzeugt 1-2 Reaktionen pro Post; deterministisch über post.ts.
function generateRepliesFor(ownPost) {
  const pool = pickFor(ownPost.tags);
  if (!pool.length) return [];
  const seed = (ownPost.ts || 0) ^ (ownPost.week || 0) ^ 0x9e3779b9;
  function rand(n) {
    let x = seed;
    return () => { x = (x * 16807) % 2147483647; return x % n; };
  }
  const r = rand(pool.length);
  const a = pool[r()];
  const out = [{ author: a[0], text: a[1], stance: a[2], ts: Date.now() }];
  if (pool.length > 1 && Math.random() > 0.4) {
    let b;
    let tries = 0;
    do { b = pool[r()]; tries++; } while (b[0] === a[0] && tries < 5);
    if (b[0] !== a[0]) out.push({ author: b[0], text: b[1], stance: b[2], ts: Date.now() + 1 });
  }
  return out;
}

// Am Wochen-Ende: für alle Posts der gerade beendeten Woche Antworten erzeugen
// und im Store unter ownPostReplies ablegen.
function generateRepliesForJustEndedWeek(weekJustEnded) {
  if (!Store.data.ownPostReplies) Store.data.ownPostReplies = {};
  for (const op of Store.data.ownPosts || []) {
    if (op.week !== weekJustEnded) continue;
    const key = `${op.week}_${op.ts || 0}`;
    if (Store.data.ownPostReplies[key]) continue;
    Store.data.ownPostReplies[key] = {
      week: weekJustEnded + 1,
      postSnippet: (op.text || '').slice(0, 120),
      replies: generateRepliesFor(op)
    };
  }
  Store.save();
}

function getRepliesForInbox() {
  const out = [];
  const all = Store.data.ownPostReplies || {};
  for (const [key, entry] of Object.entries(all)) {
    if (entry.week > Store.data.currentWeek) continue;
    out.push({ key, ...entry });
  }
  out.sort((a, b) => b.week - a.week);
  return out;
}

  __M.generateRepliesFor = generateRepliesFor;
  __M.generateRepliesForJustEndedWeek = generateRepliesForJustEndedWeek;
  __M.getRepliesForInbox = getRepliesForInbox;
})();

// ===== feed.js =====
(function(){
  var Store = __M.Store;
  var buildFeed = __M.buildFeed;
  var explainPost = __M.explainPost;
  var scorePost = __M.scorePost;
  var getCharacter = __M.getCharacter;
  var avatarSvg = __M.avatarSvg;
  var memeSvg = __M.memeSvg;
  var askWarning = __M.askWarning;
  var SFX = __M.SFX;
  var getRepliesForInbox = __M.getRepliesForInbox;
// feed.js — Feed-Rendering und Interaktionen.






let POSTS = [];
let ADS = [];
let WEEKS = [];
let STORIES = [];
let onWeekEnd = null;      // Callback wenn Woche zuende
let onOpenCompose = null;
let onOpenStory = null;
let currentFeed = [];      // Für Woche sichtbarer Feed

function initFeed(data) {
  POSTS = data.posts;
  ADS = data.ads;
  WEEKS = data.weeks;
  STORIES = data.stories || [];
}

// Fallback-Stories für Wochen ohne kuratierten Inhalt. Charaktere sind ihre
// üblichen Stamm-Themen, Texte sind generisch genug, dass sie zu jeder Woche passen.
const FALLBACK_STORIES = [
  { authorId: 'char_lea',    emoji: '☕', text: 'morgens. erstmal kaffee. wie immer.' },
  { authorId: 'char_finn',   emoji: '🎮', text: 'queue läuft. wenn ihr mich braucht: nicht.' },
  { authorId: 'char_jule',   emoji: '🎧', text: 'auf repeat seit gestern.' },
  { authorId: 'char_moritz', emoji: '🏃', text: 'training morgen. wer mit?' },
  { authorId: 'char_sara',   emoji: '🤖', text: 'kleiner code-fortschritt. großer schritt fürs werkzeug.' },
  { authorId: 'char_ana',    emoji: '🌊', text: 'hafen. fähre raus. ruhig.' },
  { authorId: 'char_noah',   emoji: '📖', text: 'gerade gelesen. denke nach.' },
  { authorId: 'char_tariq',  emoji: '🧪', text: 'die zahlen sagen was anderes als die schlagzeile.' }
];

// Stories-Bar: Stories aus den letzten 1-2 Wochen, deren Autor:in der User folgt
// oder die durch Wochenfortschritt freigeschaltet sind. Wenn keine kuratierten
// Stories existieren, füllen wir mit deterministischen Fallback-Stories auf,
// damit die Bar nie ganz leer ist.
function getActiveStories() {
  const w = Store.data.currentWeek;
  const curated = STORIES.filter(s => s.week <= w && s.week >= w - 1);
  if (curated.length >= 3) return curated;
  // Fallback: deterministisch über Wochen-Index 3 aus FALLBACK_STORIES wählen.
  const seed = w * 2654435761 >>> 0;
  const picks = [];
  for (let i = 0; i < 3 - curated.length; i++) {
    const idx = (seed + i * 134775813) % FALLBACK_STORIES.length;
    const f = FALLBACK_STORIES[idx];
    picks.push({ id: `fb_${w}_${i}`, author: f.authorId, week: w, text: f.text, emoji: f.emoji, _fallback: true });
  }
  return [...curated, ...picks];
}

// Trending-Hashtags pro Woche: aggregiert aus #-Vorkommen und dominanten
// Tags der gerade sichtbaren Posts. Liefert die 5 häufigsten.
function getTrendingHashtags() {
  const counts = new Map();
  const tagRe = /#[A-Za-zÄÖÜäöüß0-9_]{3,}/g;
  const candidates = POSTS.filter(p => isFeedEligible(p, Store.data));
  for (const p of candidates) {
    const matches = (p.text || '').match(tagRe) || [];
    for (const m of matches) counts.set(m, (counts.get(m) || 0) + 1);
  }
  // Plus thematische Pseudo-Hashtags aus dominanten Post-Tags.
  for (const p of candidates.slice(0, 30)) {
    for (const t of p.tags || []) {
      const key = '#' + t.replace(/[^a-zA-Z0-9]/g, '');
      if (!counts.has(key) && Math.random() < 0.4) counts.set(key, 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag, count]) => ({ tag, count }));
}

function setCallbacks({ onWeekEnd: wEnd, onOpenCompose: oc, onOpenStory: os }) {
  onWeekEnd = wEnd;
  onOpenCompose = oc;
  onOpenStory = os;
}

// Regex für Wahl-Kontext: ganze Wortgrenzen, mehrere Trigger.
const ELECTION_RE = /\b(wahl|wahllokal|wahlkampf|wahlurne|kandidat(?:in|en)?|stimm(?:e|en|zettel)|wahlplakat|wahlsieger|wahlergebnis|stimmabgabe)\b/i;

function isFeedEligible(p, d) {
  const tags = p.tags || [];
  if (d.currentWeek < 3 && (tags.includes('politik-rechts') || tags.includes('politik-links') || tags.includes('verschwoerung'))) return false;
  if (d.currentWeek < 5 && tags.includes('politik-rechts') && (p.outrage_score || 0) > 0.5) return false;
  if (d.currentWeek < 8 && tags.includes('hass')) return false;
  if (d.currentWeek < 10 && tags.includes('anti-feminismus')) return false;
  const isPolitical = tags.includes('politik-rechts') || tags.includes('politik-links') || tags.includes('politik-mitte');
  if (isPolitical && d.currentWeek < 19 && ELECTION_RE.test(p.text || '')) return false;
  if (d.seenPosts.includes(p.id)) return false;
  return true;
}

/**
 * Baut den Feed für die aktuelle Woche — mit Cache, damit Tab-Wechsel
 * den Feed nicht zerstört. Liked/Geteilt/Stummgeschaltet bleiben dabei
 * stabil zwischen Tab-Wechseln innerhalb einer Woche.
 */
function computeCurrentFeed(force = false) {
  const d = Store.data;
  const cached = !force ? Store.getWeekFeedCache(d.currentWeek) : null;
  if (cached && cached.length) {
    const map = new Map(POSTS.map(p => [p.id, p]));
    for (const a of ADS) map.set(a.id, { ...a, isAd: true });
    const fromCache = cached.map(id => map.get(id)).filter(Boolean);
    if (fromCache.length === cached.length) {
      currentFeed = fromCache;
      // Score-Breakdown für "Warum?"-Button nachreichen.
      attachBreakdownToCachedFeed(fromCache, d);
      return currentFeed;
    }
  }

  const eligible = POSTS.filter(p => isFeedEligible(p, d));

  // Bot-Accounts erst ab Bots-Unlock (W12).
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
  Store.cacheWeekFeed(d.currentWeek, currentFeed.map(p => p.id));
  return currentFeed;
}

// Reicht den Algo-Breakdown für den "Warum?"-Button nach, wenn der Feed aus
// dem Cache gerendert wird.
function attachBreakdownToCachedFeed(feed, d) {
  const recentTags = {};
  for (const p of feed) {
    const { total, parts } = scorePost({ ...p, weekOffset: 0 }, d.userProfile, d.weights, recentTags);
    p._algoBreakdown = parts;
    p._algoScore = total;
    for (const t of p.tags || []) recentTags[t] = (recentTags[t] || 0) + 1;
  }
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
    // Stories-Bar (oben, scrollbar).
    const stories = getActiveStories();
    if (stories.length) {
      const bar = document.createElement('div');
      bar.className = 'stories-bar';
      bar.setAttribute('role', 'list');
      for (const s of stories) {
        const c = getCharacter(s.author);
        const viewed = !!Store.data.storiesViewed?.[s.id];
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'story-item' + (viewed ? ' viewed' : '');
        item.setAttribute('aria-label', `Story von ${c?.name || s.author}`);
        item.innerHTML = `
          <div class="story-ring">
            <div class="avatar">${avatarSvg(c?.avatar || 0)}</div>
            <span class="story-emoji">${s.emoji || '·'}</span>
          </div>
          <div class="story-name">${escapeHtml((c?.name || '').split(' ')[0])}</div>
        `;
        item.onclick = () => {
          if (!Store.data.storiesViewed) Store.data.storiesViewed = {};
          Store.data.storiesViewed[s.id] = true;
          Store.save();
          item.classList.add('viewed');
          if (onOpenStory) onOpenStory(s);
        };
        bar.appendChild(item);
      }
      root.appendChild(bar);
    }

    const header = document.createElement('div');
    header.className = 'feed-header';
    header.innerHTML = `
      <h2>Woche ${d.currentWeek}: ${escapeHtml(w.title)}</h2>
      <p>${escapeHtml(w.intro)}</p>
    `;
    root.appendChild(header);

    // Trending-Bar (ab W3, wenn der Feed Inhalt hat).
    if (d.currentWeek >= 3) {
      const trending = getTrendingHashtags();
      if (trending.length) {
        const tb = document.createElement('div');
        tb.className = 'trending-bar';
        tb.innerHTML = `<span class="trending-label muted small">Trending in Greifshafen:</span>` +
          trending.map(t => `<button class="trending-tag" data-tag="${escapeHtml(t.tag)}">${escapeHtml(t.tag)}</button>`).join('');
        tb.querySelectorAll('.trending-tag').forEach(b => {
          b.onclick = () => {
            const tag = b.dataset.tag.toLowerCase();
            if (!Store.data.trendingViewed) Store.data.trendingViewed = {};
            Store.data.trendingViewed[tag] = Store.data.currentWeek;
            Store.save();
            toast(`Stell dir vor, du klickst ${b.dataset.tag} und siehst nur noch diese Posts. Was würde das mit deinem Feed machen?`, { long: true });
          };
        });
        root.appendChild(tb);
      }
    }

    const list = document.createElement('div');
    list.className = 'feed-list';
    root.appendChild(list);

    // Eigener Post dieser Woche oben pinnen (wenn vorhanden).
    const ownThisWeek = [...Store.data.ownPosts].reverse().find(p => p.week === d.currentWeek);
    if (ownThisWeek) list.appendChild(renderOwnPost(ownThisWeek, { pinned: true }));

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
  const liked = Store.data.likedPosts?.[post.id];
  const shared = Store.data.sharedPosts?.[post.id];
  const followed = Store.data.userProfile.followed.includes(char.id);

  const head = `
    <div class="post-head">
      <div class="avatar" aria-hidden="true">${avatarSvg(char.avatar || 0)}</div>
      <div class="name-block">
        <div class="name">${escapeHtml(char.name)} ${char.type === 'journalist' || char.type === 'linker_journalist' ? '<span class="verified">· verifiziert</span>' : ''}</div>
        <div class="meta">${escapeHtml(char.handle)} · W ${Store.data.currentWeek}</div>
      </div>
      ${Store.isUnlocked('algorithm_panel') ? `<button class="why-btn" data-why="${post.id}" aria-label="Warum sehe ich diesen Beitrag?">Warum?</button>` : ''}
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
      <button class="action-btn like-btn ${liked ? 'active' : ''}" data-act="like" aria-pressed="${liked ? 'true' : 'false'}">
        <span class="action-icon">❤</span><span class="action-label">${liked ? 'Geliked' : 'Like'}</span>
      </button>
      <button class="action-btn" data-act="comment" aria-label="Antworten"><span class="action-icon">💬</span><span class="action-label">Antworten</span></button>
      <button class="action-btn ${shared ? 'active' : ''}" data-act="share" aria-label="Teilen"><span class="action-icon">↗</span><span class="action-label">${shared ? 'Geteilt' : 'Teilen'}</span></button>
      <button class="action-btn ${followed ? 'active' : ''}" data-act="follow">${followed ? '✓ Folgst du' : '+ Folgen'}</button>
      <button class="action-btn dislike" data-act="mute" aria-label="Stummschalten">🚫</button>
    </div>
  `;

  const ownComment = pickStoredComment(post.id);
  const replyBlock = ownComment
    ? `<div class="post-reply"><div class="reply-author">${escapeHtml(Store.data.character.name)} <span class="muted small">· du</span></div><div class="reply-body">${escapeHtml(ownComment)}</div></div>`
    : '';

  card.innerHTML = head + body + actions + replyBlock;

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

function renderOwnPost(op, opts = {}) {
  const card = document.createElement('article');
  card.className = 'post-card own-post' + (opts.pinned ? ' pinned' : '');
  card.innerHTML = `
    <div class="post-head">
      <div class="avatar" aria-hidden="true">${avatarSvg(Store.data.character.avatar || 0)}</div>
      <div class="name-block">
        <div class="name">${escapeHtml(Store.data.character.name)} <span class="verified">· du</span></div>
        <div class="meta">Woche ${op.week}${opts.pinned ? ' · oben angepinnt' : ''}</div>
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
  const MAX = 280;

  const trending = getTrendingHashtags();
  const trendingRow = trending.length
    ? `<div class="compose-trending">
        <span class="muted small">Trending — anklicken hängt an:</span>
        ${trending.slice(0, 4).map(t => `<button type="button" class="compose-trend" data-tag="${escapeHtml(t.tag)}">${escapeHtml(t.tag)}</button>`).join('')}
      </div>`
    : '';
  wrap.innerHTML = `
    <textarea id="compose-text" maxlength="${MAX}" placeholder="Was ist los?" aria-label="Beitragstext"></textarea>
    <div class="compose-meta">
      <span class="muted small">Wähle 1–3 Themen:</span>
      <span class="compose-counter" id="compose-counter" aria-live="polite">0 / ${MAX}</span>
    </div>
    <div class="compose-topic-grid" id="compose-topics"></div>
    ${trendingRow}
    <div class="compose-row">
      <span class="muted small" id="compose-status"></span>
      <button class="btn btn-primary" id="btn-publish">Posten</button>
    </div>
  `;
  const grid = wrap.querySelector('#compose-topics');
  for (const t of topics) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t;
    b.onclick = () => {
      if (chosen.has(t)) { chosen.delete(t); b.classList.remove('selected'); }
      else if (chosen.size < 3) { chosen.add(t); b.classList.add('selected'); }
    };
    grid.appendChild(b);
  }
  const txt = wrap.querySelector('#compose-text');
  const counter = wrap.querySelector('#compose-counter');
  wrap.querySelectorAll('.compose-trend').forEach(b => {
    b.onclick = () => {
      const cur = txt.value.trimEnd();
      const sep = cur && !cur.endsWith(' ') ? ' ' : '';
      const next = (cur + sep + b.dataset.tag + ' ').slice(0, MAX);
      txt.value = next;
      txt.dispatchEvent(new Event('input'));
      txt.focus();
    };
  });
  txt.addEventListener('input', () => {
    const n = txt.value.length;
    counter.textContent = `${n} / ${MAX}`;
    counter.classList.toggle('warn', n > MAX - 30);
    counter.classList.toggle('over', n >= MAX);
  });
  // iPad: bei Fokus in den sichtbaren Bereich scrollen.
  txt.addEventListener('focus', () => {
    setTimeout(() => txt.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
  });

  wrap.querySelector('#btn-publish').onclick = () => {
    const text = txt.value.trim();
    const status = wrap.querySelector('#compose-status');
    if (!text) { status.textContent = 'Du hast noch nichts geschrieben.'; return; }
    if (chosen.size === 0) { status.textContent = 'Wähle mindestens ein Thema.'; return; }
    const tags = [...chosen];
    const outrage = tags.some(t => ['politik-rechts','politik-links','verschwoerung','hass','feminismus','anti-feminismus'].includes(t)) ? 0.3 : 0.1;
    Store.addOwnPost({ text, tags, outrage });
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

  // NPC-Antworten auf eigene Posts
  const postReplies = getRepliesForInbox();
  if (postReplies.length) {
    const h = document.createElement('div');
    h.className = 'feed-header';
    h.innerHTML = '<h3>Antworten auf deine Posts</h3>';
    wrap.appendChild(h);
    for (const entry of postReplies) {
      const card = document.createElement('div');
      card.className = 'reply-bundle';
      const head = `<div class="reply-bundle-head muted small">Auf deinen Post in W${entry.week - 1}: „${escapeHtml(entry.postSnippet)}${entry.postSnippet.length >= 120 ? '…' : ''}"</div>`;
      const body = entry.replies.map(r => {
        const c = getCharacter(r.author);
        return `<div class="reply-bundle-item stance-${r.stance}">
          <div class="avatar small">${avatarSvg(c?.avatar || 0)}</div>
          <div class="reply-meta">
            <div class="reply-author"><strong>${escapeHtml(c?.name || r.author)}</strong> <span class="muted small">${escapeHtml(c?.handle || '')}</span></div>
            <div class="reply-text">${escapeHtml(r.text)}</div>
          </div>
        </div>`;
      }).join('');
      card.innerHTML = head + '<div class="reply-bundle-body">' + body + '</div>';
      wrap.appendChild(card);
    }
  }

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

  if (!postReplies.length && !Store.data.badges.length && !Store.data.shitstormHistory.length) {
    wrap.innerHTML = '<p class="muted">Noch keine Benachrichtigungen. Spiele weiter.</p>';
  }
  return wrap;
}

async function handleAction(act, post, btn, card) {
  const char = getCharacter(post.author);
  if (act === 'like') {
    const isLiked = !!Store.data.likedPosts?.[post.id];
    if (isLiked) {
      delete Store.data.likedPosts[post.id];
      Store.save();
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
      const lbl = btn.querySelector('.action-label'); if (lbl) lbl.textContent = 'Like';
    } else {
      if (!Store.data.likedPosts) Store.data.likedPosts = {};
      Store.data.likedPosts[post.id] = { week: Store.data.currentWeek, ts: Date.now() };
      Store.recordAction(post.id, 'like', post);
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      const lbl = btn.querySelector('.action-label'); if (lbl) lbl.textContent = 'Geliked';
      spawnHeartFloater(btn);
      SFX.like();
      maybeShowAlgoNudge(post);
    }
  } else if (act === 'share') {
    if (Store.data.sharedPosts?.[post.id]) return;
    if (!Store.data.sharedPosts) Store.data.sharedPosts = {};
    Store.data.sharedPosts[post.id] = { week: Store.data.currentWeek, ts: Date.now() };
    Store.recordAction(post.id, 'share', post);
    toast('Geteilt.');
    SFX.share();
    btn.classList.add('active');
    const lbl = btn.querySelector('.action-label'); if (lbl) lbl.textContent = 'Geteilt';
  } else if (act === 'follow') {
    if (Store.data.userProfile.followed.includes(char.id)) {
      Store.unfollow(char.id);
      btn.classList.remove('active');
      btn.innerHTML = '+ Folgen';
    } else {
      Store.follow(char.id);
      Store.recordAction(post.id, 'follow', post);
      btn.classList.add('active');
      btn.innerHTML = '✓ Folgst du';
      toast(`Du folgst jetzt ${char.name}.`);
    }
  } else if (act === 'mute') {
    Store.mute(char.id);
    Store.recordAction(post.id, 'mute', post);
    card.style.opacity = '0.3';
    toast(`${char.name} stummgeschaltet.`);
  } else if (act === 'comment') {
    showCommentOptions(post, card);
  }
}

function spawnHeartFloater(btn) {
  const rect = btn.getBoundingClientRect();
  const float = document.createElement('span');
  float.className = 'heart-floater';
  float.textContent = '❤';
  float.style.left = (rect.left + rect.width / 2) + 'px';
  float.style.top = (rect.top + rect.height / 2) + 'px';
  document.body.appendChild(float);
  setTimeout(() => float.remove(), 1100);
}

let lastAlgoNudgeWeek = -1;
function maybeShowAlgoNudge(post) {
  // Nicht jeden Like kommentieren — nur bei polarisierendem Content,
  // und höchstens 1× pro Woche, damit es nicht nervt.
  if (Store.data.currentWeek === lastAlgoNudgeWeek) return;
  const tags = post.tags || [];
  const isHot = tags.includes('politik-rechts') || tags.includes('politik-links')
    || tags.includes('verschwoerung') || tags.includes('anti-feminismus') || tags.includes('feminismus')
    || (post.outrage_score || 0) > 0.5;
  if (!isHot) return;
  if (!Store.isUnlocked('algorithm_panel')) return;
  lastAlgoNudgeWeek = Store.data.currentWeek;
  toast('Notiert. Streem zeigt dir bald mehr in diese Richtung.', { long: true });
}

function showCommentOptions(post, card) {
  const overlay = document.getElementById('comment-overlay');
  const list = document.getElementById('comment-options');
  list.innerHTML = '';
  const opts = generateCommentOptions(post);
  for (const o of opts) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = o.text;
    b.onclick = () => {
      // Anführungszeichen entfernen für die Reply-Anzeige.
      const clean = o.text.replace(/^[„"”]/, '').replace(/[“"”]$/, '');
      if (!Store.data.commentSelections) Store.data.commentSelections = {};
      Store.data.commentSelections[post.id] = clean;
      Store.recordAction(post.id, o.type, post);
      injectReplyIntoCard(card, clean);
      overlay.hidden = true;
      toast('Kommentar abgeschickt.');
    };
    list.appendChild(b);
  }
  const close = () => {
    overlay.hidden = true;
    document.removeEventListener('keydown', onKey);
    overlay.removeEventListener('click', onClick);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const onClick = (e) => { if (e.target === overlay) close(); };
  document.getElementById('comment-cancel').onclick = close;
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', onClick);
  overlay.hidden = false;
}

function pickStoredComment(postId) {
  return Store.data.commentSelections?.[postId] || null;
}

function injectReplyIntoCard(card, text) {
  if (!card) return;
  let block = card.querySelector('.post-reply');
  if (!block) {
    block = document.createElement('div');
    block.className = 'post-reply';
    block.innerHTML = `<div class="reply-author">${escapeHtml(Store.data.character.name)} <span class="muted small">· du</span></div><div class="reply-body"></div>`;
    card.appendChild(block);
  }
  block.querySelector('.reply-body').textContent = text;
  block.classList.remove('reply-in'); void block.offsetWidth; block.classList.add('reply-in');
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
  // Wortgrenzen via \b, damit "Auswahl" nicht für "wahl" matcht und "Bildgilde" nicht für "gilde".
  const tags = post.tags || [];
  const t = (post.text || '').toLowerCase();

  if (/\b(kaffee|filterkaffee|café|cafe|latte|kakao|tee)\b/.test(t)) return [
    { text: '„Welches Café? Brauche ich."',                  type: 'comment' },
    { text: '„Stimmt. Kaffee hier ist eine Enttäuschung."',  type: 'comment' },
    { text: '„Du und dein Kaffee, jede Woche."',             type: 'angry_comment' },
    { text: '„Morgens ohne geht eh nicht."',                 type: 'comment' }
  ];
  if (/\b(roboter|projektroboter|robotik|sensor|mikrocontroller)\b/.test(t) && tags.includes('wissenschaft')) return [
    { text: '„Sick! Gibt’s Video?"',                         type: 'comment' },
    { text: '„Welcher Mikrocontroller?"',                    type: 'comment' },
    { text: '„Meiner rollt nur im Kreis, hilf mir."',        type: 'comment' },
    { text: '„Bis er dich verrät, ist das ok."',             type: 'comment' }
  ];
  if (/\b(gilde|patch|queue|emote|skin|ranked|platin|turnier|nerf|meta)\b/.test(t)) return [
    { text: '„Bin dabei, ping mich."',                       type: 'comment' },
    { text: '„Das Patch ist broken, komm schon."',           type: 'angry_comment' },
    { text: '„Gilde heute Abend?"',                          type: 'comment' },
    { text: '„Meine Mutter sagt das auch."',                 type: 'comment' }
  ];
  if (/\b(playlist|album|track|song|dj|karaoke|studio|gig|konzert|live-set)\b/.test(t)) return [
    { text: '„Link? Jetzt? Bitte?"',                         type: 'comment' },
    { text: '„Klang gestern im ZEK wirklich gut."',          type: 'comment' },
    { text: '„Nicht wieder 90er-Nostalgie."',                type: 'angry_comment' },
    { text: '„Auf Repeat. Danke."',                          type: 'comment' }
  ];
  if (/\b(buch|bücher|autor(?:in)?|rezension|buchhandlung|roman|dystopie|lesekreis|hörbuch)\b/.test(t)) return [
    { text: '„Auf die Liste. Danke."',                       type: 'comment' },
    { text: '„Hab ich angefangen, konnte nicht weiter."',    type: 'comment' },
    { text: '„Nele, dein Geschmack, immer."',                type: 'comment' },
    { text: '„Lieber Hörbuch — gibt’s das?"',                type: 'comment' }
  ];
  if (/\b(deepfake|manipuliert|faktencheck|bildersuche|desinformation)\b/.test(t)) return [
    { text: '„Wichtig. Teile ich weiter."',                  type: 'comment' },
    { text: '„Faktenchecker sind selbst befangen."',         type: 'angry_comment' },
    { text: '„Gute Checkliste, speichere ich."',             type: 'comment' },
    { text: '„Bin trotzdem reingefallen. Peinlich."',        type: 'comment' }
  ];
  if (/\b(wahl|wahlergebnis|wahllokal|wahlkampf|kandidat(?:in|en)?|stimme|stimmzettel|ankreuzen)\b/.test(t)) return [
    { text: '„Danke für die Erinnerung."',                   type: 'comment' },
    { text: '„Ergebnis ist doch Show, Wahlen ändern nichts."', type: 'angry_comment' },
    { text: '„Bin schon im Wahllokal, gleich."',             type: 'comment' },
    { text: '„Gibt es eine Wahl-Hilfe für die Stadt?"',      type: 'comment' }
  ];
  if (/\b(klima|kohle|klimakrise|klimaziele|klimaschutz|emissionen)\b/.test(t)) return [
    { text: '„Fakten > Bauchgefühl."',                       type: 'comment' },
    { text: '„Strukturell ja, individuell auch."',           type: 'comment' },
    { text: '„Hört auf, uns Angst zu machen."',              type: 'angry_comment' },
    { text: '„Kann man das nachlesen?"',                     type: 'comment' }
  ];
  if (/\b(equal pay|gehalt|gehälter|statistik|lohnlücke|gender pay gap)\b/.test(t)) return [
    { text: '„Danke, dass du dranbleibst."',                 type: 'comment' },
    { text: '„Zahlen sind bekannt, bitte handeln."',         type: 'comment' },
    { text: '„Die Methodik ist doch fragwürdig."',           type: 'angry_comment' },
    { text: '„Habe letztes Jahr endlich verhandelt."',       type: 'comment' }
  ];
  if (/\b(mainstream|zensur|verschwör|akten|umverteilung|kartell)\b/.test(t)) return [
    { text: '„Endlich sagt’s jemand."',                      type: 'comment' },
    { text: '„Quelle? Ernsthaft, bitte."',                   type: 'comment' },
    { text: '„Das ist Stimmungsmache."',                     type: 'angry_comment' },
    { text: '„Ich warte auf die Doku."',                     type: 'comment' }
  ];
  if (/\b(studie|universität|uni|korrelation|kausalität|forschung|peer-review|methodik)\b/.test(t)) return [
    { text: '„Endlich mal sauber differenziert."',           type: 'comment' },
    { text: '„Link zur Primärquelle?"',                      type: 'comment' },
    { text: '„Wissenschaft ist nicht Demokratie."',          type: 'angry_comment' },
    { text: '„Screenshot für die Lerngruppe."',              type: 'comment' }
  ];
  if (/\b(radweg|fahrrad|kreisverkehr|innenstadt|verkehrswende)\b/.test(t)) return [
    { text: '„Gute Nachricht für die Stadt."',               type: 'comment' },
    { text: '„Mal sehen, ob sie’s wirklich bauen."',         type: 'comment' },
    { text: '„Und die Autofahrer?"',                         type: 'angry_comment' },
    { text: '„Endlich, nach Jahren."',                       type: 'comment' }
  ];
  if (/\b(regen|sturm|wolken|mond|wetter|nebel|fähren)\b/.test(t)) return [
    { text: '„Greifshafen-Stimmung."',                       type: 'comment' },
    { text: '„Hab ich auch gesehen — krass."',               type: 'comment' },
    { text: '„Ich liebe das Wetter hier nicht."',            type: 'angry_comment' },
    { text: '„Jacke an, Kamera raus."',                      type: 'comment' }
  ];
  if (/\b(demo|protest|kundgebung|bürgerversammlung|fleetplatz|marktplatz)\b/.test(t)) return [
    { text: '„Bin dabei."',                                  type: 'comment' },
    { text: '„Weniger Symbolik, mehr Plan."',                type: 'comment' },
    { text: '„Das bringt gar nichts."',                      type: 'angry_comment' },
    { text: '„Danke für die Info, teile ich."',              type: 'comment' }
  ];
  if (/\b(hass|angepöbelt|hasskommentare|chatgruppe|beleidigt|diskriminier)/.test(t)) return [
    { text: '„Tut mir leid, das zu lesen."',                 type: 'comment' },
    { text: '„Meldet das. Jedes Mal."',                      type: 'comment' },
    { text: '„Übertreibt ihr nicht ein bisschen?"',          type: 'angry_comment' },
    { text: '„Ihr seid nicht allein."',                      type: 'comment' }
  ];
  if (/\b(testosteron|männer|männlich|dating|alpha|mindset)\b/.test(t) && tags.includes('anti-feminismus')) return [
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
  const close = () => {
    overlay.hidden = true;
    document.removeEventListener('keydown', onKey);
    overlay.removeEventListener('click', onClickBackdrop);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const onClickBackdrop = (e) => { if (e.target === overlay) close(); };
  document.getElementById('why-close').onclick = close;
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', onClickBackdrop);
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
  presetRow.className = 'sandbox-presets';
  presetRow.innerHTML = `
    <button class="btn btn-ghost" data-preset="current">Wie bisher</button>
    <button class="btn btn-ghost" data-preset="quality">Qualität</button>
    <button class="btn btn-ghost" data-preset="chrono">Chronologisch</button>
    <button class="btn btn-ghost" data-preset="balance">Ausgleich</button>
    <button class="btn btn-ghost preset-challenge" data-preset="empoerung">Empörungs-Booster ⚠</button>
    <button class="btn btn-ghost preset-challenge" data-preset="calm">Ruhe-Modus 🧘</button>
  `;
  sliders.appendChild(presetRow);
  const desc = document.createElement('p');
  desc.className = 'muted small sandbox-preset-desc';
  desc.textContent = 'Probier die Challenge-Presets: „Empörungs-Booster" zeigt, was eine reine Outrage-Maschine produziert. „Ruhe-Modus" ist das Gegenteil — wie würde dein Feed aussehen, wenn du gar nicht mehr gehookt werden sollst?';
  sliders.appendChild(desc);

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
  // Reset-Toggle: simulieren wir auf dem Start-Profil oder dem aktuellen Profil?
  const simModeRow = document.querySelector('#sandbox-sim-mode');
  if (simModeRow) {
    simModeRow.querySelectorAll('input[name=sim-mode]').forEach(r => {
      r.onchange = () => previewFeed(rules);
    });
  }
}

function applyPreset(name, rules, container) {
  const presets = {
    current: { ...Store.data.weights },
    quality:    { affinity: 0.3, engagement: 0.2, recency: 0.5, social: 0.3, ads: 0.2, diversity: 0.7, quality: 1.5, outragePenalty: 1.0, balance: 0.5 },
    chrono:     { affinity: 0.0, engagement: 0.0, recency: 1.8, social: 1.0, ads: 0.2, diversity: 0.0, quality: 0.2, outragePenalty: 0.0, balance: 0.0 },
    balance:    { affinity: 0.3, engagement: 0.2, recency: 0.5, social: 0.5, ads: 0.2, diversity: 0.8, quality: 0.8, outragePenalty: 0.8, balance: 1.5 },
    empoerung:  { affinity: 0.4, engagement: 2.0, recency: 0.3, social: 0.4, ads: 0.6, diversity: 0.0, quality: 0.0, outragePenalty: 0.0, balance: 0.0 },
    calm:       { affinity: 0.6, engagement: 0.1, recency: 0.4, social: 0.7, ads: 0.1, diversity: 1.0, quality: 1.2, outragePenalty: 1.8, balance: 0.8 }
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
  // Welches Profil als Ausgangspunkt? "current" = aktuelles Spielprofil, "fresh" = Start-Profil.
  const mode = document.querySelector('input[name=sim-mode]:checked')?.value || 'current';
  const baseSource = (mode === 'fresh' && Store.data.initialProfileSnapshot)
    ? Store.data.initialProfileSnapshot
    : Store.data.userProfile;
  const baseProfile = structuredClone(baseSource);
  const statsBefore = scoreProfile(baseProfile);

  // Parallel-Simulation: Original-Gewichte vs. eigene Regeln, damit der Vergleich sichtbar wird.
  const baselineWeights = Store.data.weights;
  const simOwn = structuredClone(baseProfile);
  const simOrig = structuredClone(baseProfile);
  for (let i = 0; i < 10; i++) {
    advanceSimWeek(simOwn, rules);
    advanceSimWeek(simOrig, baselineWeights);
  }
  const statsOwn = scoreProfile(simOwn);
  const statsOrig = scoreProfile(simOrig);

  const result = document.getElementById('sim-result');
  result.classList.add('visible');
  result.innerHTML = `
    <h4>Nach 10 simulierten Wochen — links Original-Algorithmus, rechts deine Regeln:</h4>
    <div class="sim-compare">
      ${renderCompareRow('Wissenschaft', statsBefore.wissenschaft, statsOrig.wissenschaft, statsOwn.wissenschaft)}
      ${renderCompareRow('Politik (rechts)', statsBefore.politikRechts, statsOrig.politikRechts, statsOwn.politikRechts)}
      ${renderCompareRow('Politik (links)', statsBefore.politikLinks, statsOrig.politikLinks, statsOwn.politikLinks)}
      ${renderCompareRow('Verschwörung', statsBefore.verschwoerung, statsOrig.verschwoerung, statsOwn.verschwoerung)}
      ${renderCompareRow('Vielfalt', statsBefore.diversity, statsOrig.diversity, statsOwn.diversity)}
    </div>
    <p class="muted small">Politische Neigung: Start ${statsBefore.lean.toFixed(2)} · Original ${statsOrig.lean.toFixed(2)} · deine Regeln <strong>${statsOwn.lean.toFixed(2)}</strong></p>
    <p class="muted small">Ausgangsbasis: ${mode === 'fresh' ? 'Start-Profil (vor dem Spiel)' : 'aktuelles Profil (nach den gespielten Wochen)'}.</p>
  `;
}

function advanceSimWeek(profile, weights) {
  const feed = buildFeed(POSTS, ADS, profile, weights, { limit: 10, unlocked: ['ads'], muted: [] });
  for (let j = 0; j < Math.min(3, feed.length); j++) {
    const p = feed[j];
    for (const t of p.tags || []) {
      profile.interests[t] = Math.min(1, (profile.interests[t] || 0) + 0.05);
    }
    if (p.political_lean !== undefined) {
      profile.political_lean_estimated = clamp(
        profile.political_lean_estimated + p.political_lean * 0.03, -1, 1
      );
    }
  }
}

function renderCompareRow(label, start, orig, own) {
  return `
    <div class="sim-row">
      <span class="lbl">${label}</span>
      <div class="sim-bars">
        <div class="sim-bar"><span class="sim-bar-label">Start</span><div class="bar small"><div class="fill base" style="width:${Math.round(start*100)}%"></div></div><span>${Math.round(start*100)}%</span></div>
        <div class="sim-bar"><span class="sim-bar-label">Original</span><div class="bar small"><div class="fill orig" style="width:${Math.round(orig*100)}%"></div></div><span>${Math.round(orig*100)}%</span></div>
        <div class="sim-bar"><span class="sim-bar-label">Du</span><div class="bar small"><div class="fill own" style="width:${Math.round(own*100)}%"></div></div><span>${Math.round(own*100)}%</span></div>
      </div>
    </div>`;
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
        ${totalPolitical === 0
          ? `<div class="big-word">—</div>
             <p>Du hast politisch kaum interagiert. Sehr bewusst beobachtet — oder bewusst gemieden?</p>`
          : `<div class="big-num">${Math.round(dominantShare * 100)}%</div>
             <p>${dominantShare > 0.7
               ? 'deiner politischen Likes gingen in eine einzige Richtung.'
               : dominantShare > 0.5
               ? 'deiner politischen Likes gingen in eine dominante Richtung.'
               : 'deiner politischen Likes waren über Richtungen verteilt.'}</p>`}
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
    buildEndingSlide(d),
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

// Multiple Endings — datengetrieben aus dem finalen Profil und der Spielhistorie.
function buildEndingSlide(d) {
  const e = computeEnding(d);
  d.ending = e.key;
  return {
    id: 's8b',
    html: `
      <h2>Dein Streem-Bogen</h2>
      <div class="ending-card ending-${e.key}">
        <div class="ending-emoji">${e.emoji}</div>
        <div class="ending-title">${escapeHtml(e.title)}</div>
        <p>${escapeHtml(e.text)}</p>
        <div class="ending-stats muted small">
          ${e.facts.map(f => `<div>${escapeHtml(f)}</div>`).join('')}
        </div>
      </div>
      <p class="muted small">Dieses Ergebnis hängt von deinen Entscheidungen ab — andere Spielzüge führen zu anderen Bögen.</p>
    `
  };
}

function computeEnding(d) {
  const p = d.userProfile || {};
  const actions = (d.history || []).flatMap(h => h.actions || []);
  const angry = actions.filter(a => a.type === 'angry_comment').length;
  const likes = actions.filter(a => a.type === 'like').length;
  const ownPosts = (d.ownPosts || []).length;
  const inRabbit = (d.guildMemberships || []).includes('echte_werte');
  const inReading = (d.guildMemberships || []).includes('lese_runde');
  const followers = (p.followed || []).length;
  const muted = (p.muted || []).length;
  const lean = p.political_lean_estimated || 0;
  const verschw = p.interests?.verschwoerung || 0;
  const tw = d.contentWarningsAccepted || {};
  const twSkip = Object.values(tw).reduce((a, b) => a + (b.skipped || 0), 0);
  const arcs = d.npcArcs || {};
  const leaClose  = arcs.lea_close || 0;
  const finnPath  = arcs.finn_path || 0;
  const miraClose = arcs.mira_close || 0;
  const selfAware = arcs.self_aware || 0;

  // NPC-Arc-Endings haben Priorität, wenn sie eindeutig sind.
  if (finnPath >= 3) {
    return {
      key: 'finn_lost',
      emoji: '🕳️',
      title: 'Finn ist abgerutscht',
      text: 'Du hast Finn auf seinem Weg in die radikale Gilde nicht aufgehalten — vielleicht warst du auch dort. In W24 hat er nicht widersprochen, als jemand Lara Weiss beleidigt wurde. Du hast es gesehen. Du warst nicht der Grund, aber du warst ein Teil der Stimmung.',
      facts: [`Finn-Bahn: +${finnPath} (in Richtung radikal)`, inRabbit ? 'eigene Mitgliedschaft: Echte Werte' : 'Finn radikalisiert, du nicht', `Hass-Affinität: ${Math.round((p.interests?.hass||0)*100)}%`]
    };
  }
  if (finnPath <= -3) {
    return {
      key: 'finn_saved',
      emoji: '🪢',
      title: 'Du hast Finn gehalten',
      text: 'In Woche 8 hast du widersprochen, als Finn anfing, von Clout-Chaser-Mädels zu reden. In Woche 17 hast du ihn vor der Gilde gewarnt. Es klingt klein, ist aber genau das, was im Echten Radikalisierung verhindert: jemand, der „hey, nein" sagt — bevor es Routine wird.',
      facts: [`Finn-Bahn: ${finnPath} (in Richtung zurückgeholt)`, `selbst nicht in „Echte Werte"`, `${ownPosts} eigene Posts geschrieben`]
    };
  }
  if (leaClose >= 0.6 && selfAware >= 1) {
    return {
      key: 'aware',
      emoji: '🪞',
      title: 'Selbstbewusst durch den Feed',
      text: 'Du hast Lea zugehört, ihr im richtigen Moment ehrlich geantwortet, dass dieser Feed etwas mit dir macht. Diese Bewegung — Reflexion *während* des Scrollens, nicht erst danach — ist die schwierigste und seltenste in diesem Spiel.',
      facts: [`Lea-Nähe: ${leaClose.toFixed(2)}`, `du hast eingestanden, was Algorithmen mit dir machen`, `Lean stabil bei ${lean.toFixed(2)}`]
    };
  }
  if (miraClose >= 0.4 && (p.interests?.feminismus || 0) > 0.3) {
    return {
      key: 'allyship',
      emoji: '🤝',
      title: 'Verbündete:r',
      text: 'Mira hat dich nach Hass-Kommentaren um einen Reality-Check gebeten. Du warst da. Allyship ist nicht groß, sie ist diese kurze DM, die ankommt, wenn es nötig ist.',
      facts: [`Mira-Nähe: ${miraClose.toFixed(2)}`, `Feminismus-Affinität: ${Math.round((p.interests?.feminismus||0)*100)}%`, `${angry} wütende Kommentare`]
    };
  }
  // Prioritäten-Logik: das eindeutigste Profil gewinnt.
  if (inRabbit && (verschw > 0.4 || lean > 0.55)) {
    return {
      key: 'rabbithole',
      emoji: '🕳️',
      title: 'Tief im Loch',
      text: 'Du bist in einer Gilde gelandet, die dich nicht mehr loslässt. Dein Feed zeigt dir, dass du recht hast — immer. Das ist die Mechanik, die Radikalisierung im Echten ausmacht. Du hast es im Spiel erlebt; und auch wieder verlassen.',
      facts: [`politische Neigung: ${lean.toFixed(2)}`, `Verschwörungs-Affinität: ${Math.round(verschw*100)}%`, `Gilden-Mitgliedschaft: Echte Werte`]
    };
  }
  if (ownPosts >= 6 && followers >= 8) {
    return {
      key: 'influencer',
      emoji: '📣',
      title: 'Mikro-Influencer:in',
      text: 'Du hast viel selbst gepostet. Reichweite kostet aber etwas — du hast gemerkt, wie schnell ein Post entgleist, wie schnell sich Erwartungen aufbauen. Wer Plattform mit-baut, mit-baut sie auch in seinem Kopf.',
      facts: [`${ownPosts} eigene Posts`, `${followers} gefolgte Accounts`, `${likes} verteilte Likes`]
    };
  }
  if (angry >= 8 && Math.abs(lean) > 0.4) {
    return {
      key: 'crusader',
      emoji: '⚔️',
      title: 'Empörte:r Engagierte:r',
      text: 'Du hast eine klare Haltung — und sie laut gemacht. Wütende Kommentare bringen Reichweite, sie verändern aber selten Meinungen. Frag dich, ob dein Algorithmus dich klüger gemacht hat oder lauter.',
      facts: [`${angry} wütende Kommentare`, `Lean: ${lean.toFixed(2)}`, `${muted} stummgeschaltete Accounts`]
    };
  }
  if (twSkip >= 4 && muted >= 3 && Math.abs(lean) < 0.3) {
    return {
      key: 'guarded',
      emoji: '🛡️',
      title: 'Achtsame:r Beobachter:in',
      text: 'Du hast Inhalte übersprungen, Accounts stummgeschaltet, dich politisch nicht in eine Ecke drängen lassen. Diese Selbst-Moderation ist eine Fähigkeit, die in keinem Schulplan steht — du hast sie jetzt geübt.',
      facts: [`${twSkip} Inhaltswarnungen übersprungen`, `${muted} Accounts stumm`, `Lean stabil bei ${lean.toFixed(2)}`]
    };
  }
  if (inReading && p.interests?.wissenschaft > 0.4) {
    return {
      key: 'nerd',
      emoji: '📚',
      title: 'Quelle vor Meinung',
      text: 'Du hast Zeit in der Leserunde verbracht, lange Texte konsumiert, Studien geteilt. Dein Feed wurde dadurch ruhiger — und auch enger. Wissenschaftliches Lesen ist Filterblase, nur eine angenehmere.',
      facts: [`Wissenschafts-Affinität: ${Math.round((p.interests?.wissenschaft||0)*100)}%`, `Gilde: Leserunde 2028`]
    };
  }
  // Fallback-Aware: self_aware ohne hohe Lea-Nähe (das stärkere Aware-Ending
  // oben verlangt beides — Reflexionsgespräch + Beziehungspflege).
  if (selfAware >= 1 && twSkip < 3) {
    return {
      key: 'aware',
      emoji: '🪞',
      title: 'Selbstbewusst durch den Feed',
      text: 'Du hast dir selbst zugehört. Lea zu sagen, dass dieser Feed etwas mit dir macht — das ist die schwierigste Bewegung des Spiels. Reflexion *während* des Scrollens, nicht erst danach.',
      facts: [`du hast eingestanden, was Algorithmen mit dir machen — das ist die seltenste Reaktion in diesem Spiel.`]
    };
  }
  return {
    key: 'driven',
    emoji: '🌊',
    title: 'Mitgetrieben',
    text: 'Dein Account ist mit dem Feed mitgegangen — wie die meisten echten Accounts. Keine extremen Ausschläge, keine bewussten Brüche. Genau diese ruhige Drift ist das, was Algorithmen so effektiv macht: niemand merkt, wie sich etwas verschoben hat.',
    facts: [`${likes} Likes verteilt`, `Lean: ${lean.toFixed(2)}`, `${followers} gefolgte Accounts`]
  };
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
  // Echte Posts, die NICHT gesehen wurden — mit der politisch gegenteiligen
  // Richtung des Spielers und/oder hoher Qualität.
  const seenSet = new Set(feedSeen);
  const lean = profile.political_lean_estimated;
  const unseen = [];
  for (const p of POSTS_LOOKUP?.values() || []) {
    if (seenSet.has(p.id)) continue;
    unseen.push(p);
  }

  function score(p) {
    const pLean = p.political_lean ?? 0;
    let s = 0;
    // Gegen-Perspektive belohnen.
    s += Math.abs(pLean - lean);
    // Wissenschaftliche / qualitative Posts belohnen.
    s += (p.quality_score ?? 0.5) * 0.7;
    // Politik-Mitte belohnen, falls Profil sie kaum kennt.
    if (p.tags?.includes('politik-mitte') && (profile.interests['politik-mitte'] || 0) < 0.2) s += 0.5;
    if (p.tags?.includes('wissenschaft') && (profile.interests['wissenschaft'] || 0) < 0.2) s += 0.5;
    // Empörung leicht abwerten, weil das didaktisch nicht "fehlt".
    s -= 0.6 * (p.outrage_score ?? 0);
    return s;
  }

  const ranked = unseen
    .filter(p => (p.text || '').length > 0)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 4);

  if (!ranked.length) {
    return [{ title: 'Dein Feed hat fast alles abgedeckt.', desc: 'Bemerkenswert breit für ein automatisches System.' }];
  }
  return ranked.map(p => ({
    title: shortenTitle(p.text),
    desc: `von ${authorLabel(p.author)} · ${(p.tags || []).slice(0,2).map(labelFor).join(', ') || 'allgemein'}`
  }));
}

function shortenTitle(text) {
  if (!text) return '—';
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 110 ? t.slice(0, 108) + '…' : t;
}

function authorLabel(authorId) {
  // Schlanker Fallback, ohne Charaktere-Modul zu importieren.
  if (!authorId) return 'jemand';
  return authorId.replace(/^char_/, '').replace(/_/g, ' ');
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

// ===== dms.js =====
(function(){
  var Store = __M.Store;
  var clamp = __M.clamp;
  var getCharacter = __M.getCharacter;
  var avatarSvg = __M.avatarSvg;
  var SFX = __M.SFX;
  var askWarning = __M.askWarning;
  var maybeQueueMicroReflection = __M.maybeQueueMicroReflection;
// dms.js — Direkt-Nachrichten mit wiederkehrenden NPC-Arcs.
// Threads sind datengetrieben (data/dms.json), Antworten beeinflussen
// das Profil und auch interne NPC-Bindungs-Werte (npcArcs).





let THREADS = [];

function initDms(data) {
  THREADS = data.threads || [];
}

function getAllThreads() { return THREADS; }

// Welche Nachrichten in diesem Thread bis zur aktuellen Woche freigeschaltet sind.
function getVisibleMessages(thread) {
  return (thread.messages || []).filter(m => m.week <= Store.data.currentWeek);
}

// Welche Antworten-Auswahl noch offen ist (nach welcher Woche, noch nichts gewählt)?
function getPendingChoice(thread) {
  const replies = thread.replies || [];
  const taken = Store.data.dmReplies?.[thread.id] || {};
  for (const r of replies) {
    if (r.after_week > Store.data.currentWeek) continue;
    if (taken[r.after_week]) continue;
    return r;
  }
  return null;
}

// Anzahl unbeantworteter Threads (Badge in Bottom-Nav).
function unreadCount() {
  let n = 0;
  for (const t of THREADS) {
    const visible = getVisibleMessages(t);
    if (!visible.length) continue;
    const seen = Store.data.dmThreads?.[t.id]?.lastSeenCount || 0;
    if (visible.length > seen) n++;
  }
  return n;
}

// Mark thread as seen.
function markThreadSeen(threadId) {
  if (!Store.data.dmThreads) Store.data.dmThreads = {};
  const t = THREADS.find(x => x.id === threadId);
  if (!t) return;
  const visible = getVisibleMessages(t);
  Store.data.dmThreads[threadId] = { lastSeenCount: visible.length, lastSeenAt: Date.now() };
  Store.save();
}

// Antwort verbuchen + Effekte anwenden.
function applyReply(threadId, afterWeek, choice) {
  const eff = choice.effect || {};
  const p = Store.data.userProfile;
  if (eff.tags) {
    for (const [k, v] of Object.entries(eff.tags)) {
      p.interests[k] = clamp((p.interests[k] || 0) + v, 0, 1);
    }
  }
  if (eff.mute) {
    if (!p.muted.includes(eff.mute)) p.muted.push(eff.mute);
  }
  // NPC-Arc-Werte.
  for (const k of ['lea_close', 'finn_path', 'mira_close', 'self_aware']) {
    if (typeof eff[k] === 'number') {
      Store.data.npcArcs[k] = (Store.data.npcArcs[k] || 0) + eff[k];
    }
  }
  if (!Store.data.dmReplies[threadId]) Store.data.dmReplies[threadId] = {};
  Store.data.dmReplies[threadId][afterWeek] = { id: choice.id, text: choice.text, ts: Date.now() };
  Store.save();
  // Wendepunkt-spezifische Mikro-Reflexion direkt nach Marc-Antwort.
  if (threadId === 'dm_marc') {
    setTimeout(() => maybeQueueMicroReflection('marc_dm'), 1800);
  }
}

// Rendert die DM-Inbox-Liste.
function renderDmList(root, onOpenThread) {
  root.innerHTML = '';
  const items = THREADS.map(t => {
    const visible = getVisibleMessages(t);
    if (!visible.length) return null;
    const last = visible[visible.length - 1];
    const seen = Store.data.dmThreads?.[t.id]?.lastSeenCount || 0;
    const unread = visible.length > seen;
    return { thread: t, last, unread };
  }).filter(Boolean);

  if (!items.length) {
    root.innerHTML = '<div class="dm-empty"><p class="muted">Noch keine Nachrichten. Spiele weiter.</p></div>';
    return;
  }

  for (const it of items) {
    const c = getCharacter(it.thread.with);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'dm-row' + (it.unread ? ' unread' : '');
    row.innerHTML = `
      <div class="dm-avatar">${avatarSvg(c?.avatar || 0)}${isOnline(it.thread.with) ? '<span class="dm-online" aria-label="online"></span>' : ''}</div>
      <div class="dm-meta">
        <div class="dm-name">${escapeHtml(it.thread.title)}${it.unread ? '<span class="dm-badge">neu</span>' : ''}</div>
        <div class="dm-preview">${escapeHtml(truncate(it.last.text, 80))}</div>
      </div>
      <div class="dm-week muted small">W${it.last.week}</div>
    `;
    row.onclick = () => onOpenThread(it.thread);
    root.appendChild(row);
  }
}

// Rendert einen Thread.
async function renderDmThread(root, thread, onBack) {
  // Threads mit trigger_warning werden vor dem ersten Öffnen gegated —
  // konsistent zu Posts und Gilden.
  if (thread.trigger_warning && !Store.data.dmThreads?.[thread.id]?.warningAccepted) {
    const r = await askWarning(thread.trigger_warning);
    if (!r.show) { onBack && onBack(); return; }
    if (!Store.data.dmThreads) Store.data.dmThreads = {};
    if (!Store.data.dmThreads[thread.id]) Store.data.dmThreads[thread.id] = {};
    Store.data.dmThreads[thread.id].warningAccepted = true;
    Store.save();
  }
  const c = getCharacter(thread.with);
  const visible = getVisibleMessages(thread);
  const pending = getPendingChoice(thread);
  const taken = Store.data.dmReplies?.[thread.id] || {};

  root.innerHTML = `
    <header class="dm-thread-head">
      <button class="dm-back" aria-label="Zurück">←</button>
      <div class="dm-avatar small">${avatarSvg(c?.avatar || 0)}${isOnline(thread.with) ? '<span class="dm-online"></span>' : ''}</div>
      <div>
        <div class="dm-thread-name">${escapeHtml(thread.title)}</div>
        <div class="muted small">${isOnline(thread.with) ? 'online' : 'zuletzt diese Woche'}</div>
      </div>
    </header>
    <div class="dm-thread-body" id="dm-thread-body"></div>
    <div class="dm-thread-input" id="dm-thread-input"></div>
  `;
  root.querySelector('.dm-back').onclick = onBack;

  const body = root.querySelector('#dm-thread-body');
  // Nachrichten in chronologischer Reihenfolge interleavt mit den eigenen Antworten.
  for (const m of visible) {
    const bubble = document.createElement('div');
    bubble.className = 'dm-bubble from-them';
    bubble.innerHTML = `<div class="dm-text">${escapeHtml(m.text)}</div><div class="dm-time muted small">W${m.week}</div>`;
    body.appendChild(bubble);
    // Antwort, die nach dieser Woche fällig war?
    if (taken[m.week]) {
      const myReply = taken[m.week];
      const mine = document.createElement('div');
      mine.className = 'dm-bubble from-me';
      mine.innerHTML = `<div class="dm-text">${escapeHtml(stripQuotes(myReply.text))}</div><div class="dm-time muted small">deine Antwort</div>`;
      body.appendChild(mine);
    }
  }

  const input = root.querySelector('#dm-thread-input');
  if (pending) {
    if (thread.trigger_warning) {
      input.innerHTML = `<div class="dm-warn">Inhaltswarnung — die Antwortoptionen enthalten Sprache aus dem Umfeld dieses Accounts.</div>`;
    }
    const choicesWrap = document.createElement('div');
    choicesWrap.className = 'dm-choices';
    for (const ch of pending.choices) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dm-choice';
      b.textContent = ch.text;
      b.onclick = () => {
        applyReply(thread.id, pending.after_week, ch);
        SFX.dm();
        renderDmThread(root, thread, onBack);
      };
      choicesWrap.appendChild(b);
    }
    input.appendChild(choicesWrap);
  } else {
    input.innerHTML = `<div class="muted small dm-noreply">— Im Moment keine Antwort möglich. Spiele weiter, neue Nachrichten kommen.</div>`;
  }

  body.scrollTop = body.scrollHeight;
  markThreadSeen(thread.id);
}

// Welche Charaktere sind "online"? Deterministisch pro Woche aus dem Seed.
function isOnline(charId) {
  const w = Store.data.currentWeek;
  const seed = Store.data.random_seed || 1;
  // Hash für deterministisches On/Off.
  let h = 0;
  for (const ch of charId + ':' + w + ':' + seed) h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
  return (h >>> 0) % 5 < 2; // ~40% online
}

function stripQuotes(s) {
  return String(s || '').replace(/^[„"”]/, '').replace(/[“"”]$/, '');
}
function truncate(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

  __M.initDms = initDms;
  __M.getAllThreads = getAllThreads;
  __M.getVisibleMessages = getVisibleMessages;
  __M.getPendingChoice = getPendingChoice;
  __M.unreadCount = unreadCount;
  __M.markThreadSeen = markThreadSeen;
  __M.applyReply = applyReply;
  __M.renderDmList = renderDmList;
  __M.renderDmThread = renderDmThread;
})();

// ===== places.js =====
(function(){
  var Store = __M.Store;
  var clamp = __M.clamp;
  var getCharacter = __M.getCharacter;
  var avatarSvg = __M.avatarSvg;
// places.js — Greifshafen-Karte als entdeckbares Modal.
// Klicks zählen, und ab dem zweiten Besuch eines Orts gibt es kleine
// Vignetten: kurze Begegnungen oder Beobachtungen, die das Profil leicht
// beeinflussen können.


let PLACES = [];

function initPlaces(data) {
  PLACES = data.places || [];
}

function getPlaces() { return PLACES; }

// Vignetten pro Ort. Jede Vignette hat eine Bedingung (Mindestbesuch,
// Mindestwoche), einen Text und einen kleinen Effekt aufs Profil.
const VIGNETTES = {
  cafe_hafen: [
    { minVisit: 2, minWeek: 3,  who: 'char_lea',  text: 'Lea sitzt am Fenster, winkt dich kurz dazu. "Setz dich, ich hab noch zehn Minuten."', tags: { lifestyle: 0.05 } },
    { minVisit: 4, minWeek: 12, who: 'char_jule', text: 'Jule schreibt an einer Rezension. "Sag mal, wie liest sich das, ehrlich?"', tags: { lifestyle: 0.05 } }
  ],
  fleetplatz: [
    { minVisit: 2, minWeek: 5,  who: 'char_mira', text: 'Mira mit zwei Pappschildern unterm Arm. "Du kommst zum Aufbau, oder?"', tags: { 'politik-links': 0.05, klima: 0.05 } },
    { minVisit: 3, minWeek: 19, who: 'char_alt',  text: 'Wahlkampfstand der Neuen Alternative. Ein junger Mann drückt dir einen Flyer in die Hand. "Lies mal, was wir wirklich wollen."', tags: { 'politik-rechts': 0.04 } }
  ],
  schulhof: [
    { minVisit: 2, minWeek: 4,  who: 'char_moritz', text: 'Moritz spielt mit dem Handy. "Yo, der Patch ist live. Gönnst du dir das?"', tags: { gaming: 0.04 } },
    { minVisit: 3, minWeek: 16, who: 'char_sara',   text: 'Sara baut etwas Kleines aus zwei Steckbrettern. "Wenn ich morgen verloren bin, war\'s das hier."', tags: { wissenschaft: 0.05 } }
  ],
  marktplatz: [
    { minVisit: 2, minWeek: 8,  who: 'char_greif',  text: 'Ein Reporter von Greifshafen News interviewt jemanden. Du bleibst kurz stehen, hörst zu.', tags: { 'politik-mitte': 0.04 } },
    { minVisit: 3, minWeek: 21, who: 'char_buerger', text: 'Wahlkampfbühne der Bürgerliste. Die Kandidatin spricht ruhig, fast unaufgeregt. Ungewohnt.', tags: { 'politik-mitte': 0.04 } }
  ],
  buergerhaus: [
    { minVisit: 2, minWeek: 6, who: 'char_noah', text: 'Noah kommt aus einer Sitzung. "War zäh, aber sie haben sich am Ende auf was geeinigt. Klingt nach Mitte? Ist aber Demokratie."', tags: { 'politik-mitte': 0.05 } }
  ],
  altstadt: [
    { minVisit: 2, minWeek: 7, who: 'char_ana', text: 'Ana steht in einem Hauseingang, Kopfhörer auf, summt. Sie nickt dir zu.', tags: { musik: 0.04 } }
  ],
  campus: [
    { minVisit: 2, minWeek: 9,  who: 'char_tariq',  text: 'Tariq winkt von einer Bank. "Wir lesen gerade die Studie, über die alle reden. Spoiler: die Schlagzeile stimmt nicht."', tags: { wissenschaft: 0.06 } },
    { minVisit: 3, minWeek: 18, who: 'char_sophia', text: 'Sophia gibt gerade ein Interview. "Frag dich immer: cui bono?"', tags: { wissenschaft: 0.05 } }
  ],
  hafen: [
    { minVisit: 2, minWeek: 11, who: null, text: 'Eine Fähre legt ab. Möwen schreien. Dein Telefon vibriert. Du steckst es wieder weg.', tags: { lifestyle: 0.03 } }
  ]
};

function renderMap(root, onClose) {
  root.innerHTML = `
    <header class="map-head">
      <h2>Greifshafen</h2>
      <button class="btn btn-ghost" id="map-close">Schließen</button>
    </header>
    <p class="muted small">Die Stadt deines Accounts. Wer ist wo unterwegs? Mehrmaliges Vorbeischauen kann unerwartete Begegnungen bringen.</p>
    <div class="map-grid" id="map-grid"></div>
    <div id="place-detail" class="place-detail" hidden></div>
  `;
  root.querySelector('#map-close').onclick = onClose;
  const grid = root.querySelector('#map-grid');
  for (const p of PLACES) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'map-tile';
    const visited = !!Store.data.placesVisited?.[p.id];
    if (visited) tile.classList.add('visited');
    tile.innerHTML = `<div class="map-emoji">${p.emoji}</div><div class="map-name">${escapeHtml(p.name)}</div>`;
    tile.onclick = () => {
      if (!Store.data.placesVisited) Store.data.placesVisited = {};
      Store.data.placesVisited[p.id] = (Store.data.placesVisited[p.id] || 0) + 1;
      Store.save();
      tile.classList.add('visited');
      showPlaceDetail(root, p);
    };
    grid.appendChild(tile);
  }
}

function pickVignetteFor(place) {
  const visits = Store.data.placesVisited?.[place.id] || 0;
  const week = Store.data.currentWeek;
  if (!Store.data.placeEvents) Store.data.placeEvents = {};
  const seen = Store.data.placeEvents[place.id] || [];
  const list = VIGNETTES[place.id] || [];
  for (const v of list) {
    const key = `${v.who || 'narration'}_${v.minWeek}`;
    if (visits >= v.minVisit && week >= v.minWeek && !seen.includes(key)) {
      seen.push(key);
      Store.data.placeEvents[place.id] = seen;
      // Effekt aufs Profil.
      if (v.tags) {
        for (const [t, val] of Object.entries(v.tags)) {
          Store.data.userProfile.interests[t] = clamp((Store.data.userProfile.interests[t] || 0) + val, 0, 1);
        }
      }
      Store.save();
      return v;
    }
  }
  return null;
}

function showPlaceDetail(root, place) {
  const detail = root.querySelector('#place-detail');
  detail.hidden = false;
  const chars = (place.regulars || []).map(getCharacter).filter(Boolean);
  const vignette = pickVignetteFor(place);
  let vignetteHtml = '';
  if (vignette) {
    const c = vignette.who ? getCharacter(vignette.who) : null;
    vignetteHtml = `
      <div class="vignette-card">
        <div class="vignette-tag muted small">Du triffst dort:</div>
        <div class="vignette-body">
          ${c ? `<div class="avatar small">${avatarSvg(c.avatar || 0)}</div>` : '<div class="vignette-icon">🌫️</div>'}
          <div class="vignette-text">${escapeHtml(vignette.text)}</div>
        </div>
      </div>
    `;
  }
  detail.innerHTML = `
    <div class="place-head"><span class="map-emoji">${place.emoji}</span><h3>${escapeHtml(place.name)}</h3></div>
    <p>${escapeHtml(place.desc)}</p>
    ${vignetteHtml}
    <div class="place-regulars">
      <div class="muted small">Stammgäste:</div>
      <div class="place-avatars">
        ${chars.map(c => `<div class="place-avatar"><div class="avatar">${avatarSvg(c.avatar || 0)}</div><div class="muted small">${escapeHtml(c.name)}</div></div>`).join('')}
      </div>
    </div>
  `;
  detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

  __M.initPlaces = initPlaces;
  __M.getPlaces = getPlaces;
  __M.renderMap = renderMap;
})();

// ===== minigame.js =====
(function(){
  var Store = __M.Store;
  var getCharacter = __M.getCharacter;
  var avatarSvg = __M.avatarSvg;
  var SFX = __M.SFX;
// minigame.js — Bot-or-Human-Quiz. Wird in W12 als optionales Event freigeschaltet.



const ROUNDS = [
  {
    profiles: [
      { handle: '@truth_warrior_88', name: 'truth_warrior_88', avatar: 10, bio: 'wacht nicht schläft',
        post: 'WAS DIE MEDIEN VERSCHWEIGEN — Heute 18 Uhr Live! Teilen für die Wahrheit! 🔥🔥🔥',
        joined: 'vor 3 Wochen', posts_per_day: '47', followers: '212',
        bot: true, tell: 'Account-Alter sehr jung, hohe Posting-Frequenz, Generisches "Truth"-Naming-Schema mit Zahl.' },
      { handle: '@nele.lit', name: 'Nele', avatar: 6, bio: 'Buch-Rezensionen',
        post: 'Hab heute „Die Quelle" beendet. Erste Hälfte stark, zweite konstruiert. 6/10.',
        joined: 'vor 4 Jahren', posts_per_day: '0,4', followers: '380',
        bot: false, tell: 'Persönliches Urteil, normale Posting-Frequenz, alter Account.' }
    ]
  },
  {
    profiles: [
      { handle: '@klara_k', name: 'KlaraKomm', avatar: 11, bio: 'folge für Free Stuff',
        post: '💎💎 GEWINNSPIEL! Folgen + Liken + 5 Freunde taggen = iPhone! Verlosung Sonntag! Link in Bio 💎💎',
        joined: 'vor 11 Tagen', posts_per_day: '12', followers: '8,3k',
        bot: true, tell: 'Klassischer Engagement-Bait-Schema, sehr junger Account mit hoher Follower-Zahl (gekauft).' },
      { handle: '@tariq_dot', name: 'Tariq', avatar: 5, bio: 'Physik-Nerd, Uni HH',
        post: 'Heute in der Vorlesung: Maxwell-Gleichungen, vierte Form. Mein Lieblingsmoment in Physik bisher.',
        joined: 'vor 2 Jahren', posts_per_day: '0,8', followers: '156',
        bot: false, tell: 'Inhalt fachlich-spezifisch, niedrige Frequenz, realistische Follower-Zahl.' }
    ]
  },
  {
    profiles: [
      { handle: '@lara.feminismus', name: 'Lara Weiss', avatar: 24, bio: 'Aktivistin · Autorin',
        post: 'Bin gerade aus einer Lesung in Bremen zurück. Drei Stunden Diskussion, viele neue Fragen mitgenommen.',
        joined: 'vor 6 Jahren', posts_per_day: '1,2', followers: '24k',
        bot: false, tell: 'Persönlicher Tonfall, etablierter Account, plausibles Posting-Verhalten.' },
      { handle: '@bens_real', name: 'Benedikt Schmitt', avatar: 7, bio: '"sagt, was ist" · 38k Follower',
        post: 'Die LÜGEN der Eliten zerlegen — heute Abend 20 Uhr. Wer NICHT zuhört, ist Teil des Problems.',
        joined: 'vor 1,5 Jahren', posts_per_day: '8',  followers: '38k',
        bot: false, tell: 'Mensch, aber Profi-Empörer. Diese Tonalität ist Strategie, kein Bot — und genau das macht ihn schwer einzuordnen.' }
    ]
  }
];

function runMinigame(root, onClose) {
  let idx = 0;
  let score = 0;
  const guesses = [];

  function renderRound() {
    if (idx >= ROUNDS.length) {
      finish();
      return;
    }
    const round = ROUNDS[idx];
    root.innerHTML = `
      <div class="minigame-header">
        <h2>Bot oder Mensch?</h2>
        <div class="minigame-progress">Runde ${idx + 1} / ${ROUNDS.length} · Punkte: ${score}</div>
      </div>
      <p class="muted">Markiere für jedes Profil: Bot oder Mensch. Es können auch zwei Menschen oder zwei Bots sein.</p>
      <div class="minigame-profiles">
        ${round.profiles.map((p, i) => `
          <div class="minigame-profile" data-i="${i}">
            <div class="mp-head">
              <div class="avatar">${avatarSvg(p.avatar)}</div>
              <div>
                <div class="mp-name">${escapeHtml(p.name)}</div>
                <div class="mp-handle muted small">${escapeHtml(p.handle)}</div>
              </div>
            </div>
            <div class="mp-bio muted small">${escapeHtml(p.bio)}</div>
            <div class="mp-post">${escapeHtml(p.post)}</div>
            <div class="mp-stats">
              <span>📅 ${escapeHtml(p.joined)}</span>
              <span>✍️ ${escapeHtml(p.posts_per_day)}/Tag</span>
              <span>👥 ${escapeHtml(p.followers)}</span>
            </div>
            <div class="mp-vote">
              <button type="button" class="mp-btn" data-guess="bot">Bot</button>
              <button type="button" class="mp-btn" data-guess="human">Mensch</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="minigame-actions">
        <button class="btn btn-primary" id="mg-submit" disabled>Auflösen</button>
      </div>
      <div id="mg-feedback" class="mg-feedback" hidden></div>
    `;

    const chosen = {};
    root.querySelectorAll('.minigame-profile').forEach(card => {
      const i = parseInt(card.dataset.i, 10);
      card.querySelectorAll('.mp-btn').forEach(b => {
        b.onclick = () => {
          chosen[i] = b.dataset.guess;
          card.querySelectorAll('.mp-btn').forEach(x => x.classList.remove('selected'));
          b.classList.add('selected');
          updateSubmit();
        };
      });
    });
    const submit = root.querySelector('#mg-submit');
    function updateSubmit() {
      submit.disabled = Object.keys(chosen).length < round.profiles.length;
    }
    submit.onclick = () => {
      const fb = root.querySelector('#mg-feedback');
      fb.hidden = false;
      let html = '<h3>Auflösung</h3>';
      let roundScore = 0;
      round.profiles.forEach((p, i) => {
        const guess = chosen[i];
        const correct = (guess === 'bot') === !!p.bot;
        if (correct) roundScore++;
        html += `<div class="mg-resolve ${correct ? 'ok' : 'bad'}">
          <strong>${escapeHtml(p.handle)}: ${p.bot ? 'Bot' : 'Mensch'}</strong> — ${correct ? 'richtig' : 'falsch'}.
          <br/><span class="muted small">${escapeHtml(p.tell)}</span>
        </div>`;
      });
      score += roundScore;
      guesses.push({ round: idx, score: roundScore, max: round.profiles.length });
      fb.innerHTML = html + `<button class="btn btn-primary" id="mg-next">${idx < ROUNDS.length - 1 ? 'Nächste Runde' : 'Ergebnis'}</button>`;
      fb.querySelector('#mg-next').onclick = () => { idx++; renderRound(); };
      SFX.swipe();
    };
  }

  function finish() {
    const total = ROUNDS.reduce((a, r) => a + r.profiles.length, 0);
    const verdict = score >= total - 1 ? 'Sehr gut.' : score >= total / 2 ? 'Solide — die Mischformen sind echt schwer.' : 'Schwierig, oder? Genau deshalb funktionieren Bots so gut.';
    if (!Store.data.minigameResults) Store.data.minigameResults = {};
    Store.data.minigameResults.bot_or_human = { score, total, ts: Date.now() };
    Store.save();
    SFX.badge();
    root.innerHTML = `
      <div class="minigame-finish">
        <h2>${score} / ${total}</h2>
        <p>${escapeHtml(verdict)}</p>
        <p class="muted small">Echte Plattformen schaffen es selten, Bots zuverlässig zu markieren — auch nicht mit dem Score-Profil aus dem Backend, das du gerade gesehen hast.</p>
        <button class="btn btn-primary" id="mg-close">Zurück</button>
      </div>
    `;
    root.querySelector('#mg-close').onclick = onClose;
  }

  renderRound();
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

  __M.runMinigame = runMinigame;
})();

// ===== classcompare.js =====
(function(){
// classcompare.js — Mehrere Streem-Saves laden und anonymisiert vergleichen.
// Für den Klassen-Reflexionsteil am Ende der Projektwoche.

function renderClassCompare(root, onClose) {
  root.innerHTML = `
    <header class="cc-head">
      <h2>Klassen-Vergleich</h2>
      <button class="btn btn-ghost" id="cc-close">Schließen</button>
    </header>
    <p class="muted">Lade die <strong>JSON-Spielstände</strong> deiner Klasse hier hoch. Namen werden auf Wunsch anonymisiert. Es passiert alles lokal — nichts wird hochgeladen.</p>
    <div class="cc-controls">
      <label class="btn btn-primary cc-upload">
        Spielstände auswählen
        <input type="file" id="cc-files" multiple accept=".json,application/json" hidden />
      </label>
      <label class="cc-anon">
        <input type="checkbox" id="cc-anon" checked /> Namen anonymisieren
      </label>
      <button class="btn btn-ghost" id="cc-export" disabled>Bericht als HTML</button>
    </div>
    <div id="cc-result" class="cc-result"></div>
  `;
  root.querySelector('#cc-close').onclick = onClose;

  const input = root.querySelector('#cc-files');
  const anon = root.querySelector('#cc-anon');
  const exportBtn = root.querySelector('#cc-export');
  const result = root.querySelector('#cc-result');
  let loaded = [];

  input.onchange = async () => {
    loaded = [];
    for (const file of input.files) {
      try {
        const text = await file.text();
        const save = JSON.parse(text);
        if (save && save.character && save.userProfile) {
          loaded.push({ filename: file.name, save });
        }
      } catch (e) {
        console.warn('Konnte Datei nicht lesen:', file.name, e);
      }
    }
    if (!loaded.length) {
      result.innerHTML = '<p class="muted">Keine gültigen Spielstände gefunden. Format: JSON-Export aus „Einstellungen → Spielstand exportieren".</p>';
      exportBtn.disabled = true;
      return;
    }
    renderResult();
    exportBtn.disabled = false;
  };

  anon.onchange = renderResult;

  function renderResult() {
    if (!loaded.length) return;
    const rows = loaded.map((it, i) => extractRow(it, i + 1, anon.checked));
    result.innerHTML = buildReportHtml(rows);
  }

  exportBtn.onclick = () => {
    if (!loaded.length) return;
    const rows = loaded.map((it, i) => extractRow(it, i + 1, anon.checked));
    const html = buildStandaloneHtml(rows, anon.checked);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'streem-klassenbericht.html';
    document.body.appendChild(a); a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 500);
  };
}

function extractRow(item, idx, anonymize) {
  const s = item.save;
  const c = s.character || {};
  const p = s.userProfile || {};
  const actions = (s.history || []).flatMap(h => h.actions || []);
  const angry = actions.filter(a => a.type === 'angry_comment').length;
  const likes = actions.filter(a => a.type === 'like').length;
  const tw = s.contentWarningsAccepted || {};
  const twSkipped = Object.values(tw).reduce((a, b) => a + (b.skipped || 0), 0);
  const twShown = Object.values(tw).reduce((a, b) => a + (b.shown || 0), 0);
  const topInterest = Object.entries(p.interests || {}).sort((a, b) => b[1] - a[1])[0];
  const guilds = s.guildMemberships || [];
  const inRabbitHole = guilds.includes('echte_werte');
  return {
    label: anonymize ? `Spieler:in ${idx}` : (c.name || `Spieler:in ${idx}`),
    protagonist: c.protagonist || 'alex',
    lean: p.political_lean_estimated || 0,
    topTag: topInterest ? topInterest[0] : '—',
    topVal: topInterest ? topInterest[1] : 0,
    follows: (p.followed || []).length,
    muted: (p.muted || []).length,
    likes,
    angry,
    ownPosts: (s.ownPosts || []).length,
    twSkipped, twShown,
    inRabbitHole,
    guilds: guilds.length,
    voted: s.electionVote || null,
    interests: p.interests || {}
  };
}

function buildReportHtml(rows) {
  const n = rows.length;
  const avg = rows.reduce((a, r) => a + r.lean, 0) / n;
  const leftCount = rows.filter(r => r.lean < -0.2).length;
  const rightCount = rows.filter(r => r.lean > 0.2).length;
  const midCount = n - leftCount - rightCount;
  const rabbit = rows.filter(r => r.inRabbitHole).length;
  return `
    <h3>Übersicht · ${n} Spielstände</h3>
    <div class="cc-stats">
      <div class="cc-stat"><b>${avg.toFixed(2)}</b><span class="muted small">Ø politischer Lean</span></div>
      <div class="cc-stat"><b>${leftCount}</b><span class="muted small">links der Mitte</span></div>
      <div class="cc-stat"><b>${midCount}</b><span class="muted small">Mitte</span></div>
      <div class="cc-stat"><b>${rightCount}</b><span class="muted small">rechts der Mitte</span></div>
      <div class="cc-stat"><b>${rabbit}</b><span class="muted small">in „Echte Werte"</span></div>
    </div>
    <h3>Verteilung politische Neigung</h3>
    <div class="cc-leans">
      ${rows.map(r => `<div class="cc-lean-row"><span class="cc-name">${escapeHtml(r.label)}</span><div class="cc-lean-track"><div class="cc-lean-dot" style="left:${Math.round((r.lean + 1) * 50)}%"></div></div></div>`).join('')}
    </div>
    <h3>Tabelle</h3>
    <table class="cc-table">
      <thead><tr><th>Spieler:in</th><th>Protagonist</th><th>Top-Thema</th><th>Lean</th><th>Likes</th><th>wütende Kommentare</th><th>tw übersprungen</th><th>gewählt</th></tr></thead>
      <tbody>
        ${rows.map(r => `<tr>
          <td>${escapeHtml(r.label)}</td>
          <td>${escapeHtml(r.protagonist)}</td>
          <td>${escapeHtml(r.topTag)}</td>
          <td>${r.lean.toFixed(2)}</td>
          <td>${r.likes}</td>
          <td>${r.angry}</td>
          <td>${r.twSkipped}/${r.twSkipped + r.twShown}</td>
          <td>${r.voted ? escapeHtml(r.voted) : '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  `;
}

function buildStandaloneHtml(rows, anonymize) {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<title>Streem-Klassenbericht</title>
<style>
  body { font-family: -apple-system, "Segoe UI", sans-serif; max-width: 920px; margin: 2rem auto; padding: 1rem; color: #1f2230; }
  h1 { color: #c026d3; }
  h3 { color: #4338ca; margin-top: 2rem; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 14px; }
  th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background: #f4f5fa; }
  .cc-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin: 1rem 0; }
  .cc-stat { background: #f4f5fa; padding: 12px; border-radius: 8px; border-left: 3px solid #c026d3; }
  .cc-stat b { display: block; font-size: 22px; }
  .muted { color: #777; } .small { font-size: 13px; }
  .cc-leans { display: flex; flex-direction: column; gap: 6px; }
  .cc-lean-row { display: grid; grid-template-columns: 180px 1fr; gap: 10px; align-items: center; }
  .cc-name { font-size: 14px; }
  .cc-lean-track { height: 10px; background: linear-gradient(90deg, #60a5fa, #aaa 50%, #f97316); border-radius: 5px; position: relative; }
  .cc-lean-dot { position: absolute; top: -3px; width: 14px; height: 14px; border-radius: 50%; background: #1f2230; transform: translateX(-50%); }
  .foot { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; color: #777; font-size: 13px; }
</style></head>
<body>
  <h1>Klassenbericht „Der Algorithmus"</h1>
  <p>Anonymisiert: ${anonymize ? 'ja' : 'nein'} · ${rows.length} Spielstände · Stand ${new Date().toLocaleString('de-DE')}</p>
  ${buildReportHtml(rows)}
  <div class="foot">Erstellt im Browser. Keine Daten wurden hochgeladen.</div>
</body></html>`;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

  __M.renderClassCompare = renderClassCompare;
})();

// ===== push.js =====
(function(){
  var Store = __M.Store;
  var SFX = __M.SFX;
// push.js — Fake-Push-Notifications, die mid-Feed hochpoppen.
// Didaktischer Sinn: SuS sollen die Manipulationsmechanik nicht nur lesen,
// sondern selbst spüren.


const TEMPLATES = [
  { id: 'mention_sara',    from: 'Streem', text: 'Sara hat dich in einem Kommentar erwähnt.',         deceptive: true,  week_min: 3 },
  { id: 'streak',          from: 'Streem', text: 'Du bist seit {W} Wochen aktiv — Streak halten!',     deceptive: true,  week_min: 7 },
  { id: 'reactivate',      from: 'Streem', text: '3 neue Aktivitäten warten auf dich.',                deceptive: true,  week_min: 5 },
  { id: 'trending',        from: 'Streem', text: 'Dein Post von letzter Woche bekommt jetzt Schub.',   deceptive: true,  week_min: 8, needs_own_post: true },
  { id: 'finn_typing',     from: 'Streem', text: 'Finn schreibt dir gerade…',                          deceptive: true,  week_min: 8 },
  { id: 'similar_account', from: 'Streem', text: 'Jemand, dem du ähnelst, folgt jetzt einer Gilde.',   deceptive: true,  week_min: 10 },
  { id: 'fomo',            from: 'Streem', text: '12 Personen aus Greifshafen sind gerade online.',    deceptive: true,  week_min: 6 },
  { id: 'badge_ready',     from: 'Streem', text: 'Ein neues Abzeichen ist fast freigeschaltet — bleib dran!', deceptive: true, week_min: 4 }
];

const RATE_LIMIT_WEEKS = 2; // höchstens alle 2 Wochen ein Push.

function pickTemplate() {
  const w = Store.data.currentWeek;
  const seen = Store.data.pushNotificationsSeen || {};
  const hasOwn = (Store.data.ownPosts || []).length > 0;
  const eligible = TEMPLATES.filter(t => {
    if (t.week_min > w) return false;
    if (t.needs_own_post && !hasOwn) return false;
    if (seen[t.id]) return false;
    return true;
  });
  if (!eligible.length) return null;
  // Deterministisch pro Woche, damit es nicht zufällig springt bei Re-Render.
  const idx = (w * 7 + (Store.data.random_seed || 1)) % eligible.length;
  return eligible[idx];
}

let lastShownWeek = -RATE_LIMIT_WEEKS;

function maybeShowPush() {
  const w = Store.data.currentWeek;
  if (w - lastShownWeek < RATE_LIMIT_WEEKS) return false;
  if (w < 3) return false; // erste Wochen ruhig lassen.
  const t = pickTemplate();
  if (!t) return false;
  lastShownWeek = w;
  showPushBanner(t);
  if (!Store.data.pushNotificationsSeen) Store.data.pushNotificationsSeen = {};
  Store.data.pushNotificationsSeen[t.id] = w;
  Store.save();
  return true;
}

function showPushBanner(template) {
  const w = Store.data.currentWeek;
  const text = template.text.replace('{W}', w);
  const banner = document.createElement('div');
  banner.className = 'push-banner';
  banner.setAttribute('role', 'alert');
  banner.innerHTML = `
    <div class="push-app">📱 ${escapeHtml(template.from)}</div>
    <div class="push-body">
      <div class="push-text">${escapeHtml(text)}</div>
      <button class="push-close" aria-label="Schließen">×</button>
    </div>
    <div class="push-disclaimer muted small">${template.deceptive ? 'Das war eine fiktive Notification. Echte Apps senden so etwas, um dich zurückzuholen — meistens, ohne dass etwas Echtes passiert ist.' : ''}</div>
  `;
  document.body.appendChild(banner);
  SFX.toast();
  // Slide-in via Klasse.
  requestAnimationFrame(() => banner.classList.add('in'));
  const close = () => {
    banner.classList.remove('in');
    setTimeout(() => banner.remove(), 280);
    clearTimeout(autoClose);
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  banner.querySelector('.push-close').onclick = close;
  banner.addEventListener('click', e => {
    if (e.target === banner.querySelector('.push-close')) return;
    // Klick auf Banner zeigt den Disclaimer (Reflexionsmoment).
    banner.classList.add('expanded');
  });
  const autoClose = setTimeout(close, 6500);
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

  __M.maybeShowPush = maybeShowPush;
})();

// ===== tutorial.js =====
(function(){
  var Store = __M.Store;
// tutorial.js — Erst-Erklärungs-Tooltips beim allerersten Feed-Render.

const STEPS = [
  {
    selector: '.post-card .actions',
    text: 'Likes, Kommentare und Shares füttern den Algorithmus. Auch wütende Kommentare gelten als Engagement — das ist genau der Punkt.',
    placement: 'top'
  },
  {
    selector: '.bottombar .navbtn[data-view="dms"]',
    text: 'Hier landen Direkt-Nachrichten von NPCs. Lea, Finn, Mira melden sich im Lauf der Wochen. Deine Antworten verändern, was passiert.',
    placement: 'top'
  },
  {
    selector: '.stories-bar .story-item:first-child',
    text: 'Stories: 24-h-Inhalte. Klick öffnet sie. Nach einer Spielwoche verschwinden sie.',
    placement: 'bottom'
  }
];

function maybeRunTutorial() {
  if (Store.data.tutorialDone) return;
  if (Store.data.currentWeek > 0) { Store.data.tutorialDone = true; Store.save(); return; }
  setTimeout(() => runTutorial(0), 800);
}

function runTutorial(idx) {
  if (idx >= STEPS.length) {
    Store.data.tutorialDone = true;
    Store.save();
    return;
  }
  const step = STEPS[idx];
  const target = document.querySelector(step.selector);
  if (!target) { runTutorial(idx + 1); return; }

  const overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';

  const spot = document.createElement('div');
  spot.className = 'tutorial-spot';

  const tip = document.createElement('div');
  tip.className = 'tutorial-tip placement-' + (step.placement || 'top');
  tip.innerHTML = `
    <p>${escapeHtml(step.text)}</p>
    <div class="tutorial-actions">
      <span class="muted small">Schritt ${idx + 1} von ${STEPS.length}</span>
      <div>
        <button class="btn btn-ghost btn-small" id="tut-skip">Überspringen</button>
        <button class="btn btn-primary btn-small" id="tut-next">${idx === STEPS.length - 1 ? 'Verstanden' : 'Weiter'}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(spot);
  document.body.appendChild(tip);

  positionAround(target, spot, tip, step.placement);

  const close = () => {
    overlay.remove(); spot.remove(); tip.remove();
  };
  tip.querySelector('#tut-next').onclick = () => { close(); runTutorial(idx + 1); };
  tip.querySelector('#tut-skip').onclick = () => { close(); Store.data.tutorialDone = true; Store.save(); };
}

function positionAround(target, spot, tip, placement) {
  const rect = target.getBoundingClientRect();
  const pad = 8;
  spot.style.left   = (rect.left - pad) + 'px';
  spot.style.top    = (rect.top - pad) + 'px';
  spot.style.width  = (rect.width + pad * 2) + 'px';
  spot.style.height = (rect.height + pad * 2) + 'px';

  const tipW = 280;
  let tipX = rect.left + rect.width / 2 - tipW / 2;
  if (tipX < 8) tipX = 8;
  if (tipX + tipW > window.innerWidth - 8) tipX = window.innerWidth - tipW - 8;
  tip.style.width = tipW + 'px';
  tip.style.left  = tipX + 'px';

  if (placement === 'bottom') {
    tip.style.top = (rect.bottom + 18) + 'px';
  } else {
    const tipH = tip.offsetHeight || 140;
    tip.style.top = Math.max(8, rect.top - tipH - 18) + 'px';
  }
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

  __M.maybeRunTutorial = maybeRunTutorial;
})();

// ===== concepts.js =====
(function(){
  var Store = __M.Store;
// concepts.js — Kurze Konzept-Karten, die vor didaktischen Wendepunkten
// angezeigt werden. Bewusst sehr knapp gehalten — eine Karte ≤ 60 Sekunden Lesezeit.

const CONCEPTS = {
  bots_intro: {
    title: 'Was ist ein Bot?',
    points: [
      'Ein Bot ist ein automatisiertes Konto, das aussieht wie ein Mensch — postet, liked, kommentiert.',
      'Typische Tells: sehr junger Account, hohe Posting-Frequenz, generisches Profilbild oder Naming-Schema mit Zahlen.',
      'Gefährlich, weil sie Stimmungen verstärken können, ohne dass jemand dafür Verantwortung trägt.',
      'Plattformen erkennen viele, aber nicht alle. Manche Profile sind „Cyborgs": teils Mensch, teils Auto-Posting.'
    ],
    bg: 'tech'
  },
  bot_minigame_intro: {
    title: 'Gleich: Bot oder Mensch?',
    points: [
      'Du siehst gleich Profile mit Bio, Beitrag, Account-Alter und Posting-Frequenz.',
      'Markiere für jedes: Bot oder Mensch. Beide können vorkommen — auch beide Bots oder beide Menschen.',
      'Es ist absichtlich nicht immer eindeutig. Genau das ist der Punkt.'
    ],
    bg: 'tech'
  },
  algorithm_panel_intro: {
    title: 'Blick hinter den Algorithmus',
    points: [
      'Plattformen speichern Modelle über dich. Deine Interessen, deine politische Neigung, deine Outrage-Toleranz.',
      'Diese Werte siehst du oben rechts unter 🔍 — sie werden mit jeder Aktion neu justiert.',
      'In der echten Welt sind diese Werte meist nicht einsehbar. Streem ist hier ehrlich, damit du siehst, wie es funktioniert.'
    ],
    bg: 'tech'
  },
  ads_intro: {
    title: 'Warum jetzt Anzeigen?',
    points: [
      'Anzeigen sind gekennzeichnet. Sie werden nach deinen Interessen ausgespielt — die Plattform verdient daran.',
      'Politische Anzeigen sind besonders heikel: sie können gezielt nur bestimmte Gruppen erreichen ohne öffentliche Debatte.',
      'Klick „Warum sehe ich das?" unter Anzeigen, um das Targeting zu sehen.'
    ],
    bg: 'commerce'
  }
};

let queued = null;

function queueConcept(key) {
  if (!CONCEPTS[key]) return;
  if (Store.data.conceptsSeen?.[key]) return;
  queued = key;
}

function maybeShowQueuedConcept() {
  if (!queued) return false;
  const key = queued;
  queued = null;
  showConcept(key);
  return true;
}

function showConcept(key) {
  const c = CONCEPTS[key];
  if (!c) return;
  if (!Store.data.conceptsSeen) Store.data.conceptsSeen = {};
  Store.data.conceptsSeen[key] = Date.now();
  Store.save();

  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay concept-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="concept-box concept-bg-${c.bg}">
      <div class="concept-kicker">Kurz erklärt</div>
      <h2>${escapeHtml(c.title)}</h2>
      <ul class="concept-points">
        ${c.points.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
      </ul>
      <button class="btn btn-primary concept-go" id="concept-close">Verstanden</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#concept-close').onclick = close;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

  __M.queueConcept = queueConcept;
  __M.maybeShowQueuedConcept = maybeShowQueuedConcept;
  __M.showConcept = showConcept;
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
  var setDynamicHook = __M.setDynamicHook;
  var setPostsLookup = __M.setPostsLookup;
  var renderWrapped = __M.renderWrapped;
  var initSandbox = __M.initSandbox;
  var renderSandbox = __M.renderSandbox;
  var explainPost = __M.explainPost;
  var initDms = __M.initDms;
  var renderDmList = __M.renderDmList;
  var renderDmThread = __M.renderDmThread;
  var dmUnread = __M.unreadCount;
  var initPlaces = __M.initPlaces;
  var renderMap = __M.renderMap;
  var runMinigame = __M.runMinigame;
  var renderClassCompare = __M.renderClassCompare;
  var SFX = __M.SFX;
  var setSoundEnabled = __M.setSoundEnabled;
  var maybeQueueMicroReflection = __M.maybeQueueMicroReflection;
  var generateRepliesForJustEndedWeek = __M.generateRepliesForJustEndedWeek;
  var maybeShowPush = __M.maybeShowPush;
  var maybeRunTutorial = __M.maybeRunTutorial;
  var showConcept = __M.showConcept;
// main.js — Einstieg, Routing, Orchestrierung aller Module.

















// ===== Daten-Bundle (statt fetch, damit file:// funktioniert) =====
// Die JSONs werden zur Laufzeit geladen — funktioniert per fetch() auch bei file://
// nicht in allen Browsern. Daher: wir importieren sie per script-tags als ES-module-wrapped JSON.
// Alternative: fetch mit Fallback. Wir nutzen fetch + try/catch.

const DATA_FILES = ['posts.json','characters.json','events.json','ads.json','weeks.json','protagonists.json','dms.json','stories.json'];
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
  setDynamicHook(dynamicCharacterOverlay);
  initFeed({
    posts: DATA.posts.posts,
    ads: DATA.ads.ads,
    weeks: DATA.weeks.weeks,
    stories: DATA.stories?.stories || []
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
  initDms({ threads: DATA.dms?.threads || [] });
  initPlaces({ places: DATA.stories?.places || [] });

  setFeedCallbacks({
    onWeekEnd: handleWeekEnd,
    onOpenCompose: () => {},
    onOpenStory: openStory
  });

  bindGlobal();

  // Spielstand?
  if (Store.load()) {
    document.getElementById('btn-continue').hidden = false;
  }
  applyTheme(Store.data?.theme || 'dark');
  maybeShowTeacherBanner();
  showScreen('screen-start');
}

// Lehrer-Modus: ?day=1|2|3 in der URL blendet einen Fokus-Hinweis ein,
// der die didaktischen Schwerpunkte des Schultags umreißt.
function maybeShowTeacherBanner() {
  let day = null;
  try {
    const p = new URLSearchParams(window.location.search);
    day = parseInt(p.get('day'), 10);
  } catch (e) { return; }
  if (!day || day < 1 || day > 3) return;
  const FOCUS = {
    1: { title: 'Tag 1 · Onboarding & erste Wochen', text: 'Heute geht es um Vertrautwerden mit dem Feed. Achtet besonders auf die Stories-Bar, die ersten Likes, und wie sich euer Algorithmus-Profil schon in W4 zeigt.' },
    2: { title: 'Tag 2 · Mechanik wird sichtbar', text: 'Heute schalten sich Anzeigen, das Algorithmus-Panel, Bots und Gilden frei. Schaut mindestens einmal in „Blick hinter den Algorithmus" (🔍 oben). Bot-Quiz in W12 — bitte mitnehmen.' },
    3: { title: 'Tag 3 · Wahlkampf, Wrapped, Sandbox', text: 'Heute Wahltag, Jahresrückblick, eigener Algorithmus. Wer Zeit hat: Sandbox-Presets „Empörungs-Booster" und „Ruhe-Modus" ausprobieren und vergleichen.' }
  };
  const f = FOCUS[day];
  const banner = document.createElement('div');
  banner.className = 'teacher-banner';
  banner.innerHTML = `
    <div class="teacher-banner-inner">
      <strong>${f.title}</strong>
      <p>${f.text}</p>
      <button class="teacher-banner-close" aria-label="Hinweis ausblenden">Verstanden</button>
    </div>
  `;
  document.body.appendChild(banner);
  banner.querySelector('.teacher-banner-close').onclick = () => banner.remove();
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
  const reportBtn = document.getElementById('btn-export-report');
  if (reportBtn) reportBtn.onclick = exportReport;
  document.getElementById('btn-show-wrapped-now').onclick = () => {
    showScreen('screen-wrapped');
    renderWrapped(
      () => { showScreen('screen-sandbox'); renderSandbox(() => showScreen('screen-main')); },
      () => { showScreen('screen-manifest'); renderManifestForm(); }
    );
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
      const view = b.dataset.view;
      if (view === 'dms') {
        openDmInbox();
      } else {
        renderFeed(view);
      }
    };
  });

  // Karte
  const mapBtn = document.getElementById('btn-map');
  if (mapBtn) mapBtn.onclick = openMap;

  // Klassen-Vergleich
  const ccBtn = document.getElementById('btn-classcompare');
  if (ccBtn) ccBtn.onclick = openClassCompare;

  // Sound-Toggle
  const soundChk = document.getElementById('chk-sound');
  if (soundChk) {
    soundChk.checked = Store.data?.soundEnabled !== false;
    soundChk.onchange = () => {
      setSoundEnabled(soundChk.checked);
      if (soundChk.checked) SFX.toast();
    };
  }

  // Light-Mode-Toggle
  const lightChk = document.getElementById('chk-light');
  if (lightChk) {
    lightChk.checked = Store.data?.theme === 'light';
    lightChk.onchange = () => {
      const t = lightChk.checked ? 'light' : 'dark';
      if (Store.data) { Store.data.theme = t; Store.save(); }
      applyTheme(t);
    };
  }

  // Bot-Minigame jederzeit wiederholbar
  const mgBtn = document.getElementById('btn-minigame');
  if (mgBtn) mgBtn.onclick = () => { showScreen('screen-main'); openBotMinigame(); };

  // Wochen-Sprung für Lehrkraft
  const jumpBtn = document.getElementById('btn-jump-week');
  if (jumpBtn) jumpBtn.onclick = openWeekJump;

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
  // Protagonist-Picker (oben).
  const pp = document.getElementById('protagonist-picker');
  const protagonists = DATA.protagonists?.protagonists || [];
  let chosenProtagonist = protagonists[0]?.id || 'alex';
  if (pp) {
    pp.innerHTML = '';
    for (const pr of protagonists) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'protagonist-card' + (pr.id === chosenProtagonist ? ' selected' : '');
      card.dataset.id = pr.id;
      card.setAttribute('aria-pressed', pr.id === chosenProtagonist ? 'true' : 'false');
      card.innerHTML = `
        <div class="proto-avatar">${avatarSvg(pr.avatar_suggest || 0)}</div>
        <div class="proto-name">${escapeHtml(pr.name)}</div>
        <div class="proto-tag">${escapeHtml(pr.tagline)}</div>
        <div class="proto-back muted small">${escapeHtml(pr.backstory)}</div>
      `;
      card.onclick = () => {
        pp.querySelectorAll('.protagonist-card').forEach(x => { x.classList.remove('selected'); x.setAttribute('aria-pressed','false'); });
        card.classList.add('selected');
        card.setAttribute('aria-pressed','true');
        chosenProtagonist = pr.id;
        applyProtoDefaults(pr);
      };
      pp.appendChild(card);
    }
  }

  function applyProtoDefaults(pr) {
    const nameInput = document.getElementById('inp-name');
    if (nameInput && !nameInput.dataset.userEdited) nameInput.value = pr.name;
    chosenAvatar = pr.avatar_suggest || 0;
    ap.querySelectorAll('button').forEach((x, i) => {
      x.classList.toggle('selected', i === chosenAvatar);
      x.setAttribute('aria-pressed', i === chosenAvatar ? 'true' : 'false');
    });
    chosen.clear();
    for (const t of pr.start_interests || []) chosen.add(t);
    ig.querySelectorAll('button').forEach(btn => {
      btn.classList.toggle('selected', chosen.has(btn.dataset.tag));
    });
  }

  const nameInput = document.getElementById('inp-name');
  if (nameInput) nameInput.addEventListener('input', () => { nameInput.dataset.userEdited = '1'; });

  // Avatare.
  const ap = document.getElementById('avatar-picker');
  ap.innerHTML = '';
  let chosenAvatar = protagonists[0]?.avatar_suggest || 0;
  for (let i = 0; i < 12; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = avatarSvg(i);
    b.setAttribute('aria-label', `Avatar ${i + 1} von 12`);
    b.setAttribute('aria-pressed', i === chosenAvatar ? 'true' : 'false');
    if (i === chosenAvatar) b.classList.add('selected');
    b.onclick = () => {
      ap.querySelectorAll('button').forEach(x => { x.classList.remove('selected'); x.setAttribute('aria-pressed','false'); });
      b.classList.add('selected');
      b.setAttribute('aria-pressed', 'true');
      chosenAvatar = i;
    };
    b.dataset.idx = i;
    ap.appendChild(b);
  }

  const ig = document.getElementById('interest-grid');
  ig.innerHTML = '';
  const chosen = new Set(protagonists[0]?.start_interests || []);
  for (const t of INTERESTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t.label;
    b.dataset.tag = t.k;
    if (chosen.has(t.k)) b.classList.add('selected');
    b.onclick = () => {
      if (chosen.has(t.k)) { chosen.delete(t.k); b.classList.remove('selected'); }
      else if (chosen.size < 4) { chosen.add(t.k); b.classList.add('selected'); }
    };
    ig.appendChild(b);
  }

  window.__introState = {
    get avatar() { return chosenAvatar; },
    get interests() { return [...chosen]; },
    get protagonist() { return chosenProtagonist; }
  };
}

function openIntro() { showScreen('screen-intro'); }

function startGame() {
  const name = document.getElementById('inp-name').value.trim() || 'Alex';
  const pronoun = document.getElementById('inp-pronoun').value;
  const bio = (document.getElementById('inp-bio')?.value || '').trim().slice(0, 180);
  const avatar = window.__introState.avatar;
  const interests = window.__introState.interests.length ? window.__introState.interests : ['lifestyle','humor'];
  const protaId = window.__introState.protagonist || 'alex';
  const pro = (DATA.protagonists?.protagonists || []).find(p => p.id === protaId);
  Store.start({ name, pronoun, avatar, interests_initial: interests, city: 'Greifshafen', bio, protagonist: protaId });
  if (pro && typeof pro.start_lean === 'number') {
    Store.data.userProfile.political_lean_estimated = pro.start_lean;
    Store.data.initialProfileSnapshot = structuredClone(Store.data.userProfile);
    Store.save();
  }
  enterMain();
  toast('Willkommen bei Streem!', { long: true });
}

// ===== Main-Loop =====
function enterMain() {
  showScreen('screen-main');
  updateTopbar();
  renderFeed('feed');
  maybeUnlockForWeek();
  // Tutorial nur beim allerersten Reinkommen.
  maybeRunTutorial();
  // Fake-Push verzögert, sodass es mid-scroll wirkt — nicht direkt beim Reinkommen.
  setTimeout(() => maybeShowPush(), 4500);
}

function updateTopbar() {
  const ind = document.getElementById('week-indicator');
  const w = Store.data.currentWeek;
  ind.textContent = `W ${w} · Tag ${Store.getDay()}`;
  document.getElementById('btn-algo-panel').hidden = !Store.isUnlocked('algorithm_panel');
  document.getElementById('btn-guilds').hidden = !Store.isUnlocked('discord');
  const mb = document.getElementById('btn-map');
  if (mb) mb.hidden = false;
  updateDmBadge();
}

function updateDmBadge() {
  const btn = document.querySelector('.navbtn[data-view="dms"]');
  if (!btn) return;
  const n = dmUnread();
  let badge = btn.querySelector('.nav-badge');
  if (n > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'nav-badge';
      btn.appendChild(badge);
    }
    badge.textContent = String(n);
  } else if (badge) {
    badge.remove();
  }
}

function openDmInbox() {
  const root = document.getElementById('feed-root');
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'dm-inbox';
  wrap.innerHTML = `
    <div class="feed-header"><h2>Nachrichten</h2><p class="muted small">Direkte Konversationen.</p></div>
    <div id="dm-list-root"></div>
  `;
  root.appendChild(wrap);
  renderDmList(wrap.querySelector('#dm-list-root'), async (thread) => {
    SFX.swipe();
    const root2 = document.getElementById('feed-root');
    root2.innerHTML = '';
    const w2 = document.createElement('div');
    w2.className = 'dm-thread-wrap';
    root2.appendChild(w2);
    await renderDmThread(w2, thread, () => {
      openDmInbox();
      updateDmBadge();
    });
  });
  updateDmBadge();
}

function openStory(story) {
  SFX.swipe();
  const c = getCharacter(story.author);
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay story-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="story-box">
      <div class="story-bar"><div class="story-bar-fill"></div></div>
      <header class="story-head">
        <div class="avatar small">${avatarSvg(c?.avatar || 0)}</div>
        <div>
          <div class="name">${escapeHtml(c?.name || story.author)}</div>
          <div class="muted small">${escapeHtml(c?.handle || '')} · W${story.week}</div>
        </div>
        <button class="story-close" aria-label="Schließen">×</button>
      </header>
      <div class="story-emoji-big">${story.emoji || '·'}</div>
      <div class="story-text">${escapeHtml(story.text)}</div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    clearTimeout(autoClose);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', e => { if (e.target === overlay || e.target.classList.contains('story-close')) close(); });
  const autoClose = setTimeout(close, 5000);
}

function openMap() {
  SFX.swipe();
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const box = document.createElement('div');
  box.className = 'tw-box big';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  renderMap(box, close);
}

function openClassCompare() {
  SFX.swipe();
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const box = document.createElement('div');
  box.className = 'tw-box big';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  renderClassCompare(box, close);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
}

function openWeekJump() {
  const totalWeeks = DATA?.weeks?.weeks?.length || 27;
  const current = Store.data.currentWeek;
  const input = prompt(`Zu welcher Woche springen? (0 bis ${totalWeeks - 1})\n\nAktuell: W${current}\n\nHinweis: Wochen-Sprung ist für Lehrkräfte gedacht und überspringt Reflexionen sowie Wochenrückblicke. Du landest direkt am Feed-Anfang der Ziel-Woche.`, String(current));
  if (input === null) return;
  const target = parseInt(input, 10);
  if (Number.isNaN(target) || target < 0 || target >= totalWeeks) {
    alert('Ungültige Woche.');
    return;
  }
  // Profil minimal anpassen für plausibles Spielgefühl: alle Unlocks bis Ziel-Woche freischalten.
  for (let w = 0; w <= target; w++) {
    const wd = DATA.weeks.weeks[w];
    if (!wd) continue;
    for (const u of wd.unlock || []) Store.unlock(u);
  }
  Store.data.currentWeek = target;
  Store.data.actionsThisWeek = [];
  Store.save();
  showScreen('screen-main');
  enterMain();
  toast(`Sprung zu W${target}.`, { long: true });
}

function openBotMinigame() {
  SFX.swipe();
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  const box = document.createElement('div');
  box.className = 'tw-box big';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  runMinigame(box, close);
}

function maybeUnlockForWeek() {
  const w = Store.data.currentWeek;
  const weekDef = DATA.weeks.weeks[w];
  if (!weekDef) return;
  for (const u of weekDef.unlock || []) Store.unlock(u);
  updateTopbar();

  // Konzept-Karten passend zum Wochen-Unlock.
  const unlocks = weekDef.unlock || [];
  if (unlocks.includes('ads') && !Store.data.conceptsSeen?.ads_intro) {
    setTimeout(() => showConcept('ads_intro'), 800);
  }
  if (unlocks.includes('algorithm_panel') && !Store.data.conceptsSeen?.algorithm_panel_intro) {
    setTimeout(() => showConcept('algorithm_panel_intro'), 1600);
  }
  if (unlocks.includes('bots') && !Store.data.conceptsSeen?.bots_intro) {
    setTimeout(() => showConcept('bots_intro'), 800);
  }

  // Bot-Minigame als optionales Bonbon in W12 (Bot-Unlock-Woche).
  if (w === 12 && !Store.data.minigameResults?.bot_or_human && !Store.data.minigameAsked_bot) {
    Store.data.minigameAsked_bot = true;
    Store.save();
    setTimeout(() => {
      showConcept('bot_minigame_intro');
      setTimeout(() => {
        if (confirm('Bereit für „Bot oder Mensch?"?')) openBotMinigame();
      }, 400);
    }, 2400);
  }
}

function handleWeekEnd(seenIds) {
  // End-of-week: Events triggern, Wrapped-Card zeigen
  const week = Store.data.currentWeek;
  const eventResults = triggerWeekEvents(week);
  const badges = checkBadges();
  generateRepliesForJustEndedWeek(week);
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
    <div class="stat"><div class="num">${topInterest ? tagLabel(topInterest[0]) : '—'}</div><div class="lbl">Top-Thema</div></div>
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
  SFX.weekend();
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
  // Wahl unerledigt? Erzwingen, sonst geht das didaktische Highlight verloren.
  if (Store.data.electionData && !Store.data.electionVote) {
    openElection();
    return;
  }
  // Wrapped?
  if (Store.data.currentWeek >= DATA.weeks.weeks.length) {
    // Letzte Reflexion vor Wrapped, falls noch nicht gemacht.
    if (!Store.data.reflections.final) {
      openReflection('final');
      return;
    }
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
    ],
    final: [
      'Welcher Moment im Spiel ist dir am stärksten geblieben?',
      'Worüber hat dich der Algorithmus am meisten überrascht?',
      'Was nimmst du für deinen echten Social-Media-Alltag mit?'
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
  // Wenn das die Schluss-Reflexion war, geht's direkt ins Wrapped.
  if (which === 'final') {
    advanceWeek();
    return;
  }
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

// NPCs verändern Bio je nach Spielverlauf — wird in getCharacter überlagert.
// Nur ein dünner Datenüberzug, kein Mutieren der Original-Charakter-Records.
function dynamicCharacterOverlay(id, base) {
  if (!Store.data) return null;
  const arcs = Store.data.npcArcs || {};
  if (id === 'char_finn') {
    if ((arcs.finn_path || 0) >= 2) return { bio: 'Mindset > Excuses.' };
    if ((arcs.finn_path || 0) <= -2) return { bio: 'Zocker aus Greifshafen. Lerngruppe Mittwoch.' };
  }
  if (id === 'char_lea') {
    if ((arcs.lea_close || 0) >= 0.5) return { bio: 'Café Hafen, jeden Mittwoch. Bring jemand mit.' };
  }
  if (id === 'char_mira') {
    if ((arcs.mira_close || 0) >= 0.4) return { bio: 'Klima-Aktivistin · danke an alle, die zuhören.' };
    if ((arcs.mira_close || 0) <= -0.2) return { bio: 'Klima-Aktivistin. DMs vorerst zu.' };
  }
  return null;
}

function tagLabel(tag) {
  const m = {
    gaming: 'Gaming', musik: 'Musik', lifestyle: 'Lifestyle', sport: 'Sport',
    wissenschaft: 'Wissenschaft', klima: 'Klima', humor: 'Humor',
    'politik-mitte': 'Politik (Mitte)', 'politik-links': 'Politik (links)',
    'politik-rechts': 'Politik (rechts)', feminismus: 'Feminismus',
    'anti-feminismus': 'Anti-Fem.', verschwoerung: 'Verschwörung',
    hass: 'Hass', 'true-crime': 'True Crime'
  };
  return m[tag] || tag;
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
      setTimeout(() => maybeQueueMicroReflection('hate_incident'), 400);
    };
  });
  showScreen('screen-guilds');
}

// ===== Wahl =====
const PARTY_COLORS = {
  p_zukunft: '#4ade80',   // grün
  p_buerger: '#60a5fa',   // blau
  p_alt:     '#f97316',   // orange
  p_heimat:  '#a16207',   // braun
  sonst:     '#94a3b8'
};

function openElection() {
  const parties = [...getParties()].sort((a, b) => (a.lean ?? 0) - (b.lean ?? 0));
  const body = document.getElementById('election-body');
  body.innerHTML = `
    <p class="muted">Wen willst du wählen? Die Parteien — sortiert von links nach rechts, wie sie dir im Feed begegnet sind:</p>
    <div class="party-grid">
      ${parties.map(p => {
        const cov = estimateCoverageFor(p);
        const col = PARTY_COLORS[p.id] || '#888';
        return `
        <div class="party-card" style="border-left:4px solid ${col}">
          <div class="name" style="color:${col}">${escapeHtml(p.name)}</div>
          <div class="slogan">„${escapeHtml(p.slogan)}"</div>
          <div class="coverage">In deinem Feed: <span class="cov cov-${cov.level}">${escapeHtml(cov.text)}</span></div>
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
  if (Store.data.electionVote) showElectionResult();
  showScreen('screen-election');
}

function estimateCoverageFor(party) {
  // Abschätzung: wie oft tauchte diese Richtung im User-Feed auf?
  // Liefert reinen Text plus CSS-Klasse — kein HTML-in-String, damit nichts
  // versehentlich als Markup interpretiert wird.
  const seen = Store.data.history.flatMap(h => h.feedSeen || []);
  const posts = DATA.posts.posts.filter(p => seen.includes(p.id));
  let close = 0, total = 0;
  for (const p of posts) {
    if (p.political_lean === undefined) continue;
    total++;
    if (Math.abs(p.political_lean - party.lean) < 0.25) close++;
  }
  if (!total) return { text: 'kaum Daten', level: 'low' };
  const pct = Math.round(close / total * 100);
  if (pct > 40) return { text: `sehr präsent (~${pct}% deiner politischen Posts)`, level: 'strong' };
  if (pct > 20) return { text: `spürbar (~${pct}%)`, level: 'medium' };
  if (pct > 5)  return { text: `am Rand (~${pct}%)`, level: 'weak' };
  return { text: 'so gut wie unsichtbar', level: 'low' };
}

function showElectionResult() {
  const slot = document.getElementById('election-result-slot');
  const data = Store.data.electionData;
  if (!data) return;
  const voted = Store.data.electionVote;
  const parties = getParties();
  const votedName = parties.find(p => p.id === voted)?.name || 'keine';
  // Nach Lean sortieren (links → rechts), Sonstige ans Ende.
  const order = [...data.objective].sort((a, b) => {
    const la = parties.find(x => x.id === a.id)?.lean ?? 99;
    const lb = parties.find(x => x.id === b.id)?.lean ?? 99;
    return la - lb;
  });
  slot.innerHTML = `
    <h3>Du hast für: <span style="color:${PARTY_COLORS[voted] || 'var(--accent)'}">${escapeHtml(votedName)}</span></h3>
    <p class="muted small">Links das objektive Ergebnis. Daneben das, was dein Feed dir vermittelt hat — die Differenz ist die Filterblase.</p>
    <div class="election-compare">
      <div class="col-head"><span>Partei</span><span class="muted small">objektiv</span><span class="muted small">in deinem Feed</span></div>
      ${order.map(p => {
        const pc = data.perceived.find(x => x.id === p.id);
        const col = PARTY_COLORS[p.id] || '#888';
        const obj = Math.round(p.share * 100);
        const per = Math.round((pc?.perceived || 0) * 100);
        const diff = per - obj;
        return `
          <div class="election-row">
            <div class="party-label" style="color:${col}">${escapeHtml(p.name)}</div>
            <div class="bar-pair">
              <div class="bar"><div class="fill" style="width:${obj}%;background:${col};opacity:0.55"></div><span class="bar-val">${obj}%</span></div>
              <div class="bar"><div class="fill" style="width:${per}%;background:${col}"></div><span class="bar-val">${per}% <em class="diff ${diff>=0?'pos':'neg'}">${diff>=0?'+':''}${diff}</em></span></div>
            </div>
          </div>`;
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
  const pronounLine = c.pronoun && c.pronoun !== 'keine' ? `${escapeHtml(c.pronoun)} · ` : '';
  const bioBlock = c.bio ? `<p class="profile-bio">${escapeHtml(c.bio)}</p>` : '';
  body.innerHTML = `
    <div class="big-avatar">${avatarSvg(c.avatar || 0)}</div>
    <h2 style="text-align:center;margin:0">${escapeHtml(c.name)}</h2>
    <p class="muted small" style="text-align:center">${pronounLine}${escapeHtml(c.city)}</p>
    ${bioBlock}
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
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.appendChild(body);
  document.body.appendChild(overlay);
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey);
  body.querySelector('#profile-close').onclick = close;
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

function exportReport() {
  const d = Store.data;
  if (!d || !d.character) { alert('Noch kein Spielstand.'); return; }
  const c = d.character;
  const refs = d.reflections || {};
  const profile = d.userProfile || {};
  const topInterests = Object.entries(profile.interests || {})
    .filter(([,v]) => v > 0.05).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const actions = (d.history || []).flatMap(h => h.actions || []);
  const likes = actions.filter(a => a.type === 'like').length;
  const angry = actions.filter(a => a.type === 'angry_comment').length;
  const comments = actions.filter(a => a.type === 'comment').length;
  const shares = actions.filter(a => a.type === 'share').length;
  const followed = profile.followed?.length || 0;
  const muted = profile.muted?.length || 0;
  const guilds = d.guildMemberships || [];
  const parties = getParties();
  const votedName = d.electionVote ? (parties.find(p => p.id === d.electionVote)?.name || d.electionVote) : '—';

  const refBlock = (title, key) => {
    const obj = refs[key];
    if (!obj || !Object.keys(obj).length) return `<section><h2>${title}</h2><p class="empty">— nicht ausgefüllt —</p></section>`;
    return `<section><h2>${title}</h2>${Object.entries(obj).map(([q,a]) =>
      `<div class="qa"><div class="q">${escapeHtml(q)}</div><div class="a">${a ? escapeHtml(String(a)) : '<em>— leer —</em>'}</div></div>`
    ).join('')}</section>`;
  };

  const manifest = refs.manifest || {};
  const manifestList = [1,2,3,4,5].map(i =>
    `<li>${manifest[i] ? escapeHtml(manifest[i]) : '<em>— leer —</em>'}</li>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><title>Streem-Bericht: ${escapeHtml(c.name)}</title>
<style>
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; max-width: 760px; margin: 2rem auto; padding: 1rem; color: #1f2230; line-height: 1.5; }
  h1 { color: #c026d3; border-bottom: 2px solid #eee; padding-bottom: .5rem; }
  h2 { color: #4338ca; margin-top: 2rem; }
  .meta { color: #555; font-size: 14px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 1rem 0; }
  .stat { background: #f4f5fa; padding: 10px; border-radius: 8px; border-left: 3px solid #c026d3; }
  .stat b { display: block; font-size: 22px; color: #1f2230; }
  .stat small { color: #666; }
  .qa { margin: .8rem 0; padding: .6rem .8rem; background: #f8f9fc; border-left: 3px solid #4338ca; border-radius: 4px; }
  .qa .q { font-weight: 600; color: #4338ca; margin-bottom: 4px; font-size: 14px; }
  .qa .a { white-space: pre-wrap; }
  .empty { color: #999; font-style: italic; }
  ol li { margin: .6rem 0; }
  .foot { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; color: #777; font-size: 13px; }
  ul.interests { list-style: none; padding: 0; }
  ul.interests li { display: inline-block; background: #eef; padding: 2px 8px; border-radius: 10px; margin: 2px; font-size: 13px; }
  .profile-bio { font-style: italic; color: #555; border-left: 3px solid #c026d3; padding: 6px 12px; margin: 1rem 0; background: #faf7fb; }
</style></head>
<body>
  <h1>Streem-Bericht</h1>
  <p class="meta"><strong>${escapeHtml(c.name)}</strong>${c.pronoun && c.pronoun !== 'keine' ? ' · ' + escapeHtml(c.pronoun) : ''} · ${escapeHtml(c.city || '')} · Protagonist:in: ${escapeHtml(c.protagonist || 'alex')}<br/>Stand: Woche ${d.currentWeek} · erstellt ${new Date().toLocaleString('de-DE')}</p>
  ${c.bio ? `<blockquote class="profile-bio">${escapeHtml(c.bio)}</blockquote>` : ''}

  <h2>Übersicht</h2>
  <div class="stats">
    <div class="stat"><b>${likes}</b><small>Likes</small></div>
    <div class="stat"><b>${comments + angry}</b><small>Kommentare (${angry} wütend)</small></div>
    <div class="stat"><b>${shares}</b><small>geteilt</small></div>
    <div class="stat"><b>${followed}</b><small>folgst du</small></div>
    <div class="stat"><b>${muted}</b><small>stummgeschaltet</small></div>
    <div class="stat"><b>${(profile.political_lean_estimated ?? 0).toFixed(2)}</b><small>politische Neigung (−1 links · +1 rechts)</small></div>
    <div class="stat"><b>${guilds.length}</b><small>Gilden beigetreten</small></div>
    <div class="stat"><b>${escapeHtml(votedName)}</b><small>gewählt</small></div>
  </div>

  <h2>Top-Interessen laut Algorithmus</h2>
  <ul class="interests">${topInterests.map(([k,v]) => `<li>${escapeHtml(tagLabel(k))} · ${Math.round(v*100)}%</li>`).join('') || '<li><em>noch keine Daten</em></li>'}</ul>

  ${refBlock('Reflexion · 1. Drittel', 'halftime')}
  ${refBlock('Reflexion · 2. Drittel', 'mid')}
  ${refBlock('Schluss-Reflexion', 'final')}

  ${(() => {
    const micros = d.microReflections || {};
    const entries = Object.entries(micros).filter(([, v]) => v && v.answer);
    if (!entries.length) return '';
    const labels = { marc_dm: 'Direkt nach Marc-DM', hate_incident: 'Direkt nach Hate-Incident', first_shitstorm: 'Direkt nach erstem Shitstorm' };
    return `<section><h2>Mikro-Reflexionen (im Moment des Ereignisses)</h2>${entries.map(([k, v]) =>
      `<div class="qa"><div class="q">${escapeHtml(labels[k] || k)} · W${v.week}</div><div class="a">${escapeHtml(String(v.answer))}</div></div>`
    ).join('')}</section>`;
  })()}

  <h2>Medien-Manifest</h2>
  <ol>${manifestList}</ol>

  <div class="foot">
    Erstellt mit dem Lernspiel „Der Algorithmus". Dokument zur Vorlage in der Projektwoche.<br/>
    Anlaufstellen: bpb.de · klicksafe.de · hateaid.org · Telefonseelsorge 0800 111 0 111.
  </div>
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html' });
  downloadBlob(blob, `streem-bericht-${(c.name||'spieler').toLowerCase().replace(/[^a-z0-9]/g,'_')}.html`);
  toast('Bericht exportiert.', { long: true });
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

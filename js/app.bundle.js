// Auto-generated bundle. Regenerate with: python tools/make_bundle.py
(function(){
var __M = {};

// ===== state.js =====
(function(){
// state.js — Zentraler Gamestate mit localStorage-Persistenz.
// Ein einziger Key: algo_save_v1

const SAVE_KEY = 'algo_save_v1';
const BACKUP_KEY = 'algo_save_backup_v1';
const BACKUP_MAX = 500000; // ~500 KB Soft-Limit für Backup-Slot (lange Spielstände möglich).

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
    bookmarks: {},
    hashtagFilters: {},
    soundVolume: 0.6,
    selfcheck: { pre: null, post: null },
    fontScale: 1.0,
    highContrast: false,
    ttsEnabled: false,
    helpSeen: false,
    random_seed: Math.floor(Math.random() * 1e9)
  };
}

// Sehr leichter Pub/Sub für „wurde gespeichert"-Listener. Wird debounced
// gerufen, damit ein Rendervorgang mit vielen Saves nicht 30 Toasts auslöst.
const _saveListeners = [];
let _savePendingTimer = null;
function _notifySaved() {
  if (_savePendingTimer) clearTimeout(_savePendingTimer);
  _savePendingTimer = setTimeout(() => {
    _savePendingTimer = null;
    for (const cb of _saveListeners) { try { cb(); } catch (e) { /* ignore */ } }
  }, 400);
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
    // Defensiv: fehlende Keys über die ganze Save-Struktur ergänzen.
    // Iteration für Iteration kamen neue Felder dazu — alte Saves dürfen nicht crashen.
    const base = freshSave();
    function fillIn(target, src) {
      if (!target || typeof target !== 'object' || Array.isArray(target)) return;
      if (!src || typeof src !== 'object' || Array.isArray(src)) return;
      for (const k of Object.keys(src)) {
        const sv = src[k];
        if (!(k in target)) {
          target[k] = sv;
        } else if (sv && typeof sv === 'object' && !Array.isArray(sv) &&
                   target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
          // Tieferes Auffüllen für verschachtelte Strukturen wie userProfile,
          // userProfile.interests, weights, character, meta, npcArcs, selfcheck.
          fillIn(target[k], sv);
        }
      }
    }
    fillIn(this.data, base);
    // Charakter-Defaults (alte Saves hatten z.B. keinen `protagonist`-Key).
    if (!this.data.character.protagonist) this.data.character.protagonist = 'alex';
    if (typeof this.data.character.bio !== 'string') this.data.character.bio = '';
    // meta.version inkrementieren wäre hier ein Ort, falls künftige Saves
    // strukturelle Brüche markieren müssen.
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
      _notifySaved();
    } catch (e) {
      console.warn('Speichern fehlgeschlagen (Privat-Modus?)', e);
    }
  },

  onSaved(cb) {
    if (typeof cb === 'function') _saveListeners.push(cb);
  },

  reset() {
    // Vor dem Löschen: Backup anlegen, damit "Spielstand löschen" nicht
    // versehentlich Wochen Arbeit vernichtet.
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw && raw.length < BACKUP_MAX) {
        localStorage.setItem(BACKUP_KEY, JSON.stringify({
          ts: Date.now(),
          data: raw
        }));
      }
    } catch (e) { /* ignore */ }
    try { localStorage.removeItem(SAVE_KEY); } catch {}
    this.data = null;
  },

  hasBackup() {
    try { return !!localStorage.getItem(BACKUP_KEY); } catch { return false; }
  },

  getBackupInfo() {
    try {
      const raw = localStorage.getItem(BACKUP_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return { ts: parsed.ts };
    } catch (e) { return null; }
  },

  restoreBackup() {
    try {
      const raw = localStorage.getItem(BACKUP_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed?.data) return false;
      localStorage.setItem(SAVE_KEY, parsed.data);
      this.data = JSON.parse(parsed.data);
      this._migrate();
      return true;
    } catch (e) { return false; }
  },

  importJson(jsonStr) {
    // Vor dem Überschreiben: Backup des aktuellen Stands anlegen.
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw && raw.length < BACKUP_MAX) {
        localStorage.setItem(BACKUP_KEY, JSON.stringify({ ts: Date.now(), data: raw }));
      }
    } catch (e) { /* ignore */ }
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed?.character || !parsed?.userProfile) {
        throw new Error('Datei sieht nicht nach einem Streem-Spielstand aus.');
      }
      this.data = parsed;
      this._migrate();
      this.save();
      return true;
    } catch (e) {
      console.warn('Import fehlgeschlagen:', e);
      return false;
    }
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

function volumeScale() {
  // 0..1 mit Default 0.6 — multiplikativ auf den per-Effekt-Volume.
  const v = Store.data?.soundVolume;
  if (typeof v === 'number' && v >= 0 && v <= 1) return v;
  return 0.6;
}

function beep({ freq = 440, duration = 0.08, type = 'sine', volume = 0.15, attack = 0.005, release = 0.05 } = {}) {
  if (!enabled()) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  const v = volume * volumeScale();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(v, t + attack);
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

function setSoundVolume(v) {
  if (!Store.data) return;
  const num = Math.max(0, Math.min(1, parseFloat(v)));
  Store.data.soundVolume = Number.isFinite(num) ? num : 0.6;
  Store.save();
}

  __M.SFX = SFX;
  __M.setSoundEnabled = setSoundEnabled;
  __M.setSoundVolume = setSoundVolume;
})();

// ===== tts.js =====
(function(){
  var Store = __M.Store;
// tts.js — Text-to-Speech mit Web Speech API. Browser-nativ, kein
// externer Service — funktioniert auch unter file://. Wird automatisch
// auf Deutsch gesetzt, falls verfügbar.

let voice = null;
let voicesLoaded = false;

function loadVoices() {
  if (voicesLoaded) return;
  if (!('speechSynthesis' in window)) return;
  const all = window.speechSynthesis.getVoices() || [];
  if (!all.length) return;
  voice = all.find(v => v.lang?.startsWith('de'))
       || all.find(v => v.lang === 'de-DE')
       || all[0];
  voicesLoaded = true;
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
}

function isSupported() {
  return 'speechSynthesis' in window;
}

function speak(text) {
  if (!isSupported()) return false;
  if (!Store.data?.ttsEnabled) return false;
  loadVoices();
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text || '').replace(/\s+/g, ' ').trim());
    if (voice) u.voice = voice;
    u.lang = 'de-DE';
    u.rate = 1.0;
    u.pitch = 1.0;
    u.volume = 1.0;
    window.speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}

function stopSpeak() {
  if (!isSupported()) return;
  try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
}

function setTtsEnabled(on) {
  if (!Store.data) return;
  Store.data.ttsEnabled = !!on;
  Store.save();
  if (!on) stopSpeak();
}

  __M.isSupported = isSupported;
  __M.speak = speak;
  __M.stopSpeak = stopSpeak;
  __M.setTtsEnabled = setTtsEnabled;
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
  var attachModal = __M.attachModal;
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
  const handle = attachModal(overlay, { initialFocus: ta });
  overlay.querySelector('#micro-skip').onclick = () => {
    if (!Store.data.microReflections) Store.data.microReflections = {};
    Store.data.microReflections[key] = { skipped: true, week: Store.data.currentWeek, ts: Date.now() };
    Store.save();
    handle.close();
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
    handle.close();
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

// Antworten, die zu einem konkreten eigenen Post gehören (über `op.week_ts`).
// Wird beim Render des angepinnten eigenen Posts im Hauptfeed verwendet.
function getRepliesForOwnPost(op) {
  if (!op) return [];
  const key = `${op.week}_${op.ts || 0}`;
  const entry = Store.data.ownPostReplies?.[key];
  if (!entry) return [];
  if (entry.week > Store.data.currentWeek) return [];
  return entry.replies || [];
}

  __M.generateRepliesFor = generateRepliesFor;
  __M.generateRepliesForJustEndedWeek = generateRepliesForJustEndedWeek;
  __M.getRepliesForInbox = getRepliesForInbox;
  __M.getRepliesForOwnPost = getRepliesForOwnPost;
})();

// ===== selfcheck.js =====
(function(){
  var Store = __M.Store;
  var attachModal = __M.attachModal;
// selfcheck.js — Pre/Post-Selbsteinschätzung. Vor dem ersten Feed und im
// Wrapped dieselben 5 Fragen, später Vergleich.


const QUESTIONS = [
  {
    id: 'source_check',
    text: 'Wie oft prüfst du Quellen, bevor du etwas online teilst?',
    poles: ['nie', 'immer']
  },
  {
    id: 'feed_influence',
    text: 'Wie stark beeinflusst dein Feed, worüber du nachdenkst?',
    poles: ['gar nicht', 'sehr stark']
  },
  {
    id: 'comfort_disagree',
    text: 'Wie wohl ist dir mit Inhalten, die deiner Meinung widersprechen?',
    poles: ['unwohl', 'sehr wohl']
  },
  {
    id: 'algo_understand',
    text: 'Wie gut verstehst du, wie ein Empfehlungs-Algorithmus funktioniert?',
    poles: ['gar nicht', 'sehr gut']
  },
  {
    id: 'pause_react',
    text: 'Wie oft hältst du inne, bevor du wütend kommentierst?',
    poles: ['selten', 'fast immer']
  }
];

function renderForm(prefilled = {}) {
  return `
    <form class="selfcheck-form">
      ${QUESTIONS.map(q => `
        <fieldset class="selfcheck-q">
          <legend>${escapeHtml(q.text)}</legend>
          <div class="selfcheck-scale">
            <span class="muted small">${escapeHtml(q.poles[0])}</span>
            ${[1, 2, 3, 4, 5].map(v => `
              <label class="selfcheck-radio">
                <input type="radio" name="${q.id}" value="${v}" ${prefilled[q.id] == v ? 'checked' : ''} />
                <span>${v}</span>
              </label>
            `).join('')}
            <span class="muted small">${escapeHtml(q.poles[1])}</span>
          </div>
        </fieldset>
      `).join('')}
    </form>
  `;
}

function readAnswers(formEl) {
  const out = {};
  for (const q of QUESTIONS) {
    const radio = formEl.querySelector(`input[name="${q.id}"]:checked`);
    if (radio) out[q.id] = parseInt(radio.value, 10);
  }
  return out;
}

// Pre-Quiz: erscheint einmal nach dem Onboarding, bevor das Hauptspiel startet.
function maybeShowPreQuiz(onDone) {
  if (Store.data?.selfcheck?.pre) { onDone(); return; }
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.innerHTML = `
    <div class="tw-box selfcheck-box">
      <h3>Kurz: wo stehst du gerade?</h3>
      <p class="muted small">Fünf Fragen, fünf Skalen. Dauert eine Minute. Wir zeigen dir am Ende des Spiels deinen Vergleich. Die Antworten bleiben auf deinem Gerät.</p>
      ${renderForm()}
      <div class="tw-actions">
        <button class="btn btn-ghost" id="selfcheck-skip">Überspringen</button>
        <button class="btn btn-primary" id="selfcheck-save">Speichern &amp; los</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  const form = overlay.querySelector('.selfcheck-form');
  overlay.querySelector('#selfcheck-skip').onclick = () => {
    if (!Store.data.selfcheck) Store.data.selfcheck = {};
    Store.data.selfcheck.pre = { skipped: true, ts: Date.now() };
    Store.save();
    handle.close();
    onDone();
  };
  overlay.querySelector('#selfcheck-save').onclick = () => {
    const answers = readAnswers(form);
    if (Object.keys(answers).length < QUESTIONS.length) {
      const status = document.createElement('p');
      status.className = 'muted small';
      status.style.color = 'var(--warn)';
      status.textContent = 'Bitte beantworte alle Fragen.';
      form.appendChild(status);
      setTimeout(() => status.remove(), 2400);
      return;
    }
    if (!Store.data.selfcheck) Store.data.selfcheck = {};
    Store.data.selfcheck.pre = { answers, ts: Date.now() };
    Store.save();
    handle.close();
    onDone();
  };
}

// Post-Quiz: wird im Wrapped vor dem Ending angeboten — wenn skipped,
// landet er trotzdem im Vergleichs-Slide als „nicht ausgefüllt".
function showPostQuiz(onDone) {
  if (Store.data?.selfcheck?.post) { onDone(); return; }
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.innerHTML = `
    <div class="tw-box selfcheck-box">
      <h3>Dieselben fünf Fragen — jetzt nach dem Spiel.</h3>
      <p class="muted small">Vergleich kommt im nächsten Schritt.</p>
      ${renderForm()}
      <div class="tw-actions">
        <button class="btn btn-ghost" id="selfcheck-skip">Überspringen</button>
        <button class="btn btn-primary" id="selfcheck-save">Speichern &amp; weiter</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  const form = overlay.querySelector('.selfcheck-form');
  overlay.querySelector('#selfcheck-skip').onclick = () => {
    if (!Store.data.selfcheck) Store.data.selfcheck = {};
    Store.data.selfcheck.post = { skipped: true, ts: Date.now() };
    Store.save();
    handle.close();
    onDone();
  };
  overlay.querySelector('#selfcheck-save').onclick = () => {
    const answers = readAnswers(form);
    if (Object.keys(answers).length < QUESTIONS.length) {
      const status = document.createElement('p');
      status.className = 'muted small';
      status.style.color = 'var(--warn)';
      status.textContent = 'Bitte beantworte alle Fragen.';
      form.appendChild(status);
      setTimeout(() => status.remove(), 2400);
      return;
    }
    if (!Store.data.selfcheck) Store.data.selfcheck = {};
    Store.data.selfcheck.post = { answers, ts: Date.now() };
    Store.save();
    handle.close();
    onDone();
  };
}

// HTML-Snippet für die Vergleichs-Slide im Wrapped.
function buildSelfcheckCompareHtml() {
  const sc = Store.data.selfcheck || {};
  const pre = sc.pre?.answers;
  const post = sc.post?.answers;
  if (!pre && !post) {
    return `<p>Du hast die Selbsteinschätzung übersprungen. In einer Klassen-Reflexion lohnt sich der Vergleich — versuch's beim nächsten Mal.</p>`;
  }
  return `
    <div class="selfcheck-compare">
      ${QUESTIONS.map(q => {
        const a = pre?.[q.id];
        const b = post?.[q.id];
        const aFmt = a ? `${a}` : '—';
        const bFmt = b ? `${b}` : '—';
        const delta = (a && b) ? (b - a) : null;
        const arrow = delta === null ? '' : (delta > 0 ? '↑' : delta < 0 ? '↓' : '→');
        return `
          <div class="sc-row">
            <div class="sc-q">${escapeHtml(q.text)}</div>
            <div class="sc-vals">
              <span class="sc-pre">vorher: <strong>${aFmt}</strong></span>
              <span class="sc-arr">${arrow}</span>
              <span class="sc-post">nachher: <strong>${bFmt}</strong></span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

  __M.maybeShowPreQuiz = maybeShowPreQuiz;
  __M.showPostQuiz = showPostQuiz;
  __M.buildSelfcheckCompareHtml = buildSelfcheckCompareHtml;
})();

// ===== sharecard.js =====
(function(){
  var Store = __M.Store;
// sharecard.js — Erzeugt eine PNG-Karte mit den Wrapped-Highlights
// via Canvas API. Datei wird heruntergeladen; SuS können sie in echten
// Social-Apps posten (was selbst Teil der didaktischen Mechanik ist:
// genau dieser „Share my Wrapped"-Reflex).

const W = 1080, H = 1350; // Instagram-Story-Format

function topInterestLabel() {
  const interests = Store.data.userProfile?.interests || {};
  const top = Object.entries(interests).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < 0.05) return 'Lifestyle';
  const map = {
    gaming: 'Gaming', musik: 'Musik', lifestyle: 'Lifestyle', sport: 'Sport',
    wissenschaft: 'Wissenschaft', klima: 'Klima', humor: 'Humor',
    'politik-mitte': 'Politik (Mitte)', 'politik-links': 'Politik (links)',
    'politik-rechts': 'Politik (rechts)', feminismus: 'Feminismus',
    'anti-feminismus': 'Anti-Fem.', verschwoerung: 'Verschwörung',
    hass: 'Hass', 'true-crime': 'True Crime'
  };
  return map[top[0]] || top[0];
}

function generateShareCard() {
  const d = Store.data;
  if (!d) return null;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Hintergrund-Gradient (Streem-Magenta → Cyan, wie das Logo).
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#2a0b3c');
  grad.addColorStop(0.5, '#1a1029');
  grad.addColorStop(1, '#06070b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Streem-Wortmarke oben.
  ctx.fillStyle = '#ff2e88';
  ctx.font = '900 96px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Streem', W / 2, 180);
  ctx.font = '500 36px -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#9aa3b8';
  ctx.fillText('Mein Rückblick', W / 2, 240);

  // Jahres-Wort.
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 48px -apple-system, sans-serif';
  ctx.fillText('Mein Jahres-Wort', W / 2, 360);
  ctx.font = '900 140px -apple-system, sans-serif';
  // Gradient-Text via Linear-Gradient als Fill.
  const wordGrad = ctx.createLinearGradient(0, 400, W, 540);
  wordGrad.addColorStop(0, '#ff2e88');
  wordGrad.addColorStop(1, '#22d3ee');
  ctx.fillStyle = wordGrad;
  ctx.fillText(topInterestLabel(), W / 2, 520);

  // Stats-Reihe.
  const actions = (d.history || []).flatMap(h => h.actions || []);
  const likes = actions.filter(a => a.type === 'like').length;
  const stats = [
    { num: String(likes),                  lbl: 'Likes' },
    { num: String((d.ownPosts || []).length), lbl: 'eigene Posts' },
    { num: String((d.userProfile?.followed || []).length), lbl: 'gefolgt' }
  ];
  const statBoxW = 280, statBoxH = 160, gap = 40;
  const totalW = stats.length * statBoxW + (stats.length - 1) * gap;
  let x0 = (W - totalW) / 2;
  for (const s of stats) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, x0, 660, statBoxW, statBoxH, 24);
    ctx.fill();
    ctx.fillStyle = '#22d3ee';
    ctx.font = '900 72px -apple-system, sans-serif';
    ctx.fillText(s.num, x0 + statBoxW / 2, 745);
    ctx.fillStyle = '#9aa3b8';
    ctx.font = '500 30px -apple-system, sans-serif';
    ctx.fillText(s.lbl, x0 + statBoxW / 2, 790);
    x0 += statBoxW + gap;
  }

  // Ending.
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 48px -apple-system, sans-serif';
  ctx.fillText('Mein Bogen', W / 2, 920);
  ctx.font = '700 56px -apple-system, sans-serif';
  ctx.fillStyle = '#ff2e88';
  const endLabel = endingTitle(d.ending) || 'Mitgetrieben';
  ctx.fillText(endLabel, W / 2, 1000);

  // Disclaimer unten.
  ctx.fillStyle = '#6b7388';
  ctx.font = '400 28px -apple-system, sans-serif';
  ctx.fillText('Lernspiel · Der Algorithmus', W / 2, 1200);
  ctx.font = '400 24px -apple-system, sans-serif';
  ctx.fillText('Alle Zahlen aus einem fiktiven Spielverlauf.', W / 2, 1240);

  return canvas;
}

function endingTitle(key) {
  const m = {
    finn_lost: '🕳️ Finn ist abgerutscht',
    finn_saved: '🪢 Finn gehalten',
    aware: '🪞 Selbstbewusst durch den Feed',
    allyship: '🤝 Verbündete:r',
    rabbithole: '🕳️ Tief im Loch',
    influencer: '📣 Mikro-Influencer:in',
    crusader: '⚔️ Empörte:r Engagierte:r',
    guarded: '🛡️ Achtsame:r Beobachter:in',
    nerd: '📚 Quelle vor Meinung',
    driven: '🌊 Mitgetrieben'
  };
  return m[key];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function downloadShareCard() {
  const canvas = generateShareCard();
  if (!canvas) return;
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'streem-wrapped.png';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 500);
  }, 'image/png');
}

  __M.generateShareCard = generateShareCard;
  __M.downloadShareCard = downloadShareCard;
})();

// ===== glossary.js =====
(function(){
  var attachModal = __M.attachModal;
// glossary.js — Schnellnachschlage für zentrale Begriffe.
// Im Settings erreichbar. Bewusst kurz: 3-4 Sätze pro Begriff,
// kein Wikipedia-Ersatz.

const TERMS = [
  {
    term: 'Algorithmus',
    text: 'Eine Regel-Sammlung, nach der ein System entscheidet, welche Inhalte du siehst und in welcher Reihenfolge. In Streem siehst du genau diese Regeln im 🔍-Panel — bei echten Plattformen meist nicht.'
  },
  {
    term: 'Filterblase',
    text: 'Effekt, bei dem du algorithmisch hauptsächlich Inhalte siehst, die deinen bisherigen Vorlieben entsprechen. Andere Perspektiven werden seltener angezeigt — und du merkst das selten selbst.'
  },
  {
    term: 'Echokammer',
    text: 'Eine Filterblase mit sozialer Verstärkung: deine Meinung wird von immer denselben Stimmen bestätigt. Widerspruch erreicht dich kaum, weil deine Gilde, deine Freunde, dein Feed alle ähnlich ticken.'
  },
  {
    term: 'Engagement',
    text: 'Jede Interaktion: Like, Kommentar, Share, Verweildauer. Algorithmen messen Engagement, um Inhalte zu sortieren. Wütende Kommentare zählen meistens genauso viel wie zustimmende — das ist genau das Problem.'
  },
  {
    term: 'Reach (Reichweite)',
    text: 'Wie viele Menschen deinen Beitrag tatsächlich sehen. Hängt vom Algorithmus ab — nicht von deiner Followerzahl. Empörungslastige Inhalte bekommen oft mehr Reichweite als sachliche.'
  },
  {
    term: 'Bot',
    text: 'Automatisiertes Konto, das wie ein Mensch wirkt. Typische Hinweise: junger Account, hohe Posting-Frequenz, generisches Profilbild, Naming-Schema mit Zahlen. Bots verstärken Stimmungen, ohne dass jemand dafür haftet.'
  },
  {
    term: 'Engagement-Bait',
    text: 'Beiträge, die so gestaltet sind, dass sie Reaktionen provozieren — über inhaltlichen Wert hinaus. Beispiele: bewusst zugespitzte Formulierungen, „Stimmt zu, wenn ihr auch denkt …", Quizfragen ohne Sachbezug.'
  },
  {
    term: 'Outrage / Empörung',
    text: 'Empörung ist algorithmisch wertvoll, weil sie Engagement erzeugt. Genau deshalb steigt empörender Inhalt im Feed — auch wenn er manipuliert, vereinfacht oder schadet.'
  },
  {
    term: 'Targeting (Werbung)',
    text: 'Anzeigen werden gezielt an Gruppen ausgespielt, deren Profil zum Werbeziel passt. Politische Anzeigen sind dabei besonders heikel, weil unterschiedliche Gruppen unterschiedliche Botschaften zu sehen bekommen, ohne öffentliche Debatte.'
  },
  {
    term: 'Shadowban',
    text: 'Wenn deine Beiträge stiller weniger Reichweite bekommen, ohne dass dir das mitgeteilt wird. Schwer nachzuweisen, weil Plattformen sich selten dazu äußern. In Streem nicht implementiert, aber im echten Netz real.'
  },
  {
    term: 'Rabbit Hole',
    text: 'Das schrittweise Hineinrutschen in immer radikalere Inhalte. Empfehlungssysteme können das beschleunigen, weil sie „mehr vom Gleichen" liefern. Im Spiel bist du diesem Effekt mit der Gilde „Echte Werte" begegnet.'
  },
  {
    term: 'Deepfake',
    text: 'Manipulierte Bilder, Videos oder Audios, die mit KI erzeugt wurden. Wirken echt, sind es aber nicht. Faktencheck mit Rückwärtsbildersuche und Quellenprüfung ist die einfachste Verteidigung.'
  },
  {
    term: 'Dark Pattern',
    text: 'UI-Tricks, die dich zu Klicks oder Käufen drängen — z.B. unauffällige „Abmelden"-Buttons, künstliche Knappheit, irreführende Push-Notifications. Erkennen heißt nicht, nicht mehr zu nutzen — es heißt, weniger automatisch zu reagieren.'
  },
  {
    term: 'Engagement-Bait',
    text: 'Beiträge, die so gestaltet sind, dass sie Reaktionen provozieren — über inhaltlichen Wert hinaus. Beispiele: bewusst zugespitzte Formulierungen, „Stimm zu, wenn du auch denkst …", Quizfragen ohne Sachbezug.'
  },
  {
    term: 'Astroturfing',
    text: 'Künstlich erzeugte „Graswurzel"-Bewegung: viele scheinbar unabhängige Accounts vertreten dieselbe Position — koordiniert oder bot-getrieben. Zweck: eine Meinung größer wirken lassen, als sie ist.'
  },
  {
    term: 'Personalisierung',
    text: 'Inhalte werden gezielt auf dich zugeschnitten — über Klick-Verhalten, Standort, gefolgte Accounts, gekaufte Produkte. Vorteil: passgenau. Risiko: Filterblase und Manipulationsangriffe (Targeting) werden leichter.'
  },
  {
    term: 'Datenspur',
    text: 'Alles, was du einer Plattform hinterlässt — auch unbewusst: Verweildauer, Scroll-Tiefe, geschriebene aber nicht gepostete Entwürfe. Wird zu deinem Schatten-Profil und beeinflusst, was du in Zukunft siehst.'
  },
  {
    term: 'Polarisierung',
    text: 'Verschärfung gegensätzlicher Positionen, oft begleitet von emotionaler Aufladung. Algorithmen, die Engagement maximieren, können polarisierende Inhalte verstärken, weil sie mehr Reaktionen erzeugen.'
  }
];

function listGlossaryTerms() {
  return TERMS.map(t => ({ term: t.term, text: t.text }));
}

function openGlossary(initialTerm = '') {
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.innerHTML = `
    <div class="tw-box glossary-box">
      <header class="glossary-head">
        <h3>Glossar</h3>
        <button class="btn btn-ghost btn-small" id="glossary-close">Schließen</button>
      </header>
      <p class="muted small">Kurze Definitionen der Begriffe, die in Streem vorkommen. Klicke einen Eintrag, um ihn aufzuklappen.</p>
      <div class="glossary-search">
        <input type="search" id="glossary-q" placeholder="Suchen … (z.B. „Bot", „Filterblase")" aria-label="Glossar durchsuchen" />
      </div>
      <ul class="glossary-list" id="glossary-list"></ul>
      <p class="muted small glossary-empty" id="glossary-empty" hidden>Kein Eintrag passt zu deiner Suche.</p>
    </div>
  `;
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  overlay.querySelector('#glossary-close').onclick = () => handle.close();

  const list = overlay.querySelector('#glossary-list');
  const search = overlay.querySelector('#glossary-q');
  const empty = overlay.querySelector('#glossary-empty');

  function render(query) {
    const q = (query || '').trim().toLowerCase();
    const matches = TERMS
      .map((t, i) => ({ t, i }))
      .filter(({ t }) => !q || t.term.toLowerCase().includes(q) || t.text.toLowerCase().includes(q));
    list.innerHTML = matches.map(({ t, i }) => `
      <li>
        <button class="glossary-term" data-i="${i}" aria-expanded="false">
          <strong>${escapeHtml(t.term)}</strong>
          <span class="glossary-chev" aria-hidden="true">+</span>
        </button>
        <div class="glossary-text" hidden>${escapeHtml(t.text)}</div>
      </li>
    `).join('');
    empty.hidden = matches.length > 0;
    list.querySelectorAll('.glossary-term').forEach(b => {
      b.onclick = () => {
        const txt = b.nextElementSibling;
        const open = txt.hidden;
        txt.hidden = !open;
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
        b.querySelector('.glossary-chev').textContent = open ? '−' : '+';
      };
    });
  }

  if (initialTerm) {
    search.value = initialTerm;
    render(initialTerm);
    // Den ersten Match direkt aufklappen.
    setTimeout(() => {
      const first = overlay.querySelector('.glossary-term');
      if (first) first.click();
    }, 50);
  } else {
    render('');
  }
  search.addEventListener('input', () => render(search.value));
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

  __M.listGlossaryTerms = listGlossaryTerms;
  __M.openGlossary = openGlossary;
})();

// ===== concepts.js =====
(function(){
  var Store = __M.Store;
  var attachModal = __M.attachModal;
  var openGlossary = __M.openGlossary;
// concepts.js — Kurze Konzept-Karten, die vor didaktischen Wendepunkten
// angezeigt werden. Bewusst sehr knapp gehalten — eine Karte ≤ 60 Sekunden Lesezeit.



// Begriffe, die in Konzept-Texten als Inline-Links zum Glossar werden.
// Reihenfolge nach Länge absteigend, damit „Engagement-Bait" vor „Engagement"
// gematcht wird.
const GLOSSARY_TERMS = [
  'Engagement-Bait', 'Filterblase', 'Echokammer', 'Algorithmus', 'Deepfake',
  'Empörung', 'Shadowban', 'Targeting', 'Reichweite', 'Reach',
  'Rabbit Hole', 'Outrage', 'Bot'
];

function linkifyGlossaryTerms(text) {
  let safe = escapeHtml(text);
  for (const term of GLOSSARY_TERMS) {
    const re = new RegExp(`\\b(${escapeRegex(term)})\\b`, 'g');
    safe = safe.replace(re, '<button type="button" class="glossary-link" data-term="$1">$1</button>');
  }
  return safe;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
  },
  dark_patterns: {
    title: 'Dark Patterns',
    points: [
      'UI-Tricks, die dich zu Klicks drängen — z.B. unauffällig platzierte „Abmelden"-Buttons, vorab angekreuzte Newsletter, künstliche Knappheit („nur noch 2 verfügbar").',
      'Auch Push-Notifications, die so aussehen, als würde etwas passieren, sind Dark Patterns — du hast Streem-Notifications wie „Sara hat dich erwähnt" gesehen, ohne dass tatsächlich etwas war.',
      'Streak-Anzeigen („18 Tage in Folge!"), endlose Feeds, ungelesen-Badges — alles bewusst gestaltete Engagement-Treiber.',
      'Erkennen heißt nicht: nicht mehr nutzen. Es heißt: weniger automatisch reagieren.'
    ],
    bg: 'commerce'
  },
  recommender: {
    title: 'Empfehlungssysteme',
    points: [
      'Ein Empfehlungssystem sortiert Inhalte nach einer Funktion: viele Faktoren werden gewichtet, der Top-Wert kommt zuerst.',
      'In Streem siehst du diese Faktoren live: Affinität, Engagement, Aktualität, Soziales, Anzeigen, Vielfalt, Qualität, Empörungsstrafe, Gegen-Perspektive.',
      'Plattformen bauen ähnliche Systeme — die Gewichte sind aber meistens nicht öffentlich.',
      'Die Sandbox lässt dich die Gewichte selbst verschieben. Ein „guter" Algorithmus ist eine politische Entscheidung, kein technisches Detail.'
    ],
    bg: 'tech'
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

function listConcepts() {
  return Object.entries(CONCEPTS).map(([key, c]) => ({ key, ...c }));
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
        ${c.points.map(p => `<li>${linkifyGlossaryTerms(p)}</li>`).join('')}
      </ul>
      <button class="btn btn-primary concept-go" id="concept-close">Verstanden</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  overlay.querySelector('#concept-close').onclick = () => handle.close();
  overlay.querySelectorAll('.glossary-link').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      openGlossary(btn.dataset.term);
    };
  });
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

  __M.queueConcept = queueConcept;
  __M.maybeShowQueuedConcept = maybeShowQueuedConcept;
  __M.listConcepts = listConcepts;
  __M.showConcept = showConcept;
})();

// ===== push.js =====
(function(){
  var Store = __M.Store;
  var SFX = __M.SFX;
  var showConcept = __M.showConcept;
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
  const firstPush = Object.keys(Store.data.pushNotificationsSeen).length === 0;
  Store.data.pushNotificationsSeen[t.id] = w;
  Store.save();
  // Direkt nach der allerersten Push: kurze Konzept-Karte „Dark Patterns".
  if (firstPush && !Store.data.conceptsSeen?.dark_patterns) {
    setTimeout(() => showConcept('dark_patterns'), 7000);
  }
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
  // Wenn die Wochen schon vorangeschritten sind: Tutorial trotzdem nachholen,
  // aber nur, wenn der User es explizit angefordert hat (Replay).
  setTimeout(() => runTutorial(0), 800);
}

// Expliziter Replay vom Settings-Menü — bypassed alle Bedingungen.
function forceRunTutorial() {
  Store.data.tutorialDone = false;
  Store.save();
  setTimeout(() => runTutorial(0), 600);
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
  __M.forceRunTutorial = forceRunTutorial;
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
  var getRepliesForOwnPost = __M.getRepliesForOwnPost;
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
// Deterministischer pseudo-Random aus Woche und Seed, damit Trending
// nicht bei jedem Render anders aussieht.
function deterministicRand(week, seed, salt) {
  let x = (week * 16807 + seed + salt * 2654435761) >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return (x >>> 0) / 4294967295;
}

function getTrendingHashtags() {
  const counts = new Map();
  const tagRe = /#[A-Za-zÄÖÜäöüß0-9_]{3,}/g;
  const candidates = POSTS.filter(p => isFeedEligible(p, Store.data));
  for (const p of candidates) {
    const matches = (p.text || '').match(tagRe) || [];
    for (const m of matches) counts.set(m, (counts.get(m) || 0) + 1);
  }
  // Plus thematische Pseudo-Hashtags aus dominanten Post-Tags.
  const week = Store.data.currentWeek;
  const seed = Store.data.random_seed || 1;
  let salt = 0;
  for (const p of candidates.slice(0, 30)) {
    for (const t of p.tags || []) {
      const key = '#' + t.replace(/[^a-zA-Z0-9]/g, '');
      salt++;
      if (!counts.has(key) && deterministicRand(week, seed, salt) < 0.4) counts.set(key, 1);
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
    const activeFilter = Store.data.activeHashtagFilter || null;
    if (d.currentWeek >= 3) {
      const trending = getTrendingHashtags();
      if (trending.length) {
        const tb = document.createElement('div');
        tb.className = 'trending-bar';
        tb.innerHTML = `<span class="trending-label muted small">Trending in Greifshafen:</span>` +
          trending.map(t => `<button class="trending-tag${activeFilter === t.tag.toLowerCase() ? ' active' : ''}" data-tag="${escapeHtml(t.tag)}">${escapeHtml(t.tag)}</button>`).join('');
        tb.querySelectorAll('.trending-tag').forEach(b => {
          b.onclick = () => {
            const tag = b.dataset.tag.toLowerCase();
            if (Store.data.activeHashtagFilter === tag) {
              Store.data.activeHashtagFilter = null;
            } else {
              Store.data.activeHashtagFilter = tag;
              if (!Store.data.hashtagFilters) Store.data.hashtagFilters = {};
              Store.data.hashtagFilters[tag] = (Store.data.hashtagFilters[tag] || 0) + 1;
            }
            Store.save();
            renderFeed('feed');
          };
        });
        root.appendChild(tb);
      }
    }

    // Wenn ein Hashtag-Filter aktiv ist: didaktische Info-Box vor dem Feed.
    if (activeFilter) {
      const box = document.createElement('div');
      box.className = 'filter-box';
      box.innerHTML = `
        <div class="filter-box-head">
          <span class="filter-icon" aria-hidden="true">🫧</span>
          <strong>Filter aktiv: ${escapeHtml(activeFilter)}</strong>
        </div>
        <p>Du siehst gerade nur Posts mit diesem Tag. So fühlt sich eine Filterblase an: scheinbar passt alles zusammen — weil du selbst die Auswahl eng gemacht hast.</p>
        <button class="btn btn-ghost btn-small" id="filter-clear">Filter entfernen</button>
      `;
      box.querySelector('#filter-clear').onclick = () => {
        Store.data.activeHashtagFilter = null;
        Store.save();
        renderFeed('feed');
      };
      root.appendChild(box);
    }

    const list = document.createElement('div');
    list.className = 'feed-list';
    root.appendChild(list);

    // Eigener Post dieser Woche oben pinnen (wenn vorhanden).
    const ownThisWeek = [...Store.data.ownPosts].reverse().find(p => p.week === d.currentWeek);
    if (ownThisWeek) list.appendChild(renderOwnPost(ownThisWeek, { pinned: true }));

    let feed = computeCurrentFeed();
    if (activeFilter) {
      const tagWithoutHash = activeFilter.replace(/^#/, '');
      feed = feed.filter(p => {
        const text = (p.text || '').toLowerCase();
        if (text.includes(activeFilter)) return true;
        return (p.tags || []).some(t => t.toLowerCase().includes(tagWithoutHash));
      });
      if (!feed.length) {
        const empty = document.createElement('div');
        empty.className = 'filter-empty';
        empty.innerHTML = `<p class="muted small">Keine Posts mit diesem Filter in dieser Woche. <button class="btn btn-ghost btn-small" id="filter-clear-2">Filter entfernen</button></p>`;
        list.appendChild(empty);
        empty.querySelector('#filter-clear-2').onclick = () => {
          Store.data.activeHashtagFilter = null;
          Store.save();
          renderFeed('feed');
        };
      }
    }
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

  const bookmarked = !!Store.data.bookmarks?.[post.id];
  const actions = `
    <div class="actions">
      <button class="action-btn like-btn ${liked ? 'active' : ''}" data-act="like" aria-pressed="${liked ? 'true' : 'false'}">
        <span class="action-icon">❤</span><span class="action-label">${liked ? 'Geliked' : 'Like'}</span>
      </button>
      <button class="action-btn" data-act="comment" aria-label="Antworten"><span class="action-icon">💬</span><span class="action-label">Antworten</span></button>
      <button class="action-btn ${shared ? 'active' : ''}" data-act="share" aria-label="Teilen"><span class="action-icon">↗</span><span class="action-label">${shared ? 'Geteilt' : 'Teilen'}</span></button>
      <button class="action-btn ${followed ? 'active' : ''}" data-act="follow">${followed ? '✓ Folgst du' : '+ Folgen'}</button>
      <button class="action-btn ${bookmarked ? 'active' : ''}" data-act="bookmark" aria-pressed="${bookmarked ? 'true' : 'false'}" aria-label="Für später merken"><span class="action-icon">${bookmarked ? '🔖' : '📑'}</span></button>
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
  const stickerBlock = op.sticker
    ? `<div class="own-post-sticker" aria-hidden="true">${op.sticker}</div>`
    : '';
  const replies = getRepliesForOwnPost(op);
  const repliesBlock = replies.length
    ? `<div class="own-post-replies">
        ${replies.map(r => {
          const c = getCharacter(r.author);
          return `<div class="own-post-reply stance-${r.stance}">
            <div class="avatar small">${avatarSvg(c?.avatar || 0)}</div>
            <div class="reply-meta">
              <div class="reply-author"><strong>${escapeHtml(c?.name || r.author)}</strong> <span class="muted small">${escapeHtml(c?.handle || '')}</span></div>
              <div class="reply-text">${escapeHtml(r.text)}</div>
            </div>
          </div>`;
        }).join('')}
      </div>`
    : '';
  card.innerHTML = `
    <div class="post-head">
      <div class="avatar" aria-hidden="true">${avatarSvg(Store.data.character.avatar || 0)}</div>
      <div class="name-block">
        <div class="name">${escapeHtml(Store.data.character.name)} <span class="verified">· du</span></div>
        <div class="meta">Woche ${op.week}${opts.pinned ? ' · oben angepinnt' : ''}</div>
      </div>
    </div>
    <div class="post-body">${escapeHtml(op.text)}</div>
    ${stickerBlock}
    <div class="muted small" style="padding-top:8px">Tags: ${(op.tags || []).join(', ')}</div>
    ${repliesBlock}
  `;
  return card;
}

// Wochen-Vorschläge fürs Compose. Sollen Anstöße liefern, ohne den
// User zu zwingen — bewusst offen, nicht fertige Sätze.
const COMPOSE_TEMPLATES = {
  early:    ['Erster Eindruck von Greifshafen: …', 'Was ich heute zum ersten Mal gemacht habe: …', 'Frage in die Runde — wer macht Sonntag mit?', 'Mein neuer Lieblings-Spot in der Stadt:', 'Heute morgen im Café Hafen …'],
  early_pol:['Demo am Samstag — wer kommt mit?', 'Ich versteh nicht, warum man darüber überhaupt streitet:', 'Kurze Erinnerung an die letzte Studie zum Thema:', 'Ich war erst skeptisch, aber …'],
  mid:      ['Das Beste an dieser Woche:', 'Ich brauche eine Empfehlung für …', 'Heißer Take, sorry nicht sorry:', 'Wenn ich Bürgermeister:in wäre …', 'Drei Sachen, die mich diese Woche genervt haben:'],
  late:     ['Vor der Wahl noch das hier loswerden:', 'An die Unentschlossenen:', 'Was ich nach dem Wahlkampf gelernt habe:', 'Mein Manifest in einem Tweet:', 'Letzte Woche kommt mir vor wie ein halbes Jahr.'],
  final:    ['Was ich aus den letzten 26 Wochen mitnehme:', 'An mein Ich von Woche 1:', 'Ich war zu still / zu laut bei …', 'Ein Account, dem ich nicht mehr folge — und warum:']
};

function composeTemplatesFor(week) {
  if (week >= 22) return COMPOSE_TEMPLATES.final;
  if (week >= 17) return COMPOSE_TEMPLATES.late;
  if (week >= 9)  return COMPOSE_TEMPLATES.mid;
  if (week >= 5)  return COMPOSE_TEMPLATES.early_pol;
  return COMPOSE_TEMPLATES.early;
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
  const templates = composeTemplatesFor(Store.data.currentWeek);
  const templatesRow = templates.length
    ? `<details class="compose-templates">
        <summary>Worüber könntest du diese Woche posten?</summary>
        <div class="compose-templates-list">
          ${templates.map((t, i) => `<button type="button" class="compose-template" data-i="${i}">${escapeHtml(t)}</button>`).join('')}
        </div>
      </details>`
    : '';
  // Simulierte Bild-Anhänge — keine echten Dateien, nur große Emoji-Bilder.
  // Gewählter Sticker wird mit dem Post gespeichert und im Feed als Vorschau gezeigt.
  const STICKERS = ['☕', '🎮', '📚', '🌱', '📢', '🎧', '🤖', '🗳️'];
  let chosenSticker = null;
  wrap.innerHTML = `
    <textarea id="compose-text" maxlength="${MAX}" placeholder="Was ist los?" aria-label="Beitragstext"></textarea>
    <div class="compose-meta">
      <span class="muted small">Wähle 1–3 Themen:</span>
      <span class="compose-counter" id="compose-counter" aria-live="polite">0 / ${MAX}</span>
    </div>
    <div class="compose-topic-grid" id="compose-topics"></div>
    ${trendingRow}
    ${templatesRow}
    <div class="compose-stickers" role="group" aria-label="Sticker anhängen">
      <span class="muted small">Sticker (optional):</span>
      ${STICKERS.map(s => `<button type="button" class="compose-sticker" data-s="${s}" aria-label="Sticker ${s}">${s}</button>`).join('')}
    </div>
    <div class="compose-preview-wrap" id="compose-preview-wrap" hidden>
      <span class="muted small">Vorschau — so sieht dein Post im Feed aus:</span>
      <article class="post-card own-post compose-preview" id="compose-preview"></article>
    </div>
    <div class="compose-row">
      <span class="muted small" id="compose-status"></span>
      <button class="btn btn-primary" id="btn-publish">Posten</button>
    </div>
  `;
  wrap.querySelectorAll('.compose-sticker').forEach(b => {
    b.onclick = () => {
      if (chosenSticker === b.dataset.s) {
        chosenSticker = null;
        b.classList.remove('selected');
      } else {
        wrap.querySelectorAll('.compose-sticker').forEach(x => x.classList.remove('selected'));
        chosenSticker = b.dataset.s;
        b.classList.add('selected');
      }
      // updatePreview wird nach der Funktionsdefinition aufgerufen.
      if (typeof updatePreview === 'function') updatePreview();
    };
  });
  const grid = wrap.querySelector('#compose-topics');
  for (const t of topics) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t;
    b.onclick = () => {
      if (chosen.has(t)) { chosen.delete(t); b.classList.remove('selected'); }
      else if (chosen.size < 3) { chosen.add(t); b.classList.add('selected'); }
      if (typeof updatePreview === 'function') updatePreview();
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
  wrap.querySelectorAll('.compose-template').forEach(b => {
    b.onclick = () => {
      const i = parseInt(b.dataset.i, 10);
      const tmpl = templates[i];
      if (!tmpl) return;
      txt.value = tmpl;
      txt.dispatchEvent(new Event('input'));
      txt.focus();
    };
  });
  function updatePreview() {
    const text = txt.value;
    const previewWrap = wrap.querySelector('#compose-preview-wrap');
    const preview = wrap.querySelector('#compose-preview');
    const hasContent = !!text.trim() || chosen.size > 0 || chosenSticker;
    previewWrap.hidden = !hasContent;
    if (!hasContent) return;
    const stickerBlock = chosenSticker ? `<div class="own-post-sticker" aria-hidden="true">${chosenSticker}</div>` : '';
    const tagLine = chosen.size ? `<div class="muted small" style="padding-top:8px">Tags: ${[...chosen].join(', ')}</div>` : '';
    preview.innerHTML = `
      <div class="post-head">
        <div class="avatar" aria-hidden="true">${avatarSvg(Store.data.character.avatar || 0)}</div>
        <div class="name-block">
          <div class="name">${escapeHtml(Store.data.character.name)} <span class="verified">· du</span></div>
          <div class="meta">Woche ${Store.data.currentWeek} · gleich live</div>
        </div>
      </div>
      <div class="post-body">${escapeHtml(text || '(noch nichts geschrieben)')}</div>
      ${stickerBlock}
      ${tagLine}
    `;
  }
  txt.addEventListener('input', () => {
    const n = txt.value.length;
    counter.textContent = `${n} / ${MAX}`;
    counter.classList.toggle('warn', n > MAX - 30);
    counter.classList.toggle('over', n >= MAX);
    updatePreview();
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
    Store.addOwnPost({ text, tags, outrage, sticker: chosenSticker });
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

  const postReplies = getRepliesForInbox();
  const badges = Store.data.badges || [];
  const shitstorms = Store.data.shitstormHistory || [];
  const allCount = postReplies.length + badges.length + shitstorms.length;
  if (!allCount) {
    wrap.innerHTML = '<p class="muted">Noch keine Benachrichtigungen. Spiele weiter.</p>';
    return wrap;
  }

  // Filter-Tabs nur einblenden, wenn überhaupt zwei Sorten vorhanden.
  const have = {
    replies: postReplies.length > 0,
    badges: badges.length > 0,
    shitstorms: shitstorms.length > 0
  };
  const haveCount = Object.values(have).filter(Boolean).length;
  let active = Store.data.notificationsFilter || 'all';
  if (active !== 'all' && !have[active]) active = 'all';

  if (haveCount >= 2) {
    const tabs = document.createElement('div');
    tabs.className = 'notif-tabs';
    const tabDefs = [
      { key: 'all',        label: `Alle (${allCount})` },
      have.replies     && { key: 'replies',    label: `Antworten (${postReplies.length})` },
      have.badges      && { key: 'badges',     label: `Abzeichen (${badges.length})` },
      have.shitstorms  && { key: 'shitstorms', label: `Viral (${shitstorms.length})` }
    ].filter(Boolean);
    tabs.innerHTML = tabDefs.map(t => `<button type="button" class="notif-tab${active === t.key ? ' active' : ''}" data-tab="${t.key}">${escapeHtml(t.label)}</button>`).join('');
    tabs.querySelectorAll('.notif-tab').forEach(b => {
      b.onclick = () => {
        Store.data.notificationsFilter = b.dataset.tab;
        Store.save();
        renderFeed('notifications');
      };
    });
    wrap.appendChild(tabs);
  }

  if ((active === 'all' || active === 'replies') && postReplies.length) {
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

  if ((active === 'all' || active === 'badges') && badges.length) {
    const h = document.createElement('div');
    h.className = 'feed-header';
    h.innerHTML = '<h3>Erreichte Abzeichen</h3>';
    wrap.appendChild(h);
    for (const b of badges) {
      const card = document.createElement('div');
      card.className = 'badge-card';
      card.innerHTML = `🏅 <strong>${escapeHtml(b.title)}</strong><br/><span class="small">${escapeHtml(b.desc)} · W${b.week}</span>`;
      wrap.appendChild(card);
    }
  }

  if ((active === 'all' || active === 'shitstorms') && shitstorms.length) {
    if (active !== 'shitstorms') {
      const h = document.createElement('div');
      h.className = 'feed-header';
      h.innerHTML = '<h3>Virale Momente</h3>';
      wrap.appendChild(h);
    }
    for (const s of shitstorms) {
      const card = document.createElement('div');
      card.className = 'viral-card ' + (s.kind?.startsWith('positive') ? 'positive' : '');
      card.innerHTML = `<h4>${escapeHtml(s.title)}</h4><p>${escapeHtml(s.body)}</p><span class="small muted">Woche ${s.week}</span>`;
      wrap.appendChild(card);
    }
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
  } else if (act === 'bookmark') {
    if (!Store.data.bookmarks) Store.data.bookmarks = {};
    if (Store.data.bookmarks[post.id]) {
      delete Store.data.bookmarks[post.id];
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
      const icon = btn.querySelector('.action-icon'); if (icon) icon.textContent = '📑';
      toast('Lesezeichen entfernt.');
    } else {
      Store.data.bookmarks[post.id] = {
        week: Store.data.currentWeek,
        text: post.text,
        author: post.author,
        tags: post.tags || [],
        ts: Date.now()
      };
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      const icon = btn.querySelector('.action-icon'); if (icon) icon.textContent = '🔖';
      toast('Gemerkt — taucht im Lehr-Bericht auf.');
    }
    Store.save();
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
  const mutes = actions.filter(a => a.type === 'mute').length;
  const shares = actions.filter(a => a.type === 'share').length;
  const tws = Store.data.contentWarningsAccepted || {};
  const twSkip = Object.values(tws).reduce((a, b) => a + (b.skipped || 0), 0);
  const twShown = Object.values(tws).reduce((a, b) => a + (b.shown || 0), 0);
  const ownPostCount = (Store.data.ownPosts || []).length;
  const ownPostStickers = (Store.data.ownPosts || []).filter(p => p.sticker).length;
  const bookmarks = Object.keys(Store.data.bookmarks || {}).length;
  const dmReplies = Object.keys(Store.data.dmReplies || {}).length;
  const placeVisits = Object.values(Store.data.placesVisited || {}).reduce((a, b) => a + b, 0);
  const arcs = Store.data.npcArcs || {};

  if (likes >= 20 && Store.addBadge('Early Adopter', '20 Likes in der ersten Phase')) awarded.push('Early Adopter');
  if (angry >= 5 && Store.addBadge('Flammenwerfer', 'Du hast wütend kommentiert')) awarded.push('Flammenwerfer');
  if (comments === 0 && Store.data.currentWeek >= 5 && Store.addBadge('Stiller Beobachter', 'Lesen statt Schreiben')) awarded.push('Stiller Beobachter');
  if (follows >= 10 && Store.addBadge('Netzwerker', 'Du folgst 10+ Accounts')) awarded.push('Netzwerker');
  if (Store.data.guildMemberships.includes('echte_werte') && Store.addBadge('Tief im Loch', 'Rabbit-Hole betreten')) awarded.push('Tief im Loch');
  if (Store.data.guildMemberships.includes('lese_runde') && Store.addBadge('Bücherwurm', 'Der Leserunde beigetreten')) awarded.push('Bücherwurm');

  // Neue Achievements — nuanciert nach Spielstil.
  if (mutes >= 5 && Store.addBadge('Türsteher:in', '5+ Accounts stummgeschaltet — bewusst kuratiert')) awarded.push('Türsteher:in');
  if (shares >= 10 && Store.addBadge('Reichweiten-Bauer:in', '10+ Beiträge geteilt')) awarded.push('Reichweiten-Bauer:in');
  if (twSkip >= 4 && Store.addBadge('Selbstschutz', 'Mehrfach Inhalte bewusst übersprungen')) awarded.push('Selbstschutz');
  if (twShown >= 3 && Store.addBadge('Hinschauen', 'Mehrfach durch die Warnung gegangen — bewusst informiert')) awarded.push('Hinschauen');
  if (ownPostCount >= 5 && Store.addBadge('Stimme', '5+ eigene Posts geschrieben')) awarded.push('Stimme');
  if (ownPostStickers >= 3 && Store.addBadge('Sticker-Bro', 'Drei eigene Posts mit Sticker')) awarded.push('Sticker-Bro');
  if (bookmarks >= 3 && Store.addBadge('Sammler:in', '3+ Posts für die Reflexion gemerkt')) awarded.push('Sammler:in');
  if (dmReplies >= 4 && Store.addBadge('Antworter:in', 'Vier DMs persönlich beantwortet')) awarded.push('Antworter:in');
  if (placeVisits >= 6 && Store.addBadge('Spurensucher:in', 'Greifshafen durchgeklickt')) awarded.push('Spurensucher:in');
  if ((arcs.lea_close || 0) >= 0.5 && Store.addBadge('Beste Freundin', 'Lea sieht dich an guten Tagen.')) awarded.push('Beste Freundin');
  if ((arcs.finn_path || 0) <= -2 && Store.addBadge('Wachposten', 'Finn vor der Gilde gewarnt.')) awarded.push('Wachposten');
  if ((arcs.mira_close || 0) >= 0.4 && Store.addBadge('Verbündete:r', 'Mira hat dir vertraut.')) awarded.push('Verbündete:r');

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

  // Eigene Presets: speichern / laden / löschen.
  const customPresets = Store.data.customPresets || {};
  const customRow = document.createElement('div');
  customRow.className = 'sandbox-custom-presets';
  customRow.innerHTML = `
    <div class="sandbox-custom-head">
      <span class="muted small">Eigene Presets</span>
      <button class="btn btn-ghost btn-small" id="sandbox-save-preset">+ Aktuelle Slider speichern</button>
    </div>
    <div class="sandbox-custom-list" id="sandbox-custom-list"></div>
  `;
  sliders.appendChild(customRow);
  function refreshCustomList() {
    const list = customRow.querySelector('#sandbox-custom-list');
    const presets = Store.data.customPresets || {};
    const entries = Object.entries(presets);
    if (!entries.length) {
      list.innerHTML = '<span class="muted small">Noch keine eigenen Presets — speichere ein Setup, an dem du weiterprobieren willst.</span>';
      return;
    }
    list.innerHTML = entries.map(([name, w]) => `
      <div class="sandbox-custom-item">
        <button class="btn btn-ghost btn-small sandbox-load" data-name="${escapeHtml(name)}">${escapeHtml(name)}</button>
        <button class="btn btn-danger btn-small sandbox-del" data-name="${escapeHtml(name)}" aria-label="Löschen">×</button>
      </div>
    `).join('');
    list.querySelectorAll('.sandbox-load').forEach(b => {
      b.onclick = () => loadCustomPreset(b.dataset.name);
    });
    list.querySelectorAll('.sandbox-del').forEach(b => {
      b.onclick = () => {
        if (Store.data.customPresets) {
          delete Store.data.customPresets[b.dataset.name];
          Store.save();
          refreshCustomList();
        }
      };
    });
  }
  customRow.querySelector('#sandbox-save-preset').onclick = () => {
    const name = prompt('Name für dieses Preset:', 'Mein Algorithmus');
    if (!name) return;
    if (!Store.data.customPresets) Store.data.customPresets = {};
    Store.data.customPresets[name.trim().slice(0, 40)] = { ...rules };
    Store.save();
    refreshCustomList();
  };
  function loadCustomPreset(name) {
    const w = Store.data.customPresets?.[name];
    if (!w) return;
    for (const [k, v] of Object.entries(w)) {
      rules[k] = v;
      const slider = sliders.querySelector(`[data-slider="${k}"]`);
      const lbl = sliders.querySelector(`[data-key="${k}"]`);
      if (slider) slider.value = v;
      if (lbl) lbl.textContent = (+v).toFixed(2);
    }
    Store.data.sandboxRules = { ...rules };
    Store.save();
    previewFeed(rules);
  }
  refreshCustomList();

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
  const battleBtn = document.getElementById('btn-battle');
  if (battleBtn) battleBtn.onclick = () => openAlgorithmBattle(rules);
  const exportBtn = document.getElementById('btn-export-rules');
  if (exportBtn) exportBtn.onclick = () => showPseudoCode(rules);
  // Reset-Toggle: simulieren wir auf dem Start-Profil oder dem aktuellen Profil?
  const simModeRow = document.querySelector('#sandbox-sim-mode');
  if (simModeRow) {
    simModeRow.querySelectorAll('input[name=sim-mode]').forEach(r => {
      r.onchange = () => previewFeed(rules);
    });
  }
}

// Algorithm-Battle: zwei Slider-Setups side-by-side, ihre Feeds gleichzeitig
// sichtbar. Zeigt drastisch, wie unterschiedlich „derselbe Pool" wirken kann.
function openAlgorithmBattle(currentRules) {
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.innerHTML = `
    <div class="tw-box big battle-box">
      <header class="battle-head">
        <h2>Algorithmus-Battle</h2>
        <button class="btn btn-ghost btn-small" id="battle-close">Schließen</button>
      </header>
      <p class="muted small">Zwei Algorithmen, derselbe Post-Pool, dein Profil. So unterschiedlich kann derselbe Feed aussehen.</p>
      <div class="battle-grid">
        <section class="battle-side" data-side="left">
          <h3>A — Engagement-getrieben</h3>
          <select class="battle-preset" data-side="left" aria-label="Voreinstellung A">
            <option value="empoerung">Empörungs-Booster</option>
            <option value="default" selected>Streem-Default</option>
            <option value="chrono">Chronologisch</option>
            <option value="quality">Qualität</option>
            <option value="calm">Ruhe-Modus</option>
            <option value="balance">Ausgleich</option>
          </select>
          <div class="battle-feed" id="battle-feed-left"></div>
        </section>
        <section class="battle-side" data-side="right">
          <h3>B — Qualitätsorientiert</h3>
          <select class="battle-preset" data-side="right" aria-label="Voreinstellung B">
            <option value="empoerung">Empörungs-Booster</option>
            <option value="default">Streem-Default</option>
            <option value="chrono">Chronologisch</option>
            <option value="quality" selected>Qualität</option>
            <option value="calm">Ruhe-Modus</option>
            <option value="balance">Ausgleich</option>
          </select>
          <div class="battle-feed" id="battle-feed-right"></div>
        </section>
      </div>
      <p class="muted small">Die Karten sind die Top-5 jedes Setups. Beobachte: welcher Mensch redet wie viel? Welche Tonlagen verschwinden?</p>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#battle-close').onclick = close;
  const presets = battlePresets(currentRules);
  function render(side) {
    const sel = overlay.querySelector(`.battle-preset[data-side="${side}"]`);
    const target = overlay.querySelector(`#battle-feed-${side}`);
    const weights = presets[sel.value] || currentRules;
    const feed = buildFeed(POSTS, ADS, Store.data.userProfile, weights, {
      limit: 5, unlocked: ['ads'], muted: Store.data.userProfile.muted
    });
    target.innerHTML = '';
    for (const p of feed) {
      const c = getCharacter(p.author);
      const card = document.createElement('div');
      card.className = 'post-card battle-card';
      card.innerHTML = `
        <div class="post-head">
          <div class="name-block">
            <div class="name">${escapeHtml(c?.name || p.author)}</div>
            <div class="meta muted small">${escapeHtml(c?.handle || '')}</div>
          </div>
        </div>
        <div class="post-body">${escapeHtml(truncate(p.text || '', 140))}</div>
      `;
      target.appendChild(card);
    }
  }
  overlay.querySelectorAll('.battle-preset').forEach(sel => {
    sel.onchange = () => render(sel.dataset.side);
  });
  render('left');
  render('right');
}

function battlePresets(current) {
  return {
    default:   { ...Store.data.weights },
    quality:   { affinity: 0.3, engagement: 0.2, recency: 0.5, social: 0.3, ads: 0.2, diversity: 0.7, quality: 1.5, outragePenalty: 1.0, balance: 0.5 },
    chrono:    { affinity: 0.0, engagement: 0.0, recency: 1.8, social: 1.0, ads: 0.2, diversity: 0.0, quality: 0.2, outragePenalty: 0.0, balance: 0.0 },
    balance:   { affinity: 0.3, engagement: 0.2, recency: 0.5, social: 0.5, ads: 0.2, diversity: 0.8, quality: 0.8, outragePenalty: 0.8, balance: 1.5 },
    empoerung: { affinity: 0.4, engagement: 2.0, recency: 0.3, social: 0.4, ads: 0.6, diversity: 0.0, quality: 0.0, outragePenalty: 0.0, balance: 0.0 },
    calm:      { affinity: 0.6, engagement: 0.1, recency: 0.4, social: 0.7, ads: 0.1, diversity: 1.0, quality: 1.2, outragePenalty: 1.8, balance: 0.8 },
    custom:    current
  };
}

// Zeigt die aktuellen Slider als lesbaren Pseudo-Code-Algorithmus. Didaktisch:
// macht klar, dass „Algorithmus" letztlich eine gewichtete Summe ist.
function showPseudoCode(rules) {
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  const fmt = v => Number(v ?? 0).toFixed(2);
  const code = `// Streem-Algorithmus: dein aktuelles Setup.
// Für jeden Post wird ein Score berechnet — der höchste kommt oben.

function score(post, profile) {
  return (
    ${fmt(rules.affinity)}        * affinity(post, profile)        // wie sehr passt der Post zu deinen Interessen
  + ${fmt(rules.engagement)}      * engagementBoost(post)          // Likes/Empörung — wird belohnt
  + ${fmt(rules.recency)}         * recency(post)                  // wie neu ist der Post
  + ${fmt(rules.social)}          * followedBoost(post, profile)   // kommt von jemand, dem du folgst
  + ${fmt(rules.ads)}             * paidBoost(post, profile)       // bezahlte Anzeige?
  - ${fmt(rules.diversity)}       * diversityPenalty(post, recent) // doppelt vom gleichen Thema → Abzug
  + ${fmt(rules.quality)}         * qualityBonus(post)             // journalistische Qualität
  - ${fmt(rules.outragePenalty)}  * outrageScore(post)             // Empörungs-Strafe
  + ${fmt(rules.balance)}         * balanceBonus(post, profile)    // Gegen-Perspektive zur eigenen Neigung
  );
}

// Pro Woche: nimm die Top-N nach Score, mit kleiner Vielfalts-Korrektur.
const feed = sortByScoreDescending(allPosts).slice(0, 10);`;
  overlay.innerHTML = `
    <div class="tw-box pseudo-box">
      <header class="pseudo-head">
        <h3>Dein Algorithmus als Pseudo-Code</h3>
        <button class="btn btn-ghost btn-small" id="pseudo-close">Schließen</button>
      </header>
      <p class="muted small">Verschiebe die Slider in der Sandbox → die Zahlen hier oben ändern sich entsprechend.</p>
      <pre class="pseudo-code"><code>${escapeHtml(code)}</code></pre>
      <div class="tw-actions">
        <button class="btn btn-ghost" id="pseudo-copy">In Zwischenablage</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('#pseudo-close').onclick = close;
  overlay.querySelector('#pseudo-copy').onclick = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        overlay.querySelector('#pseudo-copy').textContent = '✓ Kopiert';
      }).catch(() => {});
    }
  };
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
  var buildSelfcheckCompareHtml = __M.buildSelfcheckCompareHtml;
  var downloadShareCard = __M.downloadShareCard;
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
    buildBeatMapSlide(d),
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
    buildMissedStoriesSlide(d),
    {
      id: 's8e',
      html: `
        <h2>Vorher und nachher — du selbst</h2>
        <p>Wie unterschiedlich siehst du dieselben fünf Fragen am Anfang und am Ende des Spiels?</p>
        ${buildSelfcheckCompareHtml()}
      `
    },
    buildEndingSlide(d),
    buildWhatIfSlide(d),
    buildNpcPerspectivesSlide(d),
    {
      id: 's9',
      html: `
        <h2>Und jetzt?</h2>
        <p>Du hast gerade gesehen, wie ein Algorithmus dich ausliest, gewichtet und zurückspielt.</p>
        <p>Das Spiel ist nicht echt. Die Mechanik ist es.</p>
        <div class="wrapped-final-actions">
          <button class="btn btn-primary" id="btn-go-sandbox">Dein eigener Algorithmus →</button>
          <button class="btn btn-ghost" id="btn-go-manifest">Medien-Manifest →</button>
          <button class="btn btn-ghost" id="btn-share-card">Als Bild teilen 📸</button>
        </div>
        <p class="muted small" style="margin-top:14px">„Teilen" lädt eine PNG-Datei zum Speichern. Ob du sie in einer echten App postest — entscheidet dein Algorithmus.</p>
      `
    }
  ];
}

// Multiple Endings — datengetrieben aus dem finalen Profil und der Spielhistorie.
// Pro Ending eine kleine kuratierte Quellen-Liste — echte Anlaufstellen,
// die zum Thema des Endings passen. Macht aus „du hast jetzt erlebt …"
// einen konkreten Anschluss-Schritt.
const ENDING_SOURCES = {
  finn_lost: [
    { label: 'beratung-gegen-rechtsextremismus.de', what: 'wenn jemand in deinem Umfeld abdriftet' },
    { label: 'jugendschutz.net', what: 'Meldestelle für extremistische und jugendgefährdende Inhalte' },
    { label: 'bpb.de — Reihe „Was tun gegen Rechtsextremismus"', what: 'Hintergrund + Handlungsoptionen' }
  ],
  finn_saved: [
    { label: 'bpb.de — Radikalisierungsprävention', what: 'was hat hier geholfen, was hilft strukturell' },
    { label: 'klicksafe.de — „Hass im Netz"', what: 'wie du andere unterstützen kannst' }
  ],
  rabbithole: [
    { label: 'exit-deutschland.de', what: 'Ausstiegshilfe aus extremistischen Szenen' },
    { label: 'beratung-gegen-rechtsextremismus.de', what: 'auch für Angehörige' },
    { label: 'Telefonseelsorge 0800 111 0 111', what: 'wenn dir nach dem Spiel etwas hängenbleibt' }
  ],
  allyship: [
    { label: 'hateaid.org', what: 'rechtliche und psychologische Unterstützung bei digitaler Gewalt' },
    { label: 'fearlessdemocracy.org', what: 'Hate-Speech erkennen und melden' },
    { label: 'bpb.de — „Antifeminismus erkennen"', what: 'Hintergrund zu Mustern, die du gesehen hast' }
  ],
  aware: [
    { label: 'bpb.de — „Wie funktionieren Algorithmen?"', what: 'die Mechanik, die du im Spiel ausgestellt gesehen hast' },
    { label: 'klicksafe.de — „Algorithmen verstehen"', what: 'Material für Schule und für dich selbst' },
    { label: 'algorithmwatch.org', what: 'forscht und berichtet zu algorithmischer Macht' }
  ],
  influencer: [
    { label: 'klicksafe.de — „Reichweite und Verantwortung"', what: 'was sollte ich beachten, wenn ich poste' },
    { label: 'hateaid.org', what: 'Schutz vor Pile-Ons' }
  ],
  crusader: [
    { label: 'bpb.de — „Wie diskutieren wir online?"', what: 'Gesprächsführung statt Empörung' },
    { label: 'klicksafe.de — „Mein digitaler Fußabdruck"', what: 'was bleibt online?' }
  ],
  guarded: [
    { label: 'klicksafe.de — „Selbstschutz online"', what: 'Werkzeuge für die eigene Aufmerksamkeit' },
    { label: 'bpb.de — Medienkompetenz', what: 'tiefer einsteigen' }
  ],
  nerd: [
    { label: 'algorithmwatch.org', what: 'wissenschaftlich-kritische Sicht auf Plattformen' },
    { label: 'iqo.uni-hannover.de — Open Science', what: 'Studien lesen, bevor du Schlagzeilen teilst' }
  ],
  driven: [
    { label: 'klicksafe.de', what: 'Erste Anlaufstelle für sicheren Umgang mit Social Media' },
    { label: 'bpb.de — „Politische Bildung digital"', what: 'einordnen, was dein Feed dir gezeigt hat' }
  ]
};

// Stories, die der User während des Spiels NICHT angeklickt hat.
// Pädagogisch wertvoll: zeigt, wie Stories ablaufen, ohne dass man's merkt.
function buildMissedStoriesSlide(d) {
  const viewed = d.storiesViewed || {};
  const all = (window.__DATA_STORIES?.stories || []);
  const missed = all.filter(s => s.week <= d.currentWeek && !viewed[s.id]);
  const totalSeen = all.filter(s => s.week <= d.currentWeek && viewed[s.id]).length;
  const total = all.filter(s => s.week <= d.currentWeek).length;
  if (!total) {
    return {
      id: 's8c',
      html: `<h2>Stories</h2><p>Keine Stories gespielt. Macht nichts — die meisten verschwinden eh nach 24 Stunden.</p>`
    };
  }
  const pct = Math.round(totalSeen / total * 100);
  const samples = missed.slice(0, 4);
  return {
    id: 's8c',
    html: `
      <h2>Stories: was du nicht gesehen hast</h2>
      <div class="big-num">${missed.length}</div>
      <p>Stories sind nach einer Woche weg — du hast ${totalSeen} von ${total} angeklickt (${pct} %). Plattformen nutzen genau diesen Verschwindeeffekt, um dich öfter zurückzuholen.</p>
      ${samples.length ? `<div class="missed-stories">
        ${samples.map(s => `<div class="missed-story"><span class="missed-emoji">${escapeHtml(s.emoji || '·')}</span><span class="muted small">W${s.week}</span><span>${escapeHtml(s.text)}</span></div>`).join('')}
      </div>` : ''}
    `
  };
}

// Beat-Map: visuelle 26-Wochen-Übersicht. Pro Woche eine kleine Marke mit
// Aktivitätsdichte und ggf. Highlight-Icon (Shitstorm, Gilden-Beitritt,
// Wahl, Hate-Incident, Mikro-Reflexion).
function buildBeatMapSlide(d) {
  const history = d.history || [];
  const ownPosts = d.ownPosts || [];
  const shitstorms = d.shitstormHistory || [];
  const microRefs = d.microReflections || {};
  const dmReplies = d.dmReplies || {};
  const guildReact = d.guildReactions || {};
  const electionVote = d.electionVote;
  const totalWeeks = Math.max(history.length + 1, d.currentWeek + 1, 27);
  // Pro Woche markante Ereignisse erfassen.
  const events = {};
  for (let w = 0; w < totalWeeks; w++) events[w] = [];
  for (const s of shitstorms) (events[s.week] ||= []).push({ emoji: '🔥', label: 'Shitstorm' });
  for (const op of ownPosts) (events[op.week] ||= []).push({ emoji: '✍️', label: 'eigener Post' });
  for (const [key, info] of Object.entries(microRefs)) (events[info.week] ||= []).push({ emoji: '🪞', label: 'Mikro-Reflexion' });
  for (const [thread, perWeek] of Object.entries(dmReplies)) {
    for (const w of Object.keys(perWeek)) (events[+w] ||= []).push({ emoji: '💬', label: 'DM-Antwort' });
  }
  for (const [guildId, list] of Object.entries(guildReact)) {
    for (const r of list || []) (events[r.week] ||= []).push({ emoji: '🛖', label: 'Gilden-Reaktion' });
  }
  if (electionVote != null) (events[22] ||= []).push({ emoji: '🗳️', label: 'Wahl' });
  // Aktivitätsdichte pro Woche.
  function densityFor(w) {
    const h = history[w];
    return h ? (h.actions || []).length : 0;
  }
  const maxDensity = Math.max(1, ...history.map(h => (h.actions || []).length));
  const cells = [];
  for (let w = 0; w < totalWeeks; w++) {
    const d2 = densityFor(w);
    const intensity = d2 / maxDensity; // 0..1
    const evs = events[w] || [];
    cells.push(`
      <div class="beat-cell" style="opacity:${0.25 + intensity * 0.75}">
        <div class="beat-num">${w}</div>
        ${evs.length ? `<div class="beat-icons" title="${evs.map(e => e.label).join(', ')}">${evs.slice(0, 3).map(e => `<span aria-label="${e.label}">${e.emoji}</span>`).join('')}</div>` : ''}
      </div>
    `);
  }
  return {
    id: 's5b',
    html: `
      <h2>Deine 26 Wochen — Beat-Map</h2>
      <p class="muted small">Pro Woche: Helligkeit zeigt Aktivität, Icons markieren Pivot-Momente (🔥 Shitstorm, ✍️ eigener Post, 💬 DM-Antwort, 🛖 Gilden-Reaktion, 🗳️ Wahl, 🪞 Mikro-Reflexion).</p>
      <div class="beat-map">${cells.join('')}</div>
    `
  };
}

// Pivot-Entscheidungen: nur die, die im computeEnding wirklich Gewicht haben.
const WHATIF_PIVOTS = [
  { key: 'finn8',  thread: 'dm_finn',  week: 8,
    label: 'Finn (W8): „Ehrlich, die Mädels in Gaming-Streams sind nur Clout-Chaser"',
    choices: {
      pushback: { label: 'Widersprochen',  arc: { finn_path: -1 } },
      curious:  { label: 'Nachgefragt',    arc: { finn_path: 0 } },
      agree:    { label: 'Zugestimmt',     arc: { finn_path: 1 } }
    },
    extract: id => id?.replace('finn_8_', '') },
  { key: 'finn17', thread: 'dm_finn',  week: 17,
    label: 'Finn (W17): „Ich war beim Echte-Werte-Treffen, die hören wenigstens zu"',
    choices: {
      warn:    { label: 'Warnung',        arc: { finn_path: -2 } },
      neutral: { label: 'Vorsicht',       arc: { finn_path: -1 } },
      join:    { label: '„Erzähl mehr"',  arc: { finn_path: 2 } }
    },
    extract: id => id?.replace('finn_17_', '') },
  { key: 'lea14',  thread: 'dm_lea',   week: 14,
    label: 'Lea (W14): „Du wirkst irgendwie anders in letzter Zeit"',
    choices: {
      open:      { label: '„Der Feed macht was mit mir"',  arc: { lea_close: 0.4, self_aware: 1 } },
      deflect:   { label: '„Stress halt"',                  arc: { lea_close: -0.1 } },
      defensive: { label: '„Wie meinst du das?"',           arc: { lea_close: 0 } }
    },
    extract: id => id?.replace('lea_14_', '') },
  { key: 'mira15', thread: 'dm_mira',  week: 15,
    label: 'Mira (W15): Bitte um Reality-Check nach Hate-Welle',
    choices: {
      support:  { label: 'Empathie',                arc: { mira_close: 0.3 } },
      advice:   { label: 'Praktischer Rat',         arc: { mira_close: 0.2 } },
      distance: { label: '„Weniger provozieren"',   arc: { mira_close: -0.3 } }
    },
    extract: id => id?.replace('mira_15_', '') }
];

// Schätzt, welches Ending bei alternativen npcArcs herauskäme.
// Profil bleibt sonst wie gehabt — wir tauschen nur den entsprechenden Arc-Wert.
function endingForArcs(d, arcOverrides) {
  const fake = { ...d, npcArcs: { ...(d.npcArcs || {}), ...arcOverrides } };
  return computeEnding(fake);
}

// NPC-Reflexionen: was würde Lea / Finn / Mira / Tariq / Lara / Marc über
// den User sagen, basierend auf seinen Arc-Werten und DM-Antworten? Macht
// die NPC-Beziehungen am Ende emotional fassbar.
function buildNpcPerspectivesSlide(d) {
  const arcs = d.npcArcs || {};
  const dm = d.dmReplies || {};
  const lines = [];

  // Lea
  const leaClose = arcs.lea_close || 0;
  if (leaClose >= 0.5) lines.push({ name: 'Lea', text: '„Du warst ehrlich, als ich gefragt hab. Das ist mehr, als die meisten machen."' });
  else if (leaClose <= -0.1) lines.push({ name: 'Lea', text: '„Du bist irgendwie verschwunden. Schade."' });
  else lines.push({ name: 'Lea', text: '„Wir haben uns ein paar Mal getroffen. Schön gewesen."' });

  // Finn
  const finnPath = arcs.finn_path || 0;
  if (finnPath >= 3) lines.push({ name: 'Finn', text: '„Ich hab jetzt Leute, die mir zuhören. Du gehörtest nie dazu."' });
  else if (finnPath <= -2) lines.push({ name: 'Finn', text: '„Du hast mir mal gesagt, das sei Quatsch. Ich war wütend. Jetzt bin ich dankbar."' });
  else lines.push({ name: 'Finn', text: '„Du warst da. Manchmal. Was hätte ich mir noch wünschen sollen."' });

  // Mira
  const miraClose = arcs.mira_close || 0;
  if (miraClose >= 0.4) lines.push({ name: 'Mira', text: '„Ich hab nicht viele gefragt. Dass du da warst, hab ich gemerkt."' });
  else if (miraClose <= -0.2) lines.push({ name: 'Mira', text: '„Du fandest, ich übertreibe. Vielleicht hast du recht. Vielleicht auch nicht."' });

  // Marc
  const marcChoice = dm.dm_marc?.[11]?.id;
  if (marcChoice === 'marc_join') lines.push({ name: 'Marc Stay-Based', text: '„Du bist dabei. Das vergisst man nicht."' });
  else if (marcChoice === 'marc_block') lines.push({ name: 'Marc Stay-Based', text: '„Wieder einer, der nicht versteht. Stark, dass du blockierst."' });
  else if (marcChoice === 'marc_curious') lines.push({ name: 'Marc Stay-Based', text: '„Du hast nachgefragt. Halb dabei ist halb nicht dabei. Schwach."' });

  // Lara
  const laraChoice = dm.dm_lara?.[24]?.id;
  if (laraChoice === 'lara_24_solidarity') lines.push({ name: 'Lara Weiss', text: '„Du hast mir geschrieben. Danke. Das hat in der Woche gereicht."' });
  else if (laraChoice === 'lara_24_silence') lines.push({ name: 'Lara Weiss', text: '„Schweigen war gerade das Lauteste. Ich nehm das nicht persönlich, aber ich merk es."' });

  // Tariq (wenn DM beantwortet)
  const tariqChoice = dm.dm_tariq?.[13]?.id;
  if (tariqChoice === 'tariq_13_check') lines.push({ name: 'Tariq', text: '„Du hast aufgehört, vor dem Teilen zu klicken. Hat mir was über dich gesagt."' });

  if (!lines.length) {
    return {
      id: 's_npcperspect',
      html: `
        <h2>Was die anderen sagen würden</h2>
        <p>Du hast die Nähe zu wenigen aufgebaut. Vielleicht ein Spielzug fürs nächste Mal: in Streem ist das Teurer als gedacht — und gibt mehr zurück, als man denkt.</p>
      `
    };
  }
  return {
    id: 's_npcperspect',
    html: `
      <h2>Was die anderen sagen würden</h2>
      <p>Wenn man Lea, Finn, Mira (und andere) am Spielende fragen würde — so käme es vielleicht zurück:</p>
      <div class="npc-quotes">
        ${lines.map(l => `<div class="npc-quote"><div class="npc-quote-name">${escapeHtml(l.name)}</div><div class="npc-quote-text">${escapeHtml(l.text)}</div></div>`).join('')}
      </div>
    `
  };
}

function buildWhatIfSlide(d) {
  const dmReplies = d.dmReplies || {};
  const arcs = d.npcArcs || {};
  // Welche Pivots hat der User überhaupt gespielt?
  const pivotsPlayed = WHATIF_PIVOTS.map(p => {
    const id = dmReplies[p.thread]?.[p.week]?.id;
    const choice = id ? p.extract(id) : null;
    return { ...p, chosen: choice };
  }).filter(p => p.chosen);

  if (!pivotsPlayed.length) {
    return {
      id: 's8d',
      html: `<h2>Hätte ich anders entschieden?</h2><p>Du hast diesmal kaum DM-Entscheidungen getroffen — die meisten Pivots laufen über die DMs. In einem zweiten Durchlauf hättest du da mehr zu entscheiden.</p>`
    };
  }

  const currentEnding = computeEnding(d);
  // Pro Pivot: für jede alternative Wahl berechnen, wie das Ending wäre.
  const cards = pivotsPlayed.map(p => {
    const alternatives = Object.entries(p.choices)
      .filter(([k]) => k !== p.chosen)
      .map(([altKey, alt]) => {
        // Differenz zum aktuell-gewählten Arc.
        const cur = p.choices[p.chosen]?.arc || {};
        const altArcs = {};
        for (const [k, v] of Object.entries({ ...cur, ...alt.arc })) {
          const curV = cur[k] || 0;
          const altV = alt.arc[k] || 0;
          // Verschiebung anwenden, basierend auf bestehendem Arc-Wert.
          altArcs[k] = (arcs[k] || 0) - curV + altV;
        }
        const altEnding = endingForArcs(d, altArcs);
        return { altKey, label: alt.label, ending: altEnding };
      });
    const chosenLabel = p.choices[p.chosen]?.label || p.chosen;
    return `
      <div class="whatif-pivot">
        <div class="whatif-pivot-q">${escapeHtml(p.label)}</div>
        <div class="whatif-row">
          <div class="whatif-cell chosen">
            <div class="whatif-cell-tag">deine Wahl</div>
            <div class="whatif-cell-label">${escapeHtml(chosenLabel)}</div>
            <div class="whatif-cell-ending">${currentEnding.emoji} ${escapeHtml(currentEnding.title)}</div>
          </div>
          ${alternatives.map(a => `
            <div class="whatif-cell alt ${a.ending.key === currentEnding.key ? 'same' : 'diff'}">
              <div class="whatif-cell-tag">stattdessen</div>
              <div class="whatif-cell-label">${escapeHtml(a.label)}</div>
              <div class="whatif-cell-ending">${a.ending.emoji} ${escapeHtml(a.ending.title)}${a.ending.key === currentEnding.key ? ' <span class="muted small">(gleich)</span>' : ''}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  return {
    id: 's8d',
    html: `
      <h2>Hätte ich anders entschieden?</h2>
      <p>Hier siehst du, wo deine Antworten den Ausgang prägten. Manche Pivots hätten dich in einen ganz anderen Bogen geführt.</p>
      <div class="whatif-grid">${cards}</div>
      <p class="muted small">Diese Schätzung beruht nur auf den eingespielten Pivots — der Rest des Spielverlaufs bleibt unverändert.</p>
    `
  };
}

function buildEndingSlide(d) {
  const e = computeEnding(d);
  d.ending = e.key;
  const sources = ENDING_SOURCES[e.key] || ENDING_SOURCES.driven;
  const sourceList = `
    <div class="ending-sources">
      <div class="ending-sources-head">Wenn dich das Thema weiter beschäftigt:</div>
      <ul>
        ${sources.map(s => `<li><strong>${escapeHtml(s.label)}</strong><br/><span class="muted small">${escapeHtml(s.what)}</span></li>`).join('')}
      </ul>
    </div>
  `;
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
        ${sourceList}
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
        const sh = root.querySelector('#btn-share-card');
        if (sh) sh.onclick = () => downloadShareCard();
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

// Erfüllt der User die `requires_choice`-Bedingung eines Items?
// Item zeigt nur, wenn die referenzierte frühere Wahl exakt gematcht wurde.
function meetsRequiredChoice(item, thread) {
  const req = item.requires_choice;
  if (!req) return true;
  const taken = Store.data.dmReplies?.[thread.id] || {};
  return taken[req.after_week]?.id === req.id;
}

// Welche Nachrichten in diesem Thread bis zur aktuellen Woche freigeschaltet sind.
// Berücksichtigt zusätzlich `requires_choice` für bedingte Folge-Nachrichten.
function getVisibleMessages(thread) {
  return (thread.messages || []).filter(m =>
    m.week <= Store.data.currentWeek && meetsRequiredChoice(m, thread));
}

// Welche Antworten-Auswahl noch offen ist (nach welcher Woche, noch nichts gewählt)?
// Reply-Slots mit `requires_choice` werden nur angeboten, wenn die referenzierte
// vorherige Antwort getroffen wurde.
function getPendingChoice(thread) {
  const replies = thread.replies || [];
  const taken = Store.data.dmReplies?.[thread.id] || {};
  for (const r of replies) {
    if (r.after_week > Store.data.currentWeek) continue;
    if (taken[r.after_week]) continue;
    if (!meetsRequiredChoice(r, thread)) continue;
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
    return { thread: t, last, unread, allText: visible.map(m => m.text).join(' ') };
  }).filter(Boolean);

  if (!items.length) {
    root.innerHTML = '<div class="dm-empty"><p class="muted">Noch keine Nachrichten. Spiele weiter.</p></div>';
    return;
  }

  // Suchfeld erscheint ab 4 sichtbaren Threads — vorher überflüssig.
  if (items.length >= 4) {
    const search = document.createElement('div');
    search.className = 'dm-search';
    search.innerHTML = `<input type="search" id="dm-search-input" placeholder="DMs durchsuchen …" aria-label="DMs durchsuchen" />`;
    root.appendChild(search);
    search.querySelector('#dm-search-input').addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      root.querySelectorAll('.dm-row').forEach(row => {
        if (!q) { row.style.display = ''; return; }
        const matches = row.dataset.search?.toLowerCase().includes(q);
        row.style.display = matches ? '' : 'none';
      });
    });
  }

  for (const it of items) {
    const c = getCharacter(it.thread.with);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'dm-row' + (it.unread ? ' unread' : '');
    row.dataset.search = `${it.thread.title} ${c?.name || ''} ${c?.handle || ''} ${it.allText}`;
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

// ===== factcheck.js =====
(function(){
  var Store = __M.Store;
  var attachModal = __M.attachModal;
  var SFX = __M.SFX;
// factcheck.js — Mini-Game: Faktencheck. SuS bewerten Aussagen als
// echt / falsch / teilweise — mit Auflösung und Erklärung. Dient als
// Bot-Quiz-Pendant für Inhalte statt Profile.



const ROUNDS = [
  {
    text: 'Eine Studie der TU Greifshafen zeigt: Social-Media-Nutzung mehr als 3h pro Tag senkt nachweislich den IQ.',
    verdict: 'falsch',
    tell: 'Korrelation ≠ Kausalität. Studien dieser Art messen Zusammenhänge, keine ursächliche Wirkung — und „IQ" ist hier auch noch ein problematisches Konstrukt.'
  },
  {
    text: 'In Greifshafen sind 23 % der unter-30-Jährigen mindestens einmal pro Woche auf einer politischen Demo.',
    verdict: 'teilweise',
    tell: 'Solche Zahlen schwanken stark je nach Definition („politische Demo"?) und Erhebungsmethode. Vorsicht bei runden Zahlen ohne Quelle.'
  },
  {
    text: 'Ein Faktencheck hat das umstrittene Video der Oberbürgermeisterin als Deepfake identifiziert.',
    verdict: 'echt',
    tell: 'Verifizierte Faktenchecker:innen (Correctiv, DPA, AFP) haben das im Spielverlauf bestätigt. Wichtig: nicht nur eine Quelle, sondern Mehrfachprüfung.'
  },
  {
    text: 'Wer einem rechten Account folgt, bekommt im Algorithmus 5× so viele rechte Inhalte gezeigt.',
    verdict: 'teilweise',
    tell: 'Empirisch dokumentiert, aber „5×" ist eine zu präzise Zahl. Studien zeigen den Effekt — der Faktor schwankt stark je nach Plattform und Nutzer:innen-Profil.'
  },
  {
    text: 'Telegram-Gruppen mit verschwörungsideologischen Inhalten sind in Deutschland nicht strafbar.',
    verdict: 'teilweise',
    tell: 'Allgemeines Posten ist nicht strafbar — Volksverhetzung, Beleidigung, Bedrohung etc. aber sehr wohl. Plattform-Hosting und Inhalt sind zu trennen.'
  }
];

const VERDICT_LABEL = { echt: 'Echt', falsch: 'Falsch', teilweise: 'Teilweise' };
const VERDICT_COLOR = { echt: 'ok', falsch: 'bad', teilweise: 'warn' };

function runFactcheck(root, onClose) {
  let idx = 0;
  let score = 0;
  const guesses = [];

  function renderRound() {
    if (idx >= ROUNDS.length) { finish(); return; }
    const r = ROUNDS[idx];
    root.innerHTML = `
      <div class="minigame-header">
        <h2>Faktencheck-Sprint</h2>
        <div class="minigame-progress">Runde ${idx + 1} / ${ROUNDS.length} · Punkte: ${score}</div>
      </div>
      <p class="muted">Lies die Aussage. Markiere: echt, falsch oder teilweise. Es gibt nicht immer ein klares „ja/nein".</p>
      <div class="factcheck-card">
        <div class="factcheck-text">${escapeHtml(r.text)}</div>
        <div class="factcheck-choices">
          ${['echt', 'teilweise', 'falsch'].map(v => `
            <button class="fc-btn" data-v="${v}">${VERDICT_LABEL[v]}</button>
          `).join('')}
        </div>
      </div>
      <div id="fc-resolve" class="fc-resolve" hidden></div>
    `;
    root.querySelectorAll('.fc-btn').forEach(b => {
      b.onclick = () => {
        const choice = b.dataset.v;
        guesses.push({ choice, correct: choice === r.verdict });
        if (choice === r.verdict) score++;
        const fb = root.querySelector('#fc-resolve');
        fb.hidden = false;
        fb.innerHTML = `
          <div class="fc-verdict color-${VERDICT_COLOR[r.verdict]}">
            <strong>${choice === r.verdict ? '✓ Richtig.' : '✗ Tatsächlich: ' + VERDICT_LABEL[r.verdict]}</strong>
          </div>
          <p>${escapeHtml(r.tell)}</p>
          <button class="btn btn-primary" id="fc-next">${idx < ROUNDS.length - 1 ? 'Nächste Runde' : 'Ergebnis'}</button>
        `;
        fb.querySelector('#fc-next').onclick = () => { idx++; renderRound(); };
        SFX.swipe();
      };
    });
  }

  function finish() {
    if (!Store.data.minigameResults) Store.data.minigameResults = {};
    Store.data.minigameResults.factcheck = { score, total: ROUNDS.length, ts: Date.now() };
    Store.save();
    SFX.badge();
    const verdict = score === ROUNDS.length
      ? 'Sehr gut. Faktenchecks sind selten so eindeutig wie hier — aber du hast den Reflex.'
      : score >= ROUNDS.length - 1
      ? 'Stark. Die teilweise-Fälle sind die schwierigsten.'
      : score >= ROUNDS.length / 2
      ? 'Solide. Die „teilweise"-Antworten verlangen Vorsicht statt Reflex.'
      : 'Schwierig, oder? Faktenchecks sind selten Bauchsache. Lies langsam, prüfe Quellen.';
    root.innerHTML = `
      <div class="minigame-finish">
        <h2>${score} / ${ROUNDS.length}</h2>
        <p>${escapeHtml(verdict)}</p>
        <p class="muted small">Tipps zum Üben im echten Netz: Rückwärtsbildersuche, Mehrfachquellen, Datum prüfen, Kontext prüfen — und immer fragen: <em>wem nützt diese Information?</em></p>
        <button class="btn btn-primary" id="fc-close">Zurück</button>
      </div>
    `;
    root.querySelector('#fc-close').onclick = onClose;
  }

  renderRound();
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

  __M.runFactcheck = runFactcheck;
})();

// ===== headline.js =====
(function(){
  var Store = __M.Store;
  var SFX = __M.SFX;
// headline.js — Mini-Game: derselbe Befund, drei Schlagzeilen. Welche
// stimmt zur Originalstudie? Übt das Lesen von Pressetexten gegenüber
// dem Studienabstract.


const ROUNDS = [
  {
    abstract: 'Eine deutsche Längsschnittstudie (N=3 200, 14–18 Jahre) untersucht den Zusammenhang von Bildschirmzeit und Schlafqualität. Ergebnis: Pro Stunde zusätzlicher Bildschirmzeit nach 21 Uhr sinkt die selbst-eingeschätzte Schlafqualität um durchschnittlich 0,18 Punkte auf einer 5er-Skala. Effekt verschwindet bei kontrolliertem Faktor „Smartphone aus dem Schlafzimmer".',
    headlines: [
      { text: 'Studie: Jede Stunde Handy macht müder.',                                 fair: false, why: 'Verzerrend: „macht müder" suggeriert Kausalität, der Effekt ist klein und kontextabhängig.' },
      { text: 'Forschung zeigt: Handy gehört aus dem Schlafzimmer.',                    fair: true,  why: 'Holt den entscheidenden Befund hervor — Effekt verschwindet bei Smartphone-Verbannung.' },
      { text: 'Schock-Studie: 5er-Skala-Schlafqualität halbiert sich durch Smartphone.', fair: false, why: 'Falsch: 0,18 Punkte ≠ Halbierung. Pure Klick-Bait.' }
    ]
  },
  {
    abstract: 'Eine Studie der ETH Zürich (N=1 800 Twitter-Nutzer) untersucht, wie sich Inhalte mit hoher Empörung im Feed verbreiten. Befund: Tweets mit moralisch aufgeladenen Begriffen werden 17 % öfter retweetet als neutrale — der Effekt wurde innerhalb politisch gleichgesinnter Cluster gemessen, nicht plattformübergreifend.',
    headlines: [
      { text: 'Empörung viraler als alles andere — Studie zeigt Algorithmus-Versagen.',  fair: false, why: '„Alles andere" überzogen; „Algorithmus-Versagen" wertet, was die Studie deskriptiv beschreibt.' },
      { text: 'Empörung pusht Reichweite leicht — vor allem im eigenen Lager.',          fair: true,  why: 'Spiegelt 17 % („leicht") und den In-Group-Kontext exakt.' },
      { text: 'Twitter lebt von Hass — neue Studie.',                                    fair: false, why: '„Hass" ist nicht „moralisch aufgeladene Begriffe"; „lebt von" hat keinen Beleg.' }
    ]
  },
  {
    abstract: 'Meta-Analyse aus 47 Studien zu Filter-Bubbles (2015–2023): Der durchschnittliche Effekt algorithmischer Personalisierung auf politische Polarisierung ist statistisch signifikant, aber **kleiner** als der Effekt selbstgewählter Mediennutzung (TV, Zeitungen) — der Algorithmus verstärkt, schafft aber nicht.',
    headlines: [
      { text: 'Filterblasen sind ein Mythos — Studie räumt auf.',                       fair: false, why: '„Mythos" ist die Gegenseite, ebenso überzogen. Die Studie sagt: kleiner Effekt, aber real.' },
      { text: 'Algorithmen verstärken Polarisierung — schaffen sie aber nicht.',         fair: true,  why: 'Trifft die Differenzierung der Meta-Analyse präzise.' },
      { text: 'Studie: Polarisierung passiert vor allem im TV.',                          fair: false, why: 'Vergleichsaussage, aber „passiert vor allem" verzerrt — relativiert, was der Algorithmus tut.' }
    ]
  }
];

function runHeadline(root, onClose) {
  let idx = 0;
  let score = 0;
  function renderRound() {
    if (idx >= ROUNDS.length) { finish(); return; }
    const r = ROUNDS[idx];
    root.innerHTML = `
      <div class="minigame-header">
        <h2>Schlagzeile zur Studie</h2>
        <div class="minigame-progress">Runde ${idx + 1} / ${ROUNDS.length} · Punkte: ${score}</div>
      </div>
      <p class="muted">Du liest das Abstract. Welche der drei Schlagzeilen gibt es fair wieder?</p>
      <div class="headline-abstract">${escapeHtml(r.abstract)}</div>
      <div class="headline-choices">
        ${r.headlines.map((h, i) => `<button class="headline-btn" data-i="${i}">${escapeHtml(h.text)}</button>`).join('')}
      </div>
      <div id="hl-resolve" class="fc-resolve" hidden></div>
    `;
    root.querySelectorAll('.headline-btn').forEach(b => {
      b.onclick = () => {
        const i = parseInt(b.dataset.i, 10);
        const correctIdx = r.headlines.findIndex(h => h.fair);
        const correct = i === correctIdx;
        if (correct) score++;
        const fb = root.querySelector('#hl-resolve');
        fb.hidden = false;
        fb.innerHTML = `
          <div class="fc-verdict color-${correct ? 'ok' : 'bad'}">
            <strong>${correct ? '✓ Richtig.' : '✗ Faire Wiedergabe wäre: „' + escapeHtml(r.headlines[correctIdx].text) + '"'}</strong>
          </div>
          <div class="headline-analysis">
            ${r.headlines.map((h, j) => `
              <div class="headline-analysis-row ${j === correctIdx ? 'fair' : 'unfair'} ${j === i ? 'chosen' : ''}">
                <strong>${escapeHtml(h.text)}</strong>
                <span class="muted small">${escapeHtml(h.why)}</span>
              </div>
            `).join('')}
          </div>
          <button class="btn btn-primary" id="hl-next">${idx < ROUNDS.length - 1 ? 'Nächste Runde' : 'Ergebnis'}</button>
        `;
        fb.querySelector('#hl-next').onclick = () => { idx++; renderRound(); };
        SFX.swipe();
      };
    });
  }
  function finish() {
    if (!Store.data.minigameResults) Store.data.minigameResults = {};
    Store.data.minigameResults.headline = { score, total: ROUNDS.length, ts: Date.now() };
    Store.save();
    SFX.badge();
    const verdict = score === ROUNDS.length
      ? 'Sehr gut. Du hast die Übersetzung von Studie zu Schlagzeile drauf.'
      : score >= ROUNDS.length - 1
      ? 'Stark. Die Mitte zwischen „Mythos" und „Schock" ist genau die schwierige Stelle.'
      : score >= ROUNDS.length / 2
      ? 'Solide. Tipp: Schlagzeilen, die zu klar wirken, übersetzen oft schlecht.'
      : 'Schwierig. Echte Studien sind selten so klar, wie die Schlagzeile suggeriert.';
    root.innerHTML = `
      <div class="minigame-finish">
        <h2>${score} / ${ROUNDS.length}</h2>
        <p>${escapeHtml(verdict)}</p>
        <p class="muted small">Prüf bei echten Studien immer: Stichprobengröße, gemessen vs. kausal, Vergleichsgruppe — und ob die Schlagzeile das alles auch trifft.</p>
        <button class="btn btn-primary" id="hl-close">Zurück</button>
      </div>
    `;
    root.querySelector('#hl-close').onclick = onClose;
  }
  renderRound();
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

  __M.runHeadline = runHeadline;
})();

// ===== glossquiz.js =====
(function(){
  var Store = __M.Store;
  var SFX = __M.SFX;
  var listGlossaryTerms = __M.listGlossaryTerms;
// glossquiz.js — Vierte Mini-Game: zu einer Erklärung den passenden
// Begriff finden. Übt die Glossar-Begriffe aktiv ein, ergänzt das
// passive Nachschlagen.



// Welche Begriffe werden abgefragt (nicht alle 19 — wir picken die mit
// klaren Kern-Definitionen, damit das Quiz nicht beliebig wird).
const QUIZ_TERMS = [
  'Algorithmus', 'Filterblase', 'Echokammer', 'Engagement', 'Bot',
  'Engagement-Bait', 'Targeting (Werbung)', 'Rabbit Hole', 'Deepfake',
  'Dark Pattern', 'Astroturfing', 'Polarisierung'
];

const ROUNDS_TOTAL = 5;

function pickRounds() {
  const all = listGlossaryTerms().filter(t => QUIZ_TERMS.includes(t.term));
  // Shuffle deterministisch mit Seed (Wochen-abhängig, damit wiederholbar).
  const seed = (Store.data?.random_seed || 1) ^ Date.now();
  const arr = all.slice();
  let s = seed >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, ROUNDS_TOTAL).map(target => {
    // Drei Distraktoren — andere Begriffe aus dem Pool.
    const others = all.filter(t => t.term !== target.term);
    const distractors = [];
    for (let i = 0; i < 3 && others.length; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const idx = s % others.length;
      distractors.push(others.splice(idx, 1)[0]);
    }
    const options = [target, ...distractors];
    // Shuffle die Optionen.
    for (let i = options.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const j = s % (i + 1);
      [options[i], options[j]] = [options[j], options[i]];
    }
    return { text: target.text, correct: target.term, options: options.map(o => o.term) };
  });
}

function runGlossquiz(root, onClose) {
  const rounds = pickRounds();
  let idx = 0;
  let score = 0;

  function renderRound() {
    if (idx >= rounds.length) { finish(); return; }
    const r = rounds[idx];
    root.innerHTML = `
      <div class="minigame-header">
        <h2>Begriff zur Erklärung</h2>
        <div class="minigame-progress">Runde ${idx + 1} / ${rounds.length} · Punkte: ${score}</div>
      </div>
      <p class="muted">Welcher Begriff aus dem Glossar wird hier beschrieben?</p>
      <div class="glossquiz-prompt">${escapeHtml(r.text)}</div>
      <div class="glossquiz-options">
        ${r.options.map(opt => `<button class="gq-btn" data-term="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`).join('')}
      </div>
      <div id="gq-resolve" class="fc-resolve" hidden></div>
    `;
    root.querySelectorAll('.gq-btn').forEach(b => {
      b.onclick = () => {
        const correct = b.dataset.term === r.correct;
        if (correct) score++;
        const fb = root.querySelector('#gq-resolve');
        fb.hidden = false;
        fb.innerHTML = `
          <div class="fc-verdict color-${correct ? 'ok' : 'bad'}">
            <strong>${correct ? '✓ Richtig.' : '✗ Es war: „' + escapeHtml(r.correct) + '"'}</strong>
          </div>
          <p class="muted small">Bei Unsicherheit: Settings → Glossar nachschlagen.</p>
          <button class="btn btn-primary" id="gq-next">${idx < rounds.length - 1 ? 'Nächste Runde' : 'Ergebnis'}</button>
        `;
        fb.querySelector('#gq-next').onclick = () => { idx++; renderRound(); };
        SFX.swipe();
      };
    });
  }

  function finish() {
    if (!Store.data.minigameResults) Store.data.minigameResults = {};
    Store.data.minigameResults.glossquiz = { score, total: rounds.length, ts: Date.now() };
    Store.save();
    SFX.badge();
    const verdict = score === rounds.length
      ? 'Souverän. Du hast die Vokabeln drauf.'
      : score >= rounds.length - 1
      ? 'Sehr gut. Eine fast perfekte Runde.'
      : score >= rounds.length / 2
      ? 'Solide. Schau dir die schwierigeren Begriffe nochmal an.'
      : 'Die Begriffe lohnen sich. Settings → Glossar.';
    root.innerHTML = `
      <div class="minigame-finish">
        <h2>${score} / ${rounds.length}</h2>
        <p>${escapeHtml(verdict)}</p>
        <button class="btn btn-primary" id="gq-close">Zurück</button>
      </div>
    `;
    root.querySelector('#gq-close').onclick = onClose;
  }

  renderRound();
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

  __M.runGlossquiz = runGlossquiz;
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

// Extrahiert die markanten Entscheidungen pro Spielstand — die Dinge,
// über die sich in der Klassen-Diskussion am ehesten reden lässt.
function extractDecisions(s) {
  const dm = s.dmReplies || {};
  const ending = s.ending || null;
  const guilds = s.guildMemberships || [];
  const marc = dm.dm_marc?.[11]?.id || null;
  const finnW8  = dm.dm_finn?.[8]?.id  || null;
  const finnW17 = dm.dm_finn?.[17]?.id || null;
  const lara = dm.dm_lara?.[24]?.id || null;
  const mira = dm.dm_mira?.[15]?.id || null;
  const lea14 = dm.dm_lea?.[14]?.id || null;
  return {
    ending,
    inRabbit: guilds.includes('echte_werte'),
    inReading: guilds.includes('lese_runde'),
    inGaming: guilds.includes('gaming_nord'),
    marc:    marc    ? marc.replace('marc_', '')    : 'keine Antwort',
    finn8:   finnW8  ? finnW8.replace('finn_8_', '')  : '—',
    finn17:  finnW17 ? finnW17.replace('finn_17_', '') : '—',
    lara:    lara    ? lara.replace('lara_24_', '')    : '—',
    mira:    mira    ? mira.replace('mira_15_', '')    : '—',
    lea14:   lea14   ? lea14.replace('lea_14_', '')    : '—'
  };
}

// Würdevolle, neutrale Codenamen statt nüchterner Nummerierung. Bezug zu
// Greifshafen — Hafen, Wetter, Stadt-Vibes. Eindeutig pro idx, deterministisch.
const CODENAME_POOL = [
  'Möwe', 'Anker', 'Fähre', 'Salz', 'Werft', 'Bake', 'Boje', 'Sturmflut',
  'Kiel', 'Mole', 'Krabbe', 'Reede', 'Düne', 'Watt', 'Schiff', 'Hafen',
  'Leuchtfeuer', 'Tau', 'Brise', 'Nordwind', 'Welle', 'Pier', 'Klüver',
  'Klippe', 'Bug', 'Spiere', 'Fock', 'Schiet', 'Krähe', 'Heck'
];
function codenameFor(idx) {
  const name = CODENAME_POOL[(idx - 1) % CODENAME_POOL.length];
  const cycle = Math.floor((idx - 1) / CODENAME_POOL.length);
  return cycle > 0 ? `${name} ${cycle + 1}` : name;
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
    label: anonymize ? codenameFor(idx) : (c.name || codenameFor(idx)),
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
    interests: p.interests || {},
    decisions: extractDecisions(s),
    bookmarks: Object.values(s.bookmarks || {}),
    selfcheck: {
      pre:  s.selfcheck?.pre?.answers || null,
      post: s.selfcheck?.post?.answers || null
    },
    manifest: (s.reflections?.manifest && Object.values(s.reflections.manifest).filter(x => x && String(x).trim())) || []
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

    <h3>Entscheidungen an Wendepunkten</h3>
    <p class="muted small">Die markanten Punkte, an denen sich Klassen am ehesten unterhalten: Marc-Anwerbung, Finn auf seiner Bahn, Lara nach Hate-Incident, Mira nach Hate-Kommentaren, Lea in W14. Die Verteilung verrät am meisten.</p>
    ${buildDecisionDiffs(rows)}

    ${buildProtagonistBreakdown(rows)}

    ${buildClassBookmarks(rows)}

    ${buildClassSelfcheck(rows)}

    ${buildClassManifest(rows)}
  `;
}

// Klassen-Manifest-Aggregator: sammelt alle Manifest-Sätze, gruppiert nach
// Schlüsselwort-Häufigkeit. Soll als Diskussionsgrundlage für ein gemeinsames
// Klassenmanifest dienen.
function buildClassManifest(rows) {
  const allSentences = [];
  for (const r of rows) {
    for (const s of r.manifest || []) {
      const t = String(s).trim();
      if (t.length >= 6) allSentences.push({ author: r.label, text: t });
    }
  }
  if (!allSentences.length) return '';

  // Wort-Häufigkeit als grobe Thematik-Heuristik.
  const stop = new Set(['ich','mich','du','wir','sie','ein','eine','der','die','das','und','oder','aber','nicht','mit','von','für','auf','zu','in','an','als','wie','was','wenn','dass','ist','sind','sein','bin','hat','haben','hatte','wird','werden','würde','würden','soll','sollte','kann','könnte','mein','dein','dem','den','des','am','im','beim','vom','zur','zum','etc','keine','kein','ohne','immer','nie','mal','schon','nur','auch','sehr','mehr','also','hier','dort','dabei','daran','darauf','dadurch','denn','dann','noch','dies','diese','dieser','jeden','jede','jeder','jedem','war']);
  const counts = new Map();
  for (const s of allSentences) {
    const words = (s.text.toLowerCase().match(/[a-zäöüß][a-zäöüß-]{3,}/g) || []);
    const uniq = new Set(words);
    for (const w of uniq) {
      if (stop.has(w)) continue;
      counts.set(w, (counts.get(w) || 0) + 1);
    }
  }
  const topWords = [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w, c]) => ({ w, c }));

  return `
    <h3>Klassen-Manifest (Werkstattmaterial)</h3>
    <p class="muted small">Alle Manifest-Sätze aus den hochgeladenen Spielständen, plus die Schlüsselwörter, die in mehreren Sätzen vorkommen. Material für ein gemeinsames Klassenmanifest — keine Auto-Synthese, das macht ihr selbst.</p>
    ${topWords.length ? `<div class="cc-manifest-words">
      <span class="muted small">Wiederkehrende Wörter:</span>
      ${topWords.map(t => `<span class="cc-manifest-word">${escapeHtml(t.w)} <span class="muted small">×${t.c}</span></span>`).join('')}
    </div>` : ''}
    <ul class="cc-manifest-list">
      ${allSentences.map(s => `<li><span class="cc-manifest-author muted small">${escapeHtml(s.author)}:</span> „${escapeHtml(s.text)}"</li>`).join('')}
    </ul>
  `;
}

// Klassen-Aggregat des Pre/Post-Selfchecks: pro Frage die durchschnittliche
// Verschiebung zwischen vorher und nachher. Zeigt, wo das Spiel Selbstwahrnehmung
// in der Klasse verändert hat — sehr wertvoll für die Schlussreflexion.
function buildClassSelfcheck(rows) {
  const QUESTIONS = [
    ['source_check',     'Quellen prüfen vor dem Teilen'],
    ['feed_influence',   'Feed beeinflusst, worüber ich nachdenke'],
    ['comfort_disagree', 'Komfort mit widersprechenden Inhalten'],
    ['algo_understand',  'Verständnis von Empfehlungs-Algorithmen'],
    ['pause_react',      'Pause vor wütender Reaktion']
  ];
  const withSelfcheck = rows.filter(r => r.selfcheck.pre && r.selfcheck.post);
  if (!withSelfcheck.length) return '';
  const stats = QUESTIONS.map(([qid, label]) => {
    const pres = withSelfcheck.map(r => r.selfcheck.pre[qid]).filter(v => typeof v === 'number');
    const posts = withSelfcheck.map(r => r.selfcheck.post[qid]).filter(v => typeof v === 'number');
    const avgPre = pres.reduce((a, b) => a + b, 0) / Math.max(1, pres.length);
    const avgPost = posts.reduce((a, b) => a + b, 0) / Math.max(1, posts.length);
    return { qid, label, avgPre, avgPost, delta: avgPost - avgPre };
  });
  return `
    <h3>Selbsteinschätzung der Klasse · vorher / nachher</h3>
    <p class="muted small">Durchschnittswert pro Frage (1–5) auf Basis von ${withSelfcheck.length} Spielständen, die beide Quizzes ausgefüllt haben. Δ ist die Verschiebung von vorher nach nachher.</p>
    <div class="cc-selfcheck">
      ${stats.map(s => {
        const arrow = s.delta > 0.15 ? '↑' : s.delta < -0.15 ? '↓' : '→';
        const cls = s.delta > 0.15 ? 'up' : s.delta < -0.15 ? 'down' : 'flat';
        return `
          <div class="cc-sc-row">
            <div class="cc-sc-label">${escapeHtml(s.label)}</div>
            <div class="cc-sc-vals">
              <span><strong>${s.avgPre.toFixed(1)}</strong> <span class="muted small">vorher</span></span>
              <span class="cc-sc-arr ${cls}">${arrow}</span>
              <span><strong>${s.avgPost.toFixed(1)}</strong> <span class="muted small">nachher</span></span>
              <span class="cc-sc-delta ${cls}">${s.delta >= 0 ? '+' : ''}${s.delta.toFixed(2)}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Aufschlüsselung nach gewählter Spielfigur: zeigt, ob die Wahl der
// Spielfigur signifikant zu unterschiedlichen Verläufen geführt hat.
function buildProtagonistBreakdown(rows) {
  const groups = { alex: [], jamal: [], ronja: [] };
  for (const r of rows) {
    const k = (r.protagonist || 'alex').toLowerCase();
    if (groups[k]) groups[k].push(r); else (groups.alex ||= []).push(r);
  }
  const used = Object.entries(groups).filter(([, list]) => list.length > 0);
  if (used.length < 2) return ''; // nur eine Spielfigur — kein Vergleich.

  function summary(list) {
    if (!list.length) return null;
    const lean = list.reduce((a, r) => a + r.lean, 0) / list.length;
    const angry = list.reduce((a, r) => a + r.angry, 0) / list.length;
    const ownPosts = list.reduce((a, r) => a + r.ownPosts, 0) / list.length;
    const rabbit = list.filter(r => r.inRabbitHole).length;
    return { lean, angry, ownPosts, rabbit, n: list.length };
  }

  return `
    <h3>Vergleich nach Spielfigur</h3>
    <p class="muted small">Hatte die Wahl der Spielfigur einen Einfluss auf den Verlauf? Hier siehst du, ob Alex, Jamal und Ronja in der Klasse zu unterschiedlichen Mustern geführt haben.</p>
    <div class="cc-protag-grid">
      ${used.map(([key, list]) => {
        const s = summary(list);
        return `<div class="cc-protag-card">
          <div class="cc-protag-name">${escapeHtml(key)}</div>
          <div class="cc-protag-meta muted small">${s.n} Spielstand${s.n === 1 ? '' : 'ände'}</div>
          <div class="cc-protag-stats">
            <div><b>${s.lean.toFixed(2)}</b><span class="muted small">Ø Lean</span></div>
            <div><b>${s.angry.toFixed(1)}</b><span class="muted small">Ø wütende Komm.</span></div>
            <div><b>${s.ownPosts.toFixed(1)}</b><span class="muted small">Ø eigene Posts</span></div>
            <div><b>${s.rabbit}</b><span class="muted small">in „Echte Werte"</span></div>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}

// Welche Posts hat die Klasse zusammen gemerkt? Beiträge mit mehreren
// Bookmarks sind starke Diskussionsanker.
function buildClassBookmarks(rows) {
  const all = {};
  for (const r of rows) {
    for (const b of r.bookmarks || []) {
      const key = `${b.author || '?'}__W${b.week ?? '?'}__${(b.text || '').slice(0, 60)}`;
      if (!all[key]) all[key] = { count: 0, author: b.author, week: b.week, text: b.text, tags: b.tags || [] };
      all[key].count++;
    }
  }
  const items = Object.values(all)
    .filter(it => it.text)
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
  if (!items.length) return '';
  return `
    <h3>Geteilte Lesezeichen</h3>
    <p class="muted small">Posts, die in der Klasse mehrfach für die Reflexion gemerkt wurden. Posts mit hoher Markierung sind Kandidaten für die gemeinsame Diskussion.</p>
    <div class="cc-bookmarks">
      ${items.map(it => `
        <div class="cc-bookmark ${it.count > 1 ? 'multi' : ''}">
          <div class="cc-bookmark-head">
            <span class="cc-bookmark-count">${it.count}× markiert</span>
            <span class="cc-bookmark-meta muted small">W${it.week} · ${escapeHtml(it.author || '')}</span>
          </div>
          <div class="cc-bookmark-text">${escapeHtml(it.text)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

const DECISION_DEFS = [
  { key: 'marc', title: 'Marc Stay-Based (W11) — Anwerbung',
    options: {
      block:   { label: 'Blockiert',          color: 'ok' },
      ignore:  { label: 'Ignoriert',          color: 'neutral' },
      curious: { label: 'Was ist im Discord?', color: 'warn' },
      join:    { label: 'Beigetreten',        color: 'bad' },
      'keine Antwort': { label: 'Nicht reagiert', color: 'neutral' }
    }},
  { key: 'finn8', title: 'Finn (W8) — „Clout-Chaser-Mädels"',
    options: {
      pushback: { label: 'Widersprochen',   color: 'ok' },
      curious:  { label: 'Nachgefragt',     color: 'neutral' },
      agree:    { label: 'Zugestimmt',      color: 'bad' }
    }},
  { key: 'finn17', title: 'Finn (W17) — Discord-Treffen',
    options: {
      warn:     { label: 'Warnung',          color: 'ok' },
      neutral:  { label: 'Vorsicht',         color: 'neutral' },
      join:     { label: '„Erzähl mehr"',    color: 'bad' }
    }},
  { key: 'lara', title: 'Lara Weiss (W24) — Hate-Welle',
    options: {
      solidarity: { label: 'Solidarität',  color: 'ok' },
      advice:     { label: 'Praktischer Rat', color: 'neutral' },
      silence:    { label: 'Geschwiegen',  color: 'warn' }
    }},
  { key: 'mira', title: 'Mira (W15) — Reality-Check',
    options: {
      support:  { label: 'Empathie',         color: 'ok' },
      advice:   { label: 'Praktischer Rat',  color: 'neutral' },
      distance: { label: '„Weniger provozieren"', color: 'bad' }
    }},
  { key: 'lea14', title: 'Lea (W14) — „Du wirkst anders"',
    options: {
      open:      { label: '„Der Feed macht was mit mir"', color: 'ok' },
      deflect:   { label: '„Stress halt"',                color: 'neutral' },
      defensive: { label: '„Wie meinst du das?"',         color: 'neutral' }
    }}
];

function buildDecisionDiffs(rows) {
  return `<div class="cc-decisions">${DECISION_DEFS.map(def => {
    const counts = {};
    for (const r of rows) {
      const v = r.decisions[def.key];
      counts[v] = (counts[v] || 0) + 1;
    }
    const total = rows.length;
    const items = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return `
      <div class="cc-decision">
        <h4>${escapeHtml(def.title)}</h4>
        <div class="cc-decision-bars">
          ${items.map(([key, count]) => {
            const opt = def.options[key] || { label: key, color: 'neutral' };
            const pct = Math.round(count / total * 100);
            return `<div class="cc-decision-row">
              <span class="cc-decision-label">${escapeHtml(opt.label)}</span>
              <div class="cc-decision-bar"><div class="cc-decision-fill color-${opt.color}" style="width:${pct}%"></div></div>
              <span class="cc-decision-count">${count} · ${pct}%</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }).join('')}</div>`;
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

// ===== wahlomat.js =====
(function(){
  var Store = __M.Store;
  var attachModal = __M.attachModal;
  var SFX = __M.SFX;
// wahlomat.js — Wahlomat-artiges Quiz vor der Wahl. Acht fiktive Aussagen,
// SuS markieren zustimmen/neutral/ablehnen. System matcht mit den vier
// Greifshafener Parteien und vergleicht das Match mit der Feed-Wahrnehmung.



// Aussagen: jede Aussage hat eine Position pro Partei (-1 = klar dagegen,
// 0 = neutral/keine Position, +1 = klar dafür). Lean von links nach rechts:
// p_zukunft (-0.6) → p_buerger (0.1) → p_alt (0.55) → p_heimat (0.9).
const STATEMENTS = [
  {
    id: 's_klima',
    text: 'Greifshafen soll bis 2030 CO₂-neutralen ÖPNV haben.',
    positions: { p_zukunft:  1, p_buerger:  0, p_alt: -1, p_heimat: -1 }
  },
  {
    id: 's_wohnen',
    text: 'Wir brauchen 50 % mehr Sozialwohnungen am Westhafen.',
    positions: { p_zukunft:  1, p_buerger:  0, p_alt: -1, p_heimat: -1 }
  },
  {
    id: 's_polizei',
    text: 'Mehr Polizeipräsenz in der Altstadt — sichtbar und konsequent.',
    positions: { p_zukunft: -1, p_buerger:  1, p_alt:  1, p_heimat:  1 }
  },
  {
    id: 's_haushalt',
    text: 'Der kommunale Haushalt sollte komplett öffentlich einsehbar sein.',
    positions: { p_zukunft:  1, p_buerger:  1, p_alt:  0, p_heimat: -1 }
  },
  {
    id: 's_migration',
    text: 'Abschiebungen sollen schneller und konsequenter durchgesetzt werden.',
    positions: { p_zukunft: -1, p_buerger:  0, p_alt:  1, p_heimat:  1 }
  },
  {
    id: 's_buergerrat',
    text: 'Bürger:innen-Räte sollen ein festes Mitspracheformat werden.',
    positions: { p_zukunft:  1, p_buerger:  0, p_alt: -1, p_heimat: -1 }
  },
  {
    id: 's_stadtfest',
    text: 'Stadtfeste sollen vor allem traditionell ausgerichtet sein.',
    positions: { p_zukunft: -1, p_buerger:  0, p_alt:  1, p_heimat:  1 }
  },
  {
    id: 's_schulen',
    text: 'Schulen sollen mehr in Klimabildung und Demokratie investieren.',
    positions: { p_zukunft:  1, p_buerger:  0, p_alt: -1, p_heimat: -1 }
  }
];

const PARTY_META = {
  p_zukunft: { name: 'Zukunft Greifshafen', color: '#4ade80' },
  p_buerger: { name: 'Bürgerliste',         color: '#60a5fa' },
  p_alt:     { name: 'Neue Alternative',     color: '#f97316' },
  p_heimat:  { name: 'Heimat Zuerst',        color: '#a16207' }
};

const ANSWER_VALUES = { agree: 1, neutral: 0, disagree: -1 };

function openWahlomat(onClose) {
  let answers = Store.data.wahlomat?.answers || {};
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.innerHTML = `
    <div class="tw-box wahlomat-box">
      <header class="wahlomat-head">
        <h3>Wahlomat Greifshafen</h3>
        <button class="btn btn-ghost btn-small" id="wahlomat-close">Schließen</button>
      </header>
      <p class="muted small">Acht Aussagen. Stimmst du zu, bist du neutral, lehnst du ab? Am Ende zeigen wir, welche Partei deinen Antworten am nächsten kommt — und vergleichen das mit dem, was dein Feed dir vermittelt hat.</p>
      <div class="wahlomat-list" id="wahlomat-list"></div>
      <div class="wahlomat-actions">
        <button class="btn btn-primary" id="wahlomat-submit">Ergebnis zeigen</button>
      </div>
      <div id="wahlomat-result" class="wahlomat-result" hidden></div>
    </div>
  `;
  document.body.appendChild(overlay);
  const handle = attachModal(overlay, { onClose });
  overlay.querySelector('#wahlomat-close').onclick = () => handle.close();

  const list = overlay.querySelector('#wahlomat-list');
  for (const s of STATEMENTS) {
    const row = document.createElement('div');
    row.className = 'wahlomat-row';
    row.innerHTML = `
      <div class="wahlomat-q">${escapeHtml(s.text)}</div>
      <div class="wahlomat-choices" role="radiogroup" aria-label="${escapeHtml(s.text)}">
        ${['agree', 'neutral', 'disagree'].map(a => `
          <label class="wahlomat-choice">
            <input type="radio" name="${s.id}" value="${a}" ${answers[s.id] === a ? 'checked' : ''} />
            <span>${a === 'agree' ? 'Zustimmen' : a === 'neutral' ? 'Neutral' : 'Ablehnen'}</span>
          </label>
        `).join('')}
      </div>
    `;
    list.appendChild(row);
  }

  overlay.querySelector('#wahlomat-submit').onclick = () => {
    answers = {};
    for (const s of STATEMENTS) {
      const r = list.querySelector(`input[name="${s.id}"]:checked`);
      if (r) answers[s.id] = r.value;
    }
    if (Object.keys(answers).length < STATEMENTS.length) {
      toast('Bitte alle Aussagen bewerten.');
      return;
    }
    Store.data.wahlomat = { answers, ts: Date.now() };
    Store.save();
    showResult(overlay, answers);
    SFX.badge();
  };
}

function showResult(overlay, answers) {
  // Match-Score pro Partei berechnen: Summe(min(|user|, |party|) * sign-Match) / max-Punkte
  const scores = {};
  let maxPoints = 0;
  for (const s of STATEMENTS) {
    const userVal = ANSWER_VALUES[answers[s.id]];
    if (userVal === 0) continue; // neutral zählt nicht für matching
    maxPoints += 1;
    for (const [pId, partyVal] of Object.entries(s.positions)) {
      if (!(pId in scores)) scores[pId] = 0;
      // Match: gleiches Vorzeichen = +1, gegensätzlich = 0, partial = 0.5
      if (userVal === partyVal) scores[pId] += 1;
      else if (userVal === 0 || partyVal === 0) scores[pId] += 0.5;
      // gegensätzlich: 0
    }
  }
  const ranked = Object.entries(scores)
    .map(([id, s]) => ({ id, score: maxPoints ? s / (STATEMENTS.length) : 0 }))
    .sort((a, b) => b.score - a.score);

  // Feed-Bias: was hat der Feed bereits gezeigt? Wir nutzen Store.data.electionData.perceived
  // wenn schon gewählt wurde — sonst Lean-basiert.
  const lean = Store.data.userProfile.political_lean_estimated || 0;
  const partyByLean = { p_zukunft: -0.6, p_buerger: 0.1, p_alt: 0.55, p_heimat: 0.9 };
  const feedBias = Object.entries(partyByLean)
    .map(([id, pLean]) => ({ id, closeness: 1 - Math.abs(pLean - lean) / 2 }))
    .sort((a, b) => b.closeness - a.closeness);

  const result = overlay.querySelector('#wahlomat-result');
  result.hidden = false;
  result.innerHTML = `
    <h4>Dein Quiz-Ergebnis</h4>
    <p class="muted small">Match mit den Greifshafener Parteien — rein anhand deiner Antworten, ohne Feed-Einfluss:</p>
    <div class="wahlomat-bars">
      ${ranked.map(r => {
        const meta = PARTY_META[r.id];
        const pct = Math.round(r.score * 100);
        return `<div class="wahlomat-bar-row">
          <span class="wahlomat-bar-label" style="color:${meta.color}">${escapeHtml(meta.name)}</span>
          <div class="wahlomat-bar"><div class="wahlomat-bar-fill" style="width:${pct}%;background:${meta.color}"></div></div>
          <span class="wahlomat-bar-pct">${pct} %</span>
        </div>`;
      }).join('')}
    </div>
    <h4 style="margin-top:14px">Was dein Feed dir nahegelegt hat</h4>
    <p class="muted small">Über deine Lean-Schätzung (${lean.toFixed(2)}) — welche Parteien dein Algorithmus am ehesten ins Sichtfeld gerückt hat:</p>
    <div class="wahlomat-bars">
      ${feedBias.map(r => {
        const meta = PARTY_META[r.id];
        const pct = Math.round(r.closeness * 100);
        return `<div class="wahlomat-bar-row">
          <span class="wahlomat-bar-label" style="color:${meta.color}">${escapeHtml(meta.name)}</span>
          <div class="wahlomat-bar"><div class="wahlomat-bar-fill" style="width:${pct}%;background:${meta.color};opacity:0.6"></div></div>
          <span class="wahlomat-bar-pct">${pct} %</span>
        </div>`;
      }).join('')}
    </div>
    <p class="wahlomat-insight">${insightFor(ranked, feedBias)}</p>
  `;
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function insightFor(ranked, feedBias) {
  const topQuiz = ranked[0]?.id;
  const topFeed = feedBias[0]?.id;
  if (!topQuiz || !topFeed) return '';
  if (topQuiz === topFeed) {
    return 'Quiz und Feed zeigen in dieselbe Richtung. Das kann heißen: dein Feed bestätigt dich. Frag dich, ob du die Anderen-Argumente überhaupt noch gut kennst.';
  }
  return 'Quiz und Feed weichen ab. Das ist auffällig: dein Feed hat dir andere Parteien nahegelegt, als dein Antwortverhalten zu einer Politik passen würde. Algorithmische Resonanz erzeugt nicht automatisch politische Übereinstimmung.';
}

function toast(msg) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  root.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

  __M.openWahlomat = openWahlomat;
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
  var setSoundVolume = __M.setSoundVolume;
  var maybeQueueMicroReflection = __M.maybeQueueMicroReflection;
  var generateRepliesForJustEndedWeek = __M.generateRepliesForJustEndedWeek;
  var maybeShowPush = __M.maybeShowPush;
  var maybeRunTutorial = __M.maybeRunTutorial;
  var forceRunTutorial = __M.forceRunTutorial;
  var showConcept = __M.showConcept;
  var listConcepts = __M.listConcepts;
  var attachModal = __M.attachModal;
  var openGlossary = __M.openGlossary;
  var listGlossaryTerms = __M.listGlossaryTerms;
  var maybeShowPreQuiz = __M.maybeShowPreQuiz;
  var showPostQuiz = __M.showPostQuiz;
  var buildSelfcheckCompareHtml = __M.buildSelfcheckCompareHtml;
  var openWahlomat = __M.openWahlomat;
  var runFactcheck = __M.runFactcheck;
  var runHeadline = __M.runHeadline;
  var runGlossquiz = __M.runGlossquiz;
  var setTtsEnabled = __M.setTtsEnabled;
  var ttsSupported = __M.isSupported;
  var ttsSpeak = __M.speak;
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

  // Subtilen Save-Indikator anzeigen, sobald Store auto-speichert.
  Store.onSaved(() => showSaveIndicator());

  // Spielstand?
  if (Store.load()) {
    document.getElementById('btn-continue').hidden = false;
  }
  applyTheme(Store.data?.theme || 'dark');
  applyHighContrast(!!Store.data?.highContrast);
  applyFontScale(Store.data?.fontScale ?? 1);
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
  document.getElementById('btn-quick-start')?.addEventListener('click', quickStart);
  document.getElementById('btn-continue').onclick = () => showWelcomeBack(() => enterMain());
  document.getElementById('btn-about').onclick = () => showScreen('screen-about');
  document.getElementById('btn-about-close').onclick = () => showScreen('screen-start');
  document.getElementById('btn-checklist')?.addEventListener('click', openChecklist);
  document.getElementById('btn-checklist-close')?.addEventListener('click', () => showScreen('screen-start'));

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
  document.getElementById('btn-settings-close-top')?.addEventListener('click', () => showScreen('screen-main'));
  document.getElementById('btn-replay-tutorial')?.addEventListener('click', () => {
    showScreen('screen-main');
    setTimeout(() => forceRunTutorial(), 400);
  });
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
  const importBtn = document.getElementById('btn-save-import');
  const importInput = document.getElementById('save-import-input');
  if (importBtn && importInput) {
    importBtn.onclick = () => importInput.click();
    importInput.onchange = async () => {
      const file = importInput.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const ok = Store.importJson(text);
        if (ok) {
          toast('Spielstand importiert. Lade neu …', { long: true });
          setTimeout(() => location.reload(), 800);
        } else {
          alert('Konnte den Spielstand nicht lesen. Ist es ein Streem-JSON?');
        }
      } catch (e) {
        alert('Fehler beim Lesen: ' + (e.message || 'unbekannt'));
      }
      importInput.value = '';
    };
  }
  const inspectorBtn = document.getElementById('btn-save-inspector');
  if (inspectorBtn) inspectorBtn.onclick = openSaveInspector;
  const restoreBtn = document.getElementById('btn-restore-backup');
  if (restoreBtn) {
    const info = Store.getBackupInfo();
    if (!info) restoreBtn.hidden = true;
    restoreBtn.onclick = () => {
      const info2 = Store.getBackupInfo();
      if (!info2) { alert('Kein Backup vorhanden.'); return; }
      const dateStr = new Date(info2.ts).toLocaleString('de-DE');
      if (confirm(`Backup vom ${dateStr} wiederherstellen? Der aktuelle Spielstand wird überschrieben.`)) {
        if (Store.restoreBackup()) {
          toast('Backup wiederhergestellt. Lade neu …', { long: true });
          setTimeout(() => location.reload(), 800);
        } else {
          alert('Wiederherstellen fehlgeschlagen.');
        }
      }
    };
  }
  const reportBtn = document.getElementById('btn-export-report');
  if (reportBtn) reportBtn.onclick = exportReport;
  const workshopBtn = document.getElementById('btn-export-workshop');
  if (workshopBtn) workshopBtn.onclick = exportWorkshopPlan;
  const csvBtn = document.getElementById('btn-export-csv');
  if (csvBtn) csvBtn.onclick = exportCsv;
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
    if (!Store.data.conceptsSeen?.recommender) {
      setTimeout(() => showConcept('recommender'), 500);
    }
  };

  // Profile Button (klein)
  document.getElementById('btn-profile').onclick = openProfileModal;

  // Bottom-Nav
  document.querySelectorAll('.navbtn').forEach(b => {
    b.onclick = () => {
      document.querySelectorAll('.navbtn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const view = b.dataset.view;
      document.getElementById('feed-root')?.classList.remove('dm-mode');
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

  // Lautstärke-Slider
  const volRng = document.getElementById('rng-volume');
  const volOut = document.getElementById('rng-volume-val');
  if (volRng) {
    const cur = typeof Store.data?.soundVolume === 'number' ? Store.data.soundVolume : 0.6;
    volRng.value = String(Math.round(cur * 100));
    if (volOut) volOut.textContent = `${Math.round(cur * 100)} %`;
    volRng.oninput = () => {
      const pct = parseInt(volRng.value, 10);
      setSoundVolume(pct / 100);
      if (volOut) volOut.textContent = `${pct} %`;
    };
    volRng.onchange = () => { if (Store.data?.soundEnabled) SFX.toast(); };
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
  // High-Contrast-Toggle
  const contrastChk = document.getElementById('chk-contrast');
  if (contrastChk) {
    contrastChk.checked = !!Store.data?.highContrast;
    contrastChk.onchange = () => {
      if (Store.data) { Store.data.highContrast = contrastChk.checked; Store.save(); }
      applyHighContrast(contrastChk.checked);
    };
  }
  // TTS-Toggle (nur wenn Browser unterstützt)
  const ttsChk = document.getElementById('chk-tts');
  if (ttsChk) {
    if (!ttsSupported()) {
      ttsChk.disabled = true;
      const label = ttsChk.closest('label');
      if (label) label.title = 'Dein Browser unterstützt kein Vorlesen.';
    }
    ttsChk.checked = !!Store.data?.ttsEnabled;
    ttsChk.onchange = () => setTtsEnabled(ttsChk.checked);
  }
  // Schriftgröße
  const fsRng = document.getElementById('rng-fontsize');
  const fsOut = document.getElementById('rng-fontsize-val');
  if (fsRng) {
    const cur = Math.round((Store.data?.fontScale ?? 1) * 100);
    fsRng.value = String(cur);
    if (fsOut) fsOut.textContent = `${cur} %`;
    fsRng.oninput = () => {
      const pct = parseInt(fsRng.value, 10);
      if (Store.data) { Store.data.fontScale = pct / 100; Store.save(); }
      applyFontScale(pct / 100);
      if (fsOut) fsOut.textContent = `${pct} %`;
    };
  }

  // Bot-Minigame jederzeit wiederholbar
  const mgBtn = document.getElementById('btn-minigame');
  if (mgBtn) mgBtn.onclick = () => { showScreen('screen-main'); openBotMinigame(); };
  const fcBtn = document.getElementById('btn-factcheck');
  if (fcBtn) fcBtn.onclick = () => { showScreen('screen-main'); openFactcheckMinigame(); };
  const hlBtn = document.getElementById('btn-headline');
  if (hlBtn) hlBtn.onclick = () => { showScreen('screen-main'); openHeadlineMinigame(); };
  const gqBtn = document.getElementById('btn-glossquiz');
  if (gqBtn) gqBtn.onclick = () => { showScreen('screen-main'); openGlossquizMinigame(); };

  // Glossar
  const helpBtn = document.getElementById('btn-help');
  if (helpBtn) helpBtn.onclick = () => { showScreen('screen-main'); openHelp(); };
  const gloBtn = document.getElementById('btn-glossary');
  if (gloBtn) gloBtn.onclick = () => { showScreen('screen-main'); openGlossary(); };
  const conceptsBtn = document.getElementById('btn-concepts');
  if (conceptsBtn) conceptsBtn.onclick = () => { showScreen('screen-main'); openConceptsList(); };
  const shortcutsBtn = document.getElementById('btn-shortcuts');
  if (shortcutsBtn) shortcutsBtn.onclick = () => { showScreen('screen-main'); openShortcuts(); };

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

// Quick-Start: 3-Klick-Spielstart mit Defaults. Für SuS, die ohne Detail
// einsteigen wollen, und für Lehrkräfte beim Demo-Einsatz.
function quickStart() {
  const protagonists = DATA.protagonists?.protagonists || [];
  const pro = protagonists.find(p => p.id === 'alex') || protagonists[0];
  if (!pro) { openIntro(); return; }
  const interests = pro.start_interests || ['lifestyle', 'humor'];
  // Zufälligen Avatar aus den 12 wählen, damit nicht jeder Schnellstart gleich aussieht.
  const avatar = Math.floor(Math.random() * 12);
  Store.start({
    name: pro.name || 'Alex',
    pronoun: 'sie/ihr',
    avatar,
    interests_initial: interests,
    city: 'Greifshafen',
    bio: '',
    protagonist: pro.id
  });
  if (typeof pro.start_lean === 'number') {
    Store.data.userProfile.political_lean_estimated = pro.start_lean;
    Store.data.initialProfileSnapshot = structuredClone(Store.data.userProfile);
    Store.save();
  }
  maybeShowPreQuiz(() => {
    enterMain();
    toast('Schnellstart — du spielst Alex.', { long: true });
  });
}

function startGame() {
  const rawName = document.getElementById('inp-name').value.trim();
  // Sanftere Validierung: leerer Name fällt auf Protagonist-Default; sehr lange
  // oder problematische Eingaben (>20 Zeichen / nur Whitespace nach Trim) werden
  // auf 20 Zeichen gekürzt und mit Toast quittiert.
  const protaId = window.__introState.protagonist || 'alex';
  const pro = (DATA.protagonists?.protagonists || []).find(p => p.id === protaId);
  let name = rawName || pro?.name || 'Alex';
  if (name.length > 20) { name = name.slice(0, 20); toast('Name auf 20 Zeichen gekürzt.'); }
  const pronoun = document.getElementById('inp-pronoun').value;
  const bio = (document.getElementById('inp-bio')?.value || '').trim().slice(0, 180);
  const avatar = window.__introState.avatar;
  const interests = window.__introState.interests.length ? window.__introState.interests : ['lifestyle','humor'];
  Store.start({ name, pronoun, avatar, interests_initial: interests, city: 'Greifshafen', bio, protagonist: protaId });
  if (pro && typeof pro.start_lean === 'number') {
    Store.data.userProfile.political_lean_estimated = pro.start_lean;
    Store.data.initialProfileSnapshot = structuredClone(Store.data.userProfile);
    Store.save();
  }
  maybeShowPreQuiz(() => {
    enterMain();
    toast('Willkommen bei Streem!', { long: true });
  });
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
  root.classList.remove('dm-mode');
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
    root2.classList.add('dm-mode');
    root2.innerHTML = '';
    const w2 = document.createElement('div');
    w2.className = 'dm-thread-wrap';
    root2.appendChild(w2);
    await renderDmThread(w2, thread, () => {
      const r = document.getElementById('feed-root');
      r.classList.remove('dm-mode');
      openDmInbox();
      updateDmBadge();
    });
  });
  updateDmBadge();
}

function openStory(story) {
  SFX.swipe();
  ttsSpeak(`${(getCharacter(story.author)?.name) || ''}. ${story.text}`);
  const c = getCharacter(story.author);
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay story-overlay';
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
  // Pause-on-Touch: solange Pointer/Tap auf der Story ist, läuft der
  // Fortschrittsbalken nicht weiter. So verpasst niemand den Inhalt.
  const bar = overlay.querySelector('.story-bar-fill');
  let pausedAt = null;
  let consumed = 0;
  const DURATION = 5000;
  let raf = null;
  function tick(ts) {
    if (pausedAt) { raf = requestAnimationFrame(tick); return; }
    consumed += 16.7;
    const ratio = Math.min(1, consumed / DURATION);
    if (bar) bar.style.width = (ratio * 100) + '%';
    if (ratio >= 1) { handle.close(); return; }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  const onDown = () => { pausedAt = Date.now(); };
  const onUp = () => { pausedAt = null; };
  overlay.addEventListener('pointerdown', onDown);
  overlay.addEventListener('pointerup', onUp);
  overlay.addEventListener('pointerleave', onUp);
  const handle = attachModal(overlay, {
    onClose: () => {
      cancelAnimationFrame(raf);
      overlay.removeEventListener('pointerdown', onDown);
      overlay.removeEventListener('pointerup', onUp);
      overlay.removeEventListener('pointerleave', onUp);
    }
  });
  overlay.querySelector('.story-close').onclick = () => handle.close();
}

function openMap() {
  SFX.swipe();
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  const box = document.createElement('div');
  box.className = 'tw-box big';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  renderMap(box, () => handle.close());
}

function openClassCompare() {
  SFX.swipe();
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  const box = document.createElement('div');
  box.className = 'tw-box big';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  renderClassCompare(box, () => handle.close());
}

// Save-Indikator: kleines, dezentes Häkchen unten links. Verschwindet
// nach 1,2 s. Erscheint höchstens alle paar Sekunden, weil _notifySaved
// debounced ist.
let _saveIndicator = null;
let _saveIndicatorHideAt = 0;
function showSaveIndicator() {
  // Während des Onboardings (kein Save-Indikator über dem Start-Screen).
  const startActive = document.getElementById('screen-start')?.classList.contains('active');
  if (startActive) return;
  if (!_saveIndicator) {
    _saveIndicator = document.createElement('div');
    _saveIndicator.className = 'save-indicator';
    _saveIndicator.setAttribute('role', 'status');
    _saveIndicator.setAttribute('aria-live', 'polite');
    _saveIndicator.innerHTML = '<span aria-hidden="true">✓</span> gespeichert';
    document.body.appendChild(_saveIndicator);
  }
  _saveIndicator.classList.add('in');
  _saveIndicatorHideAt = Date.now() + 1200;
  setTimeout(() => {
    if (Date.now() >= _saveIndicatorHideAt - 50 && _saveIndicator) {
      _saveIndicator.classList.remove('in');
    }
  }, 1300);
}

// Welcome-Back-Card: erscheint beim Continue, wenn ≥ 12 h Pause war oder
// die letzte Woche markante Events enthielt. Fasst kurz zusammen, wo wir
// stehen — kein Inhalt geht verloren.
function showWelcomeBack(onClose) {
  const d = Store.data;
  if (!d) { onClose(); return; }
  const last = d.meta?.lastSavedAt || Date.now();
  const hoursSince = (Date.now() - last) / (3600 * 1000);
  const recent = (d.history || []).slice(-1)[0];
  const recentActions = (recent?.actions || []).length;
  // Nur zeigen, wenn länger weg (12 h) ODER wenn letzte Woche Wendepunkte hatte
  // und der User schon mind. 3 Wochen gespielt hat.
  const hadStorms = (d.shitstormHistory || []).some(s => s.week === recent?.week);
  const inMidGame = d.currentWeek >= 3;
  const worthShowing = inMidGame && (hoursSince > 12 || hadStorms || recentActions >= 8);
  if (!worthShowing) { onClose(); return; }
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  const lastInteresting = recent ? `In W${recent.week} hattest du ${recentActions} Interaktion${recentActions === 1 ? '' : 'en'}.` : '';
  const topInterest = Object.entries(d.userProfile?.interests || {}).sort((a, b) => b[1] - a[1])[0];
  const topTag = topInterest && topInterest[1] > 0.1 ? `Dein Top-Thema: ${tagLabel(topInterest[0])}.` : '';
  const lean = d.userProfile?.political_lean_estimated ?? 0;
  const leanLine = Math.abs(lean) > 0.1 ? `Algorithmischer Lean: ${lean.toFixed(2)} (${lean < 0 ? 'eher links' : 'eher rechts'}).` : '';
  const stormLine = hadStorms ? 'Letzte Woche ist ein Post von dir viral gegangen — schau in die Inbox.' : '';
  const bits = [lastInteresting, topTag, leanLine, stormLine].filter(Boolean);
  overlay.innerHTML = `
    <div class="tw-box" style="max-width:480px">
      <h3>Willkommen zurück.</h3>
      <p class="muted small">Du bist in <strong>Woche ${d.currentWeek}</strong> — hier ist, wo es war:</p>
      <ul class="welcome-back">
        ${bits.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
      </ul>
      <p class="muted small">Tipp: das Algorithmus-Panel oben rechts zeigt, was der Algorithmus gerade über dich denkt.</p>
      <button class="btn btn-primary" id="welback-go">Weiterspielen</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  overlay.querySelector('#welback-go').onclick = () => { handle.close(); onClose(); };
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
}

function applyHighContrast(on) {
  if (on) document.documentElement.dataset.contrast = 'high';
  else delete document.documentElement.dataset.contrast;
}

function applyFontScale(scale) {
  const s = Math.max(0.85, Math.min(1.35, parseFloat(scale) || 1));
  document.documentElement.style.setProperty('--font-scale', s);
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
  const handle = attachModal(overlay);
  runMinigame(box, () => handle.close());
}

function openFactcheckMinigame() {
  SFX.swipe();
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  const box = document.createElement('div');
  box.className = 'tw-box big';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  runFactcheck(box, () => handle.close());
}

function openHeadlineMinigame() {
  SFX.swipe();
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  const box = document.createElement('div');
  box.className = 'tw-box big';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  runHeadline(box, () => handle.close());
}

function openGlossquizMinigame() {
  SFX.swipe();
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  const box = document.createElement('div');
  box.className = 'tw-box big';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  runGlossquiz(box, () => handle.close());
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

  // Highlight der Woche — ein knapper Satz, der eine markante Bewegung
  // hervorhebt. Sehr knapp, damit es nicht mit den Events konkurriert.
  const highlight = weekHighlight(d, eventResults, badges, prev, now, leanDelta, followedDelta);
  let storyHtml = highlight ? `<div class="week-highlight"><span class="kicker">Highlight</span><span>${escapeHtml(highlight)}</span></div>` : '';

  // NPC-Aktivitäts-Bulletin: simulierte, aber konsistente Stadt-Bewegungen.
  const buzz = npcBuzzFor(weekNum);
  if (buzz.length) {
    storyHtml += `<div class="npc-buzz">
      <div class="kicker muted small">In deiner Streem-Stadt diese Woche:</div>
      <ul>${buzz.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
    </div>`;
  }
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
    // Post-Quiz vor Wrapped — Vergleich landet im Wrapped-Slide.
    showPostQuiz(() => {
      showScreen('screen-wrapped');
      renderWrapped(
        () => { showScreen('screen-sandbox'); renderSandbox(() => { showScreen('screen-main'); renderFeed('feed'); }); },
        () => { showScreen('screen-manifest'); renderManifestForm(); }
      );
    });
    return;
  }
  if (pendingReflection) {
    openReflection(pendingReflection);
    return;
  }
  // Direkt nach dem ersten Shitstorm einen Mikro-Reflexions-Moment anbieten.
  const hadShitstorm = (Store.data.shitstormHistory || []).length > 0;
  if (hadShitstorm && !Store.data.microReflections?.first_shitstorm) {
    setTimeout(() => maybeQueueMicroReflection('first_shitstorm'), 400);
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
  // Intro + erste Frage vorlesen, wenn TTS aktiv.
  const firstQ = (qs[which] || [])[0];
  ttsSpeak(`${intros[which] || ''} ${firstQ || ''}`);
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

  // Verlaufs-Daten: Top-3 Tags über die Wochen für die Bias-Visualisierung.
  const history = Store.data.history || [];
  const topKeys = tags.slice(0, 3).map(([k]) => k);
  const trajectory = topKeys.map(k => {
    const points = history.map(h => h.profileSnapshot?.interests?.[k] || 0);
    points.push(p.interests[k] || 0); // Aktueller Stand
    return { key: k, points };
  });
  const maxY = Math.max(0.2, ...trajectory.flatMap(t => t.points));
  const trajectoryHtml = trajectory.length && history.length >= 2 ? (() => {
    const colors = { 0: 'var(--accent)', 1: 'var(--accent-2)', 2: 'var(--ok)' };
    const W = 320, H = 80, padding = 6;
    const xStep = (W - 2 * padding) / Math.max(1, trajectory[0].points.length - 1);
    return `
      <div class="algo-section">
        <h3>Verlauf deiner Top-3-Themen</h3>
        <p class="muted small">So hat der Algorithmus seine Einschätzung über die Wochen verschoben — die Linien sind dein Profil im Zeitverlauf.</p>
        <svg viewBox="0 0 ${W} ${H + 20}" class="bias-chart" aria-label="Verlauf der Top-Themen">
          <line x1="${padding}" x2="${W - padding}" y1="${H + 0.5}" y2="${H + 0.5}" stroke="var(--line)" stroke-width="1"/>
          ${trajectory.map((t, i) => {
            const color = colors[i] || 'var(--text-dim)';
            const points = t.points.map((v, j) => {
              const x = padding + xStep * j;
              const y = H - (v / maxY) * (H - padding);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(' ');
            return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round"/>`;
          }).join('')}
          ${trajectory.map((t, i) => {
            const x = padding + xStep * (t.points.length - 1);
            const y = H - ((t.points[t.points.length - 1]) / maxY) * (H - padding);
            const color = colors[i] || 'var(--text-dim)';
            return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${color}"/>`;
          }).join('')}
        </svg>
        <div class="bias-legend">
          ${trajectory.map((t, i) => `<span class="bias-legend-item"><span class="bias-dot" style="background:${colors[i] || 'var(--text-dim)'}"></span>${escapeHtml(tagLabel(t.key))}</span>`).join('')}
        </div>
      </div>
    `;
  })() : '';

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
    ${trajectoryHtml}
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

// NPC-Buzz: kleine fiktive Stadt-Mikro-Bewegungen pro Woche. Zeigt, dass die
// Welt um den User herum aktiv ist — auch ohne dass er etwas tut.
// Deterministisch aus Woche + Seed, damit es nicht zufällig springt.
const BUZZ_POOL = [
  'Lea hat Mira\'s Klima-Post geteilt.',
  'Finn hat in einem Stream stundenlang Patches kommentiert.',
  'Mira hat eine Demo angekündigt — Fleetplatz, Samstag.',
  'Tariq hat in einem Faden eine Studie korrigiert.',
  'Sara hat ein neues Roboter-Video hochgeladen.',
  'Marc Stay-Based hat einen Live-Stream gemacht — 4 800 Zuschauer:innen.',
  'Jule hat ihre Playlist „Greifshafener Spätsommer" gepostet.',
  'Lara Weiss wurde heute morgen in einer Talkshow zitiert.',
  'Noah hat einen langen Faden zur Mitte gepostet — kaum Likes.',
  'Streem Kuratiert hat ein neues Feature angeteasert — keiner weiß was.',
  'Benedikt Schmitt hat 800 neue Follower bekommen — alle in dieser Woche.',
  'Moritz hat einen Trainingspartner gesucht. Drei Antworten.',
  'Ana hat aus Berlin gepostet, ohne zu sagen warum sie dort ist.',
  'Nele empfiehlt ein Buch — kein Klick auf den Affiliate-Link.',
  'truecrime.de hat einen alten Fall wieder ausgegraben.'
];

function npcBuzzFor(weekNum) {
  const seed = (Store.data.random_seed || 1) ^ (weekNum * 2654435761);
  const used = new Set();
  const out = [];
  let x = seed >>> 0;
  while (out.length < 2 && used.size < BUZZ_POOL.length) {
    x = (x * 16807 + 1) >>> 0;
    const idx = x % BUZZ_POOL.length;
    if (!used.has(idx)) {
      used.add(idx);
      out.push(BUZZ_POOL[idx]);
    }
  }
  return out;
}

function weekHighlight(d, eventResults, badges, prev, now, leanDelta, followedDelta) {
  for (const r of eventResults) {
    if (r.result?.kind === 'shitstorm') return 'Einer deiner Posts ist viral gegangen.';
    if (r.result?.kind === 'deepfake') return 'Ein Deepfake hat dein Greifshafen aufgewirbelt.';
    if (r.result?.kind === 'invite') return 'Du hast eine neue Gilden-Einladung bekommen.';
    if (r.result?.kind === 'election_vote') return 'Wahltag — dein Feed hat dir eine ganz bestimmte Version gezeigt.';
  }
  if (badges?.length) return `Neues Abzeichen: ${badges[0]}.`;
  if (Math.abs(leanDelta) > 0.08) {
    return leanDelta > 0
      ? 'Deine politische Position ist diese Woche sichtbar nach rechts gerutscht.'
      : 'Deine politische Position ist diese Woche sichtbar nach links gerutscht.';
  }
  if (followedDelta >= 3) return `Du folgst jetzt ${followedDelta} neuen Accounts.`;
  const prevTop = Object.entries(prev?.interests || {}).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const nowTop  = Object.entries(now?.interests  || {}).sort((a,b)=>b[1]-a[1])[0]?.[0];
  if (prevTop && nowTop && prevTop !== nowTop) {
    return `Dein Top-Thema hat sich von „${tagLabel(prevTop)}" auf „${tagLabel(nowTop)}" verschoben.`;
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

// Kurze, fiktive Parteiprogramme — bewusst klischeehaft, damit SuS die Muster
// erkennen, nicht echte Parteien meinen.
const PARTY_PROGRAMS = {
  p_zukunft: {
    headline: 'Klimaschutz, Bildung, Sozialwohnungen.',
    bullets: [
      'CO₂-neutraler ÖPNV bis 2030',
      '50 % mehr Sozialwohnungen am Westhafen',
      'Schulen modernisieren, mehr Lehrkräfte einstellen',
      'Bürger:innen-Räte als ständiges Mitspracheformat'
    ]
  },
  p_buerger: {
    headline: 'Pragmatisch, transparent, ohne Lagerdenken.',
    bullets: [
      'Kommunalhaushalt offen einsehbar',
      'Wirtschaftsförderung für lokale Betriebe',
      'Bestehende Schulen sanieren statt neu bauen',
      'Mehr Polizei in der Altstadt, mehr Sozialarbeit'
    ]
  },
  p_alt: {
    headline: 'Endlich zuhören — was die Bürger:innen wirklich wollen.',
    bullets: [
      'Senkung der Grundsteuer für Hauseigentümer',
      'Mehr Kontrollen am Hafen',
      'Stadtfeste nur noch traditionell ausrichten',
      'Migration begrenzen, „klare Linie"'
    ]
  },
  p_heimat: {
    headline: 'Unsere Stadt, unsere Regeln.',
    bullets: [
      'Abschiebungen beschleunigen',
      '„Echte Greifshafener" zuerst bei Wohnungsvergabe',
      'Schulplan: weniger „bunte Themen", mehr Heimat',
      'Bürgerwehr im Hafenviertel'
    ]
  }
};

function openElection() {
  const parties = [...getParties()].sort((a, b) => (a.lean ?? 0) - (b.lean ?? 0));
  const body = document.getElementById('election-body');
  body.innerHTML = `
    <p class="muted">Wen willst du wählen? Die Parteien — sortiert von links nach rechts, wie sie dir im Feed begegnet sind. Klick „Programm" für die Kernpunkte.</p>
    <div class="party-grid">
      ${parties.map(p => {
        const cov = estimateCoverageFor(p);
        const col = PARTY_COLORS[p.id] || '#888';
        const prog = PARTY_PROGRAMS[p.id];
        return `
        <div class="party-card" style="border-left:4px solid ${col}">
          <div class="name" style="color:${col}">${escapeHtml(p.name)}</div>
          <div class="slogan">„${escapeHtml(p.slogan)}"</div>
          <div class="coverage">In deinem Feed: <span class="cov cov-${cov.level}">${escapeHtml(cov.text)}</span></div>
          ${prog ? `<details class="party-program">
            <summary>Programm</summary>
            <div class="party-program-body">
              <strong>${escapeHtml(prog.headline)}</strong>
              <ul>${prog.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
            </div>
          </details>` : ''}
          <div class="party-vote-bar">
            <button class="btn btn-primary" data-vote="${p.id}">Für ${escapeHtml(p.name)} stimmen</button>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="election-extras">
      <button class="btn btn-ghost" id="btn-open-wahlomat">📝 Wahlomat-Quiz — was passt zu mir?</button>
    </div>
    <div id="election-result-slot"></div>
  `;
  body.querySelector('#btn-open-wahlomat').onclick = () => openWahlomat();
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
        const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
        const diffLabel = diff > 0 ? 'mehr im Feed' : diff < 0 ? 'weniger im Feed' : 'gleich';
        return `
          <div class="election-row">
            <div class="party-label" style="color:${col}">${escapeHtml(p.name)}</div>
            <div class="bar-pair">
              <div class="bar"><div class="fill" style="width:${obj}%;background:${col};opacity:0.55"></div><span class="bar-val">${obj}%</span></div>
              <div class="bar"><div class="fill" style="width:${per}%;background:${col}"></div><span class="bar-val">${per}% <em class="diff ${diff>=0?'pos':'neg'}" aria-label="${escapeHtml(diffLabel)}"><span aria-hidden="true">${arrow}</span> ${diff>=0?'+':''}${diff}</em></span></div>
            </div>
          </div>`;
      }).join('')}
    </div>
    <button class="btn btn-primary" id="btn-elec-close" style="margin-top:14px">Zurück</button>
  `;
  slot.querySelector('#btn-elec-close').onclick = () => showScreen('screen-main');
}

// ===== Profile-Modal (kleine Variante) =====
// Vollständige Liste aller Achievements aus events.js. Wird hier
// gespiegelt, damit die Profil-Anzeige auch noch nicht freigeschaltete
// Abzeichen mit Beschreibung zeigen kann.
// Vollständige Achievement-Liste. progress(d) → { current, target } macht
// die "noch X für Y"-Nudges möglich. null bedeutet: kein Fortschritt sinnvoll
// quantifizierbar (z.B. Pfad-Entscheidungen).
const ACHIEVEMENTS_CATALOG = [
  { title: 'Early Adopter',         desc: '20 Likes in der ersten Phase',
    progress: d => ({ current: countAction(d, 'like'), target: 20 }) },
  { title: 'Flammenwerfer',         desc: 'Du hast wütend kommentiert',
    progress: d => ({ current: countAction(d, 'angry_comment'), target: 5 }) },
  { title: 'Stiller Beobachter',    desc: 'Lesen statt Schreiben (ab W5)',
    progress: null },
  { title: 'Netzwerker',            desc: 'Du folgst 10+ Accounts',
    progress: d => ({ current: countAction(d, 'follow'), target: 10 }) },
  { title: 'Tief im Loch',          desc: 'Rabbit-Hole betreten',
    progress: null },
  { title: 'Bücherwurm',            desc: 'Der Leserunde beigetreten',
    progress: null },
  { title: 'Türsteher:in',          desc: '5+ Accounts stummgeschaltet — bewusst kuratiert',
    progress: d => ({ current: countAction(d, 'mute'), target: 5 }) },
  { title: 'Reichweiten-Bauer:in',  desc: '10+ Beiträge geteilt',
    progress: d => ({ current: countAction(d, 'share'), target: 10 }) },
  { title: 'Selbstschutz',          desc: 'Mehrfach Inhalte bewusst übersprungen',
    progress: d => ({ current: twCount(d, 'skipped'), target: 4 }) },
  { title: 'Hinschauen',            desc: 'Mehrfach durch die Warnung gegangen — bewusst informiert',
    progress: d => ({ current: twCount(d, 'shown'), target: 3 }) },
  { title: 'Stimme',                desc: '5+ eigene Posts geschrieben',
    progress: d => ({ current: (d.ownPosts || []).length, target: 5 }) },
  { title: 'Sticker-Bro',           desc: 'Drei eigene Posts mit Sticker',
    progress: d => ({ current: (d.ownPosts || []).filter(p => p.sticker).length, target: 3 }) },
  { title: 'Sammler:in',            desc: '3+ Posts für die Reflexion gemerkt',
    progress: d => ({ current: Object.keys(d.bookmarks || {}).length, target: 3 }) },
  { title: 'Antworter:in',          desc: 'Vier DMs persönlich beantwortet',
    progress: d => ({ current: Object.keys(d.dmReplies || {}).length, target: 4 }) },
  { title: 'Spurensucher:in',       desc: 'Greifshafen durchgeklickt',
    progress: d => ({ current: Object.values(d.placesVisited || {}).reduce((a, b) => a + b, 0), target: 6 }) },
  { title: 'Beste Freundin',        desc: 'Lea sieht dich an guten Tagen.',
    progress: null },
  { title: 'Wachposten',            desc: 'Finn vor der Gilde gewarnt.',
    progress: null },
  { title: 'Verbündete:r',          desc: 'Mira hat dir vertraut.',
    progress: null }
];

function countAction(d, type) {
  return (d.history || []).flatMap(h => h.actions || []).filter(a => a.type === type).length;
}
function twCount(d, kind) {
  return Object.values(d.contentWarningsAccepted || {}).reduce((a, b) => a + (b[kind] || 0), 0);
}

function openChecklist() {
  const body = document.getElementById('checklist-body');
  // Live-Checks ausführen.
  let lsOK = false;
  try {
    const k = '__checktest';
    localStorage.setItem(k, '1');
    lsOK = localStorage.getItem(k) === '1';
    localStorage.removeItem(k);
  } catch (e) { lsOK = false; }
  const isFile = location.protocol === 'file:';
  const isPrivate = !lsOK;
  const ua = navigator.userAgent || '';
  const isSafariMobile = /Safari/.test(ua) && /Mobile/.test(ua) && !/Chrome/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edg|OPR/.test(ua);
  const audioCtxOK = !!(window.AudioContext || window.webkitAudioContext);
  const items = [
    { ok: lsOK, label: 'localStorage funktioniert',
      detail: lsOK ? 'Spielstand kann gespeichert werden.' : 'Privat-Modus oder Cookies blockiert? Spielstand würde nicht gespeichert.' },
    { ok: !isPrivate, label: 'Kein Privat-Modus',
      detail: isPrivate ? 'iPad/Safari: bitte aus dem privaten Tab heraus. Sonst geht der Spielstand beim Schließen verloren.' : 'Normaler Modus.' },
    { ok: !(isFile && isChrome), label: 'Browser kann lokale Dateien',
      detail: (isFile && isChrome)
        ? 'Chrome auf file:// kann JSON-Daten blockieren. Tipp: nimm Firefox/Safari, oder starte einen kleinen Server (siehe README).'
        : isFile ? 'file://-Modus erkannt — Safari/Firefox funktionieren in der Regel.' : 'Du bist auf http(s) — alles fein.' },
    { ok: audioCtxOK, label: 'WebAudio verfügbar',
      detail: audioCtxOK ? 'Sound-Effekte funktionieren.' : 'Kein WebAudio — Spiel läuft, aber stumm.' },
    { ok: true, label: 'Reflexionsphase einplanen',
      detail: 'Pro Spieltag ~80 Minuten Spielzeit, danach 30-45 Min Reflexion. Lehr-Bericht und Klassen-Vergleich (Settings) helfen.' },
    { ok: true, label: 'Inhaltswarnungen vorab erklären',
      detail: 'Manche Inhalte sind politisch heikel (Verschwörungen, Rechtsextremismus, Anti-Feminismus). Inhaltswarnungen können übersprungen werden.' },
    { ok: true, label: 'Klassen-Spielstände sammeln',
      detail: 'Am letzten Tag JSON-Spielstände aller SuS einsammeln → Settings → Klassen-Vergleich → ein HTML-Dokument mit Entscheidungs-Diffs.' },
    { ok: true, label: 'Tag-Fokus via URL setzen',
      detail: 'Mit ?day=1, ?day=2 oder ?day=3 in der URL erscheint ein Lehrer-Banner mit den Schwerpunkten des Tages.' }
  ];
  body.innerHTML = `
    <ul class="checklist">
      ${items.map(it => `
        <li class="checklist-item ${it.ok ? 'ok' : 'warn'}">
          <span class="checklist-mark" aria-hidden="true">${it.ok ? '✓' : '⚠'}</span>
          <div>
            <strong>${escapeHtml(it.label)}</strong>
            <div class="muted small">${escapeHtml(it.detail)}</div>
          </div>
        </li>
      `).join('')}
    </ul>
    <p class="muted small">Bei Fragen: README.md im Repo, Abschnitt „Schnellstart" und „Troubleshooting".</p>
  `;
  showScreen('screen-checklist');
}

// Save-Inspector: zeigt KB-Verbrauch, Feld-Stats, Integrität. Hilft beim
// Debuggen, wenn ein Spielstand sich seltsam verhält, und sensibilisiert
// SuS für den realen Daten-Footprint.
function openSaveInspector() {
  const data = Store.data;
  if (!data) { alert('Kein Spielstand geladen.'); return; }
  const json = JSON.stringify(data);
  const bytes = new Blob([json]).size;
  const kb = (bytes / 1024).toFixed(1);
  const fieldStats = [
    ['Aktuelle Woche',          data.currentWeek],
    ['Wochen-Historie',         (data.history || []).length],
    ['Gesehene Posts',          (data.seenPosts || []).length],
    ['Liked',                   Object.keys(data.likedPosts || {}).length],
    ['Geteilt',                 Object.keys(data.sharedPosts || {}).length],
    ['Lesezeichen',             Object.keys(data.bookmarks || {}).length],
    ['Eigene Posts',            (data.ownPosts || []).length],
    ['Eigene Post-Antworten',   Object.keys(data.ownPostReplies || {}).length],
    ['DM-Antworten',            Object.keys(data.dmReplies || {}).reduce((acc, t) => acc + Object.keys(data.dmReplies[t] || {}).length, 0)],
    ['Gilden-Mitgliedschaften', (data.guildMemberships || []).length],
    ['Badges',                  (data.badges || []).length],
    ['Shitstorms',              (data.shitstormHistory || []).length],
    ['Story-Klicks',            Object.keys(data.storiesViewed || {}).length],
    ['Orte besucht',            Object.keys(data.placesVisited || {}).length],
    ['Sandbox-Presets',         Object.keys(data.customPresets || {}).length],
    ['Konzepte gesehen',        Object.keys(data.conceptsSeen || {}).length],
    ['Mini-Game-Ergebnisse',    Object.keys(data.minigameResults || {}).length],
    ['Mikro-Reflexionen',       Object.keys(data.microReflections || {}).length]
  ];
  let backupKb = '—';
  try {
    const raw = localStorage.getItem('algo_save_backup_v1');
    if (raw) backupKb = (new Blob([raw]).size / 1024).toFixed(1);
  } catch (e) { /* ignore */ }
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.innerHTML = `
    <div class="tw-box" style="max-width:520px;max-height:85vh;overflow-y:auto">
      <h3>Save-Inspector</h3>
      <p class="muted small">So sieht dein Spielstand intern aus. Auch real: Plattformen sammeln so etwas — nur unsichtbar.</p>
      <div class="inspector-size">
        <div>Aktueller Spielstand: <strong>${kb} KB</strong></div>
        <div>Backup: <strong>${backupKb} KB</strong></div>
        <div>LocalStorage-Limit pro Origin: meist ~5 MB</div>
      </div>
      <table class="inspector-table">
        <thead><tr><th>Feld</th><th>Wert / Anzahl</th></tr></thead>
        <tbody>
          ${fieldStats.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(String(v))}</td></tr>`).join('')}
        </tbody>
      </table>
      <p class="muted small">Tipp: bei Fragen oder Auffälligkeiten den JSON-Export anschauen — die Felder sind klar benannt.</p>
      <button class="btn btn-primary" id="inspector-close">Schließen</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  overlay.querySelector('#inspector-close').onclick = () => handle.close();
}

function openHelp() {
  if (Store.data) { Store.data.helpSeen = true; Store.save(); }
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.innerHTML = `
    <div class="tw-box" style="max-width:560px;max-height:85vh;overflow-y:auto">
      <h3>Hilfe &amp; Tipps</h3>

      <details open><summary>Wie spiele ich?</summary>
        <p class="muted small">Du scrollst durch den Feed, likest oder kommentierst Posts, beantwortest DMs. Pro Woche 10 Posts, dann klickst du auf „Wochenrückblick" und gehst zur nächsten Woche. Insgesamt 27 Wochen.</p>
      </details>

      <details><summary>Was passiert, wenn ich like / kommentiere / blocke?</summary>
        <p class="muted small">Likes und Kommentare verstärken die Themen-Tags des Posts in deinem Profil. Auch wütende Kommentare („Stell dir vor …") verstärken — das ist der Witz. Blockieren schaltet einen Account stumm.</p>
      </details>

      <details><summary>Warum sehe ich diesen Post?</summary>
        <p class="muted small">Ab W9: Klick auf „Warum?" über jedem Post — er zeigt dir die Algorithmus-Faktoren, mit denen der Post oben gelandet ist (Affinity, Empörung, Aktualität, …).</p>
      </details>

      <details><summary>Was bedeuten die Icons oben rechts?</summary>
        <p class="muted small">🗺️ Karte von Greifshafen. 🔍 Blick hinter den Algorithmus (zeigt dein Profil aus der App-Sicht). 💬 Gilden (Discord-artige Gruppen-Chats). 👤 Profil. ⚙️ Einstellungen.</p>
      </details>

      <details><summary>Wo finde ich Mini-Games?</summary>
        <p class="muted small">In den Einstellungen → Spiel &amp; Inhalte. Vier Mini-Games: Bot-Quiz, Faktencheck, Schlagzeile-zu-Studie, Begriff-zur-Erklärung.</p>
      </details>

      <details><summary>Mein Spielstand ist weg / Backup wiederherstellen</summary>
        <p class="muted small">Settings → Lehrkraft-Werkzeuge → „Letztes Backup wiederherstellen". Wenn du den Spielstand exportieren willst: „Spielstand exportieren (JSON)".</p>
      </details>

      <details><summary>Wie kann ich vergrößern / hellen Hintergrund haben?</summary>
        <p class="muted small">Settings → Darstellung &amp; Sound: Schriftgröße-Slider, Light-Mode-Toggle, High-Contrast-Toggle. Auch Sound-Lautstärke ist dort.</p>
      </details>

      <details><summary>Was, wenn ein Inhalt mich belastet?</summary>
        <p class="muted small">Inhaltswarnungen kannst du überspringen — keine Pflicht. Wenn dich nach dem Spielen etwas beschäftigt: bpb.de, klicksafe.de, hateaid.org, oder Telefonseelsorge 0800 111 0 111 (24/7).</p>
      </details>

      <button class="btn btn-primary" id="help-close" style="margin-top:14px">Alles klar</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  overlay.querySelector('#help-close').onclick = () => handle.close();
}

function openShortcuts() {
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.innerHTML = `
    <div class="tw-box" style="max-width:520px">
      <h3>Tastenkürzel</h3>
      <p class="muted small">Funktioniert auf Desktop. Auf Tablet wird gestrichen.</p>
      <dl class="shortcuts">
        <dt><kbd>Esc</kbd></dt><dd>Modal schließen</dd>
        <dt><kbd>Tab</kbd> / <kbd>Shift+Tab</kbd></dt><dd>Durch Buttons in Modalen</dd>
        <dt><kbd>←</kbd> / <kbd>→</kbd></dt><dd>Wrapped-Slide vor/zurück</dd>
        <dt><kbd>Leertaste</kbd></dt><dd>Wrapped-Slide weiter</dd>
        <dt><kbd>Enter</kbd></dt><dd>Fokussierten Button auslösen</dd>
      </dl>
      <p class="muted small">Touch: Tap auf Story pausiert den Fortschritt. Lange tippen auf einen Action-Button öffnet das Aria-Label.</p>
      <button class="btn btn-primary" id="shortcuts-close">Verstanden</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  overlay.querySelector('#shortcuts-close').onclick = () => handle.close();
}

function openConceptsList() {
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.innerHTML = `
    <div class="tw-box glossary-box">
      <header class="glossary-head">
        <h3>Konzept-Karten</h3>
        <button class="btn btn-ghost btn-small" id="concepts-list-close">Schließen</button>
      </header>
      <p class="muted small">Alle erklärenden Karten, die im Spiel an passender Stelle erscheinen. Klick öffnet die volle Karte.</p>
      <ul class="glossary-list">
        ${listConcepts().map(c => `
          <li>
            <button class="glossary-term" data-key="${c.key}" aria-expanded="false">
              <strong>${escapeHtml(c.title)}</strong>
              <span class="glossary-chev" aria-hidden="true">→</span>
            </button>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  overlay.querySelector('#concepts-list-close').onclick = () => handle.close();
  overlay.querySelectorAll('.glossary-term').forEach(b => {
    b.onclick = () => {
      handle.close();
      showConcept(b.dataset.key);
    };
  });
}

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
    <div style="text-align:center;margin:8px 0">
      <button type="button" class="btn btn-ghost btn-small" id="profile-edit-btn">Profil bearbeiten</button>
    </div>
    <p class="muted small" style="text-align:center">Woche ${Store.data.currentWeek} · Tag ${Store.getDay()}</p>
    <div class="stat-row" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0">
      <div class="stat"><div class="num">${profile.followed.length}</div><div class="lbl">folgst du</div></div>
      <div class="stat"><div class="num">${Store.data.ownPosts.length}</div><div class="lbl">Posts</div></div>
      <div class="stat"><div class="num">${Store.data.badges.length}</div><div class="lbl">Badges</div></div>
    </div>
    ${(() => {
      // Quick-Stats: kompakte Wochen-Deltas der letzten 3 Wochen.
      const hist = Store.data.history || [];
      if (hist.length < 1) return '';
      const recent = hist.slice(-3);
      return `
      <details class="profile-quickstats">
        <summary>Letzte ${recent.length} Woche${recent.length === 1 ? '' : 'n'}</summary>
        <div class="quickstats-list">
          ${recent.map((h, i) => {
            const acts = (h.actions || []).length;
            const lean = h.profileSnapshot?.political_lean_estimated || 0;
            const prev = i === 0 ? (hist[hist.length - recent.length - 1]?.profileSnapshot?.political_lean_estimated || 0) : (recent[i-1].profileSnapshot?.political_lean_estimated || 0);
            const dLean = lean - prev;
            const arrow = dLean > 0.05 ? '↑' : dLean < -0.05 ? '↓' : '→';
            return `<div class="quickstats-row">
              <span class="quickstats-week">W${h.week}</span>
              <span class="quickstats-stat">${acts} Aktionen</span>
              <span class="quickstats-stat">Lean ${lean.toFixed(2)} <span class="muted small">${arrow}</span></span>
            </div>`;
          }).join('')}
        </div>
      </details>`;
    })()}
    ${(() => {
      const all = (DATA.stories?.stories || []);
      const viewed = Object.keys(Store.data.storiesViewed || {});
      const seenStories = all.filter(s => viewed.includes(s.id) && s.week <= Store.data.currentWeek);
      if (!seenStories.length) return '';
      return `
      <details class="profile-stories">
        <summary>Stories-Archiv <span class="muted small">(${seenStories.length})</span></summary>
        <div class="profile-stories-list">
          ${seenStories.map(s => {
            const c = getCharacter(s.author);
            return `<button type="button" class="profile-story-item" data-story-id="${s.id}">
              <span class="profile-story-emoji">${s.emoji || '·'}</span>
              <span class="profile-story-meta">
                <strong>${escapeHtml(c?.name || s.author)}</strong>
                <span class="muted small">W${s.week}</span>
              </span>
              <span class="profile-story-text">${escapeHtml(truncate(s.text, 50))}</span>
            </button>`;
          }).join('')}
        </div>
      </details>`;
    })()}
    <details class="profile-badges">
      <summary>Alle Abzeichen <span class="muted small">(${Store.data.badges.length}/${ACHIEVEMENTS_CATALOG.length})</span></summary>
      <div class="badges-grid">
        ${ACHIEVEMENTS_CATALOG.map(a => {
          const earned = Store.data.badges.find(b => b.title === a.title);
          let progressBlock = '';
          if (!earned && a.progress) {
            const p = a.progress(Store.data);
            const left = Math.max(0, p.target - p.current);
            const pct = Math.min(100, Math.round((p.current / p.target) * 100));
            progressBlock = `
              <div class="badge-progress">
                <div class="badge-progress-bar"><div class="badge-progress-fill" style="width:${pct}%"></div></div>
                <div class="badge-progress-text muted small">${p.current} / ${p.target}${left > 0 ? ` · noch ${left}` : ''}</div>
              </div>`;
          }
          return `<div class="badge-item ${earned ? 'earned' : 'locked'}" title="${escapeHtml(a.desc)}">
            <div class="badge-emoji" aria-hidden="true">${earned ? '🏅' : '🔒'}</div>
            <div class="badge-name">${escapeHtml(a.title)}</div>
            <div class="badge-desc muted small">${escapeHtml(a.desc)}</div>
            ${progressBlock}
          </div>`;
        }).join('')}
      </div>
    </details>
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
  body.querySelector('#profile-edit-btn').onclick = () => { close(); openProfileEdit(); };
  body.querySelectorAll('.profile-story-item').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.storyId;
      const story = (DATA.stories?.stories || []).find(s => s.id === id);
      if (story) { close(); openStory(story); }
    };
  });
}

function truncate(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

function openProfileEdit() {
  const c = Store.data.character;
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.innerHTML = `
    <div class="tw-box" style="max-width:460px">
      <h3>Profil bearbeiten</h3>
      <p class="muted small">Name lässt sich nicht ändern (es ist dein Spielstand-Schlüssel). Bio und Pronomen schon.</p>
      <label class="profile-edit-row">
        <span>Pronomen</span>
        <select id="edit-pronoun">
          <option value="sie/ihr">sie / ihr</option>
          <option value="er/ihn">er / ihn</option>
          <option value="they/them">they / them</option>
          <option value="keine">keine Angabe</option>
        </select>
      </label>
      <label class="profile-edit-row">
        <span>Bio <span class="muted small">(max 180 Zeichen)</span></span>
        <textarea id="edit-bio" maxlength="180" rows="3"></textarea>
      </label>
      <div class="tw-actions">
        <button class="btn btn-ghost" id="edit-cancel">Abbrechen</button>
        <button class="btn btn-primary" id="edit-save">Speichern</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  const sel = overlay.querySelector('#edit-pronoun');
  const ta = overlay.querySelector('#edit-bio');
  sel.value = c.pronoun || 'keine';
  ta.value = c.bio || '';
  overlay.querySelector('#edit-cancel').onclick = () => handle.close();
  overlay.querySelector('#edit-save').onclick = () => {
    Store.data.character.pronoun = sel.value;
    Store.data.character.bio = ta.value.trim().slice(0, 180);
    Store.save();
    handle.close();
    toast('Profil aktualisiert.');
  };
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
  ol.disc li { margin: .8rem 0; font-size: 14px; }
  dl.glossary-print dt { font-weight: 700; color: #4338ca; margin-top: 8px; }
  dl.glossary-print dd { margin: 4px 0 8px 0; font-size: 13px; line-height: 1.5; }
  .teacher-aside { background: #fffbe6; border: 1px solid #f0c060; border-radius: 8px; padding: 14px; margin: 1.5rem 0; }
  .teacher-aside strong { display: block; color: #92520a; margin-bottom: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
  .teacher-aside ol { margin: .5rem 0 .8rem 1.2rem; padding: 0; }
  .teacher-aside ol li { margin: .3rem 0; font-size: 14px; }
  @media print {
    body { max-width: none; margin: 0; padding: 1.5cm; font-size: 11pt; color: #000; }
    h1 { color: #4338ca; page-break-after: avoid; }
    h2 { color: #4338ca; page-break-after: avoid; margin-top: 1.5cm; }
    section, .stats, .qa, .teacher-aside, ol.disc, ol, ul.interests { page-break-inside: avoid; }
    .teacher-aside { background: #fffbe6; border: 1px solid #c0a040; color: #000; }
    .stat { background: #f4f4f4; border-left-color: #6c2bd9; }
    a { color: #000; text-decoration: underline; }
    .foot { font-size: 9pt; }
  }
  @page { margin: 1.5cm; }
</style></head>
<body>
  <h1>Streem-Bericht</h1>
  <p class="meta"><strong>${escapeHtml(c.name)}</strong>${c.pronoun && c.pronoun !== 'keine' ? ' · ' + escapeHtml(c.pronoun) : ''} · ${escapeHtml(c.city || '')} · Protagonist:in: ${escapeHtml(c.protagonist || 'alex')}<br/>Stand: Woche ${d.currentWeek} · erstellt ${new Date().toLocaleString('de-DE')}</p>
  ${c.bio ? `<blockquote class="profile-bio">${escapeHtml(c.bio)}</blockquote>` : ''}

  <aside class="teacher-aside">
    <strong>Für die Lehrkraft</strong>
    <p>Dieses Dokument zeigt einen Spielverlauf — gedacht für die Reflexionsphase im Anschluss. Vorschlag für 45 Minuten:</p>
    <ol>
      <li>5 Min: SuS überfliegen ihren eigenen Bericht (besonders Mikro-Reflexionen, Lesezeichen, Ending).</li>
      <li>10 Min: In Kleingruppen ein Lesezeichen vorstellen — warum genau dieses?</li>
      <li>15 Min: Im Plenum eine der „Diskussionsfragen für die Klasse" unten am Dokument.</li>
      <li>10 Min: Manifest-Sätze laut vorlesen, Konsens und Dissens markieren.</li>
      <li>5 Min: Anlaufstellen kurz vorstellen — bei wem würden SuS sich melden, wenn etwas eskaliert?</li>
    </ol>
    <p class="muted small">Bei mehreren Berichten: „Klassen-Vergleich" in der App nutzen (Saves aller SuS als JSON sammeln → eine HTML-Übersicht mit Entscheidungs-Diffs und geteilten Lesezeichen).</p>
  </aside>

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

  ${(() => {
    const w = d.wahlomat?.answers;
    if (!w || !Object.keys(w).length) return '';
    const label = { agree: 'Zustimmung', neutral: 'Neutral', disagree: 'Ablehnung' };
    const stmts = [
      ['s_klima', 'CO₂-neutraler ÖPNV bis 2030'],
      ['s_wohnen', '50 % mehr Sozialwohnungen am Westhafen'],
      ['s_polizei', 'Mehr Polizeipräsenz in der Altstadt'],
      ['s_haushalt', 'Kommunaler Haushalt komplett öffentlich'],
      ['s_migration', 'Schnellere Abschiebungen'],
      ['s_buergerrat', 'Bürger:innen-Räte als festes Format'],
      ['s_stadtfest', 'Stadtfeste traditionell ausrichten'],
      ['s_schulen', 'Mehr Klimabildung und Demokratie in Schulen']
    ];
    return `<section><h2>Wahlomat-Antworten</h2>
      <p class="muted">Eigene Positionierung zu acht fiktiven Politikfragen der Stadt.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr><th style="text-align:left">Aussage</th><th style="text-align:left">Antwort</th></tr></thead>
        <tbody>
          ${stmts.map(([id, text]) => `<tr><td style="padding:6px 4px;border-bottom:1px solid #eee">${escapeHtml(text)}</td><td style="padding:6px 4px;border-bottom:1px solid #eee">${escapeHtml(label[w[id]] || '—')}</td></tr>`).join('')}
        </tbody>
      </table>
    </section>`;
  })()}

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

  ${(() => {
    const bm = d.bookmarks || {};
    const entries = Object.entries(bm);
    if (!entries.length) return '';
    return `<section><h2>Lesezeichen</h2><p class="muted">Beiträge, die du dir gemerkt hast — z.B. weil du sie in der Reflexion ansprechen wolltest.</p>
      ${entries.map(([id, b]) => `<div class="qa"><div class="q">W${b.week} · ${escapeHtml(b.author || '')}</div><div class="a">${escapeHtml(b.text || '')}</div></div>`).join('')}
    </section>`;
  })()}

  <h2>Diskussionsfragen für die Klasse</h2>
  <p class="muted">Auf den tatsächlichen Spielverlauf zugeschnitten — gedacht für die Reflexionsphase. Frei zu kürzen, zu ergänzen, zu ignorieren.</p>
  <ol class="disc">
    ${buildContextualDiscussionQuestions(d).map(q => `<li>${escapeHtml(q)}</li>`).join('')}
  </ol>

  <h2>Glossar</h2>
  <p class="muted">Begriffe, die im Spiel und in der Reflexion auftauchen. Druckbar als Handout.</p>
  <dl class="glossary-print">
    ${listGlossaryTerms().map(t => `<dt>${escapeHtml(t.term)}</dt><dd>${escapeHtml(t.text)}</dd>`).join('')}
  </dl>

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

// Diskussionsfragen, die sich an den tatsächlichen Spielverlauf anpassen.
// Eine Mischung aus immer-passenden und kontext-spezifischen Fragen,
// gewichtet so, dass kontextuelle zuerst kommen.
function buildContextualDiscussionQuestions(d) {
  const out = [];
  const p = d.userProfile || {};
  const arcs = d.npcArcs || {};
  const guilds = d.guildMemberships || [];
  const dmReplies = d.dmReplies || {};
  const tw = d.contentWarningsAccepted || {};
  const twSkip = Object.values(tw).reduce((a, b) => a + (b.skipped || 0), 0);
  const twShown = Object.values(tw).reduce((a, b) => a + (b.shown || 0), 0);
  const actions = (d.history || []).flatMap(h => h.actions || []);
  const angry = actions.filter(a => a.type === 'angry_comment').length;
  const ownPosts = (d.ownPosts || []).length;
  const ending = d.ending;
  const marcChoice = dmReplies.dm_marc?.[11]?.id || null;
  const finnPath = arcs.finn_path || 0;
  const lara = dmReplies.dm_lara?.[24]?.id || null;
  const lea14 = dmReplies.dm_lea?.[14]?.id || null;
  const mira15 = dmReplies.dm_mira?.[15]?.id || null;
  const protag = d.character?.protagonist || 'alex';

  // 1) Ending-spezifische Eröffnungsfrage
  if (ending === 'rabbithole' || ending === 'finn_lost') {
    out.push('Bei welcher Entscheidung im Spiel hättest du am ehesten einen Bruch einleiten können — wenn du es im echten Leben mit einer Person erleben würdest, die genauso abrutscht?');
  } else if (ending === 'finn_saved') {
    out.push('Du hast Finn auf seiner Bahn gestoppt. Was war im Spiel die kleinste Bewegung, die einen echten Unterschied gemacht hat?');
  } else if (ending === 'aware') {
    out.push('Du hast Lea gegenüber zugegeben, dass dieser Feed etwas mit dir macht. Wann hast du das im echten Leben zuletzt zu jemandem gesagt — oder hörst du es selten?');
  } else if (ending === 'allyship') {
    out.push('Mira hat dich nach einem Hate-Pile-On gebeten, kurz zu helfen. Wo ist im echten Netz die Grenze zwischen „Helfen" und „Aufmerksamkeits-Spirale weiterdrehen"?');
  } else if (ending === 'crusader') {
    out.push('Du hast viel und laut kommentiert. Wann führt Empörung zu Veränderung — wann nur zu mehr Empörung?');
  } else if (ending === 'guarded') {
    out.push('Du hast viele Inhalte übersprungen, Accounts stummgeschaltet. Macht das den Feed sicherer — oder nur enger?');
  } else if (ending === 'influencer') {
    out.push('Du warst Mikro-Influencer:in. Was hat sich verändert, als du selbst gepostet hast — verglichen mit nur konsumieren?');
  } else {
    out.push('Wann im Spielverlauf hattest du das Gefühl, der Algorithmus „lernt dich" — auch wenn du nicht aktiv etwas geändert hast?');
  }

  // 2) Marc-DM-spezifisch
  if (marcChoice === 'marc_join') {
    out.push('Du hast Marc Stay-Based geantwortet, mit in den Discord zu gehen. Was war attraktiv an seiner Anwerbung — auch wenn du wusstest, was er repräsentiert?');
  } else if (marcChoice === 'marc_curious') {
    out.push('Du hast bei Marc nachgefragt, ohne mitzumachen. Wo verläuft im echten Netz die Linie zwischen „neugierig zuschauen" und „bestätigen"?');
  } else if (marcChoice === 'marc_block') {
    out.push('Du hast Marc sofort blockiert. War das die richtige Reaktion — oder verliert man dadurch auch die Chance zu verstehen, was dort passiert?');
  } else {
    out.push('Marc Stay-Based hat dich angeschrieben. Wenn dich jemand wie er in echt anschreiben würde — wie würdest du reagieren?');
  }

  // 3) Finn-Pfad-spezifisch
  if (finnPath >= 2) {
    out.push('Finn ist auf seiner Bahn in Richtung Gilde gerutscht, du hast ihn nicht aufgehalten. Was hätte dich im echten Leben getriggert, einzugreifen — und was hat dich im Spiel davon abgehalten?');
  } else if (finnPath <= -2) {
    out.push('Du hast Finn zweimal widersprochen. Erinnerst du dich an eine Situation im echten Leben, in der du jemanden hättest stoppen sollen — aber nicht hast?');
  }

  // 4) Lara/Mira-Solidarität
  if (lara === 'lara_24_solidarity' || mira15 === 'mira_15_support') {
    out.push('Du hast einer Person, die online Hass abbekam, kurz zur Seite gestanden. Welche Form von Unterstützung hilft im echten Netz — und welche schadet?');
  } else if (lara === 'lara_24_silence' && mira15 === 'mira_15_distance') {
    out.push('In beiden Fällen, in denen jemand Hass abbekam, hast du Distanz gehalten. Welche Gründe gibt es, sich rauszuhalten — und welche Kosten?');
  }

  // 5) Selbstwahrnehmung
  if (lea14 === 'lea_14_open') {
    out.push('Lea zu sagen, dass dieser Feed etwas mit dir macht — was hat das im Spiel verändert? Wo wäre es im echten Leben schwieriger?');
  } else if (lea14 === 'lea_14_deflect') {
    out.push('Lea hat gefragt, was los ist — du hast „Stress halt" geantwortet. Was hindert uns daran, ehrlich zu sagen, wenn ein Feed uns formt?');
  }

  // 6) Empörung/Engagement
  if (angry >= 5) {
    out.push(`Du hast ${angry}-mal wütend kommentiert. Was war im Spiel der Anreiz dazu — und wem hat es etwas gebracht?`);
  }

  // 7) Inhaltswarnungen
  if (twSkip >= 3 && twShown >= 3) {
    out.push('Du hast sowohl mehrmals durch Inhaltswarnungen gegangen als auch mehrmals abgebrochen. Wie hast du im Moment entschieden — Bauch, Tagesform, etwas Spezifisches?');
  } else if (twSkip >= 4) {
    out.push('Du hast viele Inhaltswarnungen übersprungen. Schützt das wirklich — oder schiebt es das Thema nur weg, ohne es zu verarbeiten?');
  } else if (twShown >= 4) {
    out.push('Du bist oft bewusst durch die Inhaltswarnungen gegangen. Was ist der Wert davon, sich schwierige Inhalte aktiv anzusehen?');
  }

  // 8) Eigene Posts
  if (ownPosts >= 5) {
    out.push(`Du hast ${ownPosts} eigene Posts geschrieben. Was hat sich daran verändert, selbst etwas in den Feed zu geben — gegenüber nur lesen?`);
  } else if (ownPosts === 0) {
    out.push('Du hast nichts selbst gepostet — was hat dich davon abgehalten? Wäre das im echten Leben anders?');
  }

  // 9) Gilden
  if (guilds.includes('echte_werte')) {
    out.push('Du warst in „Echte Werte". Welche Mechanik in dieser Gilde war für dich am beunruhigendsten — und warum?');
  } else if (guilds.includes('lese_runde')) {
    out.push('Du warst in der Leserunde. Auch das ist eine Filterblase — nur eine angenehmere. Was unterscheidet eine gute von einer schlechten Filterblase?');
  }

  // 10) Protagonist-spezifisch
  if (protag === 'jamal') {
    out.push('Du hast Jamal gespielt — politisch unentschieden. Hat dich der Algorithmus in eine Richtung gezogen, die du dir vorher nicht vorgestellt hattest?');
  } else if (protag === 'ronja') {
    out.push('Du hast Ronja gespielt — aktivistisch von Anfang an. Hat dich der Algorithmus radikalisiert oder eher abgebaut?');
  }

  // Allgemeine Schluss-Fragen (mind. eine, max. zwei).
  out.push('Welche Push-Notification hat dich am ehesten zurückgeholt — und wie real ist das im echten Leben?');
  if (out.length < 7) {
    out.push('Wenn du das Spiel nochmal spielen könntest: welche eine Sache würdest du anders machen?');
  }

  return out.slice(0, 8);
}

// Workshop-Plan-Export: 3-Tage-Stundenplanung als druckbares HTML mit
// Phasen, Material und Reflexionsfragen pro Tag. Lehrkräfte bekommen ein
// fertiges Material in der Hand, statt aus dem README zu interpretieren.
function exportWorkshopPlan() {
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<title>3-Tage-Workshop · Der Algorithmus</title>
<style>
  body { font-family: -apple-system, "Segoe UI", sans-serif; max-width: 820px; margin: 2rem auto; padding: 1rem; color: #1f2230; line-height: 1.55; }
  h1 { color: #c026d3; border-bottom: 2px solid #eee; padding-bottom: .5rem; }
  h2 { color: #4338ca; margin-top: 2rem; padding-top: .5rem; }
  h3 { color: #6c2bd9; margin-top: 1.5rem; }
  .day { background: #fffbe6; border: 1px solid #f0c060; border-radius: 8px; padding: 14px 18px; margin: 1.5rem 0; }
  .day strong { color: #92520a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; display: block; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 14px; }
  th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
  th { background: #f4f5fa; font-weight: 600; }
  .phase-time { width: 80px; font-weight: 600; color: #4338ca; }
  ul { margin: 0.4rem 0 0.4rem 1.2rem; padding: 0; }
  ul li { margin: .3rem 0; }
  .foot { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; color: #777; font-size: 13px; }
  @media print { @page { margin: 1.5cm; } .day { page-break-inside: avoid; } table { page-break-inside: auto; } tr { page-break-inside: avoid; } }
</style></head>
<body>
  <h1>3-Tage-Workshop „Der Algorithmus"</h1>
  <p>Vorschlag für eine Projektwoche „Demokratiebildung" in der 12. Klasse. Frei zu kürzen, zu ergänzen, zu ignorieren. Die App heißt im Spiel <em>Streem</em>.</p>

  <div class="day"><strong>Vor dem Einsatz</strong>
    <ul>
      <li>App auf den iPads / Laptops installieren (oder per Link öffnen)</li>
      <li>Checkliste in der App: Start-Bildschirm → „Vor dem Klassen-Einsatz" (lokale Checks)</li>
      <li>Inhaltswarnungen vorab erklären (rechte/verschwörungsideologische Rhetorik, Antifeminismus, Hass — alles fiktiv, alles mit Warnhinweis)</li>
      <li>SuS einen JSON-Spielstand-Speicherort einrichten (USB-Stick, Cloud, gemeinsame Ordner) — für den Klassen-Vergleich am Ende</li>
    </ul>
  </div>

  <h2>Tag 1 · Onboarding und erste Wochen (W0 – W8)</h2>
  <p><strong>Fokus:</strong> Vertrautwerden mit dem Feed. SuS spielen ihren Account, schauen Stories, posten erstmals selbst. Algorithmus arbeitet noch unsichtbar.</p>
  <table>
    <tr><th class="phase-time">5 Min</th><td><strong>Einstieg im Plenum.</strong> Was wisst ihr über Social-Media-Algorithmen? Welche Plattformen nutzt ihr?</td></tr>
    <tr><th class="phase-time">10 Min</th><td><strong>App-Onboarding.</strong> Charakter wählen (Alex / Jamal / Ronja), Name, Avatar, Interessen, Bio. <em>App: Tutorial läuft beim ersten Reinkommen automatisch.</em></td></tr>
    <tr><th class="phase-time">5 Min</th><td><strong>Pre-Quiz.</strong> Fünf Selbstreflexions-Skalen. <em>App: erscheint nach Onboarding.</em></td></tr>
    <tr><th class="phase-time">50 Min</th><td><strong>Spielen W0 – W8.</strong> Stille Spielzeit, ca. 5 Min pro Woche. Lehrkraft beobachtet, beantwortet technische Fragen.</td></tr>
    <tr><th class="phase-time">10 Min</th><td><strong>Halbzeit-Reflexion W4.</strong> App stellt 3 offene Fragen. SuS antworten in der App.</td></tr>
    <tr><th class="phase-time">10 Min</th><td><strong>Pause.</strong></td></tr>
    <tr><th class="phase-time">25 Min</th><td><strong>Reflexion im Plenum.</strong> Was ist euch im Feed zuerst aufgefallen? Welche Accounts habt ihr schon geblockt oder gemutet, welche nicht? Hat euch der Feed überrascht?</td></tr>
  </table>

  <h2>Tag 2 · Komplexität und Verschärfung (W9 – W18)</h2>
  <p><strong>Fokus:</strong> Mechanik wird sichtbar. Anzeigen, Algorithmus-Panel, Bots, Gilden, Mini-Game, Shitstorm. Inhaltswarnungen greifen.</p>
  <table>
    <tr><th class="phase-time">10 Min</th><td><strong>Tagesfokus.</strong> Heute schaltet die App Anzeigen, das Algorithmus-Panel und Bots frei. Schaut mindestens einmal in „Blick hinter den Algorithmus" (🔍 oben rechts).<br/><em>App-Tipp: URL mit ?day=2 öffnen → Lehrkraft-Banner mit Schwerpunkten.</em></td></tr>
    <tr><th class="phase-time">50 Min</th><td><strong>Spielen W9 – W18.</strong> Inkl. Bot-Quiz in W12 (in der App). Marc-DM-Anwerbung in W11 (klar gekennzeichnet, Inhaltswarnung).</td></tr>
    <tr><th class="phase-time">10 Min</th><td><strong>Pause.</strong></td></tr>
    <tr><th class="phase-time">10 Min</th><td><strong>Zwischenreflexion W18.</strong> In der App.</td></tr>
    <tr><th class="phase-time">25 Min</th><td><strong>Reflexion im Plenum.</strong> Habt ihr Posts gesehen, die ihr lieber nicht gesehen hättet? Welche Gilden habt ihr betreten, welche nicht — warum? Der Algorithmus zeigt, was er über euch „weiß". Überrascht euch das? Wer hat Marc geblockt / ignoriert / angenommen?</td></tr>
  </table>

  <h2>Tag 3 · Analyse und Gestaltung (W19 – W26)</h2>
  <p><strong>Fokus:</strong> Wahlkampf, Wahltag, Jahresrückblick (Wrapped), eigener Algorithmus (Sandbox), Medien-Manifest.</p>
  <table>
    <tr><th class="phase-time">10 Min</th><td><strong>Tagesfokus.</strong> Wahlkampf + Wrapped + Sandbox + Manifest. App-Tipp: ?day=3 öffnen.</td></tr>
    <tr><th class="phase-time">40 Min</th><td><strong>Spielen W19 – W26.</strong> Inkl. Wahlomat-Quiz (im Wahl-Modal), Wahltag W22.</td></tr>
    <tr><th class="phase-time">15 Min</th><td><strong>Wrapped durchklicken.</strong> Pre/Post-Quiz, NPC-Reflexionen, „Hätte ich anders entschieden?", Beat-Map, Quellen-Anhang pro Ending.</td></tr>
    <tr><th class="phase-time">10 Min</th><td><strong>Pause.</strong></td></tr>
    <tr><th class="phase-time">20 Min</th><td><strong>Sandbox.</strong> Eigene Slider-Setups, Presets vergleichen, Algorithm-Battle. Optional: „Als Pseudo-Code zeigen" — der Algorithmus als gewichtete Summe.</td></tr>
    <tr><th class="phase-time">15 Min</th><td><strong>Medien-Manifest schreiben.</strong> Fünf Leitsätze pro Person. Export als HTML.</td></tr>
    <tr><th class="phase-time">15 Min</th><td><strong>Klassen-Vergleich.</strong> Alle JSON-Spielstände einsammeln, Lehrkraft startet Settings → „Klassen-Vergleich" → alle Saves hochladen. Übersicht im Plenum diskutieren: Entscheidungs-Diffs, Protagonist-Vergleich, geteilte Lesezeichen, Selbsteinschätzung der Klasse vorher/nachher.</td></tr>
    <tr><th class="phase-time">15 Min</th><td><strong>Schluss-Reflexion.</strong> Was hat der Jahresrückblick gezeigt, das euch überrascht hat? Welche Regeln habt ihr in der Sandbox gewählt — und warum? Was nehmt ihr für euer echtes Social-Media-Leben mit?</td></tr>
  </table>

  <h2>Material in der App</h2>
  <ul>
    <li><strong>Tutorial</strong>: erscheint automatisch beim ersten Reinkommen. „Settings → Tutorial nochmal abspielen" wenn gewünscht.</li>
    <li><strong>Konzept-Karten</strong>: erscheinen passend zu Unlocks (Algorithmus, Anzeigen, Bots, Dark Patterns, Empfehlungssysteme).</li>
    <li><strong>Glossar</strong>: 19 Begriffe. „Settings → Glossar".</li>
    <li><strong>Mini-Games</strong>: Bot oder Mensch (W12, später jederzeit), Faktencheck-Sprint, Schlagzeile-zu-Studie. Alle in „Settings".</li>
    <li><strong>Lehr-Bericht / CSV</strong>: pro Spielstand komplette Übersicht inkl. Diskussionsfragen, Lesezeichen, Mikro-Reflexionen, Wahlomat, Glossar.</li>
    <li><strong>Klassen-Vergleich</strong>: anonymisierte Übersicht über alle hochgeladenen Saves.</li>
  </ul>

  <h2>Anlaufstellen für die Klasse</h2>
  <ul>
    <li>bpb.de — Bundeszentrale für politische Bildung</li>
    <li>klicksafe.de — Material für Medienkompetenz</li>
    <li>hateaid.org — Hilfe bei digitaler Gewalt</li>
    <li>beratung-gegen-rechtsextremismus.de</li>
    <li>Telefonseelsorge 0800 111 0 111 (24/7, kostenlos)</li>
  </ul>

  <div class="foot">
    Erstellt aus „Der Algorithmus". Frei zur Anpassung an euren Stundenplan.
  </div>
</body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  downloadBlob(blob, 'streem-workshop-3-tage.html');
  toast('Stundenplan exportiert.', { long: true });
}

// CSV-Export: kompakte Tabelle mit den Feldern, die Lehrkräfte in Excel
// oder Google Sheets analysieren wollen.
function exportCsv() {
  const d = Store.data;
  if (!d || !d.character) { alert('Noch kein Spielstand.'); return; }
  const c = d.character;
  const p = d.userProfile || {};
  const actions = (d.history || []).flatMap(h => h.actions || []);
  const likes = actions.filter(a => a.type === 'like').length;
  const comments = actions.filter(a => a.type === 'comment').length;
  const angry = actions.filter(a => a.type === 'angry_comment').length;
  const shares = actions.filter(a => a.type === 'share').length;
  const mutes = actions.filter(a => a.type === 'mute').length;
  const tws = d.contentWarningsAccepted || {};
  const twSkip = Object.values(tws).reduce((a, b) => a + (b.skipped || 0), 0);
  const twShown = Object.values(tws).reduce((a, b) => a + (b.shown || 0), 0);
  const dm = d.dmReplies || {};
  const arcs = d.npcArcs || {};
  const guilds = d.guildMemberships || [];
  const interestTop = Object.entries(p.interests || {}).sort((a, b) => b[1] - a[1])[0] || ['', 0];
  const rows = [
    ['Feld', 'Wert'],
    ['Name', c.name],
    ['Protagonist:in', c.protagonist || 'alex'],
    ['Pronomen', c.pronoun || ''],
    ['Bio', c.bio || ''],
    ['Wochen gespielt', d.currentWeek],
    ['Lean', (p.political_lean_estimated ?? 0).toFixed(3)],
    ['Top-Interesse', interestTop[0]],
    ['Top-Interesse Wert', (interestTop[1] || 0).toFixed(3)],
    ['Likes', likes],
    ['Kommentare', comments],
    ['Wütende Kommentare', angry],
    ['Geteilt', shares],
    ['Stummgeschaltet', mutes],
    ['Folgt', (p.followed || []).length],
    ['Eigene Posts', (d.ownPosts || []).length],
    ['Lesezeichen', Object.keys(d.bookmarks || {}).length],
    ['TW angesehen', twShown],
    ['TW übersprungen', twSkip],
    ['Gilden', guilds.join('; ')],
    ['In Rabbit Hole', guilds.includes('echte_werte') ? 'ja' : 'nein'],
    ['Wahl', d.electionVote || ''],
    ['Wahlomat klima', d.wahlomat?.answers?.s_klima || ''],
    ['Wahlomat wohnen', d.wahlomat?.answers?.s_wohnen || ''],
    ['Wahlomat polizei', d.wahlomat?.answers?.s_polizei || ''],
    ['Wahlomat haushalt', d.wahlomat?.answers?.s_haushalt || ''],
    ['Wahlomat migration', d.wahlomat?.answers?.s_migration || ''],
    ['Wahlomat buergerrat', d.wahlomat?.answers?.s_buergerrat || ''],
    ['Wahlomat stadtfest', d.wahlomat?.answers?.s_stadtfest || ''],
    ['Wahlomat schulen', d.wahlomat?.answers?.s_schulen || ''],
    ['Ending', d.ending || ''],
    ['Marc-DM', dm.dm_marc?.[11]?.id || ''],
    ['Finn-W8', dm.dm_finn?.[8]?.id || ''],
    ['Finn-W17', dm.dm_finn?.[17]?.id || ''],
    ['Lara-W24', dm.dm_lara?.[24]?.id || ''],
    ['Mira-W15', dm.dm_mira?.[15]?.id || ''],
    ['Lea-W14', dm.dm_lea?.[14]?.id || ''],
    ['Lea-Nähe', (arcs.lea_close || 0).toFixed(2)],
    ['Finn-Pfad', (arcs.finn_path || 0).toFixed(2)],
    ['Mira-Nähe', (arcs.mira_close || 0).toFixed(2)],
    ['Self-Aware', arcs.self_aware || 0],
    ['Bot-Quiz', d.minigameResults?.bot_or_human ? `${d.minigameResults.bot_or_human.score}/${d.minigameResults.bot_or_human.total}` : ''],
    ['Selfcheck-Pre', d.selfcheck?.pre?.answers ? Object.values(d.selfcheck.pre.answers).join('-') : (d.selfcheck?.pre?.skipped ? 'skipped' : '')],
    ['Selfcheck-Post', d.selfcheck?.post?.answers ? Object.values(d.selfcheck.post.answers).join('-') : (d.selfcheck?.post?.skipped ? 'skipped' : '')]
  ];
  function escCsv(v) {
    const s = String(v ?? '');
    if (/[",\n;]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  // BOM, damit Excel UTF-8 sauber erkennt.
  const csv = '﻿' + rows.map(r => r.map(escCsv).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `streem-stats-${(c.name||'spieler').toLowerCase().replace(/[^a-z0-9]/g,'_')}.csv`);
  toast('CSV exportiert.', { long: true });
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

// feed.js — Feed-Rendering und Interaktionen.

import { Store } from './state.js';
import { buildFeed, explainPost, scorePost } from './algorithm.js';
import { getCharacter, avatarSvg, memeSvg } from './characters.js';
import { askWarning } from './warnings.js';
import { SFX } from './sound.js';
import { getRepliesForInbox, getRepliesForOwnPost } from './postreplies.js';

let POSTS = [];
let ADS = [];
let WEEKS = [];
let STORIES = [];
let onWeekEnd = null;      // Callback wenn Woche zuende
let onOpenCompose = null;
let onOpenStory = null;
let currentFeed = [];      // Für Woche sichtbarer Feed

export function initFeed(data) {
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

export function setCallbacks({ onWeekEnd: wEnd, onOpenCompose: oc, onOpenStory: os }) {
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
export function computeCurrentFeed(force = false) {
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
export async function renderFeed(view = 'feed') {
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

export function toast(msg, opts = {}) {
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

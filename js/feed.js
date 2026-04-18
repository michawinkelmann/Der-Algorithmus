// feed.js — Feed-Rendering und Interaktionen.

import { Store } from './state.js';
import { buildFeed, explainPost } from './algorithm.js';
import { getCharacter, avatarSvg, memeSvg } from './characters.js';
import { askWarning } from './warnings.js';

let POSTS = [];
let ADS = [];
let WEEKS = [];
let onWeekEnd = null;      // Callback wenn Woche zuende
let onOpenCompose = null;
let currentFeed = [];      // Für Woche sichtbarer Feed

export function initFeed(data) {
  POSTS = data.posts;
  ADS = data.ads;
  WEEKS = data.weeks;
}

export function setCallbacks({ onWeekEnd: wEnd, onOpenCompose: oc }) {
  onWeekEnd = wEnd;
  onOpenCompose = oc;
}

/**
 * Baut den Feed für die aktuelle Woche.
 */
export function computeCurrentFeed() {
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
export async function renderFeed(view = 'feed') {
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

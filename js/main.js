// main.js — Einstieg, Routing, Orchestrierung aller Module.

import { Store } from './state.js';
import { initFeed, renderFeed, setCallbacks as setFeedCallbacks, computeCurrentFeed, toast } from './feed.js';
import { initEvents, triggerWeekEvents, getGuildList, getGuildById, getParties, applyGuildReaction, checkBadges, getHateIncidentData } from './events.js';
import { setCharacters, avatarSvg, getCharacter } from './characters.js';
import { setPostsLookup, renderWrapped } from './wrapped.js';
import { initSandbox, renderSandbox } from './sandbox.js';
import { explainPost } from './algorithm.js';

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

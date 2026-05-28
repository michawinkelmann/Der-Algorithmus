// main.js — Einstieg, Routing, Orchestrierung aller Module.

import { Store } from './state.js';
import { initFeed, renderFeed, setCallbacks as setFeedCallbacks, computeCurrentFeed, toast } from './feed.js';
import { initEvents, triggerWeekEvents, getGuildList, getGuildById, getParties, applyGuildReaction, checkBadges, getHateIncidentData } from './events.js';
import { setCharacters, avatarSvg, getCharacter, setDynamicHook } from './characters.js';
import { setPostsLookup, renderWrapped } from './wrapped.js';
import { initSandbox, renderSandbox } from './sandbox.js';
import { explainPost } from './algorithm.js';
import { initDms, renderDmList, renderDmThread, unreadCount as dmUnread } from './dms.js';
import { initPlaces, renderMap } from './places.js';
import { runMinigame } from './minigame.js';
import { renderClassCompare } from './classcompare.js';
import { SFX, setSoundEnabled, setSoundVolume } from './sound.js';
import { maybeQueueMicroReflection } from './microreflect.js';
import { generateRepliesForJustEndedWeek } from './postreplies.js';
import { maybeShowPush } from './push.js';
import { maybeRunTutorial, forceRunTutorial } from './tutorial.js';
import { showConcept } from './concepts.js';
import { attachModal } from './modals.js';
import { openGlossary } from './glossary.js';

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

  // Bot-Minigame jederzeit wiederholbar
  const mgBtn = document.getElementById('btn-minigame');
  if (mgBtn) mgBtn.onclick = () => { showScreen('screen-main'); openBotMinigame(); };

  // Glossar
  const gloBtn = document.getElementById('btn-glossary');
  if (gloBtn) gloBtn.onclick = () => { showScreen('screen-main'); openGlossary(); };

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
  const handle = attachModal(overlay);
  runMinigame(box, () => handle.close());
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
  ol.disc li { margin: .8rem 0; font-size: 14px; }
  .teacher-aside { background: #fffbe6; border: 1px solid #f0c060; border-radius: 8px; padding: 14px; margin: 1.5rem 0; }
  .teacher-aside strong { display: block; color: #92520a; margin-bottom: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
  .teacher-aside ol { margin: .5rem 0 .8rem 1.2rem; padding: 0; }
  .teacher-aside ol li { margin: .3rem 0; font-size: 14px; }
  @media print { .teacher-aside { page-break-inside: avoid; } }
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

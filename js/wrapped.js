// wrapped.js — Jahresrückblick im "Wrapped"-Stil.

import { Store } from './state.js';

let POSTS_LOOKUP = null;

export function setPostsLookup(posts) {
  POSTS_LOOKUP = new Map(posts.map(p => [p.id, p]));
}

/**
 * Analysiert die gespielte Historie und erzeugt Slides.
 */
export function buildWrapped() {
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
export function renderWrapped(onSandbox, onManifest) {
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

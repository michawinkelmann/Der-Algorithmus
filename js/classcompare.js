// classcompare.js — Mehrere Streem-Saves laden und anonymisiert vergleichen.
// Für den Klassen-Reflexionsteil am Ende der Projektwoche.

export function renderClassCompare(root, onClose) {
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
    interests: p.interests || {},
    decisions: extractDecisions(s),
    bookmarks: Object.values(s.bookmarks || {})
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

// Auto-generated bundle. Regenerate with: python tools/make_bundle.py
(function(){
var __M = window.__M = window.__M || {};

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

window.__lazyLoaded = true;

})();

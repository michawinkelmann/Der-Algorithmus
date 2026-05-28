// glossary.js — Schnellnachschlage für zentrale Begriffe.
// Im Settings erreichbar. Bewusst kurz: 3-4 Sätze pro Begriff,
// kein Wikipedia-Ersatz.

import { attachModal } from './modals.js';

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
  }
];

export function openGlossary() {
  const overlay = document.createElement('div');
  overlay.className = 'tw-overlay';
  overlay.innerHTML = `
    <div class="tw-box glossary-box">
      <header class="glossary-head">
        <h3>Glossar</h3>
        <button class="btn btn-ghost btn-small" id="glossary-close">Schließen</button>
      </header>
      <p class="muted small">Kurze Definitionen der Begriffe, die in Streem vorkommen. Klicke einen Eintrag, um ihn aufzuklappen.</p>
      <ul class="glossary-list">
        ${TERMS.map((t, i) => `
          <li>
            <button class="glossary-term" data-i="${i}" aria-expanded="false">
              <strong>${escapeHtml(t.term)}</strong>
              <span class="glossary-chev" aria-hidden="true">+</span>
            </button>
            <div class="glossary-text" hidden>${escapeHtml(t.text)}</div>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
  document.body.appendChild(overlay);
  const handle = attachModal(overlay);
  overlay.querySelector('#glossary-close').onclick = () => handle.close();
  overlay.querySelectorAll('.glossary-term').forEach(b => {
    b.onclick = () => {
      const i = parseInt(b.dataset.i, 10);
      const txt = overlay.querySelectorAll('.glossary-text')[i];
      const open = txt.hidden;
      txt.hidden = !open;
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      b.querySelector('.glossary-chev').textContent = open ? '−' : '+';
    };
  });
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

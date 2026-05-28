// concepts.js — Kurze Konzept-Karten, die vor didaktischen Wendepunkten
// angezeigt werden. Bewusst sehr knapp gehalten — eine Karte ≤ 60 Sekunden Lesezeit.

import { Store } from './state.js';
import { attachModal } from './modals.js';

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

export function queueConcept(key) {
  if (!CONCEPTS[key]) return;
  if (Store.data.conceptsSeen?.[key]) return;
  queued = key;
}

export function maybeShowQueuedConcept() {
  if (!queued) return false;
  const key = queued;
  queued = null;
  showConcept(key);
  return true;
}

export function showConcept(key) {
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
  const handle = attachModal(overlay);
  overlay.querySelector('#concept-close').onclick = () => handle.close();
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

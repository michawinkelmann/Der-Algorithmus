// tutorial.js — Erst-Erklärungs-Tooltips beim allerersten Feed-Render.

import { Store } from './state.js';

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

export function maybeRunTutorial() {
  if (Store.data.tutorialDone) return;
  // Wenn die Wochen schon vorangeschritten sind: Tutorial trotzdem nachholen,
  // aber nur, wenn der User es explizit angefordert hat (Replay).
  setTimeout(() => runTutorial(0), 800);
}

// Expliziter Replay vom Settings-Menü — bypassed alle Bedingungen.
export function forceRunTutorial() {
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

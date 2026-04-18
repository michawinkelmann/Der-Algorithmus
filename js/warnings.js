// warnings.js — Inhaltswarnungs-System.
// Zeigt Overlay vor Posts mit trigger_warning, trackt Accept/Skip.

import { Store } from './state.js';

const TW_TEXTS = {
  'rechtsextremismus': 'Inhalte mit rechtsextremer/verschwörungsideologischer Rhetorik',
  'hass': 'Hate Speech gegen eine Gruppe (als fiktives Zitat)',
  'anti-feminismus': 'antifeministische / Incel-nahe Rhetorik',
  'verschwoerung': 'Verschwörungsnarrative (z.B. „geheime Eliten")',
  'gewalt-rhetorik': 'gewaltverherrlichende Sprache (keine Darstellung)',
  'querfront': 'Querfront-Rhetorik (politische Vermengung)',
  'radikal-gaming': 'Radikalisierung aus Gaming-Communities'
};

export function describeTW(key) {
  return TW_TEXTS[key] || 'belastende Inhalte';
}

/**
 * Zeigt Warnhinweis-Overlay und liefert ein Promise mit {show: true|false}.
 */
export function askWarning(twKey) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('tw-overlay');
    const txt = document.getElementById('tw-text');
    const skip = document.getElementById('tw-skip');
    const show = document.getElementById('tw-show');

    txt.textContent = `Im folgenden Beitrag werden Inhalte gezeigt: ${describeTW(twKey)}.`;
    overlay.hidden = false;

    const cleanup = () => {
      overlay.hidden = true;
      skip.onclick = null;
      show.onclick = null;
    };

    skip.onclick = () => {
      Store.data.contentWarningsAccepted[twKey] =
        (Store.data.contentWarningsAccepted[twKey] || { shown: 0, skipped: 0 });
      Store.data.contentWarningsAccepted[twKey].skipped++;
      Store.save();
      cleanup();
      resolve({ show: false });
    };
    show.onclick = () => {
      Store.data.contentWarningsAccepted[twKey] =
        (Store.data.contentWarningsAccepted[twKey] || { shown: 0, skipped: 0 });
      Store.data.contentWarningsAccepted[twKey].shown++;
      Store.save();
      cleanup();
      resolve({ show: true });
    };
  });
}

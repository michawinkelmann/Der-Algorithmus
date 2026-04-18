// sandbox.js — Editor für den eigenen Algorithmus.
// GUI-Slider → Weights → Live-Vorschau + 10-Wochen-Simulation.

import { Store } from './state.js';
import { buildFeed } from './algorithm.js';
import { getCharacter } from './characters.js';

let POSTS = [];
let ADS = [];

const SLIDER_DEFS = [
  { key: 'affinity',        label: 'Interessen-Affinität',    min: 0, max: 2, step: 0.05,
    desc: 'Wie stark passt der Feed zu dem, was du bisher gemocht hast?' },
  { key: 'engagement',      label: 'Engagement-Boost',         min: 0, max: 2, step: 0.05,
    desc: 'Belohnt Posts, die viele Likes/Kommentare/Empörung erzeugen.' },
  { key: 'recency',         label: 'Aktualität',               min: 0, max: 2, step: 0.05,
    desc: 'Wie sehr zählt, dass ein Post frisch ist?' },
  { key: 'social',          label: 'Soziales Gewicht',         min: 0, max: 2, step: 0.05,
    desc: 'Wie stark zählen Accounts, denen du folgst?' },
  { key: 'ads',             label: 'Anzeigen',                  min: 0, max: 2, step: 0.05,
    desc: 'Wie prominent werden Anzeigen einsortiert?' },
  { key: 'diversity',       label: 'Vielfalt-Strafe',          min: 0, max: 1.5, step: 0.05,
    desc: 'Hoch = weniger gleiche Inhalte hintereinander.' },
  { key: 'quality',         label: 'Qualitäts-Bonus',          min: 0, max: 2, step: 0.05,
    desc: 'Belohnt Posts mit journalistischer Qualität.' },
  { key: 'outragePenalty',  label: 'Empörungs-Strafe',         min: 0, max: 2, step: 0.05,
    desc: 'Bestraft empörungslastige Posts.' },
  { key: 'balance',         label: 'Gegen-Perspektive',        min: 0, max: 2, step: 0.05,
    desc: 'Bonus für Posts, die deiner politischen Richtung entgegenstehen.' }
];

export function initSandbox(posts, ads) {
  POSTS = posts;
  ADS = ads;
}

export function renderSandbox(onClose) {
  const d = Store.data;
  const current = d.sandboxRules || { ...d.weights };
  // Slider-Liste
  const sliders = document.getElementById('sandbox-sliders');
  sliders.innerHTML = '<h3>Deine Regeln</h3>';
  for (const def of SLIDER_DEFS) {
    const row = document.createElement('div');
    row.className = 'slider-row';
    row.innerHTML = `
      <div class="slider-top">
        <label>${def.label}</label><b data-key="${def.key}">${Number(current[def.key] ?? 0).toFixed(2)}</b>
      </div>
      <input type="range" min="${def.min}" max="${def.max}" step="${def.step}"
             value="${current[def.key] ?? 0}" data-slider="${def.key}" aria-label="${def.label}" />
      <div class="slider-desc">${def.desc}</div>
    `;
    sliders.appendChild(row);
  }

  const presetRow = document.createElement('div');
  presetRow.style.display = 'flex';
  presetRow.style.gap = '6px';
  presetRow.style.flexWrap = 'wrap';
  presetRow.style.marginTop = '10px';
  presetRow.innerHTML = `
    <button class="btn btn-ghost" data-preset="current">Wie bisher</button>
    <button class="btn btn-ghost" data-preset="quality">Qualität</button>
    <button class="btn btn-ghost" data-preset="chrono">Chronologisch</button>
    <button class="btn btn-ghost" data-preset="balance">Ausgleich</button>
  `;
  sliders.appendChild(presetRow);

  const rules = { ...current };
  sliders.querySelectorAll('[data-slider]').forEach(el => {
    el.oninput = () => {
      rules[el.dataset.slider] = parseFloat(el.value);
      sliders.querySelector(`[data-key="${el.dataset.slider}"]`).textContent = rules[el.dataset.slider].toFixed(2);
      Store.data.sandboxRules = { ...rules };
      Store.save();
      previewFeed(rules);
    };
  });
  presetRow.querySelectorAll('[data-preset]').forEach(b => {
    b.onclick = () => applyPreset(b.dataset.preset, rules, sliders);
  });

  previewFeed(rules);

  document.getElementById('btn-sim').onclick = () => simulate(rules);
  document.getElementById('btn-sandbox-close').onclick = () => onClose && onClose();
}

function applyPreset(name, rules, container) {
  const presets = {
    current: { ...Store.data.weights },
    quality: { affinity: 0.3, engagement: 0.2, recency: 0.5, social: 0.3, ads: 0.2, diversity: 0.7, quality: 1.5, outragePenalty: 1.0, balance: 0.5 },
    chrono:  { affinity: 0.0, engagement: 0.0, recency: 1.8, social: 1.0, ads: 0.2, diversity: 0.0, quality: 0.2, outragePenalty: 0.0, balance: 0.0 },
    balance: { affinity: 0.3, engagement: 0.2, recency: 0.5, social: 0.5, ads: 0.2, diversity: 0.8, quality: 0.8, outragePenalty: 0.8, balance: 1.5 }
  };
  const p = presets[name];
  if (!p) return;
  for (const k of Object.keys(p)) {
    rules[k] = p[k];
    const slider = container.querySelector(`[data-slider="${k}"]`);
    const lbl = container.querySelector(`[data-key="${k}"]`);
    if (slider) slider.value = p[k];
    if (lbl) lbl.textContent = p[k].toFixed(2);
  }
  Store.data.sandboxRules = { ...rules };
  Store.save();
  previewFeed(rules);
}

function previewFeed(rules) {
  const feed = buildFeed(
    POSTS,
    ADS,
    Store.data.userProfile,
    rules,
    { limit: 6, unlocked: ['ads'], muted: Store.data.userProfile.muted }
  );
  const root = document.getElementById('sandbox-feed');
  root.innerHTML = '';
  for (const p of feed) {
    const c = getCharacter(p.author);
    const card = document.createElement('div');
    card.className = 'post-card';
    card.innerHTML = `
      <div class="post-head">
        <div class="name-block">
          <div class="name">${escapeHtml(c?.name || p.author)}</div>
          <div class="meta">${escapeHtml(c?.handle || '')}</div>
        </div>
      </div>
      <div class="post-body">${escapeHtml(truncate(p.text, 140))}</div>
    `;
    root.appendChild(card);
  }
}

function simulate(rules) {
  // Einfache Simulation: 10 Wochen-Iterationen, in jeder Woche Feed bauen, Top-3 „liken", Profil updaten.
  const simProfile = structuredClone(Store.data.userProfile);
  const statsBefore = scoreProfile(Store.data.userProfile);
  for (let i = 0; i < 10; i++) {
    const feed = buildFeed(POSTS, ADS, simProfile, rules, { limit: 10, unlocked: ['ads'], muted: [] });
    for (let j = 0; j < Math.min(3, feed.length); j++) {
      const p = feed[j];
      for (const t of p.tags || []) {
        simProfile.interests[t] = Math.min(1, (simProfile.interests[t] || 0) + 0.05);
      }
      if (p.political_lean !== undefined) {
        simProfile.political_lean_estimated = clamp(
          simProfile.political_lean_estimated + p.political_lean * 0.03, -1, 1
        );
      }
    }
  }
  const statsAfter = scoreProfile(simProfile);

  const result = document.getElementById('sim-result');
  result.classList.add('visible');
  result.innerHTML = `
    <h4>Nach 10 Wochen mit deinen Regeln:</h4>
    <div class="wrapped-bars">
      ${renderProfileRow('Wissenschaft', statsBefore.wissenschaft, statsAfter.wissenschaft)}
      ${renderProfileRow('Politik-rechts', statsBefore.politikRechts, statsAfter.politikRechts)}
      ${renderProfileRow('Politik-links', statsBefore.politikLinks, statsAfter.politikLinks)}
      ${renderProfileRow('Verschwörung', statsBefore.verschwoerung, statsAfter.verschwoerung)}
      ${renderProfileRow('Vielfalt', statsBefore.diversity, statsAfter.diversity)}
    </div>
    <p class="muted small">Politische Neigung: ${statsBefore.lean.toFixed(2)} → <strong>${statsAfter.lean.toFixed(2)}</strong>.</p>
    <p class="muted small">Vergleich mit dem Original-Algorithmus: Schiebe die Slider → sieh, wie sich alles ändert.</p>
  `;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function scoreProfile(p) {
  const diversity = 1 - stddev(Object.values(p.interests));
  return {
    wissenschaft: p.interests.wissenschaft || 0,
    politikRechts: p.interests['politik-rechts'] || 0,
    politikLinks: p.interests['politik-links'] || 0,
    verschwoerung: p.interests.verschwoerung || 0,
    diversity: clamp(diversity, 0, 1),
    lean: p.political_lean_estimated
  };
}
function stddev(arr) {
  const m = arr.reduce((a, b) => a + b, 0) / arr.length;
  const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length;
  return Math.sqrt(v);
}

function renderProfileRow(label, before, after) {
  const delta = after - before;
  const arrow = delta > 0.02 ? '↑' : delta < -0.02 ? '↓' : '→';
  return `
    <div class="row">
      <span class="lbl">${label}</span>
      <div class="bar"><div class="fill" style="width:${Math.round(after*100)}%"></div></div>
      <span>${Math.round(after*100)}% ${arrow}</span>
    </div>
  `;
}

function truncate(s, n) {
  if (!s) return '';
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

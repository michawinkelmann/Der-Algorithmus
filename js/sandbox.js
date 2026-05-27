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
  presetRow.className = 'sandbox-presets';
  presetRow.innerHTML = `
    <button class="btn btn-ghost" data-preset="current">Wie bisher</button>
    <button class="btn btn-ghost" data-preset="quality">Qualität</button>
    <button class="btn btn-ghost" data-preset="chrono">Chronologisch</button>
    <button class="btn btn-ghost" data-preset="balance">Ausgleich</button>
    <button class="btn btn-ghost preset-challenge" data-preset="empoerung">Empörungs-Booster ⚠</button>
    <button class="btn btn-ghost preset-challenge" data-preset="calm">Ruhe-Modus 🧘</button>
  `;
  sliders.appendChild(presetRow);
  const desc = document.createElement('p');
  desc.className = 'muted small sandbox-preset-desc';
  desc.textContent = 'Probier die Challenge-Presets: „Empörungs-Booster" zeigt, was eine reine Outrage-Maschine produziert. „Ruhe-Modus" ist das Gegenteil — wie würde dein Feed aussehen, wenn du gar nicht mehr gehookt werden sollst?';
  sliders.appendChild(desc);

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
  // Reset-Toggle: simulieren wir auf dem Start-Profil oder dem aktuellen Profil?
  const simModeRow = document.querySelector('#sandbox-sim-mode');
  if (simModeRow) {
    simModeRow.querySelectorAll('input[name=sim-mode]').forEach(r => {
      r.onchange = () => previewFeed(rules);
    });
  }
}

function applyPreset(name, rules, container) {
  const presets = {
    current: { ...Store.data.weights },
    quality:    { affinity: 0.3, engagement: 0.2, recency: 0.5, social: 0.3, ads: 0.2, diversity: 0.7, quality: 1.5, outragePenalty: 1.0, balance: 0.5 },
    chrono:     { affinity: 0.0, engagement: 0.0, recency: 1.8, social: 1.0, ads: 0.2, diversity: 0.0, quality: 0.2, outragePenalty: 0.0, balance: 0.0 },
    balance:    { affinity: 0.3, engagement: 0.2, recency: 0.5, social: 0.5, ads: 0.2, diversity: 0.8, quality: 0.8, outragePenalty: 0.8, balance: 1.5 },
    empoerung:  { affinity: 0.4, engagement: 2.0, recency: 0.3, social: 0.4, ads: 0.6, diversity: 0.0, quality: 0.0, outragePenalty: 0.0, balance: 0.0 },
    calm:       { affinity: 0.6, engagement: 0.1, recency: 0.4, social: 0.7, ads: 0.1, diversity: 1.0, quality: 1.2, outragePenalty: 1.8, balance: 0.8 }
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
  // Welches Profil als Ausgangspunkt? "current" = aktuelles Spielprofil, "fresh" = Start-Profil.
  const mode = document.querySelector('input[name=sim-mode]:checked')?.value || 'current';
  const baseSource = (mode === 'fresh' && Store.data.initialProfileSnapshot)
    ? Store.data.initialProfileSnapshot
    : Store.data.userProfile;
  const baseProfile = structuredClone(baseSource);
  const statsBefore = scoreProfile(baseProfile);

  // Parallel-Simulation: Original-Gewichte vs. eigene Regeln, damit der Vergleich sichtbar wird.
  const baselineWeights = Store.data.weights;
  const simOwn = structuredClone(baseProfile);
  const simOrig = structuredClone(baseProfile);
  for (let i = 0; i < 10; i++) {
    advanceSimWeek(simOwn, rules);
    advanceSimWeek(simOrig, baselineWeights);
  }
  const statsOwn = scoreProfile(simOwn);
  const statsOrig = scoreProfile(simOrig);

  const result = document.getElementById('sim-result');
  result.classList.add('visible');
  result.innerHTML = `
    <h4>Nach 10 simulierten Wochen — links Original-Algorithmus, rechts deine Regeln:</h4>
    <div class="sim-compare">
      ${renderCompareRow('Wissenschaft', statsBefore.wissenschaft, statsOrig.wissenschaft, statsOwn.wissenschaft)}
      ${renderCompareRow('Politik (rechts)', statsBefore.politikRechts, statsOrig.politikRechts, statsOwn.politikRechts)}
      ${renderCompareRow('Politik (links)', statsBefore.politikLinks, statsOrig.politikLinks, statsOwn.politikLinks)}
      ${renderCompareRow('Verschwörung', statsBefore.verschwoerung, statsOrig.verschwoerung, statsOwn.verschwoerung)}
      ${renderCompareRow('Vielfalt', statsBefore.diversity, statsOrig.diversity, statsOwn.diversity)}
    </div>
    <p class="muted small">Politische Neigung: Start ${statsBefore.lean.toFixed(2)} · Original ${statsOrig.lean.toFixed(2)} · deine Regeln <strong>${statsOwn.lean.toFixed(2)}</strong></p>
    <p class="muted small">Ausgangsbasis: ${mode === 'fresh' ? 'Start-Profil (vor dem Spiel)' : 'aktuelles Profil (nach den gespielten Wochen)'}.</p>
  `;
}

function advanceSimWeek(profile, weights) {
  const feed = buildFeed(POSTS, ADS, profile, weights, { limit: 10, unlocked: ['ads'], muted: [] });
  for (let j = 0; j < Math.min(3, feed.length); j++) {
    const p = feed[j];
    for (const t of p.tags || []) {
      profile.interests[t] = Math.min(1, (profile.interests[t] || 0) + 0.05);
    }
    if (p.political_lean !== undefined) {
      profile.political_lean_estimated = clamp(
        profile.political_lean_estimated + p.political_lean * 0.03, -1, 1
      );
    }
  }
}

function renderCompareRow(label, start, orig, own) {
  return `
    <div class="sim-row">
      <span class="lbl">${label}</span>
      <div class="sim-bars">
        <div class="sim-bar"><span class="sim-bar-label">Start</span><div class="bar small"><div class="fill base" style="width:${Math.round(start*100)}%"></div></div><span>${Math.round(start*100)}%</span></div>
        <div class="sim-bar"><span class="sim-bar-label">Original</span><div class="bar small"><div class="fill orig" style="width:${Math.round(orig*100)}%"></div></div><span>${Math.round(orig*100)}%</span></div>
        <div class="sim-bar"><span class="sim-bar-label">Du</span><div class="bar small"><div class="fill own" style="width:${Math.round(own*100)}%"></div></div><span>${Math.round(own*100)}%</span></div>
      </div>
    </div>`;
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

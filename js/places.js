// places.js — Greifshafen-Karte als entdeckbares Modal.

import { Store } from './state.js';
import { getCharacter, avatarSvg } from './characters.js';

let PLACES = [];

export function initPlaces(data) {
  PLACES = data.places || [];
}

export function getPlaces() { return PLACES; }

export function renderMap(root, onClose) {
  root.innerHTML = `
    <header class="map-head">
      <h2>Greifshafen</h2>
      <button class="btn btn-ghost" id="map-close">Schließen</button>
    </header>
    <p class="muted small">Die Stadt deines Accounts. Wer ist wo unterwegs?</p>
    <div class="map-grid" id="map-grid"></div>
    <div id="place-detail" class="place-detail" hidden></div>
  `;
  root.querySelector('#map-close').onclick = onClose;
  const grid = root.querySelector('#map-grid');
  for (const p of PLACES) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'map-tile';
    const visited = !!Store.data.placesVisited?.[p.id];
    if (visited) tile.classList.add('visited');
    tile.innerHTML = `<div class="map-emoji">${p.emoji}</div><div class="map-name">${escapeHtml(p.name)}</div>`;
    tile.onclick = () => {
      if (!Store.data.placesVisited) Store.data.placesVisited = {};
      Store.data.placesVisited[p.id] = (Store.data.placesVisited[p.id] || 0) + 1;
      Store.save();
      tile.classList.add('visited');
      showPlaceDetail(root, p);
    };
    grid.appendChild(tile);
  }
}

function showPlaceDetail(root, place) {
  const detail = root.querySelector('#place-detail');
  detail.hidden = false;
  const chars = (place.regulars || []).map(getCharacter).filter(Boolean);
  detail.innerHTML = `
    <div class="place-head"><span class="map-emoji">${place.emoji}</span><h3>${escapeHtml(place.name)}</h3></div>
    <p>${escapeHtml(place.desc)}</p>
    <div class="place-regulars">
      <div class="muted small">Stammgäste:</div>
      <div class="place-avatars">
        ${chars.map(c => `<div class="place-avatar"><div class="avatar">${avatarSvg(c.avatar || 0)}</div><div class="muted small">${escapeHtml(c.name)}</div></div>`).join('')}
      </div>
    </div>
  `;
  detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

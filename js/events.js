// events.js — Wöchentliche Events: Shitstorms, Gilden, Wahl, Hate-Incident.

import { Store, clamp } from './state.js';
import { toast } from './feed.js';

let EVENTS = [];
let GUILDS = [];
let PARTIES = [];
let SHITSTORM_OUT = {};
let HATE_INCIDENT = {};

export function initEvents(data) {
  EVENTS = data.events;
  GUILDS = data.guilds;
  PARTIES = data.parties;
  SHITSTORM_OUT = data.shitstorm_outcomes;
  HATE_INCIDENT = data.hate_incident;
}

export function getGuildList() { return GUILDS; }
export function getGuildById(id) { return GUILDS.find(g => g.id === id); }
export function getParties() { return PARTIES; }

/**
 * Events für aktuelle Woche auslösen.
 * @returns {Array<{event,result}>} Ergebnisse für Wochen-Karte
 */
export function triggerWeekEvents(weekNum) {
  const results = [];
  const weekEvents = EVENTS.filter(e => e.week === weekNum);
  for (const e of weekEvents) {
    const res = processEvent(e);
    if (res) results.push({ event: e, result: res });
  }
  return results;
}

function processEvent(ev) {
  if (ev.type === 'guild_invite') {
    // Einladung speichern
    if (!Store.data.guildInvites) Store.data.guildInvites = [];
    if (!Store.data.guildInvites.includes(ev.guildId)) {
      Store.data.guildInvites.push(ev.guildId);
      Store.save();
      return { kind: 'invite', guildId: ev.guildId };
    }
  }
  if (ev.type === 'shitstorm_check') {
    const outcome = computeShitstorm();
    if (outcome) {
      Store.data.shitstormHistory.push({
        ...outcome, week: Store.data.currentWeek, kind: outcome.kind
      });
      Store.save();
      return { kind: 'shitstorm', outcome };
    }
  }
  if (ev.type === 'deepfake') {
    return { kind: 'deepfake' };
  }
  if (ev.type === 'hate_incident') {
    return { kind: 'hate_incident' };
  }
  if (ev.type === 'election_start') {
    return { kind: 'election_start' };
  }
  if (ev.type === 'election_vote') {
    // Ergebnis basierend auf User-Profil „perzipiert"
    const perceived = computePerceivedElectionResult();
    Store.data.electionData = perceived;
    Store.save();
    return { kind: 'election_vote', result: perceived };
  }
  return null;
}

function computeShitstorm() {
  // Braucht mindestens einen eigenen Post
  if (!Store.data.ownPosts.length) return null;
  const lastOwn = Store.data.ownPosts[Store.data.ownPosts.length - 1];
  const outrage = lastOwn.outrage || 0;
  const hasPolitical = (lastOwn.tags || []).some(t =>
    ['politik-rechts','politik-links','verschwoerung','hass','feminismus','anti-feminismus'].includes(t));

  let key;
  if (hasPolitical && outrage > 0.2) key = 'negative_political';
  else if (outrage > 0.2) key = 'negative_outrage';
  else if ((lastOwn.tags || []).includes('wissenschaft')) key = 'positive_wissenschaft';
  else key = 'positive_lifestyle';

  const base = SHITSTORM_OUT[key];
  return { ...base, kind: key };
}

/**
 * Wahlergebnis aus Sicht des User-Feeds (perzipiert)
 * + objektives Ergebnis
 */
function computePerceivedElectionResult() {
  const objective = [
    { id: 'p_buerger', name: 'Bürgerliste',        share: 0.29 },
    { id: 'p_zukunft', name: 'Zukunft Greifshafen', share: 0.26 },
    { id: 'p_alt',     name: 'Neue Alternative',    share: 0.23 },
    { id: 'p_heimat',  name: 'Heimat Zuerst',       share: 0.12 },
    { id: 'sonst',     name: 'Sonstige',            share: 0.10 }
  ];
  // Perzipierte Verteilung: verzerrt durch political_lean_estimated
  const lean = Store.data.userProfile.political_lean_estimated;
  const perceived = objective.map(p => {
    const party = PARTIES.find(x => x.id === p.id);
    const partyLean = party ? party.lean : 0;
    const agreement = 1 - Math.abs(partyLean - lean) / 2;  // 0..1
    const boost = 1 + (agreement - 0.5) * 0.8 * Math.abs(lean);
    return { ...p, perceived: p.share * boost };
  });
  // Normalisieren
  const sum = perceived.reduce((a, b) => a + b.perceived, 0);
  perceived.forEach(p => p.perceived = p.perceived / sum);
  return { objective, perceived };
}

/**
 * Hate-Incident-Chat-Daten.
 */
export function getHateIncidentData() { return HATE_INCIDENT; }

/**
 * Reaktion auf eine Gilden-Nachricht verbuchen.
 */
export function applyGuildReaction(guildId, choiceId, choice) {
  const effect = choice.effect || {};
  const p = Store.data.userProfile;
  if (effect.tags) {
    for (const [t, v] of Object.entries(effect.tags)) {
      p.interests[t] = clamp((p.interests[t] || 0) + v, 0, 1);
    }
  }
  if (effect.leaveGuild) {
    Store.data.guildMemberships = Store.data.guildMemberships.filter(x => x !== guildId);
  } else {
    if (!Store.data.guildMemberships.includes(guildId)) {
      Store.data.guildMemberships.push(guildId);
    }
  }
  if (!Store.data.guildReactions[guildId]) Store.data.guildReactions[guildId] = [];
  Store.data.guildReactions[guildId].push({ choiceId, week: Store.data.currentWeek });
  Store.save();
}

/**
 * Badge-Vergabe-Logik am Ende jeder Woche.
 */
export function checkBadges() {
  const awarded = [];
  const actions = Store.data.history.flatMap(h => h.actions || []);
  const likes = actions.filter(a => a.type === 'like').length;
  const comments = actions.filter(a => a.type === 'comment' || a.type === 'angry_comment').length;
  const follows = actions.filter(a => a.type === 'follow').length;
  const angry = actions.filter(a => a.type === 'angry_comment').length;

  if (likes >= 20 && Store.addBadge('Early Adopter', '20 Likes in der ersten Phase')) awarded.push('Early Adopter');
  if (angry >= 5 && Store.addBadge('Flammenwerfer', 'Du hast wütend kommentiert')) awarded.push('Flammenwerfer');
  if (comments === 0 && Store.data.currentWeek >= 5 && Store.addBadge('Stiller Beobachter', 'Lesen statt Schreiben')) awarded.push('Stiller Beobachter');
  if (follows >= 10 && Store.addBadge('Netzwerker', 'Du folgst 10+ Accounts')) awarded.push('Netzwerker');
  if (Store.data.guildMemberships.includes('echte_werte') && Store.addBadge('Tief im Loch', 'Rabbit-Hole betreten')) awarded.push('Tief im Loch');
  if (Store.data.guildMemberships.includes('lese_runde') && Store.addBadge('Bücherwurm', 'Der Leserunde beigetreten')) awarded.push('Bücherwurm');
  return awarded;
}

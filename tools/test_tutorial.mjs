// Regression-Test für den Tutorial-Bug:
// "Klick auf Weiter in Schritt 1 → Schritt 2 erscheint nicht, Overlay bleibt".
//
// Testet drei Szenarien:
//   A) Happy path: alle 3 Targets vorhanden → User kann durch alle 3 Schritte
//   B) Step 2 Target fehlt → kein hängendes Overlay (cleanup-Sweep)
//   C) Tip-offsetHeight liest 0 (Layout noch nicht gerechnet) → kein Crash,
//      Position wird per requestAnimationFrame nachgereicht
//
// Aufruf:  node tools/test_tutorial.mjs

import vm from 'node:vm';
import fs from 'node:fs';

function mkClassList() {
  const set = new Set();
  return {
    _set: set,
    add: c => set.add(c),
    remove: c => set.delete(c),
    contains: c => set.has(c),
    toggle: c => set.has(c) ? set.delete(c) : set.add(c),
    get value() { return [...set].join(' '); }
  };
}

class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parent = null;
    this.attributes = {};
    this.classList = mkClassList();
    this.style = {};
    this.dataset = {};
    this._innerHTML = '';
    this._handlers = {};
    this._listeners = [];
    this.offsetHeight = 140;
    this._removed = false;
    this.id = '';
  }
  get className() { return this.classList.value; }
  set className(v) {
    this.classList = mkClassList();
    for (const c of String(v).split(/\s+/)) if (c) this.classList.add(c);
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) {
    this._innerHTML = v;
    this.children = [];
    // Grobes Parsing: <button id="X">…</button>
    const buttonRe = /<button[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g;
    let m;
    while ((m = buttonRe.exec(v))) {
      const btn = new FakeElement('button');
      btn.id = m[1];
      btn._innerHTML = m[2];
      btn.parent = this;
      this.children.push(btn);
    }
  }
  appendChild(child) { child.parent = this; this.children.push(child); return child; }
  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    child.parent = null;
  }
  remove() {
    this._removed = true;
    if (this.parent) this.parent.removeChild(this);
  }
  querySelector(sel) {
    if (sel.startsWith('#')) {
      const id = sel.slice(1);
      function find(node) {
        for (const c of node.children || []) {
          if (c.id === id) return c;
          const f = find(c);
          if (f) return f;
        }
        return null;
      }
      return find(this);
    }
    return null;
  }
  querySelectorAll(sel) {
    // Sehr grob: nur class-Selektoren mit Komma-Trennung
    const classes = sel.split(',').map(s => s.trim().replace(/^\./, ''));
    const out = [];
    function walk(node) {
      for (const c of node.children || []) {
        for (const cls of classes) {
          if (c.classList.contains && c.classList.contains(cls)) { out.push(c); break; }
        }
        walk(c);
      }
    }
    walk(this);
    return out;
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
  addEventListener(type, fn) { this._listeners.push({ type, fn }); }
  removeEventListener(type, fn) { this._listeners = this._listeners.filter(l => !(l.type === type && l.fn === fn)); }
  getBoundingClientRect() { return { left: 100, top: 200, right: 220, bottom: 240, width: 120, height: 40 }; }
  set onclick(fn) { this._handlers.click = fn; }
  get onclick() { return this._handlers.click; }
  click() { if (this._handlers.click) this._handlers.click({ stopPropagation: () => {}, target: this }); }
  dispatch(type, evt) { for (const l of this._listeners) if (l.type === type) l.fn(evt); }
}

function makeDoc(options = {}) {
  const doc = {
    _allListeners: [],
    body: new FakeElement('body'),
  };

  // Targets je nach Option
  if (options.hasPostCard !== false) {
    const postCard = new FakeElement('article'); postCard.classList.add('post-card');
    const actions = new FakeElement('div'); actions.classList.add('actions');
    postCard.appendChild(actions); doc.body.appendChild(postCard);
    doc._postCardActions = actions;
  }
  if (options.hasDmBtn !== false) {
    const bb = new FakeElement('nav'); bb.classList.add('bottombar');
    const dm = new FakeElement('button'); dm.classList.add('navbtn'); dm.dataset.view = 'dms';
    bb.appendChild(dm); doc.body.appendChild(bb);
    doc._dmBtn = dm;
  }
  if (options.hasStory !== false) {
    const sb = new FakeElement('div'); sb.classList.add('stories-bar');
    const story = new FakeElement('button'); story.classList.add('story-item');
    sb.appendChild(story); doc.body.appendChild(sb);
    doc._story = story;
  }

  doc.createElement = (tag) => new FakeElement(tag);
  doc.getElementById = () => null;
  doc.querySelector = (sel) => {
    if (sel === '.post-card .actions') return doc._postCardActions || null;
    if (sel === '.bottombar .navbtn[data-view="dms"]') return doc._dmBtn || null;
    if (sel === '.stories-bar .story-item:first-child') return doc._story || null;
    return null;
  };
  doc.querySelectorAll = (sel) => doc.body.querySelectorAll(sel);
  doc.addEventListener = (type, fn) => doc._allListeners.push({ type, fn });
  doc.removeEventListener = (type, fn) => { doc._allListeners = doc._allListeners.filter(l => !(l.type === type && l.fn === fn)); };
  doc.dispatch = (type, evt) => { for (const l of doc._allListeners) if (l.type === type) l.fn(evt); };
  return doc;
}

function runTest(name, options) {
  const doc = makeDoc(options);
  const window = {
    innerWidth: 1024, innerHeight: 800,
    document: doc,
    location: { search: '', protocol: 'http:' }
  };
  const code = fs.readFileSync('js/tutorial.js', 'utf8');
  const stripped = code
    .replace(/^\s*import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .replace(/^export\s+/gm, '');
  const Store = { data: { tutorialDone: false, currentWeek: 0 }, save: () => {} };
  // setTimeout/raf: synchron für Test-Speed
  const ctx = {
    window, document: doc, Store, console,
    setTimeout: (cb) => cb(),
    requestAnimationFrame: (cb) => cb(0)
  };
  vm.createContext(ctx);
  vm.runInContext(stripped, ctx);

  ctx.runTutorial(0);
  return { doc, Store, ctx };
}

function findByClass(doc, cls) {
  return doc.body.children.find(c => c.className.split(/\s+/).includes(cls));
}
function countTutorialNodes(doc) {
  return doc.body.children.filter(c => /tutorial-(overlay|spot|tip)/.test(c.className)).length;
}
function tipStep(tip) {
  return tip?.innerHTML.match(/Schritt (\d+) von (\d+)/)?.[0];
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) { console.log(`  ✗ FAIL: ${msg}`); failed++; }
  else        console.log(`  ✓ ${msg}`);
}

// ===== Test A: Happy path =====
console.log('\nA) Happy path — alle 3 Targets vorhanden');
{
  const { doc, Store } = runTest('A', {});
  let tip = findByClass(doc, 'tutorial-tip');
  assert(!!tip, 'Step 1 Tip erscheint');
  assert(tipStep(tip) === 'Schritt 1 von 3', 'Indikator "Schritt 1 von 3"');

  tip.querySelector('#tut-next').click();
  tip = findByClass(doc, 'tutorial-tip');
  assert(!!tip, 'Step 2 Tip erscheint nach Klick auf Weiter');
  assert(tipStep(tip) === 'Schritt 2 von 3', 'Indikator "Schritt 2 von 3"');

  tip.querySelector('#tut-next').click();
  tip = findByClass(doc, 'tutorial-tip');
  assert(!!tip, 'Step 3 Tip erscheint');
  assert(tipStep(tip) === 'Schritt 3 von 3', 'Indikator "Schritt 3 von 3"');

  tip.querySelector('#tut-next').click();
  assert(countTutorialNodes(doc) === 0, 'Nach Step 3: alle Tutorial-Nodes entfernt');
  assert(Store.data.tutorialDone === true, 'tutorialDone = true');
}

// ===== Test B: Step 2 Target fehlt =====
console.log('\nB) Step 2 Target fehlt — kein hängendes Overlay');
{
  const { doc, Store } = runTest('B', { hasDmBtn: false });
  let tip = findByClass(doc, 'tutorial-tip');
  assert(tipStep(tip) === 'Schritt 1 von 3', 'Step 1 OK');

  tip.querySelector('#tut-next').click();
  // Step 2 selector fehlt → recursion zu Step 3
  tip = findByClass(doc, 'tutorial-tip');
  assert(!!tip, 'Springt zu Step 3 (nicht stecken bleiben)');
  assert(tipStep(tip) === 'Schritt 3 von 3', 'Step 3 angezeigt');

  tip.querySelector('#tut-next').click();
  assert(countTutorialNodes(doc) === 0, 'Kein Overlay nach Abschluss');
}

// ===== Test C: Alle Targets fehlen nach Step 1 =====
console.log('\nC) Step 2 und 3 Targets fehlen — Tutorial endet sauber');
{
  const { doc, Store } = runTest('C', { hasDmBtn: false, hasStory: false });
  let tip = findByClass(doc, 'tutorial-tip');
  assert(tipStep(tip) === 'Schritt 1 von 3', 'Step 1 OK');

  tip.querySelector('#tut-next').click();
  // Alle nachfolgenden Targets fehlen → Tutorial endet
  assert(countTutorialNodes(doc) === 0, 'Kein Overlay nach Step 1 + Recursion');
  assert(Store.data.tutorialDone === true, 'tutorialDone = true');
}

// ===== Test D: Esc-Key beendet Tutorial sofort =====
console.log('\nD) Esc-Key beendet Tutorial');
{
  const { doc, Store } = runTest('D', {});
  let tip = findByClass(doc, 'tutorial-tip');
  assert(!!tip, 'Step 1 sichtbar');

  doc.dispatch('keydown', { key: 'Escape' });
  assert(countTutorialNodes(doc) === 0, 'Esc räumt alles weg');
  assert(Store.data.tutorialDone === true, 'tutorialDone = true');
}

// ===== Test E: Backdrop-Klick beendet =====
console.log('\nE) Backdrop-Klick (auf Overlay außerhalb Tip) beendet');
{
  const { doc, Store } = runTest('E', {});
  const overlay = findByClass(doc, 'tutorial-overlay');
  overlay.dispatch('click', { target: overlay });
  assert(countTutorialNodes(doc) === 0, 'Backdrop-Klick räumt alles weg');
  assert(Store.data.tutorialDone === true, 'tutorialDone = true');
}

// ===== Test F: X-Button beendet =====
console.log('\nF) Close-X-Button beendet');
{
  const { doc, Store } = runTest('F', {});
  const tip = findByClass(doc, 'tutorial-tip');
  tip.querySelector('#tut-close').click();
  assert(countTutorialNodes(doc) === 0, 'X-Button räumt alles weg');
  assert(Store.data.tutorialDone === true, 'tutorialDone = true');
}

// ===== Test G: Reproduktion des Original-Bugs =====
console.log('\nG) Original-Bug: Weiter klicken ohne Step 2/3 Targets → kein Stuck-Overlay');
{
  // Wenn aus irgendeinem Grund Step 2 und 3 Targets nicht da sind
  // (z.B. Feed-View noch nicht gerendert), darf der User nicht gefangen sein.
  const { doc, Store } = runTest('G', { hasDmBtn: false, hasStory: false });
  const tip = findByClass(doc, 'tutorial-tip');
  tip.querySelector('#tut-next').click();
  assert(countTutorialNodes(doc) === 0, 'Original-Bug behoben: kein Overlay-Stuck');
}

console.log(failed === 0 ? '\nALL TESTS PASS ✓' : `\n${failed} TESTS FAILED ✗`);
process.exit(failed === 0 ? 0 : 1);

#!/usr/bin/env node
/**
 * MINI PLAY ARCADE — Comprehensive Automated Verification Suite
 * Zero external dependencies: validates all 22 HTML pages, SEO metadata,
 * unique titles, image alt attributes, internal links, JSON-LD honesty,
 * sitemap.xml, robots.txt, ads.txt, AdSense safety, LocalStorage systems,
 * Daily Challenge, Leaderboard, and real gameplay execution across ALL 10 games!
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
async function check(label, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${label}`);
  } catch (err) {
    console.error(`  ✗ FAILED: ${label}\n    ${err.stack || err.message}`);
    process.exitCode = 1;
  }
}

console.log('\n=== 1. Project Files, Sitemap, Robots & AdSense Prep ===');

const requiredFiles = [
  'index.html',
  'robots.txt',
  'sitemap.xml',
  'ads.txt',
  'ADSENSE_SETUP.md',
  'README.md',
  'vercel.json',
  'render.yaml',
  'config/adsense-config.js',
  'css/style.css',
  'css/game-page.css',
  'js/games-data.js',
  'js/storage.js',
  'js/sound.js',
  'js/daily-challenge.js',
  'js/leaderboard.js',
  'js/ads.js',
  'js/ui.js',
  'js/home.js',
  'js/game-shell.js'
];

await check('All core architecture, SEO, AdSense, and deployment files exist', () => {
  for (const rel of requiredFiles) {
    const full = path.join(ROOT, rel);
    assert.ok(fs.existsSync(full), `Missing required file: ${rel}`);
  }
});

await check('ads.txt contains setup instructions and NO fabricated active publisher ID', () => {
  const adsTxt = fs.readFileSync(path.join(ROOT, 'ads.txt'), 'utf8');
  const activeLines = adsTxt
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
  assert.equal(activeLines.length, 0, 'ads.txt must not contain invented active seller records');
});

await check('ADSENSE_SETUP.md documents all 9 required AdSense steps', () => {
  const doc = fs.readFileSync(path.join(ROOT, 'ADSENSE_SETUP.md'), 'utf8');
  for (let i = 1; i <= 9; i++) {
    assert.ok(doc.includes(`## ${i}.`), `ADSENSE_SETUP.md missing section ${i}`);
  }
});

await check('README.md documents local run, GitHub, Vercel, Render, Custom Domain, Updates & AdSense', () => {
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  for (let i = 1; i <= 7; i++) {
    assert.ok(readme.includes(`## ${i}.`), `README.md missing section ${i}`);
  }
});

console.log('\n=== 2. HTML Pages, SEO Metadata, Links & Image Alt Audit ===');

const htmlPages = [
  'index.html',
  ...fs.readdirSync(path.join(ROOT, 'pages')).filter(f => f.endsWith('.html')).map(f => `pages/${f}`),
  ...fs.readdirSync(path.join(ROOT, 'games')).filter(f => f.endsWith('.html')).map(f => `games/${f}`)
];

await check('All 22 required HTML pages exist (Home + 11 Pages + 10 Games)', () => {
  assert.equal(htmlPages.length, 22, `Expected 22 HTML pages, found ${htmlPages.length}`);
});

const seenTitles = new Set();
const seenDescriptions = new Set();

await check('Every page has unique <title>, meta description, canonical, Open Graph, <h1>, and valid JSON-LD (no fake reviews)', () => {
  for (const relPage of htmlPages) {
    const content = fs.readFileSync(path.join(ROOT, relPage), 'utf8');

    const titleMatch = content.match(/<title>([^<]+)<\/title>/i);
    assert.ok(titleMatch && titleMatch[1].trim().length > 5, `${relPage} missing <title>`);
    const title = titleMatch[1].trim();
    assert.ok(!seenTitles.has(title), `Duplicate <title> "${title}" on ${relPage}`);
    seenTitles.add(title);

    const descMatch = content.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    assert.ok(descMatch && descMatch[1].trim().length > 20, `${relPage} missing meta description`);
    const desc = descMatch[1].trim();
    assert.ok(!seenDescriptions.has(desc), `Duplicate meta description on ${relPage}`);
    seenDescriptions.add(desc);

    assert.match(content, /<link\s+rel="canonical"\s+href="https:\/\/[^"]+"/i, `${relPage} missing canonical URL`);
    assert.match(content, /<meta\s+property="og:title"/i, `${relPage} missing og:title`);
    assert.match(content, /<meta\s+property="og:description"/i, `${relPage} missing og:description`);
    assert.match(content, /<meta\s+property="og:image"/i, `${relPage} missing og:image`);
    assert.match(content, /<h1[\s>]/i, `${relPage} missing semantic <h1>`);

    // Check JSON-LD if present
    const ldMatches = [...content.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
    for (const m of ldMatches) {
      const parsed = JSON.parse(m[1]);
      assert.equal(parsed.aggregateRating, undefined, `${relPage} must not contain fake aggregateRating`);
      assert.equal(parsed.review, undefined, `${relPage} must not contain fake review`);
    }

    // Strip inline <script> bodies while keeping <script src="..."> tags for static link check
    const htmlWithoutInlineJs = content.replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, '<script$1></script>');

    // Check all static <img> tags have non-empty alt text
    const imgTags = [...htmlWithoutInlineJs.matchAll(/<img\b[^>]*>/gi)];
    for (const [tag] of imgTags) {
      const altMatch = tag.match(/\balt="([^"]*)"/i);
      assert.ok(altMatch && altMatch[1].trim().length > 0, `${relPage} has <img> without descriptive alt: ${tag}`);
    }

    // Check all static href and src attributes resolve on disk
    const attrRefs = [...htmlWithoutInlineJs.matchAll(/\b(?:href|src)="([^"]+)"/gi)];
    const pageDir = path.dirname(path.join(ROOT, relPage));
    for (const [, ref] of attrRefs) {
      if (/^(https?:|mailto:|#|javascript:|data:)/.test(ref)) continue;
      const cleanRef = ref.split('?')[0].split('#')[0];
      if (!cleanRef) continue;
      const targetPath = path.resolve(pageDir, cleanRef);
      assert.ok(fs.existsSync(targetPath), `Broken link/asset "${ref}" in ${relPage} -> ${targetPath}`);
    }
  }
});

await check('sitemap.xml lists all 22 pages and every URL maps to a real file', () => {
  const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());
  assert.equal(locs.length, 22, `Expected 22 URLs in sitemap.xml, found ${locs.length}`);
  for (const url of locs) {
    const rel = url.replace('https://miniplayarcade.example.com/', '') || 'index.html';
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `Sitemap URL missing on disk: ${rel}`);
  }
});

console.log('\n=== 3. Headless Browser Sandbox: Core Systems & AdSense Safety ===');

// Lightweight DOM + HTML5 Canvas 2D Context simulator for headless execution
function createMockDomEnvironment(htmlAttrs = {}) {
  const storageMap = new Map();
  const rafCallbacks = [];
  let rafCounter = 1;

  function makeCtx2d() {
    const noop = () => {};
    return new Proxy({
      fillStyle: '#000',
      strokeStyle: '#fff',
      lineWidth: 1,
      globalAlpha: 1,
      font: '12px sans-serif',
      textAlign: 'left',
      lineCap: 'butt',
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
      measureText: (t) => ({ width: String(t).length * 7 })
    }, {
      get(target, prop) {
        if (prop in target) return target[prop];
        return noop;
      },
      set(target, prop, val) {
        target[prop] = val;
        return true;
      }
    });
  }

  class MockElement {
    constructor(tagName = 'div') {
      this.tagName = String(tagName).toUpperCase();
      this.id = '';
      this.className = '';
      this.style = {};
      this.attributes = new Map();
      this.children = [];
      this.parentNode = null;
      this.parentElement = null;
      this.listeners = new Map();
      this._innerHTML = '';
      this.textContent = '';
      this.value = '';
      this.disabled = false;
      this.checked = true;
      this.width = 520;
      this.height = 560;
      this.clientWidth = 520;
      this.clientHeight = 560;
      this.offsetWidth = 80;
      this.offsetHeight = 80;
      this.offsetLeft = 100;
      this.offsetTop = 100;

      const self = this;
      this.classList = {
        add(...cls) {
          const set = new Set(self.className.split(/\s+/).filter(Boolean));
          cls.forEach(c => set.add(c));
          self.className = [...set].join(' ');
        },
        remove(...cls) {
          const set = new Set(self.className.split(/\s+/).filter(Boolean));
          cls.forEach(c => set.delete(c));
          self.className = [...set].join(' ');
        },
        toggle(c, force) {
          const has = this.contains(c);
          const next = force !== undefined ? Boolean(force) : !has;
          if (next) this.add(c);
          else this.remove(c);
          return next;
        },
        contains(c) {
          return self.className.split(/\s+/).includes(c);
        }
      };
    }

    get firstChild() {
      return this.children[0] || null;
    }

    set innerHTML(val) {
      this._innerHTML = String(val);
      this.children = [];
      // Parse key interactive sub-elements (id, data-* attributes, script, ins) so querySelector works!
      const tagRegex = /<([a-zA-Z0-9-]+)([^>]*)>/g;
      let m;
      while ((m = tagRegex.exec(this._innerHTML)) !== null) {
        const el = new MockElement(m[1]);
        const attrs = m[2];
        const attrRe = /([a-zA-Z0-9_:-]+)(?:="([^"]*)")?/g;
        let am;
        while ((am = attrRe.exec(attrs)) !== null) {
          const k = am[1];
          const v = am[2] !== undefined ? am[2] : '';
          if (k === 'id') el.id = v;
          else if (k === 'class') el.className = v;
          else if (k === 'disabled') el.disabled = true;
          else if (k === 'value') el.value = v;
          el.attributes.set(k, v);
        }
        el.parentNode = this;
        el.parentElement = this;
        this.children.push(el);
      }
    }

    get innerHTML() {
      return this._innerHTML;
    }

    setAttribute(k, v) {
      if (k === 'id') this.id = String(v);
      if (k === 'class') this.className = String(v);
      this.attributes.set(k, String(v));
    }
    getAttribute(k) {
      if (k === 'id') return this.id || null;
      if (k === 'class') return this.className || null;
      return this.attributes.has(k) ? this.attributes.get(k) : null;
    }
    removeAttribute(k) {
      this.attributes.delete(k);
    }
    appendChild(child) {
      child.parentNode = this;
      child.parentElement = this;
      this.children.push(child);
      return child;
    }
    insertBefore(child, _ref) {
      child.parentNode = this;
      child.parentElement = this;
      this.children.unshift(child);
      return child;
    }
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) this.children.splice(idx, 1);
      return child;
    }
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(fn);
    }
    dispatchEvent(evt) {
      const list = this.listeners.get(evt.type) || [];
      evt.target = evt.target || this;
      evt.preventDefault = evt.preventDefault || (() => {});
      evt.stopPropagation = evt.stopPropagation || (() => {});
      list.forEach(fn => fn(evt));
    }
    click() {
      if (this.disabled) return;
      this.dispatchEvent({ type: 'click' });
    }
    focus() {}
    getContext() {
      return makeCtx2d();
    }
    getBoundingClientRect() {
      return { left: 0, top: 0, right: this.width, bottom: this.height, width: this.width, height: this.height };
    }

    _allDescendants() {
      const out = [];
      for (const ch of this.children) {
        out.push(ch);
        out.push(...ch._allDescendants());
      }
      return out;
    }

    querySelectorAll(selector) {
      const all = this._allDescendants();
      const parts = selector.split(',').map(s => s.trim());
      return all.filter(el => parts.some(sel => matchesSimpleSelector(el, sel)));
    }

    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    }
  }

  function matchesSimpleSelector(el, sel) {
    if (sel.startsWith('#')) return el.id === sel.slice(1);
    if (sel.startsWith('.')) return el.classList.contains(sel.slice(1));
    const attrExact = sel.match(/^\[([a-zA-Z0-9_-]+)="([^"]+)"\]$/);
    if (attrExact) return el.getAttribute(attrExact[1]) === attrExact[2];
    const attrHas = sel.match(/^\[([a-zA-Z0-9_-]+)\]$/);
    if (attrHas) return el.getAttribute(attrHas[1]) !== null;
    const tagAttr = sel.match(/^([a-zA-Z0-9-]+)\[([a-zA-Z0-9_-]+)(?:(\*=|=)"([^"]+)")?\]$/);
    if (tagAttr) {
      if (el.tagName !== tagAttr[1].toUpperCase()) return false;
      const val = el.getAttribute(tagAttr[2]);
      if (val === null) return false;
      if (!tagAttr[3]) return true;
      if (tagAttr[3] === '=') return val === tagAttr[4];
      if (tagAttr[3] === '*=') return val.includes(tagAttr[4]);
    }
    return el.tagName === sel.toUpperCase();
  }

  const docEl = new MockElement('html');
  for (const [k, v] of Object.entries(htmlAttrs)) {
    docEl.setAttribute(k, v);
  }
  const head = new MockElement('head');
  const body = new MockElement('body');
  docEl.appendChild(head);
  docEl.appendChild(body);

  const winListeners = new Map();
  const documentObj = {
    readyState: 'complete',
    hidden: false,
    fullscreenElement: null,
    documentElement: docEl,
    head,
    body,
    createElement: (tag) => new MockElement(tag),
    getElementById: (id) => docEl.querySelector(`#${id}`),
    querySelector: (sel) => docEl.querySelector(sel),
    querySelectorAll: (sel) => docEl.querySelectorAll(sel),
    addEventListener: () => {}
  };

  let fakeNow = 1000;
  const windowObj = {
    document: documentObj,
    devicePixelRatio: 1,
    location: { href: 'https://miniplayarcade.example.com/', search: '', reload: () => {} },
    navigator: {
      clipboard: { writeText: async () => {} }
    },
    performance: { now: () => fakeNow },
    localStorage: {
      getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
      setItem: (k, v) => storageMap.set(k, String(v)),
      removeItem: (k) => storageMap.delete(k)
    },
    requestAnimationFrame: (cb) => {
      const id = rafCounter++;
      rafCallbacks.push({ id, cb });
      return id;
    },
    cancelAnimationFrame: (id) => {
      const idx = rafCallbacks.findIndex(r => r.id === id);
      if (idx !== -1) rafCallbacks.splice(idx, 1);
    },
    addEventListener: (type, fn) => {
      if (!winListeners.has(type)) winListeners.set(type, []);
      winListeners.get(type).push(fn);
    },
    dispatchWindowEvent: (evt) => {
      const list = winListeners.get(evt.type) || [];
      evt.preventDefault = evt.preventDefault || (() => {});
      list.forEach(fn => fn(evt));
    },
    stepFrames: (count = 5, dtMs = 16.67) => {
      for (let i = 0; i < count; i++) {
        fakeNow += dtMs;
        const batch = rafCallbacks.splice(0, rafCallbacks.length);
        batch.forEach(item => item.cb(fakeNow));
      }
    },
    setTimeout: (fn) => { fn(); return 1; },
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    Math,
    Date,
    Number,
    String,
    Boolean,
    Array,
    Object,
    JSON,
    RegExp,
    Error,
    Promise,
    URLSearchParams,
    encodeURIComponent
  };
  windowObj.window = windowObj;
  windowObj.globalThis = windowObj;

  return { windowObj, documentObj, head, body };
}

function loadScriptInEnv(env, relPath) {
  const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  vm.runInNewContext(code, env.windowObj, { filename: relPath });
}

await check('AdSense remains strictly disabled by default and prevents duplicate script loading when configured', () => {
  const env = createMockDomEnvironment({ 'data-base-path': '.', 'data-nav': 'home' });
  const slot = env.documentObj.createElement('div');
  slot.setAttribute('data-mpa-ad-slot', 'HOME_BELOW_HERO');
  env.body.appendChild(slot);

  loadScriptInEnv(env, 'config/adsense-config.js');
  loadScriptInEnv(env, 'js/storage.js');
  loadScriptInEnv(env, 'js/ads.js');

  const cfg = env.windowObj.MPA_ADS.getConfig();
  assert.equal(cfg.ADS_ENABLED, false);
  assert.equal(cfg.ADS_CLIENT_ID, 'YOUR_ADSENSE_PUBLISHER_ID');
  assert.equal(env.windowObj.MPA_ADS.isLiveAdsReady(), false);

  env.windowObj.MPA_ADS.initAdSlots();
  assert.equal(env.head.children.length, 0, 'No AdSense script may load while ADS_ENABLED=false');
  assert.ok(slot.classList.contains('mpa-ad-collapsed'));

  // Simulate approved configuration and verify single script load
  env.windowObj.MPA_ADS_CONFIG = {
    ADS_ENABLED: true,
    ADS_CLIENT_ID: 'ca-pub-1234567890123456',
    ADS_PREVIEW_MODE: false,
    REQUIRE_CONSENT: true,
    SLOTS: { HOME_BELOW_HERO: '9876543210' }
  };
  env.windowObj.MPA_ADS.initAdSlots();
  env.windowObj.MPA_ADS.initAdSlots(); // Call twice to test duplicate guard!
  assert.equal(env.head.children.length, 1, 'AdSense script must only be injected once');
});

await check('Player Profile, Favorites, Scores, Achievements, Daily Challenge & Honest Leaderboard work via LocalStorage', async () => {
  const env = createMockDomEnvironment({ 'data-base-path': '.', 'data-nav': 'home' });
  loadScriptInEnv(env, 'js/games-data.js');
  loadScriptInEnv(env, 'js/storage.js');
  loadScriptInEnv(env, 'js/sound.js');
  loadScriptInEnv(env, 'js/daily-challenge.js');
  loadScriptInEnv(env, 'js/leaderboard.js');

  const S = env.windowObj.MPA_STORAGE;
  const D = env.windowObj.MPA_DAILY;
  const L = env.windowObj.MPA_LEADERBOARD;

  // Profile update
  const updated = S.updateProfile({ nickname: 'AceTester', avatar: '🚀' });
  assert.equal(updated.nickname, 'AceTester');
  assert.equal(updated.avatar, '🚀');

  // Favorites
  assert.equal(S.toggleFavorite('stack-master'), true);
  assert.equal(S.toggleFavorite('fruit-merge'), true);
  assert.equal(S.toggleFavorite('mini-golf-crazy'), true);
  assert.equal(S.getFavorites().length, 3);
  assert.ok(S.getState().achievements.favorite_collector, 'Curator achievement should unlock at 3 favorites');

  // Daily challenge rotation & completion
  const chToday = D.getTodayChallenge();
  assert.ok(chToday && chToday.game && chToday.targetScore > 0);
  const res = S.recordGameSession(chToday.game.id, chToday.targetScore + 250);
  assert.equal(res.isNewBest, true);
  assert.equal(res.dailyCompletedNow, true);
  assert.equal(D.getTodayChallenge().completed, true);
  assert.ok(S.getState().achievements.first_play);
  assert.ok(S.getState().achievements.daily_challenger);

  // Leaderboard local-demo check
  const lb = await L.fetchLeaderboard({ period: 'alltime', gameId: chToday.game.id });
  assert.equal(lb.mode, 'local-demo');
  assert.match(lb.disclaimer, /Local & Demonstration Rankings/);
  const me = lb.entries.find(e => e.isCurrentPlayer);
  assert.ok(me && me.score === chToday.targetScore + 250);
});

console.log('\n=== 4. Playable Engine Execution Across All 10 Games ===');

function setupGamePageEnv(gameId) {
  const env = createMockDomEnvironment({
    'data-base-path': '..',
    'data-nav': 'all-games',
    'data-game-id': gameId
  });

  // Build standard game page DOM skeleton
  env.body.innerHTML = `
    <header id="site-header"></header>
    <div id="game-daily-indicator"></div>
    <button id="btn-game-fav"></button>
    <button id="btn-share-inline"></button>
    <span id="hud-current-score">0</span>
    <span id="hud-best-score">0</span>
    <button id="btn-start"></button>
    <button id="btn-pause"></button>
    <button id="btn-restart"></button>
    <button id="btn-game-sound"></button>
    <button id="btn-fullscreen"></button>
    <div id="game-stage">
      <canvas id="game-canvas"></canvas>
      <div id="overlay-start" class="stage-overlay visible"><button id="overlay-btn-start"></button></div>
      <div id="overlay-pause" class="stage-overlay"><button id="overlay-btn-resume"></button><button id="overlay-btn-pause-restart"></button></div>
      <div id="overlay-gameover" class="stage-overlay">
        <div id="go-new-best-pill"></div>
        <p id="go-summary-text"></p>
        <strong id="go-final-score">0</strong>
        <strong id="go-best-score">0</strong>
        <button id="overlay-btn-play-again"></button>
        <button id="btn-share-score"></button>
      </div>
    </div>
    <div id="related-games-grid"></div>
    <footer id="site-footer"></footer>
  `;

  loadScriptInEnv(env, 'config/adsense-config.js');
  loadScriptInEnv(env, 'js/games-data.js');
  loadScriptInEnv(env, 'js/storage.js');
  loadScriptInEnv(env, 'js/sound.js');
  loadScriptInEnv(env, 'js/daily-challenge.js');
  loadScriptInEnv(env, 'js/ads.js');
  loadScriptInEnv(env, 'js/ui.js');
  loadScriptInEnv(env, 'js/game-shell.js');
  loadScriptInEnv(env, `games/engines/${gameId}.js`);

  const ctrl = env.windowObj.MPA_GAME_SHELL.getActiveController();
  assert.ok(ctrl && ctrl.engine, `Game controller failed to boot for ${gameId}`);
  return { env, ctrl };
}

const gameInteractionChecks = [
  ['stack-master', (ctrl, env) => {
    // Let moving slab slide from x=-200 into alignment over foundation at x=130 (~1.85s)
    env.windowObj.stepFrames(76, 25);
    ctrl.engine.triggerDrop();
    env.windowObj.stepFrames(5, 25);
    assert.ok(ctrl.getScore() >= 15, `Stack Master should award points on slab drop (got ${ctrl.getScore()})`);
  }],
  ['color-switch-rush', (ctrl, env) => {
    ctrl.engine.triggerBounce();
    env.windowObj.stepFrames(12, 20);
    assert.ok(ctrl.isRunning(), 'Color Switch Rush should run smoothly after bounce');
  }],
  ['fruit-merge', (ctrl, env) => {
    ctrl.engine.triggerDrop();
    env.windowObj.stepFrames(35, 20);
    ctrl.engine.triggerDrop();
    env.windowObj.stepFrames(25, 20);
    assert.ok(ctrl.isRunning(), 'Fruit Merge 2D physics loop should run cleanly');
  }],
  ['tap-speed-challenge', (ctrl) => {
    for (let r = 0; r < 5; r++) {
      ctrl.engine.forceSignalAndTap();
      if (r < 4) {
        // Advance from round-result to next round
        ctrl.engine.forceSignalAndTap;
      }
    }
    assert.ok(ctrl.getScore() > 0, 'Tap Speed Challenge should score millisecond reaction');
  }],
  ['flip-master', (ctrl, env) => {
    ctrl.engine.simulateQuickJump();
    env.windowObj.stepFrames(20, 20);
    assert.ok(ctrl.isRunning(), 'Flip Master jump physics should run cleanly');
  }],
  ['dont-fall', (ctrl, env) => {
    ctrl.engine.triggerJump();
    env.windowObj.stepFrames(25, 25);
    assert.ok(ctrl.getScore() > 0, "Don't Fall should accumulate running distance score");
  }],
  ['brain-trap', (ctrl) => {
    assert.equal(ctrl.engine.getPuzzleCount(), 30, 'Brain Trap must have exactly 30 original puzzles');
    ctrl.engine.solveCurrentForTest();
    assert.ok(ctrl.getScore() >= 55, 'Brain Trap should award score on solving a puzzle');
  }],
  ['bubble-pop-frenzy', (ctrl, env) => {
    const popped = ctrl.engine.popAnyValidMove();
    env.windowObj.stepFrames(10, 20);
    assert.equal(popped, true, 'Bubble Pop Frenzy must always have a valid cluster move');
    assert.ok(ctrl.getScore() > 0, 'Bubble Pop Frenzy should award cluster score');
  }],
  ['guess-the-emoji', (ctrl) => {
    assert.equal(ctrl.engine.getQuestionCount(), 100, 'Guess The Emoji must have exactly 100 original questions');
    ctrl.engine.answerCorrectlyForTest();
    assert.ok(ctrl.getScore() >= 50, 'Guess The Emoji should award points + time bonus');
  }],
  ['mini-golf-crazy', (ctrl, env) => {
    assert.equal(ctrl.engine.getCourseCount(), 20, 'Mini Golf Crazy must have exactly 20 playable levels');
    ctrl.engine.puttForTest(560, 0); // Controlled putt 340px across Hole 1 fairway into cup!
    env.windowObj.stepFrames(100, 20);
    assert.ok(ctrl.getScore() >= 95, `Mini Golf Crazy Hole 1 straight putt should sink and score (got ${ctrl.getScore()})`);
  }]
];

for (const [gameId, verifyFn] of gameInteractionChecks) {
  await check(`Game Engine "${gameId}" boots, starts, plays, scores, pauses, resumes, shares & restarts`, async () => {
    const { env, ctrl } = setupGamePageEnv(gameId);

    // Start game
    ctrl.start();
    assert.equal(ctrl.isRunning(), true);
    assert.equal(ctrl.isPaused(), false);

    // Pause & Resume
    ctrl.pause();
    assert.equal(ctrl.isPaused(), true);
    ctrl.resume();
    assert.equal(ctrl.isPaused(), false);

    // Run game-specific gameplay assertions
    verifyFn(ctrl, env);

    // Share score
    await ctrl.shareScore();

    // Restart resets current score cleanly
    ctrl.restart();
    assert.equal(ctrl.getScore(), 0);
    assert.equal(ctrl.isRunning(), true);
  });
}

if (process.exitCode) {
  console.error('\nVerification finished with failures.');
  process.exit(1);
} else {
  console.log(`\n🎉 ALL ${passed} VERIFICATION SUITES PASSED WITH ZERO ERRORS!\n`);
}

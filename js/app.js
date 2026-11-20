import {
  generate, validate, dailyConfig, practiceConfig, localDateKey, puzzleNumber,
  canEnter, symbolViolations, hintPath, nextNumber, adjacent, wallKey, GEN_VERSION,
} from './nexus.js';
import { t, initLang, setLang, getLang, applyI18n } from './i18n.js';

const $ = (s) => document.querySelector(s);
const APP_URL = new URL('./', location.href).href;

// --- Archivio locale ---
const store = {
  get(k, d) { try { const v = localStorage.getItem('pm:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('pm:' + k, JSON.stringify(v)); } catch { /* storage pieno o bloccato */ } },
};

function fmtTime(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function yesterdayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return localDateKey(new Date(y, m - 1, d - 1));
}

function getStats() {
  return store.get('stats', { played: 0, streak: 0, bestStreak: 0, lastDate: null, bestTime: null });
}

function currentStreak(stats) {
  const today = localDateKey();
  if (stats.lastDate === today || stats.lastDate === yesterdayKey(today)) return stats.streak;
  return 0;
}

// --- Stato di gioco ---
let S = null;
let wallSet = new Set();
let cellEls = [];
let lastTick = performance.now();
let saveCounter = 0;

function startDaily() {
  const key = localDateKey();
  const cfg = dailyConfig(new Date());
  const p = generate(`nexus-${GEN_VERSION}:${key}`, cfg);
  const saved = store.get('nexus:' + key, null);
  S = {
    mode: 'daily', key, num: puzzleNumber(key), p,
    path: saved?.path || [], hints: saved?.hints || 0, elapsed: saved?.elapsed || 0, solved: !!saved?.solved,
  };
  openGame();
}

function startPractice() {
  const level = store.get('practiceLevel', 0);
  const p = generate(`practice:${Date.now()}:${Math.random()}`, practiceConfig(level));
  S = { mode: 'practice', level, p, path: [], hints: 0, elapsed: 0, solved: false };
  openGame();
}

function saveGame() {
  if (!S || S.mode !== 'daily') return;
  store.set('nexus:' + S.key, { path: S.path, hints: S.hints, elapsed: Math.round(S.elapsed), solved: S.solved });
}

// --- Viste ---
function show(view) {
  $('#view-home').hidden = view !== 'home';
  $('#view-game').hidden = view !== 'game';
  window.scrollTo(0, 0);
}

function renderHome() {
  const now = new Date();
  $('#home-date').textContent = now.toLocaleDateString(getLang() === 'it' ? 'it-IT' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const key = localDateKey(now);
  const saved = store.get('nexus:' + key, null);
  const lvl = dailyConfig(now);
  let status = t('statusTodo');
  if (saved?.solved) status = t('statusDone', { t: fmtTime(saved.elapsed) });
  else if (saved?.path?.length) status = t('statusDoing');
  $('#nexus-status').textContent = `#${puzzleNumber(key)} · ${lvl.size}×${lvl.size} · ${status}`;
  $('#card-nexus').classList.toggle('done', !!saved?.solved);
  $('#card-practice').hidden = !saved?.solved;
  $('#practice-level').textContent = t('level', { l: store.get('practiceLevel', 0) + 1 });

  const st = getStats();
  $('#home-stats').innerHTML = `
    <div><b>${currentStreak(st)}</b><span>${t('streak')}</span></div>
    <div><b>${st.bestStreak}</b><span>${t('bestStreak')}</span></div>
    <div><b>${st.played}</b><span>${t('played')}</span></div>
    <div><b>${st.bestTime != null ? fmtTime(st.bestTime) : '–'}</b><span>${t('bestTime')}</span></div>`;
  show('home');
}

function openGame() {
  wallSet = new Set(S.p.walls);
  $('#g-title').textContent = S.mode === 'daily' ? `NEXUS #${S.num}` : `NEXUS · ${t('practice')}`;
  $('#g-sub').textContent = S.mode === 'daily'
    ? `${t('daily')} · ${S.p.n}×${S.p.n}`
    : `${t('level', { l: S.level + 1 })} · ${S.p.n}×${S.p.n}`;
  buildBoard();
  render();
  show('game');
  if (!store.get('seenRules', false)) openRules();
  if (S.solved) setTimeout(showResult, 250);
}

// --- Plancia ---
function buildBoard() {
  const { n, numbers, symbols } = S.p;
  const board = $('#board');
  board.style.setProperty('--n', n);
  board.innerHTML = `<svg class="path" viewBox="0 0 ${n} ${n}" aria-hidden="true">
    <g class="fills"></g><polyline class="line" points=""/><circle class="headdot" r="0.2" cx="-1" cy="-1"/></svg>`;
  cellEls = [];
  for (let i = 0; i < n * n; i++) {
    const el = document.createElement('div');
    el.className = 'cell';
    const c = i % n, r = Math.floor(i / n);
    if (c < n - 1 && wallSet.has(wallKey(i, i + 1))) el.classList.add('wr');
    if (r < n - 1 && wallSet.has(wallKey(i, i + n))) el.classList.add('wb');
    if (numbers[i] !== undefined) el.innerHTML = `<span class="num">${numbers[i]}</span>`;
    else if (symbols[i]) el.innerHTML = `<span class="sym sym-${symbols[i].toLowerCase()}"></span>`;
    board.appendChild(el);
    cellEls.push(el);
  }
}

function render() {
  const { n, numbers, maxNumber } = S.p;
  const inPath = new Set(S.path);
  const bad = symbolViolations(S.p, S.path);
  const head = S.path[S.path.length - 1];
  cellEls.forEach((el, i) => {
    el.classList.toggle('on', inPath.has(i));
    el.classList.toggle('bad', bad.has(i));
    el.classList.toggle('head', i === head);
  });
  const svg = $('#board svg');
  const pt = (i) => [i % n + 0.5, Math.floor(i / n) + 0.5];
  svg.querySelector('.fills').innerHTML = S.path.map((i) => `<rect x="${i % n}" y="${Math.floor(i / n)}" width="1" height="1"/>`).join('');
  svg.querySelector('.line').setAttribute('points', S.path.map((i) => pt(i).join(',')).join(' '));
  const hd = svg.querySelector('.headdot');
  if (head !== undefined) { const [x, y] = pt(head); hd.setAttribute('cx', x); hd.setAttribute('cy', y); } else { hd.setAttribute('cx', -1); }
  $('#board').classList.toggle('solved', S.solved);

  // Messaggio
  let msg = '';
  if (S.solved) msg = S.mode === 'daily' ? t('solvedTitle') : t('solvedPractice');
  else if (!S.path.length) msg = t('msgStart');
  else if (bad.size) msg = t('msgSymbol');
  else if (numbers[head] === maxNumber && S.path.length < n * n) msg = t('msgFillAll', { n: maxNumber });
  else if (S.path.length === n * n) { const r = validate(S.p, S.path); msg = r.error === 'symbol' ? t('msgSymbol') : t('msgEnd', { n: maxNumber }); }
  else msg = t('msgNext', { n: nextNumber(S.p, S.path) });
  $('#g-msg').textContent = msg;
  $('#g-timer').textContent = fmtTime(S.elapsed);
  ['#b-undo', '#b-reset', '#b-hint'].forEach((s) => { $(s).disabled = S.solved; });
}

function changed() {
  if (!S.solved && S.path.length === S.p.n * S.p.n && validate(S.p, S.path).ok) win();
  render();
  saveGame();
}

// --- Input a trascinamento ---
let dragging = false;

function cellFromEvent(e) {
  const rect = $('#board').getBoundingClientRect();
  const n = S.p.n;
  const c = Math.floor(((e.clientX - rect.left) / rect.width) * n);
  const r = Math.floor(((e.clientY - rect.top) / rect.height) * n);
  if (c < 0 || r < 0 || c >= n || r >= n) return -1;
  return r * n + c;
}

function stepTo(target) {
  const n = S.p.n;
  for (let guard = 0; guard < n * 2; guard++) {
    const head = S.path[S.path.length - 1];
    if (head === target || head === undefined) return;
    const prev = S.path[S.path.length - 2];
    if (target === prev) { S.path.pop(); return; }
    const hr = Math.floor(head / n), hc = head % n, tr = Math.floor(target / n), tc = target % n;
    const dr = Math.sign(tr - hr), dc = Math.sign(tc - hc);
    const options = Math.abs(tr - hr) >= Math.abs(tc - hc)
      ? [dr ? head + dr * n : null, dc ? head + dc : null]
      : [dc ? head + dc : null, dr ? head + dr * n : null];
    let moved = false;
    for (const nx of options) {
      if (nx == null || !adjacent(head, nx, n)) continue;
      if (nx === prev) { S.path.pop(); moved = true; break; }
      if (canEnter(S.p, S.path, nx, wallSet)) { S.path.push(nx); moved = true; break; }
    }
    if (!moved) return;
  }
}

function onDown(e) {
  if (!S || S.solved) return;
  const cell = cellFromEvent(e);
  if (cell < 0) return;
  e.preventDefault();
  const at = S.path.indexOf(cell);
  if (at >= 0) S.path.length = at + 1;
  else if (!S.path.length) {
    if (!canEnter(S.p, S.path, cell, wallSet)) { flash(t('msgStart')); return; }
    S.path.push(cell);
  } else stepTo(cell);
  dragging = true;
  $('#board').setPointerCapture?.(e.pointerId);
  changed();
}

function onMove(e) {
  if (!dragging || !S || S.solved) return;
  const cell = cellFromEvent(e);
  if (cell < 0 || cell === S.path[S.path.length - 1]) return;
  const before = S.path.length;
  stepTo(cell);
  if (S.path.length !== before) changed();
}

function onUp() { dragging = false; }

// --- Azioni ---
function undo() { if (S.path.length) { S.path.pop(); changed(); } }
function reset() { S.path = []; changed(); }
function hint() {
  S.path = hintPath(S.p, S.path);
  S.hints++;
  flash(t('hintUsed'));
  changed();
}

// --- Vittoria ---
function win() {
  S.solved = true;
  if (S.mode === 'daily') {
    const st = getStats();
    if (st.lastDate !== S.key) {
      st.streak = st.lastDate === yesterdayKey(S.key) ? st.streak + 1 : 1;
      st.bestStreak = Math.max(st.bestStreak, st.streak);
      st.played++;
      st.lastDate = S.key;
      if (st.bestTime == null || S.elapsed < st.bestTime) st.bestTime = Math.round(S.elapsed);
      store.set('stats', st);
    }
  } else {
    store.set('practiceLevel', S.level + 1);
  }
  navigator.vibrate?.(30);
  setTimeout(showResult, 450);
}

function shareText() {
  const head = S.mode === 'daily' ? t('shareHead', { n: S.num }) : t('sharePractice', { l: S.level + 1 });
  const lines = [head, `🧩 ${S.p.n}×${S.p.n} · ${t('shareLine', { t: fmtTime(S.elapsed), h: S.hints })}`];
  if (S.mode === 'daily') {
    const s = getStats().streak;
    lines.push(t('shareStreak', { s: `${s} ${s === 1 ? t('day') : t('days')}` }));
  }
  lines.push(APP_URL);
  return lines.join('\n');
}

let countdownTimer = null;
function showResult() {
  const dlg = $('#dlg-result');
  $('#r-title').textContent = S.mode === 'daily' ? `${t('solvedTitle')} · NEXUS #${S.num}` : t('solvedPractice');
  $('#r-time').textContent = fmtTime(S.elapsed);
  $('#r-hints').textContent = S.hints;
  const isDaily = S.mode === 'daily';
  $('#r-streak-box').hidden = !isDaily;
  if (isDaily) $('#r-streak').textContent = getStats().streak;
  $('#r-practice').textContent = isDaily ? t('practiceNext') : `${t('practiceNext')} · ${t('level', { l: store.get('practiceLevel', 0) + 1 })}`;
  $('#r-next-box').hidden = !isDaily;
  const tick = () => {
    const now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const s = Math.max(0, Math.floor((next - now) / 1000));
    $('#r-next').textContent = `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };
  tick(); clearInterval(countdownTimer); countdownTimer = setInterval(tick, 1000);
  if (!dlg.open) dlg.showModal();
}

async function share() {
  const text = shareText();
  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  copy();
}

async function copy() {
  const text = shareText();
  try { await navigator.clipboard.writeText(text); } catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
  flash(t('copied'));
}

function shareWhatsApp() { window.open('https://wa.me/?text=' + encodeURIComponent(shareText()), '_blank', 'noopener'); }
function shareLinkedIn() {
  copy(); // LinkedIn accetta solo il link: il testo resta negli appunti da incollare
  window.open('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(APP_URL), '_blank', 'noopener');
}

// --- Varie ---
let flashTimer = null;
function flash(msg, ms = 1800) {
  const el = $('#toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(flashTimer); flashTimer = setTimeout(() => el.classList.remove('show'), ms);
}

function openRules() {
  $('#rules-list').innerHTML = t('rules').map((r) => `<li>${r}</li>`).join('');
  $('#dlg-rules').showModal();
}

function refreshTexts() {
  applyI18n();
  $('#btn-lang').textContent = getLang() === 'it' ? 'EN' : 'IT';
  $('#privacy').textContent = t('privacy');
  if (!$('#view-game').hidden && S) openGame(); else renderHome();
}

// Cronometro: avanza solo con la pagina visibile e il gioco iniziato.
setInterval(() => {
  const now = performance.now();
  const dt = now - lastTick; lastTick = now;
  if (!S || S.solved || !S.path.length || document.hidden || $('#view-game').hidden) return;
  S.elapsed += Math.min(dt, 2000);
  $('#g-timer').textContent = fmtTime(S.elapsed);
  if (++saveCounter % 8 === 0) saveGame();
}, 250);
document.addEventListener('visibilitychange', () => { lastTick = performance.now(); if (document.hidden) saveGame(); });

// --- Installazione ---
let installEvent = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; });
window.addEventListener('appinstalled', () => { installEvent = null; $('#btn-install').hidden = true; });

async function install() {
  if (installEvent) {
    installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') $('#btn-install').hidden = true;
    installEvent = null;
    return;
  }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  flash(t(ios ? 'installIos' : 'installHelp'), 6000);
}

// --- Avvio ---
function init() {
  initLang(store.get('lang', null));
  applyI18n();
  $('#btn-lang').textContent = getLang() === 'it' ? 'EN' : 'IT';
  $('#privacy').textContent = t('privacy');

  $('#card-nexus').addEventListener('click', startDaily);
  $('#card-practice').addEventListener('click', startPractice);
  $('#btn-install').hidden = isStandalone();
  $('#btn-install').addEventListener('click', install);
  $('#btn-home').addEventListener('click', () => { saveGame(); renderHome(); });
  $('#btn-help').addEventListener('click', openRules);
  $('#btn-lang').addEventListener('click', () => { setLang(getLang() === 'it' ? 'en' : 'it'); store.set('lang', getLang()); refreshTexts(); });
  $('#rules-ok').addEventListener('click', () => { store.set('seenRules', true); $('#dlg-rules').close(); });

  const board = $('#board');
  board.addEventListener('pointerdown', onDown);
  board.addEventListener('pointermove', onMove);
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => board.addEventListener(ev, onUp));

  $('#b-undo').addEventListener('click', undo);
  $('#b-reset').addEventListener('click', reset);
  $('#b-hint').addEventListener('click', hint);

  $('#r-share').addEventListener('click', share);
  $('#r-wa').addEventListener('click', shareWhatsApp);
  $('#r-li').addEventListener('click', shareLinkedIn);
  $('#r-copy').addEventListener('click', copy);
  $('#r-practice').addEventListener('click', () => { $('#dlg-result').close(); startPractice(); });
  $('#r-close').addEventListener('click', () => $('#dlg-result').close());
  $('#dlg-result').addEventListener('close', () => clearInterval(countdownTimer));

  // A mezzanotte la home si aggiorna da sola.
  let dayKey = localDateKey();
  setInterval(() => { const k = localDateKey(); if (k !== dayKey) { dayKey = k; if (!$('#view-home').hidden) renderHome(); } }, 30000);

  renderHome();

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

init();

import { localDateKey, puzzleNumber } from './nexus.js';
import { t, initLang, setLang, getLang, applyI18n } from './i18n.js';
import * as nexus from './games/nexus-ui.js';
import * as matrix from './games/matrix-ui.js';
import * as deduco from './games/deduco-ui.js';

const GAMES = [nexus, matrix, deduco];
const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
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

// --- Statistiche (serie = giorni consecutivi con almeno una sfida risolta) ---
function getDays() {
  let days = store.get('days', null);
  if (!days) {
    days = {};
    const old = store.get('stats', null); // versione 1: solo NEXUS
    if (old?.lastDate) {
      let k = old.lastDate;
      for (let i = 0; i < (old.streak || 1); i++) { days[k] = 1; k = yesterdayKey(k); }
      store.set('solvedCount', old.played || 0);
      store.set('bestStreak', old.bestStreak || 0);
      if (old.bestTime != null) store.set('best:nexus', old.bestTime);
    }
    store.set('days', days);
  }
  return days;
}
function currentStreak() {
  const days = getDays();
  let k = localDateKey();
  if (!days[k]) k = yesterdayKey(k);
  let s = 0;
  while (days[k]) { s++; k = yesterdayKey(k); }
  return s;
}

function loadSaved(id, key) {
  let s = store.get(`g:${id}:${key}`, null);
  if (!s && id === 'nexus') {
    const o = store.get('nexus:' + key, null);
    if (o) s = { g: { path: o.path || [] }, hints: o.hints || 0, mistakes: 0, elapsed: o.elapsed || 0, solved: !!o.solved, started: !!o.path?.length };
  }
  return s;
}

const practiceLevel = (id) => store.get('practice:' + id, id === 'nexus' ? store.get('practiceLevel', 0) : 0);

// --- Partita ---
let S = null;
let ctrl = null;
let lastTick = performance.now();
let saveCounter = 0;

function startGame(id, mode) {
  const mod = byId[id];
  const now = new Date();
  const key = localDateKey(now);
  if (mode === 'daily') {
    const saved = loadSaved(id, key);
    S = {
      id, mod, mode, key, num: puzzleNumber(key), puzzle: mod.daily(key, now),
      g: saved?.g ?? null, hints: saved?.hints || 0, mistakes: saved?.mistakes || 0,
      elapsed: saved?.elapsed || 0, solved: !!saved?.solved, started: !!saved?.started,
    };
  } else {
    const level = practiceLevel(id);
    S = { id, mod, mode, key, level, puzzle: mod.practice(level), g: null, hints: 0, mistakes: 0, elapsed: 0, solved: false, started: false };
  }
  openGame(true);
}

function persist() {
  if (!S || S.mode !== 'daily') return;
  store.set(`g:${S.id}:${S.key}`, { g: S.g, hints: S.hints, mistakes: S.mistakes, elapsed: Math.round(S.elapsed), solved: S.solved, started: S.started });
}

function openGame(first = false) {
  const { mod } = S;
  $('#g-title').textContent = S.mode === 'daily' ? `${mod.name} #${S.num}` : `${mod.name} · ${t('practice')}`;
  $('#g-sub').textContent = S.mode === 'daily'
    ? `${t('daily')} · ${mod.label(S.puzzle, t)}`
    : `${t('level', { l: S.level + 1 })} · ${mod.label(S.puzzle, t)}`;
  const stage = $('#stage');
  stage.className = `stage stage-${mod.id}`;
  if (mod.startsOnOpen && !S.solved) S.started = true;
  const ctx = {
    root: stage, puzzle: S.puzzle, saved: S.g, t,
    save(g) { S.g = g; persist(); },
    start() { if (!S.started) { S.started = true; persist(); } },
    hint() { S.hints++; persist(); flash(t('hintUsed')); },
    mistake() { S.mistakes++; persist(); },
    win: winGame,
    msg(text) { $('#g-msg').textContent = text; },
    flash,
    solved: () => S.solved,
  };
  ctrl = mod.mount(ctx);
  renderControls();
  $('#g-timer').textContent = fmtTime(S.elapsed);
  show('game');
  if (first && !store.get('seenRules:' + mod.id, mod.id === 'nexus' && store.get('seenRules', false))) openRules(mod.id);
  if (first && S.solved) setTimeout(showResult, 250);
}

function renderControls() {
  const box = $('#controls');
  box.innerHTML = '';
  box.style.gridTemplateColumns = `repeat(${ctrl.controls.length}, 1fr)`;
  for (const c of ctrl.controls) {
    const b = document.createElement('button');
    b.className = c.primary ? 'primary' : '';
    b.innerHTML = `<span aria-hidden="true">${c.icon}</span> ${t(c.label)}`;
    b.disabled = S.solved;
    b.addEventListener('click', c.fn);
    box.appendChild(b);
  }
}

function winGame() {
  if (S.solved) return;
  S.solved = true;
  if (S.mode === 'daily') {
    const days = getDays();
    days[S.key] = (days[S.key] || 0) + 1;
    store.set('days', days);
    store.set('solvedCount', store.get('solvedCount', 0) + 1);
    store.set('bestStreak', Math.max(store.get('bestStreak', 0), currentStreak()));
    const best = store.get('best:' + S.id, null);
    if (best == null || S.elapsed < best) store.set('best:' + S.id, Math.round(S.elapsed));
  } else {
    store.set('practice:' + S.id, S.level + 1);
  }
  persist();
  $('#controls').querySelectorAll('button').forEach((b) => { b.disabled = true; });
  navigator.vibrate?.(30);
  setTimeout(showResult, 500);
}

function shareText() {
  const { mod } = S;
  const head = S.mode === 'daily'
    ? `Pezzali MIND · ${mod.name} #${S.num}`
    : `Pezzali MIND · ${mod.name} (${t('sharePractice')}, ${t('level', { l: S.level + 1 })})`;
  let line = `${mod.shareLine(S.puzzle, S.g, t)}\n⏱️ ${fmtTime(S.elapsed)} · 💡 ${S.hints}`;
  if (mod.hasMistakes) line += ` · ❌ ${S.mistakes}`;
  const lines = [head, line];
  if (S.mode === 'daily') {
    const s = currentStreak();
    lines.push(t('shareStreak', { s: `${s} ${s === 1 ? t('day') : t('days')}` }));
  }
  lines.push(APP_URL);
  return lines.join('\n');
}

let countdownTimer = null;
function nextUnsolved() {
  const key = localDateKey();
  return GAMES.find((g) => g.id !== S.id && !loadSaved(g.id, key)?.solved);
}

function showResult() {
  const dlg = $('#dlg-result');
  const isDaily = S.mode === 'daily';
  $('#r-title').textContent = isDaily ? `${t('solvedTitle')} · ${S.mod.name} #${S.num}` : t('solvedPractice');
  $('#r-time').textContent = fmtTime(S.elapsed);
  $('#r-hints').textContent = S.hints;
  $('#r-mistakes-box').hidden = !S.mod.hasMistakes;
  $('#r-mistakes').textContent = S.mistakes;
  $('#r-streak-box').hidden = !isDaily;
  $('#r-streak').textContent = currentStreak();
  $('.r-stats').style.gridTemplateColumns = `repeat(${2 + (S.mod.hasMistakes ? 1 : 0) + (isDaily ? 1 : 0)}, 1fr)`;
  const nx = isDaily ? nextUnsolved() : null;
  $('#r-nextgame').hidden = !nx;
  if (nx) { $('#r-nextgame').textContent = t('playNext', { g: nx.name }); $('#r-nextgame').dataset.id = nx.id; }
  $('#r-practice').textContent = `${t('practiceNext')} · ${t('level', { l: practiceLevel(S.id) + 1 })}`;
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

// --- Home ---
function show(view) {
  $('#view-home').hidden = view !== 'home';
  $('#view-game').hidden = view !== 'game';
  window.scrollTo(0, 0);
}

function renderHome() {
  const now = new Date();
  const key = localDateKey(now);
  $('#home-date').textContent = now.toLocaleDateString(getLang() === 'it' ? 'it-IT' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  let doneToday = 0;
  $('#games').innerHTML = GAMES.map((mod) => {
    const saved = loadSaved(mod.id, key);
    if (saved?.solved) doneToday++;
    let status = t('statusTodo');
    if (saved?.solved) status = t('statusDone', { t: fmtTime(saved.elapsed) });
    else if (saved?.started) status = t('statusDoing');
    let label = '';
    try { label = mod.label(mod.daily(key, now), t); } catch { /* ignora */ }
    return `<div class="game-card ${saved?.solved ? 'done' : ''}">
      <button class="gc-main" data-play="${mod.id}">
        <span class="gc-icon gc-${mod.id}" aria-hidden="true"></span>
        <span class="gc-body">
          <span class="gc-name">${mod.name}</span>
          <span class="gc-desc">${t(mod.id + 'Desc')}</span>
          <span class="gc-status">#${puzzleNumber(key)} · ${label} · ${status}</span>
        </span>
        <span class="gc-go" aria-hidden="true">${saved?.solved ? '✓' : '›'}</span>
      </button>
      ${saved?.solved ? `<button class="gc-practice" data-practice="${mod.id}">∞ ${t('practiceNext')} · ${t('level', { l: practiceLevel(mod.id) + 1 })}</button>` : ''}
    </div>`;
  }).join('');
  $('#games').querySelectorAll('[data-play]').forEach((b) => b.addEventListener('click', () => startGame(b.dataset.play, 'daily')));
  $('#games').querySelectorAll('[data-practice]').forEach((b) => b.addEventListener('click', () => startGame(b.dataset.practice, 'practice')));

  $('#home-stats').innerHTML = `
    <div><b>${currentStreak()}</b><span>${t('streak')}</span></div>
    <div><b>${store.get('bestStreak', 0)}</b><span>${t('bestStreak')}</span></div>
    <div><b>${store.get('solvedCount', 0)}</b><span>${t('solvedTotal')}</span></div>
    <div><b>${doneToday}/${GAMES.length}</b><span>${t('today')}</span></div>`;
  show('home');
}

// --- Varie ---
let flashTimer = null;
function flash(msg, ms = 1800) {
  const el = $('#toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(flashTimer); flashTimer = setTimeout(() => el.classList.remove('show'), ms);
}

function openRules(id) {
  const ids = id ? [id] : GAMES.map((g) => g.id);
  $('#rules-body').innerHTML = ids.map((gid) => `
    <h3>${t('rulesTitle', { g: byId[gid].name })}</h3>
    <ol>${t('rules_' + gid).map((r) => `<li>${r}</li>`).join('')}</ol>`).join('');
  $('#rules-ok').dataset.ids = ids.join(',');
  $('#dlg-rules').showModal();
}

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
  flash(t(/iphone|ipad|ipod/i.test(navigator.userAgent) ? 'installIos' : 'installHelp'), 6000);
}

function refreshTexts() {
  applyI18n();
  $('#btn-lang').textContent = getLang() === 'it' ? 'EN' : 'IT';
  $('#privacy').textContent = t('privacy');
  if (!$('#view-game').hidden && S) openGame(false); else renderHome();
}

// Cronometro: avanza solo con la pagina visibile e il gioco iniziato.
setInterval(() => {
  const now = performance.now();
  const dt = now - lastTick; lastTick = now;
  if (!S || S.solved || !S.started || document.hidden || $('#view-game').hidden) return;
  S.elapsed += Math.min(dt, 2000);
  $('#g-timer').textContent = fmtTime(S.elapsed);
  if (++saveCounter % 8 === 0) persist();
}, 250);
document.addEventListener('visibilitychange', () => { lastTick = performance.now(); if (document.hidden) persist(); });

// --- Avvio ---
function init() {
  initLang(store.get('lang', null));
  applyI18n();
  $('#btn-lang').textContent = getLang() === 'it' ? 'EN' : 'IT';
  $('#privacy').textContent = t('privacy');

  $('#btn-install').hidden = isStandalone();
  $('#btn-install').addEventListener('click', install);
  $('#btn-home').addEventListener('click', () => { persist(); renderHome(); });
  $('#btn-help').addEventListener('click', () => openRules($('#view-game').hidden ? null : S?.id));
  $('#btn-lang').addEventListener('click', () => { setLang(getLang() === 'it' ? 'en' : 'it'); store.set('lang', getLang()); refreshTexts(); });
  $('#rules-ok').addEventListener('click', () => {
    ($('#rules-ok').dataset.ids || '').split(',').filter(Boolean).forEach((id) => store.set('seenRules:' + id, true));
    $('#dlg-rules').close();
  });

  $('#r-share').addEventListener('click', share);
  $('#r-wa').addEventListener('click', shareWhatsApp);
  $('#r-li').addEventListener('click', shareLinkedIn);
  $('#r-copy').addEventListener('click', copy);
  $('#r-practice').addEventListener('click', () => { $('#dlg-result').close(); startGame(S.id, 'practice'); });
  $('#r-nextgame').addEventListener('click', (e) => { $('#dlg-result').close(); startGame(e.currentTarget.dataset.id, 'daily'); });
  $('#r-close').addEventListener('click', () => $('#dlg-result').close());
  $('#dlg-result').addEventListener('close', () => clearInterval(countdownTimer));

  let dayKey = localDateKey();
  setInterval(() => { const k = localDateKey(); if (k !== dayKey) { dayKey = k; if (!$('#view-home').hidden) renderHome(); } }, 30000);

  renderHome();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

init();

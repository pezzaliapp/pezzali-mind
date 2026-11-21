import {
  generate, validate, dailyConfig, practiceConfig, canEnter, symbolViolations, hintPath,
  nextNumber, adjacent, wallKey, GEN_VERSION,
} from '../nexus.js';

export const id = 'nexus';
export const name = 'NEXUS';
export const startsOnOpen = false;
export const hasMistakes = false;

export function daily(key, date) { return generate(`nexus-${GEN_VERSION}:${key}`, dailyConfig(date)); }
export function practice(level) { return generate(`practice:${Date.now()}:${Math.random()}`, practiceConfig(level)); }
export function label(p) { return `${p.n}×${p.n}`; }
export function shareLine(p) { return `🧩 ${p.n}×${p.n}`; }

export function mount(ctx) {
  const { root, puzzle: p, t } = ctx;
  const { n, numbers, symbols, maxNumber } = p;
  let path = ctx.saved?.path ? ctx.saved.path.slice() : [];
  if (path.length) ctx.start();
  const wallSet = new Set(p.walls);

  root.innerHTML = '<div class="board-wrap"><div class="board" id="board"></div></div>';
  const board = root.querySelector('#board');
  board.style.setProperty('--n', n);
  board.innerHTML = `<svg class="path" viewBox="0 0 ${n} ${n}" aria-hidden="true">
    <g class="fills"></g><polyline class="line" points=""/><circle class="headdot" r="0.2" cx="-1" cy="-1"/></svg>`;
  const cellEls = [];
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

  function render() {
    const solved = ctx.solved();
    const inPath = new Set(path);
    const bad = symbolViolations(p, path);
    const head = path[path.length - 1];
    cellEls.forEach((el, i) => {
      el.classList.toggle('on', inPath.has(i));
      el.classList.toggle('bad', bad.has(i));
    });
    const svg = board.querySelector('svg');
    const pt = (i) => [i % n + 0.5, Math.floor(i / n) + 0.5];
    svg.querySelector('.fills').innerHTML = path.map((i) => `<rect x="${i % n}" y="${Math.floor(i / n)}" width="1" height="1"/>`).join('');
    svg.querySelector('.line').setAttribute('points', path.map((i) => pt(i).join(',')).join(' '));
    const hd = svg.querySelector('.headdot');
    if (head !== undefined) { const [x, y] = pt(head); hd.setAttribute('cx', x); hd.setAttribute('cy', y); } else hd.setAttribute('cx', -1);
    board.classList.toggle('solved', solved);

    let msg;
    if (solved) msg = t('solvedTitle');
    else if (!path.length) msg = t('msgStart');
    else if (bad.size) msg = t('msgSymbol');
    else if (numbers[head] === maxNumber && path.length < n * n) msg = t('msgFillAll', { n: maxNumber });
    else if (path.length === n * n) msg = validate(p, path).error === 'symbol' ? t('msgSymbol') : t('msgEnd', { n: maxNumber });
    else msg = t('msgNext', { n: nextNumber(p, path) });
    ctx.msg(msg);
  }

  function changed() {
    if (path.length) ctx.start();
    ctx.save({ path });
    if (!ctx.solved() && path.length === n * n && validate(p, path).ok) ctx.win();
    render();
  }

  // Trascinamento
  let dragging = false;
  const cellFromEvent = (e) => {
    const rect = board.getBoundingClientRect();
    const c = Math.floor(((e.clientX - rect.left) / rect.width) * n);
    const r = Math.floor(((e.clientY - rect.top) / rect.height) * n);
    return c < 0 || r < 0 || c >= n || r >= n ? -1 : r * n + c;
  };
  function stepTo(target) {
    for (let guard = 0; guard < n * 2; guard++) {
      const head = path[path.length - 1];
      if (head === target || head === undefined) return;
      const prev = path[path.length - 2];
      if (target === prev) { path.pop(); return; }
      const hr = Math.floor(head / n), hc = head % n, tr = Math.floor(target / n), tc = target % n;
      const dr = Math.sign(tr - hr), dc = Math.sign(tc - hc);
      const options = Math.abs(tr - hr) >= Math.abs(tc - hc)
        ? [dr ? head + dr * n : null, dc ? head + dc : null]
        : [dc ? head + dc : null, dr ? head + dr * n : null];
      let moved = false;
      for (const nx of options) {
        if (nx == null || !adjacent(head, nx, n)) continue;
        if (nx === prev) { path.pop(); moved = true; break; }
        if (canEnter(p, path, nx, wallSet)) { path.push(nx); moved = true; break; }
      }
      if (!moved) return;
    }
  }
  board.addEventListener('pointerdown', (e) => {
    if (ctx.solved()) return;
    const cell = cellFromEvent(e);
    if (cell < 0) return;
    e.preventDefault();
    const at = path.indexOf(cell);
    if (at >= 0) path.length = at + 1;
    else if (!path.length) {
      if (!canEnter(p, path, cell, wallSet)) { ctx.flash(t('msgStart')); return; }
      path.push(cell);
    } else stepTo(cell);
    dragging = true;
    board.setPointerCapture?.(e.pointerId);
    changed();
  });
  board.addEventListener('pointermove', (e) => {
    if (!dragging || ctx.solved()) return;
    const cell = cellFromEvent(e);
    if (cell < 0 || cell === path[path.length - 1]) return;
    const before = path.length;
    stepTo(cell);
    if (path.length !== before) changed();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => board.addEventListener(ev, () => { dragging = false; }));

  render();
  return {
    refresh: render,
    controls: [
      { icon: '↶', label: 'undo', fn: () => { if (path.length) { path.pop(); changed(); } } },
      { icon: '⟲', label: 'reset', fn: () => { path = []; changed(); } },
      { icon: '💡', label: 'hint', fn: () => { path = hintPath(p, path); ctx.hint(); changed(); } },
    ],
  };
}

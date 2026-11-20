// NEXUS — generatore e validatore dei puzzle.
// Regole: percorso unico che passa da TUTTE le caselle una sola volta,
// si muove in orizzontale/verticale, tocca i numeri in ordine (1 → ultimo),
// non attraversa i muri, va DRITTO sui cerchi vuoti (○) e CURVA sui pieni (●).

export const EPOCH = Date.UTC(2026, 10, 20); // 20 novembre 2026 = NEXUS #1
export const GEN_VERSION = 'v1';

// --- RNG deterministico (stesso seme = stesso puzzle per tutti) ---
function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFromString(s) { return mulberry32(hashString(s)); }

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// --- Geometria della griglia ---
export function neighbors(i, n) {
  const r = Math.floor(i / n), c = i % n, out = [];
  if (r > 0) out.push(i - n);
  if (r < n - 1) out.push(i + n);
  if (c > 0) out.push(i - 1);
  if (c < n - 1) out.push(i + 1);
  return out;
}

export function adjacent(a, b, n) {
  const ra = Math.floor(a / n), ca = a % n, rb = Math.floor(b / n), cb = b % n;
  return (ra === rb && Math.abs(ca - cb) === 1) || (ca === cb && Math.abs(ra - rb) === 1);
}

export function wallKey(a, b) { return a < b ? `${a}-${b}` : `${b}-${a}`; }

export function isTurn(a, b, c) { return (b - a) !== (c - b); }

// --- Percorso hamiltoniano casuale (algoritmo "backbite") ---
function zigzag(n) {
  const p = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) p.push(r * n + (r % 2 ? n - 1 - c : c));
  return p;
}

function backbite(path, n, rng, steps) {
  let p = path.slice();
  for (let s = 0; s < steps; s++) {
    if (rng() < 0.5) p.reverse();
    const nb = neighbors(p[0], n);
    const x = nb[Math.floor(rng() * nb.length)];
    const i = p.indexOf(x);
    if (i <= 1) continue;
    p = p.slice(0, i).reverse().concat(p.slice(i));
  }
  return p;
}

// --- Difficoltà ---
// Lunedì facile, domenica la più impegnativa.
const WEEK = {
  1: { size: 5, numbers: 6, symbols: 3, walls: 2, level: 1 },
  2: { size: 5, numbers: 5, symbols: 4, walls: 3, level: 2 },
  3: { size: 6, numbers: 7, symbols: 4, walls: 3, level: 3 },
  4: { size: 6, numbers: 6, symbols: 5, walls: 4, level: 4 },
  5: { size: 6, numbers: 5, symbols: 6, walls: 5, level: 5 },
  6: { size: 7, numbers: 7, symbols: 6, walls: 5, level: 6 },
  0: { size: 7, numbers: 6, symbols: 8, walls: 6, level: 7 },
};

export function dailyConfig(date = new Date()) { return { ...WEEK[date.getDay()] }; }

export function practiceConfig(level) {
  const tiers = [1, 2, 3, 4, 5, 6, 0].map((d) => WEEK[d]);
  const base = tiers[Math.min(level, tiers.length - 1)];
  const extra = Math.max(0, level - (tiers.length - 1));
  return { ...base, symbols: base.symbols + Math.min(extra, 6), walls: base.walls + Math.min(extra, 4), level: level + 1 };
}

// --- Date ---
export function localDateKey(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function puzzleNumber(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.max(1, Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86400000) + 1);
}

// --- Generatore ---
export function generate(seed, cfg) {
  const rng = rngFromString(seed);
  const n = cfg.size, L = n * n, k = cfg.numbers;
  const path = backbite(zigzag(n), n, rng, L * 40);

  // Numeri lungo il percorso: il primo all'inizio, l'ultimo alla fine.
  const idx = [0];
  const seg = (L - 1) / (k - 1);
  for (let j = 1; j < k - 1; j++) {
    let v = Math.round(j * seg + (rng() - 0.5) * seg * 0.6);
    v = Math.max(idx[idx.length - 1] + 2, Math.min(L - 1 - 2 * (k - 1 - j), v));
    idx.push(v);
  }
  idx.push(L - 1);
  const numbers = {};
  const numberedPos = new Set(idx);
  idx.forEach((v, j) => { numbers[path[v]] = j + 1; });

  // Cerchi: ○ dritto, ● curva (presi dalla soluzione di riferimento).
  const turns = [], straights = [];
  for (let t = 1; t < L - 1; t++) {
    if (numberedPos.has(t)) continue;
    (isTurn(path[t - 1], path[t], path[t + 1]) ? turns : straights).push(path[t]);
  }
  shuffle(turns, rng); shuffle(straights, rng);
  const symbols = {};
  let wantT = Math.ceil(cfg.symbols / 2), wantS = cfg.symbols - wantT;
  if (straights.length < wantS) { wantT += wantS - straights.length; wantS = straights.length; }
  if (turns.length < wantT) { wantS = Math.min(straights.length, wantS + wantT - turns.length); wantT = turns.length; }
  turns.slice(0, wantT).forEach((c) => { symbols[c] = 'T'; });
  straights.slice(0, wantS).forEach((c) => { symbols[c] = 'S'; });

  // Muri: solo tra caselle che la soluzione non collega.
  const used = new Set();
  for (let t = 1; t < L; t++) used.add(wallKey(path[t - 1], path[t]));
  const cand = [];
  for (let i = 0; i < L; i++) {
    if (i % n < n - 1 && !used.has(wallKey(i, i + 1))) cand.push(wallKey(i, i + 1));
    if (i + n < L && !used.has(wallKey(i, i + n))) cand.push(wallKey(i, i + n));
  }
  const walls = shuffle(cand, rng).slice(0, cfg.walls);

  return { seed, n, numbers, maxNumber: k, symbols, walls, solution: path, level: cfg.level };
}

// --- Regole ---
export function canEnter(p, path, cell, wallSet) {
  if (path.length === 0) return p.numbers[cell] === 1;
  const last = path[path.length - 1];
  if (path.includes(cell)) return false;
  if (!adjacent(last, cell, p.n)) return false;
  if (wallSet.has(wallKey(last, cell))) return false;
  if (p.numbers[last] === p.maxNumber) return false; // l'ultimo numero chiude il percorso
  const num = p.numbers[cell];
  if (num !== undefined && num !== nextNumber(p, path)) return false;
  return true;
}

export function nextNumber(p, path) {
  let expect = 1;
  for (const c of path) if (p.numbers[c] === expect) expect++;
  return expect;
}

// Celle con cerchio violato (già determinabili dal percorso parziale).
export function symbolViolations(p, path) {
  const bad = new Set();
  for (let i = 1; i < path.length - 1; i++) {
    const s = p.symbols[path[i]];
    if (!s) continue;
    const turn = isTurn(path[i - 1], path[i], path[i + 1]);
    if ((s === 'T') !== turn) bad.add(path[i]);
  }
  return bad;
}

export function validate(p, path) {
  const n = p.n, L = n * n, walls = new Set(p.walls);
  if (path.length !== L) return { ok: false, error: 'length' };
  const seen = new Set();
  let expect = 1;
  for (let i = 0; i < L; i++) {
    const c = path[i];
    if (c < 0 || c >= L || seen.has(c)) return { ok: false, error: 'repeat' };
    seen.add(c);
    if (i > 0) {
      if (!adjacent(path[i - 1], c, n)) return { ok: false, error: 'adjacent' };
      if (walls.has(wallKey(path[i - 1], c))) return { ok: false, error: 'wall' };
    }
    const num = p.numbers[c];
    if (i === 0 && num !== 1) return { ok: false, error: 'start' };
    if (num !== undefined) {
      if (num !== expect) return { ok: false, error: 'order' };
      expect++;
    }
  }
  if (p.numbers[path[L - 1]] !== p.maxNumber) return { ok: false, error: 'end' };
  if (symbolViolations(p, path).size) return { ok: false, error: 'symbol' };
  return { ok: true };
}

// Suggerimento: tiene la parte corretta del percorso e aggiunge un passo.
export function hintPath(p, path) {
  const sol = p.solution;
  let k = 0;
  while (k < path.length && path[k] === sol[k]) k++;
  return sol.slice(0, Math.min(sol.length, k + 1));
}

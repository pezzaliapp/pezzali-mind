// DEDUCO — chi ha quale animale e chi beve cosa?
// Pochi indizi, una sola soluzione (verificata provando tutte le combinazioni).
import { rngFromString } from './nexus.js';

export const DEDUCO_VERSION = 'v1';
export const PEOPLE = ['Anna', 'Marco', 'Sara', 'Luca'];
export const ANIMALS = ['cat', 'dog', 'fish', 'parrot'];
export const ANIMAL_EMOJI = { cat: '🐱', dog: '🐶', fish: '🐟', parrot: '🦜' };
export const DRINKS = ['coffee', 'tea', 'juice', 'milk'];
export const DRINK_EMOJI = { coffee: '☕', tea: '🍵', juice: '🧃', milk: '🥛' };

function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function permutations(n) {
  const out = [];
  const rec = (arr, rest) => {
    if (!rest.length) { out.push(arr); return; }
    rest.forEach((x, i) => rec([...arr, x], rest.filter((_, j) => j !== i)));
  };
  rec([], [...Array(n).keys()]);
  return out;
}

// A[p] = animale della persona p, D[p] = bevanda della persona p.
export function clueHolds(c, A, D) {
  switch (c.t) {
    case 'PA': return A[c.p] === c.a;
    case 'NA': return A[c.p] !== c.a;
    case 'PD': return D[c.p] === c.d;
    case 'ND': return D[c.p] !== c.d;
    case 'L': return D[A.indexOf(c.a)] === c.d;
    case 'NL': return D[A.indexOf(c.a)] !== c.d;
    default: return false;
  }
}

export function countSolutions(n, clues, limit = 2) {
  const P = permutations(n);
  let count = 0;
  for (const A of P) for (const D of P) {
    if (clues.every((c) => clueHolds(c, A, D)) && ++count >= limit) return count;
  }
  return count;
}

export function makeDeduco(rng, cfg) {
  const { n, clues: k, maxPos } = cfg;
  const people = shuffle(PEOPLE.slice(), rng).slice(0, n);
  const animals = shuffle(ANIMALS.slice(), rng).slice(0, n);
  const drinks = shuffle(DRINKS.slice(), rng).slice(0, n);
  const A = shuffle([...Array(n).keys()], rng);
  const D = shuffle([...Array(n).keys()], rng);

  const pool = [];
  for (let p = 0; p < n; p++) for (let x = 0; x < n; x++) {
    pool.push(A[p] === x ? { t: 'PA', p, a: x } : { t: 'NA', p, a: x });
    pool.push(D[p] === x ? { t: 'PD', p, d: x } : { t: 'ND', p, d: x });
  }
  for (let a = 0; a < n; a++) for (let d = 0; d < n; d++)
    pool.push(D[A.indexOf(a)] === d ? { t: 'L', a, d } : { t: 'NL', a, d });

  const P = permutations(n);
  const all = [];
  for (const a of P) for (const d of P) all.push([a, d]);
  const solve = (cl) => { let c = 0; for (const [a, d] of all) if (cl.every((x) => clueHolds(x, a, d)) && ++c > 1) break; return c; };

  let fallback = null;
  for (let attempt = 0; attempt < 6000; attempt++) {
    const chosen = [];
    const order = shuffle(pool.slice(), rng);
    let pos = 0, links = 0;
    for (const c of order) {
      if (chosen.length === k) break;
      if (c.t === 'PA' || c.t === 'PD') { if (pos >= maxPos) continue; pos++; }
      if (c.t === 'L') { if (links >= 2) continue; links++; }
      chosen.push(c);
    }
    if (solve(chosen) !== 1) continue;
    const minimal = chosen.every((_, i) => solve(chosen.filter((__, j) => j !== i)) > 1);
    if (minimal) return { n, people, animals, drinks, clues: chosen, solution: { A, D } };
    if (!fallback) fallback = chosen;
  }
  if (fallback) return { n, people, animals, drinks, clues: fallback, solution: { A, D } };
  // Ultima risorsa: indizi positivi diretti finché la soluzione è unica.
  const chosen = [];
  for (let p = 0; p < n && solve(chosen) !== 1; p++) { chosen.push({ t: 'PA', p, a: A[p] }); if (solve(chosen) !== 1) chosen.push({ t: 'PD', p, d: D[p] }); }
  return { n, people, animals, drinks, clues: shuffle(chosen, rng), solution: { A, D } };
}

const WEEK = {
  1: { n: 3, clues: 4, maxPos: 1, level: 1 },
  2: { n: 3, clues: 5, maxPos: 1, level: 2 },
  3: { n: 3, clues: 5, maxPos: 0, level: 3 },
  4: { n: 4, clues: 7, maxPos: 2, level: 4 },
  5: { n: 4, clues: 7, maxPos: 2, level: 5 },
  6: { n: 4, clues: 8, maxPos: 1, level: 6 },
  0: { n: 4, clues: 8, maxPos: 1, level: 7 },
};

export function deducoDailyConfig(date = new Date()) { return { ...WEEK[date.getDay()] }; }
export function deducoPracticeConfig(level) {
  const tiers = [1, 2, 3, 4, 5, 6, 0].map((d) => WEEK[d]);
  return { ...tiers[Math.min(level, tiers.length - 1)], level: level + 1 };
}

export function generateDeduco(seed, cfg) { return { ...makeDeduco(rngFromString(seed), cfg), level: cfg.level }; }

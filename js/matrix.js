// MATRIX — matrici 3×3 in stile "matrici progressive".
// Ogni attributo (forma, colore, quantità, riempimento) segue una regola sulle righe/colonne.
// Il giocatore sceglie la casella mancante tra 6 opzioni.
import { rngFromString } from './nexus.js';

export const MATRIX_VERSION = 'v1';
export const SHAPES = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star'];
export const COLORS = ['#4f46e5', '#e11d48', '#059669', '#d97706'];
export const FILLS = ['solid', 'outline', 'striped'];
export const ATTRS = ['shape', 'color', 'count', 'fill'];

function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const pick = (rng, arr, k) => shuffle(arr.slice(), rng).slice(0, k);
const key = (o) => `${o.shape}|${o.color}|${o.count}|${o.fill}`;

export function makeMatrix(rng, level) {
  const values = {
    shape: pick(rng, SHAPES, 3),
    color: pick(rng, [0, 1, 2, 3], 3),
    count: [1, 2, 3],
    fill: pick(rng, FILLS, 3),
  };
  const activeN = [2, 2, 2, 3, 3, 4][Math.min(level, 5)];
  const active = pick(rng, ATTRS, activeN);
  const rules = {};
  for (const a of ATTRS) {
    if (!active.includes(a)) { rules[a] = { type: 'global', v: Math.floor(rng() * 3) }; continue; }
    const types = a === 'count' ? ['row', 'col', 'dist', 'prog'] : ['row', 'col', 'dist'];
    const easy = level <= 1 ? ['row', 'col'] : types;
    rules[a] = { type: easy[Math.floor(rng() * easy.length)], p: shuffle([0, 1, 2], rng), s: rng() < 0.5 ? 1 : 2, rev: rng() < 0.5 };
  }
  // Dal livello 3 almeno una regola "a distribuzione" o "progressione".
  if (level >= 3 && !active.some((a) => ['dist', 'prog'].includes(rules[a].type))) rules[active[0]].type = 'dist';
  // Al livello 1-2 evita che tutte le regole siano dello stesso tipo riga+riga (troppo banale) solo se possibile.
  const idx = (a, r, c) => {
    const R = rules[a];
    switch (R.type) {
      case 'global': return R.v;
      case 'row': return R.p[r];
      case 'col': return R.p[c];
      case 'dist': return R.p[(c + R.s * r) % 3];
      case 'prog': return R.rev ? 2 - c : c;
      default: return 0;
    }
  };
  const cells = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      cells.push(Object.fromEntries(ATTRS.map((a) => [a, values[a][idx(a, r, c)]])));
  const answer = cells[8];

  // Opzioni sbagliate: cambiano 1 o 2 attributi rispetto alla risposta.
  const alt = (a) => values[a].filter((v) => v !== answer[a]);
  const singles = [], doubles = [], extra = [];
  for (const a of active) for (const v of alt(a)) singles.push({ ...answer, [a]: v });
  for (let i = 0; i < active.length; i++)
    for (let j = i + 1; j < active.length; j++)
      for (const v1 of alt(active[i])) for (const v2 of alt(active[j])) doubles.push({ ...answer, [active[i]]: v1, [active[j]]: v2 });
  for (const a of ATTRS) if (!active.includes(a)) for (const v of alt(a)) extra.push({ ...answer, [a]: v });
  const seen = new Set([key(answer)]);
  const wrong = [];
  for (const o of [...shuffle(singles, rng), ...shuffle(doubles, rng), ...shuffle(extra, rng)]) {
    if (wrong.length === 5) break;
    if (!seen.has(key(o))) { seen.add(key(o)); wrong.push(o); }
  }
  const options = shuffle([answer, ...wrong], rng);
  const correct = options.findIndex((o) => key(o) === key(answer));
  const explain = active.map((a) => ({ attr: a, type: rules[a].type, rev: !!rules[a].rev }));
  return { cells: cells.slice(0, 8), answer, options, correct, explain, level };
}

export function matrixDailyLevels(date = new Date()) {
  const a = { 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 0: 4 }[date.getDay()];
  return [a, a, a + 1, a + 1, Math.min(5, a + 2)];
}

export function generateMatrixSet(seed, levels) {
  const rng = rngFromString(seed);
  return levels.map((l) => makeMatrix(rng, l));
}

export function matrixKey(o) { return key(o); }

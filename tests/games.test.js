import assert from 'node:assert/strict';
import { localDateKey } from '../js/nexus.js';
import { generateMatrixSet, matrixDailyLevels, matrixKey, makeMatrix, MATRIX_VERSION } from '../js/matrix.js';
import { generateDeduco, deducoDailyConfig, deducoPracticeConfig, countSolutions, clueHolds, DEDUCO_VERSION } from '../js/deduco.js';

const start = new Date(2026, 10, 20);
let stats = { minimal: 0, clues: {}, ms: 0 };
for (let d = 0; d < 400; d++) {
  const date = new Date(start); date.setDate(start.getDate() + d);
  const key = localDateKey(date);
  // MATRIX
  const set = generateMatrixSet(`matrix-${MATRIX_VERSION}:${key}`, matrixDailyLevels(date));
  assert.equal(set.length, 5);
  for (const m of set) {
    assert.equal(m.options.length, 6, key);
    assert.equal(new Set(m.options.map(matrixKey)).size, 6, key);
    assert.equal(matrixKey(m.options[m.correct]), matrixKey(m.answer));
    assert.ok(m.explain.length >= 2);
  }
  // DEDUCO
  const t0 = Date.now();
  const cfg = deducoDailyConfig(date);
  const p = generateDeduco(`deduco-${DEDUCO_VERSION}:${key}`, cfg);
  stats.ms = Math.max(stats.ms, Date.now() - t0);
  assert.equal(countSolutions(p.n, p.clues), 1, key);
  assert.ok(p.clues.filter((c) => c.t === 'PA' || c.t === 'PD').length <= cfg.maxPos, key + ' indizi troppo diretti');
  assert.ok(p.clues.every((c) => clueHolds(c, p.solution.A, p.solution.D)));
  const minimal = p.clues.every((_, i) => countSolutions(p.n, p.clues.filter((__, j) => j !== i)) > 1);
  if (minimal) stats.minimal++;
  const k = `${p.n}p/${p.clues.length}`; stats.clues[k] = (stats.clues[k] || 0) + 1;
}
for (let l = 0; l < 10; l++) assert.equal(countSolutions(generateDeduco('x' + l, deducoPracticeConfig(l)).n, generateDeduco('x' + l, deducoPracticeConfig(l)).clues), 1);
console.log('OK MATRIX e DEDUCO', stats);

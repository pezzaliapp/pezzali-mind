import { generate, validate, dailyConfig, practiceConfig, localDateKey, puzzleNumber, hintPath, canEnter, GEN_VERSION } from '../js/nexus.js';
import assert from 'node:assert/strict';

let count = 0;
const start = new Date(2026, 10, 20);
for (let d = 0; d < 400; d++) {
  const date = new Date(start); date.setDate(start.getDate() + d);
  const key = localDateKey(date);
  const p = generate(`nexus-${GEN_VERSION}:${key}`, dailyConfig(date));
  const r = validate(p, p.solution);
  assert.ok(r.ok, `${key}: ${r.error}`);
  assert.equal(Object.keys(p.numbers).length, p.maxNumber);
  // la soluzione deve essere percorribile con le regole di input
  const walls = new Set(p.walls); const path = [];
  for (const c of p.solution) { assert.ok(canEnter(p, path, c, walls), `${key}: canEnter`); path.push(c); }
  // i suggerimenti portano sempre alla soluzione
  let h = [];
  for (let i = 0; i < p.solution.length; i++) h = hintPath(p, h);
  assert.ok(validate(p, h).ok);
  count++;
}
// determinismo
const a = generate('nexus-v1:2026-11-21', dailyConfig(new Date(2026, 10, 21)));
const b = generate('nexus-v1:2026-11-21', dailyConfig(new Date(2026, 10, 21)));
assert.deepEqual(a, b);
for (let l = 0; l < 15; l++) assert.ok(validate(generate('p' + l, practiceConfig(l)), generate('p' + l, practiceConfig(l)).solution).ok);
assert.equal(puzzleNumber('2026-11-20'), 1);
assert.equal(puzzleNumber('2026-12-01'), 12);
console.log(`OK: ${count} puzzle giornalieri validi`);

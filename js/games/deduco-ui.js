import { generateDeduco, deducoDailyConfig, deducoPracticeConfig, ANIMALS, DRINKS, ANIMAL_EMOJI, DRINK_EMOJI, DEDUCO_VERSION } from '../deduco.js';

export const id = 'deduco';
export const name = 'DEDUCO';
export const startsOnOpen = true;
export const hasMistakes = true;

export function daily(key, date) { return generateDeduco(`deduco-${DEDUCO_VERSION}:${key}`, deducoDailyConfig(date)); }
export function practice(level) { return generateDeduco(`dpractice:${Date.now()}:${Math.random()}`, deducoPracticeConfig(level)); }
export function label(p, t) { return t('people', { n: p.n }); }
export function shareLine(p, g, t) { return `🧠 ${t('people', { n: p.n })} · 🔎 ${p.clues.length}`; }

export function mount(ctx) {
  const { root, puzzle: p, t } = ctx;
  const { n, people, animals, drinks, solution } = p;
  const g = ctx.saved ? structuredClone(ctx.saved) : { A: Array(n).fill(-1), D: Array(n).fill(-1), struck: [], locked: [] };

  const animalName = (a) => `${t('an_' + animals[a])} ${ANIMAL_EMOJI[animals[a]]}`;
  const drinkName = (d) => `${t('dr_' + drinks[d])} ${DRINK_EMOJI[drinks[d]]}`;
  function clueText(c) {
    const s = t('cl_' + c.t, { p: `<b>${people[c.p] ?? ''}</b>`, a: c.a !== undefined ? animalName(c.a) : '', d: c.d !== undefined ? drinkName(c.d) : '' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function render() {
    const solved = ctx.solved();
    const clues = p.clues.map((c, k) => `<li class="${g.struck.includes(k) ? 'struck' : ''}" data-k="${k}">${clueText(c)}</li>`).join('');
    const rows = people.map((name, pi) => {
      const chips = (cat, list, emoji) => list.map((item, x) => {
        const mine = g[cat][pi] === x;
        const taken = !mine && g[cat].includes(x);
        const locked = g.locked.includes(`${cat}${pi}`) && mine;
        return `<button class="chip ${mine ? 'sel' : ''} ${taken ? 'taken' : ''} ${locked ? 'locked' : ''}" data-cat="${cat}" data-p="${pi}" data-x="${x}" aria-label="${item}">${emoji[item]}</button>`;
      }).join('');
      return `<div class="dd-row"><div class="dd-name">${name}</div>
        <div class="dd-chips">${chips('A', animals, ANIMAL_EMOJI)}</div>
        <div class="dd-chips">${chips('D', drinks, DRINK_EMOJI)}</div></div>`;
    }).join('');
    root.innerHTML = `<div class="dd ${solved ? 'solved' : ''}">
      <h4 class="dd-title">${t('deducoClues')}</h4><ol class="dd-clues">${clues}</ol>
      <div class="dd-grid" style="--n:${n}">${rows}</div></div>`;
    root.querySelectorAll('.dd-clues li').forEach((li) => li.addEventListener('click', () => {
      const k = Number(li.dataset.k);
      g.struck = g.struck.includes(k) ? g.struck.filter((x) => x !== k) : [...g.struck, k];
      ctx.save(g); render();
    }));
    root.querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => pickChip(b.dataset.cat, Number(b.dataset.p), Number(b.dataset.x))));
    ctx.msg(solved ? t('solvedTitle') : t('deducoAsk'));
  }

  function assign(cat, pi, x) {
    for (let q = 0; q < n; q++) if (q !== pi && g[cat][q] === x) {
      if (g.locked.includes(`${cat}${q}`)) return false;
      g[cat][q] = -1;
    }
    g[cat][pi] = x;
    return true;
  }

  function pickChip(cat, pi, x) {
    if (ctx.solved() || g.locked.includes(`${cat}${pi}`)) return;
    if (g[cat][pi] === x) g[cat][pi] = -1;
    else if (!assign(cat, pi, x)) return;
    ctx.save(g); render();
  }

  function check() {
    if (ctx.solved()) return;
    if (g.A.includes(-1) || g.D.includes(-1)) { ctx.flash(t('deducoFill')); return; }
    const ok = g.A.every((v, i) => v === solution.A[i]) && g.D.every((v, i) => v === solution.D[i]);
    if (ok) { ctx.save(g); ctx.win(); render(); }
    else { ctx.mistake(); ctx.flash(t('deducoWrong')); root.querySelector('.dd-grid')?.classList.add('shake'); setTimeout(render, 400); }
  }

  function hint() {
    if (ctx.solved()) return;
    for (let pi = 0; pi < n; pi++) for (const cat of ['A', 'D']) {
      const want = solution[cat][pi];
      if (g[cat][pi] !== want) {
        for (let q = 0; q < n; q++) if (g[cat][q] === want) g[cat][q] = -1;
        g[cat][pi] = want;
        g.locked.push(`${cat}${pi}`);
        ctx.hint(); ctx.save(g); render();
        return;
      }
    }
  }

  function clear() {
    for (const cat of ['A', 'D']) for (let pi = 0; pi < n; pi++) if (!g.locked.includes(`${cat}${pi}`)) g[cat][pi] = -1;
    g.struck = [];
    ctx.save(g); render();
  }

  render();
  return {
    refresh: render,
    controls: [
      { icon: '⟲', label: 'clear', fn: clear },
      { icon: '💡', label: 'hint', fn: hint },
      { icon: '✓', label: 'check', fn: check, primary: true },
    ],
  };
}

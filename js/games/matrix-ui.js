import { generateMatrixSet, matrixDailyLevels, COLORS, MATRIX_VERSION } from '../matrix.js';

export const id = 'matrix';
export const name = 'MATRIX';
export const startsOnOpen = true;
export const hasMistakes = true;

export function daily(key, date) { return { items: generateMatrixSet(`matrix-${MATRIX_VERSION}:${key}`, matrixDailyLevels(date)) }; }
export function practice(level) {
  const a = Math.min(5, 1 + Math.floor(level / 2)), b = Math.min(5, a + 1);
  return { items: generateMatrixSet(`mpractice:${Date.now()}:${Math.random()}`, [a, a, b, b, b]) };
}
export function label(p, t) { return t('matrixCount', { n: p.items.length }); }
export function shareLine(p, g) {
  return p.items.map((_, i) => { const w = g?.wrong?.[i]?.length || 0; return w === 0 ? '🟩' : w === 1 ? '🟨' : '🟥'; }).join('');
}

// --- Disegno delle figure ---
function ensurePatterns() {
  if (document.getElementById('mx-defs')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'mx-defs';
  svg.setAttribute('width', 0); svg.setAttribute('height', 0);
  svg.style.position = 'absolute';
  svg.innerHTML = `<defs>${COLORS.map((c, i) => `<pattern id="mx-st-${i}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4.5" height="9" fill="${c}"/></pattern>`).join('')}</defs>`;
  document.body.appendChild(svg);
}

function poly(cx, cy, r, k, rot = -90, inner = null) {
  const pts = [];
  const tot = inner ? k * 2 : k;
  for (let i = 0; i < tot; i++) {
    const rr = inner && i % 2 ? r * inner : r;
    const a = ((rot + (360 / tot) * i) * Math.PI) / 180;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

function shapeEl(shape, cx, cy, r, attrs) {
  switch (shape) {
    case 'circle': return `<circle cx="${cx}" cy="${cy}" r="${r * 0.9}" ${attrs}/>`;
    case 'square': return `<rect x="${cx - r * 0.8}" y="${cy - r * 0.8}" width="${r * 1.6}" height="${r * 1.6}" rx="${r * 0.12}" ${attrs}/>`;
    case 'triangle': return `<polygon points="${poly(cx, cy + r * 0.12, r * 1.05, 3)}" ${attrs}/>`;
    case 'diamond': return `<polygon points="${poly(cx, cy, r, 4)}" ${attrs}/>`;
    case 'hexagon': return `<polygon points="${poly(cx, cy, r * 0.95, 6, 0)}" ${attrs}/>`;
    case 'star': return `<polygon points="${poly(cx, cy + r * 0.06, r * 1.05, 5, -90, 0.46)}" ${attrs}/>`;
    default: return '';
  }
}

const POS = {
  1: [[50, 50, 27]],
  2: [[29, 50, 18], [71, 50, 18]],
  3: [[50, 29, 16], [29, 70, 16], [71, 70, 16]],
};

export function figureSVG(o) {
  const col = COLORS[o.color];
  const attrs = o.fill === 'solid' ? `fill="${col}" stroke="${col}" stroke-width="3" stroke-linejoin="round"`
    : o.fill === 'outline' ? `fill="none" stroke="${col}" stroke-width="5.5" stroke-linejoin="round"`
      : `fill="url(#mx-st-${o.color})" stroke="${col}" stroke-width="4" stroke-linejoin="round"`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${POS[o.count].map(([x, y, r]) => shapeEl(o.shape, x, y, r, attrs)).join('')}</svg>`;
}

// --- Gioco ---
export function mount(ctx) {
  const { root, puzzle, t } = ctx;
  const items = puzzle.items;
  ensurePatterns();
  const g = ctx.saved ? structuredClone(ctx.saved) : { i: 0, answered: false, wrong: items.map(() => []), elim: items.map(() => []) };

  function ruleText(e) {
    const r = e.type === 'prog' ? (e.rev ? 'rule_prog_down' : 'rule_prog_up') : `rule_${e.type}`;
    return `<li><b>${t('attr_' + e.attr)}:</b> ${t(r)}</li>`;
  }

  function render() {
    const solved = ctx.solved();
    const i = Math.min(g.i, items.length - 1);
    const m = items[i];
    const showAnswer = g.answered || solved;
    const dots = items.map((_, k) => {
      const cls = k < g.i || (k === g.i && showAnswer) ? (g.wrong[k].length ? 'dot warn' : 'dot ok') : k === g.i ? 'dot cur' : 'dot';
      return `<span class="${cls}"></span>`;
    }).join('');
    const grid = m.cells.map((c) => `<div class="mx-cell">${figureSVG(c)}</div>`).join('')
      + `<div class="mx-cell mx-q ${showAnswer ? 'mx-done' : ''}">${showAnswer ? figureSVG(m.answer) : '<span>?</span>'}</div>`;
    let bottom;
    if (showAnswer) {
      bottom = `<div class="mx-explain"><p>${t('matrixRight')}</p><ul>${m.explain.map(ruleText).join('')}</ul>
        ${!solved && g.i < items.length - 1 ? `<button class="primary wide" id="mx-next">${t('matrixNext')}</button>` : ''}</div>`;
    } else {
      bottom = `<div class="mx-options">${m.options.map((o, k) => {
        const gone = g.wrong[i].includes(k) || g.elim[i].includes(k);
        return `<button class="mx-opt ${gone ? 'gone' : ''}" data-k="${k}" ${gone ? 'disabled' : ''}>${figureSVG(o)}</button>`;
      }).join('')}</div>`;
    }
    root.innerHTML = `<div class="mx"><div class="mx-dots">${dots}</div><div class="mx-grid">${grid}</div>${bottom}</div>`;
    root.querySelectorAll('.mx-opt').forEach((b) => b.addEventListener('click', () => choose(Number(b.dataset.k), b)));
    root.querySelector('#mx-next')?.addEventListener('click', () => { g.i++; g.answered = false; ctx.save(g); render(); });
    ctx.msg(solved ? t('solvedTitle') : showAnswer ? '' : t('matrixAsk', { i: i + 1, n: items.length }));
  }

  function choose(k, btn) {
    if (ctx.solved() || g.answered) return;
    const m = items[g.i];
    if (k === m.correct) {
      g.answered = true;
      ctx.save(g);
      if (g.i === items.length - 1) ctx.win();
      render();
    } else {
      g.wrong[g.i].push(k);
      ctx.mistake();
      ctx.save(g);
      btn.classList.add('shake');
      ctx.flash(t('matrixWrong'));
      setTimeout(render, 380);
    }
  }

  function hint() {
    if (g.answered) return;
    const m = items[g.i];
    const left = m.options.map((_, k) => k).filter((k) => k !== m.correct && !g.wrong[g.i].includes(k) && !g.elim[g.i].includes(k));
    if (left.length <= 1) return;
    g.elim[g.i].push(left[Math.floor(Math.random() * left.length)]);
    ctx.hint();
    ctx.save(g);
    render();
  }

  render();
  return { refresh: render, controls: [{ icon: '💡', label: 'hint', fn: hint }] };
}

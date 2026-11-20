const STRINGS = {
  it: {
    tagline: 'Una sfida al giorno. Pochi minuti. Uguale per tutti.',
    nexusDesc: 'Collega tutte le caselle con un unico percorso.',
    matrixDesc: 'Completa la matrice scoprendo la regola nascosta.',
    deducoDesc: 'Cinque indizi, una sola soluzione.',
    soon: 'In arrivo',
    play: 'Gioca',
    statusTodo: 'Sfida di oggi da giocare',
    statusDoing: 'In corso',
    statusDone: 'Completata in {t}',
    streak: 'Serie',
    bestStreak: 'Record serie',
    played: 'Giocate',
    bestTime: 'Miglior tempo',
    days: 'giorni',
    day: 'giorno',
    undo: 'Annulla',
    reset: 'Ricomincia',
    hint: 'Indizio',
    level: 'Livello {l}',
    practice: 'Allenamento',
    practiceNext: 'Allenamento libero',
    practiceDesc: 'Difficoltà crescente, senza limiti. Non conta per la serie.',
    daily: 'Sfida del giorno',
    msgStart: 'Tocca l’1 e trascina il dito.',
    msgNext: 'Prossimo numero: {n}',
    msgEnd: 'Il percorso deve finire sul {n}.',
    msgSymbol: 'Quasi! Controlla i cerchi in rosso.',
    msgFillAll: 'Hai raggiunto il {n}: ora passa da tutte le caselle.',
    hintUsed: 'Indizio usato',
    solvedTitle: 'Risolto!',
    solvedPractice: 'Allenamento completato',
    time: 'Tempo',
    hints: 'Indizi',
    share: 'Condividi',
    copy: 'Copia',
    copied: 'Risultato copiato',
    next: 'Prossima sfida tra',
    close: 'Chiudi',
    home: 'Home',
    rulesTitle: 'Come si gioca a NEXUS',
    rules: [
      'Disegna <b>un unico percorso</b> che passa da <b>tutte le caselle</b>, una sola volta.',
      'Parti dall’<b>1</b> e tocca i numeri <b>in ordine</b>. Il percorso finisce sull’ultimo numero.',
      'Ti muovi solo in orizzontale e in verticale. Non puoi attraversare i <b>muri</b>.',
      '<span class="leg leg-s"></span> Sul cerchio vuoto vai <b>dritto</b>.',
      '<span class="leg leg-t"></span> Sul cerchio pieno <b>giri</b>.',
      'Per tornare indietro, tocca una casella già percorsa.',
    ],
    rulesOk: 'Iniziamo',
    shareHead: 'Pezzali MIND · NEXUS #{n}',
    sharePractice: 'Pezzali MIND · NEXUS allenamento, livello {l}',
    shareLine: '⏱️ {t} · 💡 {h}',
    shareStreak: '🔥 Serie: {s}',
    privacy: 'Nessun account, nessuna pubblicità, nessun tracciamento. I tuoi dati restano sul dispositivo.',
    install: 'Installa l’app',
  },
  en: {
    tagline: 'One challenge a day. A few minutes. The same for everyone.',
    nexusDesc: 'Connect every cell with a single path.',
    matrixDesc: 'Complete the matrix by finding the hidden rule.',
    deducoDesc: 'Five clues, one solution.',
    soon: 'Coming soon',
    play: 'Play',
    statusTodo: 'Today’s challenge is waiting',
    statusDoing: 'In progress',
    statusDone: 'Solved in {t}',
    streak: 'Streak',
    bestStreak: 'Best streak',
    played: 'Played',
    bestTime: 'Best time',
    days: 'days',
    day: 'day',
    undo: 'Undo',
    reset: 'Restart',
    hint: 'Hint',
    level: 'Level {l}',
    practice: 'Practice',
    practiceNext: 'Free practice',
    practiceDesc: 'Rising difficulty, no limits. Doesn’t count toward your streak.',
    daily: 'Daily challenge',
    msgStart: 'Tap 1 and drag your finger.',
    msgNext: 'Next number: {n}',
    msgEnd: 'The path must end on {n}.',
    msgSymbol: 'Almost! Check the circles in red.',
    msgFillAll: 'You reached {n}: now cover every cell.',
    hintUsed: 'Hint used',
    solvedTitle: 'Solved!',
    solvedPractice: 'Practice complete',
    time: 'Time',
    hints: 'Hints',
    share: 'Share',
    copy: 'Copy',
    copied: 'Result copied',
    next: 'Next challenge in',
    close: 'Close',
    home: 'Home',
    rulesTitle: 'How to play NEXUS',
    rules: [
      'Draw <b>one single path</b> through <b>every cell</b>, exactly once.',
      'Start at <b>1</b> and visit the numbers <b>in order</b>. The path ends on the last number.',
      'Move only horizontally and vertically. You can’t cross <b>walls</b>.',
      '<span class="leg leg-s"></span> On an empty circle, go <b>straight</b>.',
      '<span class="leg leg-t"></span> On a filled circle, <b>turn</b>.',
      'To go back, tap a cell you already passed.',
    ],
    rulesOk: 'Let’s go',
    shareHead: 'Pezzali MIND · NEXUS #{n}',
    sharePractice: 'Pezzali MIND · NEXUS practice, level {l}',
    shareLine: '⏱️ {t} · 💡 {h}',
    shareStreak: '🔥 Streak: {s}',
    privacy: 'No account, no ads, no tracking. Your data stays on your device.',
    install: 'Install the app',
  },
};

let lang = 'it';

export function initLang(saved) {
  if (saved && STRINGS[saved]) lang = saved;
  else lang = (navigator.language || 'it').toLowerCase().startsWith('it') ? 'it' : 'en';
  document.documentElement.lang = lang;
  return lang;
}

export function setLang(l) { lang = STRINGS[l] ? l : 'it'; document.documentElement.lang = lang; }
export function getLang() { return lang; }

export function t(key, vars = {}) {
  const s = STRINGS[lang][key] ?? STRINGS.it[key] ?? key;
  if (typeof s !== 'string') return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}

export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
}

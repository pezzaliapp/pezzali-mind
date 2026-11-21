# Pezzali MIND

Una sfida di logica al giorno, uguale per tutti. PWA statica, offline, senza account, pubblicità o tracciamento.

**Gioca:** https://pezzaliapp.github.io/pezzali-mind/

## Giochi
- **NEXUS**: un unico percorso che passa da tutte le caselle, tocca i numeri in ordine, non attraversa i muri, va dritto sui cerchi vuoti ○ e curva sui cerchi pieni ●.
- **MATRIX**: 5 matrici 3×3 al giorno; forma, colore, quantità e riempimento seguono regole su righe e colonne. Si sceglie la figura mancante tra 6 opzioni, poi si vedono le regole.
- **DEDUCO**: chi ha quale animale e chi beve cosa? Pochi indizi, una sola soluzione (verificata provando tutte le combinazioni).

## Come funziona
- Il puzzle del giorno è generato dalla data (seme deterministico): stesso puzzle per tutti, nessun server.
- Difficoltà settimanale: lunedì facile (5×5), domenica la più difficile (7×7).
- Dopo la sfida del giorno si sblocca l'allenamento libero a difficoltà crescente.
- Statistiche, serie e partita in corso restano nel `localStorage` del dispositivo.
- Ogni soluzione valida viene accettata (si controllano le regole, non una soluzione fissa).

## Struttura
```
index.html            pagina unica
css/style.css         stile (chiaro/scuro automatico)
js/nexus.js           NEXUS: generatore, regole, validatore
js/matrix.js          MATRIX: generatore delle matrici
js/deduco.js          DEDUCO: generatore e risolutore
js/games/*-ui.js      interfaccia di ogni gioco
js/app.js             home, cronometro, statistiche, condivisione
js/i18n.js            italiano / inglese
sw.js                 cache offline
manifest.webmanifest  installazione come app
tests/*.test.js       verificano 400 giorni di puzzle (npm test)
```

## Pubblicare un aggiornamento
1. Modifica i file e lancia `npm test`.
2. In `sw.js` incrementa `CACHE` (es. `mind-v2`) così i telefoni scaricano la nuova versione.
3. Commit e push su `main`: GitHub Pages aggiorna il sito in un minuto.

> Non cambiare un generatore senza aumentarne la versione (`GEN_VERSION`, `MATRIX_VERSION`, `DEDUCO_VERSION`): cambierebbero i puzzle già giocati.

## Statistiche di visita (facoltativo)
Cloudflare Web Analytics è gratuito e senza cookie: crea il sito su Cloudflare e incolla lo snippet nel punto indicato in `index.html`.

# Pezzali MIND

Una sfida di logica al giorno, uguale per tutti. PWA statica, offline, senza account, pubblicità o tracciamento.

**Gioca:** https://pezzaliapp.github.io/pezzali-mind/

## Giochi
- **NEXUS** (attivo): un unico percorso che passa da tutte le caselle, tocca i numeri in ordine, non attraversa i muri, va dritto sui cerchi vuoti ○ e curva sui cerchi pieni ●.
- **MATRIX**, **DEDUCO**: in arrivo.

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
js/nexus.js           generatore, regole, validatore
js/app.js             interfaccia, input, statistiche, condivisione
js/i18n.js            italiano / inglese
sw.js                 cache offline
manifest.webmanifest  installazione come app
tests/nexus.test.js   verifica 400 giorni di puzzle (npm test)
```

## Pubblicare un aggiornamento
1. Modifica i file e lancia `npm test`.
2. In `sw.js` incrementa `CACHE` (es. `mind-v2`) così i telefoni scaricano la nuova versione.
3. Commit e push su `main`: GitHub Pages aggiorna il sito in un minuto.

> Non cambiare il generatore in `js/nexus.js` senza aumentare `GEN_VERSION`: cambierebbero i puzzle già giocati.

## Statistiche di visita (facoltativo)
Cloudflare Web Analytics è gratuito e senza cookie: crea il sito su Cloudflare e incolla lo snippet nel punto indicato in `index.html`.

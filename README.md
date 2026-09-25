# Sito Sfera Rappresentanze

Sito di **Sfera Rappresentanze S.a.s.** — agenzia di rappresentanze per serramenti, schermature
e porte in Abruzzo e nelle Marche.

- Pubblicato con GitHub Pages su https://www.sferarappresentanze.it
- Dominio registrato su Register.it, DNS: CNAME `www` → GitHub Pages
- Statico, nessuna build, nessun servizio esterno (carattere e three.js ospitati qui, 0 cookie)

## Sito completo — PUBBLICO dal 25/09/2026

Nato come bozza nascosta in `anteprima-k7q2/` (24/09), promosso a home il 25/09 su decisione di Leo.

- File: `index.html` (contenuti), `privacy.html` (informativa art. 13 GDPR, data 25/09/2026),
  `sito.css`, `sito.js` (scene 3D Three.js: finestra che si apre sul Gran Sasso, campionario 3D
  con un campione per marchio; movimento ridotto rispettato; senza WebGL resta leggibile),
  `loghi/`, `campioni/`, `risorse/` (font, three, logo). `robots.txt` + `sitemap.xml`.
- `anteprima-k7q2/` resta solo come **rimando** alla home e alla privacy (link già condivisi).
- Contenuti dei sei marchi presi dai loro siti ufficiali il 24/09/2026. Loghi e sezione Biemme
  pubblicati **senza ok scritto dei marchi** (scelta di Leo, 25/09: da agente è prassi).
- Numero clienti tolto (decisione Leo 25/09): la voce dice «Rivenditori, serramentisti e imprese».
- Se si aggiungono Analytics, mappe o video di terzi → serve il banner con consenso cookie.

## Sezioni reali nel campionario 3D (dal 24/09/2026)

`strumenti/vettorizza_sezione.py` trasforma un disegno tecnico di sezione (immagine) in forme in
millimetri per il campionario 3D (`anteprima-k7q2/campioni/*.json`). Usato per la Biemme Inversa.
Per un disegno nuovo vanno adattati: percorso dell'immagine, riquadro della sezione (`X0..Y1`),
quote di riferimento per la scala (qui 71 x 80 mm) e le zone delle linee di quota da togliere.
Metodo: materiali dal colore delle linee; metallo/aria con il conteggio pari-dispari dei bordi
(profili disegnati a linea singola) e la regola delle pareti sottili (telaio a doppia linea);
controllo visivo sovrapponendo la ricostruzione all'originale. Richiede `opencv-python-headless`.

## Logo «sfera-finestra» (dal 25/09/2026)

Scelto da Leo tra 4 proposte: cerchio con montante e traverso, un vetro color rovere (#B5803C),
telaio antracite (#2F3438) su fondo chiaro o carta (#F7F6F3) su fondo scuro. Scritta in Archivo
(SFERA 700, RAPPRESENTANZE 500, spaziate come la testata del sito).

- `risorse/logo/sfera-simbolo.svg` — icona del browser (si schiarisce da sola col tema scuro)
- `risorse/logo/sfera-logo*.svg` — logo completo: colori, negativo, nero (timbro/fax); scritta in
  tracciati, quindi identico anche dove Archivo non c'è
- `risorse/logo/png/` — firma email (`sfera-firma-email.png`, da mostrare a 220 px), logo 1200 px,
  simbolo 512, icone app 180/192/512 con fondo carta
- Rigenerare: `python strumenti/genera_logo.py` poi `python strumenti/esporta_logo_png.py`
  (serve `fonttools` + `brotli` e Playwright)
- Nel sito il simbolo è **in linea** nell'HTML (telaio = `currentColor`, segue il colore della
  barra). Misura: su PC simbolo 44 px e SFERA 25 px; sotto i 720 px resta 26/16 (andava già bene).
- Lo stesso simbolo è nel gestionale (`templates/_sfera_simbolo.html`, icone PWA, favicon).

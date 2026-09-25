# Sito Sfera Rappresentanze

Home page provvisoria di **Sfera Rappresentanze S.a.s.** — agenzia di rappresentanze
per serramenti e infissi in Abruzzo.

- Pubblicato con GitHub Pages su https://www.sferarappresentanze.it
- Dominio registrato su Register.it, DNS: CNAME `www` → GitHub Pages
- Pagina statica singola (`index.html`), nessuna build, nessuna dipendenza server

Il sito completo è in preparazione; questa pagina fa da presenza ufficiale nel frattempo.

## Bozza del sito completo (24/09/2026)

Cartella `anteprima-k7q2/` → https://www.sferarappresentanze.it/anteprima-k7q2/

- Pagina **non collegata** dalla home ed esclusa dai motori (`noindex`). Il repo è pubblico:
  la pagina è nascosta, non segreta.
- File: `index.html` (contenuti), `sito.css` (stile, stessa identità della home), `sito.js`
  (scene 3D con Three.js da jsDelivr: finestra che si apre sul Gran Sasso, campionario 3D
  con un campione per marchio; movimento ridotto rispettato; senza WebGL resta leggibile).
- Contenuti dei sei marchi presi dai loro siti ufficiali il 24/09/2026.
- Da confermare prima di renderla pubblica: numero clienti, servizi, loghi ufficiali.
- Per pubblicarla davvero: spostarne il contenuto nella home (o linkarla) e togliere il `noindex`.

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

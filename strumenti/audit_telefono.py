"""Audit dell'impaginazione su telefono (rete di sicurezza: lanciarlo prima e dopo ogni modifica).

Uso:   python strumenti/audit_telefono.py <cartella_uscita>
Prova home e privacy su 9 larghezze (280-430 px; 280/300 simulano il testo ingrandito
dalle impostazioni del telefono) e segnala: parole spezzate su due righe, elementi fuori
schermo, testo tagliato, aree di tocco sotto i 40 px, titoli con una parola sola in fondo.
Nota: i titoli grandi divisi riga per riga (.riga-rivela) hanno l'ultima parola sola PER
SCELTA di disegno: quelle segnalazioni si ignorano. Nato il 25/09/2026 (mail che andava a capo).
"""
import sys, os, mimetypes, json
from playwright.sync_api import sync_playwright
out=sys.argv[1]; ROOT=r"C:/Users/leona/Dropbox/ProgrammaSferagemini/SitoSferaRappresentanze"
mimetypes.add_type("text/javascript",".js"); mimetypes.add_type("image/svg+xml",".svg"); mimetypes.add_type("application/json",".json"); mimetypes.add_type("font/woff2",".woff2")
def servi(route):
    path=route.request.url.split("sito.test/",1)[1].split("?")[0].split("#")[0] or "index.html"
    f=os.path.join(ROOT,path); ok=os.path.isfile(f)
    route.fulfill(status=200 if ok else 404, body=open(f,"rb").read() if ok else b"", content_type=mimetypes.guess_type(f)[0] or "application/octet-stream")
JS = r"""() => {
  const W = innerWidth, res = {spezzate: [], fuori: [], tagliati: [], piccoli: [], vedove: []};
  const desc = el => { let s = el.tagName.toLowerCase(); if (el.className && typeof el.className==='string') s += '.' + el.className.trim().split(/\s+/)[0]; return s; };
  const visibile = el => { const cs = getComputedStyle(el); return cs.display!=='none' && cs.visibility!=='hidden' && el.getClientRects().length; };
  // 1) parole spezzate su due righe
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = tw.nextNode())) {
    const el = n.parentElement; if (!el || !visibile(el) || el.closest('[aria-hidden=true], .sr-solo, script, style, option')) continue;
    const t = n.textContent; const re = /\S+/g; let m;
    while ((m = re.exec(t))) {
      const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length);
      const tops = new Set([...r.getClientRects()].filter(q => q.width > 0).map(q => Math.round(q.top)));
      if (tops.size > 1) res.spezzate.push(desc(el) + ': «' + m[0] + '»');
    }
  }
  for (const el of document.querySelectorAll('body *')) {
    if (!visibile(el) || el.closest('[aria-hidden=true], .sr-solo')) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    // 2) fuori dallo schermo (esclusi i contenitori fissi della cornice)
    if ((r.right > W + 1 || r.left < -1) && r.width > 0 && cs.position !== 'fixed') {
      let p = el.parentElement, clip = false;
      while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o !== 'visible') { clip = true; break; } p = p.parentElement; }
      if (!clip) res.fuori.push(desc(el) + ' ' + Math.round(r.left) + '→' + Math.round(r.right));
    }
    // 3) testo tagliato
    if ((cs.overflowX === 'hidden' || cs.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1 && el.innerText && el.innerText.trim() && el.children.length === 0)
      res.tagliati.push(desc(el) + ': ' + el.innerText.slice(0, 40));
    // 4) bersagli di tocco piccoli
    if (el.matches('a, button, select, input, textarea, summary') && r.height > 0 && (r.height < 40 || r.width < 40) && !el.closest('p, li, footer span'))
      res.piccoli.push(desc(el) + ' «' + (el.innerText || el.name || '').trim().slice(0, 25) + '» ' + Math.round(r.width) + 'x' + Math.round(r.height));
  }
  // 5) titoli e frasi-chiave con una parola sola sull'ultima riga
  for (const el of document.querySelectorAll('h1, h2, h3, .introduzione, .marchio-descrizione, dd')) {
    if (!visibile(el)) continue;
    const r = document.createRange(); r.selectNodeContents(el);
    const righe = {}; [...r.getClientRects()].forEach(q => { if (q.width > 0) { const k = Math.round(q.top / 4); righe[k] = (righe[k] || 0) + q.width; } });
    const k = Object.keys(righe).map(Number).sort((a,b)=>a-b);
    if (k.length > 1) {
      const testo = el.innerText.trim().split(/\s+/); const ultima = testo[testo.length - 1];
      // stima: se l'ultima riga è larga come la sola ultima parola
      const rr = document.createRange(); const tn = [...el.querySelectorAll('*')].concat([el]).flatMap(e => [...e.childNodes].filter(c => c.nodeType === 3 && c.textContent.trim())).pop();
      if (tn) { const i = tn.textContent.lastIndexOf(ultima); if (i >= 0) { rr.setStart(tn, i); rr.setEnd(tn, i + ultima.length); const w = rr.getBoundingClientRect().width; const ul = righe[k[k.length-1]]; if (Math.abs(ul - w) < 6 && testo.length > 2) res.vedove.push(desc(el) + ': «…' + ultima + '»'); } }
    }
  }
  for (const k in res) res[k] = [...new Set(res[k])];
  return res;
}"""
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-angle=swiftshader"])
    tutto = {}
    for pag in ["", "privacy.html"]:
        for w, h in [(280, 653), (300, 640), (320, 640), (344, 882), (360, 780), (375, 812), (390, 844), (412, 915), (430, 932)]:
            pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=2, is_mobile=True, has_touch=True)
            pg.route("http://sito.test/**", servi)
            pg.goto("http://sito.test/" + pag); pg.wait_for_timeout(1200)
            alt = pg.evaluate("document.documentElement.scrollHeight")
            for y in range(0, alt, 500): pg.evaluate(f"scrollTo(0,{y})"); pg.wait_for_timeout(60)
            pg.evaluate("document.querySelectorAll('[data-rivela]').forEach(e=>e.classList.add('visto'))"); pg.wait_for_timeout(1500)
            r = pg.evaluate(JS); r["scroll_orizz"] = pg.evaluate("document.documentElement.scrollWidth > innerWidth")
            tutto[f"{pag or 'home'}@{w}"] = r
            if w in (280, 360) and pag == "":
                pg.evaluate("document.getElementById('contatti').scrollIntoView()"); pg.wait_for_timeout(800)
                pg.screenshot(path=f"{out}/tel_{w}_contatti.png")
                pg.evaluate("scrollTo(0, document.documentElement.scrollHeight)"); pg.wait_for_timeout(600)
                pg.screenshot(path=f"{out}/tel_{w}_fondo.png")
            pg.close()
    b.close()
json.dump(tutto, open(out + "/audit_tel.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
# riepilogo: per ogni problema, a quali larghezze compare
agg = {}
for chiave, r in tutto.items():
    pag, w = chiave.split("@")
    for tipo, voci in r.items():
        if tipo == "scroll_orizz":
            if voci: agg.setdefault((pag, tipo, "PAGINA SCORRE DI LATO"), []).append(w)
            continue
        for v in voci: agg.setdefault((pag, tipo, v), []).append(w)
for (pag, tipo, v), ws in sorted(agg.items()):
    print(f"{pag:8} {tipo:9} {v}   @ {','.join(ws)}")

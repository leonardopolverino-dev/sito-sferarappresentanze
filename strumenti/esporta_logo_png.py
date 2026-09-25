"""Esporta i PNG del logo dagli SVG di risorse/logo/ (lanciare prima genera_logo.py).

Uso:   python strumenti/esporta_logo_png.py
Esce:  risorse/logo/png/  — sfondo trasparente salvo dove indicato.

Servono PNG (non SVG) per: firma email (Gmail/Outlook non mostrano gli SVG),
Word/carta intestata, icona dell'app sul telefono (apple-touch vuole uno sfondo pieno).
"""
import os

from playwright.sync_api import sync_playwright

RADICE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = os.path.join(RADICE, "risorse", "logo")
USCITA = os.path.join(LOGO, "png")

# (file svg, file png, larghezza px, sfondo o None=trasparente, margine in % del lato)
LAVORI = [
    ("sfera-logo.svg", "sfera-logo-1200.png", 1200, None, 0),
    ("sfera-logo-negativo.svg", "sfera-logo-negativo-1200.png", 1200, None, 0),
    ("sfera-logo-nero.svg", "sfera-logo-nero-1200.png", 1200, None, 0),
    # Firma email: mostrata a 220 px, esportata al doppio per gli schermi nitidi
    ("sfera-logo.svg", "sfera-firma-email.png", 440, None, 0),
    ("sfera-simbolo-colori.svg", "sfera-simbolo-512.png", 512, None, 0),
    ("sfera-simbolo-negativo.svg", "sfera-simbolo-negativo-512.png", 512, None, 0),
    ("sfera-simbolo-nero.svg", "sfera-simbolo-nero-512.png", 512, None, 0),
    # Icone app/browser: sfondo carta pieno e margine, come vogliono iPhone e Android
    ("sfera-simbolo-colori.svg", "sfera-icona-512.png", 512, "#F7F6F3", 14),
    ("sfera-simbolo-colori.svg", "sfera-icona-192.png", 192, "#F7F6F3", 14),
    ("sfera-simbolo-colori.svg", "sfera-icona-180.png", 180, "#F7F6F3", 14),
    ("sfera-simbolo-colori.svg", "sfera-icona-32.png", 32, None, 0),
]


def main():
    os.makedirs(USCITA, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        for svg, png, larghezza, sfondo, margine in LAVORI:
            codice = open(os.path.join(LOGO, svg), encoding="utf-8").read()
            vb = [float(v) for v in codice.split('viewBox="', 1)[1].split('"', 1)[0].split()]
            rapporto = vb[3] / vb[2]
            altezza = round(larghezza * rapporto)
            pad = round(larghezza * margine / 100)
            pagina = b.new_page(viewport={"width": larghezza, "height": altezza})
            pagina.set_content(
                "<html><body style='margin:0;background:%s'>"
                "<div style='width:%dpx;height:%dpx;padding:%dpx;box-sizing:border-box'>%s</div>"
                "</body></html>"
                % (
                    sfondo or "transparent",
                    larghezza,
                    altezza,
                    pad,
                    codice.replace("<svg ", '<svg style="width:100%;height:100%;display:block" ', 1),
                )
            )
            pagina.screenshot(path=os.path.join(USCITA, png), omit_background=sfondo is None)
            pagina.close()
            print("esportato", png, f"{larghezza}x{altezza}")
        b.close()


if __name__ == "__main__":
    main()

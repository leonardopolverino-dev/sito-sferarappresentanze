"""Genera i file del logo Sfera Rappresentanze (simbolo «sfera-finestra» + scritta).

La scritta è convertita in tracciati dal carattere del sito (Archivo, variabile):
i file si vedono identici ovunque, anche dove Archivo non è installato
(Word, programmi di stampa, tipografia).

Uso:   python strumenti/genera_logo.py
Esce:  risorse/logo/*.svg  (i PNG li produce strumenti/esporta_logo_png.py)

Le proporzioni ricalcano la testata del sito: simbolo 44, spazio 16,
SFERA 25 px spaziatura .2em, RAPPRESENTANZE 12.5 px spaziatura .3em.
"""
import io
import os

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

RADICE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT = os.path.join(RADICE, "anteprima-k7q2", "risorse", "font", "archivo-latin.woff2")
USCITA = os.path.join(RADICE, "risorse", "logo")

ANTRACITE = "#2F3438"
GRAFITE = "#565D63"
CARTA = "#F7F6F3"
ALLUMINIO = "#C8CBCD"
ROVERE = "#B5803C"
NERO = "#000000"


def istanza(peso):
    f = TTFont(FONT)
    return instantiateVariableFont(f, {"wght": peso, "wdth": 100})


def scritta(font, testo, px, spaziatura_em, x0, linea_base):
    """Tracciato SVG della parola, in px, con la spaziatura tra lettere del sito."""
    upm = font["head"].unitsPerEm
    scala = px / upm
    glifi = font.getGlyphSet()
    cmap = font.getBestCmap()
    penna = SVGPathPen(glifi, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    x = x0
    for i, c in enumerate(testo):
        nome = cmap[ord(c)]
        t = TransformPen(penna, (scala, 0, 0, -scala, x, linea_base))
        glifi[nome].draw(t)
        x += glifi[nome].width * scala
        if i < len(testo) - 1:
            x += spaziatura_em * px
    return penna.getCommands(), x


def simbolo(telaio, vetro, x=0, y=0, lato=48):
    s = lato / 48
    return (
        f'<g transform="translate({x} {y}) scale({s:g})">'
        f'<path d="M26 6.1A18 18 0 0 1 41.9 22H26Z" fill="{vetro}"/>'
        f'<circle cx="24" cy="24" r="19.5" fill="none" stroke="{telaio}" stroke-width="4.5"/>'
        f'<path d="M24 5v38M5 24h38" fill="none" stroke="{telaio}" stroke-width="4"/>'
        "</g>"
    )


def scrivi(nome, larghezza, altezza, corpo, titolo):
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {larghezza:.1f} {altezza:.1f}" '
        f'width="{larghezza:.1f}" height="{altezza:.1f}" role="img">'
        f"<title>{titolo}</title>{corpo}</svg>\n"
    )
    io.open(os.path.join(USCITA, nome), "w", encoding="utf-8", newline="\n").write(svg)
    print("scritto", nome, f"{larghezza:.0f}x{altezza:.0f}")


def main():
    os.makedirs(USCITA, exist_ok=True)
    grassetto, medio = istanza(700), istanza(500)

    # Testata del sito, in px: simbolo 44 (disegnato in una scatola 48 → 44/48)
    lato = 44
    gap = 16
    x_testo = lato + gap
    # Due righe: SFERA 25px, RAPPRESENTANZE 12.5px, interlinea 1.15 (come il CSS)
    base1 = 25 * 0.92          # linea di base della prima riga
    base2 = base1 + 12.5 * 1.35 + 4
    d_sfera, fine1 = scritta(grassetto, "SFERA", 25, 0.2, x_testo, base1)
    d_rapp, fine2 = scritta(medio, "RAPPRESENTANZE", 12.5, 0.3, x_testo, base2)
    alt_testo = base2 + 1
    altezza = max(lato, alt_testo)
    y_sim = (altezza - lato) / 2
    larghezza = max(fine1, fine2) + 1
    y_testo = (altezza - alt_testo) / 2

    varianti = [
        ("sfera-logo.svg", ANTRACITE, ROVERE, ANTRACITE, GRAFITE, "a colori, su fondo chiaro"),
        ("sfera-logo-negativo.svg", CARTA, ROVERE, CARTA, ALLUMINIO, "a colori, su fondo scuro"),
        ("sfera-logo-nero.svg", NERO, NERO, NERO, NERO, "un colore: timbro, fax, fotocopia"),
    ]
    for nome, telaio, vetro, c1, c2, uso in varianti:
        corpo = (
            simbolo(telaio, vetro, 0, y_sim, lato)
            + f'<g transform="translate(0 {y_testo:.2f})">'
            f'<path d="{d_sfera}" fill="{c1}"/><path d="{d_rapp}" fill="{c2}"/></g>'
        )
        scrivi(nome, larghezza, altezza, corpo, f"Sfera Rappresentanze — logo {uso}")

    # Solo simbolo, colori fissi (la versione con tema scuro automatico è sfera-simbolo.svg)
    for nome, telaio, vetro, uso in [
        ("sfera-simbolo-colori.svg", ANTRACITE, ROVERE, "a colori, fondo chiaro"),
        ("sfera-simbolo-negativo.svg", CARTA, ROVERE, "a colori, fondo scuro"),
        ("sfera-simbolo-nero.svg", NERO, NERO, "un colore"),
    ]:
        scrivi(nome, 48, 48, simbolo(telaio, vetro), f"Sfera Rappresentanze — simbolo {uso}")


if __name__ == "__main__":
    main()

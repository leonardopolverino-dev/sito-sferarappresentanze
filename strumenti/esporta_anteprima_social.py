"""Esporta l'immagine di anteprima per i social (WhatsApp, Facebook, LinkedIn, email): 1200x630.

Uso:   python strumenti/esporta_anteprima_social.py
Esce:  risorse/logo/png/sfera-anteprima-social.png (sorgente: strumenti/anteprima_social.html)
"""
import os
from playwright.sync_api import sync_playwright

RADICE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1200, "height": 630})
    pg.goto("file:///" + os.path.join(RADICE, "strumenti", "anteprima_social.html").replace("\\", "/"))
    pg.wait_for_timeout(800)
    uscita = os.path.join(RADICE, "risorse", "logo", "png", "sfera-anteprima-social.png")
    pg.screenshot(path=uscita)
    b.close()
    print("esportata", uscita)

"""Vettorizza la sezione Biemme Inversa (disegno a sole linee) in forme in millimetri.

Regola pari/dispari: da ogni spazio chiuso partono 8 raggi verso l'esterno del disegno;
se attraversano un numero DISPARI di linee lo spazio è materiale, se PARI è aria (camera).
Voto a maggioranza tra i raggi, per reggere dove due linee si toccano.
Il materiale di ogni pixel è il colore della linea più vicina.
"""
import json, math
import numpy as np, cv2

SRC = r"C:\Users\leona\.claude\uploads\d2cbdfe0-9796-427c-a762-868e4a5297d1\3ddf9ba1-image.jpg"
K = 3
im0 = cv2.imread(SRC)
im = cv2.resize(im0, None, fx=K, fy=K, interpolation=cv2.INTER_CUBIC)
hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
H, S, V = [hsv[..., i].astype(int) for i in range(3)]
h, w = H.shape

# Riquadro della sezione (pixel originali)
X0, X1, Y0, Y1 = 182, 596, 172, 700
box = np.zeros((h, w), bool); box[Y0*K:Y1*K, X0*K:X1*K] = True

C = {'alluminio_telaio': 1, 'alluminio': 2, 'guarnizione': 3, 'vetro': 4, 'ferramenta': 5, 'sigillante': 6}
linea = ((np.minimum.reduce([im[..., 0], im[..., 1], im[..., 2]]) < 200) | (S > 60)) & box
classe = np.zeros((h, w), np.uint8)
classe[linea & (S <= 40)] = C['alluminio_telaio']
classe[linea & (S > 40) & (H >= 10) & (H <= 34)] = C['alluminio']
classe[linea & (S > 40) & (H >= 35) & (H <= 80)] = C['guarnizione']
classe[linea & (S > 35) & (H >= 81) & (H <= 100)] = C['vetro']
classe[linea & (S > 35) & (H >= 101) & (H <= 150)] = C['ferramenta']
classe[linea & (S > 80) & ((H <= 9) | (H >= 165))] = C['sigillante']

# Via le linee di quota / richiamo dentro il riquadro (tutte grigie e fuori dai pezzi)
yy, xx = np.mgrid[0:h, 0:w]
grigio = classe == C['alluminio_telaio']
quote = grigio & (yy < 234*K)                                  # richiami sopra il telaio (restano i vetri)
quote |= grigio & (xx >= 589*K) & (yy >= 559*K)                 # richiamo della quota «11» in basso a destra
classe[quote] = 0

linea = classe > 0
import sys
KCH = int(sys.argv[1]) if len(sys.argv) > 1 else 5
lin = cv2.morphologyEx(linea.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (KCH, KCH)))

# Vetri: ogni lastra stratificata è un pezzo pieno (le linee interne sono gli strati)
m = (classe == C['vetro']).astype(np.uint8)
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
cont, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
vetri = np.zeros_like(m)
for c in cont:
    x, y, ww, hh = cv2.boundingRect(c)
    if ww * hh > 400: vetri[y:y+hh, x:x+ww] = 1

# Spazi liberi
libero = ((lin == 0) & box & (vetri == 0)).astype(np.uint8)
n, lab = cv2.connectedComponents(libero, connectivity=4)
dist = cv2.distanceTransform(libero, cv2.DIST_L2, 5)
bordo = np.zeros((h, w), bool)
bordo[Y0*K:Y0*K+2, X0*K:X1*K] = bordo[Y1*K-2:Y1*K, X0*K:X1*K] = True
bordo[Y0*K:Y1*K, X0*K:X0*K+2] = bordo[Y0*K:Y1*K, X1*K-2:X1*K] = True
esterni = set(np.unique(lab[bordo & (libero == 1)])) - {0}
barriera = (lin > 0) | (vetri > 0)          # le lastre contano come linee chiuse

ANGOLI = [math.radians(a) for a in (7, 52, 97, 142, 187, 232, 277, 322)]
# Barriere per colore: ogni spazio conta solo le linee del colore che lo delimita
barr = {}
for k in C.values():
    mk = cv2.morphologyEx((classe == k).astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (KCH, KCH)))
    barr[k] = mk > 0
barr[C['vetro']] = vetri > 0
def attraversamenti(y, x, ang, barriera):
    dx, dy = math.cos(ang), math.sin(ang)
    conta, dentro, px, py = 0, False, float(x), float(y)
    while True:
        px += dx; py += dy
        ix, iy = int(round(px)), int(round(py))
        if not (X0*K <= ix < X1*K and Y0*K <= iy < Y1*K): return conta
        b = barriera[iy, ix]
        if b and not dentro: conta += 1
        dentro = b

materiale = lin.astype(bool) | (vetri > 0)
classe_spazio = {}
dubbi = 0
anello = np.ones((7, 7), np.uint8)
for i in range(1, n):
    if i in esterni: continue
    m = lab == i
    ys_m, xs_m = np.nonzero(m)
    y0, y1, x0, x1 = max(ys_m.min() - 5, 0), ys_m.max() + 6, max(xs_m.min() - 5, 0), xs_m.max() + 6
    sub = m[y0:y1, x0:x1].astype(np.uint8)
    bordo_m = (cv2.dilate(sub, anello) > 0) & (sub == 0)
    cl = classe[y0:y1, x0:x1][bordo_m]; cl = cl[cl > 0]
    if cl.size == 0: continue
    k = int(np.bincount(cl).argmax()); classe_spazio[i] = k
    if m.sum() < 20: materiale |= m; continue
    if k in (C['alluminio_telaio'],):                 # telaio a pareti sottili: sottile = metallo, largo = aria
        if dist[m].max() <= 1.1 * 17.5: materiale |= m
        continue
    d = np.where(m, dist, 0); y, x = np.unravel_index(d.argmax(), d.shape)
    dispari = sum(attraversamenti(y, x, a, barr[k]) % 2 for a in ANGOLI)
    if dispari > 4: materiale |= m
    elif dispari == 4:
        dubbi += 1
        if dist[m].max() < 1.0 * 17.5: materiale |= m
print(f"spazi interni: {n - 1 - len(esterni)}, casi pari merito: {dubbi}")

# Classe del materiale = linea più vicina
sorgente = np.where(classe > 0, 0, 1).astype(np.uint8)
_, etich = cv2.distanceTransformWithLabels(sorgente, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
ys_l, xs_l = np.nonzero(sorgente == 0)
mappa = np.zeros(etich.max() + 1, np.uint8); mappa[etich[ys_l, xs_l]] = classe[ys_l, xs_l]
piena = np.where(materiale, mappa[etich], 0).astype(np.uint8)
for i, k in classe_spazio.items():
    sel = (lab == i) & materiale
    if sel.any(): piena[sel] = k
piena[vetri > 0] = C['vetro']

# Ferramenta piena
m = (piena == C['ferramenta']).astype(np.uint8)
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((11, 11), np.uint8))
cont, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
f = np.zeros_like(m); cv2.drawContours(f, [c for c in cont if cv2.contourArea(c) > 300], -1, 1, -1)
piena[f == 1] = C['ferramenta']

# Scala dal telaio (71 x 80 mm), vetri esclusi
tel = np.isin(piena, [C['alluminio_telaio'], C['alluminio'], C['sigillante']])
ys, xs = np.nonzero(tel)
sx = (xs.max() - xs.min()) / 71.0; sy = (ys.max() - ys.min()) / 80.0
px_mm = (sx + sy) / 2; ox, oy = xs.min(), ys.max()
print(f"scala: {sx:.2f} / {sy:.2f} px/mm (diff {abs(sx - sy) / px_mm * 100:.1f} %)")

def a_mm(c):
    return [[round((x - ox) / px_mm, 2), round((oy - y) / px_mm, 2)] for x, y in c.reshape(-1, 2)]

uscita = {'fonte': 'Biemme Inversa, sezione Telaio Elle (disegno tecnico)', 'unita': 'mm', 'pezzi': []}
anteprima = np.full(im.shape, 255, np.uint8)
tinte = {1: (70, 65, 60), 2: (95, 150, 190), 3: (35, 35, 35), 4: (235, 205, 130), 5: (200, 90, 60), 6: (40, 40, 170)}
for nome, k in C.items():
    m = (piena == k).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    cont, ger = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    if ger is None: continue
    ger = ger[0]; forme = []
    for i, c in enumerate(cont):
        if ger[i][3] != -1 or cv2.contourArea(c) < (0.5 * px_mm) ** 2: continue
        fori, j = [], ger[i][2]
        while j != -1:
            if cv2.contourArea(cont[j]) > (0.4 * px_mm) ** 2: fori.append(a_mm(cv2.approxPolyDP(cont[j], 1.0, True)))
            j = ger[j][0]
        forme.append({'contorno': a_mm(cv2.approxPolyDP(c, 1.0, True)), 'fori': fori})
    uscita['pezzi'].append({'materiale': nome, 'forme': forme})
    print(f"{nome}: {len(forme)} forme, {sum(len(x['fori']) for x in forme)} fori")
    # anteprima ricostruita DAL JSON (così controllo proprio ciò che andrà in 3D)
    for fo in forme:
        pts = lambda L: np.array([[ox + x * px_mm, oy - y * px_mm] for x, y in L], np.int32)
        cv2.fillPoly(anteprima, [pts(fo['contorno'])], tinte[k])
        for fr in fo['fori']: cv2.fillPoly(anteprima, [pts(fr)], (255, 255, 255))

json.dump(uscita, open('biemme_inversa.json', 'w'), separators=(',', ':'))
orig = cv2.resize(im0, None, fx=K, fy=K, interpolation=cv2.INTER_CUBIC)
sovra = cv2.addWeighted(orig, 0.4, anteprima, 0.6, 0)
crop = lambda a: a[(Y0 - 3) * K:(Y1 + 3) * K, (X0 - 3) * K:(X1 + 3) * K]
cv2.imwrite(f'controllo4_k{KCH}.png', cv2.resize(np.hstack([crop(anteprima), crop(sovra)]), None, fx=0.5, fy=0.5, interpolation=cv2.INTER_AREA))
print('JSON', round(len(json.dumps(uscita)) / 1024), 'KB')

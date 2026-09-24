// Sfera Rappresentanze — bozza sito: scene 3D e movimento
// Due scene Three.js: (1) la finestra che si apre sul Gran Sasso, guidata dallo scorrimento;
// (2) il "campionario": un campione 3D per ogni marchio, che cambia mentre si scorre.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 720px)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const liscio = t => t * t * (3 - 2 * t);
const esci = t => 1 - Math.pow(1 - t, 3);
const MM = 0.018; // scala dei profili: millimetri -> unità scena

function nuovoRenderer(canvas, trasparente) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: trasparente, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  r.outputColorSpace = THREE.SRGBColorSpace;
  return r;
}
function ambiente(renderer, scena, intensita = 1) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scena.environmentIntensity = intensita;
}
function adatta(renderer, camera, canvas) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const c = renderer.domElement;
  if (c.width !== Math.floor(w * renderer.getPixelRatio()) || c.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

// ---------- utilità geometriche ----------
function rettangolo(x0, y0, x1, y1) {
  const s = new THREE.Shape();
  s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0, y1); s.closePath();
  return s;
}
function foro(x0, y0, x1, y1) {
  const p = new THREE.Path();
  p.moveTo(x0, y0); p.lineTo(x0, y1); p.lineTo(x1, y1); p.lineTo(x1, y0); p.closePath();
  return p;
}
function poligono(punti) {
  const s = new THREE.Shape();
  punti.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}
function cornice(w, h, t, profondita, materiale) {
  const s = rettangolo(-w / 2, -h / 2, w / 2, h / 2);
  s.holes.push(foro(-w / 2 + t, -h / 2 + t, w / 2 - t, h / 2 - t));
  const g = new THREE.ExtrudeGeometry(s, { depth: profondita, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 });
  g.translate(0, 0, -profondita / 2);
  return new THREE.Mesh(g, materiale);
}
// Estrude una sezione disegnata in millimetri e la centra
function sezione(forma, lunghezza, materiale) {
  const g = new THREE.ExtrudeGeometry(forma, { depth: lunghezza, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.4, bevelSegments: 1, curveSegments: 12 });
  g.scale(MM, MM, MM);
  const m = new THREE.Mesh(g, materiale);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function scatola(x0, y0, x1, y1, lunghezza, materiale) {
  return sezione(rettangolo(x0, y0, x1, y1), lunghezza, materiale);
}

// ---------- materiali condivisi ----------
const MAT = {
  antracite: new THREE.MeshStandardMaterial({ color: 0x383e42, roughness: 0.42, metalness: 0.15 }),
  pvc: new THREE.MeshPhysicalMaterial({ color: 0xf1f0ea, roughness: 0.32, clearcoat: 0.4, clearcoatRoughness: 0.4 }),
  acciaio: new THREE.MeshStandardMaterial({ color: 0x9aa3a8, roughness: 0.35, metalness: 0.9 }),
  alluminio: new THREE.MeshStandardMaterial({ color: 0xc9ccce, roughness: 0.28, metalness: 0.95 }),
  alluminioScuro: new THREE.MeshStandardMaterial({ color: 0x3b4146, roughness: 0.38, metalness: 0.75 }),
  poliammide: new THREE.MeshStandardMaterial({ color: 0x222426, roughness: 0.7 }),
  guarnizione: new THREE.MeshStandardMaterial({ color: 0x151617, roughness: 0.85 }),
  vetro: new THREE.MeshPhysicalMaterial({ color: 0xcfe3ea, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.28, clearcoat: 1, envMapIntensity: 1.6, side: THREE.DoubleSide, depthWrite: false }),
  isolante: new THREE.MeshStandardMaterial({ color: 0xd9d3c3, roughness: 0.95 }),
  laccato: new THREE.MeshPhysicalMaterial({ color: 0xf4f2ec, roughness: 0.48, clearcoat: 0.3, clearcoatRoughness: 0.6 }),
  cromo: new THREE.MeshStandardMaterial({ color: 0xd8dadc, roughness: 0.18, metalness: 1 }),
  marmo: new THREE.MeshStandardMaterial({ color: 0xd8d4ca, roughness: 0.55 }),
};

// Venatura del legno disegnata su canvas (niente immagini esterne)
function texturaLegno(tono) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = tono; x.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 70; i++) {
    const y = Math.random() * 128, a = Math.random() * 0.18;
    x.strokeStyle = `rgba(70,40,15,${a})`;
    x.lineWidth = 0.5 + Math.random() * 2.2;
    x.beginPath(); x.moveTo(0, y);
    for (let k = 0; k <= 512; k += 32) x.lineTo(k, y + Math.sin(k / 60 + i) * 3 + (Math.random() - 0.5) * 2);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.02, 0.05);
  return t;
}

// =====================================================================
// 1) APERTURA: la finestra nel muro, il Gran Sasso all'alba dietro
// =====================================================================
function scenaApertura() {
  const canvas = document.getElementById('tela-finestra');
  const sezioneEl = document.querySelector('.apertura');
  const testo = document.querySelector('.apertura-testo');
  const scenaEl = document.querySelector('.apertura-scena');
  const dopo = document.querySelector('.apertura-dopo');
  const suggerimento = document.querySelector('.suggerimento-scorri');
  const renderer = nuovoRenderer(canvas, false);
  renderer.setClearColor(0x1c2024);
  const scena = new THREE.Scene();
  ambiente(renderer, scena, 0.55);
  scena.fog = new THREE.Fog(0x1c2024, 18, 60);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 200);

  // Cielo: gradiente dalla notte al chiarore sull'orizzonte
  const cielo = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 110),
    new THREE.ShaderMaterial({
      depthWrite: false, fog: false,
      uniforms: { alto: { value: new THREE.Color(0x1d2530) }, medio: { value: new THREE.Color(0x4b5968) }, basso: { value: new THREE.Color(0xe0a45a) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 alto; uniform vec3 medio; uniform vec3 basso; varying vec2 vUv; void main(){ float y = vUv.y; vec3 c = mix(basso, medio, smoothstep(0.30, 0.52, y)); c = mix(c, alto, smoothstep(0.52, 0.9, y)); gl_FragColor = vec4(c, 1.0); }',
    })
  );
  cielo.position.set(0, 18, -70);
  scena.add(cielo);

  // Sole che affiora dietro le montagne
  const sole = new THREE.Mesh(new THREE.CircleGeometry(2.6, 48), new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false }));
  sole.position.set(6, -1.2, -66);
  scena.add(sole);

  // Catene montuose: silhouette a strati, la più lontana col profilo del Gran Sasso
  function catena(larghezza, base, picchi, colore, z, seme) {
    let r = seme;
    const casuale = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    const pts = [[-larghezza / 2, base - 20]];
    const n = 60;
    for (let i = 0; i <= n; i++) {
      const x = -larghezza / 2 + (larghezza * i) / n;
      let y = base + Math.sin(i * 0.35 + seme) * 0.8 + casuale() * 0.9;
      for (const [px, ph, pw] of picchi) y += ph * Math.exp(-Math.pow((x - px) / pw, 2));
      pts.push([x, y]);
    }
    pts.push([larghezza / 2, base - 20]);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(poligono(pts)), new THREE.MeshBasicMaterial({ color: colore, fog: false }));
    m.position.z = z;
    scena.add(m);
    return m;
  }
  const montagne = [
    catena(200, -2, [[-8, 9, 5], [-3, 6.5, 3], [4, 4, 6]], 0x7d8a95, -55, 3),   // Corno Grande e Corno Piccolo
    catena(140, -4, [[12, 4, 7], [-20, 3, 8]], 0x566470, -38, 11),
    catena(100, -5.2, [[-6, 2.2, 6], [9, 1.6, 5]], 0x323a42, -24, 29),
  ];

  // Il muro, con il vano della finestra
  const W = 2.2, H = 2.8;
  const formaMuro = rettangolo(-30, -20, 30, 20);
  formaMuro.holes.push(foro(-W / 2, -H / 2, W / 2, H / 2));
  const muro = new THREE.Mesh(
    new THREE.ExtrudeGeometry(formaMuro, { depth: 0.5, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: 0x2a2f34, roughness: 0.95 })
  );
  muro.position.z = -0.5;
  const finestra = new THREE.Group();
  finestra.add(muro);

  // Telaio fisso e davanzale
  const telaio = cornice(W, H, 0.12, 0.14, MAT.antracite);
  finestra.add(telaio);
  const davanzale = new THREE.Mesh(new THREE.BoxGeometry(W + 0.5, 0.08, 0.55), MAT.marmo);
  davanzale.position.set(0, -H / 2 - 0.04, 0.02);
  finestra.add(davanzale);

  // Anta con cerniera a sinistra, vetro e maniglia
  const aw = W - 0.24, ah = H - 0.24;
  const cerniera = new THREE.Group();
  cerniera.position.set(-aw / 2, 0, 0.03);
  const anta = new THREE.Group();
  anta.position.x = aw / 2;
  anta.add(cornice(aw, ah, 0.13, 0.12, MAT.antracite));
  const vetro = new THREE.Mesh(new THREE.BoxGeometry(aw - 0.26, ah - 0.26, 0.03), MAT.vetro);
  anta.add(vetro);
  const maniglia = new THREE.Group();
  const rosetta = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.02), MAT.alluminio);
  const leva = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.03), MAT.alluminio);
  leva.position.set(0, -0.09, 0.035);
  maniglia.add(rosetta, leva);
  maniglia.position.set(aw / 2 - 0.065, 0, 0.08);
  anta.add(maniglia);
  cerniera.add(anta);
  finestra.add(cerniera);
  scena.add(finestra);

  // Luce calda dall'esterno e polvere sospesa nel raggio
  scena.add(new THREE.HemisphereLight(0xcfd8de, 0x1c2024, 0.6));
  const chiave = new THREE.DirectionalLight(0xffe2b8, 1.6);
  chiave.position.set(-3, 4, 6);
  scena.add(chiave);
  const controluce = new THREE.PointLight(0xffb866, 18, 14, 1.6);
  controluce.position.set(0.6, 0.4, -2.5);
  scena.add(controluce);

  const nPolvere = mobile ? 120 : 260;
  const pos = new Float32Array(nPolvere * 3);
  for (let i = 0; i < nPolvere; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 5;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 4;
    pos[i * 3 + 2] = Math.random() * 5;
  }
  const gPolvere = new THREE.BufferGeometry();
  gPolvere.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const polvere = new THREE.Points(gPolvere, new THREE.PointsMaterial({ color: 0xffd9a0, size: 0.018, transparent: true, opacity: 0.7, depthWrite: false }));
  scena.add(polvere);

  // Posizione della finestra: a destra su schermi larghi, al centro su telefono
  let xFinestra = 0, yFinestra = 0;
  function composizione() {
    const largo = canvas.clientWidth / Math.max(1, canvas.clientHeight) > 1.1;
    xFinestra = largo ? 2.05 : 0;
    yFinestra = largo ? 0 : 1.25;
    finestra.position.set(xFinestra, yFinestra, 0);
    polvere.position.x = xFinestra;
    controluce.position.x = xFinestra + 0.6;
  }

  const puntatore = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', e => {
    puntatore.tx = (e.clientX / innerWidth - 0.5) * 2;
    puntatore.ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });

  let visibile = true;
  new IntersectionObserver(([e]) => (visibile = e.isIntersecting)).observe(sezioneEl);

  const orologio = new THREE.Clock();
  function fotogramma() {
    requestAnimationFrame(fotogramma);
    if (!visibile) return;
    adatta(renderer, camera, canvas);
    composizione();
    const t = orologio.getElapsedTime();

    // Avanzamento dello scorrimento dentro l'apertura (0 -> 1)
    const r = sezioneEl.getBoundingClientRect();
    const corsa = Math.max(1, r.height - innerHeight);
    const p = fermo ? 0.18 : clamp(-r.top / corsa);

    const apri = esci(clamp(p / 0.42));
    cerniera.rotation.y = -apri * 1.38 + (fermo ? 0 : Math.sin(t * 0.8) * 0.015 * (1 - apri));
    const vola = liscio(clamp((p - 0.34) / 0.62));

    puntatore.x += (puntatore.tx - puntatore.x) * 0.05;
    puntatore.y += (puntatore.ty - puntatore.y) * 0.05;
    const xCam = xFinestra * 0.55 * (1 - vola) + xFinestra * vola;
    camera.position.set(
      xCam + puntatore.x * 0.35 * (1 - vola),
      0.15 + yFinestra * 0.35 - puntatore.y * 0.2 * (1 - vola) + vola * (0.4 + yFinestra * 0.5),
      (mobile ? 10.5 : 7.2) * (1 - vola) - 7 * vola
    );
    camera.fov = 38 + vola * 14;
    camera.updateProjectionMatrix();
    camera.lookAt(xFinestra * (0.35 + 0.65 * vola), 0.1 + yFinestra * 0.35 + vola * 1.6, -10);

    // Montagne con leggero parallasse, polvere che fluttua
    montagne.forEach((m, i) => (m.position.x = -puntatore.x * (0.4 + i * 0.35) + vola * (i - 1) * 0.6));
    polvere.rotation.y = t * 0.02;
    polvere.position.y = yFinestra + Math.sin(t * 0.3) * 0.08;

    // Testi sopra la scena
    testo.style.opacity = 1 - clamp(p / 0.22);
    scenaEl.style.setProperty('--velo', String(1 - clamp(p / 0.3)));
    testo.style.transform = `translateY(${-p * 120}px)`;
    if (suggerimento) suggerimento.style.opacity = 1 - clamp(p / 0.05);
    const d = clamp((p - 0.62) / 0.14) * (1 - clamp((p - 0.9) / 0.1));
    dopo.style.opacity = fermo ? 0 : d;
    dopo.style.transform = `scale(${0.94 + d * 0.06})`;

    renderer.render(scena, camera);
  }
  fotogramma();
}

// =====================================================================
// 2) CAMPIONARIO: un campione per marchio
// =====================================================================
function vetrocamera(xs, y0, y1, lunghezza, gruppo) {
  xs.forEach(x => {
    const v = scatola(x, y0, x + 4, y1, lunghezza, MAT.vetro);
    v.castShadow = false;
    gruppo.add(v);
  });
}

// Elledi — profilo in PVC multicamera con rinforzo in acciaio
function campionePVC() {
  const g = new THREE.Group();
  const L = 110;
  const f = poligono([[0, 0], [70, 0], [70, 44], [66, 44], [66, 98], [52, 98], [52, 92], [22, 92], [22, 98], [8, 98], [8, 44], [0, 44]]);
  [[4, 4, 20, 20], [24, 4, 46, 40], [50, 4, 66, 20], [4, 24, 20, 40], [50, 24, 66, 40],
   [12, 48, 26, 68], [30, 48, 44, 88], [48, 48, 62, 68], [12, 72, 26, 88], [48, 72, 62, 88]]
    .forEach(([a, b, c, d]) => f.holes.push(foro(a, b, c, d)));
  g.add(sezione(f, L, MAT.pvc));
  g.add(scatola(26, 6, 44, 38, L, MAT.acciaio));   // rinforzo telaio
  g.add(scatola(32, 50, 42, 86, L, MAT.acciaio));  // rinforzo anta
  g.add(scatola(19, 92, 23, 101, L, MAT.guarnizione));
  g.add(scatola(51, 92, 55, 101, L, MAT.guarnizione));
  vetrocamera([24, 35, 46], 92, 168, L, g);
  return centra(g, L);
}

// Biemme — sezione REALE della Inversa (telaio Elle), ricavata dal disegno tecnico Biemme:
// le forme in millimetri stanno in campioni/biemme_inversa.json. Se il file non arriva,
// resta il campione disegnato a mano (campioneAlluminioSemplice).
const MAT_INVERSA = {
  alluminio_telaio: MAT.alluminioScuro,
  alluminio: new THREE.MeshStandardMaterial({ color: 0x8d949a, roughness: 0.32, metalness: 0.85 }),
  guarnizione: MAT.guarnizione,
  vetro: MAT.vetro,
  ferramenta: new THREE.MeshStandardMaterial({ color: 0xc8b46a, roughness: 0.35, metalness: 0.85 }), // zincatura gialla
  sigillante: MAT.poliammide,
};
function campioneAlluminio() {
  const contenitore = new THREE.Group();
  contenitore.userData.profilo = true;
  contenitore.userData.scala = 1.35;       // più grande: la sezione è il protagonista
  contenitore.userData.mostraSezione = true; // oscilla mostrando sempre la sezione
  const provvisorio = campioneAlluminioSemplice().children[0];
  contenitore.add(provvisorio);
  fetch('campioni/biemme_inversa.json')
    .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
    .then(dati => {
      const L = 60;
      const g = new THREE.Group();
      for (const pezzo of dati.pezzi) {
        const mat = MAT_INVERSA[pezzo.materiale] || MAT.alluminio;
        for (const f of pezzo.forme) {
          const forma = poligono(f.contorno);
          for (const buco of f.fori) {
            const p = new THREE.Path();
            buco.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
            p.closePath();
            forma.holes.push(p);
          }
          const geo = new THREE.ExtrudeGeometry(forma, { depth: L, bevelEnabled: false, curveSegments: 4 });
          geo.scale(MM, MM, MM);
          const m = new THREE.Mesh(geo, mat);
          m.castShadow = pezzo.materiale !== 'vetro';
          m.receiveShadow = true;
          g.add(m);
        }
      }
      const box = new THREE.Box3().setFromObject(g);
      const c = box.getCenter(new THREE.Vector3());
      g.children.forEach(m => m.position.sub(c));
      contenitore.remove(provvisorio);
      contenitore.add(g);
    })
    .catch(e => console.warn('Sezione Inversa non caricata, resta il campione semplice', e));
  return contenitore;
}

// Campione semplice di riserva: alluminio a taglio termico disegnato a mano
function campioneAlluminioSemplice() {
  const g = new THREE.Group();
  const L = 110;
  const esterno = poligono([[0, 0], [26, 0], [26, 90], [8, 90], [8, 102], [0, 102]]);
  esterno.holes.push(foro(4, 4, 22, 40), foro(4, 46, 22, 86));
  const interno = poligono([[38, 0], [70, 0], [70, 102], [62, 102], [62, 90], [38, 90]]);
  interno.holes.push(foro(42, 4, 66, 40), foro(42, 46, 66, 86));
  g.add(sezione(esterno, L, MAT.alluminioScuro));
  g.add(sezione(interno, L, MAT.alluminio));
  g.add(scatola(24, 8, 40, 15, L, MAT.poliammide));
  g.add(scatola(24, 74, 40, 81, L, MAT.poliammide));
  g.add(scatola(27, 20, 37, 70, L, MAT.isolante));
  g.add(scatola(8, 90, 12, 99, L, MAT.guarnizione));
  g.add(scatola(58, 90, 62, 99, L, MAT.guarnizione));
  vetrocamera([15, 33, 51], 91, 168, L, g);
  return centra(g, L);
}

// Finnova — legno lamellare con rivestimento esterno in alluminio
function campioneLegno() {
  const g = new THREE.Group();
  const L = 110;
  const toni = ['#b98446', '#a8743a', '#c28f52'];
  [[12, 0, 78, 26], [12, 27, 78, 53], [12, 54, 78, 80]].forEach(([a, b, c, d], i) => {
    const m = new THREE.MeshStandardMaterial({ map: texturaLegno(toni[i]), roughness: 0.62 });
    g.add(scatola(a, b, c, d, L, m));
  });
  g.add(sezione(poligono([[0, -3], [14, -3], [14, 1], [4, 1], [4, 83], [0, 83]]), L, MAT.alluminioScuro));
  g.add(scatola(24, 80, 28, 88, L, MAT.guarnizione));
  g.add(scatola(62, 80, 66, 88, L, MAT.guarnizione));
  vetrocamera([29, 43, 57], 80, 158, L, g);
  return centra(g, L);
}

// TBK — monoblocco termoisolante con tapparella che sale e scende
function campioneMonoblocco() {
  const g = new THREE.Group();
  const cass = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.62, 0.7), MAT.isolante);
  cass.position.y = 1.15;
  const spallaS = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.1, 0.7), MAT.isolante);
  spallaS.position.set(-1.04, -0.2, 0);
  const spallaD = spallaS.clone(); spallaD.position.x = 1.04;
  const bancale = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 0.7), MAT.isolante);
  bancale.position.y = -1.3;
  [cass, spallaS, spallaD, bancale].forEach(m => { m.castShadow = true; m.receiveShadow = true; g.add(m); });
  // Frontale del cassonetto tagliato: si vede il rullo
  const rullo = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.84, 32), MAT.alluminio);
  rullo.rotation.z = Math.PI / 2;
  rullo.position.set(0, 1.15, 0.12);
  g.add(rullo);
  cass.geometry = new THREE.BoxGeometry(2.3, 0.62, 0.36);
  cass.position.z = -0.17;
  // Guide in alluminio
  [-0.9, 0.9].forEach(x => {
    const guida = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.1, 0.08), MAT.alluminioScuro);
    guida.position.set(x, -0.2, 0.12);
    g.add(guida);
  });
  // Stecche della tapparella
  const stecche = new THREE.Group();
  const n = 26;
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.075, 0.03), MAT.alluminio);
    s.position.set(0, 0.84 - i * 0.082, 0.12);
    s.castShadow = true;
    stecche.add(s);
  }
  g.add(stecche);
  g.userData.anima = t => {
    const discesa = fermo ? 0.6 : (Math.sin(t * 0.7) * 0.5 + 0.5);
    const visibili = Math.round(discesa * n);
    stecche.children.forEach((s, i) => (s.visible = i < visibili));
    rullo.rotation.x = t * (fermo ? 0 : 1.4) * Math.cos(t * 0.7);
  };
  g.scale.setScalar(0.92);
  return g;
}

// Lupak Metal — frangisole a lamelle orientabili: luce e ombra
function campioneFrangisole() {
  const g = new THREE.Group();
  // Sezione della lamella: corda 0,3 con leggera curvatura, lunga 2,2
  const forma = new THREE.Shape();
  forma.moveTo(-0.15, 0);
  forma.quadraticCurveTo(0, 0.045, 0.15, 0);
  forma.lineTo(0.15, 0.012);
  forma.quadraticCurveTo(0, 0.057, -0.15, 0.012);
  forma.closePath();
  const geo = new THREE.ExtrudeGeometry(forma, { depth: 2.2, bevelEnabled: false, curveSegments: 16 });
  geo.rotateY(Math.PI / 2);
  geo.translate(-1.1, 0, 0);
  const lamelle = [];
  const n = 11;
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, MAT.alluminio);
    m.position.y = 1.3 - i * 0.26;
    m.castShadow = true;
    lamelle.push(m);
    g.add(m);
  }
  [-0.8, 0.8].forEach(x => {
    const filo = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 3, 6), MAT.guarnizione);
    filo.position.set(x, 0, 0);
    g.add(filo);
  });
  // Parete su cui cade l'ombra
  const parete = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), new THREE.ShadowMaterial({ opacity: 0.22 }));
  parete.position.z = -1.1;
  parete.receiveShadow = true;
  g.add(parete);
  g.userData.anima = t => {
    lamelle.forEach((m, i) => (m.rotation.x = fermo ? -0.6 : Math.sin(t * 0.9 - i * 0.32) * 0.8 - 0.3));
  };
  g.userData.fermaRotazione = true;
  return g;
}

// Manuello Design — porta interna laccata che si apre
function campionePorta() {
  const g = new THREE.Group();
  const w = 1.25, h = 2.6;
  const stipite = cornice(w + 0.2, h + 0.1, 0.1, 0.16, MAT.laccato);
  stipite.position.y = 0.05;
  stipite.castShadow = true;
  g.add(stipite);
  const cerniera = new THREE.Group();
  cerniera.position.set(-w / 2, 0, 0);
  const legno = new THREE.MeshStandardMaterial({ map: texturaLegno('#b07a3e'), roughness: 0.55 });
  legno.map.repeat.set(1, 1);
  legno.map.rotation = Math.PI / 2;
  const anta = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.045), legno);
  anta.position.x = w / 2;
  anta.castShadow = true;
  cerniera.add(anta);
  // Incisioni orizzontali sull'anta
  for (let i = 1; i <= 4; i++) {
    const inc = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, 0.008, 0.05), new THREE.MeshStandardMaterial({ color: 0x6e4a22, roughness: 0.7 }));
    inc.position.set(w / 2, -h / 2 + (h * i) / 5, 0.001);
    cerniera.add(inc);
  }
  const maniglia = new THREE.Group();
  const ros = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 24), MAT.cromo);
  ros.rotation.x = Math.PI / 2;
  const leva = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.02), MAT.cromo);
  leva.position.set(-0.07, 0, 0.03);
  maniglia.add(ros, leva);
  maniglia.position.set(w - 0.1, -0.05, 0.035);
  cerniera.add(maniglia);
  const retro = maniglia.clone(); retro.position.z = -0.035; retro.rotation.y = Math.PI;
  cerniera.add(retro);
  g.add(cerniera);
  const parete = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), new THREE.ShadowMaterial({ opacity: 0.18 }));
  parete.position.z = -0.12;
  parete.receiveShadow = true;
  g.add(parete);
  g.userData.anima = t => {
    cerniera.rotation.y = fermo ? -0.6 : -(Math.sin(t * 0.55) * 0.5 + 0.5) * 1.3;
  };
  g.userData.fermaRotazione = true;
  g.scale.setScalar(0.95);
  return g;
}

function centra(gruppo, lunghezzaMm) {
  const box = new THREE.Box3().setFromObject(gruppo);
  const c = box.getCenter(new THREE.Vector3());
  gruppo.children.forEach(m => m.position.sub(c));
  const perno = new THREE.Group();
  perno.add(gruppo);
  perno.scale.setScalar(0.82);
  perno.userData.profilo = true;
  return perno;
}

function scenaCampionario() {
  const canvas = document.getElementById('tela-campioni');
  const palco = document.querySelector('.campionario-palco');
  const didascalia = document.querySelector('[data-didascalia]');
  const schede = [...document.querySelectorAll('.marchio-scheda')];
  const renderer = nuovoRenderer(canvas, true);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scena = new THREE.Scene();
  ambiente(renderer, scena, 0.9);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  camera.position.set(0, 0.5, 7.4);
  camera.lookAt(0, 0, 0);

  const sole = new THREE.DirectionalLight(0xfff1dc, 2.2);
  sole.position.set(2.5, 4, 5);
  sole.castShadow = true;
  sole.shadow.mapSize.set(1024, 1024);
  sole.shadow.camera.left = -3; sole.shadow.camera.right = 3; sole.shadow.camera.top = 3; sole.shadow.camera.bottom = -3;
  sole.shadow.bias = -0.0008;
  scena.add(sole, new THREE.AmbientLight(0xffffff, 0.25));

  const fabbriche = { pvc: campionePVC, alluminio: campioneAlluminio, legno: campioneLegno, monoblocco: campioneMonoblocco, frangisole: campioneFrangisole, porta: campionePorta };
  const campioni = schede.map(s => {
    const o = fabbriche[s.dataset.campione]();
    o.userData.stato = 0;
    o.visible = false;
    scena.add(o);
    return o;
  });

  let attivo = 0;
  function aggiornaAttivo() {
    const riferimento = innerHeight * (mobile ? 0.66 : 0.5);
    let migliore = 0, distanza = Infinity;
    schede.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - riferimento);
      if (d < distanza) { distanza = d; migliore = i; }
    });
    if (migliore !== attivo || !schede[attivo].classList.contains('attiva')) {
      schede[attivo].classList.remove('attiva');
      attivo = migliore;
      schede[attivo].classList.add('attiva');
      if (didascalia) didascalia.textContent = schede[attivo].dataset.didascalia;
    }
  }

  // Trascina per ruotare
  const giro = { angolo: 0.6, velocita: 0, trascina: false, x: 0 };
  canvas.addEventListener('pointerdown', e => { giro.trascina = true; giro.x = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!giro.trascina) return;
    giro.velocita = (e.clientX - giro.x) * 0.01;
    giro.angolo += giro.velocita;
    giro.x = e.clientX;
  });
  const lascia = () => (giro.trascina = false);
  canvas.addEventListener('pointerup', lascia);
  canvas.addEventListener('pointercancel', lascia);

  let visibile = false;
  new IntersectionObserver(([e]) => (visibile = e.isIntersecting), { rootMargin: '100px' }).observe(palco);

  const orologio = new THREE.Clock();
  let prec = 0;
  function fotogramma() {
    requestAnimationFrame(fotogramma);
    const t = orologio.getElapsedTime();
    const dt = Math.min(0.25, t - prec); prec = t;
    aggiornaAttivo();
    if (!visibile) return;
    adatta(renderer, camera, canvas);

    if (!giro.trascina) {
      giro.velocita *= 0.94;
      giro.angolo += giro.velocita + (fermo ? 0 : Math.min(dt, 0.05) * 0.25);
    }

    campioni.forEach((o, i) => {
      const bersaglio = i === attivo ? 1 : 0;
      o.userData.stato += (bersaglio - o.userData.stato) * Math.min(1, dt * 5);
      const s = o.userData.stato;
      o.visible = s > 0.01;
      if (!o.visible) return;
      const e = esci(s);
      const base = o.userData.scala || (o.userData.profilo ? 0.82 : 1);
      o.scale.setScalar(base * (0.55 + 0.45 * e));
      o.position.y = (1 - e) * -0.8;
      if (o.userData.mostraSezione) o.rotation.set(0.2, -0.38 + Math.sin(giro.angolo * 0.9) * 0.3 + (1 - e) * 1.2, 0);
      else if (o.userData.fermaRotazione) o.rotation.y = Math.sin(giro.angolo * 0.5) * 0.35 + (1 - e) * 1.2;
      else if (o.userData.profilo) o.rotation.set(0.28, giro.angolo + (1 - e) * 1.6, 0);
      else o.rotation.y = Math.sin(giro.angolo * 0.6) * 0.5 + (1 - e) * 1.4;
      if (o.userData.anima) o.userData.anima(t);
      else o.children[0]?.userData.anima?.(t);
    });
    renderer.render(scena, camera);
  }
  aggiornaAttivo();
  fotogramma();
}

// =====================================================================
// 3) Interfaccia: rivelazioni, barra, menu, modulo
// =====================================================================
function interfaccia() {
  const osserva = new IntersectionObserver(voci => voci.forEach(v => {
    if (v.isIntersecting) { v.target.classList.add('visto'); osserva.unobserve(v.target); }
  }), { threshold: 0.18 });
  document.querySelectorAll('[data-rivela]').forEach(el => osserva.observe(el));

  const barra = document.querySelector('.barra');
  const sezioniToni = [...document.querySelectorAll('[data-tono]')];
  function tono() {
    const y = 40;
    let chiaro = false;
    for (const s of sezioniToni) {
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) { chiaro = s.dataset.tono === 'chiaro'; break; }
    }
    document.body.classList.toggle('su-chiaro', chiaro);
    const apertura = document.querySelector('.apertura').getBoundingClientRect();
    barra.classList.toggle('compatta', apertura.bottom < 80);
  }
  addEventListener('scroll', tono, { passive: true });
  addEventListener('resize', tono);
  tono();

  const apri = document.querySelector('.menu-apri');
  const menu = document.querySelector('.menu');
  apri.addEventListener('click', () => {
    const aperto = menu.classList.toggle('aperto');
    apri.setAttribute('aria-expanded', String(aperto));
    apri.textContent = aperto ? 'Chiudi' : 'Menu';
  });
  menu.addEventListener('click', e => {
    if (e.target.closest('a')) { menu.classList.remove('aperto'); apri.setAttribute('aria-expanded', 'false'); apri.textContent = 'Menu'; }
  });

  // Il modulo prepara un'email già scritta (il sito non ha un server)
  const modulo = document.getElementById('modulo-contatto');
  modulo.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(modulo);
    const oggetto = `Richiesta dal sito — ${d.get('azienda') || d.get('nome')}`;
    const corpo = [
      `Nome: ${d.get('nome')}`,
      `Azienda: ${d.get('azienda')}`,
      `Attività: ${d.get('attivita')}`,
      `Provincia: ${d.get('provincia')}`,
      `Telefono: ${d.get('telefono')}`,
      '',
      d.get('messaggio'),
    ].join('\n');
    location.href = `mailto:info@sferarappresentanze.it?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo)}`;
  });
}

interfaccia();
function webglDisponibile() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
if (webglDisponibile()) {
  try { scenaApertura(); } catch (e) { console.error('Scena apertura non disponibile', e); document.documentElement.classList.add('senza-3d'); }
  try { scenaCampionario(); } catch (e) { console.error('Campionario 3D non disponibile', e); document.documentElement.classList.add('senza-3d'); }
} else {
  document.documentElement.classList.add('senza-3d');
}

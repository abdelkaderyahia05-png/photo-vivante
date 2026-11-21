// Photo Vivante — prototype
// Mode 3D : carte de profondeur calculée sur l'appareil (Depth Anything, via Transformers.js) + parallaxe WebGL.
// Mode IA : appel à un service image → vidéo (fal.ai), seulement si l'utilisateur met sa clé et appuie sur le bouton.

const $ = (s) => document.querySelector(s);
const L = 1080, H = 1920;                 // format vertical de sortie
const TRANSFORMERS = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1";
const MODELES_PROFONDEUR = ["onnx-community/depth-anything-v2-small", "Xenova/depth-anything-small-hf"];

const etat = {
  mode: "3d",
  photo: null,            // canvas recadré 1080×1920
  profondeur: null,       // canvas niveaux de gris (proche = clair)
  gyro: { actif: false, x: 0, y: 0 },
  debut: performance.now(),
  export: null,           // { debut, duree } pendant l'enregistrement
  videoIA: null,          // URL blob de la vidéo IA
};

// ---------- Horloge de l'écran verrouillé (aperçu seulement, pas dans la vidéo) ----------
function majHorloge() {
  const d = new Date();
  $("#heure").textContent = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  $("#date").textContent = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}
majHorloge(); setInterval(majHorloge, 15000);

const statut = (t) => { $("#statut").textContent = t || ""; };

// ---------- WebGL ----------
const toile = $("#toile");
const gl = toile.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
const VS = `attribute vec2 p; varying vec2 uv; void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;
const FS = `precision highp float;
varying vec2 uv;
uniform sampler2D uImg, uProf;
uniform vec2 uDecal;
uniform float uZoom, uPoint;
void main(){
  vec2 base = (uv - 0.5) / uZoom + 0.5;
  vec2 p = base;
  // quelques passes pour limiter les déchirures sur les bords des objets
  for (int i = 0; i < 5; i++) {
    float d = texture2D(uProf, p).r;
    p = base + uDecal * (d - uPoint);
  }
  gl_FragColor = texture2D(uImg, clamp(p, 0.001, 0.999));
}`;
function shader(type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
const prog = gl.createProgram();
gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
gl.linkProgram(prog); gl.useProgram(prog);
const buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
const locP = gl.getAttribLocation(prog, "p");
gl.enableVertexAttribArray(locP); gl.vertexAttribPointer(locP, 2, gl.FLOAT, false, 0, 0);
const U = (n) => gl.getUniformLocation(prog, n);
const uDecal = U("uDecal"), uZoom = U("uZoom"), uPoint = U("uPoint");
gl.uniform1i(U("uImg"), 0); gl.uniform1i(U("uProf"), 1);

function texture(unite, source) {
  const t = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unite);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

// ---------- Mouvement en boucle parfaite ----------
function decalage(t) {
  const duree = Number($("#duree").value);
  const force = Number($("#force").value) / 100;
  const amp = 0.055 * force;
  const a = ((t % duree) / duree) * Math.PI * 2;
  let x = 0, y = 0, zoom = 1 + amp * 1.6 + 0.015;
  switch ($("#mouvement").value) {
    case "cercle": x = Math.cos(a) * amp; y = Math.sin(a) * amp * 0.6; break;
    case "balancier": x = Math.sin(a) * amp; break;
    case "respiration": y = Math.sin(a) * amp * 0.35; zoom += (1 - Math.cos(a)) * 0.5 * amp * 0.9; break;
  }
  if (etat.gyro.actif && !etat.export) {
    x = x * 0.35 + etat.gyro.x * amp * 1.2;
    y = y * 0.35 + etat.gyro.y * amp * 1.2;
  }
  return { x, y, zoom };
}

function dessiner(maintenant) {
  requestAnimationFrame(dessiner);
  if (!etat.photo || etat.mode !== "3d") return;
  const t = etat.export ? (maintenant - etat.export.debut) / 1000 : (maintenant - etat.debut) / 1000;
  const d = decalage(t);
  gl.viewport(0, 0, L, H);
  gl.uniform2f(uDecal, d.x, d.y);
  gl.uniform1f(uZoom, d.zoom);
  gl.uniform1f(uPoint, 0.55);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
requestAnimationFrame(dessiner);

// ---------- Import et recadrage vertical ----------
function recadrer(img) {
  const c = document.createElement("canvas"); c.width = L; c.height = H;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  const ech = Math.max(L / img.width, H / img.height);
  const w = img.width * ech, h = img.height * ech;
  if (img.width / img.height <= 0.7) {
    // Photo déjà verticale : on remplit l'écran.
    ctx.drawImage(img, (L - w) / 2, (H - h) / 2.4, w, h);
    return c;
  }
  // Photo carrée ou horizontale : fond flouté de la même photo, et la photo entière posée sous l'horloge.
  ctx.filter = "blur(40px) brightness(0.7)";
  ctx.drawImage(img, (L - w * 1.1) / 2, (H - h * 1.1) / 2, w * 1.1, h * 1.1);
  ctx.filter = "none";
  const pw = L, ph = img.height * (L / img.width);
  // bords haut et bas en fondu, pour que la photo se mélange au fond
  const p = document.createElement("canvas"); p.width = pw; p.height = ph;
  const pc = p.getContext("2d");
  pc.drawImage(img, 0, 0, pw, ph);
  const g = pc.createLinearGradient(0, 0, 0, ph);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.14, "#000");
  g.addColorStop(0.86, "#000"); g.addColorStop(1, "rgba(0,0,0,0)");
  pc.globalCompositeOperation = "destination-in"; pc.fillStyle = g; pc.fillRect(0, 0, pw, ph);
  ctx.drawImage(p, 0, Math.min(H - ph, H * 0.6 - ph / 2));
  return c;
}

async function chargerPhoto(source) {
  const img = new Image();
  img.src = source;
  await img.decode();
  etat.photo = recadrer(img);
  etat.videoIA = null;
  $("#video-ia").classList.add("cache");
  $("#telecharger").classList.add("cache");
  $("#info-export").textContent = img.width < 800
    ? `Photo petite (${img.width}×${img.height}) : la vidéo sera un peu floue. Une photo plus grande donne un meilleur rendu.`
    : "";
  ["#etape-apercu", "#etape-export"].forEach((s) => $(s).classList.remove("cache"));
  texture(0, etat.photo);
  texture(1, profondeurDeSecours());           // en attendant la vraie carte
  $("#etape-apercu").scrollIntoView({ behavior: "smooth", block: "start" });
  calculerProfondeur();
}

$("#fichier").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (f) chargerPhoto(URL.createObjectURL(f));
});

// ---------- Carte de profondeur ----------
function profondeurDeSecours() {
  // Ovale clair au centre : le sujet « avance », le fond « recule ».
  const c = document.createElement("canvas"); c.width = 270; c.height = 480;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(135, 200, 20, 135, 220, 260);
  g.addColorStop(0, "#fff"); g.addColorStop(1, "#222");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 270, 480);
  return c;
}

let estimateur = null;
async function chargerEstimateur() {
  if (estimateur) return estimateur;
  const { pipeline, env } = await import(TRANSFORMERS);
  env.allowLocalModels = false;
  const webgpu = !!navigator.gpu;
  let derniereErreur;
  for (const nom of MODELES_PROFONDEUR) {
    for (const opts of webgpu ? [{ device: "webgpu", dtype: "fp16" }, { dtype: "q8" }] : [{ dtype: "q8" }, {}]) {
      try {
        estimateur = await pipeline("depth-estimation", nom, {
          ...opts,
          progress_callback: (p) => {
            if (p.status === "progress" && p.total > 2e6)
              statut(`Téléchargement de l'IA de profondeur (une seule fois) : ${Math.round(p.progress)} %`);
          },
        });
        return estimateur;
      } catch (e) { derniereErreur = e; }
    }
  }
  throw derniereErreur;
}

async function calculerProfondeur() {
  statut("Analyse de la profondeur de la photo…");
  try {
    const est = await chargerEstimateur();
    statut("Calcul de la profondeur…");
    // On travaille sur une version réduite : plus rapide, le résultat est lissé ensuite.
    const petit = document.createElement("canvas"); petit.width = 378; petit.height = 672;
    petit.getContext("2d").drawImage(etat.photo, 0, 0, 378, 672);
    const sortie = await est(petit.toDataURL("image/jpeg", 0.92));
    const r = sortie.depth; // RawImage niveaux de gris
    const brut = document.createElement("canvas"); brut.width = r.width; brut.height = r.height;
    const ctx = brut.getContext("2d");
    const im = ctx.createImageData(r.width, r.height);
    let min = 255, max = 0;
    for (let i = 0; i < r.width * r.height; i++) { const v = r.data[i * r.channels]; if (v < min) min = v; if (v > max) max = v; }
    const k = 255 / Math.max(1, max - min);
    for (let i = 0; i < r.width * r.height; i++) {
      const v = (r.data[i * r.channels] - min) * k;
      im.data.set([v, v, v, 255], i * 4);
    }
    ctx.putImageData(im, 0, 0);
    // Lissage : évite les déchirures autour des contours
    const lisse = document.createElement("canvas"); lisse.width = 270; lisse.height = 480;
    const lctx = lisse.getContext("2d");
    lctx.filter = "blur(3px)";
    lctx.drawImage(brut, 0, 0, 270, 480);
    etat.profondeur = lisse;
    texture(1, lisse);
    statut("");
  } catch (e) {
    console.warn("Profondeur IA indisponible, carte de secours utilisée :", e);
    statut("Mode simplifié (pas de connexion à l'IA de profondeur). L'effet reste animé.");
    setTimeout(() => statut(""), 5000);
  }
}

// ---------- Gyroscope ----------
$("#gyro").addEventListener("click", async () => {
  if (etat.gyro.actif) { etat.gyro.actif = false; $("#gyro").textContent = "Suivre l'inclinaison du téléphone"; return; }
  try {
    if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) {
      if ((await DeviceOrientationEvent.requestPermission()) !== "granted") throw new Error("refusé");
    }
    if (!etat.gyro.ecoute) {
      etat.gyro.ecoute = true;
      window.addEventListener("deviceorientation", (e) => {
        if (e.gamma == null) return;
        etat.gyro.recu = true;
        etat.gyro.x = Math.max(-1, Math.min(1, e.gamma / 30));
        etat.gyro.y = Math.max(-1, Math.min(1, (e.beta - 55) / 30));
      });
    }
    etat.gyro.actif = true;
    setTimeout(() => {
      if (etat.gyro.actif && !etat.gyro.recu) {
        statut("Aucun mouvement reçu : l'inclinaison marche seulement sur un téléphone, en https.");
        setTimeout(() => statut(""), 4000);
      }
    }, 1500);
    $("#gyro").textContent = "Arrêter le suivi de l'inclinaison";
  } catch {
    statut("Inclinaison non disponible sur cet appareil.");
    setTimeout(() => statut(""), 3000);
  }
});

// ---------- Onglets 3D / IA ----------
document.querySelectorAll(".onglet").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".onglet").forEach((o) => o.classList.toggle("actif", o === b));
  etat.mode = b.dataset.mode;
  $("#panneau-3d").classList.toggle("cache", etat.mode !== "3d");
  $("#panneau-ia").classList.toggle("cache", etat.mode !== "ia");
  $("#exporter").classList.toggle("cache", etat.mode !== "3d");
  const v = $("#video-ia");
  v.classList.toggle("cache", !(etat.mode === "ia" && etat.videoIA));
  if (etat.mode === "ia" && !etat.videoIA) statut("Mets ta clé fal.ai puis appuie sur « Animer avec l'IA ».");
  else statut("");
}));

// ---------- Export vidéo verticale (mode 3D) ----------
function formatVideo() {
  const liste = ["video/mp4;codecs=avc1.640028", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  return liste.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
}

$("#exporter").addEventListener("click", async () => {
  const type = formatVideo();
  if (!type) { $("#info-export").textContent = "Ce navigateur ne sait pas enregistrer de vidéo. Essaie Chrome ou Safari récent."; return; }
  const duree = Number($("#duree").value);
  const bouton = $("#exporter");
  bouton.disabled = true; bouton.textContent = "Fabrication en cours…";
  $("#barre").classList.remove("cache"); $("#telecharger").classList.add("cache");

  const flux = toile.captureStream(30);
  const rec = new MediaRecorder(flux, { mimeType: type, videoBitsPerSecond: 10_000_000 });
  const morceaux = [];
  rec.ondataavailable = (e) => e.data.size && morceaux.push(e.data);
  const fini = new Promise((ok) => (rec.onstop = ok));

  etat.export = { debut: performance.now() };
  rec.start(250);
  const minuteur = setInterval(() => {
    const p = (performance.now() - etat.export.debut) / 1000 / duree;
    $("#barre-remplie").style.width = Math.min(100, p * 100) + "%";
  }, 100);
  await new Promise((r) => setTimeout(r, duree * 1000 + 60));
  rec.stop(); clearInterval(minuteur);
  await fini;
  etat.export = null;
  flux.getTracks().forEach((t) => t.stop());

  const ext = type.includes("mp4") ? "mp4" : "webm";
  const blob = new Blob(morceaux, { type: type.split(";")[0] });
  const lien = $("#telecharger");
  lien.href = URL.createObjectURL(blob);
  lien.download = `photo-vivante-${duree}s.${ext}`;
  lien.textContent = `Enregistrer la vidéo (${ext.toUpperCase()}, ${(blob.size / 1e6).toFixed(1)} Mo)`;
  lien.classList.remove("cache");
  proposerPartage(blob, lien.download);
  $("#info-export").textContent = ext === "mp4"
    ? `Vidéo verticale 1080×1920, ${duree} s, qui tourne en boucle sans à-coup.`
    : "Ce navigateur a produit un fichier WEBM. Pour un MP4, utilise Chrome récent ou Safari.";
  bouton.disabled = false; bouton.textContent = "Refaire la vidéo";
  $("#barre-remplie").style.width = "0";
  $("#barre").classList.add("cache");
});

// Sur téléphone : la feuille de partage permet « Enregistrer la vidéo » directement dans Photos / Galerie
// (sur iPhone, un simple téléchargement range la vidéo dans Fichiers, pas dans Photos).
let fichierAPartager = null;
function proposerPartage(blob, nom) {
  const b = $("#partager");
  const f = new File([blob], nom, { type: blob.type || "video/mp4" });
  if (navigator.canShare && navigator.canShare({ files: [f] })) {
    fichierAPartager = f;
    b.classList.remove("cache");
  } else b.classList.add("cache");
}
$("#partager").addEventListener("click", async () => {
  if (!fichierAPartager) return;
  try { await navigator.share({ files: [fichierAPartager] }); }
  catch (e) { if (e.name !== "AbortError") statut("Partage impossible : utilise « Enregistrer la vidéo »."); }
});

// ---------- Mode IA (fal.ai) ----------
try { $("#cle").value = localStorage.getItem("pv-cle-fal") || ""; } catch {}
$("#cle").addEventListener("change", () => { try { localStorage.setItem("pv-cle-fal", $("#cle").value.trim()); } catch {} });

$("#animer-ia").addEventListener("click", async () => {
  const cle = $("#cle").value.trim();
  if (!cle) { statut("Il faut d'abord coller ta clé fal.ai."); return; }
  if (!etat.photo) return;
  const modele = $("#modele").value.trim();
  const bouton = $("#animer-ia");
  bouton.disabled = true;
  try {
    statut("Envoi de la photo au service IA…");
    const entetes = { Authorization: `Key ${cle}`, "Content-Type": "application/json" };
    const rep = await fetch(`https://queue.fal.run/${modele}`, {
      method: "POST", headers: entetes,
      body: JSON.stringify({
        prompt: $("#consigne").value,
        image_url: etat.photo.toDataURL("image/jpeg", 0.9),
        duration: "5",
      }),
    });
    if (!rep.ok) throw new Error(`Le service a refusé (${rep.status}) : ${(await rep.text()).slice(0, 160)}`);
    const { status_url, response_url } = await rep.json();
    const t0 = Date.now();
    for (;;) {
      await new Promise((r) => setTimeout(r, 4000));
      const s = await (await fetch(status_url, { headers: entetes })).json();
      statut(`L'IA anime la photo… (${Math.round((Date.now() - t0) / 1000)} s, ça prend souvent 1 à 3 min)`);
      if (s.status === "COMPLETED") break;
      if (s.status === "FAILED" || s.status === "ERROR") throw new Error("Le service n'a pas réussi à animer la photo.");
    }
    const resultat = await (await fetch(response_url, { headers: entetes })).json();
    const url = resultat.video?.url;
    if (!url) throw new Error("Réponse inattendue du service.");
    const blob = await (await fetch(url)).blob();
    etat.videoIA = URL.createObjectURL(blob);
    const v = $("#video-ia");
    v.src = etat.videoIA; v.classList.remove("cache"); v.play();
    const lien = $("#telecharger");
    lien.href = etat.videoIA; lien.download = "photo-vivante-ia.mp4";
    lien.textContent = "Enregistrer la vidéo IA (MP4)"; lien.classList.remove("cache");
    proposerPartage(blob, "photo-vivante-ia.mp4");
    statut("");
  } catch (e) {
    statut(e.message || "Erreur pendant l'animation IA.");
  } finally { bouton.disabled = false; }
});

// ---------- Aide ----------
$("#voir-aide").addEventListener("click", () => {
  $("#aide").classList.remove("cache");
  $("#aide").scrollIntoView({ behavior: "smooth" });
});

// ---------- Démo et appli installable ----------
if (new URLSearchParams(location.search).has("demo")) chargerPhoto("test/photo-test.png");
window.photoVivante = etat; // pour les vérifications
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});

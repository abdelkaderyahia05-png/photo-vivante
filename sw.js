// Garde l'appli disponible hors connexion (l'IA de profondeur est mise en cache par Transformers.js).
const CACHE = "photo-vivante-v3";
const FICHIERS = ["./", "index.html", "style.css", "app.js", "manifest.webmanifest",
  "icones/icone.svg", "icones/icone-192.png", "icones/icone-512.png", "polices/PlusJakartaSans.woff2"];

self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS))));
self.addEventListener("activate", (e) => e.waitUntil(
  caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
));
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // CDN et modèles : gérés par le navigateur
  e.respondWith(fetch(e.request).then((r) => {
    const copie = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copie)); return r;
  }).catch(() => caches.match(e.request)));
});

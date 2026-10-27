/* Service worker : permet l'usage hors-ligne.
   Tout passe d'abord par le réseau (les mises à jour arrivent tout de suite),
   le cache ne sert que quand il n'y a pas de connexion.
   Après une modification, change le numéro de CACHE. */
const CACHE = "boubou-v2.4.2";
const ASSETS = ["./", "./index.html", "./boubou.webmanifest", "./boubou-192.png", "./boubou-512.png", "./boubou-maskable-512.png"];

self.addEventListener("install", e => {
  // cache: "reload" contourne le cache HTTP du navigateur, pour ne jamais enregistrer une ancienne version
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === "navigate";
  e.respondWith(withTimeout(fetch(req, { cache: "no-cache" }), 4000)
    .then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(isPage ? "./index.html" : req, copy)); }
      return res;
    })
    .catch(() => caches.match(isPage ? "./index.html" : req).then(hit => hit || (isPage ? caches.match("./") : undefined))
      .then(hit => hit || Response.error())));
});

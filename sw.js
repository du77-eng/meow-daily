const CACHE_NAME = "meow-daily-v42";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/app.css",
  "./js/app.js",
  "./js/crypto.js",
  "./js/storage.js",
  "./js/store.js",
  "./js/util.js",
  "./js/ui.js",
  "./js/theme.js",
  "./js/selftest.js",
  "./js/features/home.js",
  "./js/features/weight.js",
  "./js/features/period.js",
  "./js/features/water.js",
  "./js/features/rest.js",
  "./js/features/orders.js",
  "./js/features/books.js",
  "./js/features/settings.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/kitty-home.png",
  "./icons/kitty-weight.png",
  "./icons/kitty-period.png",
  "./icons/kitty-water.png",
  "./icons/kitty-work.png",
  "./icons/kitty-rest.png",
  "./icons/kitty-book.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});

const CACHE_NAME = "meow-daily-v45";
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
  const url = new URL(event.request.url);
  const isIcon = url.pathname.includes('/icons/');

  // 图标：缓存优先，保证稳定显示。
  // GitHub Pages 对所有响应加 Access-Control-Allow-Origin:*，浏览器把同源图片当成
  // "cors" 类型，因此运行时不能依赖 type==="basic" 的判断，这里直接缓存所有 ok 响应。
  if (isIcon) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
            }
            return res;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // 其余资源：网络优先，失败回退缓存（index.html 兜底）
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});

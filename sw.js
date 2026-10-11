const CACHE_NAME = "zayavki-cache-v1.1";
const SHELL = ["./", "index.html", "style.css", "app.js", "manifest.json", "icon-192.png", "icon-512.png"];
const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all([cache.addAll(SHELL), cache.add(LIB).catch(() => {})])
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Запросы к Supabase (данные, фото, авторизация) не кэшируем
  if (url.hostname.endsWith("supabase.co")) return;
  // Библиотека с CDN и шрифты: из кэша, если есть
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok && url.hostname === "cdn.jsdelivr.net") {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      }))
    );
    return;
  }
  // Файлы приложения: сначала сеть (чтобы обновления доходили), без сети из кэша
  event.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || caches.match("index.html")))
  );
});

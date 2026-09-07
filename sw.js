self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open("rally-v2").then((cache) => cache.addAll(["./", "./index.html", "./styles.css", "./app.js", "./manifest.json", "./icon.svg"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => res).catch(() => caches.match("./index.html")))
  );
});

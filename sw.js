// Service Worker：网络优先，离线时回退缓存（添加到主屏幕后没网也能玩）
const VERSION = 'boba-v1';
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'css/style.css', 'js/main.js', 'js/data.js', 'js/models.js', 'js/world.js', 'js/game.js', 'js/ui.js', 'js/audio.js', 'lib/three.module.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then((res) => { if (res.ok) { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(req, cp)); } return res; })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('index.html'))),
  );
});

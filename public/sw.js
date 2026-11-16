// Offline support: the app works without signal (e.g. a bleep test on a field).
// Pages are fetched fresh when online and served from cache when offline. /api is never cached.
const CACHE = 'seaready-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return;
  const sameOrigin = url.origin === self.location.origin;
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || url.hostname === 'cdn.jsdelivr.net';
  if (!sameOrigin && !fonts) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { caches.open(CACHE).then((c) => c.put('/', res.clone())); return res; }).catch(() => caches.match('/')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') caches.open(CACHE).then((c) => c.put(req, res.clone())); return res; }).catch(() => hit);
    return hit || net;
  }));
});

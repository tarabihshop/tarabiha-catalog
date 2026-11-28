// Service Worker: التطبيق والكتالوج يشتغلوا من غير نت، والصور بتتخزن أول ما تتشاف
const SHELL = 'tb-shell-v2', IMG = 'tb-img-v1', FONT = 'tb-font-v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== IMG && k !== FONT).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function networkFirst(req) {
  const net = fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(SHELL).then(c => c.put(req, cp)); } return res; });
  const timeout = new Promise((_, rej) => setTimeout(rej, 5000));
  return Promise.race([net, timeout]).catch(() => caches.match(req).then(m => m || net.catch(() => caches.match('index.html'))));
}
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // خط Tajawal من جوجل: بنخزّنه عشان الشكل يفضل زي ما هو حتى من غير نت
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT).then(c => c.match(r).then(m => {
      const net = fetch(r).then(res => { if (res.ok || res.type === 'opaque') c.put(r, res.clone()); return res; }).catch(() => m);
      return m || net;
    })));
    return;
  }
  if (u.origin !== location.origin) return;
  const p = u.pathname;
  if (r.mode === 'navigate' || p.endsWith('/catalog.json') || p.endsWith('/app.json') || p.endsWith('/index.html') || p.endsWith('/sw.js')) {
    e.respondWith(networkFirst(r)); return;
  }
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(IMG).then(c => c.put(r, cp)); }
    return res;
  })));
});

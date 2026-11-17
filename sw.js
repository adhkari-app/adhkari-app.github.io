// Service worker — offline-first
const VERSION = 'adhkari-v1.4.1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './css/fonts.css', './css/style.css',
  './js/app.js', './js/store.js', './js/data.js', './js/sun.js', './js/challenge.js', './js/firebase-config.js', './js/quran.js', './js/fx.js', './js/extras.js', './js/prayer.js', './js/more.js', './js/data2.js', './js/reminders.js',
  './data/quran-pages.json',
  './data/quran-meta.json', './data/quran-text.json',
  './fonts/amiri-quran-arabic-400-normal.woff2', './fonts/amiri-quran-latin-400-normal.woff2',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-64.png',
  './fonts/amiri-arabic-400-normal.woff2', './fonts/amiri-arabic-700-normal.woff2',
  './fonts/amiri-latin-400-normal.woff2', './fonts/amiri-latin-700-normal.woff2',
  './fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2', './fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2',
  './fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2', './fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2',
  './fonts/ibm-plex-sans-arabic-latin-400-normal.woff2', './fonts/ibm-plex-sans-arabic-latin-500-normal.woff2',
  './fonts/ibm-plex-sans-arabic-latin-600-normal.woff2', './fonts/ibm-plex-sans-arabic-latin-700-normal.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Same-origin: cache first, then network
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match('./index.html')))
    );
    return;
  }

  // Firebase SDK files: stale-while-revalidate so circles load faster next time
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});

// Push reminders (data-only FCM messages)
self.addEventListener('push', e => {
  let d = {};
  try { const j = e.data ? e.data.json() : {}; d = j.data || j; } catch (err) { d = { title: 'أذكاري', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'أذكاري', {
    body: d.body || '', icon: './icons/icon-192.png', badge: './icons/favicon-64.png', dir: 'rtl', lang: 'ar',
    tag: d.tag || 'adhkari', renotify: true, data: { link: d.link || '#/home' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL('./' + (e.notification.data && e.notification.data.link || '#/home'), self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { c.navigate(url).catch(() => {}); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});

// Service worker — offline-first
const VERSION = 'adhkari-v2.1.8';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './css/fonts.css', './css/style.css',
  './js/app.js', './js/store.js', './js/data.js', './js/sun.js', './js/challenge.js', './js/firebase-config.js', './js/quran.js', './js/fx.js', './js/extras.js', './js/prayer.js', './js/more.js', './js/data2.js', './js/reminders.js', './js/recite.js', './js/recite-engine.js', './js/mushaf.js', './js/offline.js', './js/backup.js', './js/sadaqa.js', './js/martyrs.js',
  './data/quran-pages.json', './data/mushaf-qcf4.json', './data/mushaf-qcf4-map.json', './data/mushaf-qcf4-w.json',
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

const KEEP = [VERSION, 'adhkari-audio', 'adhkari-mushaf'];
const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
// big or third-party files: fetched after install so the app also works offline later (failures are fine)
const EXTRA = ['./data/tafsir-muyassar.json'];
const EXTRA_CORS = ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js', 'firebase-messaging.js'].map(f => FB + f);

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !KEEP.includes(k)).map(k => caches.delete(k))))
    .then(() => self.clients.claim())
    .then(() => caches.open(VERSION).then(async c => {
      for (const u of EXTRA) { try { if (!(await c.match(u))) await c.add(u); } catch (err) {} }
      for (const u of EXTRA_CORS) { try { if (!(await c.match(u))) { const r = await fetch(u, { mode: 'cors' }); if (r.ok) await c.put(u, r); } } catch (err) {} }
    })));
});

// Serve a cached file, answering Range requests (needed by Safari for audio)
async function fromCacheWithRange(req, hit) {
  if (hit.type === 'opaque') return hit;
  const range = req.headers.get('range');
  const blob = await hit.blob();
  const type = hit.headers.get('content-type') || 'audio/mpeg';
  if (!range) return new Response(blob, { status: 200, headers: { 'Content-Type': type, 'Content-Length': String(blob.size), 'Accept-Ranges': 'bytes' } });
  const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  let start = m[1] ? +m[1] : 0, end = m[2] ? +m[2] : blob.size - 1;
  if (!m[1] && m[2]) { start = Math.max(0, blob.size - +m[2]); end = blob.size - 1; }
  end = Math.min(end, blob.size - 1);
  if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${blob.size}` } });
  return new Response(blob.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': type, 'Content-Length': String(end - start + 1), 'Content-Range': `bytes ${start}-${end}/${blob.size}`, 'Accept-Ranges': 'bytes' } });
}
const BRS = [64, 128, 192, 48, 40, 32];
async function audio(req) {
  const c = await caches.open('adhkari-audio');
  let hit = await c.match(req.url);
  if (!hit) {
    // same ayah saved at another bitrate?
    const m = /\/quran\/audio\/(\d+)\/([^/]+)\/(\d+)\.mp3/.exec(new URL(req.url).pathname);
    if (m) for (const br of BRS) { hit = await c.match(`https://cdn.islamic.network/quran/audio/${br}/${m[2]}/${m[3]}.mp3`); if (hit) break; }
  }
  if (hit) return fromCacheWithRange(req, hit);
  return fetch(req);
}

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

  // Quran audio downloaded for offline listening
  if (url.hostname === 'cdn.islamic.network' && url.pathname.startsWith('/quran/audio/')) { e.respondWith(audio(req)); return; }

  // Mushaf fonts (King Fahd Complex QCF4 via jsDelivr): cache first, kept across versions
  if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/quran-qcf4@')) {
    e.respondWith(caches.open('adhkari-mushaf').then(async c => {
      const hit = await c.match(req.url);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.type !== 'opaque') c.put(req.url, res.clone());
      return res;
    }));
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

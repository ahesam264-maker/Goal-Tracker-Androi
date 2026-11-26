/* Service Worker نسخه وب — کش آفلاین (فقط برای http/https ثبت می‌شود) */
const CACHE = 'masir-v1';
const CORE = ['./index.html', './sw.js'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // ناوبری (صفحه اصلی): اول شبکه، بعد کش — تا به‌روزرسانی‌ها اعمال شوند
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', clone)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match('./index.html').then((r) => r || Response.error()))
    );
    return;
  }

  // بقیه منابع (فونت‌ها، آیکون‌ها): کش اول، سپس شبکه
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req)
            .then((resp) => {
              if (resp.ok) {
                const clone = resp.clone();
                caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
              }
              return resp;
            })
            .catch(() => cached || Response.error())
      )
    );
  }
});

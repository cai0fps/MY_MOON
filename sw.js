const CACHE_NAME = 'NB-cache-v5'; // Subimos para v3 para forçar atualização

const APP_SHELL = [
  './',
  './index.html',
  './offline.html',
  './style.css',
  './config.json',
  './js/main.js',
  './js/audio.js',
  './js/ui.js',
  './js/timer.js',
  './js/wrapped.js',
  './tela-inicial/nova.jpg' // CORRIGIDO: de .webp para .jpg
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Ignora mídia e Range requests para o Android conseguir tocar o áudio
  const isMedia = url.pathname.endsWith('.mp3') || url.pathname.endsWith('.mp4') || url.pathname.endsWith('.weba');
  if (isMedia || request.headers.has('range')) {
    return; 
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put('./index.html', responseClone);
          });
          return networkResponse;
        })
        .catch(() => caches.match('./offline.html'))
    );
    return;
  }

  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

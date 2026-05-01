const CACHE_NAME = 'NB-cache-v2'; // Versão alterada para forçar a atualização

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
  './tela-inicial/nova.webp'
];

// Instala e já força a nova versão
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

// Ativa e remove caches antigos
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

// Estratégia:
// - HTML: network first
// - CSS/JS/imagens locais: cache first com atualização em background
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Só trata GET
  if (request.method !== 'GET') return;

  // CORREÇÃO PARA ANDROID: Ignora arquivos de mídia e requisições em partes (Range)
  // Isso permite que o player nativo do Android faça o download da música sem o SW atrapalhar.
  const isMedia = url.pathname.endsWith('.mp3') || url.pathname.endsWith('.mp4') || url.pathname.endsWith('.weba');
  if (isMedia || request.headers.has('range')) {
    return; 
  }

  // HTML / navegação -> busca na rede primeiro
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

  // Arquivos locais do próprio site
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

// 四魂鑑 Service Worker
const CACHE_NAME = 'shikon-v2-1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
];

// インストール時に基本アセットをキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ネットワーク優先、失敗時はキャッシュから（CDN資産も含めて）
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 成功したらキャッシュに保存（HTML・JS・CSS・画像・フォントすべて）
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // 自分のオリジンか、CDNのアセットならキャッシュ
          const url = new URL(event.request.url);
          if (
            url.origin === self.location.origin ||
            url.hostname.includes('unpkg.com') ||
            url.hostname.includes('googleapis.com') ||
            url.hostname.includes('gstatic.com')
          ) {
            cache.put(event.request, responseClone).catch(() => {});
          }
        });
        return response;
      })
      .catch(() => {
        // ネットワーク失敗時はキャッシュから
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // それでもなければトップページを返す
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

const CACHE_NAME = 'cleaning-app-cache-v9';

// オフラインで動作させるためにキャッシュするファイル
// ★ スクリーンレイアウトJSONをすべてここに追加してください ★
const urlsToCache = [
  'index.html',
  'screen.html',
  'records.html',
  'admin.html',
  'static/style.css',
  'static/script.js',
  'manifest.json',
  'image/icon-192.jpg',
  'image/icon-512.jpg',
  'screen_layouts/1.json',
  'screen_layouts/2.json',
  'screen_layouts/3.json',
  'screen_layouts/4.json',
  'screen_layouts/5.json',
  'screen_layouts/6.json',
  'screen_layouts/7.json',
  'screen_layouts/8.json',
  'screen_layouts/9.json',
  'screen_layouts/10.json'
];

// 1. インストール（初回のみ）
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// 2. 有効化（古いキャッシュの削除）
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});


// 3. fetch（オフライン時のキャッシュ応答）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // キャッシュにあればそれを返す
        if (response) {
          return response;
        }
        // キャッシュになければネットワークから取得
        return fetch(event.request);
      }
    )
  );

});




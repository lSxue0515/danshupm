const CACHE_NAME = 'danshu-shell-v5';

const SHELL_ASSETS = [
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/grid.css',
  './css/apps.css',
  './css/widgets.css',
  './css/animations.css',
  './css/api.css',
  './css/appearance.css',
  './css/notify/notify.css',
  './css/chat.css',
  './css/chat-advanced.css',
  './css/favorite/favorite.css',
  './css/beautify/beautify.css',
  './css/sticker/sticker.css',
  './css/worldbook.css',
  './css/page2widget.css',
  './css/dock.css',
  './css/page3widget.css',
  './css/location/location.css',
  './css/game.css',
  './css/music.css',
  './css/novel.css',
  './css/boot.css',
  './css/moments.css',
  './css/theater.css',
  './css/forum.css',
  './css/phonesnoop.css',
  './js/boot.js',
  './js/storage.js',
  './js/utils.js',
  './js/viewport-fix.js',
  './js/pages.js',
  './js/card.js',
  './js/countdown.js',
  './js/api.js',
  './js/appearance.js',
  './js/notify.js',
  './js/chat.js',
  './js/chat-advanced.js',
  './js/favorite.js',
  './js/beautify/beautify.js',
  './js/sticker/sticker.js',
  './js/worldbook.js',
  './js/location.js',
  './js/game.js',
  './js/music.js',
  './js/novel.js',
  './js/app.js',
  './js/theater.js',
  './js/forum.js',
  './js/moments.js',
  './js/page2widget.js',
  './js/page3widget.js',
  './js/phonesnoop.js',
  './js/pwa.js',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

const STATIC_EXT_RE = /\.(?:css|js|html|webmanifest|png|svg|ico)$/i;
const SHELL_PATHS = new Set(
  SHELL_ASSETS.map(function (asset) {
    return new URL(asset, self.location.href).pathname;
  })
);

// ✅ 补上这个函数，之前完全缺失导致 fetch 事件直接报错崩溃
function shouldHandleRequest(request) {
  const url = new URL(request.url);
  return url.origin === self.location.origin && request.method === 'GET';
}

// ✅ 补上 install：预缓存所有资源，装好后立刻激活不等待
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

// ✅ 补上 activate：清掉所有旧缓存，立刻接管PWA进程
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) {
          return key !== CACHE_NAME;
        }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

// ✅ fetch：网络优先，失败降级缓存
self.addEventListener('fetch', function (event) {
  if (!shouldHandleRequest(event.request)) {
    return;
  }

  event.respondWith(
    fetch(event.request).then(function (networkResponse) {
      if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
        const requestUrl = new URL(event.request.url);
        if (SHELL_PATHS.has(requestUrl.pathname) || STATIC_EXT_RE.test(requestUrl.pathname)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, responseToCache);
          });
        }
      }
      return networkResponse;
    }).catch(function () {
      return caches.match(event.request).then(function (cachedResponse) {
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        throw new Error('Network request failed and no cache entry was found.');
      });
    })
  );
});

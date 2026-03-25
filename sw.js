// 缓存版本和需要缓存的资源
const CACHE_NAME = 'trace-helper-v1';
const CACHE_ASSETS = [
    './index.html',
    './icon-192x192.png',
    './icon-512x512.png',
    './manifest.json'
];

// 安装阶段：缓存静态资源
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CACHE_ASSETS))
            .then(() => self.skipWaiting()) // 立即激活新SW
    );
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(name => {
                    if (name !== CACHE_NAME) return caches.delete(name);
                })
            );
        }).then(() => self.clients.claim()) // 接管所有客户端
    );
});

// 拦截请求：优先使用缓存，离线时返回缓存内容
self.addEventListener('fetch', (event) => {
    // 忽略非GET请求
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 缓存有资源则返回，同时后台更新缓存
                if (response) {
                    fetch(event.request).then(newRes => {
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, newRes);
                        });
                    }).catch(() => { });
                    return response;
                }

                // 无缓存则请求网络，成功后缓存
                return fetch(event.request)
                    .then(response => {
                        if (!response || response.status !== 200) return response;
                        const resClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, resClone);
                        });
                        return response;
                    })
                    // 离线且无缓存时返回友好提示
                    .catch(() => {
                        return new Response(
                            '<h1 style="text-align:center;margin-top:50px;color:#e0e0e0;">离线状态</h1><p style="text-align:center;color:#888;">请联网后重试</p>',
                            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
                        );
                    });
            })
    );
});

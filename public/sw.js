const scopeUrl = new URL(self.registration.scope);
const BASE_PATH = scopeUrl.pathname.replace(/\/$/, '');
const appPath = (path) => `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}` || '/';
const CACHE_NAME = `sipandu-shell-v2:${BASE_PATH || 'root'}`;
const SHELL_ASSETS = [
    appPath('/manifest.webmanifest'),
    appPath('/offline.html'),
    appPath('/icons/sipandu-icon.svg'),
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(SHELL_ASSETS))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key.startsWith('sipandu-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    const apiPrefix = appPath('/sipandu-api/');
    const privatePaths = [
        appPath('/login'),
        appPath('/logout'),
        appPath('/setup'),
        appPath('/sso/start'),
        appPath('/sso/callback'),
    ];

    if (url.pathname.startsWith(apiPrefix) || privatePaths.includes(url.pathname)) {
        event.respondWith(fetch(request));
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(async () => {
                const fallback = await caches.match(appPath('/offline.html'));
                return fallback || Response.error();
            }),
        );
        return;
    }

    const isStaticAsset = url.pathname.startsWith(appPath('/build/')) || SHELL_ASSETS.includes(url.pathname);
    if (!isStaticAsset) return;

    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                if (!response || response.status !== 200 || response.type !== 'basic') return response;
                const copy = response.clone();
                void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                return response;
            });
        }),
    );
});

// Lumina PWA Service Worker
const CACHE_NAME = 'lumina-cache-v1';
const STATIC_CACHE = 'lumina-static-v1';
const API_CACHE = 'lumina-api-v1';

// App shell files to cache on install
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ─── Install ────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(APP_SHELL);
    })
  );
  // Activate new SW immediately without waiting for old one to finish
  self.skipWaiting();
});

// ─── Activate ───────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const CURRENT_CACHES = [CACHE_NAME, STATIC_CACHE, API_CACHE];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !CURRENT_CACHES.includes(name))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// ─── Fetch ──────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Skip ALL Vite dev server requests (HMR websocket, source files, virtual modules)
  // This prevents the SW from caching/intercepting hot-reloaded modules in dev mode
  if (
    url.hostname === 'localhost' &&
    (url.pathname.startsWith('/@') ||
      url.pathname.startsWith('/node_modules') ||
      /\.(tsx?|jsx?)(\?.*)?$/.test(url.pathname))
  ) return;

  // Network-first strategy for API calls (e.g. Supabase)
  if (url.pathname.startsWith('/api') || url.hostname.includes('supabase')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Cache-first strategy for static assets (images, CSS, JS, fonts)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Network-first for navigation / HTML
  event.respondWith(networkFirst(request, CACHE_NAME));
});

// ─── Strategies ─────────────────────────────────────────────────────

/**
 * Cache-first: try cache, fall back to network and update cache.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return a basic offline fallback if needed
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Network-first: try network, fall back to cache.
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // For navigation requests return the cached index.html (SPA fallback)
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|ttf|eot)(\?.*)?$/.test(pathname);
}

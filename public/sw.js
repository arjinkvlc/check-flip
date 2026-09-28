/**
 * Check Flip — service worker: makes the game installable and loads it fast (and
 * offline for single player). Registered as /sw.js?v=<version>, so every release
 * gets a fresh cache.
 *
 *  - pages: network first, cached copy when offline
 *  - game files and the two CDN libraries: served from cache, refreshed in the background
 *  - multiplayer (/ws) and accounts (Supabase) are never cached
 */
const VERSION = new URL(self.location).searchParams.get('v') || 'dev';
const CACHE = 'checkflip-' + VERSION;
const SHELL = [
  '/', '/manifest.webmanifest', '/css/style.css', '/assets/logo.svg',
  '/js/app.js', '/js/engine.js', '/js/i18n.js', '/js/i18n-account.js', '/js/i18n-v11.js', '/js/i18n-v13.js', '/js/sound.js', '/js/music.js',
  '/js/net.js', '/js/account.js', '/js/account-ui.js', '/js/social-ui.js', '/js/config.js', '/js/tips.js', '/js/share.js',
  '/js/pwa.js', '/js/version.js',
  ...['waiter', 'waitress', 'student', 'foodie', 'italian', 'doner', 'noodle', 'baker', 'grandma', 'critic', 'barista', 'sommelier'].map(k => `/assets/avatars/${k}.svg`)
];
const CDN = ['https://cdn.jsdelivr.net/', 'https://fonts.googleapis.com/', 'https://fonts.gstatic.com/'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('checkflip-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function staleWhileRevalidate(req) {
  const c = await caches.open(CACHE), hit = await c.match(req);
  const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => null);
  return hit || (await net) || new Response('', {status: 504});
}
async function networkFirst(req) {
  const c = await caches.open(CACHE);
  try { const r = await fetch(req); if (r && r.ok) c.put('/', r.clone()); return r; }
  catch (e) { return (await c.match('/')) || new Response('Offline', {status: 503}); }
}

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname === '/ws' || url.pathname.startsWith('/cdn-cgi/')) return;
    if (req.mode === 'navigate') { if (url.pathname === '/' ) e.respondWith(networkFirst(req)); return; }
    e.respondWith(staleWhileRevalidate(req));
    return;
  }
  if (CDN.some(p => req.url.startsWith(p))) e.respondWith(staleWhileRevalidate(req));
});

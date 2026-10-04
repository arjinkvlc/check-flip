/**
 * Check Flip — service worker: makes the game installable and loads it fast (and
 * offline for single player). Registered as /sw.js?v=<version>, so every release
 * gets a fresh cache.
 *
 *  - pages, scripts and styles: network first, cached copy when offline
 *    (so a new release never mixes a new page with old scripts)
 *  - images, fonts and libraries (/assets, /vendor): served from cache, refreshed in the background
 *  - multiplayer (/ws) and accounts (Supabase) are never cached
 */
const VERSION = new URL(self.location).searchParams.get('v') || 'dev';
const CACHE = 'checkflip-' + VERSION;
const SHELL = [
  '/', '/manifest.webmanifest', '/css/style.css', '/assets/logo.svg',
  '/js/app.js', '/js/engine.js', '/js/i18n.js', '/js/i18n-account.js', '/js/admin-ui.js', '/js/lang/en.js', '/js/lang/tr.js', '/js/lang/es.js', '/js/lang/pt.js', '/js/lang/fr.js', '/js/lang/de.js', '/js/seo-text.js', '/js/filter.js', '/js/sound.js', '/js/music.js',
  '/js/net.js', '/js/account.js', '/js/account-ui.js', '/js/social-ui.js', '/js/config.js', '/js/tips.js', '/js/share.js', '/js/icons.js', '/js/events.js', '/js/event-art.js', '/js/patch.js', '/assets/sfx/dice-roll.mp3', '/assets/sfx/dice-land.mp3',
  '/js/pwa.js', '/js/version.js', '/vendor/mqtt-5.10.1.min.js', '/vendor/supabase-js-2.117.2.js', '/vendor/fonts/fonts.css',
  ...['figtree-latin-400-normal', 'figtree-latin-600-normal', 'figtree-latin-700-normal', 'baloo-2-latin-700-normal', 'baloo-2-latin-800-normal'].map(f => `/vendor/fonts/${f}.woff2`),
  ...['waiter', 'waitress', 'student', 'foodie', 'italian', 'doner', 'noodle', 'baker', 'grandma', 'critic', 'barista', 'sommelier', 'pumpkin'].map(k => `/assets/avatars/${k}.svg`)
];
const CDN = [];   // v1.10: fonts and libraries are served from our own site (/vendor)

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, {cache: 'reload'})).catch(() => {})))).then(() => self.skipWaiting()));
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
async function networkFirst(req, key) {
  const c = await caches.open(CACHE);
  try { const r = await fetch(req, {cache: 'no-cache'}); if (r && r.ok) c.put(key || req, r.clone()); return r; }
  catch (e) { return (await c.match(key || req, {ignoreSearch: true})) || new Response('Offline', {status: 503}); }
}

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname === '/ws' || url.pathname.startsWith('/cdn-cgi/')) return;
    if (req.mode === 'navigate') { if (url.pathname === '/') e.respondWith(networkFirst(req, '/')); return; }
    e.respondWith(url.pathname.startsWith('/assets/') || url.pathname.startsWith('/vendor/') ? staleWhileRevalidate(req) : networkFirst(req));
    return;
  }
  if (CDN.some(p => req.url.startsWith(p))) e.respondWith(staleWhileRevalidate(req));
});

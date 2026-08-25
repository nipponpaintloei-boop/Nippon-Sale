const CACHE_NAME = 'nippon-sale-auth-v2-persistent';
const SHELL = [
  '/', '/index.html', '/manifest.json', '/auth.js', '/supabase-config.js',
  '/icon-192.png', '/icon-512.png', '/icon-maskable-192.png', '/icon-maskable-512.png',
  '/apple-touch-icon.png', '/favicon-16.png', '/favicon-32.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;
  if(event.request.mode === 'navigate'){
    event.respondWith(fetch(event.request).then(r=>{if(r.ok)caches.open(CACHE_NAME).then(c=>c.put('/index.html',r.clone()));return r;}).catch(()=>caches.match('/index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(c=>c||fetch(event.request).then(r=>{if(r.ok)caches.open(CACHE_NAME).then(x=>x.put(event.request,r.clone()));return r;})));
});

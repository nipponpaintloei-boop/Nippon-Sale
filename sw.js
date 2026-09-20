const CACHE_NAME = 'nippon-sale-auth-v4-modular';
const SHELL = [
  '/', '/index.html', '/manifest.json', '/auth.js', '/supabase-config.js',
  '/icon-192.png', '/icon-512.png', '/icon-maskable-192.png', '/icon-maskable-512.png',
  '/apple-touch-icon.png', '/favicon-16.png', '/favicon-32.png',
  '/css/base.css',
  '/css/views-order.css',
  '/css/gallon-incentive.css',
  '/css/overlays-mks.css',
  '/css/auth-desktop.css',
  '/css/header-widgets.css',
  '/js/core/icons.js',
  '/js/data/seed-data.js',
  '/js/core/utils.js',
  '/js/domain/commission-calc.js',
  '/js/core/state.js',
  '/js/core/storage.js',
  '/js/core/realtime-sync.js',
  '/js/core/persistence.js',
  '/js/core/product-index.js',
  '/js/ui/dialogs.js',
  '/js/features/audit-notifications.js',
  '/js/features/export-backup.js',
  '/js/features/import-products.js',
  '/js/ui/navigation.js',
  '/js/features/entry-form.js',
  '/js/features/bill-cart.js',
  '/js/features/customers.js',
  '/js/features/share-summary.js',
  '/js/features/gauge-celebration.js',
  '/js/features/bill-grouping.js',
  '/js/views/dashboard.js',
  '/js/ui/header.js',
  '/js/features/action-center.js',
  '/js/views/commission.js',
  '/js/ui/custom-select.js',
  '/js/features/gallon-incentive.js',
  '/js/views/history.js',
  '/js/views/stock.js',
  '/js/views/stock-bulk.js',
  '/js/views/order.js',
  '/js/views/products.js',
  '/js/views/yearly.js',
  '/js/views/settings.js',
  '/js/views/mks.js',
  '/js/app.js'
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

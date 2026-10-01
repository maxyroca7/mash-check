/*
 * sw.js — Service worker: guarda los archivos de la app en el celular para que abra SIN señal.
 *
 * IMPORTANTE: cada vez que cambies CUALQUIER archivo de la app, subí el número de VERSION.
 * Es lo que le avisa al celular que hay una versión nueva: al cambiar el nombre de la caché,
 * se descarga todo de nuevo y se borra la caché vieja (ver "activate").
 *
 * Los DATOS (registros y planillas) no se guardan acá: viven en localStorage y no se tocan.
 */
const VERSION = 'mash-check-v1';

// Todo lo que la app necesita para arrancar sin red. RUTAS RELATIVAS: en GitHub Pages la app
// está en /mash-check/ y una ruta como '/index.html' apuntaría a la raíz del dominio.
const ARCHIVOS = [
  './',
  './index.html',
  './css/styles.css',
  './js/planillas-base.js',
  './js/store.js',
  './js/report.js',
  './js/app.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// INSTALL: se guarda todo el "kit" de la app. Si un solo archivo falla, el service worker no se
// instala (mejor eso que una app a medias). skipWaiting = no esperar a que se cierre la app vieja.
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

// ACTIVATE: borra las cachés de versiones anteriores y toma el control de las pestañas abiertas.
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== VERSION).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// FETCH: "red primero, caché si no hay señal". Con señal siempre trae lo último (así los cambios
// se ven apenas se suben); sin señal usa la copia guardada.
// cache: 'no-cache' obliga a revisar con el servidor: GitHub Pages le dice al navegador que
// guarde los archivos ~10 minutos, y sin esto una versión nueva podía tardar en aparecer.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((respuesta) => {
        if (respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copia));
        }
        return respuesta;
      })
      .catch(() =>
        // Sin señal: la copia guardada; si es una página y no está, la pantalla principal.
        caches.match(e.request).then((r) => r || caches.match('./index.html'))
      )
  );
});

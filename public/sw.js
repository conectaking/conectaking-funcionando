/**
 * Service Worker (Conecta King) - versão segura
 *
 * Verses antigas interceptavam todos os fetch() e faziam respondWith(fetch(request)).
 * Isso quebrava páginas como kingSelectionProject.html?itemId=... (erro no Console:
 * "FetchEvent resulted in a network error" / "Failed to fetch at sw.js:36").
 *
 * Este ficheiro NO regista listener de "fetch": os pedidos HTTP seguem o comportamento
 * normal do browser. Mantm-se s install/activate para substituir SW problemtico apdeploy.
 *
 * Deploy: servir na raiz do site (mesmo sítio que index/dashboard), p.ex. public/sw.js.
 * Depois: recarregar o site com "Hard reload" ou Application > Service Workers > Unregister (uma vez).
 */

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

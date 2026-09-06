/**
 * Service Worker (Conecta King) - vers�o segura
 *
 * Vers�es antigas interceptavam todos os fetch() e faziam respondWith(fetch(request)).
 * Isso quebrava p�ginas como kingSelectionProject.html?itemId=... (erro no Console:
 * "FetchEvent resulted in a network error" / "Failed to fetch at sw.js:36").
 *
 * Este ficheiro N�O regista listener de "fetch": os pedidos HTTP seguem o comportamento
 * normal do browser. Mant�m-se s� install/activate para substituir SW problem�tico ap�s deploy.
 *
 * Deploy: copiar para a raiz do site (mesmo s�tio que index/dashboard), p.ex. Hostinger:
 *   /public_html/sw.js
 * Depois: recarregar o site com "Hard reload" ou Application > Service Workers > Unregister (uma vez).
 */

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

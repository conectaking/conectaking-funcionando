/**
 * API Conecta King — mesma origem no VPS (sem Render).
 */
(function () {
  var origin = (typeof location !== 'undefined' && location.origin)
    ? String(location.origin).replace(/\/$/, '')
    : 'https://www.conectaking.com.br';
  window.API_URL = origin;
  window.API_BASE = window.API_URL;
})();

(function () {
  window.ckEnsureChart = function () {
    if (typeof window.Chart !== 'undefined') return Promise.resolve(window.Chart);
    return Promise.reject(new Error('Chart.js não carregou (vendor-globals)'));
  };
  window.ckEnsureLeaflet = function () {
    if (window.L) return Promise.resolve(window.L);
    return Promise.reject(new Error('Leaflet não carregou (vendor-globals)'));
  };
})();

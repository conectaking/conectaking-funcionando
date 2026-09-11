(function () {
  window.ckEnsureChart = function () {
    if (typeof window.Chart !== 'undefined') return Promise.resolve(window.Chart);
    return import('../vendor-chart.js').then(function () { return window.Chart; });
  };
  window.ckEnsureLeaflet = function () {
    if (window.L) return Promise.resolve(window.L);
    return import('../vendor-leaflet.js').then(function () { return window.L; });
  };
  window.ckEnsureQRCode = function () {
    if (typeof window.QRCode !== 'undefined') return Promise.resolve(window.QRCode);
    return import('../vendor-qrcode.js').then(function () { return window.QRCode; });
  };
})();

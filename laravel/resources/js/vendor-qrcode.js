import QRCode from 'qrcode';

if (typeof window !== 'undefined' && !window.QRCode) {
  window.QRCode = function QRCodeCompat(el, opts) {
    const canvas = document.createElement('canvas');
    const node = typeof el === 'string' ? document.getElementById(el) : el;
    if (node) {
      node.innerHTML = '';
      node.appendChild(canvas);
    }
    const text = (opts && (opts.text || opts)) || '';
    const width = (opts && opts.width) || 128;
    QRCode.toCanvas(canvas, String(text), { width, margin: 1 }, function () {});
    this._canvas = canvas;
    this.clear = function () {
      try {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      } catch (e) {}
    };
    this.makeCode = function (t) {
      QRCode.toCanvas(canvas, String(t || ''), { width, margin: 1 }, function () {});
    };
  };
  window.QRCode.toCanvas = QRCode.toCanvas.bind(QRCode);
  window.QRCode.toDataURL = QRCode.toDataURL.bind(QRCode);
  window.QRCode.CorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };
}

export { QRCode };

/**
 * Vendor npm → window globals usados pelas páginas Blade/legado.
 * Cropper pinado em 1.6.2 (API do painel).
 */
import Chart from 'chart.js/auto';
import L from 'leaflet';
import Sortable from 'sortablejs';
import Cropper from 'cropperjs';
import { jsPDF } from 'jspdf';
import { Html5Qrcode } from 'html5-qrcode';
import html2pdf from 'html2pdf.js';
import QRCode from 'qrcode';
import 'leaflet/dist/leaflet.css';
import 'cropperjs/dist/cropper.css';

if (typeof window !== 'undefined') {
  window.Chart = window.Chart || Chart;
  window.L = window.L || L;
  window.Sortable = window.Sortable || Sortable;
  window.Cropper = window.Cropper || Cropper;
  window.jspdf = window.jspdf || { jsPDF };
  window.jsPDF = window.jsPDF || jsPDF;
  window.Html5Qrcode = window.Html5Qrcode || Html5Qrcode;
  window.html2pdf = window.html2pdf || html2pdf;
  // Compat com qrcodejs (new QRCode(el, opts)) vs npm qrcode (QRCode.toCanvas)
  if (!window.QRCode) {
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
}

export { Chart, L, Sortable, Cropper, jsPDF, Html5Qrcode, html2pdf, QRCode };

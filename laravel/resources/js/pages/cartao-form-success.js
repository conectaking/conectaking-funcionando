import '../../css/fonts.css';
import '@css/pages/cartao-form-success.css';
import '../vendor-globals.js';

(function () {
  var el = document.getElementById('qrcode');
  if (!el || typeof QRCode === 'undefined') return;
  new QRCode(el, {
    text: window.__CK_BOOT_FORM_SUCCESS.j0,
    width: 180,
    height: 180,
    correctLevel: QRCode.CorrectLevel.M
  });
})();

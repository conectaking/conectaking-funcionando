import '../../css/fonts.css';
import '../vendor-globals.js';

(function () {
  var token = window.__CK_BOOT_GUEST_PORTARIA.j0;
  var checkinBase = window.__CK_BOOT_GUEST_PORTARIA.j1;
  var searchUrl = window.__CK_BOOT_GUEST_PORTARIA.j2;
  var verifyQrBase = window.__CK_BOOT_GUEST_PORTARIA.j3;
  var confirmQrBase = window.__CK_BOOT_GUEST_PORTARIA.j4;
  var msg = document.getElementById('msg');
  var qrScanner = null;

  function showMsg(text, ok) {
    msg.textContent = text;
    msg.className = 'msg ' + (ok ? 'ok' : 'err');
  }

  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('on'); });
      document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('on'); });
      tab.classList.add('on');
      var panel = document.querySelector('.panel[data-panel="' + tab.getAttribute('data-tab') + '"]');
      if (panel) panel.classList.add('on');
    });
  });

  document.getElementById('search').addEventListener('input', function () {
    var q = this.value.trim().toLowerCase();
    document.querySelectorAll('.panel.on .row').forEach(function (row) {
      var n = row.getAttribute('data-name') || '';
      row.style.display = (!q || n.indexOf(q) !== -1) ? '' : 'none';
    });
  });

  async function doCheckin(id) {
    var res = await fetch(checkinBase + id, { method: 'POST', headers: { 'Accept': 'application/json' } });
    var json = await res.json().catch(function () { return {}; });
    if (!res.ok || json.success === false) throw new Error(json.message || 'Falha no check-in');
    showMsg((json.guest && json.guest.name ? json.guest.name + ': ' : '') + (json.message || 'OK'), true);
    setTimeout(function () { location.reload(); }, 700);
  }

  document.querySelectorAll('.checkin-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      btn.disabled = true;
      doCheckin(btn.getAttribute('data-id')).catch(function (e) {
        showMsg(e.message || 'Erro', false);
        btn.disabled = false;
      });
    });
  });

  document.getElementById('btn-search').addEventListener('click', async function () {
    var q = document.getElementById('search').value.trim();
    if (q.length < 2) { showMsg('Digite pelo menos 2 caracteres.', false); return; }
    try {
      var res = await fetch(searchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ token: token, search: q })
      });
      var json = await res.json().catch(function () { return {}; });
      if (json.partial && json.suggestions) {
        showMsg(json.message + ' Sugestões: ' + json.suggestions.map(function (s) { return s.name; }).join(', '), false);
        return;
      }
      if (!res.ok || json.success === false) throw new Error(json.message || 'Não encontrado');
      showMsg(json.message || 'OK', true);
      setTimeout(function () { location.reload(); }, 800);
    } catch (e) {
      showMsg(e.message || 'Erro', false);
    }
  });

  async function handleQr(decoded) {
    var raw = String(decoded || '').trim();
    var m = raw.match(/([a-f0-9]{32,})/i);
    var qr = m ? m[1] : raw;
    if (qr.length < 32) { showMsg('QR inválido.', false); return; }
    try {
      var v = await fetch(verifyQrBase + encodeURIComponent(qr), { headers: { 'Accept': 'application/json' } });
      var vj = await v.json().catch(function () { return {}; });
      if (!v.ok || vj.success === false) throw new Error(vj.message || 'QR não encontrado');
      if (vj.alreadyCheckedIn) { showMsg((vj.guest && vj.guest.name || '') + ' já fez check-in.', true); return; }
      var c = await fetch(confirmQrBase + encodeURIComponent(qr), { method: 'POST', headers: { 'Accept': 'application/json' } });
      var cj = await c.json().catch(function () { return {}; });
      if (!c.ok || cj.success === false) throw new Error(cj.message || 'Falha ao confirmar QR');
      showMsg((cj.guest && cj.guest.name ? cj.guest.name + ': ' : '') + (cj.message || 'OK'), true);
      setTimeout(function () { location.reload(); }, 800);
    } catch (e) {
      showMsg(e.message || 'Erro QR', false);
    }
  }

  document.getElementById('btn-qr').addEventListener('click', function () {
    document.getElementById('qr-wrap').style.display = 'block';
    if (qrScanner) return;
    qrScanner = new Html5Qrcode('qr-reader');
    qrScanner.start(
      { facingMode: 'environment' },
      { fps: 8, qrbox: { width: 240, height: 240 } },
      function (decoded) { handleQr(decoded); },
      function () {}
    ).catch(function (e) { showMsg('Câmera indisponível: ' + (e && e.message || e), false); });
  });

  document.getElementById('btn-qr-stop').addEventListener('click', function () {
    if (!qrScanner) return;
    qrScanner.stop().then(function () {
      qrScanner.clear();
      qrScanner = null;
      document.getElementById('qr-wrap').style.display = 'none';
    }).catch(function () {});
  });
})();

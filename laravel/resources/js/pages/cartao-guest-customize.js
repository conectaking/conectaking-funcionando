import '../../css/fonts.css';
import '@css/pages/cartao-guest-customize.css';
import '../vendor-globals.js';

(function () {
  var form = document.getElementById('form');
  var msg = document.getElementById('msg');
  var token = window.__CK_BOOT_GUEST_CUSTOMIZE.j0;
  var saveUrl = window.__CK_BOOT_GUEST_CUSTOMIZE.j1;

  function syncPreview() {
    var bg = form.background_color && form.background_color.value;
    var tx = form.text_color && form.text_color.value;
    var pr = form.primary_color && form.primary_color.value;
    var pv = document.getElementById('preview');
    if (bg) pv.style.background = bg;
    if (tx) pv.style.color = tx;
    if (pr) document.getElementById('pv-title').style.color = pr;
    var titleEl = form.event_title_custom || form.form_title;
    if (titleEl && titleEl.value) document.getElementById('pv-title').textContent = titleEl.value;
  }
  form.addEventListener('input', syncPreview);

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    msg.className = '';
    msg.textContent = '';
    var btn = document.getElementById('saveBtn');
    btn.disabled = true;
    var body = {};
    Array.from(form.elements).forEach(function (el) {
      if (!el.name) return;
      body[el.name] = el.value;
    });
    try {
      var headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      var res = await fetch(saveUrl, {
        method: 'PUT',
        credentials: 'include',
        headers: headers,
        body: JSON.stringify(body)
      });
      var json = await res.json().catch(function () { return {}; });
      if (!res.ok || json.success === false) throw new Error(json.message || 'Falha ao salvar');
      msg.textContent = json.message || 'Salvo!';
      msg.className = 'ok';
    } catch (err) {
      msg.textContent = err.message || 'Erro';
      msg.className = 'err';
    } finally {
      btn.disabled = false;
    }
  });
})();

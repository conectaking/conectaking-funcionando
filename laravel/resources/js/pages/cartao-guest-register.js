import '../../css/fonts.css';
import '../vendor-globals.js';

(function () {
  var form = document.getElementById('reg-form');
  var ok = document.getElementById('ok');
  var err = document.getElementById('err');
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    ok.style.display = 'none';
    err.style.display = 'none';
    var fd = new FormData(form);
    var body = {};
    var custom = {};
    fd.forEach(function (v, k) {
      var el = form.querySelector('[name="' + k + '"]');
      if (el && el.getAttribute('data-custom')) {
        custom[el.getAttribute('data-custom')] = v;
      } else if (k.indexOf('custom_') !== 0) {
        body[k] = v;
      }
    });
    body.custom_responses = custom;
    var btn = form.querySelector('button');
    btn.disabled = true;
    try {
      var res = await fetch(window.__CK_BOOT_GUEST_REGISTER.j0, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body)
      });
      var json = await res.json().catch(function () { return {}; });
      if (!res.ok || json.success === false) throw new Error(json.message || 'Falha ao inscrever');
      form.reset();
      ok.textContent = json.requires_confirmation
        ? 'Inscrição recebida! Aguarde a confirmação.'
        : 'Inscrição confirmada com sucesso!';
      ok.style.display = 'block';
    } catch (ex) {
      err.textContent = ex.message || 'Erro';
      err.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  });
})();

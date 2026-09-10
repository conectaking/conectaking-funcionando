import '../../css/fonts.css';
import '../vendor-globals.js';

(function () {
  var form = document.getElementById('confirm-form');
  var ok = document.getElementById('ok');
  var err = document.getElementById('err');
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    ok.style.display = 'none'; err.style.display = 'none';
    var ids = Array.from(form.querySelectorAll('input[name="guest_ids[]"]:checked')).map(function (el) { return Number(el.value); });
    if (!ids.length) { err.textContent = 'Selecione ao menos um convidado.'; err.style.display = 'block'; return; }
    try {
      var res = await fetch(window.__CK_BOOT_GUEST_CONFIRM.j0, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ guest_ids: ids })
      });
      var json = await res.json().catch(function () { return {}; });
      if (!res.ok || json.success === false) throw new Error(json.message || 'Falha ao confirmar');
      ok.textContent = (json.confirmed_count || 0) + ' confirmação(ões) registrada(s).';
      ok.style.display = 'block';
      setTimeout(function () { location.reload(); }, 900);
    } catch (ex) {
      err.textContent = ex.message || 'Erro';
      err.style.display = 'block';
    }
  });
})();

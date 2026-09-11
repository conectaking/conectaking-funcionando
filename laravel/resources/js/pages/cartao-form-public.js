import '../../css/fonts.css';
import '@css/pages/cartao-form-public.css';
import '../vendor-globals.js';

(function () {
  var form = document.getElementById('ck-form');
  var ok = document.getElementById('ok');
  var err = document.getElementById('err');
  var fieldsMeta = window.__CK_BOOT_FORM_PUBLIC.j0;

  function applyConditionals() {
    form.querySelectorAll('.field[data-depends-on]').forEach(function (el) {
      var parentId = el.getAttribute('data-depends-on');
      var need = el.getAttribute('data-depends-on-value') || 'Sim';
      var parent = form.querySelector('[name="' + parentId + '"]:checked')
        || form.querySelector('[name="' + parentId + '"]');
      var val = '';
      if (parent) {
        if (parent.type === 'checkbox') val = parent.checked ? (parent.value || '1') : '';
        else val = parent.value || '';
      }
      var radios = form.querySelectorAll('[name="' + parentId + '"]');
      if (radios.length > 1) {
        radios.forEach(function (r) { if (r.checked) val = r.value; });
      }
      var show = String(val) === String(need);
      el.classList.toggle('hidden-cond', !show);
      el.querySelectorAll('input,textarea,select').forEach(function (inp) {
        if (show) {
          if (inp.dataset.wasRequired === '1') inp.required = true;
        } else {
          if (inp.required) inp.dataset.wasRequired = '1';
          inp.required = false;
        }
      });
    });
  }

  form.querySelectorAll('.ynwt').forEach(function (r) {
    r.addEventListener('change', function () {
      var wrap = r.closest('.field');
      var box = wrap && wrap.querySelector('.follow');
      var group = wrap && wrap.querySelector('.yes-no-follow');
      if (!box || !group) return;
      var trigger = group.getAttribute('data-follow-trigger') || 'Sim';
      box.classList.toggle('show', r.checked && r.value === trigger);
    });
  });

  form.addEventListener('change', applyConditionals);
  applyConditionals();

  function pickContact(data) {
    var name = '', email = '', phone = '';
    fieldsMeta.forEach(function (m) {
      if (!m.id) return;
      var v = data[m.id];
      if (v == null || v === '') return;
      var s = Array.isArray(v) ? v.join(', ') : String(v);
      var low = (m.label + ' ' + m.type + ' ' + m.id).toLowerCase();
      if (!name && (m.type === 'short_text' || m.type === 'text') && /nome|name/.test(low)) name = s;
      if (!email && (m.type === 'email' || /e-?mail/.test(low))) email = s;
      if (!phone && (m.type === 'phone' || m.type === 'tel' || /telefone|whats|celular|fone/.test(low))) phone = s;
    });
    return { name: name, email: email, phone: phone };
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    ok.style.display = 'none';
    err.style.display = 'none';
    applyConditionals();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    var data = {};
    Array.from(form.elements).forEach(function (el) {
      if (!el.name || el.type === 'submit' || el.type === 'file') return;
      var fieldEl = el.closest('.field');
      if (fieldEl && fieldEl.classList.contains('hidden-cond')) return;
      var key = el.name.replace(/\[\]$/, '');
      if (el.type === 'checkbox') {
        if (!el.checked) return;
        if (el.name.slice(-2) === '[]' || el.getAttribute('data-multi') === '1') {
          if (!Array.isArray(data[key])) data[key] = [];
          data[key].push(el.value);
        } else {
          data[key] = el.value || '1';
        }
      } else if (el.type === 'radio') {
        if (el.checked) data[key] = el.value;
      } else {
        data[key] = el.value;
      }
    });
    var contact = pickContact(data);
    var btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      var res = await fetch(window.__CK_BOOT_FORM_PUBLIC.j1, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          response_data: data,
          responder_name: contact.name || null,
          responder_email: contact.email || null,
          responder_phone: contact.phone || null
        })
      });
      var json = await res.json().catch(function () { return {}; });
      if (!res.ok || json.success === false) throw new Error(json.message || 'Falha ao enviar');
      form.reset();
      applyConditionals();
      if (json.success_page_url) {
        window.location.href = json.success_page_url;
        return;
      }
      ok.style.display = 'block';
      ok.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      if (json.enable_whatsapp && json.whatsapp_number) {
        var wa = String(json.whatsapp_number).replace(/\D+/g, '');
        if (wa) {
          window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent('Olá! Acabei de preencher o formulário.'), '_blank');
        }
      }
    } catch (ex) {
      err.textContent = ex.message || 'Erro';
      err.style.display = 'block';
    } finally {
      btn.disabled = false;
    }
  });
})();

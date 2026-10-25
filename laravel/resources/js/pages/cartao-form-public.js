import '../../css/fonts.css';
import '@css/pages/cartao-form-public.css';
import '../vendor-globals.js';

(function () {
  var form = document.getElementById('ck-form');
  if (!form) return;

  var ok = document.getElementById('ok');
  var okMsg = document.getElementById('ok-msg');
  var okWaWrap = document.getElementById('ok-wa-wrap');
  var okWaBtn = document.getElementById('ok-wa-btn');
  var err = document.getElementById('err');
  var boot = window.__CK_BOOT_FORM_PUBLIC || {};
  var fieldsMeta = boot.j0 || [];
  var submitUrl = boot.j1 || '';

  var progressFill = document.getElementById('kf-progress-fill');
  var progressText = document.getElementById('kf-progress-text');

  // Máscara dinâmica para Telefone / WhatsApp: (99) 9999-9999 ou (99) 99999-9999
  function maskPhone(value) {
    var v = (value || '').replace(/\D/g, '').slice(0, 11);
    if (!v) return '';
    if (v.length <= 2) return '(' + v;
    if (v.length <= 6) return '(' + v.slice(0, 2) + ') ' + v.slice(2);
    if (v.length <= 10) return '(' + v.slice(0, 2) + ') ' + v.slice(2, 6) + '-' + v.slice(6);
    return '(' + v.slice(0, 2) + ') ' + v.slice(2, 7) + '-' + v.slice(7);
  }

  // Máscara para CPF: 999.999.999-99
  function maskCpf(value) {
    var v = (value || '').replace(/\D/g, '').slice(0, 11);
    if (!v) return '';
    if (v.length <= 3) return v;
    if (v.length <= 6) return v.slice(0, 3) + '.' + v.slice(3);
    if (v.length <= 9) return v.slice(0, 3) + '.' + v.slice(3, 6) + '.' + v.slice(6);
    return v.slice(0, 3) + '.' + v.slice(3, 6) + '.' + v.slice(6, 9) + '-' + v.slice(9);
  }

  function setupMasks() {
    form.querySelectorAll('input').forEach(function (inp) {
      if (inp.type === 'file' || inp.type === 'checkbox' || inp.type === 'radio' || inp.type === 'submit') return;
      var fType = (inp.getAttribute('data-field-type') || inp.type || '').toLowerCase();
      var labelText = '';
      var parent = inp.closest('.field');
      if (parent) {
        var lab = parent.querySelector('.lab');
        if (lab) labelText = lab.textContent.toLowerCase();
      }
      var ph = (inp.placeholder || '').toLowerCase();
      var name = (inp.name || '').toLowerCase();
      var fullTxt = fType + ' ' + labelText + ' ' + ph + ' ' + name;

      if (fType === 'tel' || /telefone|celular|whatsapp|whats|fone/.test(fullTxt)) {
        inp.type = 'tel';
        inp.maxLength = 15;
        inp.addEventListener('input', function () {
          inp.value = maskPhone(inp.value);
          updateProgress();
        });
        if (inp.value) inp.value = maskPhone(inp.value);
      } else if (/\bcpf\b/.test(fullTxt)) {
        inp.maxLength = 14;
        inp.addEventListener('input', function () {
          inp.value = maskCpf(inp.value);
          updateProgress();
        });
        if (inp.value) inp.value = maskCpf(inp.value);
      }
    });
  }

  function updateProgress() {
    if (!progressFill) return;
    var fields = Array.from(form.querySelectorAll('.field')).filter(function (f) {
      return !f.classList.contains('hidden-cond');
    });
    if (fields.length === 0) return;

    var filled = 0;
    fields.forEach(function (f) {
      var inputs = Array.from(f.querySelectorAll('input:not([type=submit]), textarea, select'));
      var isFilled = false;
      for (var i = 0; i < inputs.length; i++) {
        var el = inputs[i];
        if (el.type === 'checkbox' || el.type === 'radio') {
          if (el.checked) { isFilled = true; break; }
        } else if (el.type === 'file') {
          if (el.files && el.files.length > 0) { isFilled = true; break; }
        } else {
          if (el.value && el.value.trim().length > 0) { isFilled = true; break; }
        }
      }
      if (isFilled) filled++;
    });

    var pct = Math.min(100, Math.round((filled / fields.length) * 100));
    progressFill.style.width = pct + '%';
    if (progressText) {
      if (pct === 100) {
        progressText.innerHTML = '<strong>✓ Tudo pronto!</strong> (' + filled + '/' + fields.length + ')';
        progressText.classList.add('completed');
      } else {
        progressText.textContent = pct + '% concluído (' + filled + '/' + fields.length + ')';
        progressText.classList.remove('completed');
      }
    }
  }

  function getFieldMatch(fieldEl, targetId) {
    if (!targetId || !fieldEl) return false;
    var fid = fieldEl.getAttribute('data-field-id');
    var fidx = fieldEl.getAttribute('data-field-index');
    if (fid === targetId) return true;
    if (fidx === targetId) return true;
    if ('field_' + fidx === targetId || 'f_' + fidx === targetId) return true;
    if (fid && ('field_' + fid === targetId || 'f_' + fid === targetId)) return true;
    if (fid && targetId.replace(/^(field_|f_)/, '') === fid.replace(/^(field_|f_)/, '')) return true;
    return false;
  }

  function applyConditionals() {
    // 1. Coletar todos os IDs de perguntas a ocultar conforme hideOnAnswer
    var hideSet = new Set();
    form.querySelectorAll('.field[data-hide-on-sim], .field[data-hide-on-nao]').forEach(function (triggerField) {
      var checkedRadio = triggerField.querySelector('input[type="radio"]:checked');
      var val = '';
      if (checkedRadio) {
        val = String(checkedRadio.value || '').trim();
      } else {
        var sel = triggerField.querySelector('select');
        if (sel) val = String(sel.value || '').trim();
      }

      var isSim = /^(sim|yes|s)$/i.test(val);
      var isNao = /^(não|nao|no|n)$/i.test(val);

      var hideSimStr = triggerField.getAttribute('data-hide-on-sim') || '';
      var hideNaoStr = triggerField.getAttribute('data-hide-on-nao') || '';

      var simIds = hideSimStr.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      var naoIds = hideNaoStr.split(',').map(function (s) { return s.trim(); }).filter(Boolean);

      var toHide = [];
      if (isSim) toHide = simIds;
      else if (isNao) toHide = naoIds;

      toHide.forEach(function (id) {
        hideSet.add(id);
      });
    });

    // 2. Aplicar visibilidade e obrigatoriedade para cada campo
    form.querySelectorAll('.field').forEach(function (el) {
      var isHiddenByHide = false;
      hideSet.forEach(function (hid) {
        if (getFieldMatch(el, hid)) isHiddenByHide = true;
      });

      var isHiddenByDepends = false;
      if (el.hasAttribute('data-depends-on')) {
        var parentId = el.getAttribute('data-depends-on');
        var need = el.getAttribute('data-depends-on-value') || 'Sim';
        var parentField = Array.from(form.querySelectorAll('.field')).find(function (f) {
          return getFieldMatch(f, parentId);
        });

        var val = '';
        if (parentField) {
          var checked = parentField.querySelector('input:checked');
          if (checked) {
            val = checked.value;
          } else {
            var otherInp = parentField.querySelector('input, textarea, select');
            if (otherInp) val = otherInp.value || '';
          }
        } else {
          var radios = form.querySelectorAll('[name="' + parentId + '"]');
          if (radios.length > 0) {
            radios.forEach(function (r) { if (r.checked) val = r.value; });
          } else {
            var fallbackInp = form.querySelector('[name="' + parentId + '"]');
            if (fallbackInp) val = fallbackInp.value || '';
          }
        }

        if (String(val) !== String(need)) {
          isHiddenByDepends = true;
        }
      }

      var shouldHide = isHiddenByHide || isHiddenByDepends;
      el.classList.toggle('hidden-cond', shouldHide);

      el.querySelectorAll('input,textarea,select').forEach(function (inp) {
        if (!shouldHide) {
          if (inp.dataset.wasRequired === '1') {
            inp.required = true;
            delete inp.dataset.wasRequired;
          }
        } else {
          if (inp.required) inp.dataset.wasRequired = '1';
          inp.required = false;
        }
      });
    });

    updateProgress();
  }

  form.querySelectorAll('.ynwt').forEach(function (r) {
    r.addEventListener('change', function () {
      var wrap = r.closest('.field');
      var box = wrap && wrap.querySelector('.follow');
      var group = wrap && wrap.querySelector('.yes-no-follow');
      if (box && group) {
        var trigger = group.getAttribute('data-follow-trigger') || 'Sim';
        box.classList.toggle('show', r.checked && r.value === trigger);
      }
      applyConditionals();
      updateProgress();
    });
  });

  form.querySelectorAll('input[type="radio"], select').forEach(function (el) {
    el.addEventListener('change', function () {
      applyConditionals();
      updateProgress();
    });
  });

  form.addEventListener('change', function () {
    applyConditionals();
    updateProgress();
  });
  form.addEventListener('input', updateProgress);

  setupMasks();
  applyConditionals();
  updateProgress();

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
    if (ok) ok.style.display = 'none';
    if (err) err.style.display = 'none';
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
    if (btn) btn.disabled = true;

    function getCkCsrf() {
      try {
        var match = document.cookie.match(/(?:^|;\s*)ck_csrf=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
      } catch (e) { return ''; }
    }

    try {
      var reqHeaders = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      var csrfToken = getCkCsrf();
      if (csrfToken) {
        reqHeaders['X-CK-CSRF'] = csrfToken;
      }

      var res = await fetch(submitUrl, {
        method: 'POST',
        headers: reqHeaders,
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
      updateProgress();

      if (json.success_page_url) {
        window.location.href = json.success_page_url;
        return;
      }

      if (ok) {
        if (okMsg && json.message) okMsg.textContent = json.message;
        var waNumber = json.whatsapp_number || boot.wa;
        if (waNumber && (json.enable_whatsapp || boot.enableWa)) {
          var cleanWa = String(waNumber).replace(/\D+/g, '');
          if (cleanWa && okWaWrap && okWaBtn) {
            okWaBtn.href = 'https://wa.me/' + cleanWa + '?text=' + encodeURIComponent('Olá! Acabei de enviar minhas respostas pelo formulário.');
            okWaWrap.style.display = 'block';
          }
        }
        ok.style.display = 'block';
        ok.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      if (json.enable_whatsapp && json.whatsapp_number) {
        var wa = String(json.whatsapp_number).replace(/\D+/g, '');
        if (wa) {
          window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent('Olá! Acabei de preencher o formulário.'), '_blank');
        }
      }
    } catch (ex) {
      if (err) {
        err.textContent = ex.message || 'Erro';
        err.style.display = 'block';
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  });
})();

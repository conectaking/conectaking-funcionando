import '@legacy/assets/css/ui.css';
import '@legacy/js/ck-auth-gate.js';

(async function () {
  if (!(await window.CkAuth.requireAuth('/login'))) return;

  var apiBase = (window.API_BASE || window.API_URL || '').replace(/\/$/, '');
  var token = window.CkAuth.lsToken() || null;
  var plans = [];
  var edited = {};

  function showDenied() {
    document.getElementById('ap-loading').style.display = 'none';
    document.getElementById('ap-denied').style.display = 'block';
  }

  function showContent() {
    document.getElementById('ap-loading').style.display = 'none';
    document.getElementById('ap-content').style.display = 'block';
  }

  function showMessage(msg, isError) {
    var el = document.getElementById('ap-message');
    el.textContent = msg;
    el.className = 'ap-message ' + (isError ? 'error' : 'success');
    el.style.display = 'block';
    setTimeout(function () { el.style.display = 'none'; }, 4000);
  }

  function renderRows() {
    var tbody = document.getElementById('ap-tbody');
    tbody.innerHTML = plans.map(function (p) {
      var val = edited[p.id] !== undefined ? edited[p.id] : (p.kingbrief_minutes_per_month != null ? p.kingbrief_minutes_per_month : '');
      return '<tr data-id="' + p.id + '">' +
        '<td>' + escapeHtml(p.plan_name || '') + '</td>' +
        '<td><code>' + escapeHtml(p.plan_code || '') + '</code></td>' +
        '<td><input type="number" min="0" step="1" placeholder="Ilimitado" value="' + (val !== '' ? val : '') + '" data-plan-id="' + p.id + '"/></td>' +
        '<td><button type="button" class="kb-btn kb-btn-icon ap-save-one" data-plan-id="' + p.id + '" title="Guardar este plano"><span class="material-icons-round">save</span></button></td></tr>';
    }).join('');
    tbody.querySelectorAll('input[type=number]').forEach(function (input) {
      input.addEventListener('change', function () {
        var id = parseInt(input.dataset.planId, 10);
        var v = input.value.trim();
        edited[id] = v === '' ? null : parseInt(v, 10);
      });
    });
    tbody.querySelectorAll('.ap-save-one').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.dataset.planId, 10);
        var plan = plans.find(function (p) { return p.id === id; });
        var input = document.querySelector('input[data-plan-id="' + id + '"]');
        var v = input.value.trim();
        var minutes = v === '' ? null : Math.max(0, parseInt(v, 10));
        savePlan(id, minutes);
      });
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function authHeaders(extra) {
    var h = Object.assign({ 'Content-Type': 'application/json' }, extra || {});
    if (token) h.Authorization = 'Bearer ' + token;
    return h;
  }

  function savePlan(planId, kingbriefMinutes) {
    fetch(apiBase + '/api/admin/plans/' + planId, {
      method: 'PATCH',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ kingbrief_minutes_per_month: kingbriefMinutes })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success && data.data) {
          var idx = plans.findIndex(function (p) { return p.id === planId; });
          if (idx >= 0) plans[idx].kingbrief_minutes_per_month = data.data.kingbrief_minutes_per_month;
          edited[planId] = undefined;
          showMessage('Plano atualizado.', false);
          renderRows();
        } else showMessage(data.message || 'Erro ao guardar.', true);
      })
      .catch(function () { showMessage('Erro de rede.', true); });
  }

  fetch(apiBase + '/api/admin/plans', { headers: authHeaders(), credentials: 'include' })
    .then(function (r) {
      if (r.status === 403 || r.status === 401) { showDenied(); return null; }
      return r.json();
    })
    .then(function (data) {
      if (!data) return;
      if (data.success && Array.isArray(data.data)) {
        plans = data.data;
        showContent();
        renderRows();
      } else showDenied();
    })
    .catch(function () { showDenied(); });

  document.getElementById('ap-save-all').addEventListener('click', function () {
    var ids = Object.keys(edited).map(Number).filter(function (id) { return plans.some(function (p) { return p.id === id; }); });
    if (ids.length === 0) { showMessage('Nenhuma alterao para guardar.', true); return; }
    var i = 0;
    function next() {
      if (i >= ids.length) { showMessage('Alteraes guardadas.', false); edited = {}; renderRows(); return; }
      var id = ids[i++];
      var input = document.querySelector('input[data-plan-id="' + id + '"]');
      var v = input ? input.value.trim() : '';
      var minutes = v === '' ? null : Math.max(0, parseInt(v, 10));
      fetch(apiBase + '/api/admin/plans/' + id, {
        method: 'PATCH',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ kingbrief_minutes_per_month: minutes })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.success && data.data) {
            var idx = plans.findIndex(function (p) { return p.id === id; });
            if (idx >= 0) plans[idx].kingbrief_minutes_per_month = data.data.kingbrief_minutes_per_month;
          }
          next();
        })
        .catch(function () { showMessage('Erro ao guardar.', true); });
    }
    next();
  });
})();

<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Planos (ADM) - Conecta King</title>
  <script src="config.js"></script>
  <link rel="stylesheet" href="assets/css/ui.css"/>
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet"/>
  <style>
    .ap-wrap { max-width: 720px; margin: 0 auto; padding: 24px; }
    .ap-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
    .ap-title { font-size: 1.25rem; font-weight: 600; color: var(--text); }
    .ap-denied { padding: 48px 24px; text-align: center; color: var(--muted); }
    .ap-denied .material-icons-round { font-size: 48px; margin-bottom: 16px; opacity: 0.6; }
    .ap-table { width: 100%; border-collapse: collapse; background: var(--panel-2); border-radius: 12px; overflow: hidden; border: 1px solid var(--stroke); }
    .ap-table th, .ap-table td { padding: 14px 16px; text-align: left; border-bottom: 1px solid var(--stroke); }
    .ap-table th { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); background: var(--panel); }
    .ap-table tr:last-child td { border-bottom: none; }
    .ap-table input[type=number] { width: 100px; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--stroke); background: var(--bg); color: var(--text); font-size: 0.95rem; }
    .ap-table input::placeholder { color: var(--muted); }
    .ap-save { margin-top: 16px; }
    .ap-message { margin-top: 16px; padding: 12px; border-radius: 8px; font-size: 0.9rem; }
    .ap-message.success { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
    .ap-message.error { background: rgba(227, 93, 106, 0.15); color: var(--danger); }
    .ap-hint { font-size: 0.8rem; color: var(--muted); margin-top: 4px; }
  </style>
</head>
<body class="kb-body">
  <header class="kb-header">
    <div class="kb-header-left">
      <a href="dashboard.html" class="kb-logo" aria-label="Voltar">K</a>
      <div>
        <div class="kb-workspace-title">Planos (ADM)</div>
        <div class="kb-workspace-subtitle">Limites KingBrief por plano  s administrador</div>
      </div>
    </div>
    <div class="kb-header-right">
      <a href="dashboard.html" class="kb-btn kb-btn-icon" title="Voltar ao painel"><span class="material-icons-round">arrow_back</span></a>
    </div>
  </header>

  <main class="kb-main">
    <div class="ap-wrap">
      <div id="ap-denied" class="ap-denied" style="display: none;">
        <span class="material-icons-round">lock</span>
        <p>Acesso negado. Esta página  apenas para administradores.</p>
        <a href="dashboard.html" class="kb-btn kb-btn-gold" style="margin-top: 16px;">Ir para o painel</a>
      </div>
      <div id="ap-content" style="display: none;">
        <div class="ap-header">
          <h1 class="ap-title">Limite de minutos KingBrief por plano</h1>
        </div>
        <p class="ap-hint">Defina quantos minutos de udio (por m) cada plano pode usar no KingBrief. Deixe em branco para ilimitado.</p>
        <table class="ap-table" id="ap-table">
          <thead>
            <tr>
              <th>Plano</th>
              <th>Código</th>
              <th>Minutos KingBrief / m</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="ap-tbody"></tbody>
        </table>
        <div class="ap-save">
          <button type="button" class="kb-btn kb-btn-gold" id="ap-save-all">Guardar alterações</button>
        </div>
        <div id="ap-message" class="ap-message" style="display: none;" role="alert"></div>
      </div>
      <div id="ap-loading" style="padding: 48px; text-align: center; color: var(--muted);">A verificar permisses...</div>
    </div>
  </main>

  <script>
(function () {
  var apiBase = (window.API_BASE || window.API_URL || '').replace(/\/$/, '');
  var token = typeof localStorage !== 'undefined' ? localStorage.getItem('conectaKingToken') : null;
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

  function savePlan(planId, kingbriefMinutes) {
    fetch(apiBase + '/api/admin/plans/' + planId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
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

  if (!token) {
    showDenied();
    return;
  }
  fetch(apiBase + '/api/admin/plans', { headers: { 'Authorization': 'Bearer ' + token } })
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
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
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
  </script>
</body>
</html>

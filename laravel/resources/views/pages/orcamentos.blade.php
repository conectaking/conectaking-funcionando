<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Oramentos - ConectaKing</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #111; color: #eee; min-height: 100vh; padding: 20px; }
    .layout { max-width: 1000px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px; font-weight: 600; cursor: pointer; border: none; font-size: 0.95rem; text-decoration: none; }
    .btn-secondary { background: #333; color: #fff; }
    .card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .filters { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; align-items: center; }
    .filters select { padding: 8px 12px; border-radius: 8px; border: 1px solid #444; background: #222; color: #fff; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #333; }
    th { color: #facc15; font-size: 0.85rem; }
    tr:hover { background: rgba(255,255,255,.04); }
    tr[data-id] { cursor: pointer; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
    .badge-high { background: rgba(34,197,94,.25); color: #86efac; }
    .badge-medium { background: rgba(234,179,8,.25); color: #fde047; }
    .badge-low { background: rgba(148,163,184,.25); color: #cbd5e1; }
    .err { background: rgba(239,68,68,.15); color: #fecaca; padding: 12px; border-radius: 8px; margin-bottom: 16px; display: none; }
    .err.show { display: block; }
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 100; display: none; align-items: center; justify-content: center; padding: 20px; }
    .overlay.show { display: flex; }
    .modal { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; max-width: 520px; width: 100%; max-height: 90vh; overflow: auto; }
    .modal h2 { padding: 20px 20px 0; font-size: 1.2rem; color: #facc15; }
    .modal .body { padding: 20px; }
    .modal .row { margin-bottom: 12px; font-size: 0.9rem; }
    .modal .label { color: #888; }
    .modal select { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #444; background: #222; color: #fff; margin-top: 8px; }
    .modal .footer { padding: 16px 20px; border-top: 1px solid #333; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
    .modal .footer .left { display: flex; gap: 8px; align-items: center; }
    .modal .respostas-lista { list-style: none; padding: 0; margin: 0; }
    .modal .respostas-lista li { padding: 10px 0; border-bottom: 1px solid #333; display: flex; justify-content: space-between; gap: 12px; }
    .modal .respostas-lista li:last-child { border-bottom: none; }
    .modal .respostas-lista .label { color: #888; }
    .modal .respostas-lista .value { color: #facc15; }
    .btn-danger { background: rgba(239,68,68,.2); color: #fca5a5; border: 1px solid rgba(239,68,68,.4); }
    .btn-danger:hover { background: rgba(239,68,68,.3); }
    .empty { color: #666; padding: 40px; text-align: center; }
  </style>
</head>
<body>
  <div class="layout">
    <h1><i class="fas fa-file-invoice-dollar"></i> Oramentos</h1>
    <div id="err" class="err"></div>
    <p style="margin-bottom:20px; display:flex; flex-wrap:wrap; gap:10px; align-items:center">
      <a href="recibos-/orcamentos" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Voltar  página anterior</a>
      <a href="/dashboard" class="btn btn-secondary"><i class="fas fa-home"></i> Voltar ao dashboard</a>
    </p>

    <div class="card">
      <div class="filters">
        <span>Filtrar:</span>
        <select id="filter-ticket">
          <option value="">Todos os tickets</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select id="filter-status">
          <option value="">Todos os status</option>
          <option value="novo">Novo</option>
          <option value="em_contato">Em contato</option>
          <option value="orcamento_enviado">Oramento enviado</option>
          <option value="convertido">Convertido</option>
          <option value="perdido">Perdido</option>
        </select>
        <button type="button" class="btn btn-secondary" id="btn-refresh"><i class="fas fa-sync-alt"></i> Atualizar</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Nome</th>
            <th>Contato</th>
            <th>Ticket</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody id="list-body">
          <tr><td colspan="5" class="empty">Carregando...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div id="overlay" class="overlay">
    <div class="modal">
      <h2 id="detail-nome">-</h2>
      <div class="body">
        <div class="row"><span class="label">E-mail</span><br><span id="detail-email">-</span></div>
        <div class="row"><span class="label">WhatsApp</span><br><span id="detail-whatsapp">-</span></div>
        <div class="row"><span class="label">Profissão</span><br><span id="detail-profissao">-</span></div>
        <div class="row"><span class="label">Ticket</span><br><span id="detail-ticket"></span></div>
        <div class="row"><span class="label">Por qu (classificao)</span><br><span id="detail-reason" style="color:#aaa;">-</span></div>
        <div class="row"><span class="label">Recomendao</span><br><span id="detail-recommendation" style="color:#facc15;">-</span></div>
        <div class="row"><span class="label">Respostas do formulrio</span><br><ul id="detail-respostas" class="respostas-lista">-</ul></div>
        <div class="row">
          <label class="label">Alterar status</label>
          <select id="detail-status">
            <option value="novo">Novo</option>
            <option value="em_contato">Em contato</option>
            <option value="orcamento_enviado">Oramento enviado</option>
            <option value="convertido">Convertido</option>
            <option value="perdido">Perdido</option>
          </select>
        </div>
      </div>
      <div class="footer">
        <div class="left">
          <button type="button" class="btn btn-secondary" id="btn-close-modal">Fechar</button>
          <button type="button" class="btn btn-danger" id="btn-delete"><i class="fas fa-trash-alt"></i> Excluir</button>
        </div>
        <button type="button" class="btn btn-primary" id="btn-save-status" style="background:#facc15;color:#000;">Salvar status</button>
      </div>
    </div>
  </div>

  <script src="config.js"></script>
  <script>
(function() {
  const API = (window.API_URL || window.API_BASE || '').replace(/\/$/, '') || (window.location.origin + '/api');
  const token = localStorage.getItem('conectaKingToken');
  if (!token) {
    location.href = '/login?returnUrl=' + encodeURIComponent(location.href);
    return;
  }
  const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
  const apiBase = (window.API_URL || window.API_BASE || '').replace(/\/$/, '');
  const apiOrcamentos = apiBase ? (apiBase + '/api/orcamentos') : (window.location.origin + '/api/orcamentos');

  let currentLeadId = null;

  function showErr(msg) {
    const el = document.getElementById('err');
    el.textContent = msg || '';
    el.classList.toggle('show', !!msg);
  }

  function ticketBadge(ticket) {
    const c = ticket === 'high' ? 'badge-high' : (ticket === 'low' ? 'badge-low' : 'badge-medium');
    const t = (ticket || 'medium').toLowerCase();
    return '<span class="badge ' + c + '">' + (t === 'high' ? 'High' : (t === 'low' ? 'Low' : 'Medium')) + '</span>';
  }

  function formatDate(d) {
    if (!d) return '-';
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  async function loadList() {
    const ticket = document.getElementById('filter-ticket').value || '';
    const status = document.getElementById('filter-status').value || '';
    const tbody = document.getElementById('list-body');
    try {
      const url = apiOrcamentos + (ticket ? '?ticket=' + encodeURIComponent(ticket) : '') + (status ? (ticket ? '&' : '?') + 'status=' + encodeURIComponent(status) : '');
      const res = await fetch(url, { headers });
      const data = await res.json().catch(function() { return {}; });
      if (!res.ok) { showErr(data.message || 'Erro ao carregar'); return; }
      const leads = (data.data && data.data.leads) || data.leads || [];
      if (leads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty">Nenhum oramento encontrado.</td></tr>';
        return;
      }
      tbody.innerHTML = leads.map(function(l) {
        return '<tr data-id="' + l.id + '">' +
          '<td>' + formatDate(l.created_at) + '</td>' +
          '<td>' + (l.nome || '-') + '</td>' +
          '<td>' + (l.email || '') + (l.whatsapp ? '  ' + l.whatsapp : '') + '</td>' +
          '<td>' + ticketBadge(l.ticket) + '</td>' +
          '<td>' + (l.status || 'novo') + '</td></tr>';
      }).join('');
    } catch (e) {
      showErr('Falha: ' + (e.message || ''));
      tbody.innerHTML = '<tr><td colspan="5" class="empty">Erro ao carregar.</td></tr>';
    }
  }

  document.getElementById('list-body').addEventListener('click', function(e) {
    const row = e.target.closest('tr[data-id]');
    if (!row) return;
    openDetail(parseInt(row.dataset.id, 10));
  });

  async function openDetail(id) {
    currentLeadId = id;
    try {
      const res = await fetch(apiOrcamentos + '/' + id, { headers });
      const data = await res.json().catch(function() { return {}; });
      if (!res.ok) { showErr(data.message || 'Erro'); return; }
      const l = (data.data != null ? data.data : data);
      document.getElementById('detail-nome').textContent = l.nome || '-';
      document.getElementById('detail-email').textContent = l.email || '-';
      document.getElementById('detail-whatsapp').textContent = l.whatsapp || '-';
      document.getElementById('detail-profissao').textContent = l.profissao || '-';
      document.getElementById('detail-ticket').innerHTML = ticketBadge(l.ticket);
      document.getElementById('detail-reason').textContent = l.ticket_reason || '-';
      document.getElementById('detail-recommendation').textContent = l.recommendation || '-';
      var resp = l.respostas;
      var LABELS = { faixa_investimento: 'Faixa de investimento', objetivo_fotos: 'Objetivo das fotos', quando_precisa: 'Quando precisa', decisao_sozinho: 'Decisão s sua?', cidade: 'Cidade', estado: 'Estado', como_conheceu: 'Como nos conheceu', tipo_evento: 'Tipo de evento', valor_estimado: 'Valor estimado' };
      var OPCOES = { faixa_investimento: { baixo: 'At R$ 500', medio: 'R$ 500 a R$ 2.000', alto: 'Acima de R$ 2.000' }, objetivo_fotos: { linkedin: 'LinkedIn', marca_pessoal: 'Marca pessoal', corporativo: 'Uso corporativo', posicionamento: 'Posicionamento', pessoal: 'Uso pessoal' }, quando_precisa: { urgente: 'Urgente', '1mes': 'Em 1 m', '3meses': 'Em 3 meses', sem_pressa: 'Sem pressa' }, decisao_sozinho: { sim: 'Sim', nao: 'Não' }, cidade: {}, estado: {}, como_conheceu: { instagram: 'Instagram', indicacao: 'Indicao', google: 'Google / busca', site: 'Site', outro: 'Outro' }, tipo_evento: {}, valor_estimado: {} };
      if (typeof resp !== 'object') resp = {};
      var respHtml = '';
      Object.keys(LABELS).forEach(function(k) {
        var v = resp[k];
        var text = (OPCOES[k] && v && OPCOES[k][v]) ? OPCOES[k][v] : (v || '-');
        respHtml += '<li><span class="label">' + LABELS[k] + '</span><span class="value">' + text + '</span></li>';
      });
      Object.keys(resp).filter(function(k) { return !LABELS[k]; }).forEach(function(k) {
        var v = resp[k];
        if (v == null || v === '') return;
        respHtml += '<li><span class="label">' + k + '</span><span class="value">' + v + '</span></li>';
      });
      document.getElementById('detail-respostas').innerHTML = respHtml || '<li><span class="label">-</span><span class="value">Nenhuma</span></li>';
      document.getElementById('detail-status').value = l.status || 'novo';
      document.getElementById('overlay').classList.add('show');
    } catch (e) {
      showErr(e.message || 'Erro ao abrir');
    }
  }

  document.getElementById('btn-close-modal').addEventListener('click', function() {
    document.getElementById('overlay').classList.remove('show');
  });
  document.getElementById('overlay').addEventListener('click', function(e) {
    if (e.target === document.getElementById('overlay')) document.getElementById('overlay').classList.remove('show');
  });

  document.getElementById('btn-save-status').addEventListener('click', async function() {
    if (!currentLeadId) return;
    const status = document.getElementById('detail-status').value;
    try {
      const res = await fetch(apiOrcamentos + '/' + currentLeadId + '/status', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: status })
      });
      const data = await res.json().catch(function() { return {}; });
      if (!res.ok) { showErr(data.message || 'Erro ao salvar'); return; }
      document.getElementById('overlay').classList.remove('show');
      loadList();
    } catch (e) {
      showErr(e.message || 'Erro');
    }
  });

  document.getElementById('btn-delete').addEventListener('click', async function() {
    if (!currentLeadId) return;
    if (!confirm('Excluir este oramento? Esta ao não pode ser desfeita.')) return;
    try {
      const res = await fetch(apiOrcamentos + '/' + currentLeadId, { method: 'DELETE', headers });
      const data = await res.json().catch(function() { return {}; });
      if (!res.ok) { showErr(data.message || 'Erro ao excluir'); return; }
      document.getElementById('overlay').classList.remove('show');
      currentLeadId = null;
      loadList();
    } catch (e) {
      showErr(e.message || 'Erro');
    }
  });

  document.getElementById('filter-ticket').addEventListener('change', loadList);
  document.getElementById('filter-status').addEventListener('change', loadList);
  document.getElementById('btn-refresh').addEventListener('click', loadList);

  loadList();
})();
  </script>
</body>
</html>

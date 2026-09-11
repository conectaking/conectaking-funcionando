/** orcamentos — Vite entry (extracted inline) */
import '@mod/js/ck-auth-gate.js';
import '@css/pages/orcamentos.css';

(async function() {
  if (!(await window.CkAuth.requireAuth('/login?returnUrl=' + encodeURIComponent(location.href)))) return;

  const API = (window.API_URL || window.API_BASE || '').replace(/\/$/, '') || (window.location.origin + '/api');
  const token = window.CkAuth.lsToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
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

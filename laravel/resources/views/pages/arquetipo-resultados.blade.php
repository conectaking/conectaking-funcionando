<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Testes de Arqutipo - ConectaKing</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #111; color: #eee; min-height: 100vh; padding: 20px; }
    .layout { max-width: 1000px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 10px; font-weight: 600; cursor: pointer; border: none; font-size: 0.95rem; text-decoration: none; }
    .btn-secondary { background: #333; color: #fff; }
    .btn-primary { background: #facc15; color: #000; }
    .card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #333; }
    th { color: #facc15; font-size: 0.85rem; }
    tr.tr-main:hover { background: rgba(255,255,255,.04); }
    tr.tr-main { cursor: pointer; }
    .detalhe-expansivel-row td { vertical-align: top; padding: 0 !important; border-top: none; }
    .detalhe-card { margin: 12px 8px 16px; padding: 24px; background: rgba(250,204,21,0.06); border-radius: 12px; border-left: 4px solid #facc15; text-align: left; }
    .detalhe-card h4 { color: #facc15; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 12px; }
    .detalhe-card .secao { margin-bottom: 20px; }
    .detalhe-card .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px 24px; }
    .detalhe-card .item { font-size: 0.9rem; color: #ccc; }
    .detalhe-card .item strong { color: #fff; display: block; font-size: 0.75rem; margin-bottom: 2px; }
    .detalhe-card ul { list-style: none; padding: 0; margin: 8px 0; }
    .detalhe-card ul li { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,.06); display: flex; justify-content: space-between; gap: 12px; }
    .arq-bar { height: 8px; border-radius: 4px; background: rgba(255,255,255,.1); overflow: hidden; margin-top: 4px; }
    .arq-bar-fill { height: 100%; background: linear-gradient(90deg, #facc15, #eab308); border-radius: 4px; }
    .err { background: rgba(239,68,68,.15); color: #fecaca; padding: 12px; border-radius: 8px; margin-bottom: 16px; display: none; }
    .err.show { display: block; }
    .empty { color: #666; padding: 40px; text-align: center; }
  </style>
</head>
<body>
  <div class="layout">
    <h1><i class="fas fa-user-check"></i> Testes de Arqutipo</h1>
    <div id="err" class="err"></div>
    <p style="margin-bottom:20px">
      <a href="dashboard.html" class="btn btn-secondary"><i class="fas fa-arrow-left"></i> Voltar ao dashboard</a>
    </p>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Nome</th>
            <th>E-mail</th>
            <th>1 Arqutipo</th>
            <th>Detalhes</th>
          </tr>
        </thead>
        <tbody id="list-body">
          <tr><td colspan="5" class="empty">Carregando...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <script src="config.js"></script>
  <script>
(function() {
  const API = (window.API_URL || window.API_BASE || '').replace(/\/$/, '') || (window.location.origin + '/api');
  const token = localStorage.getItem('conectaKingToken');
  if (!token) {
    location.href = 'login.html?returnUrl=' + encodeURIComponent(location.href);
    return;
  }
  const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };

  const ARQUETIPOS_NAMES = { inocente:'O Inocente', sabio:'O Sbio', explorador:'O Explorador', criador:'O Criador', governante:'O Governante', mago:'O Mago', amante:'O Amante', heroi:'O Heri', bufao:'O Bufo', cidadao:'O Cidado', cuidador:'O Cuidador', revolucionario:'O Revolucionrio' };

  function showErr(msg) {
    const el = document.getElementById('err');
    el.textContent = msg || '';
    el.classList.toggle('show', !!msg);
  }

  async function getSiteItemId() {
    const res = await fetch(API.replace(/\/api\/?$/, '') + '/api/profile', { headers });
    const data = await res.json().catch(function() { return {}; });
    if (!res.ok || !data.items || !Array.isArray(data.items)) return null;
    const item = data.items.find(function(it) { return it.item_type === 'photographer_site'; });
    return item ? item.id : null;
  }

  async function loadList() {
    const tbody = document.getElementById('list-body');
    try {
      const siteItemId = await getSiteItemId();
      if (!siteItemId) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty">Nenhum site configurado. Adicione "Meu site" no painel.</td></tr>';
        return;
      }
      const res = await fetch(API.replace(/\/api\/?$/, '') + '/api/sites/arquetipo-leads/' + siteItemId, { headers });
      const data = await res.json().catch(function() { return {}; });
      if (!res.ok) { showErr(data.message || 'Erro ao carregar'); return; }
      const leads = (data.data && data.data.leads) || data.leads || [];
      if (leads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty">Nenhum resultado do teste de arqutipo ainda.</td></tr>';
        return;
      }
      window.__arqLeads = leads;
      var html = '';
      leads.forEach(function(l, idx) {
        var dt = l.created_at ? new Date(l.created_at).toLocaleDateString('pt-BR') : '-';
        var arq = l.arquetipo_resultado ? (ARQUETIPOS_NAMES[l.arquetipo_resultado] || (l.arquetipo_resultado.charAt(0).toUpperCase() + l.arquetipo_resultado.slice(1))) : '-';
        html += '<tr class="tr-main" data-idx="' + idx + '"><td>' + dt + '</td><td>' + (l.nome || '-') + '</td><td>' + (l.email || '-') + '</td><td>' + arq + '</td><td><button type="button" class="btn btn-primary btn-sm btn-detalhe" data-idx="' + idx + '" style="padding:6px 12px;font-size:0.8rem;"><i class="fas fa-chevron-down"></i> Ver detalhes</button></td></tr>';
      });
      tbody.innerHTML = html;

      tbody.querySelectorAll('.btn-detalhe').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var idx = parseInt(btn.getAttribute('data-idx'), 10);
          var tr = btn.closest('tr');
          var next = tr.nextElementSibling;
          if (next && next.classList.contains('detalhe-expansivel-row')) {
            next.remove();
            btn.innerHTML = '<i class="fas fa-chevron-down"></i> Ver detalhes';
            return;
          }
          var l = (window.__arqLeads || [])[idx];
          if (!l) return;
          var scores = (typeof l.arquetipo_scores === 'object' && l.arquetipo_scores !== null) ? l.arquetipo_scores : {};
          var entries = Object.keys(scores).map(function(k) { return { key: k, score: scores[k] }; }).filter(function(x) { return typeof x.score === 'number'; }).sort(function(a, b) { return b.score - a.score; });
          var maxScore = entries.length ? Math.max.apply(null, entries.map(function(x) { return x.score; })) : 1;
          var card = '<div class="detalhe-card"><div class="secao"><h4>Contato</h4><div class="grid">';
          card += '<div class="item"><strong>Nome</strong>' + (l.nome || '-') + '</div>';
          card += '<div class="item"><strong>E-mail</strong>' + (l.email || '-') + '</div>';
          card += '<div class="item"><strong>Data</strong>' + (l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '-') + '</div>';
          if (l.whatsapp) card += '<div class="item"><strong>WhatsApp</strong>' + l.whatsapp + '</div>';
          if (l.instagram) card += '<div class="item"><strong>Instagram</strong>' + l.instagram + '</div>';
          card += '</div></div><div class="secao"><h4>Top 3 arqutipos (pontuao)</h4><ul>';
          entries.slice(0, 3).forEach(function(x, pos) {
            var nomeArq = ARQUETIPOS_NAMES[x.key] || (x.key.charAt(0).toUpperCase() + x.key.slice(1));
            var pct = maxScore ? Math.round((x.score / maxScore) * 100) : 0;
            card += '<li><span><strong>' + (pos + 1) + '</strong> ' + nomeArq + ' - ' + x.score + ' pts</span><span style="min-width:80px;"><div class="arq-bar"><div class="arq-bar-fill" style="width:' + pct + '%;"></div></div></span></li>';
          });
          card += '</ul></div>';
          if (entries.length > 3) {
            card += '<div class="secao"><h4>Demais arqutipos</h4><ul>';
            entries.slice(3, 12).forEach(function(x) {
              var nomeArq = ARQUETIPOS_NAMES[x.key] || (x.key.charAt(0).toUpperCase() + x.key.slice(1));
              var pct = maxScore ? Math.round((x.score / maxScore) * 100) : 0;
              card += '<li><span>' + nomeArq + ' - ' + x.score + ' pts</span><span style="min-width:80px;"><div class="arq-bar"><div class="arq-bar-fill" style="width:' + pct + '%;"></div></div></span></li>';
            });
            card += '</ul></div>';
          }
          card += '</div>';
          var newTr = document.createElement('tr');
          newTr.className = 'detalhe-expansivel-row';
          var td = document.createElement('td');
          td.colSpan = 5;
          td.innerHTML = card;
          newTr.appendChild(td);
          tr.parentNode.insertBefore(newTr, tr.nextSibling);
          btn.innerHTML = '<i class="fas fa-chevron-up"></i> Ocultar detalhes';
        });
      });
    } catch (e) {
      showErr('Falha: ' + (e.message || ''));
      tbody.innerHTML = '<tr><td colspan="5" class="empty">Erro ao carregar.</td></tr>';
    }
  }

  loadList();
})();
  </script>
</body>
</html>

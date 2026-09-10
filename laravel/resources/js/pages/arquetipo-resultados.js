/** arquetipo-resultados — Vite entry (extracted inline) */
import '@legacy/js/ck-auth-gate.js';

(async function() {
  if (!(await window.CkAuth.requireAuth('/login?returnUrl=' + encodeURIComponent(location.href)))) return;

  const API = (window.API_URL || window.API_BASE || '').replace(/\/$/, '') || (window.location.origin + '/api');
  const token = window.CkAuth.lsToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;

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

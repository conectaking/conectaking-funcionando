/** documentos-ver — Vite entry (extracted inline) */

(function() {
  const params = new URLSearchParams(window.location.search || '');
  const token = params.get('token') || '';
  const apiBase = (window.API_URL || window.API_BASE || '').replace(/\/$/, '') || window.location.origin;
  const API_VER = apiBase + '/api/documentos/ver/' + encodeURIComponent(token);

  function formatMoney(n) {
    if (n == null || isNaN(n)) return 'R$ 0,00';
    return 'R$ ' + Number(n).toFixed(2).replace('.', ',');
  }

  function formatData(d) {
    if (!d) return '-';
    const s = String(d).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, day] = s.split('-');
      return day + '/' + m + '/' + y;
    }
    return s || '-';
  }

  function itemIcon(desc) {
    const d = (desc || '').toLowerCase();
    if (d.includes('carne') || d.includes('restaurant') || d.includes('imperatriz')) return { icon: 'restaurant', wrap: 'bg-orange-50 dark:bg-orange-900/20', iconColor: 'text-orange-500' };
    if (d.includes('rota') || d.includes('concessionaria') || d.includes('commute')) return { icon: 'commute', wrap: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-500' };
    if (d.includes('auto') || d.includes('ccr') || d.includes('car')) return { icon: 'directions_car', wrap: 'bg-indigo-50 dark:bg-indigo-900/20', iconColor: 'text-indigo-500' };
    return { icon: 'inventory_2', wrap: 'bg-slate-50 dark:bg-slate-700', iconColor: 'text-slate-400' };
  }

  if (!token) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('notfound').style.display = 'block';
    document.getElementById('notfound').textContent = 'Link inválido. Use o link enviado pelo emitente.';
    return;
  }

  fetch(API_VER)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      document.getElementById('loading').style.display = 'none';
      if (!data.success && !data.data) {
        document.getElementById('notfound').style.display = 'block';
        return;
      }
      const d = data.data || data;
      const emitente = d.emitente_json || {};
      const cliente = d.cliente_json || {};
      const itens = Array.isArray(d.itens_json) ? d.itens_json : [];

      document.getElementById('content-card').style.display = 'block';
      document.getElementById('subtitle').textContent = d.tipo === 'orcamento' ? 'Orçamento' : 'Comprovante de Serviço';
      document.getElementById('doc-title').textContent = 'King #' + (d.numero_sequencial || d.id || '1');
      document.getElementById('doc-date').textContent = 'Emitido em ' + formatData(d.data_documento);

      var logoImg = document.getElementById('doc-logo');
      var logoPlace = document.getElementById('logo-placeholder');
      if (emitente.logo_url) {
        logoImg.src = emitente.logo_url;
        logoImg.style.display = 'block';
        logoImg.onerror = function() { logoImg.style.display = 'none'; logoPlace.style.display = 'inline'; };
        logoPlace.style.display = 'none';
      } else {
        logoPlace.style.display = 'inline';
      }

      document.getElementById('emitente-nome').textContent = emitente.nome || '-';
      document.getElementById('emitente-cnpj').textContent = (emitente.cpf_cnpj || '-').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      document.getElementById('emitente-endereco').textContent = [emitente.endereco, emitente.contato].filter(Boolean).join(', ') || '-';
      document.getElementById('cliente-nome').textContent = cliente.nome || '-';
      document.getElementById('cliente-cnpj').textContent = (cliente.cpf_cnpj || '-').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      document.getElementById('cliente-endereco').textContent = cliente.endereco || '-';

      var tbody = document.getElementById('itens-body');
      var total = 0;
      tbody.innerHTML = itens.map(function(item) {
        var v = Number(item.valor) || 0;
        total += v;
        var desc = (item.descricao || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        var dataVal = (item.data != null ? item.data : '-').replace(/</g, '&lt;');
        var qtd = item.quantidade != null ? item.quantidade : 1;
        var un = item.valor_unitario != null ? Number(item.valor_unitario) : v;
        var info = 'Qtd: ' + qtd + ' . Un: ' + formatMoney(un);
        var ic = itemIcon(item.descricao);
        return '<tr class="group"><td class="py-4 px-6"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-lg ' + ic.wrap + ' flex items-center justify-center"><span class="material-icons-round ' + ic.iconColor + ' text-lg">' + ic.icon + '</span></div><div><p class="text-xs font-semibold">' + desc + '</p><p class="text-[10px] text-slate-400">' + info + '</p></div></div></td><td class="py-4 px-4 text-center text-[11px] font-medium text-slate-500">' + dataVal + '</td><td class="py-4 px-6 text-right text-xs font-bold">' + formatMoney(v) + '</td></tr>';
      }).join('');

      document.getElementById('doc-total').textContent = formatMoney(total);

      var shareUrl = window.location.href;
      document.getElementById('btn-whatsapp').setAttribute('href', 'https://wa.me/?text=' + encodeURIComponent('Revise seu ' + (d.tipo === 'orcamento' ? 'oramento' : 'recibo') + ' aqui: ' + shareUrl));
    })
    .catch(function() {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('notfound').style.display = 'block';
    });

  document.getElementById('btn-print').addEventListener('click', function() { window.print(); });
  document.getElementById('btn-pdf').addEventListener('click', function() {
    fetch(API_VER + '/pdf').then(function(r) { return r.blob(); })
      .then(function(blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'King-documento.pdf';
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(function() { alert('Erro ao baixar PDF'); });
  });
})();

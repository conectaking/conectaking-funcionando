<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Comprovante de Servio - King</title>
  <script src="https://cdn.tailwindcss.com?plugins=forms,typography"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap" rel="stylesheet"/>
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet"/>
  <script>
    tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          colors: {
            primary: "#D4AF37",
            "background-light": "#F3F4F6",
            "background-dark": "#0F172A",
          },
          fontFamily: { display: ["Inter", "sans-serif"] },
          borderRadius: { DEFAULT: "1rem" },
        },
      },
    };
  </script>
  <style>
    body { font-family: 'Inter', sans-serif; -webkit-tap-highlight-color: transparent; }
    .ios-status-bar { height: 44px; }
  </style>
  <style>body { min-height: max(884px, 100dvh); }</style>
</head>
<body class="bg-background-light dark:bg-background-dark min-h-screen text-slate-900 dark:text-slate-100 antialiased transition-colors duration-300">
  <div id="app" class="max-w-md mx-auto min-h-screen flex flex-col relative pb-32">
    <div class="ios-status-bar flex justify-between items-center px-8 pt-4">
      <span class="text-xs font-semibold">9:41</span>
      <div class="flex gap-1.5 items-center">
        <span class="material-icons-round text-[14px]">signal_cellular_alt</span>
        <span class="material-icons-round text-[14px]">wifi</span>
        <span class="material-icons-round text-[18px]">battery_full</span>
      </div>
    </div>
    <header class="flex flex-col items-center pt-6 pb-8">
      <div id="logo-wrap" class="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm mb-2">
        <img id="doc-logo" alt="Logo" class="h-12 w-auto object-contain" src="" style="display:none"/>
        <span id="logo-placeholder" class="text-slate-400 dark:text-slate-500 text-sm font-medium">Logo</span>
      </div>
      <h1 class="text-xl font-bold tracking-tight text-primary">King Digital Invoice</h1>
      <p class="text-xs opacity-60 font-medium" id="subtitle">Comprovante de Servio</p>
    </header>
    <main class="px-5">
      <div id="content-card" class="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden border border-slate-100 dark:border-slate-700/50" style="display:none">
        <div class="p-6 border-b border-slate-50 dark:border-slate-700/50">
          <div class="flex justify-between items-start mb-6">
            <div>
              <h2 id="doc-title" class="text-lg font-bold">King #1</h2>
              <p id="doc-date" class="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">Emitido em -</p>
            </div>
            <span class="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Pago</span>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold mb-1">Emitente</p>
              <p id="emitente-nome" class="text-xs font-semibold">-</p>
              <p id="emitente-cnpj" class="text-[11px] text-slate-500 dark:text-slate-400">-</p>
              <p id="emitente-endereco" class="text-[11px] text-slate-500 dark:text-slate-400">-</p>
            </div>
            <div>
              <p class="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold mb-1">Cliente</p>
              <p id="cliente-nome" class="text-xs font-semibold">-</p>
              <p id="cliente-cnpj" class="text-[11px] text-slate-500 dark:text-slate-400">-</p>
              <p id="cliente-endereco" class="text-[11px] text-slate-500 dark:text-slate-400">-</p>
            </div>
          </div>
        </div>
        <div class="p-0">
          <table class="w-full text-left border-collapse">
            <thead class="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th class="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Descrição</th>
                <th class="py-3 px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase text-center">Data</th>
                <th class="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody id="itens-body" class="divide-y divide-slate-50 dark:divide-slate-700/50"></tbody>
          </table>
        </div>
        <div class="bg-slate-50 dark:bg-slate-900/40 p-6 flex items-center justify-between mt-2">
          <span class="text-sm font-bold text-slate-500">Valor Total</span>
          <div class="bg-primary px-5 py-2.5 rounded-2xl shadow-lg shadow-primary/20">
            <span id="doc-total" class="text-white font-black text-lg tracking-tight">R$ 0,00</span>
          </div>
        </div>
      </div>
      <div class="mt-8 text-center">
        <p class="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
          Esta  uma representao digital de sua nota.<br/>Gerado automaticamente pelo sistema King.
        </p>
      </div>
    </main>
    <div class="fixed bottom-0 left-0 right-0 p-5 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 flex gap-3 max-w-md mx-auto">
      <button type="button" id="btn-print" class="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-sm active:scale-95 transition-all">
        <span class="material-icons-round text-lg">print</span> Imprimir
      </button>
      <a id="btn-whatsapp" href="#" target="_blank" rel="noopener" class="flex-1 bg-[#25D366] text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-green-500/20 active:scale-95 transition-all no-underline">
        <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.558 0 11.894-5.335 11.897-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        WhatsApp
      </a>
      <button type="button" id="btn-pdf" class="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-sm active:scale-95 transition-all">
        <span class="material-icons-round text-lg">picture_as_pdf</span> PDF
      </button>
    </div>
    <div class="fixed top-4 right-4 z-50">
      <button type="button" class="bg-white dark:bg-slate-800 p-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700" onclick="document.documentElement.classList.toggle('dark')">
        <span class="material-icons-round block dark:hidden">dark_mode</span>
        <span class="material-icons-round hidden dark:block">light_mode</span>
      </button>
    </div>
  </div>

  <div id="loading" class="fixed inset-0 bg-background-dark flex items-center justify-center z-50">
    <p class="text-primary font-semibold">Carregando...</p>
  </div>
  <div id="notfound" style="display:none; padding:40px; text-align:center; color:#94a3b8;">
    <p>Documento não encontrado ou link inválido.</p>
  </div>

  <script src="config.js"></script>
  <script>
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
      document.getElementById('subtitle').textContent = d.tipo === 'orcamento' ? 'Oramento' : 'Comprovante de Servio';
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
  </script>
</body>
</html>

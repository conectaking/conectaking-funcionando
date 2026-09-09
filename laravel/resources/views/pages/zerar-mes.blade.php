<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestão do mês - Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <style>
        :root {
            --bg: #0a0a0c;
            --card: #16161a;
            --border: rgba(255,255,255,0.08);
            --text: #f1f5f9;
            --text2: #64748b;
            --green: #22c55e;
            --red: #ef4444;
            --blue: #3b82f6;
        }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Inter', -apple-system, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
        .container { max-width: 900px; margin: 0 auto; padding: 24px; }
        header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
        h1 { font-size: 1.5rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 10px; }
        h1 i { color: var(--blue); }
        .back { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; color: var(--text2); text-decoration: none; font-weight: 600; font-size: 0.9rem; transition: all 0.2s; }
        .back:hover { color: var(--text); border-color: rgba(59,130,246,0.4); background: rgba(59,130,246,0.08); }
        .month-bar { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
        .month-bar select { padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--card); color: var(--text); font-size: 0.95rem; cursor: pointer; }
        .month-bar .label { color: var(--text2); font-weight: 500; }
        .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 20px; margin-bottom: 20px; }
        .toolbar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
        .toolbar label { display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text2); font-size: 0.9rem; }
        .toolbar input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: var(--blue); }
        .btn { padding: 10px 18px; border-radius: 10px; font-weight: 600; font-size: 0.9rem; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s; text-decoration: none; }
        .btn-danger { background: rgba(239,68,68,0.2); color: var(--red); border: 1px solid rgba(239,68,68,0.4); }
        .btn-danger:hover { background: rgba(239,68,68,0.35); }
        .btn-outline { background: transparent; color: var(--text2); border: 1px solid var(--border); }
        .btn-outline:hover { color: var(--text); border-color: var(--text2); }
        .list { display: flex; flex-direction: column; gap: 10px; }
        .item { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; flex-wrap: wrap; }
        .item input[type="checkbox"] { width: 18px; height: 18px; cursor: pointer; accent-color: var(--blue); flex-shrink: 0; }
        .item .type { width: 28px; text-align: center; font-weight: 700; font-size: 1rem; flex-shrink: 0; }
        .item .type.receita { color: var(--green); }
        .item .type.despesa { color: var(--red); }
        .item .desc { flex: 1; min-width: 120px; font-size: 0.95rem; }
        .item .date { color: var(--text2); font-size: 0.85rem; white-space: nowrap; }
        .item .amount { font-weight: 700; font-size: 1rem; white-space: nowrap; }
        .item .amount.receita { color: var(--green); }
        .item .amount.despesa { color: var(--red); }
        .item .btn-remove { padding: 6px 12px; border-radius: 8px; border: none; background: rgba(239,68,68,0.15); color: var(--red); cursor: pointer; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
        .item .btn-remove:hover { background: rgba(239,68,68,0.3); }
        .empty { text-align: center; padding: 48px 24px; color: var(--text2); font-size: 1rem; }
        .empty i { font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5; }
        .loading { text-align: center; padding: 48px; color: var(--text2); }
        .error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #fca5a5; padding: 14px 18px; border-radius: 12px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px; font-size: 0.9rem; color: var(--text2); }
        .summary span strong { color: var(--text); margin-right: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1><i class="fas fa-eraser"></i> Gestão do mês</h1>
            <a href="/dashboard#finance" class="back"><i class="fas fa-arrow-left"></i> Voltar ao painel</a>
        </header>

        <div class="month-bar">
            <span class="label">Mês:</span>
            <select id="sel-month">
                <option value="1">Janeiro</option>
                <option value="2">Fevereiro</option>
                <option value="3">Março</option>
                <option value="4">Abril</option>
                <option value="5">Maio</option>
                <option value="6">Junho</option>
                <option value="7">Julho</option>
                <option value="8">Agosto</option>
                <option value="9">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
            </select>
            <span class="label">Ano:</span>
            <select id="sel-year"></select>
        </div>

        <div id="error-msg" class="error" style="display: none;"></div>
        <div id="loading" class="loading" style="display: none;"><i class="fas fa-spinner fa-spin"></i> Carregando lançamentos...</div>
        <div id="content" class="card" style="display: none;">
            <div class="summary" id="summary"></div>
            <div class="toolbar">
                <label><input type="checkbox" id="check-all"> Selecionar todos</label>
                <button type="button" class="btn btn-danger" id="btn-delete-selected" style="display: none;"><i class="fas fa-trash-alt"></i> Excluir selecionados</button>
            </div>
            <div class="list" id="list"></div>
        </div>
        <div id="empty" class="empty card" style="display: none;">
            <i class="fas fa-inbox"></i>
            <p>Nenhum lançamento neste mês.</p>
            <a href="/dashboard#finance" class="btn btn-outline" style="margin-top: 12px;">Voltar ao painel</a>
        </div>
    </div>

    <script>
        (function() {
            // Mesma regra do dashboard: produção por padrão; API local só com ?api=local ou localStorage useLocalApi
            var forceLocal = (typeof window !== 'undefined' && (
                (new URLSearchParams(window.location.search || '')).get('api') === 'local' ||
                localStorage.getItem('useLocalApi') === 'true'
            ));
            var host = (typeof window !== 'undefined' && window.location.hostname) || 'localhost';
            // Laravel/FrankenPHP: mesma origem; fallback produção só se necessário
            if (forceLocal) {
                window.API_URL = window.location.origin || ('http://' + host + ':8080');
            } else if (/conectaking\.com\.br$/i.test(host) || /cnking\.bio$/i.test(host) || host === 'localhost' || host === '127.0.0.1') {
                window.API_URL = window.location.origin || 'https://www.conectaking.com.br';
            } else {
                window.API_URL = 'https://www.conectaking.com.br';
            }
        })();
        const API_URL = window.API_URL;
        function getToken() { return localStorage.getItem('conectaKingToken'); }
        function getHeaders() {
            const t = getToken();
            return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (t || '') };
        }
        function getAuthHeaders() {
            return { 'Authorization': 'Bearer ' + (getToken() || '') };
        }

        const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        let transactions = [];

        function getParams() {
            const url = new URL(window.location.href);
            const now = new Date();
            const month = parseInt(url.searchParams.get('month') || now.getMonth() + 1, 10);
            const year = parseInt(url.searchParams.get('year') || now.getFullYear(), 10);
            return { month: Math.max(1, Math.min(12, month)), year };
        }

        function buildDateRange(month, year) {
            const lastDay = new Date(year, month, 0).getDate();
            const dateFrom = year + '-' + String(month).padStart(2, '0') + '-01';
            const dateTo = year + '-' + String(month).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');
            return { dateFrom, dateTo };
        }

        function showError(msg) {
            const el = document.getElementById('error-msg');
            el.textContent = msg;
            el.style.display = 'block';
        }
        function hideError() {
            document.getElementById('error-msg').style.display = 'none';
        }

        function showLoading(show) {
            document.getElementById('loading').style.display = show ? 'block' : 'none';
            document.getElementById('content').style.display = show ? 'none' : 'block';
            document.getElementById('empty').style.display = 'none';
        }

        function formatMoney(n) {
            return 'R$ ' + (parseFloat(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        function formatDate(str) {
            if (!str) return '-';
            const d = new Date(str);
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        }

        async function loadTransactions() {
            if (!getToken()) {
                window.location.href = '/login?redirect=' + encodeURIComponent('/zerar-mes');
                return;
            }
            const { month, year } = getParams();
            document.getElementById('sel-month').value = month;
            const yearSel = document.getElementById('sel-year');
            const currentYear = new Date().getFullYear();
            if (!yearSel.options.length) {
                for (let y = currentYear + 1; y >= currentYear - 5; y--) {
                    const opt = document.createElement('option');
                    opt.value = y;
                    opt.textContent = y;
                    yearSel.appendChild(opt);
                }
            }
            yearSel.value = year;

            hideError();
            showLoading(true);
            const { dateFrom, dateTo } = buildDateRange(month, year);
            const profileId = localStorage.getItem('finance_current_profile_id') || '';
            const url = API_URL + '/api/finance/transactions?limit=500&orderBy=transaction_date&orderDir=ASC&dateFrom=' + dateFrom + '&dateTo=' + dateTo + (profileId ? '&profile_id=' + profileId : '');
            try {
                const res = await fetch(url, { headers: getAuthHeaders() });
                if (res.status === 401) {
                    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
                    return;
                }
                if (!res.ok) {
                    const err = await res.json().catch(function() { return {}; });
                    showError(err.message || err.error?.message || 'Erro ao carregar lançamentos.');
                    showLoading(false);
                    document.getElementById('empty').style.display = 'block';
                    document.getElementById('empty').querySelector('p').textContent = 'Não foi possível carregar os lançamentos.';
                    return;
                }
                const data = await res.json();
                transactions = (data.data && data.data.data) ? data.data.data : (data.data || []);
                if (!Array.isArray(transactions)) transactions = [];
            } catch (e) {
                showError('Erro de conexão: ' + e.message);
                transactions = [];
            }
            showLoading(false);
            renderList();
        }

        function renderList() {
            const listEl = document.getElementById('list');
            const summaryEl = document.getElementById('summary');
            const contentCard = document.getElementById('content');
            const emptyCard = document.getElementById('empty');
            const btnDel = document.getElementById('btn-delete-selected');
            const checkAll = document.getElementById('check-all');

            if (transactions.length === 0) {
                contentCard.style.display = 'none';
                emptyCard.style.display = 'block';
                emptyCard.querySelector('p').textContent = 'Nenhum lançamento neste mês.';
                return;
            }
            contentCard.style.display = 'block';
            emptyCard.style.display = 'none';

            let totalReceita = 0, totalDespesa = 0;
            transactions.forEach(function(t) {
                const amt = parseFloat(t.amount) || 0;
                if ((t.type || '').toUpperCase() === 'INCOME') totalReceita += amt;
                else totalDespesa += amt;
            });
            summaryEl.innerHTML = '<span><strong>Receitas:</strong> ' + formatMoney(totalReceita) + '</span><span><strong>Despesas:</strong> ' + formatMoney(totalDespesa) + '</span><span><strong>Total itens:</strong> ' + transactions.length + '</span>';

            listEl.innerHTML = transactions.map(function(t) {
                const type = (t.type || '').toUpperCase() === 'INCOME' ? 'receita' : 'despesa';
                const amount = parseFloat(t.amount) || 0;
                return '<div class="item" data-id="' + t.id + '">' +
                    '<input type="checkbox" class="item-check" value="' + t.id + '">' +
                    '<span class="type ' + type + '">' + (type === 'receita' ? '—' : '—') + '</span>' +
                    '<span class="desc">' + (t.description || '-').replace(/</g, '&lt;') + '</span>' +
                    '<span class="date">' + formatDate(t.transaction_date) + '</span>' +
                    '<span class="amount ' + type + '">' + (type === 'receita' ? '+' : '-') + formatMoney(amount) + '</span>' +
                    '<button type="button" class="btn-remove" data-id="' + t.id + '" title="Excluir este lançamento"><i class="fas fa-times"></i> Excluir</button>' +
                    '</div>';
            }).join('');

            checkAll.checked = false;
            checkAll.onclick = function() {
                listEl.querySelectorAll('.item-check').forEach(function(cb) { cb.checked = checkAll.checked; });
                updateDeleteButton();
            };
            listEl.querySelectorAll('.item-check').forEach(function(cb) {
                cb.onclick = updateDeleteButton;
            });
            listEl.querySelectorAll('.btn-remove').forEach(function(btn) {
                btn.onclick = function() {
                    var id = btn.getAttribute('data-id');
                    if (id && confirm('Excluir este lançamento?')) deleteOne(parseInt(id, 10));
                };
            });
            document.getElementById('btn-delete-selected').onclick = deleteSelected;
            updateDeleteButton();
        }

        function updateDeleteButton() {
            const n = document.querySelectorAll('#list .item-check:checked').length;
            const btn = document.getElementById('btn-delete-selected');
            btn.style.display = n > 0 ? 'inline-flex' : 'none';
            btn.textContent = n > 0 ? (n === 1 ? 'Excluir 1 selecionado' : 'Excluir ' + n + ' selecionados') : 'Excluir selecionados';
        }

        async function deleteOne(id) {
            if (!getToken()) return;
            try {
                const res = await fetch(API_URL + '/api/finance/transactions/' + id, { method: 'DELETE', headers: getAuthHeaders() });
                if (res.status === 401) {
                    window.location.href = '/login';
                    return;
                }
                if (res.ok) {
                    transactions = transactions.filter(function(t) { return t.id !== id; });
                    renderList();
                } else {
                    var err = await res.json().catch(function() { return {}; });
                    alert(err.message || err.error?.message || 'Erro ao excluir.');
                }
            } catch (e) {
                alert('Erro: ' + e.message);
            }
        }

        async function deleteSelected() {
            var ids = [];
            document.querySelectorAll('#list .item-check:checked').forEach(function(cb) {
                var id = parseInt(cb.value, 10);
                if (id) ids.push(id);
            });
            if (ids.length === 0) return;
            if (!confirm('Excluir ' + ids.length + ' lançamento(s) selecionado(s)? Esta ação não pode ser desfeita.')) return;
            for (var i = 0; i < ids.length; i++) {
                await deleteOne(ids[i]);
            }
        }

        document.getElementById('sel-month').addEventListener('change', function() {
            var month = this.value;
            var year = document.getElementById('sel-year').value;
            window.history.replaceState(null, '', '?month=' + month + '&year=' + year);
            loadTransactions();
        });
        document.getElementById('sel-year').addEventListener('change', function() {
            var year = this.value;
            var month = document.getElementById('sel-month').value;
            window.history.replaceState(null, '', '?month=' + month + '&year=' + year);
            loadTransactions();
        });

        loadTransactions();
    </script>
</body>
</html>

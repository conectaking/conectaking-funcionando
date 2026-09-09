/** zerar-mes — Vite entry (extracted inline) */
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

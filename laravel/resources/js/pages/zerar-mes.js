/** zerar-mes — Vite entry (enhanced with King Finance sync support) */
import '@mod/js/ck-auth-gate.js';
import '@css/pages/zerar-mes.css';

(function() {
    var forceLocal = (typeof window !== 'undefined' && (
        (new URLSearchParams(window.location.search || '')).get('api') === 'local' ||
        localStorage.getItem('useLocalApi') === 'true'
    ));
    var host = (typeof window !== 'undefined' && window.location.hostname) || 'localhost';
    if (forceLocal) {
        window.API_URL = window.location.origin || ('http://' + host + ':8080');
    } else if (/conectaking\.com\.br$/i.test(host) || /cnking\.bio$/i.test(host) || host === 'localhost' || host === '127.0.0.1') {
        window.API_URL = window.location.origin || 'https://www.conectaking.com.br';
    } else {
        window.API_URL = 'https://www.conectaking.com.br';
    }
})();

const API_URL = window.API_URL;
function getToken() { return window.CkAuth ? window.CkAuth.lsToken() : (localStorage.getItem('conectaKingToken') || ''); }
function getHeaders() {
    const t = getToken();
    const h = { 'Content-Type': 'application/json' };
    if (t) h.Authorization = 'Bearer ' + t;
    return h;
}
function getAuthHeaders() {
    const t = getToken();
    return t ? { 'Authorization': 'Bearer ' + t } : {};
}

let transactions = [];
let currentKingData = null;

function getParams() {
    const url = new URL(window.location.href);
    const now = new Date();
    const month = parseInt(url.searchParams.get('month') || (now.getMonth() + 1), 10);
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
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
    }
}
function hideError() {
    const el = document.getElementById('error-msg');
    if (el) el.style.display = 'none';
}

function showLoading(show) {
    const loadEl = document.getElementById('loading');
    const contentEl = document.getElementById('content');
    const emptyEl = document.getElementById('empty');
    if (loadEl) loadEl.style.display = show ? 'block' : 'none';
    if (contentEl) contentEl.style.display = show ? 'none' : 'block';
    if (emptyEl) emptyEl.style.display = 'none';
}

function formatMoney(n) {
    return 'R$ ' + (parseFloat(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(str) {
    if (!str) return '-';
    const d = new Date(str.length === 10 ? str + 'T00:00:00' : str);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

async function loadTransactions() {
    if (window.CkAuth && !(await window.CkAuth.requireAuth('/login?redirect=' + encodeURIComponent('/zerar-mes')))) return;
    const { month, year } = getParams();
    const monthSel = document.getElementById('sel-month');
    if (monthSel) monthSel.value = month;
    const yearSel = document.getElementById('sel-year');
    const currentYear = new Date().getFullYear();
    if (yearSel && !yearSel.options.length) {
        for (let y = currentYear + 1; y >= currentYear - 5; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            yearSel.appendChild(opt);
        }
    }
    if (yearSel) yearSel.value = year;

    hideError();
    showLoading(true);
    const { dateFrom, dateTo } = buildDateRange(month, year);
    const profileId = localStorage.getItem('finance_current_profile_id') || '';
    transactions = [];
    currentKingData = null;

    try {
        // 1. Carregar transações regulares do banco
        var offset = 0;
        var pageSize = 500;
        for (var page = 0; page < 20; page++) {
            var url = API_URL + '/api/finance/transactions?limit=' + pageSize + '&offset=' + offset + '&orderBy=transaction_date&orderDir=ASC&dateFrom=' + dateFrom + '&dateTo=' + dateTo + (profileId ? '&profile_id=' + profileId : '');
            const res = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
            if (res.status === 401) {
                window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
                return;
            }
            if (!res.ok) {
                const err = await res.json().catch(function() { return {}; });
                showError(err.message || err.error?.message || 'Erro ao carregar lançamentos.');
                break;
            }
            const data = await res.json();
            var payload = data.data || data;
            var rows = (payload && payload.data) ? payload.data : (Array.isArray(payload) ? payload : []);
            if (!Array.isArray(rows) || rows.length === 0) break;
            rows.forEach(r => {
                r._isKing = false;
                transactions.push(r);
            });
            if (!payload.hasMore && rows.length < pageSize) break;
            if (!payload.hasMore) break;
            offset += rows.length;
        }

        // 2. Carregar dados do King Finance (Trabalhos e Terceiros)
        const kingUrl = API_URL + '/api/finance/king-data' + (profileId ? '?profile_id=' + profileId : '');
        const kingRes = await fetch(kingUrl, { headers: getAuthHeaders(), credentials: 'include' });
        if (kingRes.ok) {
            const kJson = await kingRes.json();
            currentKingData = kJson.data || kJson;

            // Trabalhos
            (currentKingData.trabalhos || []).forEach(tw => {
                if (!tw) return;
                const twData = (tw.data || '').slice(0, 10);
                const isTwMonth = (twData >= dateFrom && twData <= dateTo);
                let hasMonthPayment = false;

                (tw.pagamentos || []).forEach((pg, pIdx) => {
                    const dt = (pg.data || pg.dataPagamento || twData).slice(0, 10);
                    if (dt >= dateFrom && dt <= dateTo) {
                        hasMonthPayment = true;
                        transactions.push({
                            id: 'king_tw_pg_' + tw.id + '_' + pIdx,
                            _isKing: true,
                            _kingType: 'tw_pg',
                            _twId: tw.id,
                            _pgIdx: pIdx,
                            type: 'INCOME',
                            description: (tw.cliente ? tw.cliente + ' - ' : '') + (tw.servico || 'Trabalho') + ' [Trabalho: Recebido]',
                            transaction_date: dt,
                            amount: Number(pg.valor) || 0
                        });
                    }
                });

                if (!hasMonthPayment && isTwMonth) {
                    transactions.push({
                        id: 'king_tw_all_' + tw.id,
                        _isKing: true,
                        _kingType: 'tw_all',
                        _twId: tw.id,
                        type: 'INCOME',
                        description: (tw.cliente ? tw.cliente + ' - ' : '') + (tw.servico || 'Trabalho') + ' [Trabalho: Criado]',
                        transaction_date: twData,
                        amount: Number(tw.valor) || 0
                    });
                }
            });

            // Terceiros
            (currentKingData.terceiros || []).forEach(p => {
                if (!p) return;
                (p.contas || []).forEach((c, cIdx) => {
                    if (!c) return;
                    const venc = (c.dataVencimento || '').slice(0, 10);
                    const isVencMonth = (venc >= dateFrom && venc <= dateTo);
                    let hasMonthPayment = false;

                    (c.pagamentos || []).forEach((pg, pIdx) => {
                        const dt = (pg.data || venc).slice(0, 10);
                        if (dt >= dateFrom && dt <= dateTo) {
                            hasMonthPayment = true;
                            transactions.push({
                                id: 'king_terc_pg_' + (p.id || p.nome) + '_' + cIdx + '_' + pIdx,
                                _isKing: true,
                                _kingType: 'terc_pg',
                                _tercId: p.id,
                                _cIdx: cIdx,
                                _pgIdx: pIdx,
                                type: 'EXPENSE',
                                description: (p.nome ? p.nome + ' - ' : '') + (c.descricao || 'Despesa') + ' [Terceiro: Pago]',
                                transaction_date: dt,
                                amount: Number(pg.valor) || 0
                            });
                        }
                    });

                    if (!hasMonthPayment && isVencMonth) {
                        transactions.push({
                            id: 'king_terc_c_' + (p.id || p.nome) + '_' + cIdx,
                            _isKing: true,
                            _kingType: 'terc_c',
                            _tercId: p.id,
                            _cIdx: cIdx,
                            type: 'EXPENSE',
                            description: (p.nome ? p.nome + ' - ' : '') + (c.descricao || 'Despesa') + ' [Terceiro: A Pagar]',
                            transaction_date: venc,
                            amount: Number(c.valor) || 0
                        });
                    }
                });
            });
        }
    } catch (e) {
        showError('Erro ao carregar dados: ' + e.message);
    }

    showLoading(false);
    renderList();
}

function renderList() {
    const listEl = document.getElementById('list');
    const summaryEl = document.getElementById('summary');
    const contentCard = document.getElementById('content');
    const emptyCard = document.getElementById('empty');
    const checkAll = document.getElementById('check-all');

    if (transactions.length === 0) {
        if (contentCard) contentCard.style.display = 'none';
        if (emptyCard) {
            emptyCard.style.display = 'block';
            const p = emptyCard.querySelector('p');
            if (p) p.textContent = 'Nenhum lançamento neste mês.';
        }
        return;
    }
    if (contentCard) contentCard.style.display = 'block';
    if (emptyCard) emptyCard.style.display = 'none';

    let totalReceita = 0, totalDespesa = 0;
    transactions.forEach(function(t) {
        const amt = parseFloat(t.amount) || 0;
        if ((t.type || '').toUpperCase() === 'INCOME') totalReceita += amt;
        else totalDespesa += amt;
    });

    if (summaryEl) {
        summaryEl.innerHTML = '<span><strong>Receitas:</strong> ' + formatMoney(totalReceita) + '</span>' +
            '<span><strong>Despesas:</strong> ' + formatMoney(totalDespesa) + '</span>' +
            '<span><strong>Saldo líquido:</strong> ' + formatMoney(totalReceita - totalDespesa) + '</span>' +
            '<span><strong>Total itens:</strong> ' + transactions.length + '</span>';
    }

    if (listEl) {
        listEl.innerHTML = transactions.map(function(t) {
            const isIncome = (t.type || '').toUpperCase() === 'INCOME';
            const type = isIncome ? 'receita' : 'despesa';
            const amount = parseFloat(t.amount) || 0;
            return '<div class="item" data-id="' + t.id + '">' +
                '<input type="checkbox" class="item-check" value="' + t.id + '">' +
                '<span class="type ' + type + '">' + (isIncome ? '+' : '-') + '</span>' +
                '<span class="desc">' + (t.description || '-').replace(/</g, '&lt;') + '</span>' +
                '<span class="date">' + formatDate(t.transaction_date) + '</span>' +
                '<span class="amount ' + type + '">' + (isIncome ? '+' : '-') + formatMoney(amount) + '</span>' +
                '<button type="button" class="btn-remove" data-id="' + t.id + '" title="Excluir este lançamento"><i class="fas fa-times"></i> Excluir</button>' +
                '</div>';
        }).join('');

        if (checkAll) {
            checkAll.checked = false;
            checkAll.onclick = function() {
                listEl.querySelectorAll('.item-check').forEach(function(cb) { cb.checked = checkAll.checked; });
                updateDeleteButton();
            };
        }
        listEl.querySelectorAll('.item-check').forEach(function(cb) {
            cb.onclick = updateDeleteButton;
        });
        listEl.querySelectorAll('.btn-remove').forEach(function(btn) {
            btn.onclick = function() {
                var id = btn.getAttribute('data-id');
                if (id && confirm('Excluir este lançamento?')) deleteOne(id);
            };
        });
    }

    const delSelectedBtn = document.getElementById('btn-delete-selected');
    if (delSelectedBtn) delSelectedBtn.onclick = deleteSelected;
    updateDeleteButton();
}

function updateDeleteButton() {
    const n = document.querySelectorAll('#list .item-check:checked').length;
    const btn = document.getElementById('btn-delete-selected');
    if (btn) {
        btn.style.display = n > 0 ? 'inline-flex' : 'none';
        btn.textContent = n > 0 ? (n === 1 ? 'Excluir 1 selecionado' : 'Excluir ' + n + ' selecionados') : 'Excluir selecionados';
    }
}

async function saveKingChanges() {
    if (!currentKingData) return true;
    const profileId = localStorage.getItem('finance_current_profile_id') || '';
    const res = await fetch(API_URL + '/api/finance/king-data', {
        method: 'PUT',
        headers: getHeaders(),
        credentials: 'include',
        body: JSON.stringify({ profile_id: profileId, data: currentKingData })
    });
    return res.ok;
}

async function deleteOne(id) {
    const item = transactions.find(t => String(t.id) === String(id));
    if (!item) return;

    try {
        if (!item._isKing) {
            // Transação normal
            const res = await fetch(API_URL + '/api/finance/transactions/' + id, {
                method: 'DELETE',
                headers: getAuthHeaders(),
                credentials: 'include'
            });
            if (res.status === 401) {
                window.location.href = '/login';
                return;
            }
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.message || 'Erro ao excluir transação.');
                return;
            }
        } else if (currentKingData) {
            // Item King Finance
            if (item._kingType === 'tw_pg') {
                const tw = (currentKingData.trabalhos || []).find(t => t.id === item._twId);
                if (tw && Array.isArray(tw.pagamentos)) {
                    tw.pagamentos.splice(item._pgIdx, 1);
                    if (tw.pagamentos.length === 0) {
                        const { dateFrom, dateTo } = buildDateRange(getParams().month, getParams().year);
                        const twDt = (tw.data || '').slice(0, 10);
                        if (twDt >= dateFrom && twDt <= dateTo) {
                            currentKingData.trabalhos = currentKingData.trabalhos.filter(t => t.id !== tw.id);
                        }
                    }
                }
            } else if (item._kingType === 'tw_all') {
                currentKingData.trabalhos = (currentKingData.trabalhos || []).filter(t => t.id !== item._twId);
            } else if (item._kingType === 'terc_pg') {
                const p = (currentKingData.terceiros || []).find(x => x.id === item._tercId);
                if (p && p.contas && p.contas[item._cIdx] && Array.isArray(p.contas[item._cIdx].pagamentos)) {
                    p.contas[item._cIdx].pagamentos.splice(item._pgIdx, 1);
                }
            } else if (item._kingType === 'terc_c') {
                const p = (currentKingData.terceiros || []).find(x => x.id === item._tercId);
                if (p && Array.isArray(p.contas)) {
                    p.contas.splice(item._cIdx, 1);
                }
            }
            await saveKingChanges();
        }

        transactions = transactions.filter(t => String(t.id) !== String(id));
        renderList();
    } catch (e) {
        alert('Erro ao excluir: ' + e.message);
    }
}

async function deleteSelected() {
    const checked = Array.from(document.querySelectorAll('#list .item-check:checked'));
    if (checked.length === 0) return;
    if (!confirm('Excluir ' + checked.length + ' lançamento(s) selecionado(s)? Esta ação não pode ser desfeita.')) return;

    showLoading(true);
    for (const cb of checked) {
        await deleteOne(cb.value);
    }
    showLoading(false);
    renderList();
}

// Zerar todo o mês
function openZerarModal() {
    const modal = document.getElementById('modal-zerar');
    const input = document.getElementById('input-senha-zerar');
    if (modal) {
        modal.style.display = 'flex';
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

function closeZerarModal() {
    const modal = document.getElementById('modal-zerar');
    if (modal) modal.style.display = 'none';
}

async function executarZerarMes() {
    const input = document.getElementById('input-senha-zerar');
    const password = input ? input.value.trim() : '';
    if (!password) {
        alert('Digite a senha para confirmar.');
        return;
    }

    const { month, year } = getParams();
    const profileId = localStorage.getItem('finance_current_profile_id') || '';

    try {
        const res = await fetch(API_URL + '/api/finance/zerar-mes', {
            method: 'POST',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify({
                month: month,
                year: year,
                password: password,
                profile_id: profileId || undefined
            })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert(data.message || (data.error && data.error.message) || 'Senha incorreta ou erro ao zerar.');
            return;
        }

        closeZerarModal();
        alert(data.message || 'Mês zerado com sucesso!');
        loadTransactions();
    } catch (e) {
        alert('Erro de conexão ao zerar mês: ' + e.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const btnZerarTodo = document.getElementById('btn-zerar-mes-todo');
    const btnZerarEmpty = document.getElementById('btn-zerar-mes-empty');
    const btnCancelZerar = document.getElementById('btn-cancelar-zerar');
    const btnConfirmZerar = document.getElementById('btn-confirmar-zerar');
    const modalZerar = document.getElementById('modal-zerar');
    const inputSenha = document.getElementById('input-senha-zerar');

    if (btnZerarTodo) btnZerarTodo.onclick = openZerarModal;
    if (btnZerarEmpty) btnZerarEmpty.onclick = openZerarModal;
    if (btnCancelZerar) btnCancelZerar.onclick = closeZerarModal;
    if (btnConfirmZerar) btnConfirmZerar.onclick = executarZerarMes;

    if (modalZerar) {
        modalZerar.onclick = (e) => {
            if (e.target === modalZerar) closeZerarModal();
        };
    }

    if (inputSenha) {
        inputSenha.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executarZerarMes();
            }
        });
    }

    const selMonth = document.getElementById('sel-month');
    const selYear = document.getElementById('sel-year');
    if (selMonth) {
        selMonth.addEventListener('change', function() {
            window.history.replaceState(null, '', '?month=' + this.value + '&year=' + (selYear ? selYear.value : '2026'));
            loadTransactions();
        });
    }
    if (selYear) {
        selYear.addEventListener('change', function() {
            window.history.replaceState(null, '', '?month=' + (selMonth ? selMonth.value : '9') + '&year=' + this.value);
            loadTransactions();
        });
    }

    loadTransactions();
});

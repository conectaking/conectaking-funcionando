/**
 * Dashboard Finance — módulo isolado do dashboard (Conecta King).
 * Depende de window.DashboardCore (definido em dashboard.js).
 * Gerado/atualizado por scripts/extract-dashboard-modules.js
 */
(function (global) {
    'use strict';

    function core() {
        return global.DashboardCore || {};
    }

    var __rawFetch = global.fetch.bind(global);

    var env = {
        get API_URL() {
            var c = core();
            if (typeof c.getApiUrl === 'function') return c.getApiUrl() || '';
            return global.API_URL || global.API_BASE || '';
        },
        get HEADERS_AUTH() {
            var c = core();
            if (typeof c.getAuthHeaders === 'function') return c.getAuthHeaders() || {};
            if (typeof c.getHeadersAuth === 'function') return c.getHeadersAuth() || {};
            return {};
        },
        getAuthHeaders: function () {
            var c = core();
            if (typeof c.getAuthHeaders === 'function') return c.getAuthHeaders();
            return this.HEADERS_AUTH;
        },
        getHeaders: function () {
            var c = core();
            if (typeof c.getHeaders === 'function') return c.getHeaders();
            return this.getAuthHeaders();
        },
        safeFetch: function (url, options) {
            var c = core();
            if (typeof c.safeFetch === 'function') return c.safeFetch(url, options);
            var opts = Object.assign({ credentials: 'include' }, options || {});
            return __rawFetch(url, opts);
        }
    };

    // Cookie-first: todas as chamadas deste módulo passam credentials via safeFetch
    var fetch = function (url, options) {
        return env.safeFetch(url, options || {});
    };

// MÓDULO DE FINANÇAS (Estilo Mobills)
// ==========================================================
window.initFinancePane = async function () {
    const financeContent = document.getElementById('finance-content');
    if (!financeContent) return;

    // Inicializar mês atual - SEMPRE usar o mês atual
    const now = new Date();
    window.currentFinanceMonth = now.getMonth();
    window.currentFinanceYear = now.getFullYear();

    try {
        financeContent.innerHTML = '<p style="color: var(--text-secondary, #888888); text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Carregando módulo financeiro...</p>';

        // Carregar dashboard financeiro com mês atual
        const monthStart = `${window.currentFinanceYear}-${String(window.currentFinanceMonth + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(window.currentFinanceYear, window.currentFinanceMonth + 1, 0).getDate();
        const monthEnd = `${window.currentFinanceYear}-${String(window.currentFinanceMonth + 1).padStart(2, '0')}-${lastDay}`;

        // Carregar perfis primeiro para validar o perfil atual (evitar mostrar dados de perfil já excluído)
        let profiles = [];
        try {
            const profilesResponse = await fetch(`${env.API_URL}/api/finance/profiles`, { headers: env.HEADERS_AUTH });
            if (profilesResponse.ok) {
                const profilesData = await profilesResponse.json();
                profiles = profilesData.data || [];
            }
        } catch (e) {
            console.warn('Erro ao carregar perfis:', e);
        }

        let currentProfileId = localStorage.getItem('finance_current_profile_id');
        const validProfileIds = profiles.map(p => String(p.id));
        if (currentProfileId && !validProfileIds.includes(String(currentProfileId))) {
            currentProfileId = null;
            localStorage.removeItem('finance_current_profile_id');
            if (window.currentFinanceProfileId) window.currentFinanceProfileId = null;
        }
        if (!currentProfileId && profiles.length > 0) {
            try {
                const profileResponse = await fetch(`${env.API_URL}/api/finance/profiles/primary`, { headers: env.HEADERS_AUTH });
                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    currentProfileId = profileData.data?.id || profiles[0]?.id || null;
                    if (currentProfileId) {
                        localStorage.setItem('finance_current_profile_id', currentProfileId);
                    }
                } else {
                    currentProfileId = profiles[0]?.id || null;
                    if (currentProfileId) localStorage.setItem('finance_current_profile_id', currentProfileId);
                }
            } catch (e) {
                currentProfileId = profiles[0]?.id || null;
                if (currentProfileId) localStorage.setItem('finance_current_profile_id', currentProfileId);
            }
        }

        const dashboardUrl = `${env.API_URL}/api/finance/dashboard?dateFrom=${monthStart}&dateTo=${monthEnd}${currentProfileId ? `&profile_id=${currentProfileId}` : ''}`;
        const response = await fetch(dashboardUrl, {
            headers: env.HEADERS_AUTH
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Erro ao carregar dados financeiros' }));
            throw new Error(errorData.message || 'Erro ao carregar dados financeiros');
        }

        const responseData = await response.json();
        // responseFormatter retorna { success: true, data: ... }
        const data = responseData.data || responseData;

        // Armazenar breakdown para modal "De onde veio" (Receitas, Saldo, Metas)
        window._financeIncomeBreakdown = {
            receitasDetalhadas: data.receitasDetalhadas || { transacoes: [], trabajos: [], recibos: [], itens: [], total: 0 },
            saldoDetalhado: data.saldoDetalhado || { transacoes: [], trabajos: [], recibos: [], itens: [], total: 0 }
        };

        // perfis já carregados no início para validar profile_id
        const currentProfile = profiles.find(p => p.id == currentProfileId) || profiles.find(p => p.is_primary) || profiles[0] || null;

        // Carregar cartões (API) e dados King (localStorage) para painel unificado
        let cards = [];
        try {
            const cardRes = await fetch(`${env.API_URL}/api/finance/cards`, { headers: env.HEADERS_AUTH });
            if (cardRes.ok) {
                const cardData = (await cardRes.json()).data || [];
                cards = Array.isArray(cardData) ? cardData : [];
            }
        } catch (e) { }
        let kingDb = { fluxo: [], trabalhos: [], bens: [], cartoes: [], dividas: [], terceiros: [] };
        // Memória + API; LS legado só one-shot migrate (não regravar dados sensíveis)
        try {
            const saved = localStorage.getItem('king_finance_v9');
            if (saved) {
                kingDb = JSON.parse(saved);
                kingDb.terceiros = kingDb.terceiros || [];
                kingDb.terceiros = (kingDb.terceiros || []).map(function (p) {
                    if (Array.isArray(p.contas) && p.contas.length > 0) return p;
                    var valorTotal = Number(p.valorTotal) || 0;
                    var pagamentos = Array.isArray(p.pagamentos) ? p.pagamentos : [];
                    var contas = [{ id: (p.id || '') + '-c1', nomeConta: 'Conta principal', valor: valorTotal, pagamentos: pagamentos }];
                    return { id: p.id, nome: p.nome || 'Pessoa', contas: contas, dataInicio: p.dataInicio || '', limite: p.limite };
                });
            }
        } catch (e) { }
        // Sincronização: carregar Serasa + Quem eu devo do servidor (site/mobile/localhost iguais)
        try {
            const kingDataUrl = `${env.API_URL}/api/finance/king-data${currentProfileId ? '?profile_id=' + encodeURIComponent(currentProfileId) : ''}`;
            const kingRes = await fetch(kingDataUrl, { headers: env.HEADERS_AUTH });
            if (kingRes.ok) {
                const kingJson = await kingRes.json();
                const remote = kingJson.data || kingJson;
                if (remote && (Array.isArray(remote.dividas) || Array.isArray(remote.terceiros) || Array.isArray(remote.trabalhos) || Array.isArray(remote.bens))) {
                    if (Array.isArray(remote.dividas)) kingDb.dividas = remote.dividas;
                    if (Array.isArray(remote.terceiros)) {
                        kingDb.terceiros = (remote.terceiros || []).map(function (p) {
                            if (Array.isArray(p.contas) && p.contas.length > 0) return p;
                            var valorTotal = Number(p.valorTotal) || 0;
                            var pagamentos = Array.isArray(p.pagamentos) ? p.pagamentos : [];
                            var contas = [{ id: (p.id || '') + '-c1', nomeConta: 'Conta principal', valor: valorTotal, pagamentos: pagamentos }];
                            return { id: p.id, nome: p.nome || 'Pessoa', contas: contas, dataInicio: p.dataInicio || '', limite: p.limite };
                        });
                    }
                    if (Array.isArray(remote.trabalhos)) kingDb.trabalhos = remote.trabalhos;
                    if (Array.isArray(remote.bens)) kingDb.bens = remote.bens;
                }
                try { localStorage.removeItem('king_finance_v9'); } catch (_) { }
            }
        } catch (e) { console.warn('King-data sync load:', e); }
        const totalDividas = (kingDb.dividas || []).reduce((a, b) => {
            const pago = (b.pagamentos || []).reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
            return a + (Number(b.valorTotal) || 0) - pago;
        }, 0);
        const totalTrabalhos = (kingDb.trabalhos || []).reduce((a, b) => a + (Number(b.valor) || 0), 0);
        const totalRecebidoTrabalhos = (kingDb.trabalhos || []).reduce((a, b) => a + (Array.isArray(b.pagamentos) ? b.pagamentos.reduce((s, p) => s + (Number(p.valor) || 0), 0) : 0), 0);
        var currentYearF = (monthStart || '').toString().slice(0, 4);
        var currentMonthF = (monthStart || '').toString().slice(5, 7);
        var mesRefF = currentYearF && currentMonthF ? currentYearF + '-' + currentMonthF : '';
        function paymentYearMonth(d) {
            if (!d || typeof d !== 'string') return '';
            var s = d.trim();
            if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 7);
            var parts = s.split(/[\/\-]/);
            if (parts.length >= 2) {
                var y = parts.length >= 3 ? (parts[2].length === 4 ? parts[2] : parts[0]) : currentYearF;
                var m = parts[1] && parts[1].length <= 2 ? parts[1] : (parts[0] && parts[0].length <= 2 ? parts[0] : '');
                if (y && m) return y + '-' + String(m).padStart(2, '0');
            }
            return '';
        }
        const totalRecebidoTrabalhosEsteMes = (kingDb.trabalhos || []).reduce(function (a, t) {
            return a + (Array.isArray(t.pagamentos) ? t.pagamentos.reduce(function (s, p) {
                var dt = p.data || t.data || t.dataPrevista || '';
                if (mesRefF && paymentYearMonth(dt) === mesRefF) return s + (Number(p.valor) || 0);
                return s;
            }, 0) : 0);
        }, 0);
        window._kingFinanceRecebidoTrabalhosNoMes = function (db, year, month) {
            var ref = year + '-' + String(month).padStart(2, '0');
            function toYmd(d) {
                if (!d) return null;
                var s = String(d).trim().split(/\s/)[0] || String(d).trim();
                if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
                var parts = s.split(/[\/\-]/);
                if (parts.length >= 3) {
                    var y = parts[2].length === 4 ? parts[2] : parts[0];
                    var m = (parts[1] && parts[1].length <= 2 ? parts[1] : parts[0]).padStart(2, '0');
                    var day = (parts[0] && parts[0].length <= 2 ? parts[0] : parts[2].slice(0, 2)).padStart(2, '0');
                    return y + '-' + m + '-' + day;
                }
                return null;
            }
            var trab = (db && db.trabalhos) ? db.trabalhos : [];
            var refFrom = ref + '-01';
            var lastDay = new Date(year, month, 0).getDate();
            var refTo = ref + '-' + String(lastDay).padStart(2, '0');
            return trab.reduce(function (a, t) {
                if (!Array.isArray(t.pagamentos) || t.pagamentos.length === 0) return a;
                var totalT = t.pagamentos.reduce(function (s, p) { return s + (Number(p.valor) || 0); }, 0);
                if (totalT <= 0) return a;
                var ultimaData = null;
                t.pagamentos.forEach(function (p) {
                    var dt = toYmd(p.data || p.dataPagamento || p.data_pagamento || t.data || t.data_trabalho || t.dataPrevista);
                    if (dt && (!ultimaData || dt > ultimaData)) ultimaData = dt;
                });
                if (ultimaData && ultimaData >= refFrom && ultimaData <= refTo) return a + totalT;
                return a;
            }, 0);
        };
        const totalFaltaReceberTrabalhos = (kingDb.trabalhos || []).reduce((a, b) => {
            const val = Number(b.valor) || 0;
            const pago = Array.isArray(b.pagamentos) ? b.pagamentos.reduce((s, p) => s + (Number(p.valor) || 0), 0) : 0;
            return a + Math.max(0, val - pago);
        }, 0);
        const totalDividasGeral = (kingDb.dividas || []).reduce((a, b) => a + (Number(b.valorTotal) || 0), 0);
        const totalPagoGeral = (kingDb.dividas || []).reduce((a, b) => a + (b.pagamentos || []).reduce((acc, p) => acc + (Number(p.valor) || 0), 0), 0);
        var rawScorePct = totalDividasGeral > 0 ? (totalPagoGeral / totalDividasGeral) * 100 : 100;
        const scoreSerasaPct = rawScorePct > 0 && rawScorePct < 1 ? Math.round(rawScorePct * 10) / 10 : Math.round(rawScorePct);
        const scoreSerasaLabel = scoreSerasaPct >= 100 ? 'Em dia' : scoreSerasaPct >= 50 ? 'Em acordo' : 'Quitando';
        const scoreSerasaPctDisplay = (typeof scoreSerasaPct === 'number' && scoreSerasaPct > 0 && scoreSerasaPct < 1) ? scoreSerasaPct.toFixed(1).replace('.', ',') : Math.round(scoreSerasaPct);
        function terceirosTotals(list) {
            var totalGeral = 0, totalPago = 0;
            (list || []).forEach(function (p) {
                (p.contas || []).forEach(function (c) {
                    totalGeral += Number(c.valor) || 0;
                    totalPago += (c.pagamentos || []).reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0);
                });
            });
            return { totalGeral, totalPago, totalFalta: totalGeral - totalPago, scorePct: totalGeral > 0 ? (totalPago / totalGeral) * 100 : 100 };
        }
        const _t = terceirosTotals(kingDb.terceiros);
        const totalTerceirosGeral = _t.totalGeral;
        const totalPagoTerceiros = _t.totalPago;
        var rawTerceirosPct = _t.scorePct;
        const scoreTerceirosPct = rawTerceirosPct > 0 && rawTerceirosPct < 1 ? Math.round(rawTerceirosPct * 10) / 10 : Math.round(rawTerceirosPct);
        const scoreTerceirosLabel = scoreTerceirosPct >= 100 ? 'Em dia' : scoreTerceirosPct >= 50 ? 'Em acordo' : 'Quitando';
        const scoreTerceirosPctDisplay = (typeof scoreTerceirosPct === 'number' && scoreTerceirosPct > 0 && scoreTerceirosPct < 1) ? scoreTerceirosPct.toFixed(1).replace('.', ',') : Math.round(scoreTerceirosPct);
        const totalFaltaPagarTerceiros = _t.totalFalta;
        window._kingFinanceTerceirosTotals = terceirosTotals;
        var totalTerceirosEsteMes = 0;
        (kingDb.terceiros || []).forEach(function (p) {
            (p.contas || []).forEach(function (c) {
                var venc = (c.dataVencimento || '').toString().trim().slice(0, 7);
                if (!venc || venc !== mesRefF) return;
                var pago = (c.pagamentos || []).reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0);
                var restante = (Number(c.valor) || 0) - pago;
                if (restante > 0) totalTerceirosEsteMes += restante;
            });
        });
        window._kingFinanceTerceirosEsteMes = function (list, year, month) {
            var ref = year + '-' + String(month).padStart(2, '0');
            var tot = 0;
            (list || []).forEach(function (p) {
                (p.contas || []).forEach(function (c) {
                    var venc = (c.dataVencimento || '').toString().trim().slice(0, 7);
                    if (!venc || venc !== ref) return;
                    var pago = (c.pagamentos || []).reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0);
                    var restante = (Number(c.valor) || 0) - pago;
                    if (restante > 0) tot += restante;
                });
            });
            return tot;
        };
        window._kingFinanceTerceirosMesesAnteriores = function (list, year, month) {
            var ref = year + '-' + String(month).padStart(2, '0');
            var tot = 0;
            (list || []).forEach(function (p) {
                (p.contas || []).forEach(function (c) {
                    var venc = (c.dataVencimento || '').toString().trim().slice(0, 7);
                    if (!venc || venc >= ref) return;
                    var pago = (c.pagamentos || []).reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0);
                    var restante = (Number(c.valor) || 0) - pago;
                    if (restante > 0) tot += restante;
                });
            });
            return tot;
        };
        window._kingFinanceTerceirosPagoEsteMes = function (list, year, month) {
            var ref = year + '-' + String(month).padStart(2, '0');
            function payRef(d) {
                if (!d || typeof d !== 'string') return '';
                var s = d.trim();
                if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
                var parts = s.split(/[\/\-]/);
                if (parts.length >= 2) { var y = parts.length >= 3 ? (parts[2].length === 4 ? parts[2] : parts[0]) : ''; var m = parts[1] && parts[1].length <= 2 ? parts[1] : (parts[0] && parts[0].length <= 2 ? parts[0] : ''); if (y && m) return y + '-' + String(m).padStart(2, '0'); }
                return '';
            }
            var tot = 0;
            (list || []).forEach(function (p) {
                (p.contas || []).forEach(function (c) {
                    (c.pagamentos || []).forEach(function (x) {
                        if (payRef(x.data || c.dataVencimento) === ref) tot += Number(x.valor) || 0;
                    });
                });
            });
            return tot;
        };
        var totalTerceirosMesesAnteriores = 0;
        (kingDb.terceiros || []).forEach(function (p) {
            (p.contas || []).forEach(function (c) {
                var venc = (c.dataVencimento || '').toString().trim().slice(0, 7);
                if (!venc || venc >= mesRefF) return;
                var pago = (c.pagamentos || []).reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0);
                var restante = (Number(c.valor) || 0) - pago;
                if (restante > 0) totalTerceirosMesesAnteriores += restante;
            });
        });
        const receitasFluxo = Number(data.totalIncome) || 0;
        const receitas = receitasFluxo + totalRecebidoTrabalhosEsteMes + totalFaltaReceberTrabalhos;
        const despesas = (Number(data.totalExpense) || 0) + totalTerceirosEsteMes;
        const saldo = receitas - despesas;
        var faltaPagarEsteMes = (Number(data.pendingExpense) || 0) + totalTerceirosEsteMes;
        const faltaReceberGeral = (Number(data.pendingIncome) || 0) + totalFaltaReceberTrabalhos;
        const totalRecebido = (receitasFluxo - (Number(data.pendingIncome) || 0)) + totalRecebidoTrabalhosEsteMes;
        window._kingFinanceDb = kingDb;
        window._kingFinanceCards = cards;
        window._kingFinanceStats = { receitas, despesas, totalDividas, totalTrabalhos, saldo, scoreSerasaPct, scoreSerasaLabel, totalTerceirosGeral, totalPagoTerceiros, scoreTerceirosPct, scoreTerceirosLabel, totalFaltaPagarTerceiros, totalRecebidoTrabalhos, totalRecebidoTrabalhosEsteMes, totalFaltaReceberTrabalhos, faltaReceberGeral, totalRecebido };
        // Persistir em memória + servidor (sem espelhar dívidas/valores no localStorage)
        window._kingFinancePersist = function (db) {
            var d = db || window._kingFinanceDb;
            if (!d) return;
            window._kingFinanceDb = d;
            try { localStorage.removeItem('king_finance_v9'); } catch (e) { }
            var profileId = localStorage.getItem('finance_current_profile_id') || '';
            var payload = { dividas: Array.isArray(d.dividas) ? d.dividas : [], terceiros: Array.isArray(d.terceiros) ? d.terceiros : [], trabalhos: Array.isArray(d.trabalhos) ? d.trabalhos : [], bens: Array.isArray(d.bens) ? d.bens : [] };
            var apiBase = (typeof env.API_URL !== 'undefined' ? env.API_URL : window.API_URL || '');
            if (apiBase) {
                fetch(apiBase + '/api/finance/king-data', {
                    method: 'PUT',
                    headers: typeof getHeaders === 'function' ? (function () { var h = env.getHeaders(); h['Content-Type'] = 'application/json'; return h; })() : (function(){ var t=localStorage.getItem('conectaKingToken')||''; var h={'Content-Type':'application/json'}; if(t) h.Authorization='Bearer '+t; return h; })(),
                    body: JSON.stringify({ profile_id: profileId || null, data: payload })
                }).then(function (r) { if (!r.ok) console.warn('Sync Serasa/Quem eu devo falhou (HTTP ' + r.status + '). Rode a migration 162 e faça deploy do backend.'); }).catch(function () { });
            }
        };

        // Verificar se usuário é ADM para mostrar botão de configuração
        let isAdmin = false;
        try {
            const user = JSON.parse(localStorage.getItem('conectaKingUser') || '{}');
            // Verificar se tem campo is_admin ou accountType indica admin
            isAdmin = user.is_admin === true || user.accountType === 'admin';
        } catch (e) {
            console.warn('Erro ao verificar se é admin:', e);
        }

        // Renderizar dashboard financeiro estilo Neon Desktop (baseado no modelo)
        financeContent.innerHTML = `
            <!-- Design System Neon Desktop Dashboard -->
            <style>
                :root {
                    --finance-bg: #0a0a0c;
                    --finance-card-dark: #16161a;
                    --finance-surface: rgba(22, 22, 26, 0.8);
                    --finance-border: rgba(255, 255, 255, 0.05);
                    --finance-text-primary: #f1f5f9;
                    --finance-text-secondary: #64748b;
                    --finance-indigo: #3b82f6;
                    --finance-emerald: #22c55e;
                    --finance-rose: #ef4444;
                    --finance-neon-blue: #3b82f6;
                    --finance-neon-green: #22c55e;
                    --finance-neon-red: #ef4444;
                }
                
                .finance-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .finance-scrollbar::-webkit-scrollbar-track {
                    background: #0a0a0c;
                }
                .finance-scrollbar::-webkit-scrollbar-thumb {
                    background: #1e1e24;
                    border-radius: 10px;
                }
                
                @media (max-width: 1024px) {
                    .finance-two-column {
                        grid-template-columns: 1fr !important;
                    }
                }
                
                @media (max-width: 768px) {
                    .finance-stats-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .finance-header-actions {
                        flex-direction: column;
                        gap: 12px;
                    }
                    .finance-period-buttons {
                        flex-wrap: wrap;
                        gap: 6px !important;
                    }
                    .finance-period-buttons button {
                        padding: 6px 10px !important;
                        font-size: 0.7rem !important;
                        min-width: 36px !important;
                    }
                    .finance-chart-container {
                        height: 150px !important;
                    }
                    .finance-tabs-container {
                        flex-wrap: wrap;
                        gap: 6px;
                    }
                    .finance-unified-tab {
                        white-space: nowrap;
                        flex-shrink: 0;
                    }
                    #finance-pane [class*="finance-card"] [style*="flex"] {
                        min-width: 0;
                    }
                }
                
                .neon-border-blue {
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    box-shadow: 0 0 15px rgba(59, 130, 246, 0.05);
                }
                .neon-border-green {
                    border: 1px solid rgba(34, 197, 94, 0.3);
                    box-shadow: 0 0 15px rgba(34, 197, 94, 0.05);
                }
                .neon-border-red {
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    box-shadow: 0 0 15px rgba(239, 68, 68, 0.05);
                }
                
                .finance-card-premium {
                    background: var(--finance-card-dark);
                    border: 1px solid var(--finance-border);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .finance-card-premium:hover {
                    transform: translateY(-2px);
                    border-color: rgba(255, 255, 255, 0.1);
                }
                .finance-stats-grid .finance-card-premium {
                    overflow: hidden;
                    min-width: 0;
                }
                .finance-stats-grid .finance-card-premium h3 {
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
            </style>
            
            <!-- Header Section -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; flex-wrap: wrap; gap: 16px;">
                <div style="flex: 1; min-width: 200px;">
                    <h2 style="font-size: 2rem; font-weight: 700; color: var(--finance-text-primary); margin-bottom: 8px;">Visão Geral Financeira</h2>
                    <p style="color: var(--finance-text-secondary); font-size: 0.95rem;">Bem-vindo de volta. Suas finanças estão saudáveis este mês.</p>
                </div>
                <div class="finance-header-actions" style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
                    <!-- Seletor de Perfis -->
                    <div style="position: relative;">
                        <button onclick="showFinanceProfilesModal()" id="finance-profile-selector" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--finance-card-dark); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: var(--finance-text-primary); font-size: 0.875rem; font-weight: 500; cursor: pointer; min-width: 150px; justify-content: space-between;">
                            <span style="display: flex; align-items: center; gap: 8px;">
                                <i class="fas ${currentProfile?.icon || 'fa-wallet'}" style="color: ${currentProfile?.color || '#3b82f6'};"></i>
                                <span id="finance-current-profile-name">${currentProfile?.name || 'Principal'}</span>
                            </span>
                            <i class="fas fa-chevron-down" style="font-size: 0.7rem;"></i>
                        </button>
                    </div>
                    <button onclick="showMonthSelector()" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--finance-card-dark); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: var(--finance-text-primary); font-size: 0.875rem; font-weight: 500; cursor: pointer;">
                        <i class="fas fa-calendar-alt"></i>
                        <span id="finance-header-month">${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                    </button>
                    <button type="button" onclick="showNovoLancamentoChoiceModal()" style="display: flex; align-items: center; gap: 10px; padding: 12px 24px; background: var(--finance-indigo); border: none; border-radius: 12px; color: white; font-size: 1rem; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(59, 130, 246, 0.35); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 24px rgba(59, 130, 246, 0.4)'" onmouseout="this.style.transform=''; this.style.boxShadow='0 4px 20px rgba(59, 130, 246, 0.35)'">
                        <i class="fas fa-plus" style="font-size: 1.1rem;"></i>
                        Novo lançamento
                    </button>
                    <div style="position: relative;">
                        <button type="button" onclick="var m=document.getElementById('finance-print-main-menu'); m.style.display=m.style.display==='none'?'block':'none';" style="display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.5); border-radius: 12px; color: var(--finance-neon-blue); font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(59, 130, 246, 0.3)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.2)'">
                            <i class="fas fa-print"></i>
                            Imprimir
                        </button>
                        <div id="finance-print-main-menu" style="display: none; position: absolute; top: 100%; left: 0; margin-top: 6px; background: var(--finance-card-dark); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 8px; min-width: 240px; z-index: 10002; box-shadow: 0 10px 30px rgba(0,0,0,0.4); max-height: 70vh; overflow-y: auto;">
                            <button type="button" onclick="window._financePrintBalance('tudo'); document.getElementById('finance-print-main-menu').style.display='none';" style="display: block; width: 100%; padding: 10px 14px; text-align: left; background: none; border: none; color: #e2e8f0; cursor: pointer; border-radius: 8px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'"><i class="fas fa-file-alt" style="margin-right: 8px;"></i>Tudo</button>
                            <button type="button" onclick="window._financePrintBalance('geral'); document.getElementById('finance-print-main-menu').style.display='none';" style="display: block; width: 100%; padding: 10px 14px; text-align: left; background: none; border: none; color: #e2e8f0; cursor: pointer; border-radius: 8px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'"><i class="fas fa-file-invoice" style="margin-right: 8px;"></i>Balanço geral</button>
                            <button type="button" onclick="window._financePrintBalance('despesas'); document.getElementById('finance-print-main-menu').style.display='none';" style="display: block; width: 100%; padding: 10px 14px; text-align: left; background: none; border: none; color: #e2e8f0; cursor: pointer; border-radius: 8px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'"><i class="fas fa-arrow-down" style="margin-right: 8px;"></i>Só despesas</button>
                            <button type="button" onclick="window._financePrintBalance('receitas'); document.getElementById('finance-print-main-menu').style.display='none';" style="display: block; width: 100%; padding: 10px 14px; text-align: left; background: none; border: none; color: #e2e8f0; cursor: pointer; border-radius: 8px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'"><i class="fas fa-arrow-up" style="margin-right: 8px;"></i>Só receitas</button>
                            <button type="button" onclick="window._financePrintBalance('falta-pagar'); document.getElementById('finance-print-main-menu').style.display='none';" style="display: block; width: 100%; padding: 10px 14px; text-align: left; background: none; border: none; color: #e2e8f0; cursor: pointer; border-radius: 8px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'"><i class="fas fa-hourglass-half" style="margin-right: 8px;"></i>O que falta pagar</button>
                            <button type="button" onclick="window._financePrintBalance('quem-eu-devo'); document.getElementById('finance-print-main-menu').style.display='none';" style="display: block; width: 100%; padding: 10px 14px; text-align: left; background: none; border: none; color: #e2e8f0; cursor: pointer; border-radius: 8px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'"><i class="fas fa-hand-holding-usd" style="margin-right: 8px;"></i>Quem eu devo</button>
                            <button type="button" onclick="window._financePrintBalance('serasa'); document.getElementById('finance-print-main-menu').style.display='none';" style="display: block; width: 100%; padding: 10px 14px; text-align: left; background: none; border: none; color: #e2e8f0; cursor: pointer; border-radius: 8px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'"><i class="fas fa-university" style="margin-right: 8px;"></i>Serasa / Dívidas</button>
                            <button type="button" onclick="window._financePrintBalance('fluxo'); document.getElementById('finance-print-main-menu').style.display='none';" style="display: block; width: 100%; padding: 10px 14px; text-align: left; background: none; border: none; color: #e2e8f0; cursor: pointer; border-radius: 8px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'"><i class="fas fa-exchange-alt" style="margin-right: 8px;"></i>Fluxo</button>
                            <button type="button" onclick="window._financePrintBalance('trabalhos'); document.getElementById('finance-print-main-menu').style.display='none';" style="display: block; width: 100%; padding: 10px 14px; text-align: left; background: none; border: none; color: #e2e8f0; cursor: pointer; border-radius: 8px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'"><i class="fas fa-briefcase" style="margin-right: 8px;"></i>Trabalhos</button>
                            <button type="button" onclick="window._financePrintBalance('bens'); document.getElementById('finance-print-main-menu').style.display='none';" style="display: block; width: 100%; padding: 10px 14px; text-align: left; background: none; border: none; color: #e2e8f0; cursor: pointer; border-radius: 8px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'"><i class="fas fa-box-open" style="margin-right: 8px;"></i>Bens</button>
                            <button type="button" onclick="window._financePrintBalance('cartoes'); document.getElementById('finance-print-main-menu').style.display='none';" style="display: block; width: 100%; padding: 10px 14px; text-align: left; background: none; border: none; color: #e2e8f0; cursor: pointer; border-radius: 8px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'"><i class="fas fa-credit-card" style="margin-right: 8px;"></i>Cartões</button>
                            <button type="button" onclick="window._financePrintBalance('meta'); document.getElementById('finance-print-main-menu').style.display='none';" style="display: block; width: 100%; padding: 10px 14px; text-align: left; background: none; border: none; color: #e2e8f0; cursor: pointer; border-radius: 8px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'"><i class="fas fa-bullseye" style="margin-right: 8px;"></i>Metas</button>
                        </div>
                    </div>
                    <button type="button" id="btn-zerar-mes-link" onclick="showZerarMesModal()" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 12px; color: #ef4444; font-size: 0.875rem; font-weight: 600; cursor: pointer;" onmouseover="this.style.background='rgba(239, 68, 68, 0.3)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.2)'">
                        <i class="fas fa-eraser"></i>
                        Zerar mês
                    </button>
                    <button type="button" onclick="showAlterarSenhaZerarModal()" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; color: var(--finance-text-secondary); font-size: 0.875rem; font-weight: 600; cursor: pointer;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                        <i class="fas fa-key"></i>
                        Alterar senha de zerar
                    </button>
                    ${isAdmin ? `
                    <button id="finance-whatsapp-config-btn" onclick="showWhatsAppConfigModal()" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: rgba(37, 211, 102, 0.2); border: 1px solid rgba(37, 211, 102, 0.4); border-radius: 12px; color: #25D366; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(37, 211, 102, 0.3)'" onmouseout="this.style.background='rgba(37, 211, 102, 0.2)'">
                        <i class="fab fa-whatsapp"></i>
                        Configurar WhatsApp
                    </button>
                    <button type="button" onclick="showAdminVerSenhasModal()" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 12px; color: #8b5cf6; font-size: 0.875rem; font-weight: 600; cursor: pointer;" onmouseover="this.style.background='rgba(139, 92, 246, 0.3)'" onmouseout="this.style.background='rgba(139, 92, 246, 0.2)'">
                        <i class="fas fa-list"></i>
                        Ver senhas dos clientes
                    </button>
                    ` : ''}
                </div>
            </div>
            
            <!-- Abas unificadas: Resumo + Fluxo, Trampo, Bens, Cartões, Serasa -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 4px;" class="finance-tabs-container">
                <button type="button" class="finance-unified-tab active" data-finance-tab="resumo" style="padding: 10px 18px; border-radius: 12px; border: none; background: var(--finance-indigo); color: white; font-weight: 700; cursor: pointer; font-size: 0.8rem;">Resumo</button>
                <button type="button" class="finance-unified-tab" data-finance-tab="fluxo" style="padding: 10px 18px; border-radius: 12px; border: none; background: rgba(255,255,255,0.05); color: var(--finance-text-secondary); font-weight: 600; cursor: pointer; font-size: 0.8rem;">Fluxo</button>
                <button type="button" class="finance-unified-tab" data-finance-tab="trabalhos" style="padding: 10px 18px; border-radius: 12px; border: none; background: rgba(255,255,255,0.05); color: var(--finance-text-secondary); font-weight: 600; cursor: pointer; font-size: 0.8rem;">Trabalhos</button>
                <button type="button" class="finance-unified-tab" data-finance-tab="bens" style="padding: 10px 18px; border-radius: 12px; border: none; background: rgba(255,255,255,0.05); color: var(--finance-text-secondary); font-weight: 600; cursor: pointer; font-size: 0.8rem;">Bens</button>
                <button type="button" class="finance-unified-tab" data-finance-tab="cartoes" style="padding: 10px 18px; border-radius: 12px; border: none; background: rgba(255,255,255,0.05); color: var(--finance-text-secondary); font-weight: 600; cursor: pointer; font-size: 0.8rem;">Cartões</button>
                <button type="button" class="finance-unified-tab" data-finance-tab="meta" style="padding: 10px 18px; border-radius: 12px; border: none; background: rgba(255,255,255,0.05); color: var(--finance-text-secondary); font-weight: 600; cursor: pointer; font-size: 0.8rem;">Meta</button>
                <button type="button" class="finance-unified-tab" data-finance-tab="terceiros" style="padding: 10px 18px; border-radius: 12px; border: none; background: rgba(255,255,255,0.05); color: var(--finance-text-secondary); font-weight: 600; cursor: pointer; font-size: 0.8rem;">Quem eu devo</button>
                <button type="button" class="finance-unified-tab" data-finance-tab="serasa" style="padding: 10px 18px; border-radius: 12px; border: none; background: rgba(255,255,255,0.05); color: var(--finance-text-secondary); font-weight: 600; cursor: pointer; font-size: 0.8rem;">Serasa</button>
            </div>
            <div id="finance-resumo-content">
            <!-- Main Balance Card with Chart -->
            <div class="finance-card-premium" style="border-radius: 24px; padding: 32px; margin-bottom: 32px; position: relative; overflow: hidden;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 32px; position: relative; z-index: 10;">
                    <div>
                        <p style="color: var(--finance-text-secondary); font-size: 0.875rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Patrimônio (dinheiro em caixa)</p>
                        <p style="color: var(--finance-text-secondary); font-size: 0.7rem; margin-bottom: 8px;">Dinheiro disponível, todos os meses (n\u00e3o gasto)</p>
                        <h3 style="font-size: 2.5rem; font-weight: 700; color: var(--finance-text-primary); margin-bottom: 8px;">R$ ${formatCurrency(Number(data.accountBalance) || Number(data.totalBalance) || 0)}</h3>
                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                            ${data.balanceVariation !== undefined ? `
                            <span style="display: flex; align-items: center; color: ${data.balanceVariation >= 0 ? 'var(--finance-emerald)' : 'var(--finance-neon-red)'}; font-size: 0.875rem; font-weight: 700;">
                                <i class="fas fa-arrow-trend-${data.balanceVariation >= 0 ? 'up' : 'down'}" style="font-size: 0.75rem; margin-right: 4px;"></i>
                                ${data.balanceVariation >= 0 ? '+' : ''}${data.balanceVariation.toFixed(1)}%
                            </span>
                            <span style="color: var(--finance-text-secondary); font-size: 0.875rem;">em relação ao mês passado</span>
                            ` : ''}
                            <button onclick="showGeneralBalanceModal()" style="margin-left: auto; padding: 6px 12px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 8px; color: var(--finance-indigo); font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(59, 130, 246, 0.3)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.2)'">
                                <i class="fas fa-info-circle" style="margin-right: 4px;"></i> Ver Detalhes Completos
                            </button>
                        </div>
                    </div>
                    <div class="finance-period-buttons" style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button onclick="changeFinancePeriod('1M')" id="period-1M" style="padding: 6px 12px; font-size: 0.75rem; border-radius: 6px; background: var(--finance-indigo); color: white; border: none; cursor: pointer; font-weight: 600; min-width: 40px;">1M</button>
                        <button onclick="changeFinancePeriod('3M')" id="period-3M" style="padding: 6px 12px; font-size: 0.75rem; border-radius: 6px; background: rgba(255,255,255,0.05); color: var(--finance-text-secondary); border: none; cursor: pointer; min-width: 40px;">3M</button>
                        <button onclick="changeFinancePeriod('6M')" id="period-6M" style="padding: 6px 12px; font-size: 0.75rem; border-radius: 6px; background: rgba(255,255,255,0.05); color: var(--finance-text-secondary); border: none; cursor: pointer; min-width: 40px;">6M</button>
                        <button onclick="changeFinancePeriod('1A')" id="period-1A" style="padding: 6px 12px; font-size: 0.75rem; border-radius: 6px; background: rgba(255,255,255,0.05); color: var(--finance-text-secondary); border: none; cursor: pointer; min-width: 40px;">1A</button>
                    </div>
                </div>
                <!-- Chart Area - Simple Line Chart -->
                <div id="finance-chart-container" class="finance-chart-container" style="height: 200px; width: 100%; position: relative; border-radius: 12px; overflow: hidden; background: linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, transparent 100%);">
                    <canvas id="finance-evolution-chart" style="width: 100%; height: 100%;"></canvas>
                </div>
            </div>
            
            <!-- Month Navigation -->
            <div class="finance-card-premium" style="display: flex; justify-content: center; align-items: center; gap: 20px; margin-bottom: 24px; padding: 16px; border-radius: 16px;">
                <button onclick="changeFinanceMonth(-1)" style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: var(--finance-indigo); cursor: pointer; padding: 10px 14px; font-size: 1rem; border-radius: 10px; transition: all 0.2s;" onmouseover="this.style.background='rgba(59, 130, 246, 0.2)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.1)'">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <h3 id="finance-current-month" style="color: var(--finance-text-primary); font-size: 1.2rem; font-weight: 700; margin: 0; min-width: 180px; text-align: center; text-transform: capitalize;">
                    ${now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h3>
                <button onclick="changeFinanceMonth(1)" style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: var(--finance-indigo); cursor: pointer; padding: 10px 14px; font-size: 1rem; border-radius: 10px; transition: all 0.2s;" onmouseover="this.style.background='rgba(59, 130, 246, 0.2)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.1)'">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
            
            <!-- Stats Cards Grid -->
            <div class="finance-stats-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 24px;">
                <!-- Total Balance Card (clique abre popup com resumo do saldo) -->
                <div onclick="openFinanceDetailModal('balance')" class="finance-card-premium neon-border-blue" style="border-radius: 24px; padding: 24px; transition: transform 0.2s; cursor: pointer;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(59, 130, 246, 0.1); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-wallet" style="color: var(--finance-neon-blue); font-size: 1.25rem;"></i>
                        </div>
                        <span style="color: var(--finance-text-secondary); font-weight: 500; font-size: 0.875rem;">Saldo Total</span>
                    </div>
                    <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; min-width: 0;">
                        <h4 id="finance-account-balance-main" style="font-size: 1.75rem; font-weight: 700; color: var(--finance-text-primary); margin: 0;">R$ ${formatCurrency(Number(data.accountBalance) || Number(data.totalBalance) || 0)}</h4>
                        <span style="font-size: 0.75rem; color: var(--finance-text-secondary); white-space: nowrap; overflow: visible;">Conta + Poupança</span>
                    </div>
                </div>
                
                <!-- Monthly Income Card (clique abre popup com todas as receitas) -->
                <div onclick="openFinanceDetailModal('income')" class="finance-card-premium neon-border-green" style="border-radius: 24px; padding: 24px; transition: transform 0.2s; cursor: pointer;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(34, 197, 94, 0.1); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-arrow-trend-up" style="color: var(--finance-neon-green); font-size: 1.25rem;"></i>
                        </div>
                        <span style="color: var(--finance-text-secondary); font-weight: 500; font-size: 0.875rem;">Receitas Mensais</span>
                    </div>
                    <div style="display: flex; align-items: baseline; gap: 8px;">
                        <h4 id="finance-income-card" style="font-size: 1.75rem; font-weight: 700; color: var(--finance-neon-green); margin: 0;">+R$ ${formatCurrency(totalRecebido)}</h4>
                        <span style="font-size: 0.75rem; color: var(--finance-text-secondary);">Só o que já entrou</span>
                    </div>
                </div>
                
                <!-- Monthly Expenses Card (clique abre lista inline, igual O que foi pago) -->
                <div onclick="filterByPaidExpense()" class="finance-card-premium neon-border-red" style="border-radius: 24px; padding: 24px; transition: transform 0.2s; cursor: pointer;" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(239, 68, 68, 0.1); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-arrow-trend-down" style="color: var(--finance-neon-red); font-size: 1.25rem;"></i>
                        </div>
                        <span style="color: var(--finance-text-secondary); font-weight: 500; font-size: 0.875rem;">Despesas Mensais</span>
                    </div>
                    <div style="display: flex; align-items: baseline; gap: 8px;">
                        <h4 id="finance-expense-card" style="font-size: 1.75rem; font-weight: 700; color: var(--finance-neon-red); margin: 0;">-R$ ${formatCurrency(despesas)}</h4>
                        <span style="font-size: 0.75rem; color: var(--finance-text-secondary);">${Math.round((despesas / (totalRecebido || 1)) * 100)}% da Receita</span>
                    </div>
                </div>
            </div>
            
            <!-- Balanço mensal (sempre visível) -->
            <div id="finance-monthly-balance-card" class="finance-card-premium" style="display: flex; border-radius: 20px; padding: 0; margin-bottom: 24px; overflow: hidden; border: 1px solid rgba(59, 130, 246, 0.2); background: var(--finance-card-dark, #16161a);">
                <div style="width: 6px; min-height: 100%; background: ${saldo >= 0 ? 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)'}; flex-shrink: 0;"></div>
                <div style="flex: 1; padding: 24px;">
                    <h3 style="color: var(--finance-text-primary); font-size: 1.15rem; font-weight: 700; margin: 0 0 20px 0;">Balanço mensal</h3>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="color: var(--finance-text-secondary); font-size: 1rem;">Receitas (recebidas)</span>
                        <span id="finance-balance-receitas" style="color: #22c55e; font-size: 1.2rem; font-weight: 700;">R$ ${formatCurrency(totalRecebido)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <span style="color: var(--finance-text-secondary); font-size: 1rem;">Despesas</span>
                        <span id="finance-balance-despesas" style="color: #ef4444; font-size: 1.2rem; font-weight: 700;">R$ ${formatCurrency(despesas)}</span>
                    </div>
                    <div style="height: 1px; background: rgba(255,255,255,0.08); margin: 16px 0;"></div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: var(--finance-text-primary); font-size: 1.05rem; font-weight: 600;">Balanço</span>
                        <span id="finance-balance-result" style="color: ${(totalRecebido - despesas) >= 0 ? '#22c55e' : '#ef4444'}; font-size: 1.5rem; font-weight: 700;">R$ ${formatCurrency(Math.abs(totalRecebido - despesas))}</span>
                    </div>
                    <button type="button" onclick="showGeneralBalanceModal()" style="width: 100%; margin-top: 20px; padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.4); background: rgba(59, 130, 246, 0.15); color: var(--finance-indigo); font-size: 0.9rem; font-weight: 700; cursor: pointer; transition: all 0.2s; letter-spacing: 0.02em;" onmouseover="this.style.background='rgba(59, 130, 246, 0.25)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.15)'">
                        <i class="fas fa-chart-pie" style="margin-right: 8px;"></i> Ver mais
                    </button>
                </div>
            </div>
            
            <!-- Additional Summary Cards Grid -->
            <div class="finance-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;">
                <!-- Falta receber -->
                <div onclick="filterByPendingIncome()" class="finance-card-premium" style="border-radius: 16px; padding: 20px; cursor: pointer; border-color: rgba(34, 197, 94, 0.3); transition: all 0.2s;" onmouseover="this.style.borderColor='rgba(34, 197, 94, 0.5)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(34, 197, 94, 0.3)'; this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(34, 197, 94, 0.1); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-clock" style="color: var(--finance-neon-green); font-size: 1rem;"></i>
                        </div>
                        <p style="color: var(--finance-text-secondary); font-size: 0.875rem; margin: 0; font-weight: 500;">Falta receber</p>
                    </div>
                    <h3 id="finance-pending-income" style="color: var(--finance-neon-green); font-size: 1.5rem; font-weight: 700; margin: 0;">R$ ${formatCurrency(faltaReceberGeral)}</h3>
                </div>
                
                <!-- Falta pagar (este mês) = fluxo pendente + Quem eu devo este mês -->
                <div onclick="filterByPendingExpense()" class="finance-card-premium" style="border-radius: 16px; padding: 20px; cursor: pointer; border-color: rgba(239, 68, 68, 0.3); transition: all 0.2s; overflow: hidden;" onmouseover="this.style.borderColor='rgba(239, 68, 68, 0.5)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(239, 68, 68, 0.3)'; this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(239, 68, 68, 0.1); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-exclamation-triangle" style="color: var(--finance-neon-red); font-size: 1rem;"></i>
                        </div>
                        <p style="color: var(--finance-text-secondary); font-size: 0.875rem; margin: 0; font-weight: 500;">Falta pagar (este m\u00eas)</p>
                    </div>
                    <p style="color: var(--finance-text-secondary); font-size: 0.7rem; margin: 0 0 4px 0;">Fluxo + Quem eu devo · Pagar total ou valor</p>
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 8px; flex-wrap: wrap; min-width: 0;">
                        <h3 id="finance-pending-expense" style="color: var(--finance-neon-red); font-size: 1.5rem; font-weight: 700; margin: 0; min-width: 0; flex: 1 1 auto;">R$ ${formatCurrency(faltaPagarEsteMes)}</h3>
                        <div style="display: flex; gap: 6px; flex-shrink: 0;">
                            <button type="button" onclick="event.stopPropagation(); filterByPendingExpense();" style="padding: 8px 12px; background: rgba(34, 197, 94, 0.2); border: 1px solid rgba(34, 197, 94, 0.5); border-radius: 10px; color: #86efac; font-size: 0.75rem; font-weight: 700; cursor: pointer; white-space: nowrap;"><i class="fas fa-check" style="margin-right: 4px;"></i>Pagar</button>
                        </div>
                    </div>
                </div>
                
                <!-- Falta pagar (meses anteriores) -->
                <div onclick="filterByPendingExpensePrevious()" class="finance-card-premium" style="border-radius: 16px; padding: 20px; cursor: pointer; border-color: rgba(245, 158, 11, 0.4); transition: all 0.2s;" onmouseover="this.style.borderColor='rgba(245, 158, 11, 0.6)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(245, 158, 11, 0.4)'; this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(245, 158, 11, 0.15); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-calendar-minus" style="color: #f59e0b; font-size: 1rem;"></i>
                        </div>
                        <p style="color: var(--finance-text-secondary); font-size: 0.875rem; margin: 0; font-weight: 500;">Falta pagar (meses anteriores)</p>
                    </div>
                    <p style="color: var(--finance-text-secondary); font-size: 0.7rem; margin: 0 0 4px 0;">Fluxo + Quem eu devo</p>
                    <h3 id="finance-pending-expense-previous" style="color: #f59e0b; font-size: 1.5rem; font-weight: 700; margin: 0;">R$ ${formatCurrency((Number(data.pendingExpensePreviousMonths) || 0) + totalTerceirosMesesAnteriores)}</h3>
                </div>
                
                <!-- Saldo disponível -->
                <div onclick="openFinanceDetailModal('balance')" class="finance-card-premium" style="border-radius: 16px; padding: 20px; cursor: pointer; border-color: rgba(59, 130, 246, 0.3); transition: all 0.2s;" onmouseover="this.style.borderColor='rgba(59, 130, 246, 0.5)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(59, 130, 246, 0.3)'; this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(59, 130, 246, 0.1); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-wallet" style="color: var(--finance-neon-blue); font-size: 1rem;"></i>
                        </div>
                        <p style="color: var(--finance-text-secondary); font-size: 0.875rem; margin: 0; font-weight: 500;">Saldo disponível</p>
                    </div>
                    <h3 id="finance-account-balance" style="color: var(--finance-neon-blue); font-size: 1.5rem; font-weight: 700; margin: 0;">R$ ${formatCurrency(Number(data.accountBalance || data.totalBalance || data.saldoDisponivel) || 0)}</h3>
                </div>
                
                <!-- Total recebido -->
                <div onclick="openFinanceDetailModal('income')" class="finance-card-premium" style="border-radius: 16px; padding: 20px; cursor: pointer; border-color: rgba(34, 197, 94, 0.3); transition: all 0.2s;" onmouseover="this.style.borderColor='rgba(34, 197, 94, 0.5)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(34, 197, 94, 0.3)'; this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(34, 197, 94, 0.1); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-check-circle" style="color: var(--finance-neon-green); font-size: 1rem;"></i>
                        </div>
                        <p style="color: var(--finance-text-secondary); font-size: 0.875rem; margin: 0; font-weight: 500;">Total recebido</p>
                    </div>
                    <h3 id="finance-paid-income" style="color: var(--finance-neon-green); font-size: 1.5rem; font-weight: 700; margin: 0;">R$ ${formatCurrency(totalRecebido)}</h3>
                </div>
                
                <!-- O que foi pago (abre lista inline com opção Restaurar, igual a Falta a pagar) -->
                <div onclick="filterByPaidExpense()" class="finance-card-premium" style="border-radius: 16px; padding: 20px; cursor: pointer; border-color: rgba(239, 68, 68, 0.3); transition: all 0.2s;" onmouseover="this.style.borderColor='rgba(239, 68, 68, 0.5)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(239, 68, 68, 0.3)'; this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(239, 68, 68, 0.1); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-money-bill-wave" style="color: var(--finance-neon-red); font-size: 1rem;"></i>
                        </div>
                        <p style="color: var(--finance-text-secondary); font-size: 0.875rem; margin: 0; font-weight: 500;">O que foi pago</p>
                    </div>
                    <h3 id="finance-paid-expense" style="color: var(--finance-neon-red); font-size: 1.5rem; font-weight: 700; margin: 0;">R$ ${formatCurrency(data.totalExpensePaid || data.totalPago || data.totalExpense || 0)}</h3>
                    <p style="color: var(--finance-text-secondary); font-size: 0.7rem; margin: 6px 0 0 0;">Clique para ver lista e restaurar se precisar</p>
                </div>
                
                <!-- Dívidas pendentes (só Serasa) -->
                <div onclick="switchUnifiedFinanceTab('serasa')" class="finance-card-premium" style="border-radius: 16px; padding: 20px; cursor: pointer; border-color: rgba(212, 175, 55, 0.4); transition: all 0.2s;" onmouseover="this.style.borderColor='rgba(212, 175, 55, 0.6)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(212, 175, 55, 0.4)'; this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(212, 175, 55, 0.15); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-file-invoice-dollar" style="color: #D4AF37; font-size: 1rem;"></i>
                        </div>
                        <p style="color: var(--finance-text-secondary); font-size: 0.875rem; margin: 0; font-weight: 500;">Dívidas pendentes (Serasa)</p>
                    </div>
                    <p style="color: var(--finance-text-secondary); font-size: 0.7rem; margin: 0 0 4px 0;">S\u00f3 acordos Serasa</p>
                    <h3 id="finance-total-dividas" style="color: #D4AF37; font-size: 1.5rem; font-weight: 700; margin: 0;">R$ ${formatCurrency(totalDividas)}</h3>
                </div>
                
                <!-- Score Serasa (KING) -->
                <div onclick="switchUnifiedFinanceTab('serasa')" class="finance-card-premium" style="border-radius: 16px; padding: 20px; cursor: pointer; border-color: rgba(220, 38, 38, 0.3); transition: all 0.2s;" onmouseover="this.style.borderColor='rgba(220, 38, 38, 0.5)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(220, 38, 38, 0.3)'; this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(220, 38, 38, 0.1); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-chart-line" style="color: #dc2626; font-size: 1rem;"></i>
                        </div>
                        <p style="color: var(--finance-text-secondary); font-size: 0.875rem; margin: 0; font-weight: 500;">Score Serasa (KING)</p>
                    </div>
                    <h3 id="finance-score-serasa" style="color: #dc2626; font-size: 1.25rem; font-weight: 700; margin: 0;">${scoreSerasaPctDisplay}% · ${scoreSerasaLabel}</h3>
                </div>
                
                <!-- Quem eu devo (terceiros) -->
                <div onclick="switchUnifiedFinanceTab('terceiros')" class="finance-card-premium" style="border-radius: 16px; padding: 20px; cursor: pointer; border-color: rgba(139, 92, 246, 0.4); transition: all 0.2s;" onmouseover="this.style.borderColor='rgba(139, 92, 246, 0.6)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(139, 92, 246, 0.4)'; this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(139, 92, 246, 0.15); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-users" style="color: #8b5cf6; font-size: 1rem;"></i>
                        </div>
                        <p style="color: var(--finance-text-secondary); font-size: 0.875rem; margin: 0; font-weight: 500;">Quem eu devo</p>
                    </div>
                    <p style="color: var(--finance-text-secondary); font-size: 0.7rem; margin: 0 0 4px 0;">Total pendente / Falta quitar</p>
                    <h3 id="finance-total-terceiros" style="color: #8b5cf6; font-size: 1.5rem; font-weight: 700; margin: 0;">R$ ${formatCurrency(totalTerceirosGeral)}</h3>
                    <p style="color: var(--finance-text-secondary); font-size: 0.75rem; margin: 4px 0 0 0;">Falta quitar: R$ <span id="finance-falta-terceiros">${formatCurrency(totalFaltaPagarTerceiros)}</span> · <span id="finance-score-terceiros">${scoreTerceirosPctDisplay}%</span> quitado</p>
                </div>
            </div>
            
            <!-- Two Column Layout: Transactions List + Sidebar -->
            <div class="finance-two-column" style="display: grid; grid-template-columns: 1fr 400px; gap: 32px;">
                <!-- Main Content: Transactions -->
                <div>
            
                    <!-- Transactions Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h4 style="font-size: 1.125rem; font-weight: 700; color: var(--finance-text-primary);">Transações Recentes</h4>
                        <button onclick="showAllTransactions()" style="color: var(--finance-indigo); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: none; border: none; cursor: pointer;">Ver Todas</button>
                    </div>
                    
                    <!-- Transactions List -->
                    <div id="finance-transactions-list" class="finance-scrollbar" style="max-height: 600px; overflow-y: auto;">
                        <p style="color: var(--finance-text-secondary); text-align: center; padding: 40px;">
                            <i class="fas fa-spinner fa-spin"></i> Carregando transações...
                        </p>
                    </div>
                </div>
                
                <!-- Sidebar -->
                <aside style="display: flex; flex-direction: column; gap: 32px;">
                    <!-- Quick Actions -->
                    <div>
                        <h4 style="font-size: 1.125rem; font-weight: 700; color: var(--finance-text-primary); margin-bottom: 24px;">Ações Rápidas</h4>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <button onclick="window.showNovoLancamentoChoiceModal && window.showNovoLancamentoChoiceModal()" style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--finance-card-dark); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; color: var(--finance-neon-blue); font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='rgba(59, 130, 246, 0.5)'" onmouseout="this.style.borderColor='rgba(59, 130, 246, 0.3)'">
                                <i class="fas fa-plus-circle" style="font-size: 1.25rem;"></i>
                                <span>Novo lançamento (Fluxo)</span>
                            </button>
                            <button onclick="openFinanceFilters()" style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--finance-card-dark); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; color: var(--finance-neon-blue); font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='rgba(59, 130, 246, 0.5)'" onmouseout="this.style.borderColor='rgba(59, 130, 246, 0.3)'">
                                <i class="fas fa-filter" style="font-size: 1.25rem;"></i>
                                <span>Filtros</span>
                            </button>
                        </div>
                    </div>
                    
                </aside>
            </div>
            </div>
            <div id="finance-king-content" style="display: none;"></div>
            <div id="king-finance-modal" class="king-finance-modal-wrap">
                <div class="king-finance-modal-box">
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: var(--finance-indigo, #3b82f6); border-radius: 24px 24px 0 0;"></div>
                    <h3 id="king-finance-modal-title" class="king-finance-modal-title">Novo</h3>
                    <form id="king-finance-modal-form" class="king-finance-modal-form"></form>
                    <button type="button" id="king-finance-modal-cancel" class="king-finance-modal-cancel">Cancelar</button>
                </div>
            </div>
        `;

        // Abas unificadas: handler de troca e render do conteúdo King (Fluxo, Trampo, Bens, Cartões, Serasa)
        const validTabs = ['resumo', 'fluxo', 'trabalhos', 'bens', 'cartoes', 'meta', 'terceiros', 'serasa'];
        let savedTab = null;
        const hash = (window.location.hash || '').replace(/^#/, '');
        const tabMatch = hash.match(/^finance-pane-tab-(.+)$/);
        if (tabMatch && validTabs.includes(tabMatch[1])) savedTab = tabMatch[1];
        if (!savedTab) savedTab = localStorage.getItem('finance_active_tab');
        window._financeActiveTab = (savedTab && validTabs.includes(savedTab)) ? savedTab : 'resumo';
        window.switchUnifiedFinanceTab = function (tabId) {
            window._financeActiveTab = tabId;
            try { localStorage.setItem('finance_active_tab', tabId); } catch (e) { }
            try {
                const newUrl = (window.location.pathname || '/dashboard') + '#finance-pane-tab-' + tabId;
                if (typeof window.history !== 'undefined' && typeof window.history.replaceState === 'function') {
                    window.history.replaceState(null, '', newUrl);
                }
            } catch (e) { }
            document.querySelectorAll('.finance-unified-tab').forEach(btn => {
                const isActive = btn.getAttribute('data-finance-tab') === tabId;
                btn.classList.toggle('active', isActive);
                btn.style.background = isActive ? 'var(--finance-indigo)' : 'rgba(255,255,255,0.05)';
                btn.style.color = isActive ? 'white' : 'var(--finance-text-secondary)';
                btn.style.fontWeight = isActive ? '700' : '600';
            });
            const resumoEl = document.getElementById('finance-resumo-content');
            const kingEl = document.getElementById('finance-king-content');
            if (resumoEl) resumoEl.style.display = tabId === 'resumo' ? 'block' : 'none';
            if (kingEl) {
                kingEl.style.display = tabId === 'resumo' ? 'none' : 'block';
                if (tabId !== 'resumo') window.renderUnifiedKingTab(tabId);
            }
        };
        document.querySelectorAll('.finance-unified-tab').forEach(btn => {
            btn.addEventListener('click', () => window.switchUnifiedFinanceTab(btn.getAttribute('data-finance-tab')));
        });

        // Renderizar conteúdo das abas King (Fluxo, Trampo, Bens, Cartões, Serasa) no painel unificado
        function escapeHtmlFinance(s) {
            return String(s == null ? '' : s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
        window.renderUnifiedKingTab = function (tabId) {
            const container = document.getElementById('finance-king-content');
            if (!container) return;
            const db = window._kingFinanceDb || { fluxo: [], trabalhos: [], bens: [], cartoes: [], dividas: [], terceiros: [] };
            const fluxoList = window._kingFinanceTransactions || [];
            const cartoesList = window._kingFinanceCards || [];
            const fmt = (v) => Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            const styleKfCard = 'background:#111;padding:1.5rem;border-radius:1.5rem;border:1px solid rgba(255,255,255,0.05);';
            if (tabId === 'fluxo') {
                const list = fluxoList.map(t => ({ id: t.id, tipo: (t.type || '').toUpperCase() === 'INCOME' ? 'receita' : 'despesa', valor: Number(t.amount) || 0, descricao: t.description || '', data: (t.transaction_date || t.date || '').toString().slice(0, 10) }));
                const canEdit = function(f) { return (typeof f.id === 'number' || (f.id != null && String(f.id).match(/^[0-9]+$/))); };
                container.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;"><h3 style="font-size:1.1rem;font-weight:800;color:var(--finance-text-primary);margin:0;">Fluxo de Caixa</h3><button type="button" onclick="window.showNovoLancamentoChoiceModal && window.showNovoLancamentoChoiceModal()" style="padding:8px 16px;background:#fff;color:#000;border:none;border-radius:12px;font-size:10px;font-weight:800;cursor:pointer;">+ Novo Lançamento</button></div><div style="display:flex;flex-direction:column;gap:0.75rem;">' + (list.length === 0 ? '<p style="color:#64748b;text-align:center;padding:2rem;">Nenhum lançamento neste mês. Use + Novo Lançamento ou a aba Resumo.</p>' : list.map(f => '<div class="kf-card" style="' + styleKfCard + 'display:flex;justify-content:space-between;align-items:center;padding:1rem;gap:12px;"><div style="display:flex;align-items:center;gap:1rem;flex:1;min-width:0;"><span style="color:' + (f.tipo === 'receita' ? '#22c55e' : '#f43f5e') + ';">' + (f.tipo === 'receita' ? '+' : '-') + '</span><div style="min-width:0;"><p style="font-size:12px;font-weight:700;margin:0;">' + escapeHtmlFinance((f.descricao || '').slice(0, 40)) + '</p><p style="font-size:9px;color:#64748b;margin:4px 0 0 0;">' + escapeHtmlFinance(f.data) + '</p></div></div><span style="font-weight:800;color:' + (f.tipo === 'receita' ? '#22c55e' : '#f43f5e') + ';">R$ ' + fmt(f.valor) + '</span>' + (canEdit(f) ? '<button type="button" onclick="window.editFinanceTransaction && window.editFinanceTransaction(' + f.id + ')" style="padding:6px 12px;background:rgba(59,130,246,0.25);border:1px solid rgba(59,130,246,0.5);border-radius:8px;color:#93c5fd;font-size:0.75rem;font-weight:700;cursor:pointer;white-space:nowrap;" title="Editar"><i class="fas fa-pencil-alt" style="margin-right:4px;"></i>Editar</button>' : '') + '</div>').join('')) + '</div>';
                return;
            }
            if (tabId === 'trabalhos') {
                const list = db.trabalhos || [];
                var formatPayDateTrab = function (p) { var dt = p.data || ''; if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) { var pt = dt.split('-'); dt = pt[2] + '/' + pt[1] + '/' + pt[0]; } return dt + (p.hora ? ' às ' + p.hora : ''); };
                var cardsTrab = list.length === 0 ? '<p style="color:#64748b;text-align:center;padding:2rem;">Nenhum trabalho. Clique em + Registrar Serviço.</p>' : list.map(function (t) {
                    var pago = (t.pagamentos || []).reduce(function (a, p) { return a + (Number(p.valor) || 0); }, 0);
                    var restante = Math.max(0, (Number(t.valor) || 0) - pago);
                    var pctD = (Number(t.valor) || 0) > 0 ? Math.round((pago / (t.valor || 1)) * 100) : 100;
                    var quitado = pago >= (Number(t.valor) || 0);
                    var ultimoPag = (t.pagamentos || []).length ? t.pagamentos[t.pagamentos.length - 1] : null;
                    var dataQuitStr = quitado && ultimoPag ? '<p style="font-size:10px;color:#22c55e;margin:4px 0 0 0;"><i class="fas fa-check-circle"></i> Quitado em ' + escapeHtmlFinance(formatPayDateTrab(ultimoPag)) + '</p>' : '';
                    var pagamentosHtmlT = (t.pagamentos || []).length ? '<div style="margin-top:12px;"><p style="font-size:9px;font-weight:800;color:rgba(255,255,255,0.5);margin:0 0 6px 0;letter-spacing:0.05em;">ENTRADAS</p>' + (t.pagamentos || []).map(function (p) { return '<p style="font-size:11px;color:#cbd5e1;margin:0 0 4px 0;">R$ ' + fmt(Number(p.valor) || 0) + ' em ' + escapeHtmlFinance(formatPayDateTrab(p)) + '</p>'; }).join('') + '</div>' : '';
                    var datasStr = (t.data || t.dataPrevista) ? ' · ' + (t.data ? 'Trabalho: ' + (t.data.length >= 10 ? t.data.split('-').reverse().join('/') : t.data) : '') + (t.dataPrevista ? (t.data ? ' ' : '') + 'Previsto: ' + (t.dataPrevista.length >= 10 ? t.dataPrevista.split('-').reverse().join('/') : t.dataPrevista) : '') : '';
                    var cardStyle = 'background:linear-gradient(135deg,rgba(59,130,246,0.18) 0%,rgba(37,99,235,0.1) 50%,#111 100%);border:1px solid rgba(59,130,246,0.3);border-radius:20px;padding:1.5rem;min-height:180px;display:flex;flex-direction:column;position:relative;';
                    var valoresRow = '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;"><div><p style="font-size:10px;color:rgba(255,255,255,0.6);margin:0 0 4px 0;">Valor recebido</p><p style="font-size:1.5rem;font-weight:800;margin:0;color:#22c55e;">R$ ' + fmt(pago) + '</p></div><div style="text-align:right;"><p style="font-size:10px;color:rgba(255,255,255,0.6);margin:0 0 4px 0;">Falta receber</p><p style="font-size:1.5rem;font-weight:800;margin:0;color:' + (restante > 0 ? '#f87171' : '#22c55e') + ';">' + (restante > 0 ? 'R$ ' + fmt(restante) : 'Quitado') + '</p></div></div>';
                    return '<div class="kf-card" style="' + cardStyle + '"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;"><div><p style="font-size:11px;color:rgba(255,255,255,0.6);margin:0 0 4px 0;letter-spacing:0.1em;">SERVIÇO PRESTADO</p><h4 style="font-size:1.15rem;font-weight:800;margin:0;color:#fff;">' + escapeHtmlFinance((t.cliente || '').slice(0, 35)) + '</h4><p style="font-size:10px;color:rgba(255,255,255,0.5);margin:4px 0 0 0;">' + escapeHtmlFinance((t.servico || '').slice(0, 50)) + escapeHtmlFinance(datasStr) + '</p></div><button type="button" onclick="window._kingFinanceEditTrabalho && window._kingFinanceEditTrabalho(\'' + String(t.id).replace(/'/g, "\\'") + '\')" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#60a5fa;cursor:pointer;padding:8px 12px;border-radius:10px;" title="Editar"><i class="fas fa-pencil-alt"></i></button></div>' + valoresRow + '<div style="height:8px;background:rgba(255,255,255,0.1);border-radius:999px;overflow:hidden;margin-bottom:8px;"><div style="height:100%;width:' + pctD + '%;background:linear-gradient(90deg,#22c55e,#3b82f6);border-radius:999px;transition:width 0.3s;"></div></div><p style="font-size:11px;color:rgba(255,255,255,0.6);margin:0 0 12px 0;">' + pctD + '% recebido</p>' + dataQuitStr + pagamentosHtmlT + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;"><button type="button" onclick="window._kingFinanceRegistrarEntradaTrabalho && window._kingFinanceRegistrarEntradaTrabalho(\'' + t.id + '\')" style="flex:1;min-width:140px;padding:10px 16px;background:#22c55e;color:#fff;border:none;border-radius:12px;font-size:11px;font-weight:800;cursor:pointer;"><i class="fas fa-plus" style="margin-right:6px;"></i>Registrar entrada</button><button type="button" onclick="window._kingFinanceDelete(\'trabalhos\',\'' + t.id + '\')" style="background:none;border:1px solid rgba(239,68,68,0.4);color:#f87171;cursor:pointer;padding:8px 12px;border-radius:10px;" title="Excluir"><i class="fas fa-trash"></i></button></div></div>';
                }).join('');
                container.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;"><h3 style="font-size:1.1rem;font-weight:800;color:#3b82f6;margin:0;">Trabalhos e Serviços</h3><button type="button" onclick="window._kingFinanceOpenModal(\'trabalho\')" style="padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:12px;font-size:10px;font-weight:800;cursor:pointer;">+ Registrar Serviço</button></div><p style="font-size:11px;color:#94a3b8;margin:0 0 12px 0;">Controle de serviços prestados. Registre entradas (pagamentos parciais) e acompanhe a quitação.</p><div style="display:flex;flex-direction:column;gap:1rem;">' + cardsTrab + '</div>';
                return;
            }
            if (tabId === 'bens') {
                if (window._kingFinanceBensFiltro !== 'emprestimo' && window._kingFinanceBensFiltro !== 'devolvidos') window._kingFinanceBensFiltro = 'emprestimo';
                const list = db.bens || [];
                var emEmprestimo = list.filter(function (b) { return !b.devolvido; });
                var devolvidos = list.filter(function (b) { return !!b.devolvido; });
                var filtroAtual = window._kingFinanceBensFiltro || 'emprestimo';
                var listToShow = filtroAtual === 'devolvidos' ? devolvidos : emEmprestimo;
                var fmtDataBem = function (d) { if (!d || d.length < 10) return ''; var p = d.slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
                var cardsBens = listToShow.length === 0 ? '<p style="color:#64748b;text-align:center;padding:2rem;grid-column:1/-1;">' + (filtroAtual === 'devolvidos' ? 'Nenhuma ferramenta devolvida.' : 'Nenhuma ferramenta em empréstimo.') + '</p>' : listToShow.map(function (b) {
                    var isDevolvido = !!b.devolvido;
                    var cardOpacity = isDevolvido ? 'opacity:0.75;' : '';
                    var cardStyleExtra = isDevolvido ? 'background:rgba(30,30,35,0.6);border-color:rgba(255,255,255,0.06);' : '';
                    var textMuted = isDevolvido ? 'color:#64748b !important;' : '';
                    var fotoHtml = b.foto ? '<div role="button" tabindex="0" onclick="window._kingFinanceExpandFoto && window._kingFinanceExpandFoto(this)" style="flex-shrink:0;width:80px;height:80px;margin-right:14px;cursor:pointer;' + (isDevolvido ? 'opacity:0.7;' : '') + '"><img src="' + b.foto.replace(/"/g, '&quot;') + '" style="width:80px;height:80px;border-radius:12px;object-fit:cover;border:1px solid rgba(255,255,255,0.1);display:block;pointer-events:none;" alt=""></div>' : '';
                    var datasHtml = (b.dataEmprestimo || b.previsaoEntrega || b.dataDevolucao) ? '<p style="font-size:9px;color:#64748b;margin:4px 0 0 0;">' + (b.dataEmprestimo ? 'Emprestada: ' + fmtDataBem(b.dataEmprestimo) : '') + (b.dataEmprestimo && b.previsaoEntrega ? ' · ' : '') + (b.previsaoEntrega ? 'Entrega prevista: ' + fmtDataBem(b.previsaoEntrega) : '') + (b.dataDevolucao ? (b.dataEmprestimo || b.previsaoEntrega ? ' · ' : '') + 'Devolvida: ' + fmtDataBem(b.dataDevolucao) : '') + '</p>' : '';
                    var btnDarBaixa = !isDevolvido ? '<button type="button" onclick="window._kingFinanceDarBaixaBem && window._kingFinanceDarBaixaBem(\'' + b.id + '\')" style="padding:6px 12px;background:rgba(34,197,94,0.2);border:1px solid rgba(34,197,94,0.5);border-radius:8px;color:#86efac;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;" title="Ferramenta devolvida"><i class="fas fa-check-circle" style="margin-right:4px;"></i>Dar baixa</button>' : '';
                    var btnReabrir = isDevolvido ? '<button type="button" onclick="window._kingFinanceReabrirBem && window._kingFinanceReabrirBem(\'' + b.id + '\')" style="padding:6px 12px;background:rgba(168,85,247,0.2);border:1px solid rgba(168,85,247,0.5);border-radius:8px;color:#a78bfa;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap;" title="Voltar a empréstimo"><i class="fas fa-redo" style="margin-right:4px;"></i>Reabrir empréstimo</button>' : '';
                    return '<div class="kf-card" style="' + styleKfCard + cardOpacity + cardStyleExtra + 'display:flex;justify-content:space-between;align-items:flex-start;gap:12px;"><div style="display:flex;align-items:flex-start;flex:1;min-width:0;">' + fotoHtml + '<div style="min-width:0;"><p style="font-size:10px;font-weight:800;color:#a855f7;margin:0;' + textMuted + '">' + (isDevolvido ? 'Devolvida' : 'Ferramenta emprestada') + '</p><h4 style="font-size:14px;font-weight:800;margin:4px 0 2px 0;' + textMuted + '">' + escapeHtmlFinance((b.nome || '').slice(0, 25)) + '</h4><p style="font-size:12px;font-weight:800;color:#f1f5f9;margin:2px 0 4px 0;' + textMuted + '">Com: ' + escapeHtmlFinance((b.possuidor || '').slice(0, 30)) + '</p><p style="font-size:12px;font-weight:800;color:#22c55e;margin:0 0 4px 0;' + textMuted + '">R$ ' + fmt(b.valorAluguel) + '/mês</p>' + datasHtml + '</div></div><div style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap;align-items:center;">' + btnDarBaixa + btnReabrir + '<button type="button" onclick="window._kingFinanceEditBem && window._kingFinanceEditBem(\'' + b.id + '\')" style="background:none;border:1px solid rgba(168,85,247,0.5);color:#a855f7;cursor:pointer;padding:6px 10px;border-radius:8px;" title="Editar"><i class="fas fa-pencil-alt"></i></button><button type="button" onclick="window._kingFinanceDelete(\'bens\',\'' + b.id + '\')" style="background:none;border:none;color:#64748b;cursor:pointer;" title="Excluir"><i class="fas fa-trash"></i></button></div></div>';
                }).join('');
                var subTabs = '<div style="display:flex;gap:8px;margin-bottom:1rem;flex-wrap:wrap;align-items:center;"><button type="button" onclick="window._kingFinanceBensFiltro=\'emprestimo\'; if(window.renderUnifiedKingTab) window.renderUnifiedKingTab(\'bens\')" style="padding:10px 18px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid ' + (filtroAtual === 'emprestimo' ? '#a855f7' : 'rgba(255,255,255,0.2)') + ';background:' + (filtroAtual === 'emprestimo' ? 'rgba(168,85,247,0.25)' : 'transparent') + ';color:' + (filtroAtual === 'emprestimo' ? '#c4b5fd' : '#94a3b8') + ';"><i class="fas fa-tools" style="margin-right:6px;"></i>Em empréstimo (' + emEmprestimo.length + ')</button><button type="button" onclick="window._kingFinanceBensFiltro=\'devolvidos\'; if(window.renderUnifiedKingTab) window.renderUnifiedKingTab(\'bens\')" style="padding:10px 18px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid ' + (filtroAtual === 'devolvidos' ? '#64748b' : 'rgba(255,255,255,0.2)') + ';background:' + (filtroAtual === 'devolvidos' ? 'rgba(100,116,139,0.2)' : 'transparent') + ';color:' + (filtroAtual === 'devolvidos' ? '#94a3b8' : '#64748b') + ';"><i class="fas fa-check-circle" style="margin-right:6px;"></i>Devolvidos (' + devolvidos.length + ')</button><button type="button" onclick="window._kingFinanceBensTelaCheia && window._kingFinanceBensTelaCheia(\'' + filtroAtual + '\')" style="padding:10px 18px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid rgba(168,85,247,0.5);background:rgba(168,85,247,0.15);color:#c4b5fd;"><i class="fas fa-expand" style="margin-right:6px;"></i>Ver em tela cheia</button></div>';
                container.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;flex-wrap:wrap;gap:12px;"><h3 style="font-size:1.1rem;font-weight:800;color:#a855f7;margin:0;">Empréstimo de ferramentas</h3><button type="button" onclick="window._kingFinanceOpenModal(\'bem\')" style="padding:8px 16px;background:#7c3aed;color:#fff;border:none;border-radius:12px;font-size:10px;font-weight:800;cursor:pointer;">+ Registrar ferramenta</button></div><p style="font-size:11px;color:#94a3b8;margin:0 0 12px 0;">Controle de ferramentas que você emprestou. Use <strong>Dar baixa</strong> quando receber de volta.</p>' + subTabs + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;">' + cardsBens + '</div>';
                return;
            }
            if (tabId === 'cartoes') {
                var curMonth = (typeof window.currentFinanceMonth === 'number' ? window.currentFinanceMonth : new Date().getMonth()) + 1;
                var curYear = typeof window.currentFinanceYear === 'number' ? window.currentFinanceYear : new Date().getFullYear();
                var txList = window._kingFinanceTransactions || [];
                var spentByCard = {};
                txList.forEach(function (t) {
                    if ((t.type || '').toUpperCase() !== 'EXPENSE' || !t.card_id) return;
                    var dt = (t.transaction_date || t.date || '').toString();
                    if (dt.length >= 7) {
                        var m = parseInt(dt.substring(5, 7), 10);
                        var y = parseInt(dt.substring(0, 4), 10);
                        if (m === curMonth && y === curYear) {
                            var cid = String(t.card_id);
                            spentByCard[cid] = (spentByCard[cid] || 0) + (parseFloat(t.amount) || 0);
                        }
                    }
                });
                var list = cartoesList.map(function (c) {
                    var cid = String(c.id);
                    var gasto = spentByCard[cid] || 0;
                    var limite = Number(c.limit_amount) || 0;
                    var disponivel = Math.max(0, limite - gasto);
                    var pctUsado = limite > 0 ? Math.min(100, Math.round((gasto / limite) * 100)) : 0;
                    return { id: c.id, nome: c.name || '', limite: limite, gasto: gasto, disponivel: disponivel, pctUsado: pctUsado, diaFechamento: c.closing_day || '' };
                });
                var cardsHtml = list.length === 0 ? '<p style="color:#64748b;text-align:center;padding:2rem;">Nenhum cartão. Use + Novo Cartão.</p>' : list.map(function (c) {
                    return '<div class="kf-card" style="' + styleKfCard + 'border-radius:20px;overflow:hidden;background:linear-gradient(135deg,rgba(249,115,22,0.15) 0%,rgba(234,88,12,0.08) 50%,#111 100%);border:1px solid rgba(249,115,22,0.25);min-height:180px;display:flex;flex-direction:column;position:relative;"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;"><div><p style="font-size:11px;color:rgba(255,255,255,0.6);margin:0 0 4px 0;letter-spacing:0.1em;">CARTÃO DE CRÉDITO</p><h4 style="font-size:1.15rem;font-weight:800;margin:0;color:#fff;">' + escapeHtmlFinance((c.nome || '').slice(0, 25)) + '</h4><p style="font-size:10px;color:rgba(255,255,255,0.5);margin:4px 0 0 0;">Fechamento: dia ' + (c.diaFechamento || '-') + '</p></div><div style="display:flex;gap:8px;"><button type="button" onclick="window._kingFinanceEditCartao && window._kingFinanceEditCartao(\'' + c.id + '\')" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#f97316;cursor:pointer;padding:8px 12px;border-radius:10px;" title="Editar"><i class="fas fa-pencil-alt"></i></button><button type="button" onclick="window._kingFinanceDeleteCard && window._kingFinanceDeleteCard(\'' + c.id + '\')" style="background:none;border:1px solid rgba(239,68,68,0.4);color:#f87171;cursor:pointer;padding:8px 12px;border-radius:10px;" title="Excluir"><i class="fas fa-trash"></i></button></div></div><div style="flex:1;"><p style="font-size:10px;color:rgba(255,255,255,0.6);margin:0 0 4px 0;">Limite disponível</p><p style="font-size:1.5rem;font-weight:800;margin:0 0 12px 0;color:#22c55e;">R$ ' + fmt(c.disponivel) + '</p><div style="height:8px;background:rgba(255,255,255,0.1);border-radius:999px;overflow:hidden;margin-bottom:8px;"><div style="height:100%;width:' + c.pctUsado + '%;background:linear-gradient(90deg,#ef4444,#f97316);border-radius:999px;transition:width 0.3s;"></div></div><div style="display:flex;justify-content:space-between;font-size:11px;"><span style="color:#f97316;">Utilizado: R$ ' + fmt(c.gasto) + '</span><span style="color:rgba(255,255,255,0.6);">Limite: R$ ' + fmt(c.limite) + '</span></div></div></div>';
                }).join('');
                container.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;"><h3 style="font-size:1.1rem;font-weight:800;color:#f97316;margin:0;">Cartões de Crédito</h3><button type="button" onclick="window._kingFinanceOpenModal(\'cartao\')" style="padding:8px 16px;background:#ea580c;color:#fff;border:none;border-radius:12px;font-size:10px;font-weight:800;cursor:pointer;">+ Novo Cartão</button></div><p style="font-size:11px;color:#94a3b8;margin:0 0 12px 0;">Gasto do mês atual com base nas despesas vinculadas a cada cartão.</p><div style="display:flex;flex-direction:column;gap:1rem;">' + cardsHtml + '</div>';
                return;
            }
            if (tabId === 'meta') {
                container.innerHTML = '<p style="color:#64748b;text-align:center;padding:2rem;"><i class="fas fa-spinner fa-spin"></i> Carregando metas...</p>';
                var profileIdMeta = localStorage.getItem('finance_current_profile_id') || '';
                var urlMeta = (typeof env.API_URL !== 'undefined' ? env.API_URL : '') + '/api/finance/goals' + (profileIdMeta ? '?profile_id=' + encodeURIComponent(profileIdMeta) : '');
                var headersMeta = typeof getAuthHeaders === 'function' ? env.getAuthHeaders() : (function(){ var t=localStorage.getItem('conectaKingToken')||''; var h={}; if(t) h.Authorization='Bearer '+t; return h; })();
                fetch(urlMeta, { headers: headersMeta }).then(function (r) { return r.json(); }).then(function (data) {
                    var goals = (data.data && data.data.goals) ? data.data.goals : (data.goals || []);
                    var earned = (data.data && data.data.total_income_earned != null) ? Number(data.data.total_income_earned) : Number(data.total_income_earned || 0);
                    var goalsBreakdown = (data.data && data.data.income_breakdown) ? data.data.income_breakdown : (data.income_breakdown || { itens: [], total: 0 });
                    window._financeGoalsBreakdown = goalsBreakdown;
                    var fmtMeta = function (v) { return (Number(v) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
                    var fmtDateMeta = function (d) { if (!d || String(d).length < 10) return ''; var p = String(d).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
                    var today = new Date(); today.setHours(0, 0, 0, 0);
                    var cardsMeta = goals.length === 0 ? '<p style="color:#64748b;text-align:center;padding:2rem;">Nenhuma meta. Clique em <strong>+ Nova meta</strong> para definir um valor e data alvo. Tudo que entrar em receitas será somado automaticamente.</p>' : goals.map(function (g) {
                        var targetVal = Number(g.target_value) || 0;
                        var targetDate = g.target_date ? new Date(String(g.target_date).slice(0, 10)) : null;
                        var daysLeft = targetDate ? Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24)) : 0;
                        var daysStr = daysLeft > 0 ? 'Faltam ' + daysLeft + ' dias' : (daysLeft === 0 ? 'ltimo dia' : 'Data passou');
                        var pct = targetVal > 0 ? Math.min(100, Math.round((earned / targetVal) * 100)) : 0;
                        var remaining = Math.max(0, targetVal - earned);
                        var remainingStr = remaining <= 0 ? 'Meta atingida!' : 'R$ ' + fmtMeta(remaining);
                        var cardStyle = 'background:linear-gradient(135deg,rgba(212,175,55,0.18) 0%,rgba(184,134,11,0.08) 50%,#111 100%);border:1px solid rgba(212,175,55,0.35);border-radius:20px;padding:1.25rem 1.5rem;min-height:120px;display:flex;flex-direction:column;';
                        return '<div class="kf-card" style="' + cardStyle + '">' +
                            '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">' +
                            '<div><p style="font-size:11px;color:rgba(255,255,255,0.6);margin:0 0 4px 0;letter-spacing:0.1em;">META</p><h4 style="font-size:1.15rem;font-weight:800;margin:0;color:#fff;">' + (g.name || '').replace(/</g, '&lt;').slice(0, 50) + '</h4><p style="font-size:10px;color:rgba(255,255,255,0.5);margin:4px 0 0 0;">Data alvo: ' + fmtDateMeta(g.target_date) + ' · ' + daysStr + '</p></div>' +
                            '<button type="button" onclick="if(confirm(\'Excluir esta meta?\')) window._kingFinanceDeleteMeta && window._kingFinanceDeleteMeta(\'' + g.id + '\')" style="background:none;border:1px solid rgba(239,68,68,0.4);color:#f87171;cursor:pointer;padding:8px 12px;border-radius:10px;" title="Excluir"><i class="fas fa-trash"></i></button>' +
                            '</div>' +
                            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem 1.5rem;align-items:end;">' +
                            '<div onclick="openFinanceDetailModal(\'goals\')" style="cursor:pointer;padding:8px;margin:-8px;border-radius:12px;transition:background 0.2s;" onmouseover="this.style.background=\'rgba(34,197,94,0.1)\'" onmouseout="this.style.background=\'transparent\'" title="Clique para ver de onde veio"><p style="font-size:10px;color:rgba(255,255,255,0.6);margin:0 0 2px 0;">Valor já ganho (receitas)</p><p style="font-size:1.35rem;font-weight:800;margin:0;color:#22c55e;">R$ ' + fmtMeta(earned) + '</p><p style="font-size:9px;color:#64748b;margin:4px 0 0 0;"><i class="fas fa-info-circle"></i> Clique para detalhar</p></div>' +
                            '<div><p style="font-size:10px;color:rgba(255,255,255,0.6);margin:0 0 2px 0;">Quanto falta</p><p style="font-size:1.35rem;font-weight:800;margin:0;color:' + (remaining <= 0 ? '#22c55e' : '#D4AF37') + ';">' + remainingStr + '</p></div>' +
                            '<div><p style="font-size:10px;color:rgba(255,255,255,0.6);margin:0 0 2px 0;">Meta</p><p style="font-size:1.35rem;font-weight:800;margin:0;color:#fff;">R$ ' + fmtMeta(targetVal) + '</p></div>' +
                            '</div>' +
                            '<div style="height:10px;background:rgba(255,255,255,0.1);border-radius:999px;overflow:hidden;margin-top:12px;"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#22c55e,#D4AF37);border-radius:999px;transition:width 0.3s;"></div></div>' +
                            '<p style="font-size:11px;color:rgba(255,255,255,0.6);margin:6px 0 0 0;">' + pct + '% do valor alvo</p>' +
                            '</div>';
                    }).join('');
                    container.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;"><h3 style="font-size:1.1rem;font-weight:800;color:#D4AF37;margin:0;">Metas</h3><button type="button" onclick="window._kingFinanceOpenMetaModal && window._kingFinanceOpenMetaModal()" style="padding:8px 16px;background:#D4AF37;color:#000;border:none;border-radius:12px;font-size:10px;font-weight:800;cursor:pointer;">+ Nova meta</button></div><p style="font-size:11px;color:#94a3b8;margin:0 0 12px 0;">Defina valor e data alvo. Tudo que entrar em receitas no sistema é somado automaticamente ao progresso.</p><div style="display:flex;flex-direction:column;gap:1rem;">' + cardsMeta + '</div>';
                }).catch(function () {
                    container.innerHTML = '<p style="color:#ef4444;text-align:center;padding:2rem;">Erro ao carregar metas. Tente novamente.</p>';
                });
                return;
            }
            if (tabId === 'terceiros') {
                const list = db.terceiros || [];
                var _tStats = window._kingFinanceTerceirosTotals && window._kingFinanceTerceirosTotals(list);
                var tdg = _tStats ? _tStats.totalGeral : 0;
                var tpg = _tStats ? _tStats.totalPago : 0;
                var totalFaltaPagarT = _tStats ? _tStats.totalFalta : 0;
                var rawPctT = _tStats ? _tStats.scorePct : 100;
                var pctT = rawPctT > 0 && rawPctT < 1 ? Math.round(rawPctT * 10) / 10 : Math.round(rawPctT);
                var pctTDisplay = (typeof pctT === 'number' && pctT > 0 && pctT < 1) ? pctT.toFixed(1).replace('.', ',') : Math.round(pctT);
                var labelT = pctT >= 100 ? 'Em dia' : pctT >= 50 ? 'Em acordo' : 'Quitando';
                var selPessoaId = window._kingFinanceTerceirosPessoaId;
                if (list.length > 0 && (!selPessoaId || !list.find(function (p) { return p.id === selPessoaId; }))) window._kingFinanceTerceirosPessoaId = list[0].id;
                selPessoaId = window._kingFinanceTerceirosPessoaId;
                var person = list.find(function (p) { return p.id === selPessoaId; });
                var fmtTab = function (v) { return (Number(v) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
                var personTabs = '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:1rem;"><span style="font-size:12px;color:#94a3b8;">Pessoa:</span>' + list.map(function (p) {
                    var active = p.id === selPessoaId;
                    var totalOwed = (p.contas || []).reduce(function (s, c) {
                        var pago = (c.pagamentos || []).reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0);
                        return s + Math.max(0, (Number(c.valor) || 0) - pago);
                    }, 0);
                    var valorLabel = totalOwed > 0 ? ' <span style="font-size:10px;color:#fcd34d;margin-left:4px;">R$ ' + fmtTab(totalOwed) + '</span>' : '';
                    return '<button type="button" onclick="window._kingFinanceTerceirosPessoaId=\'' + p.id + '\'; if(window.renderUnifiedKingTab) window.renderUnifiedKingTab(\'terceiros\')" style="padding:8px 16px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid ' + (active ? '#8b5cf6' : 'rgba(255,255,255,0.2)') + ';background:' + (active ? 'rgba(139,92,246,0.3)' : 'transparent') + ';color:' + (active ? '#a78bfa' : '#94a3b8') + ';">' + (p.nome || 'Pessoa').replace(/</g, ' ').slice(0, 20) + valorLabel + '</button>';
                }).join('') + '<button type="button" onclick="window._kingFinanceOpenModal(\'terceiro\')" style="padding:8px 16px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;border:1px dashed rgba(139,92,246,0.5);background:transparent;color:#a78bfa;"><i class="fas fa-plus" style="margin-right:4px;"></i>Adicionar pessoa</button></div>';
                var totalNegociacaoT = tdg;
                var bolinhasT = '<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><div style="width:168px;height:168px;border-radius:50%;background:conic-gradient(#8b5cf6 0% ' + pctT + '%, rgba(255,255,255,0.12) ' + pctT + '% 100%);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px rgba(139,92,246,0.3);"><div style="width:138px;height:138px;border-radius:50%;background:linear-gradient(180deg,rgba(22,22,30,0.98) 0%,rgba(12,12,18,0.99) 100%);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 2px 12px rgba(0,0,0,0.4);"><span style="font-size:2rem;font-weight:800;color:#a78bfa;text-align:center;line-height:1;">' + pctTDisplay + '%</span></div></div><p style="font-size:13px;font-weight:700;color:#94a3b8;margin:0;text-align:center;">' + labelT + '</p></div><div><p style="font-size:15px;font-weight:700;color:#a78bfa;margin:0 0 6px 0;">% Quitado</p><p style="font-size:13px;color:#94a3b8;margin:0;">Percentual já pago em todas as contas.</p></div></div><div style="display:flex;align-items:center;gap:1rem;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><div style="width:168px;height:168px;border-radius:50%;background:linear-gradient(180deg,rgba(239,68,68,0.45) 0%,rgba(239,68,68,0.28) 100%);border:2px solid rgba(239,68,68,0.6);display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(239,68,68,0.2),inset 0 0 30px rgba(239,68,68,0.08);"><div style="width:138px;height:138px;border-radius:50%;background:linear-gradient(180deg,rgba(28,12,12,0.97) 0%,rgba(18,8,8,0.99) 100%);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 2px 12px rgba(0,0,0,0.5);"><span style="font-size:1.25rem;font-weight:800;color:#fca5a5;text-align:center;line-height:1;display:block;">R$ ' + fmt(totalFaltaPagarT) + '</span></div></div><p style="font-size:13px;font-weight:700;color:#fca5a5;margin:0;text-align:center;">Falta pagar</p></div><div><p style="font-size:13px;color:#94a3b8;margin:0;">Total que ainda falta pagar em todos os acordos (todas as contas, todas as pessoas).</p></div></div><div style="display:flex;align-items:center;gap:1rem;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><div style="width:168px;height:168px;border-radius:50%;background:linear-gradient(180deg,rgba(34,197,94,0.45) 0%,rgba(34,197,94,0.28) 100%);border:2px solid rgba(34,197,94,0.6);display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(34,197,94,0.2),inset 0 0 30px rgba(34,197,94,0.08);"><div style="width:138px;height:138px;border-radius:50%;background:linear-gradient(180deg,rgba(12,28,18,0.97) 0%,rgba(8,18,12,0.99) 100%);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 2px 12px rgba(0,0,0,0.5);"><span style="font-size:1.25rem;font-weight:800;color:#86efac;text-align:center;line-height:1;display:block;">R$ ' + fmt(tpg) + '</span></div></div><p style="font-size:13px;font-weight:700;color:#86efac;margin:0;text-align:center;">Valor descontando</p></div><div><p style="font-size:13px;color:#94a3b8;margin:0;">Total já pago (descontado) em todas as contas.</p></div></div><div style="display:flex;align-items:center;gap:1rem;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><div style="width:168px;height:168px;border-radius:50%;background:linear-gradient(180deg,rgba(100,116,139,0.4) 0%,rgba(71,85,105,0.35) 100%);border:2px solid rgba(148,163,184,0.5);display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(100,116,139,0.15),inset 0 0 24px rgba(0,0,0,0.2);"><div style="width:138px;height:138px;border-radius:50%;background:linear-gradient(180deg,rgba(30,30,35,0.98) 0%,rgba(18,18,22,0.99) 100%);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 2px 12px rgba(0,0,0,0.5);"><span style="font-size:1.25rem;font-weight:800;color:#cbd5e1;text-align:center;line-height:1;display:block;">R$ ' + fmt(totalNegociacaoT) + '</span></div></div><p style="font-size:13px;font-weight:700;color:#94a3b8;margin:0;text-align:center;">Valor da negociação (total)</p></div><div><p style="font-size:13px;color:#94a3b8;margin:0;">Total acordado em todas as contas. Referência ao quitar.</p></div></div>';
                var currentYearT = window.currentFinanceYear !== undefined ? window.currentFinanceYear : new Date().getFullYear();
                var currentMonthT = window.currentFinanceMonth !== undefined ? window.currentFinanceMonth : new Date().getMonth();
                var mesRef = currentYearT + '-' + String(currentMonthT + 1).padStart(2, '0');
                var faltaEsteMesList = [];
                var totalFaltaEsteMes = 0;
                (list || []).forEach(function (p) {
                    (p.contas || []).forEach(function (c) {
                        var venc = (c.dataVencimento || '').toString().trim().slice(0, 7);
                        if (!venc || venc !== mesRef) return;
                        var pago = (c.pagamentos || []).reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0);
                        var restante = (Number(c.valor) || 0) - pago;
                        if (restante <= 0) return;
                        faltaEsteMesList.push({ pessoaNome: p.nome || 'Pessoa', contaNome: c.nomeConta || 'Conta', restante: restante });
                        totalFaltaEsteMes += restante;
                    });
                });
                var faltaEsteMesHtml = '';
                if (faltaEsteMesList.length > 0) {
                    var mesNome = new Date(currentYearT, currentMonthT, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                    faltaEsteMesHtml = '<div class="kf-card" style="' + styleKfCard + 'margin-bottom:1.5rem;border-left:4px solid #ef4444;"><h4 style="font-size:1rem;font-weight:800;color:#fca5a5;margin:0 0 12px 0;"><i class="fas fa-calendar-times" style="margin-right:8px;"></i>Falta pagar este mês (' + mesNome + ')</h4><p style="font-size:11px;color:#94a3b8;margin:0 0 12px 0;">Contas com vencimento neste mês que ainda têm valor a pagar.</p><ul style="list-style:none;padding:0;margin:0 0 12px 0;">' + faltaEsteMesList.map(function (x) { return '<li style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);"><span style="font-size:12px;color:#e2e8f0;">' + (x.pessoaNome + ' - ' + x.contaNome).replace(/</g, ' ').slice(0, 50) + '</span><strong style="color:#fcd34d;">R$ ' + fmt(x.restante) + '</strong></li>'; }).join('') + '</ul><p style="font-size:14px;font-weight:800;color:#fca5a5;margin:0;">Total: R$ ' + fmt(totalFaltaEsteMes) + '</p></div>';
                }
                var contentArea = '';
                if (list.length === 0) {
                    contentArea = '<p style="color:#64748b;text-align:center;padding:2rem;">Nenhuma pessoa. Clique em <strong>Adicionar pessoa</strong> para criar (ex: Samara, Rodrigo). Depois, em cada aba, adicione as contas (Cartão X, Cartão Y, Aluguel, etc.).</p>';
                } else if (!person) {
                    contentArea = '<p style="color:#64748b;text-align:center;padding:2rem;">Selecione uma pessoa acima.</p>';
                } else {
                    var contas = person.contas || [];
                    var formatPayDateT = function (p) { var dt = p.data || ''; if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) { var pt = dt.split('-'); dt = pt[2] + '/' + pt[1] + '/' + pt[0]; } return dt + (p.hora ? ' às ' + p.hora : ''); };
                    var cardsContas = contas.length === 0 ? '<p style="color:#64748b;text-align:center;padding:2rem;">Nenhuma conta. Clique em <strong>+ Nova conta</strong> (ex: Cartão X, Cartão Y, Aluguel).</p>' : contas.map(function (c, idx) {
                        var num = idx + 1;
                        var pago = (c.pagamentos || []).reduce(function (a, p) { return a + (Number(p.valor) || 0); }, 0);
                        var restante = (Number(c.valor) || 0) - pago;
                        var pctD = (Number(c.valor) || 0) > 0 ? Math.round((pago / (c.valor || 1)) * 100) : 100;
                        var pagamentosHtmlT = (c.pagamentos || []).length ? '<div style="margin-bottom:0.75rem;"><p style="font-size:9px;font-weight:800;color:#94a3b8;margin:0 0 6px 0;">Pagamentos (clique em Excluir para remover um pagamento errado)</p>' + (c.pagamentos || []).map(function (p, pIdx) { return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);gap:8px;"><span style="font-size:11px;color:#cbd5e1;">R$ ' + fmt(Number(p.valor) || 0) + ' em ' + formatPayDateT(p) + '</span><div style="display:flex;gap:6px;"><button type="button" onclick="event.stopPropagation(); window._kingFinanceEditarPagamentoTerceiro && window._kingFinanceEditarPagamentoTerceiro(\'' + (person.id || '').replace(/'/g, "\\'") + '\',\'' + (c.id || '').replace(/'/g, "\\'") + '\',' + pIdx + ')" style="background:rgba(139,92,246,0.25);border:1px solid rgba(139,92,246,0.5);color:#a78bfa;cursor:pointer;padding:4px 10px;border-radius:8px;font-size:10px;font-weight:700;" title="Editar"><i class="fas fa-pencil-alt"></i></button><button type="button" onclick="event.stopPropagation(); window._kingFinanceExcluirPagamentoTerceiro && window._kingFinanceExcluirPagamentoTerceiro(\'' + (person.id || '').replace(/'/g, "\\'") + '\',\'' + (c.id || '').replace(/'/g, "\\'") + '\',' + pIdx + ')" style="background:rgba(239,68,68,0.25);border:1px solid rgba(239,68,68,0.5);color:#fca5a5;cursor:pointer;padding:4px 10px;border-radius:8px;font-size:10px;font-weight:700;" title="Excluir este pagamento"><i class="fas fa-trash"></i></button></div></div>'; }).join('') + '</div>' : '';
                        var vencStr = (c.dataVencimento || '').trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(vencStr)) { var pt = vencStr.split('-'); vencStr = pt[2] + '/' + pt[1] + '/' + pt[0]; }
                        var tipoLabel = (c.tipo === 'recorrente') ? 'Mensal' : 'nica vez';
                        var subtituloConta = (vencStr || tipoLabel) ? '<p style="font-size:10px;color:#94a3b8;margin:0 0 6px 0;">Venc: ' + (vencStr || '-') + ' · ' + tipoLabel + '</p>' : '';
                        return '<div class="kf-card" style="' + styleKfCard + 'border-left:4px solid #8b5cf6;"><div style="display:flex;justify-content:space-between;margin-bottom:0.75rem;align-items:center;"><span style="font-size:12px;font-weight:800;color:#94a3b8;">' + num + '.</span><h4 style="font-size:14px;font-weight:800;margin:0;flex:1;">' + (c.nomeConta || 'Conta').replace(/</g, ' ').slice(0, 45) + '</h4><div style="display:flex;gap:6px;"><button type="button" onclick="window._kingFinanceEditContaTerceiro && window._kingFinanceEditContaTerceiro(\'' + person.id + '\',\'' + c.id + '\')" style="background:none;border:1px solid rgba(139,92,246,0.5);color:#a78bfa;cursor:pointer;padding:4px 8px;border-radius:8px;" title="Editar conta"><i class="fas fa-pencil-alt"></i></button><button type="button" onclick="window._kingFinanceDeleteContaTerceiro && window._kingFinanceDeleteContaTerceiro(\'' + person.id + '\',\'' + c.id + '\')" style="background:none;border:none;color:#64748b;cursor:pointer;" title="Excluir esta conta"><i class="fas fa-trash"></i></button></div></div>' + subtituloConta + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.75rem;"><div style="background:rgba(0,0,0,0.3);padding:0.75rem;border-radius:1rem;"><p style="font-size:9px;font-weight:800;color:#94a3b8;margin:0 0 4px 0;">TOTAL LIQUIDADO</p><p style="font-size:16px;font-weight:800;color:#86efac;margin:0;">R$ ' + fmt(pago) + '</p><p style="font-size:10px;color:#94a3b8;margin:0;">' + pctD + '% Completo</p></div><div style="background:rgba(0,0,0,0.3);padding:0.75rem;border-radius:1rem;"><p style="font-size:9px;font-weight:800;color:#94a3b8;margin:0 0 4px 0;">VALOR DA NEGOCIA—fO</p><p style="font-size:16px;font-weight:800;color:#f59e0b;margin:0 0 6px 0;">R$ ' + fmt(restante) + '</p><button type="button" onclick="event.stopPropagation(); window._kingFinanceRegistrarPagamentoTerceiro && window._kingFinanceRegistrarPagamentoTerceiro(\'' + person.id + '\',\'' + c.id + '\')" style="padding:6px 12px;background:rgba(245,158,11,0.35);color:#fcd34d;border:1px solid rgba(245,158,11,0.6);border-radius:10px;font-size:10px;font-weight:700;cursor:pointer;">Pagar mais</button></div></div>' + pagamentosHtmlT + '<div style="height:6px;background:rgba(255,255,255,0.1);border-radius:999px;overflow:hidden;margin-bottom:0.75rem;"><div style="height:100%;width:' + pctD + '%;background:#8b5cf6;border-radius:999px;"></div></div><button type="button" onclick="window._kingFinanceRegistrarPagamentoTerceiro && window._kingFinanceRegistrarPagamentoTerceiro(\'' + person.id + '\',\'' + c.id + '\')" style="width:100%;padding:12px;background:#8b5cf6;color:#fff;border:none;border-radius:12px;font-size:11px;font-weight:800;cursor:pointer;">Efetuar pagamento</button></div>';
                    }).join('');
                    contentArea = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:8px;"><h4 style="font-size:1rem;font-weight:800;color:#a78bfa;margin:0;">' + (person.nome || 'Pessoa').replace(/</g, ' ') + '</h4><div style="display:flex;gap:8px;"><button type="button" onclick="window._kingFinanceImportarTerceirosImagem && window._kingFinanceImportarTerceirosImagem()" style="padding:8px 16px;background:rgba(34,197,94,0.25);color:#86efac;border:1px solid rgba(34,197,94,0.5);border-radius:12px;font-size:10px;font-weight:800;cursor:pointer;"><i class="fas fa-image" style="margin-right:6px;"></i>Importar imagem</button><button type="button" onclick="window._kingFinanceEditTerceiro && window._kingFinanceEditTerceiro(\'' + person.id + '\')" style="padding:8px 16px;background:rgba(139,92,246,0.25);color:#a78bfa;border:1px solid rgba(139,92,246,0.5);border-radius:12px;font-size:10px;font-weight:800;cursor:pointer;"><i class="fas fa-pencil-alt" style="margin-right:6px;"></i>Editar pessoa</button><button type="button" onclick="window._kingFinanceOpenModal(\'contaPessoa\', \'' + person.id + '\')" style="padding:8px 16px;background:#8b5cf6;color:#fff;border:none;border-radius:12px;font-size:10px;font-weight:800;cursor:pointer;">+ Nova conta</button><button type="button" onclick="if(confirm(\'Excluir esta pessoa e todas as contas?\')) window._kingFinanceDelete(\'terceiros\',\'' + person.id + '\')" style="padding:8px 16px;background:rgba(244,63,94,0.25);color:#fda4af;border:1px solid rgba(244,63,94,0.5);border-radius:12px;font-size:10px;font-weight:800;cursor:pointer;"><i class="fas fa-trash" style="margin-right:6px;"></i>Excluir pessoa</button></div></div><div style="display:flex;flex-direction:column;gap:1rem;">' + cardsContas + '</div>';
                }
                container.innerHTML = '<div style="margin-bottom:1rem;"><h3 style="font-size:1.1rem;font-weight:800;color:#8b5cf6;margin:0 0 8px 0;">Quem eu devo</h3><p style="font-size:11px;color:#94a3b8;margin:0 0 12px 0;">Uma aba por pessoa. Em cada aba, adicione as contas (Cartão X, Cartão Y, Aluguel, etc.).</p><div class="kf-card" style="' + styleKfCard + 'display:flex;align-items:center;justify-content:center;gap:2rem;margin-bottom:1.5rem;flex-wrap:wrap;padding:1.5rem;">' + bolinhasT + '</div></div>' + faltaEsteMesHtml + personTabs + '<div class="kf-card" style="' + styleKfCard + 'padding:1.5rem;">' + contentArea + '</div>';
                return;
            }
            if (tabId === 'serasa') {
                const list = db.dividas || [];
                var searchTerm = (window._kingFinanceSerasaSearch || '').trim().toLowerCase();
                var filteredList = !searchTerm ? list : list.filter(function (d) {
                    var nome = (d.nome || '').toLowerCase();
                    var razao = (d.razaoSocial || '').toLowerCase();
                    var emp = (d.empresaOrigem || '').toLowerCase();
                    var valStr = ('' + (Number(d.valorTotal) || 0)).replace('.', ',').replace(/\D/g, '');
                    return nome.indexOf(searchTerm) >= 0 || razao.indexOf(searchTerm) >= 0 || emp.indexOf(searchTerm) >= 0 || (searchTerm.replace(/\D/g, '').length >= 1 && valStr.indexOf(searchTerm.replace(/\D/g, '')) >= 0);
                });
                const stats = window._kingFinanceStats || {};
                var pct = stats.scoreSerasaPct !== undefined ? stats.scoreSerasaPct : 0;
                var pctDisplay = (typeof pct === 'number' && pct > 0 && pct < 1) ? pct.toFixed(1).replace('.', ',') : Math.round(pct);
                var label = stats.scoreSerasaLabel || '-';
                var totalValorAtual = list.reduce(function (a, d) { return a + (Number(d.valorAtual != null ? d.valorAtual : d.valorTotal) || 0); }, 0);
                var totalFaltaPagar = list.reduce(function (a, d) { var pago = (d.pagamentos || []).reduce(function (ac, p) { return ac + (Number(p.valor) || 0); }, 0); return a + Math.max(0, (Number(d.valorTotal) || 0) - pago); }, 0);
                var totalNegociacao = list.reduce(function (a, d) { return a + (Number(d.valorTotal) || 0); }, 0);
                var searchBox = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;"><span style="font-size:1rem;font-weight:800;color:#f1f5f9;">Acordos</span><span style="font-size:12px;color:#94a3b8;">Total: ' + (list.length) + ' conta(s)</span><div style="flex:1;min-width:180px;max-width:320px;"><label style="position:relative;display:block;"><i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:12px;"></i><input type="text" id="serasa-search-input" placeholder="Pesquisar por nome do banco/credor ou valor" value="' + (window._kingFinanceSerasaSearch || '').replace(/"/g, '&quot;') + '" style="width:100%;padding:10px 10px 10px 36px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:12px;color:#f1f5f9;font-size:12px;"></label></div></div>';
                var bolinhasSerasa = '<div style="display:flex;align-items:center;gap:1rem;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><div style="width:168px;height:168px;border-radius:50%;background:conic-gradient(var(--finance-indigo,#6366f1) 0% ' + pct + '%, rgba(255,255,255,0.12) ' + pct + '% 100%);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px rgba(99,102,241,0.3);"><div style="width:138px;height:138px;border-radius:50%;background:linear-gradient(180deg,rgba(22,22,30,0.98) 0%,rgba(12,12,18,0.99) 100%);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 2px 12px rgba(0,0,0,0.4);"><span style="font-size:2rem;font-weight:800;color:#a5b4fc;text-align:center;line-height:1;">' + pctDisplay + '%</span></div></div><p style="font-size:13px;font-weight:700;color:#94a3b8;margin:0;text-align:center;">' + label + '</p></div><div><p style="font-size:15px;font-weight:700;color:#a5b4fc;margin:0 0 6px 0;">Score Serasa (KING)</p><p style="font-size:13px;color:#94a3b8;margin:0;">Percentual das dívidas já quitadas.</p></div></div><div style="display:flex;align-items:center;gap:1rem;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><div style="width:168px;height:168px;border-radius:50%;background:linear-gradient(180deg,rgba(245,158,11,0.45) 0%,rgba(245,158,11,0.3) 100%);border:2px solid rgba(245,158,11,0.6);display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(245,158,11,0.2),inset 0 0 30px rgba(245,158,11,0.08);"><div style="width:138px;height:138px;border-radius:50%;background:linear-gradient(180deg,rgba(20,18,12,0.97) 0%,rgba(14,12,8,0.99) 100%);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 2px 12px rgba(0,0,0,0.5);"><span style="font-size:1.25rem;font-weight:800;color:#fcd34d;text-align:center;line-height:1;display:block;">R$ ' + fmt(totalValorAtual) + '</span></div></div><p style="font-size:13px;font-weight:700;color:#fcd34d;margin:0;text-align:center;">Valor total atual</p></div><div><p style="font-size:13px;color:#94a3b8;margin:0;">Soma do valor atual (juros/correções) de todas as contas.</p></div></div><div style="display:flex;align-items:center;gap:1rem;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><div style="width:168px;height:168px;border-radius:50%;background:linear-gradient(180deg,rgba(239,68,68,0.45) 0%,rgba(239,68,68,0.28) 100%);border:2px solid rgba(239,68,68,0.6);display:flex;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(239,68,68,0.2),inset 0 0 30px rgba(239,68,68,0.08);"><div style="width:138px;height:138px;border-radius:50%;background:linear-gradient(180deg,rgba(28,12,12,0.97) 0%,rgba(18,8,8,0.99) 100%);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 2px 12px rgba(0,0,0,0.5);"><span style="font-size:1.25rem;font-weight:800;color:#fca5a5;text-align:center;line-height:1;display:block;">R$ ' + fmt(totalFaltaPagar) + '</span></div></div><p style="font-size:13px;font-weight:700;color:#fca5a5;margin:0;text-align:center;">Falta pagar</p></div><div><p style="font-size:13px;color:#94a3b8;margin:0;">Total que ainda falta pagar em todos os acordos.</p></div></div><div style="display:flex;align-items:center;gap:1rem;"><div style="display:flex;flex-direction:column;align-items:center;gap:8px;"><div style="width:168px;height:168px;border-radius:50%;background:linear-gradient(180deg,rgba(100,116,139,0.4) 0%,rgba(71,85,105,0.35) 100%);border:2px solid rgba(148,163,184,0.5);display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(100,116,139,0.15),inset 0 0 24px rgba(0,0,0,0.2);"><div style="width:138px;height:138px;border-radius:50%;background:linear-gradient(180deg,rgba(30,30,35,0.98) 0%,rgba(18,18,22,0.99) 100%);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 2px 12px rgba(0,0,0,0.5);"><span style="font-size:1.25rem;font-weight:800;color:#cbd5e1;text-align:center;line-height:1;display:block;">R$ ' + fmt(totalNegociacao) + '</span></div></div><p style="font-size:13px;font-weight:700;color:#94a3b8;margin:0;text-align:center;">Valor da negociação (total)</p></div><div><p style="font-size:13px;color:#94a3b8;margin:0;">Total acordado em todos os acordos. Não diminui ao pagar; referência para quando quitar.</p></div></div>';
                container.innerHTML = '<div style="margin-bottom:1rem;"><h3 style="font-size:1.1rem;font-weight:800;color:var(--finance-indigo,#6366f1);margin:0 0 8px 0;">Serasa & Acordos</h3><p style="font-size:11px;color:#94a3b8;margin:0 0 12px 0;">Indicador baseado nos acordos que você cadastrou.</p><div class="kf-card" style="' + styleKfCard + 'display:flex;align-items:center;justify-content:center;gap:2rem;margin-bottom:1.5rem;flex-wrap:wrap;padding:1.5rem;">' + bolinhasSerasa + '</div></div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:8px;">' + searchBox + '<div style="display:flex;gap:8px;flex-wrap:wrap;"><button type="button" onclick="window._kingFinanceSerasaSelectAll && window._kingFinanceSerasaSelectAll()" style="padding:8px 16px;background:rgba(99,102,241,0.2);color:#a5b4fc;border:1px solid rgba(99,102,241,0.4);border-radius:12px;font-size:10px;font-weight:800;cursor:pointer;"><i class="fas fa-check-double" style="margin-right:6px;"></i>Selecionar todos</button><button type="button" id="serasa-excluir-todos-btn" disabled onclick="window._kingFinanceSerasaExcluirTodos && window._kingFinanceSerasaExcluirTodos()" style="padding:8px 16px;background:rgba(244,63,94,0.25);color:#fda4af;border:1px solid rgba(244,63,94,0.5);border-radius:12px;font-size:10px;font-weight:800;cursor:pointer;"><i class="fas fa-trash" style="margin-right:6px;"></i>Excluir selecionados</button><button type="button" onclick="window._kingFinanceImportarSerasaPdf && window._kingFinanceImportarSerasaPdf(\'pdf\')" style="padding:8px 16px;background:rgba(99,102,241,0.25);color:#a5b4fc;border:1px solid rgba(99,102,241,0.5);border-radius:12px;font-size:10px;font-weight:800;cursor:pointer;"><i class="fas fa-file-pdf" style="margin-right:6px;"></i>Importar PDF (valores)</button><button type="button" onclick="window._kingFinanceImportarSerasaPdf && window._kingFinanceImportarSerasaPdf(\'image\')" style="padding:8px 16px;background:rgba(34,197,94,0.25);color:#86efac;border:1px solid rgba(34,197,94,0.5);border-radius:12px;font-size:10px;font-weight:800;cursor:pointer;"><i class="fas fa-image" style="margin-right:6px;"></i>Importar imagem</button><button type="button" onclick="window._kingFinanceOpenModal(\'divida\')" style="padding:8px 16px;background:var(--finance-indigo,#6366f1);color:#fff;border:none;border-radius:12px;font-size:10px;font-weight:800;cursor:pointer;">+ Novo Acordo</button></div></div><div style="display:flex;flex-direction:column;gap:1rem;">' + (filteredList.length === 0 ? '<p style="color:#64748b;text-align:center;padding:2rem;">' + (list.length === 0 ? 'Nenhum acordo. Clique em + Novo Acordo.' : 'Nenhum acordo corresponde à pesquisa.') + '</p>' : filteredList.map(function (d, idx) { var num = idx + 1; var pago = (d.pagamentos || []).reduce(function (a, p) { return a + (Number(p.valor) || 0); }, 0); var restante = (Number(d.valorTotal) || 0) - pago; var pctD = (Number(d.valorTotal) || 0) > 0 ? Math.round((pago / (d.valorTotal || 1)) * 100) : 100; var formatPayDate = function (p) { var dt = p.data || ''; if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) { var pt = dt.split('-'); dt = pt[2] + '/' + pt[1] + '/' + pt[0]; } return dt + (p.hora ? ' às ' + p.hora : ''); }; var pagamentosHtml = (d.pagamentos || []).length ? '<div style="margin-bottom:0.75rem;"><p style="font-size:9px;font-weight:800;color:#94a3b8;margin:0 0 6px 0;">Pagamentos</p>' + (d.pagamentos || []).map(function (p) { return '<p style="font-size:11px;color:#cbd5e1;margin:0 0 4px 0;">R$ ' + fmt(Number(p.valor) || 0) + ' em ' + formatPayDate(p) + '</p>'; }).join('') + '</div>' : ''; var detalhesStr = (d.numeroContrato || d.dataDivida || d.produtoServico || d.empresaOrigem) ? '<p style="font-size:10px;color:#94a3b8;margin:0 0 6px 0;">' + (d.empresaOrigem ? 'Origem ' + (d.empresaOrigem || '').slice(0, 20) : '') + (d.numeroContrato ? (d.empresaOrigem ? ' · ' : '') + 'Contrato ' + d.numeroContrato : '') + (d.dataDivida ? ' · Data ' + d.dataDivida : '') + (d.produtoServico ? ' · ' + (d.produtoServico || '').slice(0, 25) : '') + '</p>' : ''; var origAtualStr = (d.valorOriginal != null || d.valorAtual != null) ? '<p style="font-size:10px;color:#94a3b8;margin:0 0 6px 0;">Orig. R$ ' + fmt(d.valorOriginal) + ' · Atual R$ ' + fmt(d.valorAtual) + '</p>' : ''; return '<div class="kf-card" style="' + styleKfCard + 'border-left:4px solid var(--finance-indigo,#6366f1);cursor:pointer;" onclick="if (!event.target.closest(\'button\') && !event.target.closest(\'input[type=checkbox]\')) window._kingFinanceVerDetalhesDivida && window._kingFinanceVerDetalhesDivida(\'' + d.id + '\')"><div style="display:flex;justify-content:space-between;margin-bottom:0.75rem;align-items:center;gap:8px;"><input type="checkbox" class="serasa-acordo-cb" data-divida-id="' + d.id + '" onclick="event.stopPropagation(); window._kingFinanceSerasaUpdateExcluirBtn && window._kingFinanceSerasaUpdateExcluirBtn()" style="cursor:pointer;flex-shrink:0;"><span style="font-size:12px;font-weight:800;color:#94a3b8;min-width:28px;">' + num + '.</span><h4 style="font-size:14px;font-weight:800;margin:0;flex:1;">' + (d.nome || '').slice(0, 35) + '</h4><button type="button" onclick="event.stopPropagation(); window._kingFinanceDelete(\'dividas\',\'' + d.id + '\')" style="background:none;border:none;color:#64748b;cursor:pointer;"><i class="fas fa-trash"></i></button></div><p style="font-size:10px;margin:0 0 6px 0;"><a href="javascript:void(0)" onclick="event.stopPropagation(); window._kingFinanceVerDetalhesDivida && window._kingFinanceVerDetalhesDivida(\'' + d.id + '\')" style="color:var(--finance-indigo,#6366f1);">Ver detalhes</a></p>' + detalhesStr + origAtualStr + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:0.75rem;"><div style="background:rgba(0,0,0,0.3);padding:0.75rem;border-radius:1rem;"><p style="font-size:9px;font-weight:800;color:#94a3b8;margin:0 0 4px 0;letter-spacing:0.02em;">TOTAL LIQUIDADO</p><p style="font-size:16px;font-weight:800;color:#86efac;margin:0 0 2px 0;">R$ ' + fmt(pago) + '</p><p style="font-size:10px;color:#94a3b8;margin:0;">' + pctD + '% Completo</p></div><div style="background:rgba(0,0,0,0.3);padding:0.75rem;border-radius:1rem;position:relative;"><p style="font-size:9px;font-weight:800;color:#94a3b8;margin:0 0 4px 0;letter-spacing:0.02em;">VALOR DA NEGOCIA—fO</p><p style="font-size:16px;font-weight:800;color:#f59e0b;margin:0 0 6px 0;">R$ ' + fmt(restante) + '</p><button type="button" onclick="event.stopPropagation(); window._kingFinanceRegistrarPagamento(\'' + d.id + '\')" style="padding:6px 12px;background:rgba(245,158,11,0.35);color:#fcd34d;border:1px solid rgba(245,158,11,0.6);border-radius:10px;font-size:10px;font-weight:700;cursor:pointer;">Pagar mais</button><button type="button" onclick="event.stopPropagation(); window._kingFinanceEditarValorDivida && window._kingFinanceEditarValorDivida(\'' + d.id + '\')" style="position:absolute;top:4px;right:4px;background:rgba(99,102,241,0.25);color:#a5b4fc;border:1px solid rgba(99,102,241,0.4);border-radius:8px;padding:4px 8px;font-size:9px;font-weight:700;cursor:pointer;" title="Alterar valor total da dívida"><i class="fas fa-pen"></i></button></div></div>' + pagamentosHtml + '<div style="height:6px;background:rgba(255,255,255,0.1);border-radius:999px;overflow:hidden;margin-bottom:0.75rem;"><div style="height:100%;width:' + pctD + '%;background:var(--finance-indigo,#6366f1);border-radius:999px;"></div></div><button type="button" onclick="event.stopPropagation(); window._kingFinanceRegistrarPagamento(\'' + d.id + '\')" style="width:100%;padding:12px;background:var(--finance-indigo,#6366f1);color:#fff;border:none;border-radius:12px;font-size:11px;font-weight:800;cursor:pointer;letter-spacing:0.02em;">Efetuar pagamento</button></div>'; }).join('')) + '</div>';
                var searchInput = document.getElementById('serasa-search-input');
                if (searchInput) searchInput.oninput = function () {
                    var v = this.value;
                    window._kingFinanceSerasaSearch = v;
                    if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('serasa');
                    if (window.loadFinanceTransactions) window.loadFinanceTransactions();
                    setTimeout(function () {
                        var inp = document.getElementById('serasa-search-input');
                        if (inp) { inp.focus(); inp.value = v; inp.setSelectionRange(v.length, v.length); }
                    }, 0);
                };
                if (window._kingFinanceSerasaUpdateExcluirBtn) window._kingFinanceSerasaUpdateExcluirBtn();
                return;
            }
        };
        // Restaurar aba salva ao recarregar a página (após renderUnifiedKingTab estar definida)
        window.switchUnifiedFinanceTab(window._financeActiveTab);

        // Modal King (Fluxo, Trampo, Bens, Cartões, Serasa): cancel
        const kingModalCancel = document.getElementById('king-finance-modal-cancel');
        if (kingModalCancel) kingModalCancel.onclick = () => { const m = document.getElementById('king-finance-modal'); if (m) m.style.display = 'none'; };

        // Handlers do modal King para o painel unificado (Fluxo, Trampo, Bens, Cartões, Serasa)
        (function () {
            var modal = document.getElementById('king-finance-modal');
            var formEl = document.getElementById('king-finance-modal-form');
            var titleEl = document.getElementById('king-finance-modal-title');
            if (!modal || !formEl || !titleEl) return;
            var titles = { fluxo: 'Novo lançamento', trabalho: 'Novo trabalho', bem: 'Novo bem', cartao: 'Novo cartão', divida: 'Novo acordo', terceiro: 'Adicionar pessoa', contaPessoa: 'Nova conta' };
            var baseStyle = 'width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;';
            var fieldTpl = { fluxo: null, trabalho: '<input name="cliente" placeholder="Nome do cliente" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;"><input name="servico" placeholder="Qual serviço?" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;"><input name="valor" type="number" step="0.01" placeholder="Valor total R$" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;"><label style="font-size:0.8rem;color:var(--finance-text-secondary);margin:8px 0 4px 0;display:block;">Data do trabalho</label><input name="data" type="date" placeholder="Data do trabalho" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;"><label style="font-size:0.8rem;color:var(--finance-text-secondary);margin:8px 0 4px 0;display:block;">Data prevista para recebimento</label><input name="dataPrevista" type="date" placeholder="Data prevista" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;">', bem: null, cartao: '<input name="nome" placeholder="Nome do banco" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;"><input name="limite" type="number" step="0.01" placeholder="Limite total R$" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;"><input name="diaFechamento" type="number" min="1" max="31" placeholder="Dia do fechamento (1 a 31)" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;">', divida: '<input name="nome" placeholder="Credor (ex: Nubank)" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;"><input name="valorTotal" type="number" step="0.01" placeholder="Valor total dívida R$" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><input name="parcelas" type="number" placeholder="Nº parcelas" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;"><input name="valorParcela" type="number" step="0.01" placeholder="R$ parcela" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;"></div>', terceiro: '<input name="nome" placeholder="Nome da pessoa (ex: Samara, Rodrigo)" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;"><input name="dataInicio" type="text" placeholder="Data que comecei a dever (ex: 01/01/2025)" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;">', contaPessoa: null };
            window._kingFinanceEditTrabalho = function (id) {
                var db = window._kingFinanceDb || { trabalhos: [] };
                var t = (db.trabalhos || []).find(function (x) { return String(x.id) === String(id); });
                if (t) window._kingFinanceOpenModal('trabalho', t);
            };
            window._kingFinanceEditBem = function (id) {
                var db = window._kingFinanceDb || { bens: [] };
                var b = (db.bens || []).find(function (x) { return String(x.id) === String(id); });
                if (b) window._kingFinanceOpenModal('bem', b);
            };
            window._kingFinanceDarBaixaBem = function (id) {
                var db = window._kingFinanceDb || { bens: [] };
                var b = (db.bens || []).find(function (x) { return String(x.id) === String(id); });
                if (!b) return;
                b.devolvido = true;
                b.dataDevolucao = new Date().toISOString().slice(0, 10);
                window._kingFinanceDb = db;
                if (window._kingFinancePersist) window._kingFinancePersist(db);
                if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('bens');
            };
            window._kingFinanceReabrirBem = function (id) {
                var db = window._kingFinanceDb || { bens: [] };
                var b = (db.bens || []).find(function (x) { return String(x.id) === String(id); });
                if (!b) return;
                b.devolvido = false;
                delete b.dataDevolucao;
                window._kingFinanceDb = db;
                if (window._kingFinancePersist) window._kingFinancePersist(db);
                if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('bens');
            };
            window._kingFinanceBensTelaCheia = function (filtro) {
                var db = window._kingFinanceDb || { bens: [] };
                var list = db.bens || [];
                var emEmprestimo = list.filter(function (b) { return !b.devolvido; });
                var devolvidos = list.filter(function (b) { return !!b.devolvido; });
                var listToShow = (filtro === 'devolvidos') ? devolvidos : emEmprestimo;
                var fmt = function (v) { return (Number(v) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
                var fmtDataBem = function (d) { if (!d || d.length < 10) return ''; var p = d.slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
                var titulo = filtro === 'devolvidos' ? 'Devolvidos' : 'Em empréstimo';
                var html = listToShow.length === 0 ? '<p style="color:#64748b;text-align:center;padding:3rem;font-size:1.1rem;">Nenhum item nesta lista.</p>' : listToShow.map(function (b) {
                    var isDevolvido = !!b.devolvido;
                    var cardStyle = 'padding:24px;margin-bottom:20px;border-radius:20px;border:1px solid rgba(255,255,255,0.08);background:rgba(22,22,26,0.9);' + (isDevolvido ? 'opacity:0.85;' : '');
                    var fotoHtml = b.foto ? '<div style="width:120px;height:120px;margin-right:20px;flex-shrink:0;"><img src="' + (b.foto || '').replace(/"/g, '&quot;') + '" style="width:100%;height:100%;border-radius:16px;object-fit:cover;border:1px solid rgba(255,255,255,0.1);" alt=""></div>' : '';
                    var datasHtml = (b.dataEmprestimo || b.previsaoEntrega || b.dataDevolucao) ? '<p style="font-size:1rem;color:#94a3b8;margin:8px 0 0 0;">' + (b.dataEmprestimo ? 'Emprestada: ' + fmtDataBem(b.dataEmprestimo) : '') + (b.previsaoEntrega ? ' · Previsão: ' + fmtDataBem(b.previsaoEntrega) : '') + (b.dataDevolucao ? ' · Devolvida: ' + fmtDataBem(b.dataDevolucao) : '') + '</p>' : '';
                    var botoes = !isDevolvido ? '<button type="button" onclick="window._kingFinanceDarBaixaBem(\'' + b.id + '\'); document.getElementById(\'bens-telacheia-modal\') && document.getElementById(\'bens-telacheia-modal\').remove();" style="padding:10px 18px;background:rgba(34,197,94,0.25);border:1px solid rgba(34,197,94,0.5);border-radius:12px;color:#86efac;font-size:1rem;font-weight:700;cursor:pointer;"><i class="fas fa-check-circle" style="margin-right:6px;"></i>Dar baixa</button>' : '<button type="button" onclick="window._kingFinanceReabrirBem(\'' + b.id + '\'); document.getElementById(\'bens-telacheia-modal\') && document.getElementById(\'bens-telacheia-modal\').remove();" style="padding:10px 18px;background:rgba(168,85,247,0.25);border:1px solid rgba(168,85,247,0.5);border-radius:12px;color:#a78bfa;font-size:1rem;font-weight:700;cursor:pointer;"><i class="fas fa-redo" style="margin-right:6px;"></i>Reabrir</button>';
                    return '<div class="kf-card" style="' + cardStyle + 'display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap;"><div style="display:flex;align-items:flex-start;flex:1;min-width:0;">' + fotoHtml + '<div style="min-width:0;"><p style="font-size:1rem;font-weight:800;color:#a855f7;margin:0;">' + (isDevolvido ? 'Devolvida' : 'Em empréstimo') + '</p><h4 style="font-size:1.5rem;font-weight:800;margin:8px 0 6px 0;color:#f1f5f9;">' + (b.nome || '').replace(/</g, ' ') + '</h4><p style="font-size:1.2rem;font-weight:700;color:#e2e8f0;margin:4px 0;">Com: ' + (b.possuidor || '').replace(/</g, ' ') + '</p><p style="font-size:1.2rem;font-weight:700;color:#22c55e;margin:4px 0;">R$ ' + fmt(b.valorAluguel) + '/mês</p>' + datasHtml + '</div></div><div style="display:flex;gap:12px;flex-shrink:0;flex-wrap:wrap;">' + botoes + '<button type="button" onclick="window._kingFinanceEditBem(\'' + b.id + '\'); document.getElementById(\'bens-telacheia-modal\') && document.getElementById(\'bens-telacheia-modal\').remove();" style="padding:10px 18px;background:rgba(168,85,247,0.2);border:1px solid rgba(168,85,247,0.5);color:#a78bfa;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;"><i class="fas fa-pencil-alt" style="margin-right:6px;"></i>Editar</button></div></div>';
                }).join('');
                var existing = document.getElementById('bens-telacheia-modal');
                if (existing) existing.remove();
                var modal = document.createElement('div');
                modal.id = 'bens-telacheia-modal';
                modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);backdrop-filter:blur(12px);z-index:9999;display:flex;flex-direction:column;padding:24px;box-sizing:border-box;overflow:auto;';
                modal.innerHTML = '<div style="max-width:900px;width:100%;margin:0 auto;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:16px;"><h2 style="font-size:1.75rem;font-weight:800;color:#f1f5f9;margin:0;"><i class="fas fa-tools" style="color:#a855f7;margin-right:12px;"></i>' + titulo + ' (' + listToShow.length + ')</h2><button type="button" onclick="document.getElementById(\'bens-telacheia-modal\') && document.getElementById(\'bens-telacheia-modal\').remove()" style="padding:14px 24px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#f1f5f9;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;"><i class="fas fa-times" style="margin-right:8px;"></i>Fechar</button></div><div style="font-size:1.05rem;color:#94a3b8;margin-bottom:24px;">Visualização em tamanho grande. Use Dar baixa ou Reabrir conforme o caso.</div><div>' + html + '</div></div>';
                modal.onclick = function (e) { if (e.target === modal) modal.remove(); };
                document.body.appendChild(modal);
            };
            window._kingFinanceRemoverFotoBem = function (previewId) {
                var pid = previewId || 'bem-foto-preview';
                var p = document.getElementById(pid);
                if (p) { p.innerHTML = ''; var form = p.closest('form') || document.getElementById('king-finance-modal-form'); if (form) { var inp = form.querySelector('input[name="foto"]'); if (inp) inp.value = ''; } }
            };
            window._kingFinanceExpandFoto = function (el) {
                var img = el && (el.tagName === 'IMG' ? el : (el.querySelector && el.querySelector('img')));
                if (!img || !img.src) return;
                var o = document.createElement('div');
                o.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.95);display:flex;align-items:center;justify-content:center;padding:20px;cursor:pointer;';
                o.onclick = function () { o.remove(); };
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.innerHTML = '&times;';
                btn.style.cssText = 'position:absolute;top:16px;right:16px;width:48px;height:48px;border:none;background:rgba(255,255,255,0.15);color:#fff;font-size:28px;line-height:1;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:100000;transition:background 0.2s;';
                btn.onmouseover = function () { btn.style.background = 'rgba(255,255,255,0.25)'; };
                btn.onmouseout = function () { btn.style.background = 'rgba(255,255,255,0.15)'; };
                btn.onclick = function (e) { e.stopPropagation(); o.remove(); };
                o.appendChild(btn);
                var i = document.createElement('img');
                i.src = img.src;
                i.style.maxWidth = '100%'; i.style.maxHeight = '100%'; i.style.objectFit = 'contain'; i.style.borderRadius = '12px';
                i.onclick = function (e) { e.stopPropagation(); };
                o.appendChild(i);
                document.body.appendChild(o);
            };
            window._kingFinanceEditCartao = function (id) {
                var cards = window._kingFinanceCards || [];
                var c = cards.find(function (x) { return String(x.id) === String(id); });
                if (c) window._kingFinanceOpenModal('cartao', c);
            };
            window._kingFinanceDeleteCard = async function (cardId) {
                if (!confirm('Excluir este cartão? As despesas vinculadas a ele continuarão no fluxo, mas sem cartão associado.')) return;
                try {
                    var res = await fetch(env.API_URL + '/api/finance/cards/' + cardId, { method: 'DELETE', headers: env.HEADERS_AUTH });
                    if (!res.ok) throw new Error((await res.json().catch(function () { return {}; })).message || 'Erro ao excluir');
                    var cardRes = await fetch(env.API_URL + '/api/finance/cards', { headers: env.HEADERS_AUTH });
                    var cardJson = await cardRes.json().catch(function () { return {}; });
                    window._kingFinanceCards = (cardJson.data != null ? cardJson.data : cardJson) || [];
                    if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('cartoes');
                    if (document.getElementById('finance-king-content') && window.showKingFinancePane) window.showKingFinancePane();
                } catch (err) { alert(err.message || 'Erro ao excluir cartão.'); }
            };
            window._kingFinanceOpenMetaModal = function () {
                var d = document.createElement('div');
                d.id = 'king-finance-meta-modal-wrap';
                d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10003;display:flex;align-items:center;justify-content:center;padding:20px;';
                var today = new Date().toISOString().slice(0, 10);
                d.innerHTML = '<div style="background:var(--finance-card-dark,#16161a);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:24px;max-width:400px;width:100%;"><h3 style="margin:0 0 20px 0;color:#f1f5f9;font-size:1.25rem;">Nova meta</h3><form id="meta-form"><label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">Nome da meta</label><input type="text" name="name" placeholder="Ex: 1 milhão até meio do ano" required style="width:100%;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#fff;margin-bottom:12px;box-sizing:border-box;"><label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">Valor alvo (R$)</label><input type="number" name="target_value" step="0.01" min="0.01" placeholder="1000000" required style="width:100%;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#fff;margin-bottom:12px;box-sizing:border-box;"><label style="display:block;font-size:0.8rem;color:#94a3b8;margin-bottom:4px;">Data alvo</label><input type="date" name="target_date" value="' + today + '" required style="width:100%;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#fff;margin-bottom:20px;box-sizing:border-box;"><div style="display:flex;gap:12px;"><button type="submit" style="flex:1;padding:12px;background:#D4AF37;color:#000;border:none;border-radius:12px;font-weight:700;cursor:pointer;">Criar meta</button><button type="button" id="meta-modal-cancel" style="padding:12px 20px;background:rgba(255,255,255,0.1);color:#94a3b8;border:1px solid rgba(255,255,255,0.2);border-radius:12px;cursor:pointer;">Cancelar</button></div></form></div>';
                document.body.appendChild(d);
                d.querySelector('#meta-form').onsubmit = function (e) {
                    e.preventDefault();
                    var fd = new FormData(this);
                    var name = fd.get('name') || '';
                    var target_value = fd.get('target_value') || '0';
                    var target_date = fd.get('target_date') || '';
                    var profileId = localStorage.getItem('finance_current_profile_id') || null;
                    var body = { name: name.trim(), target_value: parseFloat(target_value), target_date: target_date };
                    if (profileId) body.profile_id = parseInt(profileId, 10);
                    fetch((typeof env.API_URL !== 'undefined' ? env.API_URL : '') + '/api/finance/goals', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, (typeof getAuthHeaders === 'function' ? env.getAuthHeaders() : (function(){ var t=localStorage.getItem('conectaKingToken')||''; var h={}; if(t) h.Authorization='Bearer '+t; return h; })())), body: JSON.stringify(body) })
                        .then(function (r) { return r.json(); })
                        .then(function (data) {
                            if (data.success !== false && !data.error) {
                                if (d.parentNode) d.parentNode.removeChild(d);
                                if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('meta');
                            } else { alert(data.message || data.error || 'Erro ao criar meta.'); }
                        })
                        .catch(function () { alert('Erro ao criar meta. Tente novamente.'); });
                };
                d.querySelector('#meta-modal-cancel').onclick = function () { if (d.parentNode) d.parentNode.removeChild(d); };
            };
            window._kingFinanceDeleteMeta = function (id) {
                fetch((typeof env.API_URL !== 'undefined' ? env.API_URL : '') + '/api/finance/goals/' + id, { method: 'DELETE', headers: typeof getAuthHeaders === 'function' ? env.getAuthHeaders() : (function(){ var t=localStorage.getItem('conectaKingToken')||''; var h={}; if(t) h.Authorization='Bearer '+t; return h; })() })
                    .then(function (r) { if (r.ok) { if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('meta'); } else { return r.json().then(function (d) { alert(d.message || 'Erro ao excluir.'); }); } })
                    .catch(function () { alert('Erro ao excluir meta.'); });
            };
            window._kingFinanceEditTerceiro = function (id) {
                var db = window._kingFinanceDb || { terceiros: [] };
                var p = (db.terceiros || []).find(function (x) { return String(x.id) === String(id); });
                if (p) window._kingFinanceOpenModal('terceiro', p);
            };
            window._kingFinanceEditContaTerceiro = function (pessoaId, contaId) {
                var db = window._kingFinanceDb || { terceiros: [] };
                var person = (db.terceiros || []).find(function (p) { return String(p.id) === String(pessoaId); });
                if (!person) return;
                var conta = (person.contas || []).find(function (c) { return String(c.id) === String(contaId); });
                if (conta) window._kingFinanceOpenModal('contaPessoa', { pessoaId: pessoaId, conta: conta });
            };
            window._kingFinanceOpenModal = function (modalType, pessoaIdOrEditItem) {
                if (modalType === 'contaPessoa') {
                    if (pessoaIdOrEditItem && typeof pessoaIdOrEditItem === 'object' && pessoaIdOrEditItem.pessoaId) {
                        window._kingFinancePessoaIdForConta = pessoaIdOrEditItem.pessoaId;
                        window._kingFinanceEditConta = pessoaIdOrEditItem.conta;
                    } else {
                        window._kingFinancePessoaIdForConta = pessoaIdOrEditItem;
                        window._kingFinanceEditConta = null;
                    }
                }
                window._kingFinanceEditItem = (modalType === 'trabalho' && pessoaIdOrEditItem && typeof pessoaIdOrEditItem === 'object' && pessoaIdOrEditItem.id) ? pessoaIdOrEditItem : (modalType === 'bem' && pessoaIdOrEditItem && typeof pessoaIdOrEditItem === 'object' && pessoaIdOrEditItem.id) ? pessoaIdOrEditItem : (modalType === 'cartao' && pessoaIdOrEditItem && typeof pessoaIdOrEditItem === 'object' && pessoaIdOrEditItem.id) ? pessoaIdOrEditItem : (modalType === 'terceiro' && pessoaIdOrEditItem && typeof pessoaIdOrEditItem === 'object' && pessoaIdOrEditItem.id) ? pessoaIdOrEditItem : null;
                var editTitles = { trabalho: 'Editar trabalho', bem: 'Editar ferramenta', cartao: 'Editar cartão', terceiro: 'Editar pessoa', contaPessoa: 'Editar conta' };
                titleEl.textContent = (window._kingFinanceEditItem ? (editTitles[modalType] || 'Editar') : (window._kingFinanceEditConta ? 'Editar conta' : titles[modalType])) || 'Novo';
                if (modalType === 'fluxo') {
                    var cards = window._kingFinanceCards || [];
                    var cardOpts = cards.map(function (c) { return '<option value="' + (c.id || '') + '">' + (c.name || 'Cartão').replace(/</g, ' ').slice(0, 30) + '</option>'; }).join('');
                    formEl.innerHTML = '<label style="font-size:0.8rem;color:var(--finance-text-secondary);margin-bottom:4px;">Tipo</label><select name="tipo" id="fluxo-tipo" style="' + baseStyle + '"><option value="despesa">Saída (despesa)</option><option value="receita">Entrada (receita)</option></select>' +
                        '<div id="fluxo-forma-wrap" style="display:none;"><label style="font-size:0.8rem;color:var(--finance-text-secondary);margin-bottom:4px;">Forma de pagamento</label><select name="forma" id="fluxo-forma" style="' + baseStyle + '"><option value="pix">PIX / Dinheiro / Conta</option><option value="cartao">Cartão de crédito</option></select>' +
                        '<div id="fluxo-cartao-wrap" style="display:none;margin-top:8px;"><label style="font-size:0.8rem;color:var(--finance-text-secondary);margin-bottom:4px;">Qual cartão?</label><select name="cartao_id" id="fluxo-cartao-id" style="' + baseStyle + '"><option value="">Selecione o cartão</option>' + cardOpts + '</select></div></div>' +
                        '<label style="font-size:0.8rem;color:var(--finance-text-secondary);margin-bottom:4px;">Descrição</label><input name="descricao" placeholder="Ex: Salário, Alimentação, Combustível" required style="' + baseStyle + '">' +
                        '<label style="font-size:0.8rem;color:var(--finance-text-secondary);margin-bottom:4px;">Valor R$</label><input name="valor" type="number" step="0.01" placeholder="0,00" required style="' + baseStyle + '">' +
                        '<label style="font-size:0.8rem;color:var(--finance-text-secondary);margin-bottom:4px;">Data</label><input name="data" type="date" required style="' + baseStyle + '">' +
                        '<button type="submit" style="width:100%;padding:14px;background:var(--finance-indigo,#3b82f6);color:#fff;border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;margin-top:8px;">Salvar</button>';
                    var tipoEl = document.getElementById('fluxo-tipo');
                    var formaWrap = document.getElementById('fluxo-forma-wrap');
                    var formaEl = document.getElementById('fluxo-forma');
                    var cartaoWrap = document.getElementById('fluxo-cartao-wrap');
                    if (tipoEl && formaWrap) tipoEl.onchange = function () { formaWrap.style.display = this.value === 'despesa' ? 'block' : 'none'; if (cartaoWrap) cartaoWrap.style.display = 'none'; };
                    if (formaEl && cartaoWrap) formaEl.onchange = function () { cartaoWrap.style.display = this.value === 'cartao' ? 'block' : 'none'; };
                } else if (modalType === 'bem') {
                    var bemHtml = '<input name="nome" placeholder="Ferramenta ou objeto emprestado" required style="' + baseStyle + '"><input name="possuidor" placeholder="Quem está com a ferramenta?" required style="' + baseStyle + '"><input name="valorAluguel" type="number" step="0.01" min="0" placeholder="Valor aluguel R$ (opcional)" style="' + baseStyle + '"><label style="font-size:0.8rem;color:var(--finance-text-secondary);margin:8px 0 4px 0;display:block;">Data que foi emprestada</label><input name="dataEmprestimo" type="date" style="' + baseStyle + '"><label style="font-size:0.8rem;color:var(--finance-text-secondary);margin:8px 0 4px 0;display:block;">Previsão para entrega</label><input name="previsaoEntrega" type="date" style="' + baseStyle + '"><div style="margin:12px 0;"><p style="font-size:0.8rem;color:var(--finance-text-secondary);margin:0 0 8px 0;">Foto (ferramenta ou pessoa)</p><div class="kf-bem-photo-row" style="display:flex;gap:8px;flex-wrap:wrap;"><button type="button" id="bem-btn-camera" style="padding:10px 16px;background:rgba(168,85,247,0.3);border:1px solid rgba(168,85,247,0.6);color:#a78bfa;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;"><i class="fas fa-camera" style="margin-right:6px;"></i>Tirar foto</button><button type="button" id="bem-btn-import" style="padding:10px 16px;background:rgba(168,85,247,0.3);border:1px solid rgba(168,85,247,0.6);color:#a78bfa;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;"><i class="fas fa-file-image" style="margin-right:6px;"></i>Importar foto</button><input type="file" id="bem-foto-camera" accept="image/*" capture="environment" style="display:none"><input type="file" id="bem-foto-import" accept="image/*" style="display:none"></div><input type="hidden" name="foto"><div id="bem-foto-preview" style="margin-top:10px;"></div></div>';
                    formEl.innerHTML = bemHtml + '<button type="submit" style="width:100%;padding:14px;background:var(--finance-indigo,#3b82f6);color:#fff;border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;margin-top:8px;">Salvar</button>';
                    var processBemFoto = function (file) { if (!file || !file.type.match(/^image\//)) return; var r = new FileReader(); r.onload = function () { var b64 = r.result; var inp = formEl.querySelector('input[name="foto"]'); if (inp) inp.value = b64; var prev = document.getElementById('bem-foto-preview'); if (prev) { prev.innerHTML = '<div style="position:relative;display:inline-block;"><img src="' + b64.replace(/"/g, '&quot;') + '" style="max-width:120px;max-height:120px;border-radius:12px;object-fit:cover;border:1px solid rgba(255,255,255,0.2);" alt="Preview"><button type="button" onclick="window._kingFinanceRemoverFotoBem && window._kingFinanceRemoverFotoBem(\'bem-foto-preview\')" style="position:absolute;top:-8px;right:-8px;width:28px;height:28px;border:none;background:rgba(239,68,68,0.9);color:#fff;font-size:18px;line-height:1;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);" title="Remover foto">&times;</button></div>'; } }; r.readAsDataURL(file); };
                    var camInp = document.getElementById('bem-foto-camera'); var impInp = document.getElementById('bem-foto-import'); var btnCam = document.getElementById('bem-btn-camera'); var btnImp = document.getElementById('bem-btn-import');
                    if (camInp && btnCam) btnCam.onclick = function () { camInp.value = ''; camInp.click(); };
                    if (impInp && btnImp) btnImp.onclick = function () { impInp.value = ''; impInp.click(); };
                    if (camInp) camInp.onchange = function () { if (this.files && this.files[0]) processBemFoto(this.files[0]); };
                    if (impInp) impInp.onchange = function () { if (this.files && this.files[0]) processBemFoto(this.files[0]); };
                    if (window._kingFinanceEditItem) {
                        var eb = window._kingFinanceEditItem;
                        var nomeB = formEl.querySelector('input[name="nome"]'); if (nomeB) nomeB.value = eb.nome || '';
                        var possB = formEl.querySelector('input[name="possuidor"]'); if (possB) possB.value = eb.possuidor || '';
                        var valB = formEl.querySelector('input[name="valorAluguel"]'); if (valB) valB.value = eb.valorAluguel != null ? String(eb.valorAluguel).replace('.', ',') : '';
                        var dataEmp = formEl.querySelector('input[name="dataEmprestimo"]'); if (dataEmp) dataEmp.value = eb.dataEmprestimo || '';
                        var prevEnt = formEl.querySelector('input[name="previsaoEntrega"]'); if (prevEnt) prevEnt.value = eb.previsaoEntrega || '';
                        var fotoInp = formEl.querySelector('input[name="foto"]'); if (fotoInp && eb.foto) { fotoInp.value = eb.foto; var prev = document.getElementById('bem-foto-preview'); if (prev) prev.innerHTML = '<div style="position:relative;display:inline-block;"><img src="' + (eb.foto || '').replace(/"/g, '&quot;') + '" style="max-width:120px;max-height:120px;border-radius:12px;object-fit:cover;border:1px solid rgba(255,255,255,0.2);" alt="Preview"><button type="button" onclick="window._kingFinanceRemoverFotoBem && window._kingFinanceRemoverFotoBem(\'bem-foto-preview\')" style="position:absolute;top:-8px;right:-8px;width:28px;height:28px;border:none;background:rgba(239,68,68,0.9);color:#fff;font-size:18px;line-height:1;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);" title="Remover foto">&times;</button></div>'; }
                    }
                } else if (modalType === 'contaPessoa') {
                    var today = new Date().toISOString().slice(0, 10);
                    var contaHtml = '<label style="font-size:0.8rem;color:var(--finance-text-secondary);margin-bottom:4px;">Nome da conta</label><input name="nomeConta" placeholder="Ex: Cartão X, Aluguel" required style="' + baseStyle + '">' +
                        '<label style="font-size:0.8rem;color:var(--finance-text-secondary);margin:8px 0 4px 0;display:block;">Valor R$ (total da negociação)</label><input name="valor" type="number" step="0.01" min="0.01" placeholder="0,00" required style="' + baseStyle + '">' +
                        '<label style="font-size:0.8rem;color:var(--finance-text-secondary);margin:8px 0 4px 0;display:block;">Data que adicionei</label><input name="dataAdicionada" type="date" style="' + baseStyle + '">' +
                        '<label style="font-size:0.8rem;color:var(--finance-text-secondary);margin:8px 0 4px 0;display:block;">Data do vencimento</label><input name="dataVencimento" type="date" style="' + baseStyle + '">' +
                        '<label style="font-size:0.8rem;color:var(--finance-text-secondary);margin:8px 0 4px 0;display:block;">Tipo de pagamento</label><div style="display:flex;gap:16px;margin-bottom:8px;"><label style="display:flex;align-items:center;gap:6px;cursor:pointer;color:#f1f5f9;"><input type="radio" name="tipoConta" value="unica" checked> nica vez</label><label style="display:flex;align-items:center;gap:6px;cursor:pointer;color:#f1f5f9;"><input type="radio" name="tipoConta" value="recorrente"> Recorrente (mensal)</label></div>' +
                        '<div id="conta-recorrente-wrap" style="display:none;"><label style="font-size:0.8rem;color:var(--finance-text-secondary);margin:8px 0 4px 0;display:block;">Quantos meses vai repetir?</label><input name="recorrenteMeses" type="number" min="2" max="120" placeholder="Ex: 12" style="' + baseStyle + '"></div>' +
                        '<div id="conta-aplicar-todas-wrap" style="display:none;"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#f1f5f9;margin:8px 0;font-size:0.9rem;"><input type="checkbox" name="aplicarTodasParcelas" id="aplicarTodasParcelas"> Aplicar este valor e nome a <strong>todas as parcelas</strong> do grupo</label></div>';
                    formEl.innerHTML = contaHtml + '<button type="submit" style="width:100%;padding:14px;background:var(--finance-indigo,#3b82f6);color:#fff;border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;margin-top:8px;">Salvar</button>';
                    var dataAdicionadaInp = formEl.querySelector('input[name="dataAdicionada"]'); if (dataAdicionadaInp) dataAdicionadaInp.value = today;
                    var tipoRadios = formEl.querySelectorAll('input[name="tipoConta"]'); var wrapRec = document.getElementById('conta-recorrente-wrap');
                    tipoRadios.forEach(function (r) { r.onchange = function () { if (wrapRec) wrapRec.style.display = formEl.querySelector('input[name="tipoConta"]:checked').value === 'recorrente' ? 'block' : 'none'; }; });
                    if (wrapRec) wrapRec.style.display = (formEl.querySelector('input[name="tipoConta"]:checked') || {}).value === 'recorrente' ? 'block' : 'none';
                    if (window._kingFinanceEditConta) {
                        var ecc = window._kingFinanceEditConta;
                        var nomeConta = formEl.querySelector('input[name="nomeConta"]'); if (nomeConta) nomeConta.value = ecc.nomeConta || '';
                        var valorConta = formEl.querySelector('input[name="valor"]'); if (valorConta) valorConta.value = ecc.valor != null ? String(ecc.valor).replace('.', ',') : '';
                        var dataAd = formEl.querySelector('input[name="dataAdicionada"]'); if (dataAd) dataAd.value = ecc.dataAdicionada || today;
                        var dataVen = formEl.querySelector('input[name="dataVencimento"]'); if (dataVen) dataVen.value = ecc.dataVencimento || '';
                        var tipoUnica = formEl.querySelector('input[name="tipoConta"][value="unica"]'); var tipoRec = formEl.querySelector('input[name="tipoConta"][value="recorrente"]');
                        if (ecc.tipo === 'recorrente' && tipoRec) { tipoRec.checked = true; if (tipoUnica) tipoUnica.checked = false; var mesesInp = formEl.querySelector('input[name="recorrenteMeses"]'); if (mesesInp) mesesInp.value = ecc.totalParcelas || ''; if (wrapRec) wrapRec.style.display = 'block'; } else if (tipoUnica) tipoUnica.checked = true;
                        var aplicarTodasWrap = document.getElementById('conta-aplicar-todas-wrap');
                        if (ecc.contaGrupoId && aplicarTodasWrap) aplicarTodasWrap.style.display = 'block';
                    }
                } else {
                    formEl.innerHTML = (fieldTpl[modalType] || '') + '<button type="submit" style="width:100%;padding:14px;background:var(--finance-indigo,#3b82f6);color:#fff;border:none;border-radius:12px;font-size:1rem;font-weight:700;cursor:pointer;margin-top:8px;">Salvar</button>';
                    if (modalType === 'trabalho' && window._kingFinanceEditItem) {
                        var ed = window._kingFinanceEditItem;
                        var clienteInp = formEl.querySelector('input[name="cliente"]'); if (clienteInp) clienteInp.value = ed.cliente || '';
                        var servicoInp = formEl.querySelector('input[name="servico"]'); if (servicoInp) servicoInp.value = ed.servico || '';
                        var valorInp = formEl.querySelector('input[name="valor"]'); if (valorInp) valorInp.value = ed.valor != null ? String(ed.valor).replace('.', ',') : '';
                        var dataInp = formEl.querySelector('input[name="data"]'); if (dataInp) dataInp.value = ed.data || '';
                        var dataPrevInp = formEl.querySelector('input[name="dataPrevista"]'); if (dataPrevInp) dataPrevInp.value = ed.dataPrevista || '';
                    }
                    if (modalType === 'cartao' && window._kingFinanceEditItem) {
                        var ec = window._kingFinanceEditItem;
                        var nomeC = formEl.querySelector('input[name="nome"]'); if (nomeC) nomeC.value = ec.name || ec.nome || '';
                        var limVal = ec.limit_amount != null ? ec.limit_amount : (ec.limite != null ? ec.limite : '');
                        var limC = formEl.querySelector('input[name="limite"]'); if (limC) limC.value = limVal !== '' && limVal != null ? String(limVal).replace(',', '.') : '';
                        var diaC = formEl.querySelector('input[name="diaFechamento"]'); if (diaC) diaC.value = ec.closing_day ?? ec.diaFechamento ?? '';
                    }
                    if (modalType === 'terceiro' && window._kingFinanceEditItem) {
                        var et = window._kingFinanceEditItem;
                        var nomeT = formEl.querySelector('input[name="nome"]'); if (nomeT) nomeT.value = et.nome || '';
                        var dataT = formEl.querySelector('input[name="dataInicio"]'); if (dataT) dataT.value = et.dataInicio || '';
                    }
                    if (modalType === 'contaPessoa' && window._kingFinanceEditConta) {
                        var ecc = window._kingFinanceEditConta;
                        var nomeConta = formEl.querySelector('input[name="nomeConta"]'); if (nomeConta) nomeConta.value = ecc.nomeConta || '';
                        var valorConta = formEl.querySelector('input[name="valor"]'); if (valorConta) valorConta.value = ecc.valor != null ? String(ecc.valor).replace('.', ',') : '';
                    }
                }
                window._kingFinanceModalType = modalType;
                modal.style.display = 'flex';
                formEl.onsubmit = async function (e) {
                    e.preventDefault();
                    var data = Object.fromEntries(new FormData(formEl));
                    var mType = window._kingFinanceModalType;
                    if (mType === 'fluxo') { var v = parseFloat(String(data.valor || '').replace(',', '.')); if (isNaN(v) || v <= 0) { alert('Informe um valor válido maior que zero.'); return; } }
                    if (mType === 'cartao') { var lim = parseFloat(String(data.limite || '').replace(',', '.')); if (isNaN(lim) || lim <= 0) { alert('Informe um limite válido maior que zero.'); return; } }
                    if (mType === 'trabalho') { v = parseFloat(String(data.valor || '').replace(',', '.')); if (isNaN(v) || v <= 0) { alert('Informe um valor válido maior que zero.'); return; } }
                    if (mType === 'bem') { v = parseFloat(String(data.valorAluguel || '0').replace(',', '.')); if (isNaN(v) || v < 0) { alert('Valor de aluguel deve ser zero ou positivo.'); return; } }
                    if (mType === 'divida') { v = parseFloat(String(data.valorTotal || '').replace(',', '.')); if (isNaN(v) || v <= 0) { alert('Informe o valor total da dívida (maior que zero).'); return; } }
                    if (mType === 'contaPessoa') { v = parseFloat(String(data.valor || '').replace(',', '.')); if (isNaN(v) || v <= 0) { alert('Informe o valor da conta (maior que zero).'); return; } var pid = window._kingFinancePessoaIdForConta; if (!pid) { alert('Selecione uma pessoa na aba Quem eu devo.'); return; } }
                    if (mType === 'fluxo') {
                        try {
                            var profileId = localStorage.getItem('finance_current_profile_id') || null;
                            var cardId = null;
                            if (data.tipo === 'despesa' && data.forma === 'cartao' && data.cartao_id) cardId = parseInt(data.cartao_id, 10) || null;
                            var bodyFluxo = { type: data.tipo === 'receita' ? 'INCOME' : 'EXPENSE', amount: parseFloat(data.valor) || 0, description: data.descricao || '', transaction_date: data.data || new Date().toISOString().slice(0, 10), profile_id: profileId ? parseInt(profileId, 10) : null };
                            if (cardId) bodyFluxo.card_id = cardId;
                            var res = await fetch(env.API_URL + '/api/finance/transactions', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, env.HEADERS_AUTH), body: JSON.stringify(bodyFluxo) });
                            if (!res.ok) throw new Error((await res.json().catch(function () { return {}; })).message || 'Erro ao criar');
                            window._kingFinanceTransactions = window._kingFinanceTransactions || [];
                            window._kingFinanceTransactions.push((await res.json()).data || {});
                            modal.style.display = 'none';
                            if (window.loadFinanceTransactions) await window.loadFinanceTransactions();
                            if (window._financeActiveTab === 'fluxo' && window.renderUnifiedKingTab) window.renderUnifiedKingTab('fluxo');
                        } catch (err) { alert(err.message || 'Erro ao salvar lançamento.'); }
                        return;
                    }
                    if (mType === 'cartao') {
                        try {
                            var editCard = window._kingFinanceEditItem;
                            var cardPayload = { name: data.nome || '', limit_amount: parseFloat(data.limite) || 0, closing_day: data.diaFechamento ? parseInt(data.diaFechamento, 10) : null };
                            if (editCard && editCard.id) {
                                var resPatch = await fetch(env.API_URL + '/api/finance/cards/' + editCard.id, { method: 'PATCH', headers: Object.assign({ 'Content-Type': 'application/json' }, env.HEADERS_AUTH), body: JSON.stringify(cardPayload) });
                                var patchJson = await resPatch.json().catch(function () { return {}; });
                                if (!resPatch.ok) throw new Error(patchJson.message || 'Erro ao atualizar');
                                var updated = patchJson.data || patchJson || {};
                                window._kingFinanceCards = (window._kingFinanceCards || []).map(function (c) { return String(c.id) === String(editCard.id) ? Object.assign({}, c, updated) : c; });
                                window._kingFinanceEditItem = null;
                            } else {
                                var res2 = await fetch(env.API_URL + '/api/finance/cards', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, env.HEADERS_AUTH), body: JSON.stringify(cardPayload) });
                                if (!res2.ok) throw new Error((await res2.json().catch(function () { return {}; })).message || 'Erro ao criar');
                                window._kingFinanceCards = window._kingFinanceCards || [];
                                window._kingFinanceCards.push((await res2.json()).data || {});
                            }
                            modal.style.display = 'none';
                            if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('cartoes');
                        } catch (err) { alert(err.message || 'Erro ao salvar cartão.'); }
                        return;
                    }
                    if (mType === 'contaPessoa') {
                        var db = window._kingFinanceDb || { terceiros: [] };
                        var pid = window._kingFinancePessoaIdForConta;
                        var person = (db.terceiros || []).find(function (p) { return p.id === pid; });
                        if (!person) { alert('Pessoa não encontrada.'); return; }
                        person.contas = person.contas || [];
                        var editConta = window._kingFinanceEditConta;
                        var dataAdicionada = (data.dataAdicionada || '').trim() || new Date().toISOString().slice(0, 10);
                        var dataVencimento = (data.dataVencimento || '').trim();
                        var tipoConta = (data.tipoConta || 'unica') === 'recorrente' ? 'recorrente' : 'unica';
                        var valorTotal = parseFloat(String(data.valor || '').replace(',', '.')) || 0;
                        var nomeBase = (data.nomeConta || '').trim() || 'Conta';
                        if (editConta && editConta.id) {
                            var aplicarATodas = (data.aplicarTodasParcelas === 'on' || data.aplicarTodasParcelas === true) && editConta.contaGrupoId;
                            if (aplicarATodas) {
                                var grupoId = editConta.contaGrupoId;
                                var totalParcelas = 0;
                                person.contas.forEach(function (c) { if (c.contaGrupoId === grupoId) totalParcelas++; });
                                var idx = 0;
                                person.contas.forEach(function (c, i) {
                                    if (c.contaGrupoId === grupoId) {
                                        idx++;
                                        var nomeParcela = totalParcelas > 1 ? (nomeBase.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim() || nomeBase) + ' (' + idx + '/' + totalParcelas + ')' : nomeBase;
                                        person.contas[i] = Object.assign({}, person.contas[i], { nomeConta: nomeParcela, valor: valorTotal, dataAdicionada: dataAdicionada, dataVencimento: c.dataVencimento || dataVencimento, tipo: c.tipo || tipoConta });
                                    }
                                });
                            } else {
                                var contaIdx = person.contas.findIndex(function (c) { return String(c.id) === String(editConta.id); });
                                if (contaIdx >= 0) {
                                    person.contas[contaIdx] = Object.assign({}, person.contas[contaIdx], { nomeConta: nomeBase, valor: valorTotal, dataAdicionada: dataAdicionada, dataVencimento: dataVencimento, tipo: tipoConta });
                                }
                            }
                            window._kingFinanceEditConta = null;
                        } else if (tipoConta === 'recorrente') {
                            var meses = Math.max(2, Math.min(120, parseInt(data.recorrenteMeses, 10) || 2));
                            var valorParcela = Math.round((valorTotal / meses) * 100) / 100;
                            var primeiroVenc = dataVencimento ? dataVencimento : dataAdicionada;
                            var grupoId = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 9);
                            for (var i = 0; i < meses; i++) {
                                var d = new Date(primeiroVenc + 'T12:00:00');
                                d.setMonth(d.getMonth() + i);
                                var vencStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                                var cid = grupoId + '-p' + (i + 1);
                                person.contas.push({ id: cid, nomeConta: nomeBase + ' (' + (i + 1) + '/' + meses + ')', valor: valorParcela, dataAdicionada: dataAdicionada, dataVencimento: vencStr, tipo: 'recorrente', parcela: i + 1, totalParcelas: meses, contaGrupoId: grupoId, pagamentos: [] });
                            }
                        } else {
                            var cid = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 9);
                            person.contas.push({ id: cid, nomeConta: nomeBase, valor: valorTotal, dataAdicionada: dataAdicionada, dataVencimento: dataVencimento || dataAdicionada, tipo: 'unica', pagamentos: [] });
                        }
                        window._kingFinanceDb = db;
                        if (window._kingFinancePersist) window._kingFinancePersist(db);
                        modal.style.display = 'none';
                        var _t = window._kingFinanceTerceirosTotals && window._kingFinanceTerceirosTotals(db.terceiros);
                        if (_t) {
                            window._kingFinanceStats = window._kingFinanceStats || {};
                            window._kingFinanceStats.totalTerceirosGeral = _t.totalGeral;
                            window._kingFinanceStats.totalFaltaPagarTerceiros = _t.totalFalta;
                            window._kingFinanceStats.scoreTerceirosPct = _t.scorePct > 0 && _t.scorePct < 1 ? Math.round(_t.scorePct * 10) / 10 : Math.round(_t.scorePct);
                            var elT1 = document.getElementById('finance-total-terceiros'); if (elT1) elT1.textContent = 'R$ ' + (_t.totalGeral || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                            var elT2 = document.getElementById('finance-score-terceiros'); if (elT2) elT2.textContent = (typeof window._kingFinanceStats.scoreTerceirosPct === 'number' && window._kingFinanceStats.scoreTerceirosPct > 0 && window._kingFinanceStats.scoreTerceirosPct < 1 ? window._kingFinanceStats.scoreTerceirosPct.toFixed(1).replace('.', ',') : Math.round(window._kingFinanceStats.scoreTerceirosPct || 0)) + '%';
                            var elT3 = document.getElementById('finance-falta-terceiros'); if (elT3) elT3.textContent = (_t.totalFalta || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                        }
                        if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('terceiros');
                        if (window.loadFinanceTransactions) window.loadFinanceTransactions();
                        return;
                    }
                    var db = window._kingFinanceDb || { fluxo: [], trabalhos: [], bens: [], cartoes: [], dividas: [], terceiros: [] };
                    var coll = { trabalho: 'trabalhos', bem: 'bens', divida: 'dividas', terceiro: 'terceiros' }[mType];
                    if (!coll) return;
                    var editItem = (mType === 'trabalho' || mType === 'bem' || mType === 'terceiro') ? window._kingFinanceEditItem : null;
                    var id, entry;
                    if (editItem && editItem.id) {
                        var idx = (db[coll] || []).findIndex(function (x) { return String(x.id) === String(editItem.id); });
                        if (idx >= 0) {
                            entry = db[coll][idx];
                            for (var k in data) entry[k] = data[k];
                            if (mType === 'trabalho') { entry.valor = parseFloat(data.valor) || 0; entry.data = data.data || ''; entry.dataPrevista = data.dataPrevista || ''; }
                            if (mType === 'bem') { entry.nome = data.nome || ''; entry.possuidor = data.possuidor || ''; entry.valorAluguel = parseFloat(data.valorAluguel) || 0; entry.dataEmprestimo = data.dataEmprestimo || ''; entry.previsaoEntrega = data.previsaoEntrega || ''; entry.foto = data.foto || ''; }
                            if (mType === 'terceiro') { entry.nome = data.nome || ''; entry.dataInicio = data.dataInicio || ''; }
                            window._kingFinanceEditItem = null;
                        } else { editItem = null; }
                    }
                    if (!editItem) {
                        id = Date.now().toString();
                        entry = { id: id };
                        for (var k in data) entry[k] = data[k];
                        if (mType === 'trabalho') { entry.valor = parseFloat(data.valor) || 0; entry.data = data.data || ''; entry.dataPrevista = data.dataPrevista || ''; entry.pagamentos = entry.pagamentos || []; }
                        if (mType === 'bem') { entry.valorAluguel = parseFloat(data.valorAluguel) || 0; entry.dataEmprestimo = data.dataEmprestimo || ''; entry.previsaoEntrega = data.previsaoEntrega || ''; entry.foto = data.foto || ''; }
                        if (mType === 'divida') { entry.valorTotal = parseFloat(data.valorTotal) || 0; entry.valorParcela = parseFloat(data.valorParcela) || 0; entry.parcelas = parseInt(data.parcelas, 10) || 0; entry.pagamentos = []; }
                        if (mType === 'terceiro') { entry.nome = data.nome || ''; entry.contas = []; entry.dataInicio = data.dataInicio || ''; delete entry.valorTotal; delete entry.limite; delete entry.pagamentos; }
                        db[coll] = db[coll] || [];
                        db[coll].unshift(entry);
                    }
                    window._kingFinanceDb = db;
                    if (window._kingFinancePersist) window._kingFinancePersist(db);
                    modal.style.display = 'none';
                    if (mType === 'divida') {
                        var divs = db.dividas || [];
                        window._kingFinanceStats = window._kingFinanceStats || {};
                        window._kingFinanceStats.totalDividas = divs.reduce(function (a, b) { var p = (b.pagamentos || []).reduce(function (ac, x) { return ac + (Number(x.valor) || 0); }, 0); return a + (Number(b.valorTotal) || 0) - p; }, 0);
                        var tdg = divs.reduce(function (a, b) { return a + (Number(b.valorTotal) || 0); }, 0);
                        var tpg = divs.reduce(function (a, b) { return a + (b.pagamentos || []).reduce(function (ac, p) { return ac + (Number(p.valor) || 0); }, 0); }, 0);
                        var rawPct = tdg > 0 ? (tpg / tdg) * 100 : 100; window._kingFinanceStats.scoreSerasaPct = rawPct > 0 && rawPct < 1 ? Math.round(rawPct * 10) / 10 : Math.round(rawPct);
                        window._kingFinanceStats.scoreSerasaLabel = window._kingFinanceStats.scoreSerasaPct >= 100 ? 'Em dia' : window._kingFinanceStats.scoreSerasaPct >= 50 ? 'Em acordo' : 'Quitando';
                        var el1 = document.getElementById('finance-total-dividas'); if (el1) el1.textContent = 'R$ ' + (Number(window._kingFinanceStats.totalDividas) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                        var el2 = document.getElementById('finance-score-serasa'); if (el2) { var _s = window._kingFinanceStats.scoreSerasaPct; el2.textContent = (typeof _s === 'number' && _s > 0 && _s < 1 ? _s.toFixed(1).replace('.', ',') : Math.round(_s || 0)) + '% · ' + (window._kingFinanceStats.scoreSerasaLabel || '-'); }
                    }
                    if (mType === 'terceiro') {
                        var _t = window._kingFinanceTerceirosTotals && window._kingFinanceTerceirosTotals(db.terceiros);
                        if (_t) {
                            window._kingFinanceStats = window._kingFinanceStats || {};
                            window._kingFinanceStats.totalTerceirosGeral = _t.totalGeral;
                            window._kingFinanceStats.totalFaltaPagarTerceiros = _t.totalFalta;
                            window._kingFinanceStats.scoreTerceirosPct = _t.scorePct > 0 && _t.scorePct < 1 ? Math.round(_t.scorePct * 10) / 10 : Math.round(_t.scorePct);
                            var elT1 = document.getElementById('finance-total-terceiros'); if (elT1) elT1.textContent = 'R$ ' + (_t.totalGeral || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                            var elT2 = document.getElementById('finance-score-terceiros'); if (elT2) elT2.textContent = (typeof window._kingFinanceStats.scoreTerceirosPct === 'number' && window._kingFinanceStats.scoreTerceirosPct > 0 && window._kingFinanceStats.scoreTerceirosPct < 1 ? window._kingFinanceStats.scoreTerceirosPct.toFixed(1).replace('.', ',') : Math.round(window._kingFinanceStats.scoreTerceirosPct || 0)) + '%';
                            var elT3 = document.getElementById('finance-falta-terceiros'); if (elT3) elT3.textContent = (_t.totalFalta || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                        }
                    }
                    if (window.renderUnifiedKingTab) window.renderUnifiedKingTab(window._financeActiveTab || 'fluxo');
                    if (window.loadFinanceTransactions) window.loadFinanceTransactions();
                };
            };
            window._kingFinanceDelete = window._kingFinanceDelete || function (collection, id) {
                var db = window._kingFinanceDb || { fluxo: [], trabalhos: [], bens: [], cartoes: [], dividas: [], terceiros: [] };
                if (!db[collection]) return;
                db[collection] = db[collection].filter(function (item) { return String(item.id) !== String(id); });
                window._kingFinanceDb = db;
                if (window._kingFinancePersist) window._kingFinancePersist(db);
                if (collection === 'dividas') {
                    var d = db.dividas || [];
                    window._kingFinanceStats = window._kingFinanceStats || {};
                    window._kingFinanceStats.totalDividas = d.reduce(function (a, b) { var p = (b.pagamentos || []).reduce(function (ac, x) { return ac + (Number(x.valor) || 0); }, 0); return a + (Number(b.valorTotal) || 0) - p; }, 0);
                    var tdg = d.reduce(function (a, b) { return a + (Number(b.valorTotal) || 0); }, 0);
                    var tpg = d.reduce(function (a, b) { return a + (b.pagamentos || []).reduce(function (ac, p) { return ac + (Number(p.valor) || 0); }, 0); }, 0);
                    var rawPct = tdg > 0 ? (tpg / tdg) * 100 : 100; window._kingFinanceStats.scoreSerasaPct = rawPct > 0 && rawPct < 1 ? Math.round(rawPct * 10) / 10 : Math.round(rawPct);
                    window._kingFinanceStats.scoreSerasaLabel = window._kingFinanceStats.scoreSerasaPct >= 100 ? 'Em dia' : window._kingFinanceStats.scoreSerasaPct >= 50 ? 'Em acordo' : 'Quitando';
                    var el1 = document.getElementById('finance-total-dividas'); if (el1) el1.textContent = 'R$ ' + (Number(window._kingFinanceStats.totalDividas) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                    var el2 = document.getElementById('finance-score-serasa'); if (el2) { var _s = window._kingFinanceStats.scoreSerasaPct; el2.textContent = (typeof _s === 'number' && _s > 0 && _s < 1 ? _s.toFixed(1).replace('.', ',') : Math.round(_s || 0)) + '% · ' + (window._kingFinanceStats.scoreSerasaLabel || '-'); }
                }
                if (collection === 'terceiros') {
                    var _t = window._kingFinanceTerceirosTotals && window._kingFinanceTerceirosTotals(db.terceiros);
                    if (_t) {
                        window._kingFinanceStats = window._kingFinanceStats || {};
                        window._kingFinanceStats.totalTerceirosGeral = _t.totalGeral;
                        window._kingFinanceStats.totalFaltaPagarTerceiros = _t.totalFalta;
                        window._kingFinanceStats.scoreTerceirosPct = _t.scorePct > 0 && _t.scorePct < 1 ? Math.round(_t.scorePct * 10) / 10 : Math.round(_t.scorePct);
                        var elT1 = document.getElementById('finance-total-terceiros'); if (elT1) elT1.textContent = 'R$ ' + (_t.totalGeral || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                        var elT2 = document.getElementById('finance-score-terceiros'); if (elT2) elT2.textContent = (typeof window._kingFinanceStats.scoreTerceirosPct === 'number' && window._kingFinanceStats.scoreTerceirosPct > 0 && window._kingFinanceStats.scoreTerceirosPct < 1 ? window._kingFinanceStats.scoreTerceirosPct.toFixed(1).replace('.', ',') : Math.round(window._kingFinanceStats.scoreTerceirosPct || 0)) + '%';
                        var elT3 = document.getElementById('finance-falta-terceiros'); if (elT3) elT3.textContent = (_t.totalFalta || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                    }
                }
                if (window.renderUnifiedKingTab) window.renderUnifiedKingTab(window._financeActiveTab || 'fluxo');
                if (window.loadFinanceTransactions) window.loadFinanceTransactions();
            };
            window._kingFinanceSerasaUpdateExcluirBtn = function () {
                var container = document.getElementById('finance-king-content');
                if (!container) return;
                var cbs = container.querySelectorAll('.serasa-acordo-cb:checked');
                var btn = document.getElementById('serasa-excluir-todos-btn');
                if (btn) { btn.disabled = cbs.length === 0; btn.textContent = cbs.length ? 'Excluir (' + cbs.length + ') selecionados' : 'Excluir selecionados'; }
            };
            window._kingFinanceSerasaSelectAll = function () {
                var container = document.getElementById('finance-king-content');
                if (!container) return;
                var all = container.querySelectorAll('.serasa-acordo-cb');
                var anyUnchecked = Array.prototype.some.call(all, function (cb) { return !cb.checked; });
                all.forEach(function (cb) { cb.checked = anyUnchecked; });
                window._kingFinanceSerasaUpdateExcluirBtn && window._kingFinanceSerasaUpdateExcluirBtn();
            };
            window._kingFinanceSerasaExcluirTodos = function () {
                var container = document.getElementById('finance-king-content');
                if (!container) return;
                var cbs = container.querySelectorAll('.serasa-acordo-cb:checked');
                var ids = Array.prototype.map.call(cbs, function (cb) { return cb.getAttribute('data-divida-id'); }).filter(Boolean);
                if (ids.length === 0) return;
                if (!confirm('Excluir ' + ids.length + ' acordo(s) selecionado(s)? Não é possível desfazer.')) return;
                ids.forEach(function (id) { window._kingFinanceDelete && window._kingFinanceDelete('dividas', id); });
                if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('serasa');
            };
            window._kingFinanceRegistrarPagamento = window._kingFinanceRegistrarPagamento || function (dividaId) {
                var now = new Date();
                var dataDefault = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                var horaDefault = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
                var overlay = document.createElement('div');
                overlay.id = 'serasa-abater-overlay';
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,10,12,0.9);z-index:10010;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);';
                overlay.innerHTML = '<div style="background:var(--finance-card-dark,#16161a);border:1px solid rgba(59,130,246,0.25);border-radius:20px;padding:28px;max-width:380px;width:100%;"><h3 style="color:var(--finance-text-primary);font-size:1.2rem;margin:0 0 20px 0;"><i class="fas fa-hand-holding-usd" style="color:#22c55e;margin-right:8px;"></i>Abater dinheiro</h3><form id="serasa-abater-form"><label style="display:block;color:var(--finance-text-secondary);font-size:0.85rem;margin-bottom:6px;">Valor R$</label><input type="number" id="serasa-abater-valor" step="0.01" min="0.01" required placeholder="0,00" style="width:100%;padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);color:#f1f5f9;font-size:1.1rem;margin-bottom:16px;"><label style="display:block;color:var(--finance-text-secondary);font-size:0.85rem;margin-bottom:6px;">Data do pagamento</label><input type="date" id="serasa-abater-data" required style="width:100%;padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);color:#f1f5f9;margin-bottom:16px;"><label style="display:block;color:var(--finance-text-secondary);font-size:0.85rem;margin-bottom:6px;">Horário</label><input type="time" id="serasa-abater-hora" style="width:100%;padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);color:#f1f5f9;margin-bottom:20px;"><div style="display:flex;gap:12px;"><button type="button" id="serasa-abater-cancel" style="flex:1;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:var(--finance-text-secondary);font-weight:600;cursor:pointer;">Cancelar</button><button type="submit" style="flex:1;padding:12px;border-radius:12px;border:none;background:#22c55e;color:#fff;font-weight:700;cursor:pointer;">Registrar</button></div></form></div>';
                document.body.appendChild(overlay);
                document.getElementById('serasa-abater-valor').value = '';
                document.getElementById('serasa-abater-data').value = dataDefault;
                document.getElementById('serasa-abater-hora').value = horaDefault;
                document.getElementById('serasa-abater-cancel').onclick = function () { overlay.remove(); };
                document.getElementById('serasa-abater-form').onsubmit = function (e) {
                    e.preventDefault();
                    var valor = parseFloat((document.getElementById('serasa-abater-valor').value || '').replace(',', '.').trim());
                    if (isNaN(valor) || valor <= 0) { alert('Informe um valor maior que zero.'); return false; }
                    var data = (document.getElementById('serasa-abater-data').value || dataDefault).trim();
                    var hora = (document.getElementById('serasa-abater-hora').value || horaDefault).trim();
                    overlay.remove();
                    var db = window._kingFinanceDb || { dividas: [] };
                    db.dividas = (db.dividas || []).map(function (d) { return d.id === dividaId ? Object.assign({}, d, { pagamentos: (d.pagamentos || []).concat([{ valor: valor, data: data, hora: hora }]) }) : d; });
                    window._kingFinanceDb = db;
                    if (window._kingFinancePersist) window._kingFinancePersist(db);
                    var divs = db.dividas || [];
                    window._kingFinanceStats = window._kingFinanceStats || {};
                    window._kingFinanceStats.totalDividas = divs.reduce(function (a, b) { var p = (b.pagamentos || []).reduce(function (ac, x) { return ac + (Number(x.valor) || 0); }, 0); return a + (Number(b.valorTotal) || 0) - p; }, 0);
                    var tdg = divs.reduce(function (a, b) { return a + (Number(b.valorTotal) || 0); }, 0);
                    var tpg = divs.reduce(function (a, b) { return a + (b.pagamentos || []).reduce(function (ac, p) { return ac + (Number(p.valor) || 0); }, 0); }, 0);
                    var rawPct = tdg > 0 ? (tpg / tdg) * 100 : 100; window._kingFinanceStats.scoreSerasaPct = rawPct > 0 && rawPct < 1 ? Math.round(rawPct * 10) / 10 : Math.round(rawPct);
                    window._kingFinanceStats.scoreSerasaLabel = window._kingFinanceStats.scoreSerasaPct >= 100 ? 'Em dia' : window._kingFinanceStats.scoreSerasaPct >= 50 ? 'Em acordo' : 'Quitando';
                    var el1 = document.getElementById('finance-total-dividas'); if (el1) el1.textContent = 'R$ ' + (Number(window._kingFinanceStats.totalDividas) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                    var el2 = document.getElementById('finance-score-serasa'); if (el2) { var _s = window._kingFinanceStats.scoreSerasaPct; el2.textContent = (typeof _s === 'number' && _s > 0 && _s < 1 ? _s.toFixed(1).replace('.', ',') : Math.round(_s || 0)) + '% · ' + (window._kingFinanceStats.scoreSerasaLabel || '-'); }
                    if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('serasa');
                    if (window.loadFinanceTransactions) window.loadFinanceTransactions();
                    return false;
                };
                overlay.addEventListener('click', function (ev) { if (ev.target === overlay) overlay.remove(); });
            };
            window._kingFinanceRegistrarPagamentoTerceiro = function (pessoaId, contaId) {
                window._kingFinanceRegistrarPagamentoTerceiroPid = pessoaId;
                window._kingFinanceRegistrarPagamentoTerceiroCid = contaId;
                var now = new Date();
                var dataDefault = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                var horaDefault = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
                var overlay = document.createElement('div');
                overlay.id = 'terceiros-abater-overlay';
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,10,12,0.9);z-index:10010;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);';
                overlay.innerHTML = '<div style="background:var(--finance-card-dark,#16161a);border:1px solid rgba(139,92,246,0.25);border-radius:20px;padding:28px;max-width:380px;width:100%;"><h3 style="color:var(--finance-text-primary);font-size:1.2rem;margin:0 0 20px 0;"><i class="fas fa-hand-holding-usd" style="color:#22c55e;margin-right:8px;"></i>Registrar pagamento (conta com pessoa)</h3><form id="terceiros-abater-form"><label style="display:block;color:var(--finance-text-secondary);font-size:0.85rem;margin-bottom:6px;">Valor R$</label><input type="number" id="terceiros-abater-valor" step="0.01" min="0.01" required placeholder="0,00" style="width:100%;padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);color:#f1f5f9;font-size:1.1rem;margin-bottom:16px;"><label style="display:block;color:var(--finance-text-secondary);font-size:0.85rem;margin-bottom:6px;">Data do pagamento</label><input type="date" id="terceiros-abater-data" required style="width:100%;padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);color:#f1f5f9;margin-bottom:16px;"><label style="display:block;color:var(--finance-text-secondary);font-size:0.85rem;margin-bottom:6px;">Horário</label><input type="time" id="terceiros-abater-hora" style="width:100%;padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);color:#f1f5f9;margin-bottom:20px;"><div style="display:flex;gap:12px;"><button type="button" id="terceiros-abater-cancel" style="flex:1;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:var(--finance-text-secondary);font-weight:600;cursor:pointer;">Cancelar</button><button type="submit" style="flex:1;padding:12px;border-radius:12px;border:none;background:#22c55e;color:#fff;font-weight:700;cursor:pointer;">Registrar</button></div></form></div>';
                document.body.appendChild(overlay);
                document.getElementById('terceiros-abater-valor').value = '';
                document.getElementById('terceiros-abater-data').value = dataDefault;
                document.getElementById('terceiros-abater-hora').value = horaDefault;
                document.getElementById('terceiros-abater-cancel').onclick = function () { overlay.remove(); };
                document.getElementById('terceiros-abater-form').onsubmit = function (e) {
                    e.preventDefault();
                    var valor = parseFloat((document.getElementById('terceiros-abater-valor').value || '').replace(',', '.').trim());
                    if (isNaN(valor) || valor <= 0) { alert('Informe um valor maior que zero.'); return false; }
                    var data = (document.getElementById('terceiros-abater-data').value || dataDefault).trim();
                    var hora = (document.getElementById('terceiros-abater-hora').value || horaDefault).trim();
                    overlay.remove();
                    var db = window._kingFinanceDb || { terceiros: [] };
                    var pid = window._kingFinanceRegistrarPagamentoTerceiroPid;
                    var cid = window._kingFinanceRegistrarPagamentoTerceiroCid;
                    if (!pid || !cid) return false;
                    db.terceiros = (db.terceiros || []).map(function (t) {
                        if (t.id !== pid) return t;
                        var contas = (t.contas || []).map(function (c) {
                            if (c.id !== cid) return c;
                            return Object.assign({}, c, { pagamentos: (c.pagamentos || []).concat([{ valor: valor, data: data, hora: hora }]) });
                        });
                        return Object.assign({}, t, { contas: contas });
                    });
                    window._kingFinanceDb = db;
                    if (window._kingFinancePersist) window._kingFinancePersist(db);
                    var _t = window._kingFinanceTerceirosTotals && window._kingFinanceTerceirosTotals(db.terceiros);
                    if (_t) {
                        window._kingFinanceStats = window._kingFinanceStats || {};
                        window._kingFinanceStats.totalTerceirosGeral = _t.totalGeral;
                        window._kingFinanceStats.totalFaltaPagarTerceiros = _t.totalFalta;
                        window._kingFinanceStats.scoreTerceirosPct = _t.scorePct > 0 && _t.scorePct < 1 ? Math.round(_t.scorePct * 10) / 10 : Math.round(_t.scorePct);
                        var elT1 = document.getElementById('finance-total-terceiros'); if (elT1) elT1.textContent = 'R$ ' + (_t.totalGeral || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                        var elT2 = document.getElementById('finance-score-terceiros'); if (elT2) elT2.textContent = (typeof window._kingFinanceStats.scoreTerceirosPct === 'number' && window._kingFinanceStats.scoreTerceirosPct > 0 && window._kingFinanceStats.scoreTerceirosPct < 1 ? window._kingFinanceStats.scoreTerceirosPct.toFixed(1).replace('.', ',') : Math.round(window._kingFinanceStats.scoreTerceirosPct || 0)) + '%';
                        var elT3 = document.getElementById('finance-falta-terceiros'); if (elT3) elT3.textContent = (_t.totalFalta || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                    }
                    if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('terceiros');
                    if (window.loadFinanceTransactions) window.loadFinanceTransactions();
                    return false;
                };
                overlay.addEventListener('click', function (ev) { if (ev.target === overlay) overlay.remove(); });
            };
            window._kingFinanceExcluirPagamentoTerceiro = function (pessoaId, contaId, paymentIndex) {
                if (!confirm('Remover este pagamento da lista? O valor voltará a constar como "falta pagar".')) return;
                var db = window._kingFinanceDb || { terceiros: [] };
                var person = (db.terceiros || []).find(function (p) { return String(p.id) === String(pessoaId); });
                if (!person || !person.contas) return;
                var conta = person.contas.find(function (c) { return String(c.id) === String(contaId); });
                if (!conta || !Array.isArray(conta.pagamentos)) return;
                var idx = parseInt(paymentIndex, 10);
                if (isNaN(idx) || idx < 0 || idx >= conta.pagamentos.length) return;
                conta.pagamentos = conta.pagamentos.filter(function (_, i) { return i !== idx; });
                window._kingFinanceDb = db;
                if (window._kingFinancePersist) window._kingFinancePersist(db);
                var _t = window._kingFinanceTerceirosTotals && window._kingFinanceTerceirosTotals(db.terceiros);
                if (_t) {
                    window._kingFinanceStats = window._kingFinanceStats || {};
                    window._kingFinanceStats.totalTerceirosGeral = _t.totalGeral;
                    window._kingFinanceStats.totalFaltaPagarTerceiros = _t.totalFalta;
                    window._kingFinanceStats.scoreTerceirosPct = _t.scorePct > 0 && _t.scorePct < 1 ? Math.round(_t.scorePct * 10) / 10 : Math.round(_t.scorePct);
                    var elT1 = document.getElementById('finance-total-terceiros'); if (elT1) elT1.textContent = 'R$ ' + (_t.totalGeral || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                    var elT2 = document.getElementById('finance-score-terceiros'); if (elT2) elT2.textContent = (typeof window._kingFinanceStats.scoreTerceirosPct === 'number' && window._kingFinanceStats.scoreTerceirosPct > 0 && window._kingFinanceStats.scoreTerceirosPct < 1 ? window._kingFinanceStats.scoreTerceirosPct.toFixed(1).replace('.', ',') : Math.round(window._kingFinanceStats.scoreTerceirosPct || 0)) + '%';
                    var elT3 = document.getElementById('finance-falta-terceiros'); if (elT3) elT3.textContent = (_t.totalFalta || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                }
                if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('terceiros');
                if (window.loadFinanceTransactions) window.loadFinanceTransactions();
            };
            window._kingFinanceEditarPagamentoTerceiro = function (pessoaId, contaId, paymentIndex) {
                var db = window._kingFinanceDb || { terceiros: [] };
                var person = (db.terceiros || []).find(function (p) { return String(p.id) === String(pessoaId); });
                if (!person || !person.contas) return;
                var conta = person.contas.find(function (c) { return String(c.id) === String(contaId); });
                if (!conta || !Array.isArray(conta.pagamentos)) return;
                var idx = parseInt(paymentIndex, 10);
                if (isNaN(idx) || idx < 0 || idx >= conta.pagamentos.length) return;
                var p = conta.pagamentos[idx];
                var dataDefault = (p.data || '').trim() || new Date().toISOString().slice(0, 10);
                var horaDefault = (p.hora || '').trim() || '00:00';
                var overlay = document.createElement('div');
                overlay.id = 'terceiros-editar-pagamento-overlay';
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,10,12,0.9);z-index:10010;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);';
                overlay.innerHTML = '<div style="background:var(--finance-card-dark,#16161a);border:1px solid rgba(139,92,246,0.25);border-radius:20px;padding:28px;max-width:380px;width:100%;"><h3 style="color:var(--finance-text-primary);font-size:1.2rem;margin:0 0 20px 0;"><i class="fas fa-pencil-alt" style="color:#a78bfa;margin-right:8px;"></i>Editar pagamento</h3><form id="terceiros-editar-pagamento-form"><label style="display:block;color:var(--finance-text-secondary);font-size:0.85rem;margin-bottom:6px;">Valor R$</label><input type="number" id="terceiros-editar-valor" step="0.01" min="0.01" required placeholder="0,00" style="width:100%;padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);color:#f1f5f9;font-size:1.1rem;margin-bottom:16px;"><label style="display:block;color:var(--finance-text-secondary);font-size:0.85rem;margin-bottom:6px;">Data do pagamento</label><input type="date" id="terceiros-editar-data" required style="width:100%;padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);color:#f1f5f9;margin-bottom:16px;"><label style="display:block;color:var(--finance-text-secondary);font-size:0.85rem;margin-bottom:6px;">Horário</label><input type="time" id="terceiros-editar-hora" style="width:100%;padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);color:#f1f5f9;margin-bottom:20px;"><div style="display:flex;gap:12px;"><button type="button" id="terceiros-editar-cancel" style="flex:1;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:var(--finance-text-secondary);font-weight:600;cursor:pointer;">Cancelar</button><button type="submit" style="flex:1;padding:12px;border-radius:12px;border:none;background:#8b5cf6;color:#fff;font-weight:700;cursor:pointer;">Salvar</button></div></form></div>';
                document.body.appendChild(overlay);
                document.getElementById('terceiros-editar-valor').value = Number(p.valor) || 0;
                document.getElementById('terceiros-editar-data').value = dataDefault;
                document.getElementById('terceiros-editar-hora').value = horaDefault;
                document.getElementById('terceiros-editar-cancel').onclick = function () { overlay.remove(); };
                document.getElementById('terceiros-editar-pagamento-form').onsubmit = function (e) {
                    e.preventDefault();
                    var valor = parseFloat((document.getElementById('terceiros-editar-valor').value || '').replace(',', '.').trim());
                    if (isNaN(valor) || valor <= 0) { alert('Informe um valor maior que zero.'); return false; }
                    var data = (document.getElementById('terceiros-editar-data').value || dataDefault).trim();
                    var hora = (document.getElementById('terceiros-editar-hora').value || horaDefault).trim();
                    overlay.remove();
                    conta.pagamentos[idx] = { valor: valor, data: data, hora: hora };
                    window._kingFinanceDb = db;
                    if (window._kingFinancePersist) window._kingFinancePersist(db);
                    var _t = window._kingFinanceTerceirosTotals && window._kingFinanceTerceirosTotals(db.terceiros);
                    if (_t) {
                        window._kingFinanceStats = window._kingFinanceStats || {};
                        window._kingFinanceStats.totalTerceirosGeral = _t.totalGeral;
                        window._kingFinanceStats.totalFaltaPagarTerceiros = _t.totalFalta;
                        window._kingFinanceStats.scoreTerceirosPct = _t.scorePct > 0 && _t.scorePct < 1 ? Math.round(_t.scorePct * 10) / 10 : Math.round(_t.scorePct);
                        var elT1 = document.getElementById('finance-total-terceiros'); if (elT1) elT1.textContent = 'R$ ' + (_t.totalGeral || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                        var elT2 = document.getElementById('finance-score-terceiros'); if (elT2) elT2.textContent = (typeof window._kingFinanceStats.scoreTerceirosPct === 'number' && window._kingFinanceStats.scoreTerceirosPct > 0 && window._kingFinanceStats.scoreTerceirosPct < 1 ? window._kingFinanceStats.scoreTerceirosPct.toFixed(1).replace('.', ',') : Math.round(window._kingFinanceStats.scoreTerceirosPct || 0)) + '%';
                        var elT3 = document.getElementById('finance-falta-terceiros'); if (elT3) elT3.textContent = (_t.totalFalta || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                    }
                    if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('terceiros');
                    if (window.loadFinanceTransactions) window.loadFinanceTransactions();
                    return false;
                };
                overlay.addEventListener('click', function (ev) { if (ev.target === overlay) overlay.remove(); });
            };
            window._kingFinanceRegistrarEntradaTrabalho = function (trabalhoId) {
                var now = new Date();
                var dataDefault = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                var horaDefault = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
                var overlay = document.createElement('div');
                overlay.id = 'trabalho-entrada-overlay';
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,10,12,0.9);z-index:10010;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);';
                overlay.innerHTML = '<div style="background:var(--finance-card-dark,#16161a);border:1px solid rgba(59,130,246,0.25);border-radius:20px;padding:28px;max-width:380px;width:100%;"><h3 style="color:var(--finance-text-primary);font-size:1.2rem;margin:0 0 20px 0;"><i class="fas fa-hand-holding-usd" style="color:#22c55e;margin-right:8px;"></i>Registrar entrada</h3><form id="trabalho-entrada-form"><label style="display:block;color:var(--finance-text-secondary);font-size:0.85rem;margin-bottom:6px;">Valor R$</label><input type="number" id="trabalho-entrada-valor" step="0.01" min="0.01" required placeholder="0,00" style="width:100%;padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);color:#f1f5f9;font-size:1.1rem;margin-bottom:16px;"><label style="display:block;color:var(--finance-text-secondary);font-size:0.85rem;margin-bottom:6px;">Data</label><input type="date" id="trabalho-entrada-data" required style="width:100%;padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);color:#f1f5f9;margin-bottom:16px;"><label style="display:block;color:var(--finance-text-secondary);font-size:0.85rem;margin-bottom:6px;">Horário</label><input type="time" id="trabalho-entrada-hora" style="width:100%;padding:14px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.3);color:#f1f5f9;margin-bottom:20px;"><div style="display:flex;gap:12px;"><button type="button" id="trabalho-entrada-cancel" style="flex:1;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:var(--finance-text-secondary);font-weight:600;cursor:pointer;">Cancelar</button><button type="submit" style="flex:1;padding:12px;border-radius:12px;border:none;background:#22c55e;color:#fff;font-weight:700;cursor:pointer;">Registrar</button></div></form></div>';
                document.body.appendChild(overlay);
                document.getElementById('trabalho-entrada-valor').value = '';
                document.getElementById('trabalho-entrada-data').value = dataDefault;
                document.getElementById('trabalho-entrada-hora').value = horaDefault;
                document.getElementById('trabalho-entrada-cancel').onclick = function () { overlay.remove(); };
                document.getElementById('trabalho-entrada-form').onsubmit = function (e) {
                    e.preventDefault();
                    var valor = parseFloat((document.getElementById('trabalho-entrada-valor').value || '').replace(',', '.').trim());
                    if (isNaN(valor) || valor <= 0) { alert('Informe um valor maior que zero.'); return false; }
                    var data = (document.getElementById('trabalho-entrada-data').value || dataDefault).trim();
                    var hora = (document.getElementById('trabalho-entrada-hora').value || horaDefault).trim();
                    overlay.remove();
                    var db = window._kingFinanceDb || { trabalhos: [] };
                    db.trabalhos = (db.trabalhos || []).map(function (t) {
                        if (String(t.id) !== String(trabalhoId)) return t;
                        var pagamentos = t.pagamentos || [];
                        pagamentos = pagamentos.concat([{ valor: valor, data: data, hora: hora }]);
                        return Object.assign({}, t, { pagamentos: pagamentos });
                    });
                    window._kingFinanceDb = db;
                    if (window._kingFinancePersist) window._kingFinancePersist(db);
                    if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('trabalhos');
                    if (window.loadFinanceTransactions) window.loadFinanceTransactions();
                    return false;
                };
                overlay.addEventListener('click', function (ev) { if (ev.target === overlay) overlay.remove(); });
            };
            window._kingFinanceDeleteContaTerceiro = function (pessoaId, contaId) {
                var db = window._kingFinanceDb || { terceiros: [] };
                var person = (db.terceiros || []).find(function (p) { return p.id === pessoaId; });
                if (!person) return;
                person.contas = (person.contas || []).filter(function (c) { return c.id !== contaId; });
                window._kingFinanceDb = db;
                if (window._kingFinancePersist) window._kingFinancePersist(db);
                var _t = window._kingFinanceTerceirosTotals && window._kingFinanceTerceirosTotals(db.terceiros);
                if (_t) {
                    window._kingFinanceStats = window._kingFinanceStats || {};
                    window._kingFinanceStats.totalTerceirosGeral = _t.totalGeral;
                    window._kingFinanceStats.totalFaltaPagarTerceiros = _t.totalFalta;
                    window._kingFinanceStats.scoreTerceirosPct = _t.scorePct > 0 && _t.scorePct < 1 ? Math.round(_t.scorePct * 10) / 10 : Math.round(_t.scorePct);
                    var elT1 = document.getElementById('finance-total-terceiros'); if (elT1) elT1.textContent = 'R$ ' + (_t.totalGeral || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                    var elT2 = document.getElementById('finance-score-terceiros'); if (elT2) elT2.textContent = (typeof window._kingFinanceStats.scoreTerceirosPct === 'number' && window._kingFinanceStats.scoreTerceirosPct > 0 && window._kingFinanceStats.scoreTerceirosPct < 1 ? window._kingFinanceStats.scoreTerceirosPct.toFixed(1).replace('.', ',') : Math.round(window._kingFinanceStats.scoreTerceirosPct || 0)) + '%';
                    var elT3 = document.getElementById('finance-falta-terceiros'); if (elT3) elT3.textContent = (_t.totalFalta || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                }
                if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('terceiros');
            };
            window._kingFinanceImportarTerceirosImagem = window._kingFinanceImportarTerceirosImagem || function () {
                var overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
                overlay.id = 'terceiros-import-overlay';
                var fmt = function (v) { return Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
                overlay.innerHTML = '<div id="terceiros-import-modal-box" style="background:var(--finance-card-dark,#16161a);border:1px solid rgba(139,92,246,0.25);border-radius:20px;padding:28px;max-width:min(960px,95vw);width:100%;max-height:90vh;overflow:auto;"><h3 style="color:var(--finance-text-primary);font-size:1.2rem;margin:0 0 8px 0;"><i class="fas fa-image" style="color:#8b5cf6;margin-right:8px;"></i>Importar imagem (contas com pessoas)</h3><p style="color:var(--finance-text-secondary);font-size:0.8rem;margin:0 0 12px 0;">Envie até 50 imagens (JPEG/PNG) com valores e nomes (ex.: foto de um recibo ou tela com dívida). Serão criadas contas com o nome e valor reconhecidos. O mesmo endpoint do Serasa é usado para ler as imagens.</p><div id="terceiros-import-image-wrap"><input type="file" id="terceiros-import-files" accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple style="margin-bottom:16px;color:#94a3b8;"></div><div id="terceiros-import-preview" style="display:none;margin-bottom:16px;"></div><div style="display:flex;gap:10px;justify-content:flex-end;"><button type="button" id="terceiros-import-cancel" style="padding:10px 18px;border-radius:12px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:#94a3b8;font-weight:700;cursor:pointer;">Cancelar</button><button type="button" id="terceiros-import-confirm" style="display:none;padding:10px 18px;border-radius:12px;border:none;background:#8b5cf6;color:#fff;font-weight:700;cursor:pointer;">Confirmar e adicionar contas</button></div></div>';
                document.body.appendChild(overlay);
                var filesEl = document.getElementById('terceiros-import-files');
                var previewEl = document.getElementById('terceiros-import-preview');
                var confirmBtn = document.getElementById('terceiros-import-confirm');
                var importedOffers = [];
                document.getElementById('terceiros-import-cancel').onclick = function () { overlay.remove(); };
                if (filesEl) filesEl.onchange = function () {
                    var f = filesEl.files;
                    if (!f || f.length === 0) return;
                    var maxFiles = 50;
                    if (f.length > maxFiles) { alert('Máximo ' + maxFiles + ' imagens por vez. Foram enviadas as primeiras ' + maxFiles + '.'); f = Array.prototype.slice.call(f, 0, maxFiles); }
                    previewEl.style.display = 'block';
                    previewEl.innerHTML = '<p style="color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Lendo ' + f.length + ' imagem(ns)... Pode levar alguns minutos.</p>';
                    var formData = new FormData();
                    for (var i = 0; i < f.length; i++) formData.append('files', f[i]);
                    var abortImg = new AbortController();
                    var timeoutImg = setTimeout(function () { abortImg.abort(); }, 300000);
                    fetch(env.API_URL + '/api/finance/serasa/import-image-preview', { method: 'POST', headers: env.HEADERS_AUTH || {}, body: formData, signal: abortImg.signal }).then(function (res) {
                        clearTimeout(timeoutImg); return res.json().catch(function () { return {}; }).then(function (json) {
                            if (!res.ok) { previewEl.innerHTML = '<p style="color:#f43f5e;">' + (json.message || (res.status === 500 ? 'Erro interno. Tente menos imagens (até 50) ou em lotes de 15-20.' : 'Erro ao processar imagens.')) + '</p>'; return; }
                            importedOffers = (json.data && json.data.offers) ? json.data.offers : [];
                            if (importedOffers.length === 0) { previewEl.innerHTML = '<p style="color:#f59e0b;">Nenhum dado reconhecido. Envie imagens com nome e valor (JPEG/PNG).</p>'; confirmBtn.style.display = 'none'; return; }
                            var tbl = '<p style="font-size:0.75rem;color:#94a3b8;margin-bottom:8px;">' + f.length + ' ficheiro(s) · ' + importedOffers.length + ' conta(s) reconhecida(s). Serão adicionadas como contas com pessoas (nome + valor).</p><div style="max-height:320px;overflow:auto;"><table style="width:100%;font-size:0.8rem;border-collapse:collapse;"><thead><tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left;padding:8px;color:#94a3b8;">Nome (pessoa/credor)</th><th style="text-align:right;padding:8px;color:#94a3b8;">Valor total</th></tr></thead><tbody>';
                            importedOffers.forEach(function (o) { tbl += '<tr style="border-bottom:1px solid rgba(255,255,255,0.06);"><td style="padding:8px;">' + (o.nome || '-').replace(/</g, ' ') + '</td><td style="text-align:right;padding:8px;">R$ ' + fmt(o.valorTotal) + '</td></tr>'; });
                            tbl += '</tbody></table></div>';
                            previewEl.innerHTML = tbl;
                            confirmBtn.style.display = 'inline-block';
                        });
                    }).catch(function (e) { clearTimeout(timeoutImg); previewEl.innerHTML = '<p style="color:#f43f5e;">' + (e.name === 'AbortError' ? 'Demorou muito. Envie menos imagens (ex.: 15-20 por vez).' : 'Erro de conexão.') + '</p>'; });
                };
                confirmBtn.onclick = function () {
                    if (importedOffers.length === 0) return;
                    var db = window._kingFinanceDb || { terceiros: [] };
                    db.terceiros = db.terceiros || [];
                    function norm(s) { return (s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
                    var criados = 0;
                    var atualizados = 0;
                    importedOffers.forEach(function (o) {
                        var nomeNorm = norm(o.nome);
                        var valorTotal = Number(o.valorTotal) || 0;
                        var found = db.terceiros.find(function (t) { return norm(t.nome) === nomeNorm; });
                        if (found) {
                            found.contas = found.contas || [];
                            found.contas.push({ id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 9), nomeConta: 'Conta importada', valor: valorTotal, pagamentos: [] });
                            if (o.dataDivida) found.dataInicio = o.dataDivida;
                            atualizados++;
                        } else {
                            db.terceiros.push({ id: Date.now().toString() + '-' + Math.random().toString(36).slice(2, 9), nome: (o.nome || 'Pessoa').trim(), contas: [{ id: Date.now().toString() + '-c1', nomeConta: 'Conta principal', valor: valorTotal, pagamentos: [] }], dataInicio: o.dataDivida || '' });
                            criados++;
                        }
                    });
                    window._kingFinanceDb = db;
                    if (window._kingFinancePersist) window._kingFinancePersist(db);
                    var _t = window._kingFinanceTerceirosTotals && window._kingFinanceTerceirosTotals(db.terceiros);
                    if (_t) {
                        window._kingFinanceStats = window._kingFinanceStats || {};
                        window._kingFinanceStats.totalTerceirosGeral = _t.totalGeral;
                        window._kingFinanceStats.totalFaltaPagarTerceiros = _t.totalFalta;
                        window._kingFinanceStats.scoreTerceirosPct = _t.scorePct > 0 && _t.scorePct < 1 ? Math.round(_t.scorePct * 10) / 10 : Math.round(_t.scorePct);
                        var elT1 = document.getElementById('finance-total-terceiros'); if (elT1) elT1.textContent = 'R$ ' + (_t.totalGeral || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                        var elT2 = document.getElementById('finance-score-terceiros'); if (elT2) elT2.textContent = (typeof window._kingFinanceStats.scoreTerceirosPct === 'number' && window._kingFinanceStats.scoreTerceirosPct > 0 && window._kingFinanceStats.scoreTerceirosPct < 1 ? window._kingFinanceStats.scoreTerceirosPct.toFixed(1).replace('.', ',') : Math.round(window._kingFinanceStats.scoreTerceirosPct || 0)) + '%';
                        var elT3 = document.getElementById('finance-falta-terceiros'); if (elT3) elT3.textContent = (_t.totalFalta || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                    }
                    overlay.remove();
                    if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('terceiros');
                    if (window.loadFinanceTransactions) window.loadFinanceTransactions();
                    alert((criados ? criados + ' pessoa(s) adicionada(s). ' : '') + (atualizados ? atualizados + ' conta(s) adicionada(s) a pessoa existente.' : '') || 'Pronto.');
                };
                overlay.addEventListener('click', function (ev) { if (ev.target === overlay) overlay.remove(); });
            };
            window._kingFinanceEditarValorDivida = window._kingFinanceEditarValorDivida || function (dividaId) {
                var db = window._kingFinanceDb || { dividas: [] };
                var d = (db.dividas || []).find(function (x) { return x.id === dividaId; });
                if (!d) return;
                var valorAtual = Number(d.valorTotal) || 0;
                var novoValorStr = prompt('Alterar valor total da dívida (R$)', valorAtual.toFixed(2).replace('.', ','));
                if (novoValorStr == null || novoValorStr.trim() === '') return;
                var novoValor = parseFloat(novoValorStr.replace(',', '.').trim());
                if (isNaN(novoValor) || novoValor < 0) { alert('Valor inválido.'); return; }
                db.dividas = (db.dividas || []).map(function (x) { return x.id === dividaId ? Object.assign({}, x, { valorTotal: novoValor }) : x; });
                window._kingFinanceDb = db;
                if (window._kingFinancePersist) window._kingFinancePersist(db);
                var divs = db.dividas || [];
                window._kingFinanceStats = window._kingFinanceStats || {};
                window._kingFinanceStats.totalDividas = divs.reduce(function (a, b) { var p = (b.pagamentos || []).reduce(function (ac, x) { return ac + (Number(x.valor) || 0); }, 0); return a + (Number(b.valorTotal) || 0) - p; }, 0);
                var tdg = divs.reduce(function (a, b) { return a + (Number(b.valorTotal) || 0); }, 0);
                var tpg = divs.reduce(function (a, b) { return a + (b.pagamentos || []).reduce(function (ac, p) { return ac + (Number(p.valor) || 0); }, 0); }, 0);
                var rawPct = tdg > 0 ? (tpg / tdg) * 100 : 100; window._kingFinanceStats.scoreSerasaPct = rawPct > 0 && rawPct < 1 ? Math.round(rawPct * 10) / 10 : Math.round(rawPct);
                window._kingFinanceStats.scoreSerasaLabel = window._kingFinanceStats.scoreSerasaPct >= 100 ? 'Em dia' : window._kingFinanceStats.scoreSerasaPct >= 50 ? 'Em acordo' : 'Quitando';
                var el1 = document.getElementById('finance-total-dividas'); if (el1) el1.textContent = 'R$ ' + (Number(window._kingFinanceStats.totalDividas) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                var el2 = document.getElementById('finance-score-serasa'); if (el2) { var _s = window._kingFinanceStats.scoreSerasaPct; el2.textContent = (typeof _s === 'number' && _s > 0 && _s < 1 ? _s.toFixed(1).replace('.', ',') : Math.round(_s || 0)) + '% · ' + (window._kingFinanceStats.scoreSerasaLabel || '-'); }
                if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('serasa');
            };
            window._kingFinanceImportarSerasaPdf = function (mode) {
                mode = (mode === 'image') ? 'image' : 'pdf';
                var overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
                overlay.id = 'serasa-import-overlay';
                var fmt = function (v) { return Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
                var isPdf = mode === 'pdf';
                var titulo = isPdf ? 'Importar PDF (valores)' : 'Importar imagem';
                var descricao = isPdf
                    ? 'Envie o relatório PDF. <strong>Só serão atualizados os valores de negociação</strong> (valor original, valor atual, total) nos acordos que já existem - pelo nome do credor. Nada mais é alterado e nenhum acordo novo é criado.'
                    : 'Envie até 50 imagens (JPEG/PNG) da tela &quot;Detalhes da dívida&quot;. <strong>Importação completa:</strong> credores existentes serão atualizados; novos serão adicionados. Muitas imagens podem demorar alguns minutos.';
                var fileSection = isPdf
                    ? '<div id="serasa-import-pdf-wrap"><input type="file" id="serasa-import-file" accept=".pdf,application/pdf" style="margin-bottom:16px;color:#94a3b8;"></div>'
                    : '<div id="serasa-import-image-wrap"><input type="file" id="serasa-import-files" accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple style="margin-bottom:16px;color:#94a3b8;"></div>';
                overlay.innerHTML = '<div id="serasa-import-modal-box" style="background:var(--finance-card-dark,#16161a);border:1px solid rgba(99,102,241,0.25);border-radius:20px;padding:28px;max-width:min(960px,95vw);width:100%;max-height:90vh;overflow:auto;"><h3 style="color:var(--finance-text-primary);font-size:1.2rem;margin:0 0 8px 0;"><i class="fas fa-file-import" style="color:#6366f1;margin-right:8px;"></i>' + titulo + '</h3><p style="color:var(--finance-text-secondary);font-size:0.8rem;margin:0 0 12px 0;">' + descricao + '</p>' + fileSection + '<div id="serasa-import-preview" style="display:none;margin-bottom:16px;"></div><div style="display:flex;gap:10px;justify-content:flex-end;"><button type="button" id="serasa-import-cancel" style="padding:10px 18px;border-radius:12px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:#94a3b8;font-weight:700;cursor:pointer;">Cancelar</button><button type="button" id="serasa-import-confirm" style="display:none;padding:10px 18px;border-radius:12px;border:none;background:var(--finance-indigo,#6366f1);color:#fff;font-weight:700;cursor:pointer;">Confirmar importação</button></div></div>';
                document.body.appendChild(overlay);
                var fileEl = document.getElementById('serasa-import-file');
                var filesEl = document.getElementById('serasa-import-files');
                var previewEl = document.getElementById('serasa-import-preview');
                var confirmBtn = document.getElementById('serasa-import-confirm');
                var importedOffers = [];
                var importMode = mode;
                var filesCountForImport = 0;
                document.getElementById('serasa-import-cancel').onclick = function () { overlay.remove(); };
                function doPdfUpload(file) {
                    previewEl.style.display = 'block';
                    previewEl.innerHTML = '<p style="color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Lendo PDF...</p>';
                    var formData = new FormData();
                    formData.append('file', file);
                    fetch(env.API_URL + '/api/finance/serasa/import-preview', { method: 'POST', headers: env.HEADERS_AUTH || {}, body: formData }).then(function (res) {
                        return res.json().catch(function () { return {}; }).then(function (json) {
                            if (!res.ok) { previewEl.innerHTML = '<p style="color:#f43f5e;">' + (json.message || 'Erro ao processar PDF.') + '</p>'; return; }
                            importedOffers = (json.data && json.data.offers) ? json.data.offers : [];
                            if (importedOffers.length === 0) { previewEl.innerHTML = '<p style="color:#f59e0b;">Nenhuma oferta reconhecida. Verifique se é o relatório &quot;Suas ofertas na Serasa&quot;.</p>'; confirmBtn.style.display = 'none'; return; }
                            var tbl = '<p style="font-size:0.75rem;color:#94a3b8;margin-bottom:8px;">' + importedOffers.length + ' oferta(s). Serão atualizados <strong>apenas os valores</strong> nos acordos existentes (pelo nome do credor). Acordos que não existirem na sua lista serão ignorados.</p><div style="max-height:260px;overflow:auto;"><table style="width:100%;font-size:0.8rem;border-collapse:collapse;"><thead><tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left;padding:8px;color:#94a3b8;">Credor</th><th style="text-align:right;padding:8px;color:#94a3b8;">Valor</th><th style="text-align:right;padding:8px;color:#94a3b8;">Desconto</th></tr></thead><tbody>';
                            importedOffers.forEach(function (o) { tbl += '<tr style="border-bottom:1px solid rgba(255,255,255,0.06);"><td style="padding:8px;">' + (o.nome || '-').replace(/</g, ' ') + '</td><td style="text-align:right;padding:8px;">R$ ' + fmt(o.valorTotal) + '</td><td style="text-align:right;padding:8px;">' + (o.percentualDesconto != null ? o.percentualDesconto + '%' : '-') + '</td></tr>'; });
                            tbl += '</tbody></table></div>';
                            previewEl.innerHTML = tbl;
                            confirmBtn.style.display = 'inline-block';
                        });
                    }).catch(function (e) { previewEl.innerHTML = '<p style="color:#f43f5e;">Erro de conexão. Tente novamente.</p>'; });
                }
                function doImageUpload(files) {
                    if (!files || files.length === 0) return;
                    var maxFiles = 50;
                    if (files.length > maxFiles) {
                        alert('M\u00e1ximo ' + maxFiles + ' imagens por vez. Foram enviadas as primeiras ' + maxFiles + '.');
                        files = Array.prototype.slice.call(files, 0, maxFiles);
                    }
                    filesCountForImport = files.length;
                    previewEl.style.display = 'block';
                    previewEl.innerHTML = '<p style="color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Lendo ' + files.length + ' imagem(ns) (OCR)... Pode levar alguns minutos.</p>';
                    var formData = new FormData();
                    for (var i = 0; i < files.length; i++) formData.append('files', files[i]);
                    var abortImg = new AbortController();
                    var timeoutImg = setTimeout(function () { abortImg.abort(); }, 300000);
                    fetch(env.API_URL + '/api/finance/serasa/import-image-preview', { method: 'POST', headers: env.HEADERS_AUTH || {}, body: formData, signal: abortImg.signal }).then(function (res) {
                        clearTimeout(timeoutImg); return res.json().catch(function () { return {}; }).then(function (json) {
                            if (!res.ok) { previewEl.innerHTML = '<p style="color:#f43f5e;">' + (json.message || (res.status === 500 ? 'Erro interno do servidor. Tente menos imagens (at\u00e9 50) ou envie em lotes de 15\u201320.' : 'Erro ao processar imagens.')) + '</p>'; return; }
                            importedOffers = (json.data && json.data.offers) ? json.data.offers : [];
                            if (importedOffers.length === 0) { previewEl.innerHTML = '<p style="color:#f59e0b;">Nenhum detalhe reconhecido. Envie prints da tela &quot;Detalhes da dívida&quot; (JPEG/PNG).</p>'; confirmBtn.style.display = 'none'; return; }
                            var hasDetail = importedOffers.some(function (o) { return o.numeroContrato || o.produtoServico || o.dataDivida != null; });
                            var tblText = importMode === 'image' ? 'Importa\u00e7\u00e3o completa: existentes ser\u00e3o atualizados (sem duplicar); novos credores ser\u00e3o adicionados.' : 'Serão atualizados apenas valor original, atual e total nos acordos existentes (pelo credor).';
                            var tbl = '<p style="font-size:0.75rem;color:#94a3b8;margin-bottom:8px;">' + filesCountForImport + ' ficheiro(s) enviado(s) \u00b7 ' + importedOffers.length + ' oferta(s) lidas. ' + tblText + '</p><div style="max-height:320px;overflow:auto;"><div style="overflow-x:auto;min-width:0;"><table style="width:100%;min-width:720px;font-size:0.75rem;border-collapse:collapse;table-layout:auto;"><thead><tr style="border-bottom:1px solid rgba(255,255,255,0.1);"><th style="text-align:left;padding:6px 10px;color:#94a3b8;white-space:nowrap;">Credor</th><th style="padding:6px 10px;color:#94a3b8;white-space:nowrap;">Raz\u00e3o social</th><th style="padding:6px 10px;color:#94a3b8;white-space:nowrap;">Empresa origem</th><th style="padding:6px 10px;color:#94a3b8;white-space:nowrap;">Produto / Servi\u00e7o</th><th style="padding:6px 10px;color:#94a3b8;">Contrato</th><th style="padding:6px 10px;color:#94a3b8;">Data</th><th style="text-align:right;padding:6px 10px;color:#94a3b8;">Orig.</th><th style="text-align:right;padding:6px 10px;color:#94a3b8;">Atual</th><th style="text-align:right;padding:6px 10px;color:#94a3b8;">Total neg.</th></tr></thead><tbody>';
                            importedOffers.forEach(function (o) { var ps = (o.produtoServico || '-').replace(/</g, ' '); var razao = (o.razaoSocial || '-').replace(/</g, ' '); var emp = (o.empresaOrigem || '-').replace(/</g, ' '); var nome = (o.nome || '-').replace(/</g, ' '); tbl += '<tr style="border-bottom:1px solid rgba(255,255,255,0.06);"><td style="padding:6px 10px;max-width:180px;word-break:break-word;">' + nome + '</td><td style="padding:6px 10px;max-width:160px;word-break:break-word;">' + razao + '</td><td style="padding:6px 10px;max-width:140px;word-break:break-word;">' + emp + '</td><td style="padding:6px 10px;max-width:200px;word-break:break-word;">' + ps + '</td><td style="padding:6px 10px;">' + (o.numeroContrato || '-') + '</td><td style="padding:6px 10px;">' + (o.dataDivida || '-') + '</td><td style="text-align:right;padding:6px 10px;">R$ ' + fmt(o.valorOriginal) + '</td><td style="text-align:right;padding:6px 10px;">R$ ' + fmt(o.valorAtual) + '</td><td style="text-align:right;padding:6px 10px;">R$ ' + fmt(o.valorTotal) + '</td></tr>'; });
                            tbl += '</tbody></table></div></div>';
                            previewEl.innerHTML = tbl;
                            confirmBtn.style.display = 'inline-block';
                        });
                    }).catch(function (e) { clearTimeout(timeoutImg); previewEl.innerHTML = '<p style="color:#f43f5e;">' + (e.name === 'AbortError' ? 'Demorou muito. Envie menos imagens (ex.: 15\u201320 por vez) e tente novamente.' : 'Erro de conexão. Tente novamente.') + '</p>'; });
                }
                if (fileEl) fileEl.onchange = function () { var f = fileEl.files && fileEl.files[0]; if (f) doPdfUpload(f); };
                if (filesEl) filesEl.onchange = function () { var f = filesEl.files; if (f && f.length) doImageUpload(f); };
                confirmBtn.onclick = function () {
                    if (importedOffers.length === 0) return;
                    var db = window._kingFinanceDb || { dividas: [] };
                    db.dividas = db.dividas || [];
                    var existing = db.dividas;
                    var atualizados = 0;
                    var ignorados = 0;
                    var criados = 0;
                    var updatedIdsThisBatch = {};
                    if (importMode === 'pdf') {
                        var usedByIndex = {};
                        importedOffers.forEach(function (o, idx) {
                            var nomeNorm = (o.nome || '').trim().toLowerCase();
                            var found = existing.find(function (d) { return (d.nome || '').trim().toLowerCase() === nomeNorm; });
                            if (!found && existing[idx] != null && !usedByIndex[idx]) {
                                found = existing[idx];
                                usedByIndex[idx] = true;
                            }
                            if (!found && o.valorOriginal != null) {
                                var vo = Number(o.valorOriginal);
                                found = existing.find(function (d) {
                                    var dv = Number(d.valorOriginal) || Number(d.valorTotal) || 0;
                                    return Math.abs(dv - vo) < 0.02 || Math.abs(dv - vo) / (vo || 1) < 0.001;
                                });
                            }
                            if (found) {
                                if (o.valorTotal != null) found.valorTotal = Number(o.valorTotal) || 0;
                                if (o.valorOriginal != null) found.valorOriginal = o.valorOriginal;
                                if (o.valorAtual != null) found.valorAtual = o.valorAtual;
                                atualizados++;
                            } else { ignorados++; }
                        });
                    } else {
                        function norm(s) { return (s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
                        function normNum(v) { return String(v || '').trim().replace(/\D/g, ''); }
                        function normDate(dt) { var s = (dt || '').trim().replace(/\s+/g, ''); if (!s) return ''; var m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/); if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0'); var m2 = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/); if (m2) return m2[1] + '-' + m2[2].padStart(2, '0') + '-' + m2[3].padStart(2, '0'); return s; }
                        function valsIguais(a, b, tol) { var va = Number(a) || 0; var vb = Number(b) || 0; if (va === 0 && vb === 0) return true; return Math.abs(va - vb) < (tol || 0.02); }
                        function ehMesmaDivida(o, d) {
                            var cO = normNum(o.numeroContrato); var cD = normNum(d.numeroContrato);
                            if (cO && cO.length >= 4) { if (cO !== cD) return false; }
                            else if (cD && cD.length >= 4) return false;
                            var dtO = normDate(o.dataDivida); var dtD = normDate(d.dataDivida);
                            if (dtO && dtD && dtO !== dtD) return false;
                            if (!valsIguais(o.valorOriginal, d.valorOriginal) && (Number(o.valorOriginal) || Number(d.valorOriginal))) return false;
                            if (!valsIguais(o.valorTotal, d.valorTotal) && (Number(o.valorTotal) || Number(d.valorTotal))) return false;
                            return true;
                        }
                        importedOffers.forEach(function (o) {
                            var found = existing.find(function (d) { return ehMesmaDivida(o, d); });
                            var payload = { id: 'd' + Date.now() + '-' + Math.random().toString(36).slice(2, 9), nome: o.nome || 'Credor', valorTotal: Number(o.valorTotal) || 0, pagamentos: [] };
                            if (o.numeroContrato) payload.numeroContrato = o.numeroContrato;
                            if (o.produtoServico) payload.produtoServico = o.produtoServico;
                            if (o.dataDivida) payload.dataDivida = o.dataDivida;
                            if (o.empresaOrigem) payload.empresaOrigem = o.empresaOrigem;
                            if (o.razaoSocial) payload.razaoSocial = o.razaoSocial;
                            if (o.valorOriginal != null) payload.valorOriginal = o.valorOriginal;
                            if (o.valorAtual != null) payload.valorAtual = o.valorAtual;
                            if (o.tipo) payload.tipo = o.tipo;
                            if (found) {
                                found.valorTotal = Number(o.valorTotal) || 0;
                                if (o.nome) found.nome = o.nome;
                                if (o.numeroContrato) found.numeroContrato = o.numeroContrato;
                                if (o.produtoServico) found.produtoServico = o.produtoServico;
                                if (o.dataDivida) found.dataDivida = o.dataDivida;
                                if (o.empresaOrigem) found.empresaOrigem = o.empresaOrigem;
                                if (o.razaoSocial) found.razaoSocial = o.razaoSocial;
                                if (o.valorOriginal != null) found.valorOriginal = o.valorOriginal;
                                if (o.valorAtual != null) found.valorAtual = o.valorAtual;
                                if (o.tipo) found.tipo = o.tipo;
                                if (!updatedIdsThisBatch[found.id]) { updatedIdsThisBatch[found.id] = true; atualizados++; }
                            } else {
                                db.dividas.push(payload);
                                criados++;
                            }
                        });
                    }
                    window._kingFinanceDb = db;
                    if (window._kingFinancePersist) window._kingFinancePersist(db);
                    var divs = db.dividas || [];
                    window._kingFinanceStats = window._kingFinanceStats || {};
                    window._kingFinanceStats.totalDividas = divs.reduce(function (a, b) { var p = (b.pagamentos || []).reduce(function (ac, x) { return ac + (Number(x.valor) || 0); }, 0); return a + (Number(b.valorTotal) || 0) - p; }, 0);
                    var tdg = divs.reduce(function (a, b) { return a + (Number(b.valorTotal) || 0); }, 0);
                    var tpg = divs.reduce(function (a, b) { return a + (b.pagamentos || []).reduce(function (ac, p) { return ac + (Number(p.valor) || 0); }, 0); }, 0);
                    var rawPct = tdg > 0 ? (tpg / tdg) * 100 : 100; window._kingFinanceStats.scoreSerasaPct = rawPct > 0 && rawPct < 1 ? Math.round(rawPct * 10) / 10 : Math.round(rawPct);
                    window._kingFinanceStats.scoreSerasaLabel = window._kingFinanceStats.scoreSerasaPct >= 100 ? 'Em dia' : window._kingFinanceStats.scoreSerasaPct >= 50 ? 'Em acordo' : 'Quitando';
                    var el1 = document.getElementById('finance-total-dividas'); if (el1) el1.textContent = 'R$ ' + (Number(window._kingFinanceStats.totalDividas) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                    var el2 = document.getElementById('finance-score-serasa'); if (el2) { var _s = window._kingFinanceStats.scoreSerasaPct; el2.textContent = (typeof _s === 'number' && _s > 0 && _s < 1 ? _s.toFixed(1).replace('.', ',') : Math.round(_s || 0)) + '% · ' + (window._kingFinanceStats.scoreSerasaLabel || '-'); }
                    overlay.remove();
                    if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('serasa');
                    if (window.loadFinanceTransactions) window.loadFinanceTransactions(); else if (typeof renderTab === 'function') renderTab('serasa');
                    var msg;
                    if (importMode === 'pdf') {
                        msg = atualizados + ' acordo(s) com valores atualizados.';
                        if (ignorados > 0) msg += ' ' + ignorados + ' oferta(s) sem acordo correspondente (ignoradas).';
                    } else {
                        var utilizados = atualizados + criados;
                        var duplicadosIgnorados = Math.max(0, importedOffers.length - utilizados);
                        msg = 'Conseguiu importar e ler tudo certinho.\n\n';
                        msg += 'Ficheiros enviados: ' + (filesCountForImport || importedOffers.length) + '\n';
                        msg += 'Importados com sucesso: ' + utilizados + ' (atualizados: ' + atualizados + ', novos: ' + criados + ').';
                        if (duplicadosIgnorados > 0) msg += '\nDuplicados nesta importação (ignorados): ' + duplicadosIgnorados;
                    }
                    alert(msg);
                };
            };
            window._kingFinanceVerDetalhesDivida = function (dividaId) {
                var existing = document.getElementById('serasa-detalhes-overlay');
                if (existing) existing.remove();
                var db = window._kingFinanceDb || { dividas: [] };
                var d = (db.dividas || []).find(function (x) { return x.id === dividaId; });
                if (!d) return;
                var fmt = function (v) { return Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
                var pago = (d.pagamentos || []).reduce(function (a, p) { return a + (Number(p.valor) || 0); }, 0);
                var restante = (Number(d.valorTotal) || 0) - pago;
                var formatPayDate = function (p) { var dt = p.data || ''; if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) { var pt = dt.split('-'); dt = pt[2] + '/' + pt[1] + '/' + pt[0]; } return dt + (p.hora ? ' \u00e0s ' + p.hora : ''); };
                var overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;';
                overlay.id = 'serasa-detalhes-overlay';
                overlay.innerHTML = '<div style="background:var(--finance-card-dark,#16161a);border:1px solid rgba(99,102,241,0.3);border-radius:20px;padding:24px;max-width:560px;width:100%;max-height:90vh;overflow:auto;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h3 style="color:#a5b4fc;font-size:1.1rem;margin:0;">Detalhes da d\u00edvida</h3><button type="button" id="serasa-detalhes-fechar" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:1.2rem;">&times;</button></div><div id="serasa-detalhes-body"></div><div style="margin-top:16px;"><label style="display:block;font-size:0.75rem;color:#94a3b8;margin-bottom:4px;">Contato do banco</label><input type="text" id="serasa-detalhes-contato" placeholder="Telefone, e-mail ou link" style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.3);color:#f1f5f9;font-size:12px;"></div><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px;"><button type="button" id="serasa-detalhes-atualizar-img" style="padding:10px 16px;background:rgba(99,102,241,0.25);color:#a5b4fc;border:1px solid rgba(99,102,241,0.5);border-radius:12px;font-size:11px;font-weight:700;cursor:pointer;"><i class="fas fa-image" style="margin-right:6px;"></i>Atualizar com imagem</button><button type="button" id="serasa-detalhes-fechar2" style="padding:10px 16px;background:rgba(255,255,255,0.1);color:#94a3b8;border:1px solid rgba(255,255,255,0.2);border-radius:12px;font-size:11px;font-weight:700;cursor:pointer;">Fechar</button></div><input type="file" id="serasa-detalhes-file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" style="display:none;"></div>';
                document.body.appendChild(overlay);
                var bodyEl = document.getElementById('serasa-detalhes-body');
                var contatoEl = document.getElementById('serasa-detalhes-contato');
                contatoEl.value = d.contatoBanco || '';
                function esc(v) { return (v || '').replace(/</g, ' ').replace(/"/g, '&quot;'); }
                var html = '<div style="margin-bottom:12px;"><label style="display:block;font-size:0.7rem;color:#94a3b8;margin-bottom:4px;">Raz\u00e3o social</label><input type="text" id="serasa-detalhes-razao-social" value="' + esc(d.razaoSocial) + '" placeholder="ex: ITAU UNIBANCO S.A." style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.3);color:#f1f5f9;font-size:13px;"></div>';
                html += '<div style="margin-bottom:12px;"><label style="display:block;font-size:0.7rem;color:#94a3b8;margin-bottom:4px;">Banco de origem / Empresa</label><input type="text" id="serasa-detalhes-empresa" value="' + esc(d.empresaOrigem) + '" placeholder="ex: Banco Inter" style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.3);color:#f1f5f9;font-size:13px;"></div>';
                html += '<div style="margin-bottom:12px;"><label style="display:block;font-size:0.7rem;color:#94a3b8;margin-bottom:4px;">Credor</label><input type="text" id="serasa-detalhes-credor" value="' + esc(d.nome) + '" placeholder="ex: FIDC NPL II" style="width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.3);color:#f1f5f9;font-size:13px;"></div>';
                html += '<table style="width:100%;font-size:12px;border-collapse:collapse;">';
                html += '<tr><td style="padding:6px 0;color:#94a3b8;">Valor original</td><td style="text-align:right;padding:6px 0;"><input type="text" id="serasa-detalhes-valor-original" value="' + (d.valorOriginal != null ? fmt(d.valorOriginal) : '') + '" placeholder="0,00" style="width:120px;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#f1f5f9;text-align:right;font-size:12px;"></td></tr>';
                html += '<tr><td style="padding:6px 0;color:#94a3b8;">Valor atual</td><td style="text-align:right;padding:6px 0;"><input type="text" id="serasa-detalhes-valor-atual" value="' + (d.valorAtual != null ? fmt(d.valorAtual) : '') + '" placeholder="0,00" style="width:120px;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#f1f5f9;text-align:right;font-size:12px;"></td></tr>';
                html += '<tr><td style="padding:6px 0;color:#94a3b8;">Total da negocia\u00e7\u00e3o</td><td style="text-align:right;padding:6px 0;"><input type="text" id="serasa-detalhes-valor-total" value="' + fmt(d.valorTotal) + '" placeholder="0,00" style="width:120px;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#f1f5f9;text-align:right;font-size:12px;font-weight:700;"></td></tr>';
                html += '<tr><td style="padding:6px 0;color:#94a3b8;">J\u00e1 pago</td><td style="text-align:right;padding:6px 0;color:#86efac;">R$ ' + fmt(pago) + '</td></tr>';
                html += '<tr><td style="padding:6px 0;color:#94a3b8;">Falta pagar</td><td style="text-align:right;padding:6px 0;color:#f43f5e;">R$ ' + fmt(restante) + '</td></tr>';
                html += '<tr><td style="padding:6px 0;color:#94a3b8;">Data da d\u00edvida / origem</td><td style="text-align:right;padding:6px 0;"><input type="text" id="serasa-detalhes-data" value="' + esc(d.dataDivida) + '" placeholder="dd/mm/aaaa" style="width:110px;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#f1f5f9;text-align:right;font-size:12px;"></td></tr>';
                html += '<tr><td style="padding:6px 0;color:#94a3b8;">Contrato</td><td style="text-align:right;padding:6px 0;"><input type="text" id="serasa-detalhes-contrato" value="' + esc(d.numeroContrato) + '" placeholder="N\u00famero" style="width:100%;max-width:200px;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#f1f5f9;font-size:12px;"></td></tr>';
                html += '<tr><td style="padding:6px 0;color:#94a3b8;">Produto / Servi\u00e7o</td><td style="padding:6px 0;"><input type="text" id="serasa-detalhes-produto" value="' + esc(d.produtoServico) + '" placeholder="ex: Cart\u00e3o de Cr\u00e9dito - CART\u00c3O GOLD MASTERCARD INTER" style="width:100%;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#f1f5f9;font-size:12px;"></td></tr>';
                html += '<tr><td style="padding:6px 0;color:#94a3b8;">Tipo</td><td style="padding:6px 0;"><input type="text" id="serasa-detalhes-tipo" value="' + esc(d.tipo) + '" placeholder="ex: Conta atrasada" style="width:100%;max-width:180px;padding:6px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(0,0,0,0.3);color:#f1f5f9;font-size:12px;"></td></tr>';
                html += '</table>';
                if ((d.pagamentos || []).length) {
                    html += '<p style="font-size:10px;font-weight:800;color:#94a3b8;margin:12px 0 6px 0;">Pagamentos (clique em Excluir para remover um pagamento errado)</p>';
                    (d.pagamentos || []).forEach(function (p, idx) {
                        html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;padding:6px;background:rgba(0,0,0,0.2);border-radius:8px;"><span style="font-size:11px;color:#cbd5e1;">R$ ' + fmt(p.valor) + ' em ' + formatPayDate(p) + '</span><button type="button" class="serasa-excluir-pagamento" data-divida-id="' + dividaId + '" data-idx="' + idx + '" style="background:rgba(239,68,68,0.2);color:#fca5a5;border:1px solid rgba(239,68,68,0.5);border-radius:8px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;"><i class="fas fa-trash"></i> Excluir</button></div>';
                    });
                }
                bodyEl.innerHTML = html;
                bodyEl.querySelectorAll('.serasa-excluir-pagamento').forEach(function (btn) {
                    btn.onclick = function () {
                        var did = this.getAttribute('data-divida-id');
                        var idx = parseInt(this.getAttribute('data-idx'), 10);
                        var db2 = window._kingFinanceDb || { dividas: [] };
                        var d2 = (db2.dividas || []).find(function (x) { return x.id === did; });
                        if (d2 && d2.pagamentos && d2.pagamentos[idx] != null) {
                            d2.pagamentos.splice(idx, 1);
                            if (window._kingFinancePersist) window._kingFinancePersist();
                            window._kingFinanceVerDetalhesDivida(did);
                        }
                    };
                });
                function saveAndClose() {
                    var razaoEl = document.getElementById('serasa-detalhes-razao-social');
                    var emp = document.getElementById('serasa-detalhes-empresa');
                    var cred = document.getElementById('serasa-detalhes-credor');
                    var vOriginal = document.getElementById('serasa-detalhes-valor-original');
                    var vAtual = document.getElementById('serasa-detalhes-valor-atual');
                    var vTotal = document.getElementById('serasa-detalhes-valor-total');
                    var vData = document.getElementById('serasa-detalhes-data');
                    var vContrato = document.getElementById('serasa-detalhes-contrato');
                    var vProd = document.getElementById('serasa-detalhes-produto');
                    var vTipo = document.getElementById('serasa-detalhes-tipo');
                    if (razaoEl) d.razaoSocial = razaoEl.value.trim() || undefined;
                    if (emp) d.empresaOrigem = emp.value.trim() || undefined;
                    if (cred) d.nome = cred.value.trim() || 'Credor';
                    function parseValorBR(s) { var t = (s || '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.'); return parseFloat(t); }
                    if (vOriginal && vOriginal.value.trim()) { var n = parseValorBR(vOriginal.value); if (!isNaN(n)) d.valorOriginal = n; }
                    if (vAtual && vAtual.value.trim()) { var n = parseValorBR(vAtual.value); if (!isNaN(n)) d.valorAtual = n; }
                    if (vTotal && vTotal.value.trim()) { var n = parseValorBR(vTotal.value); if (!isNaN(n) && n >= 0) d.valorTotal = n; }
                    if (vData) d.dataDivida = vData.value.trim() || undefined;
                    if (vContrato) d.numeroContrato = vContrato.value.trim() || undefined;
                    if (vProd) d.produtoServico = vProd.value.trim() || undefined;
                    if (vTipo) d.tipo = vTipo.value.trim() || undefined;
                    d.contatoBanco = contatoEl.value.trim() || undefined;
                    if (window._kingFinancePersist) window._kingFinancePersist();
                    overlay.remove();
                    var divs = window._kingFinanceDb.dividas || [];
                    window._kingFinanceStats = window._kingFinanceStats || {};
                    window._kingFinanceStats.totalDividas = divs.reduce(function (a, b) { var p = (b.pagamentos || []).reduce(function (ac, x) { return ac + (Number(x.valor) || 0); }, 0); return a + (Number(b.valorTotal) || 0) - p; }, 0);
                    var tdg = divs.reduce(function (a, b) { return a + (Number(b.valorTotal) || 0); }, 0);
                    var tpg = divs.reduce(function (a, b) { return a + (b.pagamentos || []).reduce(function (ac, p) { return ac + (Number(p.valor) || 0); }, 0); }, 0);
                    var rawPct = tdg > 0 ? (tpg / tdg) * 100 : 100; window._kingFinanceStats.scoreSerasaPct = rawPct > 0 && rawPct < 1 ? Math.round(rawPct * 10) / 10 : Math.round(rawPct);
                    window._kingFinanceStats.scoreSerasaLabel = window._kingFinanceStats.scoreSerasaPct >= 100 ? 'Em dia' : window._kingFinanceStats.scoreSerasaPct >= 50 ? 'Em acordo' : 'Quitando';
                    var el1 = document.getElementById('finance-total-dividas'); if (el1) el1.textContent = 'R$ ' + (Number(window._kingFinanceStats.totalDividas) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                    var el2 = document.getElementById('finance-score-serasa'); if (el2) { var _s = window._kingFinanceStats.scoreSerasaPct; el2.textContent = (typeof _s === 'number' && _s > 0 && _s < 1 ? _s.toFixed(1).replace('.', ',') : Math.round(_s || 0)) + '% · ' + (window._kingFinanceStats.scoreSerasaLabel || '-'); }
                    if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('serasa');
                    if (window.loadFinanceTransactions) window.loadFinanceTransactions();
                }
                document.getElementById('serasa-detalhes-fechar').onclick = saveAndClose;
                document.getElementById('serasa-detalhes-fechar2').onclick = saveAndClose;
                overlay.addEventListener('click', function (ev) { if (ev.target === overlay) saveAndClose(); });
                document.getElementById('serasa-detalhes-atualizar-img').onclick = function () { document.getElementById('serasa-detalhes-file').click(); };
                document.getElementById('serasa-detalhes-file').onchange = async function () {
                    var file = this.files && this.files[0];
                    if (!file) return;
                    this.value = '';
                    bodyEl.innerHTML = '<p style="color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i> Lendo imagem...</p>';
                    var fd = new FormData();
                    fd.append('files', file);
                    try {
                        var res = await fetch(env.API_URL + '/api/finance/serasa/import-image-preview', { method: 'POST', headers: env.HEADERS_AUTH || {}, body: fd });
                        var json = await res.json().catch(function () { return {}; });
                        if (!res.ok) { bodyEl.innerHTML = '<p style="color:#f43f5e;">' + (json.message || 'Erro ao processar.') + '</p>'; return; }
                        var offers = (json.data && json.data.offers) || [];
                        if (offers.length === 0) { bodyEl.innerHTML = '<p style="color:#f59e0b;">Nenhum dado reconhecido na imagem.</p>'; return; }
                        var o = offers[0];
                        var msg = 'Confirmar atualiza\u00e7\u00e3o desta d\u00edvida com os dados da imagem? N\u00e3o ser\u00e1 criada outra d\u00edvida.<br><br>Valor original: R$ ' + fmt(o.valorOriginal) + '<br>Valor atual: R$ ' + fmt(o.valorAtual) + '<br>Total a negociar: R$ ' + fmt(o.valorTotal);
                        if (!confirm(msg.replace(/<br>/g, '\n'))) { bodyEl.innerHTML = html; return; }
                        d.nome = o.nome || d.nome;
                        d.valorTotal = Number(o.valorTotal) != null ? o.valorTotal : d.valorTotal;
                        if (o.valorOriginal != null) d.valorOriginal = o.valorOriginal;
                        if (o.valorAtual != null) d.valorAtual = o.valorAtual;
                        if (o.dataDivida) d.dataDivida = o.dataDivida;
                        if (o.numeroContrato) d.numeroContrato = o.numeroContrato;
                        if (o.produtoServico) d.produtoServico = o.produtoServico;
                        if (o.empresaOrigem) d.empresaOrigem = o.empresaOrigem;
                        if (o.razaoSocial) d.razaoSocial = o.razaoSocial;
                        if (o.tipo) d.tipo = o.tipo;
                        d.contatoBanco = contatoEl.value.trim() || d.contatoBanco;
                        if (window._kingFinancePersist) window._kingFinancePersist();
                        overlay.remove();
                        if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('serasa');
                        if (window.loadFinanceTransactions) window.loadFinanceTransactions();
                    } catch (e) { bodyEl.innerHTML = '<p style="color:#f43f5e;">Erro de conex\u00e3o.</p>'; }
                };
            };
        })();

        // Carregar transações
        window._kingFinanceTransactions = [];
        await window.loadFinanceTransactions();

        // Inicializar gráfico de evolução após um pequeno delay para garantir que o canvas existe
        setTimeout(() => {
            initFinanceChart();
        }, 100);

    } catch (error) {
        console.error('Erro ao inicializar módulo financeiro:', error);
        const financeContent = document.getElementById('finance-content');
        if (financeContent) {
            financeContent.innerHTML = `
                <div style="background: var(--bg-card, #1C1C21); border-radius: 12px; padding: 30px; text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #FFC700; margin-bottom: 20px;"></i>
                    <h3 style="color: var(--text-primary, #FFFFFF); margin-bottom: 10px;">Erro ao carregar módulo financeiro</h3>
                    <p style="color: var(--text-secondary, #888888); margin-bottom: 20px;">${error.message}</p>
                    <button class="btn btn-primary" onclick="window.initFinancePane && window.initFinancePane()">
                        <i class="fas fa-redo"></i> Tentar Novamente
                    </button>
                </div>
            `;
        }
    }
};

// ========== MODO KING FINANCE (Fluxo, Trampo, Bens, Cartões, Serasa) ==========
window.showKingFinancePane = async function () {
    const financeContent = document.getElementById('finance-content');
    if (!financeContent) return;
    financeContent.innerHTML = '<p style="text-align:center;padding:40px;color:var(--finance-text-secondary,#888);"><i class="fas fa-spinner fa-spin"></i> Carregando King Finance...</p>';

    const fmt = (v) => Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    let db = { fluxo: [], trabalhos: [], bens: [], cartoes: [], dividas: [], terceiros: [] };
    const profileId = localStorage.getItem('finance_current_profile_id') || '';
    try {
        const saved = localStorage.getItem('king_finance_v9');
        if (saved) db = JSON.parse(saved);
    } catch (e) { }
    // Sync: servidor é a fonte de verdade para Serasa / Quem eu devo / Trabalhos / Bens
    try {
        const kingDataUrl = `${env.API_URL}/api/finance/king-data${profileId ? '?profile_id=' + encodeURIComponent(profileId) : ''}`;
        const kingRes = await fetch(kingDataUrl, { headers: env.HEADERS_AUTH });
        if (kingRes.ok) {
            const kingJson = await kingRes.json();
            const remote = kingJson.data || kingJson;
            if (remote && (Array.isArray(remote.dividas) || Array.isArray(remote.terceiros) || Array.isArray(remote.trabalhos) || Array.isArray(remote.bens))) {
                if (Array.isArray(remote.dividas)) db.dividas = remote.dividas;
                if (Array.isArray(remote.terceiros)) db.terceiros = remote.terceiros;
                if (Array.isArray(remote.trabalhos)) db.trabalhos = remote.trabalhos;
                if (Array.isArray(remote.bens)) db.bens = remote.bens;
            }
            try { localStorage.removeItem('king_finance_v9'); } catch (_) { }
        }
    } catch (e) { console.warn('King-data sync load:', e); }

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;

    let receitas = 0, despesas = 0;
    let transactions = [], cards = [];
    try {
        const dashRes = await fetch(`${env.API_URL}/api/finance/dashboard?dateFrom=${monthStart}&dateTo=${monthEnd}${profileId ? '&profile_id=' + profileId : ''}`, { headers: env.HEADERS_AUTH });
        if (dashRes.ok) {
            const dashData = (await dashRes.json()).data || {};
            receitas = Number(dashData.totalIncome) || 0;
            despesas = Number(dashData.totalExpense) || 0;
        }
    } catch (e) { }
    try {
        const txRes = await fetch(`${env.API_URL}/api/finance/transactions?limit=200&dateFrom=${monthStart}&dateTo=${monthEnd}${profileId ? '&profile_id=' + profileId : ''}`, { headers: env.HEADERS_AUTH });
        if (txRes.ok) {
            const txData = (await txRes.json()).data || {};
            transactions = Array.isArray(txData) ? txData : (txData.data || txData.transactions || []);
        }
    } catch (e) { }
    try {
        const cardRes = await fetch(`${env.API_URL}/api/finance/cards`, { headers: env.HEADERS_AUTH });
        if (cardRes.ok) {
            const cardData = (await cardRes.json()).data || [];
            cards = Array.isArray(cardData) ? cardData : [];
        }
    } catch (e) { }

    const totalDividas = (db.dividas || []).reduce((a, b) => {
        const pago = (b.pagamentos || []).reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
        return a + (Number(b.valorTotal) || 0) - pago;
    }, 0);
    const totalTrabalhos = (db.trabalhos || []).reduce((a, b) => a + (Number(b.valor) || 0), 0);
    const saldo = receitas - despesas;

    const totalDividasGeral = (db.dividas || []).reduce((a, b) => a + (Number(b.valorTotal) || 0), 0);
    const totalPagoGeral = (db.dividas || []).reduce((a, b) => a + (b.pagamentos || []).reduce((acc, p) => acc + (Number(p.valor) || 0), 0), 0);
    var rawScorePct = totalDividasGeral > 0 ? (totalPagoGeral / totalDividasGeral) * 100 : 100;
    const scoreSerasaPct = rawScorePct > 0 && rawScorePct < 1 ? Math.round(rawScorePct * 10) / 10 : Math.round(rawScorePct);
    const scoreSerasaLabel = scoreSerasaPct >= 100 ? 'Em dia' : scoreSerasaPct >= 50 ? 'Em acordo' : 'Quitando';

    window._kingFinanceDb = db;
    window._kingFinanceTransactions = transactions;
    window._kingFinanceCards = cards;
    window._kingFinanceStats = { receitas, despesas, totalDividas, totalTrabalhos, saldo, scoreSerasaPct, scoreSerasaLabel };

    const fluxoList = transactions.map(t => ({
        id: t.id,
        tipo: (t.type || '').toUpperCase() === 'INCOME' ? 'receita' : 'despesa',
        valor: Number(t.amount) || 0,
        descricao: t.description || '',
        data: (t.transaction_date || t.date || '').toString().slice(0, 10)
    }));
    const cartoesList = cards.map(c => ({
        id: c.id,
        nome: c.name || '',
        limite: Number(c.limit_amount) || 0,
        diaFechamento: c.closing_day || ''
    }));

    const html = `
        <style>
            .kf-tab { padding: 10px 16px; border-radius: 12px; border: none; background: rgba(255,255,255,0.05); color: #94a3b8; font-weight: 700; cursor: pointer; font-size: 0.8rem; }
            .kf-tab.active { background: #D4AF37; color: #000; }
            .kf-card { background: #111; padding: 1.5rem; border-radius: 1.5rem; border: 1px solid rgba(255,255,255,0.05); }
        </style>
        <div class="king-finance-pane" style="max-width: 900px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
                <h2 style="font-size: 1.5rem; font-weight: 800; color: #f1f5f9; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">King Finance</h2>
                <button type="button" onclick="window.initFinancePane && window.initFinancePane()" style="padding: 8px 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; color: #94a3b8; font-size: 0.8rem; font-weight: 600; cursor: pointer;">Voltar à visão clássica</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="kf-card"><p style="font-size: 10px; font-weight: 800; color: #22c55e; text-transform: uppercase; margin: 0 0 4px 0;">Receitas Totais</p><h2 style="font-size: 1.75rem; font-weight: 800; margin: 0;">R$ ${fmt(receitas)}</h2></div>
                <div class="kf-card"><p style="font-size: 10px; font-weight: 800; color: #f43f5e; text-transform: uppercase; margin: 0 0 4px 0;">Despesas Totais</p><h2 style="font-size: 1.75rem; font-weight: 800; margin: 0;">R$ ${fmt(despesas)}</h2></div>
                <div class="kf-card"><p style="font-size: 10px; font-weight: 800; color: #D4AF37; text-transform: uppercase; margin: 0 0 4px 0;">Dívidas Pendentes</p><h2 style="font-size: 1.75rem; font-weight: 800; margin: 0;">R$ ${fmt(totalDividas)}</h2></div>
            </div>
            <div style="background: #D4AF37; padding: 2rem; border-radius: 3rem; text-align: center; margin-bottom: 2rem; box-shadow: 0 0 50px rgba(212,175,55,0.2);">
                <p style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; opacity: 0.8; color: #000; margin: 0 0 8px 0;">Saldo Disponível (KING)</p>
                <h1 style="font-size: 3rem; font-weight: 800; margin: 0; color: #000; letter-spacing: -0.02em;">R$ ${fmt(saldo)}</h1>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 1.5rem;">
                <button type="button" class="kf-tab active" data-king-tab="fluxo">Fluxo</button>
                <button type="button" class="kf-tab" data-king-tab="trabalhos">Trabalhos</button>
                <button type="button" class="kf-tab" data-king-tab="bens">Bens</button>
                <button type="button" class="kf-tab" data-king-tab="cartoes">Cartões</button>
                <button type="button" class="kf-tab" data-king-tab="serasa">Serasa</button>
            </div>
            <div id="king-finance-tab-content"></div>
        </div>
        <div id="king-finance-modal" class="king-finance-modal-wrap">
            <div class="king-finance-modal-box">
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: var(--finance-indigo, #3b82f6); border-radius: 24px 24px 0 0;"></div>
                <h3 id="king-finance-modal-title" class="king-finance-modal-title">Novo</h3>
                <form id="king-finance-modal-form" class="king-finance-modal-form"></form>
                <button type="button" id="king-finance-modal-cancel" class="king-finance-modal-cancel">Cancelar</button>
            </div>
        </div>
    `;
    financeContent.innerHTML = html;

    function renderTab(tabId) {
        const container = document.getElementById('king-finance-tab-content');
        if (!container) return;
        document.querySelectorAll('.kf-tab').forEach(btn => { btn.classList.toggle('active', btn.getAttribute('data-king-tab') === tabId); });
        const db = window._kingFinanceDb || { fluxo: [], trabalhos: [], bens: [], cartoes: [], dividas: [], terceiros: [] };
        const fluxoList = window._kingFinanceTransactions || [];
        const cartoesList = window._kingFinanceCards || [];
        const fmt = (v) => Number(v || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

        if (tabId === 'fluxo') {
            const list = fluxoList.map(t => ({ id: t.id, tipo: (t.type || '').toUpperCase() === 'INCOME' ? 'receita' : 'despesa', valor: Number(t.amount) || 0, descricao: t.description || '', data: (t.transaction_date || t.date || '').toString().slice(0, 10) }));
            container.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="font-size: 1.1rem; font-weight: 800; color: #f1f5f9; margin: 0;">Fluxo de Caixa</h3>
                    <button type="button" onclick="window.showNovoLancamentoChoiceModal && window.showNovoLancamentoChoiceModal()" style="padding: 8px 16px; background: #fff; color: #000; border: none; border-radius: 12px; font-size: 10px; font-weight: 800; cursor: pointer;">+ Novo Lançamento</button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${list.length === 0 ? '<p style="color:#64748b;text-align:center;padding:2rem;">Nenhum lançamento neste mês. Use + Novo Lançamento acima ou a aba Resumo.</p>' : list.map(f => `
                        <div class="kf-card" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem;">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <span style="color: ${f.tipo === 'receita' ? '#22c55e' : '#f43f5e'};">${f.tipo === 'receita' ? '+' : '-'}</span>
                                <div><p style="font-size: 12px; font-weight: 700; margin: 0;">${(f.descricao || '').slice(0, 40)}</p><p style="font-size: 9px; color: #64748b; margin: 4px 0 0 0;">${f.data}</p></div>
                            </div>
                            <span style="font-weight: 800; color: ${f.tipo === 'receita' ? '#22c55e' : '#f43f5e'};">R$ ${fmt(f.valor)}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            return;
        }
        if (tabId === 'trabalhos') {
            const list = db.trabalhos || [];
            const formatPayDateTrab = (p) => { const dt = p.data || ''; if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) { const pt = dt.split('-'); return pt[2] + '/' + pt[1] + '/' + pt[0] + (p.hora ? ' às ' + p.hora : ''); } return dt + (p.hora ? ' às ' + p.hora : ''); };
            const cardsTrab = list.length === 0 ? '<p style="color:#64748b;text-align:center;padding:2rem;">Nenhum trabalho. Clique em + Registrar Serviço.</p>' : list.map(t => {
                const pago = (t.pagamentos || []).reduce((a, p) => a + (Number(p.valor) || 0), 0);
                const restante = Math.max(0, (Number(t.valor) || 0) - pago);
                const pctD = (Number(t.valor) || 0) > 0 ? Math.round((pago / (t.valor || 1)) * 100) : 100;
                const quitado = pago >= (Number(t.valor) || 0);
                const ultimoPag = (t.pagamentos || []).length ? t.pagamentos[t.pagamentos.length - 1] : null;
                const dataQuitStr = quitado && ultimoPag ? '<p style="font-size:10px;color:#22c55e;margin:4px 0 0 0;"><i class="fas fa-check-circle"></i> Quitado em ' + formatPayDateTrab(ultimoPag) + '</p>' : '';
                const pagamentosHtmlT = (t.pagamentos || []).length ? '<div style="margin-top:12px;"><p style="font-size:9px;font-weight:800;color:rgba(255,255,255,0.5);margin:0 0 6px 0;letter-spacing:0.05em;">ENTRADAS</p>' + (t.pagamentos || []).map(p => '<p style="font-size:11px;color:#cbd5e1;margin:0 0 4px 0;">R$ ' + fmt(Number(p.valor) || 0) + ' em ' + formatPayDateTrab(p) + '</p>').join('') + '</div>' : '';
                const datasStr = (t.data || t.dataPrevista) ? ' · ' + (t.data ? 'Trabalho: ' + (t.data.length >= 10 ? t.data.split('-').reverse().join('/') : t.data) : '') + (t.dataPrevista ? (t.data ? ' ' : '') + 'Previsto: ' + (t.dataPrevista.length >= 10 ? t.dataPrevista.split('-').reverse().join('/') : t.dataPrevista) : '') : '';
                const cardStyle = 'background:linear-gradient(135deg,rgba(59,130,246,0.18) 0%,rgba(37,99,235,0.1) 50%,#111 100%);border:1px solid rgba(59,130,246,0.3);border-radius:20px;padding:1.5rem;min-height:180px;display:flex;flex-direction:column;position:relative;';
                const valoresRow = '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;"><div><p style="font-size:10px;color:rgba(255,255,255,0.6);margin:0 0 4px 0;">Valor recebido</p><p style="font-size:1.5rem;font-weight:800;margin:0;color:#22c55e;">R$ ' + fmt(pago) + '</p></div><div style="text-align:right;"><p style="font-size:10px;color:rgba(255,255,255,0.6);margin:0 0 4px 0;">Falta receber</p><p style="font-size:1.5rem;font-weight:800;margin:0;color:' + (restante > 0 ? '#f87171' : '#22c55e') + ';">' + (restante > 0 ? 'R$ ' + fmt(restante) : 'Quitado') + '</p></div></div>';
                return '<div class="kf-card" style="' + cardStyle + '"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;"><div><p style="font-size:11px;color:rgba(255,255,255,0.6);margin:0 0 4px 0;letter-spacing:0.1em;">SERVIÇO PRESTADO</p><h4 style="font-size:1.15rem;font-weight:800;margin:0;color:#fff;">' + (t.cliente || '').slice(0, 35) + '</h4><p style="font-size:10px;color:rgba(255,255,255,0.5);margin:4px 0 0 0;">' + (t.servico || '').slice(0, 50) + (datasStr ? datasStr : '') + '</p></div><button type="button" onclick="window._kingFinanceEditTrabalho && window._kingFinanceEditTrabalho(\'' + String(t.id).replace(/'/g, "\\'") + '\')" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#60a5fa;cursor:pointer;padding:8px 12px;border-radius:10px;" title="Editar"><i class="fas fa-pencil-alt"></i></button></div>' + valoresRow + '<div style="height:8px;background:rgba(255,255,255,0.1);border-radius:999px;overflow:hidden;margin-bottom:8px;"><div style="height:100%;width:' + pctD + '%;background:linear-gradient(90deg,#22c55e,#3b82f6);border-radius:999px;transition:width 0.3s;"></div></div><p style="font-size:11px;color:rgba(255,255,255,0.6);margin:0 0 12px 0;">' + pctD + '% recebido</p>' + dataQuitStr + pagamentosHtmlT + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;"><button type="button" onclick="window._kingFinanceRegistrarEntradaTrabalho && window._kingFinanceRegistrarEntradaTrabalho(\'' + t.id + '\')" style="flex:1;min-width:140px;padding:10px 16px;background:#22c55e;color:#fff;border:none;border-radius:12px;font-size:11px;font-weight:800;cursor:pointer;"><i class="fas fa-plus" style="margin-right:6px;"></i>Registrar entrada</button><button type="button" onclick="window._kingFinanceDelete(\'trabalhos\',\'' + t.id + '\')" style="background:none;border:1px solid rgba(239,68,68,0.4);color:#f87171;cursor:pointer;padding:8px 12px;border-radius:10px;" title="Excluir"><i class="fas fa-trash"></i></button></div></div>';
            }).join('');
            container.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;"><h3 style="font-size:1.1rem;font-weight:800;color:#3b82f6;margin:0;">Trabalhos e Serviços</h3><button type="button" onclick="window._kingFinanceOpenModal(\'trabalho\')" style="padding:8px 16px;background:#2563eb;color:#fff;border:none;border-radius:12px;font-size:10px;font-weight:800;cursor:pointer;">+ Registrar Serviço</button></div><p style="font-size:11px;color:#94a3b8;margin:0 0 12px 0;">Controle de serviços prestados. Registre entradas (pagamentos parciais) e acompanhe a quitação.</p><div style="display:flex;flex-direction:column;gap:1rem;">' + cardsTrab + '</div>';
            return;
        }
        if (tabId === 'bens') {
            if (window._kingFinanceBensFiltro !== 'emprestimo' && window._kingFinanceBensFiltro !== 'devolvidos') window._kingFinanceBensFiltro = 'emprestimo';
            const list = db.bens || [];
            const emEmprestimo = list.filter(b => !b.devolvido);
            const devolvidos = list.filter(b => !!b.devolvido);
            const filtroAtual = window._kingFinanceBensFiltro || 'emprestimo';
            const listToShow = filtroAtual === 'devolvidos' ? devolvidos : emEmprestimo;
            const fmtDataBem = (d) => { if (!d || d.length < 10) return ''; const p = d.slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
            const cardsHtml = listToShow.length === 0 ? '<p style="color:#64748b;text-align:center;padding:2rem;grid-column:1/-1;">' + (filtroAtual === 'devolvidos' ? 'Nenhuma ferramenta devolvida.' : 'Nenhuma ferramenta em empréstimo.') + '</p>' : listToShow.map(b => {
                const isDevolvido = !!b.devolvido;
                const cardStyle = isDevolvido ? 'opacity:0.75;background:rgba(30,30,35,0.6);border-color:rgba(255,255,255,0.06);' : '';
                const textMuted = isDevolvido ? 'color:#64748b !important;' : '';
                const fotoHtml = b.foto ? `<div role="button" tabindex="0" onclick="window._kingFinanceExpandFoto && window._kingFinanceExpandFoto(this)" style="flex-shrink:0;width:80px;height:80px;margin-right:14px;cursor:pointer;${isDevolvido ? 'opacity:0.7;' : ''}"><img src="${(b.foto || '').replace(/"/g, '&quot;')}" style="width:80px;height:80px;border-radius:12px;object-fit:cover;border:1px solid rgba(255,255,255,0.1);display:block;pointer-events:none;" alt=""></div>` : '';
                const datasHtml = (b.dataEmprestimo || b.previsaoEntrega || b.dataDevolucao) ? `<p style="font-size:9px;color:#64748b;margin:4px 0 0 0;">${b.dataEmprestimo ? 'Emprestada: ' + fmtDataBem(b.dataEmprestimo) : ''}${b.dataEmprestimo && b.previsaoEntrega ? ' · ' : ''}${b.previsaoEntrega ? 'Entrega prevista: ' + fmtDataBem(b.previsaoEntrega) : ''}${b.dataDevolucao ? (b.dataEmprestimo || b.previsaoEntrega ? ' · ' : '') + 'Devolvida: ' + fmtDataBem(b.dataDevolucao) : ''}</p>` : '';
                const btnDarBaixa = !isDevolvido ? `<button type="button" onclick="window._kingFinanceDarBaixaBem && window._kingFinanceDarBaixaBem('${b.id}')" style="padding:6px 12px;background:rgba(34,197,94,0.2);border:1px solid rgba(34,197,94,0.5);border-radius:8px;color:#86efac;font-size:10px;font-weight:700;cursor:pointer;"><i class="fas fa-check-circle" style="margin-right:4px;"></i>Dar baixa</button>` : '';
                const btnReabrir = isDevolvido ? `<button type="button" onclick="window._kingFinanceReabrirBem && window._kingFinanceReabrirBem('${b.id}')" style="padding:6px 12px;background:rgba(168,85,247,0.2);border:1px solid rgba(168,85,247,0.5);border-radius:8px;color:#a78bfa;font-size:10px;font-weight:700;cursor:pointer;"><i class="fas fa-redo" style="margin-right:4px;"></i>Reabrir empréstimo</button>` : '';
                return `<div class="kf-card" style="${cardStyle}display:flex;justify-content:space-between;align-items:flex-start;gap:12px;"><div style="display:flex;align-items:flex-start;flex:1;min-width:0;">${fotoHtml}<div style="min-width:0;"><p style="font-size:10px;font-weight:800;color:#a855f7;margin:0;${textMuted}">${isDevolvido ? 'Devolvida' : 'Ferramenta emprestada'}</p><h4 style="font-size:14px;font-weight:800;margin:4px 0 2px 0;${textMuted}">${(b.nome || '').slice(0, 25)}</h4><p style="font-size:12px;font-weight:800;color:#f1f5f9;margin:2px 0 4px 0;${textMuted}">Com: ${(b.possuidor || '').slice(0, 30)}</p><p style="font-size:12px;font-weight:800;color:#22c55e;margin:0 0 4px 0;${textMuted}">R$ ${fmt(b.valorAluguel)}/mês</p>${datasHtml}</div></div><div style="display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap;">${btnDarBaixa}${btnReabrir}<button type="button" onclick="window._kingFinanceEditBem && window._kingFinanceEditBem('${b.id}')" style="background:none;border:1px solid rgba(168,85,247,0.5);color:#a855f7;cursor:pointer;padding:6px 10px;border-radius:8px;" title="Editar"><i class="fas fa-pencil-alt"></i></button><button type="button" onclick="window._kingFinanceDelete('bens','${b.id}')" style="background:none;border:none;color:#64748b;cursor:pointer;"><i class="fas fa-trash"></i></button></div></div>`;
            }).join('');
            const subTabs = `<div style="display:flex;gap:8px;margin-bottom:1rem;flex-wrap:wrap;align-items:center;"><button type="button" onclick="window._kingFinanceBensFiltro='emprestimo';if(window.renderUnifiedKingTab)window.renderUnifiedKingTab('bens')" style="padding:10px 18px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid ${filtroAtual === 'emprestimo' ? '#a855f7' : 'rgba(255,255,255,0.2)'};background:${filtroAtual === 'emprestimo' ? 'rgba(168,85,247,0.25)' : 'transparent'};color:${filtroAtual === 'emprestimo' ? '#c4b5fd' : '#94a3b8'}"><i class="fas fa-tools" style="margin-right:6px;"></i>Em empréstimo (${emEmprestimo.length})</button><button type="button" onclick="window._kingFinanceBensFiltro='devolvidos';if(window.renderUnifiedKingTab)window.renderUnifiedKingTab('bens')" style="padding:10px 18px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid ${filtroAtual === 'devolvidos' ? '#64748b' : 'rgba(255,255,255,0.2)'};background:${filtroAtual === 'devolvidos' ? 'rgba(100,116,139,0.2)' : 'transparent'};color:${filtroAtual === 'devolvidos' ? '#94a3b8' : '#64748b'}"><i class="fas fa-check-circle" style="margin-right:6px;"></i>Devolvidos (${devolvidos.length})</button><button type="button" onclick="window._kingFinanceBensTelaCheia && window._kingFinanceBensTelaCheia('${filtroAtual}')" style="padding:10px 18px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid rgba(168,85,247,0.5);background:rgba(168,85,247,0.15);color:#c4b5fd"><i class="fas fa-expand" style="margin-right:6px;"></i>Ver em tela cheia</button></div>`;
            container.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;flex-wrap:wrap;gap:12px;"><h3 style="font-size:1.1rem;font-weight:800;color:#a855f7;margin:0;">Empréstimo de ferramentas</h3><button type="button" onclick="window._kingFinanceOpenModal('bem')" style="padding:8px 16px;background:#7c3aed;color:#fff;border:none;border-radius:12px;font-size:10px;font-weight:800;cursor:pointer;">+ Registrar ferramenta</button></div><p style="font-size:11px;color:#94a3b8;margin:0 0 12px 0;">Controle de ferramentas que você emprestou. Use <strong>Dar baixa</strong> quando receber de volta.</p>${subTabs}<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem;">${cardsHtml}</div>`;
            return;
        }
        if (tabId === 'cartoes') {
            const curMonth = (typeof window.currentFinanceMonth === 'number' ? window.currentFinanceMonth : new Date().getMonth()) + 1;
            const curYear = typeof window.currentFinanceYear === 'number' ? window.currentFinanceYear : new Date().getFullYear();
            const txList = window._kingFinanceTransactions || [];
            const spentByCard = {};
            txList.forEach(t => {
                if ((t.type || '').toUpperCase() !== 'EXPENSE' || !t.card_id) return;
                const dt = (t.transaction_date || t.date || '').toString();
                if (dt.length >= 7) {
                    const m = parseInt(dt.substring(5, 7), 10);
                    const y = parseInt(dt.substring(0, 4), 10);
                    if (m === curMonth && y === curYear) {
                        const cid = String(t.card_id);
                        spentByCard[cid] = (spentByCard[cid] || 0) + (parseFloat(t.amount) || 0);
                    }
                }
            });
            const list = cartoesList.map(c => {
                const cid = String(c.id);
                const gasto = spentByCard[cid] || 0;
                const limite = Number(c.limit_amount) || 0;
                const disponivel = Math.max(0, limite - gasto);
                const pctUsado = limite > 0 ? Math.min(100, Math.round((gasto / limite) * 100)) : 0;
                return { id: c.id, nome: c.name || '', limite, gasto, disponivel, pctUsado, diaFechamento: c.closing_day || '' };
            });
            const cardsHtml = list.length === 0 ? '<p style="color:#64748b;text-align:center;padding:2rem;">Nenhum cartão cadastrado. Use + Novo Cartão para adicionar.</p>' : list.map(c => `
                <div class="kf-card" style="background:#111;padding:1.5rem;border-radius:20px;border:1px solid rgba(255,255,255,0.05);background:linear-gradient(135deg,rgba(249,115,22,0.15) 0%,rgba(234,88,12,0.08) 50%,#111 100%);border:1px solid rgba(249,115,22,0.25);min-height:180px;display:flex;flex-direction:column;"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;"><div><p style="font-size:11px;color:rgba(255,255,255,0.6);margin:0 0 4px 0;letter-spacing:0.1em;">CARTÃO DE CRÉDITO</p><h4 style="font-size:1.15rem;font-weight:800;margin:0;color:#fff;">${(c.nome || '').slice(0, 25)}</h4><p style="font-size:10px;color:rgba(255,255,255,0.5);margin:4px 0 0 0;">Fechamento: dia ${c.diaFechamento || '-'}</p></div><div style="display:flex;gap:8px;"><button type="button" onclick="window._kingFinanceEditCartao && window._kingFinanceEditCartao('${c.id}')" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#f97316;cursor:pointer;padding:8px 12px;border-radius:10px;" title="Editar"><i class="fas fa-pencil-alt"></i></button><button type="button" onclick="window._kingFinanceDeleteCard && window._kingFinanceDeleteCard('${c.id}')" style="background:none;border:1px solid rgba(239,68,68,0.4);color:#f87171;cursor:pointer;padding:8px 12px;border-radius:10px;" title="Excluir"><i class="fas fa-trash"></i></button></div></div><div><p style="font-size:10px;color:rgba(255,255,255,0.6);margin:0 0 4px 0;">Limite disponível</p><p style="font-size:1.5rem;font-weight:800;margin:0 0 12px 0;color:#22c55e;">R$ ${fmt(c.disponivel)}</p><div style="height:8px;background:rgba(255,255,255,0.1);border-radius:999px;overflow:hidden;margin-bottom:8px;"><div style="height:100%;width:${c.pctUsado}%;background:linear-gradient(90deg,#ef4444,#f97316);border-radius:999px;"></div></div><div style="display:flex;justify-content:space-between;font-size:11px;"><span style="color:#f97316;">Utilizado: R$ ${fmt(c.gasto)}</span><span style="color:rgba(255,255,255,0.6);">Limite: R$ ${fmt(c.limite)}</span></div></div></div>
            `).join('');
            container.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;"><h3 style="font-size:1.1rem;font-weight:800;color:#f97316;margin:0;">Cartões de Crédito</h3><button type="button" onclick="window._kingFinanceOpenModal(\'cartao\')" style="padding:8px 16px;background:#ea580c;color:#fff;border:none;border-radius:12px;font-size:10px;font-weight:800;cursor:pointer;">+ Novo Cartão</button></div><p style="font-size:11px;color:#94a3b8;margin:0 0 12px 0;">Gasto do mês atual com base nas despesas vinculadas a cada cartão.</p><div style="display:flex;flex-direction:column;gap:1rem;">' + cardsHtml + '</div>';
            return;
        }
        if (tabId === 'serasa') {
            const list = db.dividas || [];
            const searchTerm = (window._kingFinanceSerasaSearch || '').trim().toLowerCase();
            const filteredList = !searchTerm ? list : list.filter(d => {
                const nome = (d.nome || '').toLowerCase();
                const razao = (d.razaoSocial || '').toLowerCase();
                const emp = (d.empresaOrigem || '').toLowerCase();
                const valStr = ('' + (Number(d.valorTotal) || 0)).replace('.', ',').replace(/\D/g, '');
                return nome.indexOf(searchTerm) >= 0 || razao.indexOf(searchTerm) >= 0 || emp.indexOf(searchTerm) >= 0 || (searchTerm.replace(/\D/g, '').length >= 1 && valStr.indexOf(searchTerm.replace(/\D/g, '')) >= 0);
            });
            const stats = window._kingFinanceStats || {};
            const scorePct = stats.scoreSerasaPct !== undefined ? stats.scoreSerasaPct : 0;
            const scorePctDisplay = (typeof scorePct === 'number' && scorePct > 0 && scorePct < 1) ? scorePct.toFixed(1).replace('.', ',') : Math.round(scorePct);
            const scoreLabel = stats.scoreSerasaLabel || '-';
            const totalValorAtual = list.reduce((a, d) => a + (Number(d.valorAtual != null ? d.valorAtual : d.valorTotal) || 0), 0);
            const totalFaltaPagar = list.reduce((a, d) => {
                const pago = (d.pagamentos || []).reduce((ac, p) => ac + (Number(p.valor) || 0), 0);
                return a + Math.max(0, (Number(d.valorTotal) || 0) - pago);
            }, 0);
            const totalNegociacao = list.reduce((a, d) => a + (Number(d.valorTotal) || 0), 0);
            const searchValueEsc = (window._kingFinanceSerasaSearch || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
            container.innerHTML = `
                <div style="margin-bottom: 1rem;">
                    <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--finance-indigo, #6366f1); margin: 0 0 8px 0;">Serasa & Acordos</h3>
                    <p style="font-size: 11px; color: #94a3b8; margin: 0 0 12px 0;">Indicador baseado nos acordos que você cadastrou.</p>
                    <div class="kf-card" style="display: flex; align-items: center; justify-content: center; gap: 2rem; margin-bottom: 1.5rem; flex-wrap: wrap; padding: 1.5rem;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                <div style="width: 168px; height: 168px; border-radius: 50%; background: conic-gradient(var(--finance-indigo, #6366f1) 0% ${scorePct}%, rgba(255,255,255,0.12) ${scorePct}% 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 3px rgba(99,102,241,0.3);">
                                    <div style="width: 138px; height: 138px; border-radius: 50%; background: linear-gradient(180deg, rgba(22,22,30,0.98) 0%, rgba(12,12,18,0.99) 100%); display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2px 12px rgba(0,0,0,0.4);">
                                        <span style="font-size: 2rem; font-weight: 800; color: #a5b4fc; text-align: center; line-height: 1;">${scorePctDisplay}%</span>
                                    </div>
                                </div>
                                <p style="font-size: 13px; font-weight: 700; color: #94a3b8; margin: 0; text-align: center;">${scoreLabel}</p>
                            </div>
                            <div><p style="font-size: 15px; font-weight: 700; color: #a5b4fc; margin: 0 0 6px 0;">Score Serasa (KING)</p><p style="font-size: 13px; color: #94a3b8; margin: 0;">Percentual das dívidas já quitadas.</p></div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                <div style="width: 168px; height: 168px; border-radius: 50%; background: linear-gradient(180deg, rgba(245,158,11,0.45) 0%, rgba(245,158,11,0.3) 100%); border: 2px solid rgba(245,158,11,0.6); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(245,158,11,0.2), inset 0 0 30px rgba(245,158,11,0.08);">
                                    <div style="width: 138px; height: 138px; border-radius: 50%; background: linear-gradient(180deg, rgba(20,18,12,0.97) 0%, rgba(14,12,8,0.99) 100%); display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2px 12px rgba(0,0,0,0.5);">
                                        <span style="font-size: 1.25rem; font-weight: 800; color: #fcd34d; text-align: center; line-height: 1; display: block;">R$ ${fmt(totalValorAtual)}</span>
                                    </div>
                                </div>
                                <p style="font-size: 13px; font-weight: 700; color: #fcd34d; margin: 0; text-align: center;">Valor total atual</p>
                            </div>
                            <div><p style="font-size: 13px; color: #94a3b8; margin: 0;">Soma do valor atual (juros/correções) de todas as contas.</p></div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                <div style="width: 168px; height: 168px; border-radius: 50%; background: linear-gradient(180deg, rgba(239,68,68,0.45) 0%, rgba(239,68,68,0.28) 100%); border: 2px solid rgba(239,68,68,0.6); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(239,68,68,0.2), inset 0 0 30px rgba(239,68,68,0.08);">
                                    <div style="width: 138px; height: 138px; border-radius: 50%; background: linear-gradient(180deg, rgba(28,12,12,0.97) 0%, rgba(18,8,8,0.99) 100%); display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2px 12px rgba(0,0,0,0.5);">
                                        <span style="font-size: 1.25rem; font-weight: 800; color: #fca5a5; text-align: center; line-height: 1; display: block;">R$ ${fmt(totalFaltaPagar)}</span>
                                    </div>
                                </div>
                                <p style="font-size: 13px; font-weight: 700; color: #fca5a5; margin: 0; text-align: center;">Falta pagar</p>
                            </div>
                            <div><p style="font-size: 13px; color: #94a3b8; margin: 0;">Total que ainda falta pagar em todos os acordos.</p></div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                <div style="width: 168px; height: 168px; border-radius: 50%; background: linear-gradient(180deg, rgba(100,116,139,0.4) 0%, rgba(71,85,105,0.35) 100%); border: 2px solid rgba(148,163,184,0.5); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(100,116,139,0.15), inset 0 0 24px rgba(0,0,0,0.2);">
                                    <div style="width: 138px; height: 138px; border-radius: 50%; background: linear-gradient(180deg, rgba(30,30,35,0.98) 0%, rgba(18,18,22,0.99) 100%); display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2px 12px rgba(0,0,0,0.5);">
                                        <span style="font-size: 1.25rem; font-weight: 800; color: #cbd5e1; text-align: center; line-height: 1; display: block;">R$ ${fmt(totalNegociacao)}</span>
                                    </div>
                                </div>
                                <p style="font-size: 13px; font-weight: 700; color: #94a3b8; margin: 0; text-align: center;">Valor da negociação (total)</p>
                            </div>
                            <div><p style="font-size: 13px; color: #94a3b8; margin: 0;">Total acordado em todos os acordos. Não diminui ao pagar; referência para quando quitar.</p></div>
                        </div>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1; min-width: 0;">
                        <span style="font-size: 1rem; font-weight: 800; color: #f1f5f9;">Acordos</span>
                        <span style="font-size: 12px; color: #94a3b8;">Total: ${list.length} conta(s)${searchTerm ? ' · Mostrando ' + filteredList.length : ''}</span>
                        <div style="flex: 1; min-width: 180px; max-width: 320px;">
                            <label style="position: relative; display: block;">
                                <i class="fas fa-search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 12px;"></i>
                                <input type="text" id="serasa-search-input" placeholder="Pesquisar por nome do banco/credor ou valor" value="${searchValueEsc}" style="width: 100%; padding: 10px 10px 10px 36px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; color: #f1f5f9; font-size: 12px;">
                            </label>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button type="button" onclick="window._kingFinanceSerasaSelectAll && window._kingFinanceSerasaSelectAll()" style="padding: 8px 16px; background: rgba(99,102,241,0.2); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.4); border-radius: 12px; font-size: 10px; font-weight: 800; cursor: pointer;"><i class="fas fa-check-double" style="margin-right: 6px;"></i>Selecionar todos</button>
                        <button type="button" id="serasa-excluir-todos-btn" disabled onclick="window._kingFinanceSerasaExcluirTodos && window._kingFinanceSerasaExcluirTodos()" style="padding: 8px 16px; background: rgba(244,63,94,0.25); color: #fda4af; border: 1px solid rgba(244,63,94,0.5); border-radius: 12px; font-size: 10px; font-weight: 800; cursor: pointer;"><i class="fas fa-trash" style="margin-right: 6px;"></i>Excluir selecionados</button>
                        <button type="button" onclick="window._kingFinanceImportarSerasaPdf && window._kingFinanceImportarSerasaPdf('pdf')" style="padding: 8px 16px; background: rgba(99,102,241,0.25); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.5); border-radius: 12px; font-size: 10px; font-weight: 800; cursor: pointer;"><i class="fas fa-file-pdf" style="margin-right: 6px;"></i>Importar PDF (valores)</button>
                        <button type="button" onclick="window._kingFinanceImportarSerasaPdf && window._kingFinanceImportarSerasaPdf('image')" style="padding: 8px 16px; background: rgba(34,197,94,0.25); color: #86efac; border: 1px solid rgba(34,197,94,0.5); border-radius: 12px; font-size: 10px; font-weight: 800; cursor: pointer;"><i class="fas fa-image" style="margin-right: 6px;"></i>Importar imagem</button>
                        <button type="button" onclick="window._kingFinanceOpenModal('divida')" style="padding: 8px 16px; background: var(--finance-indigo, #6366f1); color: #fff; border: none; border-radius: 12px; font-size: 10px; font-weight: 800; cursor: pointer;">+ Novo Acordo</button>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    ${filteredList.length === 0 ? '<p style="color:#64748b;text-align:center;padding:2rem;">' + (list.length === 0 ? 'Nenhum acordo. Clique em + Novo Acordo.' : 'Nenhum acordo corresponde à pesquisa.') + '</p>' : filteredList.map((d, idx) => {
                const num = idx + 1;
                const pago = (d.pagamentos || []).reduce((a, p) => a + (Number(p.valor) || 0), 0);
                const restante = (Number(d.valorTotal) || 0) - pago;
                const pct = (Number(d.valorTotal) || 0) > 0 ? Math.round((pago / (d.valorTotal || 1)) * 100) : 100;
                const formatPayDate = (p) => {
                    let dt = p.data || '';
                    if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) { const pt = dt.split('-'); dt = pt[2] + '/' + pt[1] + '/' + pt[0]; }
                    return dt + (p.hora ? ' às ' + p.hora : '');
                };
                const pagamentosHtml = (d.pagamentos || []).length ? '<div style="margin-bottom: 0.75rem;"><p style="font-size: 9px; font-weight: 800; color: #94a3b8; margin: 0 0 6px 0;">Pagamentos</p>' + (d.pagamentos || []).map(p => '<p style="font-size: 11px; color: #cbd5e1; margin: 0 0 4px 0;">R$ ' + fmt(Number(p.valor) || 0) + ' em ' + formatPayDate(p) + '</p>').join('') + '</div>' : '';
                const detalhesHtml = (d.numeroContrato || d.dataDivida || d.produtoServico || d.empresaOrigem) ? '<p style="font-size: 10px; color: #94a3b8; margin: 0 0 6px 0;">' + (d.empresaOrigem ? 'Origem ' + (d.empresaOrigem || '').slice(0, 20) + (d.empresaOrigem.length > 20 ? '+' : '') : '') + (d.numeroContrato ? (d.empresaOrigem ? ' · ' : '') + 'Contrato ' + d.numeroContrato : '') + (d.dataDivida ? ' · Data ' + d.dataDivida : '') + (d.produtoServico ? ' · ' + (d.produtoServico || '').slice(0, 25) + ((d.produtoServico || '').length > 25 ? '+' : '') : '') + '</p>' : '';
                const origAtualHtml = (d.valorOriginal != null || d.valorAtual != null) ? '<p style="font-size: 10px; color: #94a3b8; margin: 0 0 6px 0;">Orig. R$ ' + fmt(d.valorOriginal) + ' · Atual R$ ' + fmt(d.valorAtual) + '</p>' : '';
                const titulo = (d.empresaOrigem && !/n[aã]o\s+reconhece|reconhece\s+a\s+empresa/i.test(d.empresaOrigem) ? (d.empresaOrigem || '').replace(/</g, ' ') : (/n[aã]o\s+reconhece|reconhece\s+a\s+empresa/i.test(d.nome || '') ? 'Credor' : (d.nome || ''))).slice(0, 35);
                return `
                            <div class="kf-card" style="border-left: 4px solid var(--finance-indigo, #6366f1); cursor: pointer;" onclick="if (!event.target.closest('button') && !event.target.closest('input[type=checkbox]')) window._kingFinanceVerDetalhesDivida && window._kingFinanceVerDetalhesDivida('${d.id}')">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem; align-items: center; gap: 8px;"><input type="checkbox" class="serasa-acordo-cb" data-divida-id="${d.id}" onclick="event.stopPropagation(); window._kingFinanceSerasaUpdateExcluirBtn && window._kingFinanceSerasaUpdateExcluirBtn()" style="cursor: pointer; flex-shrink: 0;"><span style="font-size: 12px; font-weight: 800; color: #94a3b8; min-width: 28px;">${num}.</span><h4 style="font-size: 14px; font-weight: 800; margin: 0; flex: 1;">${titulo}</h4><button type="button" onclick="event.stopPropagation(); window._kingFinanceDelete('dividas','${d.id}')" style="background: none; border: none; color: #64748b; cursor: pointer;"><i class="fas fa-trash"></i></button></div>
                                <p style="font-size: 10px; margin: 0 0 6px 0;"><a href="javascript:void(0)" onclick="event.stopPropagation(); window._kingFinanceVerDetalhesDivida && window._kingFinanceVerDetalhesDivida('${d.id}')" style="color: var(--finance-indigo, #6366f1);">Ver detalhes</a></p>
                                ${detalhesHtml}
                                ${origAtualHtml}
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                                    <div style="background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 1rem;"><p style="font-size: 9px; font-weight: 800; color: #94a3b8; margin: 0 0 4px 0; letter-spacing: 0.02em;">TOTAL LIQUIDADO</p><p style="font-size: 16px; font-weight: 800; color: #86efac; margin: 0 0 2px 0;">R$ ${fmt(pago)}</p><p style="font-size: 10px; color: #94a3b8; margin: 0;">${pct}% Completo</p></div>
                                    <div style="background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 1rem; position: relative;"><p style="font-size: 9px; font-weight: 800; color: #94a3b8; margin: 0 0 4px 0; letter-spacing: 0.02em;">VALOR DA NEGOCIA—fO</p><p style="font-size: 16px; font-weight: 800; color: #f59e0b; margin: 0 0 6px 0;">R$ ${fmt(restante)}</p><button type="button" onclick="event.stopPropagation(); window._kingFinanceRegistrarPagamento('${d.id}')" style="padding: 6px 12px; background: rgba(245,158,11,0.35); color: #fcd34d; border: 1px solid rgba(245,158,11,0.6); border-radius: 10px; font-size: 10px; font-weight: 700; cursor: pointer;">Pagar mais</button><button type="button" onclick="event.stopPropagation(); window._kingFinanceEditarValorDivida && window._kingFinanceEditarValorDivida('${d.id}')" style="position: absolute; top: 4px; right: 4px; background: rgba(99,102,241,0.25); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.4); border-radius: 8px; padding: 4px 8px; font-size: 9px; font-weight: 700; cursor: pointer;" title="Alterar valor total da dívida"><i class="fas fa-pen"></i></button></div>
                                </div>
                                ${pagamentosHtml}
                                <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 999px; overflow: hidden; margin-bottom: 0.75rem;"><div style="height: 100%; width: ${pct}%; background: var(--finance-indigo, #6366f1); border-radius: 999px;"></div></div>
                                <button type="button" onclick="event.stopPropagation(); window._kingFinanceRegistrarPagamento('${d.id}')" style="width: 100%; padding: 12px; background: var(--finance-indigo, #6366f1); color: #fff; border: none; border-radius: 12px; font-size: 11px; font-weight: 800; cursor: pointer; letter-spacing: 0.02em;">Efetuar pagamento</button>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
            const searchInput = document.getElementById('serasa-search-input');
            if (searchInput) searchInput.oninput = function () {
                const v = this.value;
                window._kingFinanceSerasaSearch = v;
                if (window.renderUnifiedKingTab) window.renderUnifiedKingTab('serasa');
                setTimeout(() => {
                    const inp = document.getElementById('serasa-search-input');
                    if (inp) { inp.focus(); inp.value = v; inp.setSelectionRange(v.length, v.length); }
                }, 0);
            };
            if (window._kingFinanceSerasaUpdateExcluirBtn) window._kingFinanceSerasaUpdateExcluirBtn();
            return;
        }
    }

    window._kingFinanceOpenModal = function (modalType) {
        const modal = document.getElementById('king-finance-modal');
        const formEl = document.getElementById('king-finance-modal-form');
        const titleEl = document.getElementById('king-finance-modal-title');
        if (!modal || !formEl || !titleEl) return;
        window._kingFinanceModalType = modalType;
        const titles = { fluxo: 'Novo lançamento', trabalho: 'Novo trabalho', bem: 'Novo bem', cartao: 'Novo cartão', divida: 'Novo acordo' };
        titleEl.textContent = titles[modalType] || 'Novo';
        let fields = '';
        if (modalType === 'fluxo') {
            const cards = window._kingFinanceCards || [];
            const cardOpts = cards.map(c => '<option value="' + (c.id || '') + '">' + (c.name || 'Cartão').replace(/</g, ' ').slice(0, 30) + '</option>').join('');
            fields = `
                <select name="tipo" id="fluxo-tipo-kf" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;"><option value="despesa">Saída</option><option value="receita">Entrada</option></select>
                <div id="fluxo-forma-wrap-kf" style="display:none;"><p style="margin:0 0 6px 0;font-size:11px;color:#94a3b8;">Forma de pagamento</p><select name="forma" id="fluxo-forma-kf" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;"><option value="pix">PIX</option><option value="cartao">Cartão de crédito</option></select><div id="fluxo-cartao-wrap-kf" style="display:none;margin-top:8px;"><select name="cartao_id" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;"><option value="">Selecione o cartão</option>${cardOpts}</select></div></div>
                <input name="descricao" placeholder="O que foi?" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;">
                <input name="valor" type="number" step="0.01" placeholder="Valor R$" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;">
                <input name="data" type="date" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;">
            `;
        } else if (modalType === 'trabalho') {
            fields = `
                <input name="cliente" placeholder="Nome do cliente" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;">
                <input name="servico" placeholder="Qual serviço?" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;">
                <input name="valor" type="number" step="0.01" placeholder="Valor R$" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;">
            `;
        } else if (modalType === 'bem') {
            const baseStyle = 'width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;';
            fields = `
                <input name="nome" placeholder="Ferramenta ou objeto emprestado" required style="${baseStyle}">
                <input name="possuidor" placeholder="Quem está com a ferramenta?" required style="${baseStyle}">
                <input name="valorAluguel" type="number" step="0.01" min="0" placeholder="Valor aluguel R$ (opcional)" style="${baseStyle}">
                <label style="font-size:0.8rem;color:var(--finance-text-secondary);margin:8px 0 4px 0;display:block;">Data que foi emprestada</label>
                <input name="dataEmprestimo" type="date" style="${baseStyle}">
                <label style="font-size:0.8rem;color:var(--finance-text-secondary);margin:8px 0 4px 0;display:block;">Previsão para entrega</label>
                <input name="previsaoEntrega" type="date" style="${baseStyle}">
                <div style="margin:12px 0;">
                    <p style="font-size:0.8rem;color:var(--finance-text-secondary);margin:0 0 8px 0;">Foto (ferramenta ou pessoa)</p>
                    <div class="kf-bem-photo-row" style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button type="button" id="bem-btn-camera-kf" style="padding:10px 16px;background:rgba(168,85,247,0.3);border:1px solid rgba(168,85,247,0.6);color:#a78bfa;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;"><i class="fas fa-camera" style="margin-right:6px;"></i>Tirar foto</button>
                        <button type="button" id="bem-btn-import-kf" style="padding:10px 16px;background:rgba(168,85,247,0.3);border:1px solid rgba(168,85,247,0.6);color:#a78bfa;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;"><i class="fas fa-file-image" style="margin-right:6px;"></i>Importar foto</button>
                        <input type="file" id="bem-foto-camera-kf" accept="image/*" capture="environment" style="display:none">
                        <input type="file" id="bem-foto-import-kf" accept="image/*" style="display:none">
                    </div>
                    <input type="hidden" name="foto">
                    <div id="bem-foto-preview-kf" style="margin-top:10px;"></div>
                </div>
            `;
        } else if (modalType === 'cartao') {
            fields = `
                <input name="nome" placeholder="Nome do banco" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;">
                <input name="limite" type="number" step="0.01" placeholder="Limite total R$" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;">
                <input name="diaFechamento" type="number" min="1" max="31" placeholder="Dia do fechamento (1 a 31)" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;">
            `;
        } else if (modalType === 'divida') {
            fields = `
                <input name="nome" placeholder="Credor (ex: Nubank)" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;">
                <input name="valorTotal" type="number" step="0.01" placeholder="Valor total dívida R$" required style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><input name="parcelas" type="number" placeholder="Nº parcelas" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;"><input name="valorParcela" type="number" step="0.01" placeholder="R$ parcela" style="width:100%;padding:12px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:1rem;color:#f1f5f9;font-size:12px;"></div>
            `;
        }
        formEl.innerHTML = fields + '<button type="submit" style="width:100%;padding:14px;background:#D4AF37;color:#000;border:none;border-radius:1rem;font-size:12px;font-weight:800;cursor:pointer;">Salvar no Sistema</button>';
        if (modalType === 'bem') {
            const processBemFotoKf = (file) => { if (!file || !file.type.match(/^image\//)) return; const r = new FileReader(); r.onload = () => { const b64 = r.result; const inp = formEl.querySelector('input[name="foto"]'); if (inp) inp.value = b64; const prev = document.getElementById('bem-foto-preview-kf'); if (prev) prev.innerHTML = '<div style="position:relative;display:inline-block;"><img src="' + (b64 || '').replace(/"/g, '&quot;') + '" style="max-width:120px;max-height:120px;border-radius:12px;object-fit:cover;border:1px solid rgba(255,255,255,0.2);" alt="Preview"><button type="button" onclick="window._kingFinanceRemoverFotoBem && window._kingFinanceRemoverFotoBem(\'bem-foto-preview-kf\')" style="position:absolute;top:-8px;right:-8px;width:28px;height:28px;border:none;background:rgba(239,68,68,0.9);color:#fff;font-size:18px;line-height:1;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);" title="Remover foto">&times;</button></div>'; }; r.readAsDataURL(file); };
            const camInpKf = document.getElementById('bem-foto-camera-kf'); const impInpKf = document.getElementById('bem-foto-import-kf'); const btnCamKf = document.getElementById('bem-btn-camera-kf'); const btnImpKf = document.getElementById('bem-btn-import-kf');
            if (btnCamKf && camInpKf) btnCamKf.onclick = () => { camInpKf.value = ''; camInpKf.click(); };
            if (btnImpKf && impInpKf) btnImpKf.onclick = () => { impInpKf.value = ''; impInpKf.click(); };
            if (camInpKf) camInpKf.onchange = () => { if (camInpKf.files && camInpKf.files[0]) processBemFotoKf(camInpKf.files[0]); };
            if (impInpKf) impInpKf.onchange = () => { if (impInpKf.files && impInpKf.files[0]) processBemFotoKf(impInpKf.files[0]); };
        }
        if (modalType === 'fluxo') {
            const tipoElKf = document.getElementById('fluxo-tipo-kf');
            const formaWrapKf = document.getElementById('fluxo-forma-wrap-kf');
            const formaElKf = document.getElementById('fluxo-forma-kf');
            const cartaoWrapKf = document.getElementById('fluxo-cartao-wrap-kf');
            if (tipoElKf && formaWrapKf) tipoElKf.onchange = function () { formaWrapKf.style.display = this.value === 'despesa' ? 'block' : 'none'; if (cartaoWrapKf) cartaoWrapKf.style.display = 'none'; };
            if (formaElKf && cartaoWrapKf) formaElKf.onchange = function () { cartaoWrapKf.style.display = this.value === 'cartao' ? 'block' : 'none'; };
        }
        formEl.onsubmit = async function (e) {
            e.preventDefault();
            const fd = new FormData(formEl);
            const data = Object.fromEntries(fd);
            const modalType = window._kingFinanceModalType;
            // Validação de valores numéricos
            if (modalType === 'fluxo') {
                const v = parseFloat(String(data.valor || '').replace(',', '.'));
                if (isNaN(v) || v <= 0) { alert('Informe um valor válido maior que zero.'); return; }
            } else if (modalType === 'cartao') {
                const limite = parseFloat(String(data.limite || '').replace(',', '.'));
                if (isNaN(limite) || limite <= 0) { alert('Informe um limite válido maior que zero.'); return; }
                const dia = data.diaFechamento ? parseInt(data.diaFechamento, 10) : null;
                if (dia !== null && (isNaN(dia) || dia < 1 || dia > 31)) { alert('Dia de fechamento deve ser entre 1 e 31.'); return; }
            } else if (modalType === 'trabalho') {
                const v = parseFloat(String(data.valor || '').replace(',', '.'));
                if (isNaN(v) || v <= 0) { alert('Informe um valor válido maior que zero.'); return; }
            } else if (modalType === 'bem') {
                const v = parseFloat(String(data.valorAluguel || '0').replace(',', '.'));
                if (isNaN(v) || v < 0) { alert('Valor de aluguel deve ser zero ou positivo.'); return; }
            } else if (modalType === 'divida') {
                const v = parseFloat(String(data.valorTotal || '').replace(',', '.'));
                if (isNaN(v) || v <= 0) { alert('Informe o valor total da dívida (maior que zero).'); return; }
            }
            if (modalType === 'fluxo') {
                try {
                    const profileId = localStorage.getItem('finance_current_profile_id') || null;
                    const bodyFluxoKf = { type: data.tipo === 'receita' ? 'INCOME' : 'EXPENSE', amount: parseFloat(data.valor) || 0, description: data.descricao || '', transaction_date: data.data || new Date().toISOString().slice(0, 10), profile_id: profileId ? parseInt(profileId, 10) : null };
                    if (data.tipo === 'despesa' && data.forma === 'cartao' && data.cartao_id) bodyFluxoKf.card_id = parseInt(data.cartao_id, 10) || null;
                    const res = await fetch(`${env.API_URL}/api/finance/transactions`, {
                        method: 'POST',
                        headers: Object.assign({ 'Content-Type': 'application/json' }, env.HEADERS_AUTH),
                        body: JSON.stringify(bodyFluxoKf)
                    });
                    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Erro ao criar');
                    window._kingFinanceTransactions = window._kingFinanceTransactions || [];
                    const created = (await res.json()).data || {};
                    window._kingFinanceTransactions.push(created);
                    modal.style.display = 'none';
                    if (document.getElementById('finance-king-content') && window.loadFinanceTransactions) {
                        await window.loadFinanceTransactions();
                        if (window._financeActiveTab === 'fluxo' && window.renderUnifiedKingTab) window.renderUnifiedKingTab('fluxo');
                    } else window.showKingFinancePane();
                } catch (err) {
                    alert(err.message || 'Erro ao salvar lançamento.');
                }
            }
            if (modalType === 'cartao') {
                try {
                    const res = await fetch(`${env.API_URL}/api/finance/cards`, {
                        method: 'POST',
                        headers: Object.assign({ 'Content-Type': 'application/json' }, env.HEADERS_AUTH),
                        body: JSON.stringify({
                            name: data.nome || '',
                            limit_amount: parseFloat(data.limite) || 0,
                            closing_day: data.diaFechamento ? parseInt(data.diaFechamento, 10) : null
                        })
                    });
                    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Erro ao criar');
                    const created = (await res.json()).data || {};
                    window._kingFinanceCards = window._kingFinanceCards || [];
                    window._kingFinanceCards.push(created);
                    modal.style.display = 'none';
                    if (document.getElementById('finance-king-content') && window.renderUnifiedKingTab) { window.renderUnifiedKingTab('cartoes'); } else window.showKingFinancePane();
                } catch (err) {
                    alert(err.message || 'Erro ao salvar cartão.');
                }
            } else {
                const id = Date.now().toString();
                const db = window._kingFinanceDb || { fluxo: [], trabalhos: [], bens: [], cartoes: [], dividas: [], terceiros: [] };
                const coll = { trabalho: 'trabalhos', bem: 'bens', divida: 'dividas' }[modalType];
                if (!coll) return;
                let entry = { id, ...data };
                if (modalType === 'trabalho') entry.valor = parseFloat(data.valor) || 0;
                if (modalType === 'bem') entry.valorAluguel = parseFloat(data.valorAluguel) || 0;
                if (modalType === 'divida') {
                    entry.valorTotal = parseFloat(data.valorTotal) || 0;
                    entry.valorParcela = parseFloat(data.valorParcela) || 0;
                    entry.parcelas = parseInt(data.parcelas, 10) || 0;
                    entry.pagamentos = [];
                }
                db[coll] = db[coll] || [];
                db[coll].unshift(entry);
                window._kingFinanceDb = db;
                if (window._kingFinancePersist) window._kingFinancePersist(db);
                modal.style.display = 'none';
                if (document.getElementById('finance-king-content') && window.renderUnifiedKingTab) {
                    var tab = window._financeActiveTab || 'fluxo';
                    if (modalType === 'divida') {
                        var d = window._kingFinanceDb.dividas || [];
                        var tdg = d.reduce(function (a, b) { return a + (Number(b.valorTotal) || 0); }, 0);
                        var tpg = d.reduce(function (a, b) { return a + (b.pagamentos || []).reduce(function (acc, p) { return acc + (Number(p.valor) || 0); }, 0); }, 0);
                        window._kingFinanceStats = window._kingFinanceStats || {};
                        window._kingFinanceStats.totalDividas = d.reduce(function (a, b) { var p = (b.pagamentos || []).reduce(function (ac, x) { return ac + (Number(x.valor) || 0); }, 0); return a + (Number(b.valorTotal) || 0) - p; }, 0);
                        var rawPct = tdg > 0 ? (tpg / tdg) * 100 : 100; window._kingFinanceStats.scoreSerasaPct = rawPct > 0 && rawPct < 1 ? Math.round(rawPct * 10) / 10 : Math.round(rawPct);
                        window._kingFinanceStats.scoreSerasaLabel = window._kingFinanceStats.scoreSerasaPct >= 100 ? 'Em dia' : window._kingFinanceStats.scoreSerasaPct >= 50 ? 'Em acordo' : 'Quitando';
                        var el1 = document.getElementById('finance-total-dividas'); if (el1) el1.textContent = 'R$ ' + (Number(window._kingFinanceStats.totalDividas) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                        var el2 = document.getElementById('finance-score-serasa'); if (el2) { var _s = window._kingFinanceStats.scoreSerasaPct; el2.textContent = (typeof _s === 'number' && _s > 0 && _s < 1 ? _s.toFixed(1).replace('.', ',') : Math.round(_s || 0)) + '% · ' + (window._kingFinanceStats.scoreSerasaLabel || '-'); }
                    }
                    window.renderUnifiedKingTab(tab);
                } else renderTab(document.querySelector('.kf-tab.active')?.getAttribute('data-king-tab') || 'fluxo');
                return;
            }
            modal.style.display = 'none';
        };
        window._kingFinanceModalType = modalType;
        modal.style.display = 'flex';
    };

    window._kingFinanceDelete = function (collection, id) {
        const db = window._kingFinanceDb || { fluxo: [], trabalhos: [], bens: [], cartoes: [], dividas: [], terceiros: [] };
        if (!db[collection]) return;
        db[collection] = db[collection].filter(item => String(item.id) !== String(id));
        window._kingFinanceDb = db;
        if (window._kingFinancePersist) window._kingFinancePersist(db);
        if (document.getElementById('finance-king-content') && window.renderUnifiedKingTab) {
            if (collection === 'dividas') {
                var d = db.dividas || [];
                window._kingFinanceStats = window._kingFinanceStats || {};
                window._kingFinanceStats.totalDividas = d.reduce(function (a, b) { var p = (b.pagamentos || []).reduce(function (ac, x) { return ac + (Number(x.valor) || 0); }, 0); return a + (Number(b.valorTotal) || 0) - p; }, 0);
                var tdg = d.reduce(function (a, b) { return a + (Number(b.valorTotal) || 0); }, 0);
                var tpg = d.reduce(function (a, b) { return a + (b.pagamentos || []).reduce(function (ac, p) { return ac + (Number(p.valor) || 0); }, 0); }, 0);
                var rawPct = tdg > 0 ? (tpg / tdg) * 100 : 100; window._kingFinanceStats.scoreSerasaPct = rawPct > 0 && rawPct < 1 ? Math.round(rawPct * 10) / 10 : Math.round(rawPct);
                window._kingFinanceStats.scoreSerasaLabel = window._kingFinanceStats.scoreSerasaPct >= 100 ? 'Em dia' : window._kingFinanceStats.scoreSerasaPct >= 50 ? 'Em acordo' : 'Quitando';
                var el1 = document.getElementById('finance-total-dividas'); if (el1) el1.textContent = 'R$ ' + (Number(window._kingFinanceStats.totalDividas) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                var el2 = document.getElementById('finance-score-serasa'); if (el2) { var _s = window._kingFinanceStats.scoreSerasaPct; el2.textContent = (typeof _s === 'number' && _s > 0 && _s < 1 ? _s.toFixed(1).replace('.', ',') : Math.round(_s || 0)) + '% · ' + (window._kingFinanceStats.scoreSerasaLabel || '-'); }
            }
            window.renderUnifiedKingTab(window._financeActiveTab || 'fluxo');
        } else renderTab(document.querySelector('.kf-tab.active')?.getAttribute('data-king-tab') || 'fluxo');
    };

    document.getElementById('king-finance-modal-cancel').addEventListener('click', () => {
        document.getElementById('king-finance-modal').style.display = 'none';
    });
    financeContent.querySelectorAll('.kf-tab').forEach(btn => {
        btn.addEventListener('click', () => renderTab(btn.getAttribute('data-king-tab')));
    });
    renderTab('fluxo');
};

function getFluxoPartialPayments() {
    try {
        if (window._kingFinanceFluxoPartial && typeof window._kingFinanceFluxoPartial === 'object') {
            return window._kingFinanceFluxoPartial;
        }
        // One-shot migrate de LS legado → memória
        var raw = localStorage.getItem('king_finance_fluxo_partial');
        if (!raw) return {};
        var o = JSON.parse(raw);
        var parsed = typeof o === 'object' && o !== null ? o : {};
        window._kingFinanceFluxoPartial = parsed;
        try { localStorage.removeItem('king_finance_fluxo_partial'); } catch (e2) {}
        return parsed;
    } catch (e) { return {}; }
}
function setFluxoPartialPayments(obj) {
    window._kingFinanceFluxoPartial = (typeof obj === 'object' && obj !== null) ? obj : {};
    try { localStorage.removeItem('king_finance_fluxo_partial'); } catch (e) {}
}
window.getFluxoPartialPayments = getFluxoPartialPayments;

function buildUnifiedFinanceFeed(apiTransactions, kingDb, currentMonth, currentYear) {
    const items = [];
    const today = new Date().toISOString().slice(0, 10);
    const toValidDateStr = (val) => {
        if (!val) return today;
        const s = String(val).trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
        if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) { const p = s.split('/'); return p[2] + '-' + p[1] + '-' + p[0]; }
        const d = new Date(s);
        return isNaN(d.getTime()) ? today : d.toISOString().slice(0, 10);
    };
    const parseDate = (str) => {
        const d = new Date(toValidDateStr(str));
        return isNaN(d.getTime()) ? new Date(0) : d;
    };
    var fluxoPartial = getFluxoPartialPayments();
    (apiTransactions || []).forEach(t => {
        var type = (t.type || '').toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE';
        var amount = parseFloat(t.amount || 0);
        var baseItem = {
            id: t.id,
            type: type,
            amount: amount,
            description: t.description || '',
            transaction_date: t.transaction_date || t.date || t.created_at,
            status: t.status,
            source: 'fluxo',
            category_name: t.category_name,
            category_icon: t.category_icon,
            category_color: t.category_color,
            account_name: t.account_name,
            is_recurring: t.is_recurring,
            installment_current: t.installment_current,
            installment_total: t.installment_total,
            created_at: t.created_at
        };
        if (type !== 'EXPENSE') {
            items.push(baseItem);
            return;
        }
        var partials = fluxoPartial[String(t.id)] || [];
        var totalPaid = partials.reduce(function (a, p) { return a + (Number(p.valor) || 0); }, 0);
        var restante = Math.max(0, amount - totalPaid);
        partials.forEach(function (p, i) {
            var v = Number(p.valor) || 0;
            if (v <= 0) return;
            var dt = toValidDateStr(p.data || today);
            items.push({
                id: 'fluxo-partial-' + t.id + '-' + i,
                type: 'EXPENSE',
                amount: v,
                description: (t.description || '') + ' (valor pago)',
                transaction_date: dt,
                status: 'PAID',
                source: 'fluxo',
                category_name: t.category_name,
                category_icon: t.category_icon,
                category_color: t.category_color,
                account_name: t.account_name,
                _fluxoParentId: t.id
            });
        });
        items.push({
            id: t.id,
            type: 'EXPENSE',
            amount: restante,
            description: t.description || '',
            transaction_date: t.transaction_date || t.date || t.created_at,
            status: restante > 0 ? 'PENDING' : 'PAID',
            source: 'fluxo',
            category_name: t.category_name,
            category_icon: t.category_icon,
            category_color: t.category_color,
            account_name: t.account_name,
            is_recurring: t.is_recurring,
            installment_current: t.installment_current,
            installment_total: t.installment_total,
            created_at: t.created_at,
            _fluxoOriginalAmount: amount,
            _fluxoTotalPaid: totalPaid
        });
    });
    (kingDb.trabalhos || []).forEach(t => {
        const val = Number(t.valor) || 0;
        const pagamentos = Array.isArray(t.pagamentos) ? t.pagamentos : [];
        const recebido = pagamentos.reduce((s, p) => s + (Number(p.valor) || 0), 0);
        const falta = Math.max(0, val - recebido);
        const descBase = [t.servico, t.cliente].filter(Boolean).join(' - ') || 'Serviço registrado';
        pagamentos.forEach((p, i) => {
            const v = Number(p.valor) || 0;
            if (v <= 0) return;
            const dt = toValidDateStr(p.data || t.data || t.created_at);
            items.push({ id: 'trab-pag-' + t.id + '-' + i, type: 'INCOME', amount: v, description: descBase + ' (entrada)', transaction_date: dt, source: 'trabalho', status: 'PAID' });
        });
        if (falta > 0) {
            const dt = toValidDateStr(t.dataPrevista || t.data || t.created_at);
            items.push({ id: 'trab-falta-' + t.id, type: 'INCOME', amount: falta, description: descBase + ' (falta receber)', transaction_date: dt, source: 'trabalho', status: 'PENDING' });
        }
    });
    (kingDb.bens || []).forEach(b => {
        const val = Number(b.valorAluguel) || 0;
        const desc = (b.nome ? b.nome + (b.possuidor ? ' com ' + b.possuidor : '') : 'Bem registrado').trim() || 'Ferramenta registrada';
        const dt = toValidDateStr(b.data || b.created_at);
        items.push({ id: 'bem-' + b.id, type: 'INCOME', amount: val, description: desc, transaction_date: dt, source: 'bem', status: 'PAID' });
    });
    (kingDb.dividas || []).forEach(d => {
        const dtCadastro = toValidDateStr(d.dataDivida || d.created_at);
        items.push({ id: 'serasa-add-' + d.id, type: 'EXPENSE', amount: Number(d.valorTotal) || 0, description: 'Acordo: ' + (d.nome || 'Credor'), transaction_date: dtCadastro, source: 'serasa', status: 'PAID' });
        (d.pagamentos || []).forEach((p, i) => {
            const v = Number(p.valor) || 0;
            if (v <= 0) return;
            const dt = toValidDateStr(p.data || dtCadastro) + (p.hora ? 'T' + String(p.hora).trim() : '');
            items.push({ id: 'serasa-pag-' + d.id + '-' + i, type: 'EXPENSE', amount: v, description: 'Pagamento acordo: ' + (d.nome || ''), transaction_date: dt, source: 'serasa', status: 'PAID' });
        });
    });
    (kingDb.terceiros || []).forEach(p => {
        (p.contas || []).forEach(c => {
            var dtConta = (c.dataVencimento || '').toString().trim();
            if (!dtConta || dtConta.length < 10) return;
            dtConta = toValidDateStr(dtConta.slice(0, 10));
            const valConta = Number(c.valor) || 0;
            if (valConta <= 0) return;
            var pago = (c.pagamentos || []).reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0);
            var restante = valConta - pago;
            var statusConta = restante <= 0 ? 'PAID' : 'PENDING';
            items.push({ id: 'terc-add-' + p.id + '-' + c.id, type: 'EXPENSE', amount: valConta, description: 'Dívida ' + (p.nome || '') + ' - ' + (c.nomeConta || 'Conta'), transaction_date: dtConta, source: 'terceiros', status: statusConta, _pessoaId: p.id, _contaId: c.id });
        });
    });
    items.sort((a, b) => parseDate(b.transaction_date) - parseDate(a.transaction_date));
    return items;
}

window.loadFinanceTransactions = async function () {
    const transactionsList = document.getElementById('finance-transactions-list');
    if (!transactionsList) return;

    try {
        transactionsList.innerHTML = '<p style="color: var(--text-secondary, #888888); text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Carregando transações...</p>';

        const currentMonth = window.currentFinanceMonth !== undefined ? window.currentFinanceMonth : new Date().getMonth();
        const currentYear = window.currentFinanceYear !== undefined ? window.currentFinanceYear : new Date().getFullYear();
        const dateFrom = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
        const dateTo = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`;
        const profileId = window.currentFinanceProfileId || localStorage.getItem('finance_current_profile_id') || '';
        const url = `${env.API_URL}/api/finance/transactions?limit=500&orderBy=transaction_date&orderDir=DESC&dateFrom=${dateFrom}&dateTo=${dateTo}${profileId ? `&profile_id=${profileId}` : ''}`;

        const response = await fetch(url, {
            headers: env.HEADERS_AUTH
        });

        let apiTransactions = [];
        if (response.ok) {
            const responseData = await response.json();
            const result = responseData.data || responseData;
            apiTransactions = Array.isArray(result) ? result : (result.data || result.transactions || []);
        }

        const kingDb = window._kingFinanceDb || { fluxo: [], trabalhos: [], bens: [], cartoes: [], dividas: [], terceiros: [] };
        const unifiedFeed = buildUnifiedFinanceFeed(apiTransactions, kingDb, currentMonth, currentYear);

        window.allFinanceTransactions = unifiedFeed;
        window._kingFinanceTransactions = apiTransactions;

        var cardFilter = window._financeCardFilter;
        if (cardFilter === 'income' || cardFilter === 'expense' || cardFilter === 'all') {
            window.currentFinanceTab = cardFilter;
            window.currentFinanceFilter = null;
            renderFinanceTransactions(unifiedFeed, cardFilter);
            window._financeCardFilter = null;
        } else {
            renderFinanceTransactions(unifiedFeed, window.currentFinanceTab || 'all');
        }
        if (window.refreshFinanceSummaryCards) window.refreshFinanceSummaryCards();

    } catch (error) {
        console.error('Erro ao carregar transações:', error);
        const kingDb = window._kingFinanceDb || {};
        const feed = buildUnifiedFinanceFeed([], kingDb, window.currentFinanceMonth, window.currentFinanceYear);
        if (feed.length > 0) {
            window.allFinanceTransactions = feed;
            renderFinanceTransactions(feed, window.currentFinanceTab || 'all');
        } else {
            transactionsList.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: #EF4444; margin-bottom: 10px;"></i>
                <p style="color: #EF4444; margin-bottom: 15px;">Erro ao carregar transações.</p>
                <button class="btn btn-secondary" onclick="window.loadFinanceTransactions()">
                    <i class="fas fa-redo"></i> Tentar Novamente
                </button>
            </div>
        `;
        }
    }
}

function _financeTrabalhosTotals(kingDb) {
            if (!kingDb || !Array.isArray(kingDb.trabalhos)) return { totalRecebido: 0, totalFalta: 0 };
            var totalRecebido = kingDb.trabalhos.reduce(function (a, b) { return a + (Array.isArray(b.pagamentos) ? b.pagamentos.reduce(function (s, p) { return s + (Number(p.valor) || 0); }, 0) : 0); }, 0);
            var totalFalta = kingDb.trabalhos.reduce(function (a, b) { var v = Number(b.valor) || 0; var pago = Array.isArray(b.pagamentos) ? b.pagamentos.reduce(function (s, p) { return s + (Number(p.valor) || 0); }, 0) : 0; return a + Math.max(0, v - pago); }, 0);
            return { totalRecebido: totalRecebido, totalFalta: totalFalta };
        }
    window._financeTrabalhosTotals = _financeTrabalhosTotals;
    window.refreshFinanceSummaryCards = function () {
    const currentMonth = window.currentFinanceMonth !== undefined ? window.currentFinanceMonth : new Date().getMonth();
    const currentYear = window.currentFinanceYear !== undefined ? window.currentFinanceYear : new Date().getFullYear();
    const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthEnd = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`;
    const profileId = window.currentFinanceProfileId || localStorage.getItem('finance_current_profile_id') || '';
    fetch(`${env.API_URL}/api/finance/dashboard?dateFrom=${monthStart}&dateTo=${monthEnd}${profileId ? '&profile_id=' + profileId : ''}`, { headers: env.HEADERS_AUTH })
        .then(res => res.json())
        .then(responseData => {
            const data = responseData.data || responseData;
            var totalTerceirosEsteMes = 0;
            if (typeof window._kingFinanceTerceirosEsteMes === 'function' && window._kingFinanceDb && Array.isArray(window._kingFinanceDb.terceiros)) {
                totalTerceirosEsteMes = window._kingFinanceTerceirosEsteMes(window._kingFinanceDb.terceiros, currentYear, currentMonth + 1);
            }
            var trab = typeof window._financeTrabalhosTotals === 'function' ? window._financeTrabalhosTotals(window._kingFinanceDb || {}) : { totalRecebido: 0, totalFalta: 0 };
            var recebidoTrabalhosEsteMes = typeof window._kingFinanceRecebidoTrabalhosNoMes === 'function' ? window._kingFinanceRecebidoTrabalhosNoMes(window._kingFinanceDb || {}, currentYear, currentMonth + 1) : 0;
            var receitasFluxo = Number(data.totalIncome) || 0;
            var receitaFluxoPaga = Number(data.totalRecebido || data.totalIncomePaid) || (receitasFluxo - (Number(data.pendingIncome) || 0));
            var receitas = receitasFluxo + trab.totalRecebido + trab.totalFalta;
            var despesas = (Number(data.totalExpense) || 0) + totalTerceirosEsteMes;
            var receitasDet = data.receitasDetalhadas || {};
            var totalApi = (receitasDet.itens && receitasDet.itens.length > 0) ? (Number(receitasDet.total) || receitasDet.itens.reduce(function (s, x) { return s + (parseFloat(x.valor) || 0); }, 0)) : 0;
            var totalLocal = receitaFluxoPaga + recebidoTrabalhosEsteMes;
            var totalRecebido = totalApi > 0 ? Math.max(totalApi, totalLocal) : totalLocal;
            var balance = totalRecebido - despesas;
            var faltaReceberGeral = (Number(data.pendingIncome) || 0) + trab.totalFalta;
            var patrimonioExibir = Number(data.accountBalance) || Number(data.totalBalance) || 0;
            const accountBalanceMainEl = document.getElementById('finance-account-balance-main');
            if (accountBalanceMainEl) accountBalanceMainEl.textContent = 'R$ ' + formatCurrency(patrimonioExibir);
            const incomeCardEl = document.getElementById('finance-income-card');
            if (incomeCardEl) incomeCardEl.textContent = '+R$ ' + formatCurrency(totalRecebido);
            const expenseCardEl = document.getElementById('finance-expense-card');
            if (expenseCardEl) expenseCardEl.textContent = '-R$ ' + formatCurrency(despesas);
            const pendingIncomeEl = document.getElementById('finance-pending-income');
            if (pendingIncomeEl) pendingIncomeEl.textContent = 'R$ ' + formatCurrency(faltaReceberGeral);
            var faltaPagarEsteMes = (Number(data.pendingExpense) || 0) + totalTerceirosEsteMes;
            var fluxoPartial = typeof getFluxoPartialPayments === 'function' ? getFluxoPartialPayments() : {};
            var mesRef = currentYear + '-' + String(currentMonth + 1).padStart(2, '0');
            var totalFluxoPartialPaid = 0;
            (window._kingFinanceTransactions || []).forEach(function (t) {
                if ((t.type || '').toUpperCase() !== 'EXPENSE') return;
                var dt = (t.transaction_date || t.date || '').toString().trim().slice(0, 7);
                if (dt !== mesRef) return;
                (fluxoPartial[String(t.id)] || []).forEach(function (p) {
                    var d = (p.data || '').toString().trim().slice(0, 7);
                    if (d === mesRef) totalFluxoPartialPaid += Number(p.valor) || 0;
                });
            });
            faltaPagarEsteMes = Math.max(0, faltaPagarEsteMes - totalFluxoPartialPaid);
            var totalTerceirosMesesAnt = typeof window._kingFinanceTerceirosMesesAnteriores === 'function' ? window._kingFinanceTerceirosMesesAnteriores(window._kingFinanceDb || {}, currentYear, currentMonth + 1) : 0;
            const pendingExpenseEl = document.getElementById('finance-pending-expense');
            if (pendingExpenseEl) pendingExpenseEl.textContent = 'R$ ' + formatCurrency(faltaPagarEsteMes);
            const pendingExpensePrevEl = document.getElementById('finance-pending-expense-previous');
            if (pendingExpensePrevEl) pendingExpensePrevEl.textContent = 'R$ ' + formatCurrency((Number(data.pendingExpensePreviousMonths) || 0) + totalTerceirosMesesAnt);
            const accountBalanceEl = document.getElementById('finance-account-balance');
            if (accountBalanceEl) accountBalanceEl.textContent = 'R$ ' + formatCurrency(patrimonioExibir);
            const paidIncomeEl = document.getElementById('finance-paid-income');
            if (paidIncomeEl) paidIncomeEl.textContent = 'R$ ' + formatCurrency(totalRecebido);
            const paidExpenseEl = document.getElementById('finance-paid-expense');
            var valorOQueFoiPago = Number(data.totalExpensePaid || data.totalPago) || 0;
            if (typeof financeTransactionsCurrentMonthOnly === 'function' && Array.isArray(window.allFinanceTransactions)) {
                var doMesPago = financeTransactionsCurrentMonthOnly(window.allFinanceTransactions);
                var somaPago = doMesPago.filter(function (t) { return (t.type || '').toUpperCase() === 'EXPENSE' && (t.status || '').toUpperCase() === 'PAID'; }).reduce(function (s, t) { return s + (parseFloat(t.amount) || 0); }, 0);
                valorOQueFoiPago = somaPago;
            }
            var terceirosPagoEsteMes = typeof window._kingFinanceTerceirosPagoEsteMes === 'function' && window._kingFinanceDb && Array.isArray(window._kingFinanceDb.terceiros) ? window._kingFinanceTerceirosPagoEsteMes(window._kingFinanceDb.terceiros, currentYear, currentMonth + 1) : 0;
            valorOQueFoiPago = (Number(valorOQueFoiPago) || 0) + (Number(terceirosPagoEsteMes) || 0);
            if (paidExpenseEl) paidExpenseEl.textContent = 'R$ ' + formatCurrency(valorOQueFoiPago);
            const balanceReceitasEl = document.getElementById('finance-balance-receitas');
            const balanceDespesasEl = document.getElementById('finance-balance-despesas');
            const balanceResultEl = document.getElementById('finance-balance-result');
            if (balanceReceitasEl) balanceReceitasEl.textContent = 'R$ ' + formatCurrency(totalRecebido);
            if (balanceDespesasEl) balanceDespesasEl.textContent = 'R$ ' + formatCurrency(despesas);
            if (balanceResultEl) { balanceResultEl.textContent = 'R$ ' + formatCurrency(Math.abs(balance)); balanceResultEl.style.color = balance >= 0 ? '#22c55e' : '#ef4444'; }
        })
        .catch(function () { });
};

window.openFinanceDetailModal = async function (type) {
    var fmt = function (v) { return (Number(v) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
    var monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    var currentYear = window.currentFinanceYear !== undefined ? window.currentFinanceYear : new Date().getFullYear();
    var currentMonth = window.currentFinanceMonth !== undefined ? window.currentFinanceMonth : new Date().getMonth();
    var mesNome = monthNames[currentMonth] + ' de ' + currentYear;

    var existing = document.getElementById('finance-detail-modal');
    if (existing) existing.remove();
    var modal = document.createElement('div');
    modal.id = 'finance-detail-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;';
    var content = '';

    var breakdown = window._financeIncomeBreakdown || {};
    var receitasDetalhadas = breakdown.receitasDetalhadas || { itens: [], total: 0 };
    var saldoDetalhado = breakdown.saldoDetalhado || { itens: [], total: 0 };

    function renderBreakdownList(itens, total) {
        if (!itens || itens.length === 0) return '<p style="color:#94a3b8;text-align:center;padding:2rem;">Nenhum lançamento encontrado.</p>';
        var html = itens.map(function (item) {
            var dt = (item.data || '').toString().slice(0, 10);
            if (dt && dt.length >= 10) { var p = dt.split('-'); dt = p[2] + '/' + p[1] + '/' + p[0]; } else dt = '-';
            var origem = (item.origem || '').toLowerCase();
            var origemLabel = origem === 'transacao' ? 'Lançamento' : origem === 'trabalho' ? 'Trabalho' : origem === 'recibo' ? 'Recibo' : 'Outro';
            var desc = (item.cliente ? item.cliente + ' · ' : '') + (item.descricao || '');
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);"><div><span style="color:#f1f5f9;">' + (desc || '-').replace(/</g, ' ').slice(0, 55) + '</span><br><span style="font-size:0.8rem;color:#64748b;">' + dt + ' · ' + origemLabel + '</span></div><strong style="color:#22c55e;">+R$ ' + fmt(item.valor) + '</strong></div>';
        }).join('');
        return html;
    }

    if (type === 'expense') {
        if (typeof window.loadFinanceTransactions === 'function') await window.loadFinanceTransactions();
        var allTx = window.allFinanceTransactions || [];
        var mesRef = currentYear + '-' + String(currentMonth + 1).padStart(2, '0');
        function extrairAnoMesExp(d) {
            var s = (d || '').toString().trim();
            if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
            var p = s.split(/[\/\-]/);
            if (p.length >= 3) { var y = p[2].length === 4 ? p[2] : p[0]; var m = p[1] && p[1].length <= 2 ? p[1] : p[0]; return y + '-' + String(m).padStart(2, '0'); }
            return '';
        }
        var transactions = allTx.filter(function (t) { return extrairAnoMesExp(t.transaction_date || t.date) === mesRef; });
        var expenses = transactions.filter(function (t) { return (t.type || '').toUpperCase() === 'EXPENSE' && (t.status || '').toUpperCase() === 'PAID'; });
        var totalExp = expenses.reduce(function (s, t) { return s + (parseFloat(t.amount) || 0); }, 0);
        var listItems = expenses.map(function (t) {
            var dt = (t.transaction_date || t.date || '').toString().slice(0, 10);
            if (dt && dt.length >= 10 && dt.indexOf('-') >= 0) { var p = dt.split('-'); dt = p[2] + '/' + p[1] + '/' + p[0]; } else if (dt && dt.indexOf('/') >= 0) { /* já dd/mm/yyyy */ }
            return { desc: (t.description || '').replace(/</g, ' ').slice(0, 50), dt: dt, valor: parseFloat(t.amount) || 0, tipo: 'fluxo' };
        });
        var terceirosDb = window._kingFinanceDb || {};
        (terceirosDb.terceiros || []).forEach(function (p) {
            (p.contas || []).forEach(function (c) {
                (c.pagamentos || []).forEach(function (x) {
                    var dtPag = (x.data || c.dataVencimento || '').toString().trim();
                    if (extrairAnoMesExp(dtPag) !== mesRef) return;
                    var dtExib = dtPag; if (dtExib && dtExib.indexOf('-') >= 0 && dtExib.length >= 10) { var pp = dtExib.split('-'); dtExib = pp[2] + '/' + pp[1] + '/' + pp[0]; }
                    listItems.push({ desc: (p.nome || 'Pessoa') + ' - ' + (c.nomeConta || 'Conta'), dt: dtExib, valor: Number(x.valor) || 0, tipo: 'terceiros' });
                    totalExp += Number(x.valor) || 0;
                });
            });
        });
        listItems.sort(function (a, b) { return (a.dt || '').localeCompare(b.dt || ''); });
        var listHtml = listItems.length === 0 ? '<p style="color:#94a3b8;text-align:center;padding:2rem;">Nenhuma despesa paga neste mês.</p>' : listItems.map(function (it) { return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);"><div><span style="color:#f1f5f9;">' + (it.desc || '-') + '</span><br><span style="font-size:0.8rem;color:#64748b;">' + (it.dt || '-') + ' · Pago</span></div><strong style="color:#ef4444;">-R$ ' + fmt(it.valor) + '</strong></div>'; }).join('');
        content = '<h2 style="margin:0 0 20px 0;color:#f1f5f9;font-size:1.35rem;"><i class="fas fa-check-circle" style="color:#ef4444;margin-right:10px;"></i>O que foi pago - ' + mesNome + '</h2><p style="color:#94a3b8;font-size:0.9rem;margin:0 0 16px 0;">Despesas efetivamente pagas neste mês (fluxo + Quem eu devo).</p><div style="max-height:320px;overflow-y:auto;margin-bottom:16px;">' + listHtml + '</div><div style="font-size:1.25rem;font-weight:800;color:#ef4444;padding-top:12px;border-top:2px solid rgba(239,68,68,0.3);">Total: -R$ ' + fmt(totalExp) + '</div>';
    } else if (type === 'income') {
        var itensReceitas = [];
        var totalReceitas = 0;
        try {
            var profileIdInc = localStorage.getItem('finance_current_profile_id') || '';
            var monthStart = currentYear + '-' + String(currentMonth + 1).padStart(2, '0') + '-01';
            var lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
            var monthEnd = currentYear + '-' + String(currentMonth + 1).padStart(2, '0') + '-' + lastDay;
            var urlInc = (typeof env.API_URL !== 'undefined' ? env.API_URL : '') + '/api/finance/income-breakdown?scope=monthly&dateFrom=' + monthStart + '&dateTo=' + monthEnd + (profileIdInc ? '&profile_id=' + encodeURIComponent(profileIdInc) : '');
            var resInc = await fetch(urlInc, { headers: typeof getAuthHeaders === 'function' ? env.getAuthHeaders() : (function(){ var t=localStorage.getItem('conectaKingToken')||''; var h={}; if(t) h.Authorization='Bearer '+t; return h; })() });
            if (resInc.ok) {
                var dataIncPayload = await resInc.json();
                var dataInc = dataIncPayload.data || dataIncPayload;
                itensReceitas = dataInc.itens || [];
                totalReceitas = Number(dataInc.total) || itensReceitas.reduce(function (s, x) { return s + (parseFloat(x.valor) || 0); }, 0);
            }
        } catch (e) { }
        if (itensReceitas.length === 0) {
            var bdInc = breakdown.receitasDetalhadas || {};
            itensReceitas = bdInc.itens || [];
            totalReceitas = Number(bdInc.total) || itensReceitas.reduce(function (s, x) { return s + (parseFloat(x.valor) || 0); }, 0);
        }
        if (itensReceitas.length === 0 && typeof window.loadFinanceTransactions === 'function') await window.loadFinanceTransactions();
        if (itensReceitas.length === 0) {
            var allTxInc = window.allFinanceTransactions || [];
            var mesRefInc = currentYear + '-' + String(currentMonth + 1).padStart(2, '0');
            function extrairAnoMes(d) {
                var s = (d || '').toString().trim();
                if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
                var p = s.split(/[\/\-]/);
                if (p.length >= 3) { var y = p[2].length === 4 ? p[2] : p[0]; var m = p[1] && p[1].length <= 2 ? p[1] : p[0]; return y + '-' + String(m).padStart(2, '0'); }
                return '';
            }
            var txMesInc = allTxInc.filter(function (t) { return extrairAnoMes(t.transaction_date || t.date) === mesRefInc; });
            var receitasPagas = txMesInc.filter(function (t) { return (t.type || '').toUpperCase() === 'INCOME' && (t.status || '').toUpperCase() === 'PAID'; });
            itensReceitas = receitasPagas.map(function (t) {
                var dt = (t.transaction_date || t.date || '').toString().slice(0, 10);
                var origem = (t.source || 'fluxo') === 'trabalho' ? 'trabalho' : (t.source || 'fluxo') === 'bem' ? 'bem' : 'transacao';
                return { origem: origem, descricao: t.description || '', cliente: t.client_name || null, valor: parseFloat(t.amount) || 0, data: dt };
            });
        }
        totalReceitas = itensReceitas.reduce(function (s, x) { return s + (parseFloat(x.valor) || 0); }, 0);
        itensReceitas.sort(function (a, b) { return (b.data || '').localeCompare(a.data || ''); });
        content = '<h2 style="margin:0 0 20px 0;color:#f1f5f9;font-size:1.35rem;"><i class="fas fa-arrow-trend-up" style="color:#22c55e;margin-right:10px;"></i>De onde veio - Receitas de ' + mesNome + '</h2><p style="color:#94a3b8;font-size:0.9rem;margin:0 0 16px 0;">Origem de cada valor recebido no mês (transações, trabalhos, recibos). Mesma base do Saldo.</p><div style="max-height:320px;overflow-y:auto;margin-bottom:16px;">' + renderBreakdownList(itensReceitas) + '</div><div style="font-size:1.25rem;font-weight:800;color:#22c55e;padding-top:12px;border-top:2px solid rgba(34,197,94,0.3);">Total: +R$ ' + fmt(totalReceitas) + '</div>';
    } else if (type === 'balance' || type === 'goals') {
        var bd = (type === 'goals' && window._financeGoalsBreakdown) ? window._financeGoalsBreakdown : saldoDetalhado;
        var itensSaldo = bd.itens || [];
        var totalSaldo = bd.total || 0;
        if (itensSaldo.length === 0) {
            try {
                var profileIdBreakdown = localStorage.getItem('finance_current_profile_id') || '';
                var urlBreakdown = (typeof env.API_URL !== 'undefined' ? env.API_URL : '') + '/api/finance/income-breakdown?scope=accumulated' + (profileIdBreakdown ? '&profile_id=' + encodeURIComponent(profileIdBreakdown) : '');
                var resBreakdown = await fetch(urlBreakdown, { headers: typeof getAuthHeaders === 'function' ? env.getAuthHeaders() : (function(){ var t=localStorage.getItem('conectaKingToken')||''; var h={}; if(t) h.Authorization='Bearer '+t; return h; })() });
                if (resBreakdown.ok) {
                    var dataBreakdown = await resBreakdown.json();
                    var result = dataBreakdown.data || dataBreakdown;
                    itensSaldo = result.itens || [];
                    totalSaldo = result.total || 0;
                }
            } catch (e) { }
        }
        if (itensSaldo.length === 0) {
            if (typeof window.loadFinanceTransactions === 'function') await window.loadFinanceTransactions();
            var receitasPagasAll = (window.allFinanceTransactions || []).filter(function (t) { return (t.type || '').toUpperCase() === 'INCOME' && (t.status || '').toUpperCase() === 'PAID'; });
            itensSaldo = receitasPagasAll.map(function (t) {
                var dt = (t.transaction_date || t.date || '').toString().slice(0, 10);
                var origem = (t.source || 'fluxo') === 'trabalho' ? 'trabalho' : (t.source || 'fluxo') === 'bem' ? 'bem' : 'transacao';
                return { origem: origem, descricao: t.description || '', cliente: t.client_name || null, valor: parseFloat(t.amount) || 0, data: dt };
            });
            totalSaldo = itensSaldo.reduce(function (s, x) { return s + (x.valor || 0); }, 0);
        }
        var tituloGoals = type === 'goals' ? 'Valor já ganho (Metas)' : 'Saldo disponível';
        content = '<h2 style="margin:0 0 20px 0;color:#f1f5f9;font-size:1.35rem;"><i class="fas fa-wallet" style="color:#3b82f6;margin-right:10px;"></i>De onde veio - ' + tituloGoals + '</h2><p style="color:#94a3b8;font-size:0.9rem;margin:0 0 16px 0;">Origem do seu patrimônio (receitas acumuladas de transações, trabalhos e recibos).</p><div style="max-height:320px;overflow-y:auto;margin-bottom:16px;">' + renderBreakdownList(itensSaldo) + '</div><div style="font-size:1.25rem;font-weight:800;color:#3b82f6;padding-top:12px;border-top:2px solid rgba(59,130,246,0.3);">Total: R$ ' + fmt(totalSaldo) + '</div>';
    } else {
        if (typeof window.loadFinanceTransactions === 'function') await window.loadFinanceTransactions();
        var allTx2 = window.allFinanceTransactions || [];
        var mesRef2 = currentYear + '-' + String(currentMonth + 1).padStart(2, '0');
        var transactions2 = allTx2.filter(function (t) { var dt = (t.transaction_date || t.date || '').toString().trim().slice(0, 7); return dt === mesRef2; });
        var rec = transactions2.filter(function (t) { return (t.type || '').toUpperCase() === 'INCOME'; }).reduce(function (s, t) { return s + (parseFloat(t.amount) || 0); }, 0);
        var des = transactions2.filter(function (t) { return (t.type || '').toUpperCase() === 'EXPENSE'; }).reduce(function (s, t) { return s + (parseFloat(t.amount) || 0); }, 0);
        var saldo = rec - des;
        content = '<h2 style="margin:0 0 20px 0;color:#f1f5f9;font-size:1.35rem;"><i class="fas fa-wallet" style="color:#3b82f6;margin-right:10px;"></i>Saldo de ' + mesNome + '</h2><div style="display:grid;gap:16px;"><div style="display:flex;justify-content:space-between;align-items:center;padding:16px;background:rgba(34,197,94,0.1);border-radius:12px;border:1px solid rgba(34,197,94,0.3);"><span style="color:#94a3b8;">Receitas</span><strong style="color:#22c55e;font-size:1.25rem;">+R$ ' + fmt(rec) + '</strong></div><div style="display:flex;justify-content:space-between;align-items:center;padding:16px;background:rgba(239,68,68,0.1);border-radius:12px;border:1px solid rgba(239,68,68,0.3);"><span style="color:#94a3b8;">Despesas</span><strong style="color:#ef4444;font-size:1.25rem;">-R$ ' + fmt(des) + '</strong></div><div style="display:flex;justify-content:space-between;align-items:center;padding:16px;background:rgba(59,130,246,0.1);border-radius:12px;border:1px solid rgba(59,130,246,0.3);"><span style="color:#94a3b8;">Balanço</span><strong style="color:' + (saldo >= 0 ? '#22c55e' : '#ef4444') + ';font-size:1.5rem;">R$ ' + fmt(Math.abs(saldo)) + '</strong></div></div>';
    }
    modal.innerHTML = '<div style="background:#16161a;border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:28px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.5);">' + content + '<div style="margin-top:24px;"><button type="button" onclick="document.getElementById(\'finance-detail-modal\') && document.getElementById(\'finance-detail-modal\').remove()" style="width:100%;padding:14px;background:var(--finance-indigo,#3b82f6);color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;font-size:1rem;">Fechar</button></div></div>';
    modal.onclick = function (e) { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
};

function formatCurrency(value) {
    return parseFloat(value || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

window.financeMarkAsPaid = async function (id, source, pessoaId, contaId) {
    if (source === 'terceiros' && pessoaId && contaId) {
        var db = window._kingFinanceDb || { terceiros: [] };
        var person = (db.terceiros || []).find(function (p) { return p.id === pessoaId; });
        if (!person) { alert('Pessoa não encontrada.'); return; }
        var conta = (person.contas || []).find(function (c) { return String(c.id) === String(contaId); });
        if (!conta) { alert('Conta não encontrada.'); return; }
        var pago = (conta.pagamentos || []).reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0);
        var restante = (Number(conta.valor) || 0) - pago;
        if (restante <= 0) { alert('Esta conta já está quitada.'); return; }
        var hoje = new Date().toISOString().slice(0, 10);
        conta.pagamentos = conta.pagamentos || [];
        conta.pagamentos.push({ valor: restante, data: hoje, hora: '' });
        window._kingFinanceDb = db;
        if (window._kingFinancePersist) window._kingFinancePersist(db);
        if (window.loadFinanceTransactions) await window.loadFinanceTransactions();
        if (window.refreshFinanceSummaryCards) window.refreshFinanceSummaryCards();
        if (window.renderUnifiedKingTab && window._financeActiveTab === 'terceiros') window.renderUnifiedKingTab('terceiros');
        return;
    }
    if (source === 'fluxo' && id && (typeof id === 'number' || String(id).match(/^[0-9]+$/))) {
        try {
            var res = await fetch(env.API_URL + '/api/finance/transactions/' + id, { method: 'GET', headers: env.HEADERS_AUTH });
            if (!res.ok) throw new Error('Erro ao carregar transação');
            var dataPayload = await res.json();
            var data = dataPayload.data || dataPayload;
            var body = { type: data.type || 'EXPENSE', amount: parseFloat(data.amount) || 0, description: data.description || '', transaction_date: (data.transaction_date || data.date || '').slice(0, 10), status: 'PAID' };
            if (data.category_id != null) body.category_id = data.category_id;
            if (data.account_id != null) body.account_id = data.account_id;
            if (data.card_id != null) body.card_id = data.card_id;
            var patchRes = await fetch(env.API_URL + '/api/finance/transactions/' + id, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, env.HEADERS_AUTH), body: JSON.stringify(body) });
            if (!patchRes.ok) throw new Error((await patchRes.json().catch(function () { return {}; })).message || 'Erro ao marcar como pago');
            if (window.loadFinanceTransactions) await window.loadFinanceTransactions();
            if (window.refreshFinanceSummaryCards) window.refreshFinanceSummaryCards();
        } catch (e) { alert(e.message || 'Erro ao marcar como pago.'); }
    }
};

window.financeRestoreToPending = async function (id, source, pessoaId, contaId) {
    if (source === 'terceiros' && pessoaId && contaId) {
        var db = window._kingFinanceDb || { terceiros: [] };
        var person = (db.terceiros || []).find(function (p) { return p.id === pessoaId; });
        if (!person) { alert('Pessoa não encontrada.'); return; }
        var conta = (person.contas || []).find(function (c) { return String(c.id) === String(contaId); });
        if (!conta || !(conta.pagamentos || []).length) { alert('Nenhum pagamento para desfazer nesta conta.'); return; }
        conta.pagamentos = conta.pagamentos.slice(0, -1);
        window._kingFinanceDb = db;
        if (window._kingFinancePersist) window._kingFinancePersist(db);
        if (window.loadFinanceTransactions) await window.loadFinanceTransactions();
        if (window.refreshFinanceSummaryCards) window.refreshFinanceSummaryCards();
        if (window.renderUnifiedKingTab && window._financeActiveTab === 'terceiros') window.renderUnifiedKingTab('terceiros');
        return;
    }
    if (source === 'fluxo' && id && (typeof id === 'number' || String(id).match(/^[0-9]+$/))) {
        try {
            var res = await fetch(env.API_URL + '/api/finance/transactions/' + id, { method: 'GET', headers: env.HEADERS_AUTH });
            if (!res.ok) throw new Error('Erro ao carregar transação');
            var dataPayload = await res.json();
            var data = dataPayload.data || dataPayload;
            var body = { type: data.type || 'EXPENSE', amount: parseFloat(data.amount) || 0, description: data.description || '', transaction_date: (data.transaction_date || data.date || '').slice(0, 10), status: 'PENDING' };
            if (data.category_id != null) body.category_id = data.category_id;
            if (data.account_id != null) body.account_id = data.account_id;
            if (data.card_id != null) body.card_id = data.card_id;
            var patchRes = await fetch(env.API_URL + '/api/finance/transactions/' + id, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, env.HEADERS_AUTH), body: JSON.stringify(body) });
            if (!patchRes.ok) throw new Error((await patchRes.json().catch(function () { return {}; })).message || 'Erro ao restaurar');
            if (window.loadFinanceTransactions) await window.loadFinanceTransactions();
            if (window.refreshFinanceSummaryCards) window.refreshFinanceSummaryCards();
        } catch (e) { alert(e.message || 'Erro ao restaurar dívida.'); }
    }
};

window.financeShowPartialPaymentModal = function (pessoaId, contaId, desc) {
    var db = window._kingFinanceDb || { terceiros: [] };
    var person = (db.terceiros || []).find(function (p) { return p.id === pessoaId; });
    if (!person) { alert('Pessoa não encontrada.'); return; }
    var conta = (person.contas || []).find(function (c) { return String(c.id) === String(contaId); });
    if (!conta) { alert('Conta não encontrada.'); return; }
    var pago = (conta.pagamentos || []).reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0);
    var restante = Math.max(0, (Number(conta.valor) || 0) - pago);
    if (restante <= 0) { alert('Esta conta já está quitada.'); return; }
    var fmt = function (v) { return (Number(v) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
    var existing = document.getElementById('finance-partial-payment-modal');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.id = 'finance-partial-payment-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
    overlay.innerHTML = '<div style="background:var(--finance-card-dark,#16161a);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;max-width:400px;width:100%;">' +
        '<h3 style="margin:0 0 16px 0;color:#f1f5f9;font-size:1.1rem;">Adicionar pagamento</h3>' +
        '<p style="color:#94a3b8;font-size:0.85rem;margin:0 0 8px 0;">' + (desc || '').replace(/</g, ' ').slice(0, 50) + '</p>' +
        '<p style="color:#64748b;font-size:0.8rem;margin:0 0 16px 0;">Falta pagar: R$ ' + fmt(restante) + '</p>' +
        '<label style="display:block;margin-bottom:6px;font-size:0.85rem;color:#e2e8f0;">Valor a pagar (R$)</label>' +
        '<input type="text" id="finance-partial-value-input" placeholder="Ex: 150,00" value="" style="width:100%;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.06);color:#f1f5f9;font-size:1rem;box-sizing:border-box;">' +
        '<div style="display:flex;gap:10px;margin-top:20px;">' +
        '<button type="button" id="finance-partial-cancel" style="flex:1;padding:12px;border:1px solid rgba(255,255,255,0.2);border-radius:10px;background:transparent;color:#94a3b8;font-weight:600;cursor:pointer;">Cancelar</button>' +
        '<button type="button" id="finance-partial-confirm" style="flex:1;padding:12px;border:none;border-radius:10px;background:#3b82f6;color:#fff;font-weight:700;cursor:pointer;"><i class="fas fa-check" style="margin-right:6px;"></i>Adicionar pagamento</button>' +
        '</div></div>';
    overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
    var inputEl = document.getElementById('finance-partial-value-input');
    if (inputEl) {
        inputEl.focus();
        inputEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') document.getElementById('finance-partial-confirm').click(); });
    }
    document.getElementById('finance-partial-cancel').onclick = function () { overlay.remove(); };
    document.getElementById('finance-partial-confirm').onclick = function () {
        var raw = (inputEl && inputEl.value || '').trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
        var valor = parseFloat(raw) || 0;
        if (valor <= 0) { alert('Informe um valor maior que zero.'); return; }
        if (valor > restante) valor = restante;
        overlay.remove();
        window.financeAddPartialPayment(pessoaId, contaId, valor);
    };
};

window.financeShowPartialPaymentModalFluxo = function (transactionId, amount, description) {
    var total = parseFloat(amount) || 0;
    if (total <= 0) { alert('Valor inválido.'); return; }
    var fmt = function (v) { return (Number(v) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
    var existing = document.getElementById('finance-partial-fluxo-modal');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.id = 'finance-partial-fluxo-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
    overlay.innerHTML = '<div style="background:var(--finance-card-dark,#16161a);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;max-width:400px;width:100%;">' +
        '<h3 style="margin:0 0 16px 0;color:#f1f5f9;font-size:1.1rem;">Adiantar uma parte</h3>' +
        '<p style="color:#94a3b8;font-size:0.85rem;margin:0 0 8px 0;">' + (description || '').replace(/</g, ' ').slice(0, 50) + '</p>' +
        '<p style="color:#64748b;font-size:0.8rem;margin:0 0 16px 0;">Falta pagar: R$ ' + fmt(total) + '</p>' +
        '<label style="display:block;margin-bottom:6px;font-size:0.85rem;color:#e2e8f0;">Valor que deseja adiantar (R$)</label>' +
        '<input type="text" id="finance-partial-fluxo-value-input" placeholder="Ex: 400,00" value="" style="width:100%;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.06);color:#f1f5f9;font-size:1rem;box-sizing:border-box;">' +
        '<div style="display:flex;gap:10px;margin-top:20px;">' +
        '<button type="button" id="finance-partial-fluxo-cancel" style="flex:1;padding:12px;border:1px solid rgba(255,255,255,0.2);border-radius:10px;background:transparent;color:#94a3b8;font-weight:600;cursor:pointer;">Cancelar</button>' +
        '<button type="button" id="finance-partial-fluxo-confirm" style="flex:1;padding:12px;border:none;border-radius:10px;background:#3b82f6;color:#fff;font-weight:700;cursor:pointer;"><i class="fas fa-check" style="margin-right:6px;"></i>Adiantar</button>' +
        '</div></div>';
    overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
    var inputEl = document.getElementById('finance-partial-fluxo-value-input');
    if (inputEl) {
        inputEl.focus();
        inputEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') document.getElementById('finance-partial-fluxo-confirm').click(); });
    }
    document.getElementById('finance-partial-fluxo-cancel').onclick = function () { overlay.remove(); };
    document.getElementById('finance-partial-fluxo-confirm').onclick = function () {
        var raw = (inputEl && inputEl.value || '').trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
        var valor = parseFloat(raw) || 0;
        overlay.remove();
        if (valor <= 0) { alert('Informe um valor maior que zero.'); return; }
        window.financeAddPartialPaymentFluxo(transactionId, valor, total);
    };
};

window.financeAddPartialPaymentFluxo = async function (transactionId, valor, originalAmount) {
    var idStr = String(transactionId);
    var fluxoPartial = getFluxoPartialPayments();
    fluxoPartial[idStr] = fluxoPartial[idStr] || [];
    var hoje = new Date().toISOString().slice(0, 10);
    fluxoPartial[idStr].push({ valor: valor, data: hoje });
    var totalPaid = fluxoPartial[idStr].reduce(function (a, p) { return a + (Number(p.valor) || 0); }, 0);
    var restante = (Number(originalAmount) || 0) - totalPaid;
    if (restante <= 0) {
        try {
            await window.financeMarkAsPaid(transactionId, 'fluxo', '', '');
        } catch (e) {}
        fluxoPartial[idStr] = [];
    }
    setFluxoPartialPayments(fluxoPartial);
    if (window.loadFinanceTransactions) await window.loadFinanceTransactions();
    if (window.refreshFinanceSummaryCards) window.refreshFinanceSummaryCards();
};

window.financeAddPartialPayment = async function (pessoaId, contaId, valor) {
    if (!pessoaId || !contaId) return;
    var db = window._kingFinanceDb || { terceiros: [] };
    var person = (db.terceiros || []).find(function (p) { return p.id === pessoaId; });
    if (!person) { alert('Pessoa não encontrada.'); return; }
    var conta = (person.contas || []).find(function (c) { return String(c.id) === String(contaId); });
    if (!conta) { alert('Conta não encontrada.'); return; }
    var pago = (conta.pagamentos || []).reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0);
    var restante = Math.max(0, (Number(conta.valor) || 0) - pago);
    if (restante <= 0) { alert('Esta conta já está quitada.'); return; }
    var valorNum = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(',', '.')) || 0;
    if (valorNum <= 0) { alert('Valor inválido.'); return; }
    if (valorNum > restante) valorNum = restante;
    var hoje = new Date().toISOString().slice(0, 10);
    conta.pagamentos = conta.pagamentos || [];
    conta.pagamentos.push({ valor: valorNum, data: hoje, hora: '' });
    window._kingFinanceDb = db;
    if (window._kingFinancePersist) window._kingFinancePersist(db);
    if (window.loadFinanceTransactions) await window.loadFinanceTransactions();
    if (window.refreshFinanceSummaryCards) window.refreshFinanceSummaryCards();
    if (window.renderUnifiedKingTab && window._financeActiveTab === 'terceiros') window.renderUnifiedKingTab('terceiros');
};

function renderFinanceTransactions(transactions, filterTab = 'all') {
    const transactionsList = document.getElementById('finance-transactions-list');
    if (!transactionsList) return;

    // Clique em "Total recebido": mostrar receitas pagas e, abaixo, resumo "O que foi pago" com botão para ver despesas
    const hasBothTypes = transactions.some(t => (t.type || '').toUpperCase() === 'EXPENSE') && transactions.some(t => (t.type || '').toUpperCase() === 'INCOME');
    if (filterTab === 'income' && window.currentFinanceFilter === 'paid-income' && hasBothTypes) {
        const incomePaid = transactions.filter(t => (t.type || '').toUpperCase() === 'INCOME' && (t.status || '').toUpperCase() === 'PAID');
        const expensePaid = transactions.filter(t => (t.type || '').toUpperCase() === 'EXPENSE' && (t.status || '').toUpperCase() === 'PAID');
        const totalGasto = expensePaid.reduce((s, t) => s + parseFloat(t.amount || 0), 0);
        window.currentFinanceFilter = null;
        renderFinanceTransactions(incomePaid, 'income');
        window.currentFinanceFilter = 'paid-income';
        const list = document.getElementById('finance-transactions-list');
        if (list) {
            const bloco = document.createElement('div');
            bloco.style.cssText = 'margin-top:24px;padding:16px;background:var(--finance-card-dark);border:1px solid rgba(239,68,68,0.2);border-radius:12px;';
            bloco.innerHTML = '<p style="color:var(--finance-text-secondary);font-size:0.8rem;font-weight:700;margin:0 0 8px 0;">O que foi pago (este m\u00eas)</p><p style="color:#ef4444;font-size:1.25rem;font-weight:700;margin:0 0 12px 0;">R$ ' + (typeof formatCurrency === 'function' ? formatCurrency(totalGasto) : totalGasto.toFixed(2).replace('.', ',')) + '</p><button type="button" onclick="filterByPaidExpense()" style="padding:8px 14px;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);border-radius:8px;color:#fca5a5;font-size:0.8rem;font-weight:600;cursor:pointer;"><i class="fas fa-list" style="margin-right:6px;"></i>Ver lista de despesas</button>';
            list.appendChild(bloco);
        }
        return;
    }

    // Filtrar transações por aba
    let filteredTransactions = transactions;
    if (filterTab === 'income') {
        filteredTransactions = transactions.filter(t => (t.type || '').toUpperCase() === 'INCOME');
    } else if (filterTab === 'expense') {
        filteredTransactions = transactions.filter(t => (t.type || '').toUpperCase() === 'EXPENSE');
    }

    // Calcular total da aba
    const total = filteredTransactions.reduce((sum, t) => {
        const amount = parseFloat(t.amount || 0);
        const isIncome = (t.type || '').toUpperCase() === 'INCOME';
        return sum + (isIncome ? amount : -amount);
    }, 0);

    // Atualizar resumo da aba
    const summaryTotal = document.getElementById('finance-tab-total');
    if (summaryTotal) {
        const totalColor = filterTab === 'income' ? '#22c55e' : filterTab === 'expense' ? '#ef4444' : '#667eea';
        summaryTotal.textContent = `R$ ${formatCurrency(Math.abs(total))}`;
        summaryTotal.style.color = totalColor;
    }

    if (filteredTransactions.length === 0) {
        var emptyMsg = 'Nenhuma transação encontrada.';
        if (window.currentFinanceFilter === 'paid-expense') emptyMsg = 'Nenhuma despesa paga neste mês.';
        else if (window.currentFinanceFilter === 'pending-expense') emptyMsg = 'Nenhuma despesa pendente neste mês.';
        else if (window.currentFinanceFilter === 'pending-income') emptyMsg = 'Nenhuma receita pendente neste mês.';
        transactionsList.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="width: 64px; height: 64px; border-radius: 16px; background: var(--finance-card-dark); border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i class="fas fa-receipt" style="font-size: 1.5rem; color: var(--finance-text-secondary);"></i>
                </div>
                <p style="color: var(--finance-text-secondary); margin-bottom: 24px; font-size: 0.875rem;">${emptyMsg}</p>
                <button onclick="openAddTransactionModal('${filterTab === 'expense' ? 'expense' : 'income'}')" style="display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: var(--finance-indigo); border: none; border-radius: 12px; color: white; font-weight: 700; font-size: 0.875rem; cursor: pointer; margin: 0 auto; box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);">
                    <i class="fas fa-plus"></i> Adicionar Primeira Transação
                </button>
            </div>
        `;
        return;
    }

    // Helper: parsear data com segurança (evita RangeError: Invalid time value)
    function safeParseDate(val) {
        if (!val) return new Date();
        const s = String(val).trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s);
        if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) { const p = s.split('/'); return new Date(p[2] + '-' + p[1] + '-' + p[0]); }
        const d = new Date(s);
        return isNaN(d.getTime()) ? new Date() : d;
    }
    const groupedByDate = {};
    filteredTransactions.forEach(transaction => {
        const date = safeParseDate(transaction.transaction_date || transaction.date || transaction.created_at);
        const dateKey = date.toISOString().split('T')[0];
        if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push(transaction);
    });

    // Ordenar datas (mais recente primeiro)
    const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(b) - new Date(a));

    // Renderizar transações agrupadas por data (estilo Mobills)
    transactionsList.innerHTML = sortedDates.map(dateKey => {
        const dayTransactions = groupedByDate[dateKey];
        const firstTransaction = dayTransactions[0];
        const date = new Date(dateKey);
        // Formatar nome do dia corretamente (sem pontinhos)
        const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const dayName = dayNames[date.getDay()];
        const dayNumber = date.getDate();
        const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });

        return `
            <!-- Grupo de Data -->
            <div style="margin-bottom: 25px;">
                <!-- Cabeçalho da Data -->
                <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px; padding-left: 8px;">
                    <h4 style="color: var(--finance-text-primary); font-size: 0.95rem; font-weight: 600; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${dayName}, ${dayNumber} de ${monthName}
                    </h4>
                </div>
                
                <!-- Transações do Dia -->
                ${dayTransactions.map(transaction => {
            const transactionType = (transaction.type || '').toUpperCase();
            const isIncome = transactionType === 'INCOME';
            const amount = parseFloat(transaction.amount || 0);
            const transactionDate = safeParseDate(transaction.transaction_date || transaction.date || transaction.created_at);
            const status = (transaction.status || '').toUpperCase();
            const isPending = status === 'PENDING';
            const isRecurring = transaction.is_recurring || false;

            // Formatar horário detalhado
            const timeStr = transactionDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const fullDateStr = transactionDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

            // Mapear ícones específicos por categoria
            const categoryIconMap = {
                'Aluguel': 'fa-home',
                'Luz': 'fa-lightbulb',
                'Água': 'fa-tint',
                'Internet': 'fa-wifi',
                'Cartão de Crédito': 'fa-credit-card',
                'Supermercado': 'fa-shopping-cart',
                'Transporte': 'fa-car',
                'Saúde': 'fa-heart',
                'Educação': 'fa-graduation-cap',
                'Lazer': 'fa-gamepad',
                'Pensão': 'fa-hand-holding-usd',
                'Salário': 'fa-briefcase',
                'Freelance': 'fa-laptop-code',
                'Vendas': 'fa-store',
                'Investimentos': 'fa-chart-line'
            };
            const src = transaction.source || 'fluxo';
            const sourceLabels = { fluxo: '', trabalho: 'Trabalho', bem: 'Bens', serasa: 'Serasa', terceiros: 'Quem eu devo', cartao: 'Cartão' };
            const sourceLabel = sourceLabels[src] || '';
            const sourceColors = { fluxo: '', trabalho: '#3b82f6', bem: '#a855f7', serasa: '#6366f1', terceiros: '#8b5cf6', cartao: '#f97316' };
            const srcColor = sourceColors[src] || (isIncome ? '#22c55e' : '#3b82f6');
            const categoryIcon = transaction.category_icon || (src === 'trabalho' ? 'fa-briefcase' : src === 'bem' ? 'fa-tools' : src === 'serasa' ? 'fa-file-invoice-dollar' : src === 'terceiros' ? 'fa-users' : src === 'cartao' ? 'fa-credit-card' : categoryIconMap[transaction.category_name]) || (isIncome ? 'fa-arrow-up' : 'fa-arrow-down');
            const categoryColor = transaction.category_color || srcColor || (isIncome ? '#22c55e' : '#3b82f6');

            // Informações da categoria e carteira
            const categoryInfo = transaction.category_name || '';
            const accountInfo = transaction.account_name || '';
            const infoParts = [categoryInfo, accountInfo].filter(Boolean);
            if (isRecurring) infoParts.push('<i class="fas fa-sync-alt" style="color: #f59e0b;"></i> Fixa');

            // Parcelamento (se houver)
            const installmentInfo = transaction.installment_current && transaction.installment_total
                ? `(${transaction.installment_current}/${transaction.installment_total})`
                : '';
            const canEdit = src === 'fluxo' && (typeof transaction.id === 'number' || (transaction.id != null && String(transaction.id).match(/^[0-9]+$/)));
            const onClickAction = canEdit ? 'editFinanceTransaction(' + transaction.id + ')' : "switchUnifiedFinanceTab('" + (src === 'trabalho' ? 'trabalhos' : src === 'bem' ? 'bens' : src === 'serasa' ? 'serasa' : src === 'terceiros' ? 'terceiros' : src === 'cartao' ? 'cartoes' : 'fluxo') + "')";

            return `
                        <div style="display: flex; align-items: center; gap: 16px; padding: 16px; margin-bottom: 0; cursor: pointer; border-radius: 0; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" 
                             onclick="${onClickAction}"
                             onmouseover="this.style.background='rgba(255,255,255,0.02)'" 
                             onmouseout="this.style.background='transparent'">
                            <!-- Ícone da Categoria -->
                            <div style="width: 48px; height: 48px; border-radius: 16px; background: ${categoryColor}20; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <i class="fas ${categoryIcon}" style="font-size: 1.25rem; color: ${categoryColor};"></i>
                            </div>
                            
                            <!-- Informações da Transação -->
                            <div style="flex: 1; min-width: 0;">
                                <p style="color: var(--finance-text-primary); font-weight: 700; margin-bottom: 4px; font-size: 0.875rem; word-break: break-word; overflow-wrap: break-word; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0;">
                                    ${sourceLabel ? '<span style="font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 6px; background: ' + (srcColor || 'rgba(255,255,255,0.1)') + '; color: #fff; flex-shrink: 0;">' + sourceLabel + '</span>' : ''}
                                    <span style="min-width: 0; flex: 1;">${transaction.description || 'Sem descrição'} ${installmentInfo}</span>
                                </p>
                                <p style="color: var(--finance-text-secondary); font-size: 0.9rem; margin: 0; font-weight: 600;">
                                    ${fullDateStr} · ${timeStr}
                                </p>
                                ${(transaction._fluxoTotalPaid > 0 && transaction.source === 'fluxo') ? '<p style="color: #22c55e; font-size: 0.8rem; margin: 4px 0 0 0; font-weight: 600;">Valor pago: R$ ' + (typeof formatCurrency === 'function' ? formatCurrency(transaction._fluxoTotalPaid) : (transaction._fluxoTotalPaid || 0).toFixed(2).replace('.', ',')) + '</p>' : ''}
                            </div>
                            
                            <!-- Valor, Editar (só fora de Falta a pagar / O que foi pago) e ação (Pagar / Restaurar) -->
                            <div style="text-align: right; flex-shrink: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
                                ${(canEdit && window.currentFinanceFilter !== 'pending-expense' && window.currentFinanceFilter !== 'paid-expense') ? '<button type="button" onclick="event.stopPropagation(); event.preventDefault(); editFinanceTransaction(' + transaction.id + ')" style="padding:6px 12px;background:rgba(59,130,246,0.25);border:1px solid rgba(59,130,246,0.5);border-radius:8px;color:#93c5fd;font-size:0.75rem;font-weight:700;cursor:pointer;white-space:nowrap;" title="Editar"><i class="fas fa-pencil-alt" style="margin-right:4px;"></i>Editar</button>' : ''}
                                <p style="color: ${transaction._isCardAdd ? 'var(--finance-text-secondary)' : (isIncome ? 'var(--finance-neon-green)' : 'var(--finance-neon-red)')}; font-weight: 700; font-size: 0.875rem; margin: 0;">
                                    ${transaction._isCardAdd ? '' : (isIncome ? '+' : '-') + ' R$ ' + formatCurrency(amount)}
                                </p>
                                ${(window.currentFinanceFilter === 'pending-expense' && isPending && transaction.source === 'fluxo') ? '<span style="display:inline-flex;gap:6px;flex-wrap:wrap;"><button type="button" onclick="event.stopPropagation(); event.preventDefault(); window.financeMarkAsPaid(\'' + (transaction.id || '').toString().replace(/'/g, "\\'") + '\', \'fluxo\', \'\', \'\')" style="padding:6px 10px;background:rgba(34,197,94,0.25);border:1px solid rgba(34,197,94,0.5);border-radius:8px;color:#86efac;font-size:0.7rem;font-weight:700;cursor:pointer;white-space:nowrap;"><i class="fas fa-check" style="margin-right:4px;"></i>Pagar total</button><button type="button" onclick="event.stopPropagation(); event.preventDefault(); window.financeShowPartialPaymentModalFluxo(\'' + (transaction.id || '').toString().replace(/'/g, "\\'") + '\', \'' + (parseFloat(transaction.amount) || 0).toString().replace(/'/g, "\\'") + '\', \'' + (transaction.description || '').toString().replace(/'/g, "\\'").replace(/"/g, '&quot;').slice(0, 50) + '\')" style="padding:6px 10px;background:rgba(59,130,246,0.25);border:1px solid rgba(59,130,246,0.5);border-radius:8px;color:#93c5fd;font-size:0.7rem;font-weight:700;cursor:pointer;white-space:nowrap;"><i class="fas fa-coins" style="margin-right:4px;"></i>Pagar valor desejado</button></span>' : ''}
                                ${(window.currentFinanceFilter === 'pending-expense' && isPending && transaction.source === 'terceiros') ? '<span style="display:inline-flex;gap:6px;flex-wrap:wrap;"><button type="button" onclick="event.stopPropagation(); event.preventDefault(); window.financeMarkAsPaid(\'\', \'terceiros\', \'' + (transaction._pessoaId || '').toString().replace(/'/g, "\\'") + '\', \'' + (transaction._contaId || '').toString().replace(/'/g, "\\'") + '\')" style="padding:6px 10px;background:rgba(34,197,94,0.25);border:1px solid rgba(34,197,94,0.5);border-radius:8px;color:#86efac;font-size:0.7rem;font-weight:700;cursor:pointer;white-space:nowrap;"><i class="fas fa-check" style="margin-right:4px;"></i>Pagar total</button><button type="button" onclick="event.stopPropagation(); event.preventDefault(); window.financeShowPartialPaymentModal(\'' + (transaction._pessoaId || '').toString().replace(/'/g, "\\'") + '\', \'' + (transaction._contaId || '').toString().replace(/'/g, "\\'") + '\', \'' + (transaction.description || '').toString().replace(/'/g, "\\'").slice(0, 40) + '\')" style="padding:6px 10px;background:rgba(59,130,246,0.25);border:1px solid rgba(59,130,246,0.5);border-radius:8px;color:#93c5fd;font-size:0.7rem;font-weight:700;cursor:pointer;white-space:nowrap;"><i class="fas fa-coins" style="margin-right:4px;"></i>Pagar valor desejado</button></span>' : ''}
                                ${(window.currentFinanceFilter === 'pending-income' && isIncome && isPending && transaction.source === 'fluxo') ? '<button type="button" onclick="event.stopPropagation(); event.preventDefault(); window.financeMarkAsPaid(\'' + (transaction.id || '').toString().replace(/'/g, "\\'") + '\', \'fluxo\', \'\', \'\')" style="padding:6px 12px;background:rgba(34,197,94,0.25);border:1px solid rgba(34,197,94,0.5);border-radius:8px;color:#86efac;font-size:0.7rem;font-weight:700;cursor:pointer;white-space:nowrap;"><i class="fas fa-check" style="margin-right:4px;"></i>Recebi</button>' : ''}
                                ${(window.currentFinanceFilter === 'paid-expense' && !isPending && (transaction.source === 'fluxo' || transaction.source === 'terceiros')) ? '<button type="button" onclick="event.stopPropagation(); event.preventDefault(); window.financeRestoreToPending(\'' + (transaction.id || '').toString().replace(/'/g, "\\'") + '\', \'' + (transaction.source || '') + '\', \'' + (transaction._pessoaId || '') + '\', \'' + (transaction._contaId || '') + '\')" style="padding:6px 12px;background:rgba(245,158,11,0.25);border:1px solid rgba(245,158,11,0.5);border-radius:8px;color:#fcd34d;font-size:0.7rem;font-weight:700;cursor:pointer;white-space:nowrap;"><i class="fas fa-undo" style="margin-right:4px;"></i>Restaurar</button>' : ''}
                            </div>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    }).join('');

    // NÃO atualizar cards de resumo - eles devem permanecer fixos
    // updateFinanceTotals foi removido para não alterar os cards
}

// Variável global para armazenar todas as transações
window.allFinanceTransactions = [];
window.currentFinanceTab = 'all';

// Variável global para mês atual - SEMPRE inicializar com o mês atual
const now = new Date();
window.currentFinanceMonth = now.getMonth();
window.currentFinanceYear = now.getFullYear();

window.switchFinanceTab = function (tab) {
    window.currentFinanceTab = tab;

    // Atualizar botões de aba
    document.querySelectorAll('.finance-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = 'var(--text-secondary, #888888)';
        btn.style.borderBottomColor = 'transparent';
    });

    const activeBtn = document.querySelector(`[data-tab="${tab}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.color = 'var(--text-primary, #FFFFFF)';
        const borderColor = tab === 'income' ? '#22c55e' : tab === 'expense' ? '#ef4444' : '#667eea';
        activeBtn.style.borderBottomColor = borderColor;
    }

    // Re-renderizar transações filtradas
    if (window.allFinanceTransactions && window.allFinanceTransactions.length > 0) {
        // NÃO atualizar cards de resumo - apenas renderizar transações abaixo
        renderFinanceTransactions(window.allFinanceTransactions, tab);
    }
};

window.changeFinancePeriod = function (period) {
    // Atualizar botões de período
    document.querySelectorAll('[id^="period-"]').forEach(btn => {
        btn.style.background = 'rgba(255,255,255,0.05)';
        btn.style.color = 'var(--finance-text-secondary)';
        btn.style.fontWeight = '400';
    });

    const activeBtn = document.getElementById(`period-${period}`);
    if (activeBtn) {
        activeBtn.style.background = 'var(--finance-indigo)';
        activeBtn.style.color = 'white';
        activeBtn.style.fontWeight = '600';
    }

    // Calcular período baseado na seleção
    const now = new Date();
    let dateFrom, dateTo;

    switch (period) {
        case '1M':
            // ltimo mês
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
            dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case '3M':
            // últimos 3 meses
            dateFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case '6M':
            // últimos 6 meses
            dateFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case '1A':
            // ltimo ano
            dateFrom = new Date(now.getFullYear(), 0, 1);
            dateTo = new Date(now.getFullYear(), 11, 31);
            break;
        default:
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
            dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const dateFromStr = dateFrom.toISOString().split('T')[0];
    const dateToStr = dateTo.toISOString().split('T')[0];
    const profileId = localStorage.getItem('finance_current_profile_id') || '';

    // Recarregar dashboard com novo período (usar mesmo perfil da tela)
    fetch(`${env.API_URL}/api/finance/dashboard?dateFrom=${dateFromStr}&dateTo=${dateToStr}${profileId ? '&profile_id=' + profileId : ''}`, {
        headers: env.HEADERS_AUTH
    })
        .then(res => res.json())
        .then(responseData => {
            const data = responseData.data || responseData;

            // Atualizar card de Patrimônio Líquido Total
            const netWorthEl = document.querySelector('.finance-card-premium h3');
            if (netWorthEl) {
                netWorthEl.textContent = `R$ ${formatCurrency(data.accountBalance || 0)}`;
            }
        })
        .catch(err => console.error('Erro ao atualizar período:', err));

    // Atualizar gráfico com novo período
    if (window.initFinanceChart) {
        window.initFinanceChart(period);
    }
};

window.showMonthSelector = function () {
    // Criar modal de seleção de mês
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const currentYear = window.currentFinanceYear || new Date().getFullYear();
    const currentMonth = window.currentFinanceMonth !== undefined ? window.currentFinanceMonth : new Date().getMonth();

    const modal = document.createElement('div');
    modal.id = 'month-selector-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease-out;
    `;

    modal.innerHTML = `
        <div style="background: var(--finance-card-dark); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px; max-width: 500px; width: 100%; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--finance-text-primary); margin: 0;">Selecionar Mês</h3>
                <button onclick="document.getElementById('month-selector-modal').remove()" style="background: none; border: none; color: var(--finance-text-secondary); font-size: 1.5rem; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='none'">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                ${monthNames.map((month, index) => `
                    <button onclick="selectFinanceMonth(${index})" style="padding: 16px; background: ${index === currentMonth ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${index === currentMonth ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255,255,255,0.1)'}; border-radius: 12px; color: ${index === currentMonth ? 'var(--finance-indigo)' : 'var(--finance-text-primary)'}; font-weight: ${index === currentMonth ? '700' : '500'}; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(59, 130, 246, 0.15)'" onmouseout="this.style.background='${index === currentMonth ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)'}'">
                        ${month}
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

window.selectFinanceMonth = function (monthIndex) {
    window.currentFinanceMonth = monthIndex;
    const monthEl = document.getElementById('finance-current-month');
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    if (monthEl) {
        monthEl.textContent = `${monthNames[monthIndex]} ${window.currentFinanceYear}`;
    }

    // Atualizar botão de data no header
    const dateBtnText = document.getElementById('finance-header-month');
    if (dateBtnText) {
        dateBtnText.textContent = `${monthNames[monthIndex]} ${window.currentFinanceYear}`;
    }

    // Fechar modal
    const modal = document.getElementById('month-selector-modal');
    if (modal) modal.remove();

    // Recarregar dados do mês selecionado (sempre com o perfil atual para não misturar dados)
    const monthStart = `${window.currentFinanceYear}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(window.currentFinanceYear, monthIndex + 1, 0).getDate();
    const monthEnd = `${window.currentFinanceYear}-${String(monthIndex + 1).padStart(2, '0')}-${lastDay}`;
    const profileIdMonth = localStorage.getItem('finance_current_profile_id') || '';
    fetch(`${env.API_URL}/api/finance/dashboard?dateFrom=${monthStart}&dateTo=${monthEnd}${profileIdMonth ? '&profile_id=' + profileIdMonth : ''}`, {
        headers: env.HEADERS_AUTH
    })
        .then(res => res.json())
        .then(responseData => {
            const data = responseData.data || responseData;
            var totalTerceirosEsteMes = 0;
            if (typeof window._kingFinanceTerceirosEsteMes === 'function' && window._kingFinanceDb && Array.isArray(window._kingFinanceDb.terceiros)) {
                totalTerceirosEsteMes = window._kingFinanceTerceirosEsteMes(window._kingFinanceDb.terceiros, window.currentFinanceYear, monthIndex + 1);
            }
            var trabMes = typeof window._financeTrabalhosTotals === 'function' ? window._financeTrabalhosTotals(window._kingFinanceDb || {}) : { totalRecebido: 0, totalFalta: 0 };
            var recebidoTrabalhosEsteMesSel = typeof window._kingFinanceRecebidoTrabalhosNoMes === 'function' ? window._kingFinanceRecebidoTrabalhosNoMes(window._kingFinanceDb || {}, window.currentFinanceYear, monthIndex + 1) : 0;
            var receitasFluxoMes = Number(data.totalIncome) || 0;
            var totalRecebidoMes = (receitasFluxoMes - (Number(data.pendingIncome) || 0)) + recebidoTrabalhosEsteMesSel;
            var despesas = (Number(data.totalExpense) || 0) + totalTerceirosEsteMes;
            var balance = totalRecebidoMes - despesas;
            var faltaReceberGeralMes = (Number(data.pendingIncome) || 0) + trabMes.totalFalta;
            var patrimonioMes = Number(data.accountBalance) || Number(data.totalBalance) || 0;

            const netWorthEl = document.querySelector('.finance-card-premium h3');
            if (netWorthEl) netWorthEl.textContent = `R$ ${formatCurrency(patrimonioMes)}`;
            const accountBalanceMainEl = document.getElementById('finance-account-balance-main');
            if (accountBalanceMainEl) accountBalanceMainEl.textContent = `R$ ${formatCurrency(patrimonioMes)}`;

            const incomeCardEl = document.getElementById('finance-income-card');
            if (incomeCardEl) incomeCardEl.textContent = `+R$ ${formatCurrency(totalRecebidoMes)}`;

            const expenseCardEl = document.getElementById('finance-expense-card');
            if (expenseCardEl) expenseCardEl.textContent = `-R$ ${formatCurrency(despesas)}`;

            const pendingIncomeEl = document.getElementById('finance-pending-income');
            if (pendingIncomeEl) pendingIncomeEl.textContent = `R$ ${formatCurrency(faltaReceberGeralMes)}`;

            var faltaPagarEsteMes = (Number(data.pendingExpense) || 0) + totalTerceirosEsteMes;
            const pendingExpenseEl = document.getElementById('finance-pending-expense');
            if (pendingExpenseEl) pendingExpenseEl.textContent = `R$ ${formatCurrency(faltaPagarEsteMes)}`;
            var totalTerceirosMesesAntSel = typeof window._kingFinanceTerceirosMesesAnteriores === 'function' ? window._kingFinanceTerceirosMesesAnteriores(window._kingFinanceDb || {}, window.currentFinanceYear, monthIndex + 1) : 0;
            const pendingExpensePrevEl = document.getElementById('finance-pending-expense-previous');
            if (pendingExpensePrevEl) pendingExpensePrevEl.textContent = `R$ ${formatCurrency((Number(data.pendingExpensePreviousMonths) || 0) + totalTerceirosMesesAntSel)}`;

            const accountBalanceEl = document.getElementById('finance-account-balance');
            if (accountBalanceEl) accountBalanceEl.textContent = `R$ ${formatCurrency(patrimonioMes)}`;

            const paidIncomeEl = document.getElementById('finance-paid-income');
            if (paidIncomeEl) paidIncomeEl.textContent = `R$ ${formatCurrency(totalRecebidoMes)}`;

            const paidExpenseEl = document.getElementById('finance-paid-expense');
            var valorOQueFoiPagoBtn = Number(data.totalExpensePaid || data.totalPago) || 0;
            if (typeof financeTransactionsCurrentMonthOnly === 'function' && Array.isArray(window.allFinanceTransactions)) {
                var doMesPagoBtn = financeTransactionsCurrentMonthOnly(window.allFinanceTransactions);
                valorOQueFoiPagoBtn = doMesPagoBtn.filter(function (t) { return (t.type || '').toUpperCase() === 'EXPENSE' && (t.status || '').toUpperCase() === 'PAID'; }).reduce(function (s, t) { return s + (parseFloat(t.amount) || 0); }, 0);
            }
            var terceirosPagoBtn = typeof window._kingFinanceTerceirosPagoEsteMes === 'function' && window._kingFinanceDb && Array.isArray(window._kingFinanceDb.terceiros) ? window._kingFinanceTerceirosPagoEsteMes(window._kingFinanceDb.terceiros, window.currentFinanceYear, monthIndex + 1) : 0;
            valorOQueFoiPagoBtn = (Number(valorOQueFoiPagoBtn) || 0) + (Number(terceirosPagoBtn) || 0);
            if (paidExpenseEl) paidExpenseEl.textContent = `R$ ${formatCurrency(valorOQueFoiPagoBtn)}`;
            const balanceReceitasEl = document.getElementById('finance-balance-receitas');
            const balanceDespesasEl = document.getElementById('finance-balance-despesas');
            const balanceResultEl = document.getElementById('finance-balance-result');
            if (balanceReceitasEl) balanceReceitasEl.textContent = `R$ ${formatCurrency(totalRecebidoMes)}`;
            if (balanceDespesasEl) balanceDespesasEl.textContent = `R$ ${formatCurrency(despesas)}`;
            if (balanceResultEl) { balanceResultEl.textContent = `R$ ${formatCurrency(Math.abs(balance))}`; balanceResultEl.style.color = balance >= 0 ? '#22c55e' : '#ef4444'; }
        })
        .catch(err => console.error('Erro ao atualizar dashboard:', err));

    // Recarregar transações
    window.loadFinanceTransactions();

    // Atualizar gráfico
    setTimeout(() => {
        if (window.initFinanceChart) {
            window.initFinanceChart();
        }
    }, 300);
};

window.changeFinanceMonth = function (direction) {
    window.currentFinanceMonth += direction;

    if (window.currentFinanceMonth < 0) {
        window.currentFinanceMonth = 11;
        window.currentFinanceYear--;
    } else if (window.currentFinanceMonth > 11) {
        window.currentFinanceMonth = 0;
        window.currentFinanceYear++;
    }

    // Atualizar display do mês
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthEl = document.getElementById('finance-current-month');
    if (monthEl) {
        monthEl.textContent = `${monthNames[window.currentFinanceMonth]} ${window.currentFinanceYear}`;
    }

    // Atualizar botão de data no header
    const dateBtnText = document.getElementById('finance-header-month');
    if (dateBtnText) {
        dateBtnText.textContent = `${monthNames[window.currentFinanceMonth]} ${window.currentFinanceYear}`;
    }

    // Recarregar dashboard e transações do mês selecionado (usar mesmo perfil da tela)
    const monthStart = `${window.currentFinanceYear}-${String(window.currentFinanceMonth + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(window.currentFinanceYear, window.currentFinanceMonth + 1, 0).getDate();
    const monthEnd = `${window.currentFinanceYear}-${String(window.currentFinanceMonth + 1).padStart(2, '0')}-${lastDay}`;
    const profileIdMonth = localStorage.getItem('finance_current_profile_id') || '';

    // Recarregar dashboard com novo período
    fetch(`${env.API_URL}/api/finance/dashboard?dateFrom=${monthStart}&dateTo=${monthEnd}${profileIdMonth ? '&profile_id=' + profileIdMonth : ''}`, {
        headers: env.HEADERS_AUTH
    })
        .then(res => res.json())
        .then(responseData => {
            const data = responseData.data || responseData;
            var totalTerceirosEsteMes = 0;
            if (typeof window._kingFinanceTerceirosEsteMes === 'function' && window._kingFinanceDb && Array.isArray(window._kingFinanceDb.terceiros)) {
                totalTerceirosEsteMes = window._kingFinanceTerceirosEsteMes(window._kingFinanceDb.terceiros, window.currentFinanceYear, window.currentFinanceMonth + 1);
            }
            var trabBtn = typeof window._financeTrabalhosTotals === 'function' ? window._financeTrabalhosTotals(window._kingFinanceDb || {}) : { totalRecebido: 0, totalFalta: 0 };
            var recebidoTrabalhosEsteMes = typeof window._kingFinanceRecebidoTrabalhosNoMes === 'function' ? window._kingFinanceRecebidoTrabalhosNoMes(window._kingFinanceDb || {}, window.currentFinanceYear, window.currentFinanceMonth + 1) : 0;
            var receitasFluxoBtn = Number(data.totalIncome) || 0;
            var totalRecebidoBtn = (receitasFluxoBtn - (Number(data.pendingIncome) || 0)) + recebidoTrabalhosEsteMes;
            var despesas = (Number(data.totalExpense) || 0) + totalTerceirosEsteMes;
            var balance = totalRecebidoBtn - despesas;
            var faltaReceberGeralBtn = (Number(data.pendingIncome) || 0) + trabBtn.totalFalta;
            var patrimonioBtn = Number(data.accountBalance) || Number(data.totalBalance) || 0;

            // Atualizar Saldo Disponível em Conta (inclui entradas de trabalhos)
            const accountBalanceMainEl = document.getElementById('finance-account-balance-main');
            if (accountBalanceMainEl) {
                accountBalanceMainEl.textContent = `R$ ${formatCurrency(patrimonioBtn)}`;
            }

            // Atualizar Receitas do Mês (só o que já entrou)
            const incomeCardEl = document.getElementById('finance-income-card');
            if (incomeCardEl) {
                incomeCardEl.textContent = `+R$ ${formatCurrency(totalRecebidoBtn)}`;
            }

            // Atualizar Despesas do Mês (fluxo + Quem eu devo este mês)
            const expenseCardEl = document.getElementById('finance-expense-card');
            if (expenseCardEl) {
                expenseCardEl.textContent = `-R$ ${formatCurrency(despesas)}`;
            }

            // Atualizar cards detalhados (vinculados a trabalhos)
            const pendingIncomeEl = document.getElementById('finance-pending-income');
            const pendingExpenseEl = document.getElementById('finance-pending-expense');
            const accountBalanceEl = document.getElementById('finance-account-balance');
            const paidIncomeEl = document.getElementById('finance-paid-income');

            if (pendingIncomeEl) pendingIncomeEl.textContent = `R$ ${formatCurrency(faltaReceberGeralBtn)}`;
            var faltaPagarEsteMesBtn = (Number(data.pendingExpense) || 0) + totalTerceirosEsteMes;
            if (pendingExpenseEl) pendingExpenseEl.textContent = `R$ ${formatCurrency(faltaPagarEsteMesBtn)}`;
            var totalTerceirosMesesAntBtn = typeof window._kingFinanceTerceirosMesesAnteriores === 'function' ? window._kingFinanceTerceirosMesesAnteriores(window._kingFinanceDb || {}, window.currentFinanceYear, window.currentFinanceMonth + 1) : 0;
            const pendingExpensePrevEl2 = document.getElementById('finance-pending-expense-previous');
            if (pendingExpensePrevEl2) pendingExpensePrevEl2.textContent = `R$ ${formatCurrency((Number(data.pendingExpensePreviousMonths) || 0) + totalTerceirosMesesAntBtn)}`;
            if (accountBalanceEl) accountBalanceEl.textContent = `R$ ${formatCurrency(patrimonioBtn)}`;
            if (paidIncomeEl) paidIncomeEl.textContent = `R$ ${formatCurrency(totalRecebidoBtn)}`;

            const paidExpenseEl = document.getElementById('finance-paid-expense');
            var valorOQueFoiPagoBtn2 = Number(data.totalExpensePaid || data.totalPago) || 0;
            if (typeof financeTransactionsCurrentMonthOnly === 'function' && Array.isArray(window.allFinanceTransactions)) {
                var doMesPagoBtn2 = financeTransactionsCurrentMonthOnly(window.allFinanceTransactions);
                valorOQueFoiPagoBtn2 = doMesPagoBtn2.filter(function (t) { return (t.type || '').toUpperCase() === 'EXPENSE' && (t.status || '').toUpperCase() === 'PAID'; }).reduce(function (s, t) { return s + (parseFloat(t.amount) || 0); }, 0);
            }
            var terceirosPagoBtn2 = typeof window._kingFinanceTerceirosPagoEsteMes === 'function' && window._kingFinanceDb && Array.isArray(window._kingFinanceDb.terceiros) ? window._kingFinanceTerceirosPagoEsteMes(window._kingFinanceDb.terceiros, window.currentFinanceYear, window.currentFinanceMonth + 1) : 0;
            valorOQueFoiPagoBtn2 = (Number(valorOQueFoiPagoBtn2) || 0) + (Number(terceirosPagoBtn2) || 0);
            if (paidExpenseEl) paidExpenseEl.textContent = `R$ ${formatCurrency(valorOQueFoiPagoBtn2)}`;
            const balanceReceitasEl = document.getElementById('finance-balance-receitas');
            const balanceDespesasEl = document.getElementById('finance-balance-despesas');
            const balanceResultEl = document.getElementById('finance-balance-result');
            if (balanceReceitasEl) balanceReceitasEl.textContent = `R$ ${formatCurrency(totalRecebidoBtn)}`;
            if (balanceDespesasEl) balanceDespesasEl.textContent = `R$ ${formatCurrency(despesas)}`;
            if (balanceResultEl) { balanceResultEl.textContent = `R$ ${formatCurrency(Math.abs(balance))}`; balanceResultEl.style.color = balance >= 0 ? '#22c55e' : '#ef4444'; }
        })
        .catch(err => console.error('Erro ao atualizar dashboard:', err));

    // Recarregar transações
    window.loadFinanceTransactions();

    // Atualizar gráfico
    setTimeout(() => {
        if (window.initFinanceChart) {
            window.initFinanceChart();
        }
    }, 300);
};

// Função para inicializar gráfico de evolução
window.initFinanceChart = function (period = '1M') {
    const canvas = document.getElementById('finance-evolution-chart');
    if (!canvas) {
        console.log('Canvas não encontrado, tentando novamente...');
        setTimeout(() => window.initFinanceChart(period), 200);
        return;
    }

    // Configurar tamanho do canvas
    const container = canvas.parentElement;
    if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight || 200;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Destruir gráfico anterior se existir
    if (window.financeChartInstance) {
        try {
            window.financeChartInstance.destroy();
        } catch (e) {
            console.log('Erro ao destruir gráfico anterior:', e);
        }
    }

    // Buscar dados reais da API
    const currentMonth = window.currentFinanceMonth !== undefined ? window.currentFinanceMonth : new Date().getMonth();
    const currentYear = window.currentFinanceYear !== undefined ? window.currentFinanceYear : new Date().getFullYear();
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dateFromStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    const dateToStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
    const profileIdChart = localStorage.getItem('finance_current_profile_id') || '';

    // Criar gráfico usando Chart.js (se disponível)
    if (typeof Chart !== 'undefined') {
        // Buscar transações do perfil atual para o gráfico (usa último dia real do mês, ex: fev=28)
        fetch(`${env.API_URL}/api/finance/transactions?limit=1000&orderBy=transaction_date&orderDir=ASC&dateFrom=${dateFromStr}&dateTo=${dateToStr}${profileIdChart ? '&profile_id=' + profileIdChart : ''}`, {
            headers: env.HEADERS_AUTH
        })
            .then(res => res.json())
            .then(responseData => {
                const transactions = Array.isArray(responseData.data) ? responseData.data : (responseData.data?.data || []);

                // Agrupar por dia
                const dailyData = {};
                transactions.forEach(t => {
                    const date = new Date(t.transaction_date || t.date || t.created_at);
                    const dateKey = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    if (!dailyData[dateKey]) {
                        dailyData[dateKey] = { income: 0, expense: 0 };
                    }
                    const isIncome = (t.type || '').toUpperCase() === 'INCOME';
                    const isPaid = (t.status || '').toUpperCase() === 'PAID';
                    if (isPaid) {
                        if (isIncome) {
                            dailyData[dateKey].income += parseFloat(t.amount || 0);
                        } else {
                            dailyData[dateKey].expense += parseFloat(t.amount || 0);
                        }
                    }
                });

                const labels = Object.keys(dailyData).sort();
                const incomeData = labels.map(d => dailyData[d].income);
                const expenseData = labels.map(d => dailyData[d].expense);

                window.financeChartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels.length > 0 ? labels : ['Sem dados'],
                        datasets: [{
                            label: 'Receitas',
                            data: incomeData.length > 0 ? incomeData : [0],
                            borderColor: 'rgb(34, 197, 94)',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            tension: 0.4,
                            fill: true
                        }, {
                            label: 'Despesas',
                            data: expenseData.length > 0 ? expenseData : [0],
                            borderColor: 'rgb(239, 68, 68)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                                callbacks: {
                                    label: function (context) {
                                        return context.dataset.label + ': R$ ' + formatCurrency(context.parsed.y);
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                display: true,
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    color: 'rgba(148, 163, 184, 0.5)',
                                    font: {
                                        size: 10
                                    }
                                }
                            },
                            y: {
                                display: true,
                                grid: {
                                    color: 'rgba(255, 255, 255, 0.05)'
                                },
                                ticks: {
                                    color: 'rgba(148, 163, 184, 0.5)',
                                    font: {
                                        size: 10
                                    },
                                    callback: function (value) {
                                        return 'R$ ' + formatCurrency(value);
                                    }
                                }
                            }
                        }
                    }
                });
            })
            .catch(err => {
                console.error('Erro ao carregar dados do gráfico:', err);
                // Desenhar gráfico simples como fallback
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
                ctx.font = '12px Inter';
                ctx.textAlign = 'center';
                ctx.fillText('Gráfico será carregado em breve', canvas.width / 2, canvas.height / 2);
            });
    } else {
        // Fallback: mensagem simples
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Chart.js não disponível', canvas.width / 2, canvas.height / 2);
    }
};

window.financeBuildPrintContent = function (tipo) {
    var fmt = function (v) { return (Number(v) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
    var currentMonth = window.currentFinanceMonth !== undefined ? window.currentFinanceMonth : new Date().getMonth();
    var currentYear = window.currentFinanceYear !== undefined ? window.currentFinanceYear : new Date().getFullYear();
    var monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    var mesNome = monthNames[currentMonth] + ' de ' + currentYear;
    var mesRef = currentYear + '-' + String(currentMonth + 1).padStart(2, '0');
    var feed = window.allFinanceTransactions || [];
    var doMes = feed.filter(function (t) { return ((t.transaction_date || t.date || '') + '').trim().slice(0, 7) === mesRef; });
    var receitasMes = doMes.filter(function (t) { return (t.type || '').toUpperCase() === 'INCOME'; }).reduce(function (s, t) { return s + (parseFloat(t.amount) || 0); }, 0);
    var despesasMes = doMes.filter(function (t) { return (t.type || '').toUpperCase() === 'EXPENSE'; }).reduce(function (s, t) { return s + (parseFloat(t.amount) || 0); }, 0);
    var receitasPagasMes = doMes.filter(function (t) { return (t.type || '').toUpperCase() === 'INCOME' && (t.status || '').toUpperCase() === 'PAID'; }).reduce(function (s, t) { return s + (parseFloat(t.amount) || 0); }, 0);
    var despesasPagasMes = doMes.filter(function (t) { return (t.type || '').toUpperCase() === 'EXPENSE' && (t.status || '').toUpperCase() === 'PAID'; }).reduce(function (s, t) { return s + (parseFloat(t.amount) || 0); }, 0);
    var faltaReceberMes = doMes.filter(function (t) { return (t.type || '').toUpperCase() === 'INCOME' && (t.status || '').toUpperCase() === 'PENDING'; }).reduce(function (s, t) { return s + (parseFloat(t.amount) || 0); }, 0);
    var faltaPagarMes = doMes.filter(function (t) { return (t.type || '').toUpperCase() === 'EXPENSE' && (t.status || '').toUpperCase() === 'PENDING'; }).reduce(function (s, t) { return s + (parseFloat(t.amount) || 0); }, 0);
    var terceirosMes = (typeof window._kingFinanceTerceirosEsteMes === 'function' && window._kingFinanceDb && Array.isArray(window._kingFinanceDb.terceiros)) ? window._kingFinanceTerceirosEsteMes(window._kingFinanceDb.terceiros, currentYear, currentMonth + 1) : 0;
    var faltaPagarMesComTerceiros = faltaPagarMes + terceirosMes;
    var saldoMes = receitasMes - despesasMes;
    var totalIncome = (feed.filter(function (t) { return (t.type || '').toUpperCase() === 'INCOME' && (t.status || '').toUpperCase() === 'PAID'; }).reduce(function (s, t) { return s + (parseFloat(t.amount) || 0); }, 0));
    var totalExpense = (feed.filter(function (t) { return (t.type || '').toUpperCase() === 'EXPENSE' && (t.status || '').toUpperCase() === 'PAID'; }).reduce(function (s, t) { return s + (parseFloat(t.amount) || 0); }, 0));
    var db = window._kingFinanceDb || { terceiros: [], dividas: [], trabalhos: [], bens: [] };
    var cards = window._kingFinanceCards || [];
    var titulo = tipo === 'geral' ? 'Balanço Geral' : tipo === 'despesas' ? 'Despesas' : tipo === 'receitas' ? 'Receitas' : tipo === 'completo' ? 'Balanço Completo' : tipo === 'falta-pagar' ? 'O que falta pagar' : tipo === 'quem-eu-devo' ? 'Quem eu devo' : tipo === 'serasa' ? 'Dívidas Serasa' : tipo === 'fluxo' ? 'Fluxo' : tipo === 'trabalhos' ? 'Trabalhos' : tipo === 'bens' ? 'Bens' : tipo === 'cartoes' ? 'Cartões' : 'Tudo';
    var body = '';
    if (tipo === 'geral' || tipo === 'completo' || tipo === 'tudo') {
        body += '<h3>Balanço do mês (' + mesNome + ')</h3><table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><tr><td style="padding:8px;border-bottom:1px solid #ddd;">Receitas totais</td><td style="text-align:right;padding:8px;color:#22c55e;">+R$ ' + fmt(receitasMes) + '</td></tr><tr><td style="padding:8px;border-bottom:1px solid #ddd;">Despesas totais</td><td style="text-align:right;padding:8px;color:#ef4444;">-R$ ' + fmt(despesasMes) + '</td></tr><tr><td style="padding:8px;border-bottom:1px solid #ddd;">O que entrou</td><td style="text-align:right;padding:8px;color:#22c55e;">+R$ ' + fmt(receitasPagasMes) + '</td></tr><tr><td style="padding:8px;border-bottom:1px solid #ddd;">O que saiu</td><td style="text-align:right;padding:8px;color:#ef4444;">-R$ ' + fmt(despesasPagasMes) + '</td></tr><tr><td style="padding:8px;border-bottom:1px solid #ddd;">Falta receber</td><td style="text-align:right;padding:8px;">R$ ' + fmt(faltaReceberMes) + '</td></tr><tr><td style="padding:8px;border-bottom:1px solid #ddd;">Falta pagar</td><td style="text-align:right;padding:8px;">R$ ' + fmt(faltaPagarMesComTerceiros) + '</td></tr><tr style="font-weight:700;"><td style="padding:12px;">Balanço</td><td style="text-align:right;padding:12px;">R$ ' + fmt(saldoMes) + '</td></tr></table>';
    }
    if ((tipo === 'completo' || tipo === 'geral' || tipo === 'tudo') && totalIncome !== undefined) {
        body += '<h3>Resumo geral</h3><p>Total recebido: R$ ' + fmt(totalIncome) + '</p><p>Total pago: R$ ' + fmt(totalExpense) + '</p><p>Saldo: R$ ' + fmt(totalIncome - totalExpense) + '</p>';
    }
    if (tipo === 'despesas' || tipo === 'tudo') body += '<h3>Despesas do mês</h3><p>Total: R$ ' + fmt(despesasMes) + '</p><p>Pagas: R$ ' + fmt(despesasPagasMes) + '</p><p>Falta pagar: R$ ' + fmt(faltaPagarMesComTerceiros) + '</p>';
    if (tipo === 'receitas' || tipo === 'tudo') body += '<h3>Receitas do mês</h3><p>Total: R$ ' + fmt(receitasMes) + '</p><p>Recebidas: R$ ' + fmt(receitasPagasMes) + '</p><p>Falta receber: R$ ' + fmt(faltaReceberMes) + '</p>';
    if (tipo === 'falta-pagar' || tipo === 'tudo') body += '<h3>O que falta pagar</h3><p>Total a pagar (mês + terceiros): R$ ' + fmt(faltaPagarMesComTerceiros) + '</p>';
    if (tipo === 'quem-eu-devo' || tipo === 'tudo') {
        var terceiros = db.terceiros || [];
        var _t = window._kingFinanceTerceirosTotals && window._kingFinanceTerceirosTotals(terceiros);
        body += '<h3>Quem eu devo</h3>';
        if (_t) body += '<p>Total geral: R$ ' + fmt(_t.totalGeral) + '</p><p>Falta pagar: R$ ' + fmt(_t.totalFalta) + '</p>';
        body += '<table style="width:100%;border-collapse:collapse;margin-top:12px;"><tr style="background:#f1f5f9;"><th style="padding:8px;text-align:left;">Pessoa</th><th style="padding:8px;text-align:right;">Total</th><th style="padding:8px;text-align:right;">Falta</th></tr>' + (terceiros.map(function (p) { var tot = (p.contas || []).reduce(function (s, c) { return s + (parseFloat(c.valor) || 0); }, 0); var pago = (p.contas || []).reduce(function (s, c) { return s + (c.pagamentos || []).reduce(function (a, x) { return a + (Number(x.valor) || 0); }, 0); }, 0); return '<tr><td style="padding:8px;border-bottom:1px solid #eee;">' + (p.nome || '').replace(/</g, ' ') + '</td><td style="padding:8px;text-align:right;border-bottom:1px solid #eee;">R$ ' + fmt(tot) + '</td><td style="padding:8px;text-align:right;border-bottom:1px solid #eee;">R$ ' + fmt(Math.max(0, tot - pago)) + '</td></tr>'; }).join('') || '<tr><td colspan="3" style="padding:12px;color:#666;">Nenhum.</td></tr>') + '</table>';
    }
    if (tipo === 'serasa' || tipo === 'tudo') {
        var dividas = db.dividas || [];
        var totalFalta = dividas.reduce(function (a, d) { var pago = (d.pagamentos || []).reduce(function (ac, p) { return ac + (Number(p.valor) || 0); }, 0); return a + Math.max(0, (Number(d.valorTotal) || 0) - pago); }, 0);
        body += '<h3>Dívidas Serasa / Acordos</h3><p>Falta pagar (acordos): R$ ' + fmt(totalFalta) + '</p><table style="width:100%;border-collapse:collapse;margin-top:12px;"><tr style="background:#f1f5f9;"><th style="padding:8px;text-align:left;">Credor</th><th style="padding:8px;text-align:right;">Total</th><th style="padding:8px;text-align:right;">Pago</th><th style="padding:8px;text-align:right;">Restante</th></tr>' + (dividas.map(function (d) { var pago = (d.pagamentos || []).reduce(function (a, p) { return a + (Number(p.valor) || 0); }, 0); var rest = Math.max(0, (Number(d.valorTotal) || 0) - pago); return '<tr><td style="padding:8px;border-bottom:1px solid #eee;">' + (d.nome || '').replace(/</g, ' ') + '</td><td style="padding:8px;text-align:right;">R$ ' + fmt(d.valorTotal) + '</td><td style="padding:8px;text-align:right;">R$ ' + fmt(pago) + '</td><td style="padding:8px;text-align:right;">R$ ' + fmt(rest) + '</td></tr>'; }).join('') || '<tr><td colspan="4" style="padding:12px;color:#666;">Nenhum acordo.</td></tr>') + '</table>';
    }
    if (tipo === 'fluxo' || tipo === 'tudo') {
        body += '<h3>Fluxo do mês (' + mesNome + ')</h3><table style="width:100%;border-collapse:collapse;"><tr style="background:#f1f5f9;"><th style="padding:8px;text-align:left;">Data</th><th style="padding:8px;">Tipo</th><th style="padding:8px;text-align:left;">Descrição</th><th style="padding:8px;text-align:right;">Valor</th><th style="padding:8px;">Status</th></tr>';
        doMes.forEach(function (t) { var d = (t.transaction_date || t.date || '').toString().slice(0, 10); var tipoStr = (t.type || '').toUpperCase() === 'INCOME' ? 'Receita' : 'Despesa'; var desc = (t.description || t.category_name || '').slice(0, 40); var val = parseFloat(t.amount) || 0; var st = (t.status || '').toUpperCase() === 'PAID' ? 'Pago' : 'Pendente'; body += '<tr><td style="padding:8px;border-bottom:1px solid #eee;">' + d + '</td><td style="padding:8px;border-bottom:1px solid #eee;">' + tipoStr + '</td><td style="padding:8px;border-bottom:1px solid #eee;">' + (desc || '-').replace(/</g, ' ') + '</td><td style="padding:8px;text-align:right;border-bottom:1px solid #eee;">R$ ' + fmt(val) + '</td><td style="padding:8px;border-bottom:1px solid #eee;">' + st + '</td></tr>'; });
        body += '</table>';
    }
    if (tipo === 'trabalhos' || tipo === 'tudo') {
        var trabalhos = db.trabalhos || [];
        body += '<h3>Trabalhos</h3><table style="width:100%;border-collapse:collapse;"><tr style="background:#f1f5f9;"><th style="padding:8px;text-align:left;">Cliente</th><th style="padding:8px;">Serviço</th><th style="padding:8px;text-align:right;">Valor</th><th style="padding:8px;">Data</th></tr>' + (trabalhos.map(function (t) { return '<tr><td style="padding:8px;border-bottom:1px solid #eee;">' + (t.cliente || '').replace(/</g, ' ') + '</td><td style="padding:8px;border-bottom:1px solid #eee;">' + (t.servico || '').replace(/</g, ' ').slice(0, 30) + '</td><td style="padding:8px;text-align:right;border-bottom:1px solid #eee;">R$ ' + fmt(t.valor) + '</td><td style="padding:8px;border-bottom:1px solid #eee;">' + (t.data || t.dataPrevista || '-') + '</td></tr>'; }).join('') || '<tr><td colspan="4" style="padding:12px;color:#666;">Nenhum.</td></tr>') + '</table>';
    }
    if (tipo === 'bens' || tipo === 'tudo') {
        var bens = db.bens || [];
        var emEmp = bens.filter(function (b) { return !b.devolvido; });
        var devolv = bens.filter(function (b) { return !!b.devolvido; });
        body += '<h3>Bens (em empréstimo)</h3><table style="width:100%;border-collapse:collapse;"><tr style="background:#f1f5f9;"><th style="padding:8px;text-align:left;">Nome</th><th style="padding:8px;">Com quem</th><th style="padding:8px;text-align:right;">Valor/mês</th></tr>' + (emEmp.map(function (b) { return '<tr><td style="padding:8px;border-bottom:1px solid #eee;">' + (b.nome || '').replace(/</g, ' ') + '</td><td style="padding:8px;border-bottom:1px solid #eee;">' + (b.possuidor || '').replace(/</g, ' ') + '</td><td style="padding:8px;text-align:right;">R$ ' + fmt(b.valorAluguel) + '</td></tr>'; }).join('') || '<tr><td colspan="3" style="padding:12px;color:#666;">Nenhum.</td></tr>') + '</table>';
        body += '<h3>Bens (devolvidos)</h3><table style="width:100%;border-collapse:collapse;"><tr style="background:#f1f5f9;"><th style="padding:8px;text-align:left;">Nome</th><th style="padding:8px;">Com quem</th></tr>' + (devolv.map(function (b) { return '<tr><td style="padding:8px;border-bottom:1px solid #eee;">' + (b.nome || '').replace(/</g, ' ') + '</td><td style="padding:8px;border-bottom:1px solid #eee;">' + (b.possuidor || '').replace(/</g, ' ') + '</td></tr>'; }).join('') || '<tr><td colspan="2" style="padding:12px;color:#666;">Nenhum.</td></tr>') + '</table>';
    }
    if (tipo === 'cartoes' || tipo === 'tudo') {
        body += '<h3>Cartões</h3><table style="width:100%;border-collapse:collapse;"><tr style="background:#f1f5f9;"><th style="padding:8px;text-align:left;">Nome</th><th style="padding:8px;text-align:right;">Limite</th><th style="padding:8px;">Fechamento</th></tr>' + (cards.map(function (c) { return '<tr><td style="padding:8px;border-bottom:1px solid #eee;">' + (c.name || c.nome || '').replace(/</g, ' ') + '</td><td style="padding:8px;text-align:right;">R$ ' + fmt(c.limit || c.limite) + '</td><td style="padding:8px;">Dia ' + (c.closing_day || c.diaFechamento || '-') + '</td></tr>'; }).join('') || '<tr><td colspan="3" style="padding:12px;color:#666;">Nenhum.</td></tr>') + '</table>';
    }
    return '<div style="padding:24px;font-family:sans-serif;color:#111;"><h1 style="font-size:1.5rem;">' + titulo + ' - ' + mesNome + '</h1>' + body + '<p style="margin-top:24px;font-size:0.85rem;color:#666;">Gerado em ' + new Date().toLocaleString('pt-BR') + '</p></div>';
};

window.showGeneralBalanceModal = async function () {
    try {
        const profileIdDetail = localStorage.getItem('finance_current_profile_id') || '';
        const now = new Date();
        const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
        const dashboardUrl = `${env.API_URL}/api/finance/dashboard?dateFrom=${monthStart}&dateTo=${monthEnd}${profileIdDetail ? '&profile_id=' + profileIdDetail : ''}`;
        const response = await fetch(dashboardUrl, {
            headers: env.HEADERS_AUTH
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar dados do balanço geral');
        }

        const responseData = await response.json();
        const data = responseData.data || responseData;
        // Usar evolucaoMensal e mediaMensal12 do dashboard quando disponíveis (backend já calcula)
        let monthlyAverages = [];
        let avgMonthlyIncome = 0;
        let avgMonthlyExpense = 0;
        if (data.evolucaoMensal && Array.isArray(data.evolucaoMensal) && data.evolucaoMensal.length > 0) {
            monthlyAverages = data.evolucaoMensal.map(m => ({
                month: m.monthLabel || (m.mes ? new Date(m.mes + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : ''),
                income: parseFloat(m.income || 0),
                expense: parseFloat(m.expense || 0)
            }));
            const media = data.mediaMensal12 || {};
            avgMonthlyIncome = parseFloat(media.mediaReceitas || 0);
            avgMonthlyExpense = parseFloat(media.mediaDespesas || 0);
        }
        if (monthlyAverages.length === 0) {
            const transactionsResponse = await fetch(`${env.API_URL}/api/finance/transactions?limit=1000${profileIdDetail ? '&profile_id=' + profileIdDetail : ''}`, {
                headers: env.HEADERS_AUTH
            });
            const transactionsData = await transactionsResponse.json();
            const allTransactions = Array.isArray(transactionsData.data) ? transactionsData.data : (Array.isArray(transactionsData.data?.data) ? transactionsData.data.data : []);
            const now = new Date();
            for (let i = 11; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
                const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                const monthIncome = allTransactions.filter(t => {
                    const tDate = new Date(t.transaction_date || t.date || t.created_at);
                    return tDate >= monthStart && tDate <= monthEnd && (t.type || '').toUpperCase() === 'INCOME' && (t.status || '').toUpperCase() === 'PAID';
                }).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
                const monthExpense = allTransactions.filter(t => {
                    const tDate = new Date(t.transaction_date || t.date || t.created_at);
                    return tDate >= monthStart && tDate <= monthEnd && (t.type || '').toUpperCase() === 'EXPENSE' && (t.status || '').toUpperCase() === 'PAID';
                }).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
                monthlyAverages.push({ month: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }), income: monthIncome, expense: monthExpense });
            }
            avgMonthlyIncome = monthlyAverages.reduce((sum, m) => sum + m.income, 0) / 12;
            avgMonthlyExpense = monthlyAverages.reduce((sum, m) => sum + m.expense, 0) / 12;
        }
        const transactionsResponse = await fetch(`${env.API_URL}/api/finance/transactions?limit=1000${profileIdDetail ? '&profile_id=' + profileIdDetail : ''}`, {
            headers: env.HEADERS_AUTH
        });
        const transactionsData = await transactionsResponse.json();
        const allTransactions = Array.isArray(transactionsData.data) ? transactionsData.data : (transactionsData.data?.data || []);

        const totalIncome = allTransactions
            .filter(t => (t.type || '').toUpperCase() === 'INCOME' && (t.status || '').toUpperCase() === 'PAID')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

        const totalExpense = allTransactions
            .filter(t => (t.type || '').toUpperCase() === 'EXPENSE' && (t.status || '').toUpperCase() === 'PAID')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

        const pendingIncome = allTransactions
            .filter(t => (t.type || '').toUpperCase() === 'INCOME' && (t.status || '').toUpperCase() === 'PENDING')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

        const pendingExpense = allTransactions
            .filter(t => (t.type || '').toUpperCase() === 'EXPENSE' && (t.status || '').toUpperCase() === 'PENDING')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

        const totalTransactions = allTransactions.length;
        const incomeTransactions = allTransactions.filter(t => (t.type || '').toUpperCase() === 'INCOME').length;
        const expenseTransactions = allTransactions.filter(t => (t.type || '').toUpperCase() === 'EXPENSE').length;

        const currentMonth = window.currentFinanceMonth !== undefined ? window.currentFinanceMonth : new Date().getMonth();
        const currentYear = window.currentFinanceYear !== undefined ? window.currentFinanceYear : new Date().getFullYear();
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const mesNome = monthNames[currentMonth] + ' de ' + currentYear;
        const mesRef = currentYear + '-' + String(currentMonth + 1).padStart(2, '0');
        const feed = window.allFinanceTransactions || [];
        const doMes = feed.filter(t => (t.transaction_date || t.date || '').toString().trim().slice(0, 7) === mesRef);
        const receitasMes = doMes.filter(t => (t.type || '').toUpperCase() === 'INCOME').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const despesasMes = doMes.filter(t => (t.type || '').toUpperCase() === 'EXPENSE').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const receitasPagasMes = doMes.filter(t => (t.type || '').toUpperCase() === 'INCOME' && (t.status || '').toUpperCase() === 'PAID').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const despesasPagasMes = doMes.filter(t => (t.type || '').toUpperCase() === 'EXPENSE' && (t.status || '').toUpperCase() === 'PAID').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const faltaReceberMes = doMes.filter(t => (t.type || '').toUpperCase() === 'INCOME' && (t.status || '').toUpperCase() === 'PENDING').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const faltaPagarMes = doMes.filter(t => (t.type || '').toUpperCase() === 'EXPENSE' && (t.status || '').toUpperCase() === 'PENDING').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const terceirosMes = (typeof window._kingFinanceTerceirosEsteMes === 'function' && window._kingFinanceDb && Array.isArray(window._kingFinanceDb.terceiros)) ? window._kingFinanceTerceirosEsteMes(window._kingFinanceDb.terceiros, currentYear, currentMonth + 1) : 0;
        const despesasMesComTerceiros = despesasMes;
        const faltaPagarMesComTerceiros = faltaPagarMes + terceirosMes;
        const saldoMes = receitasMes - despesasMes;

        const fmt = (v) => (Number(v) || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

        const createPrintContent = (tipo) => {
            const titulo = tipo === 'geral' ? 'Balanço Geral' : tipo === 'despesas' ? 'Despesas' : tipo === 'receitas' ? 'Receitas' : 'Balanço Completo (PDF)';
            let body = '';
            if (tipo === 'geral' || tipo === 'completo') {
                body += '<h3>Balanço do mês atual (' + mesNome + ')</h3><table style="width:100%;border-collapse:collapse;margin-bottom:24px;"><tr><td style="padding:8px;border-bottom:1px solid #ddd;">Receitas totais</td><td style="text-align:right;padding:8px;color:#22c55e;">+R$ ' + fmt(receitasMes) + '</td></tr><tr><td style="padding:8px;border-bottom:1px solid #ddd;">Despesas totais</td><td style="text-align:right;padding:8px;color:#ef4444;">-R$ ' + fmt(despesasMesComTerceiros) + '</td></tr><tr><td style="padding:8px;border-bottom:1px solid #ddd;">O que entrou (receitas pagas)</td><td style="text-align:right;padding:8px;color:#22c55e;">+R$ ' + fmt(receitasPagasMes) + '</td></tr><tr><td style="padding:8px;border-bottom:1px solid #ddd;">O que saiu (despesas pagas)</td><td style="text-align:right;padding:8px;color:#ef4444;">-R$ ' + fmt(despesasPagasMes) + '</td></tr><tr><td style="padding:8px;border-bottom:1px solid #ddd;">Falta receber</td><td style="text-align:right;padding:8px;">R$ ' + fmt(faltaReceberMes) + '</td></tr><tr><td style="padding:8px;border-bottom:1px solid #ddd;">Falta pagar</td><td style="text-align:right;padding:8px;">R$ ' + fmt(faltaPagarMesComTerceiros) + '</td></tr><tr style="font-weight:700;"><td style="padding:12px;">Balanço</td><td style="text-align:right;padding:12px;">R$ ' + fmt(saldoMes) + '</td></tr></table>';
            }
            if (tipo === 'completo' || tipo === 'geral') {
                body += '<h3>Resumo geral (todos os períodos)</h3><p>Total recebido: R$ ' + fmt(totalIncome) + '</p><p>Total pago: R$ ' + fmt(totalExpense) + '</p><p>Saldo: R$ ' + fmt(totalIncome - totalExpense) + '</p>';
            }
            if (tipo === 'despesas') body += '<h3>Despesas do mês</h3><p>Total despesas: R$ ' + fmt(despesasMesComTerceiros) + '</p><p>Despesas pagas: R$ ' + fmt(despesasPagasMes) + '</p><p>Falta pagar: R$ ' + fmt(faltaPagarMesComTerceiros) + '</p>';
            if (tipo === 'receitas') body += '<h3>Receitas do mês</h3><p>Total receitas: R$ ' + fmt(receitasMes) + '</p><p>Receitas recebidas: R$ ' + fmt(receitasPagasMes) + '</p><p>Falta receber: R$ ' + fmt(faltaReceberMes) + '</p>';
            return '<div style="padding:24px;font-family:sans-serif;color:#111;"><h1 style="font-size:1.5rem;">' + titulo + ' - ' + mesNome + '</h1>' + body + '<p style="margin-top:24px;font-size:0.85rem;color:#666;">Gerado em ' + new Date().toLocaleString('pt-BR') + '</p></div>';
        };
        window._financePrintBalance = function (tipo) {
            var t = tipo || 'geral';
            if (t === 'meta') {
                if (window.switchUnifiedFinanceTab) window.switchUnifiedFinanceTab('meta');
                setTimeout(function () { window.print(); }, 800);
                return;
            }
            var existing = document.getElementById('finance-print-wrap');
            if (existing) existing.remove();
            var styleEl = document.getElementById('finance-print-style');
            if (styleEl) styleEl.remove();
            var wrap = document.createElement('div');
            wrap.id = 'finance-print-wrap';
            wrap.style.cssText = 'position:fixed;left:0;top:0;width:100%;min-height:100vh;background:#fff;color:#111;padding:24px;z-index:999999;visibility:hidden;';
            wrap.innerHTML = (typeof window.financeBuildPrintContent === 'function' ? window.financeBuildPrintContent(t) : createPrintContent(t));
            document.body.appendChild(wrap);
            var style = document.createElement('style');
            style.id = 'finance-print-style';
            style.textContent = '@media print{body *{visibility:hidden !important}#finance-print-wrap,#finance-print-wrap *{visibility:visible !important}#finance-print-wrap{position:fixed !important;left:0 !important;top:0 !important;width:100% !important;min-height:100vh !important;background:#fff !important;color:#000 !important;z-index:999999 !important;display:block !important}}';
            document.head.appendChild(style);
            window.print();
            setTimeout(function () { wrap.remove(); if (style.parentNode) style.remove(); }, 800);
        };

        const blocoMesAtual = `
                <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%); border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 2px solid rgba(59, 130, 246, 0.3);">
                    <h3 style="color: #93c5fd; font-size: 1.25rem; margin: 0 0 16px 0;"><i class="fas fa-calendar-alt" style="margin-right: 8px;"></i>Balanço do mês atual (${mesNome})</h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                        <div style="display: flex; justify-content: space-between;"><span style="color: rgba(255,255,255,0.8);">Receitas totais</span><strong style="color: #22c55e;">+R$ ${fmt(receitasMes)}</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span style="color: rgba(255,255,255,0.8);">Despesas totais</span><strong style="color: #ef4444;">-R$ ${fmt(despesasMesComTerceiros)}</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span style="color: rgba(255,255,255,0.8);">O que entrou (receitas pagas)</span><strong style="color: #22c55e;">+R$ ${fmt(receitasPagasMes)}</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span style="color: rgba(255,255,255,0.8);">O que saiu (despesas pagas)</span><strong style="color: #ef4444;">-R$ ${fmt(despesasPagasMes)}</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span style="color: rgba(255,255,255,0.8);">Falta receber</span><strong style="color: #f59e0b;">R$ ${fmt(faltaReceberMes)}</strong></div>
                        <div style="display: flex; justify-content: space-between;"><span style="color: rgba(255,255,255,0.8);">Falta pagar</span><strong style="color: #f59e0b;">R$ ${fmt(faltaPagarMesComTerceiros)}</strong></div>
                    </div>
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #f1f5f9; font-weight: 700;">Balanço do mês</span>
                        <strong style="font-size: 1.5rem; color: ${saldoMes >= 0 ? '#22c55e' : '#ef4444'};">R$ ${fmt(Math.abs(saldoMes))}</strong>
                    </div>
                </div>`;

        // Criar modal
        const modal = document.createElement('div');
        modal.id = 'general-balance-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeIn 0.3s ease-out;
        `;

        modal.innerHTML = `
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @media print {
                    body * { visibility: hidden; }
                    #finance-print-wrap, #finance-print-wrap * { visibility: visible; }
                    #finance-print-wrap { position: absolute; left: 0; top: 0; width: 100%; }
                }
            </style>
            <div style="background: linear-gradient(135deg, #1C1C21 0%, #0D0D0F 100%); border-radius: 24px; padding: 40px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); animation: slideUp 0.3s ease-out;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
                    <h2 style="color: white; font-size: 2rem; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 15px;">
                        <i class="fas fa-chart-pie" style="color: #8b5cf6;"></i> Balanço Geral Completo
                    </h2>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="position: relative;">
                            <button onclick="document.getElementById('balance-print-menu').style.display = document.getElementById('balance-print-menu').style.display === 'none' ? 'block' : 'none'" style="padding: 10px 18px; background: rgba(59, 130, 246, 0.25); border: 1px solid rgba(59, 130, 246, 0.5); border-radius: 12px; color: #93c5fd; font-weight: 700; cursor: pointer; font-size: 0.9rem;"><i class="fas fa-print" style="margin-right: 8px;"></i>Imprimir / Exportar</button>
                            <div id="balance-print-menu" style="display: none; position: absolute; top: 100%; right: 0; margin-top: 4px; background: #1e1e24; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 8px; min-width: 220px; z-index: 10001; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
                                <button onclick="window._financePrintBalance('geral'); document.getElementById('balance-print-menu').style.display='none'" style="display: block; width: 100%; padding: 10px 14px; text-align: left; background: none; border: none; color: #e2e8f0; cursor: pointer; border-radius: 8px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'"><i class="fas fa-file-invoice" style="margin-right: 8px;"></i>Balanço geral</button>
                                <button onclick="window._financePrintBalance('despesas'); document.getElementById('balance-print-menu').style.display='none'" style="display: block; width: 100%; padding: 10px 14px; text-align: left; background: none; border: none; color: #e2e8f0; cursor: pointer; border-radius: 8px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'"><i class="fas fa-arrow-down" style="margin-right: 8px;"></i>Só despesas</button>
                                <button onclick="window._financePrintBalance('receitas'); document.getElementById('balance-print-menu').style.display='none'" style="display: block; width: 100%; padding: 10px 14px; text-align: left; background: none; border: none; color: #e2e8f0; cursor: pointer; border-radius: 8px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'"><i class="fas fa-arrow-up" style="margin-right: 8px;"></i>Só receitas</button>
                                <button onclick="window._financePrintBalance('completo'); document.getElementById('balance-print-menu').style.display='none'" style="display: block; width: 100%; padding: 10px 14px; text-align: left; background: none; border: none; color: #e2e8f0; cursor: pointer; border-radius: 8px; font-size: 0.9rem;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'"><i class="fas fa-file-pdf" style="margin-right: 8px;"></i>Tudo detalhado (imprimir/PDF)</button>
                            </div>
                        </div>
                        <button onclick="closeGeneralBalanceModal()" style="background: rgba(255,255,255,0.1); border: none; color: white; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 1.2rem;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'"><i class="fas fa-times"></i></button>
                    </div>
                </div>
                
                ${blocoMesAtual}
                
                <!-- Resumo Principal -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px;">
                    <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%); border-radius: 16px; padding: 25px; border: 2px solid rgba(34, 197, 94, 0.3);">
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.9rem; margin-bottom: 10px;">Total Recebido</p>
                        <h3 style="color: #22c55e; font-size: 2.5rem; font-weight: 800; margin: 0;">R$ ${formatCurrency(totalIncome)}</h3>
                    </div>
                    <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%); border-radius: 16px; padding: 25px; border: 2px solid rgba(239, 68, 68, 0.3);">
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.9rem; margin-bottom: 10px;">Total Pago</p>
                        <h3 style="color: #ef4444; font-size: 2.5rem; font-weight: 800; margin: 0;">R$ ${formatCurrency(totalExpense)}</h3>
                    </div>
                </div>
                
                <!-- Saldo e Pendências -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px;">
                    <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%); border-radius: 16px; padding: 25px; border: 2px solid rgba(102, 126, 234, 0.3);">
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.9rem; margin-bottom: 10px;">Saldo Disponível</p>
                        <h3 style="color: #667eea; font-size: 2.5rem; font-weight: 800; margin: 0;">R$ ${formatCurrency(totalIncome - totalExpense)}</h3>
                    </div>
                    <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%); border-radius: 16px; padding: 25px; border: 2px solid rgba(245, 158, 11, 0.3);">
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.9rem; margin-bottom: 10px;">Pendências</p>
                        <div style="margin-top: 10px;">
                            <p style="color: #f59e0b; font-size: 1.2rem; margin: 5px 0;">Receber: R$ ${formatCurrency(pendingIncome)}</p>
                            <p style="color: #ef4444; font-size: 1.2rem; margin: 5px 0;">Pagar: R$ ${formatCurrency(pendingExpense)}</p>
                        </div>
                    </div>
                </div>
                
                <!-- Estatísticas -->
                <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 25px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="color: white; font-size: 1.3rem; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-chart-bar" style="color: #8b5cf6;"></i> Estatísticas Gerais
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                        <div>
                            <p style="color: rgba(255,255,255,0.7); font-size: 0.9rem; margin-bottom: 5px;">Total de Transações</p>
                            <p style="color: white; font-size: 1.8rem; font-weight: 700; margin: 0;">${totalTransactions}</p>
                        </div>
                        <div>
                            <p style="color: rgba(255,255,255,0.7); font-size: 0.9rem; margin-bottom: 5px;">Receitas</p>
                            <p style="color: #22c55e; font-size: 1.8rem; font-weight: 700; margin: 0;">${incomeTransactions}</p>
                        </div>
                        <div>
                            <p style="color: rgba(255,255,255,0.7); font-size: 0.9rem; margin-bottom: 5px;">Despesas</p>
                            <p style="color: #ef4444; font-size: 1.8rem; font-weight: 700; margin: 0;">${expenseTransactions}</p>
                        </div>
                    </div>
                </div>
                
                <!-- Média Mensal -->
                <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 25px; margin-bottom: 30px; border: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="color: white; font-size: 1.3rem; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-calendar-alt" style="color: #8b5cf6;"></i> Média Mensal (últimos 12 Meses)
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                        <div>
                            <p style="color: rgba(255,255,255,0.7); font-size: 0.9rem; margin-bottom: 5px;">Média de Receitas</p>
                            <p style="color: #22c55e; font-size: 2rem; font-weight: 700; margin: 0;">R$ ${formatCurrency(avgMonthlyIncome)}</p>
                        </div>
                        <div>
                            <p style="color: rgba(255,255,255,0.7); font-size: 0.9rem; margin-bottom: 5px;">Média de Despesas</p>
                            <p style="color: #ef4444; font-size: 2rem; font-weight: 700; margin: 0;">R$ ${formatCurrency(avgMonthlyExpense)}</p>
                        </div>
                    </div>
                </div>
                
                <!-- Evolução Mensal -->
                <div style="background: rgba(255,255,255,0.05); border-radius: 16px; padding: 25px; border: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="color: white; font-size: 1.3rem; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-chart-line" style="color: #8b5cf6;"></i> Evolução Mensal
                    </h3>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${monthlyAverages.map(m => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <span style="color: rgba(255,255,255,0.8); font-weight: 600;">${m.month}</span>
                                <div style="display: flex; gap: 20px;">
                                    <span style="color: #22c55e; font-weight: 600;">+R$ ${formatCurrency(m.income)}</span>
                                    <span style="color: #ef4444; font-weight: 600;">-R$ ${formatCurrency(m.expense)}</span>
                                    <span style="color: ${m.income - m.expense >= 0 ? '#22c55e' : '#ef4444'}; font-weight: 700;">
                                        R$ ${formatCurrency(m.income - m.expense)}
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeGeneralBalanceModal();
            }
        });

    } catch (error) {
        console.error('Erro ao carregar balanço geral:', error);
        alert('Erro ao carregar informações do balanço geral. Tente novamente.');
    }
};

window.closeGeneralBalanceModal = function () {
    const modal = document.getElementById('general-balance-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => modal.remove(), 300);
    }
};

window.showMonthlyBalanceModal = function () {
    const transactions = window.allFinanceTransactions || [];
    const currentMonth = window.currentFinanceMonth !== undefined ? window.currentFinanceMonth : new Date().getMonth();
    const currentYear = window.currentFinanceYear !== undefined ? window.currentFinanceYear : new Date().getFullYear();

    // Filtrar transações do mês atual
    const monthTransactions = transactions.filter(t => {
        const date = new Date(t.transaction_date || t.date || t.created_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    // Calcular receitas e despesas
    const income = monthTransactions
        .filter(t => (t.type || '').toUpperCase() === 'INCOME' && (t.status || '').toUpperCase() === 'PAID')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const expenses = monthTransactions
        .filter(t => (t.type || '').toUpperCase() === 'EXPENSE' && (t.status || '').toUpperCase() === 'PAID')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const balance = income - expenses;

    // Criar modal
    const modal = document.createElement('div');
    modal.id = 'monthly-balance-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px);';
    modal.innerHTML = `
        <div style="background: var(--bg-card, #1C1C21); border-radius: 20px; padding: 30px; max-width: 400px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.6); animation: slideUp 0.3s ease-out;">
            <h2 style="color: var(--text-primary, #FFFFFF); font-size: 1.5rem; font-weight: 700; margin: 0 0 25px 0; text-align: center;">
                Balanço mensal
            </h2>
            
            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <span style="color: var(--text-primary, #FFFFFF); font-size: 1rem;">Receitas</span>
                    <span style="color: #22c55e; font-size: 1.2rem; font-weight: 700;">R$ ${formatCurrency(income)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <span style="color: var(--text-primary, #FFFFFF); font-size: 1rem;">Despesas</span>
                    <span style="color: #ef4444; font-size: 1.2rem; font-weight: 700;">R$ ${formatCurrency(expenses)}</span>
                </div>
                <div style="height: 1px; background: var(--border-glass, #2C2C2F); margin: 20px 0;"></div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-primary, #FFFFFF); font-size: 1.1rem; font-weight: 600;">Balanço</span>
                    <span style="color: ${balance >= 0 ? '#22c55e' : '#ef4444'}; font-size: 1.5rem; font-weight: 700;">R$ ${formatCurrency(Math.abs(balance))}</span>
                </div>
            </div>
            
            <div style="display: flex; gap: 12px; margin-top: 30px;">
                <button onclick="closeMonthlyBalanceModal()" style="flex: 1; padding: 14px; border-radius: 12px; border: 2px solid var(--border-glass, #2C2C2F); background: transparent; color: var(--text-primary, #FFFFFF); cursor: pointer; font-weight: 600; font-size: 1rem; transition: all 0.2s;"
                        onmouseover="this.style.background='rgba(255,255,255,0.05)'"
                        onmouseout="this.style.background='transparent'">
                    CANCELAR
                </button>
                <button onclick="closeMonthlyBalanceModal(); showGeneralBalanceModal();" style="flex: 1; padding: 14px; border-radius: 12px; border: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; cursor: pointer; font-weight: 700; font-size: 1rem; transition: all 0.2s;"
                        onmouseover="this.style.transform='translateY(-2px)'"
                        onmouseout="this.style.transform='translateY(0)'">
                    VER BALAN?O GERAL
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeMonthlyBalanceModal();
        }
    });

    // Fechar com ESC
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeMonthlyBalanceModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
};

window.closeMonthlyBalanceModal = function () {
    const modal = document.getElementById('monthly-balance-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => modal.remove(), 300);
    }
};


window.openFinanceFilters = function () {
    const transactions = window.allFinanceTransactions || [];

    // Criar modal de filtros avançados
    const modal = document.createElement('div');
    modal.id = 'finance-filters-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px);';
    modal.innerHTML = `
        <div style="background: var(--bg-card, #1C1C21); border-radius: 20px; padding: 30px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.6);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="color: var(--text-primary, #FFFFFF); font-size: 1.5rem; font-weight: 700; margin: 0;">
                    <i class="fas fa-filter"></i> Filtros Avançados
                </h2>
                <button onclick="closeFinanceFiltersModal()" style="background: transparent; border: none; color: var(--text-primary, #FFFFFF); font-size: 1.5rem; cursor: pointer; padding: 8px;">&times;</button>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <!-- Filtro por Tipo -->
                <div>
                    <label style="display: block; color: var(--text-primary, #FFFFFF); margin-bottom: 10px; font-weight: 600;">Tipo</label>
                    <select id="filter-type" style="width: 100%; padding: 12px; border-radius: 12px; border: 2px solid var(--border-glass, #2C2C2F); background: var(--preto-fundo, #0D0D0F); color: var(--text-primary, #FFFFFF);">
                        <option value="">Todos</option>
                        <option value="INCOME">Receitas</option>
                        <option value="EXPENSE">Despesas</option>
                    </select>
                </div>
                
                <!-- Filtro por Status -->
                <div>
                    <label style="display: block; color: var(--text-primary, #FFFFFF); margin-bottom: 10px; font-weight: 600;">Status</label>
                    <select id="filter-status" style="width: 100%; padding: 12px; border-radius: 12px; border: 2px solid var(--border-glass, #2C2C2F); background: var(--preto-fundo, #0D0D0F); color: var(--text-primary, #FFFFFF);">
                        <option value="">Todos</option>
                        <option value="PAID">Pago/Recebido</option>
                        <option value="PENDING">Pendente</option>
                    </select>
                </div>
                
                <!-- Filtro por Período -->
                <div>
                    <label style="display: block; color: var(--text-primary, #FFFFFF); margin-bottom: 10px; font-weight: 600;">Período</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <input type="date" id="filter-date-from" style="padding: 12px; border-radius: 12px; border: 2px solid var(--border-glass, #2C2C2F); background: var(--preto-fundo, #0D0D0F); color: var(--text-primary, #FFFFFF);">
                        <input type="date" id="filter-date-to" style="padding: 12px; border-radius: 12px; border: 2px solid var(--border-glass, #2C2C2F); background: var(--preto-fundo, #0D0D0F); color: var(--text-primary, #FFFFFF);">
                    </div>
                </div>
                
                <!-- Filtro por Valor -->
                <div>
                    <label style="display: block; color: var(--text-primary, #FFFFFF); margin-bottom: 10px; font-weight: 600;">Valor</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <input type="number" id="filter-amount-min" placeholder="Mínimo" step="0.01" style="padding: 12px; border-radius: 12px; border: 2px solid var(--border-glass, #2C2C2F); background: var(--preto-fundo, #0D0D0F); color: var(--text-primary, #FFFFFF);">
                        <input type="number" id="filter-amount-max" placeholder="Máximo" step="0.01" style="padding: 12px; border-radius: 12px; border: 2px solid var(--border-glass, #2C2C2F); background: var(--preto-fundo, #0D0D0F); color: var(--text-primary, #FFFFFF);">
                    </div>
                </div>
                
                <!-- Busca por Descrição -->
                <div>
                    <label style="display: block; color: var(--text-primary, #FFFFFF); margin-bottom: 10px; font-weight: 600;">Buscar</label>
                    <input type="text" id="filter-search" placeholder="Digite para buscar..." style="width: 100%; padding: 12px; border-radius: 12px; border: 2px solid var(--border-glass, #2C2C2F); background: var(--preto-fundo, #0D0D0F); color: var(--text-primary, #FFFFFF);">
                </div>
            </div>
            
            <div style="display: flex; gap: 12px; margin-top: 30px;">
                <button onclick="closeFinanceFiltersModal()" style="flex: 1; padding: 14px; border-radius: 12px; border: 2px solid var(--border-glass, #2C2C2F); background: transparent; color: var(--text-primary, #FFFFFF); cursor: pointer; font-weight: 600;">
                    Limpar
                </button>
                <button onclick="applyFinanceFilters()" style="flex: 2; padding: 14px; border-radius: 12px; border: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; cursor: pointer; font-weight: 700;">
                    Aplicar Filtros
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeFinanceFiltersModal();
        }
    });
};

window.closeFinanceFiltersModal = function () {
    const modal = document.getElementById('finance-filters-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => modal.remove(), 300);
    }
};

window.applyFinanceFilters = function () {
    const type = document.getElementById('filter-type')?.value || '';
    const status = document.getElementById('filter-status')?.value || '';
    const dateFrom = document.getElementById('filter-date-from')?.value || '';
    const dateTo = document.getElementById('filter-date-to')?.value || '';
    const amountMin = parseFloat(document.getElementById('filter-amount-min')?.value) || 0;
    const amountMax = parseFloat(document.getElementById('filter-amount-max')?.value) || Infinity;
    const search = document.getElementById('filter-search')?.value.toLowerCase() || '';

    let filtered = window.allFinanceTransactions || [];

    // Aplicar filtros
    if (type) {
        filtered = filtered.filter(t => (t.type || '').toUpperCase() === type);
    }
    if (status) {
        filtered = filtered.filter(t => (t.status || '').toUpperCase() === status);
    }
    if (dateFrom) {
        filtered = filtered.filter(t => {
            const date = new Date(t.transaction_date || t.date || t.created_at);
            return date >= new Date(dateFrom);
        });
    }
    if (dateTo) {
        filtered = filtered.filter(t => {
            const date = new Date(t.transaction_date || t.date || t.created_at);
            const dateToObj = new Date(dateTo);
            dateToObj.setHours(23, 59, 59, 999);
            return date <= dateToObj;
        });
    }
    if (amountMin > 0) {
        filtered = filtered.filter(t => parseFloat(t.amount || 0) >= amountMin);
    }
    if (amountMax < Infinity) {
        filtered = filtered.filter(t => parseFloat(t.amount || 0) <= amountMax);
    }
    if (search) {
        filtered = filtered.filter(t => {
            const desc = (t.description || '').toLowerCase();
            const cat = (t.category_name || '').toLowerCase();
            return desc.includes(search) || cat.includes(search);
        });
    }

    // Renderizar transações filtradas
    renderFinanceTransactions(filtered, window.currentFinanceTab || 'all');

    // Fechar modal
    closeFinanceFiltersModal();
};

window.exportFinanceReport = function () {
    const transactions = window.allFinanceTransactions || [];
    const currentMonth = window.currentFinanceMonth !== undefined ? window.currentFinanceMonth : new Date().getMonth();
    const currentYear = window.currentFinanceYear !== undefined ? window.currentFinanceYear : new Date().getFullYear();
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

    // Filtrar transações do mês atual
    const monthTransactions = transactions.filter(t => {
        const date = new Date(t.transaction_date || t.date || t.created_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    // Criar CSV
    const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Status', 'Observações'];
    const rows = monthTransactions.map(t => {
        const date = new Date(t.transaction_date || t.date || t.created_at);
        return [
            date.toLocaleDateString('pt-BR'),
            (t.type || '').toUpperCase() === 'INCOME' ? 'Receita' : 'Despesa',
            t.description || '',
            t.category_name || '',
            `R$ ${formatCurrency(t.amount || 0)}`,
            (t.status || '').toUpperCase() === 'PAID' ? 'Pago' : 'Pendente',
            t.notes || ''
        ];
    });

    // Calcular totais
    const income = monthTransactions
        .filter(t => (t.type || '').toUpperCase() === 'INCOME')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const expenses = monthTransactions
        .filter(t => (t.type || '').toUpperCase() === 'EXPENSE')
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    rows.push([]);
    rows.push(['TOTAL RECEITAS', '', '', '', `R$ ${formatCurrency(income)}`, '', '']);
    rows.push(['TOTAL DESPESAS', '', '', '', `R$ ${formatCurrency(expenses)}`, '', '']);
    rows.push(['BALAN?O', '', '', '', `R$ ${formatCurrency(income - expenses)}`, '', '']);

    // Converter para CSV
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-financeiro-${monthNames[currentMonth]}-${currentYear}.csv`;
    link.click();
};

window.showFinanceCharts = function () {
    const transactions = window.allFinanceTransactions || [];
    const currentMonth = window.currentFinanceMonth !== undefined ? window.currentFinanceMonth : new Date().getMonth();
    const currentYear = window.currentFinanceYear !== undefined ? window.currentFinanceYear : new Date().getFullYear();

    // Filtrar transações do mês atual
    const monthTransactions = transactions.filter(t => {
        const date = new Date(t.transaction_date || t.date || t.created_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    // Agrupar por categoria
    const categoryData = {};
    monthTransactions.forEach(t => {
        const cat = t.category_name || 'Sem categoria';
        if (!categoryData[cat]) {
            categoryData[cat] = { income: 0, expense: 0 };
        }
        const amount = parseFloat(t.amount || 0);
        if ((t.type || '').toUpperCase() === 'INCOME') {
            categoryData[cat].income += amount;
        } else {
            categoryData[cat].expense += amount;
        }
    });

    // Criar modal com gráficos
    const modal = document.createElement('div');
    modal.id = 'finance-charts-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px); overflow-y: auto;';
    modal.innerHTML = `
        <div style="background: var(--bg-card, #1C1C21); border-radius: 20px; padding: 30px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.6);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <h2 style="color: var(--text-primary, #FFFFFF); font-size: 1.5rem; font-weight: 700; margin: 0;">
                    <i class="fas fa-chart-line"></i> Análise Financeira
                </h2>
                <button onclick="closeFinanceChartsModal()" style="background: transparent; border: none; color: var(--text-primary, #FFFFFF); font-size: 1.5rem; cursor: pointer; padding: 8px;">&times;</button>
            </div>
            
            <div style="display: grid; gap: 20px;">
                <!-- Gráfico de Despesas por Categoria -->
                <div>
                    <h3 style="color: var(--text-primary, #FFFFFF); margin-bottom: 15px;">Despesas por Categoria</h3>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${Object.entries(categoryData)
            .filter(([cat, data]) => data.expense > 0)
            .sort((a, b) => b[1].expense - a[1].expense)
            .map(([cat, data]) => {
                const maxExpense = Math.max(...Object.values(categoryData).map(d => d.expense));
                const percentage = maxExpense > 0 ? (data.expense / maxExpense) * 100 : 0;
                return `
                                    <div>
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                            <span style="color: var(--text-primary, #FFFFFF); font-size: 0.9rem;">${cat}</span>
                                            <span style="color: #ef4444; font-weight: 600;">R$ ${formatCurrency(data.expense)}</span>
                                        </div>
                                        <div style="width: 100%; height: 8px; background: var(--preto-fundo, #0D0D0F); border-radius: 4px; overflow: hidden;">
                                            <div style="width: ${percentage}%; height: 100%; background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%); transition: width 0.5s;"></div>
                                        </div>
                                    </div>
                                `;
            }).join('')}
                    </div>
                </div>
                
                <!-- Gráfico de Receitas por Categoria -->
                <div>
                    <h3 style="color: var(--text-primary, #FFFFFF); margin-bottom: 15px;">Receitas por Categoria</h3>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${Object.entries(categoryData)
            .filter(([cat, data]) => data.income > 0)
            .sort((a, b) => b[1].income - a[1].income)
            .map(([cat, data]) => {
                const maxIncome = Math.max(...Object.values(categoryData).map(d => d.income));
                const percentage = maxIncome > 0 ? (data.income / maxIncome) * 100 : 0;
                return `
                                    <div>
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                            <span style="color: var(--text-primary, #FFFFFF); font-size: 0.9rem;">${cat}</span>
                                            <span style="color: #22c55e; font-weight: 600;">R$ ${formatCurrency(data.income)}</span>
                                        </div>
                                        <div style="width: 100%; height: 8px; background: var(--preto-fundo, #0D0D0F); border-radius: 4px; overflow: hidden;">
                                            <div style="width: ${percentage}%; height: 100%; background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%); transition: width 0.5s;"></div>
                                        </div>
                                    </div>
                                `;
            }).join('')}
                    </div>
                </div>
            </div>
            
            <button onclick="closeFinanceChartsModal()" style="width: 100%; padding: 14px; border-radius: 12px; border: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; cursor: pointer; font-weight: 700; margin-top: 25px;">
                Fechar
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeFinanceChartsModal();
        }
    });
};

window.closeFinanceChartsModal = function () {
    const modal = document.getElementById('finance-charts-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => modal.remove(), 300);
    }
};

// Funções de filtro para os cards clicáveis
window.showAllTransactions = function () {
    // Limpar filtros e mostrar TODAS as transações
    window.currentFinanceTab = 'all';
    window.currentFinanceFilter = null;

    // Atualizar aba ativa
    document.querySelectorAll('.finance-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = 'var(--finance-text-secondary)';
    });

    const allBtn = document.querySelector('[data-tab="all"]');
    if (allBtn) {
        allBtn.classList.add('active');
        allBtn.style.color = 'var(--finance-text-primary)';
    }

    // Renderizar todas as transações sem filtros
    if (window.allFinanceTransactions && window.allFinanceTransactions.length > 0) {
        renderFinanceTransactions(window.allFinanceTransactions, 'all');
    } else {
        // Recarregar transações se não houver
        window.loadFinanceTransactions();
    }
};

window.filterByPendingIncome = function () {
    // Filtrar apenas receitas pendentes - NÃO atualizar cards de resumo
    window.currentFinanceFilter = 'pending-income';
    window.currentFinanceTab = 'income';
    const transactions = window.allFinanceTransactions || [];
    const filtered = transactions.filter(t =>
        (t.type || '').toUpperCase() === 'INCOME' &&
        (t.status || '').toUpperCase() === 'PENDING'
    );

    // Atualizar aba ativa
    document.querySelectorAll('.finance-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = 'var(--text-secondary, #888888)';
        btn.style.borderBottomColor = 'transparent';
    });

    // NÃO atualizar cards de resumo - apenas filtrar transações abaixo
    // Renderizar transações filtradas
    renderFinanceTransactions(filtered, 'income');
};

window.filterByPendingExpensePrevious = function () {
    window.currentFinanceTab = 'expense';
    window.currentFinanceFilter = 'pending-expense-previous';
    const transactions = window.allFinanceTransactions || [];
    const antesDoMes = financeTransactionsBeforeCurrentMonth(transactions);
    const filtered = antesDoMes.filter(t =>
        (t.type || '').toUpperCase() === 'EXPENSE' &&
        (t.status || '').toUpperCase() === 'PENDING'
    );
    document.querySelectorAll('.finance-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = 'var(--finance-text-secondary)';
    });
    const expenseBtn = document.querySelector('[data-tab="expense"]');
    if (expenseBtn) {
        expenseBtn.classList.add('active');
        expenseBtn.style.color = 'var(--finance-text-primary)';
    }
    renderFinanceTransactions(filtered, 'expense');
};

function financeTransactionsCurrentMonthOnly(transactions) {
    var currentYear = window.currentFinanceYear !== undefined ? window.currentFinanceYear : new Date().getFullYear();
    var currentMonth = window.currentFinanceMonth !== undefined ? window.currentFinanceMonth : new Date().getMonth();
    var mesRef = currentYear + '-' + String(currentMonth + 1).padStart(2, '0');
    function extrairAnoMes(d) {
        var s = (d || '').toString().trim();
        if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
        var p = s.split(/[\/\-]/);
        if (p.length >= 3) { var y = p[2].length === 4 ? p[2] : p[0]; var m = p[1] && p[1].length <= 2 ? p[1] : p[0]; return y + '-' + String(m).padStart(2, '0'); }
        return '';
    }
    return (transactions || []).filter(function (t) { return extrairAnoMes(t.transaction_date || t.date) === mesRef; });
}
function financeTransactionsBeforeCurrentMonth(transactions) {
    var currentYear = window.currentFinanceYear !== undefined ? window.currentFinanceYear : new Date().getFullYear();
    var currentMonth = window.currentFinanceMonth !== undefined ? window.currentFinanceMonth : new Date().getMonth();
    var mesRef = currentYear + '-' + String(currentMonth + 1).padStart(2, '0');
    function extrairAnoMes(d) {
        var s = (d || '').toString().trim();
        if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
        var p = s.split(/[\/\-]/);
        if (p.length >= 3) { var y = p[2].length === 4 ? p[2] : p[0]; var m = p[1] && p[1].length <= 2 ? p[1] : p[0]; return y + '-' + String(m).padStart(2, '0'); }
        return '';
    }
    return (transactions || []).filter(function (t) { var dt = extrairAnoMes(t.transaction_date || t.date); return dt && dt < mesRef; });
}

window.filterByPendingExpense = function () {
    // Filtrar apenas despesas pendentes DESTE mês
    window.currentFinanceTab = 'expense';
    window.currentFinanceFilter = 'pending-expense';
    const transactions = window.allFinanceTransactions || [];
    const doMes = financeTransactionsCurrentMonthOnly(transactions);
    const filtered = doMes.filter(t =>
        (t.type || '').toUpperCase() === 'EXPENSE' &&
        (t.status || '').toUpperCase() === 'PENDING'
    );

    // Atualizar aba ativa
    document.querySelectorAll('.finance-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = 'var(--finance-text-secondary)';
    });

    const expenseBtn = document.querySelector('[data-tab="expense"]');
    if (expenseBtn) {
        expenseBtn.classList.add('active');
        expenseBtn.style.color = 'var(--finance-text-primary)';
    }

    // NÃO atualizar cards de resumo - apenas filtrar transações abaixo
    // Renderizar transações filtradas
    renderFinanceTransactions(filtered, 'expense');
};

window.filterByBalance = function () {
    // Mostrar todas as transações (saldo disponível) - NÃO atualizar cards de resumo
    window.currentFinanceTab = 'all';
    window.currentFinanceFilter = null;
    const transactions = window.allFinanceTransactions || [];

    // Atualizar aba ativa
    document.querySelectorAll('.finance-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = 'var(--finance-text-secondary)';
    });
    const allBtn = document.querySelector('[data-tab="all"]');
    if (allBtn) {
        allBtn.classList.add('active');
        allBtn.style.color = 'var(--finance-text-primary)';
    }

    // NÃO atualizar cards de resumo - apenas mostrar todas as transações abaixo
    renderFinanceTransactions(transactions, 'all');
};

window.filterByMonthlyIncomeFromCard = function () {
    window._financeCardFilter = 'income';
    if (window.loadFinanceTransactions) window.loadFinanceTransactions();
};
window.filterByMonthlyExpenseFromCard = function () {
    window._financeCardFilter = 'expense';
    if (window.loadFinanceTransactions) window.loadFinanceTransactions();
};
window.filterByTotalBalanceFromCard = function () {
    window._financeCardFilter = 'all';
    if (window.loadFinanceTransactions) window.loadFinanceTransactions();
};

window.filterByPaidIncome = function () {
    // Total recebido: mostrar só receitas PAGAS DESTE mês
    window.currentFinanceTab = 'income';
    window.currentFinanceFilter = 'paid-income';
    const transactions = window.allFinanceTransactions || [];
    const doMes = financeTransactionsCurrentMonthOnly(transactions);
    const onlyPaidIncome = doMes.filter(t => (t.type || '').toUpperCase() === 'INCOME' && (t.status || '').toUpperCase() === 'PAID');

    document.querySelectorAll('.finance-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = 'var(--finance-text-secondary)';
    });
    const incomeBtn = document.querySelector('[data-tab="income"]');
    if (incomeBtn) {
        incomeBtn.classList.add('active');
        incomeBtn.style.color = 'var(--finance-text-primary)';
    }

    renderFinanceTransactions(onlyPaidIncome, 'income');
};

window.filterByPaidExpense = function () {
    // O que foi pago: só despesas PAGAS DESTE mês
    window.currentFinanceTab = 'expense';
    window.currentFinanceFilter = 'paid-expense';
    const transactions = window.allFinanceTransactions || [];
    const doMes = financeTransactionsCurrentMonthOnly(transactions);
    const filtered = doMes.filter(t =>
        (t.type || '').toUpperCase() === 'EXPENSE' &&
        (t.status || '').toUpperCase() === 'PAID'
    );

    // Atualizar aba ativa
    document.querySelectorAll('.finance-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = 'var(--finance-text-secondary)';
    });

    const expenseBtn = document.querySelector('[data-tab="expense"]');
    if (expenseBtn) {
        expenseBtn.classList.add('active');
        expenseBtn.style.color = 'var(--finance-text-primary)';
    }

    renderFinanceTransactions(filtered, 'expense');
};

// FUNÇÃO REMOVIDA: updateFinanceCardsFromTransactions
// Os cards de resumo devem permanecer FIXOS e não serem alterados pelos filtros
// Os filtros apenas mostram/ocultam transações abaixo, sem alterar os cards

// FUNÇÃO REMOVIDA: updateFinanceTotals
// Os cards de resumo devem permanecer FIXOS e não serem alterados pelos filtros
// Os filtros apenas mostram/ocultam transações abaixo, sem alterar os cards

window.showNewEntryModal = function () {
    // Criar modal para escolher entre Receita ou Despesa
    const modal = document.createElement('div');
    modal.id = 'new-entry-type-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease-out;
    `;

    modal.innerHTML = `
        <div style="background: var(--finance-card-dark); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 40px; max-width: 500px; width: 100%; text-align: center;">
            <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--finance-text-primary); margin-bottom: 32px;">Nova Entrada</h3>
            <p style="color: var(--finance-text-secondary); margin-bottom: 32px; font-size: 0.95rem;">Escolha o tipo de transação:</p>
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <button onclick="document.getElementById('new-entry-type-modal').remove(); window.openAddTransactionModal('income')" style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 20px; background: rgba(34, 197, 94, 0.1); border: 2px solid rgba(34, 197, 94, 0.3); border-radius: 16px; color: var(--finance-neon-green); font-weight: 700; font-size: 1.1rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(34, 197, 94, 0.2)'; this.style.borderColor='rgba(34, 197, 94, 0.5)'" onmouseout="this.style.background='rgba(34, 197, 94, 0.1)'; this.style.borderColor='rgba(34, 197, 94, 0.3)'">
                    <i class="fas fa-arrow-trend-up" style="font-size: 1.5rem;"></i>
                    <span>Nova Receita</span>
                </button>
                <button onclick="document.getElementById('new-entry-type-modal').remove(); window.openAddTransactionModal('expense')" style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 20px; background: rgba(239, 68, 68, 0.1); border: 2px solid rgba(239, 68, 68, 0.3); border-radius: 16px; color: var(--finance-neon-red); font-weight: 700; font-size: 1.1rem; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'; this.style.borderColor='rgba(239, 68, 68, 0.5)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'; this.style.borderColor='rgba(239, 68, 68, 0.3)'">
                    <i class="fas fa-arrow-trend-down" style="font-size: 1.5rem;"></i>
                    <span>Nova Despesa</span>
                </button>
            </div>
            <button onclick="document.getElementById('new-entry-type-modal').remove()" style="margin-top: 24px; padding: 12px 24px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: var(--finance-text-secondary); font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                Cancelar
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Fechar com ESC
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
};

window.openAddTransactionModal = async function (type, transactionData = null) {
    // Remover modal existente se houver
    const existingModal = document.getElementById('finance-transaction-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Buscar categorias, contas e (para despesa) cartões de crédito
    let categories = [];
    let accounts = [];
    let cards = [];

    try {
        const promises = [
            fetch(`${env.API_URL}/api/finance/categories`, { headers: env.HEADERS_AUTH }),
            fetch(`${env.API_URL}/api/finance/accounts`, { headers: env.HEADERS_AUTH })
        ];
        if (type === 'expense') promises.push(fetch(`${env.API_URL}/api/finance/cards`, { headers: env.HEADERS_AUTH }));
        const results = await Promise.all(promises);

        if (results[0].ok) {
            const catData = await results[0].json();
            const allCats = Array.isArray(catData.data) ? catData.data : (catData.data?.data || []);
            const expectedType = type === 'income' ? 'INCOME' : 'EXPENSE';
            categories = allCats.filter(c => (c.type || '').toUpperCase() === expectedType);
        }
        if (results[1].ok) {
            const accData = await results[1].json();
            accounts = Array.isArray(accData.data) ? accData.data : (accData.data?.data || []);
        }
        if (type === 'expense' && results[2] && results[2].ok) {
            const cardData = await results[2].json();
            cards = Array.isArray(cardData.data) ? cardData.data : (cardData.data?.data || []);
        }
    } catch (error) {
        console.error('Erro ao carregar categorias/contas/cartões:', error);
    }

    // Criar novo modal
    const modal = document.createElement('div');
    modal.id = 'finance-transaction-modal';
    modal.className = 'modal-overlay';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10, 10, 12, 0.95); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(8px); overflow-y: auto;';
    document.body.appendChild(modal);

    const isIncome = type === 'income';
    const isEdit = !!transactionData;
    const modalTitle = isEdit ? (isIncome ? 'Editar Receita' : 'Editar Despesa') : (isIncome ? 'Nova Receita' : 'Nova Despesa');
    const modalColor = isIncome ? '#22c55e' : '#ef4444';
    const modalGradient = isIncome
        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
        : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';

    // Data padrão
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    modal.innerHTML = `
        <div style="background: #16161a; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 24px; padding: 0; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.8); animation: slideUp 0.3s ease-out; margin: auto;">
            <!-- Header com gradiente -->
            <div style="background: ${modalGradient}; padding: 25px 30px; border-radius: 24px 24px 0 0; position: sticky; top: 0; z-index: 10;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="color: white; margin: 0; font-size: 1.6rem; font-weight: 700; display: flex; align-items: center; gap: 12px;">
                        <i class="fas ${isIncome ? 'fa-arrow-up' : 'fa-arrow-down'}" style="font-size: 1.4rem;"></i>
                        ${modalTitle}
                    </h2>
                    <button id="close-modal-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 1.5rem; cursor: pointer; padding: 8px 12px; border-radius: 8px; line-height: 1; transition: all 0.2s;" 
                            onmouseover="this.style.background='rgba(255,255,255,0.3)'" 
                            onmouseout="this.style.background='rgba(255,255,255,0.2)'">&times;</button>
                </div>
            </div>
            
            <!-- Form -->
            <div style="padding: 30px; background: #16161a;">
                <form id="finance-transaction-form">
                    <!-- Mensagem de erro -->
                    <div id="transaction-error-message" style="display: none; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 20px; color: #ef4444; font-size: 0.9rem;">
                        <i class="fas fa-exclamation-circle"></i> <span id="error-text"></span>
                    </div>
                    
                    <!-- Valor Grande com Moeda -->
                    <div style="margin-bottom: 28px;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                            <label style="color: #f1f5f9; font-weight: 600; font-size: 0.95rem; flex: 1;">Valor</label>
                            <select id="transaction-currency" style="padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); background: #16161a; color: #f1f5f9; font-size: 0.9rem; cursor: pointer; transition: all 0.2s;" 
                                    onmouseover="this.style.borderColor='rgba(255,255,255,0.1)'" 
                                    onmouseout="this.style.borderColor='rgba(255,255,255,0.05)'">
                                <option value="BRL">BRL</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); color: #64748b; font-weight: 700; font-size: 1.8rem; z-index: 1;">R$</span>
                            <input type="number" id="transaction-amount" step="0.01" min="0.01" required
                                   style="width: 100%; padding: 20px 20px 20px 70px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); background: #16161a; color: #f1f5f9; font-size: 2rem; font-weight: 700; transition: all 0.2s;"
                                   placeholder="0,00"
                                   onfocus="this.style.borderColor='${modalColor}'; this.style.boxShadow='0 0 0 3px rgba(${isIncome ? '34, 197, 94' : '239, 68, 68'}, 0.1)'"
                                   onblur="this.style.borderColor='rgba(255,255,255,0.05)'; this.style.boxShadow='none'">
                        </div>
                    </div>
                    
                    <!-- Toggle Recebido/Pago -->
                    <div style="margin-bottom: 24px;">
                        <label style="display: block; color: #f1f5f9; margin-bottom: 12px; font-weight: 600; font-size: 0.95rem;">
                            Status
                        </label>
                        <div style="display: flex; gap: 12px; background: #16161a; padding: 6px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                            <button type="button" id="status-paid-btn" 
                                    style="flex: 1; padding: 12px; border-radius: 8px; border: none; background: ${isEdit && transactionData?.status === 'PAID' ? modalGradient : 'transparent'}; color: ${isEdit && transactionData?.status === 'PAID' ? 'white' : '#64748b'}; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: all 0.2s;"
                                    onclick="setTransactionStatus('PAID', '${modalGradient}')">
                                <i class="fas fa-check-circle"></i> ${isIncome ? 'Recebido' : 'Pago'}
                            </button>
                            <button type="button" id="status-pending-btn"
                                    style="flex: 1; padding: 12px; border-radius: 8px; border: none; background: ${isEdit && transactionData?.status === 'PENDING' ? modalGradient : 'transparent'}; color: ${isEdit && transactionData?.status === 'PENDING' ? 'white' : '#64748b'}; cursor: pointer; font-weight: 600; font-size: 0.95rem; transition: all 0.2s;"
                                    onclick="setTransactionStatus('PENDING', '${modalGradient}')">
                                <i class="fas fa-clock"></i> Pendente
                            </button>
                        </div>
                        <input type="hidden" id="transaction-status" value="${isEdit && transactionData?.status ? transactionData.status : 'PAID'}">
                    </div>
                    
                    <!-- Botões Rápidos de Data -->
                    <div style="margin-bottom: 24px;">
                        <label style="display: block; color: #f1f5f9; margin-bottom: 12px; font-weight: 600; font-size: 0.95rem;">
                            Data
                        </label>
                        <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                            <button type="button" class="date-quick-btn" data-date="${todayStr}"
                                    style="padding: 10px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); background: ${todayStr === (isEdit && transactionData?.transaction_date ? new Date(transactionData.transaction_date).toISOString().split('T')[0] : todayStr) ? modalGradient : '#16161a'}; color: ${todayStr === (isEdit && transactionData?.transaction_date ? new Date(transactionData.transaction_date).toISOString().split('T')[0] : todayStr) ? 'white' : '#f1f5f9'}; cursor: pointer; font-weight: 500; font-size: 0.9rem; transition: all 0.2s;"
                                    onclick="setQuickDate('${todayStr}')">
                                Hoje
                            </button>
                            <button type="button" class="date-quick-btn" data-date="${yesterdayStr}"
                                    style="padding: 10px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); background: #16161a; color: #f1f5f9; cursor: pointer; font-weight: 500; font-size: 0.9rem; transition: all 0.2s;"
                                    onclick="setQuickDate('${yesterdayStr}')"
                                    onmouseover="this.style.borderColor='rgba(255,255,255,0.1)'"
                                    onmouseout="this.style.borderColor='rgba(255,255,255,0.05)'">
                                Ontem
                            </button>
                            <button type="button" id="other-date-btn"
                                    style="padding: 10px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); background: #16161a; color: #f1f5f9; cursor: pointer; font-weight: 500; font-size: 0.9rem; transition: all 0.2s;"
                                    onclick="toggleDatePicker()"
                                    onmouseover="this.style.borderColor='rgba(255,255,255,0.1)'"
                                    onmouseout="this.style.borderColor='rgba(255,255,255,0.05)'">
                                Outros...
                            </button>
                        </div>
                        <input type="date" id="transaction-date" required
                               style="width: 100%; padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); background: #16161a; color: #f1f5f9; font-size: 0.95rem; transition: all 0.2s; display: none;"
                               onfocus="this.style.borderColor='${modalColor}'; this.style.boxShadow='0 0 0 3px rgba(${isIncome ? '34, 197, 94' : '239, 68, 68'}, 0.1)'"
                               onblur="this.style.borderColor='rgba(255,255,255,0.05)'; this.style.boxShadow='none'">
                    </div>
                    
                    <!-- Descrição -->
                    <div style="margin-bottom: 24px;">
                        <label style="display: block; color: #f1f5f9; margin-bottom: 10px; font-weight: 600; font-size: 0.95rem;">
                            Descrição
                        </label>
                        <input type="text" id="transaction-description" required
                               style="width: 100%; padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); background: #16161a; color: #f1f5f9; font-size: 1rem; transition: all 0.2s;"
                               placeholder="Ex: Salário, Aluguel, Compras..."
                               onfocus="this.style.borderColor='${modalColor}'; this.style.boxShadow='0 0 0 3px rgba(${isIncome ? '34, 197, 94' : '239, 68, 68'}, 0.1)'"
                               onblur="this.style.borderColor='rgba(255,255,255,0.05)'; this.style.boxShadow='none'">
                    </div>
                    
                    <!-- Categoria (Pills) -->
                    <div style="margin-bottom: 24px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <label style="display: block; color: #f1f5f9; font-weight: 600; font-size: 0.95rem;">
                                Categoria
                            </label>
                            <button type="button" onclick="openCreateCategoryModal('${type}')" style="padding: 6px 12px; border-radius: 8px; border: 1px solid ${modalColor}; background: transparent; color: ${modalColor}; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.2s;" 
                                    onmouseover="this.style.background='${modalColor}'; this.style.color='white';"
                                    onmouseout="this.style.background='transparent'; this.style.color='${modalColor}';">
                                <i class="fas fa-plus"></i> Nova Categoria
                            </button>
                        </div>
                        <div id="category-pills" style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${categories.length > 0 ? categories.map(cat => `
                                <button type="button" class="category-pill" data-category-id="${cat.id}" data-color="${cat.color || '#6366f1'}"
                                        style="padding: 10px 16px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); background: #16161a; color: #f1f5f9; cursor: pointer; font-weight: 500; font-size: 0.9rem; transition: all 0.2s; white-space: nowrap; display: flex; align-items: center; gap: 6px;"
                                        onclick="window.selectCategory && window.selectCategory(${cat.id}, '${cat.color || '#6366f1'}', this)">
                                    <i class="fas ${cat.icon || 'fa-tag'}" style="font-size: 0.9rem; color: ${cat.color || '#6366f1'};"></i> ${cat.name}
                                </button>
                            `).join('') : '<p style="color: #64748b; font-size: 0.85rem; width: 100%;">Nenhuma categoria disponível. Clique em "Nova Categoria" para criar.</p>'}
                        </div>
                        <input type="hidden" id="transaction-category-id" value="">
                    </div>
                    
                    <!-- Carteira/Conta (Pills) -->
                    ${accounts.length > 0 ? `
                    <div style="margin-bottom: 24px;">
                        <label style="display: block; color: #f1f5f9; margin-bottom: 12px; font-weight: 600; font-size: 0.95rem;">
                            Carteira
                        </label>
                        <div id="account-pills" style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${accounts.map(acc => `
                                <button type="button" class="account-pill" data-account-id="${acc.id}"
                                        style="padding: 10px 16px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); background: #16161a; color: #f1f5f9; cursor: pointer; font-weight: 500; font-size: 0.9rem; transition: all 0.2s; white-space: nowrap;"
                                        onclick="window.selectAccount && window.selectAccount(${acc.id}, '${acc.color || '#6366f1'}', this)">
                                    ${acc.icon ? `<i class="${acc.icon}"></i> ` : ''}${acc.name}
                                </button>
                            `).join('')}
                        </div>
                        <input type="hidden" id="transaction-account-id" value="">
                    </div>
                    ` : ''}
                    
                    ${!isIncome ? `
                    <!-- Cartão de crédito (só para despesa: vincular à fatura do mês) -->
                    <div style="margin-bottom: 24px;">
                        <label style="display: block; color: #f1f5f9; margin-bottom: 12px; font-weight: 600; font-size: 0.95rem;">
                            <i class="fas fa-credit-card" style="margin-right: 8px; color: #94a3b8;"></i>Pago no cartão de crédito
                        </label>
                        <p style="color: #64748b; font-size: 0.8rem; margin: -6px 0 10px 0;">Opcional. Vincule à fatura de um cartão para acompanhar o gasto do mês.</p>
                        <select id="transaction-card-id" style="width: 100%; padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); background: #16161a; color: #f1f5f9; font-size: 0.95rem; cursor: pointer;">
                            <option value="">Nenhum (dinheiro/PIX/conta)</option>
                            ${(cards || []).map(c => `<option value="${c.id}" ${isEdit && transactionData?.card_id === c.id ? 'selected' : ''}>${(c.name || 'Cartão').replace(/</g, ' ')}</option>`).join('')}
                        </select>
                    </div>
                    ` : ''}
                    
                    <!-- Observação -->
                    <div style="margin-bottom: 24px;">
                        <label style="display: block; color: #f1f5f9; margin-bottom: 10px; font-weight: 600; font-size: 0.95rem;">
                            Observação (opcional)
                        </label>
                        <textarea id="transaction-notes" rows="3"
                                  style="width: 100%; padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); background: #16161a; color: #f1f5f9; font-size: 0.95rem; resize: vertical; transition: all 0.2s; font-family: inherit;"
                                  placeholder="Adicione uma observação sobre esta transação..."
                                  onfocus="this.style.borderColor='${modalColor}'; this.style.boxShadow='0 0 0 3px rgba(${isIncome ? '34, 197, 94' : '239, 68, 68'}, 0.1)'"
                                  onblur="this.style.borderColor='rgba(255,255,255,0.05)'; this.style.boxShadow='none'"></textarea>
                    </div>
                    
                    <!-- Toggles Adicionais -->
                    <div style="margin-bottom: 24px; display: flex; flex-direction: column; gap: 16px;">
                        <!-- Receita/Despesa Fixa -->
                        <div id="recurring-container" style="display: flex; justify-content: space-between; align-items: center; padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); background: #16161a;">
                            <div>
                                <div style="color: #f1f5f9; font-weight: 600; font-size: 0.95rem; margin-bottom: 4px;">
                                    ${isIncome ? 'Receita' : 'Despesa'} Fixa
                                </div>
                                <div style="color: #64748b; font-size: 0.85rem;">
                                    Repetir automaticamente todo mês
                                </div>
                            </div>
                            <label style="position: relative; display: inline-block; width: 50px; height: 28px;">
                                <input type="checkbox" id="transaction-is-recurring" ${isEdit && transactionData?.is_recurring ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;" onchange="updateRecurringToggle(this)">
                                <span class="toggle-slider" id="recurring-toggle-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${isEdit && transactionData?.is_recurring ? '#22c55e' : '#ef4444'}; transition: 0.3s; border-radius: 28px;"></span>
                            </label>
                        </div>
                        
                        <!-- Campo de Repetição (aparece quando fixa está ativada) -->
                        <div id="recurring-times-container" style="display: ${isEdit && transactionData?.is_recurring ? 'block' : 'none'}; margin-top: -8px;">
                            <label style="display: block; color: #f1f5f9; margin-bottom: 10px; font-weight: 600; font-size: 0.95rem;">
                                Repetir quantas vezes?
                            </label>
                            <div style="display: flex; gap: 12px; align-items: center;">
                                <input type="number" id="transaction-recurring-times" min="1" max="120" value="${isEdit && transactionData?.recurring_times ? transactionData.recurring_times : '12'}"
                                       style="flex: 1; padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); background: #16161a; color: #f1f5f9; font-size: 1rem; transition: all 0.2s;"
                                       placeholder="12"
                                       onfocus="this.style.borderColor='${modalColor}'; this.style.boxShadow='0 0 0 3px rgba(${isIncome ? '34, 197, 94' : '239, 68, 68'}, 0.1)'"
                                       onblur="this.style.borderColor='rgba(255,255,255,0.05)'; this.style.boxShadow='none'">
                                <span style="color: #64748b; font-size: 0.9rem; white-space: nowrap;">vezes</span>
                            </div>
                            <p style="color: #64748b; font-size: 0.85rem; margin-top: 8px; margin-bottom: 0;">
                                A transação será repetida mensalmente pelo número de vezes informado.
                            </p>
                        </div>
                        
                        <!-- Anexar Arquivo -->
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); background: #16161a; cursor: pointer; transition: all 0.2s;"
                             onclick="document.getElementById('transaction-attachment').click()"
                             onmouseover="this.style.borderColor='rgba(255,255,255,0.1)'"
                             onmouseout="this.style.borderColor='rgba(255,255,255,0.05)'">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <i class="fas fa-paperclip" style="color: #64748b; font-size: 1.2rem;"></i>
                                <div>
                                    <div style="color: #f1f5f9; font-weight: 600; font-size: 0.95rem;">
                                        Anexar Arquivo
                                    </div>
                                    <div id="attachment-name" style="color: #64748b; font-size: 0.85rem;">
                                        Nenhum arquivo selecionado
                                    </div>
                                </div>
                            </div>
                            <i class="fas fa-chevron-right" style="color: #64748b;"></i>
                            <input type="file" id="transaction-attachment" accept="image/*,application/pdf" style="display: none;" onchange="handleAttachmentChange(this)">
                        </div>
                    </div>
                    
                    <!-- Botões -->
                    <div style="display: flex; gap: 12px; margin-top: 32px;">
                        <button type="button" id="cancel-btn"
                                style="flex: 1; padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); background: transparent; color: #f1f5f9; cursor: pointer; font-weight: 600; font-size: 1rem; transition: all 0.2s;"
                                onmouseover="this.style.background='rgba(255,255,255,0.05)'"
                                onmouseout="this.style.background='transparent'">
                            Cancelar
                        </button>
                        <button type="submit" id="save-btn"
                                style="flex: 2; padding: 14px; border-radius: 12px; border: none; background: ${modalGradient}; color: white; cursor: pointer; font-weight: 700; font-size: 1rem; box-shadow: 0 4px 15px rgba(${isIncome ? '34, 197, 94' : '239, 68, 68'}, 0.3); transition: all 0.2s;"
                                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(${isIncome ? '34, 197, 94' : '239, 68, 68'}, 0.4)'"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(${isIncome ? '34, 197, 94' : '239, 68, 68'}, 0.3)'">
                            <i class="fas fa-check"></i> ${isEdit ? 'Atualizar' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        <style>
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            @keyframes fadeOut {
                from {
                    opacity: 1;
                }
                to {
                    opacity: 0;
                }
            }
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .toggle-slider:before {
                position: absolute;
                content: "";
                height: 22px;
                width: 22px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: 0.3s;
                border-radius: 50%;
            }
            #transaction-is-recurring:checked + .toggle-slider {
                background-color: ${modalColor};
            }
            #transaction-is-recurring:checked + .toggle-slider:before {
                transform: translateX(22px);
            }
            .category-pill.selected, .account-pill.selected {
                background: ${modalGradient} !important;
                border-color: ${modalColor} !important;
                color: white !important;
            }
            .date-quick-btn.active {
                background: ${modalGradient} !important;
                border-color: ${modalColor} !important;
                color: white !important;
            }
        </style>
    `;

    modal.style.display = 'flex';

    // Definir selectCategory e selectAccount ANTES de preencher dados (evita "selectCategory is not defined" ao editar)
    window.selectCategory = function (categoryId, color, element) {
        const pills = document.querySelectorAll('.category-pill');
        const categoryInput = document.getElementById('transaction-category-id');
        pills.forEach(pill => {
            pill.classList.remove('selected');
            pill.style.background = 'var(--preto-fundo, #0D0D0F)';
            pill.style.borderColor = 'var(--border-glass, #2C2C2F)';
            pill.style.color = 'var(--text-primary, #FFFFFF)';
        });
        if (element) {
            element.classList.add('selected');
            element.style.background = modalGradient;
            element.style.borderColor = modalColor;
            element.style.color = 'white';
        }
        if (categoryInput) categoryInput.value = categoryId || '';
    };
    window.selectAccount = function (accountId, color, element) {
        const pills = document.querySelectorAll('.account-pill');
        const accountInput = document.getElementById('transaction-account-id');
        pills.forEach(pill => {
            pill.classList.remove('selected');
            pill.style.background = 'var(--preto-fundo, #0D0D0F)';
            pill.style.borderColor = 'var(--border-glass, #2C2C2F)';
            pill.style.color = 'var(--text-primary, #FFFFFF)';
        });
        if (element) {
            element.classList.add('selected');
            element.style.background = modalGradient;
            element.style.borderColor = modalColor;
            element.style.color = 'white';
        }
        if (accountInput) accountInput.value = accountId || '';
    };

    // Definir valores padrão ou de edição
    if (isEdit && transactionData) {
        const amountInput = modal.querySelector('#transaction-amount');
        const descriptionInput = modal.querySelector('#transaction-description');
        const dateInput = modal.querySelector('#transaction-date');
        const statusInput = modal.querySelector('#transaction-status');
        const notesInput = modal.querySelector('#transaction-notes');

        if (amountInput && transactionData.amount) amountInput.value = parseFloat(transactionData.amount);
        if (descriptionInput && transactionData.description) descriptionInput.value = transactionData.description;
        if (dateInput && transactionData.transaction_date) {
            const date = new Date(transactionData.transaction_date);
            dateInput.value = date.toISOString().split('T')[0];
            // Ativar botão rápido se for hoje ou ontem
            const quickBtns = modal.querySelectorAll('.date-quick-btn');
            quickBtns.forEach(btn => {
                if (btn.dataset.date === dateInput.value) {
                    btn.classList.add('active');
                    btn.style.background = modalGradient;
                    btn.style.borderColor = modalColor;
                    btn.style.color = 'white';
                }
            });
        }
        if (statusInput) statusInput.value = transactionData.status || 'PAID';
        if (notesInput && transactionData.notes) notesInput.value = transactionData.notes;
        if (transactionData.category_id) {
            const catBtn = modal.querySelector(`[data-category-id="${transactionData.category_id}"]`);
            if (catBtn) window.selectCategory(transactionData.category_id, catBtn.dataset.color || '#6366f1', catBtn);
        }
        if (transactionData.account_id) {
            const accBtn = modal.querySelector(`[data-account-id="${transactionData.account_id}"]`);
            if (accBtn) window.selectAccount(transactionData.account_id, accBtn.dataset.color || '#6366f1', accBtn);
        }
    } else {
        // Data padrão como hoje
        const dateInput = modal.querySelector('#transaction-date');
        if (dateInput) {
            dateInput.value = todayStr;
        }
        // Ativar botão "Hoje"
        const todayBtn = modal.querySelector(`[data-date="${todayStr}"]`);
        if (todayBtn) {
            todayBtn.classList.add('active');
            todayBtn.style.background = modalGradient;
            todayBtn.style.borderColor = modalColor;
            todayBtn.style.color = 'white';
        }
    }

    // Funções auxiliares globais para o modal
    window.setTransactionStatus = function (status, gradient) {
        const statusInput = document.getElementById('transaction-status');
        const paidBtn = document.getElementById('status-paid-btn');
        const pendingBtn = document.getElementById('status-pending-btn');

        if (statusInput) statusInput.value = status;

        if (status === 'PAID') {
            paidBtn.style.background = gradient;
            paidBtn.style.color = 'white';
            pendingBtn.style.background = 'transparent';
            pendingBtn.style.color = 'var(--text-secondary, #888888)';
        } else {
            pendingBtn.style.background = gradient;
            pendingBtn.style.color = 'white';
            paidBtn.style.background = 'transparent';
            paidBtn.style.color = 'var(--text-secondary, #888888)';
        }
    };

    window.setQuickDate = function (dateStr) {
        const dateInput = document.getElementById('transaction-date');
        const quickBtns = document.querySelectorAll('.date-quick-btn');
        const otherBtn = document.getElementById('other-date-btn');

        if (dateInput) {
            dateInput.value = dateStr;
            dateInput.style.display = 'none';
        }

        quickBtns.forEach(btn => {
            btn.classList.remove('active');
            btn.style.background = 'var(--preto-fundo, #0D0D0F)';
            btn.style.borderColor = 'var(--border-glass, #2C2C2F)';
            btn.style.color = 'var(--text-primary, #FFFFFF)';

            if (btn.dataset.date === dateStr) {
                btn.classList.add('active');
                btn.style.background = modalGradient;
                btn.style.borderColor = modalColor;
                btn.style.color = 'white';
            }
        });

        if (otherBtn) {
            otherBtn.style.background = 'var(--preto-fundo, #0D0D0F)';
            otherBtn.style.borderColor = 'var(--border-glass, #2C2C2F)';
            otherBtn.style.color = 'var(--text-primary, #FFFFFF)';
        }
    };

    window.toggleDatePicker = function () {
        const dateInput = document.getElementById('transaction-date');
        const quickBtns = document.querySelectorAll('.date-quick-btn');
        const otherBtn = document.getElementById('other-date-btn');

        if (dateInput) {
            dateInput.style.display = dateInput.style.display === 'none' ? 'block' : 'none';
            if (dateInput.style.display === 'block') {
                dateInput.focus();
            }
        }

        quickBtns.forEach(btn => {
            btn.classList.remove('active');
            btn.style.background = 'var(--preto-fundo, #0D0D0F)';
            btn.style.borderColor = 'var(--border-glass, #2C2C2F)';
            btn.style.color = 'var(--text-primary, #FFFFFF)';
        });

        if (otherBtn) {
            otherBtn.style.background = modalGradient;
            otherBtn.style.borderColor = modalColor;
            otherBtn.style.color = 'white';
        }
    };

    // selectCategory e selectAccount já definidos no início do modal (antes de preencher edição)

    window.handleAttachmentChange = function (input) {
        const fileName = input.files[0]?.name || 'Nenhum arquivo selecionado';
        const nameDisplay = document.getElementById('attachment-name');
        if (nameDisplay) {
            nameDisplay.textContent = fileName;
            nameDisplay.style.color = 'var(--text-primary, #FFFFFF)';
        }
    };

    // Função global para atualizar toggle de recorrente
    window.updateRecurringToggle = function (checkbox) {
        const slider = document.getElementById('recurring-toggle-slider');
        const container = document.getElementById('recurring-container');
        const timesContainer = document.getElementById('recurring-times-container');

        if (!slider || !container) {
            console.warn('[FINANCE] Elementos do toggle não encontrados');
            return;
        }

        if (checkbox.checked) {
            // Verde quando ativado
            slider.style.backgroundColor = '#22c55e';
            container.style.borderColor = '#22c55e';
            container.classList.add('active');
            if (timesContainer) {
                timesContainer.style.display = 'block';
            }
        } else {
            // Vermelho quando desativado
            slider.style.backgroundColor = '#ef4444';
            container.style.borderColor = 'var(--border-glass, #2C2C2F)';
            container.classList.remove('active');
            if (timesContainer) {
                timesContainer.style.display = 'none';
            }
        }
    };

    // Inicializar toggle ao carregar modal
    setTimeout(() => {
        const recurringCheckbox = document.getElementById('transaction-is-recurring');
        if (recurringCheckbox) {
            window.updateRecurringToggle(recurringCheckbox);
        }
    }, 100);

    // Event listeners
    const closeBtn = modal.querySelector('#close-modal-btn');
    const cancelBtn = modal.querySelector('#cancel-btn');
    const form = modal.querySelector('#finance-transaction-form');

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeFinanceTransactionModal();
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeFinanceTransactionModal();
        });
    }

    // PREVENIR SUBMIT PADRÃO E CHAMAR FUNÇÃO DE SALVAR
    if (form) {
        console.log('[FINANCE] Adicionando listeners para prevenir submit padrão e chamar saveFinanceTransaction');

        // Adicionar listener para submit - CHAMAR A FUNÇÃO DE SALVAR AQUI
        form.addEventListener('submit', async (e) => {
            console.log('[FINANCE] Form submit capturado, prevenindo padrão e chamando saveFinanceTransaction');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            // CHAMAR A FUNÇÃO DE SALVAR
            try {
                console.log('[FINANCE] Chamando saveFinanceTransaction com type:', type);
                await saveFinanceTransaction(e, type);
            } catch (error) {
                console.error('[FINANCE] Erro ao chamar saveFinanceTransaction:', error);
            }

            return false;
        }, true); // Use capture phase

        // Também prevenir no onsubmit inline e chamar função
        form.onsubmit = async function (e) {
            console.log('[FINANCE] Form onsubmit capturado, prevenindo padrão e chamando saveFinanceTransaction');
            if (e) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }

            // CHAMAR A FUNÇÃO DE SALVAR
            try {
                console.log('[FINANCE] Chamando saveFinanceTransaction (onsubmit) com type:', type);
                await saveFinanceTransaction(e, type);
            } catch (error) {
                console.error('[FINANCE] Erro ao chamar saveFinanceTransaction:', error);
            }

            return false;
        };
    }

    // Fechar ao clicar fora do modal
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            e.preventDefault();
            closeFinanceTransactionModal();
        }
    });

    // Fechar com ESC
    const escHandler = function (e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeFinanceTransactionModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // Focar no campo de valor após animação
    setTimeout(() => {
        const amountInput = modal.querySelector('#transaction-amount');
        if (amountInput) {
            amountInput.focus();
        }
    }, 300);
};

window.closeFinanceTransactionModal = function () {
    const modal = document.getElementById('finance-transaction-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.2s ease-out';
        setTimeout(() => {
            modal.remove();
        }, 200);
    }
};

async function saveFinanceTransaction(event, type) {
    console.log('[FINANCE] saveFinanceTransaction chamado', { type, event });

    // PREVENT DEFAULT IMEDIATAMENTE - ANTES DE QUALQUER COISA
    if (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    console.log('[FINANCE] Event preventDefault executado');

    // Retornar false para garantir que não há submit padrão
    try {

        // Esconder mensagem de erro anterior
        const errorMsg = document.getElementById('transaction-error-message');
        if (errorMsg) {
            errorMsg.style.display = 'none';
        }

        console.log('[FINANCE] Buscando elementos do formulário...');
        const amountInput = document.getElementById('transaction-amount');
        const descriptionInput = document.getElementById('transaction-description');
        const dateInput = document.getElementById('transaction-date');
        const statusInput = document.getElementById('transaction-status');

        console.log('[FINANCE] Elementos encontrados:', {
            amountInput: !!amountInput,
            descriptionInput: !!descriptionInput,
            dateInput: !!dateInput,
            statusInput: !!statusInput
        });

        if (!amountInput || !descriptionInput || !dateInput || !statusInput) {
            throw new Error('Elementos do formulário não encontrados. Por favor, recarregue a página.');
        }

        const amount = parseFloat(amountInput.value);
        const description = descriptionInput.value.trim();
        const transactionDate = dateInput.value;
        const status = statusInput.value;

        console.log('[FINANCE] Valores coletados:', {
            amount,
            description,
            transactionDate,
            status,
            type
        });

        // Validação
        console.log('[FINANCE] Iniciando validação...');
        let hasError = false;

        if (!amount || amount <= 0 || isNaN(amount)) {
            console.warn('[FINANCE] Erro de validação: Valor inválido', amount);
            showTransactionError('Por favor, informe um valor válido maior que zero.');
            amountInput.style.borderColor = '#ef4444';
            amountInput.focus();
            hasError = true;
        } else {
            amountInput.style.borderColor = 'var(--border-glass, #2C2C2F)';
        }

        if (!description || description.length < 2) {
            console.warn('[FINANCE] Erro de validação: Descrição inválida', description);
            showTransactionError('Por favor, informe uma descrição com pelo menos 2 caracteres.');
            descriptionInput.style.borderColor = '#ef4444';
            if (!hasError) {
                descriptionInput.focus();
                hasError = true;
            }
        } else {
            descriptionInput.style.borderColor = 'var(--border-glass, #2C2C2F)';
        }

        if (!transactionDate) {
            console.warn('[FINANCE] Erro de validação: Data inválida', transactionDate);
            showTransactionError('Por favor, selecione uma data.');
            dateInput.style.borderColor = '#ef4444';
            if (!hasError) {
                dateInput.focus();
                hasError = true;
            }
        } else {
            dateInput.style.borderColor = 'var(--border-glass, #2C2C2F)';
        }

        if (hasError) {
            console.warn('[FINANCE] Validação falhou, abortando envio');
            return;
        }

        console.log('[FINANCE] Validação passou');

        // Mostrar loading
        console.log('[FINANCE] Preparando para enviar...');
        const submitBtn = document.getElementById('save-btn');
        const cancelBtn = document.getElementById('cancel-btn');

        if (!submitBtn) {
            throw new Error('Botão de salvar não encontrado');
        }

        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        if (cancelBtn) cancelBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        submitBtn.style.opacity = '0.7';
        submitBtn.style.cursor = 'not-allowed';

        // Garantir que o tipo está correto - verificar se type é 'income' ou 'INCOME'
        const typeUpper = (type || '').toUpperCase();
        const transactionType = typeUpper === 'INCOME' ? 'INCOME' : 'EXPENSE';

        console.log('[FINANCE] Tipo da transação determinado:', {
            typeOriginal: type,
            typeUpper,
            transactionType,
            isIncome: transactionType === 'INCOME'
        });

        // Coletar dados adicionais
        const categoryId = document.getElementById('transaction-category-id')?.value || null;
        const accountId = document.getElementById('transaction-account-id')?.value || null;
        const cardIdEl = document.getElementById('transaction-card-id');
        const cardId = cardIdEl && cardIdEl.value ? parseInt(cardIdEl.value, 10) : null;
        const notes = document.getElementById('transaction-notes')?.value?.trim() || null;
        const isRecurring = document.getElementById('transaction-is-recurring')?.checked || false;
        const recurringTimes = isRecurring ? (parseInt(document.getElementById('transaction-recurring-times')?.value, 10) || 12) : null;

        const profileId = window.currentFinanceProfileId || localStorage.getItem('finance_current_profile_id') || null;

        const requestBody = {
            type: transactionType,
            amount: amount,
            description: description,
            transaction_date: transactionDate,
            status: status,
            category_id: categoryId ? parseInt(categoryId) : null,
            account_id: accountId ? parseInt(accountId) : null,
            card_id: transactionType === 'EXPENSE' ? cardId : null,
            notes: notes,
            is_recurring: isRecurring,
            recurring_times: recurringTimes,
            profile_id: profileId ? parseInt(profileId) : null
        };

        console.log('[FINANCE] Enviando requisição:', {
            url: `${env.API_URL}/api/finance/transactions`,
            method: 'POST',
            body: requestBody,
            headers: {
                ...env.HEADERS_AUTH,
                'Content-Type': 'application/json'
            }
        });

        console.log('[FINANCE] env.API_URL:', env.API_URL);
        console.log('[FINANCE] env.HEADERS_AUTH:', env.HEADERS_AUTH);

        let response;
        try {
            response = await fetch(`${env.API_URL}/api/finance/transactions`, {
                method: 'POST',
                headers: {
                    ...env.HEADERS_AUTH,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            console.log('[FINANCE] Resposta recebida:', {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });
        } catch (fetchError) {
            console.error('[FINANCE] Erro na requisição fetch:', fetchError);
            throw new Error(`Erro de conexão: ${fetchError.message}`);
        }

        let responseData = null;
        try {
            const responseText = await response.text();
            console.log('[FINANCE] Resposta texto:', responseText);

            if (responseText) {
                responseData = JSON.parse(responseText);
                console.log('[FINANCE] Resposta JSON:', responseData);
            }
        } catch (parseError) {
            console.error('[FINANCE] Erro ao parsear JSON:', parseError);
            throw new Error('Resposta inválida do servidor');
        }

        if (!response.ok) {
            const errorMessage = responseData?.message || responseData?.error || responseData?.data?.message || `Erro ${response.status}: ${response.statusText}`;
            console.error('[FINANCE] Erro na resposta:', {
                status: response.status,
                statusText: response.statusText,
                errorMessage,
                responseData
            });
            throw new Error(errorMessage);
        }

        console.log('[FINANCE] Transação salva com sucesso:', responseData);

        // Fechar modal imediatamente para o usuário sair da tela de formulário
        closeFinanceTransactionModal();

        // Recarregar transações e dashboard em seguida (sem depender do modal)
        try {
            if (typeof window.loadFinanceTransactions === 'function') {
                await window.loadFinanceTransactions();
            }
            const financeContent = document.getElementById('finance-content');
            if (financeContent) {
                try {
                    const y = window.currentFinanceYear ?? new Date().getFullYear();
                    const m = window.currentFinanceMonth ?? new Date().getMonth();
                    const monthStart = `${y}-${String(m + 1).padStart(2, '0')}-01`;
                    const lastDay = new Date(y, m + 1, 0).getDate();
                    const monthEnd = `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`;
                    const profileId = window.currentFinanceProfileId || localStorage.getItem('finance_current_profile_id') || '';
                    const dashboardResponse = await fetch(`${env.API_URL}/api/finance/dashboard?dateFrom=${monthStart}&dateTo=${monthEnd}${profileId ? `&profile_id=${profileId}` : ''}`, {
                        headers: env.HEADERS_AUTH
                    });
                    if (dashboardResponse.ok) {
                        const dashboardData = await dashboardResponse.json();
                        const data = dashboardData.data || dashboardData;
                        const recebidoTrabMes = typeof window._kingFinanceRecebidoTrabalhosNoMes === 'function' ? window._kingFinanceRecebidoTrabalhosNoMes(window._kingFinanceDb || {}, y, m + 1) : 0;
                        const totalRecebidoApos = (Number(data.totalIncome) || 0) - (Number(data.pendingIncome) || 0) + recebidoTrabMes;
                        const despesasApos = Number(data.totalExpense) || 0;
                        const balance = totalRecebidoApos - despesasApos;
                        const accountBalanceMainEl = document.getElementById('finance-account-balance-main');
                        if (accountBalanceMainEl) accountBalanceMainEl.textContent = `R$ ${formatCurrency(data.accountBalance || 0)}`;
                        const incomeCardEl = document.getElementById('finance-income-card');
                        if (incomeCardEl) incomeCardEl.textContent = `+R$ ${formatCurrency(totalRecebidoApos)}`;
                        const expenseCardEl = document.getElementById('finance-expense-card');
                        if (expenseCardEl) expenseCardEl.textContent = `-R$ ${formatCurrency(despesasApos)}`;
                        const balanceReceitasEl = document.getElementById('finance-balance-receitas');
                        const balanceDespesasEl = document.getElementById('finance-balance-despesas');
                        const balanceResultEl = document.getElementById('finance-balance-result');
                        if (balanceReceitasEl) balanceReceitasEl.textContent = `R$ ${formatCurrency(totalRecebidoApos)}`;
                        if (balanceDespesasEl) balanceDespesasEl.textContent = `R$ ${formatCurrency(despesasApos)}`;
                        if (balanceResultEl) { balanceResultEl.textContent = `R$ ${formatCurrency(Math.abs(balance))}`; balanceResultEl.style.color = balance >= 0 ? '#22c55e' : '#ef4444'; }
                    }
                } catch (dashboardError) {
                    console.warn('[FINANCE] Erro ao atualizar cards:', dashboardError);
                }
            }
        } catch (reloadError) {
            console.error('[FINANCE] Erro ao recarregar dados:', reloadError);
        }

        return false; // Retornar false para prevenir submit padrão

    } catch (error) {
        console.error('[FINANCE] ERRO CAPTURADO:', error);
        console.error('[FINANCE] Stack trace:', error.stack);
        console.error('[FINANCE] Error name:', error.name);
        console.error('[FINANCE] Error message:', error.message);

        // Mostrar erro
        const errorMessage = error.message || 'Erro ao salvar transação. Verifique sua conexão e tente novamente.';
        console.error('[FINANCE] Exibindo mensagem de erro:', errorMessage);
        showTransactionError(errorMessage);

        // Restaurar botão
        const submitBtn = document.getElementById('save-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Salvar';
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }
        if (cancelBtn) {
            cancelBtn.disabled = false;
        }

        return false; // Retornar false para prevenir submit padrão mesmo em caso de erro
    }
}

function showTransactionError(message) {
    const errorMsg = document.getElementById('transaction-error-message');
    const errorText = document.getElementById('error-text');
    if (errorMsg && errorText) {
        errorText.textContent = message;
        errorMsg.style.display = 'block';
        errorMsg.style.animation = 'slideDown 0.3s ease-out';

        // Scroll para o erro
        errorMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

window.editFinanceTransaction = async function (id) {
    console.log('[FINANCE] editFinanceTransaction chamado para ID:', id);

    if (!id) {
        alert('ID da transação não fornecido.');
        return;
    }

    try {
        // Buscar dados da transação
        const response = await fetch(`${env.API_URL}/api/finance/transactions/${id}`, {
            headers: env.HEADERS_AUTH
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Erro ao carregar transação' }));
            throw new Error(errorData.message || 'Erro ao carregar transação');
        }

        const responseData = await response.json();
        const transaction = responseData.data || responseData;

        console.log('[FINANCE] Transação carregada:', transaction);

        // Determinar tipo (INCOME ou EXPENSE)
        const transactionType = (transaction.type || '').toUpperCase();
        const isIncome = transactionType === 'INCOME';
        const modalType = isIncome ? 'income' : 'expense';

        // Abrir modal de edição (reutilizar o mesmo modal, mas preenchendo com dados)
        await openAddTransactionModal(modalType, transaction);

        // Alterar função do formulário para atualizar ao invés de criar
        setTimeout(() => {
            const form = document.getElementById('finance-transaction-form');
            if (form) {
                // Remover listeners antigos
                const newForm = form.cloneNode(true);
                form.parentNode.replaceChild(newForm, form);

                // Adicionar novo listener que atualiza
                newForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();

                    await updateFinanceTransaction(e, id, modalType);
                    return false;
                }, true);
            }

            console.log('[FINANCE] Modal de edição configurado');
        }, 500);

    } catch (error) {
        console.error('[FINANCE] Erro ao carregar transação para edição:', error);
        alert('Erro ao carregar transação: ' + error.message);
    }
};

async function updateFinanceTransaction(event, id, type) {
    console.log('[FINANCE] updateFinanceTransaction chamado', { id, type });

    // PREVENT DEFAULT IMEDIATAMENTE
    if (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    try {
        // Esconder mensagem de erro anterior
        const errorMsg = document.getElementById('transaction-error-message');
        if (errorMsg) {
            errorMsg.style.display = 'none';
        }

        const amountInput = document.getElementById('transaction-amount');
        const descriptionInput = document.getElementById('transaction-description');
        const dateInput = document.getElementById('transaction-date');
        const statusInput = document.getElementById('transaction-status');

        if (!amountInput || !descriptionInput || !dateInput || !statusInput) {
            throw new Error('Elementos do formulário não encontrados.');
        }

        const amount = parseFloat(amountInput.value);
        const description = descriptionInput.value.trim();
        const transactionDate = dateInput.value;
        const status = statusInput.value;

        // Validação
        if (!amount || amount <= 0 || isNaN(amount)) {
            showTransactionError('Por favor, informe um valor válido maior que zero.');
            amountInput.style.borderColor = '#ef4444';
            amountInput.focus();
            return false;
        }

        if (!description || description.length < 2) {
            showTransactionError('Por favor, informe uma descrição com pelo menos 2 caracteres.');
            descriptionInput.style.borderColor = '#ef4444';
            descriptionInput.focus();
            return false;
        }

        // Mostrar loading
        const submitBtn = document.getElementById('save-btn');
        const cancelBtn = document.getElementById('cancel-btn');

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
            submitBtn.style.opacity = '0.7';
        }
        if (cancelBtn) cancelBtn.disabled = true;

        const transactionType = (type && type.toUpperCase() === 'INCOME') ? 'INCOME' : 'EXPENSE';
        // Coletar dados adicionais
        const categoryId = document.getElementById('transaction-category-id')?.value || null;
        const accountId = document.getElementById('transaction-account-id')?.value || null;
        const cardIdEl = document.getElementById('transaction-card-id');
        const cardId = cardIdEl && cardIdEl.value ? parseInt(cardIdEl.value, 10) : null;
        const notes = document.getElementById('transaction-notes')?.value?.trim() || null;
        const isRecurring = document.getElementById('transaction-is-recurring')?.checked || false;
        const recurringTimes = isRecurring ? (parseInt(document.getElementById('transaction-recurring-times')?.value) || 12) : null;

        const requestBody = {
            type: transactionType,
            amount: amount,
            description: description,
            transaction_date: transactionDate,
            status: status,
            category_id: categoryId ? parseInt(categoryId) : null,
            account_id: accountId ? parseInt(accountId) : null,
            card_id: transactionType === 'EXPENSE' ? cardId : null,
            notes: notes,
            is_recurring: isRecurring,
            recurring_times: recurringTimes
        };

        console.log('[FINANCE] Atualizando transação:', { id, body: requestBody });

        const response = await fetch(`${env.API_URL}/api/finance/transactions/${id}`, {
            method: 'PUT',
            headers: {
                ...env.HEADERS_AUTH,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        let responseData = null;
        let responseText = '';

        try {
            responseText = await response.text();
            console.log('[FINANCE] Resposta texto (update):', responseText);

            if (responseText) {
                try {
                    responseData = JSON.parse(responseText);
                    console.log('[FINANCE] Resposta JSON (update):', responseData);
                } catch (parseError) {
                    console.error('[FINANCE] Erro ao parsear JSON:', parseError);
                    responseData = { message: responseText };
                }
            }
        } catch (textError) {
            console.error('[FINANCE] Erro ao ler resposta:', textError);
        }

        if (!response.ok) {
            let errorMessage = `Erro ${response.status}: ${response.statusText}`;

            if (responseData) {
                if (typeof responseData === 'string') {
                    errorMessage = responseData;
                } else if (responseData.message) {
                    errorMessage = responseData.message;
                } else if (responseData.error) {
                    if (typeof responseData.error === 'string') {
                        errorMessage = responseData.error;
                    } else if (responseData.error.message) {
                        errorMessage = responseData.error.message;
                    } else {
                        errorMessage = JSON.stringify(responseData.error);
                    }
                } else if (responseData.data && responseData.data.message) {
                    errorMessage = responseData.data.message;
                }
            } else if (responseText) {
                errorMessage = responseText;
            }

            console.error('[FINANCE] Erro na resposta (update):', {
                status: response.status,
                statusText: response.statusText,
                responseData,
                responseText,
                errorMessage
            });

            throw new Error(errorMessage);
        }

        console.log('[FINANCE] Transação atualizada com sucesso:', responseData);

        // Fechar modal imediatamente para o usuário sair da tela de edição
        closeFinanceTransactionModal();

        try {
            if (typeof window.loadFinanceTransactions === 'function') {
                await window.loadFinanceTransactions();
            }
            const financeContent = document.getElementById('finance-content');
            if (financeContent) {
                try {
                    const y = window.currentFinanceYear ?? new Date().getFullYear();
                    const m = window.currentFinanceMonth ?? new Date().getMonth();
                    const monthStart = `${y}-${String(m + 1).padStart(2, '0')}-01`;
                    const lastDay = new Date(y, m + 1, 0).getDate();
                    const monthEnd = `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`;
                    const profileId = window.currentFinanceProfileId || localStorage.getItem('finance_current_profile_id') || '';
                    const dashboardResponse = await fetch(`${env.API_URL}/api/finance/dashboard?dateFrom=${monthStart}&dateTo=${monthEnd}${profileId ? `&profile_id=${profileId}` : ''}`, {
                        headers: env.HEADERS_AUTH
                    });
                    if (dashboardResponse.ok) {
                        const dashboardData = await dashboardResponse.json();
                        const data = dashboardData.data || dashboardData;
                        const recebidoTrabMesUpd = typeof window._kingFinanceRecebidoTrabalhosNoMes === 'function' ? window._kingFinanceRecebidoTrabalhosNoMes(window._kingFinanceDb || {}, y, m + 1) : 0;
                        const totalRecebidoAposUpd = (Number(data.totalIncome) || 0) - (Number(data.pendingIncome) || 0) + recebidoTrabMesUpd;
                        const despesasAposUpd = Number(data.totalExpense) || 0;
                        const balanceUpd = totalRecebidoAposUpd - despesasAposUpd;
                        const accountBalanceMainEl = document.getElementById('finance-account-balance-main');
                        if (accountBalanceMainEl) accountBalanceMainEl.textContent = `R$ ${formatCurrency(data.accountBalance || 0)}`;
                        const incomeCardEl = document.getElementById('finance-income-card');
                        if (incomeCardEl) incomeCardEl.textContent = `+R$ ${formatCurrency(totalRecebidoAposUpd)}`;
                        const expenseCardEl = document.getElementById('finance-expense-card');
                        if (expenseCardEl) expenseCardEl.textContent = `-R$ ${formatCurrency(despesasAposUpd)}`;
                        const balanceReceitasEl = document.getElementById('finance-balance-receitas');
                        const balanceDespesasEl = document.getElementById('finance-balance-despesas');
                        const balanceResultEl = document.getElementById('finance-balance-result');
                        if (balanceReceitasEl) balanceReceitasEl.textContent = `R$ ${formatCurrency(totalRecebidoAposUpd)}`;
                        if (balanceDespesasEl) balanceDespesasEl.textContent = `R$ ${formatCurrency(despesasAposUpd)}`;
                        if (balanceResultEl) { balanceResultEl.textContent = `R$ ${formatCurrency(Math.abs(balanceUpd))}`; balanceResultEl.style.color = balanceUpd >= 0 ? '#22c55e' : '#ef4444'; }
                    }
                } catch (dashboardError) {
                    console.warn('[FINANCE] Erro ao atualizar cards:', dashboardError);
                }
            }
        } catch (reloadError) {
            console.error('[FINANCE] Erro ao recarregar dados:', reloadError);
        }

        return false;

    } catch (error) {
        console.error('[FINANCE] Erro ao atualizar transação:', error);
        showTransactionError(error.message || 'Erro ao atualizar transação. Verifique sua conexão e tente novamente.');

        const submitBtn = document.getElementById('save-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Salvar';
            submitBtn.style.opacity = '1';
        }
        if (cancelBtn) cancelBtn.disabled = false;

        return false;
    }
}


// ============================================
// FUNÇÕES DE GERENCIAMENTO DE PERFIS FINANCEIROS
// ============================================

window.showFinanceProfilesModal = async function () {
    try {
        // Buscar perfis disponíveis
        const response = await fetch(`${env.API_URL}/api/finance/profiles`, {
            headers: env.HEADERS_AUTH
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch (e) {
                errorData = { message: 'Erro ao carregar perfis' };
            }
            throw new Error(errorData.message || errorData.data?.message || 'Erro ao carregar perfis');
        }

        const responseData = await response.json();
        const profiles = responseData.data || responseData || [];

        // Criar modal
        const modal = document.createElement('div');
        modal.id = 'finance-profiles-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 10002; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px);';

        const currentProfileId = window.currentFinanceProfileId || localStorage.getItem('finance_current_profile_id');

        modal.innerHTML = `
            <div style="background: var(--finance-card-dark, #16161a); border-radius: 24px; padding: 32px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h2 style="color: var(--finance-text-primary, #f1f5f9); font-size: 1.5rem; font-weight: 700; margin: 0;">
                        <i class="fas fa-layer-group" style="margin-right: 8px; color: var(--finance-indigo, #3b82f6);"></i>
                        Perfis Financeiros
                    </h2>
                    <button onclick="document.getElementById('finance-profiles-modal').remove()" style="background: transparent; border: none; color: var(--finance-text-secondary, #64748b); font-size: 1.5rem; cursor: pointer; padding: 8px; transition: color 0.2s;" onmouseover="this.style.color='var(--finance-text-primary, #f1f5f9)'" onmouseout="this.style.color='var(--finance-text-secondary, #64748b)'">&times;</button>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
                    ${profiles.map(profile => `
                        <div onclick="switchFinanceProfile(${profile.id})" 
                             style="display: flex; align-items: center; justify-content: space-between; padding: 16px; border-radius: 12px; border: 1px solid ${profile.id == currentProfileId ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255,255,255,0.05)'}; background: ${profile.id == currentProfileId ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}; cursor: pointer; transition: all 0.2s;"
                             onmouseover="this.style.borderColor='rgba(59, 130, 246, 0.3)'; this.style.background='rgba(59, 130, 246, 0.05)'"
                             onmouseout="this.style.borderColor='${profile.id == currentProfileId ? 'rgba(59, 130, 246, 0.5)' : 'rgba(255,255,255,0.05)'}'; this.style.background='${profile.id == currentProfileId ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}'">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 40px; height: 40px; border-radius: 10px; background: ${profile.color || '#3b82f6'}20; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas ${profile.icon || 'fa-wallet'}" style="color: ${profile.color || '#3b82f6'}; font-size: 1.2rem;"></i>
                                </div>
                                <div>
                                    <div style="color: var(--finance-text-primary, #f1f5f9); font-weight: 600; font-size: 0.95rem;">
                                        ${profile.name} ${profile.is_primary ? '<span style="color: var(--finance-indigo, #3b82f6); font-size: 0.75rem;">(Principal)</span>' : ''}
                                    </div>
                                    ${profile.description ? `<div style="color: var(--finance-text-secondary, #64748b); font-size: 0.85rem; margin-top: 2px;">${profile.description}</div>` : ''}
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 8px;" onclick="event.stopPropagation();">
                                ${profile.id == currentProfileId ? '<i class="fas fa-check-circle" style="color: var(--finance-indigo, #3b82f6); font-size: 1.2rem;"></i>' : ''}
                                <button type="button" onclick="event.stopPropagation(); deleteFinanceProfile(${profile.id}, '${(profile.name || '').replace(/'/g, "\\'")}');" style="padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(239,68,68,0.5); background: rgba(239,68,68,0.15); color: #ef4444; font-size: 0.8rem; font-weight: 600; cursor: pointer;" title="Excluir este perfil">Excluir</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button onclick="checkFinanceProfileLimitBeforeCreate()" style="flex: 1; padding: 14px; border-radius: 12px; border: 2px solid var(--finance-indigo, #3b82f6); background: rgba(59, 130, 246, 0.1); color: var(--finance-indigo, #3b82f6); cursor: pointer; font-weight: 700; transition: all 0.2s;" onmouseover="this.style.background='rgba(59, 130, 246, 0.2)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.1)'">
                        <i class="fas fa-plus" style="margin-right: 8px;"></i>
                        Novo Perfil
                    </button>
                    <button onclick="document.getElementById('finance-profiles-modal').remove()" style="flex: 1; padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: var(--finance-text-secondary, #64748b); cursor: pointer; font-weight: 600; transition: all 0.2s;" onmouseover="this.style.color='var(--finance-text-primary, #f1f5f9)'" onmouseout="this.style.color='var(--finance-text-secondary, #64748b)'">
                        Fechar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Fechar com ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

    } catch (error) {
        console.error('Erro ao carregar perfis:', error);
        alert('Erro ao carregar perfis: ' + error.message);
    }
};

window.switchFinanceProfile = async function (profileId) {
    try {
        // Salvar perfil atual
        localStorage.setItem('finance_current_profile_id', profileId);
        window.currentFinanceProfileId = profileId;

        // Fechar modal
        const modal = document.getElementById('finance-profiles-modal');
        if (modal) modal.remove();

        // Recarregar dashboard
        if (window.initFinancePane) {
            await window.initFinancePane();
        }

    } catch (error) {
        console.error('Erro ao alternar perfil:', error);
        alert('Erro ao alternar perfil: ' + error.message);
    }
};

window.deleteFinanceProfile = async function (profileId, profileName) {
    if (!confirm('Excluir o perfil "' + (profileName || '') + '"? As transações deste perfil permanecem, mas ele não aparecerá mais na lista. Não é possível excluir o único perfil.')) {
        return;
    }
    try {
        const res = await fetch(`${env.API_URL}/api/finance/profiles/${profileId}`, {
            method: 'DELETE',
            headers: env.HEADERS_AUTH
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert(data.message || data.error?.message || 'Não foi possível excluir. Pode ser o único perfil.');
            return;
        }
        const currentId = localStorage.getItem('finance_current_profile_id');
        if (currentId === String(profileId)) {
            localStorage.removeItem('finance_current_profile_id');
            window.currentFinanceProfileId = null;
        }
        const modal = document.getElementById('finance-profiles-modal');
        if (modal) modal.remove();
        if (window.initFinancePane) await window.initFinancePane();
        setTimeout(function () { if (window.showFinanceProfilesModal) window.showFinanceProfilesModal(); }, 400);
    } catch (e) {
        alert('Erro: ' + e.message);
    }
};

window.checkFinanceProfileLimitBeforeCreate = async function () {
    try {
        // Verificar limite antes de mostrar modal de criação
        const limitResponse = await fetch(`${env.API_URL}/api/finance/profiles/limit`, {
            headers: env.HEADERS_AUTH
        });

        if (limitResponse.ok) {
            const limitData = await limitResponse.json();
            const limitInfo = limitData.data || {};

            if (!limitInfo.canCreate) {
                // Mostrar modal de upgrade
                await showFinanceUpgradeModal(limitInfo);
                return;
            }
        }

        // Se pode criar, mostrar modal de criação
        showCreateFinanceProfileModal();
    } catch (error) {
        console.error('Erro ao verificar limite:', error);
        // Em caso de erro, permitir tentar criar (validação no backend)
        showCreateFinanceProfileModal();
    }
};

window.showCreateFinanceProfileModal = function () {
    const modal = document.createElement('div');
    modal.id = 'create-finance-profile-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); z-index: 10003; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(4px);';

    modal.innerHTML = `
        <div style="background: var(--finance-card-dark, #16161a); border-radius: 24px; padding: 32px; max-width: 500px; width: 100%; border: 1px solid rgba(255,255,255,0.1);">
            <h2 style="color: var(--finance-text-primary, #f1f5f9); font-size: 1.5rem; font-weight: 700; margin-bottom: 24px;">
                <i class="fas fa-plus-circle" style="margin-right: 8px; color: var(--finance-indigo, #3b82f6);"></i>
                Criar Novo Perfil
            </h2>
            
            <form id="create-profile-form" onsubmit="event.preventDefault(); createFinanceProfile();">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--finance-text-primary, #f1f5f9); margin-bottom: 8px; font-weight: 600;">Nome do Perfil</label>
                    <input type="text" id="profile-name" required placeholder="Ex: Empresa, Família, Pessoal..." 
                           style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: var(--finance-text-primary, #f1f5f9); font-size: 0.95rem;">
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--finance-text-primary, #f1f5f9); margin-bottom: 8px; font-weight: 600;">Descrição (opcional)</label>
                    <textarea id="profile-description" rows="2" placeholder="Descreva este perfil financeiro..."
                              style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: var(--finance-text-primary, #f1f5f9); font-size: 0.95rem; resize: vertical;"></textarea>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; color: var(--finance-text-primary, #f1f5f9); margin-bottom: 8px; font-weight: 600;">Cor</label>
                    <input type="color" id="profile-color" value="#3b82f6" 
                           style="width: 100%; height: 50px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;">
                </div>
                
                <div style="margin-bottom: 24px;">
                    <label style="display: block; color: var(--finance-text-primary, #f1f5f9); margin-bottom: 8px; font-weight: 600;">Ícone</label>
                    <select id="profile-icon" style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: var(--finance-text-primary, #f1f5f9); font-size: 0.95rem;">
                        <option value="fa-wallet">Carteira</option>
                        <option value="fa-building">Empresa</option>
                        <option value="fa-home">Casa</option>
                        <option value="fa-users">Família</option>
                        <option value="fa-briefcase">Trabalho</option>
                        <option value="fa-piggy-bank">Poupança</option>
                        <option value="fa-chart-line">Investimentos</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 12px;">
                    <button type="button" onclick="document.getElementById('create-finance-profile-modal').remove()" 
                            style="flex: 1; padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: var(--finance-text-secondary, #64748b); cursor: pointer; font-weight: 600;">
                        Cancelar
                    </button>
                    <button type="submit" 
                            style="flex: 2; padding: 14px; border-radius: 12px; border: none; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; cursor: pointer; font-weight: 700;">
                        Criar Perfil
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

window.createFinanceProfile = async function () {
    try {
        const name = document.getElementById('profile-name').value.trim();
        const description = document.getElementById('profile-description').value.trim();
        const color = document.getElementById('profile-color').value;
        const icon = document.getElementById('profile-icon').value;

        if (!name) {
            alert('Por favor, informe um nome para o perfil');
            return;
        }

        const response = await fetch(`${env.API_URL}/api/finance/profiles`, {
            method: 'POST',
            headers: {
                ...env.HEADERS_AUTH,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                description: description || null,
                color,
                icon,
                is_primary: false
            })
        });

        if (!response.ok) {
            let errorData;
            try {
                const responseText = await response.text();
                errorData = JSON.parse(responseText);
            } catch (e) {
                errorData = { error: { message: 'Erro ao criar perfil' } };
            }

            // Verificar se é erro de limite
            // O erro pode estar em errorData.error ou errorData diretamente
            const errorObj = errorData.error || errorData;
            const isLimitError = errorObj.code === 'FINANCE_PROFILE_LIMIT_REACHED' ||
                errorObj.upgradeRequired === true;

            if (isLimitError) {
                // Extrair informações de limite
                const limitInfo = {
                    currentCount: errorObj.currentCount,
                    limit: errorObj.limit,
                    upgradeRequired: true
                };

                // Fechar modal de criação
                const createModal = document.getElementById('create-finance-profile-modal');
                if (createModal) createModal.remove();

                // Mostrar modal de upgrade
                await showFinanceUpgradeModal(limitInfo);
                return;
            }

            // Extrair mensagem de erro de forma segura
            let errorMessage = 'Erro ao criar perfil';
            if (errorObj && typeof errorObj.message === 'string') {
                errorMessage = errorObj.message;
            } else if (errorData && typeof errorData.message === 'string') {
                errorMessage = errorData.message;
            } else if (typeof errorObj === 'string') {
                errorMessage = errorObj;
            }

            alert('Erro ao criar perfil: ' + errorMessage);
            // Não lançar erro aqui, apenas mostrar o alert
            return;
        }

        // Fechar modal de criação
        const createModal = document.getElementById('create-finance-profile-modal');
        if (createModal) createModal.remove();

        // Recarregar modal de perfis
        const profilesModal = document.getElementById('finance-profiles-modal');
        if (profilesModal) profilesModal.remove();

        // Mostrar modal de perfis novamente com o novo perfil
        await showFinanceProfilesModal();

    } catch (error) {
        console.error('Erro ao criar perfil:', error);
        // Tratar erro de forma mais amigável
        let errorMessage = 'Erro ao criar perfil';
        if (error.message) {
            if (typeof error.message === 'string') {
                errorMessage = error.message;
            } else if (typeof error.message === 'object') {
                errorMessage = error.message.message || JSON.stringify(error.message);
            }
        } else if (typeof error === 'object') {
            errorMessage = error.message || JSON.stringify(error);
        }
        alert('Erro ao criar perfil: ' + errorMessage);
    }
};

window.showFinanceUpgradeModal = async function (limitInfo = null) {
    try {
        // Buscar informações de limite se não fornecidas
        if (!limitInfo) {
            const limitResponse = await fetch(`${env.API_URL}/api/finance/profiles/limit`, {
                headers: env.HEADERS_AUTH
            });
            if (limitResponse.ok) {
                const limitData = await limitResponse.json();
                limitInfo = limitData.data || limitInfo;
            }
        }

        // Buscar planos de upgrade
        const plansResponse = await fetch(`${env.API_URL}/api/finance/upgrade-plans`, {
            headers: env.HEADERS_AUTH
        });

        let upgradePlans = [];
        if (plansResponse.ok) {
            const plansData = await plansResponse.json();
            upgradePlans = plansData.data || [];
        }

        // Criar modal de upgrade
        const modal = document.createElement('div');
        modal.id = 'finance-upgrade-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 10004; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(8px); overflow-y: auto;';

        modal.innerHTML = `
            <div style="background: var(--finance-card-dark, #16161a); border-radius: 24px; padding: 40px; max-width: 800px; width: 100%; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 60px rgba(0,0,0,0.8);">
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="width: 80px; height: 80px; border-radius: 20px; background: transparent; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <img src="/logo.png" alt="Conecta King" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                    </div>
                    <h2 style="color: var(--finance-text-primary, #f1f5f9); font-size: 2rem; font-weight: 700; margin-bottom: 12px;">
                        Upgrade Necessário
                    </h2>
                    <p style="color: var(--finance-text-secondary, #64748b); font-size: 1rem; line-height: 1.6;">
                        Você atingiu o limite de ${limitInfo?.limit || 1} perfil${limitInfo?.limit > 1 ? 's' : ''} financeiro${limitInfo?.limit > 1 ? 's' : ''} do seu plano atual.<br>
                        Faça upgrade para criar mais perfis e organizar melhor suas finanças!
                    </p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 32px;">
                    ${upgradePlans.map(plan => {
            const maxProfiles = plan.features?.max_finance_profiles || 1;
            return `
                            <div style="background: rgba(255,255,255,0.03); border: 2px solid rgba(59, 130, 246, 0.3); border-radius: 16px; padding: 24px; transition: all 0.3s; cursor: pointer;"
                                 onmouseover="this.style.borderColor='rgba(59, 130, 246, 0.6)'; this.style.transform='translateY(-4px)'; this.style.boxShadow='0 10px 30px rgba(59, 130, 246, 0.2)'"
                                 onmouseout="this.style.borderColor='rgba(59, 130, 246, 0.3)'; this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                                 onclick="selectUpgradePlan('${plan.plan_code}', ${plan.price}, '${plan.whatsapp_number || ''}', '${(plan.whatsapp_message || '').replace(/'/g, "\\'")}')">
                                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                                    <div>
                                        <h3 style="color: var(--finance-text-primary, #f1f5f9); font-size: 1.25rem; font-weight: 700; margin-bottom: 4px;">
                                            ${plan.plan_name}
                                        </h3>
                                        <p style="color: var(--finance-text-secondary, #64748b); font-size: 0.875rem;">
                                            ${maxProfiles} perfil${maxProfiles > 1 ? 's' : ''} na Separação de pacotes
                                        </p>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="color: var(--finance-indigo, #3b82f6); font-size: 1.75rem; font-weight: 700;">
                                            R$ ${parseFloat(plan.price).toFixed(2).replace('.', ',')}
                                        </div>
                                        <div style="color: var(--finance-text-secondary, #64748b); font-size: 0.75rem;">
                                            /mês
                                        </div>
                                    </div>
                                </div>
                                <p style="color: var(--finance-text-secondary, #64748b); font-size: 0.875rem; margin-bottom: 16px; line-height: 1.5;">
                                    ${plan.description || ''}
                                </p>
                                <div style="display: flex; align-items: center; gap: 8px; color: var(--finance-indigo, #3b82f6); font-weight: 600; font-size: 0.9rem;">
                                    <i class="fas fa-check-circle"></i>
                                    <span>Acesso a todos os módulos</span>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button onclick="document.getElementById('finance-upgrade-modal').remove()" 
                            style="padding: 14px 28px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: var(--finance-text-secondary, #64748b); cursor: pointer; font-weight: 600; transition: all 0.2s;"
                            onmouseover="this.style.color='var(--finance-text-primary, #f1f5f9)'"
                            onmouseout="this.style.color='var(--finance-text-secondary, #64748b)'">
                        Fechar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Fechar com ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

    } catch (error) {
        console.error('Erro ao mostrar modal de upgrade:', error);
        alert('Erro ao carregar informações de upgrade: ' + error.message);
    }
};

window.selectUpgradePlan = function (planCode, price, whatsappNumber, whatsappMessage) {
    // Fechar modal de upgrade
    const upgradeModal = document.getElementById('finance-upgrade-modal');
    if (upgradeModal) upgradeModal.remove();

    // Criar modal de confirmação com opção de WhatsApp
    const confirmModal = document.createElement('div');
    confirmModal.id = 'finance-upgrade-confirm-modal';
    confirmModal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 10005; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(8px);';

    // Usar mensagem personalizada se disponível, senão usar mensagem padrão
    const defaultMsg = `Olá! Gostaria de fazer upgrade para o plano ${planCode} (R$ ${price.toFixed(2).replace('.', ',')}) para ter acesso a mais perfis na Separação de pacotes.`;
    const whatsappMsg = encodeURIComponent(whatsappMessage || defaultMsg);
    const whatsappUrl = whatsappNumber
        ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${whatsappMsg}`
        : `https://wa.me/5511999999999?text=${whatsappMsg}`;

    confirmModal.innerHTML = `
        <div style="background: var(--finance-card-dark, #16161a); border-radius: 24px; padding: 40px; max-width: 500px; width: 100%; border: 1px solid rgba(255,255,255,0.1); text-align: center;">
            <div style="width: 64px; height: 64px; border-radius: 16px; background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; box-shadow: 0 10px 30px rgba(37, 211, 102, 0.4);">
                <i class="fab fa-whatsapp" style="font-size: 2rem; color: white;"></i>
            </div>
            <h2 style="color: var(--finance-text-primary, #f1f5f9); font-size: 1.5rem; font-weight: 700; margin-bottom: 16px;">
                Solicitar Upgrade
            </h2>
            <p style="color: var(--finance-text-secondary, #64748b); font-size: 1rem; margin-bottom: 32px; line-height: 1.6;">
                Clique no botão abaixo para enviar uma mensagem no WhatsApp e solicitar o upgrade do seu plano.
            </p>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <a href="${whatsappUrl}" target="_blank" 
                   style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 16px 24px; border-radius: 12px; border: none; background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); color: white; font-weight: 700; font-size: 1rem; text-decoration: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 16px rgba(37, 211, 102, 0.3);"
                   onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(37, 211, 102, 0.4)'"
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 16px rgba(37, 211, 102, 0.3)'">
                    <i class="fab fa-whatsapp" style="font-size: 1.25rem;"></i>
                    Enviar para WhatsApp
                </a>
                <button onclick="document.getElementById('finance-upgrade-confirm-modal').remove()" 
                        style="padding: 14px 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: var(--finance-text-secondary, #64748b); cursor: pointer; font-weight: 600;">
                    Cancelar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(confirmModal);

    // Fechar ao clicar fora
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) {
            confirmModal.remove();
        }
    });
};

window.showWhatsAppConfigModal = async function () {
    try {
        // Buscar configurações atuais
        const response = await fetch(`${env.API_URL}/api/finance/whatsapp-config`, {
            headers: env.HEADERS_AUTH
        });

        if (!response.ok) {
            if (response.status === 403) {
                alert('Acesso negado. Apenas administradores podem acessar esta configuração.');
                return;
            }
            throw new Error('Erro ao carregar configurações');
        }

        const responseData = await response.json();
        const configs = responseData.data || [];

        // Criar modal
        const modal = document.createElement('div');
        modal.id = 'whatsapp-config-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 10006; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(8px); overflow-y: auto;';

        modal.innerHTML = `
            <div style="background: var(--finance-card-dark, #16161a); border-radius: 24px; padding: 40px; max-width: 800px; width: 100%; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 60px rgba(0,0,0,0.8);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
                    <h2 style="color: var(--finance-text-primary, #f1f5f9); font-size: 2rem; font-weight: 700; margin: 0;">
                        <i class="fab fa-whatsapp" style="color: #25D366; margin-right: 12px;"></i>
                        Configuração de WhatsApp
                    </h2>
                    <button onclick="document.getElementById('whatsapp-config-modal').remove()" style="background: transparent; border: none; color: var(--finance-text-secondary, #64748b); font-size: 1.5rem; cursor: pointer; padding: 8px; transition: color 0.2s;" onmouseover="this.style.color='var(--finance-text-primary, #f1f5f9)'" onmouseout="this.style.color='var(--finance-text-secondary, #64748b)'">&times;</button>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 24px;">
                    ${configs.map(config => `
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px;">
                            <h3 style="color: var(--finance-text-primary, #f1f5f9); font-size: 1.25rem; font-weight: 700; margin-bottom: 20px;">
                                ${config.plan_name}
                            </h3>
                            
                            <form id="whatsapp-config-form-${config.plan_code}" onsubmit="event.preventDefault(); saveWhatsAppConfig('${config.plan_code}');" style="display: flex; flex-direction: column; gap: 16px;">
                                <div>
                                    <label style="display: block; color: var(--finance-text-secondary, #64748b); font-size: 0.875rem; font-weight: 600; margin-bottom: 8px;">Número do WhatsApp</label>
                                    <input type="text" id="whatsapp-number-${config.plan_code}" value="${config.whatsapp_number || ''}" 
                                           placeholder="5511999999999" 
                                           style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: var(--finance-text-primary, #f1f5f9); font-size: 0.95rem;">
                                </div>
                                
                                <div>
                                    <label style="display: block; color: var(--finance-text-secondary, #64748b); font-size: 0.875rem; font-weight: 600; margin-bottom: 8px;">Mensagem Personalizada</label>
                                    <textarea id="whatsapp-message-${config.plan_code}" rows="4" 
                                              placeholder="Digite a mensagem que será enviada quando o usuário solicitar este plano..."
                                              style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); color: var(--finance-text-primary, #f1f5f9); font-size: 0.95rem; resize: vertical; font-family: inherit;">${config.whatsapp_message || ''}</textarea>
                                </div>
                                
                                <button type="submit" style="padding: 14px 24px; border-radius: 12px; border: none; background: linear-gradient(135deg, #25D366 0%, #128C7E 100%); color: white; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 16px rgba(37, 211, 102, 0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(37, 211, 102, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 16px rgba(37, 211, 102, 0.3)'">
                                    <i class="fas fa-save" style="margin-right: 8px;"></i>
                                    Salvar Configuração
                                </button>
                            </form>
                        </div>
                    `).join('')}
                </div>
                
                <div style="display: flex; gap: 12px; justify-content: center; margin-top: 32px;">
                    <button onclick="document.getElementById('whatsapp-config-modal').remove()" 
                            style="padding: 14px 28px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: var(--finance-text-secondary, #64748b); cursor: pointer; font-weight: 600; transition: all 0.2s;"
                            onmouseover="this.style.color='var(--finance-text-primary, #f1f5f9)'"
                            onmouseout="this.style.color='var(--finance-text-secondary, #64748b)'">
                        Fechar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Fechar com ESC
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

    } catch (error) {
        console.error('Erro ao mostrar modal de configuração:', error);
        alert('Erro ao carregar configurações: ' + error.message);
    }
};

window.saveWhatsAppConfig = async function (planCode) {
    try {
        const whatsappNumber = document.getElementById(`whatsapp-number-${planCode}`).value.trim();
        const whatsappMessage = document.getElementById(`whatsapp-message-${planCode}`).value.trim();

        if (!whatsappNumber || !whatsappMessage) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        const response = await fetch(`${env.API_URL}/api/finance/whatsapp-config`, {
            method: 'PUT',
            headers: {
                ...env.HEADERS_AUTH,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                plan_code: planCode,
                whatsapp_number: whatsappNumber,
                whatsapp_message: whatsappMessage
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Erro ao salvar configuração' }));
            throw new Error(errorData.message || 'Erro ao salvar configuração');
        }

        alert('Configuração salva com sucesso!');

        // Recarregar modal para mostrar dados atualizados
        const modal = document.getElementById('whatsapp-config-modal');
        if (modal) modal.remove();
        await showWhatsAppConfigModal();

    } catch (error) {
        console.error('Erro ao salvar configuração:', error);
        alert('Erro ao salvar configuração: ' + error.message);
    }
};

// Modal de escolha: Entrada ou Saída (estilo Gestão Financeira - azulado), depois abre o modal completo de lançamento
window.showNovoLancamentoChoiceModal = function () {
    const overlay = document.createElement('div');
    overlay.id = 'novo-lancamento-choice-overlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(10, 10, 12, 0.92); z-index: 10005; display: flex; align-items: center; justify-content: center; padding: 24px; backdrop-filter: blur(8px);';
    overlay.innerHTML = `
        <div style="background: var(--finance-card-dark, #16161a); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 24px; padding: 40px; max-width: 440px; width: 100%; box-shadow: 0 24px 64px rgba(0,0,0,0.6);">
            <h2 style="color: var(--finance-text-primary, #f1f5f9); font-size: 1.35rem; font-weight: 700; margin: 0 0 8px 0; display: flex; align-items: center; gap: 12px;">
                <i class="fas fa-plus-circle" style="color: var(--finance-indigo, #3b82f6);"></i> Novo lançamento
            </h2>
            <p style="color: var(--finance-text-secondary, #64748b); font-size: 0.9rem; margin-bottom: 28px;">Escolha o tipo de lançamento:</p>
            <div style="display: flex; flex-direction: column; gap: 16px;">
                <button type="button" id="choice-entrada" style="display: flex; align-items: center; gap: 16px; padding: 20px 24px; background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.35); border-radius: 16px; color: #22c55e; font-size: 1.05rem; font-weight: 700; cursor: pointer; transition: all 0.2s; text-align: left;">
                    <i class="fas fa-arrow-down" style="font-size: 1.5rem; transform: rotate(180deg);"></i>
                    <span>Entrada (receita)</span>
                </button>
                <button type="button" id="choice-saida" style="display: flex; align-items: center; gap: 16px; padding: 20px 24px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 16px; color: #ef4444; font-size: 1.05rem; font-weight: 700; cursor: pointer; transition: all 0.2s; text-align: left;">
                    <i class="fas fa-arrow-down" style="font-size: 1.5rem;"></i>
                    <span>Saída (despesa)</span>
                    <span style="margin-left: auto; font-size: 0.8rem; font-weight: 600; color: var(--finance-text-secondary);">Pode vincular ao cartão de crédito</span>
                </button>
            </div>
            <button type="button" id="choice-cancel" style="margin-top: 20px; width: 100%; padding: 12px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: var(--finance-text-secondary); font-size: 0.9rem; font-weight: 600; cursor: pointer;">Cancelar</button>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#choice-entrada').onmouseover = function () { this.style.background = 'rgba(34, 197, 94, 0.2)'; this.style.borderColor = 'rgba(34, 197, 94, 0.5)'; };
    overlay.querySelector('#choice-entrada').onmouseout = function () { this.style.background = 'rgba(34, 197, 94, 0.12)'; this.style.borderColor = 'rgba(34, 197, 94, 0.35)'; };
    overlay.querySelector('#choice-saida').onmouseover = function () { this.style.background = 'rgba(239, 68, 68, 0.18)'; this.style.borderColor = 'rgba(239, 68, 68, 0.5)'; };
    overlay.querySelector('#choice-saida').onmouseout = function () { this.style.background = 'rgba(239, 68, 68, 0.1)'; this.style.borderColor = 'rgba(239, 68, 68, 0.3)'; };
    overlay.querySelector('#choice-entrada').onclick = function () {
        overlay.remove();
        if (window.openAddTransactionModal) window.openAddTransactionModal('income');
    };
    overlay.querySelector('#choice-saida').onclick = function () {
        overlay.remove();
        if (window.openAddTransactionModal) window.openAddTransactionModal('expense');
    };
    overlay.querySelector('#choice-cancel').onclick = function () { overlay.remove(); };
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); } });
};

// Zerar mês: exige senha para acessar a página de Gestão do mês
window.showZerarMesModal = function () {
    const monthIdx = typeof window.currentFinanceMonth === 'number' ? window.currentFinanceMonth : new Date().getMonth();
    const year = typeof window.currentFinanceYear === 'number' ? window.currentFinanceYear : new Date().getFullYear();
    const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthLabel = monthNames[monthIdx] + ' ' + year;
    const modal = document.createElement('div');
    modal.id = 'zerar-mes-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 10006; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(8px);';
    modal.innerHTML = `
        <div style="background: var(--finance-card-dark, #16161a); border-radius: 24px; padding: 32px; max-width: 420px; width: 100%; border: 1px solid rgba(239,68,68,0.3); box-shadow: 0 20px 60px rgba(0,0,0,0.8);">
            <h2 style="color: var(--finance-text-primary, #f1f5f9); font-size: 1.35rem; font-weight: 700; margin: 0 0 8px 0;">
                <i class="fas fa-eraser" style="color: #ef4444; margin-right: 10px;"></i>Zerar mês
            </h2>
            <p style="color: var(--finance-text-secondary, #64748b); font-size: 0.9rem; margin-bottom: 20px;">Digite a senha para acessar a <strong>Gestão do mês</strong> (${monthLabel}). Lá você pode ver e excluir os lançamentos que quiser.</p>
            <form id="zerar-mes-form" onsubmit="event.preventDefault(); confirmZerarMesAcesso();">
                <div style="margin-bottom: 16px;">
                    <label style="display: block; color: var(--finance-text-secondary); font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Senha</label>
                    <input type="password" id="zerar-mes-password" placeholder="Digite a senha (padrão: 1212)" autocomplete="off"
                           style="width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.3); color: var(--finance-text-primary); font-size: 1rem;">
                </div>
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button type="button" onclick="document.getElementById('zerar-mes-modal').remove()" style="flex: 1; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: var(--finance-text-secondary); font-weight: 600; cursor: pointer;">Cancelar</button>
                    <button type="submit" style="flex: 1; padding: 12px; border-radius: 12px; border: none; background: #ef4444; color: white; font-weight: 700; cursor: pointer;">Acessar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.getElementById('zerar-mes-password').focus();
};
window.confirmZerarMesAcesso = async function () {
    const pwd = document.getElementById('zerar-mes-password');
    if (!pwd || !pwd.value.trim()) {
        alert('Digite a senha para acessar.');
        return;
    }
    const monthIdx = typeof window.currentFinanceMonth === 'number' ? window.currentFinanceMonth : new Date().getMonth();
    const year = typeof window.currentFinanceYear === 'number' ? window.currentFinanceYear : new Date().getFullYear();
    const month = monthIdx + 1;
    try {
        const res = await fetch(`${env.API_URL}/api/finance/zerar-senha/verify`, {
            method: 'POST',
            headers: { ...env.HEADERS_AUTH, 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pwd.value.trim() })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert(data.message || (data.error && data.error.message) || data.error || 'Senha incorreta.');
            return;
        }
        document.getElementById('zerar-mes-modal')?.remove();
        window.location.href = `/zerar-mes?month=${month}&year=${year}`;
    } catch (e) {
        alert('Erro de conexão: ' + e.message);
    }
};

// Alterar senha de zerar
window.showAlterarSenhaZerarModal = function () {
    const modal = document.createElement('div');
    modal.id = 'alterar-senha-zerar-modal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 10006; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(8px);';
    modal.innerHTML = `
        <div style="background: var(--finance-card-dark, #16161a); border-radius: 24px; padding: 32px; max-width: 420px; width: 100%; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 60px rgba(0,0,0,0.8);">
            <h2 style="color: var(--finance-text-primary, #f1f5f9); font-size: 1.35rem; font-weight: 700; margin: 0 0 20px 0;">
                <i class="fas fa-key" style="color: var(--finance-indigo, #3b82f6); margin-right: 10px;"></i>Alterar senha de zerar mês
            </h2>
            <p style="color: var(--finance-text-secondary); font-size: 0.85rem; margin-bottom: 20px;">Senha usada para confirmar "Zerar mês". Mínimo 4 caracteres.</p>
            <form id="alterar-senha-zerar-form" onsubmit="event.preventDefault(); confirmAlterarSenhaZerar();">
                <div style="margin-bottom: 14px;">
                    <label style="display: block; color: var(--finance-text-secondary); font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Senha atual</label>
                    <input type="password" id="alterar-senha-atual" placeholder="Senha atual" autocomplete="off"
                           style="width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.3); color: var(--finance-text-primary); font-size: 1rem;">
                </div>
                <div style="margin-bottom: 14px;">
                    <label style="display: block; color: var(--finance-text-secondary); font-size: 0.875rem; font-weight: 600; margin-bottom: 6px;">Nova senha</label>
                    <input type="password" id="alterar-senha-nova" placeholder="Nova senha (mín. 4 caracteres)" autocomplete="off"
                           style="width: 100%; padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.3); color: var(--finance-text-primary); font-size: 1rem;">
                </div>
                <div style="display: flex; gap: 12px; margin-top: 24px;">
                    <button type="button" onclick="document.getElementById('alterar-senha-zerar-modal').remove()" style="flex: 1; padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: var(--finance-text-secondary); font-weight: 600; cursor: pointer;">Cancelar</button>
                    <button type="submit" style="flex: 1; padding: 12px; border-radius: 12px; border: none; background: var(--finance-indigo, #3b82f6); color: white; font-weight: 700; cursor: pointer;">Alterar senha</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.getElementById('alterar-senha-atual').focus();
};
window.confirmAlterarSenhaZerar = async function () {
    const atual = document.getElementById('alterar-senha-atual');
    const nova = document.getElementById('alterar-senha-nova');
    if (!atual?.value?.trim() || !nova?.value?.trim()) {
        alert('Preencha a senha atual e a nova senha.');
        return;
    }
    if (nova.value.trim().length < 4) {
        alert('A nova senha deve ter no mínimo 4 caracteres.');
        return;
    }
    try {
        const res = await fetch(`${env.API_URL}/api/finance/zerar-senha`, {
            method: 'PUT',
            headers: { ...env.HEADERS_AUTH, 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword: atual.value.trim(), newPassword: nova.value.trim() })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            alert(data.message || data.error || 'Erro ao alterar senha.');
            return;
        }
        document.getElementById('alterar-senha-zerar-modal')?.remove();
        alert('Senha alterada com sucesso.');
    } catch (e) {
        alert('Erro de conexão: ' + e.message);
    }
};

// Admin: ver senhas dos clientes (Gestão Financeira)
window.showAdminVerSenhasModal = async function () {
    try {
        const res = await fetch(`${env.API_URL}/api/finance/admin/clientes-senhas`, { headers: env.HEADERS_AUTH });
        if (!res.ok) {
            if (res.status === 403) {
                alert('Acesso negado. Apenas administradores.');
                return;
            }
            throw new Error('Erro ao carregar lista');
        }
        const json = await res.json();
        const list = json.data || json || [];
        const modal = document.createElement('div');
        modal.id = 'admin-senhas-modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.9); z-index: 10006; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(8px); overflow-y: auto;';
        modal.innerHTML = `
            <div style="background: var(--finance-card-dark, #16161a); border-radius: 24px; padding: 32px; max-width: 700px; width: 100%; border: 1px solid rgba(139,92,246,0.3); box-shadow: 0 20px 60px rgba(0,0,0,0.8);">
                <h2 style="color: var(--finance-text-primary); font-size: 1.35rem; font-weight: 700; margin: 0 0 20px 0;">
                    <i class="fas fa-list" style="color: #8b5cf6; margin-right: 10px;"></i>Senhas de zerar mês (Gestão Financeira)
                </h2>
                <p style="color: var(--finance-text-secondary); font-size: 0.85rem; margin-bottom: 20px;">Clientes com Gestão Financeira. Senhas personalizadas não são exibidas em claro — apenas se usam o padrão 1212 ou não.</p>
                <div style="max-height: 400px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                                <th style="text-align: left; padding: 12px; color: var(--finance-text-secondary); font-size: 0.75rem; text-transform: uppercase;">Cliente</th>
                                <th style="text-align: left; padding: 12px; color: var(--finance-text-secondary); font-size: 0.75rem; text-transform: uppercase;">E-mail</th>
                                <th style="text-align: left; padding: 12px; color: var(--finance-text-secondary); font-size: 0.75rem; text-transform: uppercase;">Senha zerar</th>
                            </tr>
                        </thead>
                        <tbody id="admin-senhas-tbody">
                            ${list.length === 0 ? '<tr><td colspan="3" style="padding: 24px; text-align: center; color: var(--finance-text-secondary);">Nenhum cliente com Gestão Financeira ainda.</td></tr>' : list.map(r => `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <td style="padding: 12px; color: var(--finance-text-primary);">${(r.full_name || '-').replace(/</g, '&lt;')}</td>
                                <td style="padding: 12px; color: var(--finance-text-secondary); font-size: 0.9rem;">${(r.email || '-').replace(/</g, '&lt;')}</td>
                                <td style="padding: 12px; color: #8b5cf6; font-weight: 600;">${(r.password_label || (r.uses_default_password !== false ? 'Padrão (1212)' : 'Personalizada')).replace(/</g, '&lt;')}</td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div style="margin-top: 24px; text-align: center;">
                    <button type="button" onclick="document.getElementById('admin-senhas-modal').remove()" style="padding: 12px 28px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: var(--finance-text-secondary); font-weight: 600; cursor: pointer;">Fechar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    } catch (e) {
        console.error(e);
        alert('Erro ao carregar lista: ' + e.message);
    }
};

})(typeof window !== 'undefined' ? window : this);

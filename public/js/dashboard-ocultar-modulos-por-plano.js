/**
 * Oculta no menu do dashboard itens cujo módulo não está no plano (module_plan_availability
 * + individual_user_plans − exclusions), via flags de /api/account/status (ex.: Gestão Financeira,
 * Contratos, Agenda, King Forms, etc.).
 * Inclua este script no dashboard.html e chame applyModulesVisibility(user) após carregar o usuário,
 * OU chame initModulesByPlan() para buscar /api/account/status e aplicar.
 */

(function (global) {
    'use strict';

    var API_BASE = typeof window !== 'undefined' && window.API_BASE != null ? window.API_BASE : '';

    function getAuthHeaders() {
        var token = null;
        try {
            if (typeof localStorage !== 'undefined') token = localStorage.getItem('token');
            if (!token && typeof localStorage !== 'undefined') token = localStorage.getItem('conectaKingToken');
            if (!token && typeof sessionStorage !== 'undefined') token = sessionStorage.getItem('token');
        } catch (e) {}
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return headers;
    }

    /**
     * Esconde ou mostra os itens do menu conforme hasFinance, hasContract, hasAgenda, hasModoEmpresa.
     * @param {Object} user - Objeto com hasFinance, hasContract, hasAgenda, hasModoEmpresa (boolean)
     */
    function applyModulesVisibility(user) {
        if (!user) {
            console.warn('[applyModulesVisibility] Usuário não fornecido');
            return;
        }

        try {
            var navHeal = document.querySelector('#sidebar .sidebar-nav, aside .sidebar-nav, nav.sidebar-nav');
            if (navHeal && navHeal.style.display === 'none') {
                navHeal.style.display = '';
            }
        } catch (e) {}

        console.log('[applyModulesVisibility] Aplicando visibilidade dos módulos:', {
            hasFinance: user.hasFinance,
            hasContract: user.hasContract,
            hasAgenda: user.hasAgenda,
            hasModoEmpresa: user.hasModoEmpresa,
            hasBranding: user.hasBranding,
            hasKingSelection: user.hasKingSelection,
            hasDigitalForm: user.hasDigitalForm
        });

        /** IDs estáveis do dashboard — evita fallback por texto quando o HTML ainda não tem data-module. */
        var explicitSidebarIds = {
            finance: ['#finance-link'],
            contract: ['#contratos-link'],
            agenda: ['#agenda-link'],
            branding: ['#branding-link'],
            kingbrief: ['#kingbrief-sidebar-link'],
            king_selection: ['#king-selection-sidebar-link'],
            digital_form: ['#king-forms-sidebar-link'],
            king_docs: ['#king-docs-sidebar-link'],
            photographer_site: ['#meusite-sidebar-link'],
            recibos_orcamentos: ['#recibos-orcamentos-sidebar-link']
        };

        var map = [
            { key: 'hasFinance', module: 'finance', labels: ['Gestão Financeira', 'Gestao Financeira'] },
            { key: 'hasContract', module: 'contract', labels: ['Contratos'] },
            { key: 'hasAgenda', module: 'agenda', labels: ['Agenda Inteligente', 'Agenda'] },
            { key: 'hasModoEmpresa', module: 'modo_empresa', labels: ['Modo Empresa'] },
            { key: 'hasBranding', module: 'branding', labels: ['Personalização da Marca', 'Personalizacao da Marca'] },
            { key: 'hasKingBrief', module: 'kingbrief', labels: ['KingBrief'] },
            { key: 'hasKingSelection', module: 'king_selection', labels: ['King Selection'] },
            { key: 'hasDigitalForm', module: 'digital_form', labels: ['King Forms', 'Formulário King'] },
            { key: 'hasKingDocs', module: 'king_docs', labels: ['King Docs'] }
        ];

        function resolveMenuRow(el) {
            if (!el || el.nodeType !== 1) return null;
            if (el.tagName === 'NAV' || (el.classList && el.classList.contains('sidebar-nav'))) return null;
            if (el.tagName === 'A') return el;
            var a = el.closest && el.closest('a');
            return a || null;
        }

        map.forEach(function (item) {
            // Verificar se o módulo está ativo (true ou 1 ou 'true')
            var raw = user[item.key];
            var show = raw === true || raw === 1 || raw === 'true';
            // API antiga sem hasDigitalForm: manter visível (evita sumir o menu antes do deploy do back-end)
            if (item.key === 'hasDigitalForm' && raw === undefined) {
                show = true;
            }
            if (item.key === 'hasKingDocs' && raw === undefined) {
                show = true;
            }
            
            var arr = Array.prototype.slice.call(document.querySelectorAll('[data-module="' + item.module + '"]'));
            if (arr.length === 0 && explicitSidebarIds[item.module]) {
                explicitSidebarIds[item.module].forEach(function (sel) {
                    var n = document.querySelector(sel);
                    if (n) arr.push(n);
                });
            }
            if (arr.length === 0) {
                arr = findElementsByText(item.labels);
            }
            
            console.log('[applyModulesVisibility] Módulo ' + item.module + ': show=' + show + ', encontrados ' + arr.length + ' elementos');
            
            arr.forEach(function (el) {
                var target = resolveMenuRow(el);
                if (!target) {
                    console.warn('[applyModulesVisibility] Ignorado (evita esconder <nav>):', item.module, el);
                    return;
                }
                
                if (show) {
                    target.style.display = '';
                    target.style.visibility = '';
                    target.removeAttribute('hidden');
                    target.classList.remove('hidden', 'd-none');
                    console.log('[applyModulesVisibility] ✅ Mostrando:', item.module, target);
                } else {
                    target.style.display = 'none';
                    console.log('[applyModulesVisibility] ❌ Ocultando:', item.module, target);
                }
            });
        });
    }

    /**
     * Só ligações diretas da barra lateral — nunca <nav> (o texto agregado contém todos os rótulos
     * e fazia match de "King Forms" no container inteiro, escondendo Editar/Compartilhar/QR).
     */
    function getSidebarNavAnchorCandidates() {
        var nav = document.querySelector('#sidebar .sidebar-nav, aside.sidebar .sidebar-nav, .sidebar .sidebar-nav, nav.sidebar-nav');
        if (!nav || !nav.children) return [];
        var out = [];
        for (var i = 0; i < nav.children.length; i++) {
            if (nav.children[i].tagName === 'A') out.push(nav.children[i]);
        }
        return out;
    }

    function findElementsByText(labels) {
        var found = [];
        var candidates = getSidebarNavAnchorCandidates();
        if (!candidates.length) {
            candidates = Array.prototype.slice.call(document.querySelectorAll('a.nav-link-by-plan[data-module], aside a.nav-link'));
        }
        for (var i = 0; i < candidates.length; i++) {
            var text = (candidates[i].textContent || '').trim();
            for (var j = 0; j < labels.length; j++) {
                if (text.indexOf(labels[j]) !== -1) {
                    found.push(candidates[i]);
                    break;
                }
            }
        }
        return found;
    }

    /**
     * Busca /api/account/status e aplica a visibilidade dos módulos no menu.
     * Chame após o DOM estar pronto (ex.: no load do dashboard).
     */
    function initModulesByPlan() {
        var base = API_BASE || (typeof window !== 'undefined' && window.API_URL) || '';
        if (!base || String(base).trim() === '') return;
        var url = String(base).replace(/\/$/, '') + '/api/account/status';
        fetch(url, { credentials: 'include', headers: getAuthHeaders() })
            .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
            .then(applyModulesVisibility)
            .catch(function (err) {
                if (err && err.status === 404) return;
                console.warn('[initModulesByPlan] API indisponível ou não autenticado.');
            });
    }

    // Executar quando DOM estiver pronto
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() { setTimeout(initModulesByPlan, 100); });
        } else {
            setTimeout(initModulesByPlan, 100);
        }
        if (typeof window !== 'undefined') {
            window.addEventListener('load', function() { setTimeout(initModulesByPlan, 500); });
        }
    }

    global.applyModulesVisibility = applyModulesVisibility;
    global.initModulesByPlan = initModulesByPlan;
})(typeof window !== 'undefined' ? window : this);

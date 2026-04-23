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
            { key: 'hasFinance', module: 'finance' },
            { key: 'hasContract', module: 'contract' },
            { key: 'hasAgenda', module: 'agenda' },
            { key: 'hasModoEmpresa', module: 'modo_empresa' },
            { key: 'hasBranding', module: 'branding' },
            { key: 'hasKingBrief', module: 'kingbrief' },
            { key: 'hasKingSelection', module: 'king_selection' },
            { key: 'hasDigitalForm', module: 'digital_form' },
            { key: 'hasKingDocs', module: 'king_docs' }
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
            /* Contas novas: API por vezes omite chaves — não assumir "sem módulo" (ocultaria atalhos). */
            if (raw === undefined) {
                if (
                    item.key === 'hasDigitalForm' ||
                    item.key === 'hasKingDocs' ||
                    item.key === 'hasKingSelection' ||
                    item.key === 'hasKingBrief'
                ) {
                    show = true;
                }
            }
            
            var arr = Array.prototype.slice.call(
                document.querySelectorAll('#sidebar .sidebar-nav a.nav-link[data-module="' + item.module + '"]')
            );
            if (arr.length === 0 && explicitSidebarIds[item.module]) {
                explicitSidebarIds[item.module].forEach(function (sel) {
                    var n = document.querySelector(sel);
                    if (n) arr.push(n);
                });
            }
            /* Não usar busca por texto: o seletor "aside a.nav-link" apanha Editar/Compartilhar e falsos positivos. */
            
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

        ensureCoreSidebarNavVisible();
    }

    /**
     * Itens que não são "módulos por plano" — nunca devem ficar escondidos por engano de CSS/JS antigo.
     */
    function ensureCoreSidebarNavVisible() {
        var sel = [
            '.sidebar-nav a[data-target="editar-pane"]',
            '.sidebar-nav a[data-target="compartilhar-pane"]',
            '.sidebar-nav a[data-target="relatorios-pane"]',
            '#bible-sidebar-link'
        ];
        try {
            var nav = document.querySelector('#sidebar .sidebar-nav, aside .sidebar-nav, nav.sidebar-nav');
            if (nav) {
                nav.style.display = '';
                nav.style.visibility = '';
                nav.classList.remove('hidden', 'd-none');
            }
        } catch (e) {}
        sel.forEach(function (s) {
            try {
                var el = document.querySelector(s);
                if (!el) return;
                el.style.display = '';
                el.style.visibility = '';
                el.removeAttribute('hidden');
                el.classList.remove('hidden', 'd-none');
            } catch (e2) {}
        });
    }

    /**
     * Busca /api/account/status e aplica a visibilidade dos módulos no menu.
     * Chame após o DOM estar pronto (ex.: no load do dashboard).
     */
    function initModulesByPlan() {
        var base =
            (typeof window !== 'undefined' && window.API_BASE) ||
            (typeof window !== 'undefined' && window.API_URL) ||
            API_BASE ||
            '';
        if (!base || String(base).trim() === '') return;
        var url = String(base).replace(/\/$/, '') + '/api/account/status';
        fetch(url, { credentials: 'include', headers: getAuthHeaders() })
            .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
            .then(applyModulesVisibility)
            .catch(function (err) {
                if (err && err.status === 404) return;
                /* Isto é só JSON do plano/módulos; a página HTML continua no front (origem atual). */
                console.warn(
                    '[initModulesByPlan] Falha ao falar com a API (não é o HTML do dashboard):',
                    url,
                    err && err.status ? 'HTTP ' + err.status : err
                );
                ensureCoreSidebarNavVisible();
            });
    }

    // Executar quando DOM estiver pronto
    if (typeof document !== 'undefined') {
        function bootOcultarModulos() {
            ensureCoreSidebarNavVisible();
            setTimeout(initModulesByPlan, 100);
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bootOcultarModulos);
        } else {
            bootOcultarModulos();
        }
        if (typeof window !== 'undefined') {
            window.addEventListener('load', function () {
                ensureCoreSidebarNavVisible();
                setTimeout(initModulesByPlan, 500);
            });
        }
    }

    global.applyModulesVisibility = applyModulesVisibility;
    global.initModulesByPlan = initModulesByPlan;
})(typeof window !== 'undefined' ? window : this);

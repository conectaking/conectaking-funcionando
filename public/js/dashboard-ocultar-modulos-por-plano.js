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

        console.log('[applyModulesVisibility] Aplicando visibilidade dos módulos:', {
            hasFinance: user.hasFinance,
            hasContract: user.hasContract,
            hasAgenda: user.hasAgenda,
            hasModoEmpresa: user.hasModoEmpresa,
            hasBranding: user.hasBranding,
            hasKingSelection: user.hasKingSelection,
            hasDigitalForm: user.hasDigitalForm
        });

        var map = [
            { key: 'hasFinance', module: 'finance', labels: ['Gestão Financeira', 'Gestao Financeira'] },
            { key: 'hasContract', module: 'contract', labels: ['Contratos'] },
            { key: 'hasAgenda', module: 'agenda', labels: ['Agenda Inteligente', 'Agenda'] },
            { key: 'hasModoEmpresa', module: 'modo_empresa', labels: ['Modo Empresa'] },
            { key: 'hasBranding', module: 'branding', labels: ['Personalização da Marca', 'Personalizacao da Marca'] },
            { key: 'hasKingBrief', module: 'kingbrief', labels: ['KingBrief'] },
            { key: 'hasKingSelection', module: 'king_selection', labels: ['King Selection'] },
            { key: 'hasDigitalForm', module: 'digital_form', labels: ['King Forms', 'Formulário King'] }
        ];

        map.forEach(function (item) {
            // Verificar se o módulo está ativo (true ou 1 ou 'true')
            var raw = user[item.key];
            var show = raw === true || raw === 1 || raw === 'true';
            // API antiga sem hasDigitalForm: manter visível (evita sumir o menu antes do deploy do back-end)
            if (item.key === 'hasDigitalForm' && raw === undefined) {
                show = true;
            }
            
            // Buscar elementos por data-module primeiro
            var els = document.querySelectorAll('[data-module="' + item.module + '"]');
            
            // Se não encontrou, buscar por texto
            if (els.length === 0) {
                els = findElementsByText(item.labels);
            }
            
            console.log('[applyModulesVisibility] Módulo ' + item.module + ': show=' + show + ', encontrados ' + els.length + ' elementos');
            
            els.forEach(function (el) {
                var parent = el.closest('a, li, .nav-item, .menu-item, [role="menuitem"]') || el;
                
                if (show) {
                    // Mostrar: remover display:none e garantir que está visível
                    parent.style.display = '';
                    parent.style.visibility = '';
                    parent.removeAttribute('hidden');
                    parent.classList.remove('hidden', 'd-none');
                    console.log('[applyModulesVisibility] ✅ Mostrando:', item.module, parent);
                } else {
                    // Ocultar: definir display:none
                    parent.style.display = 'none';
                    console.log('[applyModulesVisibility] ❌ Ocultando:', item.module, parent);
                }
            });
        });
    }

    function findElementsByText(labels) {
        var found = [];
        var all = document.querySelectorAll('a, button, [role="button"], .nav-link, .sidebar a, [class*="nav"], [class*="menu"]');
        for (var i = 0; i < all.length; i++) {
            var text = (all[i].textContent || '').trim();
            for (var j = 0; j < labels.length; j++) {
                if (text.indexOf(labels[j]) !== -1) {
                    found.push(all[i]);
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

/**
 * Oculta no menu do dashboard os itens Gestão Financeira, Contratos e Agenda Inteligente
 * quando o usuário não tem esses módulos no plano (igual Modo Empresa).
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
        if (!user) return;

        var map = [
            { key: 'hasFinance', module: 'finance', labels: ['Gestão Financeira', 'Gestao Financeira'] },
            { key: 'hasContract', module: 'contract', labels: ['Contratos'] },
            { key: 'hasAgenda', module: 'agenda', labels: ['Agenda Inteligente', 'Agenda'] },
            { key: 'hasModoEmpresa', module: 'modo_empresa', labels: ['Modo Empresa'] }
        ];

        map.forEach(function (item) {
            var show = user[item.key] === true;
            var els = document.querySelectorAll('[data-module="' + item.module + '"]');
            if (els.length === 0) {
                els = findElementsByText(item.labels);
            }
            els.forEach(function (el) {
                var parent = el.closest('a, li, .nav-item, .menu-item, [role="menuitem"]') || el;
                parent.style.display = show ? '' : 'none';
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
        var url = (API_BASE || (typeof window !== 'undefined' && window.API_URL)) + '/api/account/status';
        fetch(url, { credentials: 'include', headers: getAuthHeaders() })
            .then(function (r) {
                if (!r.ok) return Promise.reject(new Error('Não autenticado'));
                return r.json();
            })
            .then(function (user) {
                applyModulesVisibility(user);
            })
            .catch(function () {});
    }

    if (typeof document !== 'undefined' && document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModulesByPlan);
    } else if (typeof document !== 'undefined') {
        initModulesByPlan();
    }

    global.applyModulesVisibility = applyModulesVisibility;
    global.initModulesByPlan = initModulesByPlan;
})(typeof window !== 'undefined' ? window : this);

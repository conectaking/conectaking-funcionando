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
        if (!user) {
            console.warn('[applyModulesVisibility] Usuário não fornecido');
            return;
        }

        console.log('[applyModulesVisibility] Aplicando visibilidade dos módulos:', {
            hasFinance: user.hasFinance,
            hasContract: user.hasContract,
            hasAgenda: user.hasAgenda,
            hasModoEmpresa: user.hasModoEmpresa,
            hasBranding: user.hasBranding
        });

        var map = [
            { key: 'hasFinance', module: 'finance', labels: ['Gestão Financeira', 'Gestao Financeira'] },
            { key: 'hasContract', module: 'contract', labels: ['Contratos'] },
            { key: 'hasAgenda', module: 'agenda', labels: ['Agenda Inteligente', 'Agenda'] },
            { key: 'hasModoEmpresa', module: 'modo_empresa', labels: ['Modo Empresa'] },
            { key: 'hasBranding', module: 'branding', labels: ['Personalização da Marca', 'Personalizacao da Marca'] }
        ];

        map.forEach(function (item) {
            // Verificar se o módulo está ativo (true ou 1 ou 'true')
            var show = user[item.key] === true || user[item.key] === 1 || user[item.key] === 'true';
            
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
        var url = (API_BASE || (typeof window !== 'undefined' && window.API_URL)) + '/api/account/status';
        console.log('[initModulesByPlan] Buscando status do usuário em:', url);
        fetch(url, { credentials: 'include', headers: getAuthHeaders() })
            .then(function (r) {
                if (!r.ok) {
                    console.warn('[initModulesByPlan] Resposta não OK:', r.status);
                    return Promise.reject(new Error('Não autenticado'));
                }
                return r.json();
            })
            .then(function (user) {
                console.log('[initModulesByPlan] Status recebido:', {
                    email: user.email,
                    hasFinance: user.hasFinance,
                    hasContract: user.hasContract,
                    hasAgenda: user.hasAgenda
                });
                applyModulesVisibility(user);
            })
            .catch(function (err) {
                console.warn('[initModulesByPlan] Erro ao buscar status:', err);
            });
    }

    // Executar quando DOM estiver pronto
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                console.log('[dashboard-ocultar-modulos] DOM carregado, inicializando...');
                setTimeout(initModulesByPlan, 100); // Pequeno delay para garantir que outros scripts carregaram
            });
        } else {
            console.log('[dashboard-ocultar-modulos] DOM já carregado, inicializando...');
            setTimeout(initModulesByPlan, 100);
        }
        
        // Também executar quando a página estiver completamente carregada
        if (typeof window !== 'undefined') {
            window.addEventListener('load', function() {
                console.log('[dashboard-ocultar-modulos] Página completamente carregada, verificando novamente...');
                setTimeout(initModulesByPlan, 500);
            });
        }
    }

    global.applyModulesVisibility = applyModulesVisibility;
    global.initModulesByPlan = initModulesByPlan;
})(typeof window !== 'undefined' ? window : this);

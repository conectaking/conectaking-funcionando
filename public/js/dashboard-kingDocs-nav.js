/**
 * Insere o item de menu «King Docs» no sidebar do dashboard, a seguir à Bíblia (ou ao primeiro
 * link que corresponder a data-module="bible" ou ao texto «Bíblia»).
 * Incluir após dashboard-ocultar-modulos-por-plano.js e chamar DashboardKingDocsNav.init()
 * quando o DOM estiver pronto (ou no mesmo DOMContentLoaded do dashboard).
 */
(function (global) {
    'use strict';

    function findBibleAnchor() {
        var byModule = document.querySelector('[data-module="bible"]');
        if (byModule) return byModule;
        var all = document.querySelectorAll('a, button, [role="button"], .nav-link, .sidebar a');
        for (var i = 0; i < all.length; i++) {
            var t = (all[i].textContent || '').trim();
            if (t === 'Bíblia' || t.indexOf('Bíblia') !== -1 || t.indexOf('Biblia') !== -1) {
                return all[i];
            }
        }
        return null;
    }

    function insertAfterReference(refEl, newEl) {
        var parent = refEl.parentNode;
        if (!parent) return;
        if (refEl.nextSibling) {
            parent.insertBefore(newEl, refEl.nextSibling);
        } else {
            parent.appendChild(newEl);
        }
    }

    function init() {
        if (document.querySelector('[data-module="king_docs"]')) {
            return;
        }
        var bible = findBibleAnchor();
        var link = document.createElement('a');
        link.href = '/kingDocs.html';
        link.setAttribute('data-module', 'king_docs');
        link.textContent = 'King Docs';
        if (bible && bible.className) {
            link.className = bible.className;
        }

        if (bible && bible.closest && bible.closest('li')) {
            var li = document.createElement('li');
            li.appendChild(link);
            insertAfterReference(bible.closest('li'), li);
            return;
        }
        if (bible) {
            insertAfterReference(bible, link);
            return;
        }
        var nav = document.querySelector('.sidebar nav, aside nav, [class*="sidebar"]');
        if (nav) {
            nav.appendChild(link);
        }
    }

    global.DashboardKingDocsNav = { init: init };
})(typeof window !== 'undefined' ? window : this);

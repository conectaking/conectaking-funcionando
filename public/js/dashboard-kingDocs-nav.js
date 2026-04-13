/**
 * Insere o item «King Docs» no sidebar logo abaixo de «Bíblia».
 * Compatível com menu montado tarde (dashboard.js) e com <div>/<li> sem data-module.
 */
(function (global) {
    'use strict';

    var inserted = false;

    function norm(s) {
        return String(s || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function isBibleText(text) {
        var n = norm(text).replace(/\s+/g, ' ').trim();
        if (n.length > 120) return false;
        if (n.indexOf('biblia') !== -1) return true;
        if (n.indexOf('bible') !== -1 && n.indexOf('king') === -1) return true;
        return false;
    }

    function isRecibosText(text) {
        var n = norm(text);
        return n.indexOf('recibo') !== -1 || n.indexOf('orcamento') !== -1;
    }

    function walkSidebarNodes(root) {
        return root.querySelectorAll(
            'a, button, [role="button"], li, div[class*="nav"], div[class*="item"], div[class*="menu"], span[class*="label"]'
        );
    }

    function findBibleAnchor() {
        var byModule = document.querySelector('[data-module="bible"]');
        if (byModule) return byModule;

        var icon = document.querySelector(
            '.sidebar .fa-bible, .sidebar .fa-book-bible, aside .fa-bible, aside .fa-book-bible, [class*="sidebar"] .fa-bible'
        );
        if (icon) {
            var row = icon.closest('a, button, li, [class*="nav-item"], [class*="menu-item"], [class*="sidebar"] > div');
            if (row) return row;
        }

        var roots = document.querySelectorAll('.sidebar, aside, #sidebar, [class*="Sidebar"], [class*="side-nav"]');
        var r;
        for (r = 0; r < roots.length; r++) {
            var nodes = walkSidebarNodes(roots[r]);
            var i;
            for (i = 0; i < nodes.length; i++) {
                var el = nodes[i];
                var t = (el.textContent || '').trim();
                if (isBibleText(t)) return el;
            }
        }

        var all = document.querySelectorAll('a, button, [role="button"]');
        for (var j = 0; j < all.length; j++) {
            var t2 = (all[j].textContent || '').trim();
            if (isBibleText(t2)) return all[j];
        }
        return null;
    }

    /** Se não achar Bíblia, insere antes de «Recibos» (fica entre Bíblia e Recibos). */
    function findRecibosAnchor() {
        var roots = document.querySelectorAll('.sidebar, aside, #sidebar, [class*="Sidebar"]');
        var r;
        for (r = 0; r < roots.length; r++) {
            var nodes = walkSidebarNodes(roots[r]);
            var i;
            for (i = 0; i < nodes.length; i++) {
                var el = nodes[i];
                var t = (el.textContent || '').trim();
                if (isRecibosText(t) && t.length < 160) return el;
            }
        }
        return null;
    }

    function rowElement(el) {
        if (!el) return null;
        var li = el.closest('li');
        if (li) return li;
        var nav = el.closest('[class*="nav-item"], [class*="menu-item"], [class*="sidebar-item"]');
        if (nav) return nav;
        return el;
    }

    function removeInjected() {
        var el = document.querySelector('[data-module="king_docs"]');
        if (!el) return;
        var wrap = el.closest('li') || el.parentElement;
        if (wrap && wrap.children.length === 1 && wrap.querySelector('[data-module="king_docs"]')) {
            wrap.remove();
        } else {
            el.remove();
        }
        inserted = false;
    }

    function createLink(cloneClassFrom) {
        var link = document.createElement('a');
        link.href = '/kingDocs.html';
        link.setAttribute('data-module', 'king_docs');
        link.setAttribute('data-king-docs-injected', '1');
        link.textContent = 'King Docs';
        if (cloneClassFrom && cloneClassFrom.className) {
            link.className = cloneClassFrom.className;
        }
        return link;
    }

    function wrapLikeRow(link, ref) {
        var sample = ref;
        if (sample && (sample.tagName === 'A' || sample.tagName === 'BUTTON')) {
            sample = sample.parentElement;
        }
        var tag = (sample && sample.tagName) || 'DIV';
        if (tag === 'A' || tag === 'BUTTON') tag = 'DIV';
        if (tag === 'UL' || tag === 'OL') {
            var li = document.createElement('li');
            li.appendChild(link);
            return li;
        }
        if (tag === 'LI') {
            var li2 = document.createElement('li');
            li2.appendChild(link);
            return li2;
        }
        var wrap = document.createElement(tag);
        if (sample && sample.className) wrap.className = sample.className;
        wrap.appendChild(link);
        return wrap;
    }

    function insertAfterBible(bible, link) {
        var ref = rowElement(bible) || bible;
        var node = wrapLikeRow(link, ref);
        if (ref.parentNode) {
            ref.parentNode.insertBefore(node, ref.nextSibling);
            return true;
        }
        return false;
    }

    function insertBeforeRecibos(recibos, link) {
        var ref = rowElement(recibos) || recibos;
        var node = wrapLikeRow(link, ref);
        if (ref.parentNode) {
            ref.parentNode.insertBefore(node, ref);
            return true;
        }
        return false;
    }

    function appendToSidebar(link) {
        var sample = document.querySelector('.sidebar a, aside a, [class*="sidebar"] a');
        var nav = document.querySelector('.sidebar nav, aside nav, .sidebar, aside');
        if (nav) {
            var node = wrapLikeRow(link, sample || nav);
            nav.appendChild(node);
            return true;
        }
        return false;
    }

    function init() {
        removeInjected();

        var bible = findBibleAnchor();
        var link = createLink(bible);
        var ok = false;

        if (bible) {
            ok = insertAfterBible(bible, link);
        }
        if (!ok) {
            var rec = findRecibosAnchor();
            if (rec) {
                link = createLink(rec);
                ok = insertBeforeRecibos(rec, link);
            }
        }
        if (!ok) {
            link = createLink(null);
            ok = appendToSidebar(link);
        }

        if (ok) {
            inserted = true;
        }
    }

    function scheduleApplyVisibility() {
        try {
            if (typeof global.initModulesByPlan === 'function') {
                setTimeout(function () {
                    global.initModulesByPlan();
                }, 80);
            }
        } catch (e) {}
    }

    var tries = 0;
    var maxTries = 80;

    function tryInit() {
        if (document.querySelector('[data-module="king_docs"]')) {
            return;
        }
        if (tries++ > maxTries) {
            return;
        }
        init();
        if (document.querySelector('[data-module="king_docs"]')) {
            scheduleApplyVisibility();
        }
    }

    global.DashboardKingDocsNav = {
        init: function () {
            tries = 0;
            init();
            if (document.querySelector('[data-module="king_docs"]')) {
                scheduleApplyVisibility();
            }
        }
    };

    function onReady() {
        tryInit();
        var t1 = setTimeout(tryInit, 400);
        var t2 = setTimeout(tryInit, 1500);
        var t3 = setTimeout(tryInit, 3500);
        var obs;
        try {
            obs = new MutationObserver(function () {
                if (!document.querySelector('[data-module="king_docs"]')) {
                    tryInit();
                }
            });
            obs.observe(document.body, { childList: true, subtree: true });
        } catch (e) {}
        global.addEventListener('load', tryInit);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }
})(typeof window !== 'undefined' ? window : this);

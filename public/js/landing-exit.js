/**
 * Landing / index: mostra "Sair" no header quando há sessão (token), para trocar de conta.
 * Incluir no index.html antes de </body>:
 *   <script src="js/landing-exit.js?v=2026-04-23" defer></script>
 * Opcional: <span id="landing-sair-slot"></span> no header — o botão é inserido aqui.
 */
(function () {
    'use strict';

    function apiBase() {
        try {
            if (window.API_BASE) return String(window.API_BASE).replace(/\/$/, '');
            if (window.API_URL) return String(window.API_URL).replace(/\/$/, '');
        } catch (e) {}
        return 'https://conectaking-api.onrender.com';
    }

    function hasSession() {
        try {
            return !!(
                localStorage.getItem('token') ||
                localStorage.getItem('conectaKingToken') ||
                localStorage.getItem('refreshToken') ||
                sessionStorage.getItem('token')
            );
        } catch (e) {
            return false;
        }
    }

    function clearAuthLocal() {
        ['token', 'conectaKingToken', 'refreshToken', 'user', 'conectaKingUser', 'dashboard_last_pane'].forEach(function (k) {
            try {
                localStorage.removeItem(k);
            } catch (e) {}
            try {
                sessionStorage.removeItem(k);
            } catch (e2) {}
        });
    }

    function exitToLogin() {
        var rt = null;
        try {
            rt = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
        } catch (e) {}
        var base = apiBase();
        function go() {
            clearAuthLocal();
            window.location.href = 'index.html';
        }
        if (rt) {
            fetch(base + '/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: rt }),
                credentials: 'omit'
            })
                .catch(function () {})
                .finally(go);
        } else {
            go();
        }
    }

    function buildSairEl() {
        var el = document.createElement('a');
        el.href = '#';
        el.id = 'ck-landing-exit-injected';
        el.className = 'ck-landing-exit-link';
        el.textContent = 'Sair';
        el.setAttribute('role', 'button');
        el.setAttribute('title', 'Encerrar sessão e entrar com outra conta');
        el.style.cssText =
            'display:inline-flex;align-items:center;justify-content:center;margin-right:12px;padding:10px 18px;border-radius:8px;border:1px solid rgba(250,204,21,.9);color:#facc15;font-weight:600;font-size:0.875rem;text-decoration:none;font-family:inherit;background:transparent;cursor:pointer;transition:background .2s,color .2s,border-color .2s';
        el.addEventListener('mouseenter', function () {
            el.style.background = 'rgba(250,204,21,.14)';
            el.style.color = '#fff';
        });
        el.addEventListener('mouseleave', function () {
            el.style.background = 'transparent';
            el.style.color = '#facc15';
        });
        el.addEventListener('click', function (e) {
            e.preventDefault();
            if (window.confirm('Sair desta conta e voltar à página inicial?')) {
                exitToLogin();
            }
        });
        return el;
    }

    function injectFab() {
        if (document.getElementById('ck-landing-exit-fab')) return;
        var a = document.createElement('a');
        a.href = '#';
        a.id = 'ck-landing-exit-fab';
        a.className = 'ck-landing-exit-fab';
        a.textContent = 'Sair da conta';
        a.setAttribute('title', 'Encerrar sessão');
        a.style.cssText =
            'position:fixed;bottom:16px;right:16px;z-index:2147483000;padding:10px 14px;background:rgba(10,10,10,.92);border:1px solid #444;border-radius:8px;color:#facc15;font-size:0.8rem;font-weight:600;text-decoration:none;font-family:system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.45)';
        a.addEventListener('click', function (e) {
            e.preventDefault();
            if (window.confirm('Sair desta conta?')) exitToLogin();
        });
        document.body.appendChild(a);
    }

    function findPainelAnchor() {
        var byId = document.getElementById('access-panel-btn');
        if (byId && byId.parentNode) return byId;
        var lists = document.querySelectorAll('header a, .header a, .site-header a, nav a, [class*="nav"] a, [class*="header"] a');
        var i;
        var a;
        var t;
        for (i = 0; i < lists.length; i++) {
            a = lists[i];
            t = (a.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
            if (!t) continue;
            if (/acessar\s+painel|painel|dashboard/.test(t)) return a;
        }
        a = document.querySelector('a[href*="dashboard"], a[href*="Dashboard"]');
        return a || null;
    }

    function mount() {
        if (!hasSession()) return;
        if (document.getElementById('ck-landing-exit-injected')) return;

        var slot = document.getElementById('landing-sair-slot');
        if (slot) {
            slot.appendChild(buildSairEl());
            return;
        }
        var mountAttr = document.querySelector('[data-landing-exit-mount]');
        if (mountAttr) {
            mountAttr.appendChild(buildSairEl());
            return;
        }

        var anchor = findPainelAnchor();
        if (anchor && anchor.parentNode) {
            anchor.parentNode.insertBefore(buildSairEl(), anchor);
            return;
        }

        injectFab();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();

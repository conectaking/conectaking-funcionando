(function () {
        function apiBase() {
            try {
                if (window.API_BASE) return String(window.API_BASE).replace(/\/$/, '');
            } catch (e) {}
            return (window.location && window.location.origin) ? window.location.origin : 'https://www.conectaking.com.br';
        }
        function clearAuthLocal() {
            var keys = ['token', 'conectaKingToken', 'refreshToken', 'user', 'conectaKingUser', 'dashboard_last_pane'];
            keys.forEach(function (k) {
                try { localStorage.removeItem(k); } catch (e) {}
                try { sessionStorage.removeItem(k); } catch (e2) {}
            });
        }
        function exitToLogin() {
            var rt = null;
            try { rt = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken'); } catch (e) {}
            var base = apiBase();
            function go() {
                clearAuthLocal();
                window.location.href = '/';
            }
            if (rt) {
                fetch(base + '/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken: rt }),
                    credentials: 'include'
                }).catch(function () {}).finally(go);
            } else {
                fetch(base + '/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                    credentials: 'include'
                }).catch(function () {}).finally(go);
            }
        }
        window.ckExitToLogin = exitToLogin;

        var overlay = document.getElementById('ck-plan-block-overlay');
        var msgEl = document.getElementById('ck-plan-block-msg');
        var btnOk = document.getElementById('ck-plan-block-ok');
        var btnExit = document.getElementById('ck-plan-block-exit');

        function hidePlanOverlay() {
            if (!overlay) return;
            overlay.style.display = 'none';
            overlay.setAttribute('aria-hidden', 'true');
        }
        function showPlanOverlay(text) {
            if (!overlay || !msgEl) {
                window.__ckOrigAlert(text);
                return;
            }
            msgEl.textContent = text;
            overlay.style.display = 'flex';
            overlay.setAttribute('aria-hidden', 'false');
        }

        if (btnOk) btnOk.addEventListener('click', hidePlanOverlay);
        if (btnExit) btnExit.addEventListener('click', exitToLogin);

        var orig = window.alert;
        window.__ckOrigAlert = orig;
        window.alert = function (message) {
            var text = String(message == null ? '' : message);
            var planBlock = /acesso\s+negado/i.test(text) && (/upgrade|plano|assinatura|dashboard/i.test(text));
            if (planBlock) {
                showPlanOverlay(text);
                return;
            }
            return orig.call(window, message);
        };
    })();

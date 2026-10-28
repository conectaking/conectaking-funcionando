/**
 * Ajustes leves para Android - sem substituir fetch/setTimeout globalmente.
 * A versão anterior injetava headers proibidos (Sec-Fetch-*, Connection, User-Agent),
 * forava credentials: 'omit' e alterava qualquer setTimeout < 5s para no mínimo 10s,
 * o que quebrava AbortController, backoffs e comportamento s no mobile.
 */
(function () {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const isAndroid = /Android/i.test(ua);
    const isXiaomi = /Xiaomi|Redmi|POCO/i.test(ua);

    if (!isAndroid) return;

    console.log('?? Android: carregando android-fix.js (modo seguro, sem monkey-patch de fetch/setTimeout)');

    if ('connection' in navigator && navigator.connection && typeof navigator.connection.addEventListener === 'function') {
        navigator.connection.addEventListener('change', function () {
            var c = navigator.connection;
            if (!c) return;
            if (c.effectiveType === 'slow-2g' || c.effectiveType === '2g') {
                window.ANDROID_SLOW_CONNECTION = true;
            } else {
                window.ANDROID_SLOW_CONNECTION = false;
            }
        });
    }

    if (isXiaomi && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
            registrations.forEach(function (registration) {
                registration.unregister();
            });
        }).catch(function () { /* ignore */ });
    }

    // Suporte a telas de alta taxa de amostragem de toque (120Hz/240Hz/Xiaomi Poco/Redmi/Samsung)
    // Previne que micro-movimentos involuntários de 1-2px em containers scrolláveis cancelem cliques de botões e abas
    let _touchStartX = 0;
    let _touchStartY = 0;
    let _touchStartTime = 0;
    let _lastHandledTapTime = 0;

    document.addEventListener('touchstart', function (e) {
        if (!e.touches || !e.touches[0]) return;
        _touchStartX = e.touches[0].clientX;
        _touchStartY = e.touches[0].clientY;
        _touchStartTime = Date.now();
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
        if (!e.changedTouches || !e.changedTouches[0]) return;
        const dx = Math.abs(e.changedTouches[0].clientX - _touchStartX);
        const dy = Math.abs(e.changedTouches[0].clientY - _touchStartY);
        const elapsed = Date.now() - _touchStartTime;

        // Se o toque durou menos de 450ms e o dedo moveu menos de 14px (tap intencional e não scroll)
        if (elapsed < 450 && dx < 14 && dy < 14) {
            const target = e.target;
            if (!target) return;

            // 1. Abas da Gestão Financeira
            const financeTab = target.closest ? target.closest('.finance-unified-tab') : null;
            if (financeTab) {
                const tabId = financeTab.getAttribute('data-finance-tab');
                if (tabId && typeof window.switchUnifiedFinanceTab === 'function') {
                    _lastHandledTapTime = Date.now();
                    e.preventDefault();
                    window.switchUnifiedFinanceTab(tabId);
                    return;
                }
            }

            // 2. Abas do Editor (.editor-nav-link)
            const editorTab = target.closest ? target.closest('.editor-nav-link') : null;
            if (editorTab) {
                const targetId = editorTab.getAttribute('data-editor-target');
                if (targetId && typeof window.__ckSwitchEditorTab === 'function') {
                    _lastHandledTapTime = Date.now();
                    e.preventDefault();
                    window.__ckSwitchEditorTab(targetId);
                    return;
                }
            }

            // 3. Abas do Sidebar (Perfis / Empresa)
            const sidebarTab = target.closest ? target.closest('.sidebar-tab') : null;
            if (sidebarTab && !sidebarTab.disabled) {
                _lastHandledTapTime = Date.now();
                e.preventDefault();
                sidebarTab.click();
                return;
            }

            // 4. Botões no container de abas ou de ações do financeiro
            const tabBtn = target.closest ? target.closest('.finance-tabs-container button, .finance-header-actions button, .finance-period-buttons button') : null;
            if (tabBtn && !tabBtn.disabled) {
                _lastHandledTapTime = Date.now();
                tabBtn.click();
                return;
            }
        }
    }, { passive: false });
})();

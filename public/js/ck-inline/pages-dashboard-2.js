(function (w) {
        function ensureCoreSidebarNavStub() {
            try {
                var nav = document.querySelector('#sidebar .sidebar-nav, aside .sidebar-nav, nav.sidebar-nav');
                if (nav) { nav.style.display = ''; nav.style.visibility = ''; nav.classList.remove('hidden', 'd-none'); }
                ['.sidebar-nav a[data-target="editar-pane"]', '.sidebar-nav a[data-target="compartilhar-pane"]', '.sidebar-nav a[data-target="relatorios-pane"]', '#bible-sidebar-link', '#logout-btn', '#assinatura-link'].forEach(function (sel) {
                    var el = document.querySelector(sel);
                    if (!el) return;
                    el.style.display = '';
                    el.style.visibility = '';
                    el.removeAttribute('hidden');
                    el.classList.remove('hidden', 'd-none');
                });
            } catch (e) {}
        }
        w.applyModulesVisibility = function (user) { if (user) { /* noop até o script real carregar */ } ensureCoreSidebarNavStub(); };
        w.initModulesByPlan = function () {};
    })(typeof window !== 'undefined' ? window : this);

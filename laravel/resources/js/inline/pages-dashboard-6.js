(function(){
        function restorePane() {
            var hash = (location.hash || '').trim();
            if (!hash || hash === '#') {
                try { var s = localStorage.getItem('dashboard_last_pane'); if (s) hash = s.charAt(0)==='#' ? s : '#'+s; } catch(e){}
            }
            if (!hash || hash === '#') return;
            var tid = hash.replace(/^#/,'').trim();
            if (tid.startsWith('finance-pane-tab-')) tid = 'finance-pane';
            var map = {finance:'finance-pane','king-forms':'king-forms-pane',relatorios:'relatorios-pane',editar:'editar-pane',compartilhar:'compartilhar-pane',branding:'branding-pane','separacao-pacotes':'separacao-pacotes-pane',assinatura:'assinatura-pane','personalizar-link':'personalizar-link-pane'};
            var editorTab = null;
            if (map[tid]) tid = map[tid];
            else if (tid === 'modelos-editor' || tid === 'info-editor' || tid === 'items-editor' || tid === 'personalizar-editor') { editorTab = tid; tid = 'editar-pane'; }
            var target = document.getElementById(tid);
            var panes = document.querySelectorAll('.main-content');
            if (panes.length && target) {
                panes.forEach(function(p){ p.classList.remove('active'); p.style.display='none'; });
                target.classList.add('active'); target.style.display='flex';
                var link = document.querySelector('.sidebar .nav-link[data-target="'+tid+'"]');
                /* Itens da conta (Assinatura, ADM, etc.) ficam em .sidebar-footer: não limpar .active
                   do .sidebar-nav — muitos temas usam .sidebar-nav .nav-link:not(.active){display:none}
                   e o menu principal sumiria ao abrir #assinatura-pane. */
                if (link) {
                    var inFooter = !!(link.closest && link.closest('.sidebar-footer'));
                    if (inFooter) {
                        document.querySelectorAll('.sidebar-footer .nav-link').forEach(function(l){ l.classList.remove('active'); });
                    } else {
                        document.querySelectorAll('.sidebar-nav .nav-link').forEach(function(l){ l.classList.remove('active'); });
                        document.querySelectorAll('.sidebar-footer .nav-link').forEach(function(l){ l.classList.remove('active'); });
                    }
                    link.classList.add('active');
                }
                if (editorTab) {
                    var el = document.querySelector('[data-editor-target="'+editorTab+'"]');
                    var pane = document.getElementById(editorTab);
                    if (el && pane) {
                        document.querySelectorAll('.editor-nav-link').forEach(function(l){ l.classList.remove('active'); });
                        document.querySelectorAll('.editor-pane').forEach(function(p){ p.classList.remove('active'); });
                        el.classList.add('active');
                        pane.classList.add('active');
                    }
                }
            }
        }
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restorePane);
        else restorePane();
        setTimeout(restorePane, 0);
    })();

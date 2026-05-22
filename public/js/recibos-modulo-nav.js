/**
 * Barra inferior mobile (Painel, Recibos, Orçam., Clientes, Config) — módulo Recibos e Orçamentos.
 * Uso: <script src="js/recibos-modulo-nav.js" data-active="painel|recibo|orcamento|clientes|config"></script>
 */
(function () {
    var script = document.currentScript;
    var active = (script && script.getAttribute('data-active')) || 'painel';

    document.body.classList.add('recibos-modulo-page');

    var aside = document.querySelector('body > aside');
    if (aside) {
        aside.classList.add('recibos-sidebar-desktop');
    }

    var main = document.querySelector('body > main');
    if (main) {
        main.classList.add('recibos-main-content');
    }

    if (document.getElementById('recibos-bottom-nav')) return;

    var items = [
        { id: 'painel', href: 'dashboard-recibos-orcamentos.html', icon: 'dashboard', label: 'Painel' },
        { id: 'recibo', href: 'dashboard-recibos-orcamentos.html?abrir=recibo', icon: 'receipt_long', label: 'Recibos' },
        { id: 'orcamento', href: 'dashboard-recibos-orcamentos.html?abrir=orcamento', icon: 'request_quote', label: 'Orçam.' },
        { id: 'clientes', href: 'clientes-recibos-orcamentos.html', icon: 'people', label: 'Clientes' },
        { id: 'config', href: 'configuracoes-recibos-orcamentos.html', icon: 'settings', label: 'Config' }
    ];

    var nav = document.createElement('nav');
    nav.id = 'recibos-bottom-nav';
    nav.className = 'bottom-nav-safe fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white dark:bg-card-dark border-t border-slate-200 dark:border-border-dark flex justify-around items-center py-2 px-1';

    items.forEach(function (it) {
        var a = document.createElement('a');
        a.href = it.href;
        var isActive = it.id === active;
        a.className = 'flex flex-col items-center gap-0.5 min-w-0 px-1 py-1 no-underline ' + (isActive ? 'text-primary' : 'text-slate-400 hover:text-primary');
        a.innerHTML = '<span class="material-icons-outlined text-2xl">' + it.icon + '</span><span class="text-[9px] font-bold uppercase">' + it.label + '</span>';
        nav.appendChild(a);
    });

    document.body.appendChild(nav);
})();

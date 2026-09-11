<!DOCTYPE html>
<html class="dark" lang="pt-BR">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Painel — Recibos e Orçamentos | ConectaKing</title>
    @vite(['resources/css/app.css', 'resources/js/pages/dashboard-recibos-orcamentos.js'])
</head>
<body data-recibos-nav="painel" class="recibos-modulo-page bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
<aside class="recibos-sidebar-desktop fixed left-0 top-0 h-full w-20 bg-white dark:bg-card-dark border-r border-slate-200 dark:border-border-dark hidden lg:flex flex-col items-center py-8 z-50">
    <div class="mb-10 text-primary"><span class="material-icons-outlined text-4xl">description</span></div>
    <nav class="flex flex-col gap-6">
        <a href="/dashboard-recibos-orcamentos" class="flex flex-col items-center gap-1 text-primary">
            <span class="material-icons-outlined">dashboard</span>
            <span class="text-[10px] font-semibold uppercase">Painel</span>
        </a>
        <a href="/dashboard-recibos-orcamentos?abrir=recibo" class="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors" title="Recibos">
            <span class="material-icons-outlined">receipt_long</span>
            <span class="text-[10px] font-semibold uppercase">Recibos</span>
        </a>
        <a href="/dashboard-recibos-orcamentos?abrir=orcamento" class="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors" title="Orçamentos">
            <span class="material-icons-outlined">request_quote</span>
            <span class="text-[10px] font-semibold uppercase">Orçamentos</span>
        </a>
    </nav>
    <div class="flex flex-col gap-6 mt-6">
        <a href="/clientes-recibos-orcamentos" class="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors" title="Clientes">
            <span class="material-icons-outlined">people</span>
            <span class="text-[10px] font-semibold uppercase">Clientes</span>
        </a>
        <a href="/configuracoes-recibos-orcamentos" class="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors" title="Configurações">
            <span class="material-icons-outlined">settings</span>
            <span class="text-[10px] font-semibold uppercase">Config.</span>
        </a>
    </div>
</aside>

<main class="recibos-main-content ml-0 lg:ml-20 p-4 sm:p-6 lg:p-12 max-w-full">
    <div class="max-w-4xl mx-auto w-full">
        <header class="mb-6 lg:mb-8 flex flex-col sm:flex-row flex-wrap justify-between items-start gap-4">
            <div>
                <h1 class="text-2xl sm:text-3xl font-bold dark:text-white mb-2">Painel — Recibos e Orçamentos</h1>
                <p class="text-slate-500 dark:text-slate-400">Gerencie seus documentos e acesse as outras áreas do módulo.</p>
            </div>
            <a href="/dashboard" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-card-dark border border-slate-200 dark:border-border-dark hover:border-primary/50 hover:bg-slate-200 dark:hover:bg-black/40 transition-all text-inherit no-underline">
                <span class="material-icons-outlined text-lg">arrow_back</span>
                <span class="font-medium">Voltar ao painel principal</span>
            </a>
        </header>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <button type="button" id="btn-abrir-recibo" data-tipo="recibo" class="flex items-center gap-4 p-6 rounded-2xl bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark hover:border-primary/50 transition-all text-left w-full">
                <span class="material-icons-outlined text-4xl text-primary">receipt_long</span>
                <div>
                    <h2 class="font-bold text-lg dark:text-white">Recibo</h2>
                    <p class="text-sm text-slate-500">Criar novo, continuar o último ou escolher na lista</p>
                </div>
            </button>
            <button type="button" id="btn-abrir-orcamento" data-tipo="orcamento" class="flex items-center gap-4 p-6 rounded-2xl bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark hover:border-primary/50 transition-all text-left w-full">
                <span class="material-icons-outlined text-4xl text-primary">request_quote</span>
                <div>
                    <h2 class="font-bold text-lg dark:text-white">Orçamento</h2>
                    <p class="text-sm text-slate-500">Criar novo, continuar o último ou escolher na lista</p>
                </div>
            </button>
        </div>

        <section class="bg-white dark:bg-card-dark p-6 rounded-2xl border border-slate-200 dark:border-border-dark">
            <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div class="flex items-center gap-3">
                    <h2 class="uppercase tracking-widest text-xs font-bold text-primary flex items-center gap-2">
                        <span class="material-icons-outlined">list</span>
                        Documentos recentes
                    </h2>
                    <select id="filter-tipo" class="text-sm rounded-lg bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark px-3 py-1">
                        <option value="">Todos</option>
                        <option value="recibo">Recibos</option>
                        <option value="orcamento">Orçamentos</option>
                    </select>
                </div>
                <span id="loading-docs" class="text-sm text-slate-500">A carregar—</span>
                <div id="bulk-actions" class="flex items-center gap-3 hidden">
                    <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-400">
                        <input type="checkbox" id="select-all" class="rounded border-slate-300 text-primary focus:ring-primary"/>
                        <span>Selecionar todos</span>
                    </label>
                    <button type="button" id="btn-excluir-selecionados" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 text-sm font-medium transition-colors">
                        <span class="material-icons-outlined text-base">delete_sweep</span>
                        Excluir selecionados
                    </button>
                </div>
            </div>
            <div id="lista-documentos" class="space-y-2 max-h-96 overflow-y-auto">
                <!-- preenchido via JS -->
            </div>
            <div id="docs-load-more-wrap" class="pt-3 text-center hidden">
                <button type="button" id="btn-docs-load-more" class="px-4 py-2 rounded-lg border border-slate-300 dark:border-border-dark text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-black/40 transition-colors">
                    Carregar mais
                </button>
            </div>
            <p id="empty-docs" class="text-slate-500 text-sm hidden">Nenhum documento ainda. Crie um recibo ou orçamento acima.</p>
        </section>
    </div>
</main>

<div id="modal-escolha-doc" class="fixed inset-0 z-[200] hidden items-center justify-center p-4 bg-black/60" aria-hidden="true">
    <div class="w-full max-w-md rounded-2xl bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark shadow-xl p-6" role="dialog" aria-labelledby="modal-escolha-titulo">
        <h3 id="modal-escolha-titulo" class="text-xl font-bold dark:text-white mb-1">Recibo</h3>
        <p id="modal-escolha-sub" class="text-sm text-slate-500 dark:text-slate-400 mb-5">O que você deseja fazer?</p>
        <div class="flex flex-col gap-2">
            <button type="button" id="modal-btn-novo" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-black font-semibold hover:opacity-90 transition-opacity text-left">
                <span class="material-icons-outlined">add_circle</span>
                <span><span class="block">Criar novo em branco</span><span class="block text-xs font-normal opacity-80">Documento vazio, número novo</span></span>
            </button>
            <button type="button" id="modal-btn-continuar" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-border-dark hover:border-primary/50 text-left hidden">
                <span class="material-icons-outlined text-primary">edit</span>
                <span><span class="block font-medium dark:text-white" id="modal-continuar-label">Continuar o último</span><span class="block text-xs text-slate-500" id="modal-continuar-sub"></span></span>
            </button>
            <button type="button" id="modal-btn-lista" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-border-dark hover:border-primary/50 text-left">
                <span class="material-icons-outlined">list</span>
                <span><span class="block font-medium dark:text-white">Ver lista abaixo</span><span class="block text-xs text-slate-500">Editar, duplicar ou excluir</span></span>
            </button>
        </div>
        <button type="button" id="modal-btn-fechar" class="mt-4 w-full py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancelar</button>
    </div>
</div>

    <script src="/config.js?v=2026-09-09-vite1"></script>
</body>
</html>

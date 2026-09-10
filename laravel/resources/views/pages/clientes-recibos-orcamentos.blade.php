<!DOCTYPE html>
<html class="dark" lang="pt-BR">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Clientes â€” Recibos e OrÃ§amentos | ConectaKing</title>
    
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet"/>
    
    <style> body { font-family: 'Inter', sans-serif; } </style>
    @vite(['resources/css/app.css', 'resources/js/pages/clientes-recibos-orcamentos.js'])
</head>
<body data-recibos-nav="clientes" class="recibos-modulo-page bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
<aside class="recibos-sidebar-desktop fixed left-0 top-0 h-full w-20 bg-white dark:bg-card-dark border-r border-slate-200 dark:border-border-dark hidden lg:flex flex-col items-center py-8 z-50">
    <div class="mb-10 text-primary"><span class="material-icons-outlined text-4xl">description</span></div>
    <nav class="flex flex-col gap-6">
        <a href="/dashboard-recibos-orcamentos" class="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
            <span class="material-icons-outlined">dashboard</span>
            <span class="text-[10px] font-semibold uppercase">Painel</span>
        </a>
        <a href="/dashboard-recibos-orcamentos?abrir=recibo" class="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
            <span class="material-icons-outlined">receipt_long</span>
            <span class="text-[10px] font-semibold uppercase">Recibos</span>
        </a>
        <a href="/dashboard-recibos-orcamentos?abrir=orcamento" class="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
            <span class="material-icons-outlined">request_quote</span>
            <span class="text-[10px] font-semibold uppercase">OrÃ§amentos</span>
        </a>
    </nav>
    <div class="flex flex-col gap-6 mt-6">
        <a href="/clientes-recibos-orcamentos" class="flex flex-col items-center gap-1 text-primary">
            <span class="material-icons-outlined">people</span>
            <span class="text-[10px] font-semibold uppercase">Clientes</span>
        </a>
        <a href="/configuracoes-recibos-orcamentos" class="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
            <span class="material-icons-outlined">settings</span>
            <span class="text-[10px] font-semibold uppercase">Config.</span>
        </a>
    </div>
</aside>
<main class="recibos-main-content ml-0 lg:ml-20 p-4 sm:p-6 lg:p-12 max-w-full">
    <div class="max-w-4xl mx-auto w-full">
        <header class="mb-6 lg:mb-8">
            <h1 class="text-2xl sm:text-3xl font-bold dark:text-white mb-2">Clientes</h1>
            <p class="text-slate-500 dark:text-slate-400">Cadastre clientes para preencher automaticamente ao criar recibos e orÃ§amentos. Ao digitar o nome do cliente, o sistema sugere os cadastrados.</p>
        </header>

        <section class="bg-white dark:bg-card-dark p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-border-dark mb-6">
            <h2 class="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
                <span class="material-icons-outlined text-primary">person_add</span>
                Cadastrar cliente
            </h2>
            <form id="form-cliente" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Nome</label>
                    <input name="nome" id="cliente-nome" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" placeholder="Nome completo ou razÃ£o social" type="text" required/>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">CPF/CNPJ</label>
                    <input name="cpf_cnpj" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" placeholder="000.000.000-00" type="text"/>
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">EndereÃ§o</label>
                    <input name="endereco" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" placeholder="Rua, nÃºmero, bairro, cidade" type="text"/>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Contato</label>
                    <input name="contato" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" placeholder="Telefone ou e-mail" type="text"/>
                </div>
                <div class="md:col-span-2">
                    <button type="submit" class="px-4 py-2 rounded-lg bg-primary text-black font-semibold hover:opacity-90 transition-opacity">
                        Cadastrar cliente
                    </button>
                </div>
            </form>
        </section>

        <section class="bg-white dark:bg-card-dark p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-border-dark">
            <h2 class="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
                <span class="material-icons-outlined text-primary">people</span>
                Lista de clientes
            </h2>
            <div id="lista-clientes" class="space-y-2 max-h-96 overflow-y-auto">
                <!-- preenchido via JS -->
            </div>
            <p id="empty-clientes" class="text-slate-500 text-sm hidden">Nenhum cliente cadastrado. Cadastre acima ou marque "Cadastrar este cliente" ao salvar um recibo/orÃ§amento.</p>
        </section>

        <p class="mt-6 text-slate-500 text-sm">No <a href="/dashboard-recibos-orcamentos" class="text-primary font-medium hover:underline">painel</a>, escolha <a href="/dashboard-recibos-orcamentos?abrir=recibo" class="text-primary font-medium hover:underline">Recibo</a> ou <a href="/dashboard-recibos-orcamentos?abrir=orcamento" class="text-primary font-medium hover:underline">OrÃ§amento</a> para criar novo ou continuar um existente. Ao editar, digite o nome do cliente para buscar na lista.</p>
    </div>
</main>

    <script src="/config.js?v=2026-09-09-vite1"></script>
</body>
</html>

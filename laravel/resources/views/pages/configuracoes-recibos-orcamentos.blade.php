<!DOCTYPE html>
<html class="dark" lang="pt-BR">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>ConfiguraÃ§Ãµes â€” Recibos e OrÃ§amentos | ConectaKing</title>
    
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet"/>
    
    <style> body { font-family: 'Inter', sans-serif; } </style>
    @vite(['resources/css/app.css', 'resources/js/pages/configuracoes-recibos-orcamentos.js'])
</head>
<body data-recibos-nav="config" class="recibos-modulo-page bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
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
        <a href="/clientes-recibos-orcamentos" class="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
            <span class="material-icons-outlined">people</span>
            <span class="text-[10px] font-semibold uppercase">Clientes</span>
        </a>
        <a href="/configuracoes-recibos-orcamentos" class="flex flex-col items-center gap-1 text-primary">
            <span class="material-icons-outlined">settings</span>
            <span class="text-[10px] font-semibold uppercase">Config.</span>
        </a>
    </div>
</aside>
<main class="recibos-main-content ml-0 lg:ml-20 p-4 sm:p-6 lg:p-12 max-w-full">
    <div class="max-w-4xl mx-auto w-full">
        <header class="mb-6 lg:mb-8">
            <h1 class="text-2xl sm:text-3xl font-bold dark:text-white mb-2">ConfiguraÃ§Ãµes</h1>
            <p class="text-slate-500 dark:text-slate-400">ConfiguraÃ§Ãµes do mÃ³dulo Recibos e OrÃ§amentos.</p>
        </header>
        <div class="bg-white dark:bg-card-dark p-6 rounded-2xl border border-slate-200 dark:border-border-dark space-y-6">
            <section>
                <h2 class="text-lg font-bold dark:text-white mb-2 flex items-center gap-2">
                    <span class="material-icons-outlined text-primary">image</span>
                    Logomarca fixa
                </h2>
                <p class="text-slate-500 dark:text-slate-400 text-sm mb-4">Configure a logo que serÃ¡ usada em todos os recibos e orÃ§amentos.</p>
                <div id="logo-fixa-upload-area" class="rounded-xl border-2 border-dashed border-slate-200 dark:border-border-dark bg-slate-50 dark:bg-black/40 p-6 text-center cursor-pointer hover:border-primary/50 max-w-xs mb-4">
                    <input type="file" id="file-logo-fixa" accept="image/png,image/jpeg,image/jpg,image/webp" class="hidden"/>
                    <img id="logo-fixa-preview" src="" alt="Logo" class="max-h-20 w-auto mx-auto rounded-lg" style="display: none;"/>
                    <div id="logo-fixa-text">
                        <span class="material-icons-outlined text-3xl text-primary block mb-2">cloud_upload</span>
                        <p class="text-sm text-slate-600 dark:text-slate-300 m-0">Clique para definir logo padrÃ£o</p>
                    </div>
                </div>
                <p class="text-slate-500 dark:text-slate-400 text-xs mb-2">Selecione a imagem para ver como ficarÃ¡ antes de confirmar.</p>
                <button type="button" id="btn-remover-logo-fixa" class="text-sm text-red-500 hover:underline" style="display: none;">Remover logo fixa</button>
            </section>
            <!-- Modal: visualizar logo antes de importar -->
            <div id="logo-preview-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" style="display: none;">
                <div class="bg-white dark:bg-card-dark rounded-2xl shadow-xl border border-slate-200 dark:border-border-dark max-w-md w-full overflow-hidden">
                    <div class="p-4 border-b border-slate-200 dark:border-border-dark">
                        <h3 class="text-lg font-bold dark:text-white">Visualizar logo</h3>
                        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Confira se estÃ¡ como deseja antes de usar nos documentos.</p>
                    </div>
                    <div class="p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-black/40 min-h-[200px]">
                        <img id="logo-preview-modal-img" src="" alt="Preview" class="max-h-40 w-auto object-contain rounded-lg border border-slate-200 dark:border-border-dark"/>
                    </div>
                    <div class="p-4 flex gap-3 justify-end border-t border-slate-200 dark:border-border-dark">
                        <button type="button" id="logo-modal-cancel" class="px-4 py-2 rounded-lg border border-slate-200 dark:border-border-dark text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-black/40 transition-colors">Escolher outra</button>
                        <button type="button" id="logo-modal-confirm" class="px-4 py-2 rounded-lg bg-primary text-black font-medium hover:opacity-90 transition-opacity">Usar esta logo</button>
                    </div>
                </div>
            </div>
            <section>
                <h2 class="text-lg font-bold dark:text-white mb-2 flex items-center gap-2">
                    <span class="material-icons-outlined text-primary">palette</span>
                    Cores do preview e PDF
                </h2>
                <p class="text-slate-500 dark:text-slate-400 text-sm mb-4">Personalize as cores dos documentos. As alteraÃ§Ãµes aparecem na visualizaÃ§Ã£o e ao exportar o PDF.</p>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                        <label class="block text-sm font-medium dark:text-slate-300 mb-2">CabeÃ§alho (azul)</label>
                        <div class="flex items-center gap-2">
                            <input type="color" id="cor-cabecalho" value="#1e3a5f" class="w-12 h-10 rounded border border-slate-200 dark:border-border-dark cursor-pointer"/>
                            <input type="text" id="cor-cabecalho-hex" value="#1e3a5f" class="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark text-sm font-mono" maxlength="7"/>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium dark:text-slate-300 mb-2">Destaque / Laranja</label>
                        <div class="flex items-center gap-2">
                            <input type="color" id="cor-destaque" value="#e67e22" class="w-12 h-10 rounded border border-slate-200 dark:border-border-dark cursor-pointer"/>
                            <input type="text" id="cor-destaque-hex" value="#e67e22" class="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark text-sm font-mono" maxlength="7"/>
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium dark:text-slate-300 mb-2">Fundo do documento</label>
                        <div class="flex items-center gap-2">
                            <input type="color" id="cor-fundo" value="#ffffff" class="w-12 h-10 rounded border border-slate-200 dark:border-border-dark cursor-pointer"/>
                            <input type="text" id="cor-fundo-hex" value="#ffffff" class="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark text-sm font-mono" maxlength="7"/>
                        </div>
                    </div>
                </div>
                <button type="button" id="btn-salvar-cores" class="mt-4 px-4 py-2 rounded-lg bg-primary text-black font-medium hover:opacity-90 transition-opacity">
                    Salvar cores
                </button>
            </section>
            <section>
                <h2 class="text-lg font-bold dark:text-white mb-2 flex items-center gap-2">
                    <span class="material-icons-outlined text-primary">assignment</span>
                    Texto padrÃ£o para condiÃ§Ãµes de pagamento
                </h2>
                <p class="text-slate-500 dark:text-slate-400 text-sm mb-4">Esse texto serÃ¡ prÃ©-preenchido ao criar um novo orÃ§amento. Ex.: "20% para marcaÃ§Ã£o; 30% um dia antes do evento; 50% no encerramento."</p>
                <textarea id="condicoes-padrao" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-3 text-sm resize-y min-h-[80px]" placeholder="Ex.: 20% para marcaÃ§Ã£o; 30% um dia antes; 50% no dia"></textarea>
                <button type="button" id="btn-salvar-condicoes-padrao" class="mt-2 px-4 py-2 rounded-lg bg-primary text-black font-medium hover:opacity-90 transition-opacity">Salvar texto padrÃ£o</button>
            </section>
            <section>
                <h2 class="text-lg font-bold dark:text-white mb-2 flex items-center gap-2">
                    <span class="material-icons-outlined text-primary">list_alt</span>
                    CatÃ¡logo de serviÃ§os
                </h2>
                <p class="text-slate-500 dark:text-slate-400 text-sm mb-4">ServiÃ§os ou produtos que vocÃª usa com frequÃªncia. Ao criar um orÃ§amento/recibo, use "Inserir do catÃ¡logo" para adicionar rapidamente.</p>
                <div class="space-y-2 mb-4 max-w-lg">
                    <div class="flex gap-2">
                        <input type="text" id="cat-desc" class="flex-1 bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2 text-sm" placeholder="DescriÃ§Ã£o (ex: Ensaio fotogrÃ¡fico)"/>
                        <input type="text" id="cat-valor" class="w-28 bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2 text-sm" placeholder="Valor R$"/>
                        <button type="button" id="btn-add-catalogo" class="px-3 py-2 rounded-lg bg-primary text-black text-sm font-medium">Adicionar</button>
                    </div>
                </div>
                <ul id="lista-catalogo" class="space-y-1 max-h-40 overflow-y-auto"></ul>
            </section>
            <section>
                <h2 class="text-lg font-bold dark:text-white mb-2 flex items-center gap-2">
                    <span class="material-icons-outlined text-primary">qr_code_2</span>
                    PIX (pagamento)
                </h2>
                <p class="text-slate-500 dark:text-slate-400 text-sm mb-4">Configure sua chave PIX para aparecer nos documentos. O cliente poderÃ¡ pagar via QR Code ou copiando a chave. Apenas PIX â€” sem cartÃ£o ou boleto.</p>
                <div class="space-y-4 max-w-md">
                    <div>
                        <label class="block text-sm font-medium dark:text-slate-300 mb-1">Chave PIX</label>
                        <input type="text" id="pix-chave" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" placeholder="E-mail, telefone, CPF ou chave aleatÃ³ria"/>
                    </div>
                    <div>
                        <label class="block text-sm font-medium dark:text-slate-300 mb-1">Nome do titular</label>
                        <input type="text" id="pix-nome" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" placeholder="Nome como cadastrado no PIX"/>
                    </div>
                    <div>
                        <label class="block text-sm font-medium dark:text-slate-300 mb-1">Cidade</label>
                        <input type="text" id="pix-cidade" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" placeholder="Cidade (ex: SAO PAULO)"/>
                    </div>
                </div>
            </section>
            <section>
                <h2 class="text-lg font-bold dark:text-white mb-2 flex items-center gap-2">
                    <span class="material-icons-outlined text-primary">dark_mode</span>
                    AparÃªncia
                </h2>
                <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" id="escurecer-documentos" class="rounded border-slate-300 text-primary focus:ring-primary"/>
                    <span class="text-sm text-slate-600 dark:text-slate-300">Escurecer documentos (recibos e orÃ§amentos) â€” fundo escuro no preview e PDF</span>
                </label>
            </section>
            <p class="text-slate-500 text-sm">As opÃ§Ãµes de perfil e mÃ³dulos do ConectaKing ficam no painel principal. Para alterar dados da empresa (emitente), use o painel principal.</p>
        </div>
    </div>
</main>

    <script src="/config.js?v=2026-09-09-vite1"></script>
</body>
</html>

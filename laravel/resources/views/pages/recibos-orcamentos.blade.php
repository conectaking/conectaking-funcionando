<!DOCTYPE html>
<html class="dark" lang="pt-BR">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Recibos e Orçamentos — ConectaKing</title>

        @vite(['resources/css/app.css', 'resources/js/pages/recibos-orcamentos.js'])
</head>
<body class="recibos-modulo-page bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen pb-20 lg:pb-0">
<aside class="recibos-sidebar-desktop sidebar-desktop fixed left-0 top-0 h-full w-20 bg-white dark:bg-card-dark border-r border-slate-200 dark:border-border-dark hidden lg:flex flex-col items-center py-8 z-50">
    <div class="mb-10 text-primary"><span class="material-icons-outlined text-4xl">description</span></div>
    <nav class="flex flex-col gap-6">
        <a href="/dashboard-recibos-orcamentos" class="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors" title="Painel do módulo">
            <span class="material-icons-outlined">dashboard</span>
            <span class="text-[10px] font-semibold uppercase">Painel</span>
        </a>
        <a href="/dashboard-recibos-orcamentos?abrir=recibo" class="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors" title="Recibos — escolher novo ou continuar">
            <span class="material-icons-outlined">receipt_long</span>
            <span class="text-[10px] font-semibold uppercase">Recibos</span>
        </a>
        <a href="/dashboard-recibos-orcamentos?abrir=orcamento" class="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors" title="Orçamentos — escolher novo ou continuar">
            <span class="material-icons-outlined">request_quote</span>
            <span class="text-[10px] font-semibold uppercase">Orçamentos</span>
        </a>
    </nav>
    <div class="flex flex-col gap-6 mt-6">
        <a class="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors" href="/clientes-recibos-orcamentos" title="Clientes">
            <span class="material-icons-outlined">people</span>
            <span class="text-[10px] font-semibold uppercase">Clientes</span>
        </a>
        <a class="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors" href="/configuracoes-recibos-orcamentos" title="Configurações do módulo">
            <span class="material-icons-outlined">settings</span>
            <span class="text-[10px] font-semibold uppercase">Config.</span>
        </a>
    </div>
</aside>

<nav id="recibos-bottom-nav" class="bottom-nav-safe fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white dark:bg-card-dark border-t border-slate-200 dark:border-border-dark flex justify-around items-center py-2 px-1">
    <a href="/dashboard-recibos-orcamentos" class="flex flex-col items-center gap-0.5 text-slate-400 hover:text-primary min-w-0 px-1 py-1">
        <span class="material-icons-outlined text-2xl">dashboard</span>
        <span class="text-[9px] font-bold uppercase">Painel</span>
    </a>
    <a href="/dashboard-recibos-orcamentos?abrir=recibo" class="flex flex-col items-center gap-0.5 text-primary min-w-0 px-1 py-1">
        <span class="material-icons-outlined text-2xl">receipt_long</span>
        <span class="text-[9px] font-bold uppercase">Recibos</span>
    </a>
    <a href="/dashboard-recibos-orcamentos?abrir=orcamento" class="flex flex-col items-center gap-0.5 text-slate-400 hover:text-primary min-w-0 px-1 py-1">
        <span class="material-icons-outlined text-2xl">request_quote</span>
        <span class="text-[9px] font-bold uppercase">Orçam.</span>
    </a>
    <a href="/clientes-recibos-orcamentos" class="flex flex-col items-center gap-0.5 text-slate-400 hover:text-primary min-w-0 px-1 py-1">
        <span class="material-icons-outlined text-2xl">people</span>
        <span class="text-[9px] font-bold uppercase">Clientes</span>
    </a>
    <a href="/configuracoes-recibos-orcamentos" class="flex flex-col items-center gap-0.5 text-slate-400 hover:text-primary min-w-0 px-1 py-1">
        <span class="material-icons-outlined text-2xl">settings</span>
        <span class="text-[9px] font-bold uppercase">Config</span>
    </a>
</nav>

<main class="recibos-main-content ml-0 lg:ml-20 p-4 sm:p-6 lg:p-12 max-w-full">
    <div class="max-w-5xl mx-auto w-full">
        <header class="mb-6 lg:mb-8 flex flex-col gap-4">
            <div>
                <h1 class="text-2xl sm:text-3xl font-bold dark:text-white mb-1 sm:mb-2" id="page-title">Novo Orçamento</h1>
                <p class="text-sm sm:text-base text-slate-500 dark:text-slate-400" id="page-subtitle">Crie documentos profissionais em segundos</p>
            </div>
            <div class="doc-header-actions flex gap-2 items-center">
                <a href="/dashboard-recibos-orcamentos" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-card-dark border border-slate-200 dark:border-border-dark hover:bg-slate-200 dark:hover:border-primary/50 transition-all text-inherit no-underline" title="Voltar ao painel do módulo">
                    <span class="material-icons-outlined text-sm">home</span>
                    <span class="text-sm font-medium">Voltar ao painel</span>
                </a>
                <button type="button" id="btn-visualizar" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-card-dark border border-slate-200 dark:border-border-dark hover:bg-slate-200 dark:hover:border-primary/50 transition-all">
                    <span class="material-icons-outlined text-sm">visibility</span>
                    <span class="text-sm font-medium">Visualizar</span>
                </button>
                <button type="button" id="btn-exportar-pdf" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-card-dark border border-slate-200 dark:border-border-dark hover:bg-slate-200 dark:hover:border-primary/50 transition-all" style="display: none;">
                    <span class="material-icons-outlined text-sm">file_download</span>
                    <span class="text-sm font-medium">Exportar PDF</span>
                </button>
                <button type="button" id="btn-duplicar" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-card-dark border border-slate-200 dark:border-border-dark hover:border-primary/50 transition-all hidden" title="Duplicar documento">
                    <span class="material-icons-outlined text-sm">content_copy</span>
                    <span class="text-sm font-medium">Duplicar</span>
                </button>
                <button type="button" id="btn-converter-recibo" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-card-dark border border-slate-200 dark:border-border-dark hover:border-primary/50 transition-all hidden" title="Converter orçamento em recibo">
                    <span class="material-icons-outlined text-sm">swap_horiz</span>
                    <span class="text-sm font-medium">Converter em Recibo</span>
                </button>
                <div id="link-compartilhar-wrap" class="flex items-center gap-2 hidden">
                    <button type="button" id="btn-copiar-link" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-card-dark border border-slate-200 dark:border-border-dark hover:border-primary/50 transition-all">
                        <span class="material-icons-outlined text-sm">link</span>
                        <span class="text-sm font-medium">Copiar link</span>
                    </button>
                    <a id="btn-whatsapp" href="#" target="_blank" rel="noopener" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600/20 text-green-500 border border-green-500/30 hover:bg-green-600/30 transition-all no-underline">
                        <span class="material-icons-outlined text-sm">chat</span>
                        <span class="text-sm font-medium">Enviar WhatsApp</span>
                    </a>
                </div>
            </div>
        </header>

        <form id="form-doc" class="space-y-5 sm:space-y-8" lang="pt-BR" spellcheck="true">
            <input type="hidden" name="tipo" value="orcamento"/>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section class="bg-white dark:bg-card-dark p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-border-dark shadow-sm premium-border">
                    <div class="flex items-center gap-2 mb-6 text-primary">
                        <span class="material-icons-outlined">business</span>
                        <h2 class="uppercase tracking-widest text-xs font-bold">Emitente</h2>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nome ou Razão Social</label>
                            <input name="emitente_nome" lang="pt-BR" spellcheck="true" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" placeholder="Ex: Sua Empresa LTDA" type="text"/>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">CPF/CNPJ</label>
                                <input name="emitente_cpf" lang="pt-BR" spellcheck="true" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" placeholder="00.000.000/0000-00" type="text"/>
                            </div>
                            <div>
                                <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">Contato</label>
                                <input name="emitente_contato" lang="pt-BR" spellcheck="true" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" placeholder="(00) 00000-0000" type="text"/>
                            </div>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">Endereço</label>
                            <input name="emitente_endereco" lang="pt-BR" spellcheck="true" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" placeholder="Rua, número, bairro, cidade" type="text"/>
                        </div>
                        <p class="text-xs text-slate-500 dark:text-slate-400 m-0">A logomarca do PDF é definida só em <a href="/configuracoes-recibos-orcamentos" class="text-primary hover:underline">Configurações</a> — não é exibida nesta tela.</p>
                        <input type="hidden" name="emitente_logo_url" id="input-logo-url" value=""/>
                    </div>
                </section>
                <section class="bg-white dark:bg-card-dark p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-border-dark shadow-sm">
                    <div class="flex items-center gap-2 mb-6 text-primary">
                        <span class="material-icons-outlined">person</span>
                        <h2 class="uppercase tracking-widest text-xs font-bold">Cliente</h2>
                    </div>
                    <div class="space-y-4">
                        <div class="relative">
                            <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nome do Cliente</label>
                            <input name="cliente_nome" id="cliente_nome" autocomplete="off" lang="pt-BR" spellcheck="true" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" placeholder="Digite para buscar ou cadastrar" type="text"/>
                            <div id="cliente-autocomplete" class="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-lg shadow-lg z-50 hidden"></div>
                        </div>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="cadastrar_cliente" id="cadastrar_cliente" value="1"/>
                            <span class="text-sm text-slate-600 dark:text-slate-400">Cadastrar este cliente na lista de clientes</span>
                        </label>
                        <div>
                            <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">CPF/CNPJ do Cliente</label>
                            <input name="cliente_cpf" lang="pt-BR" spellcheck="true" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" placeholder="000.000.000-00" type="text"/>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">Endereço</label>
                            <input name="cliente_endereco" lang="pt-BR" spellcheck="true" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" placeholder="Rua, Número, Bairro, Cidade" type="text"/>
                        </div>
                        <div>
                            <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">Contato</label>
                            <input name="cliente_contato" lang="pt-BR" spellcheck="true" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" placeholder="Telefone ou e-mail" type="text"/>
                        </div>
                    </div>
                </section>
            </div>

            <section class="bg-white dark:bg-card-dark p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-border-dark shadow-sm">
                <div class="flex items-center gap-2 mb-6 text-primary">
                    <span class="material-icons-outlined">title</span>
                    <h2 class="uppercase tracking-widest text-xs font-bold">Título e Validade</h2>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">Título do documento</label>
                        <input name="titulo" lang="pt-BR" spellcheck="true" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" placeholder="Ex: Orçamento Evento 2026" type="text"/>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">Data do documento</label>
                            <input name="data_documento" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" type="date"/>
                        </div>
                        <div>
                            <label id="label-validade" class="block text-[10px] uppercase font-bold text-slate-500 mb-1">Validade (até)</label>
                            <input name="validade_ate" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-2.5 text-sm" placeholder="Orçamentos: defina até quando vale" type="date"/>
                        </div>
                    </div>
                </div>
            </section>

            <section class="bg-white dark:bg-card-dark p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-border-dark shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div class="flex items-center gap-2 text-primary flex-wrap">
                        <span class="material-icons-outlined">list_alt</span>
                        <h2 id="itens-section-title" class="uppercase tracking-widest text-xs font-bold">Itens</h2>
                        <span id="itens-count-badge" class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/25 tabular-nums" title="Quantidade de linhas na tabela">0 itens</span>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap" id="itens-ordenacao" title="Ordena a tabela e as notas fiscais abaixo">
                        <span class="text-[10px] uppercase font-bold text-slate-500">Ordenar</span>
                        <button type="button" id="btn-ordenar-data-desc" class="btn-ordenar-item is-active" title="Data decrescente — mais recente em cima">Data —</button>
                        <button type="button" id="btn-ordenar-data-asc" class="btn-ordenar-item" title="Data crescente — mais antiga em cima">Data —</button>
                        <button type="button" id="btn-ordenar-nome" class="btn-ordenar-item" title="Ordem alfabética pelo nome">Nome</button>
                    </div>
                </div>
                <div class="itens-table-wrap overflow-x-auto lg:overflow-visible">
                    <table class="w-full border-separate border-spacing-y-2 min-w-0 lg:min-w-full">
                        <thead>
                            <tr class="text-[10px] uppercase font-bold text-slate-500 text-left">
                                <th class="px-4 py-2">Descrição</th>
                                <th class="px-4 py-2 w-24">Data</th>
                                <th class="px-4 py-2 w-32 text-right">Valor (R$)</th>
                                <th class="px-4 py-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody id="itens-tbody">
                            <tr class="item-row bg-slate-50 dark:bg-black/40 group">
                                <td class="item-td-desc px-4 py-3 lg:rounded-l-lg border-y border-l border-slate-200 dark:border-border-dark" data-label="">
                                    <input name="item_descricao[]" lang="pt-BR" spellcheck="true" class="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium" placeholder="Serviço ou Produto" type="text"/>
                                    <input name="item_pacote[]" lang="pt-BR" spellcheck="true" class="w-full mt-1 bg-transparent border-none focus:ring-0 p-0 text-xs text-slate-400" placeholder="O que vai no pacote (opcional)" type="text"/>
                                </td>
                                <td class="item-td-data px-4 py-3 border-y border-slate-200 dark:border-border-dark" data-label="Data">
                                    <input name="item_data[]" class="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-right lg:text-left" placeholder="DD/MM" type="text"/>
                                </td>
                                <td class="item-td-valor px-4 py-3 border-y border-slate-200 dark:border-border-dark text-right font-medium" data-label="Valor (R$)">
                                    <input name="item_valor[]" class="item-valor w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-right lg:text-left text-primary font-semibold" placeholder="0,00" type="text"/>
                                    <input type="hidden" name="item_qtd[]" value="1"/>
                                    <input type="hidden" name="item_unit[]" class="item-unit" value=""/>
                                </td>
                                <td class="item-td-remove px-4 py-3 lg:rounded-r-lg border-y border-r border-slate-200 dark:border-border-dark text-center" data-label="">
                                    <button type="button" class="btn-remove-item text-slate-400 hover:text-red-500 transition-colors"><span class="material-icons-outlined text-sm">close</span></button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="mt-4 flex flex-wrap gap-2 items-center relative">
                    <button type="button" id="btn-add-item" class="flex-1 min-w-[200px] py-4 border-2 border-dashed border-slate-200 dark:border-border-dark rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:text-primary hover:border-primary transition-all">
                        <span class="material-icons-outlined text-lg">add_circle_outline</span>
                        <span id="btn-add-item-label" class="text-sm font-semibold uppercase tracking-wider">Adicionar Nova Linha</span>
                    </button>
                    <div class="relative">
                        <button type="button" id="btn-inserir-catalogo" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-border-dark text-slate-600 dark:text-slate-400 hover:border-primary hover:text-primary text-sm font-medium transition-all">Inserir do catálogo</button>
                        <div id="catalogo-dropdown" class="absolute right-0 top-full mt-1 py-2 bg-white dark:bg-card-dark border border-slate-200 dark:border-border-dark rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto hidden min-w-[200px]"></div>
                    </div>
                </div>
                <div id="recibo-tirar-configurar" class="mt-6 pt-6 border-t border-slate-200 dark:border-border-dark" style="display: none;">
                    <p class="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Extrato do cartão — ler valores</p>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">Foto do print do cartão com várias compras. O sistema preenche a tabela acima; <strong>não entra no PDF</strong> como nota fiscal.</p>
                    <div id="comprovante-sem-id" class="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs" style="display: none;">
                        Se o recibo ainda não foi salvo, ele será criado ao enviar a primeira foto/arquivo.
                    </div>
                    <div class="mb-4 flex flex-wrap gap-2 items-end">
                        <label class="flex-1 min-w-[200px]">
                            <span class="text-xs font-medium text-slate-500 dark:text-slate-400 block mb-1">Etiqueta opcional nos itens (ex.: almoço, janta, viagem)</span>
                            <div class="flex gap-2">
                                <input type="text" id="ocr-etiqueta-itens" lang="pt-BR" spellcheck="true" class="flex-1 bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-3 py-2 text-sm" placeholder="Deixe vazio para usar só o nome do estabelecimento"/>
                                <button type="button" id="btn-ocr-etiqueta-voz" class="shrink-0 px-3 py-2 rounded-lg border border-slate-200 dark:border-border-dark text-slate-600 dark:text-slate-300 hover:border-primary" title="Falar etiqueta">
                                    <span class="material-icons-outlined text-lg">mic</span>
                                </button>
                            </div>
                        </label>
                    </div>
                    <label class="flex items-start gap-2 mb-3 cursor-pointer select-none">
                        <input type="checkbox" id="ocr-usar-ia" checked class="mt-1 rounded border-slate-300 text-primary focus:ring-primary"/>
                        <span class="text-sm text-slate-600 dark:text-slate-300">
                            <strong>Usar IA OpenAI</strong> para ler extrato
                            <span class="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">Recomendado — lê prints escuros e listas longas com mais precisão.</span>
                        </span>
                    </label>
                    <p id="ocr-ia-status" class="text-xs text-slate-500 dark:text-slate-400 mb-3">Verificando IA no servidor—</p>
                    <div id="comprovante-upload-area" class="comprovante-btns-mobile flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
                        <input type="file" id="file-comprovante-camera" accept="image/*" capture="environment" class="hidden"/>
                        <input type="file" id="file-comprovante-arquivo" accept="image/*" multiple class="hidden"/>
                        <button type="button" id="btn-tirar-foto" class="btn-mobile-full flex items-center gap-2 px-4 py-3 rounded-xl bg-primary text-black font-semibold hover:opacity-90 transition-opacity">
                            <span class="material-icons-outlined">camera_alt</span>
                            Tirar foto
                        </button>
                        <button type="button" id="btn-enviar-arquivo" class="btn-mobile-full flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/10 dark:bg-primary/20 border border-primary/30 text-primary font-semibold hover:bg-primary/20 transition-colors">
                            <span class="material-icons-outlined">upload_file</span>
                            Enviar foto(s) — pode escolher várias
                        </button>
                        <button type="button" id="btn-configurar" class="btn-mobile-full flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-card-dark border border-slate-200 dark:border-border-dark text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:border-primary/50 transition-colors">
                            <span class="material-icons-outlined">tune</span>
                            Configurar
                        </button>
                    </div>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-3">Os valores extraídos aparecem na tabela acima; use Configurar para ajustar.</p>
                </div>
                <div id="recibo-notas-fiscais" class="mt-6 pt-6 border-t border-slate-200 dark:border-border-dark" style="display: none;">
                    <div class="flex items-center gap-2 mb-2 text-primary">
                        <span class="material-icons-outlined">receipt_long</span>
                        <h3 class="uppercase tracking-widest text-xs font-bold">Notas fiscais (uma foto por item)</h3>
                    </div>
                    <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">Na mesma ordem da tabela: tire ou envie a foto da nota de cada lugar (ex.: BBQ Brunão, Ponto das variedades). <strong>Não altera valores</strong> — só aparece no PDF para o cliente.</p>
                    <div id="notas-fiscais-list" class="space-y-3"></div>
                </div>
            </section>

            <section class="bg-white dark:bg-card-dark p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-border-dark shadow-sm">
                <div class="flex items-center gap-2 mb-4 text-primary">
                    <span class="material-icons-outlined">payment</span>
                    <h2 class="uppercase tracking-widest text-xs font-bold">Condições de pagamento</h2>
                </div>
                <textarea name="condicoes_pagamento" lang="pt-BR" spellcheck="true" class="w-full bg-slate-50 dark:bg-black border border-slate-200 dark:border-border-dark rounded-lg px-4 py-3 text-sm resize-none" placeholder="Ex.: 20% para marcação; 30% um dia antes do evento; 50% no encerramento." rows="3"></textarea>
            </section>

            <section class="bg-white dark:bg-card-dark p-4 sm:p-6 rounded-2xl border-2 border-primary/20 shadow-sm premium-border">
                <div class="flex items-center gap-2 mb-4 text-primary">
                    <span class="material-icons-outlined text-xl">notes</span>
                    <h2 class="uppercase tracking-widest text-xs font-bold">Observações</h2>
                </div>
                <textarea name="observacoes" lang="pt-BR" spellcheck="true" class="w-full bg-slate-50 dark:bg-black border-2 border-slate-200 dark:border-border-dark rounded-lg px-4 py-3 text-base min-h-[120px] focus:border-primary/50 transition-colors resize-y" placeholder="Notas adicionais, instruções ao cliente, informações importantes..." rows="5"></textarea>
            </section>

            <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-4 sm:gap-6 py-6 sm:py-10 border-t border-slate-200 dark:border-border-dark sticky bottom-16 lg:static z-30 bg-background-light dark:bg-background-dark lg:bg-transparent pb-2 lg:pb-0">
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
                    <div class="flex flex-row lg:flex-col justify-between lg:items-end lg:mr-4 items-center px-1 lg:px-0">
                        <span id="total-label" class="text-[10px] uppercase font-bold text-slate-500">Valor Total Estimado</span>
                        <span id="total-display" class="text-xl sm:text-2xl font-bold text-primary">R$ 0,00</span>
                    </div>
                    <button type="submit" id="btn-submit" class="w-full sm:w-auto flex items-center justify-center gap-3 bg-primary text-black px-8 sm:px-10 py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                        <span class="material-icons-outlined">save</span>
                        <span id="btn-submit-text">Salvar Orçamento</span>
                    </button>
                </div>
            </div>
        </form>
    </div>
</main>

<div class="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
<div class="fixed bottom-0 left-0 -z-10 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

    <script src="/config.js?v=2026-09-09-vite1"></script>
</body>
</html>

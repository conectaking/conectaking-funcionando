<!DOCTYPE html>
<html class="dark" lang="pt-BR">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
    <title>King Agenda — Gestão de Agendamentos Conecta King</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet">

    @vite(['resources/css/app.css', 'resources/js/pages/dashboard-agenda.js'])
</head>
<body class="bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] min-h-screen pb-24 lg:pb-10 selection:bg-amber-500 selection:text-slate-950">

    <!-- Top Navigation -->
    <nav class="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 sm:px-8">
        <div class="max-w-6xl mx-auto flex items-center justify-between">
            <div class="flex items-center gap-3">
                <a href="/dashboard" class="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition" title="Voltar ao Painel Geral">
                    <i class="fas fa-arrow-left text-sm"></i>
                </a>
                <div class="flex items-center gap-2">
                    <span class="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
                        <i class="fas fa-calendar-check"></i>
                    </span>
                    <div>
                        <h1 class="text-base sm:text-lg font-extrabold text-white leading-tight">King Agenda</h1>
                        <p class="text-[10px] text-slate-400">Agendamento Online</p>
                    </div>
                </div>
            </div>

            <!-- Link Público do Cliente -->
            <div class="flex items-center gap-2">
                <button type="button" id="btnCopyPublicLink" class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-xl border border-slate-700 transition" title="Copiar link para enviar a clientes">
                    <i class="fas fa-link text-[10px]"></i>
                    <span id="copyLinkText">Copiar Link de Agendamento</span>
                </button>
                <a id="btnOpenPublicLink" href="#" target="_blank" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition flex items-center gap-1">
                    <span>Ver Página</span>
                    <i class="fas fa-arrow-up-right-from-square text-[10px]"></i>
                </a>
            </div>
        </div>
    </nav>

    <!-- Conteúdo do Painel -->
    <main class="max-w-6xl mx-auto px-4 sm:px-8 py-6">

        <!-- Abas de Navegação do Módulo -->
        <div class="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-slate-800 custom-scrollbar">
            <button type="button" class="tab-btn active px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition" data-tab="tabAppointments">
                <i class="fas fa-list-check"></i>
                <span>Agendamentos</span>
                <span class="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full text-[10px]" id="badgeCountAppointments">0</span>
            </button>
            <button type="button" class="tab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 text-slate-400 hover:text-white transition" data-tab="tabServices">
                <i class="fas fa-scissors"></i>
                <span>Meus Serviços</span>
            </button>
            <button type="button" class="tab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 text-slate-400 hover:text-white transition" data-tab="tabProfessionals">
                <i class="fas fa-user-group"></i>
                <span>Profissionais</span>
            </button>
            <button type="button" class="tab-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 text-slate-400 hover:text-white transition" data-tab="tabSettings">
                <i class="fas fa-sliders"></i>
                <span>Horários & Configurações</span>
            </button>
        </div>

        <!-- ABA 1: Agendamentos -->
        <section id="tabAppointments" class="tab-pane space-y-5">
            <!-- Filtros Rápidos -->
            <div class="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <div class="flex items-center gap-2">
                    <button type="button" class="filter-btn active px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs" data-filter="today">Hoje</button>
                    <button type="button" class="filter-btn px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white font-medium rounded-xl text-xs" data-filter="tomorrow">Amanhã</button>
                    <button type="button" class="filter-btn px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white font-medium rounded-xl text-xs" data-filter="all">Todos</button>
                </div>
                <div class="flex items-center gap-2">
                    <input type="date" id="filterSpecificDate" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500">
                </div>
            </div>

            <!-- Lista de Agendamentos -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="appointmentsGrid">
                <!-- Preenchido via JS -->
            </div>
        </section>

        <!-- ABA 2: Meus Serviços -->
        <section id="tabServices" class="tab-pane hidden space-y-5">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-base font-bold text-white">Serviços Cadastrados</h2>
                    <p class="text-xs text-slate-400">Defina os cortes, procedimentos e valores disponíveis para agendamento.</p>
                </div>
                <button type="button" id="btnNewService" class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5">
                    <i class="fas fa-plus"></i>
                    <span>Novo Serviço</span>
                </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="servicesGrid">
                <!-- Preenchido via JS -->
            </div>
        </section>

        <!-- ABA 3: Profissionais -->
        <section id="tabProfessionals" class="tab-pane hidden space-y-5">
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-base font-bold text-white">Equipe & Profissionais</h2>
                    <p class="text-xs text-slate-400">Cadastre os atendentes/barbeiros do seu estabelecimento.</p>
                </div>
                <button type="button" id="btnNewProf" class="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5">
                    <i class="fas fa-plus"></i>
                    <span>Novo Profissional</span>
                </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="professionalsGrid">
                <!-- Preenchido via JS -->
            </div>
        </section>

        <!-- ABA 4: Horários & Configurações -->
        <section id="tabSettings" class="tab-pane hidden space-y-6">
            <form id="formSettings" class="space-y-6">
                <!-- Dados Básicos -->
                <div class="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <h3 class="text-sm font-bold text-white flex items-center gap-2">
                        <i class="fas fa-store text-amber-400"></i> Informações do Estabelecimento
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 mb-1">Nome do Estabelecimento / Profissional</label>
                            <input type="text" name="business_name" id="cfgBusinessName" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 mb-1">WhatsApp para Notificações</label>
                            <input type="text" name="business_phone" id="cfgBusinessPhone" placeholder="Ex: 5511999998888" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Endereço Completo (opcional)</label>
                        <input type="text" name="business_address" id="cfgBusinessAddress" placeholder="Ex: Rua das Flores, 123 - Centro" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-amber-500">
                    </div>
                </div>

                <!-- Regras de Agendamento -->
                <div class="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <h3 class="text-sm font-bold text-white flex items-center gap-2">
                        <i class="fas fa-clock text-amber-400"></i> Regras de Horário
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div>
                            <label class="block font-semibold text-slate-300 mb-1">Intervalo dos Slots</label>
                            <select name="slot_interval_minutes" id="cfgSlotInterval" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500">
                                <option value="15">A cada 15 minutos</option>
                                <option value="30" selected>A cada 30 minutos</option>
                                <option value="45">A cada 45 minutos</option>
                                <option value="60">A cada 1 hora</option>
                            </select>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-300 mb-1">Antecedência Mínima</label>
                            <select name="min_notice_hours" id="cfgMinNotice" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500">
                                <option value="0">Sem antecedência (imediato)</option>
                                <option value="1" selected>1 hora antes</option>
                                <option value="2">2 horas antes</option>
                                <option value="4">4 horas antes</option>
                                <option value="24">24 horas antes</option>
                            </select>
                        </div>
                        <div>
                            <label class="block font-semibold text-slate-300 mb-1">Agenda Aberta Até</label>
                            <select name="max_days_advance" id="cfgMaxDays" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500">
                                <option value="7">Próximos 7 dias</option>
                                <option value="15">Próximos 15 dias</option>
                                <option value="30" selected>Próximos 30 dias</option>
                                <option value="60">Próximos 60 dias</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Dias da Semana e Horários de Trabalho -->
                <div class="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <h3 class="text-sm font-bold text-white flex items-center gap-2">
                        <i class="fas fa-calendar-days text-amber-400"></i> Dias e Horários de Atendimento
                    </h3>
                    <div class="space-y-3" id="workingHoursContainer">
                        <!-- Gerado via JS para os 7 dias da semana -->
                    </div>
                </div>

                <div class="flex justify-end">
                    <button type="submit" id="btnSaveSettings" class="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 text-sm flex items-center gap-2">
                        <i class="fas fa-check"></i>
                        <span>Salvar Configurações</span>
                    </button>
                </div>
            </form>
        </section>

    </main>

    <!-- MODAL DE SERVIÇO (CRIAR / EDITAR) -->
    <div id="modalService" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4">
            <div class="flex items-center justify-between">
                <h3 class="text-base font-bold text-white" id="modalServiceTitle">Novo Serviço</h3>
                <button type="button" class="btnCloseModal text-slate-400 hover:text-white p-1.5"><i class="fas fa-times"></i></button>
            </div>
            <form id="formServiceModal" class="space-y-3 text-xs">
                <input type="hidden" name="service_id" id="serviceModalId">
                <div>
                    <label class="block font-semibold text-slate-300 mb-1">Nome do Serviço *</label>
                    <input type="text" name="name" id="serviceModalName" required placeholder="Ex: Corte Degradê" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-semibold text-slate-300 mb-1">Duração (minutos) *</label>
                        <input type="number" name="duration_minutes" id="serviceModalDuration" required min="5" max="480" value="30" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500">
                    </div>
                    <div>
                        <label class="block font-semibold text-slate-300 mb-1">Preço (R$) *</label>
                        <input type="number" step="0.01" name="price" id="serviceModalPrice" required min="0" value="0.00" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500">
                    </div>
                </div>
                <div>
                    <label class="block font-semibold text-slate-300 mb-1">Descrição (opcional)</label>
                    <textarea name="description" id="serviceModalDesc" rows="2" placeholder="Ex: Inclui lavagem e finalização..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"></textarea>
                </div>
                <div class="flex items-center gap-2 pt-2">
                    <input type="checkbox" name="is_active" id="serviceModalActive" checked class="rounded border-slate-800 text-amber-500 focus:ring-amber-500">
                    <label for="serviceModalActive" class="text-slate-300">Serviço ativo para agendamento</label>
                </div>
                <div class="flex justify-end gap-2 pt-3">
                    <button type="button" class="btnCloseModal px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold">Cancelar</button>
                    <button type="submit" class="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl">Salvar</button>
                </div>
            </form>
        </div>
    </div>

    <!-- MODAL DE PROFISSIONAL (CRIAR / EDITAR) -->
    <div id="modalProf" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4">
            <div class="flex items-center justify-between">
                <h3 class="text-base font-bold text-white" id="modalProfTitle">Novo Profissional</h3>
                <button type="button" class="btnCloseModal text-slate-400 hover:text-white p-1.5"><i class="fas fa-times"></i></button>
            </div>
            <form id="formProfModal" class="space-y-3 text-xs">
                <input type="hidden" name="prof_id" id="profModalId">
                <div>
                    <label class="block font-semibold text-slate-300 mb-1">Nome do Profissional *</label>
                    <input type="text" name="name" id="profModalName" required placeholder="Ex: Carlos Barbeiro" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500">
                </div>
                <div>
                    <label class="block font-semibold text-slate-300 mb-1">WhatsApp / Telefone (opcional)</label>
                    <input type="text" name="phone" id="profModalPhone" placeholder="Ex: 5511999998888" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500">
                </div>
                <div>
                    <label class="block font-semibold text-slate-300 mb-1">URL da Foto / Avatar (opcional)</label>
                    <input type="url" name="avatar_url" id="profModalAvatar" placeholder="https://..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500">
                </div>
                <div class="flex justify-end gap-2 pt-3">
                    <button type="button" class="btnCloseModal px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold">Cancelar</button>
                    <button type="submit" class="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl">Salvar</button>
                </div>
            </form>
        </div>
    </div>

</body>
</html>

<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Agendar Horário — {{ $settings->business_name ?: ($user->display_name ?: $user->name) }}</title>
    
    <!-- Meta tags -->
    <meta name="description" content="Agende seu horário online em segundos com {{ $settings->business_name ?: ($user->display_name ?: $user->name) }}.">
    <meta property="og:title" content="Agendar Horário — {{ $settings->business_name ?: ($user->display_name ?: $user->name) }}">
    <meta property="og:description" content="Escolha o serviço, a data e o melhor horário para seu atendimento.">
    <meta property="og:image" content="{{ $user->profile_image_url ?: 'https://i.ibb.co/60sW9k75/logo.png' }}">
    <meta name="theme-color" content="#0D0D0F">

    <!-- Fonts & Icons -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    @vite(['resources/css/app.css', 'resources/css/pub/pages/cartao-booking-public.css', 'resources/js/pages/cartao-booking-public.js'])
</head>
<body class="bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] min-h-screen flex flex-col antialiased selection:bg-amber-500 selection:text-slate-950">

    <!-- Background Glow Effects -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-b from-amber-500/15 via-purple-600/10 to-transparent blur-3xl rounded-full"></div>
        <div class="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-purple-900/10 blur-3xl rounded-full"></div>
    </div>

    <!-- Container Principal -->
    <main class="relative z-10 w-full max-w-xl mx-auto flex-1 flex flex-col px-4 py-6 sm:py-10">

        <!-- Header do Estabelecimento -->
        <header class="text-center mb-8">
            <div class="relative inline-block mb-3">
                <img src="{{ $user->profile_image_url ?: 'https://i.ibb.co/60sW9k75/logo.png' }}" 
                     alt="{{ $settings->business_name ?: $user->name }}" 
                     class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-2 ring-amber-500/40 shadow-xl shadow-amber-500/10 mx-auto">
                <span class="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full ring-2 ring-slate-950 text-[10px]" title="Atendimento Online">
                    <i class="fas fa-check"></i>
                </span>
            </div>
            
            <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
                {{ $settings->business_name ?: ($user->display_name ?: $user->name) }}
            </h1>
            
            @if(!empty($settings->business_address))
                <p class="text-xs sm:text-sm text-slate-400 flex items-center justify-center gap-1.5 mb-2">
                    <i class="fas fa-location-dot text-amber-400"></i>
                    <span>{{ $settings->business_address }}</span>
                </p>
            @endif

            <p class="text-xs text-slate-400 max-w-md mx-auto">
                Agende seu horário online em instantes sem complicações.
            </p>
        </header>

        <!-- Card de Agendamento -->
        <div class="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-black/50" id="bookingApp" data-slug="{{ $slug }}">

            <!-- Stepper Indicador -->
            <div class="flex items-center justify-between mb-6 px-2 text-xs font-semibold text-slate-400">
                <div class="flex items-center gap-2 step-item active" data-step-indicator="1">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center bg-amber-500 text-slate-950 font-bold">1</span>
                    <span>Serviço</span>
                </div>
                <div class="h-0.5 flex-1 bg-slate-800 mx-2"></div>
                <div class="flex items-center gap-2 step-item" data-step-indicator="2">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center bg-slate-800 text-slate-300 font-bold">2</span>
                    <span>Data & Hora</span>
                </div>
                <div class="h-0.5 flex-1 bg-slate-800 mx-2"></div>
                <div class="flex items-center gap-2 step-item" data-step-indicator="3">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center bg-slate-800 text-slate-300 font-bold">3</span>
                    <span>Confirmar</span>
                </div>
            </div>

            <!-- PASSO 1: Escolha do Serviço -->
            <section id="step1" class="step-content space-y-4">
                <div class="flex items-center justify-between mb-1">
                    <h2 class="text-base font-bold text-white flex items-center gap-2">
                        <i class="fas fa-scissors text-amber-400"></i> Selecione o Serviço
                    </h2>
                    <span class="text-xs text-slate-400">{{ count($services) }} disponíveis</span>
                </div>

                <div class="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar" id="servicesList">
                    @forelse($services as $s)
                        <label class="service-card group relative block p-4 rounded-2xl border border-slate-800 bg-slate-950/50 hover:bg-slate-800/50 hover:border-amber-500/50 transition-all duration-200 cursor-pointer">
                            <input type="radio" name="selected_service" value="{{ $s->id }}" 
                                   data-name="{{ $s->name }}" 
                                   data-duration="{{ $s->duration_minutes }}" 
                                   data-price="{{ $s->price }}" 
                                   class="sr-only">
                            <div class="flex items-start justify-between gap-3">
                                <div class="flex-1">
                                    <h3 class="font-bold text-white text-sm sm:text-base group-hover:text-amber-400 transition-colors">
                                        {{ $s->name }}
                                    </h3>
                                    @if(!empty($s->description))
                                        <p class="text-xs text-slate-400 mt-1 line-clamp-2">{{ $s->description }}</p>
                                    @endif
                                    <div class="flex items-center gap-3 mt-2.5 text-xs text-slate-400">
                                        <span class="inline-flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg">
                                            <i class="far fa-clock text-amber-400"></i> {{ $s->duration_minutes }} min
                                        </span>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <span class="text-base sm:text-lg font-extrabold text-amber-400">
                                        R$ {{ number_format($s->price, 2, ',', '.') }}
                                    </span>
                                </div>
                            </div>
                            <div class="check-badge absolute top-4 right-4 hidden text-amber-400">
                                <i class="fas fa-circle-check text-xl"></i>
                            </div>
                        </label>
                    @empty
                        <div class="text-center py-10 text-slate-500">
                            <i class="fas fa-calendar-xmark text-3xl mb-2"></i>
                            <p class="text-sm">Nenhum serviço disponível no momento.</p>
                        </div>
                    @endforelse
                </div>

                @if(count($professionals) > 0)
                    <!-- Escolha do Profissional (se houver) -->
                    <div class="pt-3 border-t border-slate-800/80">
                        <label class="block text-xs font-semibold text-slate-300 mb-2">
                            Profissional (opcional):
                        </label>
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2" id="professionalsList">
                            <label class="prof-card p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 text-center cursor-pointer hover:border-slate-700 transition">
                                <input type="radio" name="selected_prof" value="" checked class="sr-only">
                                <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-1 text-slate-400 text-xs">
                                    <i class="fas fa-user-check"></i>
                                </div>
                                <span class="text-xs font-medium text-slate-200 block truncate">Qualquer um</span>
                            </label>
                            @foreach($professionals as $p)
                                <label class="prof-card p-2.5 rounded-xl border border-slate-800 bg-slate-950/40 text-center cursor-pointer hover:border-slate-700 transition">
                                    <input type="radio" name="selected_prof" value="{{ $p->id }}" data-name="{{ $p->name }}" class="sr-only">
                                    <img src="{{ $p->avatar_url ?: 'https://i.ibb.co/60sW9k75/logo.png' }}" 
                                         alt="{{ $p->name }}" 
                                         class="w-8 h-8 rounded-full object-cover mx-auto mb-1 ring-1 ring-slate-700">
                                    <span class="text-xs font-medium text-slate-200 block truncate">{{ $p->name }}</span>
                                </label>
                            @endforeach
                        </div>
                    </div>
                @endif

                <button type="button" id="btnGoToStep2" disabled 
                        class="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
                    <span>Continuar</span>
                    <i class="fas fa-arrow-right text-xs"></i>
                </button>
            </section>

            <!-- PASSO 2: Data e Horário -->
            <section id="step2" class="step-content space-y-4 hidden">
                <div class="flex items-center justify-between">
                    <button type="button" class="btnBackStep text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition">
                        <i class="fas fa-chevron-left text-[10px]"></i> Voltar
                    </button>
                    <div class="text-right">
                        <span id="summarySelectedService" class="text-xs font-bold text-amber-400"></span>
                    </div>
                </div>

                <!-- Seletor de Data (Carrossel Horizontal de Dias) -->
                <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-2">
                        <i class="far fa-calendar-alt text-amber-400 mr-1"></i> Escolha o Dia:
                    </label>
                    <div class="flex gap-2 overflow-x-auto pb-2 custom-scrollbar" id="datePickerDays">
                        <!-- Gerado dinamicamente via JS -->
                    </div>
                </div>

                <!-- Grade de Horários Disponíveis -->
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <label class="block text-xs font-semibold text-slate-300">
                            <i class="far fa-clock text-amber-400 mr-1"></i> Horários Disponíveis:
                        </label>
                        <span id="slotsLoading" class="hidden text-xs text-amber-400 flex items-center gap-1">
                            <i class="fas fa-circle-notch fa-spin text-[10px]"></i> Buscando...
                        </span>
                    </div>

                    <div class="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar" id="slotsContainer">
                        <!-- Carregado via API -->
                    </div>
                </div>

                <button type="button" id="btnGoToStep3" disabled 
                        class="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
                    <span>Avançar para Confirmação</span>
                    <i class="fas fa-arrow-right text-xs"></i>
                </button>
            </section>

            <!-- PASSO 3: Dados do Cliente e Confirmação -->
            <section id="step3" class="step-content space-y-4 hidden">
                <div class="flex items-center justify-between">
                    <button type="button" class="btnBackStep text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition">
                        <i class="fas fa-chevron-left text-[10px]"></i> Voltar
                    </button>
                    <span class="text-xs font-semibold text-slate-400">Finalizar</span>
                </div>

                <!-- Resumo da Reserva -->
                <div class="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs">
                    <div class="flex justify-between pb-2 border-b border-slate-800">
                        <span class="text-slate-400">Serviço:</span>
                        <span class="font-bold text-white" id="confirmServiceName">-</span>
                    </div>
                    <div class="flex justify-between pb-2 border-b border-slate-800">
                        <span class="text-slate-400">Data & Horário:</span>
                        <span class="font-bold text-amber-400" id="confirmDateTime">-</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Valor Total:</span>
                        <span class="font-extrabold text-white text-sm" id="confirmPrice">R$ 0,00</span>
                    </div>
                </div>

                <!-- Formulário -->
                <form id="formFinalBooking" class="space-y-3">
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Seu Nome Completo *</label>
                        <input type="text" name="client_name" required placeholder="Ex: João da Silva"
                               class="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition">
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Seu WhatsApp *</label>
                        <input type="tel" name="client_phone" id="clientPhoneInput" required placeholder="(11) 99999-9999"
                               class="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition">
                    </div>

                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Observações (opcional)</label>
                        <textarea name="notes" rows="2" placeholder="Ex: Preferência por corte com navalha..."
                                  class="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition"></textarea>
                    </div>

                    <div id="bookingErrorMsg" class="hidden p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs text-center"></div>

                    <button type="submit" id="btnSubmitBooking"
                            class="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
                        <span id="btnSubmitText">Confirmar Agendamento</span>
                        <i class="fas fa-check text-xs" id="btnSubmitIcon"></i>
                    </button>
                </form>
            </section>

            <!-- TELA DE SUCESSO -->
            <section id="stepSuccess" class="step-content space-y-5 text-center hidden py-4">
                <div class="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-2xl ring-4 ring-emerald-500/10 animate-bounce">
                    <i class="fas fa-check"></i>
                </div>

                <div>
                    <h2 class="text-xl font-extrabold text-white mb-1">Agendamento Confirmado!</h2>
                    <p class="text-xs text-slate-400 max-w-sm mx-auto">
                        Seu horário foi reservado com sucesso.
                    </p>
                </div>

                <div class="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
                    <div class="flex justify-between">
                        <span class="text-slate-400">Serviço:</span>
                        <span class="font-bold text-white" id="successService">-</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Data & Hora:</span>
                        <span class="font-bold text-amber-400" id="successDateTime">-</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Cliente:</span>
                        <span class="font-bold text-white" id="successClient">-</span>
                    </div>
                </div>

                <div class="space-y-2 pt-2">
                    <a id="btnSuccessWhatsApp" href="#" target="_blank"
                       class="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm">
                        <i class="fab fa-whatsapp text-lg"></i>
                        <span>Abrir no WhatsApp</span>
                    </a>

                    <a href="/{{ $slug }}"
                       class="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition flex items-center justify-center gap-2 text-xs">
                        <i class="fas fa-arrow-left text-[10px]"></i>
                        <span>Voltar ao Perfil</span>
                    </a>
                </div>
            </section>

        </div>

        <!-- Footer Conecta King -->
        <footer class="text-center mt-8 text-slate-500 text-xs flex items-center justify-center gap-1.5">
            <span>Desenvolvido com</span>
            <span class="text-amber-400 font-semibold">Conecta King</span>
        </footer>

    </main>

</body>
</html>

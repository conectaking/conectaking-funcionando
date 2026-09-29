<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <title>@yield('title', 'Bíblia Conecta King')</title>
    <meta name="description" content="@yield('meta_description', 'Leitura da Bíblia Sagrada, Devocionais Diários e Planos no Conecta King')">
    <meta name="theme-color" content="#09090B">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <link rel="icon" href="/favicon.ico">

    @vite(['resources/css/fonts.css', 'resources/css/fontawesome.css', 'resources/css/pub/pages/bible-app.css', 'resources/js/pages/bible-app.js'])
    @stack('styles')
</head>
<body class="{{ $bodyClass ?? '' }}">

    {{-- Top App Bar --}}
    <header class="bible-top-bar">
        <div class="bible-top-bar-left">
            @php
                $isHub = request()->is('*/biblia') || request()->is('biblia') || request()->is('bibliaking');
                $backLink = $isHub ? ($profileUrl ?? '/') : ($hubUrl ?? ('/'.$slug.'/biblia'));
                $backTitle = $isHub ? 'Voltar ao cartão' : 'Voltar aos livros';
            @endphp
            <a href="{{ $backLink }}" class="bible-back-btn" title="{{ $backTitle }}" aria-label="{{ $backTitle }}">
                <i class="fas fa-arrow-left"></i>
            </a>
            <div class="bible-brand-title">
                <i class="fas fa-book-bible bible-brand-icon"></i>
                <span>Bíblia King</span>
                @if(!empty($translation))
                    <span class="bible-trans-badge">{{ strtoupper($translation) }}</span>
                @endif
            </div>
        </div>

            {{-- Busca Bíblica Global --}}
            <button type="button" class="bible-icon-btn" id="btn-open-search" title="Buscar versículos" aria-label="Buscar versículos">
                <i class="fas fa-search"></i>
            </button>

            {{-- Pergunte à Bíblia --}}
            <button type="button" class="bible-icon-btn" id="btn-open-ask-ai" title="Pergunte à Bíblia" aria-label="Pergunte à Bíblia">
                <i class="fas fa-sparkles"></i>
            </button>

            {{-- Botão de Ouvir Narração --}}
            <button type="button" class="bible-icon-btn btn-audio" id="btn-top-narrate"
                    data-speak-target="@yield('speak_target', '.hero-verse-quote, .reader-verses-flow, .devotional-body')"
                    data-speak-title="@yield('speak_title', 'Bíblia King')"
                    title="Ouvir em áudio" aria-label="Ouvir em áudio">
                <i class="fas fa-volume-up"></i>
            </button>

            {{-- Botão de Preferências de Leitura --}}
            <button type="button" class="bible-icon-btn" id="btn-open-prefs" title="Ajustes de leitura" aria-label="Ajustes de leitura">
                <i class="fas fa-font"></i>
            </button>

            {{-- Link para o cartão / perfil --}}
            @if(!empty($profileUrl))
                <a href="{{ $profileUrl }}" class="bible-icon-btn" title="Perfil do Cartão" aria-label="Perfil do Cartão">
                    <i class="fas fa-id-card"></i>
                </a>
            @endif
        </div>
    </header>

    {{-- Main Content --}}
    <main class="bible-app-wrapper">
        @yield('content')
    </main>

    {{-- Floating Audio Narration Player --}}
    <div class="audio-player-bar" id="bible-audio-player">
        <div class="audio-player-info">
            <div class="audio-wave-anim">
                <div class="audio-wave-bar"></div>
                <div class="audio-wave-bar"></div>
                <div class="audio-wave-bar"></div>
            </div>
            <span class="audio-text-preview">Reproduzindo narração...</span>
        </div>
        <div class="audio-controls">
            <button type="button" class="btn-audio-ctrl" id="btn-audio-speed" title="Velocidade de reprodução">1x</button>
            <button type="button" class="btn-audio-ctrl btn-audio-play-toggle" id="btn-audio-toggle-pause" title="Pausar / Continuar">
                <i class="fas fa-pause"></i>
            </button>
            <button type="button" class="btn-audio-ctrl" id="btn-audio-stop" title="Parar narração">
                <i class="fas fa-stop"></i>
            </button>
        </div>
    </div>

    {{-- Bottom Navigation Dock --}}
    <nav class="bible-dock-nav" aria-label="Navegação da Bíblia">
        @php
            $currentPath = request()->path();
            $slugPrefix = !empty($slug) ? $slug.'/' : '';
        @endphp
        
        <a href="{{ $hubUrl ?? ('/'.$slug.'/biblia') }}" class="dock-item {{ (request()->is('*/biblia') || request()->is('bibliaking')) ? 'active' : '' }}">
            <i class="fas fa-compass"></i>
            <span>Início</span>
        </a>

        <a href="{{ $devotionalUrl ?? ('/'.$slug.'/biblia/devocional') }}" class="dock-item {{ request()->is('*/biblia/devocional*') ? 'active' : '' }}">
            <i class="fas fa-sun"></i>
            <span>Devocional</span>
        </a>

        <a href="{{ $salmoUrl ?? ('/'.$slug.'/biblia/salmo') }}" class="dock-item {{ request()->is('*/biblia/salmo*') ? 'active' : '' }}">
            <i class="fas fa-music"></i>
            <span>Salmo</span>
        </a>

        <a href="{{ $planUrl ?? ('/'.$slug.'/biblia/plano') }}" class="dock-item {{ request()->is('*/biblia/plano*') ? 'active' : '' }}">
            <i class="fas fa-calendar-check"></i>
            <span>Plano</span>
        </a>

        <a href="{{ $prosperidadeUrl ?? ('/'.$slug.'/biblia/prosperidade') }}" class="dock-item {{ request()->is('*/biblia/prosperidade*') ? 'active' : '' }}">
            <i class="fas fa-gem"></i>
            <span>31 Dias</span>
        </a>
    </nav>

    {{-- Modal de Preferências de Leitura --}}
    <div class="bible-modal-backdrop" id="bible-pref-modal" role="dialog" aria-modal="true" aria-labelledby="pref-modal-title">
        <div class="bible-modal-dialog">
            <div class="modal-header">
                <h3 class="modal-title" id="pref-modal-title"><i class="fas fa-sliders-h" style="color:var(--gold-primary);margin-right:8px;"></i> Preferências de Leitura</h3>
                <button type="button" class="modal-close-btn" id="btn-close-prefs" aria-label="Fechar">✕</button>
            </div>

            {{-- Seleção de Tema --}}
            <div class="pref-row">
                <span class="pref-label">Tema Visual</span>
                <div class="pref-btn-group">
                    <button type="button" class="btn-pref-option" data-set-theme="dark">🌙 Escuro</button>
                    <button type="button" class="btn-pref-option" data-set-theme="oled">🖤 OLED</button>
                    <button type="button" class="btn-pref-option" data-set-theme="sepia">📜 Sépia</button>
                    <button type="button" class="btn-pref-option" data-set-theme="light">☀️ Claro</button>
                </div>
            </div>

            {{-- Tipografia --}}
            <div class="pref-row">
                <span class="pref-label">Família da Fonte</span>
                <div class="pref-btn-group" style="grid-template-columns: repeat(2, 1fr);">
                    <button type="button" class="btn-pref-option" data-set-font="serif">Serifada Clássica</button>
                    <button type="button" class="btn-pref-option" data-set-font="sans">Moderna Sans</button>
                </div>
            </div>

            {{-- Tamanho da Fonte --}}
            <div class="pref-row">
                <span class="pref-label">Tamanho do Texto</span>
                <div style="display:flex;gap:10px;align-items:center;">
                    <button type="button" class="btn-pref-option" id="btn-font-dec" style="flex:1;"><i class="fas fa-minus"></i> A−</button>
                    <button type="button" class="btn-pref-option" id="btn-font-inc" style="flex:1;"><i class="fas fa-plus"></i> A+</button>
                </div>
            </div>
        </div>
    </div>

    {{-- Floating Verse Action Bar (Marca-texto, Favoritos, WhatsApp, Copiar, Story) --}}
    <div class="verse-action-bar" id="verse-action-bar">
        <button type="button" class="color-picker-dot dot-gold" data-color="gold" title="Marcar Dourado"></button>
        <button type="button" class="color-picker-dot dot-green" data-color="green" title="Marcar Verde"></button>
        <button type="button" class="color-picker-dot dot-blue" data-color="blue" title="Marcar Azul"></button>
        <button type="button" class="color-picker-dot dot-pink" data-color="pink" title="Marcar Rosa"></button>
        <button type="button" class="color-picker-dot dot-clear" data-color="clear" title="Remover marcação">✕</button>
        <div style="width:1px;height:18px;background:var(--border-subtle);margin:0 2px;"></div>
        <button type="button" class="verse-act-btn btn-wpp" id="btn-verse-wpp" title="Compartilhar no WhatsApp">
            <i class="fab fa-whatsapp"></i> WhatsApp
        </button>
        <button type="button" class="verse-act-btn" id="btn-verse-copy" title="Copiar versículo">
            <i class="fas fa-copy"></i> Copiar
        </button>
        <button type="button" class="verse-act-btn" id="btn-verse-story" title="Criar Story Instagram">
            <i class="fab fa-instagram"></i> Story
        </button>
        <button type="button" class="verse-act-btn" id="btn-verse-speak" title="Ouvir versículo">
            <i class="fas fa-volume-up"></i>
        </button>
    </div>

    {{-- Modal de Busca Bíblica Global --}}
    <div class="bible-modal-backdrop" id="bible-search-modal" role="dialog" aria-modal="true" aria-labelledby="search-modal-title">
        <div class="bible-modal-dialog" style="max-width:580px;">
            <div class="modal-header">
                <h3 class="modal-title" id="search-modal-title">
                    <i class="fas fa-search" style="color:var(--gold-primary);margin-right:8px;"></i> Busca Bíblica Global
                </h3>
                <button type="button" class="modal-close-btn" id="btn-close-search" aria-label="Fechar">✕</button>
            </div>
            <div class="search-modal-body">
                <div class="search-input-wrapper">
                    <i class="fas fa-search"></i>
                    <input type="text" id="bible-global-search-input" placeholder="Digite uma palavra ou tema (ex: amor, fé, cura, paz)..." autocomplete="off">
                </div>
                <div class="search-tags-row">
                    <span style="font-size:0.75rem;color:var(--text-muted);display:flex;align-items:center;margin-right:4px;">Temas:</span>
                    <button type="button" class="search-tag" data-tag="amor">Amor</button>
                    <button type="button" class="search-tag" data-tag="fé">Fé</button>
                    <button type="button" class="search-tag" data-tag="paz">Paz</button>
                    <button type="button" class="search-tag" data-tag="esperança">Esperança</button>
                    <button type="button" class="search-tag" data-tag="prosperidade">Prosperidade</button>
                    <button type="button" class="search-tag" data-tag="cura">Cura</button>
                    <button type="button" class="search-tag" data-tag="sabedoria">Sabedoria</button>
                    <button type="button" class="search-tag" data-tag="ansiedade">Ansiedade</button>
                    <button type="button" class="search-tag" data-tag="perdão">Perdão</button>
                </div>
                <div id="search-status-msg" style="font-size:0.85rem;color:var(--text-muted);text-align:center;margin:12px 0;display:none;"></div>
                <div class="search-results-list" id="search-results-container"></div>
            </div>
        </div>
    </div>

    {{-- Modal Pergunte à Bíblia (Conselheiro Espiritual) --}}
    <div class="bible-modal-backdrop" id="bible-ask-modal" role="dialog" aria-modal="true" aria-labelledby="ask-modal-title">
        <div class="bible-modal-dialog" style="max-width:580px;">
            <div class="modal-header">
                <h3 class="modal-title" id="ask-modal-title">
                    <i class="fas fa-sparkles" style="color:var(--gold-primary);margin-right:8px;"></i> Pergunte à Bíblia
                </h3>
                <button type="button" class="modal-close-btn" id="btn-close-ask" aria-label="Fechar">✕</button>
            </div>
            <div class="search-modal-body">
                <p style="font-size:0.88rem;color:var(--text-secondary);margin-bottom:12px;line-height:1.5;">
                    Escolha o que você está sentindo no seu coração para receber direção e versículos de fortalecimento:
                </p>
                <div class="ask-topics-grid">
                    <button type="button" class="ask-topic-chip" data-topic="ansiedade">🌿 Ansiedade & Medo</button>
                    <button type="button" class="ask-topic-chip" data-topic="financas">💰 Finanças & Trabalho</button>
                    <button type="button" class="ask-topic-chip" data-topic="perdao">🕊️ Cura & Perdão</button>
                    <button type="button" class="ask-topic-chip" data-topic="familia">💍 Família & Casamento</button>
                    <button type="button" class="ask-topic-chip" data-topic="forca">🔥 Força na Dificuldade</button>
                    <button type="button" class="ask-topic-chip" data-topic="gratidao">☀️ Gratidão & Bênçãos</button>
                </div>
                <div class="search-input-wrapper">
                    <i class="fas fa-comment-dots"></i>
                    <input type="text" id="bible-ask-input" placeholder="Ou digite sua oração ou pergunta bíblica..." autocomplete="off">
                </div>
                <div style="text-align:right;">
                    <button type="button" class="verse-act-btn" id="btn-submit-ask" style="background:var(--gold-primary);color:#111;padding:8px 16px;">
                        <i class="fas fa-paper-plane"></i> Buscar Orientação
                    </button>
                </div>
                <div class="ask-answer-box" id="ask-answer-container" style="display:none;"></div>
            </div>
        </div>
    </div>

    @stack('scripts')
</body>
</html>

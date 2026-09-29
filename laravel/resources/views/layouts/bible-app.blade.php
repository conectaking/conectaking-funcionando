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

        <div class="bible-top-bar-right">
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

    @stack('scripts')
</body>
</html>

@extends('layouts.bible-app')

@section('title', 'Bíblia Sagrada — ' . ($slug ?? 'Conecta King'))
@section('meta_description', 'Leia a Bíblia, medite no Devocional 365 e acompanhe seu plano de leitura diário.')
@section('speak_target', '#hub-verse-text')
@section('speak_title', 'Versículo do Dia')

@section('content')
@php
    $verseText = is_array($verse) ? ($verse['texto'] ?? $verse['text'] ?? '') : (string)$verse;
    $verseRef  = is_array($verse) ? ($verse['referencia'] ?? $verse['reference'] ?? '') : '';
    $shareWaText = "\"{$verseText}\"\n— {$verseRef}\n\n📖 Bíblia King · https://conectaking.com.br/{$slug}/biblia";
@endphp

{{-- 1. Hero Card: Versículo do Dia --}}
@if(!empty($verseText))
<div class="hero-verse-card">
    <div class="hero-verse-header">
        <span class="hero-badge-tag"><i class="fas fa-sun"></i> Versículo do Dia</span>
        <div style="display:flex;align-items:center;gap:8px;">
            <span class="streak-badge" id="hub-streak-badge" title="Dias seguidos lendo a Palavra">
                <i class="fas fa-fire"></i> <span id="hub-streak-count">1</span> dias
            </span>
            <span class="hero-verse-date">{{ now()->translatedFormat('d \d\e F') }}</span>
        </div>
    </div>

    <blockquote class="hero-verse-quote" id="hub-verse-text">
        {{ $verseText }}
    </blockquote>

    @if(!empty($verseRef))
        <div class="hero-verse-reference">
            <i class="fas fa-bookmark"></i>
            <span>{{ $verseRef }}</span>
        </div>
    @endif

    {{-- Botões de Ação Interativa --}}
    <div class="verse-action-row">
        <button type="button" class="btn-verse-action btn-audio" data-speak-target="#hub-verse-text" data-speak-title="{{ $verseRef }}">
            <i class="fas fa-volume-up"></i>
            <span>Ouvir</span>
        </button>

        <button type="button" class="btn-verse-action" data-copy-text="{{ $verseText }} — {{ $verseRef }}">
            <i class="fas fa-copy"></i>
            <span>Copiar</span>
        </button>

        <button type="button" class="btn-verse-action" data-share-wa="{{ $shareWaText }}">
            <i class="fab fa-whatsapp" style="color:#25D366;"></i>
            <span>WhatsApp</span>
        </button>

        <button type="button" class="btn-verse-action" data-stories-verse="{{ $verseText }}" data-stories-ref="{{ $verseRef }}" data-stories-owner="{{ $slug }}">
            <i class="fab fa-instagram" style="color:#E1306C;"></i>
            <span>Stories</span>
        </button>
    </div>
</div>
@endif

{{-- Card: Continuar de Onde Parei (Carregado dinamicamente via JS) --}}
<a href="#" class="continue-reading-card" id="hub-continue-card" style="display:none;">
    <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;border-radius:50%;background:rgba(255,199,0,0.15);display:flex;align-items:center;justify-content:center;color:var(--gold-primary);font-size:1.1rem;">
            <i class="fas fa-bookmark"></i>
        </div>
        <div>
            <div style="font-size:0.75rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--gold-primary);font-weight:700;">Continuar Leitura</div>
            <div style="font-weight:700;font-size:1.02rem;color:var(--text-primary);" id="hub-continue-title">Gênesis Capítulo 1</div>
        </div>
    </div>
    <div style="color:var(--gold-primary);font-size:0.9rem;display:flex;align-items:center;gap:4px;font-weight:600;">
        <span>Continuar</span> <i class="fas fa-chevron-right"></i>
    </div>
</a>

{{-- 2. Pilares da Bíblia (Grade de Destaques) --}}
<div class="section-header">
    <h2 class="section-title"><i class="fas fa-compass"></i> Jornada Espiritual</h2>
</div>

<div class="hub-pillars-grid">
    {{-- Devocional 365 --}}
    <a href="{{ $devotionalUrl }}" class="pillar-card">
        <div class="pillar-icon-box">
            <i class="fas fa-sun"></i>
        </div>
        <div class="pillar-info">
            <h3 class="pillar-title">
                <span>Devocional 365</span>
                <i class="fas fa-chevron-right pillar-arrow"></i>
            </h3>
            <p class="pillar-desc">
                Dia {{ $devotionalDay ?? now()->dayOfYear }}: {{ !empty($devotionalToday['titulo']) ? \Illuminate\Support\Str::limit($devotionalToday['titulo'], 32) : 'Reflexão diária com oração' }}
            </p>
        </div>
    </a>

    {{-- Salmo do Dia --}}
    <a href="{{ $salmoUrl }}" class="pillar-card">
        <div class="pillar-icon-box">
            <i class="fas fa-music"></i>
        </div>
        <div class="pillar-info">
            <h3 class="pillar-title">
                <span>Salmo do Dia</span>
                <i class="fas fa-chevron-right pillar-arrow"></i>
            </h3>
            <p class="pillar-desc">
                {{ !empty($salmo['ref']) ? $salmo['ref'] : 'Salmo selecionado para meditação' }}
            </p>
        </div>
    </a>

    {{-- Plano de Leitura --}}
    <a href="{{ $planUrl }}" class="pillar-card">
        <div class="pillar-icon-box">
            <i class="fas fa-calendar-check"></i>
        </div>
        <div class="pillar-info">
            <h3 class="pillar-title">
                <span>Plano Anual</span>
                <i class="fas fa-chevron-right pillar-arrow"></i>
            </h3>
            <p class="pillar-desc">
                {{ !empty($plan['summary']) ? $plan['summary'] : 'Roteiro de leitura diária da Bíblia' }}
            </p>
        </div>
    </a>

    {{-- 31 Dias de Prosperidade --}}
    <a href="{{ $prosperidadeUrl }}" class="pillar-card">
        <div class="pillar-icon-box">
            <i class="fas fa-gem"></i>
        </div>
        <div class="pillar-info">
            <h3 class="pillar-title">
                <span>Prosperidade 31</span>
                <i class="fas fa-chevron-right pillar-arrow"></i>
            </h3>
            <p class="pillar-desc">
                Ativações práticas baseadas em Provérbios
            </p>
        </div>
    </a>

    {{-- Bíblia Inteira --}}
    <a href="{{ $wholeUrl }}" class="pillar-card">
        <div class="pillar-icon-box">
            <i class="fas fa-book-open"></i>
        </div>
        <div class="pillar-info">
            <h3 class="pillar-title">
                <span>Bíblia Inteira</span>
                <i class="fas fa-chevron-right pillar-arrow"></i>
            </h3>
            <p class="pillar-desc">
                Devocional livro a livro do Gênesis ao Apocalipse
            </p>
        </div>
    </a>

    @if(!empty($cunhaUrl))
    <a href="{{ $cunhaUrl }}" target="_blank" rel="noopener" class="pillar-card">
        <div class="pillar-icon-box">
            <i class="fas fa-video"></i>
        </div>
        <div class="pillar-info">
            <h3 class="pillar-title">
                <span>Mensagem em Vídeo</span>
                <i class="fas fa-external-link-alt pillar-arrow"></i>
            </h3>
            <p class="pillar-desc">Palavra pastoral e ministração</p>
        </div>
    </a>
    @endif
</div>

{{-- 3. Biblioteca: Todos os 66 Livros da Bíblia --}}
<div class="section-header" id="livros">
    <h2 class="section-title"><i class="fas fa-book-bible"></i> Livros da Bíblia</h2>
    <span style="font-size:0.85rem;color:var(--text-muted);font-weight:600;">66 Livros</span>
</div>

{{-- Barra de Busca e Filtro por Testamento --}}
<div class="bible-filter-wrapper">
    <div class="bible-search-box">
        <i class="fas fa-search bible-search-icon"></i>
        <input type="text" class="bible-search-input" id="bible-book-search" placeholder="Buscar livro (ex: Salmos, Romanos, Mateus)..." autocomplete="off">
    </div>

    <div class="bible-testament-tabs">
        <button type="button" class="tab-pill active" data-testament-tab="all">Todos (66)</button>
        <button type="button" class="tab-pill" data-testament-tab="at">Antigo Testamento (39)</button>
        <button type="button" class="tab-pill" data-testament-tab="nt">Novo Testamento (27)</button>
    </div>
</div>

{{-- Grade de Livros --}}
<div class="bible-books-grid" id="bible-books-list">
    {{-- Antigo Testamento --}}
    @foreach(($at ?? []) as $b)
        @php
            $bId = $b['id'] ?? '';
            $bName = $b['name'] ?? $bId;
            $caps = $chapterCounts[$bId] ?? 1;
            $hasStudy = !empty($booksWithStudy[$bId]);
            $firstChapterUrl = '/' . $slug . '/biblia/' . $bId . '/1';
        @endphp
        <a href="{{ $firstChapterUrl }}" class="bible-book-card" data-testament="at" data-book-name="{{ $bName }}">
            <div class="bible-book-name">{{ $bName }}</div>
            <div class="bible-book-meta">
                <span>{{ $caps }} {{ $caps > 1 ? 'caps' : 'cap' }}</span>
                @if($hasStudy)
                    <i class="fas fa-graduation-cap badge-study-indicator" title="Estudo disponível"></i>
                @endif
            </div>
        </a>
    @endforeach

    {{-- Novo Testamento --}}
    @foreach(($nt ?? []) as $b)
        @php
            $bId = $b['id'] ?? '';
            $bName = $b['name'] ?? $bId;
            $caps = $chapterCounts[$bId] ?? 1;
            $hasStudy = !empty($booksWithStudy[$bId]);
            $firstChapterUrl = '/' . $slug . '/biblia/' . $bId . '/1';
        @endphp
        <a href="{{ $firstChapterUrl }}" class="bible-book-card" data-testament="nt" data-book-name="{{ $bName }}">
            <div class="bible-book-name" style="color:var(--text-primary);">{{ $bName }}</div>
            <div class="bible-book-meta">
                <span style="color:#10B981;font-weight:600;">NT · {{ $caps }} {{ $caps > 1 ? 'caps' : 'cap' }}</span>
                @if($hasStudy)
                    <i class="fas fa-graduation-cap badge-study-indicator" title="Estudo disponível"></i>
                @endif
            </div>
        </a>
    @endforeach
</div>

@endsection

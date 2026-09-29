@extends('layouts.bible-app', [
    'title' => ($item['titulo'] ?? 'Bíblia Inteira') . ' · Dia ' . $day . ' — Conecta King',
    'activeTab' => 'whole',
    'audioText' => ($item['titulo'] ?? '') . '. ' . ($item['verse_text'] ?? '') . ' ' . ($item['reflexao'] ?? '') . ' ' . ($item['oracao'] ?? ''),
    'showAudioBar' => true,
])

@section('content')
<div class="bible-view-container">

    {{-- Header de Navegação Superior --}}
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
        <a href="{{ $hubUrl }}" class="bible-btn bible-btn-secondary" style="font-size:0.85rem; padding:0.45rem 0.85rem;">
            <i class="fas fa-chevron-left"></i> Hub Bíblia
        </a>
        <div style="display:flex; gap:0.5rem;">
            <a href="{{ $todayUrl }}" class="bible-btn bible-btn-secondary" style="font-size:0.85rem; padding:0.45rem 0.85rem;">
                <i class="fas fa-calendar-check"></i> Dia de Hoje
            </a>
            @if(!empty($profileUrl))
            <a href="{{ $profileUrl }}" class="bible-btn bible-btn-secondary" style="font-size:0.85rem; padding:0.45rem 0.85rem;">
                <i class="fas fa-id-card"></i> Cartão
            </a>
            @endif
        </div>
    </div>

    {{-- Cabeçalho Principal --}}
    <div style="text-align:center; margin-bottom:2rem;">
        <div style="display:inline-flex; align-items:center; gap:0.5rem; background:rgba(255, 199, 0, 0.12); border:1px solid rgba(255, 199, 0, 0.3); border-radius:999px; padding:0.35rem 1rem; color:var(--bible-accent); font-size:0.82rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:0.75rem;">
            <i class="fas fa-book-open"></i> Bíblia Inteira · Livro a Livro
        </div>
        <h1 style="font-family:var(--bible-serif); font-size:2rem; font-weight:700; color:var(--bible-text); margin-bottom:0.5rem; line-height:1.2;">
            {{ $item['titulo'] }}
        </h1>
        <p style="color:var(--bible-muted); font-size:0.95rem;">
            Dia <strong style="color:var(--bible-accent);">{{ $day }}</strong> de {{ $totalDays }} dias da jornada pelas Escrituras
        </p>
    </div>

    {{-- Card Central com Conteúdo Completo --}}
    <div class="bible-card" style="padding:2rem; margin-bottom:2rem; border-color:rgba(255, 199, 0, 0.22); position:relative;">
        <div style="position:absolute; top:1.25rem; right:1.25rem; display:flex; gap:0.5rem;">
            @if(!empty($item['verse_text']))
            <button type="button" class="bible-btn bible-btn-secondary" style="padding:0.4rem 0.75rem; font-size:0.82rem;" 
                    onclick="window.BibleApp?.generateVerseCard({ reference: '{{ addslashes($item['verse_ref'] ?? $item['titulo']) }}', text: '{{ addslashes($item['verse_text']) }}' })" 
                    title="Criar Story para Instagram">
                <i class="fab fa-instagram"></i> Story
            </button>
            @endif
        </div>

        @if(!empty($item['verse_ref']))
            <div style="font-family:var(--bible-serif); color:var(--bible-accent); font-weight:700; font-size:1.15rem; margin-bottom:0.5rem;">
                <i class="fas fa-bookmark" style="margin-right:0.35rem; font-size:0.9rem;"></i> {{ $item['verse_ref'] }}
            </div>
        @endif

        @if(!empty($item['verse_text']))
            <blockquote style="font-family:var(--bible-serif); font-size:1.25rem; font-style:italic; line-height:1.75; color:var(--bible-text); border-left:3px solid var(--bible-accent); padding-left:1.25rem; margin:1.25rem 0 1.75rem 0; background:rgba(255, 199, 0, 0.03); padding-top:0.75rem; padding-bottom:0.75rem; border-radius:0 12px 12px 0;">
                "{{ $item['verse_text'] }}"
            </blockquote>
        @endif

        @if(!empty($item['resumo_capitulo']))
            <div style="margin-top:1.5rem; padding-top:1.25rem; border-top:1px solid var(--bible-border);">
                <h3 style="font-size:0.95rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--bible-accent); margin-bottom:0.6rem; display:flex; align-items:center; gap:0.5rem;">
                    <i class="fas fa-file-alt"></i> Resumo do Capítulo
                </h3>
                <div style="font-size:1.02rem; line-height:1.75; color:var(--bible-text);">
                    {{ $item['resumo_capitulo'] }}
                </div>
            </div>
        @endif

        @if(!empty($item['reflexao']))
            <div style="margin-top:1.5rem; padding-top:1.25rem; border-top:1px solid var(--bible-border);">
                <h3 style="font-size:0.95rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--bible-accent); margin-bottom:0.6rem; display:flex; align-items:center; gap:0.5rem;">
                    <i class="fas fa-lightbulb"></i> Reflexão Espiritual
                </h3>
                <div style="font-size:1.02rem; line-height:1.75; color:var(--bible-text);">
                    {{ $item['reflexao'] }}
                </div>
            </div>
        @endif

        @if(!empty($item['aplicacao']))
            <div style="margin-top:1.5rem; padding-top:1.25rem; border-top:1px solid var(--bible-border);">
                <h3 style="font-size:0.95rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--bible-accent); margin-bottom:0.6rem; display:flex; align-items:center; gap:0.5rem;">
                    <i class="fas fa-tasks"></i> Aplicação Prática
                </h3>
                <div style="font-size:1.02rem; line-height:1.75; color:var(--bible-text);">
                    {{ $item['aplicacao'] }}
                </div>
            </div>
        @endif

        @if(!empty($item['oracao']))
            <div style="margin-top:1.5rem; padding-top:1.25rem; border-top:1px solid var(--bible-border); background:rgba(255, 199, 0, 0.05); padding:1.25rem; border-radius:12px;">
                <h3 style="font-size:0.95rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--bible-accent); margin-bottom:0.6rem; display:flex; align-items:center; gap:0.5rem;">
                    <i class="fas fa-hands-praying"></i> Oração Guiada
                </h3>
                <div style="font-size:1.02rem; line-height:1.75; font-style:italic; color:var(--bible-text);">
                    {{ $item['oracao'] }}
                </div>
            </div>
        @endif

        <div style="margin-top:2rem; padding-top:1.5rem; border-top:1px solid var(--bible-border); text-align:center;">
            <a href="{{ $readUrl }}" class="bible-btn bible-btn-primary" style="padding:0.75rem 2rem; font-size:1rem;">
                <i class="fas fa-book-open"></i> Ler Texto Completo: {{ $item['ref'] }}
            </a>
        </div>
    </div>

    {{-- Navegador de Dias & Pager --}}
    <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:1rem; margin-bottom:3rem; padding:1.25rem; background:var(--bible-card-bg); border:1px solid var(--bible-border); border-radius:16px;">
        <div>
            @if($prevUrl)
                <a href="{{ $prevUrl }}" class="bible-btn bible-btn-secondary" style="font-size:0.88rem;">
                    <i class="fas fa-arrow-left"></i> Dia Anterior
                </a>
            @else
                <button class="bible-btn bible-btn-secondary" disabled style="opacity:0.4; cursor:not-allowed; font-size:0.88rem;">
                    <i class="fas fa-arrow-left"></i> Dia Anterior
                </button>
            @endif
        </div>

        <form onsubmit="var d=parseInt(this.day.value,10); if(d>=1 && d<={{ $totalDays }}){ location.href='/{{ $slug }}/biblia/biblia-inteira/'+d; } return false;" style="display:flex; align-items:center; gap:0.5rem;">
            <span style="font-size:0.88rem; color:var(--bible-muted);">Ir ao Dia:</span>
            <input type="number" name="day" min="1" max="{{ $totalDays }}" value="{{ $day }}" 
                   style="width:75px; text-align:center; padding:0.45rem; background:rgba(255,255,255,0.06); border:1px solid var(--bible-border); border-radius:8px; color:var(--bible-text); font-weight:600; font-family:inherit;">
            <button type="submit" class="bible-btn bible-btn-secondary" style="padding:0.45rem 0.85rem;">Ir</button>
        </form>

        <div>
            @if($nextUrl)
                <a href="{{ $nextUrl }}" class="bible-btn bible-btn-secondary" style="font-size:0.88rem;">
                    Próximo Dia <i class="fas fa-arrow-right"></i>
                </a>
            @else
                <button class="bible-btn bible-btn-secondary" disabled style="opacity:0.4; cursor:not-allowed; font-size:0.88rem;">
                    Próximo Dia <i class="fas fa-arrow-right"></i>
                </button>
            @endif
        </div>
    </div>

</div>
@endsection

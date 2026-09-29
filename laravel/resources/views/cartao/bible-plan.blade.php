@extends('layouts.bible-app')

@section('title', 'Plano de Leitura Dia ' . $day . ' — Bíblia King')
@section('meta_description', 'Plano de leitura diária da Bíblia: Dia ' . $day . ' de 365.')
@section('speak_target', '#plan-summary-box')
@section('speak_title', 'Plano de Leitura: Dia ' . $day)

@section('content')
<div class="reader-container">
    <header class="reader-header">
        <span class="hero-badge-tag" style="margin-bottom:10px;"><i class="fas fa-calendar-check"></i> Plano Anual · Dia {{ $day }} de 365</span>
        <h1 class="reader-book-title">{{ $plan['summary'] ?? 'Leitura do Dia' }}</h1>
        @php
            $pct = round(($day / 365) * 100);
        @endphp
        <div style="max-width:320px;margin:12px auto 0;">
            <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-muted);margin-bottom:6px;">
                <span>Progresso Anual</span>
                <span style="color:var(--gold-primary);font-weight:700;">{{ $pct }}% concluído</span>
            </div>
            <div style="height:6px;background:var(--border-subtle);border-radius:99px;overflow:hidden;">
                <div style="width:{{ $pct }}%;height:100%;background:var(--gold-gradient);border-radius:99px;"></div>
            </div>
        </div>
    </header>

    @if(!empty($plan['book_id']))
        <div class="hero-verse-card" style="text-align:center;">
            <span class="hero-badge-tag" style="margin-bottom:12px;">Capítulos Recomendados</span>
            <div id="plan-summary-box" style="font-family:var(--font-heading);font-size:1.6rem;font-weight:700;color:var(--gold-primary);margin-bottom:12px;">
                {{ $plan['summary'] }}
            </div>
            <p style="color:var(--text-secondary);font-size:0.95rem;margin:0 0 20px;">
                Livro: <strong>{{ $plan['book_id'] }}</strong> · Capítulos: <strong>{{ $plan['chapter_from'] }}@if(($plan['chapter_to'] ?? null) && $plan['chapter_to'] != $plan['chapter_from']) até {{ $plan['chapter_to'] }}@endif</strong>
            </p>

            @if(!empty($readUrl))
                <a href="{{ $readUrl }}" class="btn-verse-action" style="padding:12px 28px;font-size:1rem;background:var(--gold-primary);color:#000;border:none;">
                    <i class="fas fa-book-open"></i>
                    <span>Abrir Leitura Agora</span>
                </a>
            @endif
        </div>
    @else
        <div style="text-align:center;padding:40px 20px;background:var(--bg-card);border-radius:var(--radius-lg);margin-bottom:24px;">
            <p style="color:var(--text-secondary);">Sem capítulos definidos para este dia.</p>
        </div>
    @endif

    {{-- Devocional Vinculado ao Plano --}}
    @if(!empty($plan['devocional']) && (!empty($plan['devocional']['titulo']) || !empty($plan['devocional']['reflexao'])))
        <div style="background:var(--bg-card);border:1px solid var(--border-gold);border-radius:var(--radius-lg);padding:24px;margin-bottom:24px;">
            <span class="hero-badge-tag" style="margin-bottom:12px;"><i class="fas fa-sun"></i> Devocional deste Dia</span>
            @if(!empty($plan['devocional']['titulo']))
                <h3 style="font-size:1.15rem;font-weight:700;color:var(--text-primary);margin:0 0 8px;">
                    {{ $plan['devocional']['titulo'] }}
                </h3>
            @endif
            @if(!empty($plan['devocional']['versiculo_ref']))
                <div style="color:var(--gold-primary);font-size:0.88rem;font-weight:600;margin-bottom:12px;">
                    {{ $plan['devocional']['versiculo_ref'] }}
                </div>
            @endif
            @if(!empty($plan['devocional']['reflexao']))
                <p style="color:var(--text-secondary);line-height:1.7;margin:0 0 16px;font-size:0.95rem;">
                    {{ \Illuminate\Support\Str::limit($plan['devocional']['reflexao'], 300) }}
                </p>
            @endif
            <a href="{{ $devotionalUrl }}" class="btn-pager" style="display:inline-flex;">
                <i class="fas fa-book-reader"></i>
                <span>Ler reflexão completa</span>
            </a>
        </div>
    @endif

    {{-- Navegação e Seletor de Dia --}}
    <div style="margin:30px 0 20px;display:flex;align-items:center;justify-content:center;gap:10px;">
        <span style="font-size:0.85rem;color:var(--text-muted);font-weight:600;">Ir para o dia:</span>
        <form method="get" action="#" onsubmit="var d=parseInt(this.day.value,10); if(d>=1&&d<=365){ location.href='/{{ $slug }}/biblia/plano/'+d; } return false;" style="display:flex;gap:6px;">
            <input name="day" type="number" min="1" max="365" value="{{ $day }}" class="bible-search-input" style="width:85px;padding:6px 12px;text-align:center;">
            <button type="submit" class="btn-pager" style="padding:6px 14px;">Ir</button>
        </form>
    </div>

    {{-- Pager Bar --}}
    <nav class="reader-pager-bar" aria-label="Navegação do Plano">
        @if(!empty($prevUrl))
            <a href="{{ $prevUrl }}" class="btn-pager">
                <i class="fas fa-arrow-left"></i>
                <span>Dia {{ $day - 1 }}</span>
            </a>
        @else
            <button type="button" class="btn-pager" disabled>
                <i class="fas fa-arrow-left"></i>
                <span>Início</span>
            </button>
        @endif

        <a href="{{ $todayUrl }}" class="btn-pager" title="Dia de hoje">
            <i class="fas fa-calendar-day"></i>
            <span>Hoje</span>
        </a>

        @if(!empty($nextUrl))
            <a href="{{ $nextUrl }}" class="btn-pager">
                <span>Dia {{ $day + 1 }}</span>
                <i class="fas fa-arrow-right"></i>
            </a>
        @else
            <button type="button" class="btn-pager" disabled>
                <span>Fim do ano</span>
                <i class="fas fa-arrow-right"></i>
            </button>
        @endif
    </nav>
</div>
@endsection

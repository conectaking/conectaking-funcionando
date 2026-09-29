@extends('layouts.bible-app')

@section('title', 'Devocional Dia ' . $day . ' — Bíblia King')
@section('meta_description', 'Devocional diário da Bíblia: Dia ' . $day . ' de 365 — Meditação, aplicação e oração.')
@section('speak_target', '#devotional-content-box')
@section('speak_title', 'Devocional Dia ' . $day . ': ' . ($devotional['titulo'] ?? 'Reflexão'))

@section('content')
<div class="reader-container">
    {{-- Header de Topo do Devocional --}}
    <header class="reader-header">
        <span class="hero-badge-tag" style="margin-bottom:10px;"><i class="fas fa-sun"></i> Devocional 365 · Dia {{ $day }}</span>
        <h1 class="reader-book-title">{{ $devotional['titulo'] ?? ('Devocional · Dia ' . $day) }}</h1>

        @if(!empty($devotional['tema_mes']) || !empty($devotional['tema_ano']))
            <div class="reader-meta-subtitle" style="margin-top:8px;">
                @if(!empty($devotional['tema_mes']))
                    <span>Tema do mês: <strong style="color:var(--gold-primary);">{{ $devotional['tema_mes'] }}</strong></span>
                @endif
                @if(!empty($devotional['tema_mes']) && !empty($devotional['tema_ano'])) · @endif
                @if(!empty($devotional['tema_ano']))
                    <span>{{ $devotional['tema_ano'] }}</span>
                @endif
            </div>
        @endif
    </header>

    @if(!empty($devotional) && (!empty($devotional['versiculo_texto']) || !empty($devotional['reflexao'])))
        {{-- Card de Versículo Chave do Devocional --}}
        @if(!empty($devotional['versiculo_texto']))
            <div class="hero-verse-card" style="margin-bottom:28px;">
                <div class="hero-verse-header">
                    <span class="hero-badge-tag"><i class="fas fa-bookmark"></i> Palavra Sagrada</span>
                </div>
                <blockquote class="hero-verse-quote" id="devotional-verse-text">
                    {{ $devotional['versiculo_texto'] }}
                </blockquote>
                @if(!empty($devotional['versiculo_ref']))
                    <div class="hero-verse-reference">
                        <i class="fas fa-quote-right"></i>
                        <span>{{ $devotional['versiculo_ref'] }}</span>
                    </div>
                @endif
                <div class="verse-action-row">
                    <button type="button" class="btn-verse-action btn-audio" data-speak-target="#devotional-verse-text" data-speak-title="{{ $devotional['versiculo_ref'] ?? 'Versículo' }}">
                        <i class="fas fa-volume-up"></i>
                        <span>Ouvir Versículo</span>
                    </button>
                    <button type="button" class="btn-verse-action" data-copy-text="{{ $devotional['versiculo_texto'] }} — {{ $devotional['versiculo_ref'] ?? '' }}">
                        <i class="fas fa-copy"></i>
                        <span>Copiar</span>
                    </button>
                    <button type="button" class="btn-verse-action" data-share-wa="{{ $devotional['versiculo_texto'] }} — {{ $devotional['versiculo_ref'] ?? '' }} (Devocional Dia {{ $day }})">
                        <i class="fab fa-whatsapp" style="color:#25D366;"></i>
                        <span>WhatsApp</span>
                    </button>
                    <button type="button" class="btn-verse-action" data-stories-verse="{{ $devotional['versiculo_texto'] }}" data-stories-ref="{{ $devotional['versiculo_ref'] ?? '' }}" data-stories-owner="{{ $slug }}">
                        <i class="fab fa-instagram" style="color:#E1306C;"></i>
                        <span>Stories</span>
                    </button>
                </div>
            </div>
        @endif

        {{-- Caixa de Conteúdo: Reflexão, Aplicação e Oração --}}
        <div id="devotional-content-box" class="reader-verses-flow" style="font-size:1.05rem;">
            @if(!empty($devotional['reflexao']))
                <div class="reader-section-divider"><i class="fas fa-feather-alt" style="margin-right:8px;"></i> Reflexão Diária</div>
                <div style="line-height:1.8;color:var(--text-primary);margin-bottom:24px;">
                    {!! nl2br(e($devotional['reflexao'])) !!}
                </div>
            @endif

            @if(!empty($devotional['aplicacao']))
                <div class="reader-section-divider"><i class="fas fa-shoe-prints" style="margin-right:8px;"></i> Aplicação Prática</div>
                <div style="background:var(--bg-card);border:1px solid var(--border-gold);border-radius:var(--radius-md);padding:18px 20px;line-height:1.75;margin-bottom:24px;">
                    {!! nl2br(e($devotional['aplicacao'])) !!}
                </div>
            @endif

            @if(!empty($devotional['oracao']))
                <div class="reader-section-divider"><i class="fas fa-hands-praying" style="margin-right:8px;"></i> Oração de Alinhamento</div>
                <div style="background:rgba(255,199,0,0.06);border-left:3px solid var(--gold-primary);border-radius:var(--radius-sm);padding:16px 20px;font-style:italic;line-height:1.8;color:var(--text-primary);margin-bottom:30px;">
                    {!! nl2br(e($devotional['oracao'])) !!}
                </div>
            @endif
        </div>

        {{-- Ações de Leitura --}}
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:30px 0 20px;padding-top:20px;border-top:1px solid var(--border-subtle);">
            <button type="button" class="btn-verse-action" id="btn-mark-dev-read" style="background:var(--bg-surface-elevated);border-color:var(--border-gold);padding:10px 20px;font-size:0.95rem;">
                <i class="far fa-check-circle" style="color:var(--gold-primary);"></i>
                <span id="mark-dev-label">Marcar devocional como lido</span>
            </button>
            <span id="mark-dev-status" style="font-size:0.88rem;color:var(--gold-primary);font-weight:600;"></span>
        </div>
    @else
        <div style="text-align:center;padding:50px 20px;background:var(--bg-card);border-radius:var(--radius-lg);margin:20px 0;">
            <i class="fas fa-book" style="font-size:2.5rem;color:var(--text-muted);margin-bottom:14px;display:block;"></i>
            <h3 style="margin:0 0 10px;font-size:1.2rem;">Devocional do dia {{ $day }}</h3>
            <p style="color:var(--text-secondary);margin-bottom:20px;">Ainda não há reflexão cadastrada para este dia específico.</p>
            <a href="{{ $todayUrl }}" class="btn-pager">Ir para o dia de hoje</a>
        </div>
    @endif

    {{-- Navegação e Seletor Rápido de Dia --}}
    <div style="margin:30px 0 20px;display:flex;align-items:center;justify-content:center;gap:10px;">
        <span style="font-size:0.85rem;color:var(--text-muted);font-weight:600;">Pular para o dia:</span>
        <form method="get" action="#" onsubmit="var d=parseInt(this.day.value,10); if(d>=1&&d<=365){ location.href='/{{ $slug }}/biblia/devocional/'+d; } return false;" style="display:flex;gap:6px;">
            <input name="day" type="number" min="1" max="365" value="{{ $day }}" class="bible-search-input" style="width:85px;padding:6px 12px;text-align:center;">
            <button type="submit" class="btn-pager" style="padding:6px 14px;">Ir</button>
        </form>
    </div>

    {{-- Pager Bar --}}
    <nav class="reader-pager-bar" aria-label="Navegação do Devocional">
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

@push('scripts')
<script>
(function() {
    const day = @json((int) $day);
    const slug = @json($slug ?? '');
    const markApi = @json($markReadApi ?? '/api/bible/devotional/mark-read');
    const lsKey = 'ck_devotional_read_' + day;

    const btn = document.getElementById('btn-mark-dev-read');
    const label = document.getElementById('mark-dev-label');
    const st = document.getElementById('mark-dev-status');

    function setMarked(text) {
        if (label) label.textContent = 'Devocional lido ✓';
        if (st) st.textContent = text || '✓ Registrado';
        if (btn) {
            btn.style.borderColor = '#10B981';
            btn.style.color = '#10B981';
        }
    }

    if (localStorage.getItem(lsKey) === '1') {
        setMarked('✓ Lido');
    }

    if (btn) {
        btn.addEventListener('click', function() {
            btn.disabled = true;
            if (st) st.textContent = 'Salvando...';

            fetch(markApi, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ day_of_year: day, slug: slug })
            }).then(r => r.json()).then(res => {
                localStorage.setItem(lsKey, '1');
                setMarked('✓ Registrado');
                if (window.BibleApp) window.BibleApp.toast('Devocional marcado como lido!', 'fas fa-check-circle');
            }).catch(() => {
                localStorage.setItem(lsKey, '1');
                setMarked('✓ Salvo localmente');
            }).finally(() => {
                btn.disabled = false;
            });
        });
    }
})();
</script>
@endpush

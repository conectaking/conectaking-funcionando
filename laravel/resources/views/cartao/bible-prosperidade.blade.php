@extends('layouts.bible-app')

@section('title', 'Prosperidade — Ativação ' . $n . ' — Bíblia King')
@section('meta_description', '31 Ativações de Prosperidade Bíblica baseadas no livro de Provérbios.')
@section('speak_target', '#prosperidade-content-box')
@section('speak_title', 'Prosperidade: Ativação ' . $n)

@section('content')
@php
    $a = $ativacao ?? null;
    $sections = [
        ['decreto_entrada', 'Decreto de Entrada', true, 'fa-scroll'],
        ['fundamento_sagrado', 'Fundamento Sagrado', false, 'fa-landmark'],
        ['diagnostico_escassez', 'Extração de Prosperidade', false, 'fa-search-dollar'],
        ['ie_chave', 'Frases de Impacto', false, 'fa-key'],
        ['estrada_com_king', 'Na Estrada com o KING', false, 'fa-road'],
        ['nova_mentalidade', 'Drive de Governo', false, 'fa-brain'],
        ['exercicio_fixacao', 'Protocolo Neuro-Celular', false, 'fa-dumbbell'],
        ['treino_negocios', 'Treino — Negócios', false, 'fa-briefcase'],
        ['treino_altar', 'Treino — Altar', false, 'fa-fire'],
        ['sentenca_ativacao', 'Sentença de Ativação', true, 'fa-crown'],
    ];
@endphp

<div class="reader-container">
    <header class="reader-header">
        <span class="hero-badge-tag" style="margin-bottom:10px;"><i class="fas fa-gem"></i> Do Fracasso ao Legado</span>
        <h1 class="reader-book-title">{{ $a['titulo'] ?? ('Ativação ' . $n) }}</h1>
        <p class="reader-meta-subtitle">31 Ativações Bíblicas em Provérbios · Dia {{ $n }}</p>

        {{-- Seletor Horizontal dos 31 Dias --}}
        <div style="display:flex;gap:6px;overflow-x:auto;padding:16px 0 6px;scrollbar-width:none;-webkit-overflow-scrolling:touch;justify-content:flex-start;">
            @for($i = 1; $i <= 31; $i++)
                <a href="/{{ $slug }}/biblia/prosperidade/{{ $i }}"
                   class="tab-pill {{ (int)$n === $i ? 'active' : '' }}"
                   style="min-width:38px;text-align:center;padding:6px 10px;">
                   {{ $i }}
                </a>
            @endfor
        </div>
    </header>

    @if(!empty($a))
        <div id="prosperidade-content-box">
            @foreach($sections as [$field, $label, $isHighlight, $icon])
                @if(!empty($a[$field]))
                    <div style="margin-bottom:22px;background:var(--bg-card);border:1px solid {{ $isHighlight ? 'var(--border-gold)' : 'var(--border-subtle)' }};border-radius:var(--radius-md);padding:20px 24px;{{ $isHighlight ? 'box-shadow:var(--gold-glow);' : '' }}">
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                            <i class="fas {{ $icon }}" style="color:var(--gold-primary);font-size:1.1rem;"></i>
                            <h3 style="font-family:var(--font-heading);color:{{ $isHighlight ? 'var(--gold-primary)' : 'var(--text-primary)' }};font-size:1.15rem;font-weight:700;margin:0;">
                                {{ $label }}
                            </h3>
                        </div>
                        <div style="font-family:{{ $isHighlight ? 'var(--bible-font-family)' : 'var(--font-ui)' }};font-size:{{ $isHighlight ? '1.18rem' : '0.98rem' }};line-height:1.75;color:var(--text-primary);">
                            {!! nl2br(e($a[$field])) !!}
                        </div>
                    </div>
                @endif
            @endforeach
        </div>

        {{-- Marcar como Lido --}}
        <div style="display:flex;align-items:center;justify-content:space-between;margin:30px 0 20px;padding-top:20px;border-top:1px solid var(--border-subtle);">
            <button type="button" class="btn-verse-action" id="btn-prosp-mark-read" style="background:var(--bg-surface-elevated);border-color:var(--border-gold);padding:10px 20px;font-size:0.95rem;">
                <i class="far fa-check-circle" style="color:var(--gold-primary);"></i>
                <span id="prosp-mark-label">Marcar ativação como concluída</span>
            </button>
            <span id="prosp-mark-status" style="font-size:0.88rem;color:var(--gold-primary);font-weight:600;"></span>
        </div>
    @else
        <div style="text-align:center;padding:50px 20px;background:var(--bg-card);border-radius:var(--radius-lg);margin:20px 0;">
            <i class="fas fa-gem" style="font-size:2.5rem;color:var(--text-muted);margin-bottom:14px;display:block;"></i>
            <h3 style="margin:0 0 10px;font-size:1.2rem;">Ativação {{ $n }}</h3>
            <p style="color:var(--text-secondary);margin-bottom:20px;">{{ $message ?? 'Esta ativação ainda não foi publicada.' }}</p>
        </div>
    @endif

    {{-- Pager Bar --}}
    <nav class="reader-pager-bar" aria-label="Navegação da Prosperidade">
        @if(!empty($prevUrl))
            <a href="{{ $prevUrl }}" class="btn-pager">
                <i class="fas fa-arrow-left"></i>
                <span>Dia {{ (int)$n - 1 }}</span>
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
                <span>Dia {{ (int)$n + 1 }}</span>
                <i class="fas fa-arrow-right"></i>
            </a>
        @else
            <button type="button" class="btn-pager" disabled>
                <span>Fim</span>
                <i class="fas fa-arrow-right"></i>
            </button>
        @endif
    </nav>
</div>
@endsection

@push('scripts')
<script>
(function() {
    const n = @json((int) $n);
    const slug = @json($slug ?? '');
    const lsKey = 'ck_prosp_read_' + n;

    const btn = document.getElementById('btn-prosp-mark-read');
    const label = document.getElementById('prosp-mark-label');
    const st = document.getElementById('prosp-mark-status');

    function setMarked(text) {
        if (label) label.textContent = 'Ativação concluída ✓';
        if (st) st.textContent = text || '✓ Concluído';
        if (btn) {
            btn.style.borderColor = '#10B981';
            btn.style.color = '#10B981';
        }
    }

    if (localStorage.getItem(lsKey) === '1') {
        setMarked('✓ Concluído');
    }

    if (btn) {
        btn.addEventListener('click', function() {
            btn.disabled = true;
            if (st) st.textContent = 'Salvando...';

            fetch('/api/bible/prosperidade/mark-read', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ activation_number: n, slug: slug })
            }).then(r => r.json()).then(res => {
                localStorage.setItem(lsKey, '1');
                setMarked('✓ Registrado no seu perfil');
                if (window.BibleApp) window.BibleApp.toast('Ativação marcada como concluída!', 'fas fa-check-circle');
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

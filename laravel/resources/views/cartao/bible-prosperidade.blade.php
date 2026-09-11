<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Prosperidade — Ativação {{ $n }}</title>
    
    @vite(['resources/css/fonts.css', 'resources/js/pages/cartao-bible-prosperidade.js'])
</head>
<body>
@php
    $a = $ativacao ?? null;
    $sections = [
        ['decreto_entrada', 'Decreto de entrada', true],
        ['fundamento_sagrado', 'Fundamento sagrado', false],
        ['diagnostico_escassez', 'Extração de prosperidade', false],
        ['ie_chave', 'Frases de impacto do KING', false],
        ['estrada_com_king', 'Na estrada com o KING', false],
        ['diretriz_ilustracao', 'Diretriz de ilustração', false],
        ['mentalidade_travada', 'Drive de escassez', false],
        ['nova_mentalidade', 'Drive de governo', false],
        ['exercicio_fixacao', 'Protocolo neuro-celular', false],
        ['treino_negocios', 'Treino — negócios', false],
        ['treino_altar', 'Treino — altar', false],
        ['sentenca_ativacao', 'Sentença de ativação', true],
        ['proximo_episodio', 'Próximo episódio', false],
    ];
@endphp
<div class="wrap">
    <div class="nav">
        <a href="{{ $hubUrl }}">← Bíblia</a>
        <a href="{{ $profileUrl }}">Cartão</a>
        <a href="{{ $todayUrl }}">Hoje</a>
    </div>
    <h1>Prosperidade antes de dormir</h1>
    <p class="sub">Do Fracasso ao Legado — 31 Ativações (Provérbios 1–31)</p>

    <div class="indice">
        @foreach(($activations ?? []) as $item)
            @php $num = (int) ($item['activation_number'] ?? 0); @endphp
            @if($num >= 1)
                <a class="{{ $num === (int)$n ? 'on' : '' }}"
                   href="/{{ $slug }}/biblia/prosperidade/{{ $num }}"
                   title="{{ $item['titulo'] ?? '' }}">{{ $num }}</a>
            @endif
        @endforeach
    </div>

    <div class="pager">
        @if(!empty($prevUrl))<a class="btn secondary" href="{{ $prevUrl }}">← Anterior</a>@endif
        <span class="ck-bp-4b126f">Ativação {{ $n }}</span>
        @if(!empty($nextUrl))<a class="btn secondary" href="{{ $nextUrl }}">Próxima →</a>@endif
        @if(!empty($a))
            <button type="button" class="btn" id="btn-mark-read">Marcar como lido</button>
            <span id="mark-status"></span>
        @endif
    </div>

    @if(!empty($notPublished))
        <p class="warn">{{ $message ?? 'Esta Ativação ainda não foi publicada.' }}</p>
        @if(!empty($nearest['activation_number']))
            <p><a class="btn" href="/{{ $slug }}/biblia/prosperidade/{{ $nearest['activation_number'] }}">
                Abrir Ativação {{ $nearest['activation_number'] }}
            </a></p>
        @endif
    @elseif($a)
        <h1 class="ck-bp-286b21">{{ $a['titulo'] ?? ('Ativação '.$n) }}</h1>
        <p class="sub">{{ $a['proverbs_ref'] ?? ('Provérbios '.$n) }}</p>
        @foreach($sections as [$key, $title, $highlight])
            @php $txt = trim((string) ($a[$key] ?? '')); @endphp
            @if($txt !== '')
                <section class="sec">
                    <h2>{{ $title }}</h2>
                    <div class="body {{ $highlight ? 'decreto' : '' }}">{{ $txt }}</div>
                </section>
            @endif
        @endforeach
    @endif
</div>
@if(!empty($a))
<script>window.__CK_BOOT_BIBLE_PROSPERIDADE = { j0: @json($markReadApi ?? '/api/bible/prosperidade/mark-read'), j1: @json($slug), n2: @json((int) $n) };</script>
@endif
</body>
</html>

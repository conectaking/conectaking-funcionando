<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Prosperidade — Ativação {{ $n }}</title>
    <style>
        body { margin:0; font-family: Georgia, 'Times New Roman', serif; background:#0D0D0F; color:#ECECEC; }
        .wrap { max-width:720px; margin:0 auto; padding:24px 16px 72px; }
        a { color:#FFC700; text-decoration:none; }
        .nav { font-family:system-ui,sans-serif; font-size:.9rem; display:flex; flex-wrap:wrap; gap:12px; margin-bottom:16px; }
        .nav a { color:#A1A1A1; }
        .nav a:hover { color:#FFC700; }
        h1 { font-size:1.35rem; color:#FFC700; margin:0 0 8px; }
        .sub { font-family:system-ui,sans-serif; color:#A1A1A1; font-size:.9rem; margin-bottom:18px; }
        .pager { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:18px; font-family:system-ui,sans-serif; }
        .btn { display:inline-block; padding:9px 14px; background:rgba(255,199,0,.12); border:1px solid rgba(255,199,0,.35);
               border-radius:10px; color:#FFC700; font-weight:600; font-size:.88rem; cursor:pointer; }
        .btn.secondary { background:transparent; color:#A1A1A1; border-color:rgba(255,255,255,.15); }
        .sec { margin:0 0 16px; padding:16px; border-radius:12px; background:rgba(0,0,0,.25); border:1px solid rgba(255,255,255,.08); }
        .sec h2 { margin:0 0 10px; font-size:.95rem; color:#FFC700; }
        .sec p, .sec .body { margin:0; line-height:1.65; white-space:pre-wrap; }
        .decreto { border-left:3px solid #FFC700; padding-left:14px; font-style:italic; }
        .indice { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:16px; }
        .indice a { font-family:system-ui,sans-serif; font-size:.75rem; padding:5px 9px; border-radius:8px;
                    border:1px solid rgba(255,199,0,.25); background:rgba(255,199,0,.06); }
        .indice a.on { background:rgba(255,199,0,.22); color:#0d0d10; font-weight:700; }
        .warn { color:#FFC700; font-family:system-ui,sans-serif; margin-bottom:14px; }
        #mark-status { font-family:system-ui,sans-serif; font-size:.85rem; color:#A1A1A1; margin-left:8px; }
    </style>
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
        <span style="color:#FFC700;font-weight:600">Ativação {{ $n }}</span>
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
        <h1 style="font-size:1.2rem;margin-bottom:4px">{{ $a['titulo'] ?? ('Ativação '.$n) }}</h1>
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

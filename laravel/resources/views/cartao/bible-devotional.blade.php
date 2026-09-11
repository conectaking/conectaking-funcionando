<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Devocional dia {{ $day }} — Bíblia</title>
    
    @vite(['resources/css/fonts.css', 'resources/js/pages/cartao-bible-devotional.js'])
</head>
<body>
<div class="wrap">
    <div class="nav">
        <a href="{{ $hubUrl }}">← Bíblia</a>
        <a href="{{ $profileUrl }}">Cartão</a>
        <a href="{{ $todayUrl }}">Hoje</a>
    </div>
    <div class="day">Devocional 365 · Dia {{ $day }}</div>
    @if(!empty($devotional['tema_mes']) || !empty($devotional['tema_ano']))
        <p style="text-align:center;font-family:system-ui,sans-serif;font-size:.82rem;color:#A1A1A1;margin:0 0 14px;line-height:1.45">
            @if(!empty($devotional['tema_mes']))<span>Tema do mês: <strong style="color:#FFC700">{{ $devotional['tema_mes'] }}</strong></span>@endif
            @if(!empty($devotional['tema_mes']) && !empty($devotional['tema_ano'])) · @endif
            @if(!empty($devotional['tema_ano']))<span>Tema do ano: {{ $devotional['tema_ano'] }}</span>@endif
        </p>
    @endif

    @if($devotional && (
        !empty($devotional['titulo']) || !empty($devotional['versiculo_texto']) || !empty($devotional['reflexao'])
        || !empty($devotional['aplicacao']) || !empty($devotional['oracao'])
    ))
        <h1>{{ $devotional['titulo'] ?: 'Devocional do dia' }}</h1>
        <div class="card">
            @if(!empty($devotional['versiculo_ref']))
                <div class="ref">{{ $devotional['versiculo_ref'] }}</div>
            @endif
            @if(!empty($devotional['versiculo_texto']))
                <div class="verse">{{ $devotional['versiculo_texto'] }}</div>
            @endif
            @if(!empty($devotional['reflexao']))
                <h2>Reflexão</h2>
                <div class="body">{{ $devotional['reflexao'] }}</div>
            @endif
            @if(!empty($devotional['aplicacao']))
                <h2>Aplicação</h2>
                <div class="body">{{ $devotional['aplicacao'] }}</div>
            @endif
            @if(!empty($devotional['oracao']))
                <h2>Oração</h2>
                <div class="body">{{ $devotional['oracao'] }}</div>
            @endif
        </div>
        <div class="actions">
            <button type="button" class="btn-mark" id="btn-mark-read">Marcar como lido</button>
            <span id="mark-status"></span>
        </div>
    @else
        <div class="empty">
            <p>Não há devocional cadastrado para o dia {{ $day }}.</p>
            <p class="ck-mt-12"><a href="{{ $todayUrl }}">Ir para o dia de hoje</a></p>
        </div>
    @endif

    <form class="jump" method="get" action="#" onsubmit="var d=parseInt(this.day.value,10); if(d>=1&&d<=365){ location.href='/{{ $slug }}/biblia/devocional/'+d; } return false;">
        <input name="day" type="number" min="1" max="365" value="{{ $day }}" aria-label="Dia">
        <button type="submit">Ir</button>
    </form>
</div>
<div class="pager">
    @if($prevUrl)
        <a href="{{ $prevUrl }}">← Anterior</a>
    @else
        <span>← Anterior</span>
    @endif
    <a href="{{ $hubUrl }}">Hub</a>
    @if($nextUrl)
        <a href="{{ $nextUrl }}">Próximo →</a>
    @else
        <span>Próximo →</span>
    @endif
</div>
@if($devotional && (
    !empty($devotional['titulo']) || !empty($devotional['versiculo_texto']) || !empty($devotional['reflexao'])
    || !empty($devotional['aplicacao']) || !empty($devotional['oracao'])
))
<script>window.__CK_BOOT_BIBLE_DEVOTIONAL = { j0: @json($readStatusApi ?? '/api/bible/devotional/read-status'), j1: @json($markReadApi ?? '/api/bible/devotional/mark-read'), j2: @json($slug), n3: @json((int) $day) };</script>
@endif
</body>
</html>

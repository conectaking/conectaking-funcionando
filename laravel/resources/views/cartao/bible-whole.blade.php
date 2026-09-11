<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $item['titulo'] ?? 'Bíblia inteira' }} — Dia {{ $day }}</title>
    
    @vite(['resources/css/fonts.css', 'resources/css/pub/pages/cartao-bible-whole.css'])
</head>
<body>
<div class="wrap">
    <div class="nav">
        <a href="{{ $hubUrl }}">← Bíblia</a>
        <a href="{{ $profileUrl }}">Cartão</a>
        <a href="{{ $todayUrl }}">Hoje</a>
    </div>
    <div class="day">Bíblia inteira · Dia {{ $day }} / {{ $totalDays }}</div>
    <h1>{{ $item['titulo'] }}</h1>

    <div class="card">
        @if(!empty($item['verse_ref']))
            <div class="ref">{{ $item['verse_ref'] }}</div>
        @endif
        @if(!empty($item['verse_text']))
            <div class="verse">{{ $item['verse_text'] }}</div>
        @endif
        @if(!empty($item['resumo_capitulo']))
            <h2>Resumo</h2>
            <div class="body">{{ $item['resumo_capitulo'] }}</div>
        @endif
        @if(!empty($item['reflexao']))
            <h2>Reflexão</h2>
            <div class="body">{{ $item['reflexao'] }}</div>
        @endif
        @if(!empty($item['aplicacao']))
            <h2>Aplicação</h2>
            <div class="body">{{ $item['aplicacao'] }}</div>
        @endif
        @if(!empty($item['oracao']))
            <h2>Oração</h2>
            <div class="body">{{ $item['oracao'] }}</div>
        @endif
        <a class="btn" href="{{ $readUrl }}">Ler {{ $item['ref'] }}</a>
    </div>

    <form class="jump" onsubmit="var d=parseInt(this.day.value,10); if(d>=1){ location.href='/{{ $slug }}/biblia/biblia-inteira/'+d; } return false;">
        <input name="day" type="number" min="1" value="{{ $day }}" aria-label="Dia">
        <button type="submit">Ir</button>
    </form>
</div>
<div class="pager">
    @if($prevUrl)<a href="{{ $prevUrl }}">← Anterior</a>@else<span>← Anterior</span>@endif
    <a href="{{ $hubUrl }}">Hub</a>
    <a href="{{ $nextUrl }}">Próximo →</a>
</div>
</body>
</html>

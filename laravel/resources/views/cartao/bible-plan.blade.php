<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Plano dia {{ $day }} — Bíblia</title>
    
    @vite(['resources/css/fonts.css', 'resources/css/pub/pages/cartao-bible-plan.css'])
</head>
<body>
<div class="wrap">
    <div class="nav">
        <a href="{{ $hubUrl }}">← Bíblia</a>
        <a href="{{ $profileUrl }}">Cartão</a>
        <a href="{{ $todayUrl }}">Hoje</a>
    </div>
    <div class="day">Plano de leitura · Dia {{ $day }}</div>
    <h1>{{ $plan['summary'] ?? 'Leitura do dia' }}</h1>

    @if(!empty($plan['book_id']))
        <div class="card">
            <div class="summary">{{ $plan['summary'] }}</div>
            <div class="meta">
                {{ $plan['book_id'] }} · caps. {{ $plan['chapter_from'] }}@if(($plan['chapter_to'] ?? null) && $plan['chapter_to'] != $plan['chapter_from'])–{{ $plan['chapter_to'] }}@endif
                @if(($plan['source'] ?? '') === 'fallback') · gerado @endif
            </div>
            @if(!empty($readUrl))
                <a class="btn" href="{{ $readUrl }}">Abrir leitura</a>
            @endif
        </div>
    @else
        <div class="card"><p style="opacity:.7">Sem capítulos definidos para este dia.</p></div>
    @endif

    @if(!empty($plan['devocional']) && (!empty($plan['devocional']['titulo']) || !empty($plan['devocional']['reflexao'])))
        <div class="card">
            <h2>Devocional do dia</h2>
            @if(!empty($plan['devocional']['titulo']))
                <div style="font-weight:600;margin-bottom:8px">{{ $plan['devocional']['titulo'] }}</div>
            @endif
            @if(!empty($plan['devocional']['versiculo_ref']))
                <div style="color:#FFC700;margin-bottom:8px;font-family:system-ui,sans-serif;font-size:.9rem">{{ $plan['devocional']['versiculo_ref'] }}</div>
            @endif
            @if(!empty($plan['devocional']['reflexao']))
                <div class="body">{{ \Illuminate\Support\Str::limit($plan['devocional']['reflexao'], 400) }}</div>
            @endif
            <a class="btn" href="{{ $devotionalUrl }}">Ler devocional completo</a>
        </div>
    @endif

    <form class="jump" onsubmit="var d=parseInt(this.day.value,10); if(d>=1&&d<=365){ location.href='/{{ $slug }}/biblia/plano/'+d; } return false;">
        <input name="day" type="number" min="1" max="365" value="{{ $day }}">
        <button type="submit">Ir</button>
    </form>
</div>
<div class="pager">
    @if($prevUrl)<a href="{{ $prevUrl }}">← Anterior</a>@else<span>← Anterior</span>@endif
    <a href="{{ $hubUrl }}">Hub</a>
    @if($nextUrl)<a href="{{ $nextUrl }}">Próximo →</a>@else<span>Próximo →</span>@endif
</div>
</body>
</html>

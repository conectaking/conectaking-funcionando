<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Plano dia {{ $day }} — Bíblia</title>
    <style>
        body { margin:0; font-family: Georgia, 'Times New Roman', serif; background:#0D0D0F; color:#ECECEC; min-height:100vh; }
        .wrap { max-width:680px; margin:0 auto; padding:24px 16px 80px; }
        a { color:#FFC700; text-decoration:none; }
        .nav { font-family:system-ui,sans-serif; font-size:.9rem; display:flex; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
        .nav a { color:#A1A1A1; }
        .day { font-family:system-ui,sans-serif; font-size:.85rem; color:#A1A1A1; text-align:center; }
        h1 { font-size:1.35rem; color:#FFC700; text-align:center; margin:8px 0 20px; }
        .card { background:rgba(28,28,33,.95); border:1px solid rgba(255,199,0,.2); border-radius:16px; padding:24px 20px; margin-bottom:16px; }
        .summary { font-size:1.2rem; margin-bottom:12px; }
        .meta { font-family:system-ui,sans-serif; font-size:.85rem; opacity:.65; }
        .btn { display:inline-block; margin-top:14px; padding:10px 16px; background:rgba(255,199,0,.15);
               border:1px solid rgba(255,199,0,.4); border-radius:10px; color:#FFC700; font-family:system-ui,sans-serif; font-weight:600; }
        h2 { font-family:system-ui,sans-serif; font-size:.95rem; color:#FFC700; margin:0 0 8px; }
        .body { line-height:1.7; white-space:pre-wrap; }
        .pager { position:fixed; left:0; right:0; bottom:0; background:rgba(13,13,15,.92); border-top:1px solid #2a2a30;
                 display:flex; justify-content:space-between; padding:12px 16px; font-family:system-ui,sans-serif; }
        .pager span { opacity:.35; }
        form.jump { display:flex; gap:8px; justify-content:center; margin-top:16px; font-family:system-ui,sans-serif; }
        form.jump input { width:72px; padding:8px; border-radius:8px; border:1px solid #333; background:#111; color:#ECECEC; }
        form.jump button { padding:8px 12px; border:0; border-radius:8px; background:#FFC700; color:#111; font-weight:700; cursor:pointer; }
    </style>
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

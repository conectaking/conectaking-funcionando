<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $item['titulo'] ?? 'Bíblia inteira' }} — Dia {{ $day }}</title>
    <style>
        body { margin:0; font-family: Georgia, 'Times New Roman', serif; background:#0D0D0F; color:#ECECEC; min-height:100vh; }
        .wrap { max-width:680px; margin:0 auto; padding:24px 16px 80px; }
        a { color:#FFC700; text-decoration:none; }
        .nav { font-family:system-ui,sans-serif; font-size:.9rem; display:flex; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
        .nav a { color:#A1A1A1; }
        .day { font-family:system-ui,sans-serif; font-size:.85rem; color:#A1A1A1; text-align:center; }
        h1 { font-size:1.3rem; color:#FFC700; text-align:center; margin:8px 0 18px; }
        .card { background:rgba(28,28,33,.95); border:1px solid rgba(255,199,0,.2); border-radius:16px; padding:22px 18px; margin-bottom:14px; }
        .ref { color:#FFC700; font-family:system-ui,sans-serif; font-size:.9rem; margin-bottom:10px; }
        .verse { font-size:1.1rem; line-height:1.7; font-style:italic; margin-bottom:14px; }
        h2 { font-family:system-ui,sans-serif; font-size:.92rem; color:#FFC700; margin:18px 0 8px; }
        .body { line-height:1.7; white-space:pre-wrap; }
        .btn { display:inline-block; margin-top:14px; padding:10px 16px; background:rgba(255,199,0,.15);
               border:1px solid rgba(255,199,0,.4); border-radius:10px; color:#FFC700; font-family:system-ui,sans-serif; font-weight:600; }
        .pager { position:fixed; left:0; right:0; bottom:0; background:rgba(13,13,15,.92); border-top:1px solid #2a2a30;
                 display:flex; justify-content:space-between; padding:12px 16px; font-family:system-ui,sans-serif; }
        .pager span { opacity:.35; }
        form.jump { display:flex; gap:8px; justify-content:center; margin-top:16px; font-family:system-ui,sans-serif; }
        form.jump input { width:88px; padding:8px; border-radius:8px; border:1px solid #333; background:#111; color:#ECECEC; }
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

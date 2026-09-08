<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Salmo do dia — Bíblia</title>
    <style>
        body { margin:0; font-family: Georgia, 'Times New Roman', serif; background:#0D0D0F; color:#ECECEC; min-height:100vh; }
        .wrap { max-width:680px; margin:0 auto; padding:24px 16px 64px; }
        a { color:#FFC700; text-decoration:none; }
        .nav { font-family:system-ui,sans-serif; font-size:.9rem; display:flex; gap:14px; margin-bottom:18px; }
        .nav a { color:#A1A1A1; }
        .nav a:hover { color:#FFC700; }
        h1 { font-size:1.4rem; color:#FFC700; text-align:center; margin:0 0 20px; }
        .card { background:rgba(28,28,33,.95); border:1px solid rgba(255,199,0,.2); border-radius:16px; padding:24px 20px; }
        .ref { color:#FFC700; margin-bottom:12px; font-family:system-ui,sans-serif; }
        .texto { font-size:1.15rem; line-height:1.75; margin-bottom:16px; }
        .reflexao { opacity:.85; line-height:1.65; }
        .btn { display:inline-block; margin-top:18px; padding:10px 16px; background:rgba(255,199,0,.15);
               border:1px solid rgba(255,199,0,.4); border-radius:10px; color:#FFC700; font-family:system-ui,sans-serif; font-weight:600; }
    </style>
</head>
<body>
<div class="wrap">
    <div class="nav">
        <a href="{{ $hubUrl }}">← Bíblia</a>
        <a href="{{ $profileUrl }}">Cartão</a>
    </div>
    <h1>Salmo do dia</h1>
    @if(!empty($salmo['texto']))
        <div class="card">
            @if(!empty($salmo['ref']))<div class="ref">{{ $salmo['ref'] }}</div>@endif
            <div class="texto">{{ $salmo['texto'] }}</div>
            @if(!empty($salmo['reflexao']))
                <div class="reflexao">{{ $salmo['reflexao'] }}</div>
            @endif
            @if(!empty($readUrl))
                <a class="btn" href="{{ $readUrl }}">Ler no Salmos</a>
            @endif
        </div>
    @else
        <p style="text-align:center;opacity:.7">Salmo não disponível.</p>
    @endif
</div>
</body>
</html>

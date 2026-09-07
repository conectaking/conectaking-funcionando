<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bíblia — {{ $slug }}</title>
    <style>
        body { margin:0; font-family: Georgia, serif; background:#0D0D0F; color:#ECECEC; }
        .wrap { max-width: 720px; margin: 0 auto; padding: 32px 16px 64px; }
        a { color: #FFC700; }
        .verse { background:#16161a; border-radius:16px; padding:24px; margin:24px 0; line-height:1.6; }
        .ref { color:#FFC700; font-size:.95rem; margin-top:12px; }
        h1 { font-weight:600; letter-spacing:.02em; }
    </style>
</head>
<body>
<div class="wrap">
    <p><a href="{{ $profileUrl }}">← Voltar ao cartão</a></p>
    <h1>Bíblia</h1>
    <p>Tradução: {{ strtoupper($translation) }}</p>
    @if(!empty($verse))
        <div class="verse">
            <div>{{ is_array($verse) ? ($verse['texto'] ?? $verse['text'] ?? $verse['verse'] ?? '') : $verse }}</div>
            @if(is_array($verse) && (!empty($verse['referencia']) || !empty($verse['reference'])))
                <div class="ref">{{ $verse['referencia'] ?? $verse['reference'] }}</div>
            @endif
        </div>
    @endif
    <p>Hub Laravel (satélite). Leitura completa por capítulo continua disponível no Node enquanto a migração avança.</p>
</div>
</body>
</html>

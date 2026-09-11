<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Salmo do dia — Bíblia</title>
    
    @vite(['resources/css/fonts.css', 'resources/css/pub/pages/cartao-bible-salmo.css'])
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

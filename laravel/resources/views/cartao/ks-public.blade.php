<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $og['ogTitle'] ?? (($gallery['nome_projeto'] ?? 'Galeria').' — King Selection') }}</title>
    @if(!empty($og['ogDescription']))
        <meta name="description" content="{{ $og['ogDescription'] }}">
        <meta property="og:description" content="{{ $og['ogDescription'] }}">
        <meta name="twitter:description" content="{{ $og['ogDescription'] }}">
    @endif
    @if(!empty($og['canonicalUrl']))
        <meta property="og:url" content="{{ $og['canonicalUrl'] }}">
        <link rel="canonical" href="{{ $og['canonicalUrl'] }}">
    @endif
    <meta property="og:title" content="{{ $og['ogTitle'] ?? ($gallery['nome_projeto'] ?? 'King Selection') }}">
    <meta property="og:type" content="website">
    @if(!empty($og['ogImage']))
        <meta property="og:image" content="{{ $og['ogImage'] }}">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:image" content="{{ $og['ogImage'] }}">
    @endif
    
    @vite(['resources/css/fonts.css', 'resources/js/pages/cartao-ks-public.js'])
</head>
<body>
<div class="wrap">
    <div class="badge">{{ $statusLabel }}</div>
    <h1>{{ $gallery['nome_projeto'] ?: 'King Selection' }}</h1>
    <p class="meta">{{ (int) ($gallery['total_photos'] ?? 0) }} foto(s)
        @if(!empty($gallery['access_mode'])) · {{ $gallery['access_mode'] }}@endif
    </p>
    <img class="cover" src="{{ $coverUrl }}" alt="" loading="lazy" onerror="this.style.display='none'">
    <div>
        <a class="btn" href="{{ $spaUrl }}">Abrir galeria (completa)</a>
    </div>
    <p class="note">Landing Laravel. Use <code>?landing=1</code> nesta URL; a galeria completa é a SPA (padrão).</p>
</div>
<script>window.__CK_BOOT_KS_PUBLIC = { j0: @json($gallery['access_mode'] ?? 'private'), j1: @json(!empty($gallery['allow_self_signup'])), j2: @json(!empty($gallery['allow_client_edit_request'])) };</script>

</body>
</html>

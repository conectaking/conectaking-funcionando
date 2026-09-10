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
    <style>
        body { margin:0; font-family: system-ui, sans-serif; background:#0D0D0F; color:#ECECEC; min-height:100vh; }
        .wrap { max-width:560px; margin:0 auto; padding:32px 16px 64px; text-align:center; }
        h1 { font-size:1.6rem; color:#FFC700; margin:0 0 8px; }
        .meta { opacity:.7; font-size:.95rem; margin-bottom:20px; }
        .cover { width:100%; max-height:360px; object-fit:cover; border-radius:16px; background:#16161a; margin:0 0 20px; }
        .badge { display:inline-block; padding:6px 12px; border-radius:999px; background:rgba(255,199,0,.12);
                 border:1px solid rgba(255,199,0,.35); color:#FFC700; font-size:.85rem; margin-bottom:16px; }
        .btn { display:inline-block; margin-top:8px; padding:14px 22px; background:#FFC700; color:#111; font-weight:700;
               border-radius:12px; text-decoration:none; }
        .btn.secondary { background:transparent; color:#FFC700; border:1px solid rgba(255,199,0,.4); margin-left:8px; }
        .note { margin-top:28px; font-size:.85rem; opacity:.55; line-height:1.5; }
    </style>
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

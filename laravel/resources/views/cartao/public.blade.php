<!DOCTYPE html>
<html lang="pt-BR" style="background-color: {{ $details['background_color'] ?? '#0D0D0F' }};">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <title>{{ $details['display_name'] ?? 'Conecta King' }}</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    {{-- CSS do cartão Node (mesma origem via proxy /l) --}}
    <link rel="stylesheet" href="/css/profile.css?v=laravel-card-1">
    <meta property="og:title" content="{{ $details['display_name'] ?? 'Conecta King' }}">
    <meta property="og:description" content="{{ $ogDescription }}">
    <meta property="og:image" content="{{ $ogImageUrl }}">
    <meta property="og:url" content="{{ $ogPageUrl }}">
    <style>
        body, h1, p, span { font-family: '{{ $details['font_family'] ?? 'Inter' }}', sans-serif !important; }
        .profile-name, .profile-bio { color: {{ $details['text_color'] ?? '#ECECEC' }} !important; }
        .ck-laravel-banner {
            position: sticky; top: 0; z-index: 50; text-align: center;
            font-size: 11px; letter-spacing: .02em; padding: 6px 10px;
            background: rgba(0,0,0,.55); color: #f5f5f5;
        }
        .ck-item-btn {
            display: flex; align-items: center; justify-content: center; gap: 10px;
            width: 100%; max-width: 420px; margin: 0 auto 12px;
            padding: 14px 16px; border-radius: 14px; text-decoration: none;
            background: {{ $details['button_color'] ?? '#2a2a2e' }};
            color: {{ $details['text_color'] ?? '#ECECEC' }};
            font-weight: 600;
        }
        .ck-banner-img { width: 100%; max-width: 420px; margin: 0 auto 14px; display: block; border-radius: 12px; }
        .ck-wrap { max-width: 480px; margin: 0 auto; padding: 24px 16px 48px; text-align: center; }
        .ck-avatar {
            width: 110px; height: 110px; object-fit: cover; margin: 12px auto;
            border-radius: {{ ($details['avatar_format'] ?? 'circular') === 'square' ? '16px' : '50%' }};
        }
        .ck-logo { max-height: {{ (int)($details['company_logo_size'] ?? 60) }}px; margin-bottom: 10px; }
    </style>
</head>
<body>
@if(!empty($laravel_preview))
    <div class="ck-laravel-banner">Prévia Laravel · cartão virtual (rota /l/card) — produção continua em /{{ $profile_slug }}</div>
@endif

<div class="ck-wrap">
    @if(!empty($details['company_logo_url']))
        @php $logoHref = $details['company_logo_link'] ?? null; @endphp
        @if($logoHref)
            <a href="{{ $logoHref }}" target="_blank" rel="noopener noreferrer">
                <img class="ck-logo" src="{{ $details['company_logo_url'] }}" alt="Logo">
            </a>
        @else
            <img class="ck-logo" src="{{ $details['company_logo_url'] }}" alt="Logo">
        @endif
    @endif

    @if(!empty($details['profile_image_url']))
        <img class="ck-avatar" src="{{ $details['profile_image_url'] }}" alt="{{ $details['display_name'] ?? '' }}">
    @endif

    <h1 class="profile-name" style="font-size:1.5rem;margin:8px 0;">{{ $details['display_name'] ?? '' }}</h1>
    @if(!empty($details['bio']))
        <p class="profile-bio" style="opacity:.9;margin:0 0 20px;">{{ $details['bio'] }}</p>
    @endif

    @foreach($items as $item)
        @php
            $type = $item['item_type'] ?? 'link';
            $title = $item['title'] ?? $type;
            $url = $item['destination_url'] ?? '#';
            if ($type === 'whatsapp' && $url && !str_starts_with($url, 'http')) {
                $digits = preg_replace('/\D+/', '', $url);
                $url = $digits ? 'https://wa.me/'.$digits : '#';
            }
            if ($type === 'email' && $url && !str_contains($url, 'mailto:')) {
                $url = 'mailto:'.$url;
            }
        @endphp

        @if($type === 'banner' && !empty($item['image_url']))
            @if(!empty($item['destination_url']))
                <a href="{{ $item['destination_url'] }}" target="_blank" rel="noopener noreferrer">
                    <img class="ck-banner-img" src="{{ $item['image_url'] }}" alt="{{ $title }}">
                </a>
            @else
                <img class="ck-banner-img" src="{{ $item['image_url'] }}" alt="{{ $title }}">
            @endif
        @elseif($type !== 'banner')
            <a class="ck-item-btn" href="{{ $url }}" target="_blank" rel="noopener noreferrer">
                <span>{{ $title }}</span>
            </a>
        @endif
    @endforeach
</div>
</body>
</html>

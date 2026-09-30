@php
    $d = $details;
    $btn = $d['button_color_rgb'] ?? ['r' => 20, 'g' => 20, 'b' => 23];
    $card = $d['card_color_rgb'] ?? ['r' => 20, 'g' => 20, 'b' => 23];
    $avatarFormat = $d['avatar_format'] ?? 'circular';
    $avatarClass = 'profile-avatar avatar-' . $avatarFormat;
    $cardLayout = (strtolower((string)($d['card_layout'] ?? 'classic')) === 'vitrine') ? 'vitrine' : 'classic';
    $btnFontRaw = $d['button_font_size'] ?? '1rem';
    $btnFont = is_numeric($btnFontRaw) ? ($btnFontRaw . 'px') : $btnFontRaw;
    $btnText = $d['button_text_color'] ?? '#FFFFFF';
    $textColor = $d['text_color'] ?? '#ECECEC';
    $font = $d['font_family'] ?? 'Inter';
    $bgColor = $d['background_color'] ?? '#0D0D0F';
    $hasBgImage = (($d['background_type'] ?? '') === 'image') && !empty($d['background_image_url']);
    $bgOpacity = $d['background_image_opacity'] ?? 1;
    $showVcard = !empty($d['show_vcard_button']);
    $mapUrl = trim((string)($d['map_url'] ?? $d['location_url'] ?? $d['google_maps_url'] ?? ''));
    $logoSize = (int)($d['company_logo_size'] ?? 60);
    // Se houver item de localização na lista, o card de mapa já será exibido lá;
    // nesse caso, ocultar o botão genérico "Ver no Mapa" para evitar duplicidade.
    $hasLocationItem = collect($items)->contains(fn($it) => ($it['item_type'] ?? '') === 'location');
@endphp
<!DOCTYPE html>
<html lang="pt-BR" class="ck-page-bg">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta http-equiv="Cache-Control" content="public, max-age=30">
    <meta http-equiv="Pragma" content="cache">
    <title>{{ $d['display_name'] ?? 'Conecta King' }}</title>
    <meta name="theme-color" content="{{ $bgColor }}">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="apple-touch-icon" href="{{ $ogImageUrl ?? 'https://i.ibb.co/60sW9k75/logo.png' }}">
    <link rel="manifest" href="/{{ $profile_slug ?? '' }}/manifest.json">
    <meta name="apple-mobile-web-app-title" content="{{ $d['display_name'] ?? 'Meu Cartão' }}">
    @vite(['resources/css/fontawesome.css', 'resources/css/fonts.css', 'resources/js/pages/cartao-public.js'])
<meta property="og:title" content="{{ $d['display_name'] ?? 'Conecta King' }}">
<meta property="og:description" content="{{ $ogDescription }}">
<meta property="og:image" content="{{ $ogImageUrl }}">
<meta property="og:url" content="{{ $ogPageUrl }}">
<meta name="twitter:card" content="summary_large_image">
<meta name="description" content="{{ $ogDescription }}">
    <style nonce="{{ $cspNonce ?? '' }}">
        :root {
            --page-bg: {{ $bgColor }};
            --bg-overlay-opacity: {{ $bgOpacity }};
            --ck-font: '{{ $font }}', sans-serif;
            --ck-text: {{ $textColor }};
            --btn-r: {{ $btn['r'] }};
            --btn-g: {{ $btn['g'] }};
            --btn-b: {{ $btn['b'] }};
            --btn-opacity: {{ $d['button_opacity'] ?? 1 }};
            --btn-border-radius: {{ $d['button_border_radius'] ?? '12px' }};
            --card-r: {{ $card['r'] }};
            --card-g: {{ $card['g'] }};
            --card-b: {{ $card['b'] }};
            --card-opacity: {{ $d['card_opacity'] ?? 1 }};
            --btn-font-size: {{ $btnFont }};
            --btn-text: {{ $btnText }};
            --btn-align: {{ $alignValue ?? 'center' }};
            --btn-text-align: {{ ($alignValue ?? 'center') === 'flex-end' ? 'right' : (($alignValue ?? 'center') === 'center' ? 'center' : 'left') }};
            --logo-max: {{ max(24, min($logoSize, 90)) }}px;
        html.ck-page-bg { background-color: var(--page-bg); }
        html {
            overflow-x: hidden !important;
            overflow-y: auto !important;
            min-height: 100% !important;
            height: auto !important;
            -webkit-overflow-scrolling: touch !important;
        }
        body {
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            min-height: 100% !important;
            height: auto !important;
        }
        .profile-page-wrapper {
            overflow: visible !important;
        }
        .background-image-overlay-wrapper {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            z-index: -9999;
            pointer-events: none;
            -webkit-transform: translate3d(0, 0, 0);
            transform: translate3d(0, 0, 0);
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
            will-change: transform;
        }
        .background-image-blur-backdrop {
            display: none !important;
        }
        .background-image-overlay-img {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center center;
            opacity: var(--bg-overlay-opacity);
            pointer-events: none;
            user-select: none;
            -webkit-user-drag: none;
            -webkit-transform: translate3d(0, 0, 0);
            transform: translate3d(0, 0, 0);
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
        }
        .wifi-ssid-value { display: block; }
        .profile-link-logo--sized { object-fit: contain; }
        .profile-link-logo--rounded, .profile-link-logo--circle { object-fit: contain; border-radius: 50%; }
        .profile-link-logo--square { object-fit: contain; border-radius: 6px; }
        .carousel-wrapper-public { display: flex; width: calc(var(--ck-carousel-n, 1) * 100%); }
        .carousel-slide-public { width: calc(100% / var(--ck-carousel-n, 1)); flex-shrink: 0; }
        .profile-link, .profile-button-pix, .profile-button-pix-qrcode {
            position: relative !important;
            display: flex !important;
            align-items: center !important;
            justify-content: var(--btn-align, center) !important;
            border-radius: var(--btn-border-radius, 12px) !important;
            background-color: rgba(var(--btn-r), var(--btn-g), var(--btn-b), var(--btn-opacity)) !important;
            color: var(--btn-text) !important;
            font-size: var(--btn-font-size) !important;
            gap: 10px !important;
        }
        @if(($logoAlign ?? 'center') === 'left' && ($buttonAlign ?? 'center') === 'center')
        .profile-link > i, .profile-link > .profile-link-logo,
        .profile-button-pix > i, .profile-button-pix > .profile-link-logo,
        .profile-button-pix-qrcode > i, .profile-button-pix-qrcode > .profile-link-logo {
            position: absolute !important;
            left: 16px !important;
            right: auto !important;
            margin: 0 !important;
        }
        .profile-link > span, .profile-button-pix > span, .profile-button-pix-qrcode > span {
            width: 100% !important;
            text-align: center !important;
            margin: 0 !important;
        }
        @elseif(($logoAlign ?? 'center') === 'right')
        .profile-link, .profile-button-pix, .profile-button-pix-qrcode {
            flex-direction: row-reverse !important;
        }
        @if(($buttonAlign ?? 'center') === 'center')
        .profile-link > i, .profile-link > .profile-link-logo,
        .profile-button-pix > i, .profile-button-pix > .profile-link-logo,
        .profile-button-pix-qrcode > i, .profile-button-pix-qrcode > .profile-link-logo {
            position: absolute !important;
            right: 16px !important;
            left: auto !important;
            margin: 0 !important;
        }
        .profile-link > span, .profile-button-pix > span, .profile-button-pix-qrcode > span {
            width: 100% !important;
            text-align: center !important;
            margin: 0 !important;
        }
        @else
        .profile-link > i, .profile-link > .profile-link-logo,
        .profile-button-pix > i, .profile-button-pix > .profile-link-logo,
        .profile-button-pix-qrcode > i, .profile-button-pix-qrcode > .profile-link-logo {
            position: static !important;
            margin: 0 !important;
        }
        .profile-link > span, .profile-button-pix > span, .profile-button-pix-qrcode > span {
            text-align: var(--btn-text-align, {{ $buttonAlign ?? 'left' }}) !important;
            margin: 0 !important;
        }
        @endif
        @else
        .profile-link > i, .profile-link > .profile-link-logo,
        .profile-button-pix > i, .profile-button-pix > .profile-link-logo,
        .profile-button-pix-qrcode > i, .profile-button-pix-qrcode > .profile-link-logo {
            position: static !important;
            margin: 0 !important;
        }
        .profile-link > span, .profile-button-pix > span, .profile-button-pix-qrcode > span {
            text-align: var(--btn-text-align, center) !important;
            margin: 0 !important;
        }
        @endif
    </style>
</head>
<body>
@if(!empty($laravel_preview))
@endif

@if($hasBgImage)
    <div class="background-image-overlay-wrapper" aria-hidden="true">
        <div class="background-image-blur-backdrop" style="background-image: url('{{ $d['background_image_url'] }}');"></div>
        <img class="background-image-overlay-img" src="{{ $d['background_image_url'] }}" alt="" decoding="async">
    </div>
@endif

<div class="profile-page-wrapper profile-layout-{{ $cardLayout }}" data-profile-slug="{{ $profile_slug ?? '' }}">
    <div class="profile-card">
        <button type="button" class="share-button-corner" id="share-btn" title="Compartilhar">
            <i class="fas fa-share-alt"></i>
        </button>

        @php
            $heroUrl = trim((string) ($d['vitrine_hero_url'] ?? ''));
            $marqueeText = trim((string) ($d['vitrine_marquee_text'] ?? ''));
            $marqueeSpeed = strtolower((string) ($d['vitrine_marquee_speed'] ?? 'normal'));
            if (! in_array($marqueeSpeed, ['slow', 'normal', 'fast'], true)) {
                $marqueeSpeed = 'normal';
            }
            $marqueeBgType = strtolower((string) ($d['vitrine_marquee_bg_type'] ?? 'solid')) === 'gradient' ? 'gradient' : 'solid';
            $marqueeC1 = $d['vitrine_marquee_color1'] ?? '#2A2A2E';
            $marqueeC2 = $d['vitrine_marquee_color2'] ?? '#FFC700';
            $marqueeTextColor = $d['vitrine_marquee_text_color'] ?? '#FFC700';
            $marqueeLogos = $d['vitrine_marquee_logos'] ?? [];
            if (is_string($marqueeLogos)) {
                $decoded = json_decode($marqueeLogos, true);
                $marqueeLogos = is_array($decoded) ? $decoded : [];
            }
            if (! is_array($marqueeLogos)) {
                $marqueeLogos = [];
            }
            $marqueeLogos = array_values(array_filter(array_map(static function ($u) {
                $u = trim((string) $u);
                return $u !== '' ? $u : null;
            }, $marqueeLogos)));
            $marqueeStyle = $marqueeBgType === 'gradient'
                ? 'background:linear-gradient(90deg,'.$marqueeC1.','.$marqueeC2.');--vitrine-marquee-text:'.$marqueeTextColor
                : 'background:'.$marqueeC1.';--vitrine-marquee-text:'.$marqueeTextColor;
            $hasMarquee = ($marqueeText !== '' || count($marqueeLogos) > 0);
        @endphp

        @if($cardLayout === 'vitrine')
            <header class="vitrine-hero-header">
                <div class="vitrine-hero-media">
                    @if($heroUrl !== '')
                        <img class="vitrine-hero-img" src="{{ $heroUrl }}" alt="{{ $d['display_name'] ?? 'Vitrine' }}" loading="eager" decoding="async" fetchpriority="high">
                    @else
                        <div class="vitrine-hero-placeholder">
                            <strong>{{ $d['display_name'] ?? 'Vitrine' }}</strong>
                            <span>Arte do topo</span>
                        </div>
                    @endif
                </div>
            </header>
            @if($hasMarquee)
                <div class="vitrine-marquee vitrine-marquee--{{ $marqueeSpeed }}" style="{{ $marqueeStyle }}">
                    <div class="vitrine-marquee-track">
                        @for($loopN = 0; $loopN < 2; $loopN++)
                            <div class="vitrine-marquee-group">
                                @foreach($marqueeLogos as $logoUrl)
                                    <img class="vitrine-marquee-logo" src="{{ $logoUrl }}" alt="" decoding="async">
                                @endforeach
                                @if($marqueeText !== '')
                                    <span class="vitrine-marquee-text">{{ $marqueeText }}</span>
                                @endif
                                <span class="vitrine-marquee-sep" aria-hidden="true">•</span>
                            </div>
                        @endfor
                    </div>
                </div>
            @endif
        @else
            <header class="profile-header{{ trim((string) ($d['bio'] ?? '')) === '' ? ' profile-header--no-bio' : '' }}">
                <div class="ck-cp-5c6489">
                    @if(in_array($avatarFormat, ['square-full', 'square-small', 'portrait', 'banner'], true))
                        <img src="{{ $d['profile_image_url'] ?? 'https://avatar.iran.liara.run/public/boy' }}"
                             alt="Foto de Perfil" class="{{ $avatarClass }} avatar-with-gradient ck-cp-9380eb" loading="lazy" decoding="async"
                             style="-webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 50%, rgba(0, 0, 0, 0.9) 68%, rgba(0, 0, 0, 0.6) 82%, rgba(0, 0, 0, 0.2) 92%, transparent 100%); mask-image: linear-gradient(to bottom, #000 0%, #000 50%, rgba(0, 0, 0, 0.9) 68%, rgba(0, 0, 0, 0.6) 82%, rgba(0, 0, 0, 0.2) 92%, transparent 100%);"
                            >
                    @else
                        <img src="{{ $d['profile_image_url'] ?? 'https://avatar.iran.liara.run/public/boy' }}"
                             alt="Foto de Perfil" class="{{ $avatarClass }} ck-cp-90b3e1" loading="eager" decoding="async" fetchpriority="high"
                            >
                    @endif
                </div>
                <h1 class="profile-name">{{ $d['display_name'] ?? 'Nome do Usuário' }}</h1>
                @if(trim((string) ($d['bio'] ?? '')) !== '')
                    @php $bioText = trim((string) $d['bio']); $bioLong = mb_strlen($bioText) > 140; @endphp
                    <p class="profile-bio{{ $bioLong ? ' profile-bio--clamp' : '' }}" id="profile-bio">{{ $bioText }}</p>
                    @if($bioLong)
                        <button type="button" class="profile-bio-toggle" id="profile-bio-toggle" aria-expanded="false">Ver mais</button>
                    @endif
                @endif
            </header>
            @if($hasMarquee)
                <div class="vitrine-marquee vitrine-marquee--classic vitrine-marquee--{{ $marqueeSpeed }}" style="{{ $marqueeStyle }}; margin-bottom: 16px; border-radius: 8px;">
                    <div class="vitrine-marquee-track">
                        @for($loopN = 0; $loopN < 2; $loopN++)
                            <div class="vitrine-marquee-group">
                                @foreach($marqueeLogos as $logoUrl)
                                    <img class="vitrine-marquee-logo" src="{{ $logoUrl }}" alt="" decoding="async">
                                @endforeach
                                @if($marqueeText !== '')
                                    <span class="vitrine-marquee-text">{{ $marqueeText }}</span>
                                @endif
                                <span class="vitrine-marquee-sep" aria-hidden="true">•</span>
                            </div>
                        @endfor
                    </div>
                </div>
            @endif
        @endif

        @php
            $vd = $verseDisplay ?? ['position' => 'top', 'size' => 'normal'];
            $versePos = ($vd['position'] ?? 'top') === 'bottom' ? 'bottom' : 'top';
            $verseSize = in_array(($vd['size'] ?? 'normal'), ['small', 'xsmall'], true) ? $vd['size'] : 'normal';
            $hasVerse = !empty($verseOfDay['texto']);
        @endphp

        @if($hasVerse && $versePos === 'top')
            <a href="/{{ $profile_slug }}/biblia" class="verse-of-day-box verse-size-{{ $verseSize }} ck-cp-c9458d" title="Abrir Bíblia">
                <div class="verse-of-day-ref">{{ $verseOfDay['ref'] ?? 'Versículo do Dia' }}</div>
                <div class="verse-of-day-text">"{{ $verseOfDay['texto'] }}"</div>
                @if(!empty($verseOfDay['reflexao']))
                    <div class="verse-of-day-reflexao">{{ $verseOfDay['reflexao'] }}</div>
                @endif
                <div class="ck-cp-114bb6">Abrir Bíblia →</div>
            </a>
        @endif

        @if($showVcard || ($mapUrl !== '' && !$hasLocationItem))
            <div class="profile-actions">
                @if($showVcard)
                    <a href="/vcard/{{ $profile_slug }}" class="profile-link" id="save-contact-btn">
                        <i class="fas fa-address-card"></i>
                        <span>Salvar Contato</span>
                    </a>
                @endif
                @if($mapUrl !== '' && !$hasLocationItem)
                    <a href="{{ $mapUrl }}" class="profile-link" target="_blank" rel="noopener noreferrer">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>Ver no Mapa</span>
                    </a>
                @endif
            </div>
        @endif

        <section class="profile-items-container">
            @foreach($items as $item)
                @php
                    $type = $item['item_type'] ?? 'link';
                    $title = trim((string)($item['title'] ?? ''));
                    $icon = \App\Support\SafeIconClass::sanitize($item['icon_class'] ?? null, 'fas fa-link');
                    $url = \App\Support\SafeUrl::publicHref($item['destination_url'] ?? '');
                    $img = trim((string)($item['image_url'] ?? ''));
                @endphp

                @if($type === 'bible')
                    <a href="/{{ $profile_slug }}/biblia" class="profile-link" data-item-id="{{ $item['id'] ?? '' }}">
                        <i class="{{ \App\Support\SafeIconClass::sanitize($item['icon_class'] ?? null, 'fas fa-bible') }}"></i>
                        <span>{{ $title !== '' ? $title : 'Bíblia' }}</span>
                    </a>

                @elseif($type === 'king_selection')
                    <a href="@safeUrl($item['ks_public_url'] ?? '#')" class="profile-link" target="_blank" rel="noopener noreferrer" data-item-id="{{ $item['id'] ?? '' }}">
                        <i class="{{ \App\Support\SafeIconClass::sanitize($item['icon_class'] ?? null, 'fas fa-images') }}"></i>
                        <span>{{ $title !== '' ? $title : 'King Selection' }}</span>
                    </a>

                @elseif($type === 'banner')
                    @php $primary = \App\Support\SafeUrl::publicHref($item['primary_url'] ?? $url); @endphp
                    <div class="profile-banner-container">
                        @if($primary && $primary !== '#')
                            <a href="{{ $primary }}" target="_blank" rel="noopener noreferrer" data-item-id="{{ $item['id'] ?? '' }}">
                                <img src="{{ $img }}" alt="{{ $title !== '' ? $title : 'Banner' }}" loading="lazy" decoding="async">
                            </a>
                        @else
                            <img src="{{ $img }}" alt="{{ $title !== '' ? $title : 'Banner' }}" loading="lazy" decoding="async">
                        @endif
                    </div>

                @elseif($type === 'carousel')
                    @php
                        $slides = $item['carousel_images'] ?? [];
                        $carouselId = 'carousel-'.($item['id'] ?? uniqid());
                        $n = max(count($slides), 1);
                    @endphp
                    @if(count($slides) > 0)
                        <div class="carousel-container-public" id="{{ $carouselId }}" data-slides="{{ count($slides) }}" data-n="{{ $n }}">
                            <div class="carousel-wrapper-public" data-n="{{ $n }}">
                                @foreach($slides as $slide)
                                    <div class="carousel-slide-public">
                                        <img src="{{ $slide }}" alt="{{ $title !== '' ? $title : 'Carrossel' }}" loading="lazy">
                                    </div>
                                @endforeach
                            </div>
                            @if(count($slides) > 1)
                                <div class="carousel-indicators-public">
                                    @foreach($slides as $idx => $_)
                                        <button type="button" class="carousel-indicator-public {{ $idx === 0 ? 'active' : '' }}" data-index="{{ $idx }}" aria-label="Slide {{ $idx + 1 }}"></button>
                                    @endforeach
                                </div>
                            @endif
                        </div>
                    @endif

                @elseif($type === 'sales_page')
                    @php
                        $spUrl = \App\Support\SafeUrl::publicHref($item['sales_page_url'] ?? '#');
                        $spTitle = $title !== '' ? $title : 'Página de Vendas';
                        $spHasLogo = $img !== '' && !str_contains($img, 'placeholder');
                        $spLogoSize = (int)($item['logo_size'] ?? 24);
                    @endphp
                    @if(($item['sales_page_display_format'] ?? 'button') === 'banner' && !empty($item['sales_page_banner_image_url']))
                        <a href="{{ $spUrl }}" class="banner-link" @if($spUrl !== '#') target="_blank" rel="noopener noreferrer" @endif data-item-id="{{ $item['id'] ?? '' }}">
                            <img class="ck-cp-1c5ec1" src="{{ $item['sales_page_banner_image_url'] }}" alt="{{ $spTitle }}">
                        </a>
                    @else
                        <a href="{{ $spUrl }}" class="profile-link" @if($spUrl !== '#') target="_blank" rel="noopener noreferrer" @endif data-item-id="{{ $item['id'] ?? '' }}">
                            @if($spHasLogo)
                                <img src="{{ $img }}" alt="" class="profile-link-logo profile-link-logo--sized" width="{{ $spLogoSize }}" height="{{ $spLogoSize }}">
                            @else
                                <i class="{{ \App\Support\SafeIconClass::sanitize($item['icon_class'] ?? null, 'fas fa-store') }}"></i>
                            @endif
                            <span>{{ $spTitle }}</span>
                        </a>
                    @endif

                @elseif($type === 'digital_form')
                    @php
                        $fd = is_array($item['digital_form_data'] ?? null) ? $item['digital_form_data'] : [];
                        $fmt = strtolower((string)($fd['display_format'] ?? 'button'));
                        $formUrl = $item['form_public_url'] ?? '';
                        $formTitle = $title !== '' ? $title : 'Formulário';
                        $btnLogo = trim((string)($fd['button_logo_url'] ?? $fd['form_logo_url'] ?? $img));
                        $btnLogoSize = (int)($fd['button_logo_size'] ?? 40);
                        if ($btnLogoSize < 20 || $btnLogoSize > 300) $btnLogoSize = 40;
                        $btnLogoShape = strtolower(trim((string)($fd['button_logo_shape'] ?? 'rounded')));
                        $logoShapeClass = ($btnLogoShape === 'square') ? 'profile-link-logo--square' : 'profile-link-logo--rounded';
                        $hasBtnLogo = $btnLogo !== '' && !str_contains($btnLogo, 'placeholder');
                    @endphp
                    @if($formUrl !== '')
                        @if($fmt === 'banner')
                            <a href="{{ $formUrl }}" class="banner-link" target="_blank" rel="noopener noreferrer" data-item-id="{{ $item['id'] ?? '' }}">
                                @if(!empty($fd['banner_image_url']))
                                    <img class="ck-cp-1c5ec1" src="{{ $fd['banner_image_url'] }}" alt="{{ $formTitle }}">
                                @else
                                    <div class="ck-cp-4074da">
                                        <i class="fas fa-image ck-cp-e14c89"></i>
                                    </div>
                                @endif
                            </a>
                        @else
                            <a href="{{ $formUrl }}" class="profile-link" target="_blank" rel="noopener noreferrer" data-item-id="{{ $item['id'] ?? '' }}">
                                @if($hasBtnLogo)
                                    <img src="{{ $btnLogo }}" alt="" class="profile-link-logo {{ $logoShapeClass }}" width="{{ $btnLogoSize }}" height="{{ $btnLogoSize }}">
                                @else
                                    <i class="{{ \App\Support\SafeIconClass::sanitize($item['icon_class'] ?? null, 'fas fa-wpforms') }}"></i>
                                @endif
                                <span>{{ $formTitle }}</span>
                            </a>
                        @endif
                    @endif

                @elseif($type === 'guest_list')
                    @php
                        $gl = is_array($item['guest_list_data'] ?? null) ? $item['guest_list_data'] : [];
                        $reg = $gl['registration_url'] ?? '#';
                        $stats = is_array($gl['stats'] ?? null) ? $gl['stats'] : [];
                        $glTitle = $title !== '' ? $title : ($gl['event_title'] ?? 'Lista de Convidados');
                        $glLogo = $img !== '' && !str_contains($img, 'placeholder');
                    @endphp
                    @if($reg !== '#' && $reg !== '')
                        <a href="{{ $reg }}" class="profile-link guest-list-item ck-cp-9deb4d" data-item-id="{{ $item['id'] ?? '' }}" target="_blank" rel="noopener noreferrer">
                            @if($glLogo)
                                <img src="{{ $img }}" alt="" class="profile-link-logo ck-cp-4d5236">
                            @else
                                <i class="fas fa-users"></i>
                            @endif
                            <span>{{ $glTitle }}</span>
                            <div class="guest-list-stats-mini">
                                {{ (int)($stats['total_count'] ?? 0) }} convidados · {{ (int)($stats['confirmed_count'] ?? 0) }} confirmados
                            </div>
                        </a>
                    @endif

                @elseif($type === 'product_catalog')
                    @php
                        $catLogo = $img !== '' && !str_contains($img, 'placeholder');
                        $catSize = (int)($item['logo_size'] ?? 24);
                    @endphp
                    <button type="button" class="profile-link product-catalog-btn"
                            data-item-id="{{ $item['id'] ?? '' }}"
                            data-whatsapp="{{ $url }}"
                            data-profile-slug="{{ $profile_slug }}"
                            data-products='@json($item['products'] ?? [])'>
                        @if($catLogo)
                            <img src="{{ $img }}" alt="" class="profile-link-logo profile-link-logo--sized" width="{{ $catSize }}" height="{{ $catSize }}">
                        @else
                            <i class="{{ \App\Support\SafeIconClass::sanitize($item['icon_class'] ?? null, 'fas fa-store') }}"></i>
                        @endif
                        <span>{{ $title !== '' ? $title : 'Minha Loja' }}</span>
                    </button>

                @elseif($type === 'youtube_embed')
                    @if(!empty($item['youtube_embed_src']))
                        <div class="profile-embed-item youtube-embed-container" data-item-id="{{ $item['id'] ?? '' }}">
                            <iframe src="{{ $item['youtube_embed_src'] }}" title="YouTube" allowfullscreen loading="lazy"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    referrerpolicy="strict-origin-when-cross-origin"></iframe>
                        </div>
                    @endif

                @elseif($type === 'instagram_embed')
                    @if(!empty($item['instagram_is_profile']) && !empty($item['instagram_username']))
                        <a href="{{ $url }}" class="profile-link" target="_blank" rel="noopener noreferrer" data-item-id="{{ $item['id'] ?? '' }}">
                            <i class="fab fa-instagram"></i>
                            <span>@{{ $item['instagram_username'] }}</span>
                        </a>
                    @elseif(!empty($item['instagram_embed_url']))
                        <div class="profile-embed-item instagram-embed-container" data-item-id="{{ $item['id'] ?? '' }}">
                            <iframe src="{{ $item['instagram_embed_url'] }}" loading="lazy" title="Instagram"></iframe>
                        </div>
                    @elseif($url !== '')
                        <a href="{{ $url }}" class="profile-link" target="_blank" rel="noopener noreferrer" data-item-id="{{ $item['id'] ?? '' }}">
                            <i class="fab fa-instagram"></i>
                            <span>{{ $title !== '' ? $title : 'Instagram' }}</span>
                        </a>
                    @endif

                @elseif($type === 'location')
                    @php
                        $locData     = $item['location_data'] ?? [];
                        $locMapUrl   = !empty($item['map_url']) ? $item['map_url'] : ($mapUrl ?? '');
                        $locTitle    = $title !== '' ? $title : 'Onde me encontrar';
                        $locFmt      = $locData['display_format'] ?? 'mapa';
                        $locLat      = !empty($locData['latitude'])  ? (float)$locData['latitude']  : null;
                        $locLng      = !empty($locData['longitude']) ? (float)$locData['longitude'] : null;
                        $locAddr     = $locData['address_formatted'] ?? ($locData['address'] ?? '');
                        $locStreet   = $locData['street']       ?? '';
                        $locNumber   = $locData['house_number'] ?? '';
                        $locComplement = $locData['complement'] ?? '';
                        $locBairro   = $locData['bairro']       ?? '';
                        $locCity     = $locData['city']         ?? '';
                        $locUf       = $locData['uf']           ?? '';
                        $locCep      = $locData['cep']          ?? '';
                        $locBannerUrl = $locData['banner_url']  ?? '';
                        $locPlaceName = $locData['place_name']  ?? '';

                        // Monta endereço de exibição amigável
                        $addrLine1Parts = [];
                        if ($locStreet !== '') {
                            $addrLine1Parts[] = $locStreet . ($locNumber !== '' ? ', ' . $locNumber : '');
                        }
                        if ($locComplement !== '') $addrLine1Parts[] = $locComplement;
                        $addrLine1 = implode(' – ', $addrLine1Parts);

                        $addrLine2Parts = [];
                        if ($locBairro !== '') $addrLine2Parts[] = $locBairro;
                        if ($locCity !== '')   $addrLine2Parts[] = $locCity . ($locUf !== '' ? ' - ' . $locUf : '');
                        if ($locCep !== '')    $addrLine2Parts[] = 'CEP ' . $locCep;
                        $addrLine2 = implode(', ', $addrLine2Parts);

                        if ($addrLine1 === '' && $addrLine2 === '' && $locAddr !== '') {
                            $addrParts = explode(',', $locAddr, 3);
                            $addrLine1 = trim($addrParts[0] ?? '');
                            $addrLine2 = trim(implode(',', array_slice($addrParts, 1)));
                        }

                        // URLs de navegação
                        $gmapsUrl = '';
                        $wazeUrl  = '';
                        if ($locLat !== null && $locLng !== null) {
                            $gmapsUrl = "https://www.google.com/maps/dir/?api=1&destination={$locLat},{$locLng}";
                            $wazeUrl  = "https://waze.com/ul?ll={$locLat},{$locLng}&navigate=yes";
                        } elseif ($locMapUrl !== '') {
                            $gmapsUrl = $locMapUrl;
                        }

                        // Tile do OSM para thumbnail (zoom 16)
                        $mapThumbUrl = '';
                        if ($locLat !== null && $locLng !== null) {
                            $zoom  = 16;
                            $tileX = (int)floor(($locLng + 180) / 360 * pow(2, $zoom));
                            $tileY = (int)floor((1 - log(tan(deg2rad($locLat)) + 1 / cos(deg2rad($locLat))) / pi()) / 2 * pow(2, $zoom));
                            $mapThumbUrl = "https://tile.openstreetmap.org/{$zoom}/{$tileX}/{$tileY}.png";
                        }
                    @endphp

                    @if($locFmt === 'mapa' && ($locLat !== null || $locAddr !== '' || $locMapUrl !== ''))
                        {{-- ── FORMATO CARTÃO MAPA ── --}}
                        <div class="location-map-card" data-item-id="{{ $item['id'] ?? '' }}" style="width:100%;border-radius:16px;overflow:hidden;background:linear-gradient(145deg,#1a1a1d,#111113);border:1px solid rgba(255,199,0,0.25);box-shadow:0 8px 32px rgba(0,0,0,0.5);margin-bottom:0;">

                            {{-- Thumbnail do mapa --}}
                            <div style="position:relative;height:140px;overflow:hidden;background:#1e2028;">
                                @if($mapThumbUrl !== '')
                                    <img src="{{ $mapThumbUrl }}" alt="Mapa" loading="lazy"
                                         style="width:100%;height:160px;object-fit:cover;object-position:center;filter:brightness(0.7) saturate(0.9);margin-top:-10px;">
                                @else
                                    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a2035,#0f1520);">
                                        <i class="fas fa-map" style="font-size:3rem;color:rgba(255,199,0,0.3);"></i>
                                    </div>
                                @endif
                                {{-- Overlay escuro + pin central --}}
                                <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.85));"></div>
                                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-60%);">
                                    <div style="width:36px;height:36px;background:var(--dourado-principal,#FFC700);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.5);"></div>
                                </div>
                                {{-- Título sobreposto --}}
                                <div style="position:absolute;bottom:10px;left:14px;right:14px;">
                                    <span style="font-weight:700;font-size:0.95rem;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,0.8);">
                                        <i class="fas fa-map-marker-alt" style="color:var(--dourado-principal,#FFC700);margin-right:5px;"></i>
                                        {{ $locTitle }}
                                    </span>
                                </div>
                            </div>

                            {{-- Corpo com endereço --}}
                            <div style="padding:12px 14px 14px;">
                                @if($addrLine1 !== '')
                                    <p style="margin:0 0 2px;font-weight:600;font-size:0.88rem;color:#f0f0f0;line-height:1.3;">{{ $addrLine1 }}</p>
                                @endif
                                @if($addrLine2 !== '')
                                    <p style="margin:0 0 12px;font-size:0.78rem;color:rgba(255,255,255,0.6);line-height:1.3;">{{ $addrLine2 }}</p>
                                @elseif($addrLine1 === '')
                                    <p style="margin:0 0 12px;font-size:0.82rem;color:rgba(255,255,255,0.5);">Localização definida no mapa</p>
                                @else
                                    <div style="margin-bottom:12px;"></div>
                                @endif

                                {{-- Botões de navegação --}}
                                <div style="display:grid;grid-template-columns:1fr{{ $wazeUrl !== '' ? ' 1fr' : '' }};gap:8px;">
                                    @if($gmapsUrl !== '')
                                        <a href="{{ $gmapsUrl }}" target="_blank" rel="noopener noreferrer"
                                           style="display:flex;align-items:center;justify-content:center;gap:7px;padding:9px 12px;border-radius:10px;background:linear-gradient(135deg,#4285F4,#1a73e8);color:#fff;font-weight:700;font-size:0.8rem;text-decoration:none;border:none;transition:all 0.2s;">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                            Google Maps
                                        </a>
                                    @endif
                                    @if($wazeUrl !== '')
                                        <a href="{{ $wazeUrl }}" target="_blank" rel="noopener noreferrer"
                                           style="display:flex;align-items:center;justify-content:center;gap:7px;padding:9px 12px;border-radius:10px;background:linear-gradient(135deg,#05c8f0,#00b4cf);color:#fff;font-weight:700;font-size:0.8rem;text-decoration:none;border:none;transition:all 0.2s;">
                                            <svg width="15" height="15" viewBox="0 0 50 50" fill="currentColor"><path d="M25 2C12.3 2 2 12.3 2 25c0 4.8 1.4 9.2 3.9 12.9L2 48l10.4-3.8C15.8 46.6 20.3 48 25 48c12.7 0 23-10.3 23-23S37.7 2 25 2z"/></svg>
                                            Waze
                                        </a>
                                    @endif
                                </div>
                            </div>
                        </div>

                    @elseif($locFmt === 'banner' && $locBannerUrl !== '')
                        {{-- ── FORMATO BANNER ── --}}
                        <div class="location-banner-card" data-item-id="{{ $item['id'] ?? '' }}" style="position:relative;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.5);">
                            <img src="{{ $locBannerUrl }}" alt="{{ $locTitle }}" style="width:100%;display:block;border-radius:14px;">
                            @if($gmapsUrl !== '')
                                <a href="{{ $gmapsUrl }}" target="_blank" rel="noopener noreferrer"
                                   style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:inline-flex;align-items:center;gap:8px;padding:10px 22px;border-radius:50px;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);color:#fff;font-weight:700;font-size:0.85rem;text-decoration:none;border:1px solid rgba(255,199,0,0.5);white-space:nowrap;">
                                    <i class="fas fa-map-marker-alt" style="color:var(--dourado-principal,#FFC700);"></i>
                                    {{ $locTitle }}
                                </a>
                            @endif
                        </div>

                    @elseif($locMapUrl !== '' || $gmapsUrl !== '')
                        {{-- ── FORMATO BOTÃO (padrão) ── --}}
                        <a href="{{ $gmapsUrl ?: $locMapUrl }}" class="profile-link" target="_blank" rel="noopener noreferrer" data-item-id="{{ $item['id'] ?? '' }}">
                            <i class="{{ \App\Support\SafeIconClass::sanitize($item['icon_class'] ?? null, 'fas fa-map-marker-alt') }}"></i>
                            <span>{{ $locTitle }}</span>
                        </a>
                    @endif

                @elseif($type === 'pix_qrcode')
                    <button type="button" class="profile-link profile-button-pix-qrcode" data-item-id="{{ $item['id'] ?? '' }}">
                        <i class="{{ \App\Support\SafeIconClass::sanitize($item['icon_class'] ?? null, 'fas fa-qrcode') }}"></i>
                        <span>{{ $title !== '' ? $title : 'PIX QR Code' }}</span>
                    </button>

                @elseif($type === 'pix')
                    <button type="button" class="profile-link profile-button-pix" data-item-id="{{ $item['id'] ?? '' }}" data-pix-key="{{ $item['pix_key'] ?? '' }}">
                        <i class="{{ \App\Support\SafeIconClass::sanitize($item['icon_class'] ?? null, 'fas fa-pix') }}"></i>
                        <span>{{ $title !== '' ? $title : 'PIX' }}</span>
                    </button>

                @elseif($type === 'wifi')
                    @php
                        $wifi = [];
                        if ($url !== '' && str_starts_with($url, '{')) {
                            $wifi = json_decode($url, true) ?: [];
                        }
                        $ssid = trim((string)($wifi['ssid'] ?? ''));
                        $pass = (string)($wifi['password'] ?? '');
                        $sec = (string)($wifi['security'] ?? 'WPA');
                        $hiddenWifi = !empty($wifi['hidden']);
                        $wifiPayload = rawurlencode(json_encode([
                            'ssid' => $ssid,
                            'password' => $pass,
                            'security' => $sec,
                            'hidden' => $hiddenWifi,
                        ], JSON_UNESCAPED_UNICODE));
                    @endphp
                    <button type="button" class="profile-link wifi-profile-button" data-item-id="{{ $item['id'] ?? '' }}" data-wifi-config="{{ $wifiPayload }}">
                        <i class="{{ \App\Support\SafeIconClass::sanitize($item['icon_class'] ?? null, 'fas fa-wifi') }}"></i>
                        <span>{{ $title !== '' ? $title : 'Wi‑Fi' }}</span>
                    </button>

                @elseif($type === 'pdf')
                    <a href="/download/pdf/{{ $item['id'] ?? '' }}" class="profile-link" data-item-id="{{ $item['id'] ?? '' }}">
                        <i class="{{ \App\Support\SafeIconClass::sanitize($item['icon_class'] ?? null, 'fas fa-file-pdf') }}"></i>
                        <span>{{ $title !== '' ? $title : 'PDF' }}</span>
                    </a>

                @elseif($type === 'texto_com_botao')
                    @php
                        $cfg = [];
                        if ($url !== '' && str_starts_with($url, '{')) {
                            $cfg = json_decode($url, true) ?: [];
                        }
                        $cta = trim((string)($cfg['url'] ?? (!str_starts_with($url, '{') ? $url : '')));
                        $lines = is_array($cfg['lines'] ?? null) ? $cfg['lines'] : [];
                        $bodyText = '';
                        foreach ($lines as $line) {
                            $bodyText .= (is_array($line) ? ($line['text'] ?? '') : (string)$line) . "\n";
                        }
                        if ($bodyText === '' && $title !== '') $bodyText = $title;
                    @endphp
                    @if($bodyText !== '')
                        <div class="texto-bloco">
                            {!! nl2br(e(trim($bodyText))) !!}
                            @if($cta !== '')
                                <div class="ck-cp-d8a81e">
                                    <a href="{{ $cta }}" class="profile-link ck-cp-47a258" target="_blank" rel="noopener noreferrer">
                                        <span>{{ $cfg['button_label'] ?? 'Saiba mais' }}</span>
                                    </a>
                                </div>
                            @endif
                        </div>
                    @endif

                @elseif(in_array($type, ['whatsapp','telegram','email','instagram','facebook','tiktok','twitter','youtube','linkedin','portfolio','pinterest','reddit','twitch','spotify','link'], true))
                    @php
                        $href = $url !== '' ? $url : '#';
                        if ($type === 'instagram' && $url !== '' && !str_starts_with($url, 'http')) {
                            $handle = ltrim(preg_replace('#^instagram\.com/#i', '', $url), '@/');
                            $handle = explode('/', $handle)[0];
                            $href = $handle !== '' ? 'https://www.instagram.com/'.rawurlencode($handle).'/' : '#';
                        }
                        if ($type === 'whatsapp' && $url !== '' && !str_starts_with($url, 'http')) {
                            $digits = preg_replace('/\D+/', '', $url);
                            $href = $digits ? 'https://wa.me/'.$digits : '#';
                        }
                        if ($type === 'email' && $url !== '' && !str_contains($url, 'mailto:')) {
                            $href = 'mailto:'.$url;
                        }
                        $label = $title !== '' ? $title : ucfirst(str_replace('_', ' ', $type));
                        $defaultIcons = [
                            'whatsapp' => 'fab fa-whatsapp', 'instagram' => 'fab fa-instagram', 'facebook' => 'fab fa-facebook',
                            'tiktok' => 'fab fa-tiktok', 'youtube' => 'fab fa-youtube', 'email' => 'fas fa-envelope',
                            'telegram' => 'fab fa-telegram', 'linkedin' => 'fab fa-linkedin', 'spotify' => 'fab fa-spotify',
                            'link' => 'fas fa-link',
                        ];
                        $icon = \App\Support\SafeIconClass::sanitize($item['icon_class'] ?? ($defaultIcons[$type] ?? 'fas fa-link'));
                    @endphp
                    @if($href !== '#')
                        <a href="{{ $href }}" class="profile-link" target="_blank" rel="noopener noreferrer" data-item-id="{{ $item['id'] ?? '' }}">
                            @if($img !== '' && !str_contains($img, 'placeholder'))
                                <img src="{{ $img }}" alt="" class="profile-link-logo logo-png ck-cp-fdea56">
                            @else
                                <i class="{{ $icon }}"></i>
                            @endif
                            <span>{{ $label }}</span>
                        </a>
                    @endif

                @elseif($url !== '' && $url !== '#')
                    <a href="{{ $url }}" class="profile-link" target="_blank" rel="noopener noreferrer" data-item-id="{{ $item['id'] ?? '' }}">
                        <i class="{{ $icon }}"></i>
                        <span>{{ $title !== '' ? $title : 'Link' }}</span>
                    </a>
                @endif
            @endforeach
        </section>

        @if($hasVerse && $versePos === 'bottom')
            <a href="/{{ $profile_slug }}/biblia" class="verse-of-day-box verse-of-day-box--bottom verse-size-{{ $verseSize }} ck-cp-c9458d" title="Abrir Bíblia">
                <div class="verse-of-day-ref">{{ $verseOfDay['ref'] ?? 'Versículo do Dia' }}</div>
                <div class="verse-of-day-text">"{{ $verseOfDay['texto'] }}"</div>
                @if(!empty($verseOfDay['reflexao']))
                    <div class="verse-of-day-reflexao">{{ $verseOfDay['reflexao'] }}</div>
                @endif
                <div class="ck-cp-114bb6">Abrir Bíblia →</div>
            </a>
        @endif

        @if(!empty($d['company_logo_url']) && ($cardLayout !== 'vitrine' || filter_var($d['vitrine_show_footer'] ?? false, FILTER_VALIDATE_BOOLEAN)))
            <div class="branding-logo ck-footer-logo">
                @if(!empty($d['company_logo_link']))
                    <a href="{{ \App\Support\SafeUrl::publicHref($d['company_logo_link'] ?? '') }}" target="_blank" rel="noopener noreferrer">
                        <img class="branding-logo-custom" src="{{ $d['company_logo_url'] }}" alt="Logo" data-logo-size="{{ $logoSize }}">
                    </a>
                @else
                    <img class="branding-logo-custom" src="{{ $d['company_logo_url'] }}" alt="Logo" data-logo-size="{{ $logoSize }}">
                @endif
            </div>
        @endif
    </div>
</div>

{{-- Modal Wi‑Fi --}}
<div id="wifi-qrcode-modal" class="wifi-modal-overlay ck-hidden" aria-hidden="true">
    <div class="wifi-modal-content ck-cp-a55ecb">
        <button type="button" id="wifi-modal-close-btn" class="wifi-modal-close ck-cp-444c69" aria-label="Fechar">&times;</button>
        <h4 id="wifi-modal-title">Conectar ao Wi‑Fi</h4>
        <div class="wifi-ssid-block ck-cp-41db5c">
            <span class="wifi-ssid-label">Nome da rede</span>
            <strong id="wifi-ssid-visible" class="wifi-ssid-value"></strong>
        </div>
        <p class="wifi-modal-hint">Escaneie o QR Code ou copie a senha.</p>
        <div class="ck-cp-d50492" id="wifi-qrcode-image"></div>
        <div class="wifi-password-row">Senha: <strong id="wifi-password-visible"></strong></div>
        <button type="button" id="wifi-copy-password-btn" class="profile-link ck-cp-39a9a7">Copiar senha</button>
    </div>
</div>

{{-- Modal PIX (mesma API Node: /api/pix/qrcode/:id) --}}
<div id="pix-qrcode-modal" class="pix-modal-overlay">
    <div class="pix-modal-content">
        <button type="button" id="pix-modal-close-btn" class="pix-modal-close">&times;</button>
        <h4>Escaneie para pagar com PIX</h4>
        <div id="pix-qrcode-container">
            <div id="pix-qrcode-image"></div>
            <div id="pix-qrcode-loader"></div>
        </div>
        <h5>Ou use o Copia e Cola:</h5>
        <div class="pix-brcode-area">
            <textarea id="pix-brcode-text" readonly></textarea>
            <button type="button" id="pix-copy-brcode-btn">Copiar Código</button>
        </div>
    </div>
</div>

<script>window.__CK_CARD_BOOT = { userId: @json($user_id ?? null) };</script>
</body>
</html>

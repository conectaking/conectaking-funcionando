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
@endphp
<!DOCTYPE html>
<html lang="pt-BR" style="background-color: {{ $bgColor }};">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta http-equiv="Cache-Control" content="public, max-age=30">
    <meta http-equiv="Pragma" content="cache">
    <title>{{ $d['display_name'] ?? 'Conecta King' }}</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    @vite(['resources/css/fontawesome.css', 'resources/css/fonts.css', 'resources/js/pages/cartao-public.js'])
<meta property="og:title" content="{{ $d['display_name'] ?? 'Conecta King' }}">
    <meta property="og:description" content="{{ $ogDescription }}">
    <meta property="og:image" content="{{ $ogImageUrl }}">
    <meta property="og:url" content="{{ $ogPageUrl }}">
    <style>
        :root {
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
            --logo-max: {{ max(24, min($logoSize, 90)) }}px;
        }
    </style>
</head>
<body>
@if(!empty($laravel_preview))
@endif

@if($hasBgImage)
    <img class="background-image-overlay-img" src="{{ $d['background_image_url'] }}" alt="" aria-hidden="true" decoding="async" style="opacity: {{ $bgOpacity }};">
@endif

<div class="profile-page-wrapper profile-layout-{{ $cardLayout }}">
    <div class="profile-card">
        <button type="button" class="share-button-corner" id="share-btn" title="Compartilhar">
            <i class="fas fa-share-alt"></i>
        </button>

        <header class="profile-header">
            <div style="position: relative; display: inline-block;">
                @if(in_array($avatarFormat, ['square-full', 'square-small'], true))
                    <img src="{{ $d['profile_image_url'] ?? 'https://avatar.iran.liara.run/public/boy' }}"
                         alt="Foto de Perfil" class="{{ $avatarClass }} avatar-with-gradient"
                         style="outline:none!important;border:none!important;box-shadow:none!important;
                         -webkit-mask-image:linear-gradient(to bottom,black 0%,black 50%,rgba(0,0,0,.98) 65%,rgba(0,0,0,.9) 75%,rgba(0,0,0,.7) 85%,rgba(0,0,0,.4) 92%,rgba(0,0,0,.1) 97%,transparent 100%);
                         mask-image:linear-gradient(to bottom,black 0%,black 50%,rgba(0,0,0,.98) 65%,rgba(0,0,0,.9) 75%,rgba(0,0,0,.7) 85%,rgba(0,0,0,.4) 92%,rgba(0,0,0,.1) 97%,transparent 100%);">
                @else
                    <img src="{{ $d['profile_image_url'] ?? 'https://avatar.iran.liara.run/public/boy' }}"
                         alt="Foto de Perfil" class="{{ $avatarClass }}"
                         style="outline:none!important;border:none!important;box-shadow:none!important;">
                @endif
            </div>
            <h1 class="profile-name">{{ $d['display_name'] ?? 'Nome do Usuário' }}</h1>
            <p class="profile-bio">{{ ($d['bio'] ?? '') !== '' ? $d['bio'] : 'Biografia do usuário.' }}</p>
        </header>

        @php
            $vd = $verseDisplay ?? ['position' => 'top', 'size' => 'normal'];
            $versePos = ($vd['position'] ?? 'top') === 'bottom' ? 'bottom' : 'top';
            $verseSize = in_array(($vd['size'] ?? 'normal'), ['small', 'xsmall'], true) ? $vd['size'] : 'normal';
            $hasVerse = !empty($verseOfDay['texto']);
        @endphp

        @if($hasVerse && $versePos === 'top')
            <a href="/{{ $profile_slug }}/biblia" class="verse-of-day-box verse-size-{{ $verseSize }}" style="display:block;text-decoration:none;color:inherit;" title="Abrir Bíblia">
                <div class="verse-of-day-ref">{{ $verseOfDay['ref'] ?? 'Versículo do Dia' }}</div>
                <div class="verse-of-day-text">"{{ $verseOfDay['texto'] }}"</div>
                @if(!empty($verseOfDay['reflexao']))
                    <div class="verse-of-day-reflexao">{{ $verseOfDay['reflexao'] }}</div>
                @endif
                <div style="margin-top:10px;font-size:.78rem;opacity:.75;font-family:system-ui,sans-serif;">Abrir Bíblia →</div>
            </a>
        @endif

        @if($showVcard || $mapUrl !== '' || $hasVerse)
            <div class="profile-actions">
                @if($showVcard)
                    <a href="/vcard/{{ $profile_slug }}" class="profile-link" id="save-contact-btn">
                        <i class="fas fa-address-card"></i>
                        <span>Salvar Contato</span>
                    </a>
                @endif
                @if($mapUrl !== '')
                    <a href="{{ $mapUrl }}" class="profile-link" target="_blank" rel="noopener noreferrer">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>Ver no Mapa</span>
                    </a>
                @endif
                @if($hasVerse)
                    <a href="/{{ $profile_slug }}/biblia" class="profile-link">
                        <i class="fas fa-book-bible"></i>
                        <span>Bíblia</span>
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

                @if($type === 'king_selection')
                    <a href="@safeUrl($item['ks_public_url'] ?? '#')" class="profile-link" target="_blank" rel="noopener noreferrer" data-item-id="{{ $item['id'] ?? '' }}">
                        <i class="{{ \App\Support\SafeIconClass::sanitize($item['icon_class'] ?? null, 'fas fa-images') }}"></i>
                        <span>{{ $title !== '' ? $title : 'King Selection' }}</span>
                    </a>

                @elseif($type === 'banner')
                    @php $primary = \App\Support\SafeUrl::publicHref($item['primary_url'] ?? $url); @endphp
                    <div class="profile-banner-container">
                        @if($primary && $primary !== '#')
                            <a href="{{ $primary }}" target="_blank" rel="noopener noreferrer" data-item-id="{{ $item['id'] ?? '' }}">
                                <img src="{{ $img }}" alt="{{ $title !== '' ? $title : 'Banner' }}">
                            </a>
                        @else
                            <img src="{{ $img }}" alt="{{ $title !== '' ? $title : 'Banner' }}">
                        @endif
                    </div>

                @elseif($type === 'carousel')
                    @php
                        $slides = $item['carousel_images'] ?? [];
                        $carouselId = 'carousel-'.($item['id'] ?? uniqid());
                        $n = max(count($slides), 1);
                    @endphp
                    @if(count($slides) > 0)
                        <div class="carousel-container-public" id="{{ $carouselId }}" data-slides="{{ count($slides) }}">
                            <div class="carousel-wrapper-public" style="width: {{ $n * 100 }}%;">
                                @foreach($slides as $slide)
                                    <div class="carousel-slide-public" style="width: {{ 100 / $n }}%;">
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
                            <img src="{{ $item['sales_page_banner_image_url'] }}" alt="{{ $spTitle }}" style="width:100%;border-radius:16px;">
                        </a>
                    @else
                        <a href="{{ $spUrl }}" class="profile-link" @if($spUrl !== '#') target="_blank" rel="noopener noreferrer" @endif data-item-id="{{ $item['id'] ?? '' }}">
                            @if($spHasLogo)
                                <img src="{{ $img }}" alt="" class="profile-link-logo" style="width:{{ $spLogoSize }}px;height:{{ $spLogoSize }}px;object-fit:contain;">
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
                        $hasBtnLogo = $btnLogo !== '' && !str_contains($btnLogo, 'placeholder');
                    @endphp
                    @if($formUrl !== '')
                        @if($fmt === 'banner')
                            <a href="{{ $formUrl }}" class="banner-link" target="_blank" rel="noopener noreferrer" data-item-id="{{ $item['id'] ?? '' }}">
                                @if(!empty($fd['banner_image_url']))
                                    <img src="{{ $fd['banner_image_url'] }}" alt="{{ $formTitle }}" style="width:100%;border-radius:16px;">
                                @else
                                    <div style="min-height:160px;border-radius:16px;background:#1c1c21;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.35);">
                                        <i class="fas fa-image" style="font-size:2rem;"></i>
                                    </div>
                                @endif
                            </a>
                        @else
                            <a href="{{ $formUrl }}" class="profile-link" target="_blank" rel="noopener noreferrer" data-item-id="{{ $item['id'] ?? '' }}">
                                @if($hasBtnLogo)
                                    <img src="{{ $btnLogo }}" alt="" class="profile-link-logo" style="width:{{ $btnLogoSize }}px;height:{{ $btnLogoSize }}px;object-fit:contain;border-radius:8px;">
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
                        <a href="{{ $reg }}" class="profile-link guest-list-item" data-item-id="{{ $item['id'] ?? '' }}" target="_blank" rel="noopener noreferrer" style="flex-wrap:wrap;">
                            @if($glLogo)
                                <img src="{{ $img }}" alt="" class="profile-link-logo" style="max-width:24px;max-height:24px;border-radius:8px;">
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
                            <img src="{{ $img }}" alt="" class="profile-link-logo" style="width:{{ $catSize }}px;height:{{ $catSize }}px;object-fit:contain;">
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
                    {{-- renderizado em profile-actions via map_url --}}

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
                                <div style="margin-top:10px;">
                                    <a href="{{ $cta }}" class="profile-link" target="_blank" rel="noopener noreferrer" style="display:inline-flex;width:auto;padding:10px 16px;">
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
                                <img src="{{ $img }}" alt="" class="profile-link-logo logo-png" style="width:24px;height:24px;object-fit:contain;">
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
            <a href="/{{ $profile_slug }}/biblia" class="verse-of-day-box verse-of-day-box--bottom verse-size-{{ $verseSize }}" style="display:block;text-decoration:none;color:inherit;" title="Abrir Bíblia">
                <div class="verse-of-day-ref">{{ $verseOfDay['ref'] ?? 'Versículo do Dia' }}</div>
                <div class="verse-of-day-text">"{{ $verseOfDay['texto'] }}"</div>
                @if(!empty($verseOfDay['reflexao']))
                    <div class="verse-of-day-reflexao">{{ $verseOfDay['reflexao'] }}</div>
                @endif
                <div style="margin-top:10px;font-size:.78rem;opacity:.75;font-family:system-ui,sans-serif;">Abrir Bíblia →</div>
            </a>
        @endif

        @if(!empty($d['company_logo_url']))
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
<div id="wifi-qrcode-modal" class="wifi-modal-overlay" aria-hidden="true" style="display:none;">
    <div class="wifi-modal-content" style="background:#111;color:#fff;max-width:360px;margin:10vh auto;padding:20px;border-radius:16px;position:relative;">
        <button type="button" id="wifi-modal-close-btn" class="wifi-modal-close" aria-label="Fechar" style="position:absolute;right:12px;top:8px;background:none;border:none;color:#fff;font-size:28px;cursor:pointer;">&times;</button>
        <h4 id="wifi-modal-title">Conectar ao Wi‑Fi</h4>
        <div class="wifi-ssid-block" style="margin:12px 0;">
            <span class="wifi-ssid-label">Nome da rede</span>
            <strong id="wifi-ssid-visible" class="wifi-ssid-value" style="display:block;"></strong>
        </div>
        <p class="wifi-modal-hint">Escaneie o QR Code ou copie a senha.</p>
        <div id="wifi-qrcode-image" style="display:flex;justify-content:center;margin:12px 0;background:#fff;padding:12px;border-radius:8px;"></div>
        <div class="wifi-password-row">Senha: <strong id="wifi-password-visible"></strong></div>
        <button type="button" id="wifi-copy-password-btn" class="profile-link" style="margin-top:12px;width:100%;">Copiar senha</button>
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

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
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <title>{{ $d['display_name'] ?? 'Conecta King' }}</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Lora:wght@400;700&family=Roboto+Slab:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link rel="stylesheet" href="/css/profile.css?v=laravel-card-2">
    <meta property="og:title" content="{{ $d['display_name'] ?? 'Conecta King' }}">
    <meta property="og:description" content="{{ $ogDescription }}">
    <meta property="og:image" content="{{ $ogImageUrl }}">
    <meta property="og:url" content="{{ $ogPageUrl }}">
    <style>
        body, h1, p, span { font-family: '{{ $font }}', sans-serif !important; }
        .profile-name, .profile-bio { color: {{ $textColor }} !important; }
        .profile-avatar { border: none !important; }
        :root {
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
        }
        .profile-card {
            background-color: rgba(var(--card-r), var(--card-g), var(--card-b), var(--card-opacity)) !important;
        }
        .profile-link, .profile-button-pix, .profile-button-pix-qrcode {
            background-color: rgba(var(--btn-r), var(--btn-g), var(--btn-b), var(--btn-opacity)) !important;
            color: {{ $btnText }} !important;
            border-radius: var(--btn-border-radius) !important;
            justify-content: {{ $alignValue ?? 'center' }} !important;
            font-size: var(--btn-font-size) !important;
            display: flex !important;
            align-items: center !important;
        }
        .profile-link i, .profile-button-pix i, .profile-button-pix-qrcode i {
            color: {{ $btnText }} !important;
        }
        .profile-actions {
            display: flex;
            gap: 10px;
            width: 100%;
            margin: 8px 0 4px;
        }
        .profile-actions .profile-link {
            flex: 1;
            margin: 0;
        }
        .ck-laravel-banner {
            position: sticky; top: 0; z-index: 50; text-align: center;
            font-size: 11px; letter-spacing: .02em; padding: 6px 10px;
            background: rgba(0,0,0,.65); color: #f5f5f5;
        }
        .profile-banner-container { width: 100%; margin: 10px 0; background: transparent !important; }
        .profile-banner-container img { width: 100%; height: auto; display: block; border-radius: 12px; }
        .ck-footer-logo { text-align: center; margin: 28px 0 10px; }
        .ck-footer-logo img { max-height: {{ max(24, min($logoSize, 90)) }}px; }
        .texto-bloco {
            width: 100%; margin: 12px 0; padding: 16px; border-radius: 14px;
            background: rgba(20, 60, 40, 0.85); color: #fff; text-align: left; font-size: 0.95rem; line-height: 1.45;
        }
    </style>
</head>
<body>
@if(!empty($laravel_preview))
    <div class="ck-laravel-banner">Prévia Laravel · compare com <a href="/{{ $profile_slug }}" style="color:#ffd700">/{{ $profile_slug }}</a></div>
@endif

@if($hasBgImage)
    <img class="background-image-overlay-img" src="{{ $d['background_image_url'] }}" alt="" aria-hidden="true" decoding="async" style="opacity: {{ $bgOpacity }};">
@endif

<div class="profile-page-wrapper profile-layout-{{ $cardLayout }}">
    <div class="profile-card">
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

        @if($showVcard || $mapUrl !== '')
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
            </div>
        @endif

        <section class="profile-items-container">
            @foreach($items as $item)
                @php
                    $type = $item['item_type'] ?? 'link';
                    $title = trim((string)($item['title'] ?? ''));
                    $icon = $item['icon_class'] ?? 'fas fa-link';
                    $url = trim((string)($item['destination_url'] ?? ''));
                    $img = trim((string)($item['image_url'] ?? ''));
                @endphp

                @if($type === 'banner')
                    @php $primary = $item['primary_url'] ?? $url; @endphp
                    <div class="profile-banner-container">
                        @if($primary && $primary !== '#')
                            <a href="{{ $primary }}" target="_blank" rel="noopener noreferrer" data-item-id="{{ $item['id'] ?? '' }}">
                                <img src="{{ $img }}" alt="{{ $title !== '' ? $title : 'Banner' }}">
                            </a>
                        @else
                            <img src="{{ $img }}" alt="{{ $title !== '' ? $title : 'Banner' }}">
                        @endif
                    </div>

                @elseif($type === 'sales_page')
                    @php
                        $spUrl = $item['sales_page_url'] ?? '#';
                        $spTitle = $title !== '' ? $title : 'Página de Vendas';
                    @endphp
                    @if(($item['sales_page_display_format'] ?? 'button') === 'banner' && !empty($item['sales_page_banner_image_url']))
                        <a href="{{ $spUrl }}" class="banner-link" @if($spUrl !== '#') target="_blank" rel="noopener noreferrer" @endif>
                            <img src="{{ $item['sales_page_banner_image_url'] }}" alt="{{ $spTitle }}" style="width:100%;border-radius:16px;">
                        </a>
                    @else
                        <a href="{{ $spUrl }}" class="profile-link" @if($spUrl !== '#') target="_blank" rel="noopener noreferrer" @endif data-item-id="{{ $item['id'] ?? '' }}">
                            <i class="{{ $item['icon_class'] ?? 'fas fa-store' }}"></i>
                            <span>{{ $spTitle }}</span>
                        </a>
                    @endif

                @elseif($type === 'digital_form')
                    <a href="{{ $item['form_public_url'] ?? '#' }}" class="profile-link" target="_blank" rel="noopener noreferrer" data-item-id="{{ $item['id'] ?? '' }}">
                        <i class="{{ $item['icon_class'] ?? 'fas fa-wpforms' }}"></i>
                        <span>{{ $title !== '' ? $title : 'Formulário' }}</span>
                    </a>

                @elseif($type === 'location')
                    {{-- renderizado em profile-actions via map_url --}}

                @elseif($type === 'pix_qrcode' || $type === 'pix')
                    <a href="/{{ $profile_slug }}#pix-{{ $item['id'] ?? '' }}" class="profile-link profile-button-pix-qrcode" data-item-id="{{ $item['id'] ?? '' }}">
                        <i class="{{ $item['icon_class'] ?? 'fas fa-qrcode' }}"></i>
                        <span>{{ $title !== '' ? $title : 'PIX QR Code' }}</span>
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

                @elseif(in_array($type, ['whatsapp','telegram','email','instagram','facebook','tiktok','twitter','youtube','linkedin','portfolio','pinterest','reddit','twitch','spotify','link','wifi'], true))
                    @php
                        $href = $url !== '' ? $url : '#';
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
                            'wifi' => 'fas fa-wifi', 'link' => 'fas fa-link',
                        ];
                        $icon = $item['icon_class'] ?? ($defaultIcons[$type] ?? 'fas fa-link');
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
                @endif
            @endforeach
        </section>

        @if(!empty($d['company_logo_url']))
            <div class="ck-footer-logo">
                @if(!empty($d['company_logo_link']))
                    <a href="{{ $d['company_logo_link'] }}" target="_blank" rel="noopener noreferrer">
                        <img src="{{ $d['company_logo_url'] }}" alt="Logo">
                    </a>
                @else
                    <img src="{{ $d['company_logo_url'] }}" alt="Logo">
                @endif
            </div>
        @endif
    </div>
</div>
</body>
</html>

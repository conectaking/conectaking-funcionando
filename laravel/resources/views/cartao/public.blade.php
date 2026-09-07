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
    <link rel="stylesheet" href="/css/profile.css?v=laravel-card-5">
    <link rel="stylesheet" href="/css/profile-wifi.css?v=laravel-card-5" id="ck-wifi-css" disabled>
    <script src="https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs/qrcode.min.js"></script>
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
        .ck-footer-logo img, .branding-logo-custom { max-height: {{ max(24, min($logoSize, 90)) }}px; }
        .share-button-corner {
            background-color: rgba(var(--btn-r), var(--btn-g), var(--btn-b), var(--btn-opacity)) !important;
            color: {{ $btnText }} !important;
        }
        .texto-bloco {
            width: 100%; margin: 12px 0; padding: 16px; border-radius: 14px;
            background: rgba(20, 60, 40, 0.85); color: #fff; text-align: left; font-size: 0.95rem; line-height: 1.45;
        }
    </style>
</head>
<body>
@if(!empty($laravel_preview))
    <div class="ck-laravel-banner">Prévia Laravel · compare com <a href="/{{ $profile_slug }}" style="color:#ffd700">/{{ $profile_slug }}</a> · teste público: <a href="/{{ $profile_slug }}?laravel=1" style="color:#7dd3fc">?laravel=1</a></div>
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
            <div class="verse-of-day-box verse-size-{{ $verseSize }}">
                <div class="verse-of-day-ref">{{ $verseOfDay['ref'] ?? 'Versículo do Dia' }}</div>
                <div class="verse-of-day-text">"{{ $verseOfDay['texto'] }}"</div>
                @if(!empty($verseOfDay['reflexao']))
                    <div class="verse-of-day-reflexao">{{ $verseOfDay['reflexao'] }}</div>
                @endif
            </div>
        @endif

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

                @if($type === 'king_selection')
                    <a href="{{ $item['ks_public_url'] ?? '#' }}" class="profile-link" target="_blank" rel="noopener noreferrer" data-item-id="{{ $item['id'] ?? '' }}">
                        <i class="{{ $item['icon_class'] ?? 'fas fa-images' }}"></i>
                        <span>{{ $title !== '' ? $title : 'King Selection' }}</span>
                    </a>

                @elseif($type === 'banner')
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

                @elseif($type === 'pix_qrcode')
                    <button type="button" class="profile-link profile-button-pix-qrcode" data-item-id="{{ $item['id'] ?? '' }}">
                        <i class="{{ $item['icon_class'] ?? 'fas fa-qrcode' }}"></i>
                        <span>{{ $title !== '' ? $title : 'PIX QR Code' }}</span>
                    </button>

                @elseif($type === 'pix')
                    <button type="button" class="profile-link profile-button-pix" data-item-id="{{ $item['id'] ?? '' }}" data-pix-key="{{ $item['pix_key'] ?? '' }}">
                        <i class="{{ $item['icon_class'] ?? 'fas fa-pix' }}"></i>
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
                        <i class="{{ $item['icon_class'] ?? 'fas fa-wifi' }}"></i>
                        <span>{{ $title !== '' ? $title : 'Wi‑Fi' }}</span>
                    </button>

                @elseif($type === 'pdf')
                    @if($url !== '' && $url !== '#')
                        <a href="{{ $url }}" class="profile-link" target="_blank" rel="noopener noreferrer" data-item-id="{{ $item['id'] ?? '' }}">
                            <i class="{{ $item['icon_class'] ?? 'fas fa-file-pdf' }}"></i>
                            <span>{{ $title !== '' ? $title : 'PDF' }}</span>
                        </a>
                    @endif

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

        @if($hasVerse && $versePos === 'bottom')
            <div class="verse-of-day-box verse-of-day-box--bottom verse-size-{{ $verseSize }}">
                <div class="verse-of-day-ref">{{ $verseOfDay['ref'] ?? 'Versículo do Dia' }}</div>
                <div class="verse-of-day-text">"{{ $verseOfDay['texto'] }}"</div>
                @if(!empty($verseOfDay['reflexao']))
                    <div class="verse-of-day-reflexao">{{ $verseOfDay['reflexao'] }}</div>
                @endif
            </div>
        @endif

        @if(!empty($d['company_logo_url']))
            <div class="branding-logo ck-footer-logo">
                @if(!empty($d['company_logo_link']))
                    <a href="{{ $d['company_logo_link'] }}" target="_blank" rel="noopener noreferrer">
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

<script>
(function () {
    var pixModal = document.getElementById('pix-qrcode-modal');
    var pixCloseBtn = document.getElementById('pix-modal-close-btn');
    var pixQrContainer = document.getElementById('pix-qrcode-image');
    var pixQrLoader = document.getElementById('pix-qrcode-loader');
    var pixBrCodeText = document.getElementById('pix-brcode-text');
    var pixCopyBrCodeBtn = document.getElementById('pix-copy-brcode-btn');
    var qrInstance = null;

    function openPixModal(itemId) {
        if (!pixModal || !itemId) return;
        pixModal.classList.add('active');
        if (pixQrLoader) pixQrLoader.style.display = 'block';
        if (pixQrContainer) pixQrContainer.innerHTML = '';
        if (qrInstance && typeof qrInstance.clear === 'function') {
            try { qrInstance.clear(); } catch (e) {}
        }
        if (pixBrCodeText) pixBrCodeText.value = 'Gerando código...';

        fetch('/api/pix/qrcode/' + encodeURIComponent(itemId))
            .then(function (res) {
                return res.json().then(function (data) {
                    if (!res.ok) throw new Error((data && data.message) || 'Erro ao gerar PIX');
                    return data;
                });
            })
            .then(function (data) {
                if (pixBrCodeText) pixBrCodeText.value = data.brcode || '';
                if (pixQrContainer && typeof QRCode !== 'undefined' && data.brcode) {
                    qrInstance = new QRCode(pixQrContainer, {
                        text: data.brcode,
                        width: 200,
                        height: 200,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.H
                    });
                }
            })
            .catch(function (err) {
                if (pixBrCodeText) pixBrCodeText.value = 'Erro: ' + (err.message || 'falha');
            })
            .finally(function () {
                if (pixQrLoader) pixQrLoader.style.display = 'none';
            });
    }

    function closePixModal() {
        if (pixModal) pixModal.classList.remove('active');
    }

    document.querySelectorAll('.profile-button-pix-qrcode').forEach(function (button) {
        button.addEventListener('click', function () {
            var itemId = button.getAttribute('data-item-id');
            if (itemId) {
                try { navigator.sendBeacon('/log/click/item/' + itemId); } catch (e) {}
            }
            openPixModal(itemId);
        });
    });

    document.querySelectorAll('.profile-button-pix').forEach(function (button) {
        button.addEventListener('click', function () {
            var pixKey = button.getAttribute('data-pix-key') || '';
            var span = button.querySelector('span');
            if (!pixKey || pixKey === 'SuaChavePIXAqui') {
                alert('Nenhuma chave PIX configurada.');
                return;
            }
            navigator.clipboard.writeText(pixKey).then(function () {
                if (!span) return;
                var original = span.textContent;
                span.textContent = 'Copiado!';
                setTimeout(function () { span.textContent = original; }, 2000);
            }).catch(function () {
                alert('Não foi possível copiar a chave PIX.');
            });
        });
    });

    if (pixCloseBtn) pixCloseBtn.addEventListener('click', closePixModal);
    if (pixModal) {
        pixModal.addEventListener('click', function (e) {
            if (e.target === pixModal) closePixModal();
        });
    }
    if (pixCopyBrCodeBtn && pixBrCodeText) {
        pixCopyBrCodeBtn.addEventListener('click', function () {
            pixBrCodeText.select();
            try {
                document.execCommand('copy');
                navigator.clipboard.writeText(pixBrCodeText.value);
            } catch (e) {}
            var original = pixCopyBrCodeBtn.textContent;
            pixCopyBrCodeBtn.textContent = 'Copiado!';
            setTimeout(function () { pixCopyBrCodeBtn.textContent = original; }, 2000);
        });
    }

    var shareButton = document.getElementById('share-btn');
    if (shareButton) {
        shareButton.addEventListener('click', async function () {
            var shareData = {
                title: document.title,
                text: 'Confira meu cartão de visita digital Conecta King!',
                url: window.location.origin + '/{{ $profile_slug }}'
            };
            if (navigator.share) {
                try { await navigator.share(shareData); } catch (e) {}
            } else {
                try {
                    await navigator.clipboard.writeText(shareData.url);
                    alert('Link do perfil copiado!');
                } catch (e) {
                    alert('Não foi possível copiar o link.');
                }
            }
        });
    }

    // Wi‑Fi
    var wifiModal = document.getElementById('wifi-qrcode-modal');
    var wifiClose = document.getElementById('wifi-modal-close-btn');
    var wifiQr = document.getElementById('wifi-qrcode-image');
    var wifiSsidEl = document.getElementById('wifi-ssid-visible');
    var wifiPassEl = document.getElementById('wifi-password-visible');
    var wifiCopyBtn = document.getElementById('wifi-copy-password-btn');
    var wifiCss = document.getElementById('ck-wifi-css');
    var wifiQrInst = null;
    var lastWifiPass = '';

    function wifiEscape(s) {
        return String(s || '').replace(/([\\;,:"])/g, '\\$1');
    }
    function buildWifiQr(cfg) {
        var t = (cfg.security || 'WPA').toUpperCase();
        if (t === 'NONE' || t === 'NOPASS') t = 'nopass';
        var hidden = cfg.hidden ? 'H:true' : '';
        return 'WIFI:T:' + t + ';S:' + wifiEscape(cfg.ssid || '') + ';P:' + wifiEscape(cfg.password || '') + ';' + (hidden ? hidden + ';' : '') + ';';
    }
    function openWifiModal(cfg) {
        if (!wifiModal) return;
        if (wifiCss) wifiCss.disabled = false;
        wifiModal.style.display = 'block';
        wifiModal.setAttribute('aria-hidden', 'false');
        if (wifiSsidEl) wifiSsidEl.textContent = cfg.ssid || '';
        if (wifiPassEl) wifiPassEl.textContent = cfg.password || '(sem senha)';
        lastWifiPass = cfg.password || '';
        if (wifiQr) {
            wifiQr.innerHTML = '';
            if (typeof QRCode !== 'undefined') {
                wifiQrInst = new QRCode(wifiQr, {
                    text: buildWifiQr(cfg),
                    width: 180,
                    height: 180,
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        }
    }
    function closeWifiModal() {
        if (!wifiModal) return;
        wifiModal.style.display = 'none';
        wifiModal.setAttribute('aria-hidden', 'true');
    }
    document.querySelectorAll('.wifi-profile-button').forEach(function (btn) {
        btn.addEventListener('click', function () {
            try {
                var raw = decodeURIComponent(btn.getAttribute('data-wifi-config') || '{}');
                openWifiModal(JSON.parse(raw));
            } catch (e) {
                alert('Não foi possível abrir o Wi‑Fi.');
            }
        });
    });
    if (wifiClose) wifiClose.addEventListener('click', closeWifiModal);
    if (wifiModal) wifiModal.addEventListener('click', function (e) { if (e.target === wifiModal) closeWifiModal(); });
    if (wifiCopyBtn) {
        wifiCopyBtn.addEventListener('click', function () {
            if (!lastWifiPass) return alert('Sem senha configurada.');
            navigator.clipboard.writeText(lastWifiPass).then(function () {
                var o = wifiCopyBtn.textContent;
                wifiCopyBtn.textContent = 'Copiado!';
                setTimeout(function () { wifiCopyBtn.textContent = o; }, 1500);
            });
        });
    }
})();
</script>
</body>
</html>

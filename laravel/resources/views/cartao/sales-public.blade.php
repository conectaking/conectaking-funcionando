<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $page['store_title'] ?? 'Loja' }}</title>
    @php
        $bg = $page['background_color'] ?? '#0D0D0F';
        $text = $page['text_color'] ?? '#ECECEC';
        $btn = $page['button_color'] ?? '#FFC700';
        $btnText = $page['button_text_color'] ?? '#111111';
        $bgImg = $page['background_image_url'] ?? null;
        $logo = $page['button_logo_url'] ?? null;
        $title = $page['store_title'] ?? 'Loja';
        $desc = $page['store_description'] ?? null;
        $profileHref = !empty($profileSlug) ? '/'.ltrim((string) $profileSlug, '/') : null;
        $hasProducts = isset($products) && count($products) > 0;
    @endphp
    <style>
:root {
            --bg: {{ $bg }};
            --text: {{ $text }};
            --btn: {{ $btn }};
            --btnText: {{ $btnText }};
            --card: color-mix(in srgb, {{ $text }} 6%, {{ $bg }});
            --line: color-mix(in srgb, {{ $text }} 14%, transparent);
        }
@if($bgImg)
        .store-hero {
            background-image: url('{{ $bgImg }}');
        }
@endif
    </style>
    @vite(['resources/css/fonts.css', 'resources/css/pub/pages/cartao-sales-public.css'])
</head>
<body class="sales-public{{ $hasProducts ? '' : ' is-empty' }}">
<header class="store-hero{{ $bgImg ? ' has-bg' : '' }}">
    <div class="store-hero__overlay"></div>
    <div class="store-hero__inner">
        @if($logo)
            <img class="store-logo" src="{{ $logo }}" alt="{{ $title }}">
        @else
            <div class="store-mark" aria-hidden="true">{{ mb_strtoupper(mb_substr($title, 0, 1)) }}</div>
        @endif
        <h1 class="store-title">{{ $title }}</h1>
        @if(!empty($desc))
            <p class="store-desc">{{ $desc }}</p>
        @endif
        @if($profileHref)
            <a class="store-back" href="{{ $profileHref }}">Voltar ao perfil</a>
        @endif
    </div>
</header>

<main class="store-main">
    @if($hasProducts)
        <div class="store-toolbar">
            <p class="store-count">{{ count($products) }} {{ count($products) === 1 ? 'produto' : 'produtos' }}</p>
        </div>
        <div class="grid">
            @foreach($products as $p)
                <article class="item">
                    @if(!empty($p['image_url']))
                        <img src="{{ $p['image_url'] }}" alt="{{ $p['name'] ?? 'Produto' }}" loading="lazy">
                    @else
                        <div class="item-ph" aria-hidden="true"></div>
                    @endif
                    <div class="meta">
                        <h2 class="item-name">{{ $p['name'] ?? 'Produto' }}</h2>
                        @if(!empty($p['description']))
                            <p class="item-desc">{{ \Illuminate\Support\Str::limit((string) $p['description'], 90) }}</p>
                        @endif
                        @if(isset($p['price']))
                            <div class="price">R$ {{ number_format((float)$p['price'], 2, ',', '.') }}</div>
                        @endif
                        @if(!empty($page['whatsapp_number']))
                            @php
                                $msg = rawurlencode('Olá! Tenho interesse em: '.($p['name'] ?? 'produto'));
                                $wa = preg_replace('/\D+/', '', (string)$page['whatsapp_number']);
                            @endphp
                            <a class="wa" href="https://wa.me/{{ $wa }}?text={{ $msg }}" target="_blank" rel="noopener">{{ $page['button_text'] ?? 'Pedir' }}</a>
                        @endif
                    </div>
                </article>
            @endforeach
        </div>
    @else
        <section class="store-empty" aria-live="polite">
            <div class="store-empty__frame">
                <div class="store-empty__glow" aria-hidden="true"></div>
                @if($logo)
                    <img class="store-empty__logo" src="{{ $logo }}" alt="">
                @else
                    <div class="store-empty__icon" aria-hidden="true">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 7h16l-1.2 12.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 7Z" stroke="currentColor" stroke-width="1.6"/>
                            <path d="M9 7V5.5A3 3 0 0 1 12 2.5v0a3 3 0 0 1 3 3V7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                        </svg>
                    </div>
                @endif
                <h2>Em breve na {{ $title }}</h2>
                <p>Nenhum produto publicado no momento. Volte em breve — a vitrine está sendo preparada com cuidado.</p>
                @if($profileHref)
                    <a class="wa store-empty__cta" href="{{ $profileHref }}">Conhecer o perfil</a>
                @endif
            </div>
        </section>
    @endif
</main>

<footer class="store-foot">
    <span>Powered by ConectaKing</span>
</footer>
</body>
</html>

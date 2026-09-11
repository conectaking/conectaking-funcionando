<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $page['store_title'] ?? 'Loja' }}</title>
    <style>
:root {
            --bg: {{ $page['background_color'] ?? '#0D0D0F' }};
            --text: {{ $page['text_color'] ?? '#ECECEC' }};
            --btn: {{ $page['button_color'] ?? '#FFC700' }};
            --btnText: {{ $page['button_text_color'] ?? '#111' }};
        }
    </style>
    @vite(['resources/css/fonts.css', 'resources/css/pub/pages/cartao-sales-public.css'])
</head>
<body>
<div class="wrap">
    <h1>{{ $page['store_title'] ?? 'Loja' }}</h1>
    @if(!empty($page['store_description']))
        <p class="desc">{{ $page['store_description'] }}</p>
    @endif
    <div class="grid">
        @forelse($products as $p)
            <div class="item">
                @if(!empty($p['image_url']))
                    <img src="{{ $p['image_url'] }}" alt="">
                @endif
                <div class="meta">
                    <div>{{ $p['name'] ?? 'Produto' }}</div>
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
            </div>
        @empty
            <p>Nenhum produto publicado.</p>
        @endforelse
    </div>
</div>
</body>
</html>

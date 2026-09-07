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
        body { margin:0; font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); }
        .wrap { max-width: 960px; margin: 0 auto; padding: 24px 16px 64px; }
        h1 { margin: 0 0 8px; }
        .desc { opacity:.85; margin-bottom: 28px; }
        .grid { display:grid; grid-template-columns: repeat(auto-fill,minmax(220px,1fr)); gap:16px; }
        .item { background: rgba(255,255,255,.04); border-radius:12px; overflow:hidden; }
        .item img { width:100%; aspect-ratio:1; object-fit:cover; display:block; background:#222; }
        .item .meta { padding:12px; }
        .price { font-weight:700; color: var(--btn); }
        .wa { display:inline-block; margin-top:10px; padding:10px 14px; border-radius:8px; background:var(--btn); color:var(--btnText); text-decoration:none; font-weight:700; }
    </style>
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

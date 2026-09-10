<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Estudo: {{ $bookName }} — Bíblia</title>
    <style>
        body { margin:0; font-family: Georgia, 'Times New Roman', serif; background:#0D0D0F; color:#ECECEC;
               background-image: linear-gradient(180deg, #0D0D0F 0%, #12121a 50%, #0f0f12 100%); min-height:100vh; }
        .wrap { max-width: 680px; margin: 0 auto; padding: 24px 16px 64px; }
        a { color:#FFC700; text-decoration:none; }
        .nav { font-family: system-ui, sans-serif; font-size:.9rem; display:flex; gap:14px; flex-wrap:wrap; margin-bottom:20px; }
        .nav a { color:#A1A1A1; }
        .nav a:hover { color:#FFC700; }
        h1 { font-size:1.45rem; color:#FFC700; margin:0 0 8px; font-weight:600; text-align:center; }
        .card { background:rgba(28,28,33,.95); border:1px solid rgba(255,199,0,.2); border-radius:16px; padding:24px 20px; margin-top:20px; }
        .card h2 { font-size:1.05rem; color:#FFC700; margin:0 0 14px; font-family: system-ui, sans-serif; }
        .content { font-size:1.05rem; line-height:1.75; color:#e8e8e8; }
        .content .bible-ref-link { color:#7dd3fc; border-bottom:1px dotted rgba(125,211,252,.5); }
        .content .bible-ref-link:hover { color:#FFC700; }
        .empty { text-align:center; padding:40px 16px; color:#A1A1A1; }
        .chapters { margin-top:24px; }
        .chapters h3 { font-size:.95rem; color:#A1A1A1; margin:0 0 10px; font-family:system-ui,sans-serif; }
        .chapters a { display:inline-block; margin:0 8px 8px 0; padding:8px 12px; border-radius:8px;
                      background:rgba(255,199,0,.12); border:1px solid rgba(255,199,0,.25); color:#7dd3fc;
                      font-family:system-ui,sans-serif; font-size:.88rem; }
        .btn-read { display:inline-block; margin-top:16px; padding:10px 16px; background:rgba(255,199,0,.15);
                    border:1px solid rgba(255,199,0,.4); border-radius:10px; color:#FFC700; font-family:system-ui,sans-serif; font-weight:600; }
        .btn-marcar { margin-top:16px; padding:10px 16px; background:rgba(255,199,0,.12); border:1px solid rgba(255,199,0,.35);
                      border-radius:10px; color:#FFC700; font-family:system-ui,sans-serif; font-weight:600; cursor:pointer; }
        .badge { position:fixed; top:72px; left:50%; transform:translateX(-50%); padding:10px 18px; background:rgba(34,197,94,.9);
                 color:#fff; border-radius:10px; font-family:system-ui,sans-serif; font-size:.9rem; z-index:20; opacity:0; transition:opacity .3s; }
        .badge.show { opacity:1; }
        .sec-nav { font-family:system-ui,sans-serif; display:flex; flex-wrap:wrap; gap:8px; margin:0 0 20px; padding:0; list-style:none; }
        .sec-nav a { display:inline-block; padding:6px 12px; border-radius:8px; font-size:.82rem;
                     background:rgba(255,199,0,.1); border:1px solid rgba(255,199,0,.2); color:#A1A1A1; }
        .sec-nav a:hover, .sec-nav a.active { color:#FFC700; border-color:rgba(255,199,0,.45); }
        .accordion { font-family:system-ui,sans-serif; }
        .acc-item { border:1px solid rgba(255,199,0,.18); border-radius:10px; margin-bottom:10px; overflow:hidden;
                    background:rgba(20,20,24,.5); }
        .acc-item summary { cursor:pointer; padding:14px 16px; font-weight:600; color:#FFC700; list-style:none;
                            display:flex; align-items:center; justify-content:space-between; }
        .acc-item summary::-webkit-details-marker { display:none; }
        .acc-item summary::after { content:'▼'; font-size:.65rem; opacity:.5; transition:transform .2s; }
        .acc-item[open] summary::after { transform:rotate(180deg); }
        .acc-body { padding:0 16px 16px; font-size:1rem; line-height:1.75; color:#e8e8e8; }
        .acc-body .bible-ref-link { color:#7dd3fc; border-bottom:1px dotted rgba(125,211,252,.5); }
    </style>
    @vite(['resources/css/fonts.css', 'resources/js/pages/cartao-bible-study.js'])
</head>
<body>
<div class="wrap">
    <div class="nav">
        <a href="{{ $hubUrl }}">← Bíblia</a>
        <a href="{{ $profileUrl }}">Voltar ao perfil</a>
        <a href="{{ $readUrl }}">Ler {{ $bookName }}</a>
    </div>

    @if($study && (!empty($study['title']) || !empty($contentHtml) || !empty($study['content']) || !empty($sections)))
        <h1>Estudo: {{ $bookName }}</h1>
        <div class="card">
            @if(!empty($study['title']))
                <h2>{{ $study['title'] }}</h2>
            @endif

            @if(!empty($sections))
                <ul class="sec-nav" id="sec-nav">
                    @foreach($sections as $sec)
                        <li><a href="#sec-{{ $sec['id'] }}">{{ $sec['title'] }}</a></li>
                    @endforeach
                </ul>
                <div class="accordion" id="study-sections">
                    @foreach($sections as $sec)
                        <details class="acc-item" id="sec-{{ $sec['id'] }}" {{ $loop->first ? 'open' : '' }}>
                            <summary>{{ $sec['title'] }}</summary>
                            <div class="acc-body">{!! $sec['html'] ?? '' !!}</div>
                        </details>
                    @endforeach
                </div>
            @else
                <div class="content" id="study-content">{!! $contentHtml !!}</div>
            @endif

            <button type="button" class="btn-marcar" id="btn-marcar">Marcar onde parei</button>
            @if(!empty($study['chapters']))
                <div class="chapters">
                    <h3>Estudos por capítulo</h3>
                    @foreach($study['chapters'] as $c)
                        <a href="/{{ $slug }}/bible/{{ $bookId }}/{{ $c['chapter_number'] }}">
                            Cap. {{ $c['chapter_number'] }}@if(!empty($c['title'])) — {{ $c['title'] }}@endif
                        </a>
                    @endforeach
                </div>
            @endif
        </div>
    @else
        <div class="empty">
            <p style="font-size:1.1rem;margin-bottom:12px">Estudo de <strong>{{ $bookName }}</strong> ainda não publicado.</p>
            <p style="margin-bottom:16px">Enquanto isso, leia o livro na Bíblia.</p>
            <a class="btn-read" href="{{ $readUrl }}">Ler {{ $bookName }} — Capítulo 1</a>
        </div>
    @endif
</div>
<div class="badge" id="badge">Posição salva</div>
<script>window.__CK_BOOT_BIBLE_STUDY = { j0: @json($bookId) };</script>

</body>
</html>

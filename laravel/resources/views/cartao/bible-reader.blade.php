<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $chapterData['bookName'] }} {{ $chapterData['chapter'] }} — Bíblia</title>
    <style>
        body { margin:0; font-family: Georgia, 'Times New Roman', serif; background:#0D0D0F; color:#ECECEC; }
        .wrap { max-width: 720px; margin: 0 auto; padding: 24px 16px 72px; }
        a { color:#FFC700; text-decoration:none; }
        .top { font-family: system-ui, sans-serif; font-size:.9rem; display:flex; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
        h1 { font-size:1.45rem; font-weight:600; margin:0 0 6px; }
        .meta { opacity:.7; margin-bottom: 22px; font-family: system-ui, sans-serif; font-size:.85rem; }
        .v { display:flex; gap:10px; margin:0 0 12px; line-height:1.7; font-size:1.12rem; }
        .n { min-width:1.6rem; color:#FFC700; font-family: system-ui, sans-serif; font-size:.85rem; padding-top:.35rem; }
        .pager { position:fixed; left:0; right:0; bottom:0; background:rgba(13,13,15,.92); border-top:1px solid #2a2a30;
                  display:flex; justify-content:space-between; padding:12px 16px; font-family:system-ui,sans-serif; }
        .pager a, .pager span { min-width: 90px; text-align:center; }
        .pager span { opacity:.35; }
    </style>
</head>
<body>
<div class="wrap">
    <div class="top">
        <a href="{{ $hubUrl }}">← Livros</a>
        @if(!empty($studyUrl))
            <a href="{{ $studyUrl }}">Estudo</a>
        @endif
        <a href="{{ $profileUrl }}">Cartão</a>
    </div>
    <h1>{{ $chapterData['bookName'] }} {{ $chapterData['chapter'] }}</h1>
    <div class="meta">{{ strtoupper($translation) }} · {{ count($chapterData['verses']) }} versículos</div>
    @foreach($chapterData['verses'] as $v)
        <div class="v"><div class="n">{{ $v['verse'] }}</div><div>{{ $v['text'] }}</div></div>
    @endforeach
</div>
<div class="pager">
    @if($prevUrl)
        <a href="{{ $prevUrl }}">← Anterior</a>
    @else
        <span>← Anterior</span>
    @endif
    <a href="{{ $hubUrl }}">Livros</a>
    @if($nextUrl)
        <a href="{{ $nextUrl }}">Próximo →</a>
    @else
        <span>Próximo →</span>
    @endif
</div>
</body>
</html>

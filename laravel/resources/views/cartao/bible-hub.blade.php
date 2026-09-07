<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bíblia — {{ $slug }}</title>
    <style>
        body { margin:0; font-family: Georgia, 'Times New Roman', serif; background:#0D0D0F; color:#ECECEC; }
        .wrap { max-width: 820px; margin: 0 auto; padding: 28px 16px 64px; }
        a { color: #FFC700; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .verse { background:#16161a; border-radius:16px; padding:24px; margin:20px 0 28px; line-height:1.65; font-size:1.15rem; }
        .ref { color:#FFC700; font-size:.95rem; margin-top:12px; }
        h1,h2 { font-weight:600; letter-spacing:.02em; }
        h2 { font-size:1.05rem; margin: 28px 0 12px; color:#FFC700; }
        .books { display:grid; grid-template-columns: repeat(auto-fill,minmax(140px,1fr)); gap:8px; }
        .book { background:rgba(255,255,255,.04); border-radius:10px; padding:10px 12px; font-size:.92rem; }
        .book small { display:block; opacity:.55; margin-top:4px; font-family: system-ui, sans-serif; font-size:.75rem; }
        .nav { font-family: system-ui, sans-serif; font-size:.9rem; margin-bottom: 8px; }
    </style>
</head>
<body>
<div class="wrap">
    <p class="nav"><a href="{{ $profileUrl }}">← Cartão</a></p>
    <h1>Bíblia</h1>
    <p class="nav">Tradução: {{ strtoupper($translation) }}</p>
    @if(!empty($verse))
        <div class="verse">
            <div>{{ is_array($verse) ? ($verse['texto'] ?? $verse['text'] ?? '') : $verse }}</div>
            @if(is_array($verse) && (!empty($verse['referencia']) || !empty($verse['reference'])))
                <div class="ref">{{ $verse['referencia'] ?? $verse['reference'] }}</div>
            @endif
        </div>
    @endif

    @php $withStudy = $booksWithStudy ?? []; @endphp
    @if(!empty($withStudy))
        <h2>Estudos por livro</h2>
        <div class="books">
            @foreach(array_merge($at ?? [], $nt ?? []) as $b)
                @php $id = $b['id'] ?? ''; @endphp
                @if($id !== '' && !empty($withStudy[$id]))
                    <a class="book" href="/{{ $slug }}/biblia/estudos-livro/{{ $id }}">{{ $b['name'] ?? $id }}<small>estudo</small></a>
                @endif
            @endforeach
        </div>
    @endif

    <h2>Antigo Testamento</h2>
    <div class="books">
        @foreach(($at ?? []) as $b)
            @php
                $id = $b['id'] ?? '';
                $name = $b['name'] ?? $id;
                $n = $chapterCounts[$id] ?? 1;
                $meta = $n.' cap.'.(!empty($withStudy[$id]) ? ' · estudo' : '');
            @endphp
            <a class="book" href="/{{ $slug }}/bible/{{ $id }}/1">{{ $name }}<small>{{ $meta }}</small></a>
        @endforeach
    </div>

    <h2>Novo Testamento</h2>
    <div class="books">
        @foreach(($nt ?? []) as $b)
            @php
                $id = $b['id'] ?? '';
                $name = $b['name'] ?? $id;
                $n = $chapterCounts[$id] ?? 1;
                $meta = $n.' cap.'.(!empty($withStudy[$id]) ? ' · estudo' : '');
            @endphp
            <a class="book" href="/{{ $slug }}/bible/{{ $id }}/1">{{ $name }}<small>{{ $meta }}</small></a>
        @endforeach
    </div>
</div>
</body>
</html>

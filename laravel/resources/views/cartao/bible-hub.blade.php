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

    <p class="nav" style="margin-top:20px;display:flex;flex-wrap:wrap;gap:14px">
        <a href="{{ $devotionalUrl ?? ('/'.$slug.'/biblia/devocional') }}">Devocional ({{ $devotionalDay ?? '' }})</a>
        <a href="{{ $salmoUrl ?? ('/'.$slug.'/biblia/salmo') }}">Salmo do dia</a>
        <a href="{{ $planUrl ?? ('/'.$slug.'/biblia/plano') }}">Plano de leitura</a>
    </p>
    @if(!empty($salmo['texto']))
        <div class="verse" style="margin-top:8px">
            <div style="font-family:system-ui,sans-serif;font-size:.8rem;color:#FFC700;margin-bottom:8px">Salmo do dia</div>
            @if(!empty($salmo['ref']))<div class="ref">{{ $salmo['ref'] }}</div>@endif
            <div style="font-size:1rem">{{ $salmo['texto'] }}</div>
            <p class="nav" style="margin-top:12px;margin-bottom:0"><a href="{{ $salmoUrl }}">Abrir →</a></p>
        </div>
    @endif
    @if(!empty($plan['summary']) || !empty($plan['book_id']))
        <div class="verse" style="margin-top:12px">
            <div style="font-family:system-ui,sans-serif;font-size:.8rem;color:#FFC700;margin-bottom:8px">Plano · dia {{ $devotionalDay ?? '' }}</div>
            <div style="font-weight:600">{{ $plan['summary'] ?? ($plan['book_id'].' '.$plan['chapter_from']) }}</div>
            <p class="nav" style="margin-top:12px;margin-bottom:0"><a href="{{ $planUrl }}">Abrir plano →</a></p>
        </div>
    @endif
    @if(!empty($devotionalToday['titulo']) || !empty($devotionalToday['reflexao']))
        <div class="verse" style="margin-top:8px">
            <div style="font-family:system-ui,sans-serif;font-size:.8rem;color:#FFC700;margin-bottom:8px">Devocional 365</div>
            @if(!empty($devotionalToday['titulo']))
                <div style="font-weight:600;margin-bottom:8px">{{ $devotionalToday['titulo'] }}</div>
            @endif
            @if(!empty($devotionalToday['versiculo_ref']))
                <div class="ref">{{ $devotionalToday['versiculo_ref'] }}</div>
            @endif
            @if(!empty($devotionalToday['reflexao']))
                <div style="font-size:1rem;opacity:.9">{{ \Illuminate\Support\Str::limit($devotionalToday['reflexao'], 220) }}</div>
            @endif
            <p class="nav" style="margin-top:12px;margin-bottom:0"><a href="{{ $devotionalUrl }}">Ler completo →</a></p>
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

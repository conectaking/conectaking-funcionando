<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bíblia — {{ $slug }}</title>
    
    @vite(['resources/css/fonts.css', 'resources/css/pub/pages/cartao-bible-hub.css'])
</head>
<body>
<div class="wrap">
    <p class="nav"><a href="{{ $profileUrl }}">← Voltar ao perfil</a></p>
    <h1>Bíblia</h1>
    <p class="nav" style="opacity:.75;margin-top:-4px;margin-bottom:12px">Leitura pública · Devocionais · Planos</p>
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
        <a href="{{ $devotionalUrl ?? ('/'.$slug.'/biblia/devocional') }}">Devocional 365</a>
        <a href="{{ $salmoUrl ?? ('/'.$slug.'/biblia/salmo') }}">Salmo</a>
        <a href="{{ $planUrl ?? ('/'.$slug.'/biblia/plano') }}">Plano</a>
        <a href="{{ $wholeUrl ?? ('/'.$slug.'/biblia/biblia-inteira') }}">Bíblia inteira</a>
        <a href="{{ $prosperidadeUrl ?? ('/'.$slug.'/biblia/prosperidade') }}">Prosperidade</a>
        @if(!empty($cunhaUrl))
            <a href="{{ $cunhaUrl }}" target="_blank" rel="noopener">Mensagem</a>
        @endif
        @if(!empty($bibleAiUrl))
            <a href="{{ $bibleAiUrl }}" target="_blank" rel="noopener">Assistente IA</a>
        @endif
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

    @php $withStudy = []; @endphp
    {{-- Estudos por livro: seção pública ocultada até corpus completo --}}

    <h2>Antigo Testamento</h2>
    <div class="books">
        @foreach(($at ?? []) as $b)
            @php
                $id = $b['id'] ?? '';
                $name = $b['name'] ?? $id;
                $n = $chapterCounts[$id] ?? 1;
                $meta = $n.' cap.';
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
                $meta = $n.' cap.';
            @endphp
            <a class="book" href="/{{ $slug }}/bible/{{ $id }}/1">{{ $name }}<small>{{ $meta }}</small></a>
        @endforeach
    </div>
</div>
</body>
</html>

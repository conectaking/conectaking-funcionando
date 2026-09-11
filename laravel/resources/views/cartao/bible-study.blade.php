<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Estudo: {{ $bookName }} — Bíblia</title>
    
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
            <p class="ck-bs-3af214">Estudo de <strong>{{ $bookName }}</strong> ainda não publicado.</p>
            <p class="ck-bs-87c136">Enquanto isso, leia o livro na Bíblia.</p>
            <a class="btn-read" href="{{ $readUrl }}">Ler {{ $bookName }} — Capítulo 1</a>
        </div>
    @endif
</div>
<div class="badge" id="badge">Posição salva</div>
<script>window.__CK_BOOT_BIBLE_STUDY = { j0: @json($bookId) };</script>

</body>
</html>

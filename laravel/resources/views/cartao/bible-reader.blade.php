<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $chapterData['bookName'] }} {{ $chapterData['chapter'] }} — Bíblia</title>
    
    @vite(['resources/css/fonts.css', 'resources/js/pages/cartao-bible-reader.js'])
</head>
<body>
<div class="wrap">
    <div class="top">
        <a href="{{ $hubUrl }}">← Livros</a>
        <a href="{{ $profileUrl }}">Voltar ao perfil</a>
    </div>
    <h1>{{ $chapterData['bookName'] }} {{ $chapterData['chapter'] }}</h1>
    <div class="meta">{{ strtoupper($translation) }} · {{ count($chapterData['verses']) }} versículos</div>

    @if(!empty($chapterStudy) && (!empty($chapterStudy['title']) || !empty($chapterStudyHtml)))
        <details class="study-block">
            <summary>
                Estudo do capítulo
                @if(!empty($chapterStudy['title']))
                    — {{ $chapterStudy['title'] }}
                @endif
            </summary>
            <div class="study-body">{!! $chapterStudyHtml !!}</div>
        </details>
    @endif

    <div class="actions">
        <button type="button" class="btn-mark" id="btn-mark-read">Marcar como lido</button>
        <span class="mark-status" id="mark-status"></span>
    </div>

    @php
        $headings = $chapterData['sectionHeadings'] ?? [];
        $headingIdx = 0;
        $headingCount = count($headings);
    @endphp

    @foreach($chapterData['verses'] as $v)
        @while($headingIdx < $headingCount && ($headings[$headingIdx]['beforeVerse'] ?? 0) <= ($v['verse'] ?? 0))
            <div class="section-heading">{{ $headings[$headingIdx]['text'] }}</div>
            @php $headingIdx++; @endphp
        @endwhile
        <div class="v{{ !empty($v['redLetter']) ? ' red-letter' : '' }}" id="v{{ $v['verse'] }}">
            <div class="n">{{ $v['verse'] }}</div>
            <div class="t">{{ $v['text'] }}</div>
        </div>
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
<script>window.__CK_BOOT_BIBLE_READER = { bookId: @json($bookId ?? ($chapterData['bookId'] ?? '')), chapter: @json((int) ($chapter ?? ($chapterData['chapter'] ?? 0))), markApi: @json($markReadApi ?? '/api/bible/mark-read') };</script>
</body>
</html>

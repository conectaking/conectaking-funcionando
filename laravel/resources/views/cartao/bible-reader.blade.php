<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $chapterData['bookName'] }} {{ $chapterData['chapter'] }} — Bíblia</title>
    <style>
        body { margin:0; font-family: Georgia, 'Times New Roman', serif; background:#0D0D0F; color:#ECECEC; }
        .wrap { max-width: 720px; margin: 0 auto; padding: 24px 16px 120px; }
        a { color:#FFC700; text-decoration:none; }
        .top { font-family: system-ui, sans-serif; font-size:.9rem; display:flex; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
        h1 { font-size:1.45rem; font-weight:600; margin:0 0 6px; }
        .meta { opacity:.7; margin-bottom: 22px; font-family: system-ui, sans-serif; font-size:.85rem; }
        .section-heading { font-family: system-ui, sans-serif; font-size:.82rem; font-weight:600; letter-spacing:.04em;
                           text-transform:uppercase; color:#A1A1A1; margin:28px 0 10px; padding:8px 0 6px;
                           border-top:1px solid rgba(255,199,0,.15); }
        .v { display:flex; gap:10px; margin:0 0 12px; line-height:1.7; font-size:1.12rem; scroll-margin-top: 24px; }
        .v.red-letter .t { color:#E85D5D; }
        .n { min-width:1.6rem; color:#FFC700; font-family: system-ui, sans-serif; font-size:.85rem; padding-top:.35rem; flex-shrink:0; }
        .study-block { font-family: system-ui, sans-serif; margin-bottom:24px; border:1px solid rgba(255,199,0,.25);
                       border-radius:12px; background:rgba(28,28,33,.6); overflow:hidden; }
        .study-block summary { cursor:pointer; padding:14px 16px; font-weight:600; color:#FFC700; list-style:none;
                               display:flex; align-items:center; justify-content:space-between; }
        .study-block summary::-webkit-details-marker { display:none; }
        .study-block summary::after { content:'▼'; font-size:.7rem; opacity:.6; transition:transform .2s; }
        .study-block[open] summary::after { transform:rotate(180deg); }
        .study-body { padding:0 16px 16px; font-size:.98rem; line-height:1.7; color:#e0e0e0; }
        .study-body .bible-ref-link { color:#7dd3fc; border-bottom:1px dotted rgba(125,211,252,.5); }
        .actions { font-family: system-ui, sans-serif; margin:20px 0 28px; display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .btn-mark { padding:10px 16px; background:rgba(255,199,0,.12); border:1px solid rgba(255,199,0,.35);
                    border-radius:10px; color:#FFC700; font-weight:600; cursor:pointer; font-size:.9rem; }
        .btn-mark:disabled { opacity:.55; cursor:default; }
        .mark-status { font-size:.85rem; color:#A1A1A1; }
        .pager { position:fixed; left:0; right:0; bottom:0; background:rgba(13,13,15,.92); border-top:1px solid #2a2a30;
                  display:flex; justify-content:space-between; padding:12px 16px; font-family:system-ui,sans-serif; }
        .pager a, .pager span { min-width: 90px; text-align:center; }
        .pager span { opacity:.35; }
    </style>
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

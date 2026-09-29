@extends('layouts.bible-app')

@section('title', ($chapterData['bookName'] ?? 'Bíblia') . ' ' . ($chapterData['chapter'] ?? '') . ' — Bíblia King')
@section('meta_description', 'Leia ' . ($chapterData['bookName'] ?? '') . ' capítulo ' . ($chapterData['chapter'] ?? '') . ' online no Conecta King.')
@section('speak_target', '.reader-verses-flow')
@section('speak_title', ($chapterData['bookName'] ?? '') . ' ' . ($chapterData['chapter'] ?? ''))

@section('content')
<div class="reader-container">
    {{-- Header do Capítulo --}}
    <header class="reader-header">
        <h1 class="reader-book-title">{{ $chapterData['bookName'] }} {{ $chapterData['chapter'] }}</h1>
        <div class="reader-meta-subtitle">
            <span class="bible-trans-badge">{{ strtoupper($translation) }}</span>
            <span>·</span>
            <span>{{ count($chapterData['verses']) }} versículos</span>
            @if(!empty($studyUrl))
                <span>·</span>
                <a href="{{ $studyUrl }}" style="color:var(--gold-primary);font-weight:600;"><i class="fas fa-graduation-cap"></i> Estudo do Livro</a>
            @endif
        </div>
    </header>

    {{-- Estudo do Capítulo (se disponível) --}}
    @if(!empty($chapterStudy) && (!empty($chapterStudy['title']) || !empty($chapterStudyHtml)))
        <details class="chapter-study-card">
            <summary class="chapter-study-summary">
                <i class="fas fa-graduation-cap"></i>
                <span>Estudo do Capítulo @if(!empty($chapterStudy['title'])) — {{ $chapterStudy['title'] }} @endif</span>
            </summary>
            <div class="chapter-study-body">
                {!! $chapterStudyHtml !!}
            </div>
        </details>
    @endif

    {{-- Botão de Marcar como Lido --}}
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <button type="button" class="btn-verse-action" id="btn-reader-mark-read" style="background:var(--bg-surface-elevated);border-color:var(--border-gold);">
            <i class="far fa-check-circle" style="color:var(--gold-primary);"></i>
            <span id="mark-read-label">Marcar capítulo como lido</span>
        </button>
        <span id="mark-read-status" style="font-size:0.85rem;color:var(--gold-primary);font-weight:600;"></span>
    </div>

    {{-- Texto dos Versículos --}}
    @php
        $headings = $chapterData['sectionHeadings'] ?? [];
        $headingIdx = 0;
        $headingCount = count($headings);
    @endphp

    <div class="reader-verses-flow" id="chapter-verses-container" data-book-id="{{ $bookId }}" data-book-name="{{ $chapterData['bookName'] ?? $bookId }}" data-chapter="{{ $chapter }}" data-translation="{{ $translation }}">
        @foreach($chapterData['verses'] as $v)
            @while($headingIdx < $headingCount && ($headings[$headingIdx]['beforeVerse'] ?? 0) <= ($v['verse'] ?? 0))
                <div class="reader-section-divider">{{ $headings[$headingIdx]['text'] }}</div>
                @php $headingIdx++; @endphp
            @endwhile

            <div class="verse-item {{ !empty($v['redLetter']) ? 'red-letter' : '' }}" id="v{{ $v['verse'] }}" data-verse-num="{{ $v['verse'] }}">
                <span class="verse-num">{{ $v['verse'] }}</span>
                <span class="verse-text">{{ $v['text'] }}</span>
            </div>
        @endforeach
    </div>

    {{-- Navegação Inferior de Capítulos --}}
    <nav class="reader-pager-bar" aria-label="Navegação entre capítulos">
        @if(!empty($prevUrl))
            <a href="{{ $prevUrl }}" class="btn-pager">
                <i class="fas fa-arrow-left"></i>
                <span>Capítulo anterior</span>
            </a>
        @else
            <button type="button" class="btn-pager" disabled>
                <i class="fas fa-arrow-left"></i>
                <span>Capítulo anterior</span>
            </button>
        @endif

        <a href="{{ $hubUrl }}#livros" class="btn-pager" title="Ver todos os livros">
            <i class="fas fa-list-ul"></i>
            <span>Livros</span>
        </a>

        @if(!empty($nextUrl))
            <a href="{{ $nextUrl }}" class="btn-pager">
                <span>Próximo capítulo</span>
                <i class="fas fa-arrow-right"></i>
            </a>
        @else
            <button type="button" class="btn-pager" disabled>
                <span>Próximo capítulo</span>
                <i class="fas fa-arrow-right"></i>
            </button>
        @endif
    </nav>
</div>
@endsection

@push('scripts')
<script>
(function() {
    const bookId = @json($bookId ?? ($chapterData['bookId'] ?? ''));
    const chapter = @json((int) ($chapter ?? ($chapterData['chapter'] ?? 0)));
    const markApi = @json($markReadApi ?? '/api/bible/mark-read');
    const lsKey = 'ck_bible_read_' + bookId + '_' + chapter;

    const btn = document.getElementById('btn-reader-mark-read');
    const label = document.getElementById('mark-read-label');
    const st = document.getElementById('mark-read-status');

    function setMarked(text) {
        if (label) label.textContent = 'Capítulo lido ✓';
        if (st) st.textContent = text || '✓ Registrado';
        if (btn) {
            btn.style.borderColor = '#10B981';
            btn.style.color = '#10B981';
        }
    }

    if (localStorage.getItem(lsKey) === '1') {
        setMarked('✓ Lido');
    }

    if (btn) {
        btn.addEventListener('click', function() {
            btn.disabled = true;
            if (st) st.textContent = 'Salvando...';

            fetch(markApi, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ book: bookId, chapter: chapter, mode: 'read' })
            }).then(r => r.json()).then(res => {
                localStorage.setItem(lsKey, '1');
                setMarked('✓ Salvo no seu progresso');
                if (window.BibleApp) window.BibleApp.toast('Capítulo marcado como lido!', 'fas fa-check-circle');
            }).catch(() => {
                localStorage.setItem(lsKey, '1');
                setMarked('✓ Salvo localmente');
            }).finally(() => {
                btn.disabled = false;
            });
        });
    }
})();
</script>
@endpush

@extends('layouts.bible-app')

@section('title', 'Salmo do Dia — ' . ($salmo['ref'] ?? 'Bíblia King'))
@section('meta_description', 'Salmo do dia para oração e meditação no Conecta King.')
@section('speak_target', '#salmo-verse-quote')
@section('speak_title', 'Salmo do Dia: ' . ($salmo['ref'] ?? 'Salmo'))

@section('content')
<div class="reader-container">
    <header class="reader-header">
        <span class="hero-badge-tag" style="margin-bottom:10px;"><i class="fas fa-music"></i> Meditação & Oração</span>
        <h1 class="reader-book-title">Salmo do Dia</h1>
        @if(!empty($salmo['ref']))
            <div class="reader-meta-subtitle" style="color:var(--gold-primary);font-family:var(--font-heading);font-size:1.15rem;font-weight:700;">
                {{ $salmo['ref'] }}
            </div>
        @endif
    </header>

    @if(!empty($salmo['texto']))
        <div class="hero-verse-card">
            <blockquote class="hero-verse-quote" id="salmo-verse-quote" style="font-size:1.25rem;">
                {!! nl2br(e($salmo['texto'])) !!}
            </blockquote>

            <div class="verse-action-row">
                <button type="button" class="btn-verse-action btn-audio" data-speak-target="#salmo-verse-quote" data-speak-title="{{ $salmo['ref'] ?? 'Salmo do Dia' }}">
                    <i class="fas fa-volume-up"></i>
                    <span>Ouvir Salmo</span>
                </button>

                <button type="button" class="btn-verse-action" data-copy-text="{{ $salmo['texto'] }} — {{ $salmo['ref'] ?? '' }}">
                    <i class="fas fa-copy"></i>
                    <span>Copiar</span>
                </button>

                <button type="button" class="btn-verse-action" data-share-wa="{{ $salmo['texto'] }} — {{ $salmo['ref'] ?? '' }} (Salmo do Dia)">
                    <i class="fab fa-whatsapp" style="color:#25D366;"></i>
                    <span>WhatsApp</span>
                </button>

                <button type="button" class="btn-verse-action" data-stories-verse="{{ $salmo['texto'] }}" data-stories-ref="{{ $salmo['ref'] ?? '' }}" data-stories-owner="{{ $slug }}">
                    <i class="fab fa-instagram" style="color:#E1306C;"></i>
                    <span>Stories</span>
                </button>
            </div>
        </div>

        @if(!empty($salmo['reflexao']))
            <div style="background:var(--bg-card);border:1px solid var(--border-gold);border-radius:var(--radius-md);padding:20px 24px;margin-bottom:24px;line-height:1.75;">
                <h3 style="font-family:var(--font-heading);color:var(--gold-primary);margin:0 0 10px;font-size:1.1rem;">
                    <i class="fas fa-dove"></i> Reflexão para a sua Oração
                </h3>
                <div style="color:var(--text-secondary);font-size:0.98rem;">
                    {!! nl2br(e($salmo['reflexao'])) !!}
                </div>
            </div>
        @endif

        @if(!empty($readUrl))
            <div style="text-align:center;margin:30px 0;">
                <a href="{{ $readUrl }}" class="btn-pager" style="display:inline-flex;padding:12px 24px;">
                    <i class="fas fa-book-open"></i>
                    <span>Ler Salmo completo no leitor</span>
                </a>
            </div>
        @endif
    @else
        <div style="text-align:center;padding:50px 20px;background:var(--bg-card);border-radius:var(--radius-lg);margin:20px 0;">
            <i class="fas fa-music" style="font-size:2.5rem;color:var(--text-muted);margin-bottom:14px;display:block;"></i>
            <p style="color:var(--text-secondary);">Salmo do dia não disponível no momento.</p>
        </div>
    @endif
</div>
@endsection

@extends('layouts.bible-app', [
    'title' => 'Estudo: ' . $bookName . ' — Conecta King',
    'activeTab' => 'bible',
    'showAudioBar' => false,
])

@section('content')
<div class="bible-view-container">

    {{-- Top bar navigation --}}
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
        <a href="{{ $hubUrl }}" class="bible-btn bible-btn-secondary" style="font-size:0.85rem; padding:0.45rem 0.85rem;">
            <i class="fas fa-chevron-left"></i> Hub Bíblia
        </a>
        <div style="display:flex; gap:0.5rem;">
            <a href="{{ $readUrl }}" class="bible-btn bible-btn-primary" style="font-size:0.85rem; padding:0.45rem 0.85rem;">
                <i class="fas fa-book-open"></i> Ler Livro
            </a>
            @if(!empty($profileUrl))
            <a href="{{ $profileUrl }}" class="bible-btn bible-btn-secondary" style="font-size:0.85rem; padding:0.45rem 0.85rem;">
                <i class="fas fa-id-card"></i> Cartão
            </a>
            @endif
        </div>
    </div>

    @if($study && (!empty($study['title']) || !empty($contentHtml) || !empty($study['content']) || !empty($sections)))
        <div style="text-align:center; margin-bottom:2rem;">
            <div style="display:inline-flex; align-items:center; gap:0.5rem; background:rgba(255, 199, 0, 0.12); border:1px solid rgba(255, 199, 0, 0.3); border-radius:999px; padding:0.35rem 1rem; color:var(--bible-accent); font-size:0.82rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:0.75rem;">
                <i class="fas fa-graduation-cap"></i> Estudo Teológico & Histórico
            </div>
            <h1 style="font-family:var(--bible-serif); font-size:2.2rem; font-weight:700; color:var(--bible-text); margin-bottom:0.5rem; line-height:1.2;">
                {{ $bookName }}
            </h1>
            @if(!empty($study['title']))
                <p style="color:var(--bible-accent); font-size:1.1rem; font-family:var(--bible-serif); font-style:italic;">
                    {{ $study['title'] }}
                </p>
            @endif
        </div>

        <div class="bible-card" style="padding:2rem; margin-bottom:2.5rem;">
            @if(!empty($sections))
                <div style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid var(--bible-border);">
                    @foreach($sections as $sec)
                        <a href="#sec-{{ $sec['id'] }}" class="bible-btn bible-btn-secondary" style="font-size:0.82rem; padding:0.4rem 0.75rem;">
                            {{ $sec['title'] }}
                        </a>
                    @endforeach
                </div>

                <div style="display:flex; flex-direction:column; gap:1.25rem;">
                    @foreach($sections as $sec)
                        <details id="sec-{{ $sec['id'] }}" {{ $loop->first ? 'open' : '' }} 
                                 style="background:rgba(255,255,255,0.02); border:1px solid var(--bible-border); border-radius:12px; padding:1rem 1.25rem;">
                            <summary style="font-weight:700; font-size:1.05rem; color:var(--bible-accent); cursor:pointer; list-style:none; display:flex; justify-content:space-between; align-items:center;">
                                <span>{{ $sec['title'] }}</span>
                                <i class="fas fa-chevron-down" style="font-size:0.85rem; opacity:0.6;"></i>
                            </summary>
                            <div style="margin-top:1rem; padding-top:0.75rem; border-top:1px solid rgba(255,255,255,0.06); line-height:1.8; color:var(--bible-text); font-size:1.02rem;">
                                {!! $sec['html'] ?? '' !!}
                            </div>
                        </details>
                    @endforeach
                </div>
            @else
                <div style="line-height:1.8; font-size:1.05rem; color:var(--bible-text);">
                    {!! $contentHtml !!}
                </div>
            @endif

            @if(!empty($study['chapters']))
                <div style="margin-top:2.5rem; padding-top:1.5rem; border-top:1px solid var(--bible-border);">
                    <h3 style="font-size:1.1rem; color:var(--bible-accent); margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
                        <i class="fas fa-list-ol"></i> Estudos por Capítulo
                    </h3>
                    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:0.75rem;">
                        @foreach($study['chapters'] as $c)
                            <a href="/{{ $slug }}/biblia/{{ $bookId }}/{{ $c['chapter_number'] }}" class="bible-card" style="padding:0.75rem 1rem; text-decoration:none; display:flex; flex-direction:column; gap:0.25rem;">
                                <strong style="color:var(--bible-accent); font-size:0.95rem;">Capítulo {{ $c['chapter_number'] }}</strong>
                                @if(!empty($c['title']))
                                    <span style="color:var(--bible-muted); font-size:0.82rem; line-height:1.3;">{{ $c['title'] }}</span>
                                @endif
                            </a>
                        @endforeach
                    </div>
                </div>
            @endif
        </div>
    @else
        <div class="bible-card" style="text-align:center; padding:3.5rem 1.5rem; margin-top:2rem;">
            <div style="width:64px; height:64px; border-radius:50%; background:rgba(255,199,0,0.1); border:1px solid rgba(255,199,0,0.25); display:inline-flex; align-items:center; justify-content:center; color:var(--bible-accent); font-size:1.5rem; margin-bottom:1.25rem;">
                <i class="fas fa-feather-alt"></i>
            </div>
            <h2 style="font-family:var(--bible-serif); font-size:1.5rem; color:var(--bible-text); margin-bottom:0.75rem;">
                Estudo de {{ $bookName }} em preparação
            </h2>
            <p style="color:var(--bible-muted); font-size:0.95rem; max-width:440px; margin:0 auto 1.75rem auto; line-height:1.6;">
                O comentário introdutório e exegético para este livro está sendo preparado. Você já pode ler o texto sagrado diretamente no leitor.
            </p>
            <a href="{{ $readUrl }}" class="bible-btn bible-btn-primary" style="padding:0.75rem 1.75rem;">
                <i class="fas fa-book-open"></i> Abrir Capítulo 1 de {{ $bookName }}
            </a>
        </div>
    @endif

</div>
@endsection

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
    <p class="nav ck-bh-7c02c7">Leitura pública · Devocionais · Planos</p>
    <p class="nav">Tradução: {{ strtoupper($translation) }}</p>
    @if(!empty($verse))
        <div class="verse">
            <div>{{ is_array($verse) ? ($verse['texto'] ?? $verse['text'] ?? '') : $verse }}</div>
            @if(is_array($verse) && (!empty($verse['referencia']) || !empty($verse['reference'])))
                <div class="ref">{{ $verse['referencia'] ?? $verse['reference'] }}</div>
            @endif
            {{-- Botão compartilhar versículo do dia --}}
            @php
                $verseText  = is_array($verse) ? ($verse['texto'] ?? $verse['text'] ?? '') : (string)$verse;
                $verseRef   = is_array($verse) ? ($verse['referencia'] ?? $verse['reference'] ?? '') : '';
                $shareText  = "\"{$verseText}\"\n— {$verseRef}\n\n📖 Bíblia King · cnking.bio/{$slug}";
                $waText     = urlencode($shareText);
            @endphp
            <div class="verse-share-row" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button"
                    class="btn-verse-share"
                    id="btn-verse-copy"
                    data-verse="{{ e($verseText) }}"
                    data-ref="{{ e($verseRef) }}"
                    aria-label="Copiar versículo"
                    title="Copiar para área de transferência">
                    📋 Copiar
                </button>
                <a class="btn-verse-share btn-verse-wa"
                    href="https://wa.me/?text={{ $waText }}"
                    target="_blank" rel="noopener"
                    aria-label="Compartilhar no WhatsApp">
                    💬 WhatsApp
                </a>
                <button type="button"
                    class="btn-verse-share btn-verse-insta"
                    id="btn-verse-stories"
                    data-verse="{{ e($verseText) }}"
                    data-ref="{{ e($verseRef) }}"
                    aria-label="Gerar card para Instagram Stories">
                    📸 Stories
                </button>
            </div>
            {{-- Modal canvas para Stories --}}
            <div id="stories-modal" class="stories-modal" style="display:none;" role="dialog" aria-modal="true" aria-label="Card para Instagram Stories">
                <div class="stories-modal-inner">
                    <button type="button" class="stories-close" id="btn-stories-close" aria-label="Fechar">✕</button>
                    <canvas id="stories-canvas" width="1080" height="1920" style="display:block;max-width:100%;border-radius:12px;"></canvas>
                    <div style="margin-top:12px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                        <button type="button" class="btn-verse-share" id="btn-stories-download">⬇️ Baixar imagem</button>
                    </div>
                </div>
            </div>
        </div>
    @endif


    <p class="nav ck-bh-7791b0">
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
        <div class="verse ck-mt-8">
            <div class="ck-bh-49e2ca">Salmo do dia</div>
            @if(!empty($salmo['ref']))<div class="ref">{{ $salmo['ref'] }}</div>@endif
            <div class="ck-bh-951b72">{{ $salmo['texto'] }}</div>
            <p class="nav ck-mt-12-mb-0"><a href="{{ $salmoUrl }}">Abrir →</a></p>
        </div>
    @endif
    @if(!empty($plan['summary']) || !empty($plan['book_id']))
        <div class="verse ck-mt-12">
            <div class="ck-bh-49e2ca">Plano · dia {{ $devotionalDay ?? '' }}</div>
            <div class="ck-bh-eed0f8">{{ $plan['summary'] ?? ($plan['book_id'].' '.$plan['chapter_from']) }}</div>
            <p class="nav ck-mt-12-mb-0"><a href="{{ $planUrl }}">Abrir plano →</a></p>
        </div>
    @endif
    @if(!empty($devotionalToday['titulo']) || !empty($devotionalToday['reflexao']))
        <div class="verse ck-mt-8">
            <div class="ck-bh-49e2ca">Devocional 365</div>
            @if(!empty($devotionalToday['titulo']))
                <div class="ck-bh-d77151">{{ $devotionalToday['titulo'] }}</div>
            @endif
            @if(!empty($devotionalToday['versiculo_ref']))
                <div class="ref">{{ $devotionalToday['versiculo_ref'] }}</div>
            @endif
            @if(!empty($devotionalToday['reflexao']))
                <div class="ck-bh-2c18ac">{{ \Illuminate\Support\Str::limit($devotionalToday['reflexao'], 220) }}</div>
            @endif
            <p class="nav ck-mt-12-mb-0"><a href="{{ $devotionalUrl }}">Ler completo →</a></p>
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

{{-- Estilos de compartilhamento de versículo --}}
<style>
.btn-verse-share {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 10px; font-size: .85rem;
    font-family: system-ui, sans-serif; font-weight: 600; cursor: pointer;
    border: 1px solid rgba(255,199,0,.35); background: rgba(255,199,0,.1);
    color: #FFC700; text-decoration: none; transition: background .2s, transform .15s;
}
.btn-verse-share:hover { background: rgba(255,199,0,.2); transform: scale(1.03); }
.btn-verse-wa  { border-color: rgba(37,211,102,.4); background: rgba(37,211,102,.1); color: #25D366; }
.btn-verse-wa:hover { background: rgba(37,211,102,.2); }
.btn-verse-insta { border-color: rgba(228,64,95,.4); background: rgba(228,64,95,.1); color: #E4405F; }
.btn-verse-insta:hover { background: rgba(228,64,95,.2); }
.stories-modal {
    position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.85);
    display: flex; align-items: center; justify-content: center; padding: 16px;
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.stories-modal-inner {
    max-width: 400px; width: 100%; position: relative; text-align: center;
}
.stories-close {
    position: absolute; top: -14px; right: -14px; width: 34px; height: 34px;
    border-radius: 50%; background: #333; border: none; color: #fff; font-size: 1rem;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    z-index: 1;
}
</style>

{{-- Script de compartilhamento do versículo --}}
<script>
(function () {
    // --- Copiar versículo ---
    var btnCopy = document.getElementById('btn-verse-copy');
    if (btnCopy) {
        btnCopy.addEventListener('click', function () {
            var v = btnCopy.dataset.verse || '';
            var r = btnCopy.dataset.ref  || '';
            var text = '\u201c' + v + '\u201d\n\u2014 ' + r + '\n\n\ud83d\udcd6 B\u00edblia King \u00b7 cnking.bio/{{ $slug }}';
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(function () {
                    btnCopy.textContent = '\u2705 Copiado!';
                    setTimeout(function () { btnCopy.innerHTML = '\ud83d\udccb Copiar'; }, 2500);
                }).catch(function () { fallbackCopy(text, btnCopy); });
            } else {
                fallbackCopy(text, btnCopy);
            }
        });
    }
    function fallbackCopy(text, btn) {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); btn.textContent = '\u2705 Copiado!'; setTimeout(function () { btn.innerHTML = '\ud83d\udccb Copiar'; }, 2500); } catch (e) {}
        document.body.removeChild(ta);
    }

    // --- Instagram Stories Canvas ---
    var btnStories  = document.getElementById('btn-verse-stories');
    var modal       = document.getElementById('stories-modal');
    var btnClose    = document.getElementById('btn-stories-close');
    var btnDownload = document.getElementById('btn-stories-download');
    var canvas      = document.getElementById('stories-canvas');

    function drawStoriesCard(verseText, verseRef) {
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var W = 1080, H = 1920;

        // Fundo gradiente escuro com dourado
        var grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#0D0D10');
        grad.addColorStop(0.45, '#1A1206');
        grad.addColorStop(1, '#0A0A08');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Ornamento circular dourado (brilho de fundo)
        var glow = ctx.createRadialGradient(W/2, H * .42, 0, W/2, H * .42, 520);
        glow.addColorStop(0, 'rgba(255,199,0,.18)');
        glow.addColorStop(1, 'rgba(255,199,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);

        // Ícone da Bíblia no topo
        ctx.font = '120px serif';
        ctx.textAlign = 'center';
        ctx.fillText('\ud83d\udcd6', W/2, 340);

        // Subtítulo "Versículo do Dia"
        ctx.font = '700 46px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,199,0,.7)';
        ctx.letterSpacing = '6px';
        ctx.fillText('VERSÍCULO DO DIA', W/2, 430);

        // Linha separadora dourada
        ctx.strokeStyle = 'rgba(255,199,0,.5)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(120, 480); ctx.lineTo(W - 120, 480); ctx.stroke();

        // Texto do versículo (quebra de linha automática)
        ctx.font = 'italic 700 68px Georgia, serif';
        ctx.fillStyle = '#FFFFF0';
        ctx.letterSpacing = '0px';
        var lines = wrapText(ctx, '\u201c' + verseText + '\u201d', W - 240, 68);
        var lineH = 94;
        var totalH = lines.length * lineH;
        var startY = (H / 2) - (totalH / 2) - 40;
        lines.forEach(function (line, i) {
            ctx.fillText(line, W / 2, startY + i * lineH);
        });

        // Referência
        if (verseRef) {
            ctx.font = '500 52px system-ui, sans-serif';
            ctx.fillStyle = '#FFC700';
            ctx.fillText('\u2014 ' + verseRef, W / 2, startY + lines.length * lineH + 60);
        }

        // Logo / Rodapé
        ctx.font = '700 44px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,199,0,.55)';
        ctx.fillText('cnking.bio/{{ $slug }} \u00b7 B\u00edblia King', W / 2, H - 120);
    }

    function wrapText(ctx, text, maxW, fontSize) {
        var words = text.split(' ');
        var lines = [];
        var current = '';
        words.forEach(function (word) {
            var test = current ? current + ' ' + word : word;
            if (ctx.measureText(test).width > maxW) {
                if (current) lines.push(current);
                current = word;
            } else {
                current = test;
            }
        });
        if (current) lines.push(current);
        return lines;
    }

    if (btnStories && modal && canvas) {
        btnStories.addEventListener('click', function () {
            var v = btnStories.dataset.verse || '';
            var r = btnStories.dataset.ref  || '';
            drawStoriesCard(v, r);
            modal.style.display = 'flex';
        });
    }

    if (btnClose && modal) {
        btnClose.addEventListener('click', function () { modal.style.display = 'none'; });
    }
    if (modal) {
        modal.addEventListener('click', function (e) { if (e.target === modal) modal.style.display = 'none'; });
    }

    if (btnDownload && canvas) {
        btnDownload.addEventListener('click', function () {
            var link = document.createElement('a');
            link.download = 'versiculo-do-dia-biblaking.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    }
})();
</script>
</body>
</html>

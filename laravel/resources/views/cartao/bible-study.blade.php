<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Estudo: {{ $bookName }} — Bíblia</title>
    <style>
        body { margin:0; font-family: Georgia, 'Times New Roman', serif; background:#0D0D0F; color:#ECECEC;
               background-image: linear-gradient(180deg, #0D0D0F 0%, #12121a 50%, #0f0f12 100%); min-height:100vh; }
        .wrap { max-width: 680px; margin: 0 auto; padding: 24px 16px 64px; }
        a { color:#FFC700; text-decoration:none; }
        .nav { font-family: system-ui, sans-serif; font-size:.9rem; display:flex; gap:14px; flex-wrap:wrap; margin-bottom:20px; }
        .nav a { color:#A1A1A1; }
        .nav a:hover { color:#FFC700; }
        h1 { font-size:1.45rem; color:#FFC700; margin:0 0 8px; font-weight:600; text-align:center; }
        .card { background:rgba(28,28,33,.95); border:1px solid rgba(255,199,0,.2); border-radius:16px; padding:24px 20px; margin-top:20px; }
        .card h2 { font-size:1.05rem; color:#FFC700; margin:0 0 14px; font-family: system-ui, sans-serif; }
        .content { font-size:1.05rem; line-height:1.75; color:#e8e8e8; }
        .content .bible-ref-link { color:#7dd3fc; border-bottom:1px dotted rgba(125,211,252,.5); }
        .content .bible-ref-link:hover { color:#FFC700; }
        .empty { text-align:center; padding:40px 16px; color:#A1A1A1; }
        .chapters { margin-top:24px; }
        .chapters h3 { font-size:.95rem; color:#A1A1A1; margin:0 0 10px; font-family:system-ui,sans-serif; }
        .chapters a { display:inline-block; margin:0 8px 8px 0; padding:8px 12px; border-radius:8px;
                      background:rgba(255,199,0,.12); border:1px solid rgba(255,199,0,.25); color:#7dd3fc;
                      font-family:system-ui,sans-serif; font-size:.88rem; }
        .btn-read { display:inline-block; margin-top:16px; padding:10px 16px; background:rgba(255,199,0,.15);
                    border:1px solid rgba(255,199,0,.4); border-radius:10px; color:#FFC700; font-family:system-ui,sans-serif; font-weight:600; }
        .btn-marcar { margin-top:16px; padding:10px 16px; background:rgba(255,199,0,.12); border:1px solid rgba(255,199,0,.35);
                      border-radius:10px; color:#FFC700; font-family:system-ui,sans-serif; font-weight:600; cursor:pointer; }
        .badge { position:fixed; top:72px; left:50%; transform:translateX(-50%); padding:10px 18px; background:rgba(34,197,94,.9);
                 color:#fff; border-radius:10px; font-family:system-ui,sans-serif; font-size:.9rem; z-index:20; opacity:0; transition:opacity .3s; }
        .badge.show { opacity:1; }
    </style>
</head>
<body>
<div class="wrap">
    <div class="nav">
        <a href="{{ $hubUrl }}">← Bíblia</a>
        <a href="{{ $profileUrl }}">Cartão</a>
        <a href="{{ $readUrl }}">Ler {{ $bookName }}</a>
    </div>

    @if($study && (!empty($study['title']) || !empty($contentHtml) || !empty($study['content'])))
        <h1>Estudo: {{ $bookName }}</h1>
        <div class="card">
            @if(!empty($study['title']))
                <h2>{{ $study['title'] }}</h2>
            @endif
            <div class="content" id="study-content">{!! $contentHtml !!}</div>
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
            <p style="font-size:1.1rem;margin-bottom:12px">Estudo de <strong>{{ $bookName }}</strong> em breve.</p>
            <p style="margin-bottom:16px">Enquanto isso, leia o livro na Bíblia.</p>
            <a class="btn-read" href="{{ $readUrl }}">Ler {{ $bookName }} — Capítulo 1</a>
        </div>
    @endif
</div>
<div class="badge" id="badge">Posição salva</div>
<script>
(function () {
  var key = 'bible_study_pos_' + @json($bookId);
  var btn = document.getElementById('btn-marcar');
  var badge = document.getElementById('badge');
  try {
    var y = localStorage.getItem(key);
    if (y) window.scrollTo(0, parseInt(y, 10) || 0);
  } catch (e) {}
  if (btn) btn.addEventListener('click', function () {
    try {
      localStorage.setItem(key, String(window.scrollY || 0));
      badge.classList.add('show');
      setTimeout(function () { badge.classList.remove('show'); }, 2500);
    } catch (e) {}
  });
})();
</script>
</body>
</html>

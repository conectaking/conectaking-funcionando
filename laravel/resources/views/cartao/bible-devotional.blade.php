<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Devocional dia {{ $day }} — Bíblia</title>
    <style>
        body { margin:0; font-family: Georgia, 'Times New Roman', serif; background:#0D0D0F; color:#ECECEC;
               background-image: linear-gradient(180deg,#0D0D0F 0%,#12121a 50%,#0f0f12 100%); min-height:100vh; }
        .wrap { max-width:680px; margin:0 auto; padding:24px 16px 80px; }
        a { color:#FFC700; text-decoration:none; }
        .nav { font-family:system-ui,sans-serif; font-size:.9rem; display:flex; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
        .nav a { color:#A1A1A1; }
        .nav a:hover { color:#FFC700; }
        .day { font-family:system-ui,sans-serif; font-size:.85rem; color:#A1A1A1; text-align:center; margin-bottom:8px; }
        h1 { font-size:1.4rem; color:#FFC700; text-align:center; margin:0 0 20px; font-weight:600; }
        .card { background:rgba(28,28,33,.95); border:1px solid rgba(255,199,0,.2); border-radius:16px; padding:24px 20px; }
        .ref { color:#FFC700; font-size:.95rem; margin-bottom:10px; font-family:system-ui,sans-serif; }
        .verse { font-size:1.12rem; line-height:1.7; margin-bottom:20px; font-style:italic; }
        h2 { font-family:system-ui,sans-serif; font-size:.95rem; color:#FFC700; margin:22px 0 8px; }
        .body { font-size:1.05rem; line-height:1.75; color:#e8e8e8; white-space:pre-wrap; }
        .empty { text-align:center; padding:40px 12px; color:#A1A1A1; }
        .pager { position:fixed; left:0; right:0; bottom:0; background:rgba(13,13,15,.92); border-top:1px solid #2a2a30;
                 display:flex; justify-content:space-between; padding:12px 16px; font-family:system-ui,sans-serif; }
        .pager a, .pager span { min-width:90px; text-align:center; }
        .pager span { opacity:.35; }
        form.jump { display:flex; gap:8px; justify-content:center; margin:16px 0 0; font-family:system-ui,sans-serif; }
        form.jump input { width:72px; padding:8px; border-radius:8px; border:1px solid #333; background:#111; color:#ECECEC; }
        form.jump button { padding:8px 12px; border:0; border-radius:8px; background:#FFC700; color:#111; font-weight:700; cursor:pointer; }
        .actions { display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:center; margin:18px 0 8px;
                   font-family:system-ui,sans-serif; }
        .btn-mark { padding:10px 14px; border-radius:10px; border:1px solid rgba(255,199,0,.4); background:rgba(255,199,0,.12);
                    color:#FFC700; font-weight:600; cursor:pointer; }
        #mark-status { font-size:.85rem; color:#A1A1A1; }
    </style>
</head>
<body>
<div class="wrap">
    <div class="nav">
        <a href="{{ $hubUrl }}">← Bíblia</a>
        <a href="{{ $profileUrl }}">Cartão</a>
        <a href="{{ $todayUrl }}">Hoje</a>
    </div>
    <div class="day">Devocional 365 · Dia {{ $day }}</div>

    @if($devotional && (
        !empty($devotional['titulo']) || !empty($devotional['versiculo_texto']) || !empty($devotional['reflexao'])
        || !empty($devotional['aplicacao']) || !empty($devotional['oracao'])
    ))
        <h1>{{ $devotional['titulo'] ?: 'Devocional do dia' }}</h1>
        <div class="card">
            @if(!empty($devotional['versiculo_ref']))
                <div class="ref">{{ $devotional['versiculo_ref'] }}</div>
            @endif
            @if(!empty($devotional['versiculo_texto']))
                <div class="verse">{{ $devotional['versiculo_texto'] }}</div>
            @endif
            @if(!empty($devotional['reflexao']))
                <h2>Reflexão</h2>
                <div class="body">{{ $devotional['reflexao'] }}</div>
            @endif
            @if(!empty($devotional['aplicacao']))
                <h2>Aplicação</h2>
                <div class="body">{{ $devotional['aplicacao'] }}</div>
            @endif
            @if(!empty($devotional['oracao']))
                <h2>Oração</h2>
                <div class="body">{{ $devotional['oracao'] }}</div>
            @endif
        </div>
        <div class="actions">
            <button type="button" class="btn-mark" id="btn-mark-read">Marcar como lido</button>
            <span id="mark-status"></span>
        </div>
    @else
        <div class="empty">
            <p>Não há devocional cadastrado para o dia {{ $day }}.</p>
            <p style="margin-top:12px"><a href="{{ $todayUrl }}">Ir para o dia de hoje</a></p>
        </div>
    @endif

    <form class="jump" method="get" action="#" onsubmit="var d=parseInt(this.day.value,10); if(d>=1&&d<=365){ location.href='/{{ $slug }}/biblia/devocional/'+d; } return false;">
        <input name="day" type="number" min="1" max="365" value="{{ $day }}" aria-label="Dia">
        <button type="submit">Ir</button>
    </form>
</div>
<div class="pager">
    @if($prevUrl)
        <a href="{{ $prevUrl }}">← Anterior</a>
    @else
        <span>← Anterior</span>
    @endif
    <a href="{{ $hubUrl }}">Hub</a>
    @if($nextUrl)
        <a href="{{ $nextUrl }}">Próximo →</a>
    @else
        <span>Próximo →</span>
    @endif
</div>
@if($devotional && (
    !empty($devotional['titulo']) || !empty($devotional['versiculo_texto']) || !empty($devotional['reflexao'])
    || !empty($devotional['aplicacao']) || !empty($devotional['oracao'])
))
<script>
(function () {
    var KEY = 'ck_devotional_vid';
    var vid = localStorage.getItem(KEY);
    if (!vid) {
        vid = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(KEY, vid);
    }
    var statusApi = @json($readStatusApi ?? '/api/bible/devotional/read-status');
    var markApi = @json($markReadApi ?? '/api/bible/devotional/mark-read');
    var day = {{ (int) $day }};
    var btn = document.getElementById('btn-mark-read');
    var st = document.getElementById('mark-status');
    if (!btn) return;
    fetch(statusApi + '?visitor_id=' + encodeURIComponent(vid) + '&days=' + day)
        .then(function (r) { return r.json(); })
        .then(function (o) {
            var list = (o && o.data && o.data.read) || [];
            if (list.some(function (x) { return Number(x.day_of_year) === day; })) {
                st.textContent = 'Já marcado como lido.';
                btn.disabled = true;
            }
        }).catch(function () {});
    btn.addEventListener('click', function () {
        btn.disabled = true;
        fetch(markApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ visitor_id: vid, day_of_year: day, slug: @json($slug) })
        }).then(function (r) { return r.json(); }).then(function (o) {
            st.textContent = (o && o.success) ? 'Marcado como lido.' : ((o && o.message) || 'Erro');
            if (!(o && o.success)) btn.disabled = false;
        }).catch(function () {
            st.textContent = 'Erro de rede';
            btn.disabled = false;
        });
    });
})();
</script>
@endif
</body>
</html>

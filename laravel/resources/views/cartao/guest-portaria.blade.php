<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="Permissions-Policy" content="camera=(self)">
    <title>Portaria — {{ $guestList['event_title'] ?? 'Evento' }}</title><style>
        :root {
            --primary: {{ $guestList['primary_color'] ?? '#FFC700' }};
            --text: {{ $guestList['text_color'] ?? '#ECECEC' }};
            --bg: {{ $guestList['background_color'] ?? '#0D0D0F' }};
        }
        * { box-sizing: border-box; }
        body { margin:0; font-family: system-ui, sans-serif; background: linear-gradient(135deg, var(--bg), #1C1C21); color: var(--text); min-height:100vh; }
        .wrap { max-width: 960px; margin: 0 auto; padding: 20px 14px 72px; }
        h1 { color: var(--primary); margin: 0 0 6px; font-size: 1.5rem; }
        .sub { opacity:.8; margin-bottom: 16px; }
        .stats { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; }
        .stat { background:rgba(255,255,255,.06); border:1px solid rgba(255,199,0,.2); border-radius:10px; padding:10px 12px; min-width:110px; }
        .stat b { display:block; color:var(--primary); font-size:1.2rem; }
        .tools { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; }
        input[type=search], input[type=text] {
            flex:1; min-width:180px; padding:12px 14px; border-radius:10px; border:1px solid rgba(255,255,255,.15);
            background:rgba(0,0,0,.35); color:var(--text); font:inherit;
        }
        button, .btn {
            padding:11px 14px; border:0; border-radius:10px; background:var(--primary); color:#111; font-weight:700; cursor:pointer;
        }
        .btn.secondary { background:transparent; color:var(--primary); border:1px solid rgba(255,199,0,.4); }
        .tabs { display:flex; flex-wrap:wrap; gap:6px; margin: 12px 0 14px; }
        .tab { padding:8px 12px; border-radius:999px; border:1px solid rgba(255,255,255,.15); background:transparent; color:var(--text); cursor:pointer; }
        .tab.on { background:rgba(255,199,0,.18); border-color:var(--primary); color:var(--primary); font-weight:700; }
        .card { background:rgba(28,28,33,.92); border:1px solid rgba(255,199,0,.18); border-radius:14px; overflow:hidden; }
        .row { display:flex; gap:10px; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid rgba(255,255,255,.07); }
        .row:last-child { border-bottom:0; }
        .name { font-weight:600; }
        .meta { font-size:.8rem; opacity:.7; }
        .badge { font-size:.72rem; padding:3px 8px; border-radius:999px; border:1px solid rgba(255,199,0,.35); color:var(--primary); white-space:nowrap; }
        .panel { display:none; }
        .panel.on { display:block; }
        #qr-reader { width:100%; max-width:420px; margin:12px auto; }
        .msg { margin-top:10px; padding:10px 12px; border-radius:10px; display:none; }
        .msg.ok { display:block; background:rgba(40,160,80,.2); color:#9BE7B0; }
        .msg.err { display:block; background:rgba(180,40,40,.25); color:#FFB4A8; }
        .header-img { width:100%; max-height:220px; object-fit:cover; border-radius:14px; margin-bottom:14px; display:block; }
        .empty { text-align:center; padding:28px; opacity:.7; }
        .checkin-btn { font-size:.82rem; padding:8px 10px; }
    </style>
    @vite(['resources/css/fonts.css', 'resources/js/pages/cartao-guest-portaria.js'])
</head>
<body>
@php
    $panels = [
        'all' => $allGuests ?? [],
        'not' => $notArrived ?? [],
        'in' => $checkedIn ?? [],
        'conf' => $confirmed ?? [],
        'reg' => $registered ?? [],
    ];
@endphp
<div class="wrap">
    @if(!empty($guestList['header_image_url']))
        <img class="header-img" src="{{ $guestList['header_image_url'] }}" alt="">
    @endif
    <h1>{{ $guestList['event_title'] ?? 'Portaria' }}</h1>
    <p class="sub">{{ $guestList['portaria_subtitle'] ?? 'Check-in e lista de convidados' }}
        @if(!empty($guestList['event_date'])) · {{ $guestList['event_date'] }}@endif
        @if(!empty($guestList['event_location'])) · {{ $guestList['event_location'] }}@endif
    </p>

    <div class="stats">
        <div class="stat"><b>{{ $counts['total'] ?? 0 }}</b>Total</div>
        <div class="stat"><b>{{ $counts['checked_in'] ?? 0 }}</b>Chegaram</div>
        <div class="stat"><b>{{ $counts['not_arrived'] ?? 0 }}</b>Não chegaram</div>
        <div class="stat"><b>{{ $counts['confirmed'] ?? 0 }}</b>Confirmados</div>
    </div>

    <div class="tools">
        <input id="search" type="search" placeholder="Buscar CPF, e-mail ou nome…">
        <button type="button" id="btn-search">Buscar / Check-in</button>
        <button type="button" class="btn secondary" id="btn-qr">Ler QR</button>
    </div>
    <div id="msg" class="msg"></div>
    <div id="qr-wrap" style="display:none">
        <div id="qr-reader"></div>
        <button type="button" class="btn secondary" id="btn-qr-stop">Parar câmera</button>
    </div>

    <div class="tabs">
        <button type="button" class="tab on" data-tab="all">Todos ({{ $counts['total'] ?? 0 }})</button>
        <button type="button" class="tab" data-tab="not">Não chegaram ({{ $counts['not_arrived'] ?? 0 }})</button>
        <button type="button" class="tab" data-tab="in">Chegaram ({{ $counts['checked_in'] ?? 0 }})</button>
        <button type="button" class="tab" data-tab="conf">Confirmados ({{ $counts['confirmed'] ?? 0 }})</button>
        <button type="button" class="tab" data-tab="reg">Pendentes ({{ $counts['registered'] ?? 0 }})</button>
    </div>

    @foreach($panels as $key => $list)
        <div class="panel {{ $key === 'all' ? 'on' : '' }}" data-panel="{{ $key }}">
            <div class="card">
                @forelse($list as $g)
                    <div class="row" data-name="{{ strtolower($g['name'] ?? '') }}">
                        <div>
                            <div class="name">{{ $g['name'] ?? '' }}</div>
                            <div class="meta">
                                {{ $g['email'] ?? '' }}
                                @if(!empty($g['whatsapp']) || !empty($g['phone'])) · {{ $g['whatsapp'] ?? $g['phone'] }}@endif
                            </div>
                        </div>
                        <div style="display:flex;gap:8px;align-items:center">
                            <span class="badge">{{ $g['status'] ?? '' }}</span>
                            @if(($g['status'] ?? '') !== 'checked_in')
                                <button type="button" class="checkin-btn" data-id="{{ $g['id'] }}">Check-in</button>
                            @endif
                        </div>
                    </div>
                @empty
                    <div class="empty">Nenhum convidado nesta lista.</div>
                @endforelse
            </div>
        </div>
    @endforeach
</div>
<script>window.__CK_BOOT_GUEST_PORTARIA = { j0: @json($token), j1: @json($checkinUrlBase), j2: @json($searchUrl), j3: @json($verifyQrUrlBase), j4: @json($confirmQrUrlBase) };</script>

</body>
</html>

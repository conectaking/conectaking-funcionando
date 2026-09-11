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

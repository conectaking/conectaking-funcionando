<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Confirmação — {{ $guestList['event_title'] ?? 'Evento' }}</title>
    <style>
        :root { --primary: {{ $guestList['primary_color'] ?? '#FFC700' }}; --text: {{ $guestList['text_color'] ?? '#ECECEC' }}; --bg: {{ $guestList['background_color'] ?? '#0D0D0F' }}; }
        body { margin:0; font-family:system-ui,sans-serif; background:linear-gradient(135deg,var(--bg),#1C1C21); color:var(--text); min-height:100vh; }
        .wrap { max-width:640px; margin:0 auto; padding:28px 16px 64px; }
        h1 { color:var(--primary); text-align:center; margin:0 0 8px; }
        .sub { text-align:center; opacity:.8; margin-bottom:20px; }
        .card { background:rgba(28,28,33,.92); border:1px solid rgba(255,199,0,.2); border-radius:16px; padding:18px; }
        .row { display:flex; gap:12px; align-items:center; padding:12px 0; border-bottom:1px solid rgba(255,255,255,.08); }
        .row:last-child { border-bottom:0; }
        .row input { width:auto; }
        .name { font-weight:600; }
        .meta { font-size:.82rem; opacity:.7; }
        .badge { font-size:.75rem; padding:3px 8px; border-radius:999px; border:1px solid rgba(255,199,0,.35); color:var(--primary); }
        button { margin-top:16px; width:100%; padding:14px; border:0; border-radius:12px; background:var(--primary); color:#111; font-weight:800; cursor:pointer; }
        .ok,.err { display:none; margin-top:12px; padding:12px; border-radius:10px; }
        .ok { background:rgba(40,160,80,.2); color:#9BE7B0; }
        .err { background:rgba(180,40,40,.25); color:#FFB4A8; }
        .empty { text-align:center; opacity:.75; padding:24px; }
    </style>
    @vite(['resources/css/fonts.css', 'resources/js/pages/cartao-guest-confirm.js'])
</head>
<body>
<div class="wrap">
    <h1>Confirmação de presença</h1>
    <p class="sub">{{ $guestList['event_title'] ?? 'Evento' }}</p>
    <div class="card">
        @if(empty($confirmUrl))
            <p class="empty">Token de confirmação indisponível.</p>
        @elseif(empty($guests))
            <p class="empty">Nenhum convidado para confirmar.</p>
        @else
            <form id="confirm-form">
                @foreach($guests as $g)
                    @php $st = (string) ($g['status'] ?? ''); @endphp
                    <label class="row">
                        @if($st === 'registered')
                            <input type="checkbox" name="guest_ids[]" value="{{ $g['id'] }}">
                        @else
                            <input type="checkbox" disabled checked>
                        @endif
                        <span>
                            <span class="name">{{ $g['name'] ?? '' }}</span>
                            <div class="meta">{{ $g['email'] ?? '' }} {{ !empty($g['phone']) ? '· '.$g['phone'] : '' }}</div>
                        </span>
                        <span class="badge">{{ $st === 'confirmed' ? 'confirmado' : 'pendente' }}</span>
                    </label>
                @endforeach
                <button type="submit">Confirmar selecionados</button>
                <div class="ok" id="ok"></div>
                <div class="err" id="err"></div>
            </form>
        @endif
    </div>
</div>
@if(!empty($confirmUrl) && !empty($guests))
<script>window.__CK_BOOT_GUEST_CONFIRM = { j0: @json($confirmUrl) };</script>

@endif
</body>
</html>

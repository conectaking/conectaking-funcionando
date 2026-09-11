<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Confirmação — {{ $guestList['event_title'] ?? 'Evento' }}</title>
    <style>
:root { --primary: {{ $guestList['primary_color'] ?? '#FFC700' }}; --text: {{ $guestList['text_color'] ?? '#ECECEC' }}; --bg: {{ $guestList['background_color'] ?? '#0D0D0F' }}; }
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

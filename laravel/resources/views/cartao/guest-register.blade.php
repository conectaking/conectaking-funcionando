<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Inscrição — {{ $guestList['event_title'] ?? 'Evento' }}</title>
    <style>
        :root {
            --primary: {{ $guestList['primary_color'] ?? '#FFC700' }};
            --text: {{ $guestList['text_color'] ?? '#ECECEC' }};
            --bg: {{ $guestList['background_color'] ?? '#0D0D0F' }};
        }
        * { box-sizing: border-box; }
        body {
            margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
            background: linear-gradient(135deg, var(--bg), #1C1C21); color: var(--text); min-height:100vh;
            @if(!empty($guestList['background_image_url']))
            background-image: url('{{ $guestList['background_image_url'] }}');
            background-size: cover; background-position: center; background-attachment: fixed;
            @endif
        }
        .wrap { max-width:560px; margin:0 auto; padding:32px 16px 64px; }
        h1 { color: var(--primary); font-size:1.7rem; margin:0 0 8px; text-align:center; }
        .sub { text-align:center; opacity:.8; margin-bottom:24px; }
        .card { background: rgba(28,28,33,.92); border:1px solid rgba(255,199,0,.2); border-radius:16px; padding:22px; }
        label { display:block; font-size:.88rem; font-weight:600; margin:14px 0 6px; }
        input, textarea, select {
            width:100%; padding:12px 14px; border-radius:10px; border:1px solid rgba(255,255,255,.15);
            background: rgba(0,0,0,.35); color: var(--text); font: inherit;
        }
        .req { color: var(--primary); }
        button {
            margin-top:20px; width:100%; padding:14px; border:0; border-radius:12px;
            background: var(--primary); color:#111; font-weight:800; cursor:pointer; font-size:1rem;
        }
        button:disabled { opacity:.6; }
        .ok,.err { display:none; margin-top:14px; padding:12px; border-radius:10px; }
        .ok { background:rgba(40,160,80,.2); color:#9BE7B0; }
        .err { background:rgba(180,40,40,.25); color:#FFB4A8; }
        .full { text-align:center; padding:24px; color: var(--primary); }
        .header-img { width:100%; border-radius:16px; margin-bottom:20px; display:block; }
    </style>
    @vite(['resources/css/fonts.css', 'resources/js/pages/cartao-guest-register.js'])
</head>
<body>
<div class="wrap">
    @if(!empty($guestList['header_image_url']))
        <img class="header-img" src="{{ $guestList['header_image_url'] }}" alt="">
    @endif
    <h1>{{ $guestList['event_title'] ?? 'Inscrição' }}</h1>
    @if(!empty($guestList['event_date']) || !empty($guestList['event_location']))
        <p class="sub">
            @if(!empty($guestList['event_date'])){{ $guestList['event_date'] }}@endif
            @if(!empty($guestList['event_date']) && !empty($guestList['event_location'])) · @endif
            @if(!empty($guestList['event_location'])){{ $guestList['event_location'] }}@endif
        </p>
    @endif

    @if(!$canRegister)
        <div class="card full">
            @if($isFull)
                Vagas esgotadas.
            @else
                Inscrições fechadas no momento.
            @endif
            @if(!empty($maxGuests))
                <p style="margin-top:10px;opacity:.75;font-size:.9rem">{{ $currentCount }} / {{ $maxGuests }}</p>
            @endif
        </div>
    @else
        <div class="card">
            <form id="reg-form">
                <label>Nome completo <span class="req">*</span></label>
                <input name="name" required autocomplete="name">
                <label>WhatsApp <span class="req">*</span></label>
                <input name="whatsapp" type="tel" required autocomplete="tel" placeholder="(00) 00000-0000">
                <label>CPF/CNPJ <span class="req">*</span></label>
                <input name="document" required>
                <label>E-mail</label>
                <input name="email" type="email" autocomplete="email">
                <label>Telefone</label>
                <input name="phone" type="tel">
                <label>Instagram</label>
                <input name="instagram" placeholder="@usuario">
                <label>Endereço</label>
                <input name="address">
                <label>Bairro</label>
                <input name="neighborhood">
                <label>Cidade</label>
                <input name="city">
                <label>Estado</label>
                <input name="state" maxlength="2">
                <label>CEP</label>
                <input name="zipcode">

                @foreach(($guestList['custom_form_fields'] ?? []) as $cf)
                    @php
                        $cid = (string) ($cf['id'] ?? ('c_'.$loop->index));
                        $clabel = (string) ($cf['label'] ?? 'Campo');
                        $creq = !empty($cf['required']);
                        $ctype = strtolower((string) ($cf['type'] ?? 'text'));
                    @endphp
                    <label>{{ $clabel }}@if($creq) <span class="req">*</span>@endif</label>
                    @if($ctype === 'textarea' || $ctype === 'paragraph')
                        <textarea name="custom_{{ $cid }}" @if($creq) required @endif data-custom="{{ $cid }}"></textarea>
                    @else
                        <input name="custom_{{ $cid }}" type="{{ in_array($ctype, ['email','tel','date','number'], true) ? $ctype : 'text' }}"
                               @if($creq) required @endif data-custom="{{ $cid }}">
                    @endif
                @endforeach

                <button type="submit">Confirmar inscrição</button>
                <div class="ok" id="ok">Inscrição realizada com sucesso!</div>
                <div class="err" id="err"></div>
            </form>
        </div>
    @endif
</div>
@if($canRegister)
<script>window.__CK_BOOT_GUEST_REGISTER = { j0: @json($submitUrl) };</script>

@endif
</body>
</html>

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

@if(!empty($guestList['background_image_url']))
            background-image: url('{{ $guestList['background_image_url'] }}');
            background-size: cover; background-position: center; background-attachment: fixed;
            @endif
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
                <p class="ck-gr-bc1455">{{ $currentCount }} / {{ $maxGuests }}</p>
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

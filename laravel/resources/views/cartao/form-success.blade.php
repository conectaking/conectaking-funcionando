<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title ?? 'Enviado' }} — {{ $formTitle ?? 'Formulário' }}</title>
    @if(!empty($showQr) && !empty($qrToken))@endif
    <style>
:root {
            --primary: {{ $primaryColor ?? '#FFC700' }};
            --secondary: {{ $secondaryColor ?? '#FFB700' }};
            --bg: {{ $backgroundColor ?? '#0D0D0F' }};
        }
    </style>
    @vite(['resources/css/fonts.css', 'resources/js/pages/cartao-form-success.js'])
</head>
<body>
<div class="card">
    <h1>{{ $title ?? 'Enviado!' }}</h1>
    <p>{{ $message ?? 'Resposta enviada com sucesso!' }}</p>

    @if(!empty($showQr) && !empty($qrToken))
        <p class="ck-fs-4edd79">Seu QR Code de check-in</p>
        @if(!empty($guestName))
            <p class="meta">{{ $guestName }}</p>
        @endif
        <div class="qr-wrap" id="qrcode"></div>
        <p class="meta">Apresente este código na portaria</p>
    @endif

    @if(!empty($showWhatsapp) && !empty($whatsappNumber))
        @php
            $wa = preg_replace('/\D+/', '', (string) $whatsappNumber);
            $waMsg = rawurlencode('Olá! Acabei de preencher o formulário.');
        @endphp
        <a class="wa" href="https://wa.me/{{ $wa }}?text={{ $waMsg }}" target="_blank" rel="noopener">Enviar no WhatsApp</a>
    @endif

    @if(!empty($backUrl))
        <a class="btn" href="{{ $backUrl }}">Voltar ao formulário</a>
    @endif
</div>
@if(!empty($showQr) && !empty($qrToken))
<script>window.__CK_BOOT_FORM_SUCCESS = { j0: @json((string) $qrToken) };</script>

@endif
</body>
</html>

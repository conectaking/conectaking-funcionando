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
        body {
            margin: 0;
            font-family: system-ui, sans-serif;
            background: linear-gradient(160deg, var(--bg) 0%, #16161a 100%);
            color: #ECECEC;
            display: flex;
            min-height: 100vh;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }
        .card {
            max-width: 440px;
            width: 100%;
            text-align: center;
            background: rgba(22, 22, 26, 0.95);
            border-radius: 16px;
            padding: 32px 24px;
            border: 1px solid rgba(255,255,255,0.06);
        }
        h1 { color: var(--primary); margin: 0 0 12px; font-size: 1.4rem; }
        p { line-height: 1.5; opacity: .9; }
        .qr-wrap {
            margin: 24px auto 8px;
            padding: 16px;
            background: #fff;
            border-radius: 12px;
            display: inline-block;
        }
        .meta { font-size: .85rem; opacity: .7; margin-top: 8px; }
        a.btn {
            display: inline-block;
            margin-top: 20px;
            color: #111;
            background: var(--primary);
            padding: 12px 18px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 700;
        }
        a.wa {
            display: inline-block;
            margin-top: 12px;
            color: #fff;
            background: #25D366;
            padding: 12px 18px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 700;
        }
    </style>
    @vite(['resources/css/fonts.css', 'resources/js/pages/cartao-form-success.js'])
</head>
<body>
<div class="card">
    <h1>{{ $title ?? 'Enviado!' }}</h1>
    <p>{{ $message ?? 'Resposta enviada com sucesso!' }}</p>

    @if(!empty($showQr) && !empty($qrToken))
        <p style="margin-top:20px;font-weight:600;">Seu QR Code de check-in</p>
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

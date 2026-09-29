<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title ?? 'Enviado com Sucesso!' }} — {{ $formTitle ?? 'Formulário' }}</title>
    @php
        $primary = !empty($primaryColor) ? $primaryColor : '#FFC700';
        $secondary = !empty($secondaryColor) ? $secondaryColor : '#FFB700';
        $bg = !empty($backgroundColor) ? $backgroundColor : '#0D0D0F';
        $card = !empty($cardColor) ? $cardColor : '#18181B';
        $text = !empty($textColor) ? $textColor : '#ECECEC';
    @endphp
    <style>
        :root {
            --primary: {{ $primary }};
            --secondary: {{ $secondary }};
            --bg: {{ $bg }};
            --card: {{ $card }};
            --text: {{ $text }};
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: radial-gradient(circle at 50% 0%, rgba(255, 199, 0, 0.08) 0%, transparent 60%),
                        linear-gradient(170deg, var(--bg) 0%, #08080a 100%);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px 16px;
            overflow-x: hidden;
            position: relative;
        }

        /* Canvas de Confete */
        #confetti-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 100;
        }

        /* Container Principal */
        .success-wrapper {
            width: 100%;
            max-width: 480px;
            animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            position: relative;
            z-index: 10;
        }

        @keyframes slideUpFade {
            from {
                opacity: 0;
                transform: translateY(28px) scale(0.97);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        /* Card Moderno com Glassmorphism */
        .success-card {
            background: rgba(24, 24, 28, 0.88);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.09);
            box-shadow: 0 20px 48px rgba(0, 0, 0, 0.45),
                        0 0 0 1px rgba(255, 255, 255, 0.05) inset;
            overflow: hidden;
            text-align: center;
            position: relative;
        }

        /* Banner de Cabeçalho (se houver) */
        @if(!empty($headerImageUrl))
        .success-banner {
            width: 100%;
            height: 140px;
            background: url('{{ $headerImageUrl }}') center/cover no-repeat;
            position: relative;
        }
        .success-banner::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, transparent 40%, rgba(24, 24, 28, 0.95) 100%);
        }
        @endif

        .success-content {
            padding: 32px 28px;
        }

        /* Logo do Formulário */
        @if(!empty($formLogoUrl))
        .form-logo {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            object-fit: cover;
            margin: -60px auto 16px;
            border: 3px solid rgba(255, 255, 255, 0.15);
            background: #18181B;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            display: block;
            position: relative;
            z-index: 2;
        }
        @endif

        /* Badge Animada de Sucesso */
        .icon-circle-wrapper {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .icon-pulse-ring {
            position: absolute;
            inset: -8px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(16, 185, 129, 0.35) 0%, transparent 70%);
            animation: pulseGlow 2.5s infinite ease-in-out;
        }

        @keyframes pulseGlow {
            0%, 100% { transform: scale(0.95); opacity: 0.6; }
            50% { transform: scale(1.15); opacity: 0.9; }
        }

        .icon-circle {
            width: 74px;
            height: 74px;
            border-radius: 50%;
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            box-shadow: 0 10px 28px rgba(16, 185, 129, 0.45);
            position: relative;
            z-index: 1;
        }

        .icon-circle svg {
            width: 38px;
            height: 38px;
            stroke-dasharray: 50;
            stroke-dashoffset: 50;
            animation: drawCheck 0.7s 0.25s ease-out forwards;
        }

        @keyframes drawCheck {
            to { stroke-dashoffset: 0; }
        }

        /* Pill / Tag de Status */
        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(16, 185, 129, 0.12);
            color: #34D399;
            padding: 5px 14px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            margin-bottom: 12px;
            border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .status-pill .dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #34D399;
            box-shadow: 0 0 8px #34D399;
        }

        /* Tipografia */
        h1.main-title {
            font-size: 1.65rem;
            font-weight: 800;
            color: #FFFFFF;
            margin-bottom: 8px;
            line-height: 1.25;
            letter-spacing: -0.3px;
        }

        p.form-badge-title {
            color: var(--primary);
            font-size: 0.95rem;
            font-weight: 700;
            margin-bottom: 14px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        p.greeting-text {
            color: rgba(236, 236, 236, 0.85);
            font-size: 0.98rem;
            line-height: 1.55;
            margin-bottom: 24px;
        }

        p.greeting-text strong {
            color: #FFFFFF;
            font-weight: 700;
        }

        /* Recibo / Resumo do Envio */
        .receipt-card {
            background: rgba(255, 255, 255, 0.035);
            border: 1px solid rgba(255, 255, 255, 0.07);
            border-radius: 16px;
            padding: 16px 18px;
            margin-bottom: 24px;
            text-align: left;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .receipt-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.88rem;
        }

        .receipt-label {
            color: rgba(255, 255, 255, 0.55);
            font-weight: 500;
        }

        .receipt-value {
            color: #FFFFFF;
            font-weight: 600;
            text-align: right;
        }

        .receipt-value.badge-id {
            background: rgba(255, 199, 0, 0.15);
            color: var(--primary);
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 0.8rem;
            font-family: monospace;
            font-weight: 700;
        }

        /* QR Code de Entrada / Check-in */
        @if(!empty($showQr) && !empty($qrToken))
        .qr-section {
            background: #FFFFFF;
            color: #111827;
            border-radius: 18px;
            padding: 20px;
            margin: 20px 0 24px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.35);
        }

        .qr-title {
            font-size: 1rem;
            font-weight: 800;
            color: #111827;
            margin-bottom: 4px;
        }

        .qr-subtitle {
            font-size: 0.82rem;
            color: #6B7280;
            margin-bottom: 14px;
        }

        .qr-wrap {
            margin: 0 auto 12px;
            display: inline-block;
            padding: 8px;
            background: #FFFFFF;
        }

        .qr-guest-name {
            font-size: 0.95rem;
            font-weight: 700;
            color: #1F2937;
            margin-bottom: 4px;
        }

        .qr-instruction {
            font-size: 0.8rem;
            color: #9CA3AF;
        }
        @endif

        /* Botões de Ação */
        .actions-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        /* Botão WhatsApp em Destaque */
        a.btn-whatsapp {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
            color: #FFFFFF;
            padding: 15px 24px;
            border-radius: 14px;
            text-decoration: none;
            font-weight: 700;
            font-size: 1.02rem;
            box-shadow: 0 8px 24px rgba(37, 211, 102, 0.35);
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            overflow: hidden;
        }

        a.btn-whatsapp:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 28px rgba(37, 211, 102, 0.5);
            filter: brightness(1.05);
        }

        a.btn-whatsapp:active {
            transform: translateY(0);
        }

        /* Botão do Pastor / Especial */
        a.btn-pastor {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.16);
            color: #FFFFFF;
            padding: 13px 20px;
            border-radius: 14px;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.95rem;
            transition: all 0.2s;
        }

        a.btn-pastor:hover {
            background: rgba(255, 255, 255, 0.14);
            border-color: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
        }

        /* Botão Secundário: Voltar ao Cartão / Perfil */
        a.btn-card {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: var(--primary);
            color: #111111;
            padding: 13px 20px;
            border-radius: 14px;
            text-decoration: none;
            font-weight: 700;
            font-size: 0.95rem;
            transition: all 0.2s;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
        }

        a.btn-card:hover {
            filter: brightness(1.1);
            transform: translateY(-1px);
            box-shadow: 0 8px 22px rgba(0, 0, 0, 0.35);
        }

        /* Botão Link: Preencher Novamente */
        a.btn-subtle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            color: rgba(255, 255, 255, 0.6);
            text-decoration: none;
            font-size: 0.88rem;
            font-weight: 500;
            padding: 10px;
            transition: color 0.15s;
        }

        a.btn-subtle:hover {
            color: #FFFFFF;
            text-decoration: underline;
        }

        /* Rodapé de Marca ConectaKing */
        .footer-brand {
            margin-top: 24px;
            font-size: 0.78rem;
            color: rgba(255, 255, 255, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .footer-brand svg {
            width: 14px;
            height: 14px;
            opacity: 0.6;
        }

        /* Responsividade */
        @media (max-width: 480px) {
            .success-content {
                padding: 26px 20px;
            }
            h1.main-title {
                font-size: 1.45rem;
            }
            .icon-circle-wrapper {
                width: 70px;
                height: 70px;
            }
            .icon-circle {
                width: 64px;
                height: 64px;
            }
            .icon-circle svg {
                width: 32px;
                height: 32px;
            }
        }
    </style>
    @vite(['resources/css/fonts.css', 'resources/js/pages/cartao-form-success.js'])
</head>
<body>

<canvas id="confetti-canvas"></canvas>

<div class="success-wrapper">
    <div class="success-card">
        @if(!empty($headerImageUrl))
            <div class="success-banner"></div>
        @endif

        <div class="success-content">
            @if(!empty($formLogoUrl))
                <img src="{{ $formLogoUrl }}" alt="Logo" class="form-logo">
            @endif

            <div class="icon-circle-wrapper">
                <div class="icon-pulse-ring"></div>
                <div class="icon-circle">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            </div>

            <div class="status-pill">
                <span class="dot"></span>
                <span>Confirmado com Sucesso</span>
            </div>

            <h1 class="main-title">Resposta Enviada!</h1>

            <p class="form-badge-title">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                <span>{{ $formTitle }}</span>
            </p>

            <p class="greeting-text">
                @if(!empty($responderName))
                    Obrigado, <strong>{{ $responderName }}</strong>! Suas informações foram registradas com sucesso.
                @else
                    Suas respostas foram salvas com sucesso em nossa base de dados.
                @endif
            </p>

            <!-- Recibo com Protocolo e Detalhes -->
            <div class="receipt-card">
                @if(!empty($responseId))
                <div class="receipt-row">
                    <span class="receipt-label">Protocolo:</span>
                    <span class="receipt-value badge-id">#{{ $responseId }}</span>
                </div>
                @endif
                <div class="receipt-row">
                    <span class="receipt-label">Status do Envio:</span>
                    <span class="receipt-value" style="color: #34D399;">✓ Registrado</span>
                </div>
                <div class="receipt-row">
                    <span class="receipt-label">Data e Hora:</span>
                    <span class="receipt-value">{{ now()->format('d/m/Y \à\s H:i') }}</span>
                </div>
            </div>

            <!-- Seção de QR Code de Check-in (se habilitado) -->
            @if(!empty($showQr) && !empty($qrToken))
                <div class="qr-section">
                    <div class="qr-title">Seu Ingresso / QR Code</div>
                    <div class="qr-subtitle">Apresente este código na recepção</div>
                    @if(!empty($guestName))
                        <div class="qr-guest-name">{{ $guestName }}</div>
                    @endif
                    <div class="qr-wrap" id="qrcode"></div>
                    <div class="qr-instruction">Tire um print desta tela para agilizar sua entrada</div>
                </div>
            @endif

            <!-- Grupo de Ações -->
            <div class="actions-group">
                @if(!empty($showWhatsapp) && !empty($whatsappNumber))
                    @php
                        $cleanWa = preg_replace('/\D+/', '', (string) $whatsappNumber);
                        $defaultWaMsg = rawurlencode("Olá! Acabei de enviar minhas informações pelo formulário {$formTitle}.");
                    @endphp
                    <a class="btn-whatsapp" href="https://wa.me/{{ $cleanWa }}?text={{ $defaultWaMsg }}" target="_blank" rel="noopener">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.842-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                        <span>Conversar no WhatsApp</span>
                    </a>
                @endif

                @if(!empty($enablePastorButton) && !empty($pastorWhatsappNumber))
                    @php
                        $cleanPastorWa = preg_replace('/\D+/', '', (string) $pastorWhatsappNumber);
                        $pastorMsg = rawurlencode("Olá! Preenchi o formulário {$formTitle} e gostaria de falar com a liderança.");
                    @endphp
                    <a class="btn-pastor" href="https://wa.me/{{ $cleanPastorWa }}?text={{ $pastorMsg }}" target="_blank" rel="noopener">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                        <span>{{ $pastorButtonName ?? 'Falar com o Pastor' }}</span>
                    </a>
                @endif

                @if(!empty($cardUrl))
                    <a class="btn-card" href="{{ $cardUrl }}">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        <span>Visitar Perfil / Cartão Oficial</span>
                    </a>
                @endif

                @if(!empty($backUrl))
                    <a class="btn-subtle" href="{{ $backUrl }}">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                        <span>Preencher novamente</span>
                    </a>
                @endif
            </div>

            <!-- Rodapé ConectaKing -->
            <div class="footer-brand">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                <span>Conecta King &bull; Tecnologia Inteligente</span>
            </div>
        </div>
    </div>
</div>

@if(!empty($showQr) && !empty($qrToken))
<script>window.__CK_BOOT_FORM_SUCCESS = { j0: @json((string) $qrToken) };</script>
@endif

<!-- Script leve de Confetes para o efeito WOW -->
<script>
(function() {
    var canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = window.innerWidth;
    var H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    var mp = 45;
    var particles = [];
    var colors = ['#FFC700', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#F59E0B'];

    for (var i = 0; i < mp; i++) {
        particles.push({
            x: Math.random() * W,
            y: Math.random() * H - H,
            r: Math.random() * 6 + 3,
            d: Math.random() * mp,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.floor(Math.random() * 10) - 10,
            tiltAngleIncremental: (Math.random() * 0.07) + 0.05,
            tiltAngle: 0
        });
    }

    var angle = 0;
    var animationFrame;
    var startTime = Date.now();

    function draw() {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < mp; i++) {
            var p = particles[i];
            ctx.beginPath();
            ctx.lineWidth = p.r / 2;
            ctx.strokeStyle = p.color;
            ctx.moveTo(p.x + p.tilt + (p.r / 4), p.y);
            ctx.lineTo(p.x + p.tilt, p.y + p.tilt + (p.r / 4));
            ctx.stroke();
        }
        update();
    }

    function update() {
        angle += 0.01;
        for (var i = 0; i < mp; i++) {
            var p = particles[i];
            p.tiltAngle += p.tiltAngleIncremental;
            p.y += (Math.cos(angle + p.d) + 1 + p.r / 2) * 1.4;
            p.x += Math.sin(angle);
            p.tilt = Math.sin(p.tiltAngle - (i / 3)) * 12;

            if (p.y > H) {
                if (Date.now() - startTime < 4000) {
                    p.x = Math.random() * W;
                    p.y = -20;
                }
            }
        }
    }

    function loop() {
        draw();
        if (Date.now() - startTime < 5500) {
            animationFrame = requestAnimationFrame(loop);
        } else {
            ctx.clearRect(0, 0, W, H);
        }
    }

    window.addEventListener('resize', function() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W;
        canvas.height = H;
    });

    loop();
})();
</script>

</body>
</html>

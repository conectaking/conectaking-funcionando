<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title ?? 'Enviado com Sucesso!' }} — {{ $formTitle ?? 'Formulário' }}</title>
    @php
        $isLight = ($theme === 'light');
        $primary = !empty($primaryColor) ? $primaryColor : '#DC2626';
        $secondary = !empty($secondaryColor) ? $secondaryColor : '#991B1B';
        $brand = !empty($brandName) ? $brandName : 'Conecta King';
        $logo = !empty($formLogoUrl) ? $formLogoUrl : null;
        $desc = !empty($formDescription) ? $formDescription : (!empty($welcomeText) ? $welcomeText : null);
        $cleanDesc = $desc ? trim(preg_replace('/\s+/', ' ', $desc)) : null;
    @endphp
    <style>
        :root {
            --primary: {{ $primary }};
            --secondary: {{ $secondary }};
            --card-bg: {{ $isLight ? '#FFFFFF' : '#18181B' }};
            --text-main: {{ $isLight ? '#0F172A' : '#F8FAFC' }};
            --text-muted: {{ $isLight ? '#64748B' : '#94A3B8' }};
            --border-subtle: {{ $isLight ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.08)' }};
            --box-soft: {{ $isLight ? '#F8FAFC' : 'rgba(255, 255, 255, 0.03)' }};
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            @if($isLight)
            background: radial-gradient(circle at 50% 0%, rgba(220, 38, 38, 0.05) 0%, transparent 50%),
                        linear-gradient(180deg, #FDF8F8 0%, #F8FAFC 50%, #F1F5F9 100%);
            color: #0F172A;
            @else
            background: radial-gradient(circle at 50% 0%, rgba(220, 38, 38, 0.08) 0%, transparent 60%),
                        linear-gradient(180deg, #0D0D10 0%, #121216 100%);
            color: #F8FAFC;
            @endif
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 32px 16px;
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
            z-index: 999;
        }

        /* Wrapper do Card */
        .page-container {
            width: 100%;
            max-width: 520px;
            animation: cardEntrance 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            position: relative;
            z-index: 10;
        }

        @keyframes cardEntrance {
            from {
                opacity: 0;
                transform: translateY(24px) scale(0.98);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        /* Card Principal */
        .main-card {
            background: var(--card-bg);
            border-radius: 28px;
            border: 1px solid var(--border-subtle);
            @if($isLight)
            box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.08),
                        0 0 1px rgba(0, 0, 0, 0.12);
            @else
            box-shadow: 0 30px 70px -15px rgba(0, 0, 0, 0.6),
                        0 0 0 1px rgba(255, 255, 255, 0.06) inset;
            @endif
            overflow: hidden;
            text-align: center;
            position: relative;
        }

        /* Barra decorativa no topo */
        .accent-top-bar {
            height: 6px;
            width: 100%;
            background: linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%);
        }

        /* Banner de Cabeçalho (se houver) */
        @if(!empty($headerImageUrl))
        .card-banner {
            width: 100%;
            height: 130px;
            background: url('{{ $headerImageUrl }}') center/cover no-repeat;
            position: relative;
        }
        .card-banner::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, transparent 40%, var(--card-bg) 100%);
        }
        @endif

        .card-body {
            padding: 36px 32px 32px;
        }

        /* Logo / Avatar */
        @if(!empty($logo))
        .brand-avatar-wrap {
            margin: {{ !empty($headerImageUrl) ? '-50px' : '0' }} auto 18px;
            position: relative;
            display: inline-block;
        }
        .brand-avatar {
            width: 82px;
            height: 82px;
            border-radius: 50%;
            object-fit: cover;
            background: #FFFFFF;
            border: 4px solid var(--card-bg);
            @if($isLight)
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            @else
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
            @endif
            display: block;
        }
        @endif

        /* Nome da Marca / Igreja */
        .brand-name {
            font-size: 0.85rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: var(--primary);
            margin-bottom: 16px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }

        /* Badge de Ícone com Check Animado */
        .checkmark-wrapper {
            width: 76px;
            height: 76px;
            margin: 0 auto 20px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .checkmark-ring {
            position: absolute;
            inset: -6px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%);
            animation: ringPulse 2.5s infinite ease-in-out;
        }

        @keyframes ringPulse {
            0%, 100% { transform: scale(0.95); opacity: 0.6; }
            50% { transform: scale(1.18); opacity: 0.95; }
        }

        .checkmark-badge {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #FFFFFF;
            box-shadow: 0 10px 26px rgba(16, 185, 129, 0.38);
            position: relative;
            z-index: 1;
        }

        .checkmark-badge svg {
            width: 36px;
            height: 36px;
            stroke-dasharray: 48;
            stroke-dashoffset: 48;
            animation: drawCheck 0.6s 0.2s ease-out forwards;
        }

        @keyframes drawCheck {
            to { stroke-dashoffset: 0; }
        }

        /* Pill de Confirmação */
        .confirm-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: {{ $isLight ? '#ECFDF5' : 'rgba(16, 185, 129, 0.12)' }};
            color: {{ $isLight ? '#065F46' : '#34D399' }};
            border: 1px solid {{ $isLight ? '#A7F3D0' : 'rgba(16, 185, 129, 0.25)' }};
            padding: 5px 14px;
            border-radius: 20px;
            font-size: 0.78rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        }

        .confirm-pill-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #10B981;
            box-shadow: 0 0 6px #10B981;
        }

        /* Título Principal */
        h1.headline {
            font-size: 1.65rem;
            font-weight: 900;
            color: var(--text-main);
            margin-bottom: 8px;
            line-height: 1.25;
            letter-spacing: -0.4px;
        }

        /* Tag com Nome do Formulário */
        .form-pill-tag {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 0.92rem;
            font-weight: 700;
            color: var(--text-muted);
            margin-bottom: 16px;
        }

        /* Saudação / Mensagem */
        .salutation {
            font-size: 1.05rem;
            line-height: 1.5;
            color: var(--text-main);
            margin-bottom: 20px;
        }

        .salutation strong {
            color: var(--primary);
            font-weight: 800;
        }

        /* Caixa de Acolhimento / Mensagem Institucional (se houver descrição no form) */
        @if(!empty($cleanDesc))
        .welcome-callout {
            background: {{ $isLight ? '#FFF5F5' : 'rgba(220, 38, 38, 0.08)' }};
            border-left: 4px solid var(--primary);
            border-radius: 14px;
            padding: 16px 18px;
            margin-bottom: 24px;
            text-align: left;
            font-size: 0.92rem;
            line-height: 1.6;
            color: {{ $isLight ? '#475569' : '#CBD5E1' }};
            position: relative;
        }

        .welcome-callout-quote {
            font-style: italic;
        }
        @endif

        /* Cartão de Recibo / Protocolo */
        .receipt-panel {
            background: var(--box-soft);
            border: 1px solid var(--border-subtle);
            border-radius: 18px;
            padding: 18px 20px;
            margin-bottom: 26px;
            text-align: left;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .receipt-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9rem;
        }

        .receipt-item-label {
            color: var(--text-muted);
            font-weight: 500;
        }

        .receipt-item-value {
            color: var(--text-main);
            font-weight: 700;
            text-align: right;
        }

        .receipt-protocol-badge {
            background: {{ $isLight ? 'rgba(220, 38, 38, 0.1)' : 'rgba(255, 255, 255, 0.1)' }};
            color: var(--primary);
            padding: 3px 10px;
            border-radius: 8px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 0.85rem;
            font-weight: 800;
        }

        /* Seção QR Code (Check-in) */
        @if(!empty($showQr) && !empty($qrToken))
        .qr-card-block {
            background: #FFFFFF;
            color: #0F172A;
            border-radius: 20px;
            padding: 22px;
            margin: 20px 0 26px;
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
            border: 1px solid rgba(0, 0, 0, 0.06);
        }

        .qr-card-title {
            font-size: 1.05rem;
            font-weight: 800;
            color: #0F172A;
            margin-bottom: 4px;
        }

        .qr-card-sub {
            font-size: 0.84rem;
            color: #64748B;
            margin-bottom: 14px;
        }

        .qr-canvas-holder {
            padding: 10px;
            background: #FFFFFF;
            display: inline-block;
            margin-bottom: 12px;
        }

        .qr-guest-tag {
            font-size: 0.95rem;
            font-weight: 700;
            color: #1E293B;
            margin-bottom: 4px;
        }

        .qr-tip {
            font-size: 0.8rem;
            color: #94A3B8;
        }
        @endif

        /* Ações e Botões */
        .btn-stack {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        /* Botão Principal: Acessar Perfil / Cartão */
        a.btn-primary-action {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
            color: #FFFFFF;
            padding: 16px 24px;
            border-radius: 16px;
            text-decoration: none;
            font-weight: 800;
            font-size: 1.02rem;
            box-shadow: 0 8px 24px rgba(220, 38, 38, 0.28);
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            overflow: hidden;
        }

        a.btn-primary-action:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(220, 38, 38, 0.4);
            filter: brightness(1.06);
        }

        a.btn-primary-action:active {
            transform: translateY(0);
        }

        /* Botão WhatsApp */
        a.btn-whatsapp-action {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
            color: #FFFFFF;
            padding: 15px 24px;
            border-radius: 16px;
            text-decoration: none;
            font-weight: 700;
            font-size: 1rem;
            box-shadow: 0 8px 22px rgba(37, 211, 102, 0.3);
            transition: all 0.2s;
        }

        a.btn-whatsapp-action:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 28px rgba(37, 211, 102, 0.45);
        }

        /* Botão do Pastor / Liderança */
        a.btn-pastor-action {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: {{ $isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.08)' }};
            color: var(--text-main);
            border: 1px solid var(--border-subtle);
            padding: 14px 20px;
            border-radius: 16px;
            text-decoration: none;
            font-weight: 700;
            font-size: 0.95rem;
            transition: all 0.2s;
        }

        a.btn-pastor-action:hover {
            background: {{ $isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.14)' }};
            transform: translateY(-1px);
        }

        /* Link Secundário */
        a.btn-link-subtle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            color: var(--text-muted);
            text-decoration: none;
            font-size: 0.88rem;
            font-weight: 600;
            padding: 10px;
            transition: color 0.15s;
            margin-top: 4px;
        }

        a.btn-link-subtle:hover {
            color: var(--primary);
            text-decoration: underline;
        }

        /* Assinatura ConectaKing */
        .brand-credit {
            margin-top: 24px;
            font-size: 0.78rem;
            color: var(--text-muted);
            opacity: 0.7;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .brand-credit svg {
            width: 13px;
            height: 13px;
        }

        /* Responsividade */
        @media (max-width: 480px) {
            .card-body {
                padding: 28px 20px 24px;
            }
            h1.headline {
                font-size: 1.45rem;
            }
            .checkmark-wrapper {
                width: 68px;
                height: 68px;
            }
            .checkmark-badge {
                width: 62px;
                height: 62px;
            }
            .checkmark-badge svg {
                width: 30px;
                height: 30px;
            }
        }
    </style>
    @vite(['resources/css/fonts.css', 'resources/js/pages/cartao-form-success.js'])
</head>
<body>

<canvas id="confetti-canvas"></canvas>

<div class="page-container">
    <div class="main-card">
        <!-- Linha de Destaque Superior -->
        <div class="accent-top-bar"></div>

        @if(!empty($headerImageUrl))
            <div class="card-banner"></div>
        @endif

        <div class="card-body">
            @if(!empty($logo))
                <div class="brand-avatar-wrap">
                    <img src="{{ $logo }}" alt="{{ $brand }}" class="brand-avatar">
                </div>
            @endif

            @if(!empty($brand))
                <div class="brand-name">
                    <span>{{ $brand }}</span>
                </div>
            @endif

            <!-- Badge Animada com Checkmark -->
            <div class="checkmark-wrapper">
                <div class="checkmark-ring"></div>
                <div class="checkmark-badge">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            </div>

            <div class="confirm-pill">
                <span class="confirm-pill-dot"></span>
                <span>Registro Concluído</span>
            </div>

            <h1 class="headline">Resposta Enviada!</h1>

            <div class="form-pill-tag">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                <span>{{ $formTitle }}</span>
            </div>

            <div class="salutation">
                @if(!empty($responderName))
                    Olá, <strong>{{ $responderName }}</strong>! Seja muito bem-vindo(a).
                @else
                    Suas informações foram salvas com sucesso em nossa base.
                @endif
            </div>

            <!-- Caixa de Boas-Vindas / Mensagem do Formulário -->
            @if(!empty($cleanDesc))
                <div class="welcome-callout">
                    <p class="welcome-callout-quote">&ldquo;{{ $cleanDesc }}&rdquo;</p>
                </div>
            @endif

            <!-- Painel de Protocolo / Confirmação -->
            <div class="receipt-panel">
                @if(!empty($responseId))
                <div class="receipt-item">
                    <span class="receipt-item-label">Protocolo:</span>
                    <span class="receipt-protocol-badge">#{{ $responseId }}</span>
                </div>
                @endif
                <div class="receipt-item">
                    <span class="receipt-item-label">Data e Horário:</span>
                    <span class="receipt-item-value">{{ now()->format('d/m/Y \à\s H:i') }}</span>
                </div>
                <div class="receipt-item">
                    <span class="receipt-item-label">Status:</span>
                    <span class="receipt-item-value" style="color: #10B981;">✓ Confirmado</span>
                </div>
            </div>

            <!-- Seção de QR Code para Evento/Checkin -->
            @if(!empty($showQr) && !empty($qrToken))
                <div class="qr-card-block">
                    <div class="qr-card-title">Seu Código de Check-in</div>
                    <div class="qr-card-sub">Apresente este código na recepção / entrada</div>
                    @if(!empty($guestName))
                        <div class="qr-guest-tag">{{ $guestName }}</div>
                    @endif
                    <div class="qr-canvas-holder" id="qrcode"></div>
                    <div class="qr-tip">Tire um print para guardar seu acesso rápido</div>
                </div>
            @endif

            <!-- Grupo de Ações Principais -->
            <div class="btn-stack">
                @if(!empty($cardUrl))
                    <a class="btn-primary-action" href="{{ $cardUrl }}">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        <span>Visitar Perfil Oficial &bull; {{ $brand }}</span>
                    </a>
                @endif

                @if(!empty($showWhatsapp) && !empty($whatsappNumber))
                    @php
                        $cleanWa = preg_replace('/\D+/', '', (string) $whatsappNumber);
                        $defaultWaMsg = rawurlencode("Olá! Acabei de enviar minhas informações pelo formulário {$formTitle}.");
                    @endphp
                    <a class="btn-whatsapp-action" href="https://wa.me/{{ $cleanWa }}?text={{ $defaultWaMsg }}" target="_blank" rel="noopener">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.842-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                        <span>Conversar no WhatsApp</span>
                    </a>
                @endif

                @if(!empty($enablePastorButton) && !empty($pastorWhatsappNumber))
                    @php
                        $cleanPastorWa = preg_replace('/\D+/', '', (string) $pastorWhatsappNumber);
                        $pastorMsg = rawurlencode("Olá! Preenchi o formulário {$formTitle} e gostaria de falar com a liderança.");
                    @endphp
                    <a class="btn-pastor-action" href="https://wa.me/{{ $cleanPastorWa }}?text={{ $pastorMsg }}" target="_blank" rel="noopener">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                        <span>{{ $pastorButtonName ?? 'Falar com o Pastor' }}</span>
                    </a>
                @endif

                @if(!empty($backUrl))
                    <a class="btn-link-subtle" href="{{ $backUrl }}">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                        <span>Preencher novo formulário</span>
                    </a>
                @endif
            </div>

            <!-- Assinatura ConectaKing -->
            <div class="brand-credit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                <span>Conecta King &bull; Tecnologia Inteligente</span>
            </div>
        </div>
    </div>
</div>

@if(!empty($showQr) && !empty($qrToken))
<script>window.__CK_BOOT_FORM_SUCCESS = { j0: @json((string) $qrToken) };</script>
@endif

<!-- Confetes Suaves de Celebração -->
<script>
(function() {
    var canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = window.innerWidth;
    var H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    var mp = 40;
    var particles = [];
    var colors = ['#DC2626', '#10B981', '#FFC700', '#3B82F6', '#EC4899', '#8B5CF6'];

    for (var i = 0; i < mp; i++) {
        particles.push({
            x: Math.random() * W,
            y: Math.random() * H - H,
            r: Math.random() * 5 + 3,
            d: Math.random() * mp,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.floor(Math.random() * 10) - 10,
            tiltAngleIncremental: (Math.random() * 0.07) + 0.04,
            tiltAngle: 0
        });
    }

    var angle = 0;
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
            p.y += (Math.cos(angle + p.d) + 1 + p.r / 2) * 1.3;
            p.x += Math.sin(angle);
            p.tilt = Math.sin(p.tiltAngle - (i / 3)) * 12;

            if (p.y > H && Date.now() - startTime < 3800) {
                p.x = Math.random() * W;
                p.y = -20;
            }
        }
    }

    function loop() {
        draw();
        if (Date.now() - startTime < 5000) {
            requestAnimationFrame(loop);
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

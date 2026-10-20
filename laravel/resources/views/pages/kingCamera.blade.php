<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>King Câmera — Monitoramento Inteligente | Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    @vite(['resources/css/fontawesome.css'])

    <style>
        :root {
            --kc-bg: #07090e;
            --kc-surface: #0f1422;
            --kc-surface-card: rgba(18, 24, 38, 0.75);
            --kc-surface-hover: rgba(27, 36, 56, 0.85);
            --kc-border: rgba(255, 255, 255, 0.08);
            --kc-border-active: rgba(245, 158, 11, 0.4);
            --kc-gold: #f59e0b;
            --kc-gold-glow: rgba(245, 158, 11, 0.25);
            --kc-emerald: #10b981;
            --kc-emerald-glow: rgba(16, 185, 129, 0.25);
            --kc-rose: #ef4444;
            --kc-cyan: #06b6d4;
            --kc-text: #f8fafc;
            --kc-text-muted: #94a3b8;
            --kc-text-dim: #64748b;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        body {
            background-color: var(--kc-bg);
            background-image: 
                radial-gradient(at 10% 10%, rgba(245, 158, 11, 0.05) 0px, transparent 50%),
                radial-gradient(at 90% 90%, rgba(6, 182, 212, 0.04) 0px, transparent 50%);
            color: var(--kc-text);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
        }

        /* Topbar */
        .kc-topbar {
            background: rgba(11, 15, 25, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-bottom: 1px solid var(--kc-border);
            position: sticky;
            top: 0;
            z-index: 50;
            padding: 0.85rem 1.5rem;
        }

        .kc-topbar-inner {
            max-width: 1500px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
        }

        .kc-nav-left {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .kc-back-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 0.9rem;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--kc-border);
            color: var(--kc-text-muted);
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .kc-back-btn:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateX(-2px);
        }

        .kc-brand {
            display: flex;
            align-items: center;
            gap: 0.6rem;
        }

        .kc-brand-badge {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #000;
            font-weight: 800;
            font-size: 0.7rem;
            padding: 0.2rem 0.5rem;
            border-radius: 6px;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }

        .kc-brand-title {
            font-family: 'Outfit', sans-serif;
            font-size: 1.25rem;
            font-weight: 700;
            letter-spacing: -0.02em;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }

        .kc-brand-title span {
            color: var(--kc-gold);
        }

        .kc-topbar-actions {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .kc-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.6rem 1.1rem;
            border-radius: 9px;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            border: none;
            text-decoration: none;
        }

        .kc-btn-primary {
            background: linear-gradient(135deg, #f59e0b, #eab308);
            color: #090d16;
            box-shadow: 0 4px 14px var(--kc-gold-glow);
        }

        .kc-btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
            filter: brightness(1.05);
        }

        .kc-btn-secondary {
            background: rgba(255, 255, 255, 0.06);
            color: var(--kc-text);
            border: 1px solid var(--kc-border);
        }

        .kc-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.12);
            border-color: rgba(255, 255, 255, 0.2);
        }

        .kc-btn-telegram {
            background: linear-gradient(135deg, #0088cc, #00aaff);
            color: #fff;
            box-shadow: 0 4px 14px rgba(0, 136, 204, 0.3);
        }

        .kc-btn-telegram:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 18px rgba(0, 136, 204, 0.5);
        }

        /* Main Container */
        .kc-main {
            max-width: 1500px;
            margin: 0 auto;
            padding: 1.5rem;
            width: 100%;
            flex: 1;
        }

        /* Hero / Stats bar */
        .kc-hero {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 1.5rem;
            background: linear-gradient(145deg, rgba(18, 24, 38, 0.8), rgba(12, 17, 28, 0.9));
            backdrop-filter: blur(12px);
            border: 1px solid var(--kc-border);
            border-radius: 16px;
            padding: 1.5rem 2rem;
            margin-bottom: 2rem;
            position: relative;
            overflow: hidden;
        }

        .kc-hero::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--kc-gold), transparent);
        }

        .kc-hero-text h1 {
            font-family: 'Outfit', sans-serif;
            font-size: 1.6rem;
            font-weight: 700;
            margin-bottom: 0.35rem;
        }

        .kc-hero-text p {
            color: var(--kc-text-muted);
            font-size: 0.9rem;
            max-width: 600px;
        }

        .kc-stats-grid {
            display: flex;
            gap: 1.5rem;
            flex-wrap: wrap;
        }

        .kc-stat-item {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--kc-border);
            border-radius: 12px;
            padding: 0.75rem 1.25rem;
            min-width: 130px;
        }

        .kc-stat-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--kc-text-dim);
            margin-bottom: 0.25rem;
        }

        .kc-stat-val {
            font-size: 1.3rem;
            font-weight: 700;
            font-family: 'Outfit', sans-serif;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }

        .kc-stat-val.live {
            color: var(--kc-emerald);
        }

        /* Filter & Controls */
        .kc-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            margin-bottom: 1.25rem;
            flex-wrap: wrap;
        }

        .kc-grid-modes {
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid var(--kc-border);
            border-radius: 10px;
            padding: 0.25rem;
            gap: 0.25rem;
        }

        .kc-grid-btn {
            background: transparent;
            border: none;
            color: var(--kc-text-muted);
            padding: 0.4rem 0.75rem;
            border-radius: 7px;
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .kc-grid-btn.active, .kc-grid-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
        }

        /* Camera Grid */
        .kc-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(460px, 1fr));
            gap: 1.5rem;
        }

        @media (max-width: 768px) {
            .kc-grid {
                grid-template-columns: 1fr;
            }
        }

        .kc-grid.cols-1 { grid-template-columns: 1fr; }
        .kc-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
        .kc-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }

        /* Camera Card */
        .kc-card {
            background: var(--kc-surface-card);
            border: 1px solid var(--kc-border);
            border-radius: 16px;
            overflow: hidden;
            backdrop-filter: blur(12px);
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            position: relative;
        }

        .kc-card:hover {
            border-color: rgba(245, 158, 11, 0.35);
            box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.6);
            transform: translateY(-2px);
        }

        .kc-card-header {
            padding: 0.85rem 1.15rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--kc-border);
            background: rgba(15, 20, 34, 0.6);
        }

        .kc-card-title-group {
            display: flex;
            align-items: center;
            gap: 0.6rem;
        }

        .kc-card-title {
            font-size: 0.95rem;
            font-weight: 600;
            color: #fff;
        }

        .kc-room-badge {
            font-size: 0.72rem;
            padding: 0.15rem 0.45rem;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.08);
            color: var(--kc-text-muted);
        }

        .kc-live-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            font-size: 0.72rem;
            font-weight: 700;
            padding: 0.2rem 0.55rem;
            border-radius: 20px;
            background: rgba(16, 185, 129, 0.15);
            color: var(--kc-emerald);
            border: 1px solid rgba(16, 185, 129, 0.3);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        .kc-live-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background-color: var(--kc-emerald);
            box-shadow: 0 0 8px var(--kc-emerald);
            animation: kc-pulse 1.8s infinite;
        }

        @keyframes kc-pulse {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.3); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.8; }
        }

        /* Video Container */
        .kc-video-wrap {
            position: relative;
            width: 100%;
            aspect-ratio: 16 / 9;
            background: #020408;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .kc-video-wrap video {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }

        .kc-video-overlay {
            position: absolute;
            inset: 0;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 0.75rem;
            background: linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 70%, rgba(0,0,0,0.6) 100%);
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        .kc-card:hover .kc-video-overlay {
            opacity: 1;
        }

        .kc-overlay-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .kc-overlay-timestamp {
            font-size: 0.75rem;
            font-family: monospace;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            color: #cbd5e1;
        }

        .kc-overlay-controls {
            display: flex;
            gap: 0.4rem;
            pointer-events: auto;
        }

        .kc-icon-btn {
            background: rgba(15, 20, 34, 0.75);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #fff;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 0.85rem;
            transition: all 0.15s ease;
        }

        .kc-icon-btn:hover {
            background: var(--kc-gold);
            color: #000;
            border-color: var(--kc-gold);
            transform: scale(1.08);
        }

        /* Card Footer */
        .kc-card-footer {
            padding: 0.85rem 1.15rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1px solid var(--kc-border);
            font-size: 0.8rem;
            color: var(--kc-text-dim);
            background: rgba(15, 20, 34, 0.4);
        }

        .kc-ip-tag {
            font-family: monospace;
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            color: var(--kc-text-muted);
        }

        .kc-footer-actions {
            display: flex;
            gap: 0.5rem;
        }

        /* Offline / Loader State inside Video */
        .kc-state-box {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            background: #060911;
            color: var(--kc-text-muted);
            text-align: center;
            padding: 1rem;
            z-index: 5;
        }

        .kc-spinner {
            width: 36px;
            height: 36px;
            border: 3px solid rgba(245, 158, 11, 0.15);
            border-top-color: var(--kc-gold);
            border-radius: 50%;
            animation: kc-spin 0.9s linear infinite;
        }

        @keyframes kc-spin {
            to { transform: rotate(360deg); }
        }

        /* Modal Styles */
        .kc-modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
            z-index: 100;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
        }

        .kc-modal-backdrop.active {
            display: flex;
        }

        .kc-modal {
            background: #0f1422;
            border: 1px solid var(--kc-border);
            border-radius: 20px;
            width: 100%;
            max-width: 620px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
        }

        .kc-modal-header {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--kc-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .kc-modal-title {
            font-family: 'Outfit', sans-serif;
            font-size: 1.25rem;
            font-weight: 700;
        }

        .kc-modal-close {
            background: none;
            border: none;
            color: var(--kc-text-dim);
            font-size: 1.2rem;
            cursor: pointer;
            padding: 0.2rem;
            line-height: 1;
            transition: color 0.15s;
        }

        .kc-modal-close:hover {
            color: #fff;
        }

        /* Tabs inside Modal */
        .kc-modal-tabs {
            display: flex;
            border-bottom: 1px solid var(--kc-border);
            background: rgba(0, 0, 0, 0.2);
        }

        .kc-tab-btn {
            flex: 1;
            background: none;
            border: none;
            padding: 0.85rem 1rem;
            color: var(--kc-text-dim);
            font-size: 0.875rem;
            font-weight: 600;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }

        .kc-tab-btn.active {
            color: var(--kc-gold);
            border-bottom-color: var(--kc-gold);
            background: rgba(245, 158, 11, 0.05);
        }

        .kc-modal-body {
            padding: 1.5rem;
        }

        .kc-tab-pane {
            display: none;
        }

        .kc-tab-pane.active {
            display: block;
        }

        .kc-form-group {
            margin-bottom: 1rem;
        }

        .kc-label {
            display: block;
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--kc-text-muted);
            margin-bottom: 0.4rem;
        }

        .kc-input {
            width: 100%;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid var(--kc-border);
            border-radius: 9px;
            padding: 0.65rem 0.85rem;
            color: #fff;
            font-size: 0.9rem;
            transition: border-color 0.2s;
        }

        .kc-input:focus {
            outline: none;
            border-color: var(--kc-gold);
            background: rgba(255, 255, 255, 0.07);
        }

        .kc-form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }

        .kc-form-help {
            font-size: 0.75rem;
            color: var(--kc-text-dim);
            margin-top: 0.3rem;
        }

        .kc-qr-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 12px;
            border: 1px dashed var(--kc-border);
            margin-top: 1rem;
        }

        #kc-qrcode-container {
            padding: 12px;
            background: #fff;
            border-radius: 10px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.4);
            margin-bottom: 0.75rem;
        }

        /* Empty State */
        .kc-empty {
            text-align: center;
            padding: 4rem 1.5rem;
            background: var(--kc-surface-card);
            border: 1px dashed var(--kc-border);
            border-radius: 16px;
        }

        .kc-empty-icon {
            font-size: 3rem;
            color: var(--kc-gold);
            margin-bottom: 1rem;
            opacity: 0.7;
        }

        .kc-empty h3 {
            font-size: 1.25rem;
            margin-bottom: 0.5rem;
        }

        .kc-empty p {
            color: var(--kc-text-muted);
            max-width: 480px;
            margin: 0 auto 1.5rem auto;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>

    <!-- Topbar -->
    <header class="kc-topbar">
        <div class="kc-topbar-inner">
            <div class="kc-nav-left">
                <a href="/dashboard" class="kc-back-btn">
                    <i class="fas fa-arrow-left"></i>
                    <span>Painel</span>
                </a>
                <div class="kc-brand">
                    <div class="kc-brand-badge">PRO</div>
                    <div class="kc-brand-title">King <span>Câmera</span></div>
                </div>
            </div>
            <div class="kc-topbar-actions">
                <button type="button" class="kc-btn kc-btn-telegram" id="btn-telegram-info" title="Configurar Agente Telegram">
                    <i class="fab fa-telegram-plane"></i>
                    <span>Agente Telegram</span>
                </button>
                <button type="button" class="kc-btn kc-btn-primary" id="btn-add-camera">
                    <i class="fas fa-plus"></i>
                    <span>Nova Câmera</span>
                </button>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="kc-main">
        <!-- Hero & Status -->
        <section class="kc-hero">
            <div class="kc-hero-text">
                <h1>Monitoramento WebRTC Ultra Rápido</h1>
                <p>Visualização instantânea de câmeras IP com latência abaixo de 0,5s direto no seu navegador, sem necessidade de apps de terceiros.</p>
            </div>
            <div class="kc-stats-grid">
                <div class="kc-stat-item">
                    <div class="kc-stat-label">Câmeras</div>
                    <div class="kc-stat-val" id="stat-total">1</div>
                </div>
                <div class="kc-stat-item">
                    <div class="kc-stat-label">Status</div>
                    <div class="kc-stat-val live" id="stat-live">
                        <span class="kc-live-dot"></span> Online
                    </div>
                </div>
                <div class="kc-stat-item">
                    <div class="kc-stat-label">Latência</div>
                    <div class="kc-stat-val" style="color: var(--kc-cyan);">&lt; 350ms</div>
                </div>
            </div>
        </section>

        <!-- Toolbar: Grid Layout Filter -->
        <div class="kc-toolbar">
            <div style="font-size: 0.9rem; color: var(--kc-text-muted);">
                <i class="fas fa-video" style="color: var(--kc-gold); margin-right: 0.4rem;"></i>
                Feed em Tempo Real
            </div>
            <div class="kc-grid-modes">
                <button type="button" class="kc-grid-btn active" data-cols="auto" title="Grade Adaptável">
                    <i class="fas fa-th-large"></i>
                </button>
                <button type="button" class="kc-grid-btn" data-cols="1" title="1 Coluna (Foco)">
                    <i class="fas fa-square"></i>
                </button>
                <button type="button" class="kc-grid-btn" data-cols="2" title="2 Colunas">
                    <i class="fas fa-th"></i>
                </button>
            </div>
        </div>

        <!-- Cameras Grid -->
        <div id="cameras-grid" class="kc-grid">
            <!-- As câmeras serão renderizadas dinamicamente aqui -->
        </div>

        <!-- Empty State (oculto por padrão) -->
        <div id="cameras-empty" class="kc-empty" style="display: none;">
            <div class="kc-empty-icon"><i class="fas fa-video-slash"></i></div>
            <h3>Nenhuma câmera cadastrada</h3>
            <p>Conecte sua primeira câmera IP ou bebê monitor usando o protocolo RTSP ou configure uma nova câmera via QR Code.</p>
            <button type="button" class="kc-btn kc-btn-primary" onclick="openModal('add')">
                <i class="fas fa-plus"></i> Conectar Minha Primeira Câmera
            </button>
        </div>
    </main>

    <!-- Modal Adicionar / Editar Câmera -->
    <div class="kc-modal-backdrop" id="camera-modal">
        <div class="kc-modal">
            <div class="kc-modal-header">
                <div class="kc-modal-title" id="modal-title">Adicionar Câmera</div>
                <button type="button" class="kc-modal-close" onclick="closeModal()">&times;</button>
            </div>
            <!-- Tabs -->
            <div class="kc-modal-tabs">
                <button type="button" class="kc-tab-btn active" data-tab="tab-rtsp">
                    <i class="fas fa-network-wired"></i> Câmera na Rede (IP / RTSP)
                </button>
                <button type="button" class="kc-tab-btn" data-tab="tab-qrcode">
                    <i class="fas fa-qrcode"></i> Nova Câmera (QR Code)
                </button>
                <button type="button" class="kc-tab-btn" data-tab="tab-telegram">
                    <i class="fab fa-telegram-plane"></i> Agente Telegram
                </button>
            </div>
            <div class="kc-modal-body">
                <!-- Tab 1: Form RTSP -->
                <div class="kc-tab-pane active" id="tab-rtsp">
                    <form id="form-camera" onsubmit="saveCamera(event)">
                        <input type="hidden" id="cam-id" value="">
                        <div class="kc-form-row">
                            <div class="kc-form-group">
                                <label class="kc-label" for="cam-name">Nome da Câmera *</label>
                                <input type="text" id="cam-name" class="kc-input" placeholder="Ex: Quarto Bebê" required value="Quarto Bebê">
                            </div>
                            <div class="kc-form-group">
                                <label class="kc-label" for="cam-room">Cômodo / Localização</label>
                                <input type="text" id="cam-room" class="kc-input" placeholder="Ex: Quarto, Sala, Portão" value="Quarto">
                            </div>
                        </div>

                        <div class="kc-form-row">
                            <div class="kc-form-group">
                                <label class="kc-label" for="cam-ip">Endereço IP ou Host *</label>
                                <input type="text" id="cam-ip" class="kc-input" placeholder="Ex: 172.16.100.215" required value="172.16.100.215">
                            </div>
                            <div class="kc-form-group">
                                <label class="kc-label" for="cam-port">Porta RTSP</label>
                                <input type="number" id="cam-port" class="kc-input" placeholder="554" value="554">
                            </div>
                        </div>

                        <div class="kc-form-group">
                            <label class="kc-label" for="cam-path">Caminho RTSP</label>
                            <input type="text" id="cam-path" class="kc-input" placeholder="/onvif1 ou /live/ch0" value="/onvif1">
                            <div class="kc-form-help">Padrões comuns: <code>/onvif1</code>, <code>/live/ch0</code>, <code>/h264Preview_01_main</code></div>
                        </div>

                        <div class="kc-form-row">
                            <div class="kc-form-group">
                                <label class="kc-label" for="cam-user">Usuário RTSP</label>
                                <input type="text" id="cam-user" class="kc-input" placeholder="admin" value="admin">
                            </div>
                            <div class="kc-form-group">
                                <label class="kc-label" for="cam-pass">Senha RTSP</label>
                                <input type="password" id="cam-pass" class="kc-input" placeholder="Playadryan22*" value="Playadryan22*">
                            </div>
                        </div>

                        <div class="kc-form-group" style="margin-top: 1.25rem; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); padding: 0.85rem; border-radius: 9px; border: 1px solid var(--kc-border);">
                            <div>
                                <div style="font-weight: 600; font-size: 0.85rem;">Alertas no Telegram</div>
                                <div class="kc-form-help">Receber foto instantânea quando houver aviso do Agente</div>
                            </div>
                            <input type="checkbox" id="cam-telegram-alerts" checked style="width: 18px; height: 18px; accent-color: var(--kc-gold); cursor: pointer;">
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
                            <button type="button" class="kc-btn kc-btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="kc-btn kc-btn-primary" id="btn-save-cam">
                                <i class="fas fa-save"></i> Salvar Câmera
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Tab 2: Wi-Fi QR Code Generator -->
                <div class="kc-tab-pane" id="tab-qrcode">
                    <p style="font-size: 0.85rem; color: var(--kc-text-muted); margin-bottom: 1rem;">
                        Aponte a lente da sua câmera nova para o QR Code gerado abaixo. A câmera lerá as credenciais do seu Wi-Fi e se conectará automaticamente à sua rede.
                    </p>
                    <div class="kc-form-group">
                        <label class="kc-label" for="wifi-ssid">Nome da Rede Wi-Fi (SSID) *</label>
                        <input type="text" id="wifi-ssid" class="kc-input" placeholder="Ex: MinhaCasa_2.4G" oninput="generateWifiQr()">
                    </div>
                    <div class="kc-form-group">
                        <label class="kc-label" for="wifi-pass">Senha do Wi-Fi *</label>
                        <input type="text" id="wifi-pass" class="kc-input" placeholder="Senha da sua rede" oninput="generateWifiQr()">
                    </div>
                    <div class="kc-form-group">
                        <label class="kc-label" for="wifi-type">Criptografia</label>
                        <select id="wifi-type" class="kc-input" onchange="generateWifiQr()">
                            <option value="WPA">WPA/WPA2 (Padrão)</option>
                            <option value="WEP">WEP</option>
                            <option value="nopass">Rede Aberta (Sem Senha)</option>
                        </select>
                    </div>

                    <div class="kc-qr-box">
                        <div id="kc-qrcode-container"></div>
                        <div style="font-size: 0.8rem; color: var(--kc-text-muted); text-align: center;">
                            Posicione o celular a cerca de 15 a 20 cm da lente da câmera até ouvir o bipe de confirmação.
                        </div>
                    </div>
                </div>

                <!-- Tab 3: Telegram Agent Info -->
                <div class="kc-tab-pane" id="tab-telegram">
                    <div style="text-align: center; padding: 1rem 0;">
                        <i class="fab fa-telegram-plane" style="font-size: 3.5rem; color: #0088cc; margin-bottom: 1rem;"></i>
                        <h3 style="font-size: 1.2rem; margin-bottom: 0.5rem;">Agente Inteligente King Câmera</h3>
                        <p style="font-size: 0.85rem; color: var(--kc-text-muted); max-width: 440px; margin: 0 auto 1.5rem auto;">
                            Receba fotos instantâneas, status de conexão e alertas ao vivo diretamente no seu Telegram.
                        </p>

                        <div style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 380px; margin: 0 auto;">
                            <a id="btn-open-telegram-link" href="#" target="_blank" class="kc-btn kc-btn-telegram" style="width: 100%;">
                                <i class="fab fa-telegram-plane"></i> Conectar Meu Telegram com 1 Clique
                            </a>
                            <button type="button" class="kc-btn kc-btn-secondary" onclick="testTelegramCurrentCam()">
                                <i class="fas fa-paper-plane"></i> Disparar Foto e Alerta de Teste
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Script de Inicialização e Lógica WebRTC WHEP -->
    <script>
        let camerasData = [];
        let peerConnections = {};
        let currentEditingId = null;
        let qrCodeInstance = null;
        let telegramDeepLink = '';

        document.addEventListener('DOMContentLoaded', () => {
            loadCameras();
            setupTabs();
            setupGridFilter();
        });

        // Configuração das abas do Modal
        function setupTabs() {
            document.querySelectorAll('.kc-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.kc-tab-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.kc-tab-pane').forEach(p => p.classList.remove('active'));
                    btn.classList.add('active');
                    const tabId = btn.getAttribute('data-tab');
                    const pane = document.getElementById(tabId);
                    if (pane) pane.classList.add('active');
                    if (tabId === 'tab-qrcode') generateWifiQr();
                });
            });
        }

        // Seletor de colunas
        function setupGridFilter() {
            document.querySelectorAll('.kc-grid-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.kc-grid-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const cols = btn.getAttribute('data-cols');
                    const grid = document.getElementById('cameras-grid');
                    grid.classList.remove('cols-1', 'cols-2', 'cols-3');
                    if (cols === '1') grid.classList.add('cols-1');
                    else if (cols === '2') grid.classList.add('cols-2');
                });
            });
        }

        function getAuthHeaders(extra = {}) {
            let token = null;
            try {
                if (typeof localStorage !== 'undefined') {
                    token = localStorage.getItem('token') || localStorage.getItem('conectaKingToken');
                }
                if (!token && typeof sessionStorage !== 'undefined') {
                    token = sessionStorage.getItem('token');
                }
            } catch (e) {}
            const headers = { 'Accept': 'application/json', ...extra };
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }
            return headers;
        }

        // Carrega câmeras da API
        async function loadCameras() {
            try {
                const res = await fetch('/api/cameras', {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                
                if (res.status === 401 || res.status === 403) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Módulo King Câmera',
                        text: 'Seu plano atual ainda não possui o módulo King Câmera ativado. Solicite a liberação no painel do administrador!',
                        confirmButtonText: 'Voltar ao Painel',
                        confirmButtonColor: '#f59e0b',
                    }).then(() => {
                        window.location.href = '/dashboard';
                    });
                    return;
                }

                const json = await res.json();
                if (json.success) {
                    camerasData = json.data || [];
                    telegramDeepLink = json.meta?.telegram_deep_link || '#';
                    const teleLink = document.getElementById('btn-open-telegram-link');
                    if (teleLink) teleLink.href = telegramDeepLink;

                    renderCameras();
                }
            } catch (err) {
                console.error('Erro ao carregar câmeras:', err);
            }
        }

        // Renderiza cards de câmeras
        function renderCameras() {
            const grid = document.getElementById('cameras-grid');
            const empty = document.getElementById('cameras-empty');
            const statTotal = document.getElementById('stat-total');

            grid.innerHTML = '';
            if (statTotal) statTotal.textContent = camerasData.length;

            if (camerasData.length === 0) {
                grid.style.display = 'none';
                empty.style.display = 'block';
                return;
            }

            grid.style.display = 'grid';
            empty.style.display = 'none';

            camerasData.forEach(cam => {
                const card = document.createElement('div');
                card.className = 'kc-card';
                card.id = `card-cam-${cam.id}`;
                card.innerHTML = `
                    <div class="kc-card-header">
                        <div class="kc-card-title-group">
                            <span class="kc-card-title">${escapeHtml(cam.name)}</span>
                            <span class="kc-room-badge"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(cam.room || 'Geral')}</span>
                        </div>
                        <div class="kc-live-badge">
                            <span class="kc-live-dot"></span>
                            <span>AO VIVO</span>
                        </div>
                    </div>
                    <div class="kc-video-wrap">
                        <video id="video-${cam.id}" autoplay playsinline muted></video>
                        <div class="kc-state-box" id="loader-${cam.id}">
                            <div class="kc-spinner"></div>
                            <div style="font-size: 0.85rem; font-weight: 500;">Conectando WebRTC...</div>
                            <div style="font-size: 0.72rem; color: var(--kc-text-dim);">IP: ${cam.ip_address}</div>
                        </div>
                        <div class="kc-video-overlay">
                            <div class="kc-overlay-top">
                                <div class="kc-overlay-timestamp" id="time-${cam.id}">--:--:--</div>
                                <div class="kc-overlay-controls">
                                    <button class="kc-icon-btn" onclick="toggleAudio(${cam.id})" title="Ativar/Mudo Áudio" id="btn-audio-${cam.id}">
                                        <i class="fas fa-volume-mute"></i>
                                    </button>
                                    <button class="kc-icon-btn" onclick="downloadSnapshot(${cam.id})" title="Capturar Foto Instantânea">
                                        <i class="fas fa-camera"></i>
                                    </button>
                                    <button class="kc-icon-btn" onclick="toggleFullscreen(${cam.id})" title="Tela Cheia">
                                        <i class="fas fa-expand"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="kc-card-footer">
                        <div class="kc-ip-tag">
                            <i class="fas fa-ethernet"></i> ${cam.ip_address}:${cam.port || 554}
                        </div>
                        <div class="kc-footer-actions">
                            <button class="kc-icon-btn" onclick="triggerTelegramTest(${cam.id})" title="Testar Alerta no Telegram" style="width: 28px; height: 28px;">
                                <i class="fab fa-telegram-plane"></i>
                            </button>
                            <button class="kc-icon-btn" onclick="editCamera(${cam.id})" title="Configurações" style="width: 28px; height: 28px;">
                                <i class="fas fa-cog"></i>
                            </button>
                            <button class="kc-icon-btn" onclick="deleteCamera(${cam.id})" title="Remover Câmera" style="width: 28px; height: 28px; color: var(--kc-rose);">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                `;
                grid.appendChild(card);

                // Inicia streaming WebRTC para a câmera
                startWebRtcStream(cam);
                startClock(cam.id);
            });
        }

        // Relógio no canto do vídeo
        function startClock(camId) {
            setInterval(() => {
                const el = document.getElementById(`time-${camId}`);
                if (el) {
                    const now = new Date();
                    el.textContent = now.toLocaleTimeString('pt-BR');
                }
            }, 1000);
        }

        // Negociação WebRTC WHEP com go2rtc via Laravel proxy
        async function startWebRtcStream(cam) {
            const videoEl = document.getElementById(`video-${cam.id}`);
            const loaderEl = document.getElementById(`loader-${cam.id}`);

            if (!videoEl) return;

            try {
                // Fecha conexão anterior se houver
                if (peerConnections[cam.id]) {
                    peerConnections[cam.id].close();
                }

                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });
                peerConnections[cam.id] = pc;

                pc.addTransceiver('video', { direction: 'recvonly' });
                pc.addTransceiver('audio', { direction: 'recvonly' });

                pc.ontrack = (event) => {
                    if (event.streams && event.streams[0]) {
                        videoEl.srcObject = event.streams[0];
                    } else {
                        const inboundStream = new MediaStream();
                        inboundStream.addTrack(event.track);
                        videoEl.srcObject = inboundStream;
                    }
                    if (loaderEl) loaderEl.style.display = 'none';
                };

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                // Envia oferta SDP para o endpoint do backend
                const response = await fetch(`/api/cameras/${cam.id}/webrtc`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/sdp' }),
                    body: offer.sdp
                });

                if (response.ok) {
                    const answerSdp = await response.text();
                    await pc.setRemoteDescription(new RTCSessionDescription({
                        type: 'answer',
                        sdp: answerSdp
                    }));
                } else {
                    showCameraStreamOffline(cam.id, 'Câmera em rede local (aguardando conexão direta ou túnel)');
                }
            } catch (err) {
                console.warn(`WebRTC error for camera ${cam.id}:`, err);
                showCameraStreamOffline(cam.id, 'Aguardando fluxo de vídeo...');
            }
        }

        function showCameraStreamOffline(camId, msg) {
            const loaderEl = document.getElementById(`loader-${camId}`);
            if (loaderEl) {
                loaderEl.innerHTML = `
                    <i class="fas fa-video-slash" style="font-size: 2rem; color: var(--kc-gold); margin-bottom: 0.5rem;"></i>
                    <div style="font-size: 0.85rem; font-weight: 600;">Feed em Standby</div>
                    <div style="font-size: 0.75rem; color: var(--kc-text-dim); max-width: 260px;">${msg}</div>
                    <button class="kc-btn kc-btn-secondary" onclick="retryStream(${camId})" style="margin-top: 0.5rem; padding: 0.35rem 0.75rem; font-size: 0.75rem;">
                        <i class="fas fa-redo"></i> Reconectar
                    </button>
                `;
            }
        }

        function retryStream(camId) {
            const cam = camerasData.find(c => c.id === camId);
            if (cam) startWebRtcStream(cam);
        }

        // Alterna áudio
        function toggleAudio(camId) {
            const video = document.getElementById(`video-${camId}`);
            const btn = document.getElementById(`btn-audio-${camId}`);
            if (!video || !btn) return;

            video.muted = !video.muted;
            if (video.muted) {
                btn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            } else {
                btn.innerHTML = '<i class="fas fa-volume-up"></i>';
                btn.style.color = 'var(--kc-gold)';
            }
        }

        // Tela cheia
        function toggleFullscreen(camId) {
            const wrap = document.querySelector(`#card-cam-${camId} .kc-video-wrap`);
            if (!wrap) return;
            if (!document.fullscreenElement) {
                wrap.requestFullscreen().catch(err => console.error(err));
            } else {
                document.exitFullscreen();
            }
        }

        // Download Snapshot
        async function downloadSnapshot(camId) {
            try {
                const res = await fetch(`/api/cameras/${camId}/snapshot`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `snapshot-camera-${camId}-${Date.now()}.jpg`;
                    a.click();
                    URL.revokeObjectURL(url);
                } else {
                    Swal.fire({
                        icon: 'info',
                        title: 'Snapshot',
                        text: 'Câmera não respondeu com um frame no momento. Tente novamente.',
                    });
                }
            } catch (err) {
                console.error(err);
            }
        }

        // Testar alerta Telegram da câmera
        async function triggerTelegramTest(camId) {
            Swal.fire({
                title: 'Enviando Alerta...',
                text: 'Disparando foto da câmera para o Telegram cadastrado...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const res = await fetch(`/api/cameras/${camId}/test-telegram`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (json.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Enviado com Sucesso!',
                        text: json.message,
                        confirmButtonColor: '#f59e0b'
                    });
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Atenção',
                        text: json.message,
                        confirmButtonColor: '#f59e0b'
                    });
                }
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro',
                    text: 'Não foi possível disparar o alerta de teste.'
                });
            }
        }

        function testTelegramCurrentCam() {
            if (camerasData.length > 0) {
                triggerTelegramTest(camerasData[0].id);
            } else {
                Swal.fire('Info', 'Cadastre ao menos uma câmera para testar.', 'info');
            }
        }

        // Modal Controls
        const modalBackdrop = document.getElementById('camera-modal');
        const btnAddCamera = document.getElementById('btn-add-camera');
        const btnTelegramInfo = document.getElementById('btn-telegram-info');

        btnAddCamera.addEventListener('click', () => openModal('add'));
        btnTelegramInfo.addEventListener('click', () => {
            openModal('add');
            document.querySelector('.kc-tab-btn[data-tab="tab-telegram"]')?.click();
        });

        function openModal(mode, cam = null) {
            currentEditingId = cam ? cam.id : null;
            document.getElementById('modal-title').textContent = cam ? 'Editar Câmera' : 'Adicionar Câmera';
            document.getElementById('cam-id').value = cam ? cam.id : '';
            document.getElementById('cam-name').value = cam ? cam.name : 'Quarto Bebê';
            document.getElementById('cam-room').value = cam ? (cam.room || '') : 'Quarto';
            document.getElementById('cam-ip').value = cam ? cam.ip_address : '172.16.100.215';
            document.getElementById('cam-port').value = cam ? (cam.port || 554) : 554;
            document.getElementById('cam-path').value = cam ? (cam.rtsp_path || '/onvif1') : '/onvif1';
            document.getElementById('cam-user').value = cam ? (cam.username || 'admin') : 'admin';
            document.getElementById('cam-pass').value = '';
            document.getElementById('cam-telegram-alerts').checked = cam ? cam.telegram_alerts_enabled : true;

            document.querySelector('.kc-tab-btn[data-tab="tab-rtsp"]')?.click();
            modalBackdrop.classList.add('active');
        }

        function closeModal() {
            modalBackdrop.classList.remove('active');
        }

        // Salvar Câmera
        async function saveCamera(e) {
            e.preventDefault();
            const btn = document.getElementById('btn-save-cam');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

            const id = document.getElementById('cam-id').value;
            const payload = {
                name: document.getElementById('cam-name').value,
                room: document.getElementById('cam-room').value,
                ip_address: document.getElementById('cam-ip').value,
                port: parseInt(document.getElementById('cam-port').value || 554),
                rtsp_path: document.getElementById('cam-path').value,
                username: document.getElementById('cam-user').value,
                telegram_alerts_enabled: document.getElementById('cam-telegram-alerts').checked,
            };
            const pass = document.getElementById('cam-pass').value;
            if (pass) payload.password = pass;

            const isEdit = Boolean(id);
            const url = isEdit ? `/api/cameras/${id}` : '/api/cameras';
            const method = isEdit ? 'PUT' : 'POST';

            try {
                const res = await fetch(url, {
                    method: method,
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload)
                });

                const json = await res.json();
                if (json.success) {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: isEdit ? 'Câmera Atualizada!' : 'Câmera Conectada!',
                        text: json.message,
                        timer: 1800,
                        showConfirmButton: false
                    });
                    loadCameras();
                } else {
                    Swal.fire('Erro', json.message || 'Falha ao salvar câmera.', 'error');
                }
            } catch (err) {
                Swal.fire('Erro', 'Não foi possível conectar ao servidor.', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Salvar Câmera';
            }
        }

        function editCamera(id) {
            const cam = camerasData.find(c => c.id === id);
            if (cam) openModal('edit', cam);
        }

        // Deletar câmera
        async function deleteCamera(id) {
            const res = await Swal.fire({
                title: 'Remover Câmera?',
                text: 'Esta câmera será desconectada do painel de monitoramento.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#334155',
                confirmButtonText: 'Sim, remover',
                cancelButtonText: 'Cancelar'
            });

            if (res.isConfirmed) {
                try {
                    const delRes = await fetch(`/api/cameras/${id}`, {
                        method: 'DELETE',
                        credentials: 'include',
                        headers: getAuthHeaders()
                    });
                    const json = await delRes.json();
                    if (json.success) {
                        loadCameras();
                    }
                } catch (err) {
                    Swal.fire('Erro', 'Não foi possível remover.', 'error');
                }
            }
        }

        // Gerador de QR Code Wi-Fi para novas câmeras
        function generateWifiQr() {
            const ssid = document.getElementById('wifi-ssid').value.trim();
            const pass = document.getElementById('wifi-pass').value.trim();
            const type = document.getElementById('wifi-type').value;

            const container = document.getElementById('kc-qrcode-container');
            container.innerHTML = '';

            const qrText = ssid ? `WIFI:T:${type};S:${ssid};P:${pass};;` : 'WIFI:T:WPA;S:Rede;P:Senha;;';

            if (window.QRCode) {
                qrCodeInstance = new QRCode(container, {
                    text: qrText,
                    width: 180,
                    height: 180,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        }

        function escapeHtml(text) {
            if (!text) return '';
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    </script>
</body>
</html>

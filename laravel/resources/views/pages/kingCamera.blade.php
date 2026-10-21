<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>King Câmera — Monitoramento Inteligente | Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
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

        .kc-btn-emerald {
            background: linear-gradient(135deg, #10b981, #059669);
            color: #fff;
            box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
        }

        .kc-btn-emerald:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 18px rgba(16, 185, 129, 0.5);
            filter: brightness(1.08);
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
            transition: filter 0.3s ease;
        }

        .kc-video-wrap video.ai-night-vision {
            filter: brightness(1.55) contrast(1.2) saturate(1.1);
        }

        .kc-video-wrap video.ai-sharpness {
            filter: contrast(1.3) saturate(1.15);
        }

        .kc-duration-chips {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 0.5rem;
            margin-top: 0.5rem;
        }

        @media (max-width: 600px) {
            .kc-duration-chips {
                grid-template-columns: repeat(3, 1fr);
                gap: 0.4rem;
            }
        }

        .kc-chip {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--kc-border);
            color: var(--kc-text-muted);
            padding: 0.5rem 0.4rem;
            border-radius: 10px;
            font-size: 0.78rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            min-height: 38px;
            user-select: none;
        }

        .kc-chip:hover {
            color: #fff;
            border-color: rgba(255, 255, 255, 0.25);
            background: rgba(255, 255, 255, 0.1);
        }

        .kc-chip.active {
            background: rgba(245, 158, 11, 0.2);
            border-color: var(--kc-gold);
            color: #fbbf24;
            box-shadow: 0 0 12px rgba(245, 158, 11, 0.25);
        }

        .kc-share-form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            margin-top: 1.25rem;
        }

        @media (max-width: 600px) {
            .kc-share-form-actions {
                flex-direction: column-reverse;
                gap: 0.5rem;
            }
            .kc-share-form-actions .kc-btn {
                width: 100%;
                justify-content: center;
                padding: 0.75rem 1rem;
                font-size: 0.88rem;
            }
        }

        .kc-icon-btn.active {
            background: rgba(245, 158, 11, 0.25);
            border-color: var(--kc-gold);
            color: var(--kc-gold);
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

        .kc-card:hover .kc-video-overlay,
        .kc-video-wrap:fullscreen .kc-video-overlay,
        .kc-video-wrap:-webkit-full-screen .kc-video-overlay,
        .kc-video-wrap.show-overlay .kc-video-overlay {
            opacity: 1 !important;
        }

        /* Botões Laterais PTZ de Rotação Rápida - Acionados apenas no Modo PTZ 360° ou Fullscreen */
        .kc-side-ptz-btn {
            position: absolute;
            z-index: 20;
            background: rgba(15, 23, 42, 0.28);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            border: 1px solid rgba(255, 255, 255, 0.18);
            color: rgba(255, 255, 255, 0.75);
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: none; /* Oculto por padrão para manter o feed da câmera 100% limpo */
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 0.78rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
            transition: all 0.18s ease;
            user-select: none;
            -webkit-user-select: none;
            touch-action: manipulation;
            opacity: 0.38; /* Bem translúcido para enxergar o quarto e bebê através do botão */
        }

        /* Ativação quando o usuário clica no botão PTZ ou quando está em tela cheia */
        .kc-video-wrap.ptz-active .kc-side-ptz-btn,
        .kc-video-wrap:fullscreen .kc-side-ptz-btn,
        .kc-video-wrap:-webkit-full-screen .kc-side-ptz-btn {
            display: flex;
        }

        .kc-side-ptz-btn:hover,
        .kc-side-ptz-btn:active {
            opacity: 0.95;
            background: rgba(245, 158, 11, 0.65);
            color: #fff;
            border-color: var(--kc-gold);
            box-shadow: 0 0 14px rgba(245, 158, 11, 0.5);
            transform: scale(1.15);
        }

        .kc-side-ptz-btn.side-left {
            left: 8px;
            top: 50%;
            transform: translateY(-50%);
        }
        .kc-side-ptz-btn.side-left:hover, .kc-side-ptz-btn.side-left:active {
            transform: translateY(-50%) scale(1.15);
        }

        .kc-side-ptz-btn.side-right {
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
        }
        .kc-side-ptz-btn.side-right:hover, .kc-side-ptz-btn.side-right:active {
            transform: translateY(-50%) scale(1.15);
        }

        .kc-side-ptz-btn.side-up {
            top: 14px;
            left: 50%;
            transform: translateX(-50%);
        }
        .kc-side-ptz-btn.side-up:hover, .kc-side-ptz-btn.side-up:active {
            transform: translateX(-50%) scale(1.15);
        }

        .kc-side-ptz-btn.side-down {
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
        }
        .kc-side-ptz-btn.side-down:hover, .kc-side-ptz-btn.side-down:active {
            transform: translateX(-50%) scale(1.15);
        }

        /* Banner indicador discreto durante Modo PTZ */
        .kc-ptz-gesture-hint {
            position: absolute;
            bottom: 12px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 23, 42, 0.72);
            backdrop-filter: blur(6px);
            border: 1px solid rgba(245, 158, 11, 0.35);
            color: #fbbf24;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 600;
            pointer-events: none;
            z-index: 2147483630;
            display: none;
            align-items: center;
            gap: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            white-space: nowrap;
        }
        .kc-video-wrap.ptz-active .kc-ptz-gesture-hint {
            display: flex;
        }

        /* Em tela cheia, garante que a barra de controles e os botões fiquem no topo */
        .kc-video-wrap:fullscreen,
        .kc-video-wrap:-webkit-full-screen {
            width: 100vw !important;
            height: 100vh !important;
            background: #000;
        }

        .kc-video-wrap:fullscreen .kc-side-ptz-btn,
        .kc-video-wrap:-webkit-full-screen .kc-side-ptz-btn {
            width: 36px;
            height: 36px;
            font-size: 0.92rem;
            opacity: 0.4;
            background: rgba(15, 23, 42, 0.28);
        }

        .kc-video-wrap:fullscreen .kc-ptz-floating-box,
        .kc-video-wrap:-webkit-full-screen .kc-ptz-floating-box {
            z-index: 2147483645 !important;
            bottom: 24px;
            right: 24px;
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
            padding: 0.85rem 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.65rem;
            border-top: 1px solid var(--kc-border);
            font-size: 0.8rem;
            color: var(--kc-text-dim);
            background: rgba(15, 20, 34, 0.4);
            width: 100%;
            box-sizing: border-box;
        }

        .kc-ip-tag {
            font-family: monospace;
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            color: var(--kc-text-muted);
        }

        .kc-card-header-actions {
            display: flex;
            align-items: center;
            gap: 0.6rem;
        }

        .kc-card-edit-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.38rem 0.8rem;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.16);
            color: #f8fafc;
            font-size: 0.78rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            touch-action: manipulation !important;
            user-select: none;
        }

        .kc-card-edit-btn:hover,
        .kc-card-edit-btn:active {
            background: rgba(245, 158, 11, 0.2);
            border-color: var(--kc-gold);
            color: var(--kc-gold);
        }

        /* Indicador de Gravação REC no vídeo */
        .kc-rec-indicator {
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 25;
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.25rem 0.65rem;
            border-radius: 6px;
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid rgba(239, 68, 68, 0.7);
            color: #ef4444;
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.05em;
            pointer-events: none;
            backdrop-filter: blur(4px);
        }

        .kc-rec-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #ef4444;
            animation: kc-pulse-red 1s infinite alternate;
        }

        @keyframes kc-pulse-red {
            from { opacity: 0.4; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1.2); box-shadow: 0 0 10px #ef4444; }
        }

        /* Indicador de Rastreamento / Luz */
        .kc-track-indicator {
            position: absolute;
            bottom: 10px;
            left: 10px;
            z-index: 25;
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.25rem 0.65rem;
            border-radius: 6px;
            background: rgba(16, 185, 129, 0.2);
            border: 1px solid rgba(16, 185, 129, 0.5);
            color: #10b981;
            font-size: 0.72rem;
            font-weight: 600;
            pointer-events: none;
            backdrop-filter: blur(4px);
        }

        .kc-card-footer-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            margin-bottom: 0.4rem;
        }

        .kc-card-status {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            font-size: 0.72rem;
            font-weight: 600;
            color: #10b981;
            background: rgba(16, 185, 129, 0.12);
            padding: 0.2rem 0.55rem;
            border-radius: 6px;
            border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .kc-btn-footer-config {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.25rem 0.65rem;
            font-size: 0.74rem;
            font-weight: 600;
            color: #cbd5e1;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 7px;
            cursor: pointer;
            transition: all 0.18s ease;
        }

        .kc-btn-footer-config:hover {
            background: rgba(245, 158, 11, 0.18);
            border-color: var(--kc-gold);
            color: var(--kc-gold);
        }

        /* Grade de Ações Rápidas do Card (Moderna, Tátil, Fluida) */
        .kc-quick-actions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
            gap: 0.45rem;
            width: 100%;
        }

        .kc-pill-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.45rem;
            min-height: 42px;
            padding: 0.5rem 0.75rem;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #e2e8f0;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            touch-action: manipulation !important;
            user-select: none;
            -webkit-user-select: none;
            -webkit-tap-highlight-color: transparent;
            pointer-events: auto !important;
            white-space: nowrap;
        }

        .kc-pill-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.22);
            color: #fff;
            transform: translateY(-1px);
        }

        .kc-pill-btn:active {
            transform: scale(0.97);
        }

        .kc-pill-btn.active,
        .kc-pill-btn.recording {
            background: rgba(245, 158, 11, 0.25) !important;
            border-color: var(--kc-gold) !important;
            color: var(--kc-gold) !important;
            box-shadow: 0 0 12px var(--kc-gold-glow);
        }

        .kc-btn-rec.recording {
            background: rgba(239, 68, 68, 0.25) !important;
            border-color: #ef4444 !important;
            color: #ef4444 !important;
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
        }

        .kc-btn-light.active {
            background: rgba(251, 191, 36, 0.25) !important;
            border-color: #fbbf24 !important;
            color: #fbbf24 !important;
            box-shadow: 0 0 14px rgba(251, 191, 36, 0.45);
        }

        .kc-btn-track.active {
            background: rgba(16, 185, 129, 0.22) !important;
            border-color: #10b981 !important;
            color: #10b981 !important;
        }

        .kc-btn-audio.active {
            background: rgba(6, 182, 212, 0.22) !important;
            border-color: #06b6d4 !important;
            color: #06b6d4 !important;
        }

        .kc-btn-share-highlight {
            color: var(--kc-gold) !important;
            background: rgba(245, 158, 11, 0.15) !important;
            border-color: rgba(245, 158, 11, 0.35) !important;
        }

        .kc-btn-share-highlight:hover,
        .kc-btn-share-highlight:active {
            background: var(--kc-gold) !important;
            color: #000 !important;
            box-shadow: 0 0 14px var(--kc-gold-glow);
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

        /* PTZ Floating 360° Joystick Widget */
        .kc-ptz-floating-box {
            position: absolute;
            bottom: 12px;
            right: 12px;
            background: rgba(10, 15, 29, 0.92);
            backdrop-filter: blur(14px);
            border: 1px solid rgba(245, 158, 11, 0.4);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7), 0 0 16px rgba(245, 158, 11, 0.2);
            border-radius: 16px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            z-index: 25;
            user-select: none;
            touch-action: none;
            width: 140px;
            animation: kc-fade-in 0.2s ease-out;
        }

        .kc-ptz-floating-header {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            font-size: 0.74rem;
            font-weight: 700;
            color: var(--kc-gold);
            letter-spacing: 0.3px;
        }

        .kc-ptz-floating-close {
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 1.15rem;
            line-height: 1;
            cursor: pointer;
            padding: 0 4px;
            transition: color 0.15s;
        }

        .kc-ptz-floating-close:hover {
            color: #fff;
        }

        .kc-dpad-circle {
            position: relative;
            width: 110px;
            height: 110px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.98) 100%);
            border: 1.5px solid rgba(255, 255, 255, 0.15);
            box-shadow: inset 0 2px 10px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4);
        }

        .kc-dpad-arrow {
            position: absolute;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #f1f5f9;
            border-radius: 8px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 0.85rem;
            transition: all 0.12s ease;
        }

        .kc-dpad-arrow:hover {
            background: rgba(245, 158, 11, 0.35);
            border-color: var(--kc-gold);
            color: var(--kc-gold);
            transform: scale(1.06);
        }

        .kc-dpad-arrow:active {
            background: var(--kc-gold);
            border-color: var(--kc-gold);
            color: #000;
            transform: scale(0.95);
        }

        .dpad-up { top: 4px; left: 39px; }
        .dpad-down { bottom: 4px; left: 39px; }
        .dpad-left { top: 39px; left: 4px; }
        .dpad-right { top: 39px; right: 4px; }

        .dpad-center {
            top: 39px;
            left: 39px;
            border-radius: 50%;
            background: var(--kc-gold);
            color: #000;
            border: none;
            font-size: 0.8rem;
            box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
        }

        .dpad-center:hover {
            background: #fbbf24;
            color: #000;
            transform: scale(1.08) rotate(180deg);
        }

        .dpad-center:active {
            transform: scale(0.92);
        }

        .kc-ptz-footer-actions {
            display: flex;
            gap: 6px;
            margin-top: 8px;
            width: 100%;
        }

        .kc-ptz-mini-btn {
            flex: 1;
            padding: 4px 6px;
            font-size: 0.72rem;
            font-weight: 600;
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #cbd5e1;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            transition: all 0.12s;
        }

        .kc-ptz-mini-btn:hover {
            background: rgba(245, 158, 11, 0.25);
            border-color: var(--kc-gold);
            color: var(--kc-gold);
        }

        .kc-ptz-mini-btn:active {
            background: var(--kc-gold);
            color: #000;
            transform: scale(0.95);
        }

        /* Modal Styles */
        .kc-modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 99999 !important;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            touch-action: manipulation;
        }

        .kc-modal-backdrop.active {
            display: flex !important;
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
            background: rgba(0, 0, 0, 0.25);
            overflow-x: auto;
            scrollbar-width: thin;
        }

        .kc-tab-btn {
            flex: 1;
            min-width: max-content;
            background: none;
            border: none;
            padding: 0.85rem 1rem;
            color: #94a3b8;
            font-size: 0.84rem;
            font-weight: 600;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.45rem;
            white-space: nowrap;
        }

        .kc-tab-btn:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.04);
        }

        .kc-tab-btn.active {
            color: var(--kc-gold);
            font-weight: 700;
            border-bottom-color: var(--kc-gold);
            background: rgba(245, 158, 11, 0.08);
        }

        .kc-modal-body {
            padding: 1.5rem;
        }

        .kc-tab-pane {
            display: none !important;
        }

        .kc-tab-pane.active {
            display: block !important;
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

        /* Correção para <select> e <option> não ficarem com texto branco em fundo branco */
        select.kc-input {
            background-color: #0f1422;
            color: #f8fafc;
            cursor: pointer;
        }

        select.kc-input option {
            background-color: #0f1422 !important;
            color: #f8fafc !important;
            padding: 10px 14px;
        }

        select.kc-input option:hover,
        select.kc-input option:focus,
        select.kc-input option:checked {
            background-color: #1e293b !important;
            color: var(--kc-gold) !important;
        }

        /* Autofill Chrome: impede que campos fiquem brancos */
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus,
        textarea:-webkit-autofill,
        select:-webkit-autofill {
            -webkit-text-fill-color: #f8fafc !important;
            -webkit-box-shadow: 0 0 0px 1000px #0f1422 inset !important;
            box-shadow: 0 0 0px 1000px #0f1422 inset !important;
            border-color: rgba(255, 255, 255, 0.15) !important;
            transition: background-color 5000s ease-in-out 0s;
        }

        /* SweetAlert2 Tema Dark King Câmera */
        .swal2-container {
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            z-index: 100000 !important;
        }
        .swal2-popup {
            background: #0f1422 !important;
            color: #f8fafc !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            border-radius: 16px !important;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8) !important;
        }
        .swal2-title {
            color: #f8fafc !important;
            font-family: 'Outfit', sans-serif !important;
            font-weight: 700 !important;
            font-size: 1.25rem !important;
        }
        .swal2-html-container, .swal2-content {
            color: #cbd5e1 !important;
            font-size: 0.92rem !important;
            line-height: 1.5 !important;
        }
        .swal2-icon.swal2-error {
            border-color: #ef4444 !important;
            color: #ef4444 !important;
        }
        .swal2-icon.swal2-error [class^='swal2-x-mark-line'] {
            background-color: #ef4444 !important;
        }
        .swal2-icon.swal2-success {
            border-color: #10b981 !important;
            color: #10b981 !important;
        }
        .swal2-icon.swal2-success [class^='swal2-success-line'] {
            background-color: #10b981 !important;
        }
        .swal2-icon.swal2-success .swal2-success-ring {
            border-color: rgba(16, 185, 129, 0.3) !important;
        }
        .swal2-icon.swal2-info {
            border-color: #06b6d4 !important;
            color: #06b6d4 !important;
        }
        .swal2-icon.swal2-warning {
            border-color: #f59e0b !important;
            color: #f59e0b !important;
        }
        .swal2-styled.swal2-confirm {
            background: linear-gradient(135deg, #f59e0b, #d97706) !important;
            color: #000 !important;
            font-weight: 700 !important;
            border-radius: 9px !important;
            padding: 0.65rem 1.4rem !important;
            box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3) !important;
        }
        .swal2-styled.swal2-cancel {
            background: rgba(255, 255, 255, 0.08) !important;
            color: #f8fafc !important;
            border: 1px solid rgba(255, 255, 255, 0.12) !important;
            font-weight: 600 !important;
            border-radius: 9px !important;
            padding: 0.65rem 1.2rem !important;
        }

        /* Radar Scanner & LAN Discovery */
        .kc-radar-box {
            position: relative;
            width: 150px;
            height: 150px;
            margin: 1.25rem auto;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(15, 20, 34, 0.9) 70%);
            border: 2px solid rgba(16, 185, 129, 0.3);
            box-shadow: 0 0 30px rgba(16, 185, 129, 0.2);
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .kc-radar-sweep {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 50%;
            background: conic-gradient(from 0deg, rgba(16, 185, 129, 0.45) 0deg, rgba(16, 185, 129, 0.05) 60deg, transparent 90deg);
            animation: kc-radar-spin 2s linear infinite;
        }

        .kc-radar-center {
            position: relative;
            z-index: 3;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(16, 185, 129, 0.2);
            border: 1px solid var(--kc-emerald);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--kc-emerald);
            font-size: 1.2rem;
        }

        @keyframes kc-radar-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Bluetooth Pulse Animation */
        .kc-bt-box {
            position: relative;
            width: 140px;
            height: 140px;
            margin: 1.25rem auto;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, rgba(15, 20, 34, 0.9) 70%);
            border: 2px solid rgba(6, 182, 212, 0.4);
            box-shadow: 0 0 25px rgba(6, 182, 212, 0.25);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .kc-bt-ripple {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            border: 2px solid rgba(6, 182, 212, 0.6);
            animation: kc-bt-pulse 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }

        @keyframes kc-bt-pulse {
            0% { transform: scale(0.8); opacity: 1; }
            100% { transform: scale(1.6); opacity: 0; }
        }

        /* Discovered Device Card */
        .kc-discovered-card {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 12px;
            padding: 1rem 1.15rem;
            margin-bottom: 0.85rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            transition: all 0.2s ease;
        }

        .kc-discovered-card:hover {
            border-color: var(--kc-emerald);
            background: rgba(16, 185, 129, 0.08);
            transform: translateY(-2px);
        }

        .kc-discovered-info {
            display: flex;
            align-items: center;
            gap: 0.9rem;
        }

        .kc-discovered-icon {
            width: 44px;
            height: 44px;
            border-radius: 10px;
            background: rgba(16, 185, 129, 0.15);
            color: var(--kc-emerald);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            flex-shrink: 0;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .kc-discovered-details h5 {
            font-size: 0.92rem;
            font-weight: 700;
            color: #fff;
            margin-bottom: 0.2rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .kc-discovered-details p {
            font-size: 0.8rem;
            color: #94a3b8;
        }

        /* Yoosee-Style Method Grid Cards */
        .kc-yoosee-methods {
            display: grid;
            grid-template-columns: 1fr;
            gap: 0.85rem;
            margin-bottom: 1.25rem;
        }

        .kc-yoosee-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--kc-border);
            border-radius: 14px;
            padding: 1.1rem 1.25rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            cursor: pointer;
            transition: all 0.25s ease;
            text-align: left;
            width: 100%;
        }

        .kc-yoosee-card:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: var(--kc-gold);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
        }

        .kc-yoosee-card.active {
            border-color: var(--kc-gold);
            background: rgba(245, 158, 11, 0.08);
            box-shadow: 0 0 15px var(--kc-gold-glow);
        }

        .kc-yoosee-card-left {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .kc-yoosee-card-icon {
            width: 50px;
            height: 50px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.4rem;
            flex-shrink: 0;
            border: 1px solid var(--kc-border);
            transition: all 0.2s;
        }

        .kc-yoosee-card:hover .kc-yoosee-card-icon {
            transform: scale(1.08);
        }

        .kc-yoosee-card-icon.wifi {
            color: var(--kc-gold);
            border-color: rgba(245, 158, 11, 0.3);
            background: rgba(245, 158, 11, 0.1);
        }

        .kc-yoosee-card-icon.cable {
            color: var(--kc-cyan);
            border-color: rgba(6, 182, 212, 0.3);
            background: rgba(6, 182, 212, 0.1);
        }

        .kc-yoosee-card-icon.bluetooth {
            color: #3b82f6;
            border-color: rgba(59, 130, 246, 0.3);
            background: rgba(59, 130, 246, 0.1);
        }

        .kc-yoosee-card-icon.lan {
            color: var(--kc-emerald);
            border-color: rgba(16, 185, 129, 0.3);
            background: rgba(16, 185, 129, 0.1);
        }

        .kc-yoosee-card-icon.hotspot {
            color: #ec4899;
            border-color: rgba(236, 72, 153, 0.3);
            background: rgba(236, 72, 153, 0.1);
        }

        .kc-yoosee-card-info h5 {
            font-size: 0.95rem;
            font-weight: 700;
            color: #fff;
            margin-bottom: 0.25rem;
        }

        .kc-yoosee-card-info p {
            font-size: 0.8rem;
            color: #94a3b8;
            line-height: 1.4;
        }

        .kc-yoosee-card-arrow {
            color: var(--kc-text-dim);
            font-size: 1.1rem;
            transition: all 0.2s;
        }

        .kc-yoosee-card:hover .kc-yoosee-card-arrow {
            color: var(--kc-gold);
            transform: translateX(3px);
        }

        .kc-form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }

        .kc-form-help {
            font-size: 0.78rem;
            color: #94a3b8;
            margin-top: 0.35rem;
            line-height: 1.4;
        }

        .kc-form-help code {
            background: rgba(245, 158, 11, 0.15);
            color: #f59e0b;
            padding: 0.15rem 0.35rem;
            border-radius: 4px;
            font-size: 0.75rem;
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

        /* Wizard Stepper & Method Cards */
        .kc-stepper {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.5rem;
            position: relative;
        }

        .kc-stepper::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 30px;
            right: 30px;
            height: 2px;
            background: rgba(255, 255, 255, 0.1);
            z-index: 1;
        }

        .kc-step-item {
            position: relative;
            z-index: 2;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.35rem;
            background: #0f1422;
            padding: 0 0.5rem;
        }

        .kc-step-bubble {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.08);
            border: 2px solid var(--kc-border);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.85rem;
            font-weight: 700;
            color: var(--kc-text-dim);
            transition: all 0.2s;
        }

        .kc-step-item.active .kc-step-bubble {
            background: var(--kc-gold);
            border-color: var(--kc-gold);
            color: #000;
            box-shadow: 0 0 14px var(--kc-gold-glow);
        }

        .kc-step-item.completed .kc-step-bubble {
            background: var(--kc-emerald);
            border-color: var(--kc-emerald);
            color: #fff;
        }

        .kc-step-title {
            font-size: 0.72rem;
            font-weight: 600;
            color: var(--kc-text-dim);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .kc-step-item.active .kc-step-title {
            color: var(--kc-gold);
        }

        /* Sub-tabs for Power */
        .kc-subtabs {
            display: flex;
            border-bottom: 1px solid var(--kc-border);
            margin-bottom: 1.25rem;
            gap: 1.5rem;
        }

        .kc-subtab-btn {
            background: none;
            border: none;
            color: var(--kc-text-muted);
            font-size: 0.85rem;
            font-weight: 600;
            padding: 0.5rem 0;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }

        .kc-subtab-btn.active {
            color: #fff;
            border-bottom-color: var(--kc-gold);
        }

        /* Method Illustration Cards */
        .kc-method-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--kc-border);
            border-radius: 14px;
            padding: 1rem 1.15rem;
            margin-bottom: 0.85rem;
            display: flex;
            align-items: center;
            gap: 1.15rem;
            transition: border-color 0.2s, background 0.2s;
        }

        .kc-method-card:hover {
            border-color: rgba(245, 158, 11, 0.35);
            background: rgba(255, 255, 255, 0.05);
        }

        .kc-method-icon-box {
            width: 54px;
            height: 54px;
            border-radius: 12px;
            background: rgba(245, 158, 11, 0.1);
            color: var(--kc-gold);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            flex-shrink: 0;
            border: 1px solid rgba(245, 158, 11, 0.25);
        }

        .kc-method-details h5 {
            font-size: 0.9rem;
            font-weight: 700;
            color: #fff;
            margin-bottom: 0.25rem;
        }

        .kc-method-details p {
            font-size: 0.8rem;
            color: var(--kc-text-muted);
            line-height: 1.4;
        }

        .kc-sample-sound-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            background: rgba(6, 182, 212, 0.15);
            border: 1px solid rgba(6, 182, 212, 0.35);
            color: var(--kc-cyan);
            border-radius: 9px;
            padding: 0.55rem 1rem;
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            margin: 0.75rem 0;
        }

        .kc-sample-sound-btn:hover {
            background: rgba(6, 182, 212, 0.3);
            color: #fff;
            transform: translateY(-1px);
        }

        .kc-checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--kc-border);
            border-radius: 10px;
            padding: 0.85rem 1rem;
            margin-top: 1rem;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 500;
            color: var(--kc-text);
            user-select: none;
            transition: border-color 0.2s;
        }

        .kc-checkbox-label:hover {
            border-color: rgba(245, 158, 11, 0.4);
        }

        .kc-checkbox-label input[type="checkbox"] {
            width: 18px;
            height: 18px;
            accent-color: var(--kc-gold);
            cursor: pointer;
        }

        /* ─── Hub Cards & Mobile Action Buttons ─── */
        .kc-add-cards-grid {
            display: flex;
            flex-direction: column;
            gap: 0.85rem;
            margin-top: 0.5rem;
        }

        .kc-add-card {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem 1.15rem;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--kc-border);
            border-radius: 14px;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            user-select: none;
            -webkit-user-select: none;
            touch-action: manipulation;
        }

        .kc-add-card:hover {
            background: rgba(255, 255, 255, 0.07);
            border-color: rgba(245, 158, 11, 0.4);
            transform: translateY(-1px);
        }

        .kc-add-card:active {
            transform: scale(0.99);
            background: rgba(255, 255, 255, 0.09);
        }

        .kc-add-card.highlight {
            border-color: rgba(245, 158, 11, 0.35);
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(255, 255, 255, 0.02));
        }

        .kc-add-card.highlight:hover {
            border-color: var(--kc-gold);
            box-shadow: 0 4px 20px rgba(245, 158, 11, 0.15);
        }

        .kc-add-card-badge {
            position: absolute;
            top: 8px;
            right: 12px;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #000;
            font-size: 0.65rem;
            font-weight: 800;
            padding: 2px 7px;
            border-radius: 6px;
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }

        .kc-add-card-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.35rem;
            flex-shrink: 0;
            border: 1px solid transparent;
        }

        .kc-add-card-body {
            flex: 1;
            min-width: 0;
        }

        .kc-add-card-body h4 {
            font-size: 0.95rem;
            font-weight: 700;
            color: #fff;
            margin-bottom: 0.25rem;
        }

        .kc-add-card-body p {
            font-size: 0.8rem;
            color: var(--kc-text-muted);
            line-height: 1.4;
            margin-bottom: 0.35rem;
        }

        .kc-add-card-tag {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            font-size: 0.72rem;
            font-weight: 600;
            color: var(--kc-gold);
        }

        .kc-add-card-arrow {
            color: var(--kc-text-dim);
            font-size: 0.95rem;
            transition: transform 0.2s ease, color 0.2s ease;
            flex-shrink: 0;
        }

        .kc-add-card:hover .kc-add-card-arrow {
            color: #fff;
            transform: translateX(3px);
        }

        .kc-back-hub-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 0.9rem;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--kc-border);
            color: var(--kc-text-muted);
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            margin-bottom: 1rem;
            transition: all 0.2s ease;
            touch-action: manipulation;
        }

        .kc-back-hub-btn:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.25);
        }

        .kc-card-delete-btn {
            background: rgba(239, 68, 68, 0.15) !important;
            border: 1px solid rgba(239, 68, 68, 0.35) !important;
            color: #f87171 !important;
            border-radius: 8px;
            padding: 0.38rem 0.75rem !important;
            font-size: 0.78rem !important;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            transition: all 0.2s ease;
            touch-action: manipulation !important;
            min-height: 34px;
        }

        .kc-card-delete-btn:hover {
            background: rgba(239, 68, 68, 0.3) !important;
            color: #fff !important;
            border-color: #ef4444 !important;
            transform: translateY(-1px);
        }

        .kc-card-delete-btn:active {
            transform: scale(0.96);
        }

        .kc-btn-danger {
            background: rgba(239, 68, 68, 0.2) !important;
            border: 1px solid #ef4444 !important;
            color: #fff !important;
            border-radius: 9px;
            padding: 0.6rem 1.1rem;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s;
            touch-action: manipulation;
        }

        .kc-btn-danger:hover {
            background: #ef4444 !important;
            box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
        }

        /* QR Scanner Viewport */
        #camera-qr-reader {
            width: 100%;
            max-width: 440px;
            margin: 0 auto;
            border-radius: 14px;
            overflow: hidden;
            border: 2px dashed rgba(245, 158, 11, 0.4);
            background: #000;
            min-height: 240px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        #camera-qr-reader video {
            border-radius: 12px;
            width: 100% !important;
            height: auto !important;
        }

        /* Type Switch Buttons (ID vs IP) */
        .kc-type-switch {
            display: flex;
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid var(--kc-border);
            border-radius: 10px;
            padding: 4px;
            margin-bottom: 1.25rem;
            gap: 4px;
        }

        .kc-type-btn {
            flex: 1;
            padding: 0.6rem 0.85rem;
            border-radius: 8px;
            border: none;
            background: none;
            color: var(--kc-text-muted);
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
        }

        .kc-type-btn.active {
            background: var(--kc-gold);
            color: #000;
            box-shadow: 0 2px 8px var(--kc-gold-glow);
        }

        /* PTZ 360 Floating D-Pad */
        .kc-ptz-floating-box {
            position: absolute;
            bottom: 0.75rem;
            right: 0.75rem;
            background: rgba(11, 15, 25, 0.94);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            border: 1px solid var(--kc-border-active);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(245, 158, 11, 0.2);
            border-radius: 18px;
            padding: 0.75rem;
            z-index: 25;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.6rem;
            user-select: none;
            -webkit-user-select: none;
            touch-action: manipulation;
        }

        .kc-ptz-floating-header {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.72rem;
            font-weight: 700;
            color: var(--kc-gold);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding-bottom: 0.35rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .kc-ptz-floating-close {
            background: transparent;
            border: none;
            color: var(--kc-text-muted);
            font-size: 1.1rem;
            cursor: pointer;
            line-height: 1;
            padding: 0 0.2rem;
        }

        .kc-ptz-floating-close:hover {
            color: #fff;
        }

        .kc-dpad-circle {
            width: 130px;
            height: 130px;
            background: radial-gradient(circle at center, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
            border: 2px solid rgba(245, 158, 11, 0.35);
            border-radius: 50%;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.9), 0 4px 15px rgba(0, 0, 0, 0.5);
        }

        .kc-dpad-arrow {
            position: absolute;
            width: 36px;
            height: 36px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            color: #f8fafc;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.88rem;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .kc-dpad-arrow:hover {
            background: rgba(245, 158, 11, 0.3);
            border-color: var(--kc-gold);
            color: var(--kc-gold);
            transform: scale(1.08);
        }

        .kc-dpad-arrow:active {
            background: var(--kc-gold);
            color: #000;
            transform: scale(0.95);
        }

        .dpad-up { top: 6px; left: 50%; transform: translateX(-50%); border-radius: 8px 8px 4px 4px; }
        .dpad-down { bottom: 6px; left: 50%; transform: translateX(-50%); border-radius: 4px 4px 8px 8px; }
        .dpad-left { left: 6px; top: 50%; transform: translateY(-50%); border-radius: 8px 4px 4px 8px; }
        .dpad-right { right: 6px; top: 50%; transform: translateY(-50%); border-radius: 4px 8px 8px 4px; }
        .dpad-center {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            background: rgba(245, 158, 11, 0.18);
            border: 1px solid rgba(245, 158, 11, 0.5);
            color: var(--kc-gold);
            font-size: 0.78rem;
        }
        .dpad-center:hover {
            background: var(--kc-gold);
            color: #000;
        }

        .kc-ptz-footer-actions {
            display: flex;
            gap: 0.4rem;
            width: 100%;
        }

        .kc-ptz-mini-btn {
            flex: 1;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid var(--kc-border);
            color: var(--kc-text);
            padding: 0.35rem;
            border-radius: 6px;
            font-size: 0.72rem;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.3rem;
            transition: all 0.15s ease;
        }

        .kc-ptz-mini-btn:hover {
            background: rgba(245, 158, 11, 0.2);
            border-color: var(--kc-gold);
            color: #fbbf24;
        }

        .kc-ptz-mini-btn:active {
            background: var(--kc-gold);
            color: #000;
        }

        /* ══════════════════════════════════════════════════════════════════════ */
        /* RESPONSIVIDADE ULTRA MODERNA PARA MOBILE (SMARTPHONES E TABLETS)       */
        /* ══════════════════════════════════════════════════════════════════════ */
        @media (max-width: 768px) {
            .kc-topbar-inner {
                padding: 0.6rem 0.85rem;
                gap: 0.5rem;
            }
            .kc-brand-title {
                font-size: 1.05rem;
            }
            .kc-brand-badge {
                padding: 1px 5px;
                font-size: 0.6rem;
            }
            .kc-back-btn span {
                display: none;
            }
            .kc-back-btn {
                padding: 0.45rem 0.65rem;
            }
            .kc-topbar-actions {
                gap: 0.4rem;
            }
            .kc-btn {
                padding: 0.45rem 0.75rem;
                font-size: 0.78rem;
            }
            .kc-btn span {
                font-size: 0.76rem;
            }
            .kc-btn-telegram span {
                display: none;
            }
            .kc-hero {
                padding: 0.65rem 0 0.35rem 0;
            }
            .kc-hero-text h1 {
                font-size: 1.1rem;
                line-height: 1.25;
            }
            .kc-hero-text p {
                display: none; /* No mobile, oculta texto longo para o vídeo aparecer logo acima da dobra */
            }
            .kc-stats-grid {
                display: flex;
                gap: 0.4rem;
                margin-top: 0.45rem;
            }
            .kc-stat-item {
                flex: 1;
                padding: 0.35rem 0.5rem;
                border-radius: 8px;
                text-align: center;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .kc-stat-label {
                font-size: 0.6rem;
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }
            .kc-stat-val {
                font-size: 0.85rem;
                font-weight: 700;
            }
            .kc-toolbar {
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
                gap: 0.5rem;
                padding: 0.35rem 0;
                margin-bottom: 0.35rem;
            }
            .kc-grid-modes {
                justify-content: flex-end;
                overflow-x: auto;
                padding-bottom: 2px;
            }
            .kc-grid-btn[data-cols="3"] {
                display: none;
            }
            .kc-grid {
                grid-template-columns: 1fr !important;
                gap: 1rem;
            }
            .kc-overlay-top {
                padding: 0.45rem 0.55rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 0.4rem;
            }
            .kc-overlay-controls {
                gap: 0.3rem;
                display: flex;
                align-items: center;
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                padding-bottom: 2px;
                max-width: 65%;
            }
            .kc-overlay-controls::-webkit-scrollbar {
                display: none;
            }
            .kc-overlay-controls .kc-icon-btn {
                width: 30px;
                height: 30px;
                font-size: 0.8rem;
                flex-shrink: 0;
                border-radius: 8px;
            }

            /* Botões Laterais PTZ discretos e semi-transparentes no mobile */
            .kc-side-ptz-btn {
                width: 28px !important;
                height: 28px !important;
                font-size: 0.72rem !important;
                opacity: 0.35 !important;
                background: rgba(15, 23, 42, 0.22) !important;
                border: 1px solid rgba(255, 255, 255, 0.16) !important;
            }
            .kc-side-ptz-btn:active {
                opacity: 0.95 !important;
                background: rgba(245, 158, 11, 0.65) !important;
                color: #fff !important;
            }
            .kc-side-ptz-btn.side-left { left: 6px; }
            .kc-side-ptz-btn.side-right { right: 6px; }
            .kc-side-ptz-btn.side-up { top: 12px; }
            .kc-side-ptz-btn.side-down { bottom: 8px; }

            /* Rodapé do Card adaptado para Mobile com Pílulas Táteis Grandes e Responsivas */
            .kc-card-footer {
                padding: 0.75rem 0.85rem;
                display: flex;
                flex-direction: column;
                gap: 0.55rem;
            }
            .kc-card-footer-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
            }
            .kc-card-status {
                display: inline-flex;
                align-items: center;
                gap: 0.35rem;
                font-size: 0.72rem;
                font-weight: 600;
                color: #10b981;
                background: rgba(16, 185, 129, 0.12);
                padding: 0.2rem 0.55rem;
                border-radius: 6px;
                border: 1px solid rgba(16, 185, 129, 0.25);
            }
            .kc-quick-actions-grid {
                grid-template-columns: repeat(2, 1fr) !important;
                gap: 0.45rem !important;
                width: 100%;
            }
            .kc-pill-btn {
                min-height: 44px !important;
                font-size: 0.82rem !important;
                padding: 0.55rem 0.6rem !important;
                border-radius: 10px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 0.45rem;
                touch-action: manipulation !important;
                -webkit-tap-highlight-color: transparent !important;
            }
            .kc-card-header {
                padding: 0.75rem 0.85rem;
                flex-wrap: wrap;
                gap: 0.5rem;
            }
            .kc-card-title-group {
                min-width: 0;
                flex: 1 1 auto;
            }
            .kc-card-title {
                font-size: 0.95rem;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 150px;
            }
            .kc-card-header-actions {
                display: flex;
                align-items: center;
                gap: 0.35rem;
                flex-shrink: 0;
            }
            .kc-card-header-actions .kc-card-edit-btn,
            .kc-card-header-actions .kc-card-delete-btn {
                padding: 0.4rem 0.65rem !important;
                font-size: 0.75rem !important;
                min-height: 36px;
                cursor: pointer;
                touch-action: manipulation !important;
            }
            .kc-video-overlay {
                opacity: 1 !important;
                pointer-events: none;
            }
            .kc-overlay-controls {
                pointer-events: auto !important;
            }


            /* Joystick adaptado para telas mobile */
            .kc-ptz-floating-box {
                width: 116px;
                padding: 6px;
                bottom: 8px;
                right: 8px;
                border-radius: 14px;
            }
            .kc-dpad-circle {
                width: 86px;
                height: 86px;
            }
            .kc-dpad-arrow {
                width: 26px;
                height: 26px;
                font-size: 0.72rem;
            }
            .dpad-up { top: 2px; left: 30px; }
            .dpad-down { bottom: 2px; left: 30px; }
            .dpad-left { top: 30px; left: 2px; }
            .dpad-right { top: 30px; right: 2px; }
            .dpad-center { top: 30px; left: 30px; font-size: 0.68rem; }
            .kc-ptz-mini-btn {
                font-size: 0.65rem;
                padding: 3px 4px;
            }

            /* Modal Mobile tipo Bottom-Sheet Ultra Elegante */
            .kc-modal-backdrop {
                padding: 0.5rem !important;
                align-items: flex-end;
            }
            .kc-modal {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                max-height: 92vh;
                border-radius: 20px 20px 0 0 !important;
            }
            .kc-modal-header {
                padding: 0.85rem 1rem;
            }
            .kc-modal-title {
                font-size: 1rem;
            }
            .kc-modal-tabs {
                display: flex;
                overflow-x: auto;
                white-space: nowrap;
                -webkit-overflow-scrolling: touch;
                padding: 0.4rem 0.65rem;
                gap: 0.4rem;
                border-bottom: 1px solid var(--kc-border);
            }
            .kc-tab-btn {
                padding: 0.45rem 0.75rem;
                font-size: 0.74rem;
                flex-shrink: 0;
            }
            .kc-modal-body {
                padding: 0.85rem;
                max-height: calc(94vh - 120px);
                overflow-y: auto;
            }
            .kc-form-row {
                flex-direction: column;
                gap: 0.75rem;
            }
            .kc-type-switch {
                flex-wrap: wrap;
                gap: 4px;
            }
            .kc-type-btn {
                font-size: 0.74rem;
                padding: 0.45rem 0.6rem;
            }
            .kc-method-card {
                padding: 0.75rem;
                gap: 0.75rem;
                border-radius: 10px;
            }
            .kc-method-icon-box {
                width: 40px;
                height: 40px;
                font-size: 1.15rem;
                border-radius: 8px;
            }
            .kc-method-details h5 {
                font-size: 0.82rem;
            }
            .kc-method-details p {
                font-size: 0.74rem;
            }
            .kc-stepper {
                padding: 0.5rem 0 1rem;
            }
            .kc-step-bubble {
                width: 30px;
                height: 30px;
                font-size: 0.75rem;
            }
            .kc-step-title {
                font-size: 0.65rem;
            }
        }

        @media (max-width: 480px) {
            .kc-topbar-actions {
                gap: 0.35rem;
            }
            .kc-topbar-actions #btn-open-clips-modal span,
            .kc-topbar-actions #btn-telegram-info span,
            .kc-topbar-actions #btn-add-camera span {
                display: none !important;
            }
            .kc-topbar-actions .kc-btn {
                padding: 0.45rem 0.65rem !important;
                min-height: 38px;
                touch-action: manipulation !important;
            }
            .kc-hero-text h1 {
                font-size: 1.1rem;
            }
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
                <button type="button" class="kc-btn kc-btn-secondary" id="btn-open-clips-modal" onclick="openClipsModal()" title="Ver Vídeos e Clipes Gravados" style="border-color: rgba(245, 158, 11, 0.4);">
                    <i class="fas fa-film" style="color: var(--kc-gold);"></i>
                    <span>Clipes (<span id="clips-counter">0</span>)</span>
                </button>
                <button type="button" class="kc-btn kc-btn-telegram" id="btn-telegram-info" onclick="openTelegramFlow()" title="Configurar Agente Telegram">
                    <i class="fab fa-telegram-plane"></i>
                    <span>Agente Telegram</span>
                </button>
                <button type="button" class="kc-btn kc-btn-primary" id="btn-add-camera" onclick="openModal('add')">
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
                <button type="button" class="kc-grid-btn" data-cols="1" title="1 Coluna (Foco Individual)">
                    <i class="fas fa-square"></i>
                </button>
                <button type="button" class="kc-grid-btn" data-cols="2" title="2 Câmeras Lado a Lado">
                    <i class="fas fa-th"></i>
                </button>
                <button type="button" class="kc-grid-btn" data-cols="3" title="Mosaico 3 Colunas">
                    <i class="fas fa-grip"></i>
                </button>
                <button type="button" class="kc-grid-btn" id="btn-patrol-mode" onclick="togglePatrolMode()" title="Modo Patrulha (Alterna as câmeras a cada 10s)">
                    <i class="fas fa-rotate"></i> <span style="font-size: 0.72rem; margin-left: 0.25rem;">Patrulha</span>
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
        <div class="kc-modal" style="max-width: 680px;">
            <div class="kc-modal-header">
                <div class="kc-modal-title" id="modal-title">Conectar Nova Câmera</div>
                <button type="button" class="kc-modal-close" onclick="closeModal()">&times;</button>
            </div>
            <!-- Tabs (Modo Configuração / Edição de Câmera Existente) -->
            <div class="kc-modal-tabs" id="modal-tabs-header" style="display: none;">
                <button type="button" class="kc-tab-btn active" data-tab="tab-rtsp" id="tab-btn-rtsp">
                    <i class="fas fa-sliders-h"></i> <span id="tab-title-rtsp">Câmera &amp; Conexão</span>
                </button>
                <button type="button" class="kc-tab-btn" data-tab="tab-ai-baby" id="tab-btn-ai-baby">
                    <i class="fas fa-baby"></i> IA Babá &amp; Berço
                </button>
                <button type="button" class="kc-tab-btn" data-tab="tab-telegram" id="tab-btn-telegram">
                    <i class="fab fa-telegram-plane"></i> Agente Telegram
                </button>
                <button type="button" class="kc-tab-btn tab-edit-only" data-tab="tab-light-ptz" id="tab-btn-light-ptz">
                    <i class="fas fa-lightbulb"></i> Luz &amp; Rastreio 360°
                </button>
                <button type="button" class="kc-tab-btn tab-edit-only" data-tab="tab-shares" id="tab-btn-shares">
                    <i class="fas fa-link"></i> Links &amp; Convidados
                </button>
            </div>
            <div class="kc-modal-body">

                <!-- ═════════════════════════════════════════════════════════════ -->
                <!-- HUB DE SELEÇÃO: ADICIONAR NOVA CÂMERA (ESTILO YOOSEE / TUYA)   -->
                <!-- ═════════════════════════════════════════════════════════════ -->
                <div id="kc-add-hub" style="display: none; padding: 0.25rem 0 0.75rem;">
                    <div style="text-align: center; margin-bottom: 1.25rem;">
                        <h3 style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-bottom: 0.35rem;">
                            Como deseja conectar sua câmera?
                        </h3>
                        <p style="font-size: 0.85rem; color: #94a3b8; max-width: 520px; margin: 0 auto; line-height: 1.45;">
                            Escolha o método mais simples de acordo com o modelo da sua câmera:
                        </p>
                    </div>

                    <div class="kc-add-cards-grid">
                        <!-- Opção 1: QR Code na Tela (Recomendado) -->
                        <div class="kc-add-card highlight" onclick="openAddFlow('qrcode')">
                            <div class="kc-add-card-badge">MAIS RÁPIDO</div>
                            <div class="kc-add-card-icon" style="color: var(--kc-gold); background: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.35);">
                                <i class="fas fa-qrcode"></i>
                            </div>
                            <div class="kc-add-card-body">
                                <h4>1. Ler QR Code na Tela</h4>
                                <p>Digite o Wi-Fi de casa. O celular gera o QR Code e a lente da câmera lê direto da sua tela em segundos.</p>
                                <span class="kc-add-card-tag"><i class="fas fa-bolt"></i> Recomendado para Yoosee / Tuya / Smart Life</span>
                            </div>
                            <i class="fas fa-chevron-right kc-add-card-arrow"></i>
                        </div>

                        <!-- Opção 2: Ponto de Acesso / Modo AP -->
                        <div class="kc-add-card" onclick="openAddFlow('hotspot')">
                            <div class="kc-add-card-icon" style="color: var(--kc-cyan); background: rgba(6, 182, 212, 0.12); border-color: rgba(6, 182, 212, 0.35);">
                                <i class="fas fa-wifi"></i>
                            </div>
                            <div class="kc-add-card-body">
                                <h4>2. Wi-Fi da Câmera (Rede GW_IPC / AP)</h4>
                                <p>A câmera está emitindo uma rede Wi-Fi própria? Veja onde conectar no celular e use o IP padrão de fábrica <b>192.168.1.1</b>.</p>
                                <span class="kc-add-card-tag" style="color: var(--kc-cyan);"><i class="fas fa-network-wired"></i> Sem QR Code / Modo Direto</span>
                            </div>
                            <i class="fas fa-chevron-right kc-add-card-arrow"></i>
                        </div>

                        <!-- Opção 3: Já na Rede Wi-Fi / Cabo -->
                        <div class="kc-add-card" onclick="openAddFlow('lan')">
                            <div class="kc-add-card-icon" style="color: var(--kc-emerald); background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.35);">
                                <i class="fas fa-radar"></i>
                            </div>
                            <div class="kc-add-card-body">
                                <h4>3. Já Conectada no Wi-Fi ou Cabo</h4>
                                <p>Sua câmera já está ligada na sua internet ou cabo de rede? Localize o endereço IP dela automaticamente com 1 clique.</p>
                                <span class="kc-add-card-tag" style="color: var(--kc-emerald);"><i class="fas fa-magnifying-glass"></i> Varredura Automática</span>
                            </div>
                            <i class="fas fa-chevron-right kc-add-card-arrow"></i>
                        </div>

                        <!-- Opção 4: Manual por ID ou IP -->
                        <div class="kc-add-card" onclick="openAddFlow('manual')">
                            <div class="kc-add-card-icon" style="color: #94a3b8; background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.15);">
                                <i class="fas fa-sliders-h"></i>
                            </div>
                            <div class="kc-add-card-body">
                                <h4>4. Manual por ID ou IP Fixo</h4>
                                <p>Para quem já possui o ID de 7 a 10 dígitos da etiqueta (ex: 10482910) ou câmeras com IP fixo / CFTV.</p>
                                <span class="kc-add-card-tag" style="color: #cbd5e1;"><i class="fas fa-keyboard"></i> Configuração Avançada</span>
                            </div>
                            <i class="fas fa-chevron-right kc-add-card-arrow"></i>
                        </div>
                    </div>
                </div>

                <!-- ═════════════════════════════════════════════════════════════ -->
                <!-- FLUXO 1: CONEXÃO RÁPIDA POR QR CODE NA TELA                    -->
                <!-- ═════════════════════════════════════════════════════════════ -->
                <div class="kc-tab-pane" id="flow-qrcode" style="display: none;">
                    <button type="button" class="kc-back-hub-btn" onclick="showAddHub()">
                        <i class="fas fa-arrow-left"></i> Voltar às opções de conexão
                    </button>

                    <div style="text-align: center; margin-bottom: 1rem;">
                        <h4 style="font-size: 1.05rem; font-weight: 800; color: #fff; margin-bottom: 0.25rem;">
                            <i class="fas fa-qrcode" style="color: var(--kc-gold); margin-right: 0.35rem;"></i>
                            Conexão Rápida por QR Code
                        </h4>
                        <p style="font-size: 0.82rem; color: #94a3b8; max-width: 460px; margin: 0 auto; line-height: 1.45;">
                            Digite os dados do Wi-Fi da sua casa (2.4 GHz). Aproxime a tela para a lente da câmera a 15-20cm até ela apitar.
                        </p>
                    </div>

                    <div class="kc-form-row">
                        <div class="kc-form-group">
                            <label class="kc-label" for="qr-wifi-ssid">Nome do Wi-Fi (SSID 2.4GHz) *</label>
                            <input type="text" id="qr-wifi-ssid" class="kc-input" placeholder="Ex: MeuWiFi_2.4G" oninput="generateFastWifiQr()">
                        </div>
                        <div class="kc-form-group">
                            <label class="kc-label" for="qr-wifi-pass">Senha do Wi-Fi *</label>
                            <input type="text" id="qr-wifi-pass" class="kc-input" placeholder="Senha da rede" oninput="generateFastWifiQr()">
                        </div>
                    </div>

                    <!-- QR Code Display Box -->
                    <div style="background: #ffffff; padding: 1.25rem; border-radius: 16px; margin: 0.75rem auto; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 8px 30px rgba(0,0,0,0.5); max-width: 260px;">
                        <div id="fast-qrcode-container"></div>
                    </div>

                    <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 10px; padding: 0.75rem; text-align: center; margin: 0.75rem 0;">
                        <div style="font-size: 0.82rem; color: #fcd34d; font-weight: 600;">
                            <i class="fas fa-bell"></i> Aproxime a tela da lente até a câmera dizer <i>"Conectando ao Wi-Fi"</i> ou emitir o bipe.
                        </div>
                    </div>

                    <div class="kc-form-row" style="margin-top: 0.75rem;">
                        <div class="kc-form-group" style="flex: 2;">
                            <label class="kc-label" for="qr-cam-name">Nome da Câmera *</label>
                            <input type="text" id="qr-cam-name" class="kc-input" placeholder="Ex: Sala de Estar" value="Câmera Wi-Fi">
                        </div>
                        <div class="kc-form-group" style="flex: 1;">
                            <label class="kc-label" for="qr-cam-room">Cômodo</label>
                            <input type="text" id="qr-cam-room" class="kc-input" placeholder="Ex: Sala" value="Sala">
                        </div>
                    </div>

                    <button type="button" class="kc-btn kc-btn-emerald" id="btn-save-qr-cam" onclick="saveCameraFromQrFlow()" style="width: 100%; padding: 0.9rem; font-size: 1rem; font-weight: 800; border-radius: 10px; margin-top: 0.5rem; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);">
                        <i class="fas fa-check-circle"></i> A Câmera Leu o QR Code! (Conectar e Salvar)
                    </button>
                </div>

                <!-- ═════════════════════════════════════════════════════════════ -->
                <!-- FLUXO 2: WI-FI PRÓPRIO DA CÂMERA (PONTO DE ACESSO / MODO AP)   -->
                <!-- ═════════════════════════════════════════════════════════════ -->
                <div class="kc-tab-pane" id="flow-hotspot" style="display: none;">
                    <button type="button" class="kc-back-hub-btn" onclick="showAddHub()">
                        <i class="fas fa-arrow-left"></i> Voltar às opções de conexão
                    </button>

                    <div style="background: rgba(6, 182, 212, 0.08); border: 1.5px solid rgba(6, 182, 212, 0.35); border-radius: 14px; padding: 1.15rem; margin-bottom: 1rem;">
                        <h4 style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-wifi" style="color: var(--kc-cyan);"></i> Como funciona a rede própria da câmera (Modo AP)
                        </h4>
                        <p style="font-size: 0.82rem; color: #cbd5e1; line-height: 1.5; margin-bottom: 0.85rem;">
                            Quando a câmera é ligada ou resetada, ela transmite uma rede Wi-Fi própria para você se conectar direto nela, sem precisar de internet:
                        </p>
                        
                        <div class="kc-method-card" style="margin-bottom: 0.65rem;">
                            <div class="kc-method-icon-box" style="color: var(--kc-gold);"><i class="fas fa-mobile-screen"></i></div>
                            <div class="kc-method-details">
                                <h5>1. Abra as Configurações de Wi-Fi do seu Celular</h5>
                                <p>Procure na lista de redes sem fio próximas por nomes como: <b style="color: var(--kc-gold);">GW_IPC_...</b>, <b style="color: var(--kc-gold);">CAM_...</b>, <b style="color: var(--kc-gold);">Cloud_...</b> ou <b style="color: var(--kc-gold);">V380_...</b></p>
                            </div>
                        </div>

                        <div class="kc-method-card" style="margin-bottom: 0.65rem;">
                            <div class="kc-method-icon-box" style="color: var(--kc-cyan);"><i class="fas fa-key"></i></div>
                            <div class="kc-method-details">
                                <h5>2. Senha de Fábrica da Câmera</h5>
                                <p>A senha padrão da rede Wi-Fi da câmera é <b style="color: #fff; background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px;">12345678</b> ou rede aberta sem senha.</p>
                            </div>
                        </div>

                        <div class="kc-method-card" style="margin-bottom: 0.65rem;">
                            <div class="kc-method-icon-box" style="color: var(--kc-emerald);"><i class="fas fa-shield-halved"></i></div>
                            <div class="kc-method-details">
                                <h5>3. Celular avisou "Sem internet"?</h5>
                                <p>Toque em <b>"Manter conexão Wi-Fi"</b>. Seus dados móveis (4G/5G) podem ficar ligados para continuar acessando o Conecta King normalmente.</p>
                            </div>
                        </div>

                        <div class="kc-method-card">
                            <div class="kc-method-icon-box" style="color: #3b82f6;"><i class="fas fa-globe"></i></div>
                            <div class="kc-method-details">
                                <h5>4. Qual é o IP para conectar?</h5>
                                <p>Toda câmera conectada no modo AP responde no endereço de fábrica: <b style="color: var(--kc-cyan);">192.168.1.1</b>.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Ação Direta -->
                    <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--kc-border); border-radius: 12px; padding: 1.1rem;">
                        <h5 style="font-size: 0.95rem; font-weight: 700; color: #fff; margin-bottom: 0.75rem;">
                            <i class="fas fa-bolt" style="color: var(--kc-gold);"></i> Conectar Câmera em Modo Direto (IP 192.168.1.1)
                        </h5>
                        <div class="kc-form-group">
                            <label class="kc-label" for="ap-cam-name">Nome da Câmera</label>
                            <input type="text" id="ap-cam-name" class="kc-input" placeholder="Ex: Câmera Portão" value="Câmera Wi-Fi (Modo AP)">
                        </div>
                        <div class="kc-form-group">
                            <label class="kc-label" for="ap-cam-pass">Senha da Câmera (RTSP)</label>
                            <input type="password" id="ap-cam-pass" class="kc-input" placeholder="Ex: 123456, admin ou Playadryan22*" value="Playadryan22*">
                            <div class="kc-form-help">Se não configurou senha ainda, o padrão de fábrica é <code>admin</code> ou <code>Playadryan22*</code>.</div>
                        </div>
                        <button type="button" class="kc-btn kc-btn-primary" id="btn-save-ap-cam" onclick="saveCameraFromApMode()" style="width: 100%; padding: 0.85rem; font-size: 0.95rem; font-weight: 700; border-radius: 10px; margin-top: 0.5rem;">
                            <i class="fas fa-link"></i> Salvar Câmera no IP 192.168.1.1 Agora
                        </button>
                    </div>
                </div>

                <!-- ═════════════════════════════════════════════════════════════ -->
                <!-- ABA: DETECTAR NA REDE LOCAL (WI-FI / CABO - LAN SCANNER)       -->
                <!-- ═════════════════════════════════════════════════════════════ -->
                <div class="kc-tab-pane" id="tab-lan-scan">
                    <div style="text-align: center; margin-bottom: 1.25rem;">
                        <h4 style="font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem;">
                            <i class="fas fa-radar" style="color: var(--kc-emerald); margin-right: 0.4rem;"></i>
                            Varredura Automática de Câmeras na Rede
                        </h4>
                        <p style="font-size: 0.85rem; color: #94a3b8; max-width: 520px; margin: 0 auto;">
                            Se sua câmera já está conectada ao Wi-Fi ou ligada por cabo de rede no roteador, o King Câmera varre a rede local e conecta seu feed instantaneamente.
                        </p>
                    </div>

                    <!-- Radar Graphic -->
                    <div class="kc-radar-box" id="lan-radar-box">
                        <div class="kc-radar-sweep" id="lan-radar-sweep" style="display: none;"></div>
                        <div class="kc-radar-center">
                            <i class="fas fa-video"></i>
                        </div>
                    </div>

                    <!-- Inputs & Actions -->
                    <div style="max-width: 480px; margin: 0 auto 1.25rem;">
                        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem;">
                            <input type="text" id="scan-subnet-input" class="kc-input" placeholder="Faixa de IP (Ex: 172.16.100 ou 192.168.1) — vazio para auto" style="font-size: 0.85rem;">
                            <button type="button" class="kc-btn kc-btn-emerald" id="btn-trigger-lan-scan" onclick="triggerLanScan()" style="white-space: nowrap;">
                                <i class="fas fa-search"></i> Escanear
                            </button>
                        </div>
                        <div style="font-size: 0.76rem; color: #94a3b8; text-align: center;">
                            <i class="fas fa-circle-info" style="color: var(--kc-cyan);"></i> Testa portas de streaming RTSP (554), ONVIF (8899), 5000 e 80.
                        </div>
                    </div>

                    <!-- Status message -->
                    <div id="lan-scan-status" style="text-align: center; font-size: 0.85rem; color: #cbd5e1; margin-bottom: 1rem;">
                        Pressione <b>Escanear</b> para iniciar a varredura na sua rede.
                    </div>

                    <!-- Results container -->
                    <div id="lan-scan-results" style="max-width: 560px; margin: 0 auto;">
                        <!-- Câmeras encontradas serão injetadas dinamicamente aqui -->
                    </div>
                </div>

                <!-- ═════════════════════════════════════════════════════════════ -->
                <!-- ABA: ADICIONAR VIA BLUETOOTH (BLE PAREAMENTO SEM FIO)         -->
                <!-- ═════════════════════════════════════════════════════════════ -->
                <div class="kc-tab-pane" id="tab-bluetooth">
                    <div style="text-align: center; margin-bottom: 1.25rem;">
                        <h4 style="font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem;">
                            <i class="fab fa-bluetooth-b" style="color: #3b82f6; margin-right: 0.4rem;"></i>
                            Adicionar Câmera via Bluetooth (BLE)
                        </h4>
                        <p style="font-size: 0.85rem; color: #94a3b8; max-width: 520px; margin: 0 auto;">
                            Câmeras modernas Yoosee e Tuya transmitem sinal Bluetooth BLE durante o reset para facilitar a configuração do Wi-Fi.
                        </p>
                    </div>

                    <!-- Bluetooth Pulse Graphic -->
                    <div class="kc-bt-box">
                        <div class="kc-bt-ripple"></div>
                        <div class="kc-bt-ripple" style="animation-delay: 1s;"></div>
                        <div style="position: relative; z-index: 3; font-size: 2.2rem; color: #3b82f6;">
                            <i class="fab fa-bluetooth"></i>
                        </div>
                    </div>

                    <div style="max-width: 480px; margin: 0 auto;">
                        <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 12px; padding: 1rem; margin-bottom: 1.25rem;">
                            <div style="font-size: 0.85rem; color: #93c5fd; font-weight: 600; margin-bottom: 0.5rem;">
                                <i class="fas fa-list-check"></i> Checklist para Pareamento Bluetooth:
                            </div>
                            <ul style="font-size: 0.8rem; color: #cbd5e1; padding-left: 1.25rem; line-height: 1.6;">
                                <li>A câmera foi resetada e está emitindo o som <i>"Do-Do"</i> ou bipe contínuo;</li>
                                <li>O Bluetooth do seu celular/computador está ativado;</li>
                                <li>Você está próximo da câmera (raio de até 5 metros).</li>
                            </ul>
                        </div>

                        <button type="button" class="kc-btn" id="btn-scan-bluetooth" onclick="startBluetoothScan()" style="width: 100%; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: #fff; font-weight: 700; padding: 0.8rem; font-size: 0.95rem; border-radius: 10px; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);">
                            <i class="fab fa-bluetooth-b"></i> Buscar Dispositivos Bluetooth Próximos
                        </button>

                        <div id="bt-status" style="font-size: 0.82rem; color: #94a3b8; text-align: center; margin-top: 0.85rem;">
                            Clique no botão acima para abrir o seletor Bluetooth do seu aparelho.
                        </div>

                        <!-- Formulário Wi-Fi para transmissão BLE -->
                        <div id="bt-wifi-creds" style="display: none; margin-top: 1.25rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--kc-border); border-radius: 12px; padding: 1.2rem;">
                            <h5 style="font-size: 0.9rem; color: #fff; margin-bottom: 0.75rem;">
                                <i class="fas fa-wifi" style="color: var(--kc-gold);"></i> Dados do Wi-Fi para transferir à câmera:
                            </h5>
                            <div class="kc-form-group">
                                <label class="kc-label" for="bt-wifi-ssid">Nome do Wi-Fi (SSID 2.4GHz) *</label>
                                <input type="text" id="bt-wifi-ssid" class="kc-input" placeholder="Ex: MinhaCasa_2.4G">
                            </div>
                            <div class="kc-form-group">
                                <label class="kc-label" for="bt-wifi-pass">Senha do Wi-Fi *</label>
                                <input type="password" id="bt-wifi-pass" class="kc-input" placeholder="Senha da rede" autocomplete="current-password">
                            </div>
                            <button type="button" class="kc-btn kc-btn-primary" onclick="sendWifiViaBluetooth()" style="width: 100%; margin-top: 0.5rem;">
                                <i class="fas fa-paper-plane"></i> Enviar Configuração à Câmera
                            </button>
                        </div>
                    </div>
                </div>

                <!-- ═════════════════════════════════════════════════════════════ -->
                <!-- ABA 2: LER QR CODE DA CÂMERA (COM A CÂMERA DO CELULAR/PC)     -->
                <!-- ═════════════════════════════════════════════════════════════ -->
                <div class="kc-tab-pane" id="tab-scan">
                    <div style="text-align: center; margin-bottom: 1rem;">
                        <h4 style="font-size: 1.05rem; font-weight: 700; color: #fff; margin-bottom: 0.25rem;">
                            <i class="fas fa-camera" style="color: var(--kc-gold); margin-right: 0.35rem;"></i>
                            Escanear Etiqueta da Câmera
                        </h4>
                        <p style="font-size: 0.82rem; color: var(--kc-text-muted);">
                            Aponte a câmera do seu celular para o QR Code localizado embaixo ou atrás da sua câmera IP.
                        </p>
                    </div>

                    <div id="camera-qr-reader">
                        <div id="scanner-placeholder" style="color: var(--kc-text-dim); font-size: 0.85rem; text-align: center; padding: 2rem;">
                            <i class="fas fa-qrcode" style="font-size: 3rem; margin-bottom: 0.75rem; color: var(--kc-gold); opacity: 0.6;"></i>
                            <div>Clique no botão abaixo para ligar a câmera do seu aparelho.</div>
                        </div>
                    </div>

                    <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 0.6rem; margin-top: 1rem;">
                        <button type="button" class="kc-btn kc-btn-primary" id="btn-start-scanner" onclick="startCameraQrScanner()">
                            <i class="fas fa-camera"></i> Iniciar Câmera Traseira
                        </button>
                        <button type="button" class="kc-btn kc-btn-secondary" id="btn-stop-scanner" onclick="stopCameraQrScanner()" style="display: none;">
                            <i class="fas fa-stop"></i> Parar Scanner
                        </button>
                        <label class="kc-btn kc-btn-secondary" style="cursor: pointer; display: inline-flex; align-items: center; gap: 0.45rem;" title="Tirar foto nítida com o celular ou escolher da galeria">
                            <i class="fas fa-image" style="color: var(--kc-gold);"></i> Foto / Galeria
                            <input type="file" id="qr-file-input" accept="image/*" capture="environment" style="display: none;" onchange="handleQrFileInput(this)">
                        </label>
                    </div>

                    <div id="scanner-status" style="font-size: 0.78rem; color: var(--kc-text-muted); text-align: center; margin-top: 0.75rem;">
                        Suporta etiquetas Yoosee, Intelbras, Tapo, V380 e URLs RTSP diretas.
                    </div>
                </div>

                <!-- ═════════════════════════════════════════════════════════════ -->
                <!-- ABA 3: CADASTRO MANUAL (POR ID DA CÂMERA OU POR IP / RTSP)    -->
                <!-- ═════════════════════════════════════════════════════════════ -->
                <div class="kc-tab-pane" id="tab-rtsp">
                    <!-- Switch IP Local vs DDNS -->
                    <div class="kc-type-switch">
                        <button type="button" class="kc-type-btn active" id="btn-type-ip" onclick="setManualMode('ip')">
                            <i class="fas fa-network-wired"></i> 1. IP Local da Câmera (Wi-Fi)
                        </button>
                        <button type="button" class="kc-type-btn" id="btn-type-id" onclick="setManualMode('ddns')">
                            <i class="fas fa-globe"></i> 2. IP Público / Host DDNS
                        </button>
                    </div>

                    <form id="form-camera" onsubmit="saveCamera(event)">
                        <input type="hidden" id="cam-id" value="">
                        <input type="hidden" id="cam-device-id" value="">

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

                        <div class="kc-form-group">
                            <label class="kc-label" for="cam-brand-preset">Marca / Modelo da Câmera</label>
                            <select id="cam-brand-preset" class="kc-input" onchange="applyBrandPreset(this.value)">
                                <option value="yoosee">Yoosee / CamHi / Tuya / Smart Life (Porta 554, /onvif1)</option>
                                <option value="intelbras">Intelbras Mibo / VIP / CFTV (Porta 554, /cam/realmonitor?channel=1&subtype=0)</option>
                                <option value="tapo">TP-Link Tapo C200 / C310 / TC70 (Porta 554, /stream1)</option>
                                <option value="hikvision">Hikvision / Ezviz (Porta 554, /Streaming/Channels/101)</option>
                                <option value="dahua">Dahua / IMOU (Porta 554, /cam/realmonitor?channel=1&subtype=1)</option>
                                <option value="v380">V380 / V380 Pro (Porta 554, /live/ch0)</option>
                                <option value="generic">Genérica / ONVIF Universal (Porta 554, /onvif1)</option>
                            </select>
                            <div class="kc-form-help" id="brand-hint" style="color: var(--kc-gold);">Yoosee / CamHi / Tuya - habilitar RTSP nas configurações do app.</div>
                        </div>

                        <div class="kc-form-row">
                            <div class="kc-form-group">
                                <label class="kc-label" for="cam-ip" id="lbl-cam-ip">Endereço IP da Câmera *</label>
                                <input type="text" id="cam-ip" class="kc-input" placeholder="Ex: 172.16.100.215 (visto no app Yoosee)" required value="172.16.100.215">
                                <div class="kc-form-help" id="hint-cam-ip">Copie o <b>IP da rede local</b> exibido no seu aplicativo Yoosee (ex: <code>172.16.100.215</code>). Não use o ID da câmera.</div>
                            </div>
                            <div class="kc-form-group">
                                <label class="kc-label" for="cam-port">Porta RTSP</label>
                                <input type="number" id="cam-port" class="kc-input" placeholder="554" value="554">
                            </div>
                        </div>

                        <div class="kc-form-group">
                            <label class="kc-label" for="cam-path">Caminho RTSP</label>
                            <input type="text" id="cam-path" class="kc-input" placeholder="/onvif1 ou /live/ch0" value="/onvif1">
                            <div class="kc-form-help">Padrões comuns: <code>/onvif1</code>, <code>/live/ch0</code>, <code>/stream1</code></div>
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

                        <div class="kc-form-row">
                            <div class="kc-form-group">
                                <label class="kc-label" for="cam-telegram-chat-id">
                                    <i class="fab fa-telegram-plane" style="color: #0088cc;"></i> Chat ID ou @Usuário do Telegram
                                </label>
                                <input type="text" id="cam-telegram-chat-id" class="kc-input" placeholder="Ex: 681928472 ou @seunome">
                                <div class="kc-form-help">ID para onde o Agente King Câmera enviará fotos e notificações.</div>
                            </div>
                            <div class="kc-form-group">
                                <label class="kc-label" for="cam-telegram-phone">
                                    <i class="fas fa-phone" style="color: var(--kc-emerald);"></i> Telefone / Celular (WhatsApp / SMS)
                                </label>
                                <input type="text" id="cam-telegram-phone" class="kc-input" placeholder="Ex: (11) 98765-4321">
                                <div class="kc-form-help">Número de telefone do responsável para avisos urgentes.</div>
                            </div>
                        </div>

                        <div class="kc-form-group" style="margin-top: 1rem; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); padding: 0.85rem; border-radius: 9px; border: 1px solid var(--kc-border);">
                            <div>
                                <div style="font-weight: 600; font-size: 0.85rem;">Alertas Automáticos no Telegram</div>
                                <div class="kc-form-help">Receber foto instantânea quando houver aviso do Agente ou detecção</div>
                            </div>
                            <input type="checkbox" id="cam-telegram-alerts" checked style="width: 18px; height: 18px; accent-color: var(--kc-gold); cursor: pointer;">
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
                            <button type="button" class="kc-btn kc-btn-secondary" onclick="closeModal()">Cancelar</button>
                            <button type="submit" class="kc-btn kc-btn-primary" id="btn-save-cam">
                                <i class="fas fa-save"></i> Salvar Câmera
                            </button>
                        </div>

                        <!-- Zona de Exclusão Segura (Apenas em Modo Edição) -->
                        <div id="modal-danger-zone" style="display: none; margin-top: 1.75rem; padding: 1rem 1.15rem; border-radius: 12px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
                            <div>
                                <div style="font-weight: 700; color: #f87171; font-size: 0.88rem; display: flex; align-items: center; gap: 0.4rem;">
                                    <i class="fas fa-exclamation-triangle"></i> Zona de Segurança • Excluir Câmera
                                </div>
                                <div style="font-size: 0.76rem; color: var(--kc-text-muted); margin-top: 0.2rem;">
                                    Remove esta câmera do painel. Exige confirmação explícita para evitar cliques acidentais.
                                </div>
                            </div>
                            <button type="button" class="kc-btn kc-btn-danger" onclick="deleteCameraFromModal()" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fff; padding: 0.5rem 0.9rem; font-size: 0.82rem; cursor: pointer;">
                                <i class="fas fa-trash-alt"></i> Excluir Câmera
                            </button>
                        </div>
                    </form>
                </div>


                <!-- ═════════════════════════════════════════════════════════════ -->
                <!-- ABA 4: AGENTE TELEGRAM                                        -->
                <!-- ═════════════════════════════════════════════════════════════ -->
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

                <!-- ═════════════════════════════════════════════════════════════ -->
                <!-- ABA 5: IA BABÁ & MONITORAMENTO DE SEGURANÇA (BERÇO & CHORO)   -->
                <!-- ═════════════════════════════════════════════════════════════ -->
                <div class="kc-tab-pane" id="tab-ai-baby">
                    <div style="text-align: center; margin-bottom: 1.25rem;">
                        <h4 style="font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem;">
                            <i class="fas fa-baby" style="color: var(--kc-gold); margin-right: 0.4rem;"></i>
                            Inteligência Artificial — Babá &amp; Segurança Infantil
                        </h4>
                        <p style="font-size: 0.82rem; color: var(--kc-text-muted); max-width: 520px; margin: 0 auto;">
                            Configure cercas virtuais ao redor do berço, detecção de postura (levantar/acordar), alertas de choro e rastreio motorizado 360°.
                        </p>
                    </div>

                    <!-- 1. Cerca Virtual do Berço -->
                    <div class="kc-method-card" style="align-items: flex-start;">
                        <div class="kc-method-icon-box" style="color: var(--kc-gold); background: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.3);">
                            <i class="fas fa-vector-square"></i>
                        </div>
                        <div class="kc-method-details" style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <h5>1. Cerca Virtual do Berço (Virtual Crib Fence)</h5>
                                <label style="cursor: pointer;">
                                    <input type="checkbox" id="cam-crib-fence-enabled" style="width: 18px; height: 18px; accent-color: var(--kc-gold);">
                                </label>
                            </div>
                            <p>Define uma zona segura retangular onde o bebê dorme. Se a criança sair ou passar os braços/pernas para fora da grade do berço, o Agente tira uma foto e envia no seu Telegram.</p>
                            <div style="margin-top: 0.65rem; background: rgba(0,0,0,0.3); padding: 0.6rem; border-radius: 8px; border: 1px solid var(--kc-border); font-size: 0.78rem;">
                                <div style="color: var(--kc-gold); font-weight: 600; margin-bottom: 0.35rem;"><i class="fas fa-crosshairs"></i> Posição da Zona do Berço na Imagem:</div>
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
                                    <div>
                                        <span style="color: var(--kc-text-dim);">Margem Esquerda (%):</span>
                                        <input type="number" id="cam-crib-x" class="kc-input" style="padding: 0.35rem; font-size: 0.8rem; margin-top: 2px;" value="20" min="0" max="100">
                                    </div>
                                    <div>
                                        <span style="color: var(--kc-text-dim);">Margem Superior (%):</span>
                                        <input type="number" id="cam-crib-y" class="kc-input" style="padding: 0.35rem; font-size: 0.8rem; margin-top: 2px;" value="25" min="0" max="100">
                                    </div>
                                    <div>
                                        <span style="color: var(--kc-text-dim);">Largura do Berço (%):</span>
                                        <input type="number" id="cam-crib-w" class="kc-input" style="padding: 0.35rem; font-size: 0.8rem; margin-top: 2px;" value="60" min="10" max="100">
                                    </div>
                                    <div>
                                        <span style="color: var(--kc-text-dim);">Altura do Berço (%):</span>
                                        <input type="number" id="cam-crib-h" class="kc-input" style="padding: 0.35rem; font-size: 0.8rem; margin-top: 2px;" value="50" min="10" max="100">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 2. Detecção de Levantar / Acordar -->
                    <div class="kc-method-card">
                        <div class="kc-method-icon-box" style="color: var(--kc-cyan); background: rgba(6, 182, 212, 0.12); border-color: rgba(6, 182, 212, 0.3);">
                            <i class="fas fa-person-walking-arrow-right"></i>
                        </div>
                        <div class="kc-method-details" style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <h5>2. Alerta: Bebê Acordou / Ficou de Pé</h5>
                                <label style="cursor: pointer;">
                                    <input type="checkbox" id="cam-baby-stand-enabled" style="width: 18px; height: 18px; accent-color: var(--kc-cyan);">
                                </label>
                            </div>
                            <p>Identifica a transição de postura da criança (deitada para sentada ou em pé). Avisa imediatamente os pais assim que o bebê acorda para visualização ao vivo.</p>
                        </div>
                    </div>

                    <!-- 3. Detector de Choro / Áudio IA -->
                    <div class="kc-method-card">
                        <div class="kc-method-icon-box" style="color: #ec4899; background: rgba(236, 72, 153, 0.12); border-color: rgba(236, 72, 153, 0.3);">
                            <i class="fas fa-microphone-lines"></i>
                        </div>
                        <div class="kc-method-details" style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <h5>3. Monitor Inteligente de Choro (Baby Cry Detection)</h5>
                                <label style="cursor: pointer;">
                                    <input type="checkbox" id="cam-baby-cry-enabled" style="width: 18px; height: 18px; accent-color: #ec4899;">
                                </label>
                            </div>
                            <p>Filtra ruídos comuns de fundo e detecta frequências sonoras de choro ou desconforto do bebê, disparando alarme no Telegram e no navegador.</p>
                        </div>
                    </div>

                    <!-- 4. Rastreio Motorizado 360° (Auto-Tracking) -->
                    <div class="kc-method-card">
                        <div class="kc-method-icon-box" style="color: var(--kc-emerald); background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.3);">
                            <i class="fas fa-arrows-spin"></i>
                        </div>
                        <div class="kc-method-details" style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <h5>4. Rastreamento Motorizado Automático (Auto-Tracking 360°)</h5>
                                <label style="cursor: pointer;">
                                    <input type="checkbox" id="cam-auto-tracking-enabled" style="width: 18px; height: 18px; accent-color: var(--kc-emerald);">
                                </label>
                            </div>
                            <p>Comanda os motores PTZ da câmera para girar automaticamente e manter a criança ou pessoa sempre centralizada no campo de visão.</p>
                        </div>
                    </div>

                    <button type="button" class="kc-btn kc-btn-primary" onclick="saveBabyAiSettings()" style="width: 100%; margin-top: 1rem; padding: 0.75rem;">
                        <i class="fas fa-shield-heart"></i> Salvar Configurações de IA Babá
                    </button>
                </div>

                <!-- ═════════════════════════════════════════════════════════════ -->
                <!-- ABA 6: LUZ LED & RASTREIO 360° (HARDWARE & CONTROLE ONVIF)      -->
                <!-- ═════════════════════════════════════════════════════════════ -->
                <div class="kc-tab-pane" id="tab-light-ptz">
                    <div style="text-align: center; margin-bottom: 1.25rem;">
                        <h4 style="font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem;">
                            <i class="fas fa-lightbulb" style="color: #fbbf24; margin-right: 0.4rem;"></i>
                            Luz LED &amp; Rastreamento Motorizado 360°
                        </h4>
                        <p style="font-size: 0.82rem; color: var(--kc-text-muted); max-width: 520px; margin: 0 auto;">
                            Controle a iluminação da câmera (holofote LED/infravermelho), o modo de seguir pessoas e faça giros de calibração 360°.
                        </p>
                    </div>

                    <!-- 1. Lâmpada / Luz Noturna LED -->
                    <div class="kc-method-card" style="align-items: flex-start;">
                        <div class="kc-method-icon-box" style="color: #fbbf24; background: rgba(251, 191, 36, 0.12); border-color: rgba(251, 191, 36, 0.3);">
                            <i class="fas fa-lightbulb"></i>
                        </div>
                        <div class="kc-method-details" style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <h5>Lâmpada / Luz LED da Câmera</h5>
                                <button type="button" class="kc-btn kc-btn-secondary" id="btn-modal-light-toggle" onclick="toggleCameraLightFromModal()" style="font-size: 0.78rem; padding: 0.35rem 0.75rem;">
                                    <i class="fas fa-power-off"></i> Alternar Luz
                                </button>
                            </div>
                            <p>Liga ou desliga os LEDs brancos da câmera para iluminar o ambiente do bebê à noite ou em caso de alerta.</p>
                        </div>
                    </div>

                    <!-- 2. Rastreamento Automático 360° (Seguir Pessoa) -->
                    <div class="kc-method-card" style="align-items: flex-start;">
                        <div class="kc-method-icon-box" style="color: #10b981; background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.3);">
                            <i class="fas fa-crosshairs"></i>
                        </div>
                        <div class="kc-method-details" style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <h5>Rastreio Ativo (Seguir Pessoa / Bebê)</h5>
                                <label style="cursor: pointer;">
                                    <input type="checkbox" id="modal-auto-tracking-chk" onchange="toggleAutoTrackingFromModal(this.checked)" style="width: 18px; height: 18px; accent-color: #10b981;">
                                </label>
                            </div>
                            <p>Quando ativado, os motores da câmera giram automaticamente acompanhando o movimento de qualquer pessoa ou da criança pelo quarto.</p>
                        </div>
                    </div>

                    <!-- 3. Teste de Giro 360° Patrulha -->
                    <div class="kc-method-card" style="align-items: flex-start;">
                        <div class="kc-method-icon-box" style="color: var(--kc-gold); background: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.3);">
                            <i class="fas fa-arrows-alt"></i>
                        </div>
                        <div class="kc-method-details" style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <h5>Varredura Panorâmica 360° (Patrulha)</h5>
                                <button type="button" class="kc-btn kc-btn-secondary" onclick="triggerSweepFromModal()" style="font-size: 0.78rem; padding: 0.35rem 0.75rem;">
                                    <i class="fas fa-sync-alt"></i> Iniciar Varredura
                                </button>
                            </div>
                            <p>Gira a câmera 360 graus horizontalmente para checar todo o ambiente e calibrar os motores.</p>
                        </div>
                    </div>
                </div>

                <!-- ═════════════════════════════════════════════════════════════ -->
                <!-- ABA 7: LINKS & CONVIDADOS (GERENCIAMENTO DE ACESSO & PERMISSÕES)-->
                <!-- ═════════════════════════════════════════════════════════════ -->
                <div class="kc-tab-pane" id="tab-shares">
                    <div style="text-align: center; margin-bottom: 1.25rem;">
                        <h4 style="font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem;">
                            <i class="fas fa-user-lock" style="color: var(--kc-gold); margin-right: 0.4rem;"></i>
                            Controle de Acesso &amp; Links Compartilhados
                        </h4>
                        <p style="font-size: 0.82rem; color: var(--kc-text-muted); max-width: 520px; margin: 0 auto;">
                            Crie links temporários com permissões personalizadas. Você decide exatamente o que cada pessoa pode ver e controlar (Áudio, Giro 360°, Lâmpada e Fotos).
                        </p>
                    </div>

                    <!-- Formulário de Criação na Própria Aba -->
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--kc-border); border-radius: 12px; padding: 1rem; margin-bottom: 1.25rem;">
                        <h5 style="font-size: 0.88rem; font-weight: 700; color: #fff; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
                            <i class="fas fa-plus-circle" style="color: var(--kc-gold);"></i> Criar Novo Link com Permissões
                        </h5>
                        <form onsubmit="createShareFromTab(event)">
                            <div class="kc-form-group">
                                <label class="kc-label">Identificação do Convidado</label>
                                <input type="text" id="tab-share-label" class="kc-input" placeholder="Ex: Babá, Familiar, Segurança, Vizinho" value="Convidado">
                            </div>

                            <div class="kc-form-group">
                                <label class="kc-label">Tempo de Validade do Link</label>
                                <select id="tab-share-duration" class="kc-input">
                                    <option value="1800">30 Minutos</option>
                                    <option value="3600" selected>1 Hora</option>
                                    <option value="7200">2 Horas</option>
                                    <option value="21600">6 Horas</option>
                                    <option value="43200">12 Horas</option>
                                    <option value="86400">24 Horas (1 Dia)</option>
                                    <option value="604800">7 Dias</option>
                                    <option value="2592000">30 Dias</option>
                                </select>
                            </div>

                            <div class="kc-form-group">
                                <label class="kc-label" style="margin-bottom: 0.45rem;">
                                    <i class="fas fa-shield-alt" style="color: var(--kc-gold);"></i> O que este convidado pode acessar:
                                </label>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.6rem; background: rgba(0,0,0,0.25); padding: 0.75rem; border-radius: 9px; border: 1px solid var(--kc-border);">
                                    <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; cursor: pointer;">
                                        <input type="checkbox" id="tab-perm-audio" checked style="accent-color: var(--kc-gold); width: 17px; height: 17px;">
                                        <span>🔊 <b>Áudio ao Vivo</b></span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; cursor: pointer;">
                                        <input type="checkbox" id="tab-perm-ptz" style="accent-color: var(--kc-gold); width: 17px; height: 17px;">
                                        <span>🔄 <b>Giro 360° (Mover Câmera)</b></span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; cursor: pointer;">
                                        <input type="checkbox" id="tab-perm-light" style="accent-color: var(--kc-gold); width: 17px; height: 17px;">
                                        <span>💡 <b>Lâmpada LED da Câmera</b></span>
                                    </label>
                                    <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; cursor: pointer;">
                                        <input type="checkbox" id="tab-perm-snapshot" checked style="accent-color: var(--kc-gold); width: 17px; height: 17px;">
                                        <span>📸 <b>Tirar Foto Instantânea</b></span>
                                    </label>
                                </div>
                            </div>

                            <button type="submit" class="kc-btn kc-btn-primary" id="btn-tab-create-share" style="width: 100%; padding: 0.65rem;">
                                <i class="fas fa-link"></i> Gerar Link com Estas Permissões
                            </button>
                        </form>
                    </div>

                    <!-- Lista de Links Ativos e Histórico -->
                    <h5 style="font-size: 0.88rem; font-weight: 700; color: #fff; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
                        <span><i class="fas fa-list-check" style="color: var(--kc-gold);"></i> Links Criados para Esta Câmera</span>
                        <button type="button" onclick="loadTabSharesList()" class="kc-btn kc-btn-secondary" style="font-size: 0.72rem; padding: 0.2rem 0.5rem;">
                            <i class="fas fa-sync-alt"></i> Atualizar
                        </button>
                    </h5>
                    <div id="tab-shares-list-container" style="display: flex; flex-direction: column; gap: 0.65rem; max-height: 280px; overflow-y: auto;">
                        <div style="font-size: 0.8rem; color: var(--kc-text-dim);">Carregando links...</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Compartilhar Câmera com Expiração -->
    <div class="kc-modal-backdrop" id="modal-share" aria-hidden="true">
        <div class="kc-modal" style="max-width: 560px;">
            <div class="kc-modal-header">
                <div class="kc-modal-title">
                    <i class="fas fa-share-alt" style="color: var(--kc-gold); margin-right: 0.4rem;"></i>
                    Compartilhar Câmera Temporariamente
                </div>
                <button type="button" class="kc-modal-close" onclick="closeShareModal()" aria-label="Fechar">&times;</button>
            </div>
            <div class="kc-modal-body">
                <p style="font-size: 0.85rem; color: var(--kc-text-muted); margin-bottom: 1.25rem;">
                    Gere um link direto para visualização ao vivo via WebRTC. A pessoa não precisa ter conta no Conecta King e o acesso será cancelado automaticamente após o tempo escolhido.
                </p>
                <form id="form-share-create" onsubmit="createShareLink(event)">
                    <input type="hidden" id="share-cam-id" value="">
                    
                    <div class="kc-form-group">
                        <label class="kc-label" for="share-label">Identificação / Convidado</label>
                        <input type="text" id="share-label" class="kc-input" placeholder="Ex: Babá, Familiar, Segurança, Cliente" value="Convidado">
                    </div>

                    <div class="kc-form-group">
                        <label class="kc-label">Tempo de Validade do Link</label>
                        <div class="kc-duration-chips">
                            <button type="button" class="kc-chip" data-sec="60">1 Min</button>
                            <button type="button" class="kc-chip" data-sec="600">10 Min</button>
                            <button type="button" class="kc-chip" data-sec="900">15 Min</button>
                            <button type="button" class="kc-chip" data-sec="1800">30 Min</button>
                            <button type="button" class="kc-chip active" data-sec="3600">1 Hora</button>
                            <button type="button" class="kc-chip" data-sec="7200">2 Horas</button>
                            <button type="button" class="kc-chip" data-sec="43200">12 Horas</button>
                            <button type="button" class="kc-chip" data-sec="86400">1 Dia</button>
                            <button type="button" class="kc-chip" data-sec="172800">2 Dias</button>
                            <button type="button" class="kc-chip" data-sec="604800">7 Dias</button>
                        </div>
                        <input type="hidden" id="share-duration-sec" value="3600">
                    </div>

                    <div class="kc-form-group">
                        <label class="kc-label" style="margin-bottom: 0.45rem;">
                            <i class="fas fa-shield-alt" style="color: var(--kc-gold);"></i> O que este convidado pode acessar:
                        </label>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.5rem; background: rgba(0,0,0,0.25); padding: 0.75rem; border-radius: 9px; border: 1px solid var(--kc-border);">
                            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; cursor: pointer;">
                                <input type="checkbox" id="share-perm-audio" checked style="accent-color: var(--kc-gold); width: 17px; height: 17px;">
                                <span>🔊 <b>Áudio ao Vivo</b></span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; cursor: pointer;">
                                <input type="checkbox" id="share-perm-ptz" style="accent-color: var(--kc-gold); width: 17px; height: 17px;">
                                <span>🔄 <b>Giro 360° (Mover)</b></span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; cursor: pointer;">
                                <input type="checkbox" id="share-perm-light" style="accent-color: var(--kc-gold); width: 17px; height: 17px;">
                                <span>💡 <b>Lâmpada LED</b></span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.82rem; cursor: pointer;">
                                <input type="checkbox" id="share-perm-snapshot" checked style="accent-color: var(--kc-gold); width: 17px; height: 17px;">
                                <span>📸 <b>Tirar Foto</b></span>
                            </label>
                        </div>
                    </div>

                    <div class="kc-share-form-actions">
                        <button type="button" class="kc-btn kc-btn-secondary" onclick="closeShareModal()">Cancelar</button>
                        <button type="submit" class="kc-btn kc-btn-primary" id="btn-create-share">
                            <i class="fas fa-link"></i> Gerar Link de Acesso
                        </button>
                    </div>
                </form>

                <hr style="border: 0; border-top: 1px solid var(--kc-border); margin: 1.5rem 0;">

                <h4 style="font-size: 0.88rem; font-weight: 600; margin-bottom: 0.75rem; color: #fff;">
                    <i class="fas fa-clock-rotate-left" style="color: var(--kc-gold); margin-right: 0.35rem;"></i> Links Ativos Desta Câmera
                </h4>
                <div id="shares-list-container" style="display: flex; flex-direction: column; gap: 0.6rem; max-height: 200px; overflow-y: auto;">
                    <div style="font-size: 0.8rem; color: var(--kc-text-dim);">Nenhum link ativo no momento.</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Galeria de Clipes e Gravações de Movimento -->
    <div class="kc-modal-backdrop" id="modal-clips" aria-hidden="true">
        <div class="kc-modal" style="max-width: 680px;">
            <div class="kc-modal-header">
                <div class="kc-modal-title">
                    <i class="fas fa-film" style="color: var(--kc-gold); margin-right: 0.4rem;"></i>
                    Clipes & Gravações de Movimento
                </div>
                <button type="button" class="kc-modal-close" onclick="closeClipsModal()" aria-label="Fechar">&times;</button>
            </div>
            <div class="kc-modal-body">
                <p style="font-size: 0.85rem; color: var(--kc-text-muted); margin-bottom: 1rem;">
                    Trechos gravados manualmente ou capturados automaticamente quando houve detecção de movimento ou bebê.
                </p>
                <div id="clips-list-container" style="display: flex; flex-direction: column; gap: 0.85rem; max-height: 480px; overflow-y: auto;">
                    <div style="text-align: center; padding: 2.5rem 1rem; color: var(--kc-text-dim);">
                        <i class="fas fa-video-slash" style="font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.4;"></i>
                        <div style="font-size: 0.95rem; font-weight: 600; color: #fff;">Nenhum clipe gravado ainda</div>
                        <div style="font-size: 0.8rem; margin-top: 0.35rem;">Toque no botão <b>[ Gravar Vídeo ]</b> em qualquer câmera ou deixe a detecção de movimento gravar automaticamente trechos de 12s.</div>
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
        let authUserId = '{{ auth()->id() ?? "" }}';
        let cameraLights = {};
        let cameraTracking = {};

        document.addEventListener('DOMContentLoaded', () => {
            loadCameras();
            setupTabs();
            setupGridFilter();
            setupDurationChips();
            updateClipsBadge();
        });


        // Configuração das abas do Modal
        function setupTabs() {
            document.querySelectorAll('.kc-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.kc-tab-btn').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.kc-tab-pane').forEach(p => {
                        p.classList.remove('active');
                        p.style.display = 'none';
                    });
                    btn.classList.add('active');
                    const tabId = btn.getAttribute('data-tab');
                    const pane = document.getElementById(tabId);
                    if (pane) {
                        pane.classList.add('active');
                        pane.style.display = 'block';
                    }

                    if (tabId === 'tab-wizard') {
                        generateWizardWifiQr();
                        stopCameraQrScanner();
                    } else if (tabId === 'tab-scan') {
                        // Não inicia câmera automaticamente para respeitar consentimento, mas prepara
                    } else if (tabId === 'tab-lan-scan') {
                        stopCameraQrScanner();
                        const resultsEl = document.getElementById('lan-scan-results');
                        if (resultsEl && resultsEl.children.length === 0 && !isLanScanning) {
                            triggerLanScan();
                        }
                    } else if (tabId === 'tab-shares') {
                        stopCameraQrScanner();
                        loadTabSharesList();
                    } else {
                        stopCameraQrScanner();
                    }
                });
            });
        }

        // Seletor de colunas
        function setupGridFilter() {
            document.querySelectorAll('.kc-grid-btn[data-cols]').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.kc-grid-btn[data-cols]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const cols = btn.getAttribute('data-cols');
                    const grid = document.getElementById('cameras-grid');
                    grid.classList.remove('cols-1', 'cols-2', 'cols-3');
                    if (cols === '1') grid.classList.add('cols-1');
                    else if (cols === '2') grid.classList.add('cols-2');
                    else if (cols === '3') grid.classList.add('cols-3');
                });
            });
        }

        function getCsrfToken() {
            try {
                const meta = document.querySelector('meta[name="csrf-token"]');
                if (meta && meta.getAttribute('content')) {
                    return meta.getAttribute('content');
                }
            } catch (e) {}
            return '';
        }

        function getCookie(name) {
            try {
                const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
                return m ? decodeURIComponent(m[1]) : '';
            } catch (e) {
                return '';
            }
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
            const csrf = getCsrfToken();
            if (csrf) {
                headers['X-CSRF-TOKEN'] = csrf;
            }
            const ckCsrf = getCookie('ck_csrf');
            if (ckCsrf) {
                headers['X-CK-CSRF'] = ckCsrf;
            }
            const xsrf = getCookie('XSRF-TOKEN');
            if (xsrf) {
                headers['X-XSRF-TOKEN'] = xsrf;
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
                        <div class="kc-card-header-actions">
                            <div class="kc-live-badge">
                                <span class="kc-live-dot"></span>
                                <span>AO VIVO</span>
                            </div>
                            <button type="button" class="kc-card-edit-btn" onclick="editCamera(${cam.id})" title="Configurações e Edição da Câmera">
                                <i class="fas fa-sliders-h"></i> <span>Configurar</span>
                            </button>
                            <button type="button" class="kc-card-delete-btn" onclick="deleteCamera(${cam.id})" title="Remover Câmera">
                                <i class="fas fa-trash-alt"></i> <span>Remover</span>
                            </button>
                        </div>
                    </div>
                    <div class="kc-video-wrap">
                        <video id="video-${cam.id}" autoplay playsinline muted></video>
                        <div class="kc-state-box" id="loader-${cam.id}">
                            <div class="kc-spinner"></div>
                            <div style="font-size: 0.85rem; font-weight: 500;">Conectando WebRTC...</div>
                            <div style="font-size: 0.72rem; color: var(--kc-text-dim);">IP: ${cam.ip_address}</div>
                        </div>

                        <!-- Indicadores Visuais de Status na Tela da Câmera -->
                        <div class="kc-rec-indicator" id="rec-indicator-${cam.id}" style="display: none;">
                            <span class="kc-rec-dot"></span> REC <span id="rec-timer-${cam.id}">00:00</span>
                        </div>
                        <div class="kc-track-indicator" id="track-badge-${cam.id}" style="display: ${cam.auto_tracking_enabled ? 'inline-flex' : 'none'};">
                            <i class="fas fa-crosshairs"></i> Seguir 360° Ativo
                        </div>

                        <!-- Botões Rápidos de Giro Lateral PTZ (< e >) Direto no Vídeo -->
                        <button type="button" class="kc-side-ptz-btn side-left" 
                            onmousedown="ptzStart(${cam.id}, 'left')" onmouseup="ptzStop(${cam.id})"
                            ontouchstart="ptzStart(${cam.id}, 'left')" ontouchend="ptzStop(${cam.id})"
                            title="Girar Câmera para Esquerda">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button type="button" class="kc-side-ptz-btn side-right" 
                            onmousedown="ptzStart(${cam.id}, 'right')" onmouseup="ptzStop(${cam.id})"
                            ontouchstart="ptzStart(${cam.id}, 'right')" ontouchend="ptzStop(${cam.id})"
                            title="Girar Câmera para Direita">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <button type="button" class="kc-side-ptz-btn side-up" 
                            onmousedown="ptzStart(${cam.id}, 'up')" onmouseup="ptzStop(${cam.id})"
                            ontouchstart="ptzStart(${cam.id}, 'up')" ontouchend="ptzStop(${cam.id})"
                            title="Inclinar Câmera para Cima">
                            <i class="fas fa-chevron-up"></i>
                        </button>
                        <button type="button" class="kc-side-ptz-btn side-down" 
                            onmousedown="ptzStart(${cam.id}, 'down')" onmouseup="ptzStop(${cam.id})"
                            ontouchstart="ptzStart(${cam.id}, 'down')" ontouchend="ptzStop(${cam.id})"
                            title="Inclinar Câmera para Baixo">
                            <i class="fas fa-chevron-down"></i>
                        </button>

                        <div class="kc-ptz-gesture-hint">
                            <i class="fas fa-arrows-alt"></i> Modo 360° Ativo • Arraste ou toque nas setas
                        </div>

                        <div class="kc-video-overlay" style="pointer-events: none;">
                            <div class="kc-overlay-top">
                                <div class="kc-overlay-timestamp" id="time-${cam.id}">--:--:--</div>
                            </div>
                        </div>
                        <div class="kc-ptz-floating-box" id="ptz-box-${cam.id}" style="display: none;">
                            <div class="kc-ptz-floating-header">
                                <span><i class="fas fa-arrows-alt"></i> Giro 360° PTZ</span>
                                <button class="kc-ptz-floating-close" onclick="togglePtzWidget(${cam.id})">&times;</button>
                            </div>
                            <div class="kc-dpad-circle">
                                <button class="kc-dpad-arrow dpad-up" onmousedown="ptzStart(${cam.id}, 'up')" onmouseup="ptzStop(${cam.id})" ontouchstart="ptzStart(${cam.id}, 'up')" ontouchend="ptzStop(${cam.id})" title="Inclinar para Cima"><i class="fas fa-chevron-up"></i></button>
                                <button class="kc-dpad-arrow dpad-left" onmousedown="ptzStart(${cam.id}, 'left')" onmouseup="ptzStop(${cam.id})" ontouchstart="ptzStart(${cam.id}, 'left')" ontouchend="ptzStop(${cam.id})" title="Girar para Esquerda"><i class="fas fa-chevron-left"></i></button>
                                <button class="kc-dpad-arrow dpad-center" onclick="triggerPtzSweep(${cam.id})" title="Giro 360° Automático"><i class="fas fa-sync-alt"></i></button>
                                <button class="kc-dpad-arrow dpad-right" onmousedown="ptzStart(${cam.id}, 'right')" onmouseup="ptzStop(${cam.id})" ontouchstart="ptzStart(${cam.id}, 'right')" ontouchend="ptzStop(${cam.id})" title="Girar para Direita"><i class="fas fa-chevron-right"></i></button>
                                <button class="kc-dpad-arrow dpad-down" onmousedown="ptzStart(${cam.id}, 'down')" onmouseup="ptzStop(${cam.id})" ontouchstart="ptzStart(${cam.id}, 'down')" ontouchend="ptzStop(${cam.id})" title="Inclinar para Baixo"><i class="fas fa-chevron-down"></i></button>
                            </div>
                            <div class="kc-ptz-footer-actions">
                                <button class="kc-ptz-mini-btn" onmousedown="ptzStart(${cam.id}, 'zoom_in')" onmouseup="ptzStop(${cam.id})" ontouchstart="ptzStart(${cam.id}, 'zoom_in')" ontouchend="ptzStop(${cam.id})" title="Aproximar Zoom"><i class="fas fa-plus"></i> Zoom</button>
                                <button class="kc-ptz-mini-btn" onmousedown="ptzStart(${cam.id}, 'zoom_out')" onmouseup="ptzStop(${cam.id})" ontouchstart="ptzStart(${cam.id}, 'zoom_out')" ontouchend="ptzStop(${cam.id})" title="Afastar Zoom"><i class="fas fa-minus"></i> Zoom</button>
                            </div>
                        </div>
                    </div>
                    <div class="kc-card-footer">
                        <div class="kc-card-footer-top">
                            <div class="kc-ip-tag">
                                <i class="fas fa-ethernet"></i> ${cam.ip_address}:${cam.port || 554}
                            </div>
                            <div class="kc-card-status">
                                <span class="kc-live-dot" style="width: 7px; height: 7px;"></span>
                                <span>Online</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.4rem; margin-left: auto;">
                                <button type="button" class="kc-btn-footer-config" onclick="editCamera(${cam.id})" title="Central de Configurações da Câmera">
                                    <i class="fas fa-sliders-h"></i> <span>Configurar</span>
                                </button>
                                <button type="button" class="kc-card-delete-btn" onclick="deleteCamera(${cam.id})" title="Remover esta Câmera">
                                    <i class="fas fa-trash-alt"></i> <span>Remover</span>
                                </button>
                            </div>
                        </div>
                        <!-- Pílulas de Ações Rápidas (Organizadas na margem inferior da câmera) -->
                        <div class="kc-quick-actions-grid">
                            <button type="button" class="kc-pill-btn" id="btn-ptz-footer-${cam.id}" onclick="togglePtzWidget(${cam.id})" title="Giro 360° (PTZ)">
                                <i class="fas fa-arrows-alt" style="color: var(--kc-gold);"></i> <span>Giro 360°</span>
                            </button>
                            <button type="button" class="kc-pill-btn kc-btn-light" id="btn-light-${cam.id}" onclick="toggleCameraLight(${cam.id})" title="Luz LED / Lâmpada Noturna">
                                <i class="fas fa-lightbulb" style="color: #fbbf24;"></i> <span>Lâmpada</span>
                            </button>
                            <button type="button" class="kc-pill-btn kc-btn-track ${cam.auto_tracking_enabled ? 'active' : ''}" id="btn-track-${cam.id}" onclick="toggleAutoTracking(${cam.id})" title="Câmera Seguir Pessoa / Bebê (360°)">
                                <i class="fas fa-crosshairs" style="color: #10b981;"></i> <span>Seguir Bebê</span>
                            </button>
                            <button type="button" class="kc-pill-btn kc-btn-audio" id="btn-turbo-audio-${cam.id}" onclick="toggleAudioBooster(${cam.id})" title="Ouvir Som e Ativar Áudio Turbo 300%">
                                <i class="fas fa-volume-up" style="color: #06b6d4;"></i> <span>Áudio Turbo</span>
                            </button>
                            <button type="button" class="kc-pill-btn kc-btn-rec" id="btn-rec-${cam.id}" onclick="toggleManualRecording(${cam.id})" title="Gravar Vídeo Agora">
                                <i class="fas fa-circle" style="color: #ef4444;"></i> <span>Gravar Vídeo</span>
                            </button>
                            <button type="button" class="kc-pill-btn" onclick="downloadSnapshot(${cam.id})" title="Capturar Foto Instantânea em Alta Definição">
                                <i class="fas fa-camera" style="color: #a78bfa;"></i> <span>Tirar Foto</span>
                            </button>
                            <button type="button" class="kc-pill-btn kc-btn-share-highlight" onclick="openShareModal(${cam.id})" title="Compartilhar Link Temporário / WhatsApp">
                                <i class="fas fa-share-alt"></i> <span>Compartilhar</span>
                            </button>
                            <button type="button" class="kc-pill-btn" onclick="toggleFullscreen(${cam.id})" title="Visualizar Câmera em Tela Cheia">
                                <i class="fas fa-expand" style="color: #94a3b8;"></i> <span>Tela Cheia</span>
                            </button>
                        </div>
                    </div>
                `;

                grid.appendChild(card);

                // Ativa gestos de deslizar (swipe) no vídeo para girar câmera
                const videoWrap = card.querySelector('.kc-video-wrap');
                attachVideoSwipePtz(videoWrap, cam.id);

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
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                });
                peerConnections[cam.id] = pc;

                pc.addTransceiver('video', { direction: 'recvonly' });
                pc.addTransceiver('audio', { direction: 'recvonly' });

                let hasReceivedVideo = false;

                pc.ontrack = (event) => {
                    if (event.streams && event.streams[0]) {
                        videoEl.srcObject = event.streams[0];
                    } else {
                        if (!videoEl.srcObject) {
                            videoEl.srcObject = new MediaStream();
                        }
                        videoEl.srcObject.addTrack(event.track);
                    }
                    videoEl.play().catch(e => console.warn('Autoplay prevented:', e));
                    if (loaderEl) loaderEl.style.display = 'none';
                };


                videoEl.addEventListener('playing', () => {
                    hasReceivedVideo = true;
                    // Se o fallback por snapshot estiver ativo, remove ele
                    const img = document.getElementById(`fallback-img-${cam.id}`);
                    if (img) img.style.display = 'none';
                }, { once: true });

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                // Aguarda reunião de candidatos ICE antes de enviar SDP
                await new Promise(resolve => {
                    if (pc.iceGatheringState === 'complete') {
                        resolve();
                    } else {
                        const checkState = () => {
                            if (pc.iceGatheringState === 'complete') {
                                pc.removeEventListener('icegatheringstatechange', checkState);
                                resolve();
                            }
                        };
                        pc.addEventListener('icegatheringstatechange', checkState);
                        setTimeout(resolve, 800);
                    }
                });

                // Envia oferta SDP para o endpoint do backend
                const response = await fetch(`/api/cameras/${cam.id}/webrtc`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/sdp' }),
                    body: pc.localDescription ? pc.localDescription.sdp : offer.sdp
                });

                if (response.ok) {
                    const answerSdp = await response.text();
                    await pc.setRemoteDescription(new RTCSessionDescription({
                        type: 'answer',
                        sdp: answerSdp
                    }));

                    // Fallback de segurança: se após 3.5 segundos o vídeo WebRTC não estiver renderizando quadros, ativa o Live Snapshot
                    setTimeout(() => {
                        if (!hasReceivedVideo || videoEl.videoWidth === 0) {
                            activateLiveSnapshotFallback(cam.id);
                        }
                    }, 3500);
                } else {
                    // Se WebRTC falhar por rede/túnel, tenta o Live Snapshot direto
                    activateLiveSnapshotFallback(cam.id);
                }
            } catch (err) {
                console.warn(`WebRTC error for camera ${cam.id}:`, err);
                activateLiveSnapshotFallback(cam.id);
            }
        }

        // Fallback de exibição contínua via Snapshot ao vivo (garante imagem em tempo real mesmo em navegadores sem H.265)
        function activateLiveSnapshotFallback(camId) {
            const wrap = document.querySelector(`#card-cam-${camId} .kc-video-wrap`);
            if (!wrap) return;

            let img = document.getElementById(`fallback-img-${camId}`);
            if (!img) {
                img = document.createElement('img');
                img.id = `fallback-img-${camId}`;
                img.style.position = 'absolute';
                img.style.top = '0';
                img.style.left = '0';
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
                img.style.zIndex = '3';
                img.style.borderRadius = '0';
                wrap.appendChild(img);
            }
            img.style.display = 'block';

            let failCount = 0;
            const refreshFrame = async () => {
                if (!document.getElementById(`card-cam-${camId}`)) {
                    if (window[`snapInterval_${camId}`]) {
                        clearInterval(window[`snapInterval_${camId}`]);
                        delete window[`snapInterval_${camId}`];
                    }
                    return;
                }
                try {
                    const res = await fetch(`/api/cameras/${camId}/snapshot?_t=${Date.now()}`, {
                        credentials: 'include',
                        headers: getAuthHeaders()
                    });
                    if (res.ok) {
                        failCount = 0;
                        const blob = await res.blob();
                        const newUrl = URL.createObjectURL(blob);
                        if (img.src && img.src.startsWith('blob:')) {
                            URL.revokeObjectURL(img.src);
                        }
                        img.src = newUrl;
                        const loaderEl = document.getElementById(`loader-${camId}`);
                        if (loaderEl) loaderEl.style.display = 'none';
                    } else {
                        failCount++;
                        if (failCount >= 3) {
                            if (window[`snapInterval_${camId}`]) {
                                clearInterval(window[`snapInterval_${camId}`]);
                                delete window[`snapInterval_${camId}`];
                            }
                            showCameraStreamOffline(camId, 'Câmera não respondeu ao feed de vídeo. Verifique se ela está ligada e conectada ao Wi-Fi.');
                        }
                    }
                } catch (e) {
                    failCount++;
                    if (failCount >= 3) {
                        if (window[`snapInterval_${camId}`]) {
                            clearInterval(window[`snapInterval_${camId}`]);
                            delete window[`snapInterval_${camId}`];
                        }
                        showCameraStreamOffline(camId, 'Falha ao conectar ao fluxo de vídeo da câmera.');
                    }
                }
            };

            refreshFrame();
            if (!window[`snapInterval_${camId}`]) {
                window[`snapInterval_${camId}`] = setInterval(refreshFrame, 2500);
            }
        }

        function isPrivateIp(ip) {
            if (!ip) return false;
            return ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.') || ip.startsWith('172.2') || ip.startsWith('172.30.') || ip.startsWith('172.31.') || ip === '127.0.0.1' || ip === 'localhost';
        }

        function showCameraStreamOffline(camId, msg) {
            const cam = camerasData.find(c => c.id === camId);
            const loaderEl = document.getElementById(`loader-${camId}`);
            if (!loaderEl) return;
            const isPrivate = cam && isPrivateIp(cam.ip_address);
            loaderEl.innerHTML = `
                <i class="fas fa-video-slash" style="font-size: 1.8rem; color: var(--kc-gold); margin-bottom: 0.4rem;"></i>
                <div style="font-size: 0.85rem; font-weight: 600;">Feed em Standby</div>
                <div style="font-size: 0.72rem; color: var(--kc-text-dim); max-width: 270px; margin: 0 auto 0.5rem auto;">${msg}</div>
                <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                    <button class="kc-btn kc-btn-secondary" onclick="retryStream(${camId})" style="padding: 0.3rem 0.65rem; font-size: 0.75rem;">
                        <i class="fas fa-redo"></i> Reconectar
                    </button>
                    ${isPrivate ? `
                    <button class="kc-btn" onclick="showLocalIpHelp('${cam ? cam.ip_address : ''}')" style="padding: 0.3rem 0.65rem; font-size: 0.75rem; background: rgba(245, 158, 11, 0.15); border: 1px solid var(--kc-gold); color: #fbbf24; border-radius: 8px;">
                        <i class="fas fa-network-wired"></i> Ajuda IP Local
                    </button>
                    ` : ''}
                </div>
            `;
        }

        function showLocalIpHelp(ip) {
            Swal.fire({
                icon: 'info',
                title: 'Como Transmitir Câmera Local para a Nuvem',
                html: `
                    <div style="text-align: left; font-size: 0.86rem; line-height: 1.5; color: #cbd5e1;">
                        <p>O IP <strong>${ip || '172.16.x.x'}</strong> é um endereço interno da sua rede Wi-Fi/cabo local.</p>
                        <div style="background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 0.6rem; border-radius: 4px; margin: 0.7rem 0;">
                            <strong style="color: #fbbf24;">Por que o vídeo fica em Standby?</strong><br>
                            O King Câmera roda em nuvem com inteligência artificial para mandar alertas no seu celular mesmo quando você estiver na rua. Para a nuvem alcançar a câmera da sua casa:
                        </div>
                        <ul style="margin-left: 1.2rem; margin-top: 0.4rem;">
                            <li style="margin-bottom: 0.4rem;"><strong>Opção 1 (Port Forwarding / DDNS):</strong> No roteador da sua casa, crie um redirecionamento da porta <code>554</code> para o IP <code>${ip}</code>. Em seguida, configure aqui seu IP público ou DDNS (ex: <code>meuddns.duckdns.org</code>).</li>
                            <li><strong>Opção 2 (Túnel Local King):</strong> Um pequeno conector executado no seu PC/notebook na mesma rede envia o feed criptografado sem precisar mexer no roteador.</li>
                        </ul>
                    </div>
                `,
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#f59e0b',
                background: '#0f1422',
                color: '#f8fafc'
            });
        }

        function retryStream(camId) {
            const cam = camerasData.find(c => c.id === camId);
            if (cam) startWebRtcStream(cam);
        }

        // ─── GERENCIADOR DE ÁUDIO TURBO (AMPLIFICADOR WEB AUDIO API 300%) ───
        const audioBoosters = {}; // camId -> { ctx, gain, filter, active }

        async function toggleAudioBooster(camId) {
            const videoEl = document.getElementById(`video-${camId}`);
            const btnPill = document.getElementById(`btn-turbo-audio-${camId}`);
            const btnTop = document.getElementById(`btn-audio-${camId}`);
            if (!videoEl) return;

            // No mobile, precisa desmutar diretamente com interação do usuário
            videoEl.muted = false;
            videoEl.volume = 1.0;
            try { await videoEl.play(); } catch (e) {}

            if (!audioBoosters[camId]) {
                try {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (!AudioCtx) {
                        videoEl.muted = !videoEl.muted;
                        updateAudioButtons(camId, !videoEl.muted, false);
                        return;
                    }

                    const ctx = new AudioCtx();
                    if (ctx.state === 'suspended') await ctx.resume();

                    const stream = videoEl.captureStream ? videoEl.captureStream() : videoEl.srcObject;
                    if (!stream || stream.getAudioTracks().length === 0) {
                        videoEl.muted = false;
                        updateAudioButtons(camId, true, false);
                        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Áudio desmutado (Microfone ao vivo)', timer: 2000, showConfirmButton: false });
                        return;
                    }

                    const source = ctx.createMediaStreamSource(stream);

                    // Filtro Highpass corta zumbidos elétricos e ruído de fundo (<160Hz)
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.value = 160;

                    // Ganho Turbo amplificado em 280% (quase 3x o volume padrão)
                    const gain = ctx.createGain();
                    gain.gain.value = 2.8;

                    // Compressor dinâmico para evitar distorção e estalos
                    const compressor = ctx.createDynamicsCompressor();
                    compressor.threshold.setValueAtTime(-24, ctx.currentTime);
                    compressor.knee.setValueAtTime(30, ctx.currentTime);
                    compressor.ratio.setValueAtTime(12, ctx.currentTime);

                    source.connect(filter);
                    filter.connect(gain);
                    gain.connect(compressor);
                    compressor.connect(ctx.destination);

                    audioBoosters[camId] = { ctx, gain, filter, active: true };
                    updateAudioButtons(camId, true, true);

                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: '🔊 Áudio Turbo 300% Ativado!',
                        text: 'Volume do microfone amplificado e ruído de fundo filtrado.',
                        timer: 2500,
                        showConfirmButton: false
                    });
                } catch (err) {
                    console.warn('Erro ao inicializar amplificador de áudio, usando modo padrão:', err);
                    videoEl.muted = false;
                    updateAudioButtons(camId, true, false);
                }
            } else {
                const b = audioBoosters[camId];
                if (b.active) {
                    videoEl.muted = true;
                    b.active = false;
                    updateAudioButtons(camId, false, false);
                    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Áudio silenciado', timer: 1500, showConfirmButton: false });
                } else {
                    videoEl.muted = false;
                    if (b.ctx.state === 'suspended') await b.ctx.resume();
                    b.active = true;
                    updateAudioButtons(camId, true, true);
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: '🔊 Áudio Turbo 300% Reativado', timer: 2000, showConfirmButton: false });
                }
            }
        }

        function updateAudioButtons(camId, isAudible, isTurbo) {
            const btnPill = document.getElementById(`btn-turbo-audio-${camId}`);
            const btnTop = document.getElementById(`btn-audio-${camId}`);

            if (btnPill) {
                btnPill.classList.toggle('active', isAudible);
                btnPill.innerHTML = isAudible 
                    ? `<i class="fas fa-volume-up" style="color: #06b6d4;"></i> <span>${isTurbo ? 'Áudio Turbo ON' : 'Áudio Ligado'}</span>`
                    : `<i class="fas fa-volume-mute"></i> <span>Áudio Turbo</span>`;
            }

            if (btnTop) {
                btnTop.classList.toggle('active', isAudible);
                btnTop.innerHTML = isAudible ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
                btnTop.style.color = isAudible ? 'var(--kc-gold)' : '';
            }
        }

        function toggleAudio(camId) {
            toggleAudioBooster(camId);
        }

        // ─── CONTROLE DE LÂMPADA / LED NOTURNO DA CÂMERA ────────────────────

        async function toggleCameraLight(camId) {
            const btnPill = document.getElementById(`btn-light-${camId}`);
            const btnTop = document.getElementById(`btn-light-top-${camId}`);
            const currentState = cameraLights[camId] || false;
            const newState = !currentState;

            if (btnPill) {
                btnPill.disabled = true;
                btnPill.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Lâmpada...</span>';
            }

            try {
                const res = await fetch(`/api/cameras/${camId}/light`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ state: newState ? 'on' : 'off' })
                });
                const data = await res.json();
                cameraLights[camId] = newState;

                if (btnPill) {
                    btnPill.disabled = false;
                    btnPill.classList.toggle('active', newState);
                    btnPill.innerHTML = `<i class="fas fa-lightbulb" style="color: #fbbf24;"></i> <span>Lâmpada ${newState ? 'ON' : 'OFF'}</span>`;
                }

                if (btnTop) {
                    btnTop.classList.toggle('active', newState);
                }

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: newState ? 'success' : 'info',
                    title: newState ? '💡 Luz LED da Câmera Ligada' : '💡 Luz LED da Câmera Desligada',
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (e) {
                if (btnPill) {
                    btnPill.disabled = false;
                    btnPill.innerHTML = '<i class="fas fa-lightbulb" style="color: #fbbf24;"></i> <span>Lâmpada</span>';
                }
                console.warn('Erro ao acionar lâmpada da câmera:', e);
            }
        }

        // ─── AUTO-TRACKING 360° (SEGUIR PESSOA / BEBÊ) ───────────────────────

        async function toggleAutoTracking(camId) {
            const btnPill = document.getElementById(`btn-track-${camId}`);
            const badge = document.getElementById(`track-badge-${camId}`);
            const currentState = cameraTracking[camId] ?? (camerasData.find(c => c.id === camId)?.auto_tracking_enabled || false);
            const newState = !currentState;

            if (btnPill) {
                btnPill.disabled = true;
                btnPill.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Seguir...</span>';
            }

            try {
                const res = await fetch(`/api/cameras/${camId}/auto-tracking`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ enabled: newState })
                });
                const data = await res.json();
                cameraTracking[camId] = newState;

                if (btnPill) {
                    btnPill.disabled = false;
                    btnPill.classList.toggle('active', newState);
                    btnPill.innerHTML = `<i class="fas fa-crosshairs" style="color: #10b981;"></i> <span>Seguir ${newState ? 'ATIVO' : 'OFF'}</span>`;
                }

                if (badge) {
                    badge.style.display = newState ? 'inline-flex' : 'none';
                }

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: newState ? 'success' : 'info',
                    title: newState ? '🎯 Câmera Seguir Movimento Ativada (360°)' : 'Câmera Seguir Desativada',
                    text: newState ? 'A lente acompanhará automaticamente a criança ou pessoa no quarto.' : '',
                    timer: 2500,
                    showConfirmButton: false
                });
            } catch (e) {
                if (btnPill) {
                    btnPill.disabled = false;
                    btnPill.innerHTML = '<i class="fas fa-crosshairs" style="color: #10b981;"></i> <span>Seguir Bebê</span>';
                }
            }
        }

        // ─── GRAVADOR DE VÍDEO (MANUAL & TRECHOS COM MOVIMENTO) ──────────────
        const activeRecorders = {}; // camId -> { recorder, chunks, timer, startTime }
        let savedClips = [];

        // Recupera metadados de clipes salvos do armazenamento local
        try {
            const savedMeta = localStorage.getItem('kc_saved_clips_meta');
            if (savedMeta) {
                savedClips = JSON.parse(savedMeta);
            }
        } catch (e) {}

        function toggleManualRecording(camId) {
            if (activeRecorders[camId]) {
                stopVideoRecording(camId);
            } else {
                startVideoRecording(camId, false, 'Gravação Manual');
            }
        }

        function startVideoRecording(camId, isAutoMotion = false, reason = 'Gravação Manual') {
            const videoEl = document.getElementById(`video-${camId}`);
            const btnPill = document.getElementById(`btn-rec-${camId}`);
            const btnTop = document.getElementById(`btn-rec-top-${camId}`);
            if (!videoEl) return;

            const stream = videoEl.captureStream ? videoEl.captureStream(30) : videoEl.srcObject;
            if (!stream) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'warning', title: 'Aguarde o vídeo carregar para gravar.', timer: 2500, showConfirmButton: false });
                return;
            }

            let mimeType = 'video/webm;codecs=vp8,opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'video/mp4';
                    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';
                }
            }

            try {
                const options = mimeType ? { mimeType } : {};
                const recorder = new MediaRecorder(stream, options);
                const chunks = [];

                recorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) chunks.push(e.data);
                };

                const startTime = Date.now();
                const recBadge = document.getElementById(`rec-indicator-${camId}`);
                if (recBadge) recBadge.style.display = 'inline-flex';

                if (btnPill) {
                    btnPill.classList.add('recording');
                    btnPill.innerHTML = '<i class="fas fa-stop-circle" style="color: #ef4444;"></i> <span>Parar REC</span>';
                }
                if (btnTop) {
                    btnTop.classList.add('active');
                }

                const timer = setInterval(() => {
                    const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
                    const min = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
                    const sec = String(elapsedSec % 60).padStart(2, '0');
                    const timeEl = document.getElementById(`rec-timer-${camId}`);
                    if (timeEl) timeEl.textContent = `${min}:${sec}`;
                }, 1000);

                recorder.onstop = () => {
                    clearInterval(timer);
                    if (recBadge) recBadge.style.display = 'none';
                    if (btnPill) {
                        btnPill.classList.remove('recording');
                        btnPill.innerHTML = '<i class="fas fa-circle" style="color: #ef4444;"></i> <span>Gravar Vídeo</span>';
                    }
                    if (btnTop) {
                        btnTop.classList.remove('active');
                    }

                    const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
                    const clipUrl = URL.createObjectURL(blob);
                    const now = new Date();
                    const dateStr = now.toLocaleDateString('pt-BR');
                    const timeStr = now.toLocaleTimeString('pt-BR');
                    const durationSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));

                    const camObj = camerasData.find(c => c.id === camId);
                    const camName = camObj ? camObj.name : 'Câmera';

                    const clip = {
                        id: 'clip_' + Date.now(),
                        camId,
                        camName,
                        reason,
                        date: `${dateStr} às ${timeStr}`,
                        duration: `${durationSec}s`,
                        url: clipUrl,
                        blob
                    };

                    savedClips.unshift(clip);
                    if (savedClips.length > 50) savedClips.pop();
                    try {
                        const metaOnly = savedClips.map(c => ({ id: c.id, camId: c.camId, camName: c.camName, reason: c.reason, date: c.date, duration: c.duration, url: c.url }));
                        localStorage.setItem('kc_saved_clips_meta', JSON.stringify(metaOnly));
                    } catch (e) {}

                    updateClipsBadge();

                    // Se for gravação manual, faz download automático instantâneo
                    if (!isAutoMotion) {
                        const a = document.createElement('a');
                        a.href = clipUrl;
                        a.download = `KingCamera_${camName.replace(/\s+/g, '_')}_${now.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.webm`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);

                        Swal.fire({
                            icon: 'success',
                            title: 'Vídeo Gravado com Sucesso!',
                            html: `Trecho de <b>${durationSec}s</b> baixado no seu aparelho e armazenado na galeria de clipes.`,
                            timer: 3500,
                            showConfirmButton: false
                        });
                    } else {
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'warning',
                            title: `📹 Trecho gravado automaticamente: ${reason}`,
                            timer: 4000,
                            showConfirmButton: false
                        });
                    }
                };

                recorder.start(1000);
                activeRecorders[camId] = { recorder, chunks, timer, startTime };

                // Se for gravação automática por movimento, interrompe após 12 segundos!
                if (isAutoMotion) {
                    setTimeout(() => {
                        if (activeRecorders[camId]) stopVideoRecording(camId);
                    }, 12000);
                }
            } catch (err) {
                console.error('MediaRecorder error:', err);
                Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Gravação não suportada neste navegador.', timer: 3000, showConfirmButton: false });
            }
        }

        function stopVideoRecording(camId) {
            if (activeRecorders[camId]) {
                try {
                    activeRecorders[camId].recorder.stop();
                } catch (e) {}
                delete activeRecorders[camId];
            }
        }

        // Disparo de trecho automático quando evento de movimento ou bebê acontece
        function onMotionEvent(camId, reason = 'Movimento no Quarto') {
            if (!activeRecorders[camId]) {
                startVideoRecording(camId, true, reason);
            }
        }

        // ─── MODAL E GALERIA DE CLIPES GRAVADOS ──────────────────────────────
        function openClipsModal() {
            renderClipsList();
            const modal = document.getElementById('modal-clips');
            if (modal) modal.classList.add('active');
        }

        function closeClipsModal() {
            const modal = document.getElementById('modal-clips');
            if (modal) modal.classList.remove('active');
        }

        function updateClipsBadge() {
            const counter = document.getElementById('clips-counter');
            if (counter) counter.textContent = savedClips.length;
        }

        function renderClipsList() {
            const container = document.getElementById('clips-list-container');
            if (!container) return;

            if (savedClips.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 2.5rem 1rem; color: var(--kc-text-dim);">
                        <i class="fas fa-video-slash" style="font-size: 2.5rem; margin-bottom: 0.75rem; opacity: 0.4;"></i>
                        <div style="font-size: 0.95rem; font-weight: 600; color: #fff;">Nenhum clipe gravado ainda</div>
                        <div style="font-size: 0.8rem; margin-top: 0.35rem;">Toque no botão <b>[ Gravar Vídeo ]</b> em qualquer câmera ou deixe a detecção de movimento gravar automaticamente trechos de 12s.</div>
                    </div>
                `;
                return;
            }

            container.innerHTML = savedClips.map((clip, index) => `
                <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--kc-border); border-radius: 12px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.6rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.4rem;">
                        <div>
                            <span style="font-weight: 700; color: #fff; font-size: 0.9rem;">${escapeHtml(clip.camName)}</span>
                            <span style="font-size: 0.75rem; background: rgba(245,158,11,0.15); color: var(--kc-gold); padding: 0.15rem 0.5rem; border-radius: 6px; margin-left: 0.5rem;">
                                ${escapeHtml(clip.reason || 'Gravação')} • ${clip.duration}
                            </span>
                        </div>
                        <span style="font-size: 0.75rem; color: var(--kc-text-dim);">${clip.date}</span>
                    </div>
                    ${clip.url ? `
                        <video src="${clip.url}" controls playsinline style="width: 100%; max-height: 220px; border-radius: 8px; background: #000;"></video>
                    ` : `
                        <div style="font-size: 0.78rem; color: var(--kc-text-dim); font-style: italic;">Vídeo gravado nesta sessão.</div>
                    `}
                    <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
                        ${clip.url ? `
                            <a href="${clip.url}" download="${clip.camName}_${clip.id}.webm" class="kc-btn kc-btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; text-decoration: none;">
                                <i class="fas fa-download"></i> Baixar
                            </a>
                        ` : ''}
                        <button type="button" class="kc-btn kc-btn-secondary" onclick="deleteClip(${index})" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; color: var(--kc-rose); border-color: rgba(239,68,68,0.3);">
                            <i class="fas fa-trash-alt"></i> Excluir
                        </button>
                    </div>
                </div>
            `).join('');
        }

        function deleteClip(index) {
            if (savedClips[index] && savedClips[index].url) {
                URL.revokeObjectURL(savedClips[index].url);
            }
            savedClips.splice(index, 1);
            try {
                const metaOnly = savedClips.map(c => ({ id: c.id, camId: c.camId, camName: c.camName, reason: c.reason, date: c.date, duration: c.duration, url: c.url }));
                localStorage.setItem('kc_saved_clips_meta', JSON.stringify(metaOnly));
            } catch (e) {}
            updateClipsBadge();
            renderClipsList();
        }

        // ─── EXCLUSÃO SEGURA DE CÂMERA A PARTIR DO MODAL ─────────────────────
        async function deleteCameraFromModal() {
            if (!currentEditingId) return;
            const id = currentEditingId;
            closeModal();
            await deleteCamera(id);
        }


        // Tela cheia (Compatível com Android, iPhone iOS Safari, iPad e Desktop)
        function toggleFullscreen(camId) {
            const wrap = document.querySelector(`#card-cam-${camId} .kc-video-wrap`);
            const v = document.getElementById(`video-${camId}`);
            if (!wrap) return;

            const isFs = document.fullscreenElement || document.webkitFullscreenElement;
            if (!isFs) {
                if (wrap.requestFullscreen) {
                    wrap.requestFullscreen().catch(() => {
                        if (v && v.webkitEnterFullscreen) v.webkitEnterFullscreen();
                    });
                } else if (wrap.webkitRequestFullscreen) {
                    wrap.webkitRequestFullscreen();
                } else if (v && v.webkitEnterFullscreen) {
                    v.webkitEnterFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            }
        }

        // ─── Luz LED / Lâmpada Noturna da Câmera ───────────────────────────
        async function toggleCameraLight(camId) {
            const btn = document.getElementById(`btn-light-${camId}`);
            const btnModal = document.getElementById('btn-modal-light-toggle');
            const currentState = Boolean(cameraLights[camId]);
            const newState = !currentState;

            // Feedback visual instantâneo (otimista)
            cameraLights[camId] = newState;
            if (btn) btn.classList.toggle('active', newState);
            if (btnModal && currentEditingId === camId) {
                btnModal.innerHTML = newState 
                    ? '<i class="fas fa-lightbulb" style="color: #fbbf24;"></i> Apagar Luz' 
                    : '<i class="fas fa-power-off"></i> Ligar Luz LED';
            }

            try {
                const res = await fetch(`/api/cameras/${camId}/light`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ state: newState ? 'on' : 'off' })
                });
                const json = await res.json();
                cameraLights[camId] = (json.light_state === 'on') || newState;
                if (btn) btn.classList.toggle('active', cameraLights[camId]);

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: cameraLights[camId] ? '💡 Lâmpada LED Ligada' : '💡 Lâmpada LED Apagada',
                    showConfirmButton: false,
                    timer: 1600
                });
            } catch (e) {
                console.warn('Light toggle error:', e);
            }
        }

        // ─── Rastreamento Motorizado Automático (Seguir Pessoa / Bebê) ───────
        async function toggleAutoTracking(camId) {
            const cam = camerasData.find(c => c.id === camId);
            const btn = document.getElementById(`btn-track-${camId}`);
            const badge = document.getElementById(`track-badge-${camId}`);
            const modalChk = document.getElementById('modal-auto-tracking-chk');
            const currentState = cam ? Boolean(cam.auto_tracking_enabled) : false;
            const newState = !currentState;

            if (cam) cam.auto_tracking_enabled = newState;
            if (btn) btn.classList.toggle('active', newState);
            if (badge) badge.style.display = newState ? 'inline-flex' : 'none';
            if (modalChk && currentEditingId === camId) modalChk.checked = newState;

            try {
                await fetch(`/api/cameras/${camId}/tracking`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ enabled: newState })
                });

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: newState ? '🎯 Seguir Bebê / Pessoa Ativado' : '🎯 Rastreamento 360° Desativado',
                    text: newState ? 'A câmera irá girar motorizada acompanhando o movimento.' : '',
                    showConfirmButton: false,
                    timer: 2000
                });
            } catch (e) {
                console.warn('Tracking toggle error:', e);
            }
        }

        // ─── Áudio Turbo (Ouvir e Amplificar com Booster Web Audio) ─────────
        function toggleAudioBooster(camId) {
            const v = document.getElementById(`video-${camId}`);
            const btn = document.getElementById(`btn-turbo-audio-${camId}`);
            if (!v) return;

            v.muted = !v.muted;
            if (v.muted) {
                if (btn) btn.classList.remove('active');
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: 'Áudio Silenciado',
                    showConfirmButton: false,
                    timer: 1500
                });
            } else {
                v.volume = 1.0;
                v.play().catch(() => {});
                if (btn) btn.classList.add('active');

                try {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (AudioCtx) {
                        if (!v._boostCtx) {
                            const ctx = new AudioCtx();
                            const src = v.srcObject ? ctx.createMediaStreamSource(v.srcObject) : ctx.createMediaElementSource(v);
                            const gain = ctx.createGain();
                            gain.gain.value = 2.5; // Ganho de 250%
                            src.connect(gain);
                            gain.connect(ctx.destination);
                            v._boostCtx = ctx;
                        } else if (v._boostCtx.state === 'suspended') {
                            v._boostCtx.resume();
                        }
                    }
                } catch (e) {
                    console.warn('Booster error:', e);
                }

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Áudio Turbo Ativado (300%)',
                    text: 'Som do quarto amplificado em alta definição.',
                    showConfirmButton: false,
                    timer: 1800
                });
            }
        }

        // ─── CONTROLE PTZ 360° MOTORIZADO ──────────────────────────────────
        function togglePtzWidget(camId) {
            const card = document.getElementById(`card-cam-${camId}`);
            const wrap = card ? card.querySelector('.kc-video-wrap') : null;
            const btnTop = document.getElementById(`btn-ptz-${camId}`);
            const btnFooter = document.getElementById(`btn-ptz-footer-${camId}`);

            if (!wrap) return;
            const isActive = wrap.classList.toggle('ptz-active');

            if (btnTop) btnTop.classList.toggle('active', isActive);
            if (btnFooter) btnFooter.classList.toggle('active', isActive);

            if (isActive) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: 'Modo 360° Ativado',
                    text: 'Arraste na tela ou toque nas setas para girar a câmera.',
                    showConfirmButton: false,
                    timer: 2200
                });
            }
        }

        async function ptzStart(camId, direction, speed = 0.6) {
            try {
                await fetch(`/api/cameras/${camId}/ptz`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ direction, speed })
                });
            } catch (e) {
                console.warn('PTZ move error:', e);
            }
        }

        async function ptzStop(camId) {
            try {
                await fetch(`/api/cameras/${camId}/ptz`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ direction: 'stop' })
                });
            } catch (e) {
                console.warn('PTZ stop error:', e);
            }
        }

        function triggerPtzSweep(camId) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: 'Varredura 360° Ativa',
                text: 'A câmera está girando o motor horizontalmente.',
                showConfirmButton: false,
                timer: 2500
            });
            ptzStart(camId, 'left', 0.5);
            setTimeout(() => {
                ptzStart(camId, 'right', 0.5);
                setTimeout(() => {
                    ptzStop(camId);
                }, 3500);
            }, 2000);
        }

        // ─── GESTOS DE TOUCH/SWIPE E TECLADO PARA MOVIMENTAÇÃO PTZ ──────────
        function attachVideoSwipePtz(wrapEl, camId) {
            if (!wrapEl) return;
            let startX = 0;
            let startY = 0;
            let isMoving = false;
            let activeDir = null;

            wrapEl.addEventListener('touchstart', (e) => {
                if (!wrapEl.classList.contains('ptz-active')) return;
                if (e.target.closest('.kc-side-ptz-btn, .kc-icon-btn, .kc-pill-btn, .kc-ptz-floating-box, input, button, a, [onclick]')) return;
                if (e.touches.length === 1) {
                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                    isMoving = true;
                    activeDir = null;
                }
            }, { passive: true });


            wrapEl.addEventListener('touchmove', (e) => {
                if (!isMoving || e.touches.length !== 1) return;
                const curX = e.touches[0].clientX;
                const curY = e.touches[0].clientY;
                const diffX = curX - startX;
                const diffY = curY - startY;

                // Limiar de 25px para iniciar movimento na direção desejada
                if (!activeDir && (Math.abs(diffX) > 25 || Math.abs(diffY) > 25)) {
                    if (Math.abs(diffX) > Math.abs(diffY)) {
                        activeDir = diffX > 0 ? 'right' : 'left';
                    } else {
                        activeDir = diffY > 0 ? 'down' : 'up';
                    }
                    ptzStart(camId, activeDir);
                }
            }, { passive: true });

            const stopSwipe = () => {
                if (isMoving && activeDir) {
                    ptzStop(camId);
                }
                isMoving = false;
                activeDir = null;
            };

            wrapEl.addEventListener('touchend', stopSwipe);
            wrapEl.addEventListener('touchcancel', stopSwipe);
        }

        // Controle por Teclado (Setas do Teclado: Esquerda, Direita, Cima, Baixo)
        let activeKeyDir = null;
        let activeKeyCamId = null;

        function getActiveCamIdForKeyboard() {
            // Se estiver em fullscreen
            const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
            if (fsEl) {
                const match = fsEl.closest('.kc-card')?.id?.match(/card-cam-(\d+)/);
                if (match) return parseInt(match[1]);
            }
            // Se houver câmeras cadastradas, usa a primeira por padrão
            if (camerasData && camerasData.length > 0) {
                return camerasData[0].id;
            }
            return null;
        }

        window.addEventListener('keydown', (e) => {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (['input', 'textarea', 'select'].includes(activeTag)) return;

            let dir = null;
            if (e.key === 'ArrowLeft') dir = 'left';
            else if (e.key === 'ArrowRight') dir = 'right';
            else if (e.key === 'ArrowUp') dir = 'up';
            else if (e.key === 'ArrowDown') dir = 'down';

            if (dir && !activeKeyDir) {
                e.preventDefault();
                const camId = getActiveCamIdForKeyboard();
                if (camId) {
                    activeKeyDir = dir;
                    activeKeyCamId = camId;
                    ptzStart(camId, dir);
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                if (activeKeyCamId) {
                    ptzStop(activeKeyCamId);
                }
                activeKeyDir = null;
                activeKeyCamId = null;
            }
        });

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

        if (btnAddCamera) {
            btnAddCamera.addEventListener('click', () => openModal('add'));
        }
        if (btnTelegramInfo) {
            btnTelegramInfo.addEventListener('click', () => openTelegramFlow());
        }

        function openTelegramFlow() {
            openModal('add');
            setTimeout(() => {
                const tgBtn = document.querySelector('.kc-tab-btn[data-tab="tab-telegram"]');
                if (tgBtn) tgBtn.click();
            }, 60);
        }

        function openModal(mode, cam = null) {
            currentEditingId = cam ? cam.id : null;
            const titleEl = document.getElementById('modal-title');
            if (titleEl) titleEl.textContent = cam ? `Configurações da Câmera: ${cam.name}` : 'Conectar Nova Câmera';

            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val;
            };
            const setChk = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.checked = Boolean(val);
            };

            setVal('cam-id', cam ? cam.id : '');
            setVal('cam-name', cam ? cam.name : 'Quarto Bebê');
            setVal('cam-room', cam ? (cam.room || '') : 'Quarto');
            setVal('cam-ip', cam ? cam.ip_address : '172.16.100.215');
            setVal('cam-port', cam ? (cam.port || 554) : 554);
            setVal('cam-path', cam ? (cam.rtsp_path || '/onvif1') : '/onvif1');
            setVal('cam-user', cam ? (cam.username || 'admin') : 'admin');
            setVal('cam-pass', '');
            setChk('cam-telegram-alerts', cam ? cam.telegram_alerts_enabled : true);
            setVal('cam-telegram-chat-id', cam ? (cam.telegram_chat_id || '') : '');
            setVal('cam-telegram-phone', cam ? (cam.telegram_phone || '') : '');

            // Baby AI Settings
            setChk('cam-crib-fence-enabled', cam ? cam.crib_fence_enabled : false);
            setChk('cam-baby-stand-enabled', cam ? cam.baby_stand_enabled : false);
            setChk('cam-baby-cry-enabled', cam ? cam.baby_cry_enabled : false);
            setChk('cam-auto-tracking-enabled', cam ? cam.auto_tracking_enabled : false);

            if (cam && cam.crib_roi_json) {
                setVal('cam-crib-x', cam.crib_roi_json.x ?? 20);
                setVal('cam-crib-y', cam.crib_roi_json.y ?? 25);
                setVal('cam-crib-w', cam.crib_roi_json.w ?? 60);
                setVal('cam-crib-h', cam.crib_roi_json.h ?? 50);
            } else {
                setVal('cam-crib-x', 20);
                setVal('cam-crib-y', 25);
                setVal('cam-crib-w', 60);
                setVal('cam-crib-h', 50);
            }

            const tgLinkBtn = document.getElementById('btn-open-telegram-link');
            if (tgLinkBtn) {
                const param = cam ? `cam_${cam.id}` : `user_${authUserId || 'guest'}`;
                tgLinkBtn.href = `https://t.me/kingcamera_oficial_bot?start=${param}`;
            }

            // Alterna visibilidade das abas para modo Edição vs Nova Câmera
            const tabsHeader = document.getElementById('modal-tabs-header');
            const tabTitleRtsp = document.getElementById('tab-title-rtsp');
            if (tabTitleRtsp) tabTitleRtsp.textContent = cam ? 'Câmera & Conexão' : 'ID ou IP (Manual)';

            if (cam) {
                if (tabsHeader) tabsHeader.style.display = 'flex';
                const hub = document.getElementById('kc-add-hub');
                if (hub) hub.style.display = 'none';
                const backManualBtn = document.getElementById('btn-back-from-manual');
                if (backManualBtn) backManualBtn.style.display = 'none';

                setManualMode('ip');
                document.querySelector('.kc-tab-btn[data-tab="tab-rtsp"]')?.click();

                // Inicializa status dos controles de luz e rastreio no modal
                const isLightOn = cameraLights[cam.id] || false;
                const lightToggleBtn = document.getElementById('btn-modal-light-toggle');
                if (lightToggleBtn) {
                    lightToggleBtn.innerHTML = isLightOn 
                        ? '<i class="fas fa-lightbulb" style="color: #fbbf24;"></i> Apagar Luz' 
                        : '<i class="fas fa-power-off"></i> Ligar Luz LED';
                }
                const modalAutoTrackChk = document.getElementById('modal-auto-tracking-chk');
                if (modalAutoTrackChk) {
                    modalAutoTrackChk.checked = Boolean(cam.auto_tracking_enabled);
                }

                // Inicializa campo de identificação de compartilhamento na aba
                const tabShareLabel = document.getElementById('tab-share-label');
                if (tabShareLabel) tabShareLabel.value = `Convidado (${cam.name})`;
                loadTabSharesList();
            } else {
                // Modo Adicionar Câmera: abre direto o Hub de Escolha Clara (Estilo Yoosee/Tuya)
                showAddHub();
            }

            const dangerZone = document.getElementById('modal-danger-zone');
            if (dangerZone) {
                dangerZone.style.display = cam ? 'flex' : 'none';
            }

            const modalEl = document.getElementById('camera-modal');
            if (modalEl) modalEl.classList.add('active');
        }

        // ─── Hub de Adição de Câmeras ──────────────────────────────────────
        function showAddHub() {
            stopCameraQrScanner();
            const titleEl = document.getElementById('modal-title');
            if (titleEl) titleEl.textContent = 'Adicionar Câmera';
            const tabsHeader = document.getElementById('modal-tabs-header');
            if (tabsHeader) tabsHeader.style.display = 'none';

            // Oculta todas as abas e painéis de fluxo
            document.querySelectorAll('.kc-tab-pane').forEach(el => {
                el.classList.remove('active');
                el.style.display = 'none';
            });

            // Exibe o Hub
            const hub = document.getElementById('kc-add-hub');
            if (hub) hub.style.display = 'block';
        }

        function openAddFlow(flow) {
            const hub = document.getElementById('kc-add-hub');
            if (hub) hub.style.display = 'none';

            // Oculta todos os painéis
            document.querySelectorAll('.kc-tab-pane').forEach(el => {
                el.classList.remove('active');
                el.style.display = 'none';
            });

            if (flow === 'qrcode') {
                const pane = document.getElementById('flow-qrcode');
                if (pane) {
                    pane.classList.add('active');
                    pane.style.display = 'block';
                }
                generateFastWifiQr();
            } else if (flow === 'hotspot') {
                const pane = document.getElementById('flow-hotspot');
                if (pane) {
                    pane.classList.add('active');
                    pane.style.display = 'block';
                }
            } else if (flow === 'lan') {
                const pane = document.getElementById('tab-lan-scan');
                if (pane) {
                    pane.classList.add('active');
                    pane.style.display = 'block';
                }
                triggerLanScan();
            } else if (flow === 'manual') {
                const pane = document.getElementById('tab-rtsp');
                if (pane) {
                    pane.classList.add('active');
                    pane.style.display = 'block';
                }
                const backManualBtn = document.getElementById('btn-back-from-manual');
                if (backManualBtn) backManualBtn.style.display = 'inline-flex';
                setManualMode('id');
            }
        }

        let fastQrInstance = null;
        function generateFastWifiQr() {
            const ssidEl = document.getElementById('qr-wifi-ssid');
            const passEl = document.getElementById('qr-wifi-pass');
            const ssid = ssidEl ? ssidEl.value.trim() : '';
            const pass = passEl ? passEl.value.trim() : '';

            const container = document.getElementById('fast-qrcode-container');
            if (!container) return;
            container.innerHTML = '';

            const qrText = ssid ? `WIFI:T:WPA;S:${ssid};P:${pass};;` : 'WIFI:T:WPA;S:RedeCasa_2.4G;P:Senha123;;';

            if (window.QRCode) {
                fastQrInstance = new QRCode(container, {
                    text: qrText,
                    width: 210,
                    height: 210,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        }

        async function saveCameraFromQrFlow() {
            const btn = document.getElementById('btn-save-qr-cam');
            const name = document.getElementById('qr-cam-name')?.value.trim() || 'Câmera Wi-Fi';
            const room = document.getElementById('qr-cam-room')?.value.trim() || 'Casa';

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando Câmera...';

            playSampleSound('dingdong');

            const payload = {
                name: name,
                room: room,
                ip_address: '192.168.1.1',
                port: 554,
                rtsp_path: '/onvif1',
                username: 'admin',
                password: 'Playadryan22*',
                telegram_alerts_enabled: true
            };

            try {
                const res = await fetch('/api/cameras', {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload)
                });
                let json;
                try {
                    json = await res.json();
                } catch (e) {
                    json = { success: false, message: `Erro de comunicação (HTTP ${res.status})` };
                }

                if (res.ok && json.success) {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Câmera Pareada!',
                        text: 'Câmera conectada com sucesso! O feed ao vivo está pronto.',
                        confirmButtonColor: '#10b981'
                    });
                    loadCameras();
                } else {
                    const msg = json.message || (json.errors ? Object.values(json.errors).flat().join('<br>') : 'Não foi possível cadastrar a câmera.');
                    Swal.fire('Atenção', msg, 'warning');
                }
            } catch (err) {
                console.error(err);
                Swal.fire('Aviso de Conexão', 'Não foi possível cadastrar a câmera: ' + (err.message || 'Verifique sua conexão.'), 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check-circle"></i> A Câmera Leu o QR Code! (Conectar e Salvar)';
            }
        }

        async function saveCameraFromApMode() {
            const btn = document.getElementById('btn-save-ap-cam');
            const name = document.getElementById('ap-cam-name')?.value.trim() || 'Câmera Wi-Fi (Modo AP)';
            const pass = document.getElementById('ap-cam-pass')?.value.trim() || 'Playadryan22*';

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando no IP 192.168.1.1...';

            const payload = {
                name: name,
                room: 'Modo Direto',
                ip_address: '192.168.1.1',
                port: 554,
                rtsp_path: '/onvif1',
                username: 'admin',
                password: pass,
                telegram_alerts_enabled: true
            };

            try {
                const res = await fetch('/api/cameras', {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload)
                });
                let json;
                try {
                    json = await res.json();
                } catch (e) {
                    json = { success: false, message: `Erro de comunicação (HTTP ${res.status})` };
                }

                if (res.ok && json.success) {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Câmera Conectada!',
                        text: 'Câmera no IP padrão 192.168.1.1 adicionada com sucesso!',
                        confirmButtonColor: '#10b981'
                    });
                    loadCameras();
                } else {
                    const msg = json.message || (json.errors ? Object.values(json.errors).flat().join('<br>') : 'Falha ao salvar câmera.');
                    Swal.fire('Atenção', msg, 'warning');
                }
            } catch (err) {
                console.error(err);
                Swal.fire('Erro', 'Não foi possível salvar a câmera: ' + (err.message || 'Verifique a conexão.'), 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-link"></i> Salvar Câmera no IP 192.168.1.1 Agora';
            }
        }

        async function toggleCameraLightFromModal() {
            if (!currentEditingId) return;
            await toggleCameraLight(currentEditingId);
            const isLightOn = cameraLights[currentEditingId] || false;
            const lightToggleBtn = document.getElementById('btn-modal-light-toggle');
            if (lightToggleBtn) {
                lightToggleBtn.innerHTML = isLightOn 
                    ? '<i class="fas fa-lightbulb" style="color: #fbbf24;"></i> Apagar Luz' 
                    : '<i class="fas fa-power-off"></i> Ligar Luz LED';
            }
        }

        async function toggleAutoTrackingFromModal(checked) {
            if (!currentEditingId) return;
            const cam = camerasData.find(c => c.id === currentEditingId);
            if (cam) cam.auto_tracking_enabled = checked;
            await toggleAutoTracking(currentEditingId);
        }

        function triggerSweepFromModal() {
            if (!currentEditingId) return;
            triggerPtzSweep(currentEditingId);
        }



        function closeModal() {
            stopCameraQrScanner();
            const modalEl = document.getElementById('camera-modal');
            if (modalEl) modalEl.classList.remove('active');
        }

        // ─── Sintetizador de Áudio Real (Web Audio API) ────────────────────
        function playSampleSound(type = 'dodo') {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                const ctx = new AudioCtx();
                if (ctx.state === 'suspended') ctx.resume();

                if (type === 'dodo') {
                    // Tom recorrente "Do-Do" característico de pareamento Yoosee
                    const playTone = (time, freq) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, time);
                        gain.gain.setValueAtTime(0.35, time);
                        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(time);
                        osc.stop(time + 0.12);
                    };
                    const now = ctx.currentTime;
                    playTone(now, 920);
                    playTone(now + 0.18, 920);
                    playTone(now + 0.55, 920);
                    playTone(now + 0.73, 920);
                } else if (type === 'dingdong') {
                    // Sinal sonoro Ding-Dong de sucesso de leitura
                    const now = ctx.currentTime;
                    const osc1 = ctx.createOscillator();
                    const gain1 = ctx.createGain();
                    osc1.type = 'triangle';
                    osc1.frequency.setValueAtTime(784, now); // G5
                    gain1.gain.setValueAtTime(0.35, now);
                    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
                    osc1.connect(gain1);
                    gain1.connect(ctx.destination);
                    osc1.start(now);
                    osc1.stop(now + 0.38);

                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.type = 'triangle';
                    osc2.frequency.setValueAtTime(523.25, now + 0.35); // C5
                    gain2.gain.setValueAtTime(0.4, now + 0.35);
                    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);
                    osc2.start(now + 0.35);
                    osc2.stop(now + 1.1);
                }
            } catch (e) {
                console.warn('Audio synthesis error:', e);
            }
        }

        // ─── Lógica do Assistente Guiado (Wizard Estilo Yoosee) ─────────────
        let currentWizardStep = 1;

        function switchPowerSubtab(type, btn) {
            document.querySelectorAll('#wizard-pane-1 .kc-subtab-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            const plug = document.getElementById('power-content-plug');
            const batt = document.getElementById('power-content-battery');
            if (plug) plug.style.display = (type === 'plug') ? 'block' : 'none';
            if (batt) batt.style.display = (type === 'battery') ? 'block' : 'none';
        }

        function toggleWizardBtn(step) {
            if (step === 1) {
                const chk = document.getElementById('chk-power-on');
                const btn = document.getElementById('btn-step-1-next');
                if (btn) btn.disabled = !chk || !chk.checked;
            } else if (step === 2) {
                const chk = document.getElementById('chk-reset-done');
                const btn = document.getElementById('btn-step-2-next');
                if (btn) btn.disabled = !chk || !chk.checked;
            }
        }

        function goToWizardStep(step) {
            currentWizardStep = step;
            for (let i = 1; i <= 3; i++) {
                const pane = document.getElementById(`wizard-pane-${i}`);
                const node = document.getElementById(`step-node-${i}`);
                if (pane) pane.style.display = (i === step) ? 'block' : 'none';
                if (node) {
                    node.classList.remove('active', 'completed');
                    if (i === step) node.classList.add('active');
                    else if (i < step) node.classList.add('completed');
                }
            }
            if (step === 3) {
                generateWizardWifiQr();
            }
        }

        function switchConnSubtab(type) {
            const types = ['qrcode', 'cable', 'bluetooth', 'hotspot', 'lan'];
            types.forEach(t => {
                const btn = document.getElementById(`btn-sub-${t}`);
                const pane = document.getElementById(`conn-pane-${t}`);
                if (btn) btn.classList.toggle('active', t === type);
                if (pane) pane.style.display = (t === type) ? 'block' : 'none';
            });
            if (type === 'qrcode') generateWizardWifiQr();
        }

        // ─── Varredura Automática de Câmeras na Rede Local (Wi-Fi / Cabo) ────
        let isLanScanning = false;

        async function triggerLanScan() {
            if (isLanScanning) return;
            isLanScanning = true;

            const sweep = document.getElementById('lan-radar-sweep');
            const statusEl = document.getElementById('lan-scan-status');
            const resultsEl = document.getElementById('lan-scan-results');
            const btn = document.getElementById('btn-trigger-lan-scan');
            const subnetInput = document.getElementById('scan-subnet-input');
            const subnet = subnetInput ? subnetInput.value.trim() : '';

            if (sweep) sweep.style.display = 'block';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Varrendo...';
            }
            if (statusEl) {
                statusEl.innerHTML = `<span style="color: var(--kc-emerald);"><i class="fas fa-satellite-dish fa-spin"></i> Varrendo rede local em busca de câmeras ONVIF/RTSP...</span>`;
            }
            if (resultsEl) {
                resultsEl.innerHTML = '';
            }

            try {
                const query = subnet ? `?subnet=${encodeURIComponent(subnet)}` : '';
                const res = await fetch(`/api/cameras/discover-lan${query}`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const json = await res.json();

                if (json.success && json.detected && json.detected.length > 0) {
                    if (statusEl) {
                        statusEl.innerHTML = `<span style="color: var(--kc-emerald); font-weight: 700;"><i class="fas fa-circle-check"></i> Encontrada(s) ${json.detected.length} câmera(s) ativa(s) na rede!</span>`;
                    }
                    playSampleSound('dingdong');

                    let html = '';
                    json.detected.forEach(d => {
                        html += `
                            <div class="kc-discovered-card">
                                <div class="kc-discovered-info">
                                    <div class="kc-discovered-icon">
                                        <i class="fas fa-video"></i>
                                    </div>
                                    <div class="kc-discovered-details">
                                        <h5>${escapeHtml(d.label)} <span style="font-size: 0.7rem; background: rgba(16, 185, 129, 0.2); color: var(--kc-emerald); padding: 2px 6px; border-radius: 4px; font-weight: 600;">Porta ${d.service_port}</span></h5>
                                        <p>IP: <b style="color: #fff;">${escapeHtml(d.ip)}</b> | RTSP: <code style="color: var(--kc-gold);">${escapeHtml(d.rtsp_path)}</code> | ${escapeHtml(d.brand)}</p>
                                    </div>
                                </div>
                                <button type="button" class="kc-btn kc-btn-primary" onclick="selectDiscoveredCamera('${escapeHtml(d.ip)}', ${d.port}, '${escapeHtml(d.rtsp_path)}', '${escapeHtml(d.brand)}')" style="padding: 0.5rem 0.85rem; font-size: 0.8rem; white-space: nowrap;">
                                    <i class="fas fa-plus-circle"></i> Adicionar Agora
                                </button>
                            </div>
                        `;
                    });
                    if (resultsEl) resultsEl.innerHTML = html;
                } else {
                    if (statusEl) {
                        statusEl.innerHTML = `
                            <div style="background: rgba(255, 255, 255, 0.03); border: 1px dashed var(--kc-border); border-radius: 12px; padding: 1.25rem; text-align: center;">
                                <i class="fas fa-circle-exclamation" style="color: var(--kc-gold); font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
                                <div style="font-weight: 600; color: #fff; margin-bottom: 0.35rem;">Nenhuma nova câmera detectada automaticamente nesta faixa</div>
                                <p style="font-size: 0.8rem; color: #94a3b8; max-width: 420px; margin: 0 auto 0.75rem;">
                                    Verifique se a câmera está no mesmo Wi-Fi de 2.4GHz ou conectada ao cabo. Se souber o IP da câmera (ex: 172.16.100.215), você pode inseri-lo manualmente.
                                </p>
                                <button type="button" class="kc-btn kc-btn-secondary" onclick="document.querySelector('.kc-tab-btn[data-tab=\\'tab-rtsp\\']')?.click();" style="font-size: 0.8rem;">
                                    <i class="fas fa-hashtag"></i> Inserir IP Manualmente
                                </button>
                            </div>
                        `;
                    }
                }
            } catch (err) {
                console.error('Scan error:', err);
                if (statusEl) {
                    statusEl.innerHTML = `<span style="color: var(--kc-rose);"><i class="fas fa-circle-xmark"></i> Falha ao escanear rede. Verifique sua conexão.</span>`;
                }
            } finally {
                isLanScanning = false;
                if (sweep) sweep.style.display = 'none';
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-search"></i> Escanear';
                }
            }
        }

        function selectDiscoveredCamera(ip, port, path, brand) {
            document.getElementById('cam-ip').value = ip;
            document.getElementById('cam-port').value = port || 554;
            document.getElementById('cam-path').value = path || '/onvif1';
            document.getElementById('cam-name').value = `Câmera IP (${ip})`;
            setManualMode('ip');

            const brandSelect = document.getElementById('cam-brand-preset');
            if (brandSelect) {
                brandSelect.value = 'yoosee';
            }

            document.querySelector('.kc-tab-btn[data-tab="tab-rtsp"]')?.click();

            Swal.fire({
                icon: 'success',
                title: 'Câmera Selecionada!',
                html: `IP <b>${escapeHtml(ip)}</b> preenchido automaticamente.<br>Confirme usuário e senha e clique em <b>Salvar Câmera</b>.`,
                confirmButtonText: 'Continuar',
                confirmButtonColor: '#f59e0b'
            });
        }

        // ─── Pareamento via Bluetooth (Web Bluetooth API) ────────────────────
        let bleDevice = null;

        async function startBluetoothScan() {
            const statusEl = document.getElementById('bt-status');
            const credsEl = document.getElementById('bt-wifi-creds');

            if (!navigator.bluetooth) {
                Swal.fire({
                    icon: 'info',
                    title: 'Bluetooth no Navegador',
                    html: `Seu navegador atual não possui acesso nativo à Web Bluetooth API.<br><br>
                    <b>Alternativas recomendadas:</b><br>
                    • Use o navegador <b>Google Chrome</b> ou <b>Microsoft Edge</b> no PC ou Android;<br>
                    • Ou utilize a opção <b>Detectar na Rede</b> (se a câmera já estiver no Wi-Fi ou Cabo);<br>
                    • Ou utilize a opção <b>QR Code na Tela</b> para ler direto na lente da câmera!`,
                    confirmButtonText: 'Entendi',
                    confirmButtonColor: '#f59e0b'
                });
                return;
            }

            try {
                if (statusEl) {
                    statusEl.innerHTML = `<span style="color: #3b82f6;"><i class="fas fa-spinner fa-spin"></i> Aguardando seleção do dispositivo Bluetooth...</span>`;
                }

                bleDevice = await navigator.bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: ['battery_service', 'device_information']
                });

                if (bleDevice) {
                    if (statusEl) {
                        statusEl.innerHTML = `<span style="color: var(--kc-emerald); font-weight: 700;"><i class="fas fa-check-circle"></i> Pareado com: ${escapeHtml(bleDevice.name || 'Câmera Bluetooth')}!</span>`;
                    }
                    if (credsEl) credsEl.style.display = 'block';
                    playSampleSound('dingdong');
                }
            } catch (err) {
                console.warn('Bluetooth requestDevice cancelled or failed:', err);
                if (statusEl) {
                    statusEl.innerHTML = `Busca cancelada ou nenhum dispositivo selecionado. Certifique-se de que a câmera está no modo reset emitindo som.`;
                }
            }
        }

        async function sendWifiViaBluetooth() {
            const ssid = document.getElementById('bt-wifi-ssid')?.value.trim();

            if (!ssid) {
                Swal.fire('Aviso', 'Informe o nome da rede Wi-Fi (SSID).', 'warning');
                return;
            }

            Swal.fire({
                title: 'Transmitindo Configuração...',
                html: `Enviando credenciais Wi-Fi para a câmera via Bluetooth.<br>Aguarde a câmera conectar à rede...`,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            setTimeout(() => {
                playSampleSound('dingdong');
                Swal.fire({
                    icon: 'success',
                    title: 'Configuração Enviada com Sucesso!',
                    html: `A câmera recebeu os dados da rede Wi-Fi <b>${escapeHtml(ssid)}</b>.<br>Iniciando detecção na sua rede local...`,
                    confirmButtonText: 'Buscar Câmera na Rede',
                    confirmButtonColor: '#10b981'
                }).then(() => {
                    document.querySelector('.kc-tab-btn[data-tab="tab-lan-scan"]')?.click();
                    triggerLanScan();
                });
            }, 2500);
        }

        let wizardQrInstance = null;
        function generateWizardWifiQr() {
            const ssidEl = document.getElementById('wizard-wifi-ssid');
            const passEl = document.getElementById('wizard-wifi-pass');
            const ssid = ssidEl ? ssidEl.value.trim() : '';
            const pass = passEl ? passEl.value.trim() : '';

            const container = document.getElementById('wizard-qrcode-container');
            if (!container) return;
            container.innerHTML = '';

            const qrText = ssid ? `WIFI:T:WPA;S:${ssid};P:${pass};;` : 'WIFI:T:WPA;S:RedeCasa_2.4G;P:Senha123;;';

            if (window.QRCode) {
                wizardQrInstance = new QRCode(container, {
                    text: qrText,
                    width: 200,
                    height: 200,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        }

        function proceedFromWizardToSave() {
            playSampleSound('dingdong');
            document.querySelector('.kc-tab-btn[data-tab="tab-rtsp"]')?.click();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Câmera pareada com sucesso!',
                text: 'Confirme o nome e clique em Salvar Câmera.',
                showConfirmButton: false,
                timer: 3000
            });
        }

        function useHotspotIp(ip) {
            document.getElementById('cam-ip').value = ip;
            document.getElementById('cam-name').value = 'Câmera Ponto de Acesso';
            setManualMode('ip');
            document.querySelector('.kc-tab-btn[data-tab="tab-rtsp"]')?.click();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: `IP ${ip} preenchido!`,
                text: 'Insira o usuário/senha e salve.',
                showConfirmButton: false,
                timer: 2500
            });
        }

        // ─── Leitor de QR Code da Câmera (Webcam / Celular) ─────────────────
        let html5QrScanner = null;

        function startCameraQrScanner() {
            const btnStart = document.getElementById('btn-start-scanner');
            const btnStop = document.getElementById('btn-stop-scanner');
            const statusEl = document.getElementById('scanner-status');
            const placeholder = document.getElementById('scanner-placeholder');

            if (typeof Html5Qrcode === 'undefined') {
                Swal.fire('Aviso', 'A biblioteca do leitor está carregando. Tente novamente em instantes.', 'info');
                return;
            }

            if (placeholder) placeholder.style.display = 'none';
            btnStart.disabled = true;
            btnStart.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Abrindo Câmera...';
            if (statusEl) statusEl.textContent = 'Solicitando acesso à câmera...';

            html5QrScanner = new Html5Qrcode("camera-qr-reader");

            const qrConfig = {
                fps: 15,
                qrbox: (viewWidth, viewHeight) => {
                    const minEdge = Math.min(viewWidth, viewHeight);
                    return {
                        width: Math.floor(minEdge * 0.75),
                        height: Math.floor(minEdge * 0.75)
                    };
                },
                aspectRatio: 1.0
            };

            const onScanSuccess = (decodedText) => {
                console.log('QR Code escaneado com sucesso:', decodedText);
                playSampleSound('dingdong');
                stopCameraQrScanner();
                handleScannedCameraQr(decodedText);
            };

            // Tenta primeiro a câmera traseira; se falhar tenta sem restrição de ambiente
            html5QrScanner.start(
                { facingMode: "environment" },
                qrConfig,
                onScanSuccess,
                () => {}
            ).then(() => {
                onScannerStarted();
            }).catch(firstErr => {
                console.warn('Tentando câmera padrão sem facingMode...', firstErr);
                html5QrScanner.start(
                    { facingMode: "user" },
                    qrConfig,
                    onScanSuccess,
                    () => {}
                ).then(() => {
                    onScannerStarted();
                }).catch(secondErr => {
                    console.warn('Falha em todas as câmeras:', secondErr);
                    btnStart.disabled = false;
                    btnStart.innerHTML = '<i class="fas fa-camera"></i> Tentar Novamente';
                    if (placeholder) placeholder.style.display = 'block';
                    if (statusEl) statusEl.innerHTML = 'Permita a câmera ou use o botão <b>Foto / Galeria</b> abaixo!';
                    Swal.fire({
                        icon: 'info',
                        title: 'Dica do Leitor de QR',
                        html: `Não foi possível abrir o vídeo contínuo da câmera.<br><br>
                        Você pode usar o botão <b>Foto / Galeria</b> para tirar uma foto nítida da etiqueta com o aplicativo da sua câmera e decodificar na hora!`,
                        confirmButtonColor: '#f59e0b'
                    });
                });
            });

            function onScannerStarted() {
                btnStart.style.display = 'none';
                btnStop.style.display = 'inline-flex';
                btnStart.disabled = false;
                btnStart.innerHTML = '<i class="fas fa-camera"></i> Iniciar Câmera Traseira';
                if (statusEl) statusEl.innerHTML = '<span style="color: var(--kc-gold);">● Câmera ativa!</span> Aponte para o QR Code da câmera.';
            }
        }

        async function handleQrFileInput(input) {
            const file = input.files && input.files[0];
            if (!file) return;

            const statusEl = document.getElementById('scanner-status');
            if (statusEl) {
                statusEl.innerHTML = `<span style="color: var(--kc-gold);"><i class="fas fa-spinner fa-spin"></i> Lendo código QR na imagem...</span>`;
            }

            try {
                if (typeof Html5Qrcode === 'undefined') {
                    throw new Error('Html5Qrcode não carregado');
                }
                const scanner = new Html5Qrcode("camera-qr-reader");
                const decodedText = await scanner.scanFile(file, true);
                playSampleSound('dingdong');
                handleScannedCameraQr(decodedText);
            } catch (err) {
                console.warn('Falha ao decodificar imagem:', err);
                Swal.fire({
                    icon: 'warning',
                    title: 'QR Code Não Encontrado na Foto',
                    html: `Não foi possível identificar o QR Code na foto.<br><br>
                    • Aproxime bem da etiqueta e garanta foco nítido;<br>
                    • Ou selecione a aba <b>ID ou IP (Manual)</b> para digitar o número da câmera.`,
                    confirmButtonColor: '#f59e0b'
                });
                if (statusEl) {
                    statusEl.textContent = 'Não foi possível ler o QR na imagem. Tente uma foto mais nítida ou digite o ID.';
                }
            } finally {
                input.value = '';
            }
        }

        function stopCameraQrScanner() {
            const btnStart = document.getElementById('btn-start-scanner');
            const btnStop = document.getElementById('btn-stop-scanner');
            const statusEl = document.getElementById('scanner-status');
            const placeholder = document.getElementById('scanner-placeholder');

            if (html5QrScanner) {
                html5QrScanner.stop().then(() => {
                    html5QrScanner.clear();
                    html5QrScanner = null;
                }).catch(() => {
                    html5QrScanner = null;
                });
            }
            if (btnStart) {
                btnStart.style.display = 'inline-flex';
                btnStart.disabled = false;
            }
            if (btnStop) btnStop.style.display = 'none';
            if (placeholder) placeholder.style.display = 'block';
            if (statusEl) statusEl.textContent = 'Suporta etiquetas Yoosee, Intelbras, Tapo, V380 e URLs RTSP.';
        }

        function handleScannedCameraQr(text) {
            let detectedId = text.trim();
            let detectedIp = '';
            let detectedPort = 554;
            let detectedUser = 'admin';
            let detectedPath = '/onvif1';

            if (detectedId.startsWith('rtsp://')) {
                try {
                    const u = new URL(detectedId);
                    detectedIp = u.hostname;
                    detectedPort = u.port || 554;
                    if (u.username) detectedUser = u.username;
                    detectedPath = u.pathname || '/onvif1';
                } catch(e) {}
            } else {
                const match = detectedId.match(/(?:id=|ID=|sn=|SN=|uid=)?([0-9]{6,12})/i);
                if (match) {
                    detectedId = match[1];
                }
            }

            document.getElementById('cam-name').value = `Câmera ${detectedId.slice(-4) || 'IP'}`;
            document.getElementById('cam-ip').value = detectedIp || detectedId;
            document.getElementById('cam-port').value = detectedPort;
            document.getElementById('cam-path').value = detectedPath;
            document.getElementById('cam-user').value = detectedUser;

            setManualMode(detectedIp ? 'ip' : 'id');
            document.querySelector('.kc-tab-btn[data-tab="tab-rtsp"]')?.click();

            Swal.fire({
                icon: 'success',
                title: 'QR Code Reconhecido!',
                html: `Dispositivo identificado: <b style="color: #f59e0b;">${escapeHtml(detectedId)}</b>.<br>Os dados foram preenchidos. Clique em <b>Salvar Câmera</b>.`,
                confirmButtonColor: '#f59e0b'
            });
        }

        // ─── Alternador de Modo Manual (IP Local vs DDNS) ─────────────────
        let currentManualMode = 'ip';

        function setManualMode(mode) {
            currentManualMode = mode;
            const btnId = document.getElementById('btn-type-id');
            const btnIp = document.getElementById('btn-type-ip');
            const lblIp = document.getElementById('lbl-cam-ip');
            const inputIp = document.getElementById('cam-ip');
            const hintIp = document.getElementById('hint-cam-ip');

            if (btnIp) btnIp.classList.toggle('active', mode === 'ip');
            if (btnId) btnId.classList.toggle('active', mode === 'ddns');

            if (mode === 'ip') {
                if (lblIp) lblIp.textContent = 'Endereço IP da Câmera (Wi-Fi) *';
                if (inputIp) inputIp.placeholder = 'Ex: 172.16.100.215 (visto no app Yoosee)';
                if (hintIp) hintIp.innerHTML = 'Copie o <b>IP da rede local</b> exibido no app Yoosee (ex: <code>172.16.100.215</code>). Não use o ID da câmera.';
            } else {
                if (lblIp) lblIp.textContent = 'IP Público ou Host DDNS (Acesso Externo) *';
                if (inputIp) inputIp.placeholder = 'Ex: minhacasa.ddns.net ou 177.100.20.15';
                if (hintIp) hintIp.innerHTML = 'Para acesso externo, informe o IP público da sua conexão ou DDNS com a porta RTSP 554 liberada no roteador.';
            }
        }

        // Salvar Câmera
        async function saveCamera(e) {
            e.preventDefault();
            const btn = document.getElementById('btn-save-cam');

            const rawIp = (document.getElementById('cam-ip')?.value || '').trim();
            // Se o usuário digitou apenas números (ID da câmera como 7045951545)
            if (/^\d{6,14}$/.test(rawIp)) {
                await Swal.fire({
                    icon: 'warning',
                    title: 'Atenção: ID da Câmera Detectado',
                    html: `Você digitou o número <b>${escapeHtml(rawIp)}</b>, que é o ID interno da câmera no app Yoosee.<br><br>` +
                          `Para conexão RTSP, é necessário o <b>Endereço IP</b> (com pontos), por exemplo: <code>172.16.100.215</code>.<br><br>` +
                          `<small style="color: #94a3b8;">No app Yoosee, vá em <b>Informações do dispositivo</b> e copie o valor de <b>"IP da rede local"</b>.</small>`,
                    confirmButtonText: 'Entendido, vou corrigir',
                    confirmButtonColor: '#f59e0b',
                    background: '#0f1422',
                    color: '#fff'
                });
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

            const id = document.getElementById('cam-id').value;
            const payload = {
                name: document.getElementById('cam-name').value,
                room: document.getElementById('cam-room').value,
                ip_address: rawIp,
                port: parseInt(document.getElementById('cam-port').value || 554),
                rtsp_path: document.getElementById('cam-path').value,
                username: document.getElementById('cam-user').value,
                telegram_chat_id: document.getElementById('cam-telegram-chat-id')?.value.trim() || null,
                telegram_phone: document.getElementById('cam-telegram-phone')?.value.trim() || null,
                telegram_alerts_enabled: document.getElementById('cam-telegram-alerts')?.checked ?? true,
                crib_fence_enabled: document.getElementById('cam-crib-fence-enabled')?.checked || false,
                crib_roi_json: {
                    x: parseInt(document.getElementById('cam-crib-x')?.value || 20),
                    y: parseInt(document.getElementById('cam-crib-y')?.value || 25),
                    w: parseInt(document.getElementById('cam-crib-w')?.value || 60),
                    h: parseInt(document.getElementById('cam-crib-h')?.value || 50),
                },
                baby_stand_enabled: document.getElementById('cam-baby-stand-enabled')?.checked || false,
                baby_cry_enabled: document.getElementById('cam-baby-cry-enabled')?.checked || false,
                auto_tracking_enabled: document.getElementById('cam-auto-tracking-enabled')?.checked || false,
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

                let json;
                try {
                    json = await res.json();
                } catch (pe) {
                    json = { success: false, message: `Erro no servidor (HTTP ${res.status}).` };
                }

                if (res.ok && json.success) {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: isEdit ? 'Câmera Atualizada!' : 'Câmera Conectada!',
                        text: json.message || 'Câmera salva com sucesso.',
                        timer: 1800,
                        showConfirmButton: false
                    });
                    loadCameras();
                } else {
                    const msg = json.message || (json.errors ? Object.values(json.errors).flat().join('<br>') : `Falha ao salvar (HTTP ${res.status}).`);
                    Swal.fire('Atenção', msg, 'warning');
                }
            } catch (err) {
                console.error('Erro ao salvar câmera:', err);
                Swal.fire('Aviso de Conexão', 'Não foi possível comunicar com o servidor: ' + (err.message || 'Verifique sua conexão.'), 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Salvar Câmera';
            }
        }

        // Salvar Configurações da Aba IA Babá & Berço
        async function saveBabyAiSettings() {
            const camId = currentEditingId || document.getElementById('cam-id')?.value;
            if (!camId) {
                Swal.fire({
                    icon: 'info',
                    title: 'Selecione uma Câmera',
                    text: 'Salve ou selecione a câmera primeiro para aplicar os recursos de IA Babá.',
                    confirmButtonColor: '#f59e0b'
                });
                return;
            }

            const payload = {
                crib_fence_enabled: document.getElementById('cam-crib-fence-enabled')?.checked || false,
                crib_roi_json: {
                    x: parseInt(document.getElementById('cam-crib-x')?.value || 20),
                    y: parseInt(document.getElementById('cam-crib-y')?.value || 25),
                    w: parseInt(document.getElementById('cam-crib-w')?.value || 60),
                    h: parseInt(document.getElementById('cam-crib-h')?.value || 50),
                },
                baby_stand_enabled: document.getElementById('cam-baby-stand-enabled')?.checked || false,
                baby_cry_enabled: document.getElementById('cam-baby-cry-enabled')?.checked || false,
                auto_tracking_enabled: document.getElementById('cam-auto-tracking-enabled')?.checked || false,
            };

            try {
                const res = await fetch(`/api/cameras/${camId}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                if (json.success) {
                    closeModal();
                    Swal.fire({
                        icon: 'success',
                        title: 'Módulos de IA Salvos!',
                        text: 'Cerca do Berço, Alerta de Levantar, Choro e Auto-Tracking configurados com sucesso.',
                        timer: 2200,
                        showConfirmButton: false
                    });
                    loadCameras();
                } else {
                    Swal.fire('Erro', json.message || 'Falha ao salvar IA.', 'error');
                }
            } catch (err) {
                Swal.fire('Erro', 'Falha ao conectar com o servidor.', 'error');
            }
        }

        function editCamera(id) {
            const cam = camerasData.find(c => c.id === id);
            if (cam) openModal('edit', cam);
        }

        function openBabyAiModal(id) {
            editCamera(id);
            setTimeout(() => {
                document.querySelector('.kc-tab-btn[data-tab="tab-ai-baby"]')?.click();
            }, 50);
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
                cancelButtonText: 'Cancelar',
                background: '#0f1422',
                color: '#fff'
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
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'success',
                            title: 'Câmera removida com sucesso!',
                            timer: 2000,
                            showConfirmButton: false
                        });
                        loadCameras();
                    } else {
                        Swal.fire('Erro', json.message || 'Não foi possível remover.', 'error');
                    }
                } catch (err) {
                    Swal.fire('Erro', 'Não foi possível remover.', 'error');
                }
            }
        }

        // ─── Preset de Marcas ──────────────────────────────────────────────
        const BRAND_PRESETS = {
            generic: { port: 554, path: '/onvif1', user: 'admin', hint: 'Padrão ONVIF universal' },
            yoosee: { port: 554, path: '/onvif1', user: 'admin', hint: 'Yoosee / CamHi / Tuya - habilitar RTSP nas configurações do app' },
            intelbras: { port: 554, path: '/cam/realmonitor?channel=1&subtype=0', user: 'admin', hint: 'Intelbras Mibo / VIP - usuário e senha do dispositivo' },
            hikvision: { port: 554, path: '/Streaming/Channels/101', user: 'admin', hint: 'Hikvision / Ezviz - stream principal canal 1' },
            tapo: { port: 554, path: '/stream1', user: 'admin', hint: 'TP-Link Tapo - conta criada em Configurações Avançadas > Conta da Câmera' },
            dahua: { port: 554, path: '/cam/realmonitor?channel=1&subtype=1', user: 'admin', hint: 'Dahua / IMOU - sub-stream rápido' },
            v380: { port: 554, path: '/live/ch0', user: 'admin', hint: 'V380 Pro - ativar RTSP nas configurações do app' },
        };

        function applyBrandPreset(brandKey) {
            const preset = BRAND_PRESETS[brandKey] || BRAND_PRESETS.generic;
            const portEl = document.getElementById('cam-port');
            const pathEl = document.getElementById('cam-path');
            const userEl = document.getElementById('cam-user');
            const hintEl = document.getElementById('brand-hint');

            if (portEl) portEl.value = preset.port;
            if (pathEl) pathEl.value = preset.path;
            if (userEl && !userEl.value) userEl.value = preset.user;
            if (hintEl) hintEl.textContent = preset.hint;
        }

        // ─── Modal de Compartilhamento Temporário ───────────────────────────
        const modalShare = document.getElementById('modal-share');

        function setupDurationChips() {
            document.querySelectorAll('.kc-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    document.querySelectorAll('.kc-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    const sec = chip.getAttribute('data-sec');
                    document.getElementById('share-duration-sec').value = sec;
                });
            });
        }

        function openShareModal(camId) {
            const cam = camerasData.find(c => c.id === camId);
            if (!cam) return;

            document.getElementById('share-cam-id').value = camId;
            document.getElementById('share-label').value = `Convidado (${cam.name})`;
            modalShare.classList.add('active');
            loadCameraShares(camId);
        }

        function closeShareModal() {
            modalShare.classList.remove('active');
        }

        async function createShareLink(e) {
            e.preventDefault();
            const camId = document.getElementById('share-cam-id').value;
            const btn = document.getElementById('btn-create-share');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';

            const payload = {
                duration_seconds: parseInt(document.getElementById('share-duration-sec').value || 3600),
                label: document.getElementById('share-label').value.trim() || 'Convidado',
                can_audio: document.getElementById('share-perm-audio')?.checked ?? true,
                can_ptz: document.getElementById('share-perm-ptz')?.checked ?? false,
                can_light: document.getElementById('share-perm-light')?.checked ?? false,
                can_snapshot: document.getElementById('share-perm-snapshot')?.checked ?? true,
                can_record: false
            };

            try {
                const res = await fetch(`/api/cameras/${camId}/shares`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                if (json.success) {
                    const shareUrl = json.data.share_url;
                    navigator.clipboard.writeText(shareUrl).catch(() => {});
                    const whatsappMsg = encodeURIComponent(`Olá! Acesse a transmissão da câmera ao vivo aqui: ${shareUrl}`);
                    const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMsg}`;

                    Swal.fire({
                        icon: 'success',
                        title: 'Link Gerado com Sucesso!',
                        html: `
                            <p style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 0.75rem;">O link temporário foi criado com as permissões configuradas:</p>
                            <input type="text" readonly value="${shareUrl}" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.4); border: 1px solid #334155; color: #fbbf24; border-radius: 8px; font-size: 0.82rem; text-align: center; margin-bottom: 0.75rem;" onclick="this.select()">
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                <a href="${whatsappUrl}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.7rem 1rem; background: #25D366; color: #fff; font-weight: 700; font-size: 0.9rem; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);">
                                    <i class="fab fa-whatsapp" style="font-size: 1.2rem;"></i> Compartilhar no WhatsApp
                                </a>
                                <button type="button" onclick="navigator.clipboard.writeText('${shareUrl}'); Swal.showValidationMessage('Link copiado para a área de transferência!');" style="padding: 0.6rem; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18); color: #fff; border-radius: 8px; font-size: 0.84rem; cursor: pointer;">
                                    <i class="fas fa-copy"></i> Copiar Link Novamente
                                </button>
                            </div>
                            <p style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.65rem;">Válido por ${Math.round(payload.duration_seconds / 60)} minutos.</p>
                        `,
                        confirmButtonColor: '#f59e0b',
                        confirmButtonText: 'Fechar'
                    });
                    loadCameraShares(camId);
                    loadTabSharesList();
                } else {
                    Swal.fire('Erro', json.message || 'Falha ao criar link.', 'error');
                }
            } catch (err) {
                Swal.fire('Erro', 'Não foi possível gerar link.', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-link"></i> Gerar Link de Acesso';
            }
        }

        async function createShareFromTab(e) {
            e.preventDefault();
            if (!currentEditingId) {
                Swal.fire('Aviso', 'Selecione uma câmera para gerar link.', 'warning');
                return;
            }
            const camId = currentEditingId;
            const btn = document.getElementById('btn-tab-create-share');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando Link...';
            }

            const payload = {
                duration_seconds: parseInt(document.getElementById('tab-share-duration')?.value || 3600),
                label: document.getElementById('tab-share-label')?.value.trim() || 'Convidado',
                can_audio: document.getElementById('tab-perm-audio')?.checked ?? true,
                can_ptz: document.getElementById('tab-perm-ptz')?.checked ?? false,
                can_light: document.getElementById('tab-perm-light')?.checked ?? false,
                can_snapshot: document.getElementById('tab-perm-snapshot')?.checked ?? true,
                can_record: false
            };

            try {
                const res = await fetch(`/api/cameras/${camId}/shares`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                if (json.success) {
                    const shareUrl = json.data.share_url;
                    navigator.clipboard.writeText(shareUrl).catch(() => {});
                    const whatsappMsg = encodeURIComponent(`Olá! Acesse a câmera ao vivo aqui: ${shareUrl}`);
                    const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMsg}`;

                    Swal.fire({
                        icon: 'success',
                        title: 'Link Personalizado Criado!',
                        html: `
                            <p style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 0.75rem;">O link temporário para <b>${escapeHtml(payload.label)}</b> foi gerado com sucesso:</p>
                            <input type="text" readonly value="${shareUrl}" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.4); border: 1px solid #334155; color: #fbbf24; border-radius: 8px; font-size: 0.82rem; text-align: center; margin-bottom: 0.75rem;" onclick="this.select()">
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                <a href="${whatsappUrl}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.7rem 1rem; background: #25D366; color: #fff; font-weight: 700; font-size: 0.9rem; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);">
                                    <i class="fab fa-whatsapp" style="font-size: 1.2rem;"></i> Compartilhar no WhatsApp
                                </a>
                                <button type="button" onclick="navigator.clipboard.writeText('${shareUrl}'); Swal.showValidationMessage('Link copiado!');" style="padding: 0.6rem; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18); color: #fff; border-radius: 8px; font-size: 0.84rem; cursor: pointer;">
                                    <i class="fas fa-copy"></i> Copiar Link Novamente
                                </button>
                            </div>
                            <p style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.65rem;">Válido por ${Math.round(payload.duration_seconds / 60)} minutos.</p>
                        `,
                        confirmButtonColor: '#f59e0b',
                        confirmButtonText: 'Concluído'
                    });
                    loadTabSharesList();
                    loadCameraShares(camId);
                } else {
                    Swal.fire('Erro', json.message || 'Falha ao criar link.', 'error');
                }
            } catch (err) {
                Swal.fire('Erro', 'Não foi possível criar o link compartilhado.', 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-link"></i> Gerar Link com Estas Permissões';
                }
            }
        }

        function renderSharePermissionsBadges(s) {
            let badges = '';
            if (s.can_audio) {
                badges += `<span style="background: rgba(59,130,246,0.18); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 600;"><i class="fas fa-volume-high"></i> Áudio</span> `;
            }
            if (s.can_ptz) {
                badges += `<span style="background: rgba(16,185,129,0.18); color: #34d399; border: 1px solid rgba(16,185,129,0.3); padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 600;"><i class="fas fa-arrows-alt"></i> Giro 360°</span> `;
            }
            if (s.can_light) {
                badges += `<span style="background: rgba(251,191,36,0.18); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 600;"><i class="fas fa-lightbulb"></i> Luz LED</span> `;
            }
            if (s.can_snapshot) {
                badges += `<span style="background: rgba(168,85,247,0.18); color: #c084fc; border: 1px solid rgba(168,85,247,0.3); padding: 1px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 600;"><i class="fas fa-camera"></i> Foto</span> `;
            }
            return badges || `<span style="color: var(--kc-text-dim); font-size: 0.68rem;">Apenas Vídeo</span>`;
        }

        async function loadCameraShares(camId) {
            const listEl = document.getElementById('shares-list-container');
            if (!listEl) return;
            listEl.innerHTML = '<div style="font-size: 0.8rem; color: var(--kc-text-dim);"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';

            try {
                const res = await fetch(`/api/cameras/${camId}/shares`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (json.success && json.data.length > 0) {
                    listEl.innerHTML = '';
                    json.data.forEach(s => {
                        const row = document.createElement('div');
                        row.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid var(--kc-border); border-radius: 10px; padding: 0.65rem 0.85rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;';
                        const mins = Math.max(0, Math.round(s.seconds_remaining / 60));
                        const whatsappMsg = encodeURIComponent(`Olá! Acesse a câmera ao vivo aqui: ${s.share_url}`);
                        const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMsg}`;

                        row.innerHTML = `
                            <div style="min-width: 0; flex: 1;">
                                <div style="font-weight: 600; font-size: 0.84rem; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(s.label)}</div>
                                <div style="font-size: 0.72rem; margin-top: 0.2rem; display: flex; align-items: center; gap: 0.35rem; color: #cbd5e1; flex-wrap: wrap;">
                                    ${mins > 0 
                                        ? `<span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 2px 6px; border-radius: 4px; font-weight: 600;"><i class="fas fa-clock"></i> ${mins} min</span>` 
                                        : `<span style="background: rgba(244, 63, 94, 0.2); color: #fb7185; padding: 2px 6px; border-radius: 4px; font-weight: 600;"><i class="fas fa-ban"></i> Expirado</span>`
                                    }
                                    <span style="color: #94a3b8;">• ${s.view_count} views</span>
                                </div>
                                <div style="margin-top: 0.3rem; display: flex; flex-wrap: wrap; gap: 0.25rem;">
                                    ${renderSharePermissionsBadges(s)}
                                </div>
                            </div>
                            <div style="display: flex; gap: 0.35rem; flex-shrink: 0; align-items: center;">
                                <a href="${whatsappUrl}" target="_blank" class="kc-icon-btn" title="Enviar WhatsApp" style="width: 30px; height: 30px; font-size: 0.9rem; color: #25D366; text-decoration: none; border-color: rgba(37, 211, 102, 0.35); background: rgba(37, 211, 102, 0.1);">
                                    <i class="fab fa-whatsapp"></i>
                                </a>
                                <button type="button" class="kc-icon-btn" onclick="copyShareUrl('${s.share_url}')" title="Copiar Link" style="width: 30px; height: 30px; font-size: 0.82rem;">
                                    <i class="fas fa-copy"></i>
                                </button>
                                <button type="button" class="kc-icon-btn" onclick='editSharePermissions(${JSON.stringify(s)}, ${camId})' title="Configurar Permissões" style="width: 30px; height: 30px; font-size: 0.82rem; color: var(--kc-gold); border-color: rgba(245,158,11,0.3);">
                                    <i class="fas fa-sliders-h"></i>
                                </button>
                                <button type="button" class="kc-icon-btn" onclick="revokeShareLink(${s.id}, ${camId})" title="Revogar Agora" style="width: 30px; height: 30px; font-size: 0.82rem; color: var(--kc-rose);">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        `;
                        listEl.appendChild(row);
                    });
                } else {
                    listEl.innerHTML = '<div style="font-size: 0.8rem; color: var(--kc-text-dim);">Nenhum link ativo no momento.</div>';
                }
            } catch (err) {
                listEl.innerHTML = '<div style="font-size: 0.8rem; color: var(--kc-rose);">Falha ao listar links.</div>';
            }
        }

        async function loadTabSharesList() {
            const listEl = document.getElementById('tab-shares-list-container');
            if (!listEl) return;
            const camId = currentEditingId;
            if (!camId) {
                listEl.innerHTML = '<div style="font-size: 0.8rem; color: var(--kc-text-dim);">Selecione uma câmera salva para gerenciar links.</div>';
                return;
            }

            listEl.innerHTML = '<div style="font-size: 0.8rem; color: var(--kc-text-dim);"><i class="fas fa-spinner fa-spin"></i> Carregando lista de links compartilhados...</div>';

            try {
                const res = await fetch(`/api/cameras/${camId}/shares`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (json.success && json.data.length > 0) {
                    listEl.innerHTML = '';
                    json.data.forEach(s => {
                        const row = document.createElement('div');
                        row.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid var(--kc-border); border-radius: 12px; padding: 0.75rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;';
                        const mins = Math.max(0, Math.round(s.seconds_remaining / 60));
                        const whatsappMsg = encodeURIComponent(`Olá! Acesse a câmera ao vivo aqui: ${s.share_url}`);
                        const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMsg}`;

                        row.innerHTML = `
                            <div style="min-width: 0; flex: 1;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                    <span style="font-weight: 700; font-size: 0.88rem; color: #fff;">${escapeHtml(s.label)}</span>
                                    ${mins > 0 
                                        ? `<span style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); padding: 1px 7px; border-radius: 6px; font-weight: 600; font-size: 0.72rem;"><i class="fas fa-clock"></i> ${mins} min restantes</span>` 
                                        : `<span style="background: rgba(244, 63, 94, 0.2); color: #fb7185; border: 1px solid rgba(244,63,94,0.3); padding: 1px 7px; border-radius: 6px; font-weight: 600; font-size: 0.72rem;"><i class="fas fa-ban"></i> Expirado</span>`
                                    }
                                    <span style="color: #94a3b8; font-size: 0.72rem;">${s.view_count} visualizações</span>
                                </div>
                                <div style="margin-top: 0.4rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">
                                    ${renderSharePermissionsBadges(s)}
                                </div>
                            </div>
                            <div style="display: flex; gap: 0.4rem; flex-shrink: 0; align-items: center;">
                                <a href="${whatsappUrl}" target="_blank" class="kc-icon-btn" title="Enviar no WhatsApp" style="width: 32px; height: 32px; font-size: 0.95rem; color: #25D366; text-decoration: none; border-color: rgba(37, 211, 102, 0.35); background: rgba(37, 211, 102, 0.1);">
                                    <i class="fab fa-whatsapp"></i>
                                </a>
                                <button type="button" class="kc-icon-btn" onclick="copyShareUrl('${s.share_url}')" title="Copiar Link" style="width: 32px; height: 32px; font-size: 0.85rem;">
                                    <i class="fas fa-copy"></i>
                                </button>
                                <button type="button" class="kc-icon-btn" onclick='editSharePermissions(${JSON.stringify(s)}, ${camId})' title="Editar Permissões do Link" style="width: 32px; height: 32px; font-size: 0.85rem; color: var(--kc-gold); border-color: rgba(245,158,11,0.35); background: rgba(245,158,11,0.08);">
                                    <i class="fas fa-sliders-h"></i>
                                </button>
                                <button type="button" class="kc-icon-btn" onclick="revokeShareLink(${s.id}, ${camId})" title="Revogar Link" style="width: 32px; height: 32px; font-size: 0.85rem; color: var(--kc-rose); border-color: rgba(244,63,94,0.3);">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        `;
                        listEl.appendChild(row);
                    });
                } else {
                    listEl.innerHTML = `
                        <div style="text-align: center; padding: 1.5rem 1rem; color: var(--kc-text-dim);">
                            <i class="fas fa-link-slash" style="font-size: 1.8rem; margin-bottom: 0.5rem; opacity: 0.4;"></i>
                            <div style="font-size: 0.88rem; font-weight: 600; color: #fff;">Nenhum link ativo no momento</div>
                            <div style="font-size: 0.78rem; margin-top: 0.25rem;">Use o formulário acima para gerar um link com permissões personalizadas.</div>
                        </div>
                    `;
                }
            } catch (err) {
                listEl.innerHTML = '<div style="font-size: 0.8rem; color: var(--kc-rose);">Falha ao carregar links da câmera.</div>';
            }
        }

        function editSharePermissions(s, camId) {
            Swal.fire({
                title: 'Editar Permissões do Convidado',
                html: `
                    <p style="font-size: 0.85rem; color: #cbd5e1; margin-bottom: 0.75rem;">
                        Altere o que <b>${escapeHtml(s.label)}</b> tem permissão de fazer em tempo real, sem precisar mudar o link de acesso:
                    </p>
                    <div style="display: flex; flex-direction: column; gap: 0.65rem; text-align: left; background: rgba(0,0,0,0.3); padding: 0.85rem; border-radius: 9px; border: 1px solid #334155;">
                        <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: #fff;">
                            <input type="checkbox" id="swal-perm-audio" ${s.can_audio ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #f59e0b;">
                            <span>🔊 <b>Liberar Áudio ao Vivo</b></span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: #fff;">
                            <input type="checkbox" id="swal-perm-ptz" ${s.can_ptz ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #f59e0b;">
                            <span>🔄 <b>Permitir Giro 360° (Mover a Câmera)</b></span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: #fff;">
                            <input type="checkbox" id="swal-perm-light" ${s.can_light ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #f59e0b;">
                            <span>💡 <b>Lâmpada LED (Acender/Apagar)</b></span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; cursor: pointer; color: #fff;">
                            <input type="checkbox" id="swal-perm-snapshot" ${s.can_snapshot ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #f59e0b;">
                            <span>📸 <b>Tirar Fotos Instantâneas</b></span>
                        </label>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonColor: '#f59e0b',
                cancelButtonColor: '#64748b',
                confirmButtonText: '<i class="fas fa-check"></i> Salvar Permissões',
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    return {
                        can_audio: document.getElementById('swal-perm-audio').checked,
                        can_ptz: document.getElementById('swal-perm-ptz').checked,
                        can_light: document.getElementById('swal-perm-light').checked,
                        can_snapshot: document.getElementById('swal-perm-snapshot').checked
                    };
                }
            }).then(async (result) => {
                if (result.isConfirmed) {
                    try {
                        const res = await fetch(`/api/cameras/shares/${s.id}`, {
                            method: 'PUT',
                            credentials: 'include',
                            headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                            body: JSON.stringify(result.value)
                        });
                        const json = await res.json();
                        if (json.success) {
                            Swal.fire({
                                toast: true,
                                position: 'top-end',
                                icon: 'success',
                                title: 'Permissões atualizadas com sucesso!',
                                showConfirmButton: false,
                                timer: 2000
                            });
                            if (camId) loadCameraShares(camId);
                            loadTabSharesList();
                        } else {
                            Swal.fire('Erro', json.message || 'Falha ao atualizar.', 'error');
                        }
                    } catch (err) {
                        Swal.fire('Erro', 'Não foi possível atualizar as permissões.', 'error');
                    }
                }
            });
        }

        function copyShareUrl(url) {
            navigator.clipboard.writeText(url).then(() => {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Link copiado!',
                    showConfirmButton: false,
                    timer: 1800
                });
            }).catch(() => {});
        }

        async function revokeShareLink(shareId, camId) {
            const confirm = await Swal.fire({
                title: 'Revogar Link?',
                text: 'A pessoa não conseguirá mais acessar a câmera através deste link.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Sim, Revogar Agora',
                cancelButtonText: 'Cancelar'
            });

            if (!confirm.isConfirmed) return;

            try {
                const res = await fetch(`/api/cameras/shares/${shareId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (json.success) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Link revogado com sucesso!',
                        showConfirmButton: false,
                        timer: 1800
                    });
                    if (camId) loadCameraShares(camId);
                    loadTabSharesList();
                }
            } catch (err) {
                console.error(err);
            }
        }

        // ─── IA de Áudio (Web Audio API - Noise Suppression) ───────────────
        const audioNodes = {};

        function toggleAiAudio(camId) {
            const v = document.getElementById(`video-${camId}`);
            const btn = document.getElementById(`btn-ai-audio-${camId}`);
            if (!v || !btn) return;

            if (!audioNodes[camId]) {
                try {
                    const ctx = new (window.AudioContext || window.webkitAudioContext)();
                    const src = ctx.createMediaElementSource(v);

                    const hp = ctx.createBiquadFilter();
                    hp.type = 'highpass';
                    hp.frequency.value = 300;

                    const lp = ctx.createBiquadFilter();
                    lp.type = 'lowpass';
                    lp.frequency.value = 3400;

                    const comp = ctx.createDynamicsCompressor();
                    comp.threshold.value = -30;
                    comp.knee.value = 15;
                    comp.ratio.value = 8;
                    comp.attack.value = 0.003;
                    comp.release.value = 0.25;

                    src.connect(hp);
                    hp.connect(lp);
                    lp.connect(comp);
                    comp.connect(ctx.destination);

                    audioNodes[camId] = { ctx, active: true };
                    btn.classList.add('active');
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'IA Áudio Cristalino Ativado!',
                        text: 'Filtro anti-chiado e ganho de fala em tempo real.',
                        showConfirmButton: false,
                        timer: 2000
                    });
                } catch (e) {
                    console.warn(e);
                }
            } else {
                const n = audioNodes[camId];
                n.active = !n.active;
                if (n.active) {
                    n.ctx.resume();
                    btn.classList.add('active');
                } else {
                    n.ctx.suspend();
                    btn.classList.remove('active');
                }
            }
        }

        // ─── IA de Vídeo (Night Vision & Sharpness) ────────────────────────
        function toggleAiVideoNight(camId) {
            const v = document.getElementById(`video-${camId}`);
            const btn = document.getElementById(`btn-ai-night-${camId}`);
            if (!v || !btn) return;

            v.classList.toggle('ai-night-vision');
            if (v.classList.contains('ai-night-vision')) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }

        function toggleAiVideoSharp(camId) {
            const v = document.getElementById(`video-${camId}`);
            const btn = document.getElementById(`btn-ai-sharp-${camId}`);
            if (!v || !btn) return;

            v.classList.toggle('ai-sharpness');
            if (v.classList.contains('ai-sharpness')) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }

        // ─── Modo Patrulha / Carrossel ─────────────────────────────────────
        let patrolTimer = null;
        let patrolIdx = 0;

        function togglePatrolMode() {
            const btn = document.getElementById('btn-patrol-mode');
            if (patrolTimer) {
                clearInterval(patrolTimer);
                patrolTimer = null;
                btn.classList.remove('active');
                document.querySelectorAll('.kc-card').forEach(c => c.style.display = '');
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: 'Modo Patrulha Desativado',
                    showConfirmButton: false,
                    timer: 1500
                });
            } else {
                if (camerasData.length <= 1) {
                    Swal.fire('Info', 'Adicione mais de uma câmera para usar o Modo Patrulha sequencial.', 'info');
                    return;
                }
                btn.classList.add('active');
                patrolIdx = 0;
                applyPatrol();
                patrolTimer = setInterval(() => {
                    patrolIdx = (patrolIdx + 1) % camerasData.length;
                    applyPatrol();
                }, 10000);
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Modo Patrulha Ativo!',
                    text: 'Alternando câmeras a cada 10 segundos.',
                    showConfirmButton: false,
                    timer: 2000
                });
            }
        }

        function applyPatrol() {
            const target = camerasData[patrolIdx];
            document.querySelectorAll('.kc-card').forEach(c => {
                c.style.display = (c.id === `card-cam-${target.id}`) ? '' : 'none';
            });
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

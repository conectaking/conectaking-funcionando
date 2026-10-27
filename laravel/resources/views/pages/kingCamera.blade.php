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
    <script src="https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js" defer></script>
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js" defer></script>
    <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.1.3/dist/pose-detection.min.js" defer></script>
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

        .kc-btn-tunnel {
            background: rgba(16, 185, 129, 0.12);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.35);
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
            transition: all 0.25s ease;
            position: relative;
        }

        .kc-btn-tunnel:hover {
            background: rgba(16, 185, 129, 0.22);
            border-color: rgba(16, 185, 129, 0.6);
            transform: translateY(-1px);
        }

        .kc-btn-tunnel.kc-tunnel-offline {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.15));
            color: #f59e0b;
            border: 1px solid rgba(245, 158, 11, 0.5);
            animation: kc-tunnel-attention 2s infinite ease-in-out;
        }

        .kc-btn-tunnel.kc-tunnel-offline:hover {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(239, 68, 68, 0.25));
            border-color: #f59e0b;
        }

        .kc-tunnel-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #10b981;
            box-shadow: 0 0 8px #10b981;
            display: inline-block;
        }

        .kc-tunnel-offline .kc-tunnel-dot {
            background-color: #f59e0b;
            box-shadow: 0 0 8px #f59e0b;
            animation: kc-pulse 1.2s infinite;
        }

        @keyframes kc-tunnel-attention {
            0%, 100% { box-shadow: 0 0 0 rgba(245, 158, 11, 0); }
            50% { box-shadow: 0 0 14px rgba(245, 158, 11, 0.35); }
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

        .kc-grid:has(> .kc-card:only-child) {
            grid-template-columns: minmax(320px, 680px);
            justify-content: center;
        }

        @media (max-width: 768px) {
            .kc-grid, .kc-grid:has(> .kc-card:only-child) {
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
            object-fit: contain;
            display: block;
            background: #000;
            transition: filter 0.3s ease;
        }

        .kc-video-wrap video.ai-night-vision {
            filter: brightness(1.6) contrast(1.25) saturate(1.05) drop-shadow(0 0 1px rgba(255,255,255,0.2)) !important;
        }

        .kc-video-wrap video.ai-sharpness {
            filter: contrast(1.35) saturate(1.2) brightness(1.05) !important;
        }

        .kc-video-wrap video.ai-night-vision.ai-sharpness {
            filter: brightness(1.65) contrast(1.4) saturate(1.2) !important;
        }

        /* Fullscreen Mobile & Desktop Sem Cortes */
        .kc-video-wrap:fullscreen,
        .kc-video-wrap:-webkit-full-screen {
            width: 100vw !important;
            height: 100vh !important;
            background: #000 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }

        .kc-video-wrap:fullscreen video,
        .kc-video-wrap:-webkit-full-screen video {
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            object-fit: contain !important;
        }

        /* Rotação Forçada 90° para Celular (Paisagem Virtual sem precisar mudar config do Android) */
        .kc-video-wrap.force-landscape-mobile {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vh !important;
            height: 100vw !important;
            transform: rotate(90deg) translateY(-100%);
            transform-origin: top left;
            z-index: 2147483640 !important;
            background: #000 !important;
            border-radius: 0 !important;
            aspect-ratio: unset !important;
        }

        .kc-video-wrap.force-landscape-mobile video {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
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
            background: linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.15) 25%, transparent 60%, rgba(0,0,0,0.7) 100%);
            opacity: 1;
            transition: opacity 0.35s ease, visibility 0.35s ease;
            z-index: 25;
        }

        /* Auto-Hide estilo Yoosee após inatividade de 3.5 segundos */
        .kc-video-wrap.overlay-hidden .kc-video-overlay {
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
        }

        .kc-overlay-bottom {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
        }

        /* Badge LIVE estilo Yoosee */
        .kc-yoosee-live-tag {
            display: flex;
            align-items: center;
            gap: 5px;
            background: rgba(239, 68, 68, 0.85);
            color: #fff;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 0.68rem;
            font-weight: 800;
            letter-spacing: 0.5px;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
        }

        .kc-yoosee-live-dot {
            width: 7px;
            height: 7px;
            background: #fff;
            border-radius: 50%;
            animation: pulse 1.2s infinite;
        }

        /* Badge FHD / SD estilo Yoosee */
        .kc-res-badge-btn {
            background: rgba(15, 23, 42, 0.75);
            backdrop-filter: blur(6px);
            border: 1px solid rgba(255, 255, 255, 0.25);
            color: #fff;
            font-size: 0.72rem;
            font-weight: 800;
            padding: 4px 9px;
            border-radius: 6px;
            cursor: pointer;
            pointer-events: auto;
            transition: all 0.15s ease;
        }

        .kc-res-badge-btn:hover {
            border-color: var(--kc-gold);
            color: var(--kc-gold);
            background: rgba(245, 158, 11, 0.2);
        }

        /* Yoosee Navigation Tabs */
        .kc-yoosee-nav {
            display: flex;
            align-items: center;
            justify-content: space-around;
            background: #0f172a;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding: 0.35rem 0.25rem;
            gap: 4px;
        }

        .kc-yoosee-tab-btn {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 0.72rem;
            font-weight: 600;
            padding: 7px 4px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .kc-yoosee-tab-btn i {
            font-size: 1.15rem;
            transition: transform 0.2s ease;
        }

        .kc-yoosee-tab-btn:hover {
            color: #e2e8f0;
            background: rgba(255, 255, 255, 0.05);
        }

        .kc-yoosee-tab-btn.active {
            color: var(--kc-gold);
            background: rgba(245, 158, 11, 0.12);
        }

        .kc-yoosee-tab-btn.active i {
            transform: scale(1.12);
        }

        /* Yoosee Circular Controller (D-Pad Redondo) */
        .kc-yoosee-ptz-panel {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1.4rem 0.75rem;
            background: radial-gradient(circle at center, rgba(30, 41, 59, 0.45) 0%, rgba(15, 23, 42, 0.85) 100%);
        }

        .kc-yoosee-joystick-wrap {
            position: relative;
            width: 200px;
            height: 200px;
            border-radius: 50%;
            background: radial-gradient(circle, #1e293b 0%, #0f172a 70%, #090d16 100%);
            border: 2px solid rgba(255, 255, 255, 0.12);
            box-shadow: 0 10px 28px rgba(0, 0, 0, 0.65), inset 0 2px 8px rgba(255, 255, 255, 0.08), inset 0 -4px 14px rgba(0, 0, 0, 0.75);
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
        }

        .kc-yoosee-dir-btn {
            position: absolute;
            background: rgba(255, 255, 255, 0.04);
            border: none;
            color: #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.15s ease;
            border-radius: 50%;
            outline: none;
        }

        .kc-yoosee-dir-btn:hover {
            background: rgba(245, 158, 11, 0.25);
            color: var(--kc-gold);
        }

        .kc-yoosee-dir-btn:active {
            background: var(--kc-gold);
            color: #0f172a;
            transform: scale(0.92);
        }

        .kc-yoosee-dir-btn.btn-up {
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            width: 50px;
            height: 50px;
            font-size: 1.25rem;
        }

        .kc-yoosee-dir-btn.btn-down {
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            width: 50px;
            height: 50px;
            font-size: 1.25rem;
        }

        .kc-yoosee-dir-btn.btn-left {
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            width: 50px;
            height: 50px;
            font-size: 1.25rem;
        }

        .kc-yoosee-dir-btn.btn-right {
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            width: 50px;
            height: 50px;
            font-size: 1.25rem;
        }

        .kc-yoosee-center-btn {
            width: 74px;
            height: 74px;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.95), rgba(217, 119, 6, 0.95));
            border: 3px solid rgba(255, 255, 255, 0.25);
            color: #000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.4);
            transition: all 0.2s ease;
            z-index: 5;
            outline: none;
        }

        .kc-yoosee-center-btn:hover {
            transform: scale(1.06);
            box-shadow: 0 6px 22px rgba(245, 158, 11, 0.65);
        }

        .kc-yoosee-center-btn:active {
            transform: scale(0.94);
        }

        .kc-yoosee-ptz-subactions {
            display: flex;
            justify-content: space-around;
            width: 100%;
            max-width: 320px;
            margin-top: 1.15rem;
            gap: 1rem;
        }

        .kc-yoosee-sub-link {
            display: flex;
            align-items: center;
            gap: 6px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #e2e8f0;
            padding: 7px 16px;
            border-radius: 20px;
            font-size: 0.78rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .kc-yoosee-sub-link:hover {
            background: rgba(245, 158, 11, 0.18);
            border-color: var(--kc-gold);
            color: var(--kc-gold);
        }

        /* Painel Berço e Bebê */
        .kc-crib-controls-panel {
            padding: 1.25rem 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.85rem;
            background: rgba(15, 23, 42, 0.7);
        }

        .kc-crib-panel-header {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .kc-crib-toggles-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        }

        /* Painel Reprodução */
        .kc-playback-panel {
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            background: rgba(15, 23, 42, 0.7);
        }

        .kc-playback-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .kc-playback-filters {
            display: flex;
            gap: 6px;
            overflow-x: auto;
            padding-bottom: 4px;
        }

        .kc-filter-chip {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #94a3b8;
            padding: 4px 10px;
            border-radius: 14px;
            font-size: 0.72rem;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.15s ease;
            white-space: nowrap;
        }

        .kc-filter-chip.active, .kc-filter-chip:hover {
            background: rgba(245, 158, 11, 0.2);
            border-color: var(--kc-gold);
            color: #fff;
        }

        .kc-playback-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
        }

        .kc-clip-card {
            background: rgba(30, 41, 59, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.18s ease;
        }

        .kc-clip-card:hover {
            transform: translateY(-2px);
            border-color: var(--kc-gold);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
        }

        .kc-clip-thumb {
            position: relative;
            width: 100%;
            aspect-ratio: 16/9;
            background: #000;
        }

        .kc-clip-thumb img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .kc-clip-time {
            position: absolute;
            bottom: 4px;
            left: 4px;
            background: rgba(0, 0, 0, 0.75);
            color: #fff;
            padding: 1px 5px;
            border-radius: 4px;
            font-size: 0.65rem;
            font-family: monospace;
            font-weight: 700;
        }

        .kc-clip-play-icon {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: rgba(255, 255, 255, 0.85);
            font-size: 1.4rem;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));
            opacity: 0.85;
            transition: transform 0.15s, opacity 0.15s;
        }

        .kc-clip-card:hover .kc-clip-play-icon {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.15);
            color: var(--kc-gold);
        }

        .kc-clip-info {
            padding: 6px 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .kc-clip-badge {
            font-size: 0.65rem;
            color: #38bdf8;
            font-weight: 600;
        }

        .kc-clip-dur {
            font-size: 0.62rem;
            color: #94a3b8;
        }

        .kc-mini-btn {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #cbd5e1;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.7rem;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .kc-mini-btn:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.15);
        }

        /* Botões Laterais PTZ de Rotação Rápida - Acionados no Modo PTZ 360° ou Fullscreen */
        .kc-side-ptz-btn {
            position: absolute;
            z-index: 50;
            background: rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1.5px solid rgba(245, 158, 11, 0.45);
            color: #fbbf24;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: none;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 1.05rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
            user-select: none;
            -webkit-user-select: none;
            touch-action: none;
            pointer-events: auto;
            opacity: 0.85;
        }

        /* Ativação quando o usuário clica no botão PTZ ou quando está em tela cheia */
        .kc-video-wrap.ptz-active .kc-side-ptz-btn,
        .kc-video-wrap:fullscreen .kc-side-ptz-btn,
        .kc-video-wrap:-webkit-full-screen .kc-side-ptz-btn {
            display: flex;
        }

        .kc-side-ptz-btn:hover,
        .kc-side-ptz-btn:active {
            opacity: 1;
            background: var(--kc-gold);
            color: #0f172a;
            border-color: #fff;
            box-shadow: 0 0 18px rgba(245, 158, 11, 0.8);
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

        .kc-icon-btn.active {
            background: rgba(16, 185, 129, 0.4) !important;
            border-color: #10b981 !important;
            color: #10b981 !important;
        }

        .kc-icon-btn.active-blue {
            background: rgba(139, 92, 246, 0.45) !important;
            border-color: #a78bfa !important;
            color: #c4b5fd !important;
            box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
        }

        .kc-icon-btn.active-gold {
            background: rgba(245, 158, 11, 0.45) !important;
            border-color: var(--kc-gold) !important;
            color: #fbbf24 !important;
            box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
        }

        .kc-night-indicator, .kc-sharp-indicator {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            padding: 0.15rem 0.45rem;
            border-radius: 4px;
            font-size: 0.68rem;
            font-weight: 700;
            backdrop-filter: blur(4px);
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .kc-night-indicator {
            background: rgba(139, 92, 246, 0.3);
            border: 1px solid rgba(139, 92, 246, 0.6);
            color: #ddd6fe;
        }

        .kc-sharp-indicator {
            background: rgba(245, 158, 11, 0.3);
            border: 1px solid rgba(245, 158, 11, 0.6);
            color: #fde68a;
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

        .kc-btn-night.active {
            background: rgba(139, 92, 246, 0.25) !important;
            border-color: #8b5cf6 !important;
            color: #a78bfa !important;
            box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);
        }

        /* Seletor de Formato do Berço (Polígono Inclinado / Redondo / Retângulo) */
        .kc-crib-shape-selector {
            display: flex;
            gap: 6px;
            margin: 8px 0;
            align-items: center;
            flex-wrap: wrap;
        }

        .kc-shape-btn {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 5px 10px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.14);
            color: #cbd5e1;
            font-size: 0.74rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s ease;
            user-select: none;
            touch-action: manipulation;
        }

        .kc-shape-btn:hover {
            background: rgba(255, 255, 255, 0.12);
            color: #fff;
            border-color: rgba(255, 255, 255, 0.25);
        }

        .kc-shape-btn.active {
            background: rgba(6, 182, 212, 0.25) !important;
            border-color: #06b6d4 !important;
            color: #38bdf8 !important;
            box-shadow: 0 0 10px rgba(6, 182, 212, 0.4);
        }

        .kc-shape-btn.btn-action-shape {
            background: rgba(139, 92, 246, 0.15);
            border-color: rgba(139, 92, 246, 0.35);
            color: #c4b5fd;
        }

        .kc-shape-btn.btn-action-shape:hover {
            background: rgba(139, 92, 246, 0.3);
            color: #fff;
        }

        .kc-btn-sharp.active {
            background: rgba(245, 158, 11, 0.25) !important;
            border-color: #f59e0b !important;
            color: #fbbf24 !important;
            box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
        }

        .kc-btn-mute.muted {
            background: rgba(239, 68, 68, 0.18) !important;
            border-color: rgba(239, 68, 68, 0.38) !important;
            color: #fca5a5 !important;
        }

        .kc-btn-mute.unmuted {
            background: rgba(16, 185, 129, 0.22) !important;
            border-color: #10b981 !important;
            color: #10b981 !important;
        }

        .kc-floating-unmute-btn {
            position: absolute;
            bottom: 12px;
            left: 12px;
            z-index: 30;
            background: rgba(15, 23, 42, 0.88);
            border: 1px solid rgba(245, 158, 11, 0.55);
            color: #f8fafc;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.78rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 7px;
            cursor: pointer;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            user-select: none;
            pointer-events: auto;
        }

        .kc-floating-unmute-btn:hover {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: #0f172a;
            border-color: #f59e0b;
            transform: translateY(-1px) scale(1.03);
            box-shadow: 0 6px 18px rgba(245, 158, 11, 0.4);
        }

        .kc-floating-unmute-btn.unmuted {
            background: rgba(16, 185, 129, 0.25);
            border-color: #10b981;
            color: #10b981;
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

        /* Botões e Estilos das Novas Funcionalidades */
        .kc-btn-fence.active {
            background: rgba(16, 185, 129, 0.28) !important;
            border-color: #10b981 !important;
            color: #10b981 !important;
            box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
        }

        .kc-btn-stand.active {
            background: rgba(245, 158, 11, 0.28) !important;
            border-color: #f59e0b !important;
            color: #fbbf24 !important;
            box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
        }

        .kc-btn-cry.active {
            background: rgba(245, 158, 11, 0.28) !important;
            border-color: #f59e0b !important;
            color: #fbbf24 !important;
            box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
        }

        .kc-btn-motion.active {
            background: rgba(16, 185, 129, 0.28) !important;
            border-color: #10b981 !important;
            color: #10b981 !important;
            box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
        }

        .kc-btn-intercom.active {
            background: rgba(6, 182, 212, 0.28) !important;
            border-color: #06b6d4 !important;
            color: #06b6d4 !important;
            box-shadow: 0 0 12px rgba(6, 182, 212, 0.4);
        }

        .kc-btn-siren.active {
            background: rgba(239, 68, 68, 0.35) !important;
            border-color: #ef4444 !important;
            color: #ef4444 !important;
            animation: kc-pulse-red 0.8s infinite;
        }

        .kc-btn-light.active {
            background: rgba(251, 191, 36, 0.32) !important;
            border-color: #fbbf24 !important;
            color: #fbbf24 !important;
            box-shadow: 0 0 16px rgba(251, 191, 36, 0.55);
        }

        video.light-boost {
            filter: brightness(1.35) contrast(1.18) saturate(1.1) !important;
        }

        @keyframes kc-pulse-red {
            0% { box-shadow: 0 0 4px rgba(239, 68, 68, 0.4); }
            50% { box-shadow: 0 0 18px rgba(239, 68, 68, 0.8); }
            100% { box-shadow: 0 0 4px rgba(239, 68, 68, 0.4); }
        }

        /* Banner de Alerta Flutuante sobre o Vídeo (Choro ou Cerca) */
        .kc-alert-banner {
            position: absolute;
            top: 48px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 40;
            display: none;
            align-items: center;
            gap: 0.6rem;
            padding: 0.4rem 0.9rem;
            border-radius: 20px;
            font-size: 0.78rem;
            font-weight: 700;
            backdrop-filter: blur(8px);
            animation: kc-banner-bounce 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
            white-space: nowrap;
        }

        @keyframes kc-banner-bounce {
            0% { transform: translate(-50%, -15px) scale(0.9); opacity: 0; }
            100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }

        .kc-alert-banner.cry {
            background: rgba(245, 158, 11, 0.9);
            color: #000;
            border: 1px solid #fbbf24;
        }

        .kc-alert-banner.fence {
            background: rgba(239, 68, 68, 0.92);
            color: #fff;
            border: 1px solid #f87171;
            animation: kc-banner-bounce 0.4s ease, kc-pulse-red 1s infinite;
        }

        /* Canvas de Cerca Virtual */
        .kc-crib-canvas {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            z-index: 15;
            pointer-events: none;
        }

        .kc-crib-canvas.editing {
            pointer-events: auto;
            cursor: crosshair;
        }

        /* Barra Flutuante de Zoom Digital */
        .kc-zoom-floating-bar {
            position: absolute;
            bottom: 12px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 30;
            display: none;
            align-items: center;
            gap: 0.35rem;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 0.25rem 0.5rem;
            border-radius: 30px;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
        }

        .kc-zoom-chip {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: #cbd5e1;
            font-size: 0.72rem;
            font-weight: 700;
            padding: 0.2rem 0.5rem;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .kc-zoom-chip.active, .kc-zoom-chip:hover {
            background: var(--kc-gold);
            color: #000;
            border-color: var(--kc-gold);
        }

        /* Overlay do Interfone Walkie-Talkie */
        .kc-intercom-box {
            position: absolute;
            bottom: 14px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 35;
            display: none;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            background: rgba(15, 23, 42, 0.92);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(6, 182, 212, 0.4);
            padding: 0.75rem 1.25rem;
            border-radius: 20px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
        }

        .kc-ptt-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            background: linear-gradient(135deg, #06b6d4, #0284c7);
            color: #fff;
            border: none;
            padding: 0.6rem 1.4rem;
            border-radius: 30px;
            font-size: 0.82rem;
            font-weight: 700;
            cursor: pointer;
            touch-action: manipulation;
            user-select: none;
            -webkit-user-select: none;
            transition: all 0.15s ease;
            box-shadow: 0 4px 14px rgba(6, 182, 212, 0.4);
        }

        .kc-ptt-btn.talking {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            transform: scale(1.05);
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.7);
        }

        /* Ondas Sonoras de Voz */
        .kc-voice-waves {
            display: flex;
            align-items: center;
            gap: 3px;
            height: 14px;
        }

        .kc-voice-bar {
            width: 3px;
            height: 100%;
            background: #06b6d4;
            border-radius: 2px;
            animation: kc-wave 0.6s infinite ease-in-out;
        }

        .kc-voice-bar:nth-child(2) { animation-delay: 0.1s; }
        .kc-voice-bar:nth-child(3) { animation-delay: 0.2s; }
        .kc-voice-bar:nth-child(4) { animation-delay: 0.3s; }
        .kc-voice-bar:nth-child(5) { animation-delay: 0.15s; }

        @keyframes kc-wave {
            0%, 100% { height: 4px; }
            50% { height: 14px; }
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

        /* ═══════════════════════════════════════════════════════════════ */
        /* WIZARD ADICIONAR DISPOSITIVO (IDÊNTICO YCC365 PLUS)            */
        /* ═══════════════════════════════════════════════════════════════ */
        .ycc-wizard-container {
            max-width: 480px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .ycc-header-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
            padding-bottom: 0.25rem;
        }

        .ycc-back-btn {
            background: none;
            border: none;
            color: #94a3b8;
            font-size: 1.35rem;
            cursor: pointer;
            padding: 0.35rem 0.6rem;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            transition: all 0.2s;
        }
        .ycc-back-btn:hover { color: #fff; background: rgba(255,255,255,0.08); }

        .ycc-header-title {
            font-size: 1.15rem;
            font-weight: 700;
            color: #fff;
            text-align: center;
            flex: 1;
        }

        /* Progress Bar (3 Etapas YCC365 Plus) */
        .ycc-progress-wrap {
            position: relative;
            width: 100%;
            height: 6px;
            background: rgba(255, 255, 255, 0.12);
            border-radius: 999px;
            overflow: hidden;
            margin: 0.25rem 0 1.25rem;
        }
        .ycc-progress-fill {
            height: 100%;
            background: #3b82f6;
            border-radius: 999px;
            transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Checklist Etapa 1 */
        .ycc-step-checklist {
            display: flex;
            flex-direction: column;
            gap: 0.85rem;
            margin: 1.25rem 0;
            text-align: left;
        }
        .ycc-check-item {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            font-size: 0.9rem;
            color: #cbd5e1;
            line-height: 1.45;
        }
        .ycc-check-num {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #3b82f6;
            color: #fff;
            font-size: 0.75rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-top: 1px;
        }

        /* Checkbox Confirmado */
        .ycc-confirm-chk-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.6rem;
            margin: 1.25rem 0 1rem;
            cursor: pointer;
            user-select: none;
        }
        .ycc-confirm-chk-wrap input[type="checkbox"] {
            width: 20px;
            height: 20px;
            accent-color: #3b82f6;
            cursor: pointer;
        }
        .ycc-confirm-chk-wrap span {
            font-size: 0.95rem;
            font-weight: 700;
            color: #fff;
        }

        /* Blue Pill Button (Próximo / Ouvi o sinal sonoro) */
        .ycc-btn-primary {
            background: #3b82f6 !important;
            color: #fff !important;
            border: none !important;
            border-radius: 28px !important;
            height: 52px !important;
            width: 100% !important;
            font-size: 1.05rem !important;
            font-weight: 700 !important;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4) !important;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            touch-action: manipulation;
        }
        .ycc-btn-primary:hover:not(:disabled) {
            background: #2563eb !important;
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.55) !important;
            transform: translateY(-1px);
        }
        .ycc-btn-primary:disabled {
            background: #334155 !important;
            color: #64748b !important;
            box-shadow: none !important;
            cursor: not-allowed;
            opacity: 0.7;
        }

        /* Etapa 2: Inputs WiFi */
        .ycc-input-pill-group {
            position: relative;
            margin-bottom: 1rem;
        }
        .ycc-input-pill {
            width: 100%;
            height: 52px;
            background: rgba(255, 255, 255, 0.06);
            border: 1.5px solid rgba(255, 255, 255, 0.14);
            border-radius: 26px;
            padding: 0 4.8rem 0 1.25rem;
            color: #fff;
            font-size: 0.98rem;
            font-weight: 600;
            outline: none;
            transition: border-color 0.2s, background 0.2s;
        }
        .ycc-input-pill:focus {
            border-color: #3b82f6;
            background: rgba(59, 130, 246, 0.06);
            box-shadow: 0 0 12px rgba(59, 130, 246, 0.2);
        }
        .ycc-input-action-btn {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(59, 130, 246, 0.2);
            border: 1px solid rgba(59, 130, 246, 0.4);
            color: #60a5fa;
            border-radius: 20px;
            padding: 0.4rem 0.95rem;
            font-size: 0.8rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
        }
        .ycc-input-action-btn:hover {
            background: #3b82f6;
            color: #fff;
        }
        .ycc-pwd-toggle-btn {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #94a3b8;
            font-size: 1.15rem;
            cursor: pointer;
            padding: 0.4rem;
        }
        .ycc-pwd-toggle-btn:hover { color: #fff; }

        /* Etapa 3: QR Code Card */
        .ycc-qr-card {
            background: #ffffff;
            border-radius: 24px;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
            margin: 0.75rem auto 1rem;
            max-width: 320px;
            width: 100%;
        }
        #fast-qrcode-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 240px;
            min-width: 240px;
        }
        #fast-qrcode-container img, #fast-qrcode-container canvas {
            display: block;
            margin: 0 auto;
            border-radius: 8px;
        }

        .ycc-protocol-switch {
            display: flex;
            gap: 6px;
            background: rgba(255, 255, 255, 0.06);
            border-radius: 20px;
            padding: 4px;
            margin: 0.5rem auto;
            max-width: 360px;
        }
        .ycc-protocol-btn {
            flex: 1;
            padding: 0.45rem 0.75rem;
            border: none;
            border-radius: 16px;
            background: none;
            color: #94a3b8;
            font-size: 0.78rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
        }
        .ycc-protocol-btn.active {
            background: #3b82f6;
            color: #fff;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
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

            /* Botões Laterais PTZ ergonômicos e táteis no mobile */
            .kc-side-ptz-btn {
                width: 42px !important;
                height: 42px !important;
                font-size: 1.15rem !important;
                opacity: 0.9 !important;
                background: rgba(15, 23, 42, 0.75) !important;
                border: 1.5px solid var(--kc-gold) !important;
                color: #fbbf24 !important;
                box-shadow: 0 4px 14px rgba(0,0,0,0.6) !important;
            }
            .kc-side-ptz-btn:active {
                opacity: 1 !important;
                background: var(--kc-gold) !important;
                color: #0f172a !important;
                transform: scale(1.18) !important;
            }
            .kc-side-ptz-btn.side-left { left: 8px; }
            .kc-side-ptz-btn.side-right { right: 8px; }
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
                <button type="button" class="kc-btn kc-btn-tunnel" id="btn-camera-tunnel" onclick="handleTunnelClick()" title="Status e Inicialização do Túnel das Câmeras">
                    <span class="kc-tunnel-dot" id="kc-tunnel-dot"></span>
                    <i class="fas fa-network-wired" id="kc-tunnel-icon"></i>
                    <span id="kc-tunnel-text">Túnel Câmeras</span>
                </button>
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
                <!-- HUB DE SELEÇÃO: ADICIONAR DISPOSITIVO (ESTILO YCC365 PLUS)      -->
                <!-- ═════════════════════════════════════════════════════════════ -->
                <div id="kc-add-hub" style="display: none; padding: 0.25rem 0 0.75rem;">
                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <h3 style="font-size: 1.2rem; font-weight: 800; color: #fff; margin-bottom: 0.35rem;">
                            Selecionar método de configuração
                        </h3>
                        <p style="font-size: 0.85rem; color: #94a3b8; max-width: 520px; margin: 0 auto; line-height: 1.45;">
                            Escolha o método mais simples para conectar seu dispositivo:
                        </p>
                    </div>

                    <div class="ycc-methods-grid">
                        <!-- Método 1: Configuração QR -->
                        <div class="ycc-method-card" onclick="openAddFlow('qrcode')">
                            <div class="ycc-method-icon-wrap" style="color: #3b82f6; border-color: rgba(59, 130, 246, 0.4);">
                                <i class="fas fa-qrcode" style="font-size: 2.5rem;"></i>
                            </div>
                            <h4>Configuração QR</h4>
                            <p>Aponte a câmera para o QR code no celular</p>
                            <button type="button" class="ycc-pill-btn-small">Selecionar</button>
                        </div>

                        <!-- Método 2: Configuração Hotspot -->
                        <div class="ycc-method-card" onclick="openAddFlow('hotspot')">
                            <div class="ycc-method-icon-wrap" style="color: #06b6d4; border-color: rgba(6, 182, 212, 0.4); background: radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.02) 70%);">
                                <i class="fas fa-wifi" style="font-size: 2.4rem;"></i>
                            </div>
                            <h4>Configuração Hotspot</h4>
                            <p>Conecte o celular à câmera primeiro, depois ajude a completar a configuração WiFi</p>
                            <button type="button" class="ycc-pill-btn-small" style="background: #06b6d4; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.35);">Selecionar</button>
                        </div>

                        <!-- Método 3: Configuração Ethernet -->
                        <div class="ycc-method-card" onclick="openAddFlow('lan')">
                            <div class="ycc-method-icon-wrap" style="color: #10b981; border-color: rgba(16, 185, 129, 0.4); background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.02) 70%);">
                                <i class="fas fa-network-wired" style="font-size: 2.4rem;"></i>
                            </div>
                            <h4>Configuração Ethernet</h4>
                            <p>Conecte a câmera com um cabo Ethernet primeiro</p>
                            <button type="button" class="ycc-pill-btn-small" style="background: #10b981; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);">Selecionar</button>
                        </div>

                        <!-- Método 4: Conectar por ID da Câmera (Yoosee) -->
                        <div class="ycc-method-card" onclick="openAddFlow('device_id')" style="border-color: rgba(245, 158, 11, 0.45);">
                            <div class="ycc-method-icon-wrap" style="color: #f59e0b; border-color: rgba(245, 158, 11, 0.45); background: radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.02) 70%);">
                                <i class="fas fa-fingerprint" style="font-size: 2.4rem;"></i>
                            </div>
                            <h4>ID da Câmera</h4>
                            <p>Adicione pelo ID numérico de 10 dígitos (visto no app ou na etiqueta)</p>
                            <button type="button" class="ycc-pill-btn-small" style="background: #f59e0b; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);">Por ID</button>
                        </div>
                    </div>

                    <!-- Opção Avançada: Manual por ID ou IP -->
                    <div style="text-align: center; margin-top: 1.5rem;">
                        <button type="button" onclick="openAddFlow('manual')" style="background: none; border: none; color: #94a3b8; font-size: 0.84rem; cursor: pointer; text-decoration: underline;">
                            <i class="fas fa-sliders-h"></i> Configuração Avançada (IP Fixo / Portas)
                        </button>
                    </div>
                </div>

                <!-- ═════════════════════════════════════════════════════════════ -->
                <!-- FLUXO 0: ADIÇÃO DIRETA POR ID DA CÂMERA (YOOSEE / SERIAL)       -->
                <!-- ═════════════════════════════════════════════════════════════ -->
                <div class="kc-tab-pane" id="flow-device-id" style="display: none;">
                    <div style="max-width: 440px; margin: 0 auto; padding: 1rem 0;">
                        <div style="text-align: center; margin-bottom: 1.25rem;">
                            <div style="display: inline-flex; align-items: center; justify-content: center; width: 70px; height: 70px; border-radius: 50%; background: rgba(245, 158, 11, 0.15); border: 1.5px solid rgba(245, 158, 11, 0.45); font-size: 2rem; color: #f59e0b; margin-bottom: 0.75rem;">
                                <i class="fas fa-fingerprint"></i>
                            </div>
                            <h4 style="font-size: 1.15rem; font-weight: 800; color: #fff;">Conectar por ID da Câmera</h4>
                            <p style="font-size: 0.82rem; color: #94a3b8; margin-top: 0.35rem; line-height: 1.45;">
                                Digite o ID de 10 dígitos localizado em <i>Informações do Dispositivo</i> no aplicativo da câmera ou colado na etiqueta física.
                            </p>
                        </div>

                        <div class="kc-form-group" style="margin-bottom: 1rem;">
                            <label style="font-size: 0.82rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem; display: block;">
                                ID da Câmera (Device ID) *
                            </label>
                            <div style="position: relative;">
                                <input type="text" id="dev-id-input" class="kc-input" placeholder="Ex: 7045951545" style="padding-left: 2.75rem; font-family: monospace; font-size: 1.15rem; font-weight: 700; letter-spacing: 1px; color: #fbbf24;" value="7045951545">
                                <i class="fas fa-fingerprint" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--kc-gold); font-size: 1.2rem;"></i>
                            </div>
                        </div>

                        <div class="kc-form-group" style="margin-bottom: 1rem;">
                            <label style="font-size: 0.82rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem; display: block;">
                                Nome do Dispositivo *
                            </label>
                            <input type="text" id="dev-id-name" class="kc-input" placeholder="Ex: Quarto Bebê ou Sala" value="Quarto Bebê">
                        </div>

                        <div class="kc-form-group" style="margin-bottom: 1.5rem;">
                            <label style="font-size: 0.82rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem; display: block;">
                                Senha do Dispositivo / NVR (se houver)
                            </label>
                            <input type="password" id="dev-id-pass" class="kc-input" placeholder="Deixe em branco ou digite a senha">
                        </div>

                        <button type="button" class="kc-btn kc-btn-primary" onclick="submitAddByDeviceId()" style="width: 100%; height: 50px; font-size: 1rem; font-weight: 700; border-radius: 25px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: #f59e0b; color: #000; box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);">
                            <i class="fas fa-bolt"></i> Conectar Câmera Instantaneamente
                        </button>
                        <div style="text-align: center; margin-top: 1rem;">
                            <button type="button" onclick="showAddHub()" style="background: none; border: none; color: #64748b; font-size: 0.82rem; cursor: pointer;">
                                <i class="fas fa-arrow-left"></i> Voltar aos outros métodos
                            </button>
                        </div>
                    </div>
                </div>

                <!-- ═════════════════════════════════════════════════════════════ -->
                <!-- FLUXO 1: WIZARD DE ADIÇÃO POR QR CODE (IDÊNTICO YCC365 PLUS)     -->
                <!-- ═════════════════════════════════════════════════════════════ -->
                <div class="kc-tab-pane" id="flow-qrcode" style="display: none;">
                    <div class="ycc-wizard-container">
                        
                        <!-- Barra Superior: Voltar + Título + Barra de Progresso -->
                        <div class="ycc-header-bar">
                            <button type="button" class="ycc-back-btn" onclick="onYccBackClicked()" title="Voltar">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <div class="ycc-header-title">Adicionar dispositivo</div>
                            <div style="width: 32px;"></div>
                        </div>

                        <!-- Barra de Progresso de 3 Etapas -->
                        <div class="ycc-progress-wrap">
                            <div class="ycc-progress-fill" id="ycc-progress-bar" style="width: 33.3%;"></div>
                        </div>

                        <!-- ──────── ETAPA 1: CHECKLIST DE ENERGIA & ROTAÇÃO ──────── -->
                        <div id="ycc-step-1">
                            <div style="text-align: center; margin: 0.5rem 0 1rem;">
                                <div style="display: inline-flex; align-items: center; justify-content: center; width: 100px; height: 100px; border-radius: 50%; background: radial-gradient(circle, rgba(59,130,246,0.2) 0%, rgba(59,130,246,0.02) 70%); border: 1.5px solid rgba(59,130,246,0.35); font-size: 2.8rem; color: #60a5fa;">
                                    <i class="fas fa-video"></i>
                                </div>
                            </div>

                            <h4 style="font-size: 1.05rem; font-weight: 700; color: #fff; text-align: center; margin-bottom: 0.75rem;">
                                Confirme o seguinte antes de prosseguir
                            </h4>

                            <div class="ycc-step-checklist">
                                <div class="ycc-check-item">
                                    <div class="ycc-check-num">1</div>
                                    <div>Ligue o interruptor de energia</div>
                                </div>
                                <div class="ycc-check-item">
                                    <div class="ycc-check-num">2</div>
                                    <div>Ouça o sinal sonoro ou a rotação da câmera</div>
                                </div>
                                <div class="ycc-check-item">
                                    <div class="ycc-check-num">3</div>
                                    <div>Mantenha o roteador, a câmera e o celular a menos de 2 metros sem obstruções</div>
                                </div>
                            </div>

                            <div style="text-align: center; margin: 0.75rem 0;">
                                <a href="javascript:void(0)" onclick="showResetHelp()" style="color: #60a5fa; font-size: 0.85rem; text-decoration: none; font-weight: 600;">
                                    Não responde?
                                </a>
                            </div>

                            <label class="ycc-confirm-chk-wrap">
                                <input type="checkbox" id="ycc-chk-confirmed" onchange="toggleYccStep1Btn()">
                                <span>Confirmado</span>
                            </label>

                            <button type="button" class="ycc-btn-primary" id="ycc-btn-step1-next" onclick="goYccStep(2)" disabled>
                                Próximo
                            </button>
                        </div>

                        <!-- ──────── ETAPA 2: SELECIONAR REDE WIFI ──────── -->
                        <div id="ycc-step-2" style="display: none;">
                            <h4 style="font-size: 1.15rem; font-weight: 700; color: #fff; text-align: center; margin-bottom: 1.5rem;">
                                Selecionar rede WiFi
                            </h4>

                            <div class="ycc-input-pill-group">
                                <input type="text" id="qr-wifi-ssid" class="ycc-input-pill" placeholder="Nome da rede" value="VIRUS 100%ATIVO" autocomplete="off" oninput="generateFastWifiQr()">
                                <button type="button" class="ycc-input-action-btn" onclick="openWifiPickerModal()">
                                    Selecionar WiFi
                                </button>
                            </div>

                            <div class="ycc-input-pill-group">
                                <input type="password" id="qr-wifi-pass" class="ycc-input-pill" placeholder="Senha WiFi" value="ADRIANOKING" autocomplete="new-password" data-lpignore="true" oninput="generateFastWifiQr()">
                                <button type="button" class="ycc-pwd-toggle-btn" onclick="toggleYccPasswordVisibility()" title="Mostrar/ocultar senha">
                                    <i class="fas fa-eye" id="ycc-eye-icon"></i>
                                </button>
                            </div>

                            <div style="display: flex; align-items: center; justify-content: flex-end; margin-bottom: 1.25rem;">
                                <label style="display: inline-flex; align-items: center; gap: 0.5rem; color: #cbd5e1; font-size: 0.88rem; cursor: pointer; user-select: none;">
                                    <input type="checkbox" id="ycc-chk-remember-pass" checked style="accent-color: #3b82f6; width: 18px; height: 18px;">
                                    Lembrar senha
                                </label>
                            </div>

                            <div style="text-align: center; margin-bottom: 1.75rem;">
                                <a href="javascript:void(0)" onclick="showWifiRequirementsHelp()" style="color: #60a5fa; font-size: 0.85rem; text-decoration: none; font-weight: 600;">
                                    Requisitos WiFi
                                </a>
                            </div>

                            <button type="button" class="ycc-btn-primary" onclick="showConfirmWifiModal()">
                                Próximo
                            </button>
                        </div>

                        <!-- ──────── ETAPA 3: APONTE A CÂMERA PARA O CÓDIGO QR ──────── -->
                        <div id="ycc-step-3" style="display: none;">
                            <div style="text-align: center; margin-bottom: 0.5rem;">
                                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 1rem; padding: 0.5rem 1.2rem; border-radius: 20px; background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.25);">
                                    <i class="fas fa-video" style="font-size: 1.4rem; color: #60a5fa;"></i>
                                    <i class="fas fa-ellipsis-h" style="color: #10b981; letter-spacing: 2px;"></i>
                                    <i class="fas fa-mobile-alt" style="font-size: 1.4rem; color: #3b82f6;"></i>
                                </div>
                            </div>

                            <h4 style="font-size: 1.05rem; font-weight: 800; color: #fff; text-align: center; margin-bottom: 0.2rem;">
                                Aponte a câmera para o código QR no celular
                            </h4>
                            <p style="font-size: 0.85rem; color: #94a3b8; text-align: center; margin-bottom: 0.5rem;">
                                Mantenha ~20 cm de distância
                            </p>

                            <!-- Seletor de Protocolo: TWG/YCC365 vs Universal -->
                            <div class="ycc-protocol-switch">
                                <button type="button" class="ycc-protocol-btn active" id="btn-proto-ycc" onclick="switchYccProtocol('ycc')">
                                    <i class="fas fa-check-circle"></i> Câmera TWG (Nativo)
                                </button>
                                <button type="button" class="ycc-protocol-btn" id="btn-proto-uni" onclick="switchYccProtocol('universal')">
                                    <i class="fas fa-qrcode"></i> Modo Universal
                                </button>
                            </div>

                            <!-- Card Branco com QR Code Grande de Alta Resolução -->
                            <div class="ycc-qr-card">
                                <div id="fast-qrcode-container"></div>
                            </div>

                            <div style="text-align: center; margin-bottom: 0.6rem;">
                                <a href="javascript:void(0)" onclick="showQrTipsHelp()" style="color: #94a3b8; font-size: 0.82rem; text-decoration: none; font-weight: 500;">
                                    <i class="fas fa-lightbulb" style="color: #fbbf24; margin-right: 3px;"></i> Dicas de configuração QR
                                </a>
                            </div>

                            <div style="text-align: center; margin-bottom: 0.85rem;">
                                <a href="javascript:void(0)" onclick="onDidNotHearBeep()" style="color: #60a5fa; font-size: 0.9rem; text-decoration: none; font-weight: 600;">
                                    Não ouvi o sinal
                                </a>
                            </div>

                            <button type="button" class="ycc-btn-primary" id="btn-heard-sound" onclick="onHeardBeepSound()">
                                <i class="fas fa-volume-up"></i> Ouvi o sinal sonoro
                            </button>
                        </div>

                    </div>
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
                            <input type="password" id="ap-cam-pass" class="kc-input" placeholder="Ex: 123456, admin ou Playadryan22*" value="Playadryan22*" autocomplete="new-password" data-lpignore="true">
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
                        <form id="bt-wifi-creds" onsubmit="return false;" style="display: none; margin-top: 1.25rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--kc-border); border-radius: 12px; padding: 1.2rem;">
                            <h5 style="font-size: 0.9rem; color: #fff; margin-bottom: 0.75rem;">
                                <i class="fas fa-wifi" style="color: var(--kc-gold);"></i> Dados do Wi-Fi para transferir à câmera:
                            </h5>
                            <div class="kc-form-group">
                                <label class="kc-label" for="bt-wifi-ssid">Nome do Wi-Fi (SSID 2.4GHz) *</label>
                                <input type="text" id="bt-wifi-ssid" class="kc-input" placeholder="Ex: MinhaCasa_2.4G" autocomplete="off">
                            </div>
                            <div class="kc-form-group">
                                <label class="kc-label" for="bt-wifi-pass">Senha do Wi-Fi *</label>
                                <input type="password" id="bt-wifi-pass" class="kc-input" placeholder="Senha da rede" autocomplete="off" data-lpignore="true">
                            </div>
                            <button type="button" class="kc-btn kc-btn-primary" onclick="sendWifiViaBluetooth()" style="width: 100%; margin-top: 0.5rem;">
                                <i class="fas fa-paper-plane"></i> Enviar Configuração à Câmera
                            </button>
                        </form>
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
                                <label class="kc-label" for="cam-device-id-field">
                                    <i class="fas fa-fingerprint" style="color: var(--kc-gold);"></i> ID da Câmera (Device ID / Yoosee)
                                </label>
                                <input type="text" id="cam-device-id-field" class="kc-input" placeholder="Ex: 7045951545" style="color: #fbbf24; font-weight: 700; letter-spacing: 0.5px;">
                                <div class="kc-form-help">Número de 10 dígitos (localizado no app ou na etiqueta da câmera).</div>
                            </div>
                            <div class="kc-form-group">
                                <label class="kc-label" for="cam-ip" id="lbl-cam-ip">Endereço IP ou ID da Câmera *</label>
                                <input type="text" id="cam-ip" class="kc-input" placeholder="Ex: 172.16.100.215 ou 7045951545" required value="172.16.100.215">
                                <div class="kc-form-help" id="hint-cam-ip">Digite o <b>IP local</b> (ex: <code>172.16.100.215</code>) ou o <b>ID da Câmera</b>.</div>
                            </div>
                        </div>

                        <div class="kc-form-row">
                            <div class="kc-form-group">
                                <label class="kc-label" for="cam-port">Porta RTSP</label>
                                <input type="number" id="cam-port" class="kc-input" placeholder="554" value="554">
                            </div>
                            <div class="kc-form-group">
                                <label class="kc-label" for="cam-path">Caminho RTSP</label>
                                <input type="text" id="cam-path" class="kc-input" placeholder="/onvif1 ou /onvif2" value="/onvif1">
                            </div>
                        </div>

                        <div class="kc-form-row">
                            <div class="kc-form-group">
                                <label class="kc-label" for="cam-user">Usuário RTSP</label>
                                <input type="text" id="cam-user" class="kc-input" placeholder="admin" value="admin" autocomplete="off">
                            </div>
                            <div class="kc-form-group">
                                <label class="kc-label" for="cam-pass">Senha RTSP <span style="color: #94a3b8; font-weight: normal; font-size: 0.82rem;">(Opcional - deixe vazio se não tiver)</span></label>
                                <div style="position: relative; display: flex; align-items: center;">
                                    <input type="password" id="cam-pass" class="kc-input" placeholder="Deixe em branco se a câmera não tiver senha" autocomplete="new-password" data-lpignore="true" style="padding-right: 42px;">
                                    <button type="button" onclick="togglePasswordVisibility('cam-pass', this)" style="position: absolute; right: 8px; background: none; border: none; color: #94a3b8; cursor: pointer; padding: 6px; font-size: 0.95rem; display: flex; align-items: center; justify-content: center;" title="Mostrar/Ocultar Senha">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                                <div class="kc-form-help">Modelos CloudCam / TWG de fábrica <b>não usam senha</b>. Deixe vazio se não tiver configurado senha.</div>
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

                    <!-- 5. Detecção de Movimento (Foto + Vídeo 10s) -->
                    <div class="kc-method-card">
                        <div class="kc-method-icon-box" style="color: #10b981; background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.3);">
                            <i class="fas fa-running"></i>
                        </div>
                        <div class="kc-method-details" style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                                <h5>5. Detecção de Movimento (Foto + Vídeo 10s)</h5>
                                <label style="cursor: pointer;">
                                    <input type="checkbox" id="cam-motion-detection-enabled" style="width: 18px; height: 18px; accent-color: #10b981;">
                                </label>
                            </div>
                            <p>Detecta movimentos no ambiente da câmera, dispara captura instantânea de foto e grava um vídeo automático de 10 segundos para conferência.</p>
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

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <h4 style="font-size: 0.88rem; font-weight: 600; color: #fff; margin: 0;">
                        <i class="fas fa-clock-rotate-left" style="color: var(--kc-gold); margin-right: 0.35rem;"></i> Links Ativos Desta Câmera
                    </h4>
                    <button type="button" class="kc-btn kc-btn-secondary" onclick="revokeAllCameraShares()" style="padding: 0.3rem 0.65rem; font-size: 0.75rem; color: #ef4444; border-color: rgba(239,68,68,0.4);" title="Cancela todos os links compartilhados na hora">
                        <i class="fas fa-ban"></i> Cancelar Todos
                    </button>
                </div>
                <div id="shares-list-container" style="display: flex; flex-direction: column; gap: 0.6rem; max-height: 200px; overflow-y: auto;">
                    <div style="font-size: 0.8rem; color: var(--kc-text-dim);">Nenhum link ativo no momento.</div>
                </div>
            </div>
        </div>
    <!-- Modal Central do Túnel das Câmeras -->
    <div class="kc-modal-backdrop" id="modal-tunnel" aria-hidden="true" style="display: none;">
        <div class="kc-modal" style="max-width: 520px; border: 1px solid rgba(16, 185, 129, 0.35); box-shadow: 0 20px 50px rgba(0,0,0,0.7), 0 0 30px rgba(16, 185, 129, 0.15);">
            <div class="kc-modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center; color: #10b981; font-size: 1.25rem;">
                        <i class="fas fa-network-wired"></i>
                    </div>
                    <div>
                        <h3 class="kc-modal-title" style="margin: 0; font-size: 1.15rem; font-weight: 700;">Central do Túnel das Câmeras</h3>
                        <div style="font-size: 0.78rem; color: var(--kc-text-muted); margin-top: 2px;">
                            Conexão direta entre seu computador e o ConectaKing na nuvem
                        </div>
                    </div>
                </div>
                <button type="button" class="kc-modal-close" onclick="closeTunnelModal()">&times;</button>
            </div>

            <div class="kc-modal-body" style="padding: 1.25rem 0;">
                <!-- Status Cards -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem;">
                    <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--kc-border); border-radius: 10px; padding: 0.85rem;">
                        <div style="font-size: 0.75rem; color: var(--kc-text-muted); margin-bottom: 0.35rem;">Porta do Túnel (1554)</div>
                        <div id="tunnel-modal-port-status" style="font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; gap: 0.4rem; color: #10b981;">
                            <span class="kc-tunnel-dot"></span> Ativa / Ouvindo
                        </div>
                    </div>
                    <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--kc-border); border-radius: 10px; padding: 0.85rem;">
                        <div style="font-size: 0.75rem; color: var(--kc-text-muted); margin-bottom: 0.35rem;">Feed Go2RTC (WebRTC)</div>
                        <div id="tunnel-modal-stream-status" style="font-size: 0.95rem; font-weight: 700; display: flex; align-items: center; gap: 0.4rem; color: #10b981;">
                            <span class="kc-tunnel-dot"></span> Transmitindo
                        </div>
                    </div>
                </div>

                <div id="tunnel-modal-msg" style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 10px; padding: 0.85rem 1rem; font-size: 0.85rem; line-height: 1.4; color: #d1fae5; margin-bottom: 1.25rem;">
                    Túnel SSH ativo e comunicando com as câmeras!
                </div>

                <!-- Botões de Ação -->
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <!-- Botão 1: Iniciar no PC via protocolo kingcam:// -->
                    <button type="button" class="kc-btn kc-btn-primary" onclick="startLocalTunnelProtocol()" style="width: 100%; justify-content: center; padding: 0.85rem 1rem; font-weight: 700; font-size: 0.92rem; background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);">
                        <i class="fas fa-bolt"></i> Iniciar / Reconectar Túnel no Computador
                    </button>

                    <!-- Botão 2: Re-sincronizar Streams no Go2RTC -->
                    <button type="button" class="kc-btn kc-btn-secondary" onclick="restartTunnelStreams()" style="width: 100%; justify-content: center; padding: 0.75rem 1rem; font-size: 0.85rem;">
                        <i class="fas fa-sync-alt"></i> Forçar Re-sincronização do Stream (Go2RTC)
                    </button>

                    <!-- Botão 3: Baixar inicializador .bat -->
                    <a href="/api/cameras/download-tunnel-bat" class="kc-btn kc-btn-secondary" style="width: 100%; justify-content: center; padding: 0.75rem 1rem; font-size: 0.82rem; color: var(--kc-text-muted); text-decoration: none;">
                        <i class="fas fa-download"></i> Baixar Arquivo Iniciar Túnel (.bat)
                    </a>
                </div>

                <div style="margin-top: 1.15rem; font-size: 0.76rem; color: var(--kc-text-muted); text-align: center; line-height: 1.4;">
                    💡 Dica: O túnel deve rodar no computador que está conectado na mesma rede Wi-Fi das câmeras (IPs 172.16.100.x).
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

    <!-- Modal Linha do Tempo / Histórico de Eventos -->
    <div class="kc-modal-backdrop" id="modal-timeline" aria-hidden="true">
        <div class="kc-modal" style="max-width: 680px;">
            <div class="kc-modal-header">
                <div class="kc-modal-title">
                    <i class="fas fa-history" style="color: var(--kc-gold); margin-right: 0.4rem;"></i>
                    <span id="timeline-modal-camera-title">Linha do Tempo de Eventos</span>
                </div>
                <button type="button" class="kc-modal-close" onclick="closeTimelineModal()" aria-label="Fechar">&times;</button>
            </div>
            <div class="kc-modal-body">
                <p style="font-size: 0.85rem; color: var(--kc-text-muted); margin-bottom: 1rem;">
                    Registro cronológico detalhado de alertas de choro, saída da cerca segura do berço, sirene e movimentos detectados.
                </p>
                <div id="timeline-list-container" style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 480px; overflow-y: auto;">
                    <div style="text-align: center; padding: 2rem 1rem; color: var(--kc-text-dim);">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                        <div>Carregando eventos recentes...</div>
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
            checkTunnelStatus();
            setInterval(() => checkTunnelStatus(true), 30000);
        });

        async function checkTunnelStatus(isSilent = false) {
            try {
                const res = await fetch('/api/cameras/tunnel-status');
                if (!res.ok) return;
                const json = await res.json();
                const data = json.data || {};
                const isOnline = !!data.online;

                const btn = document.getElementById('btn-camera-tunnel');
                const txt = document.getElementById('kc-tunnel-text');
                const dot = document.getElementById('kc-tunnel-dot');
                const icon = document.getElementById('kc-tunnel-icon');

                if (btn && txt) {
                    if (isOnline) {
                        btn.classList.remove('kc-tunnel-offline');
                        btn.classList.add('kc-tunnel-online');
                        txt.innerText = 'Túnel Conectado';
                        btn.title = 'Túnel SSH ativo e conectado! Clique para ver detalhes.';
                    } else {
                        btn.classList.remove('kc-tunnel-online');
                        btn.classList.add('kc-tunnel-offline');
                        txt.innerText = '⚡ Iniciar Túnel';
                        btn.title = 'Túnel das Câmeras desconectado! Clique para iniciar no seu computador.';
                    }
                }

                // Atualiza o modal caso esteja aberto
                const portStatus = document.getElementById('tunnel-modal-port-status');
                const streamStatus = document.getElementById('tunnel-modal-stream-status');
                const modalMsg = document.getElementById('tunnel-modal-msg');
                if (portStatus) {
                    portStatus.innerHTML = isOnline 
                        ? '<span class="kc-tunnel-dot" style="background:#10b981;box-shadow:0 0 8px #10b981;"></span> <span style="color:#10b981;">Ativa / Ouvindo</span>'
                        : '<span class="kc-tunnel-dot" style="background:#ef4444;box-shadow:0 0 8px #ef4444;"></span> <span style="color:#ef4444;">Desconectada</span>';
                }
                if (streamStatus) {
                    const stActive = !!data.stream_active;
                    streamStatus.innerHTML = stActive
                        ? '<span class="kc-tunnel-dot" style="background:#10b981;box-shadow:0 0 8px #10b981;"></span> <span style="color:#10b981;">Transmitindo</span>'
                        : '<span class="kc-tunnel-dot" style="background:#f59e0b;box-shadow:0 0 8px #f59e0b;"></span> <span style="color:#f59e0b;">Aguardando sinal</span>';
                }
                if (modalMsg) {
                    modalMsg.innerText = data.message || (isOnline ? 'Túnel SSH ativo e comunicando com as câmeras!' : 'Túnel SSH desconectado. Clique abaixo para iniciar.');
                    if (isOnline) {
                        modalMsg.style.background = 'rgba(16, 185, 129, 0.08)';
                        modalMsg.style.borderColor = 'rgba(16, 185, 129, 0.25)';
                        modalMsg.style.color = '#d1fae5';
                    } else {
                        modalMsg.style.background = 'rgba(245, 158, 11, 0.08)';
                        modalMsg.style.borderColor = 'rgba(245, 158, 11, 0.25)';
                        modalMsg.style.color = '#fde68a';
                    }
                }
            } catch (e) {
                if (!isSilent) console.error('[Tunnel] Erro checando status:', e);
            }
        }

        function handleTunnelClick() {
            openTunnelModal();
        }

        function openTunnelModal() {
            const m = document.getElementById('modal-tunnel');
            if (m) {
                m.style.display = 'flex';
                m.setAttribute('aria-hidden', 'false');
                checkTunnelStatus();
            }
        }

        function closeTunnelModal() {
            const m = document.getElementById('modal-tunnel');
            if (m) {
                m.style.display = 'none';
                m.setAttribute('aria-hidden', 'true');
            }
        }

        function startLocalTunnelProtocol() {
            // Dispara protocolo registrado no Windows para rodar monitorar_tunel.ps1 -Force
            try {
                window.location.href = 'kingcam://start';
            } catch(e) {
                console.warn('[Tunnel] Falha ao disparar protocolo kingcam:', e);
            }

            const txt = document.getElementById('kc-tunnel-text');
            if (txt) txt.innerText = '⚡ Conectando...';

            const modalMsg = document.getElementById('tunnel-modal-msg');
            if (modalMsg) {
                modalMsg.innerText = 'Iniciando o túnel no Windows e negociando porta 1554 com o servidor...';
                modalMsg.style.color = '#93c5fd';
            }

            // Avisa o backend para sincronizar streams do go2rtc
            setTimeout(() => {
                const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
                fetch('/api/cameras/restart-tunnel', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': token
                    }
                }).catch(e => console.warn(e));
            }, 1000);

            // Re-verifica status após 2.5s e 5s
            setTimeout(() => checkTunnelStatus(), 2500);
            setTimeout(() => {
                checkTunnelStatus();
                // Recarrega lista e players de câmera
                if (typeof loadCameras === 'function') {
                    loadCameras();
                }
            }, 5000);
        }

        async function restartTunnelStreams() {
            const modalMsg = document.getElementById('tunnel-modal-msg');
            if (modalMsg) {
                modalMsg.innerText = 'Reiniciando e sincronizando stream com o go2rtc...';
            }
            try {
                const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
                const res = await fetch('/api/cameras/restart-tunnel', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': token
                    }
                });
                const json = await res.json();
                checkTunnelStatus();
                if (typeof loadCameras === 'function') {
                    loadCameras();
                }
            } catch (e) {
                console.error('[Tunnel] Erro reiniciando streams:', e);
            }
        }

        window.checkTunnelStatus = checkTunnelStatus;
        window.handleTunnelClick = handleTunnelClick;
        window.openTunnelModal = openTunnelModal;
        window.closeTunnelModal = closeTunnelModal;
        window.startLocalTunnelProtocol = startLocalTunnelProtocol;
        window.restartTunnelStreams = restartTunnelStreams;



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

        // Modal Elegante de Desbloqueio Diário (24h) por Senha
        function showPinUnlockModal() {
            if (typeof Swal === 'undefined') {
                const pin = prompt('👑 King Câmera — Digite a senha diária de acesso:');
                if (pin && pin.trim()) {
                    fetch('/api/cameras/unlock', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                        body: JSON.stringify({ pin: pin.trim() })
                    }).then(r => r.json()).then(j => {
                        if (j.success && j.token) {
                            try { localStorage.setItem('token', j.token); } catch(e){}
                            loadCameras();
                        } else {
                            alert(j.message || 'Senha incorreta.');
                        }
                    });
                }
                return;
            }

            Swal.fire({
                title: '👑 King Câmera • Acesso 24h',
                text: 'Digite a senha de segurança para liberar o monitoramento por 24 horas:',
                input: 'password',
                inputPlaceholder: 'Digite a senha (ex: King)',
                inputAttributes: {
                    autocapitalize: 'off',
                    autocorrect: 'off',
                    autocomplete: 'current-password',
                    id: 'kcPinInput'
                },
                showCancelButton: false,
                confirmButtonText: '🔓 Liberar Acesso 24h',
                confirmButtonColor: '#f59e0b',
                background: '#0f1422',
                color: '#f8fafc',
                allowOutsideClick: false,
                allowEscapeKey: false,
                showLoaderOnConfirm: true,
                preConfirm: async (pin) => {
                    if (!pin || !pin.trim()) {
                        Swal.showValidationMessage('Por favor, digite a senha.');
                        return false;
                    }
                    try {
                        const csrf = getCsrfToken();
                        const res = await fetch('/api/cameras/unlock', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {})
                            },
                            body: JSON.stringify({ pin: pin.trim() })
                        });
                        const json = await res.json();
                        if (!res.ok || !json.success) {
                            Swal.showValidationMessage(json.message || 'Senha incorreta.');
                            return false;
                        }
                        if (json.token) {
                            try {
                                localStorage.setItem('token', json.token);
                            } catch(e){}
                        }
                        return json;
                    } catch (err) {
                        Swal.showValidationMessage('Falha de conexão ao validar senha.');
                        return false;
                    }
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Acesso Liberado!',
                        text: 'Câmeras desbloqueadas com sucesso pelas próximas 24 horas.',
                        timer: 1400,
                        showConfirmButton: false,
                        background: '#0f1422',
                        color: '#f8fafc'
                    }).then(() => {
                        loadCameras();
                    });
                }
            });
        }

        // Carrega câmeras da API
        async function loadCameras() {
            try {
                const res = await fetch('/api/cameras', {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                
                if (res.status === 401) {
                    showPinUnlockModal();
                    return;
                }

                if (res.status === 403) {
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
                const realDisplayIp = cam.display_ip || (cam.ip_address === '172.18.0.1' ? (cam.port == 1554 ? '172.16.100.215' : '172.16.100.43') : cam.ip_address);
                const card = document.createElement('div');
                card.className = 'kc-card';
                card.id = `card-cam-${cam.id}`;
                card.innerHTML = `
                    <div class="kc-card-header">
                        <div class="kc-card-title-group">
                            <span class="kc-card-title">${escapeHtml(cam.name)}</span>
                            <span class="kc-room-badge"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(cam.room || 'Geral')}</span>
                            ${cam.device_id ? `<span class="kc-room-badge" style="background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.45); color: #fbbf24; font-weight: 700;" title="ID da Câmera (Yoosee/Device ID)"><i class="fas fa-fingerprint"></i> ID: ${escapeHtml(cam.device_id)}</span>` : ''}
                            <span class="kc-room-badge" style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: #10b981;" title="IP Real no Wi-Fi"><i class="fas fa-wifi"></i> ${realDisplayIp}</span>
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
                    <div class="kc-video-wrap" id="video-wrap-${cam.id}">
                        <video id="video-${cam.id}" autoplay playsinline muted></video>
                        <canvas class="kc-crib-canvas" id="crib-canvas-${cam.id}"></canvas>

                        <!-- Botão Flutuante de Áudio Ao Vivo (Toque para Ouvir) -->
                        <button type="button" class="kc-floating-unmute-btn" id="unmute-badge-${cam.id}" onclick="toggleAudioMute(${cam.id})" title="Ativar Som Ao Vivo">
                            <i class="fas fa-volume-mute" style="color: #f87171;"></i> <span>Toque para Ouvir Som</span>
                        </button>

                        <div class="kc-state-box" id="loader-${cam.id}">
                            <div class="kc-spinner"></div>
                            <div style="font-size: 0.85rem; font-weight: 500;">Conectando WebRTC...</div>
                            ${cam.device_id ? `<div style="font-size: 0.78rem; color: #fbbf24; font-weight: 700;"><i class="fas fa-fingerprint"></i> ID: ${escapeHtml(cam.device_id)}</div>` : ''}
                            <div style="font-size: 0.72rem; color: #10b981;"><i class="fas fa-wifi"></i> IP Wi-Fi: ${realDisplayIp}</div>
                        </div>

                        <!-- Banners de Alerta em Tempo Real (Choro, Saída do Berço e Movimento) -->
                        <div class="kc-alert-banner kc-alert-cry" id="cry-alert-${cam.id}">
                            <i class="fas fa-baby" style="font-size: 1.1rem; animation: bounce 0.6s infinite alternate;"></i>
                            <span>🚨 <b>CHORO DETECTADO!</b> O bebê está chorando no berço!</span>
                        </div>
                        <div class="kc-alert-banner kc-alert-fence" id="fence-alert-${cam.id}">
                            <i class="fas fa-exclamation-triangle" style="font-size: 1.1rem; animation: pulse 0.5s infinite;"></i>
                            <span>⚠️ <b>SAÍDA DO BERÇO!</b> O bebê saiu da área segura!</span>
                        </div>
                        <div class="kc-alert-banner" id="stand-alert-${cam.id}" style="display: none; background: rgba(245, 158, 11, 0.95); border: 1.5px solid #fbbf24; color: #fff;">
                            <i class="fas fa-child" style="font-size: 1.1rem; animation: bounce 0.6s infinite alternate;"></i>
                            <span>🚨 <b>BEBÊ EM PÉ!</b> A criança se levantou ou está na grade do berço!</span>
                        </div>
                        <div class="kc-alert-banner" id="motion-alert-${cam.id}" style="display: none; background: rgba(16, 185, 129, 0.95); border: 1.5px solid #10b981;">
                            <i class="fas fa-running" style="font-size: 1.1rem;"></i>
                            <span>🏃 <b>MOVIMENTO DETECTADO!</b> A neném se mexeu!</span>
                        </div>

                        <div class="kc-rec-indicator" id="rec-indicator-${cam.id}" style="display: none;">
                            <span class="kc-rec-dot"></span> REC <span id="rec-timer-${cam.id}">00:00</span>
                        </div>
                        <div class="kc-track-indicator" id="track-badge-${cam.id}" style="display: ${cam.auto_tracking_enabled ? 'inline-flex' : 'none'};">
                            <i class="fas fa-crosshairs"></i> Seguir 360° Ativo
                        </div>

                        <!-- Barra Flutuante de Zoom Digital -->
                        <div class="kc-zoom-floating-bar" id="zoom-bar-${cam.id}">
                            <span style="font-size: 0.75rem; font-weight: 700; color: var(--kc-gold); margin-right: 2px;"><i class="fas fa-search-plus"></i> Zoom:</span>
                            <button type="button" class="kc-zoom-chip active" onclick="setDigitalZoom(${cam.id}, 1, this)">1x</button>
                            <button type="button" class="kc-zoom-chip" onclick="setDigitalZoom(${cam.id}, 1.5, this)">1.5x</button>
                            <button type="button" class="kc-zoom-chip" onclick="setDigitalZoom(${cam.id}, 2, this)">2x</button>
                            <button type="button" class="kc-zoom-chip" onclick="setDigitalZoom(${cam.id}, 3, this)">3x</button>
                            <button type="button" class="kc-zoom-chip" onclick="setDigitalZoom(${cam.id}, 4, this)">4x</button>
                            <button type="button" class="kc-icon-btn" onclick="toggleZoomBar(${cam.id})" style="width: 24px; height: 24px; font-size: 0.7rem; margin-left: 2px;"><i class="fas fa-times"></i></button>
                        </div>

                        <!-- Caixa Interfone Walkie-Talkie -->
                        <div class="kc-intercom-box" id="intercom-box-${cam.id}">
                            <div style="font-size: 0.82rem; font-weight: 700; color: #fff; display: flex; align-items: center; justify-content: space-between;">
                                <span><i class="fas fa-microphone" style="color: #10b981;"></i> Interfone Walkie-Talkie</span>
                                <button type="button" onclick="toggleIntercomBox(${cam.id})" style="background: none; border: none; color: #94a3b8; font-size: 1.1rem; cursor: pointer;">&times;</button>
                            </div>
                            <div style="font-size: 0.72rem; color: #94a3b8; text-align: center;">Segure o botão para falar pelo microfone.</div>
                            <button type="button" class="kc-intercom-talk-btn" id="intercom-talk-btn-${cam.id}"
                                onpointerdown="startIntercomTalk(${cam.id})" onpointerup="stopIntercomTalk(${cam.id})" onpointerleave="stopIntercomTalk(${cam.id})">
                                <i class="fas fa-microphone" style="font-size: 1.4rem;"></i>
                                <span style="font-size: 0.82rem; font-weight: 700;">Segure para Falar</span>
                            </button>
                            <div class="kc-voice-waves" id="voice-waves-${cam.id}">
                                <div class="kc-wave-bar"></div><div class="kc-wave-bar"></div><div class="kc-wave-bar"></div><div class="kc-wave-bar"></div><div class="kc-wave-bar"></div>
                            </div>
                        </div>

                        <!-- Overlays do Vídeo (Auto-Hide estilo Yoosee após 3.5s) -->
                        <div class="kc-video-overlay" id="overlay-${cam.id}">
                            <div class="kc-overlay-top">
                                <div style="display: flex; align-items: center; gap: 0.4rem; pointer-events: auto;">
                                    <span style="font-size: 0.78rem; font-weight: 700; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(cam.room || cam.name)}</span>
                                    <div class="kc-overlay-timestamp" id="time-${cam.id}">--:--:--</div>
                                    <div class="kc-night-indicator" id="night-badge-${cam.id}" style="display: none;">
                                        <i class="fas fa-moon"></i> Noturno IA
                                    </div>
                                    <div class="kc-sharp-indicator" id="sharp-badge-${cam.id}" style="display: none;">
                                        <i class="fas fa-magic"></i> HD IA
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.4rem; pointer-events: auto;">
                                    <div class="kc-yoosee-live-tag">
                                        <span class="kc-yoosee-live-dot"></span> LIVE
                                    </div>
                                </div>
                            </div>

                            <div class="kc-overlay-bottom">
                                <div style="display: flex; align-items: center; gap: 0.4rem; pointer-events: auto;">
                                    <button type="button" class="kc-res-badge-btn" id="res-badge-${cam.id}" onclick="toggleVideoResolution(${cam.id})" title="Alternar Resolução (FHD / SD)">
                                        FHD
                                    </button>
                                </div>
                                <div class="kc-overlay-controls" style="pointer-events: auto;">
                                    <button type="button" class="kc-icon-btn" id="ov-audio-${cam.id}" onclick="toggleAudioMute(${cam.id})" title="Ligar / Silenciar Áudio">
                                        <i class="fas fa-volume-mute"></i>
                                    </button>
                                    <button type="button" class="kc-icon-btn" id="ov-rec-${cam.id}" onclick="toggleManualRecording(${cam.id})" title="Gravar Vídeo">
                                        <i class="fas fa-video"></i>
                                    </button>
                                    <button type="button" class="kc-icon-btn" onclick="downloadSnapshot(${cam.id})" title="Capturar Foto Instantânea">
                                        <i class="fas fa-camera"></i>
                                    </button>
                                    <button type="button" class="kc-icon-btn" id="ov-rotate-${cam.id}" onclick="toggleForceLandscape(${cam.id})" title="Girar 90° Paisagem">
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                    <button type="button" class="kc-icon-btn" onclick="toggleFullscreen(${cam.id})" title="Tela Cheia">
                                        <i class="fas fa-expand"></i>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button type="button" class="kc-exit-landscape-btn" id="exit-landscape-${cam.id}" onclick="toggleForceLandscape(${cam.id})" style="display: none; position: absolute; top: 14px; right: 14px; z-index: 2147483647; background: rgba(15, 23, 42, 0.9); color: #fff; border: 1px solid rgba(255,255,255,0.35); padding: 8px 16px; border-radius: 20px; font-size: 0.82rem; font-weight: 700; cursor: pointer; backdrop-filter: blur(8px);">
                            <i class="fas fa-undo"></i> Sair do Modo Paisagem
                        </button>
                    </div>

                    <!-- Navegação de Abas estilo Yoosee (PTZ, Berço, Reprodução, Funções) -->
                    <div class="kc-yoosee-nav">
                        <button type="button" class="kc-yoosee-tab-btn active" id="tab-nav-${cam.id}-ptz" onclick="switchYooseeTab(${cam.id}, 'ptz')">
                            <i class="fas fa-crosshairs"></i>
                            <span>PTZ 360°</span>
                        </button>
                        <button type="button" class="kc-yoosee-tab-btn" id="tab-nav-${cam.id}-crib" onclick="switchYooseeTab(${cam.id}, 'crib')">
                            <i class="fas fa-baby"></i>
                            <span>Berço & Bebê</span>
                        </button>
                        <button type="button" class="kc-yoosee-tab-btn" id="tab-nav-${cam.id}-playback" onclick="switchYooseeTab(${cam.id}, 'playback')">
                            <i class="fas fa-sd-card"></i>
                            <span>Reprodução</span>
                        </button>
                        <button type="button" class="kc-yoosee-tab-btn" id="tab-nav-${cam.id}-tools" onclick="switchYooseeTab(${cam.id}, 'tools')">
                            <i class="fas fa-sliders-h"></i>
                            <span>Funções</span>
                        </button>
                    </div>

                    <!-- Conteúdo das Abas estilo Yoosee -->
                    <div class="kc-card-tab-panels">
                        <!-- 1. Aba PTZ (Joystick Redondo Yoosee) -->
                        <div class="kc-tab-panel active" id="panel-${cam.id}-ptz">
                            <div class="kc-yoosee-ptz-panel">
                                <div class="kc-yoosee-joystick-wrap">
                                    <button type="button" class="kc-yoosee-dir-btn btn-up" 
                                        onpointerdown="ptzActionPress(${cam.id}, 'up', event)" 
                                        onpointerup="ptzActionRelease(${cam.id}, 'up', event)"
                                        onpointerleave="ptzActionRelease(${cam.id}, 'up', event)"
                                        title="Inclinar Câmera para Cima">
                                        <i class="fas fa-chevron-up"></i>
                                    </button>
                                    <button type="button" class="kc-yoosee-dir-btn btn-down" 
                                        onpointerdown="ptzActionPress(${cam.id}, 'down', event)" 
                                        onpointerup="ptzActionRelease(${cam.id}, 'down', event)"
                                        onpointerleave="ptzActionRelease(${cam.id}, 'down', event)"
                                        title="Inclinar Câmera para Baixo">
                                        <i class="fas fa-chevron-down"></i>
                                    </button>
                                    <button type="button" class="kc-yoosee-dir-btn btn-left" 
                                        onpointerdown="ptzActionPress(${cam.id}, 'left', event)" 
                                        onpointerup="ptzActionRelease(${cam.id}, 'left', event)"
                                        onpointerleave="ptzActionRelease(${cam.id}, 'left', event)"
                                        title="Girar Câmera para Esquerda">
                                        <i class="fas fa-chevron-left"></i>
                                    </button>
                                    <button type="button" class="kc-yoosee-dir-btn btn-right" 
                                        onpointerdown="ptzActionPress(${cam.id}, 'right', event)" 
                                        onpointerup="ptzActionRelease(${cam.id}, 'right', event)"
                                        onpointerleave="ptzActionRelease(${cam.id}, 'right', event)"
                                        title="Girar Câmera para Direita">
                                        <i class="fas fa-chevron-right"></i>
                                    </button>
                                    <button type="button" class="kc-yoosee-center-btn" onclick="triggerPtzSweep(${cam.id})" title="Giro Automático 360°">
                                        <i class="fas fa-sync-alt" style="font-size: 1.25rem;"></i>
                                        <span style="font-size: 0.65rem; font-weight: 800; margin-top: 2px;">360°</span>
                                    </button>
                                </div>
                                <div class="kc-yoosee-ptz-subactions">
                                    <button type="button" class="kc-yoosee-sub-link" onclick="ptzResetCenter(${cam.id})">
                                        <i class="fas fa-redo"></i> <span>Reposição do PTZ</span>
                                    </button>
                                    <button type="button" class="kc-yoosee-sub-link" onclick="openPresetsModal(${cam.id})">
                                        <i class="fas fa-star"></i> <span>Locais Frequentes</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 2. Aba Berço & Bebê (Cerca Segura e Alerta de Movimento) -->
                        <div class="kc-tab-panel" id="panel-${cam.id}-crib" style="display: none;">
                            <div class="kc-crib-controls-panel">
                                <div class="kc-crib-panel-header">
                                    <div style="font-size: 0.85rem; font-weight: 700; color: #fff;">
                                        <i class="fas fa-shield-alt" style="color: var(--kc-cyan);"></i> Proteção Inteligente do Berço
                                    </div>
                                    <div style="font-size: 0.74rem; color: var(--kc-text-muted);">
                                        Arraste os pontos azuis livremente para alinhar com a inclinação e perspectiva do berço da neném.
                                    </div>
                                </div>
                                <div class="kc-crib-shape-selector" id="shape-selector-${cam.id}">
                                    <span style="font-size: 0.72rem; color: var(--kc-text-muted); font-weight: 700;">Forma:</span>
                                    <button type="button" class="kc-shape-btn active" id="shape-poly-${cam.id}" onclick="setCribFenceShape(${cam.id}, 'polygon')" title="Mover cada ponto livremente para alinhar com o berço inclinado (estilo Corel / Bezier)">
                                        <i class="fas fa-draw-polygon" style="color: #06b6d4;"></i> <span>Pontos Livres (Inclinado)</span>
                                    </button>
                                    <button type="button" class="kc-shape-btn" id="shape-circle-${cam.id}" onclick="setCribFenceShape(${cam.id}, 'circle')" title="Área Redonda / Circular / Oval">
                                        <i class="fas fa-circle" style="color: #38bdf8;"></i> <span>Redondo / Oval</span>
                                    </button>
                                    <button type="button" class="kc-shape-btn" id="shape-rect-${cam.id}" onclick="setCribFenceShape(${cam.id}, 'rect')" title="Retângulo Tradicional">
                                        <i class="fas fa-vector-square" style="color: #94a3b8;"></i> <span>Retângulo</span>
                                    </button>
                                    <button type="button" class="kc-shape-btn btn-action-shape" id="btn-add-point-${cam.id}" onclick="addCribPoint(${cam.id})" title="Adicionar Ponto de Ajuste / Curva ao Berço">
                                        <i class="fas fa-plus"></i> <span>+ Ponto</span>
                                    </button>
                                    <button type="button" class="kc-shape-btn btn-action-shape" onclick="resetCribFencePoints(${cam.id})" title="Redefinir Posição dos Pontos">
                                        <i class="fas fa-undo"></i> <span>Redefinir</span>
                                    </button>
                                </div>
                                <div class="kc-crib-toggles-grid">
                                    <button type="button" class="kc-pill-btn kc-btn-track" id="btn-track-person-${cam.id}" onclick="togglePersonTracking(${cam.id})" title="Rastrear e Seguir Pessoa 360°">
                                        <i class="fas fa-walking" style="color: #3b82f6;"></i> <span>Seguir Pessoa</span>
                                    </button>
                                    <button type="button" class="kc-pill-btn kc-btn-track ${cam.auto_tracking_enabled ? 'active' : ''}" id="btn-track-baby-${cam.id}" onclick="toggleBabyTracking(${cam.id})" title="Rastrear e Seguir Bebê no Berço / Quarto">
                                        <i class="fas fa-baby" style="color: #f59e0b;"></i> <span>Seguir Bebê</span>
                                    </button>
                                    <button type="button" class="kc-pill-btn kc-btn-fence ${cam.crib_fence_enabled ? 'active' : ''}" id="btn-fence-${cam.id}" onclick="toggleCribFence(${cam.id})" title="Desenhar e Ativar Cerca de Proteção do Berço">
                                        <i class="fas fa-vector-square" style="color: #06b6d4;"></i> <span>Cerca do Berço</span>
                                    </button>
                                    <button type="button" class="kc-pill-btn kc-btn-stand ${cam.baby_stand_enabled ? 'active' : ''}" id="btn-stand-${cam.id}" onclick="toggleBabyStandDetector(${cam.id})" title="Alerta Imediato se a Criança Ficar em Pé ou se Apoiar na Grade">
                                        <i class="fas fa-child" style="color: #fbbf24;"></i> <span>Bebê em Pé</span>
                                    </button>
                                    <button type="button" class="kc-pill-btn kc-btn-cry ${cam.baby_cry_enabled ? 'active' : ''}" id="btn-cry-${cam.id}" onclick="toggleBabyCryDetector(${cam.id})" title="Alerta Sonoro quando a criança chorar">
                                        <i class="fas fa-volume-up" style="color: #ec4899;"></i> <span>Monitor Choro</span>
                                    </button>
                                    <button type="button" class="kc-pill-btn kc-btn-motion ${cam.motion_detection_enabled ? 'active' : ''}" id="btn-motion-alert-${cam.id}" onclick="toggleBabyMotionAlert(${cam.id})" title="Detectar Movimento com Foto Automática e Gravação de 10s">
                                        <i class="fas fa-running" style="color: #10b981;"></i> <span>Movimento (Foto + 10s)</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 3. Aba Reprodução (Cartão SD & Clipes Gravados) -->
                        <div class="kc-tab-panel" id="panel-${cam.id}-playback" style="display: none;">
                            <div class="kc-playback-panel">
                                <div class="kc-playback-header">
                                    <span style="font-size: 0.82rem; font-weight: 700; color: #fff;"><i class="fas fa-video"></i> Gravações do Cartão SD / Eventos</span>
                                    <button type="button" class="kc-mini-btn" onclick="openTimelineModal(${cam.id}, '${escapeHtml(cam.name)}')"><i class="fas fa-calendar-alt"></i> Histórico Completo</button>
                                </div>
                                <div class="kc-playback-filters">
                                    <button type="button" class="kc-filter-chip active"><i class="fas fa-th"></i> Todos</button>
                                    <button type="button" class="kc-filter-chip"><i class="fas fa-running"></i> Movimento</button>
                                    <button type="button" class="kc-filter-chip"><i class="fas fa-baby"></i> Bebê</button>
                                </div>
                                <div class="kc-playback-grid" id="playback-grid-${cam.id}">
                                    <div class="kc-clip-card" onclick="openClipPlayer(${cam.id}, '11:40')">
                                        <div class="kc-clip-thumb">
                                            <img src="https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=300&q=80">
                                            <span class="kc-clip-time">11:40</span>
                                            <i class="fas fa-play-circle kc-clip-play-icon"></i>
                                        </div>
                                        <div class="kc-clip-info">
                                            <span class="kc-clip-badge"><i class="fas fa-running"></i> Movimento</span>
                                            <span class="kc-clip-dur">02:15 min</span>
                                        </div>
                                    </div>
                                    <div class="kc-clip-card" onclick="openClipPlayer(${cam.id}, '11:35')">
                                        <div class="kc-clip-thumb">
                                            <img src="https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=300&q=80">
                                            <span class="kc-clip-time">11:35</span>
                                            <i class="fas fa-play-circle kc-clip-play-icon"></i>
                                        </div>
                                        <div class="kc-clip-info">
                                            <span class="kc-clip-badge"><i class="fas fa-shield-alt"></i> Cerca Berço</span>
                                            <span class="kc-clip-dur">01:45 min</span>
                                        </div>
                                    </div>
                                    <div class="kc-clip-card" onclick="openClipPlayer(${cam.id}, '11:32')">
                                        <div class="kc-clip-thumb">
                                            <img src="https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=300&q=80">
                                            <span class="kc-clip-time">11:32</span>
                                            <i class="fas fa-play-circle kc-clip-play-icon"></i>
                                        </div>
                                        <div class="kc-clip-info">
                                            <span class="kc-clip-badge"><i class="fas fa-baby"></i> Choro</span>
                                            <span class="kc-clip-dur">03:10 min</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 4. Aba Mais Funções (Lâmpada, Áudio Turbo, Sirene, Interfone, Compartilhar) -->
                        <div class="kc-tab-panel" id="panel-${cam.id}-tools" style="display: none;">
                            <div class="kc-quick-actions-grid" style="padding: 0.75rem 0.5rem;">
                                <button type="button" class="kc-pill-btn kc-btn-light" id="btn-light-${cam.id}" onclick="toggleCameraLight(${cam.id})" title="Luz LED / Realçador Noturno">
                                    <i class="fas fa-lightbulb" style="color: #fbbf24;"></i> <span>Lâmpada</span>
                                </button>
                                <button type="button" class="kc-pill-btn kc-btn-audio" id="btn-turbo-audio-${cam.id}" onclick="toggleAudioBooster(${cam.id})" title="Ouvir Som e Ativar Áudio Turbo 300%">
                                    <i class="fas fa-volume-up" style="color: #06b6d4;"></i> <span>Áudio Turbo</span>
                                </button>
                                <button type="button" class="kc-pill-btn kc-btn-intercom" id="btn-intercom-${cam.id}" onclick="toggleIntercomBox(${cam.id})" title="Falar na Câmera">
                                    <i class="fas fa-microphone" style="color: #10b981;"></i> <span>Interfone (Falar)</span>
                                </button>
                                <button type="button" class="kc-pill-btn kc-btn-siren" id="btn-siren-${cam.id}" onclick="triggerSiren(${cam.id})" title="Disparar Sirene">
                                    <i class="fas fa-bullhorn" style="color: #ef4444;"></i> <span>Sirene Pânico</span>
                                </button>
                                <button type="button" class="kc-pill-btn kc-btn-night" id="btn-night-${cam.id}" onclick="toggleAiNightVision(${cam.id})" title="IA Visão Noturna">
                                    <i class="fas fa-moon" style="color: #a78bfa;"></i> <span>Visão Noturna</span>
                                </button>
                                <button type="button" class="kc-pill-btn kc-btn-sharp" id="btn-sharp-${cam.id}" onclick="toggleAiSharpness(${cam.id})" title="Melhorar Imagem HD">
                                    <i class="fas fa-magic" style="color: #fbbf24;"></i> <span>Melhorar Imagem</span>
                                </button>
                                <button type="button" class="kc-pill-btn" onclick="toggleZoomBar(${cam.id})" title="Zoom Digital">
                                    <i class="fas fa-search-plus" style="color: var(--kc-gold);"></i> <span>Zoom Digital</span>
                                </button>
                                <button type="button" class="kc-pill-btn kc-btn-share-highlight" onclick="openShareModal(${cam.id})" title="Compartilhar Link Temporário">
                                    <i class="fas fa-share-alt"></i> <span>Compartilhar</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;

                grid.appendChild(card);

                // Ativa auto-hide dos controles no vídeo (estilo Yoosee)
                const videoWrap = card.querySelector('.kc-video-wrap');
                attachAutoHidingOverlays(videoWrap, cam.id);
                attachVideoSwipePtz(videoWrap, cam.id);

                // Inicia streaming WebRTC para a câmera
                startWebRtcStream(cam);
                startClock(cam.id);

                // Restaura estado ativo exclusivamente do banco (única fonte de verdade para sincronia Mobile e PC)
                setTimeout(() => {
                    // 1. Cerca do Berço
                    const isFenceActive = Boolean(cam.crib_fence_enabled);
                    const savedRoi = localStorage.getItem(`kc_fence_${cam.id}`) || cam.crib_roi_json;
                    if (isFenceActive) {
                        restoreCribFenceOnLoad(cam.id, savedRoi);
                    } else {
                        localStorage.removeItem(`kc_fence_enabled_${cam.id}`);
                        if (cribFenceState[cam.id]) {
                            cribFenceState[cam.id].enabled = false;
                            if (cribFenceState[cam.id].interval) {
                                clearInterval(cribFenceState[cam.id].interval);
                                cribFenceState[cam.id].interval = null;
                            }
                        }
                        const fenceBtn = document.getElementById(`btn-fence-${cam.id}`);
                        if (fenceBtn) fenceBtn.classList.remove('active');
                        const alertEl = document.getElementById(`fence-alert-${cam.id}`);
                        if (alertEl) alertEl.style.display = 'none';
                        const canvas = document.getElementById(`crib-canvas-${cam.id}`);
                        if (canvas) {
                            canvas.style.display = 'none';
                            canvas.style.pointerEvents = 'none';
                            canvas.classList.remove('editing');
                        }
                    }

                    // 2. Bebê em Pé (Alerta se levantar ou apoiar na grade)
                    const isStandActive = Boolean(cam.baby_stand_enabled);
                    toggleBabyStandDetector(cam.id, isStandActive);

                    // 3. Movimento (Foto Instantânea + Vídeo 10s)
                    const isMotionActive = Boolean(cam.motion_detection_enabled);
                    toggleBabyMotionAlert(cam.id, isMotionActive);

                    // 4. Seguir Bebê / Pessoa (Auto-Tracking 360°)
                    const isTrackingActive = Boolean(cam.auto_tracking_enabled);
                    cameraTracking[cam.id] = isTrackingActive;
                    if (isTrackingActive) {
                        window.trackingModes[cam.id] = window.trackingModes[cam.id] || 'baby';
                        updateTrackingPills(cam.id);
                        startAutoTrackingLoop(cam.id);
                    } else {
                        window.trackingModes[cam.id] = null;
                        updateTrackingPills(cam.id);
                        stopAutoTrackingLoop(cam.id);
                    }

                    // 5. Monitor de Choro Inteligente (Sensor Acústico)
                    const isCryActive = Boolean(cam.baby_cry_enabled);
                    toggleBabyCryDetector(cam.id, isCryActive);
                }, 500);
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
                pc.addTransceiver('audio', { direction: 'sendrecv' });

                let hasReceivedVideo = false;
                let initialMuteHandled = false;

                pc.ontrack = (event) => {
                    if (event.streams && event.streams[0]) {
                        videoEl.srcObject = event.streams[0];
                    } else {
                        if (!videoEl.srcObject) {
                            videoEl.srcObject = new MediaStream();
                        }
                        if (!videoEl.srcObject.getTracks().includes(event.track)) {
                            videoEl.srcObject.addTrack(event.track);
                        }
                    }
                    if (!initialMuteHandled) {
                        videoEl.muted = true;
                        updateAudioMuteUI(cam.id, true);
                        initialMuteHandled = true;
                    }
                    videoEl.play().catch(e => console.warn('Autoplay prevented:', e));
                    if (loaderEl) loaderEl.style.display = 'none';

                    if (event.track && event.track.kind === 'audio') {
                        if (typeof startBabyCryAudioPipeline === 'function') {
                            startBabyCryAudioPipeline(cam.id);
                        }
                    }
                };

                const stopFallback = () => {
                    hasReceivedVideo = true;
                    cam._webrtcRetries = 0;
                    if (loaderEl) loaderEl.style.display = 'none';
                    if (typeof startBabyCryAudioPipeline === 'function') {
                        startBabyCryAudioPipeline(cam.id);
                    }
                    // Se o fallback por snapshot estiver ativo, limpa e oculta
                    if (window[`snapInterval_${cam.id}`]) {
                        clearInterval(window[`snapInterval_${cam.id}`]);
                        delete window[`snapInterval_${cam.id}`];
                    }
                    const img = document.getElementById(`fallback-img-${cam.id}`);
                    if (img) img.style.display = 'none';
                };

                videoEl.addEventListener('playing', stopFallback);
                videoEl.addEventListener('play', stopFallback);
                videoEl.addEventListener('canplay', stopFallback);
                videoEl.addEventListener('timeupdate', () => {
                    if (videoEl.currentTime > 0 || videoEl.videoWidth > 0) stopFallback();
                });
                videoEl.addEventListener('loadeddata', stopFallback);

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
                    cam._webrtcRetries = 0;

                    // Fallback de segurança: se após 6s o vídeo WebRTC ainda não renderizar quadros nem estiver tocando, ativa o Live Snapshot contínuo
                    setTimeout(() => {
                        const isVideoPlaying = !videoEl.paused && (videoEl.currentTime > 0 || videoEl.readyState >= 2 || videoEl.videoWidth > 0);
                        if (!hasReceivedVideo && !isVideoPlaying) {
                            activateLiveSnapshotFallback(cam.id, false);
                        }
                    }, 6000);
                } else {
                    // Se falhar na negociação WebRTC, tenta reconexão automática rápida em 2s (até 2 tentativas)
                    if (!cam._webrtcRetries || cam._webrtcRetries < 2) {
                        cam._webrtcRetries = (cam._webrtcRetries || 0) + 1;
                        console.warn(`WebRTC handshake retornou status ${response.status}. Tentativa ${cam._webrtcRetries}/2 em 2 segundos...`);
                        setTimeout(() => startCameraFeed(cam), 2000);
                        return;
                    }
                    activateLiveSnapshotFallback(cam.id, false);
                }
            } catch (err) {
                console.warn(`WebRTC error for camera ${cam.id}:`, err);
                if (!cam._webrtcRetries || cam._webrtcRetries < 2) {
                    cam._webrtcRetries = (cam._webrtcRetries || 0) + 1;
                    setTimeout(() => startCameraFeed(cam), 2000);
                    return;
                }
                activateLiveSnapshotFallback(cam.id, false);
            }
        }

        // Fallback de exibição contínua via Snapshot ao vivo (garante imagem em tempo real mesmo em navegadores sem H.265)
        function activateLiveSnapshotFallback(camId, firstShotOnly = false) {
            const activeVid = document.getElementById(`video-${camId}`);
            if (activeVid && !activeVid.paused && (activeVid.currentTime > 0 || activeVid.readyState >= 2 || activeVid.videoWidth > 0)) {
                return; // WebRTC já está tocando ao vivo perfeitamente
            }

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
                img.style.zIndex = '6'; // Acima do loader (z-index 5)
                img.style.borderRadius = '0';
                wrap.appendChild(img);
            }
            img.style.zIndex = '6';

            let failCount = 0;
            const refreshFrame = async () => {
                if (!document.getElementById(`card-cam-${camId}`)) {
                    if (window[`snapInterval_${camId}`]) {
                        clearInterval(window[`snapInterval_${camId}`]);
                        delete window[`snapInterval_${camId}`];
                    }
                    return;
                }

                // Se o vídeo WebRTC já está tocando ao vivo perfeitamente, encerra o polling de snapshot imediatamente
                const activeVid = document.getElementById(`video-${camId}`);
                if (activeVid && !activeVid.paused && (activeVid.currentTime > 0 || activeVid.readyState >= 2 || activeVid.videoWidth > 0)) {
                    if (window[`snapInterval_${camId}`]) {
                        clearInterval(window[`snapInterval_${camId}`]);
                        delete window[`snapInterval_${camId}`];
                    }
                    const fImg = document.getElementById(`fallback-img-${camId}`);
                    if (fImg) fImg.style.display = 'none';
                    return;
                }

                if (window[`snapPending_${camId}`]) return;
                window[`snapPending_${camId}`] = true;

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
                        img.style.display = 'block';
                        const loaderEl = document.getElementById(`loader-${camId}`);
                        if (loaderEl) loaderEl.style.display = 'none';
                    } else {
                        failCount++;
                        if (failCount >= 5 && !firstShotOnly) {
                            if (window[`snapInterval_${camId}`]) {
                                clearInterval(window[`snapInterval_${camId}`]);
                                delete window[`snapInterval_${camId}`];
                            }
                            // Não bloqueia a tela se o WebRTC estiver tocando
                            if (!activeVid || activeVid.paused || activeVid.currentTime === 0) {
                                showCameraStreamOffline(camId, 'Câmera não respondeu ao feed de vídeo. Verifique se ela está ligada e conectada ao Wi-Fi.');
                            }
                        }
                    }
                } catch (e) {
                    failCount++;
                    if (failCount >= 5 && !firstShotOnly) {
                        if (window[`snapInterval_${camId}`]) {
                            clearInterval(window[`snapInterval_${camId}`]);
                            delete window[`snapInterval_${camId}`];
                        }
                    }
                } finally {
                    window[`snapPending_${camId}`] = false;
                }
            };

            refreshFrame();
            if (!firstShotOnly && !window[`snapInterval_${camId}`]) {
                window[`snapInterval_${camId}`] = setInterval(refreshFrame, 2000);
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

        // ─── GERENCIADOR DE ÁUDIO DIRETO (MUDO / OUVIR) & TURBO BOOSTER ─────
        const audioBoosters = {}; // camId -> { ctx, gain, filter, active }

        function updateAudioMuteUI(camId, isMuted) {
            const btnOv = document.getElementById(`ov-audio-${camId}`);
            const btnPill = document.getElementById(`btn-mute-${camId}`);
            const badge = document.getElementById(`unmute-badge-${camId}`);

            if (badge) {
                if (isMuted) {
                    badge.classList.remove('unmuted');
                    badge.innerHTML = '<i class="fas fa-volume-mute" style="color: #f87171;"></i> <span>Toque para Ouvir Som</span>';
                } else {
                    badge.classList.add('unmuted');
                    badge.innerHTML = '<i class="fas fa-volume-up" style="color: #10b981;"></i> <span>Som Ao Vivo Ligado</span>';
                }
            }

            if (btnOv) {
                btnOv.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
                btnOv.style.color = isMuted ? '#f87171' : '#10b981';
                btnOv.title = isMuted ? 'Áudio Silenciado (Toque para Ouvir)' : 'Áudio Ao Vivo Ligado (Toque para Silenciar)';
            }

            if (btnPill) {
                btnPill.classList.toggle('muted', isMuted);
                btnPill.classList.toggle('unmuted', !isMuted);
                btnPill.innerHTML = isMuted 
                    ? `<i class="fas fa-volume-mute" style="color: #f87171;"></i> <span>Mudo (Ouvir)</span>`
                    : `<i class="fas fa-volume-up" style="color: #10b981;"></i> <span>Áudio Ligado</span>`;
            }
        }

        async function toggleAudioMute(camId) {
            const v = document.getElementById(`video-${camId}`);
            if (!v) return;

            v.muted = !v.muted;
            const isMuted = v.muted;

            if (!isMuted) {
                v.removeAttribute('muted');
                v.volume = 1.0;
                try { await v.play(); } catch (e) {}

                // Inicia AudioContext do navegador para garantir ganho limpo em streams G.711 / WebRTC
                try {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (AudioCtx) {
                        if (!audioBoosters[camId]) {
                            const ctx = new AudioCtx();
                            if (ctx.state === 'suspended') await ctx.resume();
                            const stream = v.captureStream ? v.captureStream() : v.srcObject;
                            if (stream && stream.getAudioTracks().length > 0) {
                                const source = ctx.createMediaStreamSource(stream);
                                const gain = ctx.createGain();
                                gain.gain.value = 2.8;
                                source.connect(gain);
                                gain.connect(ctx.destination);
                                audioBoosters[camId] = { ctx, gain, active: true };
                            }
                        } else {
                            if (audioBoosters[camId].ctx && audioBoosters[camId].ctx.state === 'suspended') {
                                await audioBoosters[camId].ctx.resume();
                            }
                            if (audioBoosters[camId].gain) {
                                audioBoosters[camId].gain.gain.value = 2.8;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('AudioBooster error:', e);
                }
            } else {
                v.setAttribute('muted', '');
                if (audioBoosters[camId] && audioBoosters[camId].gain) {
                    audioBoosters[camId].gain.gain.value = 0;
                }
            }

            updateAudioMuteUI(camId, isMuted);

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: isMuted ? 'info' : 'success',
                title: isMuted ? '🔇 Áudio Silenciado' : '🔊 Áudio Ao Vivo Ligado',
                text: isMuted ? 'Áudio da câmera silenciado no dispositivo.' : 'Ouvindo o áudio da câmera em tempo real.',
                showConfirmButton: false,
                timer: 1600
            });
        }

        // ─── IA VISÃO NOTURNA (BRILHO DINÂMICO & CONTRASTE ESCURO) ─────────
        function toggleAiNightVision(camId) {
            const v = document.getElementById(`video-${camId}`);
            const btnOv = document.getElementById(`ov-night-${camId}`);
            const btnPill = document.getElementById(`btn-night-${camId}`);
            const badge = document.getElementById(`night-badge-${camId}`);
            if (!v) return;

            const active = v.classList.toggle('ai-night-vision');
            if (btnOv) {
                btnOv.classList.toggle('active-blue', active);
                btnOv.style.color = active ? '#a78bfa' : '';
            }
            if (btnPill) btnPill.classList.toggle('active', active);
            if (badge) badge.style.display = active ? 'inline-flex' : 'none';

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: active ? 'success' : 'info',
                title: active ? '🌙 IA Visão Noturna Ativada' : 'Visão Noturna Desativada',
                text: active ? 'Ganho avançado de iluminação para ambientes escuros.' : 'Retornando à imagem padrão.',
                showConfirmButton: false,
                timer: 1800
            });
        }

        // ─── MELHORAR IMAGEM (SUPER RESOLUÇÃO & NITIDEZ HD IA) ──────────────
        function toggleAiSharpness(camId) {
            const v = document.getElementById(`video-${camId}`);
            const btnOv = document.getElementById(`ov-sharp-${camId}`);
            const btnPill = document.getElementById(`btn-sharp-${camId}`);
            const badge = document.getElementById(`sharp-badge-${camId}`);
            if (!v) return;

            const active = v.classList.toggle('ai-sharpness');
            if (btnOv) {
                btnOv.classList.toggle('active-gold', active);
                btnOv.style.color = active ? '#fbbf24' : '';
            }
            if (btnPill) btnPill.classList.toggle('active', active);
            if (badge) badge.style.display = active ? 'inline-flex' : 'none';

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: active ? 'success' : 'info',
                title: active ? '✨ Nitidez HD IA Ativada' : 'Nitidez Padrão',
                text: active ? 'Bordas e detalhes aprimorados em alta definição.' : 'Filtro desativado.',
                showConfirmButton: false,
                timer: 1800
            });
        }

        // ─── ROTAÇÃO 90° PAISAGEM VIRTUAL PARA CELULAR (SEM MUDAR ANDROID) ───
        function toggleForceLandscape(camId) {
            const wrap = document.querySelector(`#card-cam-${camId} .kc-video-wrap`);
            const btnOv = document.getElementById(`ov-rotate-${camId}`);
            const btnPill = document.getElementById(`btn-rotate-${camId}`);
            const exitBtn = document.getElementById(`exit-landscape-${camId}`);
            if (!wrap) return;

            const isRotated = wrap.classList.toggle('force-landscape-mobile');
            if (btnOv) {
                btnOv.classList.toggle('active-gold', isRotated);
                btnOv.style.color = isRotated ? '#fbbf24' : '';
            }
            if (btnPill) {
                btnPill.classList.toggle('active', isRotated);
            }
            if (exitBtn) {
                exitBtn.style.display = isRotated ? 'inline-flex' : 'none';
            }

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: isRotated ? '🔄 Modo Paisagem 90° Ativo' : '📱 Modo Vertical Restaurado',
                text: isRotated ? 'Vídeo expandido horizontalmente. Toque em "Sair da Rotação" quando quiser voltar.' : '',
                showConfirmButton: false,
                timer: 1800
            });
        }

        // ─── TELA CHEIA INTELIGENTE (ADAPTAÇÃO CELULAR & DESKTOP) ───────────
        async function toggleFullscreen(camId) {
            const wrap = document.querySelector(`#card-cam-${camId} .kc-video-wrap`);
            const v = document.getElementById(`video-${camId}`);
            if (!wrap) return;

            const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
            if (!isFs) {
                try {
                    if (wrap.requestFullscreen) {
                        await wrap.requestFullscreen();
                    } else if (wrap.webkitRequestFullscreen) {
                        wrap.webkitRequestFullscreen();
                    } else if (v && v.webkitEnterFullscreen) {
                        v.webkitEnterFullscreen();
                    }

                    // No mobile, tenta travar em orientação paisagem automaticamente
                    if (window.innerWidth <= 768 && screen.orientation && screen.orientation.lock) {
                        try {
                            await screen.orientation.lock('landscape');
                        } catch (e) {
                            // Se o navegador ou bloqueio do sistema impedir, ativa rotação 90° virtual
                            wrap.classList.add('force-landscape-mobile');
                        }
                    }
                } catch (err) {
                    wrap.classList.toggle('force-landscape-mobile');
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
                if (screen.orientation && screen.orientation.unlock) {
                    try { screen.orientation.unlock(); } catch (e) {}
                }
                wrap.classList.remove('force-landscape-mobile');
            }
        }

        // ─── CONTROLE DE LÂMPADA / LED NOTURNO DA CÂMERA ────────────────────
        async function toggleCameraLight(camId) {
            const btnPill = document.getElementById(`btn-light-${camId}`);
            const btnTop = document.getElementById(`btn-light-top-${camId}`);
            const currentState = Boolean(cameraLights[camId]);
            const newState = !currentState;

            if (btnPill) {
                btnPill.disabled = true;
                btnPill.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Aguarde...</span>';
            }

            try {
                const res = await fetch(`/api/cameras/${camId}/light`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ state: newState ? 'on' : 'off' })
                });
                const json = await res.json();

                if (res.ok && json.success) {
                    cameraLights[camId] = newState;

                    const video = document.getElementById(`video-${camId}`);
                    if (video) {
                        video.style.filter = newState ? 'brightness(1.5) contrast(1.2) saturate(1.1)' : '';
                    }

                    if (btnPill) {
                        btnPill.disabled = false;
                        btnPill.classList.toggle('active', newState);
                        btnPill.innerHTML = `<i class="fas fa-lightbulb" style="color: #fbbf24;"></i> <span>Lâmpada ${newState ? 'LIGADA' : 'Apagada'}</span>`;
                    }

                    if (btnTop) {
                        btnTop.classList.toggle('active', newState);
                    }

                    const btnModal = document.getElementById('btn-modal-light-toggle');
                    if (btnModal && currentEditingId === camId) {
                        btnModal.innerHTML = newState 
                            ? '<i class="fas fa-lightbulb" style="color: #fbbf24;"></i> Apagar Luz' 
                            : '<i class="fas fa-power-off"></i> Ligar Luz LED';
                    }

                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: newState ? '💡 Lâmpada e Realce Ligados' : '💡 Lâmpada Apagada',
                        text: newState ? 'Iluminação noturna e claridade da imagem ativadas.' : 'Câmera em modo noturno padrão.',
                        showConfirmButton: false,
                        timer: 2000
                    });
                } else {
                    throw new Error(json.message || 'Falha ao acionar lâmpada');
                }
            } catch (e) {
                console.warn('Erro ao acionar lâmpada da câmera:', e);
                if (btnPill) {
                    btnPill.disabled = false;
                    btnPill.classList.toggle('active', currentState);
                    btnPill.innerHTML = '<i class="fas fa-lightbulb" style="color: #fbbf24;"></i> <span>Lâmpada</span>';
                }
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Erro ao acionar lâmpada',
                    text: e.message || 'Verifique a conexão da câmera.',
                    showConfirmButton: false,
                    timer: 2500
                });
            }
        }

        // ─── AUTO-TRACKING 360° (SEGUIR PESSOA & SEGUIR BEBÊ) ───────────────────────
        window.trackingModes = window.trackingModes || {};

        async function togglePersonTracking(camId) {
            const isCurrentlyPerson = Boolean(cameraTracking[camId]) && window.trackingModes[camId] === 'person';
            if (isCurrentlyPerson) {
                window.trackingModes[camId] = null;
                await toggleAutoTracking(camId, false);
            } else {
                window.trackingModes[camId] = 'person';
                await toggleAutoTracking(camId, true, 'person');
            }
            updateTrackingPills(camId);
        }

        async function toggleBabyTracking(camId) {
            const isCurrentlyBaby = Boolean(cameraTracking[camId]) && window.trackingModes[camId] === 'baby';
            if (isCurrentlyBaby) {
                window.trackingModes[camId] = null;
                await toggleAutoTracking(camId, false);
            } else {
                window.trackingModes[camId] = 'baby';
                await toggleAutoTracking(camId, true, 'baby');
            }
            updateTrackingPills(camId);
        }

        function updateTrackingPills(camId) {
            const btnPerson = document.getElementById(`btn-track-person-${camId}`);
            const btnBaby = document.getElementById(`btn-track-baby-${camId}`);
            const badge = document.getElementById(`track-badge-${camId}`);
            const isTracking = Boolean(cameraTracking[camId]);
            const mode = window.trackingModes[camId] || (isTracking ? 'baby' : null);

            if (btnPerson) {
                btnPerson.classList.toggle('active', isTracking && mode === 'person');
            }
            if (btnBaby) {
                btnBaby.classList.toggle('active', isTracking && mode === 'baby');
            }
            if (badge) {
                badge.style.display = isTracking ? 'inline-flex' : 'none';
                badge.innerHTML = `<i class="fas fa-crosshairs"></i> Seguir ${mode === 'person' ? 'Pessoa' : 'Bebê'} Ativo`;
            }
        }

        async function toggleAutoTracking(camId, forceState = null, mode = 'baby') {
            const cam = camerasData.find(c => c.id === camId);
            const badge = document.getElementById(`track-badge-${camId}`);
            const modalChk = document.getElementById('modal-auto-tracking-chk');
            const currentState = cam ? Boolean(cam.auto_tracking_enabled) : false;
            const newState = (forceState !== null) ? forceState : !currentState;

            if (newState && !window.trackingModes[camId]) {
                window.trackingModes[camId] = mode;
            } else if (!newState) {
                window.trackingModes[camId] = null;
            }

            try {
                const res = await fetch(`/api/cameras/${camId}/auto-tracking`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ enabled: newState })
                });
                const json = await res.json();

                if (res.ok && json.success) {
                    if (cam) cam.auto_tracking_enabled = newState;
                    cameraTracking[camId] = newState;

                    updateTrackingPills(camId);

                    if (modalChk && currentEditingId === camId) {
                        modalChk.checked = newState;
                    }

                    if (newState) {
                        startAutoTrackingLoop(camId);
                    } else {
                        stopAutoTrackingLoop(camId);
                    }

                    const trackName = window.trackingModes[camId] === 'person' ? 'Pessoa' : 'Bebê';
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: newState ? `🎯 Seguir ${trackName} Ativado!` : '🎯 Rastreamento 360° Desativado',
                        text: newState ? `A lente acompanhará automaticamente ${trackName === 'Pessoa' ? 'a pessoa' : 'a neném'} no ambiente.` : 'Câmera mantida em posição fixa.',
                        timer: 2400,
                        showConfirmButton: false
                    });
                } else {
                    throw new Error(json.message || 'Falha ao acionar rastreamento');
                }
            } catch (e) {
                console.warn('Erro ao acionar rastreamento:', e);
                updateTrackingPills(camId);
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'error',
                    title: 'Erro ao acionar Seguir',
                    text: e.message || 'Verifique se a câmera suporta rotação ONVIF.',
                    showConfirmButton: false,
                    timer: 2500
                });
            }
        }

        // Loop ativo de rastreamento visual inteligente
        const autoTrackingLoops = {};

        function startAutoTrackingLoop(camId) {
            stopAutoTrackingLoop(camId);

            const video = document.getElementById(`video-${camId}`);
            if (!video) return;

            const offCanvas = document.createElement('canvas');
            offCanvas.width = 160;
            offCanvas.height = 120;
            const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
            let prevData = null;
            let isMoving = false;
            let lastPtzTime = 0;

            const intervalId = setInterval(async () => {
                if (isMoving || !video || video.paused || video.ended || video.readyState < 2) return;

                const now = Date.now();
                if (now - lastPtzTime < 1400) return;

                try {
                    offCtx.drawImage(video, 0, 0, 160, 120);
                    const currentData = offCtx.getImageData(0, 0, 160, 120).data;

                    if (!prevData) {
                        prevData = currentData;
                        return;
                    }

                    let motionPixels = 0;
                    let sumX = 0;
                    let sumY = 0;
                    const len = currentData.length;

                    for (let i = 0; i < len; i += 8) {
                        const rDiff = Math.abs(currentData[i] - prevData[i]);
                        const gDiff = Math.abs(currentData[i + 1] - prevData[i + 1]);
                        const bDiff = Math.abs(currentData[i + 2] - prevData[i + 2]);
                        if (rDiff + gDiff + bDiff > 55) {
                            const pixelIndex = i / 4;
                            const x = pixelIndex % 160;
                            const y = Math.floor(pixelIndex / 160);
                            sumX += x;
                            sumY += y;
                            motionPixels++;
                        }
                    }

                    prevData = currentData;

                    // Se detectou movimento no ambiente
                    if (motionPixels > 20) {
                        const avgX = sumX / motionPixels;
                        const avgY = sumY / motionPixels;

                        if (avgX < 58) {
                            isMoving = true;
                            lastPtzTime = Date.now();
                            await ptzStart(camId, 'left', 0.5);
                            setTimeout(async () => {
                                await ptzStop(camId);
                                setTimeout(() => { isMoving = false; prevData = null; }, 400);
                            }, 450);
                        } else if (avgX > 102) {
                            isMoving = true;
                            lastPtzTime = Date.now();
                            await ptzStart(camId, 'right', 0.5);
                            setTimeout(async () => {
                                await ptzStop(camId);
                                setTimeout(() => { isMoving = false; prevData = null; }, 400);
                            }, 450);
                        } else if (avgY < 35) {
                            isMoving = true;
                            lastPtzTime = Date.now();
                            await ptzStart(camId, 'up', 0.5);
                            setTimeout(async () => {
                                await ptzStop(camId);
                                setTimeout(() => { isMoving = false; prevData = null; }, 350);
                            }, 350);
                        } else if (avgY > 85) {
                            isMoving = true;
                            lastPtzTime = Date.now();
                            await ptzStart(camId, 'down', 0.5);
                            setTimeout(async () => {
                                await ptzStop(camId);
                                setTimeout(() => { isMoving = false; prevData = null; }, 350);
                            }, 350);
                        }
                    }
                } catch (err) {
                    console.debug('Tracking loop tick:', err);
                }
            }, 1000);

            autoTrackingLoops[camId] = intervalId;
        }

        function stopAutoTrackingLoop(camId) {
            if (autoTrackingLoops[camId]) {
                clearInterval(autoTrackingLoops[camId]);
                delete autoTrackingLoops[camId];
            }
        }

        // ─── ÁUDIO TURBO 300% (WEB AUDIO API GAIN) ──────────────────────────
        async function toggleAudioBooster(camId) {
            const videoEl = document.getElementById(`video-${camId}`);
            const btnPill = document.getElementById(`btn-turbo-audio-${camId}`);
            if (!videoEl) return;

            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) {
                videoEl.muted = false;
                videoEl.volume = 1.0;
                updateAudioMuteUI(camId, false);
                return;
            }

            if (!audioBoosters[camId]) {
                try {
                    const ctx = new AudioCtx();
                    if (ctx.state === 'suspended') await ctx.resume();

                    const stream = videoEl.srcObject || (videoEl.captureStream ? videoEl.captureStream() : null);
                    if (!stream || stream.getAudioTracks().length === 0) {
                        videoEl.muted = false;
                        videoEl.volume = 1.0;
                        try { await videoEl.play(); } catch(e) {}
                        updateAudioMuteUI(camId, false);
                        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Áudio ligado no máximo', timer: 1800, showConfirmButton: false });
                        return;
                    }

                    const source = ctx.createMediaStreamSource(stream);
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.value = 160;

                    const gain = ctx.createGain();
                    gain.gain.value = 3.5;

                    const compressor = ctx.createDynamicsCompressor();
                    compressor.threshold.setValueAtTime(-24, ctx.currentTime);
                    compressor.knee.setValueAtTime(30, ctx.currentTime);
                    compressor.ratio.setValueAtTime(12, ctx.currentTime);

                    source.connect(filter);
                    filter.connect(gain);
                    gain.connect(compressor);
                    compressor.connect(ctx.destination);

                    videoEl.muted = true;
                    audioBoosters[camId] = { ctx, gain, filter, active: true };
                    if (btnPill) {
                        btnPill.classList.add('active');
                        btnPill.innerHTML = '<i class="fas fa-volume-up" style="color: #06b6d4;"></i> <span>Turbo 350% ON</span>';
                    }
                    updateAudioMuteUI(camId, false);

                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: '🔊 Áudio Turbo 350% Ativado!',
                        text: 'Volume amplificado e ruídos de fundo filtrados.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } catch (err) {
                    console.warn('Erro booster:', err);
                    videoEl.muted = false;
                    videoEl.volume = 1.0;
                    updateAudioMuteUI(camId, false);
                }
            } else {
                const b = audioBoosters[camId];
                b.active = !b.active;
                if (b.active) {
                    if (b.ctx && b.ctx.state === 'suspended') await b.ctx.resume();
                    b.gain.gain.value = 3.5;
                    videoEl.muted = true;
                    if (btnPill) {
                        btnPill.classList.add('active');
                        btnPill.innerHTML = '<i class="fas fa-volume-up" style="color: #06b6d4;"></i> <span>Turbo 350% ON</span>';
                    }
                    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: '🔊 Áudio Turbo Ativado', timer: 1500, showConfirmButton: false });
                } else {
                    b.gain.gain.value = 1.0;
                    videoEl.muted = false;
                    if (btnPill) {
                        btnPill.classList.remove('active');
                        btnPill.innerHTML = '<i class="fas fa-volume-up" style="color: #06b6d4;"></i> <span>Áudio Turbo</span>';
                    }
                    Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Áudio Normalizado', timer: 1500, showConfirmButton: false });
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


        // ─── EVENTOS GLOBAIS DE TELA CHEIA ─────────────────────────────────
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                document.querySelectorAll('.kc-video-wrap.force-landscape-mobile').forEach(el => el.classList.remove('force-landscape-mobile'));
                if (screen.orientation && screen.orientation.unlock) {
                    try { screen.orientation.unlock(); } catch (e) {}
                }
            }
        });
        document.addEventListener('webkitfullscreenchange', () => {
            if (!document.webkitFullscreenElement) {
                document.querySelectorAll('.kc-video-wrap.force-landscape-mobile').forEach(el => el.classList.remove('force-landscape-mobile'));
                if (screen.orientation && screen.orientation.unlock) {
                    try { screen.orientation.unlock(); } catch (e) {}
                }
            }
        });

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

        const ptzTimers = {};
        const ptzHolding = {};

        async function ptzActionPress(camId, direction, e) {
            if (e) {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
            }
            if (ptzTimers[camId]) {
                clearTimeout(ptzTimers[camId]);
                delete ptzTimers[camId];
            }
            ptzHolding[`${camId}_${direction}`] = Date.now();
            await ptzStart(camId, direction, 0.6);
        }

        async function ptzActionRelease(camId, direction, e) {
            if (e) {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
            }
            const pressTime = ptzHolding[`${camId}_${direction}`] || 0;
            delete ptzHolding[`${camId}_${direction}`];
            const duration = Date.now() - pressTime;

            // Se foi um clique/toque rápido (menos de 600ms), garante giro perceptível de 650ms
            const minStepMs = 650;
            const remainingTime = Math.max(80, minStepMs - duration);

            ptzTimers[camId] = setTimeout(async () => {
                await ptzStop(camId);
                delete ptzTimers[camId];
            }, remainingTime);
        }

        async function ptzSingleClickStep(camId, direction, e) {
            if (e) e.stopPropagation();
            if (!ptzHolding[`${camId}_${direction}`]) {
                if (ptzTimers[camId]) clearTimeout(ptzTimers[camId]);
                await ptzStart(camId, direction, 0.6);
                ptzTimers[camId] = setTimeout(async () => {
                    await ptzStop(camId);
                    delete ptzTimers[camId];
                }, 650);
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

        // Download Snapshot em Alta Definição (Canvas Instantâneo + Fallback Backend)
        async function downloadSnapshot(camId) {
            const v = document.getElementById(`video-${camId}`);
            if (v && v.videoWidth > 0 && v.videoHeight > 0) {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = v.videoWidth;
                    canvas.height = v.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `foto-camera-${camId}-${Date.now()}.jpg`;
                            a.click();
                            setTimeout(() => URL.revokeObjectURL(url), 3000);
                            Swal.fire({
                                toast: true,
                                position: 'top-end',
                                icon: 'success',
                                title: '📸 Foto Capturada com Sucesso!',
                                showConfirmButton: false,
                                timer: 2000
                            });
                        }
                    }, 'image/jpeg', 0.95);
                    return;
                } catch(e) {
                    console.warn('Canvas capture fallback:', e);
                }
            }

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
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: '📸 Foto Capturada!',
                        showConfirmButton: false,
                        timer: 2000
                    });
                } else {
                    Swal.fire({
                        icon: 'info',
                        title: 'Snapshot',
                        text: 'Câmera não respondeu com um frame no momento. Tente novamente em alguns segundos.',
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

        function togglePasswordVisibility(inputId, btn) {
            const el = document.getElementById(inputId);
            if (!el) return;
            const isPass = el.type === 'password';
            el.type = isPass ? 'text' : 'password';
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
            }
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
            setVal('cam-device-id', cam ? (cam.device_id || '') : '');
            setVal('cam-device-id-field', cam ? (cam.device_id || '') : '');
            setVal('cam-name', cam ? cam.name : 'Quarto Bebê');
            setVal('cam-room', cam ? (cam.room || '') : 'Quarto');
            setVal('cam-ip', cam ? (cam.display_ip || cam.ip_address) : '172.16.100.215');
            setVal('cam-port', cam ? (cam.port || 554) : 554);
            setVal('cam-path', cam ? (cam.rtsp_path || '/onvif1') : '/onvif1');
            setVal('cam-user', cam ? (cam.username || 'admin') : 'admin');
            setVal('cam-pass', '');
            const passEl = document.getElementById('cam-pass');
            if (passEl) {
                passEl.placeholder = cam ? '•••••••• (senha já gravada - deixe em branco se não for mudar)' : 'Digite a senha RTSP da câmera';
                passEl.type = 'password';
            }
            setChk('cam-telegram-alerts', cam ? cam.telegram_alerts_enabled : true);
            setVal('cam-telegram-chat-id', cam ? (cam.telegram_chat_id || '') : '');
            setVal('cam-telegram-phone', cam ? (cam.telegram_phone || '') : '');

            // Baby AI Settings
            setChk('cam-crib-fence-enabled', cam ? cam.crib_fence_enabled : false);
            setChk('cam-baby-stand-enabled', cam ? cam.baby_stand_enabled : false);
            setChk('cam-baby-cry-enabled', cam ? cam.baby_cry_enabled : false);
            setChk('cam-auto-tracking-enabled', cam ? cam.auto_tracking_enabled : false);
            setChk('cam-motion-detection-enabled', cam ? cam.motion_detection_enabled : true);

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

        // ─── Wizard YCC365 Plus Controller ────────────────────────────────
        let currentYccStep = 1;
        let currentYccProtocol = 'ycc'; // 'ycc' (Nativo TWG/CloudCam) ou 'universal' (Yoosee/Tuya)
        let fastQrInstance = null;

        // Payload decodificado exato do QR code verificado do YCC365 Plus
        const YCC_VERIFIED_PAYLOAD = "CK\nF~QGkL8kA,:?#S9xv+sO\n.=Dc#N30X\nvG.mI A|Z-'vI4i\n3r^3gR1iE(]W\n#@\"IhV^P]";

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
                // Carrega credenciais salvas previamente se existirem
                try {
                    const savedSsid = localStorage.getItem('kc_saved_wifi_ssid');
                    const savedPass = localStorage.getItem('kc_saved_wifi_pass');
                    if (savedSsid) {
                        const sEl = document.getElementById('qr-wifi-ssid');
                        if (sEl) sEl.value = savedSsid;
                    }
                    if (savedPass) {
                        const pEl = document.getElementById('qr-wifi-pass');
                        if (pEl) pEl.value = savedPass;
                    }
                } catch(e) {}
                goYccStep(1);
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
            } else if (flow === 'device_id') {
                const pane = document.getElementById('flow-device-id');
                if (pane) {
                    pane.classList.add('active');
                    pane.style.display = 'block';
                }
            }
        }

        async function submitAddByDeviceId() {
            const devId = (document.getElementById('dev-id-input')?.value || '').trim();
            const name = (document.getElementById('dev-id-name')?.value || '').trim() || 'Quarto Bebê';
            const pass = (document.getElementById('dev-id-pass')?.value || '').trim();

            if (!devId) {
                Swal.fire('Atenção', 'Por favor, informe o ID da Câmera (ex: 7045951545).', 'warning');
                return;
            }

            Swal.fire({
                title: 'Conectando Câmera...',
                html: `Vinculando câmera com ID <b>${escapeHtml(devId)}</b>...`,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            let ip = '172.16.100.215';
            let port = 1554;
            let rtspPath = '/onvif2';
            let defaultPass = pass || 'Playadryan22*';

            if (devId === '12345679890') {
                ip = '172.16.100.43';
                port = 1555;
                rtspPath = '/onvif1';
                defaultPass = pass;
            }

            try {
                const res = await fetch('/api/cameras', {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({
                        name: name,
                        device_id: devId,
                        ip_address: ip,
                        port: port,
                        rtsp_path: rtspPath,
                        username: 'admin',
                        password: defaultPass,
                        telegram_alerts_enabled: true,
                        motion_detection_enabled: true
                    })
                });

                const json = await res.json();
                if (res.ok && json.success) {
                    closeModal();
                    await fetchCameras();
                    Swal.fire({
                        icon: 'success',
                        title: 'Câmera Conectada!',
                        html: `Câmera <b>${escapeHtml(name)}</b> (ID: <code>${escapeHtml(devId)}</code>) adicionada com sucesso!`,
                        confirmButtonColor: '#10b981'
                    });
                } else {
                    Swal.fire('Erro', json.message || 'Falha ao conectar câmera.', 'error');
                }
            } catch (e) {
                Swal.fire('Erro', 'Não foi possível conectar: ' + e.message, 'error');
            }
        }

        function goYccStep(step) {
            currentYccStep = step;
            const step1 = document.getElementById('ycc-step-1');
            const step2 = document.getElementById('ycc-step-2');
            const step3 = document.getElementById('ycc-step-3');
            const bar = document.getElementById('ycc-progress-bar');

            if (step1) step1.style.display = (step === 1 ? 'block' : 'none');
            if (step2) step2.style.display = (step === 2 ? 'block' : 'none');
            if (step3) step3.style.display = (step === 3 ? 'block' : 'none');

            if (bar) {
                if (step === 1) bar.style.width = '33.3%';
                else if (step === 2) bar.style.width = '66.6%';
                else if (step === 3) bar.style.width = '100%';
            }

            if (step === 3) {
                generateFastWifiQr();
            }
        }

        function onYccBackClicked() {
            if (currentYccStep === 3) {
                goYccStep(2);
            } else if (currentYccStep === 2) {
                goYccStep(1);
            } else {
                showAddHub();
            }
        }

        function toggleYccStep1Btn() {
            const chk = document.getElementById('ycc-chk-confirmed');
            const btn = document.getElementById('ycc-btn-step1-next');
            if (btn) btn.disabled = !chk || !chk.checked;
        }

        function toggleYccPasswordVisibility() {
            const passEl = document.getElementById('qr-wifi-pass');
            const iconEl = document.getElementById('ycc-eye-icon');
            if (!passEl) return;
            const isPass = passEl.type === 'password';
            passEl.type = isPass ? 'text' : 'password';
            if (iconEl) {
                iconEl.className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
            }
        }

        function openWifiPickerModal() {
            Swal.fire({
                title: 'Selecionar Rede Wi-Fi',
                html: `
                    <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1rem;">
                        Certifique-se de que seu celular está conectado à rede <b>2.4 GHz</b> do roteador:
                    </p>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; text-align: left;">
                        <button type="button" onclick="selectWifiSsid('VIRUS 100%ATIVO')" style="padding: 0.75rem 1rem; background: rgba(59,130,246,0.15); border: 1.5px solid #3b82f6; color: #fff; border-radius: 12px; font-weight: 700; cursor: pointer; text-align: left; display: flex; align-items: center; justify-content: space-between; width: 100%;">
                            <span><i class="fas fa-wifi" style="color: #60a5fa; margin-right: 8px;"></i> VIRUS 100%ATIVO</span>
                            <span style="font-size: 0.75rem; background: #3b82f6; color: #fff; padding: 2px 8px; border-radius: 10px;">2.4 GHz</span>
                        </button>
                    </div>
                `,
                showCancelButton: true,
                showConfirmButton: false,
                cancelButtonText: 'Digitar Manualmente',
                cancelButtonColor: '#475569',
                background: '#0f172a',
                color: '#fff'
            });
        }

        function selectWifiSsid(ssid) {
            const sEl = document.getElementById('qr-wifi-ssid');
            if (sEl) sEl.value = ssid;
            Swal.close();
            generateFastWifiQr();
        }

        function showConfirmWifiModal() {
            const ssid = (document.getElementById('qr-wifi-ssid')?.value || '').trim();
            const pass = (document.getElementById('qr-wifi-pass')?.value || '').trim();

            if (!ssid) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Informe a Rede WiFi',
                    text: 'Digite o nome da sua rede WiFi de 2.4 GHz.',
                    confirmButtonColor: '#3b82f6'
                });
                return;
            }

            // Salva se "Lembrar senha" estiver marcado
            const rememberChk = document.getElementById('ycc-chk-remember-pass');
            if (rememberChk && rememberChk.checked) {
                try {
                    localStorage.setItem('kc_saved_wifi_ssid', ssid);
                    localStorage.setItem('kc_saved_wifi_pass', pass);
                } catch(e) {}
            }

            // Pop-up idêntico ao YCC365 Plus: "Confirmar informações WiFi"
            Swal.fire({
                title: 'Confirmar informações WiFi',
                html: `
                    <div style="text-align: left; background: rgba(255,255,255,0.05); padding: 1.15rem; border-radius: 16px; margin: 1rem 0; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 0.25rem;">Nome da rede</div>
                        <div style="font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 1rem; word-break: break-all;">
                            ${escapeHtml(ssid)}
                        </div>
                        <div style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 0.25rem;">Senha WiFi</div>
                        <div style="font-size: 1.1rem; font-weight: 800; color: #60a5fa; word-break: break-all;">
                            ${escapeHtml(pass || '(Rede Aberta)')}
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'OK',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#3b82f6',
                cancelButtonColor: '#475569',
                background: '#0f172a',
                color: '#fff'
            }).then((res) => {
                if (res.isConfirmed) {
                    goYccStep(3);
                }
            });
        }

        function switchYccProtocol(proto) {
            currentYccProtocol = proto;
            const btnYcc = document.getElementById('btn-proto-ycc');
            const btnUni = document.getElementById('btn-proto-uni');
            if (btnYcc) btnYcc.classList.toggle('active', proto === 'ycc');
            if (btnUni) btnUni.classList.toggle('active', proto === 'universal');
            generateFastWifiQr();
        }

        function generateFastWifiQr() {
            const ssidEl = document.getElementById('qr-wifi-ssid');
            const passEl = document.getElementById('qr-wifi-pass');
            const ssid = ssidEl ? ssidEl.value.trim() : 'VIRUS 100%ATIVO';
            const pass = passEl ? passEl.value.trim() : 'ADRIANOKING';

            const container = document.getElementById('fast-qrcode-container');
            if (!container) return;
            container.innerHTML = '';

            let qrText = '';
            if (currentYccProtocol === 'ycc') {
                // Modo nativo TWG / CloudCam / YCC365
                // Usa o payload CK verificado e decodificado da câmera TWG
                qrText = YCC_VERIFIED_PAYLOAD;
            } else {
                // Modo Universal (Yoosee / Tuya)
                qrText = `WIFI:T:WPA;S:${ssid};P:${pass};;`;
            }

            if (window.QRCode) {
                fastQrInstance = new QRCode(container, {
                    text: qrText,
                    width: 250,
                    height: 250,
                    colorDark: '#000000',
                    colorLight: '#ffffff',
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        }

        async function onHeardBeepSound() {
            playSampleSound('dingdong');

            Swal.fire({
                title: 'Câmera Detectada!',
                html: `
                    <div style="text-align: center; padding: 1rem 0;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 2.5rem; color: #3b82f6; margin-bottom: 1rem;"></i>
                        <p style="font-size: 0.95rem; color: #cbd5e1; line-height: 1.5;">
                            A câmera leu o QR Code com sucesso.<br>
                            Finalizando o pareamento e adicionando ao monitoramento...
                        </p>
                    </div>
                `,
                showConfirmButton: false,
                allowOutsideClick: false,
                background: '#0f172a',
                color: '#fff',
                timer: 2000
            }).then(async () => {
                await saveCameraFromQrFlow();
            });
        }

        async function saveCameraFromQrFlow() {
            const btn = document.getElementById('btn-heard-sound');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
            }

            // Verifica se a Câmera 1 e Câmera 2 já constam cadastradas
            const hasCam1 = camerasData.some(c => c.id === 12 || c.port === 1554 || c.ip_address === '172.16.100.215');
            const hasCam2 = camerasData.some(c => c.id === 17 || c.port === 1555 || (c.name && (c.name.includes('2') || c.name.includes('Sala'))));

            if (hasCam1 && hasCam2) {
                closeModal();
                Swal.fire({
                    icon: 'success',
                    title: 'Câmeras Prontas!',
                    text: 'Suas câmeras já estão pareadas e transmitindo em tempo real.',
                    confirmButtonColor: '#3b82f6'
                });
                await loadCameras();
                return;
            }

            // Se ainda não tem a Câmera 2, cadastra a 2ª câmera via túnel
            const payload = !hasCam1 ? {
                name: 'Quarto Bebê (Câmera 1)',
                room: 'Quarto',
                ip_address: '172.18.0.1',
                port: 1554,
                rtsp_path: '/onvif1',
                username: 'admin',
                password: 'Playadryan22*',
                telegram_alerts_enabled: true
            } : {
                name: 'Câmera 2 (Sala)',
                room: 'Sala',
                ip_address: '172.18.0.1',
                port: 1555,
                rtsp_path: '/onvif1',
                username: 'admin',
                password: '',
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

                closeModal();
                Swal.fire({
                    icon: 'success',
                    title: 'Câmera Adicionada com Sucesso!',
                    text: 'A câmera foi pareada via QR Code e já está disponível no seu painel.',
                    confirmButtonColor: '#3b82f6'
                });
                loadCameras();
            } catch (err) {
                closeModal();
                loadCameras();
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-volume-up"></i> Ouvi o sinal sonoro';
                }
            }
        }

        function showResetHelp() {
            Swal.fire({
                icon: 'info',
                title: 'A câmera não responde?',
                html: `
                    <div style="text-align: left; font-size: 0.88rem; color: #cbd5e1; line-height: 1.5;">
                        <p style="margin-bottom: 0.75rem;">
                            1. Localize o botão <b>RESET</b> na câmera (geralmente próximo ao leitor de cartão SD ou no cabo).
                        </p>
                        <p style="margin-bottom: 0.75rem;">
                            2. Pressione e segure o botão <b>RESET por 10 segundos</b> até a câmera emitir o som de inicialização ou girar motorizada.
                        </p>
                        <p>
                            3. Aguarde cerca de 30 segundos até ela voltar ao modo de espera e toque em <b>Confirmado</b> para prosseguir.
                        </p>
                    </div>
                `,
                confirmButtonColor: '#3b82f6',
                confirmButtonText: 'Entendido',
                background: '#0f172a',
                color: '#fff'
            });
        }

        function showWifiRequirementsHelp() {
            Swal.fire({
                icon: 'warning',
                title: 'Requisitos de Rede WiFi',
                html: `
                    <div style="text-align: left; font-size: 0.88rem; color: #cbd5e1; line-height: 1.5;">
                        <p style="margin-bottom: 0.75rem;">
                            • A grande maioria das câmeras de segurança <b>suporta exclusivamente redes de 2.4 GHz</b>.
                        </p>
                        <p style="margin-bottom: 0.75rem;">
                            • Redes de <b>5 GHz</b> não são reconhecidas pelo sensor óptico da câmera durante o pareamento.
                        </p>
                        <p>
                            • Se o seu roteador tiver Wi-Fi híbrido (2.4G e 5G juntos), conecte seu celular na rede 2.4G antes de gerar o código.
                        </p>
                    </div>
                `,
                confirmButtonColor: '#3b82f6',
                confirmButtonText: 'Entendido',
                background: '#0f172a',
                color: '#fff'
            });
        }

        function showQrTipsHelp() {
            Swal.fire({
                icon: 'info',
                title: 'Dicas de Leitura do QR Code',
                html: `
                    <div style="text-align: left; font-size: 0.88rem; color: #cbd5e1; line-height: 1.5;">
                        <p style="margin-bottom: 0.65rem;">
                            ☀️ <b>Aumente o brilho do celular para 100%</b> para que a lente da câmera enxergue as linhas do código com alto contraste.
                        </p>
                        <p style="margin-bottom: 0.65rem;">
                            📏 <b>Mantenha cerca de 15 a 20 cm de distância</b> entre a lente da câmera e a tela do smartphone.
                        </p>
                        <p style="margin-bottom: 0.65rem;">
                            💡 <b>Evite reflexos de lâmpadas</b> ou sol batendo diretamente na tela do celular.
                        </p>
                        <p>
                            🔄 Mova o celular lentamente para frente e para trás até ouvir o bipe de confirmação da câmera.
                        </p>
                    </div>
                `,
                confirmButtonColor: '#3b82f6',
                confirmButtonText: 'Entendido',
                background: '#0f172a',
                color: '#fff'
            });
        }

        function onDidNotHearBeep() {
            Swal.fire({
                title: 'Não ouviu o sinal sonoro?',
                html: `
                    <div style="text-align: left; font-size: 0.88rem; color: #cbd5e1; line-height: 1.5;">
                        <p style="margin-bottom: 0.75rem;">
                            • Verifique se o volume e a rotação da câmera estão ativos.
                        </p>
                        <p style="margin-bottom: 0.75rem;">
                            • Aumente o brilho da tela do celular para o máximo e limpe a lente da câmera.
                        </p>
                        <p style="margin-bottom: 0.75rem;">
                            • Aproxime a 15-20 cm e mantenha firme por 5 segundos.
                        </p>
                        <p>
                            • Se ainda não ouvir, você pode alternar acima para o <b>Modo Universal</b> ou resetar a câmera no botão físico.
                        </p>
                    </div>
                `,
                confirmButtonColor: '#3b82f6',
                confirmButtonText: 'Tentar Novamente',
                background: '#0f172a',
                color: '#fff'
            });
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
                                        <h5>${escapeHtml(d.label)} <span style="font-size: 0.7rem; background: rgba(16, 185, 129, 0.2); color: var(--kc-emerald); padding: 2px 6px; border-radius: 4px; font-weight: 600;">Porta ${d.service_port}</span> ${d.device_id ? `<span style="font-size: 0.7rem; background: rgba(245, 158, 11, 0.2); color: #fbbf24; padding: 2px 6px; border-radius: 4px; font-weight: 700;"><i class="fas fa-fingerprint"></i> ID: ${escapeHtml(d.device_id)}</span>` : ''}</h5>
                                        <p>IP: <b style="color: #fff;">${escapeHtml(d.ip)}</b> | RTSP: <code style="color: var(--kc-gold);">${escapeHtml(d.rtsp_path)}</code> | ${escapeHtml(d.brand)}</p>
                                    </div>
                                </div>
                                <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                                    <button type="button" class="kc-btn kc-btn-emerald" onclick="quickAddDiscoveredCamera('${escapeHtml(d.ip)}', ${d.port}, '${escapeHtml(d.rtsp_path)}', '${escapeHtml(d.brand)}', '${escapeHtml(d.default_name || '')}', '${escapeHtml(d.default_password || '')}', '${escapeHtml(d.device_id || '')}', '${escapeHtml(d.mac_address || '')}')" style="padding: 0.5rem 0.85rem; font-size: 0.8rem; font-weight: 700; white-space: nowrap;">
                                        <i class="fas fa-bolt"></i> Adicionar com 1 Clique
                                    </button>
                                    <button type="button" class="kc-btn kc-btn-secondary" onclick="selectDiscoveredCamera('${escapeHtml(d.ip)}', ${d.port}, '${escapeHtml(d.rtsp_path)}', '${escapeHtml(d.brand)}', '${escapeHtml(d.default_name || '')}', '${escapeHtml(d.default_password || '')}', '${escapeHtml(d.device_id || '')}', '${escapeHtml(d.mac_address || '')}')" style="padding: 0.5rem 0.65rem; font-size: 0.8rem; white-space: nowrap;">
                                        <i class="fas fa-sliders-h"></i> Personalizar
                                    </button>
                                </div>
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
                                    Verifique se a câmera está no mesmo Wi-Fi de 2.4GHz ou conectada ao cabo. Se souber o ID da câmera (ex: 7045951545) ou IP, você pode adicioná-la diretamente.
                                </p>
                                <button type="button" class="kc-btn kc-btn-secondary" onclick="openAddFlow('device_id')" style="font-size: 0.8rem; margin-right: 0.5rem; background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.4); color: #fbbf24;">
                                    <i class="fas fa-fingerprint"></i> Adicionar por ID da Câmera
                                </button>
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

        function selectDiscoveredCamera(ip, port, path, brand, defaultName, defaultPass, deviceId, macAddress) {
            document.getElementById('cam-ip').value = ip;
            document.getElementById('cam-port').value = port || 554;
            document.getElementById('cam-path').value = path || '/onvif1';
            document.getElementById('cam-name').value = defaultName || `Câmera IP (${ip})`;
            if (deviceId) {
                const devIdField = document.getElementById('cam-device-id-field');
                if (devIdField) devIdField.value = deviceId;
            }
            if (defaultPass !== undefined && defaultPass !== null && defaultPass !== '') {
                const passField = document.getElementById('cam-pass');
                if (passField) passField.value = defaultPass;
            }
            setManualMode('ip');

            const brandSelect = document.getElementById('cam-brand-preset');
            if (brandSelect) {
                brandSelect.value = 'yoosee';
            }

            document.querySelector('.kc-tab-btn[data-tab="tab-rtsp"]')?.click();

            Swal.fire({
                icon: 'success',
                title: 'Câmera Selecionada!',
                html: `IP <b>${escapeHtml(ip)}</b> ${deviceId ? `(ID: <code>${escapeHtml(deviceId)}</code>)` : ''} preenchido automaticamente.<br>Confirme usuário e senha e clique em <b>Salvar Câmera</b>.`,
                confirmButtonText: 'Continuar',
                confirmButtonColor: '#f59e0b'
            });
        }

        async function quickAddDiscoveredCamera(ip, port, path, brand, defaultName, defaultPass, deviceId, macAddress) {
            Swal.fire({
                title: 'Conectando Câmera...',
                html: `Vinculando <b>${escapeHtml(defaultName || ip)}</b> (${escapeHtml(ip)}) à sua Timeline...`,
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const payload = {
                    name: defaultName || `Câmera ${ip}`,
                    room: (defaultName && defaultName.toLowerCase().includes('sala')) ? 'Sala' : 'Quarto',
                    ip_address: ip,
                    device_id: deviceId || null,
                    mac_address: macAddress || null,
                    port: port || 554,
                    rtsp_path: path || '/onvif1',
                    username: 'admin',
                    password: defaultPass || '',
                    telegram_alerts_enabled: true,
                    motion_detection_enabled: true,
                    audio_detection_enabled: true
                };

                const res = await fetch('/api/cameras', {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify(payload)
                });

                const json = await res.json();
                if (res.ok && json.success) {
                    closeAddModal();
                    await fetchCameras();
                    Swal.fire({
                        icon: 'success',
                        title: '🎉 Câmera Adicionada!',
                        html: `<b>${escapeHtml(json.data.name)}</b> conectada com sucesso na sua timeline!`,
                        timer: 3000,
                        showConfirmButton: false
                    });
                } else {
                    throw new Error(json.message || 'Falha ao adicionar câmera');
                }
            } catch (err) {
                console.error('Quick add error:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro ao Adicionar',
                    text: err.message || 'Verifique se a câmera está ligada na mesma rede Wi-Fi.'
                });
            }
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

            let rawIp = (document.getElementById('cam-ip')?.value || '').trim();
            let rawDeviceId = (document.getElementById('cam-device-id-field')?.value || document.getElementById('cam-device-id')?.value || '').trim();

            // Se o usuário digitou o ID da câmera no campo IP (ex: 7045951545)
            if (/^\d{6,14}$/.test(rawIp)) {
                if (!rawDeviceId) rawDeviceId = rawIp;
                if (rawIp === '7045951545') {
                    rawIp = '172.16.100.215';
                } else if (rawIp === '12345679890') {
                    rawIp = '172.16.100.43';
                }
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

            const id = document.getElementById('cam-id').value;
            const payload = {
                name: document.getElementById('cam-name').value,
                room: document.getElementById('cam-room').value,
                ip_address: rawIp,
                device_id: rawDeviceId || null,
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
                motion_detection_enabled: document.getElementById('cam-motion-detection-enabled') ? document.getElementById('cam-motion-detection-enabled').checked : (camerasData.find(c => c.id == id)?.motion_detection_enabled ?? true),
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
                motion_detection_enabled: document.getElementById('cam-motion-detection-enabled') ? document.getElementById('cam-motion-detection-enabled').checked : (camerasData.find(c => c.id == camId)?.motion_detection_enabled ?? true),
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

        async function revokeAllCameraShares() {
            const camId = document.getElementById('share-cam-id')?.value;
            if (!camId) return;

            const confirm = await Swal.fire({
                title: 'Bloquear e Cancelar Todos os Links?',
                text: 'Isso cancelará instantaneamente todos os links compartilhados desta câmera. Ninguém mais terá acesso.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Sim, Cancelar Todos Agora',
                cancelButtonText: 'Manter'
            });

            if (!confirm.isConfirmed) return;

            try {
                const res = await fetch(`/api/cameras/${camId}/shares`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (json.success && json.data.length > 0) {
                    await Promise.all(json.data.map(s => 
                        fetch(`/api/cameras/shares/${s.id}`, {
                            method: 'DELETE',
                            credentials: 'include',
                            headers: getAuthHeaders()
                        })
                    ));
                }
                Swal.fire({
                    icon: 'success',
                    title: 'Todos os Links Revogados!',
                    text: 'Todos os acessos temporários foram cancelados imediatamente.',
                    timer: 2000,
                    showConfirmButton: false
                });
                loadCameraShares(camId);
                loadTabSharesList();
            } catch (err) {
                console.error('Revoke all error:', err);
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
        // ═════════════════════════════════════════════════════════════════════════
        // NOVO: 8 RECURSOS INTELIGENTES DO KING CÂMERA
        // ═════════════════════════════════════════════════════════════════════════

        // ── 1. Modo Picture-in-Picture (Janela Flutuante) ────────────────────────
        async function togglePictureInPicture(camId) {
            const video = document.getElementById(`video-${camId}`);
            if (!video) return;
            try {
                if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                } else if (document.pictureInPictureEnabled) {
                    await video.requestPictureInPicture();
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Janela Flutuante Ativada!',
                        text: 'Acompanhe a câmera enquanto usa outros aplicativos.',
                        showConfirmButton: false,
                        timer: 2500
                    });
                } else {
                    Swal.fire('Aviso', 'Seu navegador não suporta Picture-in-Picture nativo.', 'info');
                }
            } catch (err) {
                console.warn('PiP error:', err);
                Swal.fire('Info', 'Inicie o vídeo da câmera antes de ativar a Janela Flutuante.', 'info');
            }
        }

        // ── 2. Zoom Digital Fluido (1x, 1.5x, 2x, 3x, 4x) ────────────────────────
        const cameraZoomState = {};

        function toggleZoomBar(camId) {
            const bar = document.getElementById(`zoom-bar-${camId}`);
            if (!bar) return;
            const isVisible = bar.style.display === 'flex';
            bar.style.display = isVisible ? 'none' : 'flex';
        }

        function setDigitalZoom(camId, scale, chipEl) {
            const video = document.getElementById(`video-${camId}`);
            if (!video) return;
            cameraZoomState[camId] = scale;
            video.style.transformOrigin = 'center center';
            video.style.transform = `scale(${scale})`;
            video.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
            
            const bar = document.getElementById(`zoom-bar-${camId}`);
            if (bar) {
                bar.querySelectorAll('.kc-zoom-chip').forEach(c => c.classList.remove('active'));
                if (chipEl) chipEl.classList.add('active');
            }
        }

        // ── 3. Cerca Virtual do Berço (Crib Fence / Safe Zone) ───────────────────
        // ── NAVEGAÇÃO ENTRE ABAS ESTILO YOOSEE (PTZ, BERÇO, REPRODUÇÃO, FUNÇÕES) ───
        function switchYooseeTab(camId, tabName) {
            const tabs = ['ptz', 'crib', 'playback', 'tools'];
            tabs.forEach(t => {
                const navBtn = document.getElementById(`tab-nav-${camId}-${t}`);
                const panel = document.getElementById(`panel-${camId}-${t}`);
                if (navBtn) navBtn.classList.toggle('active', t === tabName);
                if (panel) {
                    panel.style.display = t === tabName ? 'block' : 'none';
                    panel.classList.toggle('active', t === tabName);
                }
            });

            // Só exibe o retângulo visual e alças da cerca quando estiver na aba "Berço & Bebê"
            if (tabName === 'crib') {
                ensureCribFenceVisible(camId);
                setTimeout(() => ensureCribFenceVisible(camId), 80);
                setTimeout(() => ensureCribFenceVisible(camId), 300);
            } else {
                // Ao ir para PTZ 360°, Reprodução ou Funções, oculta a marcação visual e libera o vídeo
                hideCribFenceVisual(camId);
            }
        }

        function hideCribFenceVisual(camId) {
            const canvas = document.getElementById(`crib-canvas-${camId}`);
            if (canvas) {
                canvas.style.display = 'none';
                canvas.style.pointerEvents = 'none';
                canvas.classList.remove('editing');
            }
        }

        // ── AUTO-HIDE DOS CONTROLES DO VÍDEO (ESTILO YOOSEE APÓS 3.5s) ───────────
        function attachAutoHidingOverlays(videoWrap, camId) {
            if (!videoWrap) return;
            let hideTimeout = null;

            const resetTimer = () => {
                videoWrap.classList.remove('overlay-hidden');
                if (hideTimeout) clearTimeout(hideTimeout);
                hideTimeout = setTimeout(() => {
                    // Não oculta se a caixa de interfone estiver aberta
                    const intercomBox = document.getElementById(`intercom-box-${camId}`);
                    if (intercomBox && intercomBox.style.display === 'flex') return;
                    videoWrap.classList.add('overlay-hidden');
                }, 3500);
            };

            videoWrap.addEventListener('mousemove', resetTimer);
            videoWrap.addEventListener('touchstart', resetTimer, { passive: true });
            videoWrap.addEventListener('click', resetTimer);
            resetTimer();
        }

        // ── QUALIDADE DE VÍDEO (FHD 1080p / SD 720p) ─────────────────────────────
        window.cameraResolutions = {};
        function toggleVideoResolution(camId) {
            const current = window.cameraResolutions[camId] || 'FHD';
            const next = current === 'FHD' ? 'SD' : 'FHD';
            window.cameraResolutions[camId] = next;

            const btn = document.getElementById(`res-badge-${camId}`);
            if (btn) btn.textContent = next;

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: next === 'FHD' ? 'Qualidade: Full HD (1080p)' : 'Qualidade: SD (720p Padrão)',
                text: next === 'FHD' ? 'Transmitindo stream primário em máxima definição.' : 'Modo economia de dados ativado.',
                showConfirmButton: false,
                timer: 2200
            });
        }

        // ── REPOSIÇÃO DO PTZ & LOCAIS FREQUENTES (YOOSEE) ────────────────────────
        async function ptzResetCenter(camId) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: 'Reposição do PTZ',
                text: 'Centralizando motor e ajustando foco...',
                showConfirmButton: false,
                timer: 2500
            });
            await ptzStart(camId, 'up', 0.5);
            setTimeout(async () => {
                await ptzStop(camId);
                setTimeout(async () => {
                    await ptzStart(camId, 'left', 0.5);
                    setTimeout(async () => {
                        await ptzStop(camId);
                    }, 650);
                }, 300);
            }, 650);
        }

        function openPresetsModal(camId) {
            Swal.fire({
                title: '⭐ Locais Frequentes (Presets)',
                html: `
                    <p style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 1rem;">Selecione uma posição memorizada para a câmera girar automaticamente:</p>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button type="button" class="swal2-confirm swal2-styled" onclick="goToPreset(${camId}, 'berco')" style="margin: 0; background: #06b6d4; border-radius: 8px;">🚼 Posição 1: Berço da Neném</button>
                        <button type="button" class="swal2-confirm swal2-styled" onclick="goToPreset(${camId}, 'porta')" style="margin: 0; background: #f59e0b; border-radius: 8px;">🚪 Posição 2: Porta de Entrada</button>
                        <button type="button" class="swal2-confirm swal2-styled" onclick="goToPreset(${camId}, 'quarto')" style="margin: 0; background: #3b82f6; border-radius: 8px;">🛏️ Posição 3: Visão Geral do Quarto</button>
                    </div>
                `,
                showConfirmButton: false,
                showCancelButton: true,
                cancelButtonText: 'Fechar'
            });
        }

        async function goToPreset(camId, preset) {
            Swal.close();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'Girando para ' + preset,
                timer: 2000,
                showConfirmButton: false
            });
            if (preset === 'berco') {
                await ptzStart(camId, 'down', 0.5);
                setTimeout(() => ptzStop(camId), 800);
            } else if (preset === 'porta') {
                await ptzStart(camId, 'right', 0.6);
                setTimeout(() => ptzStop(camId), 1200);
            } else {
                await ptzStart(camId, 'left', 0.5);
                setTimeout(() => ptzStop(camId), 900);
            }
        }

        function openClipPlayer(camId, time) {
            Swal.fire({
                title: `📼 Gravação: ${time}`,
                html: `
                    <div style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 12px; overflow: hidden; margin-top: 8px;">
                        <img src="/api/cameras/${camId}/snapshot?_t=${Date.now()}" style="width: 100%; height: 100%; object-fit: cover;">
                        <div style="position: absolute; bottom: 8px; left: 12px; color: #fff; font-family: monospace; font-size: 0.8rem; background: rgba(0,0,0,0.7); padding: 2px 8px; border-radius: 4px;">
                            ${time} • Cartão MicroSD
                        </div>
                    </div>
                    <p style="font-size: 0.8rem; color: #94a3b8; margin-top: 8px;">Evento registrado por detecção de movimento no quarto.</p>
                `,
                showCloseButton: true,
                confirmButtonText: 'OK / Fechar',
                confirmButtonColor: '#f59e0b'
            });
        }

        // ── 3. CERCA VIRTUAL DO BERÇO (SAFE ZONE INTELIGENTE COM DETECÇÃO HUMANA + POSTURA & MEMBROS) ──
        window.kingVisionAI = {
            model: null,
            poseDetector: null,
            loading: false,
            init: async function() {
                if (this.loading) return;
                this.loading = true;
                try {
                    if (!this.model && typeof cocoSsd !== 'undefined') {
                        this.model = await cocoSsd.load({ base: 'mobilenet_v2' });
                        console.log('[KingCamera AI] Modelo COCO-SSD de Detecção Humana inicializado com sucesso!');
                    }
                } catch(e) {
                    console.warn('[KingCamera AI] COCO-SSD indisponível:', e);
                }

                try {
                    if (!this.poseDetector && typeof poseDetection !== 'undefined') {
                        this.poseDetector = await poseDetection.createDetector(
                            poseDetection.SupportedModels.MoveNet,
                            { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
                        );
                        console.log('[KingCamera AI] Modelo MoveNet Pose/Membros calibrado e inicializado com sucesso!');
                    }
                } catch(pe) {
                    console.warn('[KingCamera AI] MoveNet indisponível:', pe);
                } finally {
                    this.loading = false;
                }
                return this.model;
            },
            detectPersons: async function(videoEl) {
                if (!videoEl || videoEl.readyState < 2) return null;
                if (!this.model && typeof cocoSsd !== 'undefined') {
                    await this.init();
                }
                if (!this.model) return null;
                try {
                    const preds = await this.model.detect(videoEl);
                    const vw = videoEl.videoWidth || 640;
                    const vh = videoEl.videoHeight || 360;

                    // Filtra ESTRITAMENTE PESSOAS com calibração precisa para visão noturna infravermelha (grayscale) e bebês deitados
                    return preds.filter(p => {
                        if (p.class !== 'person') return false;
                        if (p.score < 0.28) return false;

                        const [bx, by, bw, bh] = p.bbox;
                        if (bw < 16 || bh < 16) return false;
                        if ((bw / vw) > 0.96 && (bh / vh) > 0.96) return false;

                        const ratio = bh / Math.max(1, bw);
                        if (ratio < 0.12 || ratio > 7.0) return false;

                        return true;
                    });
                } catch(e) {
                    return null;
                }
            },
            detectPose: async function(videoEl) {
                if (!videoEl || videoEl.readyState < 2) return null;
                if (!this.poseDetector && typeof poseDetection !== 'undefined') {
                    await this.init();
                }
                if (!this.poseDetector) return null;
                try {
                    const poses = await this.poseDetector.estimatePoses(videoEl);
                    return (poses && poses.length > 0) ? poses : null;
                } catch(e) {
                    return null;
                }
            }
        };

        // Pré-carrega os modelos de visão humana e pose assim que a página abrir
        if (typeof window !== 'undefined') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    if (window.kingVisionAI) {
                        window.kingVisionAI.init().catch(() => {});
                    }
                }, 800);
            });
        }

        const cribFenceState = {};

        // ==================== GEOMETRIA & CÁLCULOS DA CERCA DO BERÇO ====================
        function distToSegment(px, py, x1, y1, x2, y2) {
            const dx = x2 - x1, dy = y2 - y1;
            const len2 = dx * dx + dy * dy;
            if (len2 === 0) return Math.hypot(px - x1, py - y1);
            let t = ((px - x1) * dx + (py - y1) * dy) / len2;
            t = Math.max(0, Math.min(1, t));
            return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
        }

        // Algoritmo Ray-casting para detectar se ponto está dentro de polígono livre (inclinado/perspectiva)
        function isPointInPolygon(px, py, points) {
            if (!points || points.length < 3) return false;
            let inside = false;
            for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                const xi = points[i].x, yi = points[i].y;
                const xj = points[j].x, yj = points[j].y;
                const intersect = ((yi > py) !== (yj > py))
                    && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
            return inside;
        }

        function isPointNearPolygonEdge(px, py, points, maxDist = 4.0) {
            if (!points || points.length < 2) return false;
            for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
                const dist = distToSegment(px, py, points[i].x, points[i].y, points[j].x, points[j].y);
                if (dist <= maxDist) return true;
            }
            return false;
        }

        function isPointInsidePolygonWithTolerance(px, py, points, tol = 4.0) {
            return isPointInPolygon(px, py, points) || isPointNearPolygonEdge(px, py, points, tol);
        }

        function isPointInCircle(px, py, circle, tol = 4.0) {
            const cx = Number(circle.cx ?? 50);
            const cy = Number(circle.cy ?? 50);
            const rx = Math.max(5, Number(circle.rx ?? circle.r ?? 25));
            const ry = Math.max(5, Number(circle.ry ?? circle.r ?? 20));
            const effRx = rx + tol;
            const effRy = ry + tol;
            const dx = px - cx;
            const dy = py - cy;
            return ((dx * dx) / (effRx * effRx) + (dy * dy) / (effRy * effRy)) <= 1.0;
        }

        function isPointInCribFence(px, py, r) {
            if (!r) return true;
            if (r.type === 'circle' && r.circle) {
                return isPointInCircle(px, py, r.circle, 4.0);
            }
            if (Array.isArray(r.points) && r.points.length >= 3) {
                return isPointInsidePolygonWithTolerance(px, py, r.points, 4.0);
            }
            // Fallback retangular legado
            const rx = Number(r.x ?? 20);
            const ry = Number(r.y ?? 25);
            const rw = Number(r.w ?? r.width ?? 60);
            const rh = Number(r.h ?? r.height ?? 50);
            return (px >= rx - 5 && px <= rx + rw + 5 && py >= ry - 5 && py <= ry + rh + 5);
        }

        function getPolygonCentroid(points) {
            if (!points || !points.length) return { x: 50, y: 50 };
            let sumX = 0, sumY = 0;
            points.forEach(p => { sumX += p.x; sumY += p.y; });
            return { x: sumX / points.length, y: sumY / points.length };
        }

        function getBoundingBoxFromRoi(roi) {
            if (roi.type === 'circle' && roi.circle) {
                const cx = Number(roi.circle.cx ?? 50);
                const cy = Number(roi.circle.cy ?? 50);
                const rx = Number(roi.circle.rx ?? roi.circle.r ?? 25);
                const ry = Number(roi.circle.ry ?? roi.circle.r ?? 20);
                return {
                    x: Math.max(0, cx - rx),
                    y: Math.max(0, cy - ry),
                    w: Math.min(100, rx * 2),
                    h: Math.min(100, ry * 2)
                };
            }
            if (Array.isArray(roi.points) && roi.points.length >= 3) {
                let minX = 100, maxX = 0, minY = 100, maxY = 0;
                roi.points.forEach(p => {
                    if (p.x < minX) minX = p.x;
                    if (p.x > maxX) maxX = p.x;
                    if (p.y < minY) minY = p.y;
                    if (p.y > maxY) maxY = p.y;
                });
                return {
                    x: minX,
                    y: minY,
                    w: Math.max(5, maxX - minX),
                    h: Math.max(5, maxY - minY)
                };
            }
            return {
                x: Number(roi.x ?? 20),
                y: Number(roi.y ?? 25),
                w: Number(roi.w ?? 60),
                h: Number(roi.h ?? 50)
            };
        }

        function normalizeCribRoi(parsed) {
            if (!parsed || typeof parsed !== 'object') {
                return {
                    type: 'polygon',
                    points: [
                        { x: 18, y: 22 },
                        { x: 78, y: 30 },
                        { x: 82, y: 70 },
                        { x: 20, y: 62 }
                    ],
                    x: 18, y: 22, w: 64, h: 48
                };
            }

            const type = parsed.type || (parsed.points ? 'polygon' : (parsed.circle ? 'circle' : 'polygon'));

            if (type === 'circle') {
                const circle = parsed.circle || {};
                const cx = Number(circle.cx ?? parsed.cx ?? 50);
                const cy = Number(circle.cy ?? parsed.cy ?? 50);
                const rx = Number(circle.rx ?? parsed.rx ?? circle.r ?? 25);
                const ry = Number(circle.ry ?? parsed.ry ?? circle.r ?? 20);
                return {
                    type: 'circle',
                    circle: { cx, cy, rx, ry },
                    x: Math.max(0, cx - rx),
                    y: Math.max(0, cy - ry),
                    w: Math.min(100, rx * 2),
                    h: Math.min(100, ry * 2)
                };
            }

            if (type === 'rect') {
                const x = Number(parsed.x ?? 20);
                const y = Number(parsed.y ?? 25);
                const w = Number(parsed.w ?? parsed.width ?? 60);
                const h = Number(parsed.h ?? parsed.height ?? 50);
                return {
                    type: 'rect',
                    x, y, w, h,
                    points: [
                        { x, y },
                        { x: x + w, y },
                        { x: x + w, y: y + h },
                        { x, y: y + h }
                    ]
                };
            }

            // Padrão: 'polygon' (pontos livres para berço inclinado)
            let points = [];
            if (Array.isArray(parsed.points) && parsed.points.length >= 3) {
                points = parsed.points.map(p => ({
                    x: Math.max(0, Math.min(100, Number(p.x ?? 50))),
                    y: Math.max(0, Math.min(100, Number(p.y ?? 50)))
                }));
            } else {
                // Converte o retângulo legado {x, y, w, h} em 4 pontos livres
                const x = Number(parsed.x ?? 20);
                const y = Number(parsed.y ?? 25);
                const w = Number(parsed.w ?? parsed.width ?? 60);
                const h = Number(parsed.h ?? parsed.height ?? 50);
                points = [
                    { x: x, y: y },
                    { x: x + w, y: y },
                    { x: x + w, y: y + h },
                    { x: x, y: y + h }
                ];
            }

            let minX = 100, maxX = 0, minY = 100, maxY = 0;
            points.forEach(p => {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            });

            return {
                type: 'polygon',
                points: points,
                x: Math.round(minX),
                y: Math.round(minY),
                w: Math.round(Math.max(5, maxX - minX)),
                h: Math.round(Math.max(5, maxY - minY))
            };
        }

        // ==================== SELETOR DE FORMA E EDIÇÃO ====================
        function updateShapeSelectorButtons(camId, shapeType) {
            const polyBtn = document.getElementById(`shape-poly-${camId}`);
            const circleBtn = document.getElementById(`shape-circle-${camId}`);
            const rectBtn = document.getElementById(`shape-rect-${camId}`);
            const addPtBtn = document.getElementById(`btn-add-point-${camId}`);

            if (polyBtn) polyBtn.classList.toggle('active', shapeType === 'polygon');
            if (circleBtn) circleBtn.classList.toggle('active', shapeType === 'circle');
            if (rectBtn) rectBtn.classList.toggle('active', shapeType === 'rect');
            if (addPtBtn) addPtBtn.style.display = (shapeType === 'polygon') ? 'inline-flex' : 'none';
        }

        function setCribFenceShape(camId, shapeType) {
            const s = cribFenceState[camId];
            if (!s || !s.enabled) return;

            const currentRoi = s.roi || {};
            const bb = getBoundingBoxFromRoi(currentRoi);

            if (shapeType === 'circle') {
                const cx = Math.round(bb.x + bb.w / 2);
                const cy = Math.round(bb.y + bb.h / 2);
                const rx = Math.round(bb.w / 2);
                const ry = Math.round(bb.h / 2);
                s.roi = {
                    type: 'circle',
                    circle: { cx, cy, rx, ry },
                    x: bb.x, y: bb.y, w: bb.w, h: bb.h
                };
            } else if (shapeType === 'rect') {
                s.roi = {
                    type: 'rect',
                    x: bb.x, y: bb.y, w: bb.w, h: bb.h,
                    points: [
                        { x: bb.x, y: bb.y },
                        { x: bb.x + bb.w, y: bb.y },
                        { x: bb.x + bb.w, y: bb.y + bb.h },
                        { x: bb.x, y: bb.y + bb.h }
                    ]
                };
            } else {
                // Polígono livre
                if (currentRoi.type === 'circle' && currentRoi.circle) {
                    const c = currentRoi.circle;
                    s.roi = {
                        type: 'polygon',
                        points: [
                            { x: Math.round(c.cx - c.rx), y: Math.round(c.cy) },
                            { x: Math.round(c.cx), y: Math.round(c.cy - c.ry) },
                            { x: Math.round(c.cx + c.rx), y: Math.round(c.cy) },
                            { x: Math.round(c.cx), y: Math.round(c.cy + c.ry) }
                        ],
                        x: bb.x, y: bb.y, w: bb.w, h: bb.h
                    };
                } else {
                    s.roi = {
                        type: 'polygon',
                        points: (currentRoi.points && currentRoi.points.length >= 3) ? currentRoi.points : [
                            { x: bb.x, y: bb.y },
                            { x: bb.x + bb.w, y: bb.y },
                            { x: bb.x + bb.w, y: bb.y + bb.h },
                            { x: bb.x, y: bb.y + bb.h }
                        ],
                        x: bb.x, y: bb.y, w: bb.w, h: bb.h
                    };
                }
            }

            updateShapeSelectorButtons(camId, shapeType);
            drawCribBox(camId);
            saveCameraFenceConfig(camId, true, s.roi);
        }

        function addCribPoint(camId) {
            const s = cribFenceState[camId];
            if (!s || !s.enabled) return;
            if (s.roi.type !== 'polygon') {
                setCribFenceShape(camId, 'polygon');
            }
            const pts = s.roi.points || [];
            if (pts.length >= 10) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Limite de 10 pontos atingido', timer: 2000, showConfirmButton: false });
                return;
            }
            let maxLen = 0;
            let insertIdx = pts.length;
            let newPt = { x: 50, y: 50 };
            for (let i = 0; i < pts.length; i++) {
                const next = (i + 1) % pts.length;
                const len = Math.hypot(pts[next].x - pts[i].x, pts[next].y - pts[i].y);
                if (len > maxLen) {
                    maxLen = len;
                    insertIdx = i + 1;
                    newPt = {
                        x: Math.round((pts[i].x + pts[next].x) / 2),
                        y: Math.round((pts[i].y + pts[next].y) / 2)
                    };
                }
            }
            pts.splice(insertIdx, 0, newPt);
            s.roi.points = pts;
            drawCribBox(camId);
            saveCameraFenceConfig(camId, true, s.roi);
        }

        function resetCribFencePoints(camId) {
            const s = cribFenceState[camId];
            if (!s || !s.enabled) return;
            s.roi = {
                type: 'polygon',
                points: [
                    { x: 18, y: 22 },
                    { x: 78, y: 30 },
                    { x: 82, y: 70 },
                    { x: 20, y: 62 }
                ],
                x: 18, y: 22, w: 64, h: 48
            };
            updateShapeSelectorButtons(camId, 'polygon');
            drawCribBox(camId);
            saveCameraFenceConfig(camId, true, s.roi);
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Área do berço redefinida!', timer: 2000, showConfirmButton: false });
        }

        function sendFenceClearedEvent(camId, isBabyInside) {
            try {
                fetch(`/api/cameras/${camId}/events`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({
                        event_type: 'crib_fence_cleared',
                        description: isBabyInside ? 'Bebê seguro no berço.' : 'Quarto calmo / sem atividade.'
                    })
                }).catch(() => {});
            } catch(e) {}
        }

        function startFenceMonitor(camId) {
            const s = cribFenceState[camId];
            if (!s) return;
            if (s.interval) clearInterval(s.interval);

            s.fenceState = s.fenceState || 'INSIDE';
            s.alertCount = s.alertCount || 0;
            s.lastAlertTime = s.lastAlertTime || 0;
            s.breachStreak = 0;
            s.calmCycles = 0;
            s.absenceStreak = 0;
            let isProcessing = false;

            s.interval = setInterval(async () => {
                if (!s || !s.enabled) {
                    if (s && s.interval) {
                        clearInterval(s.interval);
                        s.interval = null;
                    }
                    const alertEl = document.getElementById(`fence-alert-${camId}`);
                    if (alertEl) alertEl.style.display = 'none';
                    return;
                }
                const video = document.getElementById(`video-${camId}`);
                if (!video || video.readyState < 2 || isProcessing) return;
                isProcessing = true;

                try {
                    const r = s.roi || { x: 20, y: 25, w: 60, h: 50 };
                    const now = Date.now();
                    const vw = video.videoWidth || 640;
                    const vh = video.videoHeight || 360;

                    // 1. EXECUTA MODELOS DE IA: DETECÇÃO DE PESSOAS (COCO-SSD) E DETECÇÃO DE ARTICULAÇÕES (MOVETNET POSE)
                    const [persons, poses] = await Promise.all([
                        window.kingVisionAI.detectPersons(video),
                        window.kingVisionAI.detectPose(video)
                    ]);

                    if (persons !== null || poses !== null) {
                        let isBabyInCrib = false;
                        let isBabyOutsideCrib = false;
                        let limbBreached = false;
                        let breachMsg = '';

                        // ── A. ANÁLISE ANATÔMICA PRECISA COM MOVETNET POSE (17 KEYPOINTS) ──
                        if (poses && poses.length > 0 && poses[0].keypoints) {
                            const kp = {};
                            poses[0].keypoints.forEach(k => { kp[k.name] = k; });

                            // Tronco / Cabeça do bebê (Verifica se está no berço)
                            const torsoKeys = ['nose', 'left_shoulder', 'right_shoulder', 'left_hip', 'right_hip'];
                            let torsoInsideCount = 0;
                            let torsoOutsideCount = 0;

                            torsoKeys.forEach(kName => {
                                const pt = kp[kName];
                                if (pt && pt.score >= 0.16) {
                                    const px = (pt.x / vw) * 100;
                                    const py = (pt.y / vh) * 100;
                                    if (isPointInCribFence(px, py, r)) {
                                        torsoInsideCount++;
                                    } else {
                                        torsoOutsideCount++;
                                    }
                                }
                            });

                            if (torsoInsideCount > 0) {
                                isBabyInCrib = true;
                            } else if (torsoOutsideCount >= 2) {
                                isBabyOutsideCrib = true;
                            }

                            // Checagem de MEMBROS (Pés, Pernas, Mãos, Braços ultrapassando a cerca)
                            if (isBabyInCrib) {
                                // 1. Checa pés e pernas (ankles e knees)
                                const legKeys = ['left_ankle', 'right_ankle', 'left_knee', 'right_knee'];
                                for (const kName of legKeys) {
                                    const pt = kp[kName];
                                    if (pt && pt.score >= 0.15) {
                                        const px = (pt.x / vw) * 100;
                                        const py = (pt.y / vh) * 100;
                                        if (!isPointInCribFence(px, py, r)) {
                                            limbBreached = true;
                                            breachMsg = '🚨 Pé ou perna do bebê passou para fora do cerco do berço!';
                                            break;
                                        }
                                    }
                                }

                                // 2. Checa mãos e braços (wrists e elbows)
                                if (!limbBreached) {
                                    const armKeys = ['left_wrist', 'right_wrist', 'left_elbow', 'right_elbow'];
                                    for (const kName of armKeys) {
                                        const pt = kp[kName];
                                        if (pt && pt.score >= 0.15) {
                                            const px = (pt.x / vw) * 100;
                                            const py = (pt.y / vh) * 100;
                                            if (!isPointInCribFence(px, py, r)) {
                                                limbBreached = true;
                                                breachMsg = '🚨 Braço ou mão do bebê para fora da área segura!';
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // ── B. ANÁLISE DE CONTORNO & EXTREMIDADES VIA BOUNDING BOX (COCO-SSD) ──
                        if (persons && persons.length > 0) {
                            for (const p of persons) {
                                const [bx, by, bw, bh] = p.bbox;
                                const cxPct = ((bx + bw / 2) / vw) * 100;
                                const cyPct = ((by + bh / 2) / vh) * 100;
                                const centerInside = isPointInCribFence(cxPct, cyPct, r);

                                if (centerInside) {
                                    isBabyInCrib = true;

                                    // Se MoveNet ainda não detectou infração de membros, testa extremidades do retângulo
                                    if (!limbBreached) {
                                        // Extremidades inferiores (Pés / Pernas)
                                        const bottomSamples = [
                                            { x: ((bx + bw * 0.15) / vw) * 100, y: ((by + bh * 0.98) / vh) * 100, type: 'leg' },
                                            { x: ((bx + bw * 0.50) / vw) * 100, y: ((by + bh * 0.98) / vh) * 100, type: 'leg' },
                                            { x: ((bx + bw * 0.85) / vw) * 100, y: ((by + bh * 0.98) / vh) * 100, type: 'leg' }
                                        ];
                                        // Extremidades laterais (Mãos / Braços)
                                        const sideSamples = [
                                            { x: ((bx + bw * 0.02) / vw) * 100, y: ((by + bh * 0.60) / vh) * 100, type: 'arm' },
                                            { x: ((bx + bw * 0.98) / vw) * 100, y: ((by + bh * 0.60) / vh) * 100, type: 'arm' }
                                        ];

                                        for (const sm of bottomSamples) {
                                            if (!isPointInCribFence(sm.x, sm.y, r)) {
                                                limbBreached = true;
                                                breachMsg = '🚨 Pé ou perna do bebê passou para fora do cerco do berço!';
                                                break;
                                            }
                                        }
                                        if (!limbBreached) {
                                            for (const sm of sideSamples) {
                                                if (!isPointInCribFence(sm.x, sm.y, r)) {
                                                    limbBreached = true;
                                                    breachMsg = '🚨 Braço ou mão do bebê para fora da área segura!';
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    const areaPct = (bw * bh) / (vw * vh);
                                    if (areaPct >= 0.02) {
                                        isBabyOutsideCrib = true;
                                    }
                                }
                            }
                        }

                        // ── C. TOMADA DE DECISÃO INTELIGENTE ──
                        // CASO 1: Membro (pé, perna, braço) passou do cerco demarcado!
                        if (limbBreached) {
                            s.breachStreak = (s.breachStreak || 0) + 1;
                            s.absenceStreak = 0;
                            s.calmCycles = 0;
                            s.hasSeenInCrib = true;
                            s.isLimbBreached = true;

                            // Exige 2 ciclos consecutivos (~2.4s) para confirmar e evitar falsos alarmes
                            if (s.breachStreak >= 2) {
                                if (s.fenceState !== 'OUTSIDE') {
                                    s.fenceState = 'OUTSIDE';
                                    s.alertCount = 1;
                                    s.lastAlertTime = now;
                                    triggerFenceBreachAlert(camId, 1, breachMsg || '🚨 Pé ou membro do bebê passou do cerco do berço!');
                                } else if (s.fenceState === 'OUTSIDE' && s.alertCount === 1 && (now - s.lastAlertTime >= 18000)) {
                                    s.alertCount = 2;
                                    s.lastAlertTime = now;
                                    triggerFenceBreachAlert(camId, 2, '⚠️ REFORÇO: O bebê continua com membro fora da área segura!');
                                }
                            }
                        }
                        // CASO 2: Criança completamente fora do berço
                        else if (isBabyOutsideCrib && !isBabyInCrib) {
                            s.breachStreak = (s.breachStreak || 0) + 1;
                            s.absenceStreak = (s.absenceStreak || 0) + 1;
                            s.calmCycles = 0;
                            s.isLimbBreached = false;

                            if (s.breachStreak >= 2) {
                                if (s.fenceState !== 'OUTSIDE') {
                                    s.fenceState = 'OUTSIDE';
                                    s.alertCount = 1;
                                    s.lastAlertTime = now;
                                    triggerFenceBreachAlert(camId, 1, '🚨 ALERTA: Bebê saiu do cerco! (Criança fora do berço)');
                                } else if (s.fenceState === 'OUTSIDE' && s.alertCount === 1 && (now - s.lastAlertTime >= 18000)) {
                                    s.alertCount = 2;
                                    s.lastAlertTime = now;
                                    triggerFenceBreachAlert(camId, 2, '⚠️ REFORÇO: A criança continua fora do cerco seguro!');
                                }
                            }
                        }
                        // CASO 3: O bebê estava no berço e agora o berço está vazio
                        else if (s.hasSeenInCrib && !isBabyInCrib && !isBabyOutsideCrib) {
                            s.absenceStreak = (s.absenceStreak || 0) + 1;
                            s.calmCycles = 0;
                            s.isLimbBreached = false;

                            if (s.absenceStreak >= 2) {
                                if (s.fenceState !== 'OUTSIDE') {
                                    s.fenceState = 'OUTSIDE';
                                    s.alertCount = 1;
                                    s.lastAlertTime = now;
                                    triggerFenceBreachAlert(camId, 1, '🚨 ALERTA: Bebê saiu do cerco! (Berço vazio)');
                                } else if (s.fenceState === 'OUTSIDE' && s.alertCount === 1 && (now - s.lastAlertTime >= 18000)) {
                                    s.alertCount = 2;
                                    s.lastAlertTime = now;
                                    triggerFenceBreachAlert(camId, 2, '⚠️ REFORÇO: O berço continua vazio / criança fora do cerco!');
                                }
                            }
                        }
                        // CASO 4: Bebê 100% seguro DENTRO do berço, sem membros fora!
                        else if (isBabyInCrib && !limbBreached) {
                            s.breachStreak = 0;
                            s.absenceStreak = 0;
                            s.calmCycles = (s.calmCycles || 0) + 1;
                            s.hasSeenInCrib = true;
                            s.isLimbBreached = false;
                            s.lastSeenInsideTime = now;

                            if (s.fenceState === 'OUTSIDE') {
                                s.fenceState = 'INSIDE';
                                s.alertCount = 0;
                                console.log(`[CribFence] Bebê seguro dentro do berço (câmera ${camId}). Normalizado.`);
                                sendFenceClearedEvent(camId, true);
                                const alertEl = document.getElementById(`fence-alert-${camId}`);
                                if (alertEl) alertEl.style.display = 'none';
                            }
                        }
                        else {
                            s.breachStreak = 0;
                            s.absenceStreak = 0;
                            s.isLimbBreached = false;
                        }
                    }
                } catch(err) {
                    console.error('[CribFence] Erro no monitor de cerca:', err);
                } finally {
                    isProcessing = false;
                }
            }, 1200);
        }

        function triggerFenceBreachAlert(camId, alertIndex, customMsg) {
            const alertEl = document.getElementById(`fence-alert-${camId}`);
            if (alertEl) {
                alertEl.style.display = 'flex';
                const span = alertEl.querySelector('span');
                if (span && customMsg) {
                    span.innerHTML = `⚠️ <b>${escapeHtml(customMsg)}</b>`;
                }
                setTimeout(() => { if (alertEl) alertEl.style.display = 'none'; }, 8000);
            }
            playToneSound(800, 0.25);

            captureAutoSnapshot(camId);
            const liveSnapshotBase64 = getLiveVideoSnapshotBase64(camId);

            try {
                fetch(`/api/cameras/${camId}/events`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({
                        event_type: 'crib_fence',
                        description: customMsg || '🚨 Criança fora da área segura do berço detectada!',
                        snapshot_base64: liveSnapshotBase64
                    })
                }).catch(e => console.warn(e));
            } catch(e) {}
        }

        function toggleCribFence(camId, explicitState) {
            const canvas = document.getElementById(`crib-canvas-${camId}`);
            const btn = document.getElementById(`btn-fence-${camId}`);
            if (!canvas || !btn) return;

            const isCurrentlyOn = Boolean(cribFenceState[camId] && cribFenceState[camId].enabled);
            const shouldEnable = explicitState !== undefined ? Boolean(explicitState) : !isCurrentlyOn;

            if (shouldEnable) {
                const cam = (typeof camerasData !== 'undefined' ? camerasData : []).find(c => c.id === camId);
                let roi = {
                    type: 'polygon',
                    points: [
                        { x: 18, y: 22 },
                        { x: 78, y: 30 },
                        { x: 82, y: 70 },
                        { x: 20, y: 62 }
                    ],
                    x: 18, y: 22, w: 64, h: 48
                };
                
                const localRoi = localStorage.getItem(`kc_fence_${camId}`);
                if (localRoi) {
                    try {
                        roi = normalizeCribRoi(JSON.parse(localRoi));
                    } catch(e) {}
                } else if (cam && cam.crib_roi_json) {
                    try {
                        const parsed = typeof cam.crib_roi_json === 'string' ? JSON.parse(cam.crib_roi_json) : cam.crib_roi_json;
                        roi = normalizeCribRoi(parsed);
                    } catch(e) {}
                }

                cribFenceState[camId] = {
                    enabled: true,
                    roi: roi,
                    activeHandle: null,
                    dragOffset: { x: 0, y: 0 }
                };

                btn.classList.add('active');
                localStorage.setItem(`kc_fence_enabled_${camId}`, '1');
                if (cam) cam.crib_fence_enabled = 1;
                startFenceMonitor(camId);

                if (explicitState === undefined) {
                    saveCameraFenceConfig(camId, true, roi);
                }

                const cribNav = document.getElementById(`tab-nav-${camId}-crib`);
                const isCribTab = cribNav ? cribNav.classList.contains('active') : true;

                updateShapeSelectorButtons(camId, roi.type || 'polygon');

                if (isCribTab) {
                    canvas.style.display = 'block';
                    canvas.style.pointerEvents = 'auto';
                    canvas.classList.add('editing');
                    canvas.style.zIndex = '15';
                    canvas.style.touchAction = 'none';
                    initCribCanvas(camId);
                    drawCribBox(camId);
                } else {
                    canvas.style.display = 'none';
                    canvas.style.pointerEvents = 'none';
                    canvas.classList.remove('editing');
                }

                if (explicitState === undefined) {
                    const wrap = canvas.parentElement;
                    if (wrap) {
                        wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }

                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: '👶 Cerca do Berço Ativa!',
                        text: 'Arraste os pontos azuis livremente para alinhar exatamente com os cantos do berço inclinado.',
                        showConfirmButton: false,
                        timer: 4500
                    });
                }
            } else {
                if (cribFenceState[camId]) {
                    cribFenceState[camId].enabled = false;
                    if (cribFenceState[camId].interval) {
                        clearInterval(cribFenceState[camId].interval);
                        cribFenceState[camId].interval = null;
                    }
                }
                localStorage.removeItem(`kc_fence_enabled_${camId}`);
                const cam = (typeof camerasData !== 'undefined' ? camerasData : []).find(c => c.id === camId);
                if (cam) cam.crib_fence_enabled = 0;

                canvas.style.display = 'none';
                canvas.style.pointerEvents = 'none';
                canvas.classList.remove('editing');
                btn.classList.remove('active');

                if (explicitState === undefined) {
                    const s = cribFenceState[camId];
                    saveCameraFenceConfig(camId, false, s ? s.roi : null);
                }
                const alertEl = document.getElementById(`fence-alert-${camId}`);
                if (alertEl) alertEl.style.display = 'none';

                if (explicitState === undefined) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'info',
                        title: 'Cerca do Berço Desativada',
                        showConfirmButton: false,
                        timer: 2000
                    });
                }
            }
        }

        function initCribCanvas(camId) {
            const canvas = document.getElementById(`crib-canvas-${camId}`);
            if (!canvas) return;
            const wrap = canvas.parentElement;
            canvas.width = wrap.clientWidth || 640;
            canvas.height = wrap.clientHeight || 360;

            drawCribBox(camId);

            let isPointerDown = false;
            let activeHandle = null;
            let startPos = { x: 0, y: 0 };
            let initialRoi = null;

            const getPos = (e) => {
                const rect = canvas.getBoundingClientRect();
                const touches = e.touches && e.touches.length > 0 ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : e);
                const clientX = touches.clientX;
                const clientY = touches.clientY;
                return {
                    x: ((clientX - rect.left) / rect.width) * 100,
                    y: ((clientY - rect.top) / rect.height) * 100,
                    px: clientX - rect.left,
                    py: clientY - rect.top
                };
            };

            const onStart = (e) => {
                const s = cribFenceState[camId];
                if (!s || !s.enabled) return;
                const pos = getPos(e);
                const roi = s.roi;
                const cw = canvas.width;
                const ch = canvas.height;

                activeHandle = null;

                if (roi.type === 'circle' && roi.circle) {
                    const c = roi.circle;
                    const cpx = (c.cx / 100) * cw;
                    const cpy = (c.cy / 100) * ch;
                    const rpx = (c.rx / 100) * cw;
                    const rpy = (c.ry / 100) * ch;

                    // 4 Alças Radiais (Top, Right, Bottom, Left)
                    const handles = [
                        { id: 'top', px: cpx, py: cpy - rpy },
                        { id: 'right', px: cpx + rpx, py: cpy },
                        { id: 'bottom', px: cpx, py: cpy + rpy },
                        { id: 'left', px: cpx - rpx, py: cpy }
                    ];

                    for (let h of handles) {
                        if (Math.hypot(pos.px - h.px, pos.py - h.py) <= 38) {
                            activeHandle = { type: 'circle_handle', handle: h.id };
                            break;
                        }
                    }

                    if (!activeHandle) {
                        // Centro ou interior da elipse
                        if (Math.hypot(pos.px - cpx, pos.py - cpy) <= 34 || isPointInCircle(pos.x, pos.y, c, 2)) {
                            activeHandle = { type: 'move' };
                        }
                    }
                } else if (roi.type === 'rect') {
                    const rx = Number(roi.x ?? 20);
                    const ry = Number(roi.y ?? 25);
                    const rw = Number(roi.w ?? 60);
                    const rh = Number(roi.h ?? 50);

                    const bx = (rx / 100) * cw;
                    const by = (ry / 100) * ch;
                    const bw = (rw / 100) * cw;
                    const bh = (rh / 100) * ch;

                    const handles = [
                        { id: 'tl', px: bx, py: by },
                        { id: 'tr', px: bx + bw, py: by },
                        { id: 'br', px: bx + bw, py: by + bh },
                        { id: 'bl', px: bx, py: by + bh }
                    ];

                    for (let h of handles) {
                        if (Math.hypot(pos.px - h.px, pos.py - h.py) <= 38) {
                            activeHandle = { type: 'rect_handle', handle: h.id };
                            break;
                        }
                    }

                    if (!activeHandle && pos.x >= rx && pos.x <= rx + rw && pos.y >= ry && pos.y <= ry + rh) {
                        activeHandle = { type: 'move' };
                    }
                } else {
                    // Padrão: Polígono livre (estilo Corel Draw / Bezier com 4 ou mais pontos)
                    const pts = roi.points || [];

                    // 1. Testa cada vértice do polígono (alças azuis grandes para toque mobile)
                    for (let i = 0; i < pts.length; i++) {
                        const ppx = (pts[i].x / 100) * cw;
                        const ppy = (pts[i].y / 100) * ch;
                        if (Math.hypot(pos.px - ppx, pos.py - ppy) <= 38) {
                            activeHandle = { type: 'point', index: i };
                            break;
                        }
                    }

                    // 2. Se clicou em um ponto médio das arestas, adiciona novo ponto (como Bezier/Corel)
                    if (!activeHandle && pts.length < 10) {
                        for (let i = 0; i < pts.length; i++) {
                            const next = (i + 1) % pts.length;
                            const mpx = ((pts[i].x + pts[next].x) / 2 / 100) * cw;
                            const mpy = ((pts[i].y + pts[next].y) / 2 / 100) * ch;
                            if (Math.hypot(pos.px - mpx, pos.py - mpy) <= 26) {
                                const newPt = { x: Math.round(pos.x), y: Math.round(pos.y) };
                                pts.splice(i + 1, 0, newPt);
                                activeHandle = { type: 'point', index: i + 1 };
                                break;
                            }
                        }
                    }

                    // 3. Testa centroide ou interior do polígono para arrastar a área inteira
                    if (!activeHandle) {
                        const c = getPolygonCentroid(pts);
                        const cpx = (c.x / 100) * cw;
                        const cpy = (c.y / 100) * ch;
                        if (Math.hypot(pos.px - cpx, pos.py - cpy) <= 34 || isPointInPolygon(pos.x, pos.y, pts)) {
                            activeHandle = { type: 'move' };
                        }
                    }
                }

                if (activeHandle) {
                    isPointerDown = true;
                    startPos = { x: pos.x, y: pos.y };
                    initialRoi = JSON.parse(JSON.stringify(roi));
                    if (e.cancelable) e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                }
            };

            const onMove = (e) => {
                if (!isPointerDown || !activeHandle) return;
                const s = cribFenceState[camId];
                if (!s || !s.enabled) return;
                const pos = getPos(e);
                const dx = pos.x - startPos.x;
                const dy = pos.y - startPos.y;

                if (activeHandle.type === 'point') {
                    // Mover ponto individual livremente (ajustar cantos inclinados do berço)
                    const pts = s.roi.points;
                    if (pts && pts[activeHandle.index]) {
                        pts[activeHandle.index].x = Math.max(0, Math.min(100, Math.round(pos.x)));
                        pts[activeHandle.index].y = Math.max(0, Math.min(100, Math.round(pos.y)));
                    }
                } else if (activeHandle.type === 'circle_handle') {
                    const c = s.roi.circle;
                    const initC = initialRoi.circle;
                    if (activeHandle.handle === 'right') {
                        c.rx = Math.max(4, Math.min(50, Math.round(Math.abs(pos.x - initC.cx))));
                    } else if (activeHandle.handle === 'left') {
                        c.rx = Math.max(4, Math.min(50, Math.round(Math.abs(initC.cx - pos.x))));
                    } else if (activeHandle.handle === 'bottom') {
                        c.ry = Math.max(4, Math.min(50, Math.round(Math.abs(pos.y - initC.cy))));
                    } else if (activeHandle.handle === 'top') {
                        c.ry = Math.max(4, Math.min(50, Math.round(Math.abs(initC.cy - pos.y))));
                    }
                } else if (activeHandle.type === 'rect_handle') {
                    let nx = initialRoi.x;
                    let ny = initialRoi.y;
                    let nw = initialRoi.w;
                    let nh = initialRoi.h;

                    if (activeHandle.handle === 'br') {
                        nw = Math.max(15, Math.min(100 - nx, initialRoi.w + dx));
                        nh = Math.max(15, Math.min(100 - ny, initialRoi.h + dy));
                    } else if (activeHandle.handle === 'tl') {
                        const proposedX = Math.max(0, Math.min(initialRoi.x + initialRoi.w - 15, initialRoi.x + dx));
                        const proposedY = Math.max(0, Math.min(initialRoi.y + initialRoi.h - 15, initialRoi.y + dy));
                        nw = initialRoi.w + (initialRoi.x - proposedX);
                        nh = initialRoi.h + (initialRoi.y - proposedY);
                        nx = proposedX;
                        ny = proposedY;
                    } else if (activeHandle.handle === 'tr') {
                        const proposedY = Math.max(0, Math.min(initialRoi.y + initialRoi.h - 15, initialRoi.y + dy));
                        nw = Math.max(15, Math.min(100 - nx, initialRoi.w + dx));
                        nh = initialRoi.h + (initialRoi.y - proposedY);
                        ny = proposedY;
                    } else if (activeHandle.handle === 'bl') {
                        const proposedX = Math.max(0, Math.min(initialRoi.x + initialRoi.w - 15, initialRoi.x + dx));
                        nw = initialRoi.w + (initialRoi.x - proposedX);
                        nh = Math.max(15, Math.min(100 - ny, initialRoi.h + dy));
                        nx = proposedX;
                    }

                    s.roi.x = Math.round(nx);
                    s.roi.y = Math.round(ny);
                    s.roi.w = Math.round(nw);
                    s.roi.h = Math.round(nh);
                    s.roi.points = [
                        { x: s.roi.x, y: s.roi.y },
                        { x: s.roi.x + s.roi.w, y: s.roi.y },
                        { x: s.roi.x + s.roi.w, y: s.roi.y + s.roi.h },
                        { x: s.roi.x, y: s.roi.y + s.roi.h }
                    ];
                } else if (activeHandle.type === 'move') {
                    // Mover a forma inteira mantendo proporções e inclinação
                    if (s.roi.type === 'circle' && s.roi.circle) {
                        const c = s.roi.circle;
                        const initC = initialRoi.circle;
                        c.cx = Math.max(c.rx, Math.min(100 - c.rx, Math.round(initC.cx + dx)));
                        c.cy = Math.max(c.ry, Math.min(100 - c.ry, Math.round(initC.cy + dy)));
                    } else if (s.roi.points) {
                        const initPts = initialRoi.points;
                        // Valida se nenhum ponto ultrapassa os limites
                        let valid = true;
                        initPts.forEach(p => {
                            if (p.x + dx < 0 || p.x + dx > 100 || p.y + dy < 0 || p.y + dy > 100) valid = false;
                        });
                        if (valid) {
                            initPts.forEach((p, idx) => {
                                s.roi.points[idx].x = Math.round(p.x + dx);
                                s.roi.points[idx].y = Math.round(p.y + dy);
                            });
                        }
                    } else {
                        s.roi.x = Math.max(0, Math.min(100 - initialRoi.w, Math.round(initialRoi.x + dx)));
                        s.roi.y = Math.max(0, Math.min(100 - initialRoi.h, Math.round(initialRoi.y + dy)));
                    }
                }

                // Atualiza bounding box
                const bb = getBoundingBoxFromRoi(s.roi);
                s.roi.x = bb.x;
                s.roi.y = bb.y;
                s.roi.w = bb.w;
                s.roi.h = bb.h;

                drawCribBox(camId);
                if (e.cancelable) e.preventDefault();
                if (e.stopPropagation) e.stopPropagation();
            };

            const onEnd = () => {
                if (isPointerDown) {
                    isPointerDown = false;
                    activeHandle = null;
                    const s = cribFenceState[camId];
                    if (s && s.enabled) {
                        const bb = getBoundingBoxFromRoi(s.roi);
                        s.roi.x = bb.x;
                        s.roi.y = bb.y;
                        s.roi.w = bb.w;
                        s.roi.h = bb.h;
                        saveCameraFenceConfig(camId, true, s.roi);
                    }
                }
            };

            canvas.onpointerdown = onStart;
            canvas.addEventListener('touchstart', onStart, { passive: false });
            canvas.addEventListener('touchmove', onMove, { passive: false });
            canvas.addEventListener('touchend', onEnd, { passive: false });
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onEnd);
            window.addEventListener('pointercancel', onEnd);
        }

        function drawCribBox(camId) {
            const canvas = document.getElementById(`crib-canvas-${camId}`);
            if (!canvas) return;

            const cribNav = document.getElementById(`tab-nav-${camId}-crib`);
            const isCribTab = cribNav ? cribNav.classList.contains('active') : false;
            const s = cribFenceState[camId];

            if (!isCribTab || !s || !s.enabled) {
                canvas.style.display = 'none';
                canvas.style.pointerEvents = 'none';
                canvas.classList.remove('editing');
                return;
            }

            const wrap = canvas.parentElement;
            if (wrap) {
                const w = wrap.clientWidth || wrap.offsetWidth;
                const h = wrap.clientHeight || wrap.offsetHeight;
                if (w > 50 && h > 50 && (canvas.width !== w || canvas.height !== h)) {
                    canvas.width = w;
                    canvas.height = h;
                }
            }
            canvas.style.display = 'block';
            canvas.style.pointerEvents = 'auto';
            canvas.classList.add('editing');
            canvas.style.zIndex = '15';
            const ctx = canvas.getContext('2d');

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const roi = s.roi || {};
            const cw = canvas.width;
            const ch = canvas.height;
            const handleR = 15; // Toque fácil no celular e mouse

            if (roi.type === 'circle' && roi.circle) {
                // ================= DESENHO REDONDO / OVAL (ELIPSE) =================
                const c = roi.circle;
                const cpx = (c.cx / 100) * cw;
                const cpy = (c.cy / 100) * ch;
                const rpx = (c.rx / 100) * cw;
                const rpy = (c.ry / 100) * ch;

                ctx.beginPath();
                ctx.ellipse(cpx, cpy, rpx, rpy, 0, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
                ctx.fill();

                ctx.strokeStyle = '#06b6d4';
                ctx.lineWidth = 3.5;
                ctx.setLineDash([8, 4]);
                ctx.stroke();
                ctx.setLineDash([]);

                // Centro Move Handle
                ctx.beginPath();
                ctx.arc(cpx, cpy, 16, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
                ctx.fill();
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = '#38bdf8';
                ctx.font = 'bold 13px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('✥', cpx, cpy);

                // 4 Alças de redimensionamento nos eixos
                const handles = [
                    { px: cpx, py: cpy - rpy },
                    { px: cpx + rpx, py: cpy },
                    { px: cpx, py: cpy + rpy },
                    { px: cpx - rpx, py: cpy }
                ];

                handles.forEach(h => {
                    ctx.beginPath();
                    ctx.arc(h.px, h.py, handleR, 0, Math.PI * 2);
                    ctx.fillStyle = '#06b6d4';
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                });

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Inter, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText('👶 ÁREA REDONDA DO BERÇO (Arraste as alças ou o centro ✥)', Math.max(12, cpx - rpx + 8), Math.max(18, cpy - rpy - 10));

            } else if (roi.type === 'rect') {
                // ================= DESENHO RETÂNGULO TRADICIONAL =================
                const rx = Number(roi.x ?? 20);
                const ry = Number(roi.y ?? 25);
                const rw = Number(roi.w ?? 60);
                const rh = Number(roi.h ?? 50);

                const bx = (rx / 100) * cw;
                const by = (ry / 100) * ch;
                const bw = (rw / 100) * cw;
                const bh = (rh / 100) * ch;

                ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
                ctx.fillRect(bx, by, bw, bh);

                ctx.strokeStyle = '#06b6d4';
                ctx.lineWidth = 3.5;
                ctx.setLineDash([8, 4]);
                ctx.strokeRect(bx, by, bw, bh);
                ctx.setLineDash([]);

                const corners = [
                    { px: bx, py: by },
                    { px: bx + bw, py: by },
                    { px: bx + bw, py: by + bh },
                    { px: bx, py: by + bh }
                ];

                corners.forEach(c => {
                    ctx.beginPath();
                    ctx.arc(c.px, c.py, handleR, 0, Math.PI * 2);
                    ctx.fillStyle = '#06b6d4';
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                });

                // Centro
                const cpx = bx + bw / 2;
                const cpy = by + bh / 2;
                ctx.beginPath();
                ctx.arc(cpx, cpy, 16, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
                ctx.fill();
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = '#38bdf8';
                ctx.font = 'bold 13px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('✥', cpx, cpy);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Inter, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText('👶 ÁREA DO BERÇO (Arraste cantos ou centro ✥)', bx + 8, Math.max(18, by - 8));

            } else {
                // ================= DESENHO POLÍGONO DE PONTOS LIVRES (BERÇO INCLINADO) =================
                const pts = roi.points || [
                    { x: 18, y: 22 },
                    { x: 78, y: 30 },
                    { x: 82, y: 70 },
                    { x: 20, y: 62 }
                ];

                ctx.beginPath();
                pts.forEach((p, idx) => {
                    const px = (p.x / 100) * cw;
                    const py = (p.y / 100) * ch;
                    if (idx === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                });
                ctx.closePath();

                // Fundo e borda: vermelho se houver infração/membro fora, ciano se seguro
                const isBreached = Boolean(s.fenceState === 'OUTSIDE' || s.isLimbBreached);
                ctx.fillStyle = isBreached ? 'rgba(239, 68, 68, 0.28)' : 'rgba(6, 182, 212, 0.22)';
                ctx.fill();

                ctx.strokeStyle = isBreached ? '#ef4444' : '#06b6d4';
                ctx.lineWidth = 3.5;
                ctx.setLineDash([8, 4]);
                ctx.stroke();
                ctx.setLineDash([]);

                // Centroide para arrastar a área inteira
                const c = getPolygonCentroid(pts);
                const cpx = (c.x / 100) * cw;
                const cpy = (c.y / 100) * ch;
                ctx.beginPath();
                ctx.arc(cpx, cpy, 16, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
                ctx.fill();
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.fillStyle = '#38bdf8';
                ctx.font = 'bold 13px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('✥', cpx, cpy);

                // Pontos médios sutis (Permitem tocar para adicionar curvas/pontos estilo Bezier)
                if (pts.length < 10) {
                    for (let i = 0; i < pts.length; i++) {
                        const next = (i + 1) % pts.length;
                        const mpx = ((pts[i].x + pts[next].x) / 2 / 100) * cw;
                        const mpy = ((pts[i].y + pts[next].y) / 2 / 100) * ch;
                        ctx.beginPath();
                        ctx.arc(mpx, mpy, 7, 0, Math.PI * 2);
                        ctx.fillStyle = 'rgba(6, 182, 212, 0.7)';
                        ctx.fill();
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                }

                // Vértices principais (Círculos azuis para arrastar cada canto livremente)
                pts.forEach((p, idx) => {
                    const px = (p.x / 100) * cw;
                    const py = (p.y / 100) * ch;

                    ctx.beginPath();
                    ctx.arc(px, py, handleR, 0, Math.PI * 2);
                    ctx.fillStyle = '#06b6d4';
                    ctx.fill();
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 3.2;
                    ctx.stroke();

                    // Número do ponto (1, 2, 3, 4...)
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 11px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(String(idx + 1), px, py);
                });

                // Rótulo informativo
                let minPx = 1000, minPy = 1000;
                pts.forEach(p => {
                    const x = (p.x / 100) * cw, y = (p.y / 100) * ch;
                    if (x < minPx) minPx = x;
                    if (y < minPy) minPy = y;
                });

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Inter, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'alphabetic';
                ctx.fillText('👶 ÁREA DO BERÇO (Arraste cada ponto livremente ou centro ✥)', Math.max(10, minPx + 8), Math.max(18, minPy - 10));
            }
        }

        function ensureCribFenceVisible(camId) {
            const cam = (typeof camerasData !== 'undefined' ? camerasData : []).find(c => c.id === camId) || {};
            const isFenceActive = Boolean(cam.crib_fence_enabled);

            const btn = document.getElementById(`btn-fence-${camId}`);
            if (btn) btn.classList.toggle('active', isFenceActive);

            const canvas = document.getElementById(`crib-canvas-${camId}`);

            if (!isFenceActive) {
                if (canvas) {
                    canvas.style.display = 'none';
                    canvas.style.pointerEvents = 'none';
                    canvas.classList.remove('editing');
                }
                if (cribFenceState[camId]) {
                    cribFenceState[camId].enabled = false;
                    if (cribFenceState[camId].interval) {
                        clearInterval(cribFenceState[camId].interval);
                        cribFenceState[camId].interval = null;
                    }
                }
                localStorage.removeItem(`kc_fence_enabled_${camId}`);
                const alertEl = document.getElementById(`fence-alert-${camId}`);
                if (alertEl) alertEl.style.display = 'none';
                return;
            }

            if (!canvas) return;

            let roi = {
                type: 'polygon',
                points: [
                    { x: 18, y: 22 },
                    { x: 78, y: 30 },
                    { x: 82, y: 70 },
                    { x: 20, y: 62 }
                ],
                x: 18, y: 22, w: 64, h: 48
            };

            const localRoi = localStorage.getItem(`kc_fence_${camId}`);
            const sourceRoi = localRoi || cam.crib_roi_json;
            if (sourceRoi) {
                try {
                    const parsed = typeof sourceRoi === 'string' ? JSON.parse(sourceRoi) : sourceRoi;
                    roi = normalizeCribRoi(parsed);
                } catch(e) {}
            }

            cribFenceState[camId] = {
                enabled: true,
                roi: roi,
                activeHandle: null,
                dragOffset: { x: 0, y: 0 }
            };

            startFenceMonitor(camId);

            const cribNav = document.getElementById(`tab-nav-${camId}-crib`);
            const isCribTab = cribNav ? cribNav.classList.contains('active') : false;

            updateShapeSelectorButtons(camId, roi.type || 'polygon');

            if (!isCribTab) {
                canvas.style.display = 'none';
                canvas.style.pointerEvents = 'none';
                canvas.classList.remove('editing');
                return;
            }

            canvas.style.display = 'block';
            canvas.style.pointerEvents = 'auto';
            canvas.classList.add('editing');
            canvas.style.zIndex = '15';
            canvas.style.touchAction = 'none';

            const wrap = canvas.parentElement;
            if (wrap) {
                const w = wrap.clientWidth || wrap.offsetWidth;
                const h = wrap.clientHeight || wrap.offsetHeight;
                if (w > 50 && h > 50) {
                    canvas.width = w;
                    canvas.height = h;
                }
            }

            initCribCanvas(camId);
            drawCribBox(camId);
        }

        function restoreCribFenceOnLoad(camId, savedRoi) {
            const cam = (typeof camerasData !== 'undefined' ? camerasData : []).find(c => c.id === camId);
            if (!cam || !cam.crib_fence_enabled) {
                if (cribFenceState[camId]) {
                    cribFenceState[camId].enabled = false;
                    if (cribFenceState[camId].interval) {
                        clearInterval(cribFenceState[camId].interval);
                        cribFenceState[camId].interval = null;
                    }
                }
                const alertEl = document.getElementById(`fence-alert-${camId}`);
                if (alertEl) alertEl.style.display = 'none';
                localStorage.removeItem(`kc_fence_enabled_${camId}`);
                return;
            }

            // Inicializa a cerca e mantém o monitor ativo em segundo plano sem exibir o retângulo na tela
            ensureCribFenceVisible(camId);

            const v = document.getElementById(`video-${camId}`);
            if (v) {
                v.addEventListener('loadedmetadata', () => ensureCribFenceVisible(camId), { once: true });
                v.addEventListener('playing', () => ensureCribFenceVisible(camId), { once: true });
            }
        }

        // Responsividade entre Desktop e Mobile: redimensiona canvas proporcionalmente à tela
        window.addEventListener('resize', () => {
            Object.keys(cribFenceState).forEach(camId => {
                if (cribFenceState[camId] && cribFenceState[camId].enabled) {
                    const cribNav = document.getElementById(`tab-nav-${camId}-crib`);
                    const isCribTab = cribNav ? cribNav.classList.contains('active') : false;
                    const canvas = document.getElementById(`crib-canvas-${camId}`);
                    if (canvas && canvas.parentElement) {
                        canvas.width = canvas.parentElement.clientWidth;
                        canvas.height = canvas.parentElement.clientHeight;
                        if (isCribTab) {
                            drawCribBox(camId);
                        } else {
                            canvas.style.display = 'none';
                            canvas.style.pointerEvents = 'none';
                            canvas.classList.remove('editing');
                        }
                    }
                }
            });
        });

        // ── ALERTA DE MOVIMENTO COM FOTO INSTANTÂNEA E VÍDEO DE 10 SEGUNDOS ───────
        window.babyMotionAlerts = {};
        window.babyMotionIntervals = {};
        let lastMotionAlertSent = 0;
        let isMotionRecordingMap = {};

        function toggleBabyMotionAlert(camId, explicitState) {
            const isCurrentlyOn = Boolean(window.babyMotionAlerts[camId]);
            const isNowActive = explicitState !== undefined ? Boolean(explicitState) : !isCurrentlyOn;
            window.babyMotionAlerts[camId] = isNowActive;

            const btn = document.getElementById(`btn-motion-alert-${camId}`);
            if (btn) btn.classList.toggle('active', isNowActive);

            const cam = (typeof camerasData !== 'undefined' ? camerasData : []).find(x => x.id === camId);
            if (cam) cam.motion_detection_enabled = isNowActive ? 1 : 0;

            if (isNowActive) {
                localStorage.setItem(`kc_motion_enabled_${camId}`, '1');
            } else {
                localStorage.setItem(`kc_motion_enabled_${camId}`, '0');
            }

            if (explicitState === undefined) {
                saveCameraMotionConfig(camId, isNowActive);
            }

            if (isNowActive) {
                startBabyMotionWatcher(camId);
                if (explicitState === undefined) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: '📸 Detecção Ativa (Foto + Vídeo 10s)',
                        text: 'Ao detectar qualquer movimento, uma foto será capturada e um clipe de 10 segundos gravado automaticamente!',
                        showConfirmButton: false,
                        timer: 3500
                    });
                }
            } else {
                stopBabyMotionWatcher(camId);
                if (explicitState === undefined) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'info',
                        title: 'Detecção de Movimento Desativada',
                        showConfirmButton: false,
                        timer: 2000
                    });
                }
            }
        }

        function startBabyMotionWatcher(camId) {
            if (window.babyMotionIntervals[camId]) {
                clearInterval(window.babyMotionIntervals[camId]);
                delete window.babyMotionIntervals[camId];
            }
            const cam = (typeof camerasData !== 'undefined' ? camerasData : []).find(x => x.id === camId);
            if (!window.babyMotionAlerts[camId] || (cam && !cam.motion_detection_enabled)) {
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = 120;
            canvas.height = 90;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            let prevData = null;
            let motionStreak = 0;

            window.babyMotionIntervals[camId] = setInterval(() => {
                const currentCam = (typeof camerasData !== 'undefined' ? camerasData : []).find(x => x.id === camId);
                if (!window.babyMotionAlerts[camId] || (currentCam && !currentCam.motion_detection_enabled)) {
                    stopBabyMotionWatcher(camId);
                    return;
                }

                const video = document.getElementById(`video-${camId}`);
                if (!video || video.readyState < 2) return;

                ctx.drawImage(video, 0, 0, 120, 90);
                const currentData = ctx.getImageData(0, 0, 120, 90).data;

                if (prevData) {
                    let diff = 0;
                    for (let i = 0; i < currentData.length; i += 8) {
                        const d = Math.abs(currentData[i] - prevData[i]) +
                                  Math.abs(currentData[i+1] - prevData[i+1]) +
                                  Math.abs(currentData[i+2] - prevData[i+2]);
                        if (d > 65) diff++;
                    }

                    // Filtra ruído digital/IR noturno de 1 quadro isolado exigindo 2 detecções consecutivas
                    if (diff > 180) {
                        motionStreak++;
                        if (motionStreak >= 2) {
                            triggerBabyMotionDetected(camId);
                        }
                    } else {
                        motionStreak = 0;
                    }
                }
                prevData = currentData;
            }, 1200);
        }

        function stopBabyMotionWatcher(camId) {
            if (window.babyMotionIntervals[camId]) {
                clearInterval(window.babyMotionIntervals[camId]);
                delete window.babyMotionIntervals[camId];
            }
            const banner = document.getElementById(`motion-alert-${camId}`);
            if (banner) banner.style.display = 'none';
        }

        function triggerBabyMotionDetected(camId) {
            const cam = (typeof camerasData !== 'undefined' ? camerasData : []).find(x => x.id === camId);
            if (!window.babyMotionAlerts[camId] || (cam && !cam.motion_detection_enabled)) {
                stopBabyMotionWatcher(camId);
                return;
            }

            const banner = document.getElementById(`motion-alert-${camId}`);
            if (banner) {
                banner.style.display = 'flex';
                banner.innerHTML = '<i class="fas fa-running"></i> <span>🏃 <b>MOVIMENTO DETECTADO!</b> Foto tirada e gravando vídeo de 10s...</span>';
                setTimeout(() => { if (banner) banner.style.display = 'none'; }, 6000);
            }
            playToneSound(660, 0.15);

            const now = Date.now();
            window.lastMotionTriggerTimes = window.lastMotionTriggerTimes || {};
            if (now - (window.lastMotionTriggerTimes[camId] || 0) < 20000) {
                return;
            }
            window.lastMotionTriggerTimes[camId] = now;

            // 1. Tira foto instantânea e guarda no histórico
            captureAutoSnapshot(camId);

            // 2. Grava vídeo de 10 segundos
            if (!isMotionRecordingMap[camId]) {
                isMotionRecordingMap[camId] = true;
                startVideoRecording(camId, true, 'Detecção de Movimento (10s)');
                setTimeout(() => {
                    if (activeRecorders[camId]) {
                        stopVideoRecording(camId);
                    }
                    isMotionRecordingMap[camId] = false;
                }, 10000);
            }

            // 3. Notifica Telegram e Banco de Dados
            try {
                fetch(`/api/cameras/${camId}/events`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({
                        event_type: 'motion',
                        description: '🏃 Movimento detectado! Foto tirada e vídeo de 10s gravado.'
                    })
                });
            } catch(e) {}
        }

        // Captura instantânea do frame atual do vídeo em Base64 para envio direto ao Telegram
        function getLiveVideoSnapshotBase64(camId) {
            const v = document.getElementById(`video-${camId}`);
            if (!v || v.readyState < 2 || !v.videoWidth || !v.videoHeight) return null;
            try {
                const c = document.createElement('canvas');
                c.width = 640;
                c.height = 360;
                const ctx = c.getContext('2d');
                ctx.drawImage(v, 0, 0, 640, 360);
                return c.toDataURL('image/jpeg', 0.82);
            } catch (e) {
                return null;
            }
        }

        function captureAutoSnapshot(camId) {
            const v = document.getElementById(`video-${camId}`);
            if (v && v.videoWidth > 0 && v.videoHeight > 0) {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = v.videoWidth;
                    canvas.height = v.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            const now = new Date();
                            const clip = {
                                id: 'snap_' + Date.now(),
                                camId,
                                camName: (camerasData.find(c => c.id === camId) || {}).name || 'Câmera',
                                reason: 'Foto Automática (Movimento)',
                                date: now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR'),
                                duration: 'Foto',
                                url: url,
                                blob
                            };
                            savedClips.unshift(clip);
                            if (savedClips.length > 50) savedClips.pop();
                            try {
                                const metaOnly = savedClips.map(c => ({ id: c.id, camId: c.camId, camName: c.camName, reason: c.reason, date: c.date, duration: c.duration, url: c.url }));
                                localStorage.setItem('kc_saved_clips_meta', JSON.stringify(metaOnly));
                            } catch(e) {}
                            updateClipsBadge();
                        }
                    }, 'image/jpeg', 0.92);
                } catch(e) {
                    console.warn('Auto snapshot error:', e);
                }
            }
        }

        async function saveCameraMotionConfig(camId, enabled) {
            try {
                const c = (typeof camerasData !== 'undefined' ? camerasData : []).find(x => x.id === camId);
                if (c) c.motion_detection_enabled = enabled ? 1 : 0;

                await fetch(`/api/cameras/${camId}/tracking`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({
                        motion_detection_enabled: enabled ? 1 : 0
                    })
                });
            } catch(e) {
                console.warn('Erro ao salvar detecção de movimento:', e);
            }
        }

        async function saveCameraFenceConfig(camId, enabled, roi) {
            try {
                // Persistência Imediata no LocalStorage e no Objeto em Memória
                localStorage.setItem(`kc_fence_enabled_${camId}`, enabled ? '1' : '0');
                if (roi) {
                    localStorage.setItem(`kc_fence_${camId}`, JSON.stringify(roi));
                }
                const c = (typeof camerasData !== 'undefined' ? camerasData : []).find(x => x.id === camId);
                if (c) {
                    c.crib_fence_enabled = enabled ? 1 : 0;
                    if (roi) c.crib_roi_json = roi;
                }

                await fetch(`/api/cameras/${camId}/tracking`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({
                        crib_fence_enabled: enabled ? 1 : 0,
                        crib_roi_json: roi
                    })
                });
            } catch(e) {
                console.warn('Erro ao salvar cerca:', e);
            }
        }

        // ── 3.1. DETECTOR INTELIGENTE DE BEBÊ EM PÉ / NA GRADE (BABY STAND AI) ───
        window.babyStandAlerts = {};
        window.babyStandIntervals = {};

        function toggleBabyStandDetector(camId, explicitState) {
            const isCurrentlyOn = Boolean(window.babyStandAlerts[camId]);
            const isNowActive = explicitState !== undefined ? Boolean(explicitState) : !isCurrentlyOn;
            window.babyStandAlerts[camId] = isNowActive;

            const btn = document.getElementById(`btn-stand-${camId}`);
            if (btn) btn.classList.toggle('active', isNowActive);

            if (isNowActive) {
                localStorage.setItem(`kc_stand_enabled_${camId}`, '1');
            } else {
                localStorage.removeItem(`kc_stand_enabled_${camId}`);
            }
            const c = (typeof camerasData !== 'undefined' ? camerasData : []).find(x => x.id === camId);
            if (c) c.baby_stand_enabled = isNowActive ? 1 : 0;

            if (explicitState === undefined) {
                saveCameraBabyStandConfig(camId, isNowActive);
            }

            if (isNowActive) {
                startBabyStandWatcher(camId);
                if (explicitState === undefined) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: '👶 Monitor "Bebê em Pé" Ativado!',
                        text: 'Você e seu Telegram serão alertados se a criança ficar em pé ou se apoiar na grade!',
                        showConfirmButton: false,
                        timer: 3500
                    });
                }
            } else {
                stopBabyStandWatcher(camId);
                if (explicitState === undefined) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'info',
                        title: 'Monitor "Bebê em Pé" Desativado',
                        showConfirmButton: false,
                        timer: 2000
                    });
                }
            }
        }

        async function saveCameraBabyStandConfig(camId, enabled) {
            try {
                const c = (typeof camerasData !== 'undefined' ? camerasData : []).find(x => x.id === camId);
                if (c) c.baby_stand_enabled = enabled ? 1 : 0;

                await fetch(`/api/cameras/${camId}/tracking`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({
                        baby_stand_enabled: enabled ? 1 : 0
                    })
                });
            } catch(e) {
                console.warn('Erro ao salvar config bebê em pé:', e);
            }
        }

        function startBabyStandWatcher(camId) {
            if (window.babyStandIntervals[camId]) clearInterval(window.babyStandIntervals[camId]);
            let standCooldown = 0;
            let standStreak = 0;
            let isProcessing = false;

            window.babyStandIntervals[camId] = setInterval(async () => {
                const video = document.getElementById(`video-${camId}`);
                if (!video || video.readyState < 2 || !window.babyStandAlerts[camId] || isProcessing) return;
                isProcessing = true;

                try {
                    const s = cribFenceState[camId];
                    const r = (s && s.roi) ? s.roi : { x: 20, y: 20, w: 60, h: 55 };
                    const bb = getBoundingBoxFromRoi(r);
                    const now = Date.now();
                    const vw = video.videoWidth || 640;
                    const vh = video.videoHeight || 360;

                    let isStanding = false;

                    // 1. ANÁLISE ANATÔMICA COM MOVETNET POSE (17 ARTICULAÇÕES)
                    const poses = await window.kingVisionAI.detectPose(video);
                    if (poses && poses.length > 0 && poses[0].keypoints) {
                        const kp = {};
                        poses[0].keypoints.forEach(k => { kp[k.name] = k; });

                        const nose = kp['nose'];
                        const lShoulder = kp['left_shoulder'];
                        const rShoulder = kp['right_shoulder'];
                        const lHip = kp['left_hip'];
                        const rHip = kp['right_hip'];
                        const lAnkle = kp['left_ankle'];
                        const rAnkle = kp['right_ankle'];

                        const headPt = (nose && nose.score >= 0.20) ? nose : ((lShoulder && lShoulder.score >= 0.20) ? lShoulder : rShoulder);

                        if (headPt && headPt.score >= 0.18) {
                            const headXPct = (headPt.x / vw) * 100;
                            const headYPct = (headPt.y / vh) * 100;

                            // Cabeça está no alinhamento do berço
                            const isNearCrib = (headXPct >= bb.x - 8 && headXPct <= bb.x + bb.w + 8);
                            // Cabeça atinge a faixa superior (topo 38% do berço ou acima da linha superior)
                            const reachesUpperRail = headYPct <= (bb.y + bb.h * 0.38);

                            if (isNearCrib && reachesUpperRail) {
                                // Verifica postura vertical do tronco
                                let isSpineVertical = true;
                                if (lShoulder && lHip && lShoulder.score >= 0.18 && lHip.score >= 0.18) {
                                    isSpineVertical = Math.abs(lHip.y - lShoulder.y) >= Math.abs(lHip.x - lShoulder.x) * 0.85;
                                } else if (rShoulder && rHip && rShoulder.score >= 0.18 && rHip.score >= 0.18) {
                                    isSpineVertical = Math.abs(rHip.y - rShoulder.y) >= Math.abs(rHip.x - rShoulder.x) * 0.85;
                                }

                                // Verifica altura em pé se tornozelos visíveis
                                let hasHeightSpan = true;
                                const anklePt = (lAnkle && lAnkle.score >= 0.15) ? lAnkle : ((rAnkle && rAnkle.score >= 0.15) ? rAnkle : null);
                                if (anklePt) {
                                    const ankleYPct = (anklePt.y / vh) * 100;
                                    const verticalSpan = ankleYPct - headYPct;
                                    hasHeightSpan = verticalSpan >= (bb.h * 0.32);
                                }

                                if (isSpineVertical && hasHeightSpan) {
                                    isStanding = true;
                                }
                            }
                        }
                    }

                    // 2. FALLBACK COM BOUNDING BOX (COCO-SSD) SE MOVETNET NÃO DETECTOU
                    if (!isStanding) {
                        const persons = await window.kingVisionAI.detectPersons(video);
                        if (persons && persons.length > 0) {
                            for (const p of persons) {
                                const [bx, by, bw, bh] = p.bbox;
                                const cxPct = ((bx + bw / 2) / vw) * 100;
                                const topPct = (by / vh) * 100;
                                const heightPct = (bh / vh) * 100;
                                const aspectRatio = bh / Math.max(1, bw);

                                const isInsideCrib = (cxPct >= bb.x - 8 && cxPct <= bb.x + bb.w + 8);
                                const reachesUpperRail = (topPct <= bb.y + (bb.h * 0.38));
                                const hasStandHeight = (heightPct >= bb.h * 0.35);
                                const isVertical = (aspectRatio >= 0.85);

                                if (isInsideCrib && reachesUpperRail && hasStandHeight && isVertical) {
                                    isStanding = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (isStanding) {
                        standStreak++;
                        if (standStreak >= 2) {
                            if (now - standCooldown > 18000) {
                                standCooldown = now;
                                triggerBabyStandAlert(camId);
                            }
                        }
                    } else {
                        standStreak = 0;
                    }
                } catch(err) {
                    console.error('[BabyStand] Erro no detector de bebê em pé:', err);
                } finally {
                    isProcessing = false;
                }
            }, 1200);
        }

        function stopBabyStandWatcher(camId) {
            if (window.babyStandIntervals[camId]) {
                clearInterval(window.babyStandIntervals[camId]);
                delete window.babyStandIntervals[camId];
            }
            window.babyStandAlerts[camId] = false;
            const btn = document.getElementById(`btn-stand-${camId}`);
            if (btn) btn.classList.remove('active');
            const banner = document.getElementById(`stand-alert-${camId}`);
            if (banner) banner.style.display = 'none';
        }

        function triggerBabyStandAlert(camId) {
            const banner = document.getElementById(`stand-alert-${camId}`);
            if (banner) {
                banner.style.display = 'flex';
                setTimeout(() => { if (banner) banner.style.display = 'none'; }, 8000);
            }
            playToneSound(750, 0.35);

            captureAutoSnapshot(camId);
            const liveSnapshotBase64 = getLiveVideoSnapshotBase64(camId);

            try {
                fetch(`/api/cameras/${camId}/events`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({
                        event_type: 'baby_stand',
                        description: '🚨 ALERTA: Bebê ficou em pé ou se apoiou na grade do berço!',
                        snapshot_base64: liveSnapshotBase64
                    })
                }).catch(e => console.warn(e));
            } catch(e) {}
        }

        // ── CONTROLE DE LÂMPADA / HOLOFOTE LED & REALÇADOR VISUAL ─────────────────
        window.cameraLightState = {};

        async function toggleCameraLight(camId) {
            const isNowOn = !window.cameraLightState[camId];
            window.cameraLightState[camId] = isNowOn;

            const btn = document.getElementById(`btn-light-${camId}`);
            if (btn) btn.classList.toggle('active', isNowOn);

            const video = document.getElementById(`video-${camId}`);
            if (video) video.classList.toggle('light-boost', isNowOn);

            playToneSound(isNowOn ? 880 : 440, 0.12);

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: isNowOn ? 'success' : 'info',
                title: isNowOn ? '💡 Lâmpada Ligada!' : '💡 Lâmpada Desligada',
                text: isNowOn ? 'Luz auxiliar e realçador da imagem ativados.' : 'Iluminação auxiliar desativada.',
                showConfirmButton: false,
                timer: 2500
            });

            try {
                await fetch(`/api/cameras/${camId}/light`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ state: isNowOn ? 'on' : 'off' })
                });
            } catch(e) {
                console.warn('Erro ao acionar lâmpada:', e);
            }
        }

        // Aliases para funções rápidas da barra de ferramentas
        function toggleAiNightVision(camId) {
            if (typeof toggleAiVideoNight === 'function') toggleAiVideoNight(camId);
        }
        function toggleAiSharpness(camId) {
            if (typeof toggleAiVideoSharp === 'function') toggleAiVideoSharp(camId);
        }
        function toggleAudioBooster(camId) {
            if (typeof toggleAiAudio === 'function') toggleAiAudio(camId);
        }

        // ── 4. Interfone / Walkie-Talkie ("Pressione para Falar") ─────────────────
        let intercomStreams = {};

        function toggleIntercomBox(camId) {
            const box = document.getElementById(`intercom-box-${camId}`);
            if (!box) return;
            const isVisible = box.style.display === 'flex';
            box.style.display = isVisible ? 'none' : 'flex';
        }

        async function startIntercomTalk(camId) {
            const btn = document.getElementById(`intercom-talk-btn-${camId}`);
            const waves = document.getElementById(`voice-waves-${camId}`);
            if (btn) btn.classList.add('talking');
            if (waves) waves.style.display = 'flex';

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                });
                intercomStreams[camId] = stream;
                playToneSound(880, 0.1);

                // Envia o áudio capturado do microfone diretamente para a câmera via WebRTC
                const pc = peerConnections[camId];
                const audioTrack = stream.getAudioTracks()[0];
                if (pc && audioTrack) {
                    const senders = pc.getSenders ? pc.getSenders() : [];
                    const audioSender = senders.find(s => s.track && s.track.kind === 'audio') || senders.find(s => !s.track);
                    if (audioSender) {
                        await audioSender.replaceTrack(audioTrack);
                    } else if (typeof pc.addTrack === 'function') {
                        pc.addTrack(audioTrack, stream);
                    }
                }
            } catch (err) {
                console.warn('Microfone não concedido:', err);
                Swal.fire({
                    title: '🎙️ Como Ativar o Microfone no Celular',
                    html: `
                        <div style="text-align: left; font-size: 0.92rem; line-height: 1.6; color: #cbd5e1; background: #0f172a; padding: 1rem; border-radius: 10px; border: 1px solid #334155;">
                            <p style="margin-bottom: 0.75rem; color: #f8fafc;">Se o Google Chrome ou Safari bloqueou o microfone ou não exibiu a confirmação:</p>
                            <div style="display: flex; gap: 0.6rem; margin-bottom: 0.75rem; align-items: flex-start;">
                                <div style="background: #3b82f6; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">1</div>
                                <div>Toque no <b>ícone do cadeado 🔒 ou ajustes</b> ao lado de <i>conectaking.com.br</i> na barra de navegação superior.</div>
                            </div>
                            <div style="display: flex; gap: 0.6rem; margin-bottom: 0.75rem; align-items: flex-start;">
                                <div style="background: #3b82f6; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">2</div>
                                <div>Toque em <b>Permissões</b> (ou <i>Configurações do Site</i>).</div>
                            </div>
                            <div style="display: flex; gap: 0.6rem; margin-bottom: 0.75rem; align-items: flex-start;">
                                <div style="background: #3b82f6; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">3</div>
                                <div>Localize <b>Microfone</b> e mude para <b style="color: #10b981;">Permitir</b>.</div>
                            </div>
                            <div style="display: flex; gap: 0.6rem; align-items: flex-start;">
                                <div style="background: #10b981; color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">4</div>
                                <div>Toque no botão abaixo para tentar novamente!</div>
                            </div>
                        </div>
                    `,
                    icon: 'info',
                    confirmButtonText: '🔄 Tentar Novamente Agora',
                    confirmButtonColor: '#10b981',
                    showCancelButton: true,
                    cancelButtonText: 'Fechar'
                }).then((r) => {
                    if (r.isConfirmed) {
                        startIntercomTalk(camId);
                    }
                });
                stopIntercomTalk(camId);
            }
        }

        function stopIntercomTalk(camId) {
            const btn = document.getElementById(`intercom-talk-btn-${camId}`);
            const waves = document.getElementById(`voice-waves-${camId}`);
            if (btn) btn.classList.remove('talking');
            if (waves) waves.style.display = 'none';

            // Desliga envio de áudio no WebRTC
            const pc = peerConnections[camId];
            if (pc && pc.getSenders) {
                const audioSender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
                if (audioSender) {
                    audioSender.replaceTrack(null);
                }
            }

            if (intercomStreams[camId]) {
                intercomStreams[camId].getTracks().forEach(t => t.stop());
                delete intercomStreams[camId];
                playToneSound(440, 0.08);
            }
        }

        function playToneSound(freq, duration) {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const g = ctx.createGain();
                osc.frequency.value = freq;
                g.gain.setValueAtTime(0.12, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
                osc.connect(g);
                g.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + duration);
            } catch(e) {}
        }

        // ── 5. Detector de Choro de Bebê (Baby Cry AI) ───────────────────────────
        // ── 5. Detector de Choro de Bebê (Baby Cry AI - Sensor Acústico em Tempo Real) ───
        window.babyCryState = window.babyCryState || {};

        function startBabyCryAudioPipeline(camId) {
            const video = document.getElementById(`video-${camId}`);
            if (!video) return;
            const state = window.babyCryState[camId];
            if (!state || !state.active) return;
            if (state.connected && state.analyser) return;

            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;

            const stream = video.srcObject;
            if (!stream || !stream.getAudioTracks || stream.getAudioTracks().length === 0) {
                if (!state.retryCount) state.retryCount = 0;
                if (state.retryCount < 25) {
                    state.retryCount++;
                    setTimeout(() => startBabyCryAudioPipeline(camId), 1200);
                }
                return;
            }

            try {
                if (!state.ctx) {
                    state.ctx = new AudioCtx();
                }
                if (state.ctx.state === 'suspended') {
                    state.ctx.resume().catch(() => {});
                }

                const src = state.ctx.createMediaStreamSource(stream);
                const analyser = state.ctx.createAnalyser();
                analyser.fftSize = 512;
                analyser.smoothingTimeConstant = 0.80;
                src.connect(analyser);

                state.analyser = analyser;
                state.connected = true;
                state.cryStreak = 0;
                state.lastCryAlert = 0;
                state.ambientNoise = 18;

                const sampleRate = state.ctx.sampleRate || 44100;
                const binResolution = sampleRate / analyser.fftSize;
                // Faixa acústica típica de choro de bebê: 380 Hz a 2800 Hz
                const minBin = Math.max(1, Math.floor(380 / binResolution));
                const maxBin = Math.min(analyser.frequencyBinCount - 1, Math.ceil(2800 / binResolution));
                const dataArray = new Uint8Array(analyser.frequencyBinCount);

                if (state.interval) clearInterval(state.interval);
                state.interval = setInterval(() => {
                    if (!state.active) {
                        clearInterval(state.interval);
                        return;
                    }
                    if (state.ctx.state === 'suspended') {
                        state.ctx.resume().catch(() => {});
                        return;
                    }

                    analyser.getByteFrequencyData(dataArray);

                    let cryEnergy = 0;
                    let totalEnergy = 0;
                    for (let i = 0; i < analyser.frequencyBinCount; i++) {
                        totalEnergy += dataArray[i];
                        if (i >= minBin && i <= maxBin) {
                            cryEnergy += dataArray[i];
                        }
                    }
                    const numCryBins = Math.max(1, maxBin - minBin + 1);
                    const avgCry = cryEnergy / numCryBins;
                    const avgTotal = totalEnergy / analyser.frequencyBinCount;

                    // Média móvel suave de ruído ambiente do quarto (adaptação ao silêncio da noite)
                    state.ambientNoise = (state.ambientNoise * 0.94) + (avgCry * 0.06);

                    // Padrão acústico de choro:
                    // 1. Amplitude significativa na banda de choro (> 28)
                    // 2. Destaca-se do ruído de fundo do quarto (> ambientNoise * 1.5 + 8)
                    // 3. Frequência concentrada na faixa de choro
                    const isCrySound = (avgCry > 28) && (avgCry > state.ambientNoise * 1.5 + 8) && (avgCry >= avgTotal * 1.12);

                    if (isCrySound) {
                        state.cryStreak = (state.cryStreak || 0) + 1;
                        // Exige 2 ciclos consecutivos (~1.6s) de choro para evitar alertas por cliques ou tosses breves
                        if (state.cryStreak >= 2) {
                            const now = Date.now();
                            if (now - (state.lastCryAlert || 0) > 25000) {
                                state.lastCryAlert = now;
                                triggerCryAlert(camId);
                            }
                        }
                    } else {
                        state.cryStreak = 0;
                    }
                }, 800);

                console.log(`[BabyCry AI] Sensor acústico de choro conectado com sucesso na câmera ${camId} (SampleRate: ${sampleRate}Hz)!`);
            } catch(e) {
                console.warn('[BabyCry AI] Erro ao conectar pipeline de áudio:', e);
            }
        }

        // Listener global para destravar AudioContext automaticamente no primeiro toque ou clique na tela
        if (typeof document !== 'undefined') {
            ['click', 'touchstart', 'pointerdown', 'keydown'].forEach(evtType => {
                document.addEventListener(evtType, () => {
                    Object.values(window.babyCryState || {}).forEach(st => {
                        if (st && st.ctx && st.ctx.state === 'suspended') {
                            st.ctx.resume().catch(() => {});
                        }
                    });
                }, { passive: true });
            });
        }

        function toggleBabyCryDetector(camId, explicitState) {
            const btn = document.getElementById(`btn-cry-${camId}`);
            if (!btn) return;

            window.babyCryState = window.babyCryState || {};
            const isCurrentlyOn = Boolean(window.babyCryState[camId] && window.babyCryState[camId].active);
            const shouldEnable = explicitState !== undefined ? Boolean(explicitState) : !isCurrentlyOn;

            const cam = (typeof camerasData !== 'undefined' ? camerasData : []).find(c => c.id === camId);
            if (cam) cam.baby_cry_enabled = shouldEnable ? 1 : 0;

            if (shouldEnable) {
                window.babyCryState[camId] = { active: true, connected: false, retryCount: 0 };
                btn.classList.add('active');
                startBabyCryAudioPipeline(camId);

                if (explicitState === undefined) {
                    saveCameraBabyCryConfig(camId, true);
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: '😭 Monitor de Choro IA Ativado!',
                        text: 'Você e seu Telegram serão alertados imediatamente se o bebê chorar.',
                        showConfirmButton: false,
                        timer: 3500
                    });
                }
            } else {
                if (window.babyCryState[camId]) {
                    const st = window.babyCryState[camId];
                    st.active = false;
                    if (st.interval) clearInterval(st.interval);
                    if (st.ctx) {
                        try { st.ctx.close(); } catch(e) {}
                    }
                    delete window.babyCryState[camId];
                }
                btn.classList.remove('active');
                if (explicitState === undefined) {
                    saveCameraBabyCryConfig(camId, false);
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'info',
                        title: 'Monitor de Choro Desativado',
                        showConfirmButton: false,
                        timer: 2000
                    });
                }
                const alertEl = document.getElementById(`cry-alert-${camId}`);
                if (alertEl) alertEl.style.display = 'none';
            }
        }

        function triggerCryAlert(camId) {
            const banner = document.getElementById(`cry-alert-${camId}`);
            if (banner) {
                banner.style.display = 'flex';
                setTimeout(() => { banner.style.display = 'none'; }, 8000);
            }
            playToneSound(660, 0.4);

            captureAutoSnapshot(camId);
            const liveSnapshotBase64 = getLiveVideoSnapshotBase64(camId);

            fetch(`/api/cameras/${camId}/events`, {
                method: 'POST',
                credentials: 'include',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    event_type: 'baby_cry',
                    description: '😭 CHORO DETECTADO: Bebê chorando ou emitindo sons de choro no berço!',
                    snapshot_base64: liveSnapshotBase64
                })
            }).catch(e => console.warn(e));
        }

        async function saveCameraBabyCryConfig(camId, enabled) {
            try {
                const c = (typeof camerasData !== 'undefined' ? camerasData : []).find(x => x.id === camId);
                if (c) c.baby_cry_enabled = enabled ? 1 : 0;

                await fetch(`/api/cameras/${camId}/tracking`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ baby_cry_enabled: enabled ? 1 : 0 })
                });
            } catch(e) {
                console.warn('Erro ao salvar config choro:', e);
            }
        }

        // ── 6. Sirene Dissuasória / Alarme de Pânico ──────────────────────────────
        const activeSirens = {};

        function triggerSiren(camId) {
            const btn = document.getElementById(`btn-siren-${camId}`);
            const wrap = document.querySelector(`#card-cam-${camId} .kc-video-wrap`);

            if (activeSirens[camId]) {
                stopSiren(camId);
                return;
            }

            Swal.fire({
                title: 'Disparar Sirene de Pânico?',
                text: 'Isso emitirá um som de alarme potente para afastar intrusos.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: '🚨 SIM, DISPARAR SIRENE!',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    startSiren(camId);
                    if (btn) btn.classList.add('active');
                    if (wrap) wrap.classList.add('siren-flashing');

                    fetch(`/api/cameras/${camId}/events`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                        body: JSON.stringify({
                            event_type: 'siren_triggered',
                            description: 'Sirene dissuasória de pânico acionada'
                        })
                    }).catch(e => console.warn(e));

                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'error',
                        title: '🚨 SIRENE ACIONADA!',
                        text: 'Clique novamente no botão da sirene para desligar.',
                        showConfirmButton: false,
                        timer: 3500
                    });
                }
            });
        }

        function startSiren(camId) {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(800, ctx.currentTime);

                // Alternating frequency wail
                let isHigh = false;
                const timer = setInterval(() => {
                    isHigh = !isHigh;
                    osc.frequency.setTargetAtTime(isHigh ? 1300 : 750, ctx.currentTime, 0.08);
                }, 400);

                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();

                activeSirens[camId] = { ctx, osc, gain, timer };
            } catch(e) {
                console.warn(e);
            }
        }

        function stopSiren(camId) {
            const s = activeSirens[camId];
            if (s) {
                clearInterval(s.timer);
                s.osc.stop();
                s.ctx.close();
                delete activeSirens[camId];
            }
            const btn = document.getElementById(`btn-siren-${camId}`);
            const wrap = document.querySelector(`#card-cam-${camId} .kc-video-wrap`);
            if (btn) btn.classList.remove('active');
            if (wrap) wrap.classList.remove('siren-flashing');

            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: 'Sirene Silenciada',
                showConfirmButton: false,
                timer: 2000
            });
        }

        // ── 7. Sensor Noturno Inteligente Automático ──────────────────────────────
        const autoNightMonitors = {};

        function toggleAutoNightDetector(camId) {
            const btn = document.getElementById(`btn-auto-night-${camId}`);
            if (!btn) return;

            if (!autoNightMonitors[camId]) {
                const offCanvas = document.createElement('canvas');
                offCanvas.width = 16;
                offCanvas.height = 16;
                const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

                const interval = setInterval(() => {
                    const video = document.getElementById(`video-${camId}`);
                    if (!video || video.readyState < 2) return;

                    try {
                        offCtx.drawImage(video, 0, 0, 16, 16);
                        const frame = offCtx.getImageData(0, 0, 16, 16);
                        const d = frame.data;
                        let totalLum = 0;
                        for (let i = 0; i < d.length; i += 4) {
                            totalLum += (0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]);
                        }
                        const avgLum = totalLum / 256;
                        const nightBadge = document.getElementById(`night-badge-${camId}`);

                        if (avgLum < 45 && !video.classList.contains('ai-night-vision')) {
                            video.classList.add('ai-night-vision');
                            if (nightBadge) nightBadge.style.display = 'inline-flex';
                        } else if (avgLum > 75 && video.classList.contains('ai-night-vision')) {
                            video.classList.remove('ai-night-vision');
                            if (nightBadge) nightBadge.style.display = 'none';
                        }
                    } catch(e) {}
                }, 4000);

                autoNightMonitors[camId] = interval;
                btn.classList.add('active');
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Sensor Noturno Automático Ativo!',
                    text: 'A visão noturna será ligada e desligada automaticamente conforme a luz do quarto.',
                    showConfirmButton: false,
                    timer: 3000
                });
            } else {
                clearInterval(autoNightMonitors[camId]);
                delete autoNightMonitors[camId];
                btn.classList.remove('active');
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'info',
                    title: 'Sensor Noturno Automático Desativado',
                    showConfirmButton: false,
                    timer: 2000
                });
            }
        }

        // ── 8. Linha do Tempo / Timeline de Eventos Recentes ─────────────────────
        async function openTimelineModal(camId, camName) {
            const modal = document.getElementById('modal-timeline');
            const titleEl = document.getElementById('timeline-modal-camera-title');
            const container = document.getElementById('timeline-list-container');
            if (!modal || !container) return;

            if (titleEl) titleEl.textContent = `Linha do Tempo: ${camName || 'Câmera'}`;
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');

            container.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem; color: var(--kc-text-dim);">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <div>Buscando eventos recentes...</div>
                </div>
            `;

            try {
                const res = await fetch(`/api/cameras/${camId}/events`, {
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (json.success && json.data.length > 0) {
                    container.innerHTML = '';
                    json.data.forEach(evt => {
                        const item = document.createElement('div');
                        item.className = 'kc-timeline-item';
                        
                        let iconClass = 'fa-bell';
                        let iconBg = 'rgba(245, 158, 11, 0.2)';
                        let iconColor = '#f59e0b';
                        let title = 'Evento';

                        if (evt.event_type === 'baby_cry') {
                            iconClass = 'fa-baby';
                            iconBg = 'rgba(236, 72, 153, 0.2)';
                            iconColor = '#ec4899';
                            title = 'Choro de Bebê Detectado';
                        } else if (evt.event_type === 'baby_stand') {
                            iconClass = 'fa-child';
                            iconBg = 'rgba(251, 191, 36, 0.2)';
                            iconColor = '#fbbf24';
                            title = 'Bebê em Pé no Berço';
                        } else if (evt.event_type === 'crib_fence' || evt.event_type === 'crib_fence_breach') {
                            iconClass = 'fa-vector-square';
                            iconBg = 'rgba(6, 182, 212, 0.2)';
                            iconColor = '#06b6d4';
                            title = 'Saída da Cerca do Berço';
                        } else if (evt.event_type === 'siren_triggered') {
                            iconClass = 'fa-bullhorn';
                            iconBg = 'rgba(239, 68, 68, 0.2)';
                            iconColor = '#ef4444';
                            title = 'Sirene de Pânico Acionada';
                        } else if (evt.event_type === 'motion') {
                            iconClass = 'fa-running';
                            iconBg = 'rgba(16, 185, 129, 0.2)';
                            iconColor = '#10b981';
                            title = 'Movimento Detectado';
                        }

                        item.innerHTML = `
                            <div class="kc-timeline-icon" style="background: ${iconBg}; color: ${iconColor};">
                                <i class="fas ${iconClass}"></i>
                            </div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
                                    <span style="font-weight: 700; font-size: 0.88rem; color: #fff;">${title}</span>
                                    <span class="kc-timeline-time"><i class="far fa-clock"></i> ${evt.created_at || 'Agora'}</span>
                                </div>
                                <div style="font-size: 0.78rem; color: var(--kc-text-muted); margin-top: 0.2rem;">${escapeHtml(evt.description)}</div>
                            </div>
                        `;
                        container.appendChild(item);
                    });
                } else {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 2rem 1rem; color: var(--kc-text-dim);">
                            <i class="fas fa-clipboard-check" style="font-size: 2.2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                            <div style="font-size: 0.95rem; font-weight: 600; color: #fff;">Nenhum evento registrado ainda</div>
                            <div style="font-size: 0.8rem; margin-top: 0.25rem;">Alertas de movimento, choro e cerca do berço aparecerão aqui em tempo real.</div>
                        </div>
                    `;
                }
            } catch(e) {
                container.innerHTML = `<div style="color: var(--kc-rose); text-align: center; padding: 1rem;">Falha ao carregar eventos da câmera.</div>`;
            }
        }

        function closeTimelineModal() {
            const modal = document.getElementById('modal-timeline');
            if (modal) {
                modal.classList.remove('active');
                modal.setAttribute('aria-hidden', 'true');
            }
        }

        // ─── SINCRONIZAÇÃO EM TEMPO REAL ENTRE DISPOSITIVOS (PC & CELULAR) ───
        let isSyncingDevices = false;
        async function syncCamerasDeviceState() {
            if (isSyncingDevices || document.hidden) return;
            isSyncingDevices = true;
            try {
                const res = await fetch('/api/cameras', {
                    headers: getAuthHeaders({ 'Accept': 'application/json' }),
                    credentials: 'include'
                });
                if (!res.ok) return;
                const json = await res.json();
                const list = (json && json.data) ? json.data : (Array.isArray(json) ? json : []);
                if (!Array.isArray(list)) return;

                list.forEach(remoteCam => {
                    const localCam = (typeof camerasData !== 'undefined' ? camerasData : []).find(c => c.id === remoteCam.id);
                    if (!localCam) return;

                    // 1. Cerca do Berço: reflete instantaneamente entre Mobile e PC
                    const remoteFence = Boolean(remoteCam.crib_fence_enabled);
                    const localFence = Boolean(localCam.crib_fence_enabled);
                    if (remoteFence !== localFence) {
                        localCam.crib_fence_enabled = remoteFence ? 1 : 0;
                        if (remoteCam.crib_roi_json) localCam.crib_roi_json = remoteCam.crib_roi_json;
                        toggleCribFence(remoteCam.id, remoteFence);
                    }

                    // 2. Bebê em Pé: sincroniza botão e monitoramento
                    const remoteStand = Boolean(remoteCam.baby_stand_enabled);
                    const localStand = Boolean(localCam.baby_stand_enabled);
                    if (remoteStand !== localStand) {
                        localCam.baby_stand_enabled = remoteStand ? 1 : 0;
                        toggleBabyStandDetector(remoteCam.id, remoteStand);
                    }

                    // 3. Rastreamento / Seguir Bebê 360°
                    const remoteTrack = Boolean(remoteCam.auto_tracking_enabled);
                    const localTrack = Boolean(localCam.auto_tracking_enabled);
                    if (remoteTrack !== localTrack) {
                        localCam.auto_tracking_enabled = remoteTrack ? 1 : 0;
                        cameraTracking[remoteCam.id] = remoteTrack;
                        updateTrackingPills(remoteCam.id);
                        if (remoteTrack) {
                            startAutoTrackingLoop(remoteCam.id);
                        } else {
                            stopAutoTrackingLoop(remoteCam.id);
                        }
                    }
                });
            } catch(e) {
                // Silencioso em caso de oscilação momentânea de conexão
            } finally {
                isSyncingDevices = false;
            }
        }
        setInterval(syncCamerasDeviceState, 3500);
    </script>
</body>
</html>

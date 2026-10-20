<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
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
            display: flex;
            flex-wrap: wrap;
            gap: 0.45rem;
            margin-top: 0.4rem;
        }

        .kc-chip {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--kc-border);
            color: var(--kc-text-muted);
            padding: 0.35rem 0.65rem;
            border-radius: 8px;
            font-size: 0.76rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .kc-chip:hover {
            color: #fff;
            border-color: rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.1);
        }

        .kc-chip.active {
            background: rgba(245, 158, 11, 0.18);
            border-color: var(--kc-gold);
            color: #fbbf24;
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
            z-index: 99999 !important;
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
            <!-- Tabs -->
            <div class="kc-modal-tabs">
                <button type="button" class="kc-tab-btn active" data-tab="tab-wizard">
                    <i class="fas fa-wand-magic-sparkles"></i> Assistente Guiado
                </button>
                <button type="button" class="kc-tab-btn" data-tab="tab-lan-scan">
                    <i class="fas fa-network-wired"></i> Detectar na Rede
                </button>
                <button type="button" class="kc-tab-btn" data-tab="tab-bluetooth">
                    <i class="fab fa-bluetooth-b"></i> Bluetooth
                </button>
                <button type="button" class="kc-tab-btn" data-tab="tab-scan">
                    <i class="fas fa-camera"></i> Ler QR da Câmera
                </button>
                <button type="button" class="kc-tab-btn" data-tab="tab-rtsp">
                    <i class="fas fa-hashtag"></i> ID ou IP (Manual)
                </button>
                <button type="button" class="kc-tab-btn" data-tab="tab-telegram">
                    <i class="fab fa-telegram-plane"></i> Agente Telegram
                </button>
            </div>
            <div class="kc-modal-body">

                <!-- ═════════════════════════════════════════════════════════════ -->
                <!-- ABA 1: ASSISTENTE INTELIGENTE ESTILO YOOSEE / TUYA / MIBO     -->
                <!-- ═════════════════════════════════════════════════════════════ -->
                <div class="kc-tab-pane active" id="tab-wizard">
                    <!-- Stepper -->
                    <div class="kc-stepper">
                        <div class="kc-step-item active" id="step-node-1">
                            <div class="kc-step-bubble">1</div>
                            <div class="kc-step-title">Ligar</div>
                        </div>
                        <div class="kc-step-item" id="step-node-2">
                            <div class="kc-step-bubble">2</div>
                            <div class="kc-step-title">Reset &amp; Som</div>
                        </div>
                        <div class="kc-step-item" id="step-node-3">
                            <div class="kc-step-bubble">3</div>
                            <div class="kc-step-title">Conectar</div>
                        </div>
                    </div>

                    <!-- ETAPA 1: LIGAR DISPOSITIVO -->
                    <div id="wizard-pane-1">
                        <div class="kc-subtabs">
                            <button type="button" class="kc-subtab-btn active" onclick="switchPowerSubtab('plug', this)">
                                <i class="fas fa-plug"></i> Dispositivo Plugável (Tomada)
                            </button>
                            <button type="button" class="kc-subtab-btn" onclick="switchPowerSubtab('battery', this)">
                                <i class="fas fa-battery-full"></i> Bateria / Solar
                            </button>
                        </div>

                        <div id="power-content-plug">
                            <div class="kc-method-card">
                                <div class="kc-method-icon-box"><i class="fas fa-plug-circle-check"></i></div>
                                <div class="kc-method-details">
                                    <h5>Método A: Fonte de Alimentação</h5>
                                    <p>Conecte o cabo micro-USB ou fonte 12V na tomada. Aguarde cerca de 30 segundos até a câmera girar ou emitir o primeiro sinal de inicialização.</p>
                                </div>
                            </div>
                        </div>

                        <div id="power-content-battery" style="display: none;">
                            <div class="kc-method-card">
                                <div class="kc-method-icon-box"><i class="fas fa-power-off"></i></div>
                                <div class="kc-method-details">
                                    <h5>Método A: Botão Power</h5>
                                    <p>Pressione e segure o botão de ligar até acender o LED indicador ou ouvir o som de inicialização.</p>
                                </div>
                            </div>
                            <div class="kc-method-card">
                                <div class="kc-method-icon-box"><i class="fas fa-toggle-on"></i></div>
                                <div class="kc-method-details">
                                    <h5>Método B: Chave Alternadora (ON / OFF)</h5>
                                    <p>Localize o interruptor sob a tampa de borracha e deslize-o para a posição <b>ON</b>.</p>
                                </div>
                            </div>
                        </div>

                        <label class="kc-checkbox-label" for="chk-power-on">
                            <input type="checkbox" id="chk-power-on" onchange="toggleWizardBtn(1)">
                            <span>O dispositivo está ligado e com energia</span>
                        </label>

                        <button type="button" class="kc-btn kc-btn-primary" id="btn-step-1-next" onclick="goToWizardStep(2)" disabled style="width: 100%; margin-top: 1.25rem;">
                            Próximo: Redefinir Câmera <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>

                    <!-- ETAPA 2: REDEFINIR DISPOSITIVO (RESET & SOM) -->
                    <div id="wizard-pane-2" style="display: none;">
                        <h4 style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem;">
                            Passo 2: Redefinir Dispositivo (Reset)
                        </h4>
                        <p style="font-size: 0.8rem; color: var(--kc-text-muted); margin-bottom: 1rem;">
                            Pressione e segure o botão Reset da câmera até que o dispositivo emita um aviso sonoro contínuo ou diga <i>"Restoring factory settings"</i>.
                        </p>

                        <div class="kc-method-card">
                            <div class="kc-method-icon-box"><i class="fas fa-compress-arrows-alt"></i></div>
                            <div class="kc-method-details">
                                <h5>Método A: Orifício Reset com Agulha</h5>
                                <p>Insira a chavinha de reset ou clipe no orifício marcado como <b>RESET</b> e segure por 5 a 10 segundos.</p>
                            </div>
                        </div>

                        <div class="kc-method-card">
                            <div class="kc-method-icon-box"><i class="fas fa-sd-card"></i></div>
                            <div class="kc-method-details">
                                <h5>Método B: Botão Físico ao Lado do Cartão SD</h5>
                                <p>Gire a lente da câmera para cima e pressione o botão Reset posicionado junto ao slot de memória.</p>
                            </div>
                        </div>

                        <div class="kc-method-card">
                            <div class="kc-method-icon-box"><i class="fas fa-code-fork"></i></div>
                            <div class="kc-method-details">
                                <h5>Método C: Botão no Chicote de Cabos</h5>
                                <p>Em câmeras externas tipo Bullet ou PTZ, pressione o botão com tampa emborrachada no cabo de conexão.</p>
                            </div>
                        </div>

                        <div style="background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.25); border-radius: 12px; padding: 1rem; margin-top: 0.85rem; text-align: center;">
                            <div style="font-size: 0.82rem; color: var(--kc-cyan); font-weight: 600; margin-bottom: 0.4rem;">
                                Teste o som que a câmera deve estar emitindo:
                            </div>
                            <button type="button" class="kc-sample-sound-btn" onclick="playSampleSound('dodo')">
                                <i class="fas fa-volume-high"></i> Reproduzir Som Amostra "Do-Do"
                            </button>
                            <div style="font-size: 0.72rem; color: var(--kc-text-dim);">
                                (Sinal sonoro intermitente indicando prontidão para conexão)
                            </div>
                        </div>

                        <label class="kc-checkbox-label" for="chk-reset-done">
                            <input type="checkbox" id="chk-reset-done" onchange="toggleWizardBtn(2)">
                            <span>Eu ouvi o tom recorrente "Do-Do" ou bipe contínuo</span>
                        </label>

                        <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem;">
                            <button type="button" class="kc-btn kc-btn-secondary" onclick="goToWizardStep(1)">
                                <i class="fas fa-arrow-left"></i> Voltar
                            </button>
                            <button type="button" class="kc-btn kc-btn-primary" id="btn-step-2-next" onclick="goToWizardStep(3)" disabled style="flex: 1;">
                                Próximo: Escolher Modo de Conexão <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>

                    <!-- ETAPA 3: ESCOLHER MODO DE CONEXÃO (ESTILO YOOSEE / TUYA) -->
                    <div id="wizard-pane-3" style="display: none;">
                        <h4 style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem;">
                            Passo 3: Escolher Método de Conexão
                        </h4>
                        <p style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 1rem;">
                            Escolha como deseja conectar sua câmera ao sistema:
                        </p>

                        <!-- Menu de 5 Métodos Estilo Yoosee -->
                        <div class="kc-type-switch" style="overflow-x: auto; scrollbar-width: thin; padding-bottom: 4px;">
                            <button type="button" class="kc-type-btn active" id="btn-sub-qrcode" onclick="switchConnSubtab('qrcode')">
                                <i class="fas fa-qrcode"></i> 1. Via Wi-Fi (QR Code)
                            </button>
                            <button type="button" class="kc-type-btn" id="btn-sub-cable" onclick="switchConnSubtab('cable')">
                                <i class="fas fa-network-wired"></i> 2. Cabo de Rede
                            </button>
                            <button type="button" class="kc-type-btn" id="btn-sub-bluetooth" onclick="switchConnSubtab('bluetooth')">
                                <i class="fab fa-bluetooth-b"></i> 3. Bluetooth
                            </button>
                            <button type="button" class="kc-type-btn" id="btn-sub-hotspot" onclick="switchConnSubtab('hotspot')">
                                <i class="fas fa-wifi"></i> 4. Ponto de Acesso
                            </button>
                            <button type="button" class="kc-type-btn" id="btn-sub-lan" onclick="switchConnSubtab('lan')">
                                <i class="fas fa-radar"></i> 5. Já na Rede
                            </button>
                        </div>

                        <!-- 1. Opção A: QR Code na Tela (Lente Lê) -->
                        <div id="conn-pane-qrcode">
                            <p style="font-size: 0.82rem; color: #94a3b8; margin-bottom: 0.85rem;">
                                Digite os dados da sua rede Wi-Fi de <b>2.4 GHz</b>. Aproxime a tela para a lente da câmera:
                            </p>
                            <div class="kc-form-row">
                                <div class="kc-form-group">
                                    <label class="kc-label" for="wizard-wifi-ssid">Nome do Wi-Fi (SSID) *</label>
                                    <input type="text" id="wizard-wifi-ssid" class="kc-input" placeholder="Ex: MinhaCasa_2.4G" oninput="generateWizardWifiQr()">
                                </div>
                                <div class="kc-form-group">
                                    <label class="kc-label" for="wizard-wifi-pass">Senha do Wi-Fi *</label>
                                    <input type="text" id="wizard-wifi-pass" class="kc-input" placeholder="Senha da rede" oninput="generateWizardWifiQr()">
                                </div>
                            </div>

                            <div class="kc-qr-box">
                                <div id="wizard-qrcode-container"></div>
                                <div style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin: 0.5rem 0;">
                                    <button type="button" class="kc-sample-sound-btn" onclick="playSampleSound('dingdong')">
                                        <i class="fas fa-volume-high"></i> Ouvir Som de Sucesso "Ding-Dong"
                                    </button>
                                </div>
                                <div style="font-size: 0.78rem; color: #94a3b8; text-align: center; max-width: 380px;">
                                    Posicione o celular a cerca de <b>15 a 20 cm</b> da lente da câmera. Ao ouvir o som <i>"Ding-Dong"</i> ou aviso <i>"Wi-Fi Connecting"</i>, clique abaixo:
                                </div>
                            </div>

                            <button type="button" class="kc-btn kc-btn-primary" onclick="proceedFromWizardToSave()" style="width: 100%; margin-top: 1rem;">
                                <i class="fas fa-check-circle"></i> A Câmera Leu o QR Code (Salvar Câmera)
                            </button>
                        </div>

                        <!-- 2. Opção B: Cabo de Rede (Ethernet RJ-45) -->
                        <div id="conn-pane-cable" style="display: none;">
                            <div class="kc-method-card">
                                <div class="kc-method-icon-box" style="color: var(--kc-cyan); background: rgba(6, 182, 212, 0.1); border-color: rgba(6, 182, 212, 0.3);">
                                    <i class="fas fa-network-wired"></i>
                                </div>
                                <div class="kc-method-details">
                                    <h5>1. Conecte o Cabo de Rede RJ-45</h5>
                                    <p>Plugue uma ponta do cabo de rede no roteador e a outra na porta Ethernet da câmera. O LED da porta começará a piscar.</p>
                                </div>
                            </div>
                            <div class="kc-method-card">
                                <div class="kc-method-icon-box" style="color: var(--kc-emerald); background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3);">
                                    <i class="fas fa-check-double"></i>
                                </div>
                                <div class="kc-method-details">
                                    <h5>2. A Câmera Recebe IP Automático</h5>
                                    <p>O roteador atribui um endereço IP via DHCP em segundos. A câmera anunciará <i>"Network Connected"</i> ou emitirá bipe.</p>
                                </div>
                            </div>
                            <div style="background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.25); border-radius: 12px; padding: 0.9rem; margin: 1rem 0; font-size: 0.8rem; color: #cbd5e1;">
                                <b style="color: var(--kc-cyan);"><i class="fas fa-lightbulb"></i> Migração de Cabo para Wi-Fi:</b> Após adicionar a câmera pelo cabo, você pode acessar as configurações da câmera pelo IP ou app original, selecionar a sua rede Wi-Fi sem fio e desconectar o cabo físico!
                            </div>
                            <button type="button" class="kc-btn kc-btn-emerald" onclick="document.querySelector('.kc-tab-btn[data-tab=\'tab-lan-scan\']')?.click(); triggerLanScan();" style="width: 100%;">
                                <i class="fas fa-radar"></i> Localizar Câmera no Cabo de Rede (Varredura Automática)
                            </button>
                        </div>

                        <!-- 3. Opção C: Bluetooth Low Energy (BLE) -->
                        <div id="conn-pane-bluetooth" style="display: none;">
                            <div class="kc-method-card">
                                <div class="kc-method-icon-box" style="color: #3b82f6; background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3);">
                                    <i class="fab fa-bluetooth-b"></i>
                                </div>
                                <div class="kc-method-details">
                                    <h5>Pareamento Sem Fio por Bluetooth</h5>
                                    <p>Câmeras modernas Yoosee/Tuya transmitem sinal Bluetooth BLE durante a inicialização para envio seguro do Wi-Fi.</p>
                                </div>
                            </div>
                            <button type="button" class="kc-btn" onclick="document.querySelector('.kc-tab-btn[data-tab=\'tab-bluetooth\']')?.click(); startBluetoothScan();" style="width: 100%; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: #fff; font-weight: 700; padding: 0.75rem; border-radius: 9px; margin-top: 0.5rem;">
                                <i class="fab fa-bluetooth-b"></i> Abrir Busca por Bluetooth
                            </button>
                        </div>

                        <!-- 4. Opção D: Ponto de Acesso (Hotspot AP da Câmera) -->
                        <div id="conn-pane-hotspot" style="display: none;">
                            <div class="kc-method-card">
                                <div class="kc-method-icon-box"><i class="fas fa-tower-broadcast"></i></div>
                                <div class="kc-method-details">
                                    <h5>1. Abra as Configurações de Wi-Fi do Celular</h5>
                                    <p>Procure por redes sem fio próximas. A câmera gera uma rede própria começando com: <code style="color: var(--kc-gold);">GW_IPC_...</code>, <code style="color: var(--kc-gold);">CAM_...</code>, <code style="color: var(--kc-gold);">Cloud_...</code> ou <code style="color: var(--kc-gold);">TP-Link_...</code></p>
                                </div>
                            </div>
                            <div class="kc-method-card">
                                <div class="kc-method-icon-box"><i class="fas fa-key"></i></div>
                                <div class="kc-method-details">
                                    <h5>2. Conecte-se na Rede da Câmera</h5>
                                    <p>A senha de fábrica costuma ser <b>12345678</b> ou rede aberta sem senha. Se o celular avisar "Internet indisponível", confirme em <i>"Manter conexão Wi-Fi"</i>.</p>
                                </div>
                            </div>
                            <div class="kc-method-card">
                                <div class="kc-method-icon-box"><i class="fas fa-laptop-code"></i></div>
                                <div class="kc-method-details">
                                    <h5>3. Conecte pelo IP Local de Fábrica</h5>
                                    <p>Nesse modo direto, a câmera responde no IP padrão <code style="color: var(--kc-cyan);">192.168.1.1</code> ou <code style="color: var(--kc-cyan);">192.168.0.1</code>.</p>
                                </div>
                            </div>

                            <button type="button" class="kc-btn kc-btn-primary" onclick="useHotspotIp('192.168.1.1')" style="width: 100%; margin-top: 0.85rem;">
                                <i class="fas fa-link"></i> Usar IP Padrão do Ponto de Acesso (192.168.1.1)
                            </button>
                        </div>

                        <!-- 5. Opção E: Câmera Já na Rede Local -->
                        <div id="conn-pane-lan" style="display: none;">
                            <div class="kc-method-card">
                                <div class="kc-method-icon-box" style="color: var(--kc-emerald); background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3);">
                                    <i class="fas fa-wifi"></i>
                                </div>
                                <div class="kc-method-details">
                                    <h5>A Câmera Já Está Conectada ao seu Wi-Fi?</h5>
                                    <p>Se você já configurou a câmera anteriormente no seu roteador (via app original ou cabo), não precisa resetar! O King Câmera localiza o endereço IP dela na sua rede automaticamente.</p>
                                </div>
                            </div>
                            <button type="button" class="kc-btn kc-btn-emerald" onclick="document.querySelector('.kc-tab-btn[data-tab=\'tab-lan-scan\']')?.click(); triggerLanScan();" style="width: 100%; margin-top: 0.5rem;">
                                <i class="fas fa-radar"></i> Fazer Varredura de Câmeras na Rede Local Agora
                            </button>
                        </div>

                        <div style="margin-top: 1.25rem;">
                            <button type="button" class="kc-btn kc-btn-secondary" onclick="goToWizardStep(2)">
                                <i class="fas fa-arrow-left"></i> Voltar ao Passo 2
                            </button>
                        </div>
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
                                <input type="password" id="bt-wifi-pass" class="kc-input" placeholder="Senha da rede">
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

                    <div style="display: flex; justify-content: center; gap: 0.75rem; margin-top: 1rem;">
                        <button type="button" class="kc-btn kc-btn-primary" id="btn-start-scanner" onclick="startCameraQrScanner()">
                            <i class="fas fa-camera"></i> Iniciar Câmera Traseira
                        </button>
                        <button type="button" class="kc-btn kc-btn-secondary" id="btn-stop-scanner" onclick="stopCameraQrScanner()" style="display: none;">
                            <i class="fas fa-stop"></i> Parar Scanner
                        </button>
                    </div>

                    <div id="scanner-status" style="font-size: 0.78rem; color: var(--kc-text-muted); text-align: center; margin-top: 0.75rem;">
                        Suporta etiquetas Yoosee, Intelbras, Tapo, V380 e URLs RTSP diretas.
                    </div>
                </div>

                <!-- ═════════════════════════════════════════════════════════════ -->
                <!-- ABA 3: CADASTRO MANUAL (POR ID DA CÂMERA OU POR IP / RTSP)    -->
                <!-- ═════════════════════════════════════════════════════════════ -->
                <div class="kc-tab-pane" id="tab-rtsp">
                    <!-- Switch ID vs IP -->
                    <div class="kc-type-switch">
                        <button type="button" class="kc-type-btn active" id="btn-type-id" onclick="setManualMode('id')">
                            <i class="fas fa-hashtag"></i> 1. Pelo ID da Câmera (Yoosee / Cloud ID)
                        </button>
                        <button type="button" class="kc-type-btn" id="btn-type-ip" onclick="setManualMode('ip')">
                            <i class="fas fa-network-wired"></i> 2. Pelo Endereço IP / DDNS
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
                                <label class="kc-label" for="cam-ip" id="lbl-cam-ip">ID da Câmera (3C ID / Yoosee) *</label>
                                <input type="text" id="cam-ip" class="kc-input" placeholder="Ex: 10482910 ou 172.16.100.215" required value="172.16.100.215">
                                <div class="kc-form-help" id="hint-cam-ip">Insira o ID numérico da câmera ou endereço IP local.</div>
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
            </div>
        </div>
    </div>

    <!-- Modal Compartilhar Câmera com Expiração -->
    <div class="kc-modal-backdrop" id="modal-share" aria-hidden="true">
        <div class="kc-modal" style="max-width: 560px;">
            <div class="kc-modal-header">
                <div class="kc-modal-title">
                    <i class="fas fa-share-nodes" style="color: var(--kc-gold); margin-right: 0.4rem;"></i>
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

                    <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.25rem;">
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
            setupDurationChips();
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

                    if (tabId === 'tab-wizard') {
                        generateWizardWifiQr();
                        stopCameraQrScanner();
                    } else if (tabId === 'tab-scan') {
                        // Não inicia câmera automaticamente para respeitar consentimento, mas prepara
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
                                    <button class="kc-icon-btn" onclick="toggleAudio(${cam.id})" title="Áudio On/Off" id="btn-audio-${cam.id}">
                                        <i class="fas fa-volume-mute"></i>
                                    </button>
                                    <button class="kc-icon-btn" onclick="toggleAiAudio(${cam.id})" title="IA Áudio Cristalino (Anti-Chiado)" id="btn-ai-audio-${cam.id}">
                                        <i class="fas fa-magic"></i>
                                    </button>
                                    <button class="kc-icon-btn" onclick="toggleAiVideoNight(${cam.id})" title="IA Visão Noturna Aprimorada" id="btn-ai-night-${cam.id}">
                                        <i class="fas fa-moon"></i>
                                    </button>
                                    <button class="kc-icon-btn" onclick="toggleAiVideoSharp(${cam.id})" title="IA Super Nitidez" id="btn-ai-sharp-${cam.id}">
                                        <i class="fas fa-wand-magic-sparkles"></i>
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
                            <button class="kc-icon-btn" onclick="openShareModal(${cam.id})" title="Compartilhar Link Temporário com Expiração" style="width: 28px; height: 28px; color: var(--kc-gold);">
                                <i class="fas fa-share-nodes"></i>
                            </button>
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
            document.getElementById('modal-title').textContent = cam ? 'Editar Câmera' : 'Conectar Nova Câmera';
            document.getElementById('cam-id').value = cam ? cam.id : '';
            document.getElementById('cam-name').value = cam ? cam.name : 'Quarto Bebê';
            document.getElementById('cam-room').value = cam ? (cam.room || '') : 'Quarto';
            document.getElementById('cam-ip').value = cam ? cam.ip_address : '172.16.100.215';
            document.getElementById('cam-port').value = cam ? (cam.port || 554) : 554;
            document.getElementById('cam-path').value = cam ? (cam.rtsp_path || '/onvif1') : '/onvif1';
            document.getElementById('cam-user').value = cam ? (cam.username || 'admin') : 'admin';
            document.getElementById('cam-pass').value = '';
            document.getElementById('cam-telegram-alerts').checked = cam ? cam.telegram_alerts_enabled : true;

            if (cam) {
                setManualMode('ip');
                document.querySelector('.kc-tab-btn[data-tab="tab-rtsp"]')?.click();
            } else {
                goToWizardStep(1);
                const chk1 = document.getElementById('chk-power-on');
                const chk2 = document.getElementById('chk-reset-done');
                if (chk1) chk1.checked = false;
                if (chk2) chk2.checked = false;
                toggleWizardBtn(1);
                toggleWizardBtn(2);
                document.querySelector('.kc-tab-btn[data-tab="tab-wizard"]')?.click();
            }
            modalBackdrop.classList.add('active');
        }

        function closeModal() {
            stopCameraQrScanner();
            modalBackdrop.classList.remove('active');
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
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            html5QrScanner.start(
                { facingMode: "environment" },
                qrConfig,
                (decodedText, decodedResult) => {
                    console.log('QR Code escaneado com sucesso:', decodedText);
                    playSampleSound('dingdong');
                    stopCameraQrScanner();
                    handleScannedCameraQr(decodedText);
                },
                (errorMessage) => {
                    // Frame scan contínuo
                }
            ).then(() => {
                btnStart.style.display = 'none';
                btnStop.style.display = 'inline-flex';
                btnStart.disabled = false;
                btnStart.innerHTML = '<i class="fas fa-camera"></i> Iniciar Câmera Traseira';
                if (statusEl) statusEl.innerHTML = '<span style="color: var(--kc-gold);">● Câmera ativa!</span> Aponte para o QR Code da câmera.';
            }).catch(err => {
                console.warn('Erro ao abrir câmera:', err);
                btnStart.disabled = false;
                btnStart.innerHTML = '<i class="fas fa-camera"></i> Tentar Novamente';
                if (placeholder) placeholder.style.display = 'block';
                if (statusEl) statusEl.textContent = 'Permita o acesso à câmera no navegador ou use a configuração manual.';
                Swal.fire({
                    icon: 'warning',
                    title: 'Permissão da Câmera',
                    text: 'Não foi possível acessar a câmera. Certifique-se de autorizar a permissão no navegador ou cadastre pelo ID/IP manualmente.',
                    confirmButtonColor: '#f59e0b'
                });
            });
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

        // ─── Alternador de Modo Manual (ID vs IP) ──────────────────────────
        let currentManualMode = 'id';

        function setManualMode(mode) {
            currentManualMode = mode;
            const btnId = document.getElementById('btn-type-id');
            const btnIp = document.getElementById('btn-type-ip');
            const lblIp = document.getElementById('lbl-cam-ip');
            const inputIp = document.getElementById('cam-ip');
            const hintIp = document.getElementById('hint-cam-ip');

            if (btnId) btnId.classList.toggle('active', mode === 'id');
            if (btnIp) btnIp.classList.toggle('active', mode === 'ip');

            if (mode === 'id') {
                if (lblIp) lblIp.textContent = 'ID da Câmera (3C ID / Yoosee / Cloud ID) *';
                if (inputIp) inputIp.placeholder = 'Ex: 10482910 (Encontrado na etiqueta ou app Yoosee)';
                if (hintIp) hintIp.textContent = 'O ID da câmera de 7 a 10 dígitos impresso na etiqueta da sua câmera.';
            } else {
                if (lblIp) lblIp.textContent = 'Endereço IP ou Host DDNS *';
                if (inputIp) inputIp.placeholder = 'Ex: 172.16.100.215 ou minhacasa.ddns.net';
                if (hintIp) hintIp.textContent = 'Endereço IP da câmera na sua rede local ou hostname DDNS.';
            }
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
                can_audio: true,
                can_ptz: false
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
                    Swal.fire({
                        icon: 'success',
                        title: 'Link Gerado & Copiado!',
                        html: `
                            <p style="font-size: 0.9rem; margin-bottom: 0.75rem;">O link temporário foi copiado para sua área de transferência:</p>
                            <input type="text" readonly value="${shareUrl}" style="width: 100%; padding: 0.5rem; background: rgba(0,0,0,0.3); border: 1px solid #334155; color: #fbbf24; border-radius: 6px; font-size: 0.82rem; text-align: center;" onclick="this.select()">
                            <p style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.5rem;">Válido por ${Math.round(payload.duration_seconds / 60)} minutos.</p>
                        `,
                        confirmButtonColor: '#f59e0b'
                    });
                    loadCameraShares(camId);
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

        async function loadCameraShares(camId) {
            const listEl = document.getElementById('shares-list-container');
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
                        row.style.cssText = 'background: rgba(255,255,255,0.03); border: 1px solid var(--kc-border); border-radius: 8px; padding: 0.6rem 0.85rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;';
                        const mins = Math.max(0, Math.round(s.seconds_remaining / 60));
                        row.innerHTML = `
                            <div style="min-width: 0;">
                                <div style="font-weight: 600; font-size: 0.82rem; color: #fff;">${escapeHtml(s.label)}</div>
                                <div style="font-size: 0.72rem; color: ${mins > 0 ? '#fbbf24' : '#f43f5e'};">
                                    <i class="fas fa-clock"></i> ${mins > 0 ? mins + ' min restantes' : 'Expirado'} • ${s.view_count} visualizações
                                </div>
                            </div>
                            <div style="display: flex; gap: 0.4rem; flex-shrink: 0;">
                                <button type="button" class="kc-icon-btn" onclick="copyShareUrl('${s.share_url}')" title="Copiar Link" style="width: 26px; height: 26px; font-size: 0.75rem;">
                                    <i class="fas fa-copy"></i>
                                </button>
                                <button type="button" class="kc-icon-btn" onclick="revokeShareLink(${s.id}, ${camId})" title="Revogar Agora" style="width: 26px; height: 26px; font-size: 0.75rem; color: var(--kc-rose);">
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

        function copyShareUrl(url) {
            navigator.clipboard.writeText(url).then(() => {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Link copiado!',
                    showConfirmButton: false,
                    timer: 1500
                });
            });
        }

        async function revokeShareLink(shareId, camId) {
            try {
                const res = await fetch(`/api/cameras/shares/${shareId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: getAuthHeaders()
                });
                const json = await res.json();
                if (json.success) {
                    loadCameraShares(camId);
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

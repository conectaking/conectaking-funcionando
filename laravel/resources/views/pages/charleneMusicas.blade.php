<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel da Charlene • Sarah & Família King</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0b0f19;
            --card: #151b2b;
            --card-border: #232d42;
            --primary: #8b5cf6;
            --primary-hover: #7c3aed;
            --accent: #ec4899;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --danger: #ef4444;
            --success: #10b981;
            --amber: #f59e0b;
            --blue: #3b82f6;
        }

        html {
            overflow-x: hidden !important;
            width: 100% !important;
            max-width: 100vw !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-text-size-adjust: 100%;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }

        body {
            background-color: var(--bg);
            color: var(--text);
            min-height: 100vh;
            width: 100% !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
            margin: 0 !important;
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            box-sizing: border-box !important;
        }

        .container {
            width: 100% !important;
            max-width: 860px !important;
            box-sizing: border-box !important;
            overflow-x: hidden !important;
            margin: 0 auto;
        }

        .sr-hidden-file-input, .native-hidden-file {
            position: fixed !important;
            top: -5000px !important;
            left: -5000px !important;
            width: 1px !important;
            height: 1px !important;
            opacity: 0.01 !important;
            clip: rect(0, 0, 0, 0) !important;
            pointer-events: none !important;
            z-index: -9999 !important;
        }

        .header {
            text-align: center;
            margin-bottom: 24px;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(139, 92, 246, 0.15);
            color: #c4b5fd;
            border: 1px solid rgba(139, 92, 246, 0.3);
            padding: 4px 14px;
            border-radius: 9999px;
            font-size: 0.85rem;
            font-weight: 700;
            margin-bottom: 12px;
        }

        h1 {
            font-size: 2.2rem;
            font-weight: 800;
            background: linear-gradient(135deg, #f472b6, #c084fc, #60a5fa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
        }

        .subtitle {
            color: var(--text-muted);
            font-size: 0.95rem;
        }

        /* Top Navigation Tabs */
        .main-nav {
            display: flex;
            background: var(--card);
            border: 1px solid var(--card-border);
            border-radius: 14px;
            padding: 4px;
            margin-bottom: 24px;
            gap: 4px;
        }

        .main-tab {
            flex: 1;
            padding: 10px 16px;
            border: none;
            background: transparent;
            color: var(--text-muted);
            font-weight: 700;
            font-size: 0.95rem;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .main-tab.active {
            background: linear-gradient(135deg, var(--primary), var(--accent));
            color: white;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .section-panel {
            display: none;
        }

        .section-panel.active {
            display: block;
        }

        /* Alexa Voice Hints Card */
        .voice-hints {
            background: rgba(139, 92, 246, 0.08);
            border: 1px solid rgba(139, 92, 246, 0.25);
            border-radius: 16px;
            padding: 16px 20px;
            margin-bottom: 24px;
        }

        .voice-hints-title {
            font-weight: 800;
            color: #c4b5fd;
            font-size: 0.95rem;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .hints-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 8px;
        }

        .hint-item {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.06);
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 0.85rem;
            color: #f1f5f9;
        }

        .hint-item strong {
            color: #f472b6;
        }

        /* Upload Card */
        .upload-card {
            background: var(--card);
            border: 2px dashed var(--card-border);
            border-radius: 16px;
            padding: 28px 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 24px;
        }

        .upload-card:hover, .upload-card.dragover {
            border-color: var(--primary);
            background: rgba(139, 92, 246, 0.05);
        }

        .category-selector {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        /* Grid das 4 Pastas Principais */
        .folder-cards-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin: 14px 0 16px 0;
        }

        .folder-card {
            background: #141a29;
            border: 2px solid #232d42;
            border-radius: 16px;
            padding: 14px 10px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            min-height: 155px;
        }

        .folder-card:active {
            transform: scale(0.97);
        }

        .folder-card.active {
            background: rgba(139, 92, 246, 0.18);
            border-color: #8b5cf6;
            box-shadow: 0 0 0 2px #8b5cf6, 0 8px 24px rgba(139, 92, 246, 0.35);
        }

        #card-dormir.active {
            background: rgba(59, 130, 246, 0.18);
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px #3b82f6, 0 8px 24px rgba(59, 130, 246, 0.35);
        }

        #card-animadas.active {
            background: rgba(236, 72, 153, 0.18);
            border-color: #ec4899;
            box-shadow: 0 0 0 2px #ec4899, 0 8px 24px rgba(236, 72, 153, 0.35);
        }

        #card-geral.active {
            background: rgba(14, 165, 233, 0.18);
            border-color: #0ea5e9;
            box-shadow: 0 0 0 2px #0ea5e9, 0 8px 24px rgba(14, 165, 233, 0.35);
        }

        .folder-card-top {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            position: relative;
            pointer-events: none;
        }

        .folder-emoji {
            font-size: 2rem;
            margin-bottom: 2px;
        }

        .folder-badge {
            display: none;
            position: absolute;
            top: -6px;
            right: 0px;
            background: linear-gradient(135deg, #8b5cf6, #ec4899);
            color: white;
            font-size: 0.65rem;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 999px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            letter-spacing: 0.5px;
            pointer-events: none;
        }

        .folder-card.active .folder-badge {
            display: inline-block !important;
        }

        .folder-title {
            font-size: 1rem;
            font-weight: 800;
            color: #f8fafc;
            line-height: 1.2;
            margin-top: 4px;
            pointer-events: none;
        }

        .folder-subtitle {
            font-size: 0.78rem;
            color: #94a3b8;
            margin-top: 2px;
            margin-bottom: 10px;
            pointer-events: none;
        }

        .folder-card.active .folder-title {
            color: #c4b5fd;
        }
        #card-dormir.active .folder-title {
            color: #93c5fd;
        }
        #card-animadas.active .folder-title {
            color: #fbcfe8;
        }
        #card-geral.active .folder-title {
            color: #bae6fd;
        }

        /* Botão direto dentro do card */
        .folder-direct-btn {
            position: relative !important;
            overflow: hidden !important;
            width: 100%;
            min-height: 44px;
            padding: 8px 10px;
            border-radius: 10px;
            font-size: 0.85rem;
            font-weight: 800;
            color: #ffffff;
            cursor: pointer;
            border: none;
            text-align: center;
            transition: transform 0.12s ease, filter 0.15s ease;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            box-sizing: border-box;
            user-select: none;
        }

        .folder-direct-btn:active {
            transform: scale(0.95);
            filter: brightness(1.2);
        }

        .btn-adoracao {
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        }
        .btn-dormir {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        }
        .btn-animadas {
            background: linear-gradient(135deg, #ec4899, #db2777);
        }
        .btn-geral {
            background: linear-gradient(135deg, #0ea5e9, #0284c7);
        }

        /* Botão Grande de Upload Responsivo */
        .main-upload-touch-btn {
            position: relative !important;
            width: 100%;
            min-height: 64px;
            background: linear-gradient(135deg, #8b5cf6, #ec4899);
            border-radius: 14px;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 14px;
            color: white;
            padding: 14px 18px;
            text-align: left;
            cursor: pointer;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            box-shadow: 0 8px 24px rgba(139, 92, 246, 0.45);
            margin-top: 14px;
            transition: transform 0.12s ease, filter 0.15s ease;
            box-sizing: border-box;
        }

        .main-upload-touch-btn:active {
            transform: scale(0.98);
            filter: brightness(1.15);
        }

        .folder-card-clickable {
            width: 100%;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
        }

        /* Input nativo oculto de forma acessível e compatível com iOS e Android */
        .sr-only-file, .native-hidden-file {
            position: absolute !important;
            width: 1px !important;
            height: 1px !important;
            padding: 0 !important;
            margin: -1px !important;
            overflow: hidden !important;
            clip: rect(0, 0, 0, 0) !important;
            border: 0 !important;
            opacity: 0 !important;
            z-index: -1 !important;
        }

        /* Modal de Progresso Flutuante de Upload Ultra Visível para Celular e PC */
        .upload-modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(11, 15, 25, 0.88);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
            animation: fadeInModal 0.2s ease-out;
        }
        @keyframes fadeInModal {
            from { opacity: 0; transform: scale(0.96); }
            to { opacity: 1; transform: scale(1); }
        }
        .upload-modal-box {
            background: #182032;
            border: 2px solid #8b5cf6;
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.7), 0 0 24px rgba(139, 92, 246, 0.4);
            border-radius: 20px;
            padding: 24px 20px;
            width: 100%;
            max-width: 420px;
            text-align: center;
            color: #f8fafc;
            box-sizing: border-box;
        }
        .upload-modal-icon {
            font-size: 2.8rem;
            margin-bottom: 8px;
            animation: bounceIcon 1s infinite alternate ease-in-out;
        }
        @keyframes bounceIcon {
            from { transform: translateY(0); }
            to { transform: translateY(-6px); }
        }
        .upload-modal-title {
            font-size: 1.25rem;
            font-weight: 800;
            margin-bottom: 6px;
            color: #ffffff;
        }
        .upload-modal-file {
            font-size: 0.88rem;
            color: #cbd5e1;
            margin-bottom: 16px;
            word-break: break-all;
            background: rgba(255, 255, 255, 0.05);
            padding: 6px 12px;
            border-radius: 8px;
            font-family: monospace;
        }
        .upload-modal-progress-track {
            width: 100%;
            height: 14px;
            background: #0f1523;
            border: 1px solid #334155;
            border-radius: 999px;
            overflow: hidden;
            margin-bottom: 12px;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.5);
        }
        .upload-modal-progress-bar {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, #8b5cf6, #ec4899, #38bdf8);
            background-size: 200% 100%;
            border-radius: 999px;
            transition: width 0.15s ease-out;
        }
        .upload-modal-status {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.82rem;
            color: #94a3b8;
            font-weight: 700;
        }
        #uploadModalPct {
            font-size: 1.1rem;
            font-weight: 800;
            color: #ec4899;
        }

        /* Filter Tabs */
        .filter-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
            flex-wrap: wrap;
            gap: 10px;
        }

        .filter-pills {
            display: flex;
            gap: 6px;
        }

        .pill {
            background: var(--card);
            border: 1px solid var(--card-border);
            color: var(--text-muted);
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 0.82rem;
            font-weight: 700;
            cursor: pointer;
        }

        .pill.active {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }

        .song-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .song-item {
            background: var(--card);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .song-item:hover {
            border-color: #3b4866;
        }

        .song-tag {
            font-size: 0.72rem;
            font-weight: 800;
            text-transform: uppercase;
            padding: 2px 8px;
            border-radius: 6px;
            letter-spacing: 0.5px;
        }

        .tag-adoracao {
            background: rgba(139, 92, 246, 0.2);
            color: #c4b5fd;
            border: 1px solid rgba(139, 92, 246, 0.4);
        }

        .tag-dormir {
            background: rgba(59, 130, 246, 0.2);
            color: #93c5fd;
            border: 1px solid rgba(59, 130, 246, 0.4);
        }

        .tag-animadas {
            background: rgba(236, 72, 153, 0.2);
            color: #fbcfe8;
            border: 1px solid rgba(236, 72, 153, 0.4);
        }

        .tag-geral {
            background: rgba(148, 163, 184, 0.15);
            color: #cbd5e1;
            border: 1px solid rgba(148, 163, 184, 0.3);
        }

        .del-btn {
            background: rgba(239, 68, 68, 0.15);
            color: #fca5a5;
            border: 1px solid rgba(239, 68, 68, 0.3);
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 0.8rem;
            cursor: pointer;
        }

        .del-btn:hover {
            background: var(--danger);
            color: white;
        }

        /* Memories Card */
        .memory-form-card {
            background: var(--card);
            border: 1px solid var(--card-border);
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 24px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
        }

        @media (max-width: 600px) {
            .form-row {
                grid-template-columns: 1fr;
            }
        }

        input, select, textarea {
            width: 100%;
            background: #0e1320;
            border: 1px solid var(--card-border);
            border-radius: 8px;
            padding: 10px 14px;
            color: white;
            font-size: 0.9rem;
        }

        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: var(--primary);
        }

        .memory-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 12px;
        }

        .memory-card {
            background: var(--card);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            padding: 14px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .memory-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .memory-cat {
            font-size: 0.72rem;
            font-weight: 700;
            text-transform: uppercase;
            padding: 2px 6px;
            border-radius: 4px;
            background: rgba(139, 92, 246, 0.15);
            color: #c4b5fd;
        }

        .memory-subject {
            font-weight: 800;
            font-size: 0.95rem;
            color: #f8fafc;
            margin-bottom: 6px;
        }

        .memory-content {
            font-size: 0.85rem;
            color: var(--text-muted);
            line-height: 1.4;
            margin-bottom: 10px;
        }

        .empty-state {
            text-align: center;
            padding: 36px 20px;
            color: var(--text-muted);
            background: var(--card);
            border-radius: 12px;
            border: 1px solid var(--card-border);
        }

        #progressContainer {
            display: none;
            margin-top: 14px;
        }

        .progress-bar {
            width: 100%;
            height: 6px;
            background: #232d42;
            border-radius: 999px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--primary), var(--accent));
            width: 0%;
        }

        @media (max-width: 768px) {
            body {
                padding: 16px 10px !important;
                overflow-x: hidden !important;
                width: 100% !important;
                max-width: 100vw !important;
            }
            .container {
                padding: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                overflow-x: hidden !important;
            }
            .header h1 {
                font-size: 1.45rem;
            }
            .header .subtitle {
                font-size: 0.85rem;
            }
            /* Grade 2x2 para abas no mobile - todas visíveis sem rolagem e com toque perfeito */
            .main-nav {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                padding: 6px;
                margin-bottom: 16px;
                overflow: hidden;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            .main-tab {
                min-height: 48px;
                padding: 8px 6px;
                font-size: 0.82rem;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                white-space: normal;
                line-height: 1.2;
                border-radius: 10px;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
                word-break: break-word;
                cursor: pointer;
                user-select: none;
            }
            .main-tab * {
                pointer-events: none;
            }
            .upload-card {
                padding: 18px 12px;
                margin-bottom: 18px;
                width: 100% !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
            }
            .folder-cards-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin: 12px 0 14px 0;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            .folder-card {
                padding: 10px 6px;
                min-height: 145px;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            .folder-direct-btn {
                min-height: 44px;
                font-size: 0.82rem;
                padding: 8px 6px;
                width: 100%;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            }
            .main-upload-touch-btn {
                min-height: 56px;
                padding: 12px 14px;
                width: 100% !important;
                box-sizing: border-box !important;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            }
            .category-selector {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                width: 100%;
            }
            .cat-btn {
                min-height: 48px;
                padding: 12px 8px;
                font-size: 0.88rem;
                display: flex;
                align-items: center;
                justify-content: center;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
                font-weight: 700;
            }
            .upload-btn {
                width: 100%;
                max-width: 100%;
                min-height: 52px;
                padding: 14px 16px;
                font-size: 1rem;
                display: flex;
                align-items: center;
                justify-content: center;
                touch-action: manipulation;
            }
            input, select, textarea {
                font-size: 16px !important; /* Previne zoom automático indesejado no mobile */
            }
            .filter-bar {
                flex-direction: column;
                align-items: stretch;
                gap: 10px;
                width: 100% !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
            }
            .filter-pills {
                overflow-x: auto !important;
                flex-wrap: nowrap !important;
                -webkit-overflow-scrolling: touch;
                padding-bottom: 6px;
                width: 100% !important;
                box-sizing: border-box !important;
                scrollbar-width: none;
            }
            .filter-pills::-webkit-scrollbar {
                display: none;
            }
            .pill {
                flex-shrink: 0;
                min-height: 38px;
                padding: 8px 12px;
                font-size: 0.8rem;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
                cursor: pointer;
            }
            .song-item {
                flex-direction: column;
                align-items: stretch;
                gap: 10px;
                padding: 12px;
                width: 100% !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
            }
            .song-item-controls {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            .song-item-controls audio {
                flex: 1;
                width: 0 !important;
                min-width: 0 !important;
                max-width: calc(100% - 85px) !important;
            }
            .del-btn {
                min-height: 38px;
                padding: 8px 14px;
                font-size: 0.85rem;
                touch-action: manipulation;
            }
            .memory-grid {
                grid-template-columns: 1fr;
            }
            .hints-grid {
                grid-template-columns: 1fr;
            }
            .form-row {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
@php
    $countAdoracao = collect($musicas)->where('category', 'adoracao')->count();
    $countDormir = collect($musicas)->where('category', 'dormir')->count();
    $countAnimadas = collect($musicas)->where('category', 'animadas')->count();
    $countGeral = collect($musicas)->where('category', 'geral')->count();
@endphp
<body>
    <div class="container">
        <div class="header">
            <div class="badge">👑 Conecta King • Agente Charlene IA</div>
            <h1>Charlene & Princesinha Sarah</h1>
            <p class="subtitle">Gerenciador de Músicas, Cérebro de Memórias e Histórias Bíblicas da Alexa</p>
        </div>

        <!-- Top Navigation (Grade 2x2 no mobile) -->
        <div class="main-nav">
            <button class="main-tab active" data-section="musicas" onclick="switchSection('musicas', this)">
                <span>🎵</span> Músicas da Sarah
            </button>
            <button class="main-tab" data-section="memorias" onclick="switchSection('memorias', this)">
                <span>🧠</span> Cérebro & Memória IA
            </button>
            <button class="main-tab" data-section="historias" onclick="switchSection('historias', this)">
                <span>📖</span> Jornada Bíblica ({{ count($historiasOuvidas ?? []) }}/{{ $totalCatalogo ?? 45 }})
            </button>
            <button class="main-tab" data-section="comandos" onclick="switchSection('comandos', this)">
                <span>🗣️</span> Comandos de Voz
            </button>
        </div>

        <!-- ================= SEÇÃO 1: MÚSICAS ================= -->
        <div id="section-musicas" class="section-panel active">
            <!-- Hints Bar -->
            <div class="voice-hints">
                <div class="voice-hints-title">✨ Comandos Rápidos na Alexa:</div>
                <div class="hints-grid">
                    <div class="hint-item">🗣️ <em>"Alexa, fala com a Charlene e toca <strong>músicas de adoração</strong>"</em></div>
                    <div class="hint-item">🗣️ <em>"Alexa, fala com a Charlene e toca <strong>músicas para dormir</strong>"</em></div>
                    <div class="hint-item">🗣️ <em>"Alexa, fala com a Charlene e toca <strong>músicas animadas</strong>"</em></div>
                    <div class="hint-item">🗣️ <em>"Alexa, fala com a Charlene: <strong>o que você tem para mim?</strong>"</em></div>
                </div>
            </div>

            <!-- Upload Card Ultra-Fácil e Confiável para Celular e PC -->
            <div class="upload-card" id="dropZone" style="cursor: default;">
                <div style="font-size: 2.2rem; margin-bottom: 6px;">📂</div>
                <p style="font-weight: 800; font-size: 1.25rem; margin-bottom: 4px;">Pastas de Músicas da Sarah</p>
                <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 12px;">Toque na pasta para abrir ou clique em <strong>➕ Adicionar MP3</strong>:</p>
                
                <!-- Grade das 4 Pastas Principais -->
                <div class="folder-cards-grid">
                    <!-- Adoração -->
                    <div class="folder-card active" id="card-adoracao">
                        <div class="folder-card-clickable" onclick="selectFolder('adoracao', false);">
                            <div class="folder-card-top">
                                <span class="folder-emoji">🙏</span>
                                <span class="folder-badge" id="badge-adoracao">✓ ATIVA</span>
                            </div>
                            <div class="folder-title">Adoração</div>
                            <div class="folder-subtitle">{{ $countAdoracao }} músicas</div>
                        </div>
                        <label for="file-upload-adoracao" class="folder-direct-btn btn-adoracao">
                            <span>➕ Adicionar MP3</span>
                        </label>
                        <input type="file" 
                               id="file-upload-adoracao" 
                               class="sr-only-file" 
                               multiple 
                               accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac" 
                               onchange="onFilesChosen(this, 'adoracao')">
                    </div>

                    <!-- Hora de Dormir -->
                    <div class="folder-card" id="card-dormir">
                        <div class="folder-card-clickable" onclick="selectFolder('dormir', false);">
                            <div class="folder-card-top">
                                <span class="folder-emoji">🌙</span>
                                <span class="folder-badge" id="badge-dormir">✓ ATIVA</span>
                            </div>
                            <div class="folder-title">Hora de Dormir</div>
                            <div class="folder-subtitle">{{ $countDormir }} músicas</div>
                        </div>
                        <label for="file-upload-dormir" class="folder-direct-btn btn-dormir">
                            <span>➕ Adicionar MP3</span>
                        </label>
                        <input type="file" 
                               id="file-upload-dormir" 
                               class="sr-only-file" 
                               multiple 
                               accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac" 
                               onchange="onFilesChosen(this, 'dormir')">
                    </div>

                    <!-- Animadas -->
                    <div class="folder-card" id="card-animadas">
                        <div class="folder-card-clickable" onclick="selectFolder('animadas', false);">
                            <div class="folder-card-top">
                                <span class="folder-emoji">⚡</span>
                                <span class="folder-badge" id="badge-animadas">✓ ATIVA</span>
                            </div>
                            <div class="folder-title">Animadas</div>
                            <div class="folder-subtitle">{{ $countAnimadas }} músicas</div>
                        </div>
                        <label for="file-upload-animadas" class="folder-direct-btn btn-animadas">
                            <span>➕ Adicionar MP3</span>
                        </label>
                        <input type="file" 
                               id="file-upload-animadas" 
                               class="sr-only-file" 
                               multiple 
                               accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac" 
                               onchange="onFilesChosen(this, 'animadas')">
                    </div>

                    <!-- Geral -->
                    <div class="folder-card" id="card-geral">
                        <div class="folder-card-clickable" onclick="selectFolder('geral', false);">
                            <div class="folder-card-top">
                                <span class="folder-emoji">🌟</span>
                                <span class="folder-badge" id="badge-geral">✓ ATIVA</span>
                            </div>
                            <div class="folder-title">Geral</div>
                            <div class="folder-subtitle">{{ $countGeral }} músicas</div>
                        </div>
                        <label for="file-upload-geral" class="folder-direct-btn btn-geral">
                            <span>➕ Adicionar MP3</span>
                        </label>
                        <input type="file" 
                               id="file-upload-geral" 
                               class="sr-only-file" 
                               multiple 
                               accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac" 
                               onchange="onFilesChosen(this, 'geral')">
                    </div>
                </div>

                <!-- Botão Geral de Escolha -->
                <label for="file-upload-main" id="btnUploadMusic" class="main-upload-touch-btn">
                    <span style="font-size: 1.8rem; pointer-events: none;">📱</span>
                    <div style="pointer-events: none;">
                        <div id="uploadBtnTitle" style="font-size: 1.05rem; font-weight: 800; line-height: 1.2;">Adicionar Músicas em 🙏 Adoração</div>
                        <div id="uploadBtnSubtitle" style="font-size: 0.82rem; opacity: 0.92; margin-top: 3px; font-weight: 600;">
                            Destino: <strong>🙏 Pasta Adoração da Sarah</strong>
                        </div>
                    </div>
                </label>
                <input type="file" 
                       id="file-upload-main" 
                       class="sr-only-file" 
                       multiple 
                       accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac" 
                       onchange="onFilesChosen(this, window.currentFolder || 'adoracao')">
                
                <div id="progressContainer" style="display: none; margin-top: 14px;">
                    <p id="progressText" style="font-size: 0.88rem; color: #c4b5fd; margin-bottom: 6px; font-weight: 700;">Enviando...</p>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                </div>
            </div>

            <!-- Modal Flutuante de Upload com Barra Carregando Ultra Visível no Celular -->
            <div id="uploadModal" class="upload-modal-backdrop" style="display: none;">
                <div class="upload-modal-box">
                    <div class="upload-modal-icon">🎵</div>
                    <h3 id="uploadModalTitle" class="upload-modal-title">Enviando Música...</h3>
                    <p id="uploadModalFile" class="upload-modal-file">Selecionando arquivo...</p>
                    <div class="upload-modal-progress-track">
                        <div id="uploadModalProgressBar" class="upload-modal-progress-bar"></div>
                    </div>
                    <div class="upload-modal-status">
                        <span id="uploadModalPct">0%</span>
                        <span id="uploadModalDetail">Preparando envio...</span>
                    </div>
                </div>
            </div>

            <!-- Filter Bar -->
            <div class="filter-bar">
                <div class="filter-pills">
                    <button type="button" class="pill active" data-pill="todas" onclick="filterCategory('todas')">Todas ({{ count($musicas) }})</button>
                    <button type="button" class="pill" data-pill="adoracao" onclick="filterCategory('adoracao')">🙏 Adoração ({{ $countAdoracao }})</button>
                    <button type="button" class="pill" data-pill="dormir" onclick="filterCategory('dormir')">🌙 Dormir ({{ $countDormir }})</button>
                    <button type="button" class="pill" data-pill="animadas" onclick="filterCategory('animadas')">⚡ Animadas ({{ $countAnimadas }})</button>
                    <button type="button" class="pill" data-pill="geral" onclick="filterCategory('geral')">🌟 Geral ({{ $countGeral }})</button>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                    📱 <em>Você também pode enviar MP3 direto no Telegram do Agente King!</em>
                </div>
            </div>

            <!-- Song List -->
            <div class="song-list" id="songList">
                @forelse($musicas as $song)
                    <div class="song-item" data-category="{{ $song['category'] }}">
                        <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
                            <div class="song-tag tag-{{ $song['category'] }}">{{ $song['category'] }}</div>
                            <div style="font-size: 0.95rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="{{ $song['title'] }}">
                                {{ $song['title'] }}
                            </div>
                        </div>
                        <div class="song-item-controls">
                            <audio controls preload="none" style="height: 34px;">
                                <source src="{{ $song['url'] }}" type="audio/mpeg">
                            </audio>
                            <button class="del-btn" onclick="deleteSong('{{ addslashes($song['filename']) }}', '{{ $song['category'] }}')">Excluir</button>
                        </div>
                    </div>
                @empty
                    <div class="empty-state" id="emptyState">
                        Nenhuma música adicionada ainda. Selecione uma pasta e envie seus arquivos MP3 acima!
                    </div>
                @endforelse
            </div>
        </div>

        <!-- ================= SEÇÃO 2: CÉREBRO & MEMÓRIA ================= -->
        <div id="section-memorias" class="section-panel">
            <div class="voice-hints" style="background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.25);">
                <div class="voice-hints-title" style="color: #fcd34d;">
                    💡 Memória Inteligente da Charlene:
                </div>
                <p style="font-size: 0.88rem; color: #fef3c7; line-height: 1.4;">
                    Tudo que você ou a Sarah contarem para a Charlene na Alexa (pessoas, bispos, parentes, pedidos de oração), <strong>ela salva automaticamente aqui</strong>! Daqui a 1 semana ou 6 meses, se alguém perguntar <em>"Você conhece o Bispo Fernando?"</em>, ela vai responder na hora que conhece e lembrar com muito carinho!
                </p>
            </div>

            <!-- Form Adicionar Memória Manualmente -->
            <div class="memory-form-card">
                <h3 style="font-size: 1.05rem; margin-bottom: 12px; font-weight: 800;">Adicionar / Ensinar Algo Novo à Charlene</h3>
                <form id="memoryForm" onsubmit="saveMemory(event)">
                    <div class="form-row">
                        <div>
                            <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Pessoa ou Assunto:</label>
                            <input type="text" id="memSubject" placeholder="Ex: Bispo Fernando, Titia Maria, etc." required>
                        </div>
                        <div>
                            <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Categoria:</label>
                            <select id="memCategory">
                                <option value="pessoa">Pessoa / Amigo</option>
                                <option value="familia">Família King</option>
                                <option value="pedido_oracao">Pedido de Oração</option>
                                <option value="fato">Fato / Gosto da Sarah</option>
                            </select>
                        </div>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Detalhes que a Charlene deve lembrar:</label>
                        <textarea id="memContent" rows="2" placeholder="Ex: É o Bispo Fernando, muito querido e amigo da família do Adrian King e da Sarah. Sempre oramos por ele." required></textarea>
                    </div>
                    <button type="submit" class="upload-btn" style="margin-top: 0;">Gravar na Memória da Charlene</button>
                </form>
            </div>

            <!-- Lista de Memórias -->
            <h3 style="font-size: 1.1rem; margin-bottom: 14px; font-weight: 800;">Memórias Gravadas ({{ count($memorias) }})</h3>
            <div class="memory-grid" id="memoryGrid">
                @foreach($memorias as $mem)
                    <div class="memory-card" id="mem-{{ $mem->id }}">
                        <div>
                            <div class="memory-top">
                                <span class="memory-cat">{{ $mem->category }}</span>
                                <span style="font-size: 0.75rem; color: var(--text-muted);">{{ $mem->created_at->format('d/m/Y') }}</span>
                            </div>
                            <div class="memory-subject">{{ ucwords(str_replace('_', ' ', $mem->subject)) }}</div>
                            <div class="memory-content">{{ $mem->content }}</div>
                        </div>
                        <div style="text-align: right;">
                            <button class="del-btn" style="padding: 4px 8px; font-size: 0.75rem;" onclick="deleteMemory({{ $mem->id }})">Esquecer</button>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>

        <!-- ================= SEÇÃO: JORNADA BÍBLICA & HISTÓRIAS ================= -->
        <div id="section-historias" class="section-panel">
            <div class="voice-hints" style="background: rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.3);">
                <div class="voice-hints-title" style="color: #c4b5fd;">
                    ✨ Charlene Superdotada na Bíblia • Rastreamento Anti-Repetição:
                </div>
                <p style="font-size: 0.88rem; color: #e2e8f0; line-height: 1.4;">
                    A Charlene conhece a Bíblia inteira de Gênesis ao Apocalipse e <strong>nunca repete uma história</strong> para a Sarah antes de contar todas as 45 histórias sagradas! Quando o catálogo terminar, a IA da Charlene busca novas passagens bíblicas profundas e inéditas. Ela <strong>só repete</strong> se a Sarah ou você pedirem expressamente por ela (ex: <em>"Alexa, pede para a Charlene contar a história de Davi e Golias"</em>).
                </p>
            </div>

            <!-- Stats Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 20px;">
                <div style="background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; padding: 16px; text-align: center;">
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">Histórias no Catálogo Mestre</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #a78bfa;">{{ $totalCatalogo ?? 45 }}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Antigo & Novo Testamento</div>
                </div>

                <div style="background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; padding: 16px; text-align: center;">
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">Histórias Já Ouvidas pela Sarah</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #10b981;">{{ count($historiasOuvidas ?? []) }}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">No ciclo atual de leitura</div>
                </div>

                <div style="background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; padding: 16px; text-align: center;">
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">Histórias Restantes no Ciclo</div>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #f59e0b;">{{ max(0, ($totalCatalogo ?? 45) - count($historiasOuvidas ?? [])) }}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Sem repetição para a Sarah</div>
                </div>

                <div style="background: var(--card); border: 1px solid var(--card-border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                    <button type="button" class="del-btn" style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 10px 16px; font-size: 0.85rem; font-weight: 700; border-radius: 8px;" onclick="resetStoryProgress()">
                        🔄 Reiniciar Ciclo Bíblico
                    </button>
                    <span style="font-size: 0.7rem; color: var(--text-muted); margin-top: 6px;">Permite que a Sarah ouça tudo do zero</span>
                </div>
            </div>

            <!-- Lista de Histórias do Catálogo Mestre -->
            <h3 style="font-size: 1.1rem; margin-bottom: 14px; font-weight: 800;">Catálogo de Histórias Bíblicas da Sarah</h3>
            <div class="memory-grid">
                @php
                    $ouvidasMap = ($historiasOuvidas ?? collect())->keyBy('subject');
                @endphp
                @foreach(($historiasCatalogo ?? []) as $h)
                    @php
                        $foiOuvida = isset($ouvidasMap[$h['slug']]);
                    @endphp
                    <div class="memory-card" style="{{ $foiOuvida ? 'border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.04);' : '' }}">
                        <div>
                            <div class="memory-top">
                                @if($foiOuvida)
                                    <span class="memory-cat" style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border-color: rgba(16, 185, 129, 0.4);">
                                        ✅ Já ouvida
                                    </span>
                                    <span style="font-size: 0.75rem; color: #6ee7b7;">{{ $ouvidasMap[$h['slug']]->created_at->format('d/m H:i') }}</span>
                                @else
                                    <span class="memory-cat" style="background: rgba(148, 163, 184, 0.1); color: var(--text-muted); border-color: var(--card-border);">
                                        ⏳ Próxima
                                    </span>
                                @endif
                            </div>
                            <div class="memory-subject" style="margin-top: 8px;">{{ $h['titulo'] }}</div>
                            <div style="font-size: 0.8rem; color: #c4b5fd; margin-bottom: 4px;"><strong>Personagem:</strong> {{ $h['personagem'] }}</div>
                            <div class="memory-content"><strong>Lição:</strong> {{ $h['licoes'] }}</div>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>

        <!-- ================= SEÇÃO 3: COMANDOS DE VOZ ================= -->
        <div id="section-comandos" class="section-panel">
            <div class="memory-form-card">
                <h3 style="font-size: 1.2rem; margin-bottom: 16px; font-weight: 800; color: #c4b5fd;">🗣️ Guia de Voz da Charlene para a Sarah</h3>
                
                <div style="display: flex; flex-direction: column; gap: 14px; font-size: 0.92rem;">
                    <div style="background: #0e1320; padding: 14px; border-radius: 10px; border: 1px solid var(--card-border);">
                        <strong style="color: #f472b6;">🌟 Iniciar conversa carinhosa:</strong>
                        <p style="margin-top: 4px; color: var(--text-muted);"><em>"Alexa, fala com a Charlene"</em></p>
                    </div>

                    <div style="background: #0e1320; padding: 14px; border-radius: 10px; border: 1px solid var(--card-border);">
                        <strong style="color: #c084fc;">❓ Saber o que tem para fazer:</strong>
                        <p style="margin-top: 4px; color: var(--text-muted);"><em>"Alexa, fala com a Charlene: o que você tem para me oferecer?"</em> ou <em>"O que temos para hoje?"</em></p>
                    </div>

                    <div style="background: #0e1320; padding: 14px; border-radius: 10px; border: 1px solid var(--card-border);">
                        <strong style="color: #60a5fa;">🎵 Tocar músicas por pasta:</strong>
                        <p style="margin-top: 4px; color: var(--text-muted);">• <em>"Alexa, fala com a Charlene e toca louvores de adoração"</em></p>
                        <p style="margin-top: 2px; color: var(--text-muted);">• <em>"Alexa, fala com a Charlene e toca músicas para dormir"</em></p>
                        <p style="margin-top: 2px; color: var(--text-muted);">• <em>"Alexa, fala com a Charlene e toca músicas animadas"</em></p>
                    </div>

                    <div style="background: #0e1320; padding: 14px; border-radius: 10px; border: 1px solid var(--card-border);">
                        <strong style="color: #34d399;">📖 Histórias da Bíblia Dinâmicas (Mais de 20 histórias):</strong>
                        <p style="margin-top: 4px; color: var(--text-muted);">• <em>"Alexa, pede para a Charlene contar uma história da Bíblia"</em> (ela escolhe uma história emocionante)</p>
                        <p style="margin-top: 2px; color: var(--text-muted);">• <em>"Alexa, pede para a Charlene contar a história de Davi e Golias"</em></p>
                        <p style="margin-top: 2px; color: var(--text-muted);">• <em>"Alexa, pede para a Charlene contar a história da Arca de Noé / Daniel / Ester / Jesus"</em></p>
                    </div>

                    <div style="background: #0e1320; padding: 14px; border-radius: 10px; border: 1px solid var(--card-border);">
                        <strong style="color: #fbbf24;">🙏 Orações e Pessoas Especiais (Memória):</strong>
                        <p style="margin-top: 4px; color: var(--text-muted);">• <em>"Alexa, fala com a Charlene: você conhece o Bispo Fernando?"</em></p>
                        <p style="margin-top: 2px; color: var(--text-muted);">• <em>"Alexa, fala com a Charlene para orar pelo Bispo Fernando"</em></p>
                        <p style="margin-top: 2px; color: var(--text-muted);">• <em>"Alexa, fala com a Charlene para orar pela minha família / dormir"</em></p>
                    </div>

                    <div style="background: #0e1320; padding: 14px; border-radius: 10px; border: 1px solid var(--card-border);">
                        <strong style="color: #a78bfa;">📜 Devocional do Papai Adrian King:</strong>
                        <p style="margin-top: 4px; color: var(--text-muted);"><em>"Alexa, pede para a Charlene tocar o devocional de hoje"</em></p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        window.currentFolder = 'adoracao';
        var currentFolder = 'adoracao';

        const folderMetadata = {
            'adoracao': { name: 'Adoração', emoji: '🙏', label: '🙏 Pasta Adoração', color: '#8b5cf6' },
            'dormir': { name: 'Hora de Dormir', emoji: '🌙', label: '🌙 Pasta Hora de Dormir', color: '#3b82f6' },
            'animadas': { name: 'Animadas', emoji: '⚡', label: '⚡ Pasta Animadas', color: '#ec4899' },
            'geral': { name: 'Geral', emoji: '🌟', label: '🌟 Pasta Geral', color: '#0ea5e9' }
        };

        function switchSection(name, btn) {
            try {
                document.querySelectorAll('.main-tab').forEach(b => {
                    b.classList.remove('active');
                });
                document.querySelectorAll('.section-panel').forEach(p => {
                    p.classList.remove('active');
                    p.style.display = 'none';
                });
                
                const targetBtn = btn || document.querySelector(`.main-tab[data-section="${name}"]`);
                if (targetBtn) targetBtn.classList.add('active');
                
                const targetSection = document.getElementById('section-' + name);
                if (targetSection) {
                    targetSection.classList.add('active');
                    targetSection.style.display = 'block';
                }

                try { localStorage.setItem('charlene_active_tab', name); } catch(e){}
            } catch(e) {
                console.error('[Charlene] Erro em switchSection:', e);
            }
        }

        let activeUploadCategory = 'adoracao';

        // Validação de formato de áudio robusta no cliente (Permissiva para Android e Downloads)
        function isSupportedAudio(file) {
            if (!file) return false;
            const name = (file.name || '').toLowerCase();
            const type = (file.type || '').toLowerCase();
            const audioExts = /\.(mp3|m4a|aac|wav|ogg|flac|wma|opus|webm|mp4|3gp|3gpp)$/i;
            if (audioExts.test(name)) return true;
            if (type.startsWith('audio/')) return true;
            if (type.includes('mpeg') || type.includes('mp4') || type.includes('ogg') || type.includes('wav')) return true;
            const blockedExts = /\.(jpg|jpeg|png|gif|webp|svg|pdf|doc|docx|xls|xlsx|zip|rar|tar|gz|exe|apk|txt|html|json)$/i;
            if (!blockedExts.test(name)) {
                return true;
            }
            return false;
        }

        // Handler universal chamado diretamente quando o usuário seleciona os arquivos
        function onFilesChosen(inputEl, cat) {
            if (!inputEl) return;
            const files = inputEl.files;
            console.log('[Charlene] onFilesChosen disparado para pasta:', cat, 'Arquivos:', files ? files.length : 0);
            if (!files || files.length === 0) return;
            const targetFolder = cat || window.currentFolder || 'adoracao';
            const filesArray = Array.from(files);
            try { inputEl.value = ''; } catch(e){}
            handleAudioUpload(filesArray, targetFolder);
        }

        // Abre o seletor nativo com fallback caso chamado programaticamente
        function openAudioPicker(cat) {
            activeUploadCategory = cat || window.currentFolder || 'adoracao';
            try { selectFolder(activeUploadCategory, false); } catch(err){}
            const inp = document.getElementById('file-upload-' + activeUploadCategory) || document.getElementById('file-upload-main');
            if (inp) {
                try { inp.value = ''; } catch(e){}
                inp.click();
            }
        }

        function openFilePicker(cat) {
            openAudioPicker(cat);
        }

        function directUpload(cat) {
            openAudioPicker(cat);
        }

        // Seleção de pasta unificada (Atualiza cards, botão de upload e lista)
        function selectFolder(cat, shouldFilterList = true) {
            try {
                if (!folderMetadata[cat]) return;
                currentFolder = cat;

                // 1. Atualiza visual dos cards
                ['adoracao', 'dormir', 'animadas', 'geral'].forEach(c => {
                    const card = document.getElementById('card-' + c);
                    const badge = document.getElementById('badge-' + c);
                    if (card) {
                        if (c === cat) card.classList.add('active');
                        else card.classList.remove('active');
                    }
                    if (badge) {
                        badge.style.display = (c === cat) ? 'inline-block' : 'none';
                    }
                });

                // 2. Atualiza o botão principal de upload
                const info = folderMetadata[cat];
                const btnTitle = document.getElementById('uploadBtnTitle');
                const btnSubtitle = document.getElementById('uploadBtnSubtitle');
                const mainBtn = document.getElementById('btnUploadMusic');
                if (btnTitle) btnTitle.innerHTML = `Adicionar Músicas em ${info.emoji} ${info.name}`;
                if (btnSubtitle) btnSubtitle.innerHTML = `Destino: <strong>${info.label} da Sarah</strong>`;
                if (mainBtn) {
                    if (cat === 'adoracao') mainBtn.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
                    else if (cat === 'dormir') mainBtn.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
                    else if (cat === 'animadas') mainBtn.style.background = 'linear-gradient(135deg, #ec4899, #db2777)';
                    else mainBtn.style.background = 'linear-gradient(135deg, #0ea5e9, #0284c7)';
                }

                if (shouldFilterList) {
                    // 3. Atualiza pills de filtro
                    document.querySelectorAll('.pill').forEach(p => {
                        if (p.getAttribute('data-pill') === cat) p.classList.add('active');
                        else p.classList.remove('active');
                    });

                    // 4. Filtra a lista de músicas
                    filterSongsList(cat);
                }
            } catch(e) {
                console.error('[Charlene] Erro em selectFolder:', e);
            }
        }

        function filterCategory(cat) {
            try {
                document.querySelectorAll('.pill').forEach(p => {
                    if (p.getAttribute('data-pill') === cat) p.classList.add('active');
                    else p.classList.remove('active');
                });
                filterSongsList(cat);
            } catch(e) {
                console.error('[Charlene] Erro em filterCategory:', e);
            }
        }

        function filterSongsList(cat) {
            try {
                const items = document.querySelectorAll('.song-item');
                let visible = 0;
                items.forEach(item => {
                    const itemCat = item.getAttribute('data-category');
                    if (cat === 'todas' || itemCat === cat) {
                        item.style.display = 'flex';
                        visible++;
                    } else {
                        item.style.display = 'none';
                    }
                });

                const empty = document.getElementById('emptyState');
                if (empty) {
                    if (visible === 0) {
                        empty.style.display = 'block';
                        const catName = folderMetadata[cat] ? folderMetadata[cat].name : (cat === 'todas' ? 'de nenhuma categoria' : 'selecionada');
                        empty.innerHTML = `Nenhuma música encontrada ${cat === 'todas' ? 'cadastrada ainda' : 'na pasta <strong>' + catName + '</strong> da Sarah'}. Toque em "➕ Adicionar MP3" acima para enviar!`;
                    } else {
                        empty.style.display = 'none';
                    }
                }
            } catch(e) {
                console.error('[Charlene] Erro em filterSongsList:', e);
            }
        }

        // Upload de arquivos ultra-confiável com progresso em tempo real para Celular e PC
        async function handleAudioUpload(files, forcedCat) {
            const selectedFiles = files;

            if (!selectedFiles || !selectedFiles.length) {
                alert('Nenhum arquivo selecionado.');
                return;
            }

            const targetCat = forcedCat || activeUploadCategory || window.currentFolder || (typeof currentFolder !== 'undefined' ? currentFolder : 'adoracao');
            try { selectFolder(targetCat, false); } catch(e){}
            const catInfo = folderMetadata[targetCat] || { name: 'Adoração', emoji: '🙏', label: '🙏 Pasta Adoração', color: '#8b5cf6' };
            const catName = catInfo.name || targetCat;

            // Elementos do Modal de Progresso Flutuante (Ultra Visível no Celular)
            const modal = document.getElementById('uploadModal');
            const modalTitle = document.getElementById('uploadModalTitle');
            const modalFile = document.getElementById('uploadModalFile');
            const modalBar = document.getElementById('uploadModalProgressBar');
            const modalPct = document.getElementById('uploadModalPct');
            const modalDetail = document.getElementById('uploadModalDetail');

            // Elementos da Barra Inline
            const progressContainer = document.getElementById('progressContainer');
            const progressFill = document.getElementById('progressFill');
            const progressText = document.getElementById('progressText');

            if (modal) {
                modal.style.display = 'flex';
                if (modalTitle) modalTitle.innerText = `Enviando para ${catInfo.emoji} ${catName}`;
                if (modalBar) modalBar.style.width = '0%';
                if (modalPct) modalPct.innerText = '0%';
                if (modalDetail) modalDetail.innerText = 'Conectando ao servidor...';
            }

            if (progressContainer) {
                progressContainer.style.display = 'block';
                if (progressFill) progressFill.style.width = '0%';
                if (progressText) progressText.innerText = `Iniciando envio para ${catName}...`;
                try { progressContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch(e){}
            }

            const totalFiles = selectedFiles.length;
            let successes = 0;
            let errors = 0;
            let lastErrMsg = '';

            for (let i = 0; i < totalFiles; i++) {
                const file = selectedFiles[i];
                const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);

                if (modalFile) modalFile.innerText = `(${i + 1}/${totalFiles}) ${file.name} • ${fileSizeMB} MB`;
                if (modalDetail) modalDetail.innerText = `Enviando arquivo ${i + 1} de ${totalFiles}...`;
                if (progressText) progressText.innerText = `Enviando (${i + 1}/${totalFiles}) para ${catName}: ${file.name} (${fileSizeMB} MB)...`;

                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '{{ csrf_token() }}';
                const formData = new FormData();
                formData.append('_token', csrfToken);
                formData.append('audio', file);
                formData.append('category', targetCat);

                try {
                    await new Promise((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open('POST', '/api/alexa/charlene/upload', true);
                        xhr.withCredentials = true;
                        xhr.timeout = 180000;
                        if (csrfToken) {
                            xhr.setRequestHeader('X-CSRF-TOKEN', csrfToken);
                        }
                        const ck = (typeof getCkCsrfCookie === 'function') ? getCkCsrfCookie() : '';
                        if (ck) {
                            xhr.setRequestHeader('X-CK-CSRF', ck);
                        }

                        xhr.upload.onprogress = (e) => {
                            if (e.lengthComputable) {
                                const filePct = Math.round((e.loaded / e.total) * 100);
                                const overallPct = Math.round(((i / totalFiles) * 100) + (filePct / totalFiles));
                                if (modalBar) modalBar.style.width = `${filePct}%`;
                                if (modalPct) modalPct.innerText = `${filePct}%`;
                                if (modalDetail) modalDetail.innerText = `${(e.loaded / (1024 * 1024)).toFixed(1)} MB de ${fileSizeMB} MB enviado`;
                                if (progressFill) progressFill.style.width = `${overallPct}%`;
                            }
                        };

                        xhr.onload = () => {
                            try {
                                let resp = {};
                                try {
                                    resp = JSON.parse(xhr.responseText || '{}');
                                } catch(parseE) {
                                    resp = {};
                                }

                                if (xhr.status >= 200 && xhr.status < 300 && resp.success) {
                                    successes++;
                                    resolve(resp);
                                } else {
                                    errors++;
                                    if (xhr.status === 413) {
                                        lastErrMsg = 'Arquivo muito grande (limite de 64MB). Escolha um arquivo menor.';
                                    } else {
                                        lastErrMsg = resp.message || `Erro do servidor (HTTP ${xhr.status})`;
                                    }
                                    reject(new Error(lastErrMsg));
                                }
                            } catch (parseErr) {
                                errors++;
                                lastErrMsg = `Erro HTTP ${xhr.status}: ${xhr.statusText || 'Falha no processamento'}`;
                                reject(new Error(lastErrMsg));
                            }
                        };

                        xhr.onerror = () => {
                            errors++;
                            lastErrMsg = 'Falha de conexão com o servidor. Verifique a internet do celular.';
                            reject(new Error(lastErrMsg));
                        };

                        xhr.ontimeout = () => {
                            errors++;
                            lastErrMsg = 'Tempo limite de envio esgotado (timeout).';
                            reject(new Error(lastErrMsg));
                        };

                        xhr.send(formData);
                    });
                } catch (uploadErr) {
                    console.error('[Charlene] Falha no upload:', uploadErr);
                }
            }

            // Limpa todos os inputs de arquivo para permitir reenviar o mesmo arquivo
            document.querySelectorAll('input[type="file"]').forEach(inp => {
                try { inp.value = ''; } catch(e){}
            });

            if (successes > 0) {
                if (modalTitle) modalTitle.innerText = `✅ Sucesso!`;
                if (modalDetail) modalDetail.innerText = `${successes} música(s) adicionada(s) à pasta ${catName}! Atualizando lista...`;
                if (modalBar) modalBar.style.width = '100%';
                if (modalPct) modalPct.innerText = '100%';
                if (progressFill) progressFill.style.width = '100%';
                if (progressText) progressText.innerText = `✅ ${successes} música(s) adicionada(s) com sucesso à pasta ${catName}!`;

                setTimeout(() => {
                    location.reload();
                }, 1200);
            } else {
                if (modalTitle) modalTitle.innerText = `❌ Falha no Envio`;
                if (modalDetail) modalDetail.innerText = lastErrMsg || 'Não foi possível salvar o arquivo.';
                if (progressText) progressText.innerText = `❌ Falha: ${lastErrMsg}`;
                if (progressFill) progressFill.style.width = '0%';
                
                setTimeout(() => {
                    if (modal) modal.style.display = 'none';
                    alert(`Não foi possível enviar a música para a Charlene:\n\n${lastErrMsg || 'Verifique se o arquivo é MP3 válido.'}`);
                }, 800);
            }
        }

        // Drag and drop upload para Desktop
        const dropZone = document.getElementById('dropZone');
        if (dropZone) {
            ['dragenter', 'dragover'].forEach(n => {
                dropZone.addEventListener(n, e => { e.preventDefault(); dropZone.classList.add('dragover'); });
            });
            ['dragleave', 'drop'].forEach(n => {
                dropZone.addEventListener(n, e => { e.preventDefault(); dropZone.classList.remove('dragover'); });
            });
            dropZone.addEventListener('drop', e => {
                if (e.dataTransfer.files.length) handleAudioUpload(e.dataTransfer.files);
            });
        }

        // Exposição global no window
        window.switchSection = switchSection;
        window.selectFolder = selectFolder;
        window.openAudioPicker = openAudioPicker;
        window.directUpload = openAudioPicker;
        window.openFilePicker = openAudioPicker;
        window.onFilesChosen = onFilesChosen;
        window.isSupportedAudio = isSupportedAudio;
        window.filterCategory = filterCategory;
        window.filterSongsList = filterSongsList;
        window.handleAudioUpload = handleAudioUpload;
        window.deleteSong = deleteSong;
        window.saveMemory = saveMemory;
        window.deleteMemory = deleteMemory;
        window.resetStoryProgress = resetStoryProgress;

        // Recupera a aba ativa ao recarregar a tela e adiciona listeners de toque
        document.addEventListener('DOMContentLoaded', () => {
            // Listeners adicionais de garantia para cada input de arquivo
            ['adoracao', 'dormir', 'animadas', 'geral', 'main'].forEach(cat => {
                const inp = document.getElementById('file-upload-' + cat);
                if (inp) {
                    inp.addEventListener('change', function() {
                        const targetCat = (cat === 'main') ? (window.currentFolder || 'adoracao') : cat;
                        onFilesChosen(this, targetCat);
                    });
                }
            });

            // Garante cliques diretos nas abas
            document.querySelectorAll('.main-tab').forEach(tab => {
                const sec = tab.getAttribute('data-section');
                tab.addEventListener('click', (e) => {
                    e.preventDefault();
                    switchSection(sec, tab);
                });
            });

            // Garante cliques nos cards de pasta
            ['adoracao', 'dormir', 'animadas', 'geral'].forEach(cat => {
                const card = document.getElementById('card-' + cat);
                if (card) {
                    card.addEventListener('click', (e) => {
                        if (e.target.closest('.folder-direct-btn')) return;
                        selectFolder(cat);
                    });
                }
            });

            let active = 'musicas';
            try {
                const saved = localStorage.getItem('charlene_active_tab');
                if (saved && ['musicas', 'memorias', 'historias', 'comandos'].includes(saved)) {
                    active = saved;
                }
            } catch(e){}
            switchSection(active);
            selectFolder('adoracao', false);
            filterCategory('todas');
        });

        function getCkCsrfCookie() {
            const match = document.cookie.match(new RegExp('(^| )ck_csrf=([^;]+)'));
            return match ? match[2] : '';
        }

        async function deleteSong(filename, cat) {
            if (!confirm(`Excluir "${filename}" da pasta ${cat}?`)) return;
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '{{ csrf_token() }}';
            try {
                const res = await fetch('/api/alexa/charlene/delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'X-CK-CSRF': getCkCsrfCookie()
                    },
                    body: JSON.stringify({ filename, category: cat, _token: csrfToken })
                });
                const j = await res.json();
                if (j.success) location.reload();
                else alert('Erro: ' + (j.message || 'Erro desconhecido'));
            } catch (e) {
                alert('Erro de conexão.');
            }
        }

        async function saveMemory(e) {
            e.preventDefault();
            const subject = document.getElementById('memSubject').value.trim();
            const category = document.getElementById('memCategory').value;
            const content = document.getElementById('memContent').value.trim();
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '{{ csrf_token() }}';

            try {
                const res = await fetch('/api/alexa/charlene/memory/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'X-CK-CSRF': getCkCsrfCookie()
                    },
                    body: JSON.stringify({ subject, category, content, _token: csrfToken })
                });
                const j = await res.json();
                if (j.success) {
                    alert('Memória gravada no cérebro da Charlene com sucesso!');
                    location.reload();
                } else {
                    alert('Erro: ' + (j.message || 'Erro desconhecido'));
                }
            } catch (err) {
                alert('Erro de conexão.');
            }
        }

        async function deleteMemory(id) {
            if (!confirm('Deseja que a Charlene esqueça essa informação?')) return;
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '{{ csrf_token() }}';
            try {
                const res = await fetch('/api/alexa/charlene/memory/delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'X-CK-CSRF': getCkCsrfCookie()
                    },
                    body: JSON.stringify({ id, _token: csrfToken })
                });
                const j = await res.json();
                if (j.success) {
                    const card = document.getElementById('mem-' + id);
                    if (card) card.remove();
                } else {
                    alert('Erro: ' + (j.message || 'Erro desconhecido'));
                }
            } catch (err) {
                alert('Erro de conexão.');
            }
        }

        async function resetStoryProgress() {
            if (!confirm('Deseja reiniciar o progresso das histórias bíblicas? A Sarah poderá ouvir todas as 45 histórias da Bíblia novamente desde o começo sem repetições!')) return;
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '{{ csrf_token() }}';
            try {
                const res = await fetch('/api/alexa/charlene/historias/reset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'X-CK-CSRF': getCkCsrfCookie()
                    },
                    body: JSON.stringify({ _token: csrfToken })
                });
                const j = await res.json();
                if (j.success) {
                    alert(j.message);
                    location.reload();
                } else {
                    alert('Erro: ' + (j.message || 'Erro desconhecido'));
                }
            } catch (err) {
                alert('Erro de conexão ao reiniciar ciclo.');
            }
        }
    </script>
</body>
</html>

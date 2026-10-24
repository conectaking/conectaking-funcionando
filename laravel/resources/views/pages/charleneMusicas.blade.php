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
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .container {
            width: 100%;
            max-width: 860px;
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

        /* Grid de Pastas Mobile para Upload */
        .target-folder-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin: 12px 0 16px 0;
        }

        .target-folder-card {
            background: #141a29;
            border: 2px solid #232d42;
            border-radius: 14px;
            padding: 12px 10px;
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
            justify-content: center;
            min-height: 78px;
        }

        .target-folder-card:active {
            transform: scale(0.97);
        }

        .target-folder-card.active {
            background: rgba(139, 92, 246, 0.22);
            border-color: #8b5cf6;
            box-shadow: 0 0 0 1px #8b5cf6, 0 8px 24px rgba(139, 92, 246, 0.35);
        }

        .target-folder-card .icon {
            font-size: 1.6rem;
            margin-bottom: 4px;
        }

        .target-folder-card .name {
            font-size: 0.95rem;
            font-weight: 800;
            color: #f8fafc;
            line-height: 1.2;
        }

        .target-folder-card .count {
            font-size: 0.75rem;
            color: #94a3b8;
            margin-top: 3px;
        }

        .target-folder-card.active .name {
            color: #c4b5fd;
        }

        .target-folder-card.active .count {
            color: #e2e8f0;
        }

        .target-folder-card .active-pill {
            display: none;
            position: absolute;
            top: -8px;
            right: 8px;
            background: linear-gradient(135deg, #8b5cf6, #ec4899);
            color: white;
            font-size: 0.65rem;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 999px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            letter-spacing: 0.5px;
        }

        .target-folder-card.active .active-pill {
            display: block;
        }

        .mobile-upload-box {
            position: relative;
            width: 100%;
            margin-top: 14px;
            overflow: hidden;
            border-radius: 14px;
        }

        .mobile-upload-visual {
            width: 100%;
            min-height: 56px;
            background: linear-gradient(135deg, var(--primary), var(--accent));
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            color: white;
            font-weight: 800;
            font-size: 1.05rem;
            box-shadow: 0 8px 24px rgba(139, 92, 246, 0.45);
            pointer-events: none;
            padding: 12px 16px;
            text-align: center;
        }

        .mobile-native-input {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.001;
            z-index: 50;
            cursor: pointer;
            display: block !important;
            -webkit-tap-highlight-color: transparent;
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
            .container {
                padding: 12px 10px;
            }
            .header h1 {
                font-size: 1.45rem;
            }
            .header .subtitle {
                font-size: 0.85rem;
            }
            /* Grade 2x2 para abas no mobile - todas visíveis sem precisar rolar */
            .main-nav {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                padding: 6px;
                margin-bottom: 16px;
                overflow: visible;
            }
            .main-tab {
                min-height: 50px;
                padding: 10px 6px;
                font-size: 0.84rem;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                white-space: normal;
                line-height: 1.25;
                border-radius: 10px;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            }
            .upload-card {
                padding: 20px 12px;
                margin-bottom: 18px;
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
                font-size: 16px !important; /* Previne zoom automático indesejado no iOS Safari */
            }
            .filter-bar {
                flex-direction: column;
                align-items: stretch;
                gap: 10px;
            }
            .filter-pills {
                overflow-x: auto;
                flex-wrap: nowrap;
                -webkit-overflow-scrolling: touch;
                padding-bottom: 6px;
            }
            .pill {
                flex-shrink: 0;
                min-height: 38px;
                padding: 8px 12px;
                font-size: 0.8rem;
                touch-action: manipulation;
            }
            .song-item {
                flex-direction: column;
                align-items: stretch;
                gap: 10px;
                padding: 14px;
            }
            .song-item-controls {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                width: 100%;
            }
            .song-item-controls audio {
                flex: 1;
                max-width: calc(100% - 85px);
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

            <!-- Upload Card Ultra-Fácil para Mobile -->
            <div class="upload-card" id="dropZone" style="cursor: default;">
                <div style="font-size: 2.2rem; margin-bottom: 6px;">📂</div>
                <p style="font-weight: 800; font-size: 1.25rem; margin-bottom: 4px;">Enviar Músicas para a Sarah</p>
                <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 12px;">1. Toque na pasta da Sarah para onde você quer enviar:</p>
                
                <!-- Grade de 4 Pastas Grandes e Táteis para Celular -->
                <div class="target-folder-grid">
                    <button type="button" class="target-folder-card active" data-cat="adoracao" onclick="setDestinationFolder('adoracao', this)">
                        <div class="active-pill">✓ ATIVA</div>
                        <span class="icon">🙏</span>
                        <span class="name">Adoração</span>
                        <span class="count">{{ $countAdoracao }} músicas</span>
                    </button>
                    <button type="button" class="target-folder-card" data-cat="dormir" onclick="setDestinationFolder('dormir', this)">
                        <div class="active-pill">✓ ATIVA</div>
                        <span class="icon">🌙</span>
                        <span class="name">Hora de Dormir</span>
                        <span class="count">{{ $countDormir }} músicas</span>
                    </button>
                    <button type="button" class="target-folder-card" data-cat="animadas" onclick="setDestinationFolder('animadas', this)">
                        <div class="active-pill">✓ ATIVA</div>
                        <span class="icon">⚡</span>
                        <span class="name">Animadas</span>
                        <span class="count">{{ $countAnimadas }} músicas</span>
                    </button>
                    <button type="button" class="target-folder-card" data-cat="geral" onclick="setDestinationFolder('geral', this)">
                        <div class="active-pill">✓ ATIVA</div>
                        <span class="icon">🌟</span>
                        <span class="name">Geral</span>
                        <span class="count">{{ $countGeral }} músicas</span>
                    </button>
                </div>

                <div style="margin: 8px 0 14px 0; font-size: 0.95rem; color: #f8fafc; font-weight: 700;">
                    Destino selecionado: <span id="activeCategoryBadge" style="background: linear-gradient(135deg, var(--primary), var(--accent)); padding: 6px 18px; border-radius: 999px; color: #fff; display: inline-block; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);">🙏 Pasta Adoração</span>
                </div>

                <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 8px;">2. Toque no botão abaixo para escolher o arquivo de áudio no seu celular:</p>

                <!-- Botão com Input Nativo Totalmente Coberto (100% Compatível com Xiaomi Poco X6 Pro / Android) -->
                <div class="mobile-upload-box">
                    <div class="mobile-upload-visual">
                        <span style="font-size: 1.5rem;">📱</span>
                        <span>Toque Aqui para Escolher Músicas no Celular / PC</span>
                    </div>
                    <input type="file" id="fileInput" name="audio" accept="audio/*,audio/mpeg,audio/mp3,audio/m4a,audio/x-m4a,audio/wav,audio/ogg,.mp3,.m4a,.wav,.ogg" multiple class="mobile-native-input" onchange="if(this.files && this.files.length) uploadFiles(this.files)">
                </div>
                
                <div id="progressContainer">
                    <p id="progressText" style="font-size: 0.88rem; color: #c4b5fd; margin-bottom: 6px; font-weight: 700;">Enviando...</p>
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                </div>
            </div>

            <!-- Filter Bar -->
            <div class="filter-bar">
                <div class="filter-pills">
                    <button class="pill active" onclick="filterCategory('todas', this)">Todas ({{ count($musicas) }})</button>
                    <button class="pill" onclick="filterCategory('adoracao', this)">🙏 Adoração ({{ $countAdoracao }})</button>
                    <button class="pill" onclick="filterCategory('dormir', this)">🌙 Dormir ({{ $countDormir }})</button>
                    <button class="pill" onclick="filterCategory('animadas', this)">⚡ Animadas ({{ $countAnimadas }})</button>
                    <button class="pill" onclick="filterCategory('geral', this)">🌟 Geral ({{ $countGeral }})</button>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">
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
        let currentUploadCategory = 'adoracao';

        const categoryLabels = {
            'adoracao': '🙏 Pasta Adoração',
            'dormir': '🌙 Pasta Hora de Dormir',
            'animadas': '⚡ Pasta Animadas',
            'geral': '🌟 Pasta Geral'
        };

        function switchSection(name, btn) {
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
        }

        function openFilePicker() {
            const input = document.getElementById('fileInput');
            if (input) {
                input.value = '';
                input.click();
            }
        }

        // Recupera a aba ativa ao recarregar a tela
        window.addEventListener('DOMContentLoaded', () => {
            let active = 'musicas';
            try {
                const saved = localStorage.getItem('charlene_active_tab');
                if (saved && ['musicas', 'memorias', 'historias', 'comandos'].includes(saved)) {
                    active = saved;
                }
            } catch(e){}
            switchSection(active);
        });

        function setDestinationFolder(cat, btn) {
            currentUploadCategory = cat;
            try { if (navigator.vibrate) navigator.vibrate(40); } catch(e){}

            document.querySelectorAll('.target-folder-card').forEach(b => {
                if (b.getAttribute('data-cat') === cat) b.classList.add('active');
                else b.classList.remove('active');
            });

            const badge = document.getElementById('activeCategoryBadge');
            if (badge && categoryLabels[cat]) {
                badge.innerText = categoryLabels[cat];
            }
        }

        function filterCategory(cat, btn) {
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');

            const items = document.querySelectorAll('.song-item');
            items.forEach(item => {
                if (cat === 'todas' || item.getAttribute('data-category') === cat) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });

            // Se filtrou por uma pasta específica, já sincroniza o seletor de upload
            if (cat !== 'todas') {
                setDestinationFolder(cat);
            }
        }

        // Drag and drop upload
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        ['dragenter', 'dragover'].forEach(n => {
            dropZone.addEventListener(n, e => { e.preventDefault(); dropZone.classList.add('dragover'); });
        });
        ['dragleave', 'drop'].forEach(n => {
            dropZone.addEventListener(n, e => { e.preventDefault(); dropZone.classList.remove('dragover'); });
        });
        dropZone.addEventListener('drop', e => {
            if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        });

        async function uploadFiles(files) {
            if (!files || !files.length) return;
            const targetCat = currentUploadCategory || 'adoracao';
            const catName = categoryLabels[targetCat] || targetCat;

            progressContainer.style.display = 'block';
            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                progressText.innerText = `Enviando (${i+1}/${files.length}) para ${catName}: ${f.name}`;
                progressFill.style.width = `${Math.round(((i+1)/files.length)*100)}%`;

                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '{{ csrf_token() }}';
                const fd = new FormData();
                fd.append('_token', csrfToken);
                fd.append('audio', f);
                fd.append('category', targetCat);

                try {
                    const res = await fetch('/api/alexa/charlene/upload', {
                        method: 'POST',
                        headers: {
                            'X-CSRF-TOKEN': csrfToken,
                            'X-CK-CSRF': getCkCsrfCookie()
                        },
                        body: fd
                    });
                    const j = await res.json();
                    if (!j.success) alert(`Erro ao enviar ${f.name}: ` + (j.message || 'Erro desconhecido'));
                } catch (e) {
                    alert('Erro de conexão ao enviar: ' + f.name);
                }
            }
            progressText.innerText = `Músicas adicionadas à ${catName} com sucesso!`;
            fileInput.value = '';
            setTimeout(() => location.reload(), 900);
        }

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

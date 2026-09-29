<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>King Forms - Formulários de Alta Conversão | Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/css/fontawesome.css', 'resources/js/pages/kingForms.js'])
</head>
<body class="kf-page-body">
    <!-- View do Editor (iframe em tela cheia quando ?edit=ID) -->
    <div id="kf-editor-view" class="kf-editor-view">
        <iframe id="kf-editor-frame" title="Editor do formulário" src="about:blank"></iframe>
    </div>

    <!-- View da Lista de Formulários (Dashboard Moderno) -->
    <div id="kf-list-view" class="kf-app-layout">
        <!-- Barra de Navegação Superior / Topbar -->
        <header class="kf-topbar">
            <div class="kf-topbar-inner">
                <div class="kf-breadcrumb">
                    <a href="/dashboard" class="kf-back-link">
                        <i class="fas fa-arrow-left"></i>
                        <span>Voltar ao Painel</span>
                    </a>
                    <span class="kf-sep">/</span>
                    <span class="kf-current-page">King Forms</span>
                </div>
                <div class="kf-topbar-actions">
                    <button type="button" class="kf-btn-hero-create" id="kf-btn-new">
                        <i class="fas fa-plus"></i>
                        <span>Criar Novo Formulário</span>
                    </button>
                </div>
            </div>
        </header>

        <main class="kf-main-content">
            <!-- Hero Banner -->
            <section class="kf-hero-banner">
                <div class="kf-hero-info">
                    <div class="kf-hero-badge">
                        <i class="fas fa-crown"></i>
                        <span>CONECTA KING SUITE</span>
                    </div>
                    <h1 class="kf-hero-title">
                        King Forms <span class="kf-glow-text">Studio</span>
                    </h1>
                    <p class="kf-hero-subtitle">
                        Crie formulários e pesquisas de alta conversão, personalize temas com 1 clique e gerencie todos os leads e respostas em tempo real.
                    </p>
                </div>
                <!-- Stats Cards -->
                <div class="kf-stats-row">
                    <div class="kf-stat-card">
                        <div class="kf-stat-icon kf-icon-gold">
                            <i class="fas fa-file-signature"></i>
                        </div>
                        <div class="kf-stat-details">
                            <span class="kf-stat-value" id="kf-stat-total-forms">0</span>
                            <span class="kf-stat-label">Formulários Criados</span>
                        </div>
                    </div>
                    <div class="kf-stat-card">
                        <div class="kf-stat-icon kf-icon-green">
                            <i class="fas fa-users-viewfinder"></i>
                        </div>
                        <div class="kf-stat-details">
                            <span class="kf-stat-value" id="kf-stat-total-leads">0</span>
                            <span class="kf-stat-label">Total de Respostas</span>
                        </div>
                    </div>
                    <div class="kf-stat-card">
                        <div class="kf-stat-icon kf-icon-blue">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="kf-stat-details">
                            <span class="kf-stat-value" id="kf-stat-most-active">-</span>
                            <span class="kf-stat-label">Mais Ativo</span>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Search & Filter Controls -->
            <section class="kf-toolbar">
                <div class="kf-search-wrapper">
                    <i class="fas fa-search kf-search-icon"></i>
                    <input type="text" id="kf-search-input" class="kf-search-input" placeholder="Pesquisar formulários por título..." autocomplete="off">
                    <button type="button" id="kf-search-clear" class="kf-search-clear" title="Limpar pesquisa" style="display: none;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="kf-toolbar-meta">
                    <span id="kf-count-indicator" class="kf-count-indicator">Carregando formulários...</span>
                </div>
            </section>

            <!-- Grid de Formulários -->
            <div class="kf-cards-grid" id="kf-list">
                <div class="kf-loading-state" id="kf-empty">
                    <div class="kf-spinner"></div>
                    <p>Sincronizando seus formulários...</p>
                </div>
            </div>
        </main>
    </div>

    <!-- Modal de QR Code -->
    <div id="kf-qr-modal" class="kf-modal-backdrop" style="display: none;">
        <div class="kf-modal-container">
            <div class="kf-modal-header">
                <div class="kf-modal-title">
                    <i class="fas fa-qrcode"></i>
                    <span>QR Code do Formulário</span>
                </div>
                <button type="button" class="kf-modal-close" id="kf-qr-modal-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="kf-modal-body">
                <div class="kf-qr-canvas-box" id="kf-qr-canvas-box">
                    <!-- Canvas do QR Code gerado via qrcode -->
                </div>
                <h4 id="kf-qr-form-title" class="kf-qr-form-title">Título do Formulário</h4>
                <p class="kf-qr-instruction">Aponte a câmera do celular para abrir ou baixe a imagem para impressão, mesas e cartazes.</p>
                <div class="kf-qr-link-copy-box">
                    <input type="text" id="kf-qr-link-input" readonly>
                    <button type="button" id="kf-qr-copy-btn" class="kf-btn-copy-modal">
                        <i class="fas fa-copy"></i>
                        <span>Copiar Link</span>
                    </button>
                </div>
            </div>
            <div class="kf-modal-footer">
                <button type="button" id="kf-qr-download-btn" class="kf-btn-download-qr">
                    <i class="fas fa-download"></i>
                    <span>Baixar Imagem PNG</span>
                </button>
            </div>
        </div>
    </div>
</body>
</html>

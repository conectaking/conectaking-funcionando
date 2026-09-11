<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>King Forms - Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/css/fontawesome.css', 'resources/js/pages/kingForms.js'])
    
</head>
<body>
    <div id="kf-editor-view" class="kf-editor-view">
        <iframe id="kf-editor-frame" title="Editor do formulário" src="about:blank"></iframe>
    </div>
    <div id="kf-list-view" class="kf-container">
        <div class="kf-header">
            <div class="kf-header-left">
                <a href="/dashboard" class="kf-btn kf-btn-secondary" id="kf-btn-back" style="text-decoration: none;"><i class="fas fa-arrow-left"></i> Voltar ao painel</a>
                <h1><i class="fas fa-file-signature"></i> King Forms</h1>
            </div>
            <button type="button" class="kf-btn kf-btn-primary" id="kf-btn-new">
                <i class="fas fa-plus"></i> Criar novo formulário
            </button>
        </div>
        <div class="kf-list" id="kf-list">
            <div class="kf-empty" id="kf-empty">Carregando formulários...</div>
        </div>
    </div>
    </body>
</html>

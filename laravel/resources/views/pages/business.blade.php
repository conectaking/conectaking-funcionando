<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Modo Empresa - Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/css/fontawesome.css', 'resources/js/pages/business.js'])
</head>
<body class="ck-biz-body">
    <header class="ck-biz-header">
        <a href="/dashboard" class="ck-biz-back"><i class="fas fa-arrow-left"></i> Voltar ao painel</a>
        <h1><i class="fas fa-building"></i> Modo Empresa</h1>
        <p class="ck-biz-sub">Equipe, códigos de convite e logo da marca</p>
    </header>

    <main class="ck-biz-main" id="ck-biz-main">
        <p class="ck-biz-loading" id="ck-biz-loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</p>
        <p class="ck-biz-error ck-hidden" id="ck-biz-error"></p>

        <section class="ck-biz-card" id="ck-biz-team-section">
            <h2><i class="fas fa-users"></i> Equipe</h2>
            <p class="ck-biz-hint">Perfis vinculados à sua conta empresarial.</p>
            <div id="ck-biz-team-list" class="ck-biz-list"></div>
        </section>

        <section class="ck-biz-card" id="ck-biz-codes-section">
            <h2><i class="fas fa-ticket"></i> Códigos de convite</h2>
            <p class="ck-biz-hint">Gere códigos para cadastrar membros da equipe.</p>
            <div class="ck-biz-actions">
                <button type="button" class="ck-biz-btn primary" id="ck-biz-gen-code"><i class="fas fa-plus"></i> Gerar código</button>
                <div class="ck-biz-manual">
                    <input type="text" id="ck-biz-custom-code" maxlength="12" placeholder="Código manual (máx. 12)" autocomplete="off">
                    <button type="button" class="ck-biz-btn" id="ck-biz-gen-manual">Criar</button>
                </div>
            </div>
            <div id="ck-biz-codes-list" class="ck-biz-list"></div>
        </section>

        <section class="ck-biz-card" id="ck-biz-logo-section">
            <h2><i class="fas fa-palette"></i> Logo da marca</h2>
            <p class="ck-biz-hint">Aparece no rodapé do cartão virtual. Também disponível em Personalização da Marca no painel.</p>
            <div class="ck-biz-logo-preview">
                <img id="ck-biz-logo-img" alt="Logo" class="ck-hidden">
                <p id="ck-biz-logo-empty">Nenhum logo configurado</p>
            </div>
            <label class="ck-biz-label">Upload</label>
            <input type="file" id="ck-biz-logo-upload" accept="image/*">
            <label class="ck-biz-label">Tamanho (px)</label>
            <input type="number" id="ck-biz-logo-size" min="20" max="200" value="60">
            <label class="ck-biz-label">Link (opcional)</label>
            <input type="url" id="ck-biz-logo-link" placeholder="https://seusite.com.br">
            <input type="hidden" id="ck-biz-logo-url" value="">
            <div class="ck-biz-actions">
                <button type="button" class="ck-biz-btn" id="ck-biz-logo-clear">Limpar</button>
                <button type="button" class="ck-biz-btn primary" id="ck-biz-logo-save"><i class="fas fa-save"></i> Salvar logo</button>
            </div>
            <p class="ck-biz-hint"><a href="/dashboard" id="ck-biz-open-branding">Abrir Personalização da Marca no painel →</a></p>
        </section>
    </main>
</body>
</html>

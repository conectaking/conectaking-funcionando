<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Bíblia — painel</title>
    <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/css/fontawesome.css', 'resources/js/pages/bibliaking.js'])
</head>
<body>
    <div class="wrap">
        <div class="hero">
            <i class="fas fa-book-open" aria-hidden="true"></i>
            <h1>Bíblia Conecta King</h1>
            <p>Leitura, progresso, devocionais e estudos — no seu painel.</p>
        </div>
        <div id="state-loading" class="loading"><i class="fas fa-spinner fa-spin"></i><div>A carregar…</div></div>
        <div id="state-no-item" class="hidden">
            <div class="msg msg-warn">Abra a Bíblia pelo menu do <strong>painel principal</strong> (módulo Bíblia), ou use <code class="ck-bk-0979c7">/bibliaking?itemId=</code> com o ID do seu módulo.</div>
            <a class="btn btn-secondary" href="/dashboard"><i class="fas fa-th-large"></i> Painel principal</a>
            <a class="btn btn-secondary" href="/login"><i class="fas fa-sign-in-alt"></i> Entrar</a>
        </div>
        <div id="state-auth" class="hidden">
            <div class="msg msg-info">Precisa de sessão iniciada para ver a sua configuração e o progresso de leitura.</div>
            <a class="btn btn-primary" href="/login"><i class="fas fa-sign-in-alt"></i> Entrar</a>
            <a class="btn btn-secondary" href="/dashboard"><i class="fas fa-th-large"></i> Painel principal</a>
        </div>
        <div id="state-main" class="hidden">
            <div id="banner-progress-error" class="msg msg-error hidden"></div>
            <div class="top-actions">
                <a class="btn btn-secondary" href="/dashboard"><i class="fas fa-th-large"></i> Painel principal</a>
                <a id="link-public-bible" class="btn btn-primary" href="#"><i class="fas fa-globe"></i> Abrir Bíblia pública</a>
            </div>

            <div class="card" id="card-hub">
                <h2><i class="fas fa-compass"></i> Atalhos da Bíblia</h2>
                <div class="hub-grid" id="bible-hub-links">
                    <a class="hub-card" id="hub-devocional" href="#"><i class="fas fa-sun"></i><strong>Devocional 365</strong><span>Reflexão diária com versículo</span></a>
                    <a class="hub-card" id="hub-salmo" href="#"><i class="fas fa-music"></i><strong>Salmo do dia</strong><span>Salmo para oração e meditação</span></a>
                    <a class="hub-card" id="hub-plano" href="#"><i class="fas fa-calendar-alt"></i><strong>Plano de leitura</strong><span>Roteiro anual por capítulos</span></a>
                    <a class="hub-card" id="hub-inteira" href="#"><i class="fas fa-book"></i><strong>Bíblia inteira</strong><span>Devocional livro a livro</span></a>
                    <a class="hub-card" id="hub-prosperidade" href="#"><i class="fas fa-seedling"></i><strong>Prosperidade</strong><span>Ativações e estudos temáticos</span></a>
                    <a class="hub-card" id="hub-livros" href="#"><i class="fas fa-bookmark"></i><strong>Livros &amp; estudos</strong><span>Antigo e Novo Testamento</span></a>
                </div>
            </div>

            <div class="card" id="card-progress">
                <h2><i class="fas fa-chart-line"></i> Progresso de leitura</h2>
                <div class="progress-stats" id="progress-stats"></div>
                <div class="progress-bar" title="Capítulos lidos"><span class="ck-bk-d2fba0" id="progress-chapters-pct"></span></div>
            </div>
            <div class="card" id="card-verse">
                <h2><i class="fas fa-sun"></i> Versículo do dia</h2>
                <div class="ref" id="vod-ref"></div>
                <div class="verse-text" id="vod-text"></div>
                <div class="reflexao" id="vod-reflexao"></div>
                <button type="button" class="btn btn-secondary" id="btn-mark-vod"><i class="far fa-check-circle"></i> Marcar versículo do dia como lido</button>
                <span class="ck-bk-abb751" id="vod-mark-msg"></span>
            </div>
        </div>
    </div>
</body>
</html>

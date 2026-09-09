<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Bíblia — painel</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600&family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', sans-serif;
            background: #0c0c0e;
            background-image: linear-gradient(180deg, #0c0c0e 0%, #141418 50%, #18181c 100%);
            color: #E8E8E8;
            min-height: 100vh;
            padding: 20px;
            padding-bottom: max(24px, env(safe-area-inset-bottom));
        }
        .wrap { max-width: 640px; margin: 0 auto; }
        .hero {
            text-align: center;
            margin-bottom: 24px;
        }
        .hero i { font-size: 2.25rem; color: #FFC700; margin-bottom: 10px; }
        .hero h1 { font-family: 'Lora', serif; font-size: 1.35rem; font-weight: 600; color: #ECECEC; }
        .card {
            background: rgba(28, 28, 33, 0.96);
            border: 1px solid rgba(255, 199, 0, 0.22);
            border-radius: 16px;
            padding: 22px 20px;
            margin-bottom: 16px;
            box-shadow: 0 8px 28px rgba(0,0,0,0.35);
        }
        .card h2 { font-size: 0.95rem; color: #A1A1A1; margin-bottom: 12px; font-weight: 600; }
        .progress-bar {
            height: 10px;
            background: rgba(255,199,0,0.12);
            border-radius: 6px;
            overflow: hidden;
            margin-top: 8px;
        }
        .progress-bar > span {
            display: block;
            height: 100%;
            background: linear-gradient(90deg, #d4a012, #FFC700);
            border-radius: 6px;
            transition: width 0.4s ease;
        }
        .progress-stats { font-size: 0.9rem; color: #ccc; margin-top: 10px; line-height: 1.5; }
        .ref { font-family: 'Lora', serif; color: #FFC700; font-weight: 600; margin-bottom: 12px; }
        .verse-text { font-family: 'Lora', serif; font-size: 1.1rem; line-height: 1.65; color: #ECECEC; }
        .reflexao { margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 0.9rem; color: #B8B8B8; font-style: italic; }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 18px;
            border-radius: 12px;
            font-size: 0.92rem;
            font-weight: 600;
            border: none;
            cursor: pointer;
            font-family: inherit;
            text-decoration: none;
            margin-top: 12px;
            margin-right: 8px;
        }
        .btn-primary { background: #FFC700; color: #111; }
        .btn-secondary { background: rgba(255,255,255,0.08); color: #ECECEC; border: 1px solid rgba(255,255,255,0.15); }
        .btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .msg { padding: 14px 16px; border-radius: 12px; font-size: 0.92rem; line-height: 1.45; margin-bottom: 14px; }
        .msg-error { background: rgba(231,76,60,0.15); border: 1px solid rgba(231,76,60,0.45); color: #f5a097; }
        .msg-warn { background: rgba(255,199,0,0.1); border: 1px solid rgba(255,199,0,0.35); color: #e8d4a0; }
        .msg-info { background: rgba(52,152,219,0.12); border: 1px solid rgba(52,152,219,0.35); color: #9ecfef; }
        .hidden { display: none !important; }
        .loading { text-align: center; padding: 40px; color: #A1A1A1; }
        .loading i { color: #FFC700; font-size: 2rem; margin-bottom: 12px; }
        .top-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-bottom: 8px; }
    </style>
    <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/js/pages/bibliaking.js'])
</head>
<body>
    <div class="wrap">
        <div class="hero">
            <i class="fas fa-book-open" aria-hidden="true"></i>
            <h1>Bíblia Conecta King</h1>
        </div>
        <div id="state-loading" class="loading"><i class="fas fa-spinner fa-spin"></i><div>A carregar…</div></div>
        <div id="state-no-item" class="hidden">
            <div class="msg msg-warn">Abra esta página a partir do <strong>painel do cartão</strong> (módulo Bíblia), ou indique o item na URL: <code style="color:#FFC700">bible.html?itemId=</code> com o número do seu módulo.</div>
            <a class="btn btn-secondary" href="/dashboard.html"><i class="fas fa-th-large"></i> Ir ao painel</a>
            <a class="btn btn-secondary" href="/login.html"><i class="fas fa-sign-in-alt"></i> Entrar</a>
        </div>
        <div id="state-auth" class="hidden">
            <div class="msg msg-info">Precisa de sessão iniciada para ver a sua configuração e o progresso de leitura.</div>
            <a class="btn btn-primary" href="/login.html"><i class="fas fa-sign-in-alt"></i> Entrar</a>
            <a class="btn btn-secondary" href="/dashboard.html"><i class="fas fa-th-large"></i> Painel</a>
        </div>
        <div id="state-main" class="hidden">
            <div id="banner-progress-error" class="msg msg-error hidden"></div>
            <div class="top-actions">
                <a id="link-public-bible" class="btn btn-primary" href="#"><i class="fas fa-globe"></i> Abrir Bíblia pública</a>
                <a class="btn btn-secondary" href="/dashboard.html"><i class="fas fa-arrow-left"></i> Voltar ao painel</a>
            </div>
            <div class="card" id="card-progress">
                <h2><i class="fas fa-chart-line"></i> Progresso de leitura</h2>
                <div class="progress-stats" id="progress-stats"></div>
                <div class="progress-bar" title="Capítulos lidos"><span id="progress-chapters-pct" style="width:0%"></span></div>
            </div>
            <div class="card" id="card-verse">
                <h2><i class="fas fa-sun"></i> Versículo do dia</h2>
                <div class="ref" id="vod-ref"></div>
                <div class="verse-text" id="vod-text"></div>
                <div class="reflexao" id="vod-reflexao"></div>
                <button type="button" class="btn btn-secondary" id="btn-mark-vod"><i class="far fa-check-circle"></i> Marcar versículo do dia como lido</button>
                <span id="vod-mark-msg" style="display:block;margin-top:10px;font-size:0.85rem;color:#888;"></span>
            </div>
        </div>
    </div>
    
</body>
</html>

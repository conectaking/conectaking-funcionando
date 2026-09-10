<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>King Forms - Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="stylesheet" href="/vendor/fontawesome/css/all.min.css">
    <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/js/pages/kingForms.js'])
    <style>
        /* dashboard.css (se existir) trava body no painel; King Forms precisa scroll + clique no mobile */
        html, body {
            position: static !important;
            overflow: auto !important;
            height: auto !important;
            max-height: none !important;
            width: 100% !important;
            touch-action: manipulation;
        }
        body { background: var(--bg-primary, #0D0D0F); color: var(--text-primary, #ECECEC); font-family: 'Inter', sans-serif; margin: 0; padding: 20px; min-height: 100vh; }
        .kf-btn, .kf-card-actions a, .kf-card-actions button {
            position: relative;
            z-index: 2;
            pointer-events: auto;
            min-height: 44px;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
        }
        .kf-container { max-width: 900px; margin: 0 auto; }
        .kf-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 28px; }
        .kf-header h1 { margin: 0; font-size: 1.75rem; display: flex; align-items: center; gap: 12px; color: var(--text-primary, #ECECEC); }
        .kf-header h1 i { color: var(--dourado-principal, #FFC700); }
        .kf-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 0.95rem; cursor: pointer; border: none; text-decoration: none; transition: transform 0.15s, box-shadow 0.15s; }
        .kf-btn-primary { background: linear-gradient(135deg, #FFC700, #eab308); color: #000; }
        .kf-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(255,199,0,0.35); }
        .kf-btn-secondary { background: rgba(255,255,255,0.08); color: var(--text-primary, #ECECEC); border: 1px solid rgba(255,255,255,0.15); }
        .kf-btn-secondary:hover { background: rgba(255,255,255,0.12); }
        .kf-btn-danger { background: rgba(220, 53, 69, 0.2); color: #dc3545; border: 1px solid rgba(220, 53, 69, 0.5); }
        .kf-btn-danger:hover { background: rgba(220, 53, 69, 0.35); color: #ff6b7a; }
        .kf-list { display: flex; flex-direction: column; gap: 12px; }
        .kf-card { background: var(--card-background-color, #1C1C21); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .kf-card-title { font-weight: 600; font-size: 1.05rem; display: flex; align-items: center; gap: 10px; }
        .kf-card-title i { color: var(--dourado-principal, #FFC700); opacity: 0.9; }
        .kf-card-actions { display: flex; align-items: center; gap: 10px; }
        .kf-empty { text-align: center; padding: 48px 24px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1); color: var(--text-secondary, #888); }
        .kf-empty p { margin: 0 0 20px; font-size: 1rem; }
        .kf-back { display: inline-flex; align-items: center; gap: 8px; color: var(--text-secondary, #888); text-decoration: none; font-size: 0.9rem; margin-bottom: 20px; }
        .kf-back:hover { color: var(--dourado-principal, #FFC700); }
        #kf-editor-view { display: none; flex-direction: column; height: calc(100vh - 24px); margin: -20px; padding: 20px; }
        #kf-editor-view.kf-active { display: flex; }
        #kf-list-view.kf-hidden { display: none !important; }
        #kf-list-view { padding-top: 24px; }
        .kf-header-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        #kf-editor-frame { flex: 1; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; background: var(--bg-primary, #0D0D0F); min-height: 400px; }
    </style>
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

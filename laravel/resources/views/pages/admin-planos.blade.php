<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Planos (ADM) - Conecta King</title>
  <link rel="stylesheet" href="/assets/css/ui.css"/>
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet"/>
  <style>
    .ap-wrap { max-width: 720px; margin: 0 auto; padding: 24px; }
    .ap-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
    .ap-title { font-size: 1.25rem; font-weight: 600; color: var(--text); }
    .ap-denied { padding: 48px 24px; text-align: center; color: var(--muted); }
    .ap-denied .material-icons-round { font-size: 48px; margin-bottom: 16px; opacity: 0.6; }
    .ap-table { width: 100%; border-collapse: collapse; background: var(--panel-2); border-radius: 12px; overflow: hidden; border: 1px solid var(--stroke); }
    .ap-table th, .ap-table td { padding: 14px 16px; text-align: left; border-bottom: 1px solid var(--stroke); }
    .ap-table th { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); background: var(--panel); }
    .ap-table tr:last-child td { border-bottom: none; }
    .ap-table input[type=number] { width: 100px; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--stroke); background: var(--bg); color: var(--text); font-size: 0.95rem; }
    .ap-table input::placeholder { color: var(--muted); }
    .ap-save { margin-top: 16px; }
    .ap-message { margin-top: 16px; padding: 12px; border-radius: 8px; font-size: 0.9rem; }
    .ap-message.success { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
    .ap-message.error { background: rgba(227, 93, 106, 0.15); color: var(--danger); }
    .ap-hint { font-size: 0.8rem; color: var(--muted); margin-top: 4px; }
  </style>
</head>
<body class="kb-body">
  <header class="kb-header">
    <div class="kb-header-left">
      <a href="/dashboard" class="kb-logo" aria-label="Voltar">K</a>
      <div>
        <div class="kb-workspace-title">Planos (ADM)</div>
        <div class="kb-workspace-subtitle">Limites KingBrief por plano — só administrador</div>
      </div>
    </div>
    <div class="kb-header-right">
      <a href="/dashboard" class="kb-btn kb-btn-icon" title="Voltar ao painel"><span class="material-icons-round">arrow_back</span></a>
    </div>
  </header>

  <main class="kb-main">
    <div class="ap-wrap">
      <div id="ap-denied" class="ap-denied" style="display: none;">
        <span class="material-icons-round">lock</span>
        <p>Acesso negado. Esta página  apenas para administradores.</p>
        <a href="/dashboard" class="kb-btn kb-btn-gold" style="margin-top: 16px;">Ir para o painel</a>
      </div>
      <div id="ap-content" style="display: none;">
        <div class="ap-header">
          <h1 class="ap-title">Limite de minutos KingBrief por plano</h1>
        </div>
        <p class="ap-hint">Defina quantos minutos de udio (por m) cada plano pode usar no KingBrief. Deixe em branco para ilimitado.</p>
        <table class="ap-table" id="ap-table">
          <thead>
            <tr>
              <th>Plano</th>
              <th>Código</th>
              <th>Minutos KingBrief / m</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="ap-tbody"></tbody>
        </table>
        <div class="ap-save">
          <button type="button" class="kb-btn kb-btn-gold" id="ap-save-all">Guardar alterações</button>
        </div>
        <div id="ap-message" class="ap-message" style="display: none;" role="alert"></div>
      </div>
      <div id="ap-loading" style="padding: 48px; text-align: center; color: var(--muted);">A verificar permisses...</div>
    </div>
  </main>

  <script src="/config.js?v=2026-09-09-vite1"></script>
  @vite(['resources/js/pages/admin-planos.js'])
</body>
</html>

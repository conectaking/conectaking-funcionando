<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <title>King Selection — Painel ADM Master</title>
  <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  
  <style>
    :root {
      --ks-gold: #f59e0b;
      --ks-gold-hover: #d97706;
      --ks-gold-glow: rgba(245, 158, 11, 0.25);
      --ks-bg-deep: #08090d;
      --ks-bg-card: #0f1118;
      --ks-bg-elevated: #161923;
      --ks-border: rgba(255, 255, 255, 0.08);
      --ks-border-gold: rgba(245, 158, 11, 0.35);
      --ks-text: #f8fafc;
      --ks-text-muted: #94a3b8;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--ks-bg-deep);
      color: var(--ks-text);
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Topbar */
    .admin-topbar {
      background: linear-gradient(135deg, #050608 0%, #0e1017 60%, #15130d 100%);
      border-bottom: 1px solid var(--ks-border-gold);
      padding: 14px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 50;
      box-shadow: 0 4px 25px rgba(0, 0, 0, 0.85);
    }

    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-crown {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.05));
      border: 1px solid var(--ks-border-gold);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px var(--ks-gold-glow);
    }

    .brand-crown i {
      color: var(--ks-gold);
      font-size: 22px;
    }

    .brand-text h1 {
      font-size: 19px;
      font-weight: 900;
      letter-spacing: -0.02em;
      background: linear-gradient(90deg, #ffffff 0%, #fed7aa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-text .badge-adm {
      font-size: 11px;
      font-weight: 800;
      color: var(--ks-gold);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn-top {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 800;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .btn-studio {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #000;
      border: 1px solid rgba(251, 191, 36, 0.6);
      box-shadow: 0 0 18px var(--ks-gold-glow);
    }
    .btn-studio:hover {
      filter: brightness(1.12);
      transform: translateY(-1px);
    }

    .btn-generic {
      background: rgba(255, 255, 255, 0.05);
      color: #cbd5e1;
      border: 1px solid var(--ks-border);
    }
    .btn-generic:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .btn-logout {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .btn-logout:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    /* Layout principal */
    .admin-container {
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
      padding: 24px 20px 40px;
      flex: 1;
    }

    /* Menu de Navegação em Abas */
    .admin-nav {
      display: flex;
      gap: 10px;
      border-bottom: 1px solid var(--ks-border);
      padding-bottom: 14px;
      margin-bottom: 24px;
      overflow-x: auto;
      scrollbar-width: thin;
    }

    .admin-tab {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 12px 20px;
      border-radius: 14px;
      background: var(--ks-bg-card);
      color: var(--ks-text-muted);
      border: 1px solid var(--ks-border);
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .admin-tab:hover {
      color: #fff;
      border-color: rgba(245, 158, 11, 0.3);
      background: var(--ks-bg-elevated);
    }

    .admin-tab.active {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%);
      color: var(--ks-gold);
      border-color: var(--ks-border-gold);
      box-shadow: 0 0 16px rgba(245, 158, 11, 0.15);
    }

    .admin-tab i {
      font-size: 15px;
    }

    /* Panes de Conteúdo */
    .tab-pane {
      display: none;
    }
    .tab-pane.active {
      display: block;
      animation: fadeIn 0.25s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Cards e Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: var(--ks-bg-card);
      border: 1px solid var(--ks-border);
      border-radius: 18px;
      padding: 20px;
      position: relative;
      overflow: hidden;
      transition: all 0.2s;
    }

    .stat-card:hover {
      border-color: var(--ks-border-gold);
      transform: translateY(-2px);
    }

    .stat-card .label {
      font-size: 12px;
      font-weight: 700;
      color: var(--ks-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .stat-card .value {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -0.02em;
      color: #fff;
      margin-bottom: 4px;
    }

    .stat-card .sub {
      font-size: 12px;
      color: var(--ks-text-muted);
    }

    /* Tabelas */
    .section-card {
      background: var(--ks-bg-card);
      border: 1px solid var(--ks-border);
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .section-title {
      font-size: 17px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #fff;
    }

    .section-title i {
      color: var(--ks-gold);
    }

    .search-box {
      background: var(--ks-bg-elevated);
      border: 1px solid var(--ks-border);
      border-radius: 12px;
      padding: 8px 14px;
      color: #fff;
      font-size: 13px;
      width: 260px;
      outline: none;
      transition: border-color 0.2s;
    }
    .search-box:focus {
      border-color: var(--ks-gold);
    }

    .table-responsive {
      overflow-x: auto;
      border-radius: 14px;
      border: 1px solid var(--ks-border);
    }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }

    table.data-table th {
      background: var(--ks-bg-elevated);
      color: var(--ks-text-muted);
      font-weight: 700;
      padding: 12px 16px;
      border-bottom: 1px solid var(--ks-border);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    table.data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      vertical-align: middle;
    }

    table.data-table tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }

    .plan-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 800;
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .status-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    .status-toggle input {
      cursor: pointer;
      width: 16px;
      height: 16px;
      accent-color: var(--ks-gold);
    }

    /* Estúdio Pessoal do ADM */
    .self-studio-card {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(15, 17, 24, 0.95) 100%);
      border: 1px solid var(--ks-border-gold);
      border-radius: 20px;
      padding: 28px;
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .self-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .self-title h3 {
      font-size: 20px;
      font-weight: 900;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .self-title p {
      font-size: 13px;
      color: var(--ks-text-muted);
      margin-top: 4px;
    }

    .studio-launch-btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 14px 24px;
      border-radius: 14px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #000;
      font-weight: 900;
      font-size: 15px;
      text-decoration: none;
      box-shadow: 0 0 25px var(--ks-gold-glow);
      transition: all 0.2s;
    }
    .studio-launch-btn:hover {
      filter: brightness(1.15);
      transform: translateY(-2px);
    }

    .select-plan-wrap {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      background: var(--ks-bg-card);
      padding: 16px 20px;
      border-radius: 14px;
      border: 1px solid var(--ks-border);
    }

    .custom-select {
      background: var(--ks-bg-elevated);
      border: 1px solid var(--ks-border-gold);
      color: #fff;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      outline: none;
    }

    /* Links Externos */
    .links-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }

    .link-card {
      background: var(--ks-bg-card);
      border: 1px solid var(--ks-border);
      border-radius: 18px;
      padding: 22px;
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: all 0.2s;
    }

    .link-card:hover {
      border-color: var(--ks-gold);
      transform: translateY(-3px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    }

    .link-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .link-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(245, 158, 11, 0.15);
      color: var(--ks-gold);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .link-title {
      font-size: 16px;
      font-weight: 800;
      color: #fff;
    }

    .link-desc {
      font-size: 12.5px;
      color: var(--ks-text-muted);
      line-height: 1.5;
    }

    .link-arrow {
      align-self: flex-end;
      color: var(--ks-gold);
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  </style>
</head>
<body>

  <!-- Topbar -->
  <header class="admin-topbar">
    <div class="brand-wrap">
      <div class="brand-crown">
        <i class="fas fa-crown"></i>
      </div>
      <div class="brand-text">
        <h1>King Selection</h1>
        <span class="badge-adm"><i class="fas fa-shield-alt"></i> Painel Master do Administrador</span>
      </div>
    </div>

    <div class="topbar-actions">
      <a href="/kingSelection" class="btn-top btn-studio" title="Acessar meu estúdio para subir e gerenciar fotos">
        <i class="fas fa-camera"></i> <span>Meu Estúdio de Fotos</span>
      </a>
      <a href="https://www.conectaking.com.br/dashboard" class="btn-top btn-generic" title="Abrir painel geral do Conecta King (Cartão Virtual)">
        <i class="fas fa-arrow-up-right-from-square"></i> <span>Cartão Virtual Geral</span>
      </a>
      <button type="button" class="btn-top btn-logout" id="btn-logout" title="Sair da conta">
        <i class="fas fa-sign-out-alt"></i> <span>Sair</span>
      </button>
    </div>
  </header>

  <!-- Container Principal -->
  <main class="admin-container">
    
    <!-- Menu de Navegação em Abas -->
    <nav class="admin-nav">
      <button class="admin-tab active" data-target="tab-photographers">
        <i class="fas fa-users"></i> <span>Todas as Pessoas Cadastradas</span>
      </button>
      <button class="admin-tab" data-target="tab-storage">
        <i class="fas fa-database"></i> <span>Consumo de Giga & Fatura Cloudflare R2</span>
      </button>
      <button class="admin-tab" data-target="tab-self-studio">
        <i class="fas fa-camera-retro"></i> <span>Meu Estúdio Pessoal (Subir Fotos)</span>
      </button>
      <button class="admin-tab" data-target="tab-external-modules">
        <i class="fas fa-link"></i> <span>Cartão Virtual & Outros Módulos</span>
      </button>
    </nav>

    <!-- ABA 1: Todas as Pessoas Cadastradas (Fotógrafos) -->
    <section id="tab-photographers" class="tab-pane active">
      <div class="section-card">
        <div class="section-header">
          <div class="section-title">
            <i class="fas fa-users"></i> <span>Fotógrafos Cadastrados na Plataforma</span>
            <span class="plan-badge" id="badge-total-photogs">0 cadastrados</span>
          </div>
          <input type="text" id="search-photogs" class="search-box" placeholder="Buscar por nome ou e-mail...">
        </div>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fotógrafo / Usuário</th>
                <th>Plano Contratado</th>
                <th>Armazenamento Utilizado</th>
                <th>Faturamento R2 (Custo)</th>
                <th>Status do Acesso</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody id="tbody-photographers">
              <tr>
                <td colspan="6" style="text-align: center; padding: 30px; color: var(--ks-text-muted);">
                  <i class="fas fa-spinner fa-spin"></i> Carregando fotógrafos cadastrados...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ABA 2: Consumo de Giga & Fatura Cloudflare R2 -->
    <section id="tab-storage" class="tab-pane">
      
      <!-- Grid de Métricas R2 -->
      <div class="metrics-grid">
        <div class="stat-card">
          <div class="label">
            <span>Armazenamento Total</span>
            <i class="fas fa-hard-drive" style="color: #38bdf8;"></i>
          </div>
          <div class="value" style="color: #38bdf8;" id="stat-total-gb">0.00 GB</div>
          <div class="sub" id="stat-total-photos">0 fotos registradas no R2</div>
        </div>

        <div class="stat-card">
          <div class="label">
            <span>Excedente Faturável R2</span>
            <i class="fas fa-layer-group" style="color: var(--ks-gold);"></i>
          </div>
          <div class="value" style="color: var(--ks-gold);" id="stat-billable-gb">0.00 GB</div>
          <div class="sub" style="color: #10b981;"><i class="fas fa-check-circle"></i> Primeiros 10 GB grátis Cloudflare</div>
        </div>

        <div class="stat-card">
          <div class="label">
            <span>Fatura Prevista Cloudflare</span>
            <i class="fas fa-receipt" style="color: #ef4444;"></i>
          </div>
          <div class="value" style="color: #ef4444;" id="stat-cost-brl">R$ 0,00</div>
          <div class="sub" id="stat-cost-usd">US$ 0.00 / mês</div>
        </div>

        <div class="stat-card">
          <div class="label">
            <span>Total de Fotógrafos</span>
            <i class="fas fa-camera" style="color: #a855f7;"></i>
          </div>
          <div class="value" style="color: #a855f7;" id="stat-total-users">0</div>
          <div class="sub">Armazenando fotos no sistema</div>
        </div>
      </div>

      <!-- Configuração de Cotação e Detalhamento -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-title">
            <i class="fas fa-calculator"></i> <span>Auditoria da Fatura Cloudflare R2</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 12px; color: var(--ks-text-muted);">Cotação Dólar (R$):</span>
            <input type="number" id="input-usd-rate" value="5.70" step="0.05" style="width: 80px; padding: 6px 10px; border-radius: 8px; background: var(--ks-bg-elevated); border: 1px solid var(--ks-border-gold); color: #fff; font-weight: 700; text-align: center;">
            <button type="button" id="btn-recalc-r2" class="btn-top btn-generic" style="padding: 6px 12px; font-size: 12px;">Recalcular</button>
          </div>
        </div>

        <p style="font-size: 13px; color: var(--ks-text-muted); line-height: 1.6; margin-bottom: 20px;">
          A Cloudflare cobra US$ 0,015 por GB/mês além dos 10 GB concedidos gratuitamente. Abaixo está a discriminação exata de quanto cada cliente fotógrafo e a conta do administrador representam no seu custo final.
        </p>

        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fotógrafo</th>
                <th>Plano</th>
                <th>Fotos no R2</th>
                <th>Gigabytes Usados</th>
                <th>% do Armazenamento Total</th>
                <th>Custo R2 para Você</th>
              </tr>
            </thead>
            <tbody id="tbody-storage-breakdown">
              <tr>
                <td colspan="6" style="text-align: center; padding: 25px; color: var(--ks-text-muted);">Carregando detalhamento...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ABA 3: Meu Estúdio Pessoal (Subir Minhas Fotos) -->
    <section id="tab-self-studio" class="tab-pane">
      <div class="self-studio-card">
        <div class="self-header">
          <div class="self-title">
            <h3><i class="fas fa-camera-retro" style="color: var(--ks-gold);"></i> Minha Conta Pessoal de Fotógrafo (Administrador)</h3>
            <p>Você é o proprietário da plataforma e pode subir suas fotos normalmente com cortesia total de mensalidade (R$ 0,00).</p>
          </div>
          <a href="/kingSelection" class="studio-launch-btn">
            <i class="fas fa-folder-open"></i> <span>Abrir Meu Estúdio de Fotos</span>
          </a>
        </div>

        <div class="metrics-grid" style="margin-bottom: 0;">
          <div class="stat-card" style="background: rgba(0, 0, 0, 0.4);">
            <div class="label"><span>Seu Armazenamento Usado</span><i class="fas fa-hard-drive"></i></div>
            <div class="value" style="color: #38bdf8;" id="self-gb-used">0.00 GB</div>
            <div class="sub" id="self-photos-count">0 fotos pessoais enviadas</div>
          </div>

          <div class="stat-card" style="background: rgba(0, 0, 0, 0.4);">
            <div class="label"><span>Seu Custo de R2 Estimado</span><i class="fas fa-cloud"></i></div>
            <div class="value" style="color: var(--ks-gold);" id="self-r2-cost">R$ 0,00</div>
            <div class="sub">Computado na fatura Cloudflare</div>
          </div>

          <div class="stat-card" style="background: rgba(0, 0, 0, 0.4);">
            <div class="label"><span>Valor da Assinatura</span><i class="fas fa-gift"></i></div>
            <div class="value" style="color: #10b981;">R$ 0,00</div>
            <div class="sub">Cortesia de Administrador</div>
          </div>
        </div>

        <!-- Seletor de Pacote Pessoal -->
        <div class="select-plan-wrap">
          <div>
            <div style="font-weight: 800; font-size: 14px; color: #fff;">Pacote do Meu Estúdio:</div>
            <div style="font-size: 12px; color: var(--ks-text-muted);">Defina a cota de GB do seu próprio estúdio para testar ou subir seus ensaios</div>
          </div>
          <select id="self-select-plan" class="custom-select">
            <option value="unlimited">Ilimitado (Cortesia ADM)</option>
            <option value="plan_20gb">Essencial 20 GB (Cortesia ADM)</option>
            <option value="plan_30gb">Pro 30 GB (Cortesia ADM)</option>
            <option value="plan_60gb">Studio King 60 GB (Cortesia ADM)</option>
            <option value="plan_100gb">King Master 100 GB (Cortesia ADM)</option>
          </select>
          <button type="button" id="btn-save-self-plan" class="btn-top btn-studio">
            <i class="fas fa-check"></i> <span>Salvar Pacote no Meu Estúdio</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ABA 4: Cartão Virtual & Outros Módulos -->
    <section id="tab-external-modules" class="tab-pane">
      <div class="section-card">
        <div class="section-header">
          <div class="section-title">
            <i class="fas fa-cubes"></i> <span>Outros Módulos da Plataforma Conecta King</span>
          </div>
        </div>
        <p style="font-size: 13.5px; color: var(--ks-text-muted); margin-bottom: 24px;">
          Como o King Selection é um sistema focado exclusivamente em fotografia, os outros módulos da plataforma ficam disponíveis nos links abaixo para sua conveniência:
        </p>

        <div class="links-grid">
          <a href="https://www.conectaking.com.br/dashboard" target="_blank" class="link-card">
            <div class="link-card-header">
              <div class="link-icon"><i class="fas fa-id-card"></i></div>
              <div class="link-title">Cartão Virtual & Tags NFC</div>
            </div>
            <div class="link-desc">Gerenciamento de cartões de visita digitais, tags de aproximação NFC e links bio.</div>
            <div class="link-arrow">Acessar Painel <i class="fas fa-arrow-right"></i></div>
          </a>

          <a href="https://www.conectaking.com.br/admin" target="_blank" class="link-card">
            <div class="link-card-header">
              <div class="link-icon"><i class="fas fa-user-shield"></i></div>
              <div class="link-title">Admin Geral Conecta King</div>
            </div>
            <div class="link-desc">Gerenciar códigos de ativação, usuários gerais da plataforma e faturamento de cartões.</div>
            <div class="link-arrow">Acessar Painel <i class="fas fa-arrow-right"></i></div>
          </a>

          <a href="https://www.conectaking.com.br/admin-devocionais-365" target="_blank" class="link-card">
            <div class="link-card-header">
              <div class="link-icon"><i class="fas fa-book-bible"></i></div>
              <div class="link-title">Bíblia & Devocionais 365</div>
            </div>
            <div class="link-desc">Gestão de leituras bíblicas, versículos diários e módulo de prosperidade.</div>
            <div class="link-arrow">Acessar Módulo <i class="fas fa-arrow-right"></i></div>
          </a>
        </div>
      </div>
    </section>

  </main>

  <script src="/config.js?v=2026-09-09-vite1"></script>
  <script>
    document.addEventListener('DOMContentLoaded', async () => {
      const token = localStorage.getItem('conectaKingToken') || localStorage.getItem('token') || '';
      const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const API_BASE = window.location.origin;

      // Abas de navegação
      const tabs = document.querySelectorAll('.admin-tab');
      const panes = document.querySelectorAll('.tab-pane');

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          panes.forEach(p => p.classList.remove('active'));
          tab.classList.add('active');
          const target = document.getElementById(tab.dataset.target);
          if (target) target.classList.add('active');
        });
      });

      // Logout
      document.getElementById('btn-logout').addEventListener('click', () => {
        if (confirm('Deseja realmente sair?')) {
          localStorage.removeItem('conectaKingToken');
          localStorage.removeItem('token');
          localStorage.removeItem('conectaKingUser');
          window.location.href = '/login';
        }
      });

      let masterData = null;

      // Carregar dados mestre da API
      async function loadMasterData() {
        const usdRate = parseFloat(document.getElementById('input-usd-rate')?.value || '5.70');
        try {
          const res = await fetch(`${API_BASE}/api/admin/king-selection/overview?usd_rate=${usdRate}`, { credentials: 'include', headers });
          if (!res.ok) throw new Error('Não foi possível carregar os dados master.');
          const json = await res.json();
          masterData = json.data || {};
          renderAll();
        } catch (e) {
          console.error(e);
          document.getElementById('tbody-photographers').innerHTML = `<tr><td colspan="6" style="text-align: center; color: #ef4444; padding: 25px;">Erro ao carregar dados: ${e.message}</td></tr>`;
        }
      }

      function renderAll() {
        if (!masterData) return;
        const stats = masterData.stats || {};
        const r2 = masterData.cloudflare_r2 || {};
        const photogs = masterData.photographers || [];
        const adminStats = masterData.admin_stats || {};

        // Top metrics
        document.getElementById('stat-total-gb').textContent = `${stats.total_storage_gb || 0} GB`;
        document.getElementById('stat-total-photos').textContent = `${stats.total_photos || 0} fotos registradas no R2`;
        document.getElementById('stat-billable-gb').textContent = `${r2.billable_gb || 0} GB`;
        document.getElementById('stat-cost-brl').textContent = `R$ ${Number(r2.cost_brl || 0).toFixed(2).replace('.', ',')}`;
        document.getElementById('stat-cost-usd').textContent = `US$ ${Number(r2.cost_usd || 0).toFixed(2)} / mês`;
        document.getElementById('stat-total-users').textContent = stats.total_photographers || photogs.length;
        document.getElementById('badge-total-photogs').textContent = `${photogs.length} cadastrados`;

        // Self studio stats
        document.getElementById('self-gb-used').textContent = `${adminStats.storage_used_gb || 0} GB`;
        document.getElementById('self-photos-count').textContent = `${adminStats.total_photos || 0} fotos pessoais enviadas`;
        document.getElementById('self-r2-cost').textContent = `R$ ${Number(adminStats.r2_cost_brl || 0).toFixed(2).replace('.', ',')} / mês`;
        if (adminStats.plan) {
          const selfPlanSelect = document.getElementById('self-select-plan');
          if (selfPlanSelect) selfPlanSelect.value = adminStats.plan;
        }

        renderPhotographersTable(photogs);
        renderBreakdownTable(photogs, stats.total_storage_gb || 1);
      }

      function renderPhotographersTable(photogs) {
        const tbody = document.getElementById('tbody-photographers');
        if (!photogs.length) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px; color: var(--ks-text-muted);">Nenhum fotógrafo cadastrado.</td></tr>';
          return;
        }

        tbody.innerHTML = photogs.map(p => `
          <tr>
            <td>
              <div style="font-weight: 800; color: #fff;">${p.name || 'Fotógrafo'}</div>
              <div style="font-size: 11px; color: var(--ks-text-muted);">${p.email}</div>
            </td>
            <td>
              <select class="custom-select sel-change-plan" data-uid="${p.id}" style="padding: 6px 10px; font-size: 12px;">
                <option value="plan_20gb" ${p.plan === 'plan_20gb' ? 'selected' : ''}>Essencial 20 GB (R$ 39,90)</option>
                <option value="plan_30gb" ${p.plan === 'plan_30gb' ? 'selected' : ''}>Pro 30 GB (R$ 59,90)</option>
                <option value="plan_60gb" ${p.plan === 'plan_60gb' ? 'selected' : ''}>Studio King 60 GB (R$ 99,90)</option>
                <option value="plan_100gb" ${p.plan === 'plan_100gb' ? 'selected' : ''}>King Master 100 GB (R$ 149,90)</option>
                <option value="unlimited" ${p.plan === 'unlimited' ? 'selected' : ''}>Ilimitado</option>
              </select>
            </td>
            <td>
              <div style="font-weight: 800; color: #38bdf8;">${p.storage_used_gb} GB / ${p.storage_limit_gb} GB</div>
              <div style="font-size: 11px; color: var(--ks-text-muted);">${p.storage_used_pct}% consumido (${p.total_photos} fotos)</div>
            </td>
            <td style="color: var(--ks-gold); font-weight: 800;">
              R$ ${Number(p.r2_cost_brl || 0).toFixed(2).replace('.', ',')}
            </td>
            <td>
              <label class="status-toggle">
                <input type="checkbox" class="chk-toggle-access" data-uid="${p.id}" ${p.enabled ? 'checked' : ''}>
                <span style="font-weight: 800; font-size: 12px; color: ${p.enabled ? '#10b981' : '#ef4444'};">${p.enabled ? 'Ativo' : 'Bloqueado'}</span>
              </label>
            </td>
            <td>
              <a href="/kingSelection?photographer_id=${p.id}" style="color: #38bdf8; text-decoration: none; font-size: 12px; font-weight: 700;">
                <i class="fas fa-eye"></i> Ver Galerias
              </a>
            </td>
          </tr>
        `).join('');

        // Listeners para trocar plano
        tbody.querySelectorAll('.sel-change-plan').forEach(sel => {
          sel.addEventListener('change', async () => {
            const uid = sel.dataset.uid;
            const plan = sel.value;
            try {
              const r = await fetch(`${API_BASE}/api/admin/king-selection/users/${uid}/plan`, {
                method: 'PUT',
                credentials: 'include',
                headers,
                body: JSON.stringify({ plan })
              });
              if (!r.ok) throw new Error();
              alert('Plano atualizado com sucesso!');
              loadMasterData();
            } catch (_) {
              alert('Erro ao atualizar plano');
            }
          });
        });

        // Listeners para bloquear/desbloquear
        tbody.querySelectorAll('.chk-toggle-access').forEach(chk => {
          chk.addEventListener('change', async () => {
            const uid = chk.dataset.uid;
            const enabled = chk.checked;
            try {
              const r = await fetch(`${API_BASE}/api/admin/king-selection/users/${uid}/toggle`, {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({ enabled })
              });
              if (!r.ok) throw new Error();
              loadMasterData();
            } catch (_) {
              alert('Erro ao alterar acesso');
            }
          });
        });
      }

      function renderBreakdownTable(photogs, totalGb) {
        const tbody = document.getElementById('tbody-storage-breakdown');
        if (!photogs.length) {
          tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 25px; color: var(--ks-text-muted);">Nenhum dado disponível.</td></tr>';
          return;
        }

        tbody.innerHTML = photogs.map(p => {
          const sharePct = totalGb > 0 ? ((p.storage_used_gb / totalGb) * 100).toFixed(1) : '0.0';
          return `
            <tr>
              <td><strong>${p.name || 'Fotógrafo'}</strong> (${p.email})</td>
              <td><span class="plan-badge">${p.plan_label}</span></td>
              <td>${p.total_photos} fotos</td>
              <td style="color: #38bdf8; font-weight: 800;">${p.storage_used_gb} GB</td>
              <td>${sharePct}% da cota geral</td>
              <td style="color: var(--ks-gold); font-weight: 800;">R$ ${Number(p.r2_cost_brl || 0).toFixed(2).replace('.', ',')}</td>
            </tr>
          `;
        }).join('');
      }

      // Salvar plano pessoal do ADM (R$ 0,00)
      document.getElementById('btn-save-self-plan').addEventListener('click', async () => {
        const plan = document.getElementById('self-select-plan').value;
        const btn = document.getElementById('btn-save-self-plan');
        btn.disabled = true;
        try {
          const res = await fetch(`${API_BASE}/api/admin/king-selection/self-plan`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({ plan })
          });
          const json = await res.json();
          if (!res.ok || !json.success) throw new Error(json.message);
          alert('Pacote do seu estúdio configurado com sucesso (Cortesia R$ 0,00)!');
          loadMasterData();
        } catch (e) {
          alert(e.message || 'Erro ao salvar');
        } finally {
          btn.disabled = false;
        }
      });

      // Recalcular com nova cotação do dólar
      document.getElementById('btn-recalc-r2')?.addEventListener('click', loadMasterData);

      // Busca rápida
      document.getElementById('search-photogs')?.addEventListener('input', (e) => {
        const q = (e.target.value || '').toLowerCase().trim();
        const rows = document.querySelectorAll('#tbody-photographers tr');
        rows.forEach(tr => {
          const txt = tr.innerText.toLowerCase();
          tr.style.display = txt.includes(q) ? '' : 'none';
        });
      });

      // Carga inicial
      loadMasterData();
    });
  </script>
</body>
</html>

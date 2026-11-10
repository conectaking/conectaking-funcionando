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
      --ks-gold-dark: #d97706;
      --ks-gold-hover: #d97706;
      --ks-gold-glow: rgba(245, 158, 11, 0.25);
      --ks-bg: #f1f5f9;
      --ks-card: #ffffff;
      --ks-card-subtle: #f8fafc;
      --ks-border: #e2e8f0;
      --ks-border-gold: rgba(245, 158, 11, 0.35);
      --ks-text: #0f172a;
      --ks-text-muted: #64748b;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--ks-bg);
      color: var(--ks-text);
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Topbar de Luxo Conecta King (Preto Ônix com Dourado, idêntico ao Estúdio) */
    .admin-topbar {
      background: linear-gradient(135deg, #060709 0%, #0e0f14 50%, #15120c 100%);
      border-bottom: 1px solid rgba(245, 158, 11, 0.28);
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.85), 0 1px 0 0 rgba(245, 158, 11, 0.18);
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
    }

    .brand-logo-container {
      width: 38px;
      height: 38px;
      border-radius: 11px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.30);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      box-shadow: 0 0 14px rgba(245, 158, 11, 0.2);
    }

    .brand-logo-container img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .brand-text h1 {
      font-size: 19px;
      font-weight: 900;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #fef08a 0%, #f59e0b 50%, #d97706 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.15;
    }

    .brand-text .badge-adm {
      font-size: 10px;
      font-weight: 800;
      color: rgba(245, 158, 11, 0.9);
      text-transform: uppercase;
      letter-spacing: 0.15em;
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 1px;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 10px;
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
      font-weight: 900;
      border: 1px solid rgba(251, 191, 36, 0.8);
      box-shadow: 0 0 16px rgba(245, 158, 11, 0.3);
    }
    .btn-studio:hover {
      filter: brightness(1.12);
      transform: translateY(-1px);
    }

    .btn-generic {
      background: rgba(0, 0, 0, 0.6);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.35);
    }
    .btn-generic:hover {
      background: rgba(245, 158, 11, 0.15);
      color: #fef08a;
    }

    .btn-logout {
      background: rgba(239, 68, 68, 0.12);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .btn-logout:hover {
      background: rgba(239, 68, 68, 0.22);
    }

    /* Layout principal */
    .admin-container {
      max-width: 1440px;
      width: 100%;
      margin: 0 auto;
      padding: 24px 20px 48px;
      flex: 1;
    }

    /* Menu de Navegação em Abas (Estilo Clean Branco com Destaque Dourado) */
    .admin-nav {
      display: flex;
      gap: 8px;
      background: #ffffff;
      border: 1px solid var(--ks-border);
      border-radius: 16px;
      padding: 6px;
      margin-bottom: 24px;
      overflow-x: auto;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
      scrollbar-width: thin;
    }

    .admin-tab {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 11px 18px;
      border-radius: 12px;
      background: transparent;
      color: var(--ks-text-muted);
      border: 1px solid transparent;
      font-size: 13.5px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
      text-decoration: none;
    }

    .admin-tab:hover {
      background: var(--ks-card-subtle);
      color: var(--ks-text);
      border-color: var(--ks-border);
    }

    .admin-tab.active {
      background: #fffbeb;
      color: #b45309;
      border-color: #fde68a;
      font-weight: 800;
      box-shadow: 0 1px 2px rgba(245, 158, 11, 0.08);
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
      background: var(--ks-card);
      border: 1px solid var(--ks-border);
      border-radius: 16px;
      padding: 20px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition: all 0.2s;
    }

    .stat-card:hover {
      border-color: var(--ks-border-gold);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.08);
    }

    .stat-card .label {
      font-size: 11.5px;
      font-weight: 800;
      color: var(--ks-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .stat-card .value {
      font-size: 27px;
      font-weight: 900;
      letter-spacing: -0.02em;
      color: var(--ks-text);
      margin-bottom: 4px;
    }

    .stat-card .sub {
      font-size: 12px;
      color: var(--ks-text-muted);
    }

    /* Tabelas e Cards de Conteúdo */
    .section-card {
      background: var(--ks-card);
      border: 1px solid var(--ks-border);
      border-radius: 18px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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
      font-weight: 900;
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--ks-text);
    }

    .section-title i {
      color: var(--ks-gold-dark);
    }

    .search-box {
      background: #ffffff;
      border: 1px solid var(--ks-border);
      border-radius: 12px;
      padding: 9px 14px;
      color: var(--ks-text);
      font-size: 13px;
      width: 280px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .search-box:focus {
      border-color: var(--ks-gold);
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
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
      background: var(--ks-card-subtle);
      color: var(--ks-text-muted);
      font-weight: 800;
      padding: 13px 16px;
      border-bottom: 1px solid var(--ks-border);
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    table.data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      color: var(--ks-text);
    }

    table.data-table tr:hover td {
      background: #f8fafc;
    }

    .plan-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 11.5px;
      font-weight: 800;
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
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
      accent-color: var(--ks-gold-dark);
    }

    /* Estúdio Pessoal do ADM */
    .self-studio-card {
      background: #ffffff;
      border: 1px solid var(--ks-border);
      border-radius: 18px;
      padding: 28px;
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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
      color: var(--ks-text);
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
      padding: 13px 22px;
      border-radius: 13px;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #000;
      font-weight: 900;
      font-size: 14.5px;
      text-decoration: none;
      box-shadow: 0 0 20px var(--ks-gold-glow);
      transition: all 0.2s;
    }
    .studio-launch-btn:hover {
      filter: brightness(1.12);
      transform: translateY(-2px);
    }

    .select-plan-wrap {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      background: var(--ks-card-subtle);
      padding: 16px 20px;
      border-radius: 14px;
      border: 1px solid var(--ks-border);
    }

    .custom-select {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: var(--ks-text);
      padding: 9px 13px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      outline: none;
      transition: border-color 0.2s;
    }
    .custom-select:focus {
      border-color: var(--ks-gold);
    }

    /* Links Externos */
    .links-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }

    .link-card {
      background: #ffffff;
      border: 1px solid var(--ks-border);
      border-radius: 16px;
      padding: 22px;
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition: all 0.2s ease;
    }

    .link-card:hover {
      border-color: var(--ks-gold);
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(245, 158, 11, 0.12);
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
      color: var(--ks-gold-dark);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .link-title {
      font-size: 16px;
      font-weight: 800;
      color: var(--ks-text);
    }

    .link-desc {
      font-size: 12.5px;
      color: var(--ks-text-muted);
      line-height: 1.5;
    }

    .link-arrow {
      align-self: flex-end;
      color: var(--ks-gold-dark);
      font-size: 13px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  </style>
</head>
<body>

  <!-- Topbar com Logomarca Conecta King e Visual de Luxo -->
  <header class="admin-topbar">
    <a href="/admin" class="brand-wrap">
      <div class="brand-logo-container">
        <img src="https://i.ibb.co/60sW9k75/logo.png" alt="Conecta King" />
      </div>
      <div class="brand-text">
        <h1>KingSelection</h1>
        <span class="badge-adm"><i class="fas fa-crown"></i> Painel Master do Administrador</span>
      </div>
    </a>

    <div class="topbar-actions">
      <a href="/kingSelection?studio=1" class="btn-top btn-studio" title="Acessar meu estúdio para subir e gerenciar fotos">
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
    
    <!-- Menu de Navegação em Abas (Idêntico ao Estúdio King Selection) -->
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
            <i class="fas fa-hdd" style="color: var(--ks-gold-dark);"></i>
          </div>
          <div class="value" id="stat-total-gb">0 GB</div>
          <div class="sub" id="stat-total-photos">0 fotos registradas no R2</div>
        </div>

        <div class="stat-card">
          <div class="label">
            <span>Armazenamento Faturável (>10GB)</span>
            <i class="fas fa-calculator" style="color: #38bdf8;"></i>
          </div>
          <div class="value" id="stat-billable-gb" style="color: #0284c7;">0 GB</div>
          <div class="sub">10 GB gratuitos descontados</div>
        </div>

        <div class="stat-card">
          <div class="label">
            <span>Fatura Estimada R2 (BRL)</span>
            <i class="fas fa-coins" style="color: #16a34a;"></i>
          </div>
          <div class="value" id="stat-cost-brl" style="color: #16a34a;">R$ 0,00</div>
          <div class="sub" id="stat-cost-usd">US$ 0,00 / mês</div>
        </div>

        <div class="stat-card">
          <div class="label">
            <span>Fotógrafos na Nuvem</span>
            <i class="fas fa-user-tag" style="color: var(--ks-gold-dark);"></i>
          </div>
          <div class="value" id="stat-total-users">0</div>
          <div class="sub">Contas com King Selection</div>
        </div>
      </div>

      <!-- Configuração de Câmbio e Cálculo -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-title">
            <i class="fas fa-calculator"></i> <span>Calculadora e Parâmetros Cloudflare R2</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <label style="font-size: 13px; font-weight: 700; color: var(--ks-text-muted);">Cotação USD/BRL:</label>
            <input type="number" id="input-usd-rate" value="5.70" step="0.05" class="search-box" style="width: 90px; padding: 6px 10px;">
            <button type="button" id="btn-recalc-r2" class="btn-top btn-studio" style="padding: 7px 14px; font-size: 12px;">
              <i class="fas fa-sync-alt"></i> Recalcular Fatura
            </button>
          </div>
        </div>
        <div style="font-size: 12.5px; color: var(--ks-text-muted); line-height: 1.6; background: var(--ks-card-subtle); padding: 14px 18px; border-radius: 12px; border: 1px solid var(--ks-border);">
          <strong>Como a Cloudflare R2 fatura seu armazenamento:</strong><br>
          • <strong>0 a 10 GB:</strong> Totalmente Gratuito (Tier Free mensal permanente).<br>
          • <strong>Acima de 10 GB:</strong> US$ 0,015 por GB/mês (sem custo de download/tráfego egresso).<br>
          • A margem de lucro de cada fotógrafo considera o valor que ele paga no plano menos o custo real do espaço que ele utiliza.
        </div>
      </div>

      <!-- Tabela de Consumo Individual por Fotógrafo -->
      <div class="section-card">
        <div class="section-header">
          <div class="section-title">
            <i class="fas fa-chart-pie"></i> <span>Detalhamento de Consumo de Fotos por Fotógrafo</span>
          </div>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fotógrafo</th>
                <th>Plano</th>
                <th>Fotos Enviadas</th>
                <th>GB Utilizados</th>
                <th>% do Armazenamento Total</th>
                <th>Custo R2 Gerado</th>
              </tr>
            </thead>
            <tbody id="tbody-storage-breakdown">
              <tr>
                <td colspan="6" style="text-align:center; padding: 25px; color: var(--ks-text-muted);">Carregando detalhamento...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </section>

    <!-- ABA 3: Meu Estúdio Pessoal (Subir Fotos) -->
    <section id="tab-self-studio" class="tab-pane">
      <div class="self-studio-card">
        <div class="self-header">
          <div class="self-title">
            <h3><i class="fas fa-crown" style="color: var(--ks-gold-dark);"></i> Meu Estúdio Pessoal de Fotos</h3>
            <p>Você é o proprietário da plataforma e pode subir suas fotos normalmente com cortesia total de mensalidade (R$ 0,00).</p>
          </div>
          <a href="/kingSelection?studio=1" class="studio-launch-btn">
            <i class="fas fa-folder-open"></i> <span>Abrir Meu Estúdio de Fotos</span>
          </a>
        </div>

        <div class="select-plan-wrap">
          <div>
            <div style="font-weight: 800; font-size: 14px; margin-bottom: 4px; color: var(--ks-text);">Definir Meu Pacote Pessoal:</div>
            <div style="font-size: 12px; color: var(--ks-text-muted);">Escolha o limite para o seu perfil. Para você como ADM, a mensalidade é sempre R$ 0,00.</div>
          </div>
          <select id="self-select-plan" class="custom-select" style="min-width: 260px;">
            <option value="unlimited">Ilimitado Master (Cortesia ADM - R$ 0,00)</option>
            <option value="plan_20gb">Essencial 20 GB (Cortesia ADM - R$ 0,00)</option>
            <option value="plan_30gb">Pro 30 GB (Cortesia ADM - R$ 0,00)</option>
            <option value="plan_60gb">Studio King 60 GB (Cortesia ADM - R$ 0,00)</option>
            <option value="plan_100gb">King Master 100 GB (Cortesia ADM - R$ 0,00)</option>
          </select>
          <button type="button" id="btn-save-self-plan" class="btn-top btn-studio">
            <i class="fas fa-check"></i> Salvar no Meu Estúdio
          </button>
        </div>

        <div class="metrics-grid" style="margin-bottom: 0;">
          <div class="stat-card">
            <div class="label">Espaço Usado no Meu Estúdio</div>
            <div class="value" id="self-gb-used" style="color: var(--ks-gold-dark);">0.0 GB</div>
            <div class="sub" id="self-photos-count">0 fotos pessoais enviadas</div>
          </div>
          <div class="stat-card">
            <div class="label">Mensalidade Cobrada no Sistema</div>
            <div class="value" style="color: #16a34a;">R$ 0,00</div>
            <div class="sub">Isenção total para o Administrador</div>
          </div>
          <div class="stat-card">
            <div class="label">Custo Real R2 das Minhas Fotos</div>
            <div class="value" id="self-r2-cost" style="color: #0284c7;">R$ 0,00</div>
            <div class="sub">Consumo somado à fatura Cloudflare</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ABA 4: Cartão Virtual & Outros Módulos da Plataforma -->
    <section id="tab-external-modules" class="tab-pane">
      <div class="section-card">
        <div class="section-header">
          <div class="section-title">
            <i class="fas fa-th-large"></i> <span>Acessar Outros Módulos do Conecta King</span>
          </div>
        </div>
        
        <div class="links-grid">
          <a href="https://www.conectaking.com.br/dashboard" target="_blank" class="link-card">
            <div class="link-card-header">
              <div class="link-icon"><i class="fas fa-id-card"></i></div>
              <div class="link-title">Cartão Virtual & Tags NFC</div>
            </div>
            <div class="link-desc">Editar perfil do cartão virtual, links de redes sociais, PIX, contatos e tags por aproximação.</div>
            <div class="link-arrow">Acessar Cartão <i class="fas fa-arrow-right"></i></div>
          </a>

          <a href="https://www.conectaking.com.br/kingForms" target="_blank" class="link-card">
            <div class="link-card-header">
              <div class="link-icon"><i class="fas fa-file-signature"></i></div>
              <div class="link-title">King Forms</div>
            </div>
            <div class="link-desc">Crie formulários digitais interativos de cadastro, pedidos e pesquisas para clientes.</div>
            <div class="link-arrow">Acessar Forms <i class="fas fa-arrow-right"></i></div>
          </a>

          <a href="https://www.conectaking.com.br/kingCamera" target="_blank" class="link-card">
            <div class="link-card-header">
              <div class="link-icon"><i class="fas fa-video"></i></div>
              <div class="link-title">King Câmera (IA & PTZ)</div>
            </div>
            <div class="link-desc">Transmissão em tempo real, controle PTZ de câmeras e reconhecimento facial por IA.</div>
            <div class="link-arrow">Acessar Câmera <i class="fas fa-arrow-right"></i></div>
          </a>

          <a href="https://www.conectaking.com.br/kingDocs" target="_blank" class="link-card">
            <div class="link-card-header">
              <div class="link-icon"><i class="fas fa-file-shield"></i></div>
              <div class="link-title">King Docs</div>
            </div>
            <div class="link-desc">Assinatura digital de documentos e contratos com validade jurídica e armazenamento seguro.</div>
            <div class="link-arrow">Acessar Docs <i class="fas fa-arrow-right"></i></div>
          </a>

          <a href="https://www.conectaking.com.br/recibos-orcamentos" target="_blank" class="link-card">
            <div class="link-card-header">
              <div class="link-icon"><i class="fas fa-file-invoice-dollar"></i></div>
              <div class="link-title">Recibos e Orçamentos</div>
            </div>
            <div class="link-desc">Emissão rápida de propostas comerciais, orçamentos personalizados e recibos de pagamento.</div>
            <div class="link-arrow">Acessar Módulo <i class="fas fa-arrow-right"></i></div>
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

      // Logout seguro e completo
      document.getElementById('btn-logout').addEventListener('click', async () => {
        if (!confirm('Deseja realmente sair da sua conta?')) return;
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch (_) {}
        ['token', 'refresh_token', 'ck_csrf', 'conectaking-session', 'XSRF-TOKEN', 'laravel_session', 'ks_client_token'].forEach(c => {
          document.cookie = `${c}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.conectaking.com.br; secure; samesite=lax`;
          document.cookie = `${c}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=lax`;
          document.cookie = `${c}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
        window.location.href = '/logout';
      });

      let masterData = null;

      // Carregar dados mestre da API
      async function loadMasterData() {
        const usdRate = parseFloat(document.getElementById('input-usd-rate')?.value || '5.70');
        try {
          const res = await fetch(`${API_BASE}/api/admin/king-selection/overview?usd_rate=${usdRate}`, { credentials: 'include', headers });
          if (res.status === 401 || res.status === 403) {
            window.location.replace('/login?logout=1');
            return;
          }
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
        const selfUsedGb = adminStats.storage_used_gb !== undefined ? adminStats.storage_used_gb : (adminStats.used_gb || 0);
        document.getElementById('self-gb-used').textContent = `${selfUsedGb} GB`;
        document.getElementById('self-photos-count').textContent = `${adminStats.total_photos || 0} fotos pessoais enviadas`;
        const selfCostBrl = adminStats.r2_cost_brl !== undefined ? adminStats.r2_cost_brl : (adminStats.cost_brl || 0);
        document.getElementById('self-r2-cost').textContent = `R$ ${Number(selfCostBrl).toFixed(2).replace('.', ',')} / mês`;
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

        tbody.innerHTML = photogs.map(p => {
          const usedGb = p.storage_used_gb !== undefined ? p.storage_used_gb : (p.used_gb || 0);
          const limitGb = p.storage_limit_gb !== undefined ? p.storage_limit_gb : (p.limit_gb || (p.plan === 'unlimited' ? 'Ilimitado' : 60));
          const limitText = p.plan === 'unlimited' ? 'Ilimitado' : `${limitGb} GB`;
          const usedPct = p.storage_used_pct !== undefined ? p.storage_used_pct : (p.used_pct || 0);
          const costBrl = p.r2_cost_brl !== undefined ? p.r2_cost_brl : (p.cost_brl || 0);

          return `
            <tr>
              <td>
                <div style="font-weight: 800; color: var(--ks-text);">${p.name || 'Fotógrafo'}</div>
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
                <div style="font-weight: 800; color: #0284c7;">${usedGb} GB / ${limitText}</div>
                <div style="font-size: 11px; color: var(--ks-text-muted);">${usedPct}% consumido (${p.total_photos || 0} fotos)</div>
              </td>
              <td style="color: var(--ks-gold-dark); font-weight: 800;">
                R$ ${Number(costBrl).toFixed(2).replace('.', ',')}
              </td>
              <td>
                <label class="status-toggle">
                  <input type="checkbox" class="chk-toggle-access" data-uid="${p.id}" ${p.enabled ? 'checked' : ''}>
                  <span style="font-weight: 800; font-size: 12px; color: ${p.enabled ? '#16a34a' : '#ef4444'};">${p.enabled ? 'Ativo' : 'Bloqueado'}</span>
                </label>
              </td>
              <td>
                <a href="/kingSelection?studio=1&photographer_id=${p.id}" style="color: #0284c7; text-decoration: none; font-size: 12px; font-weight: 800; display: inline-flex; align-items: center; gap: 5px;">
                  <i class="fas fa-eye"></i> Ver Galerias
                </a>
              </td>
            </tr>
          `;
        }).join('');

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
          const usedGb = p.storage_used_gb !== undefined ? p.storage_used_gb : (p.used_gb || 0);
          const sharePct = totalGb > 0 ? ((usedGb / totalGb) * 100).toFixed(1) : '0.0';
          const costBrl = p.r2_cost_brl !== undefined ? p.r2_cost_brl : (p.cost_brl || 0);

          return `
            <tr>
              <td><strong>${p.name || 'Fotógrafo'}</strong> (${p.email})</td>
              <td><span class="plan-badge">${p.plan_label}</span></td>
              <td>${p.total_photos || 0} fotos</td>
              <td style="color: #0284c7; font-weight: 800;">${usedGb} GB</td>
              <td>${sharePct}% da cota geral</td>
              <td style="color: var(--ks-gold-dark); font-weight: 800;">R$ ${Number(costBrl).toFixed(2).replace('.', ',')}</td>
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

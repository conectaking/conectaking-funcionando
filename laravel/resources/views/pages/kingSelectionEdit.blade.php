<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
  <title>KingSelection - Painel</title>
  <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
  <style>
    :root {
      --ks-primary: #f59e0b;
      --ks-primary-dark: #d97706;
      --ks-accent: #f59e0b;
      --ks-bg: #f1f5f9;
      --ks-card: #ffffff;
      --ks-card-subtle: #f8fafc;
      --ks-line: #e2e8f0;
      --ks-line-subtle: #f1f5f9;
      --ks-muted: #64748b;
      --ks-text: #0f172a;
      --ks-text-muted: #64748b;
    }

    html, body {
      background-color: #f1f5f9 !important;
      background: #f1f5f9 !important;
      color: #0f172a !important;
      margin: 0;
      font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, sans-serif;
    }

    body:before, body:after {
      display: none !important;
    }

    /* Topbar de Luxo Conecta King (Preto Ônix com Dourado) */
    .ks-top {
      background: linear-gradient(135deg, #060709 0%, #0e0f14 50%, #15120c 100%) !important;
      border-bottom: 1px solid rgba(245, 158, 11, 0.28) !important;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.85), 0 1px 0 0 rgba(245, 158, 11, 0.18) !important;
    }

    .ks-wrap {
      max-width: min(1920px, 98vw);
      width: 100%;
      margin: 0 auto;
      padding: 18px 14px;
      position: relative;
    }

    /* Layout Flex com Sidebar Retrátil (Idêntico ao Eliseu) */
    #ks-main-container {
      display: flex;
      gap: 1.5rem;
      align-items: flex-start;
      transition: all 0.3s ease-in-out;
    }
    #ks-sidebar {
      width: 18rem;
      flex-shrink: 0;
      transition: all 0.3s ease-in-out;
    }
    #ks-main-container.ks-sidebar-collapsed #ks-sidebar {
      display: none !important;
    }
    #ks-main-container.ks-sidebar-collapsed #ks-main-content {
      width: 100% !important;
      max-width: 100% !important;
    }
    #ks-main-content {
      flex: 1 1 0%;
      min-width: 0;
      transition: all 0.3s ease-in-out;
    }
    @media (max-width: 1024px) {
      #ks-main-container {
        flex-direction: column;
      }
      #ks-sidebar {
        width: 100%;
      }
    }

    /* Cards e Sidebar */
    .ks-card {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 16px !important;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05) !important;
      color: #0f172a !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    .ks-card:before {
      display: none !important;
    }

    .ks-side a {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 13px;
      color: #475569 !important;
      border: 1px solid transparent;
      transition: all .15s ease;
      text-decoration: none;
    }
    .ks-side a:hover {
      background: #f8fafc !important;
      color: #0f172a !important;
      border-color: #e2e8f0 !important;
    }
    .ks-side a.active {
      background: #fffbeb !important;
      color: #b45309 !important;
      border-color: #fde68a !important;
      font-weight: 700 !important;
      box-shadow: 0 1px 2px rgba(245, 158, 11, 0.08) !important;
    }

    /* Botão Nova Galeria no Topo */
    .ks-btn.primary {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
      color: #000000 !important;
      font-weight: 900 !important;
      border: 1px solid rgba(251, 191, 36, 0.6) !important;
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.25) !important;
    }
    .ks-btn.primary:hover {
      filter: brightness(1.1) !important;
      transform: translateY(-1px);
    }

    /* Kanban Columns Light */
    .ks-kanban {
      display: grid;
      grid-template-columns: repeat(4, minmax(220px, 1fr));
      gap: 16px;
    }
    @media (max-width: 980px) {
      .ks-kanban {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 560px) {
      .ks-kanban {
        display: flex;
        gap: 12px;
        overflow-x: auto;
        padding-bottom: 8px;
        scroll-snap-type: x mandatory;
        -webkit-overflow-scrolling: touch;
      }
      .ks-kanban::-webkit-scrollbar {
        display: none;
      }
      .ks-col {
        min-width: min(88vw, 380px) !important;
        scroll-snap-align: start;
      }
    }

    .ks-col {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 16px !important;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05) !important;
      min-height: 240px;
      position: relative;
      overflow: hidden;
    }
    .ks-col:before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: #f59e0b !important;
      opacity: 1 !important;
    }
    .ks-col h3 {
      margin: 0;
      padding: 14px 16px !important;
      background: #f8fafc !important;
      border-bottom: 1px solid #e2e8f0 !important;
      color: #0f172a !important;
      font-size: 12px !important;
      letter-spacing: .15em !important;
      text-transform: uppercase !important;
      font-weight: 800 !important;
    }
    .ks-colhead {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .ks-colleft {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #0f172a !important;
    }
    .ks-dot {
      width: 8px;
      height: 8px;
      border-radius: 9999px;
      background: #f59e0b !important;
      display: inline-block;
    }
    .ks-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 2px 8px;
      border-radius: 9999px;
      background: rgba(245, 158, 11, 0.15) !important;
      color: #b45309 !important;
      font-weight: 800;
      font-size: 11px;
    }
    .ks-list {
      padding: 12px !important;
      display: flex;
      flex-direction: column;
      gap: 12px !important;
      background: #f8fafc !important;
      min-height: 120px;
    }

    /* Cards no Kanban Light */
    .ks-card {
      position: relative;
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 14px !important;
      padding: 12px !important;
      cursor: pointer;
      transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease !important;
      display: grid !important;
      grid-template-columns: 64px 1fr !important;
      gap: 12px !important;
      align-items: center !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
    }
    .ks-card:hover {
      border-color: #f59e0b !important;
      box-shadow: 0 4px 14px rgba(245, 158, 11, 0.18) !important;
      transform: translateY(-2px) !important;
    }
    .ks-card .name {
      color: #0f172a !important;
      font-weight: 800 !important;
      font-size: 14px !important;
      letter-spacing: -0.01em;
    }
    .ks-card .meta {
      margin-top: 4px !important;
      font-size: 12px !important;
      color: #64748b !important;
      font-weight: 500;
    }
    .ks-card .meta .ks-link {
      color: #d97706 !important;
      font-weight: 700;
    }
    .ks-thumb {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      overflow: hidden;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ks-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .ks-card-del {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: #fee2e2 !important;
      color: #dc2626 !important;
      border: 1px solid #fecaca !important;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      transition: all .15s ease;
    }
    .ks-card-del:hover {
      background: #ef4444 !important;
      color: #ffffff !important;
      transform: scale(1.08);
    }

    /* Search bar Light */
    .ks-search {
      width: 100%;
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      color: #0f172a !important;
      border-radius: 14px !important;
      padding: 13px 14px 13px 44px !important;
      outline: none;
      font-size: 14px !important;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
      transition: all .15s ease;
    }
    .ks-search::placeholder {
      color: #94a3b8 !important;
    }
    .ks-search:focus {
      border-color: #f59e0b !important;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15) !important;
    }
    .ks-search-ico {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: #f59e0b !important;
      font-size: 15px;
    }

    /* Modal e Drawer Detalhes da Galeria */
    .ks-drawer {
      background: #ffffff !important;
      color: #0f172a !important;
      border-left: 1px solid #e2e8f0 !important;
      box-shadow: -5px 0 25px rgba(0, 0, 0, 0.15) !important;
    }
    .ks-drawer-header {
      background: #f8fafc !important;
      border-bottom: 1px solid #e2e8f0 !important;
      color: #0f172a !important;
    }
    .ks-drawer-header .ck-kse-2b9532 {
      color: #0f172a !important;
      font-weight: 800;
    }
    .ks-field label {
      color: #334155 !important;
      font-weight: 700;
    }
    .ks-field input, .ks-field select {
      background: #ffffff !important;
      color: #0f172a !important;
      border: 1px solid #cbd5e1 !important;
    }
    .ks-field input:focus, .ks-field select:focus {
      border-color: #f59e0b !important;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15) !important;
    }
    .ks-modal-card {
      background: #ffffff !important;
      color: #0f172a !important;
      border: 1px solid #e2e8f0 !important;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.2) !important;
    }
    .ks-modal-head {
      background: #f8fafc !important;
      border-bottom: 1px solid #e2e8f0 !important;
      color: #0f172a !important;
    }
    .ks-modal-head .ck-kse-b3f627 {
      color: #0f172a !important;
      font-weight: 800;
    }
    .ks-modal-foot {
      background: #f8fafc !important;
      border-top: 1px solid #e2e8f0 !important;
    }
    .ks-btn.ghost {
      background: #f1f5f9 !important;
      color: #475569 !important;
      border: 1px solid #cbd5e1 !important;
    }
    .ks-btn.ghost:hover {
      background: #e2e8f0 !important;
      color: #0f172a !important;
    }
    .ks-fab {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
      color: #000 !important;
      border: 1px solid rgba(251, 191, 36, 0.6) !important;
      box-shadow: 0 4px 20px rgba(245, 158, 11, 0.35) !important;
    }
  </style>
  <script src="/config.js?v=2026-09-10-apex1"></script>
  @vite(['resources/css/fontawesome.css', 'resources/css/app.css', 'resources/js/pages/kingSelectionEdit.js'])
</head>
<body>
  <!-- Topbar de Luxo Conecta King (Preto Ônix com Dourado e Hambúrguer) -->
  <div class="ks-top" style="position: sticky; top: 0; z-index: 50;">
    <div style="max-width: min(1920px, 98vw); margin: 0 auto; padding: 10px 18px; display: flex; align-items: center; justify-content: space-between; gap: 14px;">
      
      <!-- Lado Esquerdo: Hambúrguer + Logo Conecta King + KingSelection -->
      <div style="display: flex; align-items: center; gap: 12px;">
        <button id="ks-btn-hamburger" type="button"
          class="p-2 rounded-xl text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition flex items-center justify-center cursor-pointer shadow-xs"
          title="Alternar Menu Lateral (Hambúrguer)" aria-label="Menu Lateral">
          <svg style="width: 22px; height: 22px;" stroke="currentColor" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>

        <a href="/kingSelection" style="display: flex; align-items: center; gap: 10px; text-decoration: none;">
          <div style="width: 34px; height: 34px; border-radius: 10px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.25); display: flex; align-items: center; justify-content: center; padding: 4px;">
            <img src="https://i.ibb.co/60sW9k75/logo.png" alt="Conecta King" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <div>
            <div style="font-weight: 900; font-size: 18px; letter-spacing: -0.02em; background: linear-gradient(135deg, #fef08a 0%, #f59e0b 50%, #d97706 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
              KingSelection
            </div>
            <div style="font-size: 10px; letter-spacing: 0.20em; text-transform: uppercase; color: rgba(245, 158, 11, 0.85); font-weight: 800;">
              Workspace · Meus Projetos <span id="ks-itemid" style="opacity: 0.7;"></span>
            </div>
          </div>
        </a>
      </div>

      <!-- Lado Direito: Voltar + Nova Galeria + Avatar do Usuário (depois de galeria) -->
      <div style="display: flex; align-items: center; gap: 10px;">
        <button class="ks-btn secondary" id="ks-back-btn" style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.15); color: #e2e8f0; font-weight: 800; border-radius: 12px; padding: 9px 15px; cursor: pointer;" title="Voltar ao Painel Geral">
          <i class="fas fa-arrow-left"></i> Voltar
        </button>

        <button class="ks-btn primary" id="ks-new-btn" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000; font-weight: 900; border: 1px solid rgba(251, 191, 36, 0.6); box-shadow: 0 0 15px rgba(245, 158, 11, 0.25); border-radius: 12px; padding: 9px 16px; cursor: pointer;" title="Criar Nova Galeria">
          <i class="fas fa-plus"></i> Nova Galeria
        </button>

        <!-- Avatar / Perfil do Usuário (depois de Nova Galeria) -->
        <div class="relative" id="ks-user-menu-container" style="position: relative;">
          <button id="ks-user-avatar-btn" type="button"
            style="display: flex; align-items: center; gap: 8px; padding: 4px 12px 4px 5px; border-radius: 9999px; background: rgba(0, 0, 0, 0.75); border: 1px solid rgba(245, 158, 11, 0.35); cursor: pointer; transition: all 0.2s;"
            title="Meu Perfil e Configurações">
            <div style="width: 28px; height: 28px; border-radius: 9999px; overflow: hidden; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.5); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <img id="ks-user-avatar-img" src="" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; display: none;" />
              <span id="ks-user-avatar-initials" style="font-weight: 900; color: #fbbf24; font-size: 11px;">CK</span>
            </div>
            <span id="ks-user-name-display" style="font-weight: 800; font-size: 11px; color: rgba(253, 230, 138, 0.95); letter-spacing: 0.05em; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Perfil</span>
            <i class="fas fa-chevron-down" style="font-size: 10px; color: rgba(245, 158, 11, 0.8);"></i>
          </button>

          <!-- Dropdown do Avatar -->
          <div id="ks-user-dropdown" style="display: none; position: absolute; right: 0; top: calc(100% + 8px); width: 230px; border-radius: 16px; background: #0f1016; border: 1px solid rgba(245, 158, 11, 0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.7); padding: 8px; z-index: 99999;">
            <div style="padding: 10px 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 6px; display: flex; align-items: center; gap: 10px;">
              <div style="width: 34px; height: 34px; border-radius: 9999px; overflow: hidden; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.5); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <img id="ks-user-dropdown-img" src="" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; display: none;" />
                <span id="ks-user-dropdown-initials" style="font-weight: 900; color: #fbbf24; font-size: 12px;">CK</span>
              </div>
              <div style="min-width: 0;">
                <div id="ks-user-dropdown-name" style="font-weight: 800; font-size: 13px; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Conecta King</div>
                <div style="font-size: 10.5px; color: #94a3b8;">Gerenciar Conta</div>
              </div>
            </div>

            <a href="/conta" style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 10px; color: #e2e8f0; font-size: 12px; font-weight: 700; text-decoration: none; transition: all 0.15s;" onmouseover="this.style.background='rgba(245,158,11,0.15)';this.style.color='#fbbf24';" onmouseout="this.style.background='transparent';this.style.color='#e2e8f0';">
              <i class="fas fa-user-gear" style="color: #fbbf24; width: 16px; text-align: center;"></i>
              <span>Configurar Perfil & Foto</span>
            </a>

            <a href="/dashboard" style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 10px; color: #e2e8f0; font-size: 12px; font-weight: 700; text-decoration: none; transition: all 0.15s;" onmouseover="this.style.background='rgba(245,158,11,0.15)';this.style.color='#fbbf24';" onmouseout="this.style.background='transparent';this.style.color='#e2e8f0';">
              <i class="fas fa-house" style="color: #fbbf24; width: 16px; text-align: center;"></i>
              <span>Painel Geral</span>
            </a>

            <div style="height: 1px; background: rgba(255, 255, 255, 0.08); margin: 6px 0;"></div>

            <button type="button" id="ks-user-logout-btn" style="width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 10px; color: #f87171; font-size: 12px; font-weight: 700; background: transparent; border: none; cursor: pointer; text-align: left; transition: all 0.15s;" onmouseover="this.style.background='rgba(239,68,68,0.15)';" onmouseout="this.style.background='transparent';">
              <i class="fas fa-sign-out-alt" style="width: 16px; text-align: center;"></i>
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>

  <div class="ks-wrap">
    <!-- Layout Flex com Sidebar Retrátil (Abre ao lado, afastando o conteúdo exatamente como no Eliseu) -->
    <div id="ks-main-container" class="mt-6 flex gap-6 items-start transition-all duration-300">
      
      <!-- Sidebar Retrátil -->
      <aside id="ks-sidebar" class="w-72 shrink-0 transition-all duration-300 ease-in-out">
        <div class="ks-card ks-card--side-nav p-3">
          <div class="ks-side flex flex-col gap-1 max-h-none overflow-y-visible">
            <a href="/kingSelection" class="active" id="ks-tab-all"><i class="fas fa-folder-open"></i> Todas as Galerias</a>
            <a href="#" data-filter="preparacao"><i class="fas fa-clock"></i> Em Preparação</a>
            <a href="#" data-filter="andamento"><i class="fas fa-user-check"></i> Cliente Selecionando</a>
            <a href="#" data-filter="revisao"><i class="fas fa-pen-nib"></i> Em Edição</a>
            <a href="#" data-filter="finalizado"><i class="fas fa-circle-check"></i> Finalizados</a>
            <div style="height: 1px; background: #e2e8f0; margin: 6px 0;"></div>
            <a href="/dashboard"><i class="fas fa-house"></i> Painel Geral</a>
            <a href="https://wa.me/5581997323674?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20KingSelection" target="_blank" rel="noopener noreferrer"><i class="fab fa-whatsapp"></i> Suporte WhatsApp</a>
          </div>
        </div>
      </aside>

      <!-- Conteúdo Principal (Afasta para o lado quando a sidebar abre) -->
      <main id="ks-main-content" class="flex-1 min-w-0 transition-all duration-300">
        <div class="ks-topbar" style="margin: 0 0 16px 0;">
          <div class="ck-kse-9ec9e5" style="position: relative; width: 100%;">
            <i class="fas fa-search ks-search-ico" aria-hidden="true"></i>
            <input id="ks-search" class="ks-search" placeholder="Procurar projeto, cliente ou slug..." autocomplete="off" />
          </div>
        </div>
        <div class="ks-kanban" id="ks-kanban"></div>
      </main>

    </div>
  </div>

  <button class="ks-fab" id="ks-fab-new" aria-label="Nova galeria">
    <span class="ks-fab-tip">Nova galeria</span>
    <i class="fas fa-plus"></i>
  </button>

  <!-- Drawer -->
  <div class="ks-drawer-overlay" id="ks-drawer-overlay" aria-hidden="true"></div>
  <div class="ks-drawer" id="ks-drawer">
    <div class="ks-drawer-header">
      <div class="ck-kse-2b9532" id="ks-drawer-title">Galeria</div>
      <button class="ks-btn secondary" id="ks-drawer-close"><i class="fas fa-times"></i></button>
    </div>
    <div class="ks-drawer-body">
      <div class="ks-field">
        <label>Link do cliente</label>
        <div class="ks-link" id="ks-client-link">-</div>
        <div class="ks-small">Envie esse link + e-mail/senha para o cliente.</div>
      </div>

      <div class="ks-row">
        <div class="ks-field">
          <label>E-mail do cliente</label>
          <input id="ks-client-email" type="text" readonly />
        </div>
        <div class="ks-field">
          <label>Senha do cliente</label>
          <input id="ks-client-pass" type="text" readonly />
        </div>
      </div>

      <div class="ks-row">
        <button class="ks-btn secondary" id="ks-copy-whats"><i class="fab fa-whatsapp"></i> Copiar msg WhatsApp</button>
        <button class="ks-btn secondary" id="ks-open-whats"><i class="fab fa-whatsapp"></i> Abrir WhatsApp</button>
      </div>

      <div class="ks-row">
        <button class="ks-btn secondary" id="ks-export-btn"><i class="fas fa-file-export"></i> Exportar seleção</button>
        <button class="ks-btn secondary" id="ks-reset-pass"><i class="fas fa-key"></i> Redefinir senha</button>
      </div>

      <div class="ks-field">
        <label>Resumo</label>
        <div class="ks-small">Selecionadas: <b id="ks-selected-count">0</b> . Fotos: <b id="ks-photos-count">0</b></div>
        <div class="ks-small ck-kse-eda51d" id="ks-feedback-box"></div>
      </div>

      <div class="ks-row">
        <div class="ks-field">
          <label>Status</label>
          <select id="ks-status">
            <option value="preparacao">Preparao</option>
            <option value="andamento">Cliente selecionando</option>
            <option value="revisao">Edição</option>
            <option value="finalizado">Finalizado</option>
          </select>
        </div>
        <div class="ks-field ck-kse-455f8c">
          <button class="ks-btn primary" id="ks-save-status"><i class="fas fa-save"></i> Salvar</button>
        </div>
      </div>

      <div class="ks-field">
        <label>Adicionar foto (Cloudflare)</label>
        <input type="file" id="ks-photo-file" accept="image/*" />
        <div class="ks-small">A foto  salva na Cloudflare e o cliente v o preview com marca d'gua.</div>
      </div>

      <div class="ks-photos" id="ks-photos"></div>
    </div>
  </div>

  <!-- Modal: Nova Galeria -->
  <div class="ks-modal" id="ks-new-modal" aria-hidden="true">
    <div class="ks-modal-card">
      <div class="ks-modal-head">
        <div class="ck-kse-b3f627">Nova galeria</div>
        <button class="ks-btn secondary" id="ks-new-close"><i class="fas fa-times"></i></button>
      </div>
      <div class="ks-modal-body">
        <div class="ks-row">
          <div class="ks-field">
            <label>Nome do projeto</label>
            <input id="ks-new-name" type="text" placeholder="Ex: Casamento João & Maria" />
          </div>
        </div>
        <div class="ks-row">
          <div class="ks-field">
            <label>Categoria</label>
            <select id="ks-new-category-select" aria-describedby="ks-new-category-hint">
              <option value="">- Selecione (opcional) -</option>
              <option value="Casamento">Casamento</option>
              <option value="Corporativo">Corporativo</option>
              <option value="Ensaio">Ensaio</option>
              <option value="Eventos">Eventos</option>
              <option value="Newborn">Newborn</option>
              <option value="Gestante">Gestante</option>
              <option value="Família">Família</option>
              <option value="Formatura">Formatura</option>
              <option value="Batizado">Batizado</option>
              <option value="Moda / Editorial">Moda / Editorial</option>
              <option value="Produto / Still">Produto / Still</option>
              <option value="Esportes">Esportes</option>
              <option value="Arquitetura / Imóveis">Arquitetura / Imóveis</option>
              <option value="__outra__">Outra (digitar abaixo)</option>
            </select>
            <input class="ck-kse-652def" id="ks-new-category-custom" type="text" placeholder="Digite a categoria" autocomplete="off" />
            <div class="ks-small ck-kse-fe7b49" id="ks-new-category-hint">Escolha uma categoria ou use "Outra" para um nome personalizado.</div>
          </div>
        </div>
        <div class="ks-row">
          <div class="ks-field">
            <label>Nome do cliente / contato</label>
            <input id="ks-new-client-name" type="text" placeholder="Nome da pessoa" />
          </div>
        </div>
        <div class="ks-field">
          <label>Data do trabalho</label>
          <div id="ks-new-work-date" class="ks-small ck-kse-8690f6"></div>
          <div class="ks-small ck-kse-fe7b49">Preenchida automaticamente com a data de hoje ao criar (servidor).</div>
        </div>
        <div class="ks-row">
        <div class="ks-field">
            <label>Tipo de acesso</label>
            <select id="ks-new-access">
            <option value="private">Privado (e-mail e senha do cliente)</option>
            <option value="signup">Visitante pode se cadastrar</option>
            <option value="paid_event_photos">Fotos e vendas (cadastro + pagamento)</option>
            <option value="public">Público (sem login)</option>
          </select>
          </div>
        </div>
        <div class="ks-small ck-mb-10" id="ks-new-access-hint"></div>
        <div class="ks-row" id="ks-new-cred-row">
          <div class="ks-field">
            <label>E-mail do cliente</label>
            <input id="ks-new-email" type="email" placeholder="cliente@email.com" autocomplete="email" />
          </div>
          <div class="ks-field">
            <label>Senha do cliente</label>
            <input id="ks-new-pass" type="text" placeholder="Crie uma senha" autocomplete="new-password" />
          </div>
        </div>
        <div class="ks-row">
          <div class="ks-field">
            <label>Limite de seleção (0 = livre)</label>
            <input id="ks-new-max" type="number" inputmode="numeric" min="0" value="0" />
          </div>
          <div class="ks-field">
            <label>Seleção mínima (0 = livre)</label>
            <input id="ks-new-min" type="number" inputmode="numeric" min="0" value="0" />
          </div>
        </div>
        <div class="ks-small ck-mb-10">Se "Seleção mínima" não existir no banco ainda, tudo funciona como "Livre" (opcional rodar a migration depois).</div>
        <div class="ks-field ck-kse-49f564">
          <input class="ck-kse-b3c7cc" type="checkbox" id="ks-new-watermark" checked />
          <label class="ck-kse-ffb83a" for="ks-new-watermark">Aplicar marca d'gua nas fotos desta galeria</label>
        </div>
      </div>
      <div class="ks-modal-foot">
        <button class="ks-btn ghost" id="ks-new-cancel">Cancelar</button>
        <button class="ks-btn primary" id="ks-new-save"><i class="fas fa-plus"></i> Criar</button>
      </div>
    </div>
  </div>

  <!-- Modal: Exportar -->
  <div class="ks-modal" id="ks-export-modal" aria-hidden="true">
    <div class="ks-modal-card">
      <div class="ks-modal-head">
        <div class="ck-kse-b3f627">Exportar fotos</div>
        <button class="ks-btn secondary" id="ks-export-close"><i class="fas fa-times"></i></button>
      </div>
      <div class="ks-modal-body">
        <div class="ks-tabs">
          <button class="ks-tab active" data-tab="lr">Lightroom</button>
          <button class="ks-tab" data-tab="finder">Finder (Mac)</button>
          <button class="ks-tab" data-tab="win">Windows</button>
        </div>
        <div class="ks-small ck-mt-10" id="ks-export-meta">-</div>
        <textarea class="ks-textarea" id="ks-export-text"></textarea>
        <div class="ks-row ck-mt-10">
          <button class="ks-btn secondary" id="ks-export-copy"><i class="fas fa-copy"></i> Copiar</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Script Hambúrguer Idêntico ao Eliseu (Abre ao lado, afastando o conteúdo) -->
  <script>
    (function () {
      function initHamburger() {
        const btn = document.getElementById('ks-btn-hamburger');
        const container = document.getElementById('ks-main-container');
        if (!btn || !container) return;

        // Recupera estado salvo (padrão: aberto igual Eliseu)
        const isCollapsed = localStorage.getItem('ks_sidebar_collapsed') === 'true';
        if (isCollapsed) {
          container.classList.add('ks-sidebar-collapsed');
        }

        btn.addEventListener('click', function (e) {
          e.preventDefault();
          const collapsed = container.classList.toggle('ks-sidebar-collapsed');
          localStorage.setItem('ks_sidebar_collapsed', collapsed ? 'true' : 'false');
        });


        // Filtros de colunas no menu lateral
        const filterLinks = document.querySelectorAll('.ks-side a[data-filter]');
        const allLink = document.getElementById('ks-tab-all');
        filterLinks.forEach(link => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.ks-side a').forEach(a => a.classList.remove('active'));
            link.classList.add('active');
            const targetStatus = link.getAttribute('data-filter');
            document.querySelectorAll('.ks-col').forEach(col => {
              if (col.getAttribute('data-col') === targetStatus) {
                col.style.display = '';
                col.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
              } else {
                col.style.display = 'none';
              }
            });
          });
        });
        allLink?.addEventListener('click', (e) => {
          e.preventDefault();
          document.querySelectorAll('.ks-side a').forEach(a => a.classList.remove('active'));
          allLink.classList.add('active');
          document.querySelectorAll('.ks-col').forEach(col => {
            col.style.display = '';
          });
        });
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHamburger);
      } else {
        initHamburger();
      }

      // Inicialização do Avatar e Perfil do Usuário
      function initUserAvatar() {
        const avatarBtn = document.getElementById('ks-user-avatar-btn');
        const dropdown = document.getElementById('ks-user-dropdown');
        const logoutBtn = document.getElementById('ks-user-logout-btn');

        if (!avatarBtn || !dropdown) return;

        avatarBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isHidden = dropdown.style.display === 'none' || !dropdown.style.display;
          dropdown.style.display = isHidden ? 'block' : 'none';
        });

        document.addEventListener('click', (e) => {
          if (!dropdown.contains(e.target) && !avatarBtn.contains(e.target)) {
            dropdown.style.display = 'none';
          }
        });

        logoutBtn?.addEventListener('click', () => {
          if (confirm('Deseja realmente sair?')) {
            localStorage.removeItem('conectaKingToken');
            localStorage.removeItem('token');
            localStorage.removeItem('conectaKingUser');
            window.location.href = '/login';
          }
        });

        try {
          const rawUser = localStorage.getItem('conectaKingUser') || localStorage.getItem('user');
          if (rawUser) {
            const user = JSON.parse(rawUser);
            const name = user.name || user.display_name || user.nome || 'Conecta King';
            const email = user.email || '';
            const photo = user.profile_image_url || user.photo || user.avatar || '';

            const nameEl = document.getElementById('ks-user-name-display');
            const dropNameEl = document.getElementById('ks-user-dropdown-name');
            const dropEmailEl = document.getElementById('ks-user-dropdown-email');
            const imgEl = document.getElementById('ks-user-avatar-img');
            const dropImgEl = document.getElementById('ks-user-dropdown-img');
            const initEl = document.getElementById('ks-user-avatar-initials');
            const dropInitEl = document.getElementById('ks-user-dropdown-initials');

            if (nameEl) nameEl.textContent = name;
            if (dropNameEl) dropNameEl.textContent = name;
            if (dropEmailEl && email) dropEmailEl.textContent = email;

            const initials = name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'CK';
            if (initEl) initEl.textContent = initials;
            if (dropInitEl) dropInitEl.textContent = initials;

            if (photo && photo !== 'null') {
              if (imgEl) {
                imgEl.src = photo;
                imgEl.style.display = 'block';
                if (initEl) initEl.style.display = 'none';
              }
              if (dropImgEl) {
                dropImgEl.src = photo;
                dropImgEl.style.display = 'block';
                if (dropInitEl) dropInitEl.style.display = 'none';
              }
            }
          }
        } catch (e) {
          console.warn('Erro ao carregar avatar do usuário:', e);
        }
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUserAvatar);
      } else {
        initUserAvatar();
      }
    })();
  </script>
</body>
</html>


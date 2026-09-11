{{-- Painel ADM (Blade; assets em /admin/*.js|css) --}}
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Conecta King</title>
    <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
    <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
    @vite(['resources/css/fontawesome.css', 'resources/js/pages/admin.js'])
</head>
<body>
    <div class="admin-layout">
        <aside class="sidebar">
            <div class="sidebar-header">
                <a href="/dashboard" class="logo" title="Voltar ao painel">
                    <i class="fas fa-arrow-left"></i>
                    <span class="logo-text">Admin</span>
                </a>
            </div>
            <nav class="sidebar-nav">
                <a href="#" class="nav-link active" data-target="overview-pane"><i class="fas fa-tachometer-alt"></i> <span>Visão Geral</span></a>
                <a href="#" class="nav-link" data-target="users-pane"><i class="fas fa-users"></i> <span>Gerenciar Usuários</span></a>
                <a href="#" class="nav-link" data-target="codes-pane"><i class="fas fa-key"></i> <span>Gerenciar Códigos</span></a>
                <a href="#" class="nav-link" data-target="branding-pane"><i class="fas fa-image"></i> <span>Logomarca padrão</span></a>
                <a href="/admin-devocionais-365" class="nav-link"><i class="fas fa-book-open"></i> <span>Bíblia &amp; Devocionais</span></a>
                <a href="/admin-devocionais-365#prosperidade" class="nav-link"><i class="fas fa-moon"></i> <span>Prosperidade antes de dormir</span></a>
            </nav>
            <div class="sidebar-footer">
            </div>
        </aside>

        <main class="main-content">
            <section id="overview-pane" class="content-pane active">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2>Visão Geral da Plataforma</h2>
                    <button id="refresh-data-btn" class="btn btn-secondary ck-btn-md">
                        <i class="fas fa-sync-alt"></i> Atualizar
                    </button>
                </div>
                <!-- Métricas Principais -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <h4><i class="fas fa-users"></i> Total de Usuários</h4>
                        <p id="total-users">...</p>
                        <small class="stat-subtitle">Contas registradas</small>
                    </div>
                    <div class="stat-card">
                        <h4><i class="fas fa-key"></i> Códigos Gerados</h4>
                        <p id="total-codes">...</p>
                        <small class="stat-subtitle">Total de códigos criados</small>
                    </div>
                    <div class="stat-card">
                        <h4><i class="fas fa-check-circle"></i> Códigos Utilizados</h4>
                        <p id="claimed-codes">...</p>
                        <small class="stat-subtitle">Códigos já utilizados</small>
                    </div>
                    <div class="stat-card">
                        <h4><i class="fas fa-eye"></i> Visualizações de Perfil</h4>
                        <p id="total-views">...</p>
                        <small class="stat-subtitle">Total de visualizações</small>
                    </div>
                     <div class="stat-card">
                        <h4><i class="fas fa-mouse-pointer"></i> Cliques nos Links</h4>
                        <p id="total-clicks">...</p>
                        <small class="stat-subtitle">Total de cliques</small>
                    </div>
                    <div class="stat-card">
                        <h4><i class="fas fa-percentage"></i> Taxa de Conversão (CTR)</h4>
                        <p id="click-through-rate">...</p>
                        <small class="stat-subtitle">Cliques / Visualizações</small>
                    </div>
                    <div class="stat-card">
                        <h4><i class="fas fa-chart-line"></i> Taxa de Uso de Códigos</h4>
                        <p id="code-usage-rate">...</p>
                        <small class="stat-subtitle">Utilizados / Gerados</small>
                    </div>
                    <div class="stat-card">
                        <h4><i class="fas fa-chart-bar"></i> Média Visualizações/Usuário</h4>
                        <p id="avg-views-per-user">...</p>
                        <small class="stat-subtitle">Engajamento médio</small>
                    </div>
                    <div class="stat-card">
                        <h4><i class="fas fa-bullseye"></i> Média Cliques/Usuário</h4>
                        <p id="avg-clicks-per-user">...</p>
                        <small class="stat-subtitle">Interação média</small>
                    </div>
                    <div class="stat-card">
                        <h4><i class="fas fa-building"></i> Usuários Empresariais</h4>
                        <p id="total-enterprise-users">...</p>
                        <small class="stat-subtitle">Contas com modo empresarial</small>
                    </div>
                </div>

                <!-- Seção de Analytics Avançado -->
                <div class="ck-mt-40">
                    <h3 class="ck-mb-20-text">
                        <i class="fas fa-chart-area"></i> Analytics Avançado
                    </h3>
                    
                    <div class="advanced-stats-grid">
                        <div class="advanced-stat-card">
                            <h4><i class="fas fa-fire"></i> Usuários Ativos (últimos 7 dias)</h4>
                            <p id="active-users-7d">Carregando...</p>
                        </div>
                        <div class="advanced-stat-card">
                            <h4><i class="fas fa-calendar-day"></i> Usuários Ativos (Hoje)</h4>
                            <p id="active-users-today">Carregando...</p>
                        </div>
                        <div class="advanced-stat-card">
                            <h4><i class="fas fa-sign-in-alt"></i> Logins Hoje</h4>
                            <p id="logins-today">Carregando...</p>
                        </div>
                        <div class="advanced-stat-card">
                            <h4><i class="fas fa-edit"></i> Usuários que Alteraram Algo Hoje</h4>
                            <p id="modified-today">Carregando...</p>
                        </div>
                        <div class="advanced-stat-card">
                            <h4><i class="fas fa-user-check"></i> Usuários com Perfil Ativo</h4>
                            <p id="users-with-profile">Carregando...</p>
                        </div>
                        <div class="advanced-stat-card">
                            <h4><i class="fas fa-link"></i> Total de Links Criados</h4>
                            <p id="total-links">Carregando...</p>
                        </div>
                        <div class="advanced-stat-card">
                            <h4><i class="fas fa-exclamation-triangle"></i> Assinaturas Vencidas</h4>
                            <p id="expired-subscriptions">Carregando...</p>
                        </div>
                        <div class="advanced-stat-card">
                            <h4><i class="fas fa-clock"></i> Assinaturas Vencendo em 7 dias</h4>
                            <p id="expiring-soon">Carregando...</p>
                        </div>
                        <div class="advanced-stat-card">
                            <h4><i class="fas fa-user-times"></i> Usuários Inativos Hoje</h4>
                            <p id="not-used-today">Carregando...</p>
                        </div>
                    </div>

                    <!-- Tabela de Usuários Ativos vs Vencidos -->
                    <div id="users-active-expired-table-container" style="margin-top: 30px;">
                        <!-- Conteúdo será inserido via JavaScript -->
                    </div>
                </div>

                <!-- Top Performers -->
                <div class="ck-mt-40">
                    <h3 class="ck-mb-20-text">
                        <i class="fas fa-trophy"></i> Top Performers
                    </h3>
                    <div class="top-performers-grid">
                        <div class="top-performers-card" style="grid-column: 1 / -1;">
                            <h4><i class="fas fa-star"></i> Top 20 Perfis Mais Visualizados</h4>
                            <div id="top-viewed-profiles" class="top-list" style="max-height: 600px;">
                                <p style="color: var(--text-dark);">Carregando...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Lista Completa de Perfis -->
                <div class="ck-mt-40">
                    <h3 class="ck-mb-20-text">
                        <i class="fas fa-list"></i> Lista Completa de Perfis
                    </h3>
                    <div style="margin-bottom: 15px;">
                        <input type="text" id="profile-search-input" placeholder="?? Pesquisar por nome ou email..." 
                               style="width: 100%; max-width: 400px; padding: 10px 15px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-light); color: var(--text); font-size: 0.95rem;">
                    </div>
                    <div class="profiles-list-container">
                        <div id="all-profiles-list" class="profiles-list">
                            <p style="color: var(--text-dark); text-align: center; padding: 20px;">Carregando perfis...</p>
                        </div>
                    </div>
                </div>
            </section>

            <section id="users-pane" class="content-pane">
                <h2>Gerenciar Usuários</h2>
                
                <!-- Cards de Estatísticas Rápidas -->
                <div class="stats-cards-grid ck-grid-stats">
                    <div class="stat-card-mini stat-card-clickable ck-card-pad-click" data-user-expiration-filter="all" role="button" tabindex="0" aria-label="Filtrar: todos os usuários">
                        <div class="ck-flex-between">
                            <span class="ck-label-dark">Total de Usuários</span>
                            <i class="fas fa-users" style="color: var(--primary); font-size: 1.5rem;"></i>
                        </div>
                        <div id="stat-total-users" style="font-size: 2rem; font-weight: 800; color: var(--primary);">0</div>
                    </div>
                    <div class="stat-card-mini stat-card-clickable ck-card-pad-click" data-user-expiration-filter="active" role="button" tabindex="0" aria-label="Filtrar: usuários ativos">
                        <div class="ck-flex-between">
                            <span class="ck-label-dark">Usuários Ativos</span>
                            <i class="fas fa-check-circle" style="color: #2ecc71; font-size: 1.5rem;"></i>
                        </div>
                        <div id="stat-active-users" style="font-size: 2rem; font-weight: 800; color: #2ecc71;">0</div>
                    </div>
                    <div class="stat-card-mini stat-card-clickable ck-card-pad-click" data-user-expiration-filter="expired" role="button" tabindex="0" aria-label="Filtrar: usuários vencidos">
                        <div class="ck-flex-between">
                            <span class="ck-label-dark">Usuários Vencidos</span>
                            <i class="fas fa-exclamation-triangle" style="color: #e74c3c; font-size: 1.5rem;"></i>
                        </div>
                        <div id="stat-expired-users" style="font-size: 2rem; font-weight: 800; color: #e74c3c;">0</div>
                    </div>
                    <div class="stat-card-mini stat-card-clickable ck-card-pad-click" data-user-expiration-filter="expiring_soon" role="button" tabindex="0" aria-label="Filtrar: expirando em 7 dias">
                        <div class="ck-flex-between">
                            <span class="ck-label-dark">Expirando em 7 dias</span>
                            <i class="fas fa-clock" style="color: #f39c12; font-size: 1.5rem;"></i>
                        </div>
                        <div id="stat-expiring-soon-users" style="font-size: 2rem; font-weight: 800; color: #f39c12;">0</div>
                    </div>
                </div>
                
                <!-- Filtros Avançados -->
                <div class="advanced-filters ck-card-pad-mb">
                    <div class="ck-flex-between-15">
                        <h3 class="ck-card-title">
                            <i class="fas fa-filter"></i> Filtros Avançados
                        </h3>
                        <button id="toggle-advanced-filters" class="btn btn-secondary ck-btn-sm">
                            <i class="fas fa-chevron-down"></i> Mostrar
                        </button>
                    </div>
                    <div id="advanced-filters-content">
                        <div>
                            <label class="ck-label-block">Tipo de Conta</label>
                            <select class="ck-input-admin" id="filter-account-type">
                                <option value="">Todos os tipos</option>
                                <option value="free">Free</option>
                                <option value="adm_principal">ADM Principal</option>
                                <option value="basic">King Start</option>
                                <option value="premium">King Prime</option>
                                <option value="king_base">King Essential</option>
                                <option value="king_finance">King Finance</option>
                                <option value="king_finance_plus">King Finance Plus</option>
                                <option value="king_premium_plus">King Premium Plus</option>
                                <option value="king_corporate">King Corporate</option>
                                <option value="team_member">Membro</option>
                            </select>
                        </div>
                        <div>
                            <label class="ck-label-block">Status Assinatura</label>
                            <select class="ck-input-admin" id="filter-subscription-status">
                                <option value="">Todos os status</option>
                                <option value="active">Ativo</option>
                                <option value="expired">Expirado</option>
                                <option value="free">Free</option>
                            </select>
                        </div>
                        <div>
                            <label class="ck-label-block">Status Admin</label>
                            <select class="ck-input-admin" id="filter-is-admin">
                                <option value="">Todos</option>
                                <option value="true">Sim</option>
                                <option value="false">Não</option>
                            </select>
                        </div>
                        <div>
                            <label class="ck-label-block">Data de Criação (De)</label>
                            <input class="ck-input-admin" type="date" id="filter-created-from">
                        </div>
                        <div>
                            <label class="ck-label-block">Data de Criação (Até)</label>
                            <input class="ck-input-admin" type="date" id="filter-created-to">
                        </div>
                        <div class="ck-flex-end-gap">
                            <button id="apply-advanced-filters" class="btn btn-primary ck-flex-1">
                                <i class="fas fa-check"></i> Aplicar Filtros
                            </button>
                            <button id="clear-advanced-filters" class="btn btn-secondary">
                                <i class="fas fa-times"></i> Limpar
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Indicador de filtros ativos + Limpar tudo -->
                <div id="users-filters-active-bar" class="filters-active-bar" style="display: none; margin-bottom: 12px; padding: 10px 14px; background: rgba(255,199,0,0.08); border: 1px solid var(--primary); border-radius: 8px; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <span class="ck-text-light-09" id="users-filters-active-text"></span>
                    <button type="button" id="users-clear-all-filters-btn" class="btn btn-secondary ck-btn-sm">
                        <i class="fas fa-times-circle"></i> Limpar todos os filtros
                    </button>
                </div>
                
                <div class="filter-actions" style="margin-bottom: 6px; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <div style="position: relative; width: 100%; max-width: 420px;">
                        <label for="user-search-input" class="sr-only">Pesquisar por nome ou e-mail</label>
                        <i class="fas fa-search" style="position:absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-dark);" aria-hidden="true"></i>
                        <input type="text" id="user-search-input" placeholder="Pesquisar por nome ou e-mail (Enter para buscar)" 
                               aria-label="Pesquisar usuários por nome ou e-mail" autocomplete="off"
                               style="width: 100%; padding: 10px 12px 10px 36px; border-radius: 8px; border: 1px solid var(--card-border); background: var(--card-bg); color: var(--text);">
                    </div>
                    
                    <!-- Filtros de Vencimento para Usuários -->
                    <div class="expiration-filters" role="group" aria-label="Filtro por vencimento">
                        <button id="user-filter-all-btn" class="btn btn-secondary filter-btn active" data-filter="all" type="button" aria-pressed="true">Todos</button>
                        <button id="user-filter-expired-btn" class="btn btn-secondary filter-btn" data-filter="expired" type="button" aria-pressed="false"><i class="fas fa-exclamation-triangle" aria-hidden="true"></i> Vencidos</button>
                        <button id="user-filter-active-btn" class="btn btn-secondary filter-btn" data-filter="active" type="button" aria-pressed="false"><i class="fas fa-check-circle" aria-hidden="true"></i> Em Dias</button>
                        <button id="user-filter-expiring-soon-btn" class="btn btn-secondary filter-btn" data-filter="expiring_soon" type="button" aria-pressed="false"><i class="fas fa-clock" aria-hidden="true"></i> Expirando em 7 dias</button>
                    </div>
                    <!-- Filtro por inatividade (dias sem uso) -->
                    <div class="inactivity-filters" role="group" aria-label="Filtro por inatividade">
                        <span style="color: var(--text-dark); font-size: 0.85rem;">Inativos:</span>
                        <button type="button" id="user-filter-inactive-30" class="btn btn-secondary filter-btn btn-sm" data-inactive-days="30">30 dias</button>
                        <button type="button" id="user-filter-inactive-60" class="btn btn-secondary filter-btn btn-sm" data-inactive-days="60">60 dias</button>
                        <button type="button" id="user-filter-inactive-90" class="btn btn-secondary filter-btn btn-sm" data-inactive-days="90">90 dias</button>
                        <button type="button" id="user-filter-inactive-180" class="btn btn-secondary filter-btn btn-sm" data-inactive-days="180">180 dias</button>
                    </div>
                </div>
                
                <!-- Seção de Exclusão Automática para Usuários -->
                <div class="auto-delete-section">
                    <button id="open-user-auto-delete-modal-btn" class="btn btn-secondary">
                        <i class="fas fa-cog"></i> Configurar Exclusão Automática
                    </button>
                    <button id="execute-user-auto-delete-btn" class="btn btn-warning">
                        <i class="fas fa-broom"></i> Executar Exclusão Agora
                    </button>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin: 15px 0; flex-wrap: wrap; gap: 10px;">
                    <div class="ck-flex-wrap-12">
                        <div id="user-count" class="selected-count ck-m-0" aria-live="polite">0 usuário(s)</div>
                        <span class="ck-text-dark-09" id="users-page-range"></span>
                    </div>
                    
                    <!-- Colunas visíveis + Paginação + Exportar -->
                    <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                        <div class="dropdown-columns-wrap">
                            <button type="button" id="users-columns-toggle" class="btn btn-secondary ck-btn-sm" aria-haspopup="true" aria-expanded="false" aria-label="Mostrar ou ocultar colunas">
                                <i class="fas fa-columns"></i> Colunas
                            </button>
                            <div id="users-columns-dropdown" class="dropdown-columns ck-hidden" role="menu" aria-label="Colunas visíveis"></div>
                        </div>
                        <label style="color: var(--text-dark); font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
                            <span>Itens por página:</span>
                            <select class="ck-input-sm" id="users-per-page" aria-label="Itens por página">
                                <option value="25">25</option>
                                <option value="50" selected>50</option>
                                <option value="100">100</option>
                                <option value="200">200</option>
                                <option value="all">Todos</option>
                            </select>
                        </label>
                        <button id="export-all-users-btn" class="btn btn-secondary ck-btn-md" aria-label="Exportar todos os usuários">
                            <i class="fas fa-file-export"></i> Exportar Todos
                        </button>
                    </div>
                </div>
                
                <!-- Ações em Massa para Usuários Selecionados -->
                <div id="user-bulk-actions" class="bulk-actions" style="display: none; margin-bottom: 15px; padding: 15px; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color);" role="region" aria-label="Ações em massa">
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <span class="ck-text-light-bold" id="user-selected-count">0 usuários selecionados</span>
                        <button id="delete-selected-users-btn" class="btn btn-danger" aria-label="Deletar usuários selecionados">
                            <i class="fas fa-trash"></i> Deletar Selecionados
                        </button>
                        <button id="export-selected-users-btn" class="btn btn-secondary" aria-label="Exportar selecionados em CSV">
                            <i class="fas fa-download"></i> Exportar (CSV)
                        </button>
                        <button id="export-selected-users-excel-btn" class="btn btn-secondary" aria-label="Exportar selecionados em Excel">
                            <i class="fas fa-file-excel"></i> Exportar (Excel)
                        </button>
                        <button id="copy-selected-users-btn" class="btn btn-secondary" aria-label="Copiar nome e e-mail dos selecionados">
                            <i class="fas fa-copy"></i> Copiar (nome + e-mail)
                        </button>
                        <button id="change-account-type-bulk-btn" class="btn btn-secondary" aria-label="Alterar tipo de conta em massa">
                            <i class="fas fa-edit"></i> Alterar Tipo em Massa
                        </button>
                        <button id="clear-selection-btn" class="btn btn-secondary" aria-label="Limpar seleção">
                            <i class="fas fa-times"></i> Limpar Seleção
                        </button>
                    </div>
                </div>
                
                <div id="users-table-loading" class="table-loading-overlay ck-hidden" aria-hidden="true">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary);"></i>
                    <span>Carregando...</span>
                </div>
                <div class="table-container" id="users-table-container">
                    <table id="users-table" role="grid" aria-label="Lista de usuários">
                        <thead>
                            <tr>
                                <th class="th-checkbox"><input type="checkbox" id="select-all-users" title="Selecionar todos desta página" aria-label="Selecionar todos os usuários desta página"></th>
                                <th class="th-num" data-col="num">#</th>
                                <th class="sortable th-name" data-key="name" data-col="name" title="Clique para ordenar por nome">Nome <span class="sort-indicator" aria-hidden="true"></span></th>
                                <th class="sortable th-email" data-key="email" data-col="email" title="Clique para ordenar por e-mail">Email <span class="sort-indicator" aria-hidden="true"></span></th>
                                <th class="sortable th-account-type" data-key="account_type" data-col="account_type" title="Clique para ordenar por tipo de conta">Tipo de Conta <span class="sort-indicator" aria-hidden="true"></span></th>
                                <th class="sortable th-subscription" data-key="subscription_status" data-col="subscription_status" title="Clique para ordenar por status">Status Assinatura <span class="sort-indicator" aria-hidden="true"></span></th>
                                <th class="sortable th-expires" data-key="expires_at" data-col="expires_at" title="Clique para ordenar por data de expiração">Expira em <span class="sort-indicator" aria-hidden="true"></span></th>
                                <th class="sortable th-days" data-key="days_left" data-col="days_left" title="Clique para ordenar por status de vencimento">Status Vencimento <span class="sort-indicator" aria-hidden="true"></span></th>
                                <th class="sortable th-parent" data-key="parent_email" data-col="parent_email" title="Clique para ordenar por conta principal">Conta Principal <span class="sort-indicator" aria-hidden="true"></span></th>
                                <th class="sortable th-admin" data-key="is_admin" data-col="is_admin" title="Clique para ordenar por status admin">Status Admin <span class="sort-indicator" aria-hidden="true"></span></th>
                                <th class="sortable th-created" data-key="created_at" data-col="created_at" title="Clique para ordenar por data de criação">Data de Criação <span class="sort-indicator" aria-hidden="true"></span></th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
                <div id="users-empty-state" class="table-empty-state ck-hidden">
                    <i class="fas fa-search" aria-hidden="true"></i>
                    <h4>Nenhum usuário encontrado</h4>
                    <p>Não há resultados para os filtros ou busca atuais. Tente outros termos ou limpe os filtros.</p>
                    <button type="button" id="users-empty-state-clear-btn" class="btn btn-primary"><i class="fas fa-times-circle"></i> Limpar filtros</button>
                </div>
                
                <!-- Paginação -->
                <nav id="users-pagination" class="pagination ck-flex-center-pad" aria-label="Paginação da lista de usuários">
                    <button id="users-prev-page" class="btn btn-secondary" disabled aria-label="Página anterior">
                        <i class="fas fa-chevron-left" aria-hidden="true"></i> Anterior
                    </button>
                    <span class="ck-text-light-bold" id="users-page-info" aria-live="polite">Página 1 de 1</span>
                    <button id="users-next-page" class="btn btn-secondary" disabled aria-label="Próxima página">
                        Próxima <i class="fas fa-chevron-right" aria-hidden="true"></i>
                    </button>
                </nav>
            </section>

        <section id="branding-pane" class="content-pane">
            <h2>Logomarca padrão</h2>
            <p class="branding-description" style="color: var(--text-dark); margin-bottom: 20px; max-width: 640px;">
                Esta logo será exibida no rodapé do cartão de <strong>todas as contas que ainda não definiram a própria</strong>. 
                Contas em modo empresa que já alteraram a logo no painel delas não são afetadas - a alteração daqui não substitui a logo delas.
            </p>
            <div class="branding-form-card" style="background: var(--bg-card); padding: 24px; border-radius: 12px; border: 1px solid var(--border-color); max-width: 560px;">
                <input type="hidden" id="default-logo-url" value="">
                <div class="input-group ck-mb-16">
                    <label>Logo do rodapé</label>
                    <div id="default-logo-upload-area" class="image-upload-area" style="border: 2px dashed var(--border-color, #444); border-radius: 8px; padding: 30px; text-align: center; cursor: pointer; background: var(--bg-light, #1a1a1a); min-height: 120px; display: flex; align-items: center; justify-content: center;">
                        <div id="default-logo-upload-placeholder">
                            <i class="fas fa-cloud-upload-alt" style="font-size: 2.5rem; color: var(--primary, #FFC700); margin-bottom: 12px;"></i>
                            <p style="margin: 0; color: var(--text, #ECECEC); font-size: 0.95rem;">Clique para fazer upload da logo</p>
                            <p style="margin: 6px 0 0; color: var(--text-dark, #888); font-size: 0.85rem;">PNG ou JPG, até 5MB. Deixe vazio para usar o logo Conecta King.</p>
                        </div>
                        <div id="default-logo-upload-preview" style="display: none; flex-direction: column; align-items: center; width: 100%;">
                            <img id="default-logo-preview-img" src="" alt="Preview da logo" style="max-height: 80px; max-width: 200px; width: auto; height: auto; object-fit: contain; margin-bottom: 10px;">
                            <button type="button" id="default-logo-remove-btn" class="btn btn-secondary" style="padding: 6px 14px; font-size: 0.85rem;">
                                <i class="fas fa-times"></i> Remover logo
                            </button>
                        </div>
                    </div>
                    <input type="file" id="default-logo-file-input" accept="image/png,image/jpeg,image/jpg" style="position: absolute; left: -9999px; width: 1px; height: 1px;">
                </div>
                <div class="input-group ck-mb-16">
                    <label for="default-logo-size">Tamanho (px) - entre 20 e 420</label>
                    <input type="number" id="default-logo-size" min="20" max="420" value="60" class="modal-input-text" style="width: 100%; max-width: 120px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-light); color: var(--text);">
                </div>
                <div class="input-group ck-mb-20">
                    <label for="default-logo-link">Link ao clicar na logo (opcional)</label>
                    <input type="url" id="default-logo-link" class="modal-input-text" placeholder="https://..." style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-light); color: var(--text);">
                </div>
                <div class="ck-mb-20" id="default-logo-size-preview">
                    <span class="ck-text-dark-09">Como aparece no rodapé:</span>
                    <div id="default-logo-size-preview-img" style="margin-top: 8px; min-height: 40px;"></div>
                </div>
                <button type="button" id="save-default-branding-btn" class="btn btn-primary">
                    <i class="fas fa-save"></i> Salvar logomarca padrão
                </button>
                <span id="default-branding-message" style="margin-left: 12px; color: var(--text-dark); font-size: 0.9rem;"></span>
            </div>
        </section>

        <section id="codes-pane" class="content-pane">
            <h2>Gerenciar Códigos de Registro</h2>
            
            <!-- Cards de Estatísticas para Códigos -->
            <div class="stats-cards-grid ck-grid-stats">
                <div class="stat-card-mini stat-card-clickable ck-card-pad-click" data-code-quick-filter="all" role="button" tabindex="0" aria-label="Filtrar: todos os códigos">
                    <div class="ck-flex-between">
                        <span class="ck-label-dark">Total de Códigos</span>
                        <i class="fas fa-key" style="color: var(--primary); font-size: 1.5rem;"></i>
                    </div>
                    <div id="stat-total-codes" style="font-size: 2rem; font-weight: 800; color: var(--primary);">0</div>
                </div>
                <div class="stat-card-mini stat-card-clickable ck-card-pad-click" data-code-quick-filter="available" role="button" tabindex="0" aria-label="Filtrar: códigos disponíveis">
                    <div class="ck-flex-between">
                        <span class="ck-label-dark">Códigos Disponíveis</span>
                        <i class="fas fa-check-circle" style="color: #2ecc71; font-size: 1.5rem;"></i>
                    </div>
                    <div id="stat-available-codes" style="font-size: 2rem; font-weight: 800; color: #2ecc71;">0</div>
                </div>
                <div class="stat-card-mini stat-card-clickable ck-card-pad-click" data-code-quick-filter="claimed" role="button" tabindex="0" aria-label="Filtrar: códigos utilizados">
                    <div class="ck-flex-between">
                        <span class="ck-label-dark">Códigos Utilizados</span>
                        <i class="fas fa-check" style="color: #3498db; font-size: 1.5rem;"></i>
                    </div>
                    <div id="stat-used-codes" style="font-size: 2rem; font-weight: 800; color: #3498db;">0</div>
                </div>
                <div class="stat-card-mini stat-card-clickable ck-card-pad-click" data-code-quick-filter="all" role="button" tabindex="0" aria-label="Filtrar: todos os códigos">
                    <div class="ck-flex-between">
                        <span class="ck-label-dark">Taxa de Uso</span>
                        <i class="fas fa-percentage" style="color: #f39c12; font-size: 1.5rem;"></i>
                    </div>
                    <div id="stat-usage-rate" style="font-size: 2rem; font-weight: 800; color: #f39c12;">0%</div>
                </div>
            </div>
            
            <!-- Seção de Geração de Códigos -->
            <div class="codes-actions">
                <div class="code-generation-section">
                    <button id="generate-code-btn" class="btn btn-secondary">
                        <i class="fas fa-cogs"></i> Gerar Código Automático
                    </button>
                    
                    <div class="batch-generation">
                        <span>Digite o prefixo (</span>
                        <input type="text" id="prefix-input" placeholder="KING-" maxlength="8">
                        <span>)</span>
                        <input type="number" id="batch-count" placeholder="10" min="1" max="100" value="10">
                        <button id="generate-batch-btn" class="btn btn-primary">
                            <i class="fas fa-layer-group"></i> Gerar em Lote
                        </button>
                    </div>
                    
                    <div class="manual-generation">
                        <input type="text" id="custom-code-input" placeholder="Digite o código personalizado" maxlength="12" required>
                        <button id="create-manual-code-btn" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Criar Código Manual
                        </button>
                    </div>
                </div>
                
                <!-- Filtros Avançados para Códigos -->
                <div class="advanced-filters ck-card-pad-mb">
                    <div class="ck-flex-between-15">
                        <h3 class="ck-card-title">
                            <i class="fas fa-filter"></i> Filtros Avançados
                        </h3>
                        <button id="toggle-advanced-filters-codes" class="btn btn-secondary ck-btn-sm">
                            <i class="fas fa-chevron-down"></i> Mostrar
                        </button>
                    </div>
                    <div id="advanced-filters-content-codes">
                        <div>
                            <label class="ck-label-block">Status</label>
                            <select class="ck-input-admin" id="filter-code-status">
                                <option value="">Todos</option>
                                <option value="available">Disponível</option>
                                <option value="used">Utilizado</option>
                            </select>
                        </div>
                        <div>
                            <label class="ck-label-block">Gerado por</label>
                            <input class="ck-input-admin" type="text" id="filter-code-generator" placeholder="Email do gerador">
                        </div>
                        <div>
                            <label class="ck-label-block">Data de Criação (De)</label>
                            <input class="ck-input-admin" type="date" id="filter-code-created-from">
                        </div>
                        <div>
                            <label class="ck-label-block">Data de Criação (Até)</label>
                            <input class="ck-input-admin" type="date" id="filter-code-created-to">
                        </div>
                        <div class="ck-flex-end-gap">
                            <button id="apply-advanced-filters-codes" class="btn btn-primary ck-flex-1">
                                <i class="fas fa-check"></i> Aplicar Filtros
                            </button>
                            <button id="clear-advanced-filters-codes" class="btn btn-secondary">
                                <i class="fas fa-times"></i> Limpar
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Filtros rápidos: Cadastrados / Não cadastrados -->
                <div class="expiration-filters codes-quick-filters ck-mb-12" role="group" aria-label="Filtro por uso do código">
                    <span class="ck-label-dark">Exibir:</span>
                    <button type="button" id="code-filter-all-btn" class="btn btn-secondary filter-btn active" data-code-filter="all">
                        <i class="fas fa-list"></i> Todos
                    </button>
                    <button type="button" id="code-filter-claimed-btn" class="btn btn-secondary filter-btn" data-code-filter="claimed" title="Códigos já utilizados (cadastro com e-mail)">
                        <i class="fas fa-user-check"></i> Cadastrados (com e-mail)
                    </button>
                    <button type="button" id="code-filter-available-btn" class="btn btn-secondary filter-btn" data-code-filter="available" title="Códigos criados mas ainda não utilizados">
                        <i class="fas fa-key"></i> Não cadastrados (disponíveis)
                    </button>
                </div>
                
                <!-- Indicador de filtros ativos (códigos) -->
                <div id="codes-filters-active-bar" class="filters-active-bar" style="display: none; margin-bottom: 12px; padding: 10px 14px; background: rgba(255,199,0,0.08); border: 1px solid var(--primary); border-radius: 8px; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <span class="ck-text-light-09" id="codes-filters-active-text"></span>
                    <button type="button" id="codes-clear-all-filters-btn" class="btn btn-secondary ck-btn-sm">
                        <i class="fas fa-times-circle"></i> Limpar todos os filtros
                    </button>
                </div>
                
                <!-- Seção de Filtros e Ações -->
                <div class="filter-actions" style="flex-wrap: wrap; gap: 10px;">
                    <label for="filter-input" class="sr-only">Filtrar códigos por código, link ou e-mail</label>
                    <input type="text" id="filter-input" placeholder="Filtrar por código, link ou e-mail (Enter para buscar)" aria-label="Filtrar códigos" autocomplete="off">
                    
                    <button id="copy-filtered-links-btn" class="btn btn-secondary" aria-label="Copiar links dos códigos filtrados">
                        <i class="fas fa-copy"></i> Copiar links filtrados
                    </button>
                    <button id="export-all-codes-btn" class="btn btn-secondary" aria-label="Exportar todos os códigos">
                        <i class="fas fa-file-export"></i> Exportar Todos
                    </button>
                    <div class="ck-flex-wrap-12">
                        <div id="codes-count" class="selected-count ck-m-0" aria-live="polite">0 códigos</div>
                        <span class="ck-text-dark-09" id="codes-page-range"></span>
                    </div>
                    <div class="dropdown-columns-wrap">
                        <button type="button" id="codes-columns-toggle" class="btn btn-secondary ck-btn-sm" aria-haspopup="true" aria-expanded="false" aria-label="Mostrar ou ocultar colunas">
                            <i class="fas fa-columns"></i> Colunas
                        </button>
                        <div id="codes-columns-dropdown" class="dropdown-columns ck-hidden" role="menu" aria-label="Colunas visíveis"></div>
                    </div>
                    <label style="color: var(--text-dark); font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
                        <span>Itens por página:</span>
                        <select class="ck-input-sm" id="codes-per-page" aria-label="Itens por página">
                            <option value="25">25</option>
                            <option value="50" selected>50</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                            <option value="all">Todos</option>
                        </select>
                    </label>
                    <button id="copy-selected-btn" class="btn btn-secondary" aria-label="Copiar códigos selecionados">
                        <i class="fas fa-check"></i> Copiar códigos selecionados
                    </button>
                    <button id="delete-selected-btn" class="btn btn-danger" aria-label="Deletar códigos selecionados">
                        <i class="fas fa-trash"></i> Deletar selecionados
                    </button>
                    <button type="button" onclick="selectNext10()" class="btn btn-secondary" aria-label="Selecionar mais 10">
                        <i class="fas fa-plus"></i> Selecionar +10
                    </button>
                    <div id="selected-count" class="selected-count" aria-live="polite">0 selecionados</div>
                </div>
            </div>
            
            <!-- Legenda de cores (vencimento) -->
            <div class="codes-legend" style="display: flex; align-items: center; gap: 16px; margin-bottom: 10px; font-size: 0.85rem; color: var(--text-dark); flex-wrap: wrap;">
                <span><span class="legend-dot" style="background: #2ecc71;"></span> Em dia / Sem expiração</span>
                <span><span class="legend-dot" style="background: #f39c12;"></span> Vence em até 30 dias</span>
                <span><span class="legend-dot" style="background: #e74c3c;"></span> Vencido</span>
            </div>
            
            <!-- Loading e Tabela de Códigos -->
            <div id="codes-table-loading" class="table-loading-overlay ck-hidden" aria-hidden="true">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary);"></i>
                <span>Carregando...</span>
            </div>
            <div class="table-container" id="codes-table-container">
                <table id="codes-table" role="grid" aria-label="Lista de códigos de registro">
                    <thead>
                        <tr>
                            <th class="th-checkbox"><input type="checkbox" id="select-all-codes" title="Selecionar todos desta página" aria-label="Selecionar todos os códigos desta página"></th>
                            <th data-col="num">#</th>
                            <th data-col="code">Código</th>
                            <th data-col="link">Link</th>
                            <th data-col="status">Status</th>
                            <th data-col="expiration_status">Status Vencimento</th>
                            <th data-col="expires_at">Expira em</th>
                            <th data-col="claimed_by">Utilizado por</th>
                            <th data-col="claimed_at">Data de Utilização</th>
                            <th data-col="generated_by">Gerado por</th>
                            <th data-col="created_at">Data de Criação</th>
                            <th data-col="time_since">Tempo desde Criação</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
            <div id="codes-empty-state" class="table-empty-state ck-hidden">
                <i class="fas fa-search" aria-hidden="true"></i>
                <h4>Nenhum código encontrado</h4>
                <p>Não há resultados para os filtros ou busca atuais. Tente outros termos ou limpe os filtros.</p>
                <button type="button" id="codes-empty-state-clear-btn" class="btn btn-primary"><i class="fas fa-times-circle"></i> Limpar filtros</button>
            </div>
            
            <!-- Paginação para Códigos -->
            <nav id="codes-pagination" class="pagination ck-flex-center-pad" aria-label="Paginação da lista de códigos">
                <button id="codes-prev-page" class="btn btn-secondary" disabled aria-label="Página anterior">
                    <i class="fas fa-chevron-left" aria-hidden="true"></i> Anterior
                </button>
                <span class="ck-text-light-bold" id="codes-page-info" aria-live="polite">Página 1 de 1</span>
                <button id="codes-next-page" class="btn btn-secondary" disabled aria-label="Próxima página">
                    Próxima <i class="fas fa-chevron-right" aria-hidden="true"></i>
                </button>
            </nav>
        </section>
        </main>
    </div>
    <!-- Modal de Detalhes de Analytics do Perfil -->
    <div id="profile-analytics-modal" class="modal-overlay">
        <div class="modal-content" style="max-width: 1200px; max-height: 95vh; overflow-y: auto;">
            <div class="modal-header" style="position: sticky; top: 0; background: var(--bg-light); z-index: 10; border-bottom: 1px solid var(--border-color); padding-bottom: 16px; margin-bottom: 16px;">
                <h4 id="profile-analytics-title">Detalhes de Analytics</h4>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <select id="analytics-period-selector" style="padding: 8px 12px; background: var(--bg-dark); border: 1px solid var(--border-color); color: var(--text); border-radius: 6px; font-size: 0.9rem;">
                        <option value="7">últimos 7 dias</option>
                        <option value="30" selected>últimos 30 dias</option>
                        <option value="90">últimos 90 dias</option>
                        <option value="365">último ano</option>
                    </select>
                    <button id="close-profile-analytics-btn" class="close-btn">&times;</button>
                </div>
            </div>
            <div class="modal-body">
                <div id="profile-analytics-content">
                    <p class="ck-text-dark-center">Carregando detalhes...</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Dashboard do Usuário (Admin - visão completa por cliente) -->
    <div id="admin-user-dashboard-modal" class="modal-overlay">
        <div class="modal-content" style="max-width: 1000px; max-height: 95vh; overflow-y: auto;">
            <div class="modal-header" style="position: sticky; top: 0; background: var(--bg-light); z-index: 10; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 12px;">
                <h4 id="admin-user-dashboard-title">Dashboard do usuário</h4>
                <button id="close-admin-user-dashboard-btn" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <div id="admin-user-dashboard-content">
                    <p class="ck-text-dark-center">Carregando...</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal de Configuração de Exclusão Automática -->
    <div id="auto-delete-modal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h4>Configurar Exclusão Automática de Usuários</h4>
                <button id="close-auto-delete-modal-btn" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
                <p style="color: var(--text-dark); margin-bottom: 20px;">
                    Configure a exclusão automática de usuários vencidos. Os usuários serão excluídos após X dias da data de expiração da assinatura.
                </p>
                <div id="auto-delete-configs-list"></div>
                <div class="input-group" style="margin-top: 20px;">
                    <label for="new-auto-delete-days">Dias após expiração para excluir:</label>
                    <input type="number" id="new-auto-delete-days" min="1" placeholder="60" class="modal-input-text">
                </div>
                <div class="input-group">
                    <label>
                        <input type="checkbox" id="new-auto-delete-active"> Ativar exclusão automática
                    </label>
                </div>
                <button id="save-auto-delete-config-btn" class="btn btn-primary" style="margin-top: 15px;">
                    <i class="fas fa-save"></i> Salvar Configuração
                </button>
            </div>
        </div>
    </div>

    <div id="user-modal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h4 id="modal-title">Gerenciar Usuário</h4>
                <button id="close-modal-btn" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
    <form id="user-form">
        <input type="hidden" id="modal-user-id">

        <div class="input-group">
            <label for="modal-user-email">E-mail do Usuário</label>
            <input type="email" id="modal-user-email" class="modal-input-text" required>
        </div>

        <div class="input-group">
            <label for="modal-account-type">Plano da Conta</label>
            <select id="modal-account-type">
                <option value="adm_principal">ADM Principal (todos os módulos)</option>
                <option value="basic">King Start (R$ 700)</option>
                <option value="premium">King Prime (R$ 1.000)</option>
                <option value="king_base">King Base (R$ 1.500)</option>
                <option value="king_finance">King Finance (R$ 1.700)</option>
                <option value="king_finance_plus">King Finance Plus (R$ 2.000)</option>
                <option value="king_premium_plus">King Premium Plus (R$ 2.200)</option>
                <option value="king_corporate">King Corporate (R$ 2.300)</option>
                <option value="team_member">Membro de Equipe</option>
            </select>
        </div>

        <div class="input-group ck-hidden" id="max-invites-group">
            <label for="modal-max-invites">Máximo de Convites</label>
            <input type="number" id="modal-max-invites" class="modal-input-text" min="0">
        </div>

        <div class="input-group">
            <label for="modal-subscription-status">Status da Assinatura</label>
            <select id="modal-subscription-status">
                <option value="">Nenhum</option>
                <option value="active">Ativo</option>
                <option value="expired">Expirado</option>
            </select>
        </div>

        <div class="input-group">
            <label for="modal-expires-at">Data de Expiração</label>
            <input type="date" id="modal-expires-at" class="modal-input-text">
        </div>

        <div class="input-group">
            <label for="modal-profile-slug">Slug público (Informações)</label>
            <input type="text" id="modal-profile-slug" class="modal-input-text" readonly tabindex="-1" style="opacity:.85;cursor:default;">
            <small class="ck-hint">Só leitura — o cliente altera isto no painel (Informações). Ex.: adrianokingg</small>
        </div>

        <div class="input-group">
            <label for="modal-activation-code">Código de ativação / pulseira (camuflado)</label>
            <input type="text" id="modal-activation-code" class="modal-input-text" maxlength="32" placeholder="Ex: ADRIANO-KING" autocomplete="off">
            <small class="ck-hint">Vai na tag NFC. Redireciona para o slug público acima (não o substitui).</small>
        </div>

        <div class="input-group">
            <label for="modal-is-admin">Permissão de Administrador</label>
            <select id="modal-is-admin">
                <option value="true">Sim</option>
                <option value="false" selected>Não</option>
            </select>
        </div>
    </form>
</div>
<div class="modal-footer">
    <button id="delete-user-btn" class="btn btn-danger">Deletar Usuário</button>
    <button id="save-user-btn" class="btn btn-primary">Salvar Alterações</button>
</div>
        </div>
    </div>
    <script src="/config.js?v=2026-09-09-vite1"></script>
</body>
</html>
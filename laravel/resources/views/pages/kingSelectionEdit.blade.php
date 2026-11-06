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
    html, body {
      background-color: #07080a !important;
      color: #ffffff !important;
      margin: 0;
      font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, sans-serif;
    }
    .ks-top {
      background: linear-gradient(135deg, #060709 0%, #0e0f14 50%, #15120c 100%) !important;
      border-bottom: 1px solid rgba(245, 158, 11, 0.28) !important;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.85), 0 1px 0 0 rgba(245, 158, 11, 0.18) !important;
    }
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
    .ks-search {
      border: 1px solid rgba(245, 158, 11, 0.3) !important;
      background: rgba(15, 16, 22, 0.85) !important;
      color: #ffffff !important;
      border-radius: 14px !important;
    }
    .ks-search:focus {
      border-color: #f59e0b !important;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2) !important;
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
    <div style="max-width: 1350px; margin: 0 auto; padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; gap: 14px;">
      
      <!-- Lado Esquerdo: Hambúrguer + Logo Conecta King + KingSelection -->
      <div style="display: flex; align-items: center; gap: 12px;">
        <button id="ks-btn-hamburger" type="button"
          style="padding: 8px 10px; border-radius: 12px; color: #fbbf24; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.3); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease;"
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

      <!-- Lado Direito: User Pill + Voltar + Nova Galeria -->
      <div style="display: flex; align-items: center; gap: 10px;">
        <span id="ks-user-pill" style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px; background: rgba(0, 0, 0, 0.75); border: 1px solid rgba(245, 158, 11, 0.3); font-size: 11px;">
          <span style="width: 22px; height: 22px; border-radius: 9999px; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.4); color: #fbbf24; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 10px;">CK</span>
          <span style="font-weight: 800; color: rgba(253, 230, 138, 0.95); letter-spacing: 0.08em;">CONECTA KING</span>
        </span>

        <button class="ks-btn secondary" id="ks-back-btn" style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.15); color: #e2e8f0; font-weight: 800; border-radius: 12px; padding: 9px 15px; cursor: pointer;" title="Voltar ao Painel Geral">
          <i class="fas fa-arrow-left"></i> Voltar
        </button>

        <button class="ks-btn primary" id="ks-new-btn" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000; font-weight: 900; border: 1px solid rgba(251, 191, 36, 0.6); box-shadow: 0 0 15px rgba(245, 158, 11, 0.25); border-radius: 12px; padding: 9px 16px; cursor: pointer;" title="Criar Nova Galeria">
          <i class="fas fa-plus"></i> Nova Galeria
        </button>
      </div>

    </div>
  </div>

  <!-- Menu Lateral Retrátil do Hambúrguer (Conecta King) -->
  <div id="ks-menu-overlay" style="display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(4px); z-index: 100; opacity: 0; transition: opacity 0.2s ease;"></div>
  <aside id="ks-menu-drawer" style="position: fixed; top: 0; bottom: 0; left: 0; width: 300px; max-width: 85vw; background: #0c0d12; border-right: 1px solid rgba(245, 158, 11, 0.25); z-index: 101; transform: translateX(-100%); transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; box-shadow: 5px 0 35px rgba(0, 0, 0, 0.85);">
    
    <!-- Topo do Menu -->
    <div style="padding: 18px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: space-between; background: linear-gradient(to right, rgba(245, 158, 11, 0.08), transparent);">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 32px; height: 32px; border-radius: 10px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); display: flex; align-items: center; justify-content: center; padding: 3px;">
          <img src="https://i.ibb.co/60sW9k75/logo.png" alt="Conecta King" style="width: 100%; height: 100%; object-fit: contain;" />
        </div>
        <div>
          <div style="font-weight: 900; font-size: 15px; color: #fff; letter-spacing: -0.01em;">KingSelection</div>
          <div style="font-size: 10px; color: #f59e0b; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">Menu de Ações</div>
        </div>
      </div>
      <button id="ks-menu-close" type="button" style="width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(255, 255, 255, 0.04); color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <!-- Corpo do Menu com Ações -->
    <div style="padding: 16px 14px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
      
      <!-- Ação Principal: Nova Galeria -->
      <button id="ks-menu-new-btn" type="button"
        style="width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.15) 100%); border: 1px solid rgba(245, 158, 11, 0.4); color: #fde68a; font-weight: 800; font-size: 13px; cursor: pointer; text-align: left; transition: all 0.15s ease;">
        <span style="width: 28px; height: 28px; border-radius: 8px; background: rgba(245, 158, 11, 0.25); color: #fbbf24; display: flex; align-items: center; justify-content: center; font-size: 13px;">
          <i class="fas fa-plus"></i>
        </span>
        <span>Nova Galeria</span>
      </button>

      <div style="font-size: 10px; font-weight: 800; color: rgba(255, 255, 255, 0.35); text-transform: uppercase; letter-spacing: 0.15em; margin: 12px 6px 4px;">
        Navegação
      </div>

      <!-- Item: Meus Projetos (Ativo) -->
      <a href="/kingSelection"
        style="display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 10px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); color: #fbbf24; font-weight: 800; font-size: 13px; text-decoration: none;">
        <span style="width: 28px; height: 28px; border-radius: 8px; background: rgba(245, 158, 11, 0.2); color: #fbbf24; display: flex; align-items: center; justify-content: center; font-size: 12px;">
          <i class="fas fa-folder-open"></i>
        </span>
        <span>Meus Projetos / Galerias</span>
      </a>

      <!-- Item: Voltar ao Painel Geral -->
      <button id="ks-menu-back-btn" type="button"
        style="width: 100%; display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07); color: #cbd5e1; font-weight: 700; font-size: 13px; cursor: pointer; text-align: left; transition: all 0.15s ease;">
        <span style="width: 28px; height: 28px; border-radius: 8px; background: rgba(255, 255, 255, 0.06); color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 12px;">
          <i class="fas fa-arrow-left"></i>
        </span>
        <span>Voltar ao Painel Geral</span>
      </button>

      <!-- Item: Atualizar Galerias -->
      <button id="ks-menu-refresh-btn" type="button"
        style="width: 100%; display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07); color: #cbd5e1; font-weight: 700; font-size: 13px; cursor: pointer; text-align: left; transition: all 0.15s ease;">
        <span style="width: 28px; height: 28px; border-radius: 8px; background: rgba(255, 255, 255, 0.06); color: #94a3b8; display: flex; align-items: center; justify-content: center; font-size: 12px;">
          <i class="fas fa-rotate"></i>
        </span>
        <span>Atualizar Galerias</span>
      </button>

      <div style="font-size: 10px; font-weight: 800; color: rgba(255, 255, 255, 0.35); text-transform: uppercase; letter-spacing: 0.15em; margin: 12px 6px 4px;">
        Suporte & Ajuda
      </div>

      <!-- Item: Suporte WhatsApp -->
      <a href="https://wa.me/5581997323674?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20KingSelection" target="_blank" rel="noopener noreferrer"
        style="display: flex; align-items: center; gap: 12px; padding: 11px 14px; border-radius: 10px; background: rgba(37, 211, 102, 0.08); border: 1px solid rgba(37, 211, 102, 0.25); color: #86efac; font-weight: 700; font-size: 13px; text-decoration: none;">
        <span style="width: 28px; height: 28px; border-radius: 8px; background: rgba(37, 211, 102, 0.2); color: #4ade80; display: flex; align-items: center; justify-content: center; font-size: 13px;">
          <i class="fab fa-whatsapp"></i>
        </span>
        <span>Suporte WhatsApp</span>
      </a>

    </div>

    <!-- Rodapé do Menu Lateral -->
    <div style="padding: 14px 18px; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; color: rgba(255, 255, 255, 0.4); display: flex; align-items: center; justify-content: space-between;">
      <span>Conecta King © 2026</span>
      <span style="padding: 2px 8px; border-radius: 6px; background: rgba(245, 158, 11, 0.15); color: #fbbf24; font-size: 10px; font-weight: 800;">PRO</span>
    </div>
  </aside>

  <div class="ks-wrap">
    <div class="ks-topbar">
      <div class="ck-kse-9ec9e5">
        <i class="fas fa-search ks-search-ico" aria-hidden="true"></i>
        <input id="ks-search" class="ks-search" placeholder="Procurar projeto, cliente ou slug..." autocomplete="off" />
      </div>
    </div>
    <div class="ks-kanban" id="ks-kanban"></div>
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

  <script>
    (function () {
      const btnBurger = document.getElementById('ks-btn-hamburger');
      const drawer = document.getElementById('ks-menu-drawer');
      const overlay = document.getElementById('ks-menu-overlay');
      const closeBtn = document.getElementById('ks-menu-close');

      function openMenu() {
        if (!drawer || !overlay) return;
        overlay.style.display = 'block';
        requestAnimationFrame(() => {
          overlay.style.opacity = '1';
          drawer.style.transform = 'translateX(0)';
        });
      }

      function closeMenu() {
        if (!drawer || !overlay) return;
        overlay.style.opacity = '0';
        drawer.style.transform = 'translateX(-100%)';
        setTimeout(() => {
          overlay.style.display = 'none';
        }, 220);
      }

      btnBurger?.addEventListener('click', openMenu);
      overlay?.addEventListener('click', closeMenu);
      closeBtn?.addEventListener('click', closeMenu);

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
      });

      document.getElementById('ks-menu-new-btn')?.addEventListener('click', () => {
        closeMenu();
        document.getElementById('ks-new-btn')?.click();
      });

      document.getElementById('ks-menu-back-btn')?.addEventListener('click', () => {
        closeMenu();
        document.getElementById('ks-back-btn')?.click();
      });

      document.getElementById('ks-menu-refresh-btn')?.addEventListener('click', () => {
        location.reload();
      });
    })();
  </script>
</body>
</html>


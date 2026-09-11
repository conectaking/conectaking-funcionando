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
  <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
  @vite(['resources/css/fontawesome.css', 'resources/css/app.css', 'resources/js/pages/kingSelectionEdit.js'])
</head>
<body>
  <div class="ks-header">
    <div class="ck-kse-8cc3d9">
      <div>
        <div class="ks-title"><i class="fas fa-check-double"></i> KingSelection <span class="ks-small" id="ks-itemid"></span></div>
        <div class="ks-sub">Workspace . Galerias</div>
      </div>
      <div class="ks-actions">
        <button class="ks-btn secondary" id="ks-back-btn"><i class="fas fa-arrow-left"></i> Voltar</button>
        <button class="ks-btn primary" id="ks-new-btn"><i class="fas fa-plus"></i> Nova Galeria</button>
      </div>
    </div>
  </div>

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
            <option value="public">Pblico (sem login)</option>
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

  <script src="/config.js?v=2026-09-10-apex1"></script>
</body>
</html>


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
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
  <style>
    :root{
      --ks-accent:#facc15;
      --ks-bg:#000000;
      --ks-card:rgba(10,10,10,.78);
      --ks-line:rgba(255,255,255,.10);
      --ks-text:#ffffff;
      --ks-muted:rgba(255,255,255,.55);
      --ks-glow:0 0 18px rgba(250,204,21,.22);
    }
    body {
      margin: 0;
      color: var(--ks-text);
      background:
        radial-gradient(900px 520px at 18% 0%, rgba(250,204,21,.12), transparent 62%),
        radial-gradient(800px 520px at 88% 0%, rgba(255,255,255,.06), transparent 62%),
        var(--ks-bg);
    }
    /* Fundo "sistema" sutil (preenche vazio) */
    body:before{
      content:"";
      position:fixed;
      inset:0;
      pointer-events:none;
      background:
        radial-gradient(900px 520px at 20% 10%, rgba(250,204,21,.10), transparent 62%),
        linear-gradient(to bottom, rgba(255,255,255,.03), transparent 25%, transparent 75%, rgba(255,255,255,.02)),
        repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 46px),
        repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 46px);
      opacity:.10;
      mix-blend-mode:screen;
      z-index:0;
    }
    .ks-wrap,.ks-header,.ks-drawer,.ks-modal{position:relative;z-index:1}
    .ks-header{
      position:sticky;top:0;z-index:20;
      display:flex;align-items:center;justify-content:space-between;gap:12px;
      padding:16px 22px;
      background:rgba(0,0,0,.86);
      backdrop-filter:blur(12px);
      border-bottom:1px solid var(--ks-line)
    }
    .ks-title{display:flex;align-items:center;gap:12px;font-weight:900;letter-spacing:.02em}
    .ks-title i{color:var(--ks-accent);filter:drop-shadow(0 0 10px rgba(250,204,21,.22))}
    .ks-sub{margin-top:2px;font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:var(--ks-muted);font-weight:900}
    .ks-actions{display:flex;gap:10px;align-items:center}
    .ks-btn{
      border:1px solid var(--ks-line);
      border-radius:12px;
      padding:10px 14px;
      font-weight:900;
      cursor:pointer;
      background:rgba(255,255,255,.03);
      color:var(--ks-text);
      transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease, filter .15s ease;
      letter-spacing:.10em;
      text-transform:uppercase;
      font-size:11px;
      display:inline-flex;
      align-items:center;
      gap:8px;
      justify-content:center;
      white-space:nowrap;
    }
    .ks-btn:hover{transform:translateY(-1px);border-color:rgba(255,255,255,.16);box-shadow:0 18px 60px rgba(0,0,0,.45)}
    .ks-btn:active{transform:translateY(0)}
    .ks-btn.primary{
      background:var(--ks-accent);
      color:#000;
      border-color:rgba(250,204,21,.55);
      box-shadow:0 0 0 3px rgba(250,204,21,.10), 0 18px 70px rgba(0,0,0,.42);
    }
    .ks-btn.primary:hover{filter:saturate(1.05) brightness(1.02)}
    .ks-btn.secondary{background:rgba(255,255,255,.03);color:var(--ks-text);border:1px solid var(--ks-line)}
    .ks-wrap{max-width:1200px;margin:0 auto;padding:20px}
    .ks-topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 0 14px}
    .ks-search{
      width:100%;
      border:1px solid rgba(250,204,21,.22);
      border-radius:16px;
      padding:14px 14px 14px 44px;
      background:rgba(255,255,255,.03);
      color:#fff;
      outline:none;
      font-size:16px; /* iOS */
      box-shadow:0 0 10px rgba(250,204,21,.10);
    }
    .ks-search::placeholder{color:rgba(255,255,255,.35)}
    .ks-search:focus{border-color:rgba(250,204,21,.45);box-shadow:0 0 0 3px rgba(250,204,21,.10), 0 0 14px rgba(250,204,21,.16)}
    .ks-search-ico{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--ks-accent);opacity:.85}
    .ks-kanban{display:grid;grid-template-columns:repeat(4,minmax(220px,1fr));gap:12px}
    .ks-col{
      background:var(--ks-card);
      border:1px solid var(--ks-line);
      border-radius:16px;
      min-height:220px;
      overflow:hidden;
      position:relative;
      box-shadow:inset 0 0 18px rgba(250,204,21,.06), 0 18px 70px rgba(0,0,0,.42);
    }
    .ks-col:before{
      content:"";
      position:absolute;left:0;top:0;bottom:0;width:3px;
      background:var(--ks-accent);
      opacity:.85;
    }
    .ks-col h3{
      margin:0;
      padding:12px 14px 12px 16px;
      font-size:12px;
      letter-spacing:.22em;
      text-transform:uppercase;
      border-bottom:1px solid var(--ks-line);
      color:rgba(255,255,255,.88);
    }
    .ks-list{padding:10px;display:flex;flex-direction:column;gap:10px}
    .ks-card{
      position:relative;
      background:rgba(0,0,0,.40);
      border:1px solid rgba(255,255,255,.10);
      border-radius:14px;
      padding:12px;
      cursor:pointer;
      transition:transform .15s ease, border-color .15s ease, box-shadow .15s ease;
      display:grid;
      grid-template-columns:64px 1fr;
      gap:12px;
      align-items:center;
    }
    .ks-card:hover{border-color:rgba(250,204,21,.35);box-shadow:var(--ks-glow);transform:translateY(-1px)}
    .ks-card-del{
      position:absolute;
      top:8px;
      right:8px;
      width:32px;
      height:32px;
      border:0;
      border-radius:10px;
      background:rgba(220,38,38,.85);
      color:#fff;
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:12px;
      z-index:2;
      opacity:.9;
      transition:opacity .15s ease, transform .15s ease;
    }
    .ks-card-del:hover{opacity:1;transform:scale(1.08)}
    .ks-card-del:disabled{opacity:0.6;cursor:not-allowed}
    .ks-card .name{font-weight:950}
    .ks-card .meta{margin-top:6px;font-size:12px;color:var(--ks-muted)}
    .ks-thumb{
      width:64px;height:64px;
      border-radius:14px;
      overflow:hidden;
      border:1px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.04);
      position:relative;
      box-shadow:inset 0 0 18px rgba(250,204,21,.06);
    }
    .ks-thumb img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(1.05) contrast(1.05)}
    .ks-thumb-ph{
      position:absolute;inset:0;
      display:flex;align-items:center;justify-content:center;
      color:rgba(255,255,255,.35);
      font-size:18px;
    }
    .ks-card-main{min-width:0}
    .ks-card .name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ks-card .meta{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

    /* Overlay do drawer (mobile/desktop) */
    .ks-drawer-overlay{
      position:fixed;inset:0;
      background:rgba(0,0,0,.60);
      backdrop-filter:blur(2px);
      -webkit-backdrop-filter:blur(2px);
      z-index:29;
      display:none;
    }
    .ks-drawer-overlay.active{display:block}

    .ks-drawer{
      position:fixed;top:0;right:0;
      width:420px;max-width:92vw;height:100%;
      background:#0A0A0A;
      border-left:1px solid var(--ks-line);
      transform:translateX(105%);
      transition:.2s ease;
      z-index:30;
      display:flex;
      flex-direction:column;
    }
    .ks-drawer.active{transform:translateX(0)}
    .ks-drawer-header{
      padding:14px;
      border-bottom:1px solid var(--ks-line);
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      background:rgba(0,0,0,.65);
      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);
    }
    .ks-drawer-body{padding:14px;overflow:auto;display:flex;flex-direction:column;gap:12px}
    .ks-field{display:flex;flex-direction:column;gap:6px}
    .ks-field label{font-size:11px;color:var(--ks-muted);letter-spacing:.14em;text-transform:uppercase;font-weight:900}
    .ks-field input,.ks-field select{
      padding:12px 12px;
      border-radius:12px;
      border:1px solid var(--ks-line);
      background:rgba(255,255,255,.04);
      color:var(--ks-text);
      outline:none;
      font-size:16px; /* iOS */
    }
    /* Select: lista nativa (Chrome/Windows) vinha com fundo claro + texto claro - ilegvel */
    .ks-field select{
      color-scheme: light;
      background:#f4f4f5;
      color:#0a0a0a;
      border-color:rgba(0,0,0,.12);
    }
    .ks-field select option,
    .ks-field select optgroup{
      background-color:#fff;
      color:#0a0a0a;
      font-weight:600;
    }
    /* Reforo: valor fechado do "Tipo de acesso" sempre legvel */
    #ks-new-access{
      background:#f4f4f5 !important;
      color:#0a0a0a !important;
    }
    .ks-field input:focus,.ks-field select:focus{border-color:rgba(250,204,21,.42);box-shadow:0 0 0 3px rgba(250,204,21,.10)}
    .ks-row{display:flex;gap:10px;flex-wrap:wrap}
    .ks-row>*{flex:1;min-width:180px}
    .ks-small{font-size:12px;color:var(--ks-muted)}
    .ks-link{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;color:var(--ks-accent);word-break:break-all}
    .ks-photos{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
    .ks-photo{border:1px solid var(--ks-line);border-radius:14px;overflow:hidden;background:rgba(255,255,255,.03)}
    .ks-photo img{width:100%;height:120px;object-fit:contain;display:block}
    .ks-photo .cap{padding:8px;font-size:11px;color:var(--ks-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

    @media (max-width: 980px){ .ks-kanban{grid-template-columns:repeat(2,1fr)} }
    @media (max-width: 560px){
      .ks-wrap{padding:14px}
      .ks-header{padding:12px 14px;flex-direction:column;align-items:flex-start}
      .ks-actions{width:100%}
      .ks-actions .ks-btn{flex:1}
      /* Mobile premium: vira carrossel horizontal */
      .ks-kanban{
        display:flex;
        gap:12px;
        overflow-x:auto;
        padding-bottom:8px;
        scroll-snap-type:x mandatory;
        -webkit-overflow-scrolling:touch;
      }
      .ks-kanban::-webkit-scrollbar{display:none}
      .ks-col{min-width:min(92vw, 440px);scroll-snap-align:start}
      .ks-col h3{font-size:11px}
      .ks-card{grid-template-columns:56px 1fr}
      .ks-thumb{width:56px;height:56px;border-radius:12px}
      /* Drawer vira bottom-sheet no mobile */
      .ks-drawer{
        top:auto;bottom:0;right:0;left:0;
        width:100%;max-width:100%;
        height:min(88dvh, 780px);
        border-left:0;
        border-top:1px solid var(--ks-line);
        border-radius:18px 18px 0 0;
        transform:translateY(105%);
      }
      .ks-drawer.active{transform:translateY(0)}
      .ks-drawer-body{padding:12px}
      .ks-row>*{min-width:140px}
      .ks-photos{grid-template-columns:repeat(3,1fr)}
      .ks-photo img{height:92px}
    }

    /* Modais */
    .ks-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.65);z-index:40}
    .ks-modal.active{display:flex}
    .ks-modal-card{width:min(620px,92vw);background:#0B0B0B;border:1px solid #2C2C2F;border-radius:16px;overflow:hidden}
    .ks-modal-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px;border-bottom:1px solid #2C2C2F;background:rgba(255,255,255,.03)}
    .ks-modal-body{padding:14px}
    .ks-modal-foot{padding:14px;border-top:1px solid #2C2C2F;display:flex;gap:10px;justify-content:flex-end}
    .ks-btn.danger{background:#ef4444;color:#0B0B0B;border-color:rgba(239,68,68,.55)}
    .ks-btn.danger:hover{filter:brightness(.95)}
    .ks-btn.ghost{background:transparent;border:1px solid rgba(255,255,255,.12);color:#ECECEC}
    .ks-btn.ghost:hover{background:rgba(255,255,255,.06)}

    /* FAB no mobile */
    .ks-fab{
      position:fixed;
      right:16px;
      bottom:16px;
      width:58px;
      height:58px;
      border-radius:18px;
      background:var(--ks-accent);
      color:#000;
      border:1px solid rgba(250,204,21,.55);
      box-shadow:0 18px 60px rgba(0,0,0,.55), 0 0 20px rgba(250,204,21,.18);
      display:none;
      align-items:center;
      justify-content:center;
      cursor:pointer;
      z-index:25;
    }
    .ks-fab:active{transform:scale(.98)}
    .ks-fab-tip{
      position:absolute;
      right:0;
      top:-44px;
      background:rgba(0,0,0,.75);
      border:1px solid rgba(255,255,255,.10);
      color:#fff;
      padding:8px 10px;
      border-radius:12px;
      font-size:10px;
      font-weight:950;
      letter-spacing:.18em;
      text-transform:uppercase;
      white-space:nowrap;
      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);
    }
    @media (max-width: 560px){ .ks-fab{display:flex} }

    .ks-tabs{display:flex;gap:8px;flex-wrap:wrap}
    .ks-tab{padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);cursor:pointer;font-weight:800;font-size:12px}
    .ks-tab.active{border-color:#FFC700}
    .ks-textarea{width:100%;min-height:130px;border-radius:12px;border:1px solid #2C2C2F;background:rgba(255,255,255,.06);color:#ECECEC;padding:10px;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;font-size:12px;outline:none}

    /*
      dashboard.css fixa body/html sem rolagem (layout do workspace principal).
      Nesta página o kanban cresce em altura: precisamos de scroll vertical na janela.
    */
    html {
      overflow-y: auto !important;
      overflow-x: hidden !important;
      height: auto !important;
      max-height: none !important;
    }
    body {
      position: relative !important;
      top: auto !important;
      left: auto !important;
      right: auto !important;
      bottom: auto !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      height: auto !important;
      min-height: 100vh !important;
      max-height: none !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
    }
    .ks-wrap {
      padding-bottom: max(28px, env(safe-area-inset-bottom, 0px));
    }
  </style>
    @vite(['resources/js/pages/kingSelectionEdit.js'])
</head>
<body>
  <div class="ks-header">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%">
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
      <div style="position:relative;flex:1">
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
      <div style="font-weight:800" id="ks-drawer-title">Galeria</div>
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
        <div class="ks-small" id="ks-feedback-box" style="display:none;margin-top:8px;padding:10px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.04)"></div>
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
        <div class="ks-field" style="justify-content:flex-end">
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
        <div style="font-weight:900">Nova galeria</div>
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
            <input id="ks-new-category-custom" type="text" placeholder="Digite a categoria" autocomplete="off" style="display:none;margin-top:8px;width:100%;box-sizing:border-box" />
            <div class="ks-small" id="ks-new-category-hint" style="margin-top:6px">Escolha uma categoria ou use "Outra" para um nome personalizado.</div>
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
          <div id="ks-new-work-date" class="ks-small" style="padding:12px;border-radius:12px;border:1px solid var(--ks-line);background:rgba(255,255,255,.04);color:#fff"></div>
          <div class="ks-small" style="margin-top:6px">Preenchida automaticamente com a data de hoje ao criar (servidor).</div>
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
        <div class="ks-small" id="ks-new-access-hint" style="margin-bottom:10px"></div>
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
        <div class="ks-small" style="margin-bottom:10px">Se "Seleção mínima" não existir no banco ainda, tudo funciona como "Livre" (opcional rodar a migration depois).</div>
        <div class="ks-field" style="flex-direction:row;align-items:center;gap:12px;flex-wrap:wrap">
          <input type="checkbox" id="ks-new-watermark" checked style="width:18px;height:18px;accent-color:var(--ks-accent)" />
          <label for="ks-new-watermark" style="margin:0;text-transform:none;letter-spacing:normal;font-weight:800;font-size:13px;color:var(--ks-text)">Aplicar marca d'gua nas fotos desta galeria</label>
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
        <div style="font-weight:900">Exportar fotos</div>
        <button class="ks-btn secondary" id="ks-export-close"><i class="fas fa-times"></i></button>
      </div>
      <div class="ks-modal-body">
        <div class="ks-tabs">
          <button class="ks-tab active" data-tab="lr">Lightroom</button>
          <button class="ks-tab" data-tab="finder">Finder (Mac)</button>
          <button class="ks-tab" data-tab="win">Windows</button>
        </div>
        <div class="ks-small" style="margin-top:10px" id="ks-export-meta">-</div>
        <textarea class="ks-textarea" id="ks-export-text"></textarea>
        <div class="ks-row" style="margin-top:10px">
          <button class="ks-btn secondary" id="ks-export-copy"><i class="fas fa-copy"></i> Copiar</button>
        </div>
      </div>
    </div>
  </div>

  <script src="/config.js?v=2026-09-10-apex1"></script>
</body>
</html>


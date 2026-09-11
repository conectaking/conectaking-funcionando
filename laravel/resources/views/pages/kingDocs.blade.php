<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>King Docs — Conecta King</title>

</head>
<body>
  <div class="wrap">
    <div class="kd-top-bar kd-top-bar--minimal">
      <a href="/dashboard" class="kd-back-dashboard" id="kd-back-dashboard" title="Voltar ao painel principal">— Painel principal</a>
      <div class="kd-top-bar-actions">
        <button type="button" class="kd-theme-btn" id="kd-theme-toggle" title="Alternar tema claro/escuro">Tema escuro</button>
      </div>
    </div>

    <section class="kd-hero-card kd-hero-card--top" aria-label="Painel pessoal">
      <div class="kd-hero-top">
        <div class="kd-hero-badge">Painel pessoal</div>
        <label class="visually-hidden" for="sh-name">Nome a mostrar no link</label>
        <input type="text" id="sh-name" class="kd-hero-name" placeholder="Seu nome" autocomplete="name"/>
        <div id="kd-hero-dirty-banner" class="kd-dirty-banner kd-hero-dirty-banner" hidden>
          <span>Tens alterações por guardar no servidor.</span>
          <button type="button" class="btn" id="kd-hero-save-quick" style="font-size:.78rem;padding:.4rem .75rem">Guardar no servidor</button>
        </div>
        <p class="kd-hero-name-hint">O nome do topo e «Nome Completo» ficam iguais. Clica <strong>Guardar no servidor</strong> para gravar.</p>
        <p class="kd-hero-sub">Selecione o que quiser compartilhar e copie com um clique</p>
      </div>
    </section>

    <div class="kd-sticky-atalhos-bar">
      <div class="kd-sticky-atalhos-inner">
        <div class="kd-hero-atalhos">
        <div class="atalhos-block">
          <span class="atalhos-title">Atalhos</span>
          <div class="atalhos-btns" id="kd-atalhos-merged">
            <span class="kd-atalho-item">
              <button type="button" class="btn-atalho" data-preset="festa" title="Morada, WhatsApp e RG (ficheiro do cofre)">Festa em Casa</button>
              <button type="button" class="btn secondary kd-atalho-cog" data-edit-preset="festa" aria-label="Personalizar Festa em Casa" title="Personalizar">⚙</button>
            </span>
            <span class="kd-atalho-item">
              <button type="button" class="btn-atalho" data-preset="receberPf" title="Nome, CPF e dados bancários PF">Receber PF</button>
              <button type="button" class="btn secondary kd-atalho-cog" data-edit-preset="receberPf" aria-label="Personalizar Receber PF" title="Personalizar">⚙</button>
            </span>
            <span class="kd-atalho-item">
              <button type="button" class="btn-atalho" data-preset="receberPj" title="Empresa + dados bancários PJ">Receber PJ</button>
              <button type="button" class="btn secondary kd-atalho-cog" data-edit-preset="receberPj" aria-label="Personalizar Receber PJ" title="Personalizar">⚙</button>
            </span>
            <span class="kd-atalho-item">
              <button type="button" class="btn-atalho" data-preset="correspondencia" title="Nome e morada para envio">Correspondência</button>
              <button type="button" class="btn secondary kd-atalho-cog" data-edit-preset="correspondencia" aria-label="Personalizar Correspondência" title="Personalizar">⚙</button>
            </span>
            <span class="kd-atalho-item">
              <button type="button" class="btn-atalho" data-preset="enviarNf" title="Dados fiscais e sede">Enviar NF</button>
              <button type="button" class="btn secondary kd-atalho-cog" data-edit-preset="enviarNf" aria-label="Personalizar Enviar NF" title="Personalizar">⚙</button>
            </span>
            <span id="kd-custom-atalhos-inner" class="atalhos-btns" style="display:contents"></span>
            <button type="button" class="btn secondary" id="btn-add-custom-atalho" style="font-size:.78rem;padding:.38rem .75rem;border-radius:999px">+ Criar atalho</button>
          </div>
        </div>
        </div>
      </div>
    </div>

    <div class="kd-page-body">
    <p class="sub" id="auth-hint"></p>

    <div class="tabs" id="kd-tabs" role="tablist" aria-label="Secções King Docs">
      <button type="button" class="tab active" role="tab" aria-selected="true" aria-controls="p-dados" id="tab-p-dados" data-panel="p-dados">Dados</button>
      <button type="button" class="tab" role="tab" aria-selected="false" aria-controls="p-docs" id="tab-p-docs" data-panel="p-docs">Documentos</button>
      <button type="button" class="tab" role="tab" aria-selected="false" aria-controls="p-partilha" id="tab-p-partilha" data-panel="p-partilha">Partilhar</button>
    </div>

    <div id="p-dados" class="panel active" role="tabpanel" aria-labelledby="tab-p-dados"></div>
    <input type="file" id="doc-file-hidden" accept="image/*,.pdf,application/pdf" style="position:absolute;width:0;height:0;opacity:0;pointer-events:none" tabindex="-1" aria-hidden="true"/>

    <div id="p-docs" class="panel" role="tabpanel" aria-labelledby="tab-p-docs">
      <p class="sub">Todos os itens no <strong>mesmo estilo de cartão</strong> (ícone grande, como RG e CNH). Marca <strong>Texto</strong> e/ou <strong>Foto/PDF</strong>. Preenche os valores na aba <strong>Dados</strong>.</p>
      <div class="share-layout kd-docs-unified-layout doc-browse-layout">
        <div class="kd-docs-left-col">
          <div class="doc-panel-card">
            <div class="doc-badge" role="status"><span aria-hidden="true"><i class="fas fa-clipboard-list"></i></span> O que incluir no link</div>
            <div class="kd-docs-share-toolbar">
              <p class="kd-share-summary" id="share-confirm-hint">Marca Texto e/ou Foto/PDF nos cartões; o resumo aparece à direita.</p>
              <button type="button" class="btn secondary" id="btn-share-fields-clear" style="font-size:.74rem;flex-shrink:0">Limpar seleção</button>
            </div>
            <div class="kd-doc-vault-row">
              <div class="kd-doc-vault-grid-col">
                <p class="sub" style="margin:0 0 .5rem;font-size:.72rem">Secções: documentos, dados pessoais, contato, morada, etc. — cada um com o seu ícone. <strong>+ Novo tipo</strong> em <strong>Dados</strong>.</p>
                <div id="doc-browse-root" class="doc-grid"></div>
              </div>
              <div class="kd-doc-vault-preview-col doc-vault-preview kd-preview-unified-column" id="doc-vault-preview-wrap" aria-label="Pré-visualização: ficheiros e resumo do link">
                <div class="preview-header preview-header--vault">Pré-visualização dos ficheiros <span class="badge" id="doc-preview-sel-badge" style="display:none" aria-live="polite"></span><span class="doc-preview-drag-hint" id="doc-preview-drag-hint" style="display:none;margin-left:.35rem;opacity:.85;font-weight:600"> · Arrasta para ordenar</span></div>
                <div id="doc-preview-body" class="preview-body doc-preview-body--inline kd-preview-files-scroll">
                  <p class="preview-empty">Clica nos documentos à esquerda (podes escolher vários).</p>
                </div>
                <div class="kd-preview-resumo-block">
                  <div class="preview-header preview-header--resumo">Resumo do link <span id="preview-count" class="badge">0 itens</span></div>
                  <div id="share-preview-body" class="kd-preview-resumo-body"><p class="preview-empty">Marca Texto e/ou Foto/PDF nos cartões à esquerda.</p></div>
                </div>
                <p class="preview-footer-msg kd-preview-partilhar-hint"><span aria-hidden="true"><i class="fas fa-lightbulb"></i></span> Isto é só visualização. O URL gera-se na aba <strong>Partilhar</strong> (ou com os botões de link abaixo).</p>
                <div class="doc-preview-actions" id="doc-preview-actions">
                  <div class="doc-preview-actions-row">
                    <button type="button" class="btn secondary" id="btn-doc-clear-sel" disabled title="Limpa só a escolha dos cartões de documento à esquerda">Limpar cartões</button>
                    <button type="button" class="btn" id="btn-doc-copy-link" disabled title="Cria o link e copia — inclui tudo o que marcaste">Copiar link único</button>
                  </div>
                  <div class="doc-preview-actions-row kd-doc-act-row--wrap">
                    <button type="button" class="btn secondary" id="btn-doc-copy-plain" disabled title="Texto do resumo: nome, campos e referências a ficheiros">Copiar mensagem (tudo)</button>
                    <button type="button" class="btn secondary" id="btn-doc-copy-textonly" disabled title="Só linhas de texto dos campos (sem lista de anexos)">Copiar só texto</button>
                    <button type="button" class="btn secondary" id="btn-doc-copy-with-img" disabled title="Requer foto no topo (aba Partilhar). Se o browser não suportar, usa o botão WhatsApp abaixo">Copiar com imagem</button>
                  </div>
                  <div class="doc-preview-actions-row kd-doc-act-row--wrap">
                    <button type="button" class="btn secondary" id="btn-doc-wa-link" disabled title="Abre o WhatsApp só com o URL da partilha">WhatsApp · só link</button>
                    <button type="button" class="btn secondary" id="btn-doc-wa-text" disabled title="Mensagem só com texto (sem URL)">WhatsApp · só texto</button>
                    <button type="button" class="btn secondary" id="btn-doc-wa-text-img" disabled title="No telemóvel abre o menu Partilhar com imagem + texto. No PC o WhatsApp Web não anexa imagem pelo browser — usa PDF ou envia a foto à parte.">WhatsApp · texto + imagem</button>
                    <button type="button" class="btn secondary" id="btn-doc-wa-list" disabled title="Link único + lista dos nomes dos ficheiros escolhidos nos cartões">WhatsApp · link + lista</button>
                    <button type="button" class="btn secondary" id="btn-doc-wa-sep" disabled title="Um URL diferente para cada ficheiro dos cartões (sem misturar num só link)">WhatsApp · um link por ficheiro</button>
                  </div>
                  <div class="doc-preview-actions-row">
                    <button type="button" class="btn secondary" id="btn-doc-pdf-dl" disabled title="PDF com texto, foto e documentos — igual ao resumo completo">PDF · descarregar</button>
                    <button type="button" class="btn secondary" id="btn-doc-pdf-share" disabled title="Partilha o mesmo PDF completo (telefone: menu nativo)">PDF · enviar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="share-table-wrap" hidden aria-hidden="true" style="display:none"></div>
    <div id="extra-docs-wrap" hidden aria-hidden="true" style="display:none"></div>

    <div id="p-partilha" class="panel" role="tabpanel" aria-labelledby="tab-p-partilha">
      <div class="kd-share-head">
        <h2>Partilhar</h2>
        <p class="sub" style="margin-bottom:0">Aqui envias a <strong>foto do topo do link</strong> (upload — fica no cofre), defines <strong>prazo</strong>, <strong>senha</strong> e <strong>limite de vistas</strong>, geras o URL e geres a <strong>lista dos teus links</strong>. O que vai no link escolhes em <strong>Documentos</strong>.</p>
      </div>
      <div class="kd-trust-strip" role="note">
        <strong>Antes de gerar</strong>
        <ul>
          <li>Escolhe os campos em <strong>Documentos</strong> — o resumo aparece no mesmo painel que a pré-visualização dos ficheiros.</li>
          <li>Quem receber abre no <strong>browser</strong> (telefone ou PC).</li>
          <li>Depois de gerado, revoga ou exclui na <strong>lista abaixo</strong>.</li>
        </ul>
      </div>

      <div class="kd-models-bar">
        <span class="kd-models-title">Os teus modelos <span style="font-weight:400;text-transform:none;letter-spacing:0">(guardados neste dispositivo)</span></span>
        <div class="kd-models-row">
          <input type="text" id="kd-model-name" placeholder="Nome do modelo" maxlength="40" aria-label="Nome do modelo"/>
          <button type="button" class="btn secondary" id="btn-save-model">Guardar seleção atual</button>
        </div>
        <div class="kd-models-chips" id="kd-models-chips"></div>
      </div>

      <div class="doc-panel-card" style="margin-top:1rem">
        <div class="doc-badge" role="status"><span aria-hidden="true">T️</span> Opções do link</div>
        <p class="sub" style="margin-top:.5rem">Foto do topo do link (upload), tempo de vida e proteção; depois gera o link.</p>
        <div class="row" style="grid-template-columns: 160px 1fr; margin-bottom:.8rem;">
          <label>Foto no link</label>
          <div>
            <input type="hidden" id="sh-profile-file-id" value=""/>
            <input type="file" id="sh-profile-file" accept="image/*"/>
            <p class="kd-hint" style="margin:.35rem 0 0">A imagem é guardada no cofre (tipo <strong>FOTO PESSOAL</strong>) e aparece no topo da partilha — não precisas de URL.</p>
            <div id="sh-profile-preview-wrap" style="display:none;margin-top:.5rem"></div>
            <button type="button" class="btn secondary" id="sh-profile-clear" style="display:none;margin-top:.4rem;font-size:.78rem">Remover foto do link</button>
          </div>
        </div>
        <div style="display:grid; gap:.6rem; max-width: 420px;">
          <div class="row" style="grid-template-columns: 160px 1fr;">
            <label>Expira em (horas)</label>
            <input type="number" id="sh-hours" value="24" min="1" max="720"/>
          </div>
          <div class="row" style="grid-template-columns: 160px 1fr;">
            <label>Senha (opcional)</label>
            <input type="password" id="sh-pass" placeholder="Vazio = sem senha"/>
          </div>
          <div class="row" style="grid-template-columns: 160px 1fr; align-items: start;">
            <label>Máx. visualizações</label>
            <div>
              <input type="number" id="sh-maxv" placeholder="Vazio = ilimitado" min="1" aria-describedby="hint-maxv"/>
              <p class="kd-hint" id="hint-maxv">Coloca <strong>1</strong> para um link de <strong>uso único</strong> (fecha após a primeira abertura bem-sucedida).</p>
            </div>
          </div>
        </div>
        <p style="margin-top:1rem;"><button type="button" class="btn" id="btn-create-link">Gerar link seguro</button></p>
        <div id="share-out"></div>
      </div>

      <div class="doc-panel-card" style="margin-top:1.25rem">
        <div class="doc-badge" role="status"><span aria-hidden="true">Y"-</span> Os meus links</div>
        <p class="sub" style="margin-top:.5rem">Copia, partilha, <strong>revoga</strong> (invalida) ou <strong>exclui</strong> (remove da lista). <strong>Expirados</strong> ou <strong>revogados</strong> deixam de abrir.</p>
        <div class="kd-links-bulk">
          <button type="button" class="btn secondary" id="btn-links-revoke-sel">Revogar selecionados</button>
          <button type="button" class="btn bad" id="btn-links-delete-sel">Excluir selecionados</button>
          <p class="kd-links-bulk-hint">Marca as linhas à esquerda. <strong>Revogar</strong> mantém o registo como revogado; <strong>Excluir</strong> apaga o registo (não volta a aparecer).</p>
        </div>
        <div class="kd-filter-links">
          <label for="links-filter" class="visually-hidden">Filtrar lista</label>
          <input type="search" id="links-filter" placeholder="Filtrar por ID, estado ou data—" autocomplete="off"/>
        </div>
        <div id="links-list"></div>
      </div>
    </div>
    </div>

    <div id="kd-load-overlay" class="kd-load-overlay" aria-hidden="true" aria-busy="true">
      <div class="kd-load-spinner" aria-hidden="true"></div>
      <p class="kd-load-text">A carregar o teu cofre—</p>
    </div>
    <div id="kd-toast-host" aria-live="polite" aria-relevant="additions"></div>

    <div id="kd-qr-modal" class="kd-modal" aria-hidden="true">
      <div class="kd-modal-backdrop" id="kd-qr-backdrop"></div>
      <div class="kd-modal-box" role="dialog" aria-modal="true" aria-labelledby="kd-qr-title">
        <h3 id="kd-qr-title">QR Code do link</h3>
        <p class="sub" style="margin:0 0 .5rem">Escaneia com o telemóvel. Trata o link como confidencial.</p>
        <div id="kd-qr-wrap"></div>
        <p style="margin:0"><button type="button" class="btn secondary" id="kd-qr-close">Fechar</button></p>
      </div>
    </div>

    <div id="kd-shortcut-modal" class="kd-modal" aria-hidden="true">
      <div class="kd-modal-backdrop" id="kd-shortcut-backdrop"></div>
      <div class="kd-modal-box kd-modal-box--wide kd-modal-box--xlarge" role="dialog" aria-modal="true" aria-labelledby="kd-shortcut-title">
        <h3 id="kd-shortcut-title">Novo atalho</h3>
        <p class="sub" style="margin:0 0 .75rem">Define o <strong>nome</strong> e o que entra no atalho (campos e documentos). Isto fica guardado neste dispositivo.</p>
        <input type="hidden" id="kd-sc-edit-id" value=""/>
        <div class="kd-modal-field">
          <label for="kd-sc-name">Nome do atalho</label>
          <input type="text" id="kd-sc-name" maxlength="32" placeholder="Ex.: Meu cliente X"/>
        </div>
        <div class="kd-modal-field kd-sc-emoji-field">
          <label for="kd-emoji-toggle">Ícone</label>
          <div class="kd-emoji-picker-row">
            <span class="kd-emoji-preview" id="kd-sc-emoji-preview" title="Ícone escolhido">Y"O</span>
            <input type="hidden" id="kd-sc-emoji" value="Y"O"/>
            <button type="button" class="btn secondary kd-emoji-toggle" id="kd-emoji-toggle" aria-expanded="false" aria-controls="kd-emoji-popover">Escolher ícone—</button>
          </div>
          <div id="kd-emoji-popover" class="kd-emoji-popover" hidden>
            <p class="kd-emoji-popover-hint">Escolhe um emoji abaixo ou escreve/cola outro no fim.</p>
            <div class="kd-emoji-grid" id="kd-emoji-grid" role="listbox" aria-label="Emojis para o atalho"></div>
            <div class="kd-emoji-manual-wrap">
              <label for="kd-sc-emoji-manual">Outro emoji (colar ou teclado)</label>
              <input type="text" id="kd-sc-emoji-manual" class="kd-emoji-manual-input" maxlength="8" placeholder="ex.: ⭐ ou combinação" autocomplete="off"/>
            </div>
          </div>
        </div>
        <div class="kd-modal-field">
          <label for="kd-sc-img">Foto / ícone (opcional, máx. ~80 KB)</label>
          <input type="file" id="kd-sc-img" accept="image/*"/>
        </div>
        <p class="group" style="margin:.5rem 0 .35rem;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">O que o atalho inclui (texto / ficheiro por campo)</p>
        <div class="kd-sc-modal-scroll" id="kd-sc-modal-scroll">
          <div class="share-grid" id="kd-sc-share-grid"></div>
          <h3 class="group" style="margin-top:.85rem;font-size:.78rem;">Documentos extra (só ficheiro)</h3>
          <div id="kd-sc-extra-docs"></div>
        </div>
        <p class="kd-hint" style="margin:.35rem 0 0">Ao abrir, copiamos a seleção atual da página para editares. Podes <strong>substituir tudo</strong> marcando outra combinação.</p>
        <div class="kd-modal-actions kd-sc-actions">
          <button type="button" class="btn bad" id="kd-sc-delete" hidden>Excluir</button>
          <span class="kd-sc-actions-fill" aria-hidden="true"></span>
          <button type="button" class="btn secondary" id="kd-sc-cancel">Cancelar</button>
          <button type="button" class="btn" id="kd-sc-save">Guardar atalho</button>
        </div>
      </div>
    </div>
  </div>

  
    <script src="/config.js?v=2026-09-09-vite1"></script>
    @vite(['resources/js/pages/kingDocs.js'])
</body>
</html>

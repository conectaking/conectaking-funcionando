<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
  <title>King Selection - Galeria</title>
  @isset($ksBootScript)
    {!! $ksBootScript !!}
  @endisset
  <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png" />
  <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png" />
  </head>
<body>
  <!-- Capa do evento (modo público, configurvel no painel) -->
  <div id="ks-entry-splash" class="ks-hidden ck-ksc-2a62e7" aria-hidden="true">
    <div class="ck-ksc-ebdcc5">
      <div class="ck-ksc-27dfeb">
        <img class="ck-ksc-bd76eb" id="ks-entry-splash-img" src="" alt="Capa do evento" loading="eager" decoding="async" />
      </div>
      <p class="ck-ksc-e20226" id="ks-entry-splash-title"></p>
    </div>
    <div class="ck-ksc-e93e41">
      <button type="button" id="ks-entry-splash-btn" class="ks-btn ks-btn-yellow ck-ksc-4322b5">
        <i class="fas fa-images"></i> Ver fotos
      </button>
    </div>
  </div>

  <!-- Cadastro rápido só ao tentar baixar (modo público + download liberado pelo fotógrafo) -->
  <div id="ks-modal-public-dl" class="ks-hidden ck-ksc-9c9993" aria-hidden="true">
    <div class="ck-ksc-54db82">
      <h2 class="ck-ksc-b6b8df">Cadastro para liberar download</h2>
      <p class="ks-muted ck-ksc-b9e86d">
        O fotógrafo liberou baixar com marca d'água. Preencha para continuar - a senha é gerada e mostrada ao concluir.
      </p>
      <div class="ks-field">
        <label for="ks-modal-pub-nome">Nome</label>
        <input id="ks-modal-pub-nome" class="ks-input" type="text" autocomplete="name" />
      </div>
      <div class="ks-field">
        <label for="ks-modal-pub-email">E-mail</label>
        <input id="ks-modal-pub-email" class="ks-input" type="email" autocomplete="email" />
      </div>
      <div class="ks-field">
        <label for="ks-modal-pub-tel">WhatsApp <span class="ck-ksc-df4d14">(opcional)</span></label>
        <input id="ks-modal-pub-tel" class="ks-input" type="tel" autocomplete="tel" placeholder="Ex.: 5511999999999" />
      </div>
      <div class="ks-err ks-hidden ck-mt-8" id="ks-modal-pub-err"></div>
      <div class="ck-ksc-1ec809">
        <button type="button" class="ks-btn ck-ksc-c402b9" id="ks-modal-pub-cancel">Cancelar</button>
        <button type="button" class="ks-btn ks-btn-yellow ck-ksc-b11d08" id="ks-modal-pub-submit">
          <i class="fas fa-unlock"></i> Cadastrar e liberar
        </button>
      </div>
    </div>
  </div>

  <div id="ks-toast" class="ks-hidden ck-ksc-aa2f3c"></div>

  <div id="ks-boot" aria-live="polite">A carregar.</div>

  <div id="ks-login" class="ks-login-wrap ks-hidden">
    <div class="ks-login-card">
      <div class="ks-login-logo">
        <img
          class="ks-login-logo-img"
          src="/img/conecta-king-logo.png"
          alt="King Selection"
          width="200"
          height="80"
          decoding="async"
        />
      </div>
      <h1 id="ks-login-title">King Selection</h1>
      <p id="ks-login-sub" class="ks-login-lead">A carregar.</p>
      <div id="ks-login-body" class="ks-hidden">
        <!-- Modo Fotos vendidas (paid_event_photos): nome + e-mail + WhatsApp (reentrar / conferir identidade) -->
        <div id="ks-login-mode-details" class="ks-hidden">
          <p class="ks-section-h">Entrar na minha seleção</p>
          <p id="ks-login-details-lead" class="ks-muted ck-ksc-f18c17">
            Use o mesmo <strong>nome</strong>, <strong>e-mail</strong> e <strong>WhatsApp</strong> do cadastro (ao enviar a seleção). Informe com DDD e, se necessário, código do pa(ex.: 55). Se o fotógrafo não salvou seu WhatsApp no cadastro, pode deixar em branco.
          </p>
          <div class="ks-field">
            <label for="ks-reauth-nome">Nome</label>
            <input id="ks-reauth-nome" class="ks-input" type="text" autocomplete="name" />
          </div>
          <div class="ks-field">
            <label for="ks-reauth-email">E-mail</label>
            <input id="ks-reauth-email" class="ks-input" type="email" autocomplete="email" />
          </div>
          <div class="ks-field">
            <label for="ks-reauth-tel">WhatsApp</label>
            <input id="ks-reauth-tel" class="ks-input" type="tel" autocomplete="tel" placeholder="Ex.: 5511999999999 (mesmo WhatsApp do cadastro)" />
          </div>
          <button type="button" class="ks-btn ks-btn-yellow ck-ksc-14e23f" id="ks-reauth-btn">
            <i class="fas fa-right-to-bracket"></i> Entrar na minha seleção
          </button>
          <div class="ks-err ks-hidden" id="ks-reauth-err"></div>
        </div>
        <!-- Cadastro obrigatório na entrada - apenas modo público -->
        <div id="ks-login-mode-register-first" class="ks-hidden">
          <p class="ks-section-h">Acesso à galeria</p>
          <p id="ks-register-first-lead" class="ks-muted ck-ksc-f18c17">
            Informe nome, e-mail e WhatsApp. Não usamos senha - na primeira vez criamos seu cadastro; depois é só repetir os mesmos dados.
          </p>
          <div class="ks-field">
            <label for="ks-reg-nome">Nome</label>
            <input id="ks-reg-nome" class="ks-input" type="text" autocomplete="name" />
          </div>
          <div class="ks-field">
            <label for="ks-reg-email">E-mail</label>
            <input id="ks-reg-email" class="ks-input" type="email" autocomplete="email" />
          </div>
          <div class="ks-field">
            <label for="ks-reg-tel">WhatsApp</label>
            <input id="ks-reg-tel" class="ks-input" type="tel" autocomplete="tel" placeholder="Ex.: 5511999999999" />
          </div>
          <button type="button" class="ks-btn ks-btn-yellow ck-ksc-14e23f" id="ks-register-first-btn">
            <i class="fas fa-right-to-bracket"></i> Entrar na galeria
          </button>
          <div class="ks-err ks-hidden" id="ks-register-first-err"></div>
        </div>
        <!-- Modo público legado (visitante) - oculto quando cadastro é obrigatório -->
        <div id="ks-login-mode-public" class="ks-hidden">
          <p class="ks-section-h">Voltar à galeria</p>
          <button type="button" class="ks-btn ks-btn-outline ck-ksc-94dae3" id="ks-pub-guest-btn">
            <i class="fas fa-eye"></i> Entrar como visitante
          </button>
        </div>
        <!-- Modo Privado ou visitante (e-mail + senha criados pelo fotógrafo ou no cadastro) -->
        <div id="ks-login-mode-password" class="ks-hidden">
          <p class="ks-section-h" id="ks-login-pw-section-h">Acesso à galeria</p>
          <p id="ks-login-pw-lead" class="ks-muted ck-ksc-f18c17"></p>
          <div class="ks-field">
            <label for="ks-login-email">E-mail</label>
            <input id="ks-login-email" class="ks-input" type="email" autocomplete="email" />
          </div>
          <div class="ks-field">
            <label for="ks-login-senha">Senha</label>
            <input id="ks-login-senha" class="ks-input" type="password" autocomplete="current-password" />
          </div>
          <button type="button" class="ks-btn ks-btn-yellow ck-ksc-14e23f" id="ks-login-pw-btn">
            <i class="fas fa-right-to-bracket"></i> Entrar na galeria
          </button>
          <div class="ks-err ks-hidden" id="ks-login-pw-err"></div>
        </div>
      </div>
      <p class="ks-login-foot" id="ks-login-foot">Primeiro passo: crie seu cadastro. Depois escolha as fotos e use o download (por foto, selecionadas ou todas).</p>
      <div class="ks-err ks-hidden" id="ks-login-err"></div>
    </div>
  </div>

  <div id="ks-app" class="ks-hidden">
    <div class="ks-wrap ks-app-top ck-ksc-b27c58">
      <div class="ks-banner ks-hidden ck-ksc-b9bc01" id="ks-promo-banner"></div>
      <div class="ks-hidden ck-ksc-53eb7e" id="ks-public-dl-hint"></div>
    </div>
    <div id="ks-step-gallery">
      <div class="ks-summary-sticky" id="ks-summary-sticky" aria-label="Resumo da seleção">
        <div class="ks-summary-sticky-inner">
          <div class="ks-meta ks-meta--summary" id="ks-counts">-</div>
        </div>
      </div>
      <div class="ks-gallery-scroll">
        <div class="ks-top-inner">
          <div class="ks-top-row-primary">
            <div class="ks-brand">KINGSELECTION<small id="ks-proj">-</small></div>
            <div class="ks-top-sort-meta">
              <label class="ks-muted ck-ksc-241627" for="ks-sort">Ordenar:</label>
              <select id="ks-sort" class="ks-select" title="Ordenação">
                <option value="order">Sequncia original</option>
                <option value="name">Nome do arquivo</option>
                <option value="id">Número da foto (ID)</option>
              </select>
            </div>
          </div>
          <div class="ks-top-row-actions">
            <div class="ks-toolbar">
              <button type="button" class="ks-btn ks-btn-outline" id="ks-compare" title="Comparar duas fotos lado a lado">
                <i class="fas fa-columns"></i> Comparar e ajustar
              </button>
              <button type="button" class="ks-btn ks-btn-danger" id="ks-clear" title="Limpa s a seleção atual">
                <i class="fas fa-trash-alt"></i> Limpar seleção
              </button>
              <button type="button" class="ks-btn ks-btn-edit-req ks-hidden" id="ks-send-edit" title="Enviar fotos marcadas para edição" aria-hidden="true">
                <i class="fas fa-magic"></i> Enviar para edição
              </button>
              <button type="button" class="ks-btn ks-dl-btn-selected ks-hidden" id="ks-pub-dl-selected" title="Baixar fotos marcadas na galeria">
                <i class="fas fa-download"></i> Baixar selecionadas
              </button>
              <button type="button" class="ks-btn ks-dl-btn-all ks-hidden" id="ks-pub-dl-all" title="Baixar todas as fotos da galeria">
                <i class="fas fa-download"></i> Baixar todas
              </button>
              <button type="button" class="ks-btn ks-dl-btn-zip ks-hidden" id="ks-pub-dl-zip" title="ZIP com todas as fotos">
                <i class="fas fa-file-archive"></i> ZIP
              </button>
              <button type="button" class="ks-btn ks-btn-yellow" id="ks-advance" title="Ir para comparar e ajustar">
                <i class="fas fa-arrow-right"></i> Avanar
              </button>
              <button type="button" class="ks-btn ks-hidden" id="ks-folder-select-all" title="Selecionar todas as fotos deste lbum">
                <i class="fas fa-check-double"></i> Selecionar todas
              </button>
              <button type="button" class="ks-btn ks-hidden" id="ks-folder-back-top" title="Voltar para pastas">
                <i class="fas fa-arrow-left"></i> Voltar para pastas
              </button>
              <button type="button" class="ks-btn ks-hidden" id="ks-open-downloads" title="Ver fotos liberadas para baixar">
                <i class="fas fa-download"></i> Fotos para baixar
              </button>
              <button type="button" class="ks-btn" id="ks-logout" title="Sair"><i class="fas fa-sign-out-alt"></i> Sair</button>
            </div>
          </div>
        </div>
        <div class="ks-top-inner ks-search-block" id="ks-search-block">
          <div class="ck-ksc-59eddc">
            <label for="ks-search">Buscar fotos por número ou código</label>
            <div class="ks-search-row">
              <div class="ks-search-wrap">
                <i class="fas fa-search" aria-hidden="true"></i>
                <input type="text" id="ks-search" class="ks-input" placeholder="Ex.: 1642 1615 ou ADR0003 - espaço ou vírgula" autocomplete="off" />
              </div>
              <button type="button" class="ks-btn" id="ks-search-clear" title="Mostrar todas">
                <i class="fas fa-times"></i> Limpar busca
              </button>
            </div>
            <div class="ks-muted ck-ksc-5ff593">Separe por espaço ou vírgula. Vazio = galeria completa.</div>
          </div>
        </div>
      </div>
      <div class="ks-wrap">
        <div class="ks-banner ks-hidden" id="ks-notice"></div>
        <div class="ks-banner ks-hidden" id="ks-edit-requests-client" aria-live="polite"></div>
        <div class="ks-banner ks-hidden" id="ks-sales-banner"></div>
        <div class="ks-banner ks-hidden ck-ksc-b08d53" id="ks-payment-balance-banner"></div>
        <div class="ks-card ks-hidden ck-ksc-31d373" id="ks-downloads-panel">
          <div class="ck-ksc-42162a">Fotos para baixar</div>
          <div id="ks-downloads-pix-wrap" class="ks-hidden ck-ksc-6f24af">
            <div class="ck-ksc-26fcab"><i class="fas fa-qrcode"></i> Pagamento via PIX</div>
            <p class="ks-dl-pix-lead">
              Se você ainda não pagou o valor das suas fotos em PIX, faça agora: confira o <strong>total estimado</strong> no resumo acima, faça o PIX para o favorecido abaixo, use <strong>Copiar chave PIX</strong> e envie o <strong>comprovante</strong> (imagem) para o fotógrafo validar. Depois que o pagamento for confirmado e as fotos forem liberadas, as opções de download aparecem neste mesmo painel.
            </p>
            <div id="ks-dl-pix-block">
              <div class="ck-ksc-86c64b"><b>Favorecido:</b> <span id="ks-dl-pix-holder">-</span></div>
              <div class="ck-ksc-86c64b"><b>Chave PIX</b></div>
              <div class="ck-ksc-141987" id="ks-dl-pix-key">-</div>
              <button type="button" class="ks-btn ks-btn-yellow ck-ksc-4a2700" id="ks-dl-pix-copy"><i class="fas fa-copy"></i> Copiar chave PIX</button>
            </div>
            <div class="ck-ksc-ddaa0d">Enviar comprovante (imagem)</div>
            <input type="file" id="ks-dl-proof-file" accept="image/*" class="ks-input ck-ksc-42e6b2" />
            <button type="button" class="ks-btn ks-btn-yellow ck-ksc-4a2700" id="ks-dl-proof-send"><i class="fas fa-paper-plane"></i> Enviar comprovante</button>
            <div class="ck-ksc-c29bcc" id="ks-dl-proof-status" aria-live="polite"></div>
          </div>
          <div class="ks-muted ck-ksc-b0cc7e" id="ks-downloads-msg">Disponvel apaprovao do fotógrafo e confirmao do pagamento.</div>
          <button type="button" class="ks-btn ks-btn-yellow ks-hidden" id="ks-refresh-downloads" title="Buscar fotos liberadas pelo fotógrafo">
            <i class="fas fa-sync-alt"></i> Atualizar liberaes
          </button>
          <div id="ks-downloads-progress" class="ks-hidden ck-mt-8">
            <div class="ck-ksc-413018">
              <span id="ks-downloads-progress-text">Baixando...</span>
              <span id="ks-downloads-progress-pct">0%</span>
            </div>
            <div class="ck-ksc-1ea22e">
              <div class="ck-ksc-5893be" id="ks-downloads-progress-bar"></div>
            </div>
          </div>
          <div id="ks-downloads-actions" class="ks-hidden ck-ksc-bd6dd4">
            <div class="ks-muted ck-ksc-f0dd69">
              Escolha abaixo: baixar s as marcadas, todas ou ZIP.
            </div>
            <div class="ck-ksc-58703f">
              <label class="ck-ksc-5de588">
                <input type="checkbox" id="ks-downloads-select-all" />
                Selecionar todas liberadas
              </label>
              <span id="ks-downloads-counter" class="ks-dl-counter">
                <i id="ks-downloads-counter-icon" class="fas fa-circle-minus" aria-hidden="true"></i>
                <span id="ks-downloads-counter-text">0 selecionadas de 0 liberadas</span>
              </span>
              <button type="button" class="ks-btn" id="ks-downloads-select-none"><i class="fas fa-ban"></i> Limpar seleção</button>
              <button type="button" class="ks-btn ks-dl-btn-selected" id="ks-downloads-download-selected" title="2 ou mais fotos: baixa em ZIP (um clique Salvar). Uma foto: download direto.">
                <i class="fas fa-download"></i> Baixar selecionadas (ZIP)
              </button>
              <button type="button" class="ks-btn ks-dl-btn-all" id="ks-downloads-download-all"><i class="fas fa-download"></i> Baixar todas</button>
              <button type="button" class="ks-btn ks-dl-btn-zip" id="ks-downloads-download-zip"><i class="fas fa-file-archive"></i> Baixar todas em ZIP</button>
            </div>
          </div>
          <div id="ks-downloads-grid" class="ks-grid ck-mt-10"></div>
        </div>
        <div class="ks-face-panel ks-hidden" id="ks-face-panel">
          <div class="ks-face-panel-title"><i class="fas fa-face-smile"></i> Reconhecimento facial</div>
          <p class="ks-face-panel-lead" id="ks-face-lead">Clique em <strong>Reconhecimento facial</strong>, faça uma selfie ou envie sua foto e mostramos apenas as fotos em que você aparece.</p>
          <div class="ks-face-actions">
            <input type="file" id="ks-face-camera-in" accept="image/*" capture="user" class="ks-hidden-input" aria-hidden="true" />
            <input type="file" id="ks-face-gallery-in" accept="image/*" class="ks-hidden-input" aria-hidden="true" />
            <button type="button" class="ks-btn ks-btn-yellow" id="ks-face-open-btn" onclick="(function(){var m=document.getElementById('ks-face-modal'); if(m){m.classList.add('ks-open');m.setAttribute('aria-hidden','false');}})()"><i class="fas fa-face-smile"></i> Reconhecimento facial</button>
          </div>
          <div class="ks-face-msg" id="ks-face-msg" aria-live="polite"></div>
        </div>
        <div class="ks-face-modal" id="ks-face-modal" aria-hidden="true" onclick="if(event.target&&event.target.id==='ks-face-modal'){this.classList.remove('ks-open');this.setAttribute('aria-hidden','true');}">
          <div class="ks-face-modal-card" role="dialog" aria-modal="true" aria-labelledby="ks-face-modal-title">
            <div class="ks-face-modal-head">
              <h3 class="ks-face-modal-title" id="ks-face-modal-title">Reconhecimento facial</h3>
              <button type="button" class="ks-btn" id="ks-face-modal-close" onclick="(function(){var m=document.getElementById('ks-face-modal'); if(m){m.classList.remove('ks-open');m.setAttribute('aria-hidden','true');}})()"><i class="fas fa-times"></i> Fechar</button>
            </div>
            <p class="ks-face-modal-lead">Escolha uma opção para reconhecer seu rosto:</p>
            <div class="ks-face-modal-actions">
              <button type="button" class="ks-btn ks-btn-yellow" id="ks-face-camera-btn" onclick="document.getElementById('ks-face-camera-in')?.click()"><i class="fas fa-camera"></i> Fazer selfie</button>
              <button type="button" class="ks-btn" id="ks-face-gallery-btn" onclick="document.getElementById('ks-face-gallery-in')?.click()"><i class="fas fa-image"></i> Enviar foto sua</button>
            </div>
          </div>
        </div>
        <div class="ks-folder-wrap ks-hidden" id="ks-folder-wrap">
          <div class="ks-folder-head">
            <div class="ks-folder-title" id="ks-folder-title">Pastas</div>
            <select id="ks-folder-sort" class="ks-select ck-ksc-a5d7a0" title="Ordenação das pastas">
              <option value="manual">Pastas: ordem manual</option>
              <option value="name">Pastas: nome (A-Z / 1-2-3)</option>
              <option value="count">Pastas: mais fotos primeiro</option>
            </select>
            <button type="button" class="ks-btn ks-hidden" id="ks-folder-back"><i class="fas fa-arrow-left"></i> Voltar para pastas</button>
          </div>
          <div class="ks-folder-grid" id="ks-folder-grid"></div>
        </div>
        <div class="ks-banner warn ks-hidden" id="ks-search-hint"></div>
        <div class="ks-virtual-grid-hint ks-hidden" id="ks-virtual-grid-hint" aria-live="polite"></div>
        <div id="ks-grid" class="ks-grid"></div>
        <div class="ks-empty ks-hidden" id="ks-empty">Nenhuma foto corresponde  busca.</div>
        <p class="ks-gallery-foot" id="ks-gallery-foot">Revise as fotos acima. Use <strong>Avanar</strong> ou <strong>Comparar e ajustar</strong> para comparar; depois <strong>Revisar e enviar</strong> e <strong>Confirmar e enviar seleção</strong>.</p>
      </div>
    </div>

    <div id="ks-step-compare" class="ks-hidden ks-cmp-fullscreen">
      <div class="ks-cmp-fs-topbar">
        <button type="button" class="ks-cmp-fs-close" id="ks-cmp-close"><i class="fas fa-times"></i> Fechar</button>
        <button type="button" class="ks-cmp-fs-advance" id="ks-cmp-advance" title="Ir para revisão e envio">
          <i class="fas fa-paper-plane"></i> Revisar e enviar
        </button>
      </div>
      <div class="ks-wrap ck-ksc-18adbe">
        <h2 class="ks-cmp-title">Comparar e ajustar seleção</h2>
        <p class="ks-cmp-hint">Por defeito, cada clique na faixa de baixo <strong>alterna entre Foto A e Foto B</strong>. Toque na <strong>rea grande da foto</strong> (ou no rtulo Foto A / Foto B) para <strong>fixar</strong> s esse lado; toque <strong>de novo</strong> para voltar  alternncia. <strong>Ampliar</strong> abre s essa imagem; <strong>Ampliar A e B juntas</strong> abre o visualizador das duas. Use setas e <strong>Remover</strong> como antes. No fim da faixa, o botão <strong>+</strong> permite <strong>adicionar mais fotos</strong>  seleção sem fechar esta tela.</p>
        <div class="ks-cmp-both-wrap">
          <button type="button" class="ks-btn ks-btn-yellow" id="ks-cmp-both"><i class="fas fa-expand"></i> Ampliar A e B juntas</button>
        </div>
        <div class="ks-cmp-fs-pair">
          <div class="ks-cmp-pane" id="ks-cmp-pane-a">
            <div class="ks-cmp-fs-toolbar">
              <button type="button" class="ks-cmp-slot-hit ks-cmp-label-a" id="ks-cmp-hit-a" title="Fixar miniaturas s na Foto A (também pode tocar na foto em baixo). Toque de novo para alternar A/B.">Foto A</button>
              <button type="button" class="ks-btn ks-cmp-fs-zoom" id="ks-cmp-zoom-a" title="Ampliar esta foto"><i class="fas fa-expand"></i> Ampliar</button>
              <button type="button" class="ks-btn ks-cmp-fs-rm" id="ks-cmp-rm-a"><i class="fas fa-trash-alt"></i> Remover</button>
            </div>
            <div class="ks-cmp-fs-stage" id="ks-cmp-stage-a">
              <button type="button" class="ks-cmp-fs-arrow" id="ks-cmp-prev-a" aria-label="Foto anterior A"><i class="fas fa-chevron-left"></i></button>
              <div class="ks-cmp-fs-imgcol" id="ks-cmp-imgcol-a">
                <div class="ks-cmp-fs-imgbox">
                  <img id="ks-cmp-img-a" alt="" />
                </div>
                <select id="ks-cmp-sel-a" class="ks-input ks-cmp-fs-select" aria-label="Escolher arquivo A"></select>
              </div>
              <button type="button" class="ks-cmp-fs-arrow" id="ks-cmp-next-a" aria-label="Foto seguinte A"><i class="fas fa-chevron-right"></i></button>
            </div>
          </div>
          <div class="ks-cmp-pane" id="ks-cmp-pane-b">
            <div class="ks-cmp-fs-toolbar">
              <button type="button" class="ks-cmp-slot-hit ks-cmp-label-b" id="ks-cmp-hit-b" title="Fixar miniaturas s na Foto B (também pode tocar na foto em baixo). Toque de novo para alternar A/B.">Foto B</button>
              <button type="button" class="ks-btn ks-cmp-fs-zoom" id="ks-cmp-zoom-b" title="Ampliar esta foto"><i class="fas fa-expand"></i> Ampliar</button>
              <button type="button" class="ks-btn ks-cmp-fs-rm" id="ks-cmp-rm-b"><i class="fas fa-trash-alt"></i> Remover</button>
            </div>
            <div class="ks-cmp-fs-stage" id="ks-cmp-stage-b">
              <button type="button" class="ks-cmp-fs-arrow" id="ks-cmp-prev-b" aria-label="Foto anterior B"><i class="fas fa-chevron-left"></i></button>
              <div class="ks-cmp-fs-imgcol" id="ks-cmp-imgcol-b">
                <div class="ks-cmp-fs-imgbox">
                  <img id="ks-cmp-img-b" alt="" />
                </div>
                <select id="ks-cmp-sel-b" class="ks-input ks-cmp-fs-select" aria-label="Escolher arquivo B"></select>
              </div>
              <button type="button" class="ks-cmp-fs-arrow" id="ks-cmp-next-b" aria-label="Foto seguinte B"><i class="fas fa-chevron-right"></i></button>
            </div>
          </div>
        </div>
        <div class="ks-cmp-strip-title" id="ks-cmp-strip-title">Suas fotos selecionadas - clique para definir A e B</div>
        <div class="ks-cmp-strip" id="ks-cmp-strip"></div>
        <div id="ks-cmp-add-overlay" class="ks-hidden ks-cmp-add-overlay" aria-hidden="true">
          <button type="button" class="ks-cmp-add-backdrop" id="ks-cmp-add-backdrop" aria-label="Fechar painel"></button>
          <div class="ks-cmp-add-panel" role="dialog" aria-modal="true" aria-labelledby="ks-cmp-add-title">
            <div class="ks-cmp-add-head">
              <h3 id="ks-cmp-add-title">Adicionar  seleção</h3>
              <button type="button" class="ks-btn" id="ks-cmp-add-close"><i class="fas fa-times"></i> Fechar</button>
            </div>
            <p class="ks-cmp-add-lead">Toque numa foto para incluir na seleção desta rodada. Você continua na tela de comparar.</p>
            <div class="ks-cmp-add-grid-wrap">
              <div class="ks-cmp-add-empty ks-hidden" id="ks-cmp-add-empty">Todas as fotos da galeria já estão selecionadas.</div>
              <div class="ks-cmp-add-grid" id="ks-cmp-add-grid"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="ks-step-confirm" class="ks-hidden">
      <div class="ks-top">
        <div class="ks-top-inner">
          <div class="ks-brand">KINGSELECTION<small id="ks-confirm-proj">-</small></div>
          <div class="ks-toolbar ck-ksc-77fb7d">
            <button type="button" class="ks-btn" id="ks-confirm-back-gallery"><i class="fas fa-arrow-left"></i> Voltar</button>
          </div>
        </div>
      </div>
      <div class="ks-wrap">
        <div class="ks-confirm-head">
          <h2>Confirmar seleção</h2>
        </div>
        <p class="ks-confirm-lead" id="ks-confirm-lead">-</p>
        <p id="ks-confirm-preflight" class="ks-confirm-preflight ks-hidden">Preencha os dados abaixo para poder enviar suas fotos.</p>
        <div id="ks-confirm-sales-dashboard" class="ks-hidden ck-ksc-da12f2"></div>
        <div id="ks-confirm-contact-fields" class="ks-hidden ks-confirm-fields">
          <div class="ks-muted">Seus dados para o fotógrafo (obrigatório)</div>
          <label for="ks-confirm-nome">Nome</label>
          <input id="ks-confirm-nome" class="ks-input" autocomplete="name" />
          <label for="ks-confirm-email">E-mail</label>
          <input id="ks-confirm-email" type="email" class="ks-input" autocomplete="email" />
          <label for="ks-confirm-tel">WhatsApp (com DDD / país)</label>
          <input id="ks-confirm-tel" type="tel" class="ks-input" autocomplete="tel" placeholder="Ex.: 5511999999999" />
        </div>
        <div class="ks-confirm-feedback-wrap">
          <label for="ks-confirm-feedback" class="ks-muted ck-ksc-f18eb6">Mensagem ou observação (opcional)</label>
          <textarea id="ks-confirm-feedback" class="ks-textarea" rows="3" placeholder="Ex.: Fotos para impressão 15x21, preferência por P&B."></textarea>
        </div>
        <div id="ks-confirm-payment-check" class="ks-hidden ks-confirm-fields">
          <div class="ks-muted">Pagamento (fotos vendidas por evento)</div>
          <label for="ks-confirm-paid">Você já pagou?</label>
          <select id="ks-confirm-paid" class="ks-input">
            <option value="no">Não</option>
            <option value="yes">Sim</option>
          </select>
          <div id="ks-confirm-proof-wrap" class="ks-hidden ck-mt-10">
            <label for="ks-confirm-proof-file">Comprovante (opcional aqui - ou envie depois em Fotos para baixar)</label>
            <input id="ks-confirm-proof-file" type="file" accept="image/*" class="ks-input" />
          </div>
        </div>
        <div class="ks-confirm-actions-top">
          <button type="button" class="ks-btn ks-btn-yellow ks-confirm-send" id="ks-confirm-send">
            <i class="fas fa-paper-plane"></i> Confirmar e enviar seleção
          </button>
        </div>
        <div class="ks-confirm-scroll" id="ks-confirm-scroll"></div>
      </div>
    </div>
  </div>

  <div id="ks-locked" class="ks-hidden ks-wrap">
    <div class="ks-locked">
      <h2 id="ks-locked-title">Obrigado!</h2>
      <p id="ks-locked-msg">-</p>
      <div id="ks-locked-pix" class="ks-locked-pix ks-hidden">
        <div class="ks-locked-pix-title"><i class="fas fa-qrcode"></i> Pagamento PIX</div>
        <div class="ks-locked-pix-line"><b>Favorecido:</b> <span id="ks-locked-pix-holder">-</span></div>
        <div class="ks-locked-pix-line"><b>Chave PIX:</b></div>
        <div id="ks-locked-pix-key" class="ks-locked-pix-key">-</div>
        <button type="button" class="ks-btn ks-btn-yellow ck-ksc-4a2700" id="ks-locked-pix-copy">
          <i class="fas fa-copy"></i> Clique aqui para copiar o PIX
        </button>
        <button type="button" class="ks-btn ks-locked-wa-paid ck-ksc-98d2ce" id="ks-locked-pix-whats">
          <i class="fab fa-whatsapp"></i> J paguei . avisar no WhatsApp
        </button>
        <button type="button" class="ks-btn ks-locked-wa-pending ck-ksc-98d2ce" id="ks-locked-pix-whats-pending">
          <i class="fab fa-whatsapp"></i> Ainda vou pagar . avisar no WhatsApp
        </button>
        <div class="ks-locked-pix-note">Faz o pagamento das suas fotos para desbloquear e avise o fotógrafo.</div>
      </div>
      <hr />
      <div class="ks-tagline">Com carinho,</div>
      <div class="ks-tag" id="ks-locked-tag"></div>
      <button type="button" class="ks-btn ks-btn-yellow ck-ksc-d6f2af" id="ks-locked-open-gallery">
        <i class="fas fa-images"></i> Ver fotos para baixar
      </button>
      <button type="button" class="ks-btn ck-ksc-49fcd8" id="ks-locked-logout"><i class="fas fa-sign-out-alt"></i> Sair</button>
    </div>
  </div>

  <div id="ks-viewer" class="ks-hidden ks-viewer" aria-hidden="true">
    <button type="button" class="ks-btn ks-viewer-close" id="ks-viewer-close" aria-label="Fechar"><i class="fas fa-times"></i></button>
    <button type="button" class="ks-viewer-nav ks-viewer-nav-prev" id="ks-viewer-prev" aria-label="Foto anterior"><i class="fas fa-chevron-left"></i></button>
    <button type="button" class="ks-viewer-nav ks-viewer-nav-next" id="ks-viewer-next" aria-label="Prxima foto"><i class="fas fa-chevron-right"></i></button>
    <div class="ks-viewer-inner">
      <div class="ks-viewer-photo-wrap">
        <button type="button" class="ks-check-btn ks-viewer-check ks-hidden" id="ks-viewer-check" aria-label="Selecionar" title="Selecionar"></button>
        <img id="ks-viewer-img" alt="" />
      </div>
    </div>
    <div class="ks-viewer-swipe-hint" id="ks-viewer-swipe-hint"><i class="fas fa-arrows-left-right ck-ksc-db2f62"></i> Arraste para os lados</div>
    <div class="ks-viewer-footer" id="ks-viewer-footer">
      <button type="button" class="ks-viewer-select-action ks-hidden" id="ks-viewer-select-action">Selecionar</button>
      <a id="ks-viewer-download" class="ks-btn ks-viewer-dl ks-hidden" href="#" download target="_blank" rel="noopener"><i class="fas fa-download"></i> Descarregar</a>
    </div>
  </div>

  <div id="ks-viewer-ab" class="ks-hidden" aria-hidden="true">
    <div class="ks-ab-head">
      <div class="ks-ab-head-col ks-ab-head-col-a">
        <span class="ks-ab-slot-label">Foto A</span>
        <div class="ks-ab-zoom-btns" title="Zoom: roda do mouse ou botes">
          <button type="button" class="ks-ab-zoom-btn" id="ks-viewer-ab-zoom-out-a" title="Reduzir zoom"><i class="fas fa-search-minus"></i></button>
          <button type="button" class="ks-ab-zoom-btn" id="ks-viewer-ab-zoom-in-a" title="Aumentar zoom"><i class="fas fa-search-plus"></i></button>
          <button type="button" class="ks-ab-zoom-btn ks-ab-zoom-reset" id="ks-viewer-ab-zoom-reset-a" title="Ajustar ao tamanho normal">Ajustar</button>
        </div>
        <div class="ks-ab-remove-wrap" id="ks-viewer-ab-remove-wrap-a">
          <button type="button" class="ks-btn ks-btn-danger" id="ks-viewer-ab-remove-a" title="Remover da seleção"><i class="fas fa-trash-alt"></i> Remover</button>
        </div>
        <a id="ks-viewer-ab-dl-a" class="ks-ab-dl ks-hidden" href="#" download target="_blank" rel="noopener"><i class="fas fa-download"></i> Descarregar</a>
      </div>
      <div class="ks-ab-head-col ks-ab-head-col-b">
        <span class="ks-ab-slot-label">Foto B</span>
        <div class="ks-ab-zoom-btns" title="Zoom: roda do mouse ou botes">
          <button type="button" class="ks-ab-zoom-btn" id="ks-viewer-ab-zoom-out-b" title="Reduzir zoom"><i class="fas fa-search-minus"></i></button>
          <button type="button" class="ks-ab-zoom-btn" id="ks-viewer-ab-zoom-in-b" title="Aumentar zoom"><i class="fas fa-search-plus"></i></button>
          <button type="button" class="ks-ab-zoom-btn ks-ab-zoom-reset" id="ks-viewer-ab-zoom-reset-b" title="Ajustar ao tamanho normal">Ajustar</button>
        </div>
        <div class="ks-ab-remove-wrap" id="ks-viewer-ab-remove-wrap-b">
          <button type="button" class="ks-btn ks-btn-danger" id="ks-viewer-ab-remove-b" title="Remover da seleção"><i class="fas fa-trash-alt"></i> Remover</button>
        </div>
        <a id="ks-viewer-ab-dl-b" class="ks-ab-dl ks-hidden" href="#" download target="_blank" rel="noopener"><i class="fas fa-download"></i> Descarregar</a>
      </div>
      <button type="button" class="ks-ab-close-top" id="ks-viewer-ab-close" title="Fechar"><i class="fas fa-times"></i> Fechar</button>
    </div>
    <div class="ks-ab-body">
      <div class="ks-ab-col">
        <div class="ks-ab-col-inner">
          <button type="button" class="ks-ab-nav-side nav-prev" id="ks-viewer-ab-prev-a" title="Foto anterior"><i class="fas fa-chevron-left"></i></button>
          <div class="ks-ab-zoom-wrap" id="ks-viewer-ab-zoom-wrap-a">
            <img id="ks-viewer-ab-a" src="" alt="Foto A" />
            <button type="button" class="ks-ab-zoom-reset-overlay" id="ks-viewer-ab-zoom-overlay-a">Ajustar</button>
          </div>
          <button type="button" class="ks-ab-nav-side nav-next" id="ks-viewer-ab-next-a" title="Prxima foto"><i class="fas fa-chevron-right"></i></button>
        </div>
      </div>
      <div class="ks-ab-col">
        <div class="ks-ab-col-inner">
          <button type="button" class="ks-ab-nav-side nav-prev" id="ks-viewer-ab-prev-b" title="Foto anterior"><i class="fas fa-chevron-left"></i></button>
          <div class="ks-ab-zoom-wrap" id="ks-viewer-ab-zoom-wrap-b">
            <img id="ks-viewer-ab-b" src="" alt="Foto B" />
            <button type="button" class="ks-ab-zoom-reset-overlay" id="ks-viewer-ab-zoom-overlay-b">Ajustar</button>
          </div>
          <button type="button" class="ks-ab-nav-side nav-next" id="ks-viewer-ab-next-b" title="Prxima foto"><i class="fas fa-chevron-right"></i></button>
        </div>
      </div>
    </div>
  </div>

  <button type="button" class="ks-support-whats ks-hidden" id="ks-support-whats" title="Falar com o fotógrafo no WhatsApp" aria-label="Suporte no WhatsApp">
    <i class="fab fa-whatsapp"></i>
    <span id="ks-support-whats-text">Suporte</span>
  </button>

  <script src="/config.js?v=2026-09-10-apex1"></script>
  <div id="ks-sales-confirm-bar" class="ks-hidden" aria-live="polite">
    <span id="ks-sales-confirm-count">0 foto(s) selecionada(s)</span>
    <button type="button" class="ks-btn ks-btn-yellow" id="ks-sales-confirm-go">
      <i class="fas fa-paper-plane"></i> Confirmar seleção
    </button>
  </div>
  @vite(['resources/css/fontawesome.css', 'resources/css/app.css', 'resources/js/pages/kingSelectionCliente.js'])
</body>
</html>

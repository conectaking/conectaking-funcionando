<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Configurar tela de finalização — King Selection</title>
  @vite(['resources/css/fonts.css', 'resources/js/pages/cartao-ks-config-finalizacao.js'])

</head>
<body>
  <div class="ks-wrap">
    <div class="ks-top">
      <h1 class="ks-title">Página de finalização das fotos</h1>
      <a href="#" id="btnVoltar" class="ks-back">← Voltar</a>
    </div>
    <p class="ks-sub">Projeto: <strong>{{ $nomeProjeto }}</strong></p>
    <p class="ks-hint">
      Personalize a mensagem de obrigado que o cliente vê após confirmar e enviar a seleção.
      O sistema preenche automaticamente: <code>@{{nome_cliente}}</code> pelo nome de quem está selecionando (ex.: Walter), <code>@{{nome}}</code> pelo seu nome (retratista) e <code>@{{quantidade}}</code> pelo número de fotos selecionadas. Se deixar a mensagem em branco, será usada a mensagem padrão para todos.
    </p>

    <div id="msgSucesso" class="ks-msg ok hidden">Mensagem de finalização salva com sucesso.</div>
    <div id="msgErro" class="ks-msg err hidden"></div>

    <div class="ks-card">
      <form id="formFinalizacao">
        <div class="ks-field">
          <label class="ks-label" for="thank_you_photographer_name">Seu nome (exibido na mensagem de obrigado)</label>
          <input type="text" name="thank_you_photographer_name" id="thank_you_photographer_name" placeholder="Ex.: Rafael Fogo" class="ks-input" />
          <p class="ks-hint ck-kscf-8fd8a3">Esse nome substitui <code>@{{nome}}</code> na mensagem. Se não preencher, a plataforma usa o nome do seu perfil (cartão virtual).</p>
        </div>
        <div class="ks-field">
          <label class="ks-label" for="thank_you_title">Título</label>
          <input type="text" name="thank_you_title" id="thank_you_title" placeholder="Obrigado!" class="ks-input" />
        </div>
        <div class="ks-field">
          <label class="ks-label" for="thank_you_message">Mensagem (opcional)</label>
          <textarea name="thank_you_message" id="thank_you_message" placeholder="Obrigado, @{{nome_cliente}}! Sua seleção foi recebida com sucesso. Você escolheu @{{quantidade}} foto(s). Nosso retratista @{{nome}} agradece pela confiança e pelo carinho." class="ks-textarea"></textarea>
          <p class="ks-hint ck-kscf-8fd8a3">Use <code>@{{nome_cliente}}</code>, <code>@{{nome}}</code> e <code>@{{quantidade}}</code> onde quiser; serão trocados automaticamente. Em branco = mensagem padrão para todos.</p>
        </div>
        <div class="ks-field">
          <label class="ks-label">Logo / imagem de destaque (opcional)</label>
          <p class="ks-hint ck-kscf-e4ad4a">Imagem que aparece na tela de obrigado (ex.: sua logo). Envie um arquivo do seu computador.</p>
          <input type="file" id="thank_you_file" accept="image/*" class="hidden" />
          <div class="ks-btn-wrap">
            <button type="button" id="btnEnviarLogo" class="ks-btn ks-btn-primary">Enviar logo</button>
            <button type="button" id="btnRemoverLogo" class="ks-btn ck-hidden">Remover logo</button>
          </div>
          <div id="thank_you_preview_wrap" class="ks-preview-wrap hidden">
            <img id="thank_you_preview" src="" alt="Preview logo" />
          </div>
        </div>
        <button type="submit" id="btnSalvar" class="ks-btn ks-btn-primary ck-kscf-36ca0a">Salvar mensagem de finalização</button>
      </form>
    </div>
  </div>

  <script>window.__CK_BOOT_KS_CONFIG_FINALIZACAO = { j0: @json((int) $galleryId), j1: @json($apiBase) };</script>

</body>
</html>

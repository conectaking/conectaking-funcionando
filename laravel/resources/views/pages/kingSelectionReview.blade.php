<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KingSelection - Revisão</title>
  <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
  <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
  
  <style>
    .ks-img-loading{filter: blur(18px); transform: scale(1.03); opacity:.85}
    .ks-viewer{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:14px;background:rgba(0,0,0,.72);z-index:80}
    .ks-viewer.active{display:flex}
    .ks-viewer-card{width:min(1000px, 96vw);background:#0b0f1a;border:1px solid rgba(255,255,255,.12);border-radius:16px;overflow:hidden}
    .ks-viewer-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:rgba(0,0,0,.35);border-bottom:1px solid rgba(255,255,255,.10)}
    .ks-viewer-head .btn{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:#fff;border-radius:10px;padding:9px 10px;font-weight:900}
    .ks-viewer-head .btn:hover{background:rgba(255,255,255,.12)}
    .ks-viewer-img{width:100%;height:min(76vh, 820px);object-fit:contain;display:block;background:#000}
    .ks-fab{position:absolute;inset:10px 10px auto auto;z-index:10}
    .ks-checkbtn{width:34px;height:34px;border-radius:999px;border:1px solid rgba(255,255,255,.5);background:rgba(255,255,255,.92);display:inline-flex;align-items:center;justify-content:center}
    .ks-thank-you-card{box-shadow:0 24px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.08)}
  </style>
</head>
<body class="bg-black text-white">
  <!-- Barra superior (igual  tela de seleção) -->
  <div class="sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-white/10">
    <div class="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <div class="text-xs tracking-[0.28em] uppercase text-white/40">KINGSELECTION</div>
        <div class="font-extrabold truncate" id="ks-r-title">Galeria</div>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <span class="text-sm text-white/60">Ordenar: <span class="text-white/80">Sequncia (original)</span></span>
        <span class="text-sm text-white/60" id="ks-r-total-photos">0 fotos na galeria</span>
        <span class="text-sm font-bold text-yellow-300" id="ks-r-selected-pill">SELECIONADAS <span id="ks-r-selected-n">0</span> (livre)</span>
        <span class="px-3 py-1.5 rounded-lg bg-white/10 text-white/80 text-sm font-semibold">COMPARAR E AJUSTAR</span>
        <a id="ks-r-clear" href="#" class="px-3 py-1.5 rounded-lg bg-red-600/80 text-white text-sm font-bold hover:bg-red-600">LIMPAR SELEO</a>
        <button type="button" id="ks-finish-top" class="px-4 py-2 rounded-xl bg-yellow-300 text-black font-extrabold hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed" disabled>CONFIRMAR E ENVIAR</button>
        <a id="ks-r-sair" href="#" class="text-white/70 hover:text-white text-sm font-semibold">Sair</a>
      </div>
    </div>
  </div>

  <div class="max-w-6xl mx-auto px-4 py-6">
    <div id="ks-r-error" class="hidden mt-4 rounded-xl border border-red-500/20 bg-red-950/30 p-4 text-red-100"></div>

    <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div class="font-extrabold">Fotos selecionadas</div>
          <p class="text-sm text-white/60 mt-1">Revise antes de enviar. Remova as que não quiser (botão Remover em cada uma).</p>
          <div id="ks-selected-grid" class="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"></div>
          <div id="ks-empty" class="hidden mt-6 text-sm text-white/60">Nenhuma foto selecionada ainda.</div>
          <!-- Botão apa ltima foto (bem visvel) -->
          <div id="ks-area-selecionar-mais" class="mt-6 pt-4 border-t border-white/10">
            <a id="ks-btn-selecionar-mais" href="#" class="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-xl border-2 border-yellow-400 bg-yellow-400/20 text-yellow-300 font-bold hover:bg-yellow-400/30 text-base">
              <i class="fas fa-plus"></i> Selecionar mais fotos
            </a>
          </div>
        </div>
        <p class="mt-4 text-sm text-white/50 max-w-2xl">Revise as fotos acima. Remova as que não quiser (botão "Remover" em cada uma). Quando estiver satisfeito, use o botão <strong>CONFIRMAR E ENVIAR</strong> no topo da página para seguir ao envio.</p>
      </div>

      <div class="lg:col-span-1">
        <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div class="font-extrabold">Resumo do pedido</div>
          <div class="mt-4 space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-white/60">Seleção mínima</span>
              <span class="font-extrabold" id="ks-min">Livre</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-white/60">Total de fotos selecionadas</span>
              <span class="font-extrabold" id="ks-total-selected">0</span>
            </div>
          </div>

          <div class="mt-6">
            <div class="font-extrabold text-sm">Deseja enviar uma mensagem?</div>
            <textarea id="ks-feedback" class="mt-3 w-full min-h-[120px] rounded-xl border border-white/10 bg-black/40 p-3 text-[16px] text-white" placeholder="Digite o seu comentrio..."></textarea>
          </div>

          <a id="ks-btn-selecionar-mais-side" href="#" class="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/25 bg-white/5 text-white font-semibold hover:bg-white/10 text-sm">
            <i class="fas fa-plus"></i> Selecionar mais fotos
          </a>
          <button id="ks-finish" class="mt-3 w-full px-4 py-3 rounded-xl bg-yellow-300 text-black font-extrabold hover:brightness-95 disabled:opacity-40" disabled>
            CONFIRMAR E ENVIAR
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Tela de obrigado (exibida apfinalizar com sucesso) -->
  <div id="ks-thank-you" class="fixed inset-0 hidden flex items-center justify-center p-4 bg-black/90 z-50" aria-hidden="true" role="dialog" aria-labelledby="ks-thank-you-title" aria-modal="true">
    <div class="max-w-lg w-full rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white ks-thank-you-card">
      <img id="ks-thank-you-img" src="" alt="" class="mx-auto rounded-xl max-h-48 object-contain hidden mb-4" />
      <h1 id="ks-thank-you-title" class="text-2xl font-extrabold text-yellow-300">Obrigado!</h1>
      <p id="ks-thank-you-message" class="mt-3 text-white/80"></p>
      <a id="ks-thank-you-home" href="#" class="inline-flex mt-6 px-5 py-3 rounded-xl bg-yellow-300 text-black font-bold hover:brightness-95">
        Voltar ao incio
      </a>
    </div>
  </div>

  <!-- Viewer (ampliar foto) -->
  <div class="ks-viewer" id="ks-viewer" aria-hidden="true">
    <div class="ks-viewer-card">
      <div class="ks-viewer-head">
        <div class="min-w-0">
          <div class="text-white font-extrabold truncate" id="ks-v-title">Foto</div>
          <div class="text-white/70 text-xs" id="ks-v-meta">1/1</div>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="btn" id="ks-v-close"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div class="relative">
        <button type="button" class="ks-fab ks-checkbtn" id="ks-v-prev" title="Anterior"><i class="fas fa-chevron-left"></i></button>
        <button type="button" class="ks-fab ks-checkbtn" style="right:54px" id="ks-v-next" title="Prxima"><i class="fas fa-chevron-right"></i></button>
        <img id="ks-v-img" class="ks-viewer-img" alt="foto" />
      </div>
    </div>
  </div>

  <script src="/config.js?v=2026-09-10-apex1"></script>
  @vite(['resources/css/app.css', 'resources/js/pages/kingSelectionReview.js'])
</body>
</html>


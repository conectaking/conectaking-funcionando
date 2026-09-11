<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KingSelection - Galeria</title>
  <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
  <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
  
</head>
<body class="bg-black text-white" oncontextmenu="return false;">
  

  <div class="ks-topbar">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
      <div class="min-w-0">
        <div class="text-xs tracking-[0.28em] uppercase text-white/40">KingSelection</div>
        <div class="font-extrabold truncate" id="ks-g-title">Galeria</div>
        <div id="ks-locked" class="ks-lock hidden">Seleção j enviada. Aguarde revisão ou pea reativao ao fotgrafo.</div>
      </div>

      <div class="flex items-center gap-2">
        <button type="button" class="ks-pill" id="ks-logout"><i class="fas fa-right-from-bracket"></i> SAIR</button>
        <button type="button" class="ks-pill" id="ks-info-btn"><i class="fas fa-circle-info"></i> INFORMAES</button>
        <button type="button" class="ks-pill active" id="ks-selected-btn">
          <span class="inline-flex items-center gap-2">
            <span>SELECIONADAS</span>
            <span class="inline-flex items-center justify-center min-w-[22px] h-[22px] px-2 rounded-full bg-yellow-300 text-black text-[12px] font-black" id="ks-count">0</span>
          </span>
        </button>
        <button type="button" class="ks-primary" id="ks-advance-btn">AVANAR</button>
      </div>

      <div class="hidden sm:flex items-center gap-2">
        <button type="button" class="ks-btn" id="ks-select-all">SELECIONAR TODAS</button>
        <button type="button" class="ks-btn" id="ks-clear">LIMPAR SELEO</button>
      </div>
    </div>

    <div class="sm:hidden max-w-6xl mx-auto px-4 pb-3 flex items-center gap-2">
      <button type="button" class="ks-btn flex-1" id="ks-select-all-m">SELECIONAR TODAS</button>
      <button type="button" class="ks-btn flex-1" id="ks-clear-m">LIMPAR</button>
    </div>
  </div>

  <div class="max-w-6xl mx-auto px-4 py-8">
    <div id="ks-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"></div>
    <div id="ks-load-more-wrap" class="mt-6 flex justify-center hidden">
      <button type="button" id="ks-load-more" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/20 bg-white/5 text-white font-bold hover:bg-white/10 text-sm">
        <i class="fas fa-plus"></i> Carregar mais fotos
      </button>
    </div>
    <div id="ks-after-grid" class="mt-6 flex flex-wrap items-center gap-3 hidden">
      <a href="#" id="ks-btn-selecionar-mais" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-yellow-400/60 bg-yellow-400/15 text-yellow-300 font-bold hover:bg-yellow-400/25 text-sm">
        <i class="fas fa-plus"></i> Selecionar mais fotos
      </a>
    </div>
    <p id="ks-hint-revisar" class="mt-4 text-sm text-white/50 max-w-2xl hidden">Revise as fotos acima. Remova as que não quiser (botão Remover em cada uma). Quando estiver satisfeito, use o botão <strong>AVANAR</strong> no topo para seguir  confirmao e envio.</p>
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
          <button type="button" class="btn" id="ks-v-toggle">SELECIONAR</button>
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

  <!-- Modal: Informações importantes -->
  <div class="ks-modal" id="ks-info-modal" aria-hidden="true">
    <div class="w-full max-w-lg rounded-2xl bg-black border border-white/10 shadow-xl overflow-hidden">
      <div class="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div class="font-extrabold">INFORMAES IMPORTANTES</div>
        <button type="button" id="ks-info-close" class="text-white/60 hover:text-white"><i class="fas fa-times"></i></button>
      </div>
      <div class="p-6">
        <div class="text-white/70 text-sm">Bem-vindo(a). Você est prestes a entrar na rea de seleção de fotos.</div>
        <div class="mt-6 space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-white/70 font-semibold"><i class="far fa-image"></i> Total de fotos</div>
            <div class="font-extrabold" id="ks-total-photos">0 fotos</div>
          </div>
          <div class="flex items-center justify-between">
            <div class="text-white/70 font-semibold"><i class="far fa-circle-check"></i> Seleção mínima</div>
            <div class="font-extrabold" id="ks-min-sel">Livre</div>
          </div>
          <div class="flex items-center justify-between">
            <div class="text-white/70 font-semibold"><i class="fas fa-ban"></i> Limite de seleção</div>
            <div class="font-extrabold" id="ks-max-sel">Livre</div>
          </div>
        </div>
        <button type="button" class="mt-8 w-full ks-primary" id="ks-access-btn">ACESSAR GALERIA</button>
      </div>
    </div>
  </div>

  <script src="/config.js?v=2026-09-10-apex1"></script>
  @vite(['resources/css/fontawesome.css', 'resources/css/app.css', 'resources/js/pages/kingSelectionGallery.js'])
</body>
</html>


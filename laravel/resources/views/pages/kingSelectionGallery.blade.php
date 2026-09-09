<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KingSelection - Galeria</title>
  <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png">
  <link rel="apple-touch-icon" href="https://i.ibb.co/60sW9k75/logo.png">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root{
      --ks-accent:#facc15;
      --ks-line:rgba(255,255,255,.12);
      --ks-card:rgba(10,10,10,.78);
      --ks-muted:rgba(255,255,255,.55);
    }
    /* não pode bloquear cliques dos botes */
    .antiCopyOverlay{position:absolute;inset:0;z-index:2;background:transparent;pointer-events:none}
    .ks-img-loading{filter: blur(18px); transform: scale(1.03); opacity:.85}
    .ks-topbar{position:sticky;top:0;z-index:30;background:rgba(0,0,0,.78);backdrop-filter:blur(12px);border-bottom:1px solid var(--ks-line)}
    .ks-pill{border:1px solid var(--ks-line);border-radius:999px;padding:8px 12px;font-weight:900;font-size:12px;letter-spacing:.12em;text-transform:uppercase;background:rgba(255,255,255,.03);color:#fff}
    .ks-pill.active{border-color:rgba(250,204,21,.35);color:var(--ks-accent);box-shadow:0 0 0 3px rgba(250,204,21,.10)}
    .ks-primary{background:var(--ks-accent);color:#000;border-radius:12px;padding:10px 14px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}
    .ks-primary[disabled]{opacity:.45;cursor:not-allowed}
    .ks-btn{border:1px solid var(--ks-line);border-radius:12px;padding:10px 12px;background:rgba(255,255,255,.03);font-weight:950;letter-spacing:.10em;text-transform:uppercase;color:#fff}
    .ks-btn:hover{background:rgba(255,255,255,.06)}
    .ks-modal{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.55);z-index:60}
    .ks-modal.active{display:flex}
    .ks-viewer{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:14px;background:rgba(0,0,0,.72);z-index:80}
    .ks-viewer.active{display:flex}
    .ks-viewer-card{width:min(1000px, 96vw);background:#0b0f1a;border:1px solid rgba(255,255,255,.12);border-radius:16px;overflow:hidden}
    .ks-viewer-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:rgba(0,0,0,.35);border-bottom:1px solid rgba(255,255,255,.10)}
    .ks-viewer-head .btn{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:#fff;border-radius:10px;padding:9px 10px;font-weight:900}
    .ks-viewer-head .btn:hover{background:rgba(255,255,255,.12)}
    .ks-viewer-img{width:100%;height:min(76vh, 820px);object-fit:contain;display:block;background:#000}
    .ks-fab{position:absolute;inset:10px 10px auto auto;z-index:10}
    .ks-checkbtn{width:34px;height:34px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(0,0,0,.55);color:#fff;display:inline-flex;align-items:center;justify-content:center}
    .ks-lock{margin-top:10px;padding:10px 12px;border-radius:14px;border:1px solid rgba(250,204,21,.25);background:rgba(250,204,21,.10);color:rgba(255,255,255,.92);font-weight:900;font-size:12px;letter-spacing:.06em}
    @media (max-width: 420px){
      .ks-topbar .max-w-6xl{flex-direction:column;align-items:stretch;gap:10px}
      .ks-topbar .max-w-6xl > div.flex.items-center.gap-2{justify-content:space-between}
      .ks-pill,.ks-primary{flex:1}
      .ks-pill{padding:8px 10px;font-size:11px}
      .ks-primary{padding:10px 12px;font-size:11px}
    }
  </style>
</head>
<body class="bg-black text-white">
  <script>document.addEventListener('contextmenu', (e)=>e.preventDefault());</script>

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

  <script src="/config.js?v=2026-09-09-vite1"></script>
  @vite(['resources/js/pages/kingSelectionGallery.js'])
</body>
</html>


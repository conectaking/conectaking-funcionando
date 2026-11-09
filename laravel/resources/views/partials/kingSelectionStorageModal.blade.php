<!-- Modal Interativo: Minha Assinatura & Simulador de Armazenamento -->
<div id="ks-storage-modal" class="fixed inset-0 hidden items-center justify-center p-3 sm:p-5 z-[99999]" style="display: none; align-items: center; justify-content: center; z-index: 99999; background: rgba(5, 7, 10, 0.82); backdrop-filter: blur(8px);">
  <div class="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-slate-900 border border-amber-500/35 rounded-2xl shadow-2xl text-slate-100 flex flex-col font-sans" onclick="event.stopPropagation();">
    
    <!-- Header do Modal -->
    <div class="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/95 backdrop-blur-sm">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/25 to-amber-600/10 border border-amber-500/40 flex items-center justify-center text-amber-400 text-lg shadow-sm">
          <i class="fas fa-database"></i>
        </div>
        <div>
          <div class="text-base sm:text-lg font-black text-amber-100 flex items-center gap-2">
            <span>Minha Assinatura &amp; Simulador</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold uppercase tracking-wider border border-amber-500/30">King Selection</span>
          </div>
          <div class="text-xs text-slate-400">Consulte seu plano atual e simule a capacidade de fotos e ensaios</div>
        </div>
      </div>
      <button type="button" onclick="window.closeStorageSimulatorModal?.()" class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer text-base">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="p-5 space-y-5 text-sm">
      
      <!-- Card 1: Status Atual da Assinatura -->
      <div class="p-4 rounded-xl bg-gradient-to-br from-slate-800/90 to-slate-800/40 border border-slate-700/80 shadow-xs space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <i class="fas fa-crown text-amber-400 text-sm"></i>
            <span class="font-extrabold text-white text-sm sm:text-base" id="ks-sim-plan-name">Studio King 60 GB</span>
            <span id="ks-sim-plan-tag" class="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-extrabold">60 GB</span>
          </div>
          <div class="flex items-center gap-1.5 text-xs">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="font-bold text-emerald-400" id="ks-sim-plan-status">Assinatura Ativa</span>
          </div>
        </div>

        <!-- Barra de Progresso de GB -->
        <div>
          <div class="flex justify-between text-xs text-slate-300 font-semibold mb-1.5">
            <span>Consumo: <strong class="text-amber-300" id="ks-sim-used-gb">0.0 GB</strong> de <strong class="text-white" id="ks-sim-limit-gb">60 GB</strong></span>
            <span class="text-amber-400 font-bold" id="ks-sim-pct">0%</span>
          </div>
          <div class="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div id="ks-sim-bar" class="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full transition-all duration-500" style="width: 0%;"></div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center text-xs">
          <div class="p-2 rounded-lg bg-slate-900/60 border border-white/5">
            <div class="text-slate-400 text-[11px]">Espaço Livre</div>
            <div class="font-black text-emerald-400 text-xs sm:text-sm mt-0.5" id="ks-sim-free-gb">-- GB</div>
          </div>
          <div class="p-2 rounded-lg bg-slate-900/60 border border-white/5">
            <div class="text-slate-400 text-[11px]">Fotos no Acervo</div>
            <div class="font-black text-amber-300 text-xs sm:text-sm mt-0.5" id="ks-sim-total-photos">-- fotos</div>
          </div>
          <div class="p-2 rounded-lg bg-slate-900/60 border border-white/5">
            <div class="text-slate-400 text-[11px]">Custo Cloudflare R2</div>
            <div class="font-black text-slate-200 text-xs sm:text-sm mt-0.5" id="ks-sim-r2-cost">R$ 0,00</div>
          </div>
        </div>
      </div>

      <!-- Card 2: Simulador Dinâmico de Fotos -->
      <div class="p-4 rounded-xl bg-slate-800/70 border border-amber-500/25 space-y-4">
        <div class="flex items-center gap-2 text-amber-300 font-black text-sm">
          <i class="fas fa-calculator text-amber-400"></i>
          <span>Simulador Inteligente: Quantas fotos cabem?</span>
        </div>

        <!-- Seletor de Resolução / Peso Médio da Foto -->
        <div>
          <label class="block text-xs font-bold text-slate-300 mb-2">Selecione a qualidade média do seu upload:</label>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs" id="ks-sim-quality-radios">
            <button type="button" data-mb="2" class="ks-sim-btn active px-3 py-2.5 rounded-xl border border-amber-400 bg-amber-500/20 text-white font-bold text-left transition flex flex-col justify-between">
              <span class="flex items-center gap-1.5"><i class="fas fa-bolt text-amber-400"></i> Web Otimizada</span>
              <span class="text-[11px] text-amber-200 font-normal mt-0.5">~2 MB / foto</span>
            </button>
            <button type="button" data-mb="6" class="ks-sim-btn px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-300 font-bold text-left transition hover:border-slate-500 flex flex-col justify-between">
              <span class="flex items-center gap-1.5"><i class="fas fa-camera text-sky-400"></i> JPEG Alta Definição</span>
              <span class="text-[11px] text-slate-400 font-normal mt-0.5">~6 MB / foto</span>
            </button>
            <button type="button" data-mb="20" class="ks-sim-btn px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-300 font-bold text-left transition hover:border-slate-500 flex flex-col justify-between">
              <span class="flex items-center gap-1.5"><i class="fas fa-gem text-purple-400"></i> RAW / Alta Res</span>
              <span class="text-[11px] text-slate-400 font-normal mt-0.5">~20 MB / foto</span>
            </button>
          </div>
        </div>

        <!-- Resultado do Cálculo de Capacidade -->
        <div class="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-slate-900 border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <div class="text-xs text-amber-200/90 font-medium">Capacidade total estimada para o seu plano:</div>
            <div class="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight mt-0.5 flex items-center justify-center sm:justify-start gap-2">
              <span id="ks-sim-result-photos">~30.000 fotos</span>
            </div>
            <div class="text-[11px] text-slate-400 mt-0.5" id="ks-sim-result-desc">No espaço total de 60 GB a ~2 MB por foto.</div>
          </div>
          <div class="sm:border-l sm:border-amber-500/20 sm:pl-4 flex flex-col items-center sm:items-start">
            <span class="text-[11px] text-slate-400">Fotos que ainda cabem no espaço livre:</span>
            <span class="text-lg sm:text-xl font-extrabold text-emerald-400 mt-0.5" id="ks-sim-result-remaining">~26.000 fotos</span>
          </div>
        </div>

        <!-- Calculadora de Ensaios / Eventos -->
        <div class="pt-3 border-t border-white/5 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-300">Quantas fotos você entrega por ensaio/evento?</span>
            <span class="font-black text-amber-400 text-sm" id="ks-sim-event-size-label">150 fotos</span>
          </div>
          <input type="range" id="ks-sim-event-slider" min="30" max="600" step="10" value="150" class="w-full accent-amber-500 cursor-pointer">
          <div class="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>30 fotos (Mini)</span>
            <span>150 fotos (Padrão)</span>
            <span>300 fotos (Casamento)</span>
            <span>600 fotos (Festa)</span>
          </div>
          <div class="p-2.5 rounded-lg bg-slate-900/80 border border-white/5 text-xs text-slate-300 flex items-center gap-2">
            <i class="fas fa-check-circle text-emerald-400 text-sm"></i>
            <span>Seu plano comporta cerca de <strong class="text-amber-300 font-extrabold text-sm" id="ks-sim-event-count">-- ensaios completos</strong> simultâneos!</span>
          </div>
        </div>

      </div>

      <!-- Card 3: Comparativo de Planos & Upgrade -->
      <div class="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
        <div class="flex items-center justify-between">
          <span class="font-bold text-white text-xs uppercase tracking-wider text-slate-400">Conheça Todos os Planos da Plataforma</span>
          <span class="text-[11px] text-amber-400 font-semibold">Cloudflare R2 Integrado</span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 flex flex-col justify-between">
            <div>
              <div class="font-black text-white">Essencial</div>
              <div class="text-[11px] text-amber-400 font-extrabold mt-0.5">20 GB</div>
              <div class="text-[10px] text-slate-400 mt-1">~3.300 fotos</div>
            </div>
            <div class="mt-2 pt-1 border-t border-white/5 text-[10px] text-slate-400">R$ 39,90/mês</div>
          </div>

          <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 flex flex-col justify-between">
            <div>
              <div class="font-black text-white">Pro</div>
              <div class="text-[11px] text-amber-400 font-extrabold mt-0.5">30 GB</div>
              <div class="text-[10px] text-slate-400 mt-1">~5.000 fotos</div>
            </div>
            <div class="mt-2 pt-1 border-t border-white/5 text-[10px] text-slate-400">R$ 59,90/mês</div>
          </div>

          <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/50 flex flex-col justify-between shadow-xs">
            <div>
              <div class="font-black text-amber-300 flex items-center justify-between">Studio King <span class="text-[8px] bg-amber-500 text-slate-950 font-black px-1 rounded">ATUAL</span></div>
              <div class="text-[11px] text-amber-400 font-extrabold mt-0.5">60 GB</div>
              <div class="text-[10px] text-slate-300 mt-1">~10.000 fotos</div>
            </div>
            <div class="mt-2 pt-1 border-t border-amber-500/20 text-[10px] text-amber-200">R$ 99,90/mês</div>
          </div>

          <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60 flex flex-col justify-between">
            <div>
              <div class="font-black text-white">King Master</div>
              <div class="text-[11px] text-amber-400 font-extrabold mt-0.5">100 GB</div>
              <div class="text-[10px] text-slate-400 mt-1">~16.500 fotos</div>
            </div>
            <div class="mt-2 pt-1 border-t border-white/5 text-[10px] text-slate-400">R$ 149,90/mês</div>
          </div>
        </div>

        <div class="pt-2 flex items-center justify-between flex-wrap gap-2 text-xs">
          <span class="text-slate-400">Deseja expandir seu espaço ou tirar dúvidas?</span>
          <a href="https://wa.me/5581997323674?text=Ol%C3%A1%2C%20gostaria%20de%20tirar%20d%C3%BAvidas%20sobre%20os%20planos%20do%20KingSelection" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition">
            <i class="fab fa-whatsapp"></i> Falar com Suporte
          </a>
        </div>
      </div>

    </div>

    <!-- Footer do Modal -->
    <div class="sticky bottom-0 z-10 px-5 py-3 border-t border-white/10 bg-slate-900/95 backdrop-blur-sm flex items-center justify-end">
      <button type="button" onclick="window.closeStorageSimulatorModal?.()" class="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer text-xs">
        Fechar
      </button>
    </div>

  </div>
</div>

<script>
(function() {
  let simState = {
    planName: 'Studio King 60 GB',
    totalGb: 60,
    usedGb: 0,
    photoMb: 2,
    photosCount: 0,
    r2Cost: 'R$ 0,00',
    eventPhotos: 150
  };

  function recalculateSimulation() {
    const totalGb = simState.totalGb || 60;
    const usedGb = simState.usedGb || 0;
    const freeGb = Math.max(0, totalGb - usedGb);
    const photoMb = simState.photoMb || 2;
    const eventPhotos = simState.eventPhotos || 150;

    // Cálculo em fotos
    const totalPossiblePhotos = Math.floor((totalGb * 1024) / photoMb);
    const remainingPossiblePhotos = Math.floor((freeGb * 1024) / photoMb);
    const totalEvents = Math.floor(totalPossiblePhotos / eventPhotos);

    const fmt = n => n.toLocaleString('pt-BR');

    const resPhotos = document.getElementById('ks-sim-result-photos');
    if (resPhotos) resPhotos.textContent = `~${fmt(totalPossiblePhotos)} fotos`;

    const resDesc = document.getElementById('ks-sim-result-desc');
    if (resDesc) resDesc.textContent = `No espaço total de ${totalGb} GB a ~${photoMb} MB por foto.`;

    const resRem = document.getElementById('ks-sim-result-remaining');
    if (resRem) resRem.textContent = `~${fmt(remainingPossiblePhotos)} fotos`;

    const resEvents = document.getElementById('ks-sim-event-count');
    if (resEvents) resEvents.textContent = `${fmt(totalEvents)} ensaios completos`;

    const eventLabel = document.getElementById('ks-sim-event-size-label');
    if (eventLabel) eventLabel.textContent = `${eventPhotos} fotos`;

    const freeGbEl = document.getElementById('ks-sim-free-gb');
    if (freeGbEl) freeGbEl.textContent = `${freeGb.toFixed(2)} GB`;
  }

  window.openStorageSimulatorModal = function() {
    const modal = document.getElementById('ks-storage-modal');
    if (!modal) return;

    // Sincroniza dados com o que já foi carregado na página
    const usedEl = document.getElementById('ks-storage-used') || document.getElementById('ks-quota-used-text');
    const limitEl = document.getElementById('ks-storage-limit') || document.getElementById('ks-quota-max-text');
    const planTagEl = document.getElementById('ks-storage-plan-tag') || document.getElementById('ks-quota-badge');
    const countAllEl = document.getElementById('p-count-all');

    if (limitEl) {
      const match = limitEl.textContent.match(/([\d\.]+)/);
      if (match) simState.totalGb = parseFloat(match[1]) || 60;
    }
    if (usedEl) {
      const match = usedEl.textContent.match(/([\d\.]+)/);
      if (match) simState.usedGb = parseFloat(match[1]) || 0;
    }
    if (countAllEl) {
      const c = parseInt(countAllEl.textContent.replace(/\D/g, ''), 10);
      if (!isNaN(c)) simState.photosCount = c;
    }

    const pct = simState.totalGb > 0 ? Math.min(100, (simState.usedGb / simState.totalGb) * 100) : 0;

    const planNameEl = document.getElementById('ks-sim-plan-name');
    if (planNameEl) planNameEl.textContent = `Plano Studio King ${simState.totalGb} GB`;

    const simPlanTag = document.getElementById('ks-sim-plan-tag');
    if (simPlanTag) simPlanTag.textContent = `${simState.totalGb} GB`;

    const usedGbEl = document.getElementById('ks-sim-used-gb');
    if (usedGbEl) usedGbEl.textContent = `${simState.usedGb.toFixed(2)} GB`;

    const limitGbEl = document.getElementById('ks-sim-limit-gb');
    if (limitGbEl) limitGbEl.textContent = `${simState.totalGb} GB`;

    const pctEl = document.getElementById('ks-sim-pct');
    if (pctEl) pctEl.textContent = `${pct.toFixed(1)}%`;

    const barEl = document.getElementById('ks-sim-bar');
    if (barEl) barEl.style.width = `${pct}%`;

    const photosEl = document.getElementById('ks-sim-total-photos');
    if (photosEl) photosEl.textContent = simState.photosCount > 0 ? `${simState.photosCount.toLocaleString('pt-BR')} fotos` : `${simState.usedGb > 0 ? Math.round(simState.usedGb * 200).toLocaleString('pt-BR') : '0'} fotos`;

    recalculateSimulation();

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  window.closeStorageSimulatorModal = function() {
    const modal = document.getElementById('ks-storage-modal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = '';
  };

  // Eventos de clique nas qualidades
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.ks-sim-btn');
    if (btn) {
      document.querySelectorAll('.ks-sim-btn').forEach(b => {
        b.classList.remove('active', 'border-amber-400', 'bg-amber-500/20', 'text-white');
        b.classList.add('border-slate-700', 'bg-slate-900/60', 'text-slate-300');
      });
      btn.classList.add('active', 'border-amber-400', 'bg-amber-500/20', 'text-white');
      btn.classList.remove('border-slate-700', 'bg-slate-900/60', 'text-slate-300');
      simState.photoMb = parseFloat(btn.getAttribute('data-mb')) || 2;
      recalculateSimulation();
    }

    // Fechar ao clicar fora
    const modal = document.getElementById('ks-storage-modal');
    if (modal && e.target === modal) {
      window.closeStorageSimulatorModal();
    }
  });

  // Slider de ensaios
  document.addEventListener('input', function(e) {
    if (e.target && e.target.id === 'ks-sim-event-slider') {
      simState.eventPhotos = parseInt(e.target.value, 10) || 150;
      recalculateSimulation();
    }
  });

  // Fechar com ESC
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      window.closeStorageSimulatorModal?.();
    }
  });
})();
</script>

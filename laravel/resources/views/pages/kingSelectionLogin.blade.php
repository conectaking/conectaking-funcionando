<!DOCTYPE html>
<html class="dark" lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
  <title>King Selection — Plataforma de Seleção e Venda para Fotógrafos | Conecta King</title>
  <link rel="icon" type="image/png" href="https://i.ibb.co/60sW9k75/logo.png"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet"/>
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"/>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>

  <style>
    @layer base {
      html, body { margin: 0; padding: 0; }
      body { overscroll-behavior: none; }
      main > :first-child { margin-top: 0 !important; }
      main > :last-child { margin-bottom: 0 !important; }
    }
    ::-webkit-scrollbar { display: none; }

    /* Previne autofill branco no Android/Chrome */
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus {
      -webkit-text-fill-color: #dfe2ec !important;
      -webkit-box-shadow: 0 0 0px 1000px #0a0e15 inset !important;
      box-shadow: 0 0 0px 1000px #0a0e15 inset !important;
      transition: background-color 5000s ease-in-out 0s;
    }

    .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
  </style>

  <script id="tailwind-config">
    tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          colors: {
            "secondary-fixed": "#6ffbbe",
            "on-surface": "#dfe2ec",
            "tertiary-fixed": "#c9e6ff",
            "on-background": "#dfe2ec",
            "surface-bright": "#353941",
            "background": "#0f131b",
            "outline-variant": "#534434",
            "primary-container": "#f59e0b",
            "error": "#ffb4ab",
            "on-error-container": "#ffdad6",
            "inverse-on-surface": "#2d3038",
            "primary": "#fbbf24",
            "surface-container-lowest": "#0a0e15",
            "surface": "#0f131b",
            "on-tertiary": "#00344d",
            "tertiary-container": "#42bbff",
            "surface-tint": "#fbbf24",
            "tertiary": "#98d3ff",
            "tertiary-fixed-dim": "#89ceff",
            "surface-container-highest": "#31353d",
            "outline": "#a08e7a",
            "on-tertiary-fixed": "#001e2f",
            "surface-dim": "#0f131b",
            "on-secondary-fixed": "#002113",
            "surface-container-high": "#262a32",
            "inverse-surface": "#dfe2ec",
            "primary-fixed": "#ffddb8",
            "on-primary-fixed": "#2a1700",
            "secondary-fixed-dim": "#4edea3",
            "on-secondary": "#003824",
            "primary-fixed-dim": "#fbbf24",
            "secondary-container": "#00a572",
            "on-surface-variant": "#d8c3ad",
            "on-primary": "#000000",
            "surface-container": "#1c2027",
            "surface-variant": "#31353d",
            "secondary": "#4edea3",
            "on-secondary-fixed-variant": "#005236",
            "on-primary-container": "#613b00",
            "surface-container-low": "#181c23",
            "inverse-primary": "#855300",
            "on-error": "#690005",
            "on-tertiary-container": "#004869",
            "on-primary-fixed-variant": "#653e00",
            "on-secondary-container": "#00311f",
            "error-container": "#93000a",
            "on-tertiary-fixed-variant": "#004c6e"
          },
          borderRadius: {
            DEFAULT: "0.25rem",
            lg: "0.5rem",
            xl: "0.75rem",
            full: "9999px"
          },
          spacing: {
            "margin": "2rem",
            "space-sm": "0.5rem",
            "space-md": "1rem",
            "gutter-mobile": "1rem",
            "space-xs": "0.25rem",
            "margin-mobile": "1rem",
            "space-lg": "1.5rem",
            "gutter": "1.5rem",
            "space-xl": "2.5rem"
          },
          fontFamily: {
            "headline-lg-mobile": ["Plus Jakarta Sans", "sans-serif"],
            "headline-lg": ["Plus Jakarta Sans", "sans-serif"],
            "headline-md": ["Plus Jakarta Sans", "sans-serif"],
            "label-mono-lg": ["JetBrains Mono", "monospace"],
            "display-lg-mobile": ["Plus Jakarta Sans", "sans-serif"],
            "headline-sm": ["Plus Jakarta Sans", "sans-serif"],
            "body-lg": ["Plus Jakarta Sans", "sans-serif"],
            "body-sm": ["Plus Jakarta Sans", "sans-serif"],
            "label-mono-sm": ["JetBrains Mono", "monospace"],
            "body-md": ["Plus Jakarta Sans", "sans-serif"],
            "display-lg": ["Plus Jakarta Sans", "sans-serif"]
          },
          fontSize: {
            "headline-lg-mobile": ["26px", { lineHeight: "34px", letterSpacing: "-0.01em", fontWeight: "700" }],
            "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
            "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "600" }],
            "label-mono-lg": ["14px", { lineHeight: "20px", letterSpacing: "0.02em", fontWeight: "500" }],
            "display-lg-mobile": ["36px", { lineHeight: "44px", letterSpacing: "-0.02em", fontWeight: "800" }],
            "headline-sm": ["20px", { lineHeight: "28px", letterSpacing: "0", fontWeight: "600" }],
            "body-lg": ["16px", { lineHeight: "26px", letterSpacing: "0", fontWeight: "400" }],
            "body-sm": ["12px", { lineHeight: "18px", letterSpacing: "0.01em", fontWeight: "400" }],
            "label-mono-sm": ["11px", { lineHeight: "16px", letterSpacing: "0.04em", fontWeight: "500" }],
            "body-md": ["14px", { lineHeight: "22px", letterSpacing: "0", fontWeight: "400" }],
            "display-lg": ["56px", { lineHeight: "64px", letterSpacing: "-0.03em", fontWeight: "800" }]
          }
        }
      }
    };
  </script>
</head>

<body class="bg-background font-body-md text-on-surface antialiased selection:bg-amber-400 selection:text-slate-950 min-h-screen">

  <!-- TOP HEADER -->
  <header class="fixed top-0 left-0 right-0 z-50 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.4)] border-b border-amber-500/10">
    <div class="h-20 w-full px-margin flex items-center justify-between gap-space-md">
      
      <!-- Brand Logo -->
      <a href="/" class="flex items-center gap-space-lg flex-shrink-0 text-decoration-none">
        <div class="flex items-center gap-space-sm">
          <div class="w-10 h-10 rounded-lg bg-surface-container-high border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)]">
            <span class="material-symbols-outlined text-[24px] text-amber-400">crown</span>
          </div>
          <div class="flex flex-col">
            <span class="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold leading-none">King Selection</span>
            <div class="flex items-center gap-1 mt-1">
              <span class="font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase tracking-wider">Powered by</span>
              <span class="font-label-mono-sm text-label-mono-sm text-amber-400 font-bold flex items-center gap-0.5">
                <span class="material-symbols-outlined text-[13px] text-amber-400">military_tech</span>Conecta King
              </span>
            </div>
          </div>
        </div>
      </a>

      <!-- Navigation Links -->
      <nav class="hidden xl:flex items-center gap-space-sm">
        <a class="px-3 py-2 text-on-surface-variant hover:text-amber-400 hover:bg-surface-container transition-colors rounded-lg font-body-md text-body-md" href="#recursos">Recursos</a>
        <a class="px-3 py-2 text-on-surface-variant hover:text-amber-400 hover:bg-surface-container transition-colors rounded-lg font-body-md text-body-md" href="#comparativo">Comparativo</a>
        <a class="px-3 py-2 text-on-surface-variant hover:text-amber-400 hover:bg-surface-container transition-colors rounded-lg font-body-md text-body-md" href="#simulador">Simulador</a>
        <a class="px-3 py-2 text-on-surface-variant hover:text-amber-400 hover:bg-surface-container transition-colors rounded-lg font-body-md text-body-md" href="#planos-e-precos">Planos e Preços</a>
        <a class="px-3 py-2 text-on-surface-variant hover:text-amber-400 hover:bg-surface-container transition-colors rounded-lg font-body-md text-body-md" href="#faq">FAQ</a>
      </nav>

      <!-- Right Header Actions (WhatsApp + Botão Separado Área do Fotógrafo) -->
      <div class="flex items-center gap-2 sm:gap-space-md flex-shrink-0">
        <a class="hidden md:inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary-container hover:bg-secondary text-on-secondary hover:text-on-secondary font-headline-sm text-body-sm font-semibold tracking-wide transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_28px_rgba(16,185,129,0.35)]" href="https://wa.me/5511988789417" rel="noopener noreferrer" target="_blank">
          <span class="material-symbols-outlined text-[18px]">chat</span>
          <span>(11) 98878-9417</span>
        </a>
        
        <!-- Botão Exclusivo de Login para Fotógrafo -->
        <button type="button" onclick="openLoginModal()" class="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-headline-sm text-body-sm font-bold tracking-wide transition-all shadow-[0_0_25px_rgba(245,158,11,0.45)] hover:shadow-[0_0_35px_rgba(245,158,11,0.65)] cursor-pointer">
          <span class="material-symbols-outlined text-[18px] text-slate-950 font-bold">lock_open</span>
          <span>Área do Fotógrafo</span>
        </button>
        
        <button type="button" onclick="openLoginModal()" class="w-8 h-8 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.4)] cursor-pointer" title="Fazer Login">
          <span class="material-symbols-outlined text-slate-950 text-[18px]">person</span>
        </button>
      </div>
    </div>
  </header>

  <main class="w-full pt-20 bg-background">
    <div class="flex flex-col w-full">

      <!-- HERO SECTION -->
      <section class="relative w-full overflow-hidden px-margin py-space-xl lg:py-28">
        <div class="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute top-1/2 right-0 w-[500px] h-[500px] bg-secondary-container/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center relative z-10">
          
          <!-- Coluna de Texto e CTAs -->
          <div class="lg:col-span-7 flex flex-col items-start gap-space-md">
            
            <!-- Pílula Luminosa Superior -->
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-high border border-amber-400/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] text-amber-300">
              <span class="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse"></span>
              <span class="font-label-mono-sm text-label-mono-sm tracking-wider uppercase font-bold text-amber-300">
                Reconhecimento Facial IA • Fotos Extras no Pix • Cloudflare R2 • Anti-Print
              </span>
            </div>

            <!-- Headline de Choque -->
            <h1 class="font-display-lg text-display-lg-mobile lg:text-display-lg text-on-surface tracking-tight leading-[1.08] font-black">
              A Plataforma de Seleção e Venda que Transforma Ensaios em <span class="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent font-black drop-shadow-[0_0_20px_rgba(245,158,11,0.35)] underline decoration-amber-400/50 underline-offset-8">Máquinas de Lucro</span>.
            </h1>

            <!-- Subheadline Persuasiva -->
            <p class="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">
              Chega de perder tempo e dinheiro com Google Drive e WeTransfer. Entregue uma experiência de luxo direto no smartphone do seu cliente, fature até <strong class="text-secondary font-semibold">70% a mais</strong> com venda automática de fotos extras no Pix e blinde seu trabalho contra prints não autorizados.
            </p>

            <!-- CTAs Principais -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm w-full pt-space-xs">
              <a class="inline-flex justify-center items-center gap-2 px-7 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-headline-sm text-body-lg font-extrabold tracking-wide transition-all shadow-[0_0_35px_rgba(245,158,11,0.55)] hover:shadow-[0_0_45px_rgba(245,158,11,0.7)]" href="#planos-e-precos">
                <span>Ver Planos & Contratar</span>
                <span class="material-symbols-outlined text-[20px] font-bold">arrow_forward</span>
              </a>
              <button type="button" onclick="openLoginModal()" class="inline-flex justify-center items-center gap-2 px-6 py-4 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-headline-sm text-body-lg font-semibold transition-all border border-amber-400/20 hover:border-amber-400/40 cursor-pointer">
                <span class="material-symbols-outlined text-amber-400 text-[20px]">lock_open</span>
                <span>Entrar no Painel</span>
              </button>
              <a class="inline-flex justify-center items-center gap-2 px-6 py-4 rounded-xl bg-secondary-container hover:bg-secondary text-on-secondary font-headline-sm text-body-lg font-bold transition-all shadow-[0_0_24px_rgba(16,185,129,0.25)]" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Quero%20falar%20com%20um%20consultor%20da%20Conecta%20King." rel="noopener noreferrer" target="_blank">
                <span class="material-symbols-outlined text-[20px]">chat</span>
                <span>Consultor VIP</span>
              </a>
            </div>

            <!-- Badges de Autoridade -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-space-md w-full">
              <div class="p-3 rounded-xl bg-surface-container-low border border-amber-400/20 flex items-center gap-2 shadow-[0_0_12px_rgba(245,158,11,0.08)]">
                <span class="material-symbols-outlined text-amber-400 text-[20px]">face</span>
                <div class="flex flex-col">
                  <span class="font-label-mono-sm text-label-mono-sm text-on-surface font-semibold">Face AI</span>
                  <span class="font-body-sm text-[11px] text-amber-300/80 font-mono">&lt; 0.8s match</span>
                </div>
              </div>
              <div class="p-3 rounded-xl bg-surface-container-low border border-amber-400/20 flex items-center gap-2 shadow-[0_0_12px_rgba(245,158,11,0.08)]">
                <span class="material-symbols-outlined text-amber-400 text-[20px]">shield</span>
                <div class="flex flex-col">
                  <span class="font-label-mono-sm text-label-mono-sm text-on-surface font-semibold">Anti-Print</span>
                  <span class="font-body-sm text-[11px] text-on-surface-variant">Grade Tiled R2</span>
                </div>
              </div>
              <div class="p-3 rounded-xl bg-surface-container-low border border-secondary/20 flex items-center gap-2">
                <span class="material-symbols-outlined text-secondary text-[20px]">cloud_done</span>
                <div class="flex flex-col">
                  <span class="font-label-mono-sm text-label-mono-sm text-on-surface font-semibold">Cloudflare</span>
                  <span class="font-body-sm text-[11px] text-on-surface-variant">Zero latência</span>
                </div>
              </div>
              <div class="p-3 rounded-xl bg-surface-container-low border border-secondary/20 flex items-center gap-2">
                <span class="material-symbols-outlined text-secondary text-[20px]">payments</span>
                <div class="flex flex-col">
                  <span class="font-label-mono-sm text-label-mono-sm text-on-surface font-semibold">Pix Direto</span>
                  <span class="font-body-sm text-[11px] text-on-surface-variant">100% seu lucro</span>
                </div>
              </div>
            </div>

          </div>

          <!-- Coluna Mockup Interativo -->
          <div class="lg:col-span-5 relative flex justify-center">
            <!-- Glow sob a interface -->
            <div class="absolute inset-0 bg-amber-500/25 blur-3xl rounded-3xl"></div>
            
            <div class="relative w-full max-w-sm sm:max-w-md bg-surface-container-low rounded-3xl p-4 shadow-2xl border border-amber-400/30 overflow-hidden">
              <!-- Barra Superior Mockup Mobile -->
              <div class="flex items-center justify-between pb-3 px-1 text-on-surface-variant">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-error"></span>
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]"></span>
                  <span class="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                  <span class="font-label-mono-sm text-label-mono-sm text-on-surface font-semibold ml-2">Casamento Isabella & Lucas</span>
                </div>
                <span class="font-label-mono-sm text-[10px] px-2 py-0.5 rounded bg-surface-container-high border border-amber-400/40 text-amber-300 font-bold shadow-[0_0_8px_rgba(245,158,11,0.25)]">SESSÃO ATIVA</span>
              </div>

              <!-- Container da Imagem com Marca d'água -->
              <div class="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-surface-container-highest shadow-inner group">
                <img class="w-full h-full object-cover" alt="Noiva em ensaio de casamento" src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80"/>
                
                <!-- Marca D'água Tiled Transparente Dinâmica -->
                <div class="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 p-4 opacity-35 select-none">
                  <span class="font-label-mono-sm text-[11px] text-amber-200 font-bold rotate-[-25deg] flex items-center justify-center">KING SELECTION • PROVA</span>
                  <span class="font-label-mono-sm text-[11px] text-amber-200 font-bold rotate-[-25deg] flex items-center justify-center">PROIBIDO PRINT</span>
                  <span class="font-label-mono-sm text-[11px] text-amber-200 font-bold rotate-[-25deg] flex items-center justify-center">STUDIO VIP</span>
                  <span class="font-label-mono-sm text-[11px] text-amber-200 font-bold rotate-[-25deg] flex items-center justify-center">STUDIO VIP</span>
                  <span class="font-label-mono-sm text-[11px] text-amber-200 font-bold rotate-[-25deg] flex items-center justify-center">KING SELECTION • PROVA</span>
                  <span class="font-label-mono-sm text-[11px] text-amber-200 font-bold rotate-[-25deg] flex items-center justify-center">PROIBIDO PRINT</span>
                  <span class="font-label-mono-sm text-[11px] text-amber-200 font-bold rotate-[-25deg] flex items-center justify-center">PROIBIDO PRINT</span>
                  <span class="font-label-mono-sm text-[11px] text-amber-200 font-bold rotate-[-25deg] flex items-center justify-center">STUDIO VIP</span>
                  <span class="font-label-mono-sm text-[11px] text-amber-200 font-bold rotate-[-25deg] flex items-center justify-center">KING SELECTION • PROVA</span>
                </div>

                <!-- Botão Coração Favorito Ativo -->
                <div class="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-lowest/85 backdrop-blur-md shadow-lg border border-amber-400/30">
                  <span class="material-symbols-outlined text-rose-500 text-[18px]" style="font-variation-settings: 'FILL' 1;">favorite</span>
                  <span class="font-label-mono-sm text-label-mono-sm text-on-surface font-bold">Selecionada</span>
                </div>

                <!-- Identificador de Foto -->
                <div class="absolute bottom-3 left-3 px-2.5 py-1 rounded-md bg-surface-container-lowest/80 backdrop-blur-sm">
                  <span class="font-label-mono-sm text-label-mono-sm text-on-surface-variant font-mono">IMG_8492.CR3</span>
                </div>
              </div>

              <!-- Caixa de Nota de Retoque -->
              <div class="mt-3 p-3 rounded-xl bg-surface-container border border-amber-400/20 flex items-start gap-2.5">
                <span class="material-symbols-outlined text-amber-400 text-[20px] mt-0.5">draw</span>
                <div class="flex flex-col w-full">
                  <div class="flex items-center justify-between">
                    <span class="font-label-mono-sm text-label-mono-sm text-amber-400 font-bold">Nota de Edição do Cliente</span>
                    <span class="font-label-mono-sm text-[10px] text-secondary">Salvo automaticamente</span>
                  </div>
                  <p class="font-body-sm text-body-sm text-on-surface mt-0.5 italic">"Suavizar reflexo no vestido e atenuar a sombra no rosto."</p>
                </div>
              </div>

              <!-- Contador de Fotos e Status de Excedente -->
              <div class="mt-3 p-3.5 rounded-xl bg-surface-container-high border border-amber-400/30 flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="font-body-sm text-body-sm text-on-surface font-medium">Contador de Fotos</span>
                  <span class="font-label-mono-sm text-label-mono-sm text-amber-400 font-black">28 de 20 inclusas</span>
                </div>
                <!-- Progress Bar -->
                <div class="w-full h-2 rounded-full bg-surface-container-lowest overflow-hidden flex">
                  <div class="h-full bg-secondary" style="width: 71%;"></div>
                  <div class="h-full bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_10px_#f59e0b]" style="width: 29%;"></div>
                </div>
                <div class="flex items-center justify-between text-on-surface-variant font-label-mono-sm text-[11px]">
                  <span class="text-secondary flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-secondary"></span> 20 Pacote Básico</span>
                  <span class="text-amber-400 flex items-center gap-1 font-bold"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]"></span> +8 Fotos Extras (R$ 120,00)</span>
                </div>
              </div>

              <!-- Notificação Flutuante de Venda Pix -->
              <div class="mt-3 p-3 rounded-xl bg-secondary-container/20 shadow-lg flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary">
                  <span class="material-symbols-outlined text-[20px]">paid</span>
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="font-label-mono-sm text-label-mono-sm text-secondary font-bold truncate">Pix Recebido no Banco!</span>
                  <span class="font-body-sm text-[12px] text-on-surface">Cliente comprou 8 fotos extras (R$ 120,00)</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      <!-- BARRA DE MÉTRICAS & RESULTADOS REAIS -->
      <section class="w-full bg-surface-container-lowest py-space-lg px-margin shadow-inner border-y border-amber-500/10">
        <div class="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-space-md">
          <div class="flex flex-col gap-1 p-4 rounded-xl bg-surface-container-low border border-amber-400/20 shadow-[0_0_15px_rgba(245,158,11,0.06)]">
            <div class="flex items-center gap-2">
              <span class="font-display-lg text-headline-lg lg:text-display-lg text-amber-400 font-black leading-none drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]">+70%</span>
              <span class="material-symbols-outlined text-secondary text-[24px]">trending_up</span>
            </div>
            <span class="font-headline-sm text-body-md text-on-surface font-bold">Faturamento por Ensaio</span>
            <span class="font-body-sm text-body-sm text-on-surface-variant">Média real gerada pela venda automática e irresistível de fotos extras no Pix.</span>
          </div>

          <div class="flex flex-col gap-1 p-4 rounded-xl bg-surface-container-low border border-surface-variant">
            <div class="flex items-center gap-2">
              <span class="font-display-lg text-headline-lg lg:text-display-lg text-secondary font-black leading-none">0.8s</span>
              <span class="material-symbols-outlined text-amber-400 text-[24px]">bolt</span>
            </div>
            <span class="font-headline-sm text-body-md text-on-surface font-bold">Match Facial Instantâneo</span>
            <span class="font-body-sm text-body-sm text-on-surface-variant">IA ArcFace localiza o convidado entre 4.000 fotos de casamento em 1 selfie.</span>
          </div>

          <div class="flex flex-col gap-1 p-4 rounded-xl bg-surface-container-low border border-surface-variant">
            <div class="flex items-center gap-2">
              <span class="font-display-lg text-headline-lg lg:text-display-lg text-on-surface font-black leading-none">0%</span>
              <span class="material-symbols-outlined text-rose-400 text-[24px]">do_not_disturb_on</span>
            </div>
            <span class="font-headline-sm text-body-md text-on-surface font-bold">Prints Não Autorizados</span>
            <span class="font-body-sm text-body-sm text-on-surface-variant">Grade tiling anti-recorte inviabiliza postagens de fotos não aprovadas ou impagas.</span>
          </div>

          <div class="flex flex-col gap-1 p-4 rounded-xl bg-surface-container-low border border-amber-400/20 shadow-[0_0_15px_rgba(245,158,11,0.06)]">
            <div class="flex items-center gap-2">
              <span class="font-display-lg text-headline-lg lg:text-display-lg text-amber-400 font-black leading-none drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]">3x</span>
              <span class="material-symbols-outlined text-secondary text-[24px]">speed</span>
            </div>
            <span class="font-headline-sm text-body-md text-on-surface font-bold">Mais Rápido no Upload</span>
            <span class="font-body-sm text-body-sm text-on-surface-variant">Compressão multi-thread direto no navegador antes do envio para a nuvem R2.</span>
          </div>
        </div>
      </section>

      <!-- SEÇÃO "O FIM DO CAOS" (COMPARAÇÃO VISUAL DE ALTO CONTRASTE) -->
      <section class="w-full px-margin py-space-xl lg:py-24 max-w-7xl mx-auto" id="comparativo">
        <div class="flex flex-col items-center text-center gap-space-xs mb-space-xl">
          <span class="font-label-mono-sm text-label-mono-sm text-amber-400 uppercase font-black tracking-widest">Evolução do Fluxo de Trabalho</span>
          <h2 class="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-on-surface font-bold">
            O Fim do Caos: Como Você Trabalha Hoje vs. <span class="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent font-black drop-shadow-[0_0_20px_rgba(245,158,11,0.35)]">Com o King Selection</span>
          </h2>
          <p class="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            O método tradicional desgasta seu relacionamento com o cliente e deixa centenas de reais na mesa. Veja o abismo entre os dois mundos.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-space-lg items-stretch">
          
          <!-- O Jeito Amador e Lento -->
          <div class="p-space-lg rounded-2xl bg-surface-container-low flex flex-col justify-between border border-surface-variant">
            <div class="flex flex-col gap-space-md">
              <div class="flex items-center justify-between pb-3 border-b border-surface-variant">
                <div class="flex items-center gap-2 text-rose-400">
                  <span class="material-symbols-outlined text-[24px]">cancel</span>
                  <span class="font-headline-sm text-headline-sm font-bold">O Jeito Antigo e Amador</span>
                </div>
                <span class="font-label-mono-sm text-label-mono-sm text-on-surface-variant px-2.5 py-1 rounded bg-surface-container-high">Google Drive / WeTransfer</span>
              </div>
              <div class="flex flex-col gap-space-sm text-on-surface-variant font-body-md text-body-md">
                <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container/50">
                  <span class="material-symbols-outlined text-rose-400 text-[20px] flex-shrink-0 mt-0.5">close</span>
                  <p><strong class="text-on-surface">Links feios e pastas zip:</strong> O cliente precisa baixar arquivos pesados ou não consegue abrir no celular.</p>
                </div>
                <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container/50">
                  <span class="material-symbols-outlined text-rose-400 text-[20px] flex-shrink-0 mt-0.5">close</span>
                  <p><strong class="text-on-surface">Semanas de atraso:</strong> Cliente enrola para responder digitando códigos infinitos no WhatsApp (ex: IMG_0921, IMG_0924).</p>
                </div>
                <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container/50">
                  <span class="material-symbols-outlined text-rose-400 text-[20px] flex-shrink-0 mt-0.5">close</span>
                  <p><strong class="text-on-surface">Pirataria por print:</strong> O cliente tira print da miniatura, publica no Instagram e nunca contrata as fotos extras.</p>
                </div>
                <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container/50">
                  <span class="material-symbols-outlined text-rose-400 text-[20px] flex-shrink-0 mt-0.5">close</span>
                  <p><strong class="text-on-surface">Mensagens confusas de retoque:</strong> "Na foto onde estou de lado arruma meu braço" sem você saber qual foto é.</p>
                </div>
                <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container/50">
                  <span class="material-symbols-outlined text-rose-400 text-[20px] flex-shrink-0 mt-0.5">close</span>
                  <p><strong class="text-on-surface">Zero receita adicional:</strong> Falta de checkout imediato faz você perder vendas quentes de impulsão.</p>
                </div>
              </div>
            </div>
            <div class="mt-6 pt-4 text-center border-t border-surface-variant">
              <span class="font-label-mono-sm text-label-mono-sm text-rose-400 font-medium">Resultado: Horas perdidas, frustração e prejuízo financeiro.</span>
            </div>
          </div>

          <!-- O Ecossistema King Selection -->
          <div class="p-space-lg rounded-2xl bg-surface-container-high shadow-2xl flex flex-col justify-between relative overflow-hidden border border-amber-400/40">
            <div class="absolute -top-16 -right-16 w-48 h-48 bg-amber-500/20 rounded-full blur-2xl"></div>
            <div class="flex flex-col gap-space-md relative z-10">
              <div class="flex items-center justify-between pb-3 border-b border-amber-400/20">
                <div class="flex items-center gap-2 text-amber-400">
                  <span class="material-symbols-outlined text-[24px] text-amber-400" style="font-variation-settings: 'FILL' 1;">check_circle</span>
                  <span class="font-headline-sm text-headline-sm font-bold text-on-surface">Ecossistema King Selection</span>
                </div>
                <span class="font-label-mono-sm text-label-mono-sm text-on-secondary px-2.5 py-1 rounded bg-secondary-container font-semibold">ALTA CONVERSÃO</span>
              </div>
              <div class="flex flex-col gap-space-sm text-on-surface-variant font-body-md text-body-md">
                <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container">
                  <span class="material-symbols-outlined text-secondary text-[20px] flex-shrink-0 mt-0.5">check</span>
                  <p><strong class="text-on-surface">App de luxo sem instalação:</strong> O cliente clica no link exclusivo pelo WhatsApp e navega suave com gestos fluidos.</p>
                </div>
                <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container">
                  <span class="material-symbols-outlined text-secondary text-[20px] flex-shrink-0 mt-0.5">check</span>
                  <p><strong class="text-on-surface">Seleção em 1 toque:</strong> O cliente toca no coração, o contador calcula automaticamente as excedentes.</p>
                </div>
                <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container">
                  <span class="material-symbols-outlined text-secondary text-[20px] flex-shrink-0 mt-0.5">check</span>
                  <p><strong class="text-on-surface">Anti-Print Implacável:</strong> Grade com a logo do estúdio impede o uso indevido da imagem antes do pagamento.</p>
                </div>
                <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container">
                  <span class="material-symbols-outlined text-secondary text-[20px] flex-shrink-0 mt-0.5">check</span>
                  <p><strong class="text-on-surface">Instruções por foto:</strong> Caixa dedicada de anotações de edição em cada arquivo selecionado.</p>
                </div>
                <div class="flex items-start gap-3 p-3 rounded-xl bg-surface-container">
                  <span class="material-symbols-outlined text-secondary text-[20px] flex-shrink-0 mt-0.5">check</span>
                  <p><strong class="text-on-surface">Venda no Pix e Exportação Lightroom:</strong> Checkout instantâneo e lista de arquivos copiada com 1 clique para colar no Lightroom.</p>
                </div>
              </div>
            </div>
            <div class="mt-6 pt-4 text-center border-t border-amber-400/20">
              <span class="font-label-mono-sm text-label-mono-sm text-amber-400 font-extrabold drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">Resultado: Experiência VIP, mais dinheiro no bolso e aprovação em horas.</span>
            </div>
          </div>

        </div>
      </section>

      <!-- OS 8 PILARES DO KING SELECTION (CARDS DE LUXO) -->
      <section class="w-full bg-surface-container-lowest px-margin py-space-xl lg:py-24 border-t border-amber-500/10" id="recursos">
        <div class="max-w-7xl mx-auto flex flex-col gap-space-xl">
          <div class="flex flex-col items-center text-center gap-space-xs">
            <span class="font-label-mono-sm text-label-mono-sm text-amber-400 uppercase font-bold tracking-widest">Tecnologia Executiva para Estúdios</span>
            <h2 class="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-on-surface font-bold">
              Os 8 Pilares do King Selection
            </h2>
            <p class="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Construído por fotógrafos e engenheiros de software para exterminar gargalos operacionais e multiplicar seu ticket médio.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
            
            <!-- Pilar 1 -->
            <div class="p-space-lg rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col gap-space-sm group border border-amber-400/15 hover:border-amber-400/40">
              <div class="w-12 h-12 rounded-xl bg-surface-container-high border border-amber-400/30 flex items-center justify-center text-amber-400 group-hover:scale-110 shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-transform">
                <span class="material-symbols-outlined text-[28px] text-amber-400">smartphone</span>
              </div>
              <span class="font-label-mono-sm text-[11px] text-amber-400 font-bold uppercase tracking-wider">Pilar 01</span>
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Seleção Mobile-First sem Atrito</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant">Zero downloads ou senhas complexas. Carregamento instantâneo no iPhone e Android com corações e notas por foto.</p>
            </div>

            <!-- Pilar 2 -->
            <div class="p-space-lg rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col gap-space-sm group border border-surface-variant hover:border-secondary/40">
              <div class="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-[28px]">payments</span>
              </div>
              <span class="font-label-mono-sm text-[11px] text-secondary font-bold uppercase tracking-wider">Pilar 02</span>
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Máquina de Venda de Fotos Extras</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant">Defina seu pacote (ex: 25 fotos inclusas) e o preço por excedente (ex: R$ 15/foto). O cliente se encanta e paga na hora no Pix.</p>
            </div>

            <!-- Pilar 3 -->
            <div class="p-space-lg rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col gap-space-sm group border border-amber-400/15 hover:border-amber-400/40">
              <div class="w-12 h-12 rounded-xl bg-surface-container-high border border-amber-400/30 flex items-center justify-center text-amber-400 group-hover:scale-110 shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-transform">
                <span class="material-symbols-outlined text-[28px] text-amber-400">face</span>
              </div>
              <span class="font-label-mono-sm text-[11px] text-amber-400 font-bold uppercase tracking-wider">Pilar 03</span>
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Reconhecimento Facial Inteligente</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant">Ideal para casamentos, formaturas e eventos corporativos. O convidado clica no rosto ou sobe uma selfie e vê só suas fotos.</p>
            </div>

            <!-- Pilar 4 -->
            <div class="p-space-lg rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col gap-space-sm group border border-surface-variant">
              <div class="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-[28px]">shield</span>
              </div>
              <span class="font-label-mono-sm text-[11px] text-rose-400 font-bold uppercase tracking-wider">Pilar 04</span>
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Proteção Total Anti-Pirataria</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant">Grade repetida com logotipo do estúdio, opacidade milimétrica e bloqueio contra clique direito e print-screen nativo.</p>
            </div>

            <!-- Pilar 5 -->
            <div class="p-space-lg rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col gap-space-sm group border border-surface-variant hover:border-secondary/40">
              <div class="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-[28px]">cloud_upload</span>
              </div>
              <span class="font-label-mono-sm text-[11px] text-secondary font-bold uppercase tracking-wider">Pilar 05</span>
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Upload Turbo Otimizado</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant">Arraste pastas inteiras. O navegador pré-otimiza antes de enviar, reduzindo o tempo de upload em até 65% sem perder nitidez.</p>
            </div>

            <!-- Pilar 6 -->
            <div class="p-space-lg rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col gap-space-sm group border border-amber-400/15 hover:border-amber-400/40">
              <div class="w-12 h-12 rounded-xl bg-surface-container-high border border-amber-400/30 flex items-center justify-center text-amber-400 group-hover:scale-110 shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-transform">
                <span class="material-symbols-outlined text-[28px] text-amber-400">dns</span>
              </div>
              <span class="font-label-mono-sm text-[11px] text-amber-400 font-bold uppercase tracking-wider">Pilar 06</span>
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Nuvem Edge Cloudflare R2</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant">CDN global distribuída em São Paulo e no mundo. Suas fotos abrem com zero lentidão, sem travamentos e com 99.9% de uptime.</p>
            </div>

            <!-- Pilar 7 -->
            <div class="p-space-lg rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col gap-space-sm group border border-surface-variant">
              <div class="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-[28px]">view_kanban</span>
              </div>
              <span class="font-label-mono-sm text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">Pilar 07</span>
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Painel Kanban do Fotógrafo</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant">Controle total dos seus trabalhos em colunas: Em Preparação, Aguardando Cliente, Em Retoque e Entregue com Sucesso.</p>
            </div>

            <!-- Pilar 8 -->
            <div class="p-space-lg rounded-2xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col gap-space-sm group border border-surface-variant hover:border-secondary/40">
              <div class="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-[28px]">send</span>
              </div>
              <span class="font-label-mono-sm text-[11px] text-secondary font-bold uppercase tracking-wider">Pilar 08</span>
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">Disparo Oficial via WhatsApp</h3>
              <p class="font-body-sm text-body-sm text-on-surface-variant">Gere links amigáveis e textos automáticos em 1 clique para enviar direto ao WhatsApp do cliente com credenciais seguras.</p>
            </div>

          </div>
        </div>
      </section>

      <!-- SIMULADOR INTERATIVO DE CAPACIDADE DE FOTOS & ARMAZENAMENTO -->
      <section class="w-full px-margin py-space-xl lg:py-24 max-w-7xl mx-auto" id="simulador">
        <div class="flex flex-col items-center text-center gap-space-xs mb-space-xl">
          <span class="font-label-mono-sm text-label-mono-sm text-amber-400 uppercase font-black tracking-widest">Calculadora Dinâmica</span>
          <h2 class="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-on-surface font-bold">
            Simulador de Capacidade & Enquadramento
          </h2>
          <p class="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Veja quantas fotos e ensaios você consegue manter simultaneamente ativos em cada plano de acordo com o tamanho dos seus arquivos.
          </p>
        </div>

        <!-- Módulo do Simulador -->
        <div class="p-space-lg lg:p-space-xl rounded-3xl bg-surface-container-low border border-amber-400/20 flex flex-col gap-space-lg shadow-xl">
          
          <!-- Seletor de Tamanho / Resolução -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-md border-b border-surface-variant">
            <div class="flex flex-col">
              <span class="font-headline-sm text-headline-sm text-on-surface font-bold">Escolha a Resolução de Subida</span>
              <span class="font-body-sm text-body-sm text-on-surface-variant">Ajuste para ver o rendimento real do espaço em disco</span>
            </div>
            
            <!-- Botões de Qualidade -->
            <div class="flex flex-wrap items-center gap-2" id="quality-selector">
              <button class="quality-btn px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant font-label-mono-sm text-label-mono-sm font-semibold hover:text-amber-400 transition-all border border-transparent cursor-pointer" data-size="3">
                3 MB (Web Rápida)
              </button>
              <button class="quality-btn active px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-label-mono-sm text-label-mono-sm font-black shadow-[0_0_24px_rgba(245,158,11,0.5)] border border-amber-300 transition-all cursor-pointer" data-size="7">
                7 MB (Recomendado King)
              </button>
              <button class="quality-btn px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant font-label-mono-sm text-label-mono-sm font-semibold hover:text-amber-400 transition-all border border-transparent cursor-pointer" data-size="10">
                10 MB (Alta Definição)
              </button>
              <button class="quality-btn px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant font-label-mono-sm text-label-mono-sm font-semibold hover:text-amber-400 transition-all border border-transparent cursor-pointer" data-size="15">
                15 MB (Full Raw/Original)
              </button>
            </div>
          </div>

          <!-- Grid de Resultados do Simulador -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
            
            <!-- Simulação 20 GB -->
            <div class="p-space-md rounded-2xl bg-surface-container flex flex-col justify-between gap-space-md border border-surface-variant">
              <div class="flex flex-col gap-2">
                <span class="font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase font-bold">Plano Starter</span>
                <span class="font-headline-lg text-headline-lg text-on-surface font-black">20 GB</span>
                <div class="flex flex-col gap-1 mt-2">
                  <span class="font-label-mono-lg text-label-mono-lg text-amber-400 font-black sim-photos drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]" data-gb="20">~2.920 Fotos</span>
                  <span class="font-body-sm text-body-sm text-on-surface-variant sim-sessions" data-gb="20">Aprox. 10 a 14 Ensaios</span>
                </div>
              </div>
              <div class="pt-3 border-t border-surface-variant flex items-center justify-between">
                <span class="font-headline-sm text-headline-sm text-on-surface font-bold">R$ 39,90<span class="text-on-surface-variant font-body-sm text-[12px]">/mês</span></span>
                <a class="text-amber-400 hover:text-amber-300 hover:underline font-label-mono-sm text-label-mono-sm font-bold flex items-center gap-1" href="#planos-e-precos">Ver Plano <span class="material-symbols-outlined text-[16px]">arrow_forward</span></a>
              </div>
            </div>

            <!-- Simulação 30 GB -->
            <div class="p-space-md rounded-2xl bg-surface-container-high shadow-2xl flex flex-col justify-between gap-space-md relative overflow-hidden border-2 border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <span class="font-label-mono-sm text-label-mono-sm text-amber-400 uppercase font-black">Plano Pro</span>
                  <span class="font-label-mono-sm text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-[0_0_8px_rgba(245,158,11,0.4)]">Mais Popular</span>
                </div>
                <span class="font-headline-lg text-headline-lg text-on-surface font-black">30 GB</span>
                <div class="flex flex-col gap-1 mt-2">
                  <span class="font-label-mono-lg text-label-mono-lg text-amber-400 font-black sim-photos drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]" data-gb="30">~4.380 Fotos</span>
                  <span class="font-body-sm text-body-sm text-on-surface-variant sim-sessions" data-gb="30">Aprox. 15 a 22 Ensaios</span>
                </div>
              </div>
              <div class="pt-3 border-t border-surface-variant flex items-center justify-between">
                <span class="font-headline-sm text-headline-sm text-amber-400 font-black">R$ 59,90<span class="text-on-surface-variant font-body-sm text-[12px]">/mês</span></span>
                <a class="text-amber-400 hover:text-amber-300 hover:underline font-label-mono-sm text-label-mono-sm font-black flex items-center gap-1" href="#planos-e-precos">Ver Plano <span class="material-symbols-outlined text-[16px]">arrow_forward</span></a>
              </div>
            </div>

            <!-- Simulação 60 GB -->
            <div class="p-space-md rounded-2xl bg-surface-container flex flex-col justify-between gap-space-md border border-surface-variant">
              <div class="flex flex-col gap-2">
                <span class="font-label-mono-sm text-label-mono-sm text-secondary uppercase font-bold">Studio King</span>
                <span class="font-headline-lg text-headline-lg text-on-surface font-black">60 GB</span>
                <div class="flex flex-col gap-1 mt-2">
                  <span class="font-label-mono-lg text-label-mono-lg text-secondary font-bold sim-photos" data-gb="60">~8.760 Fotos</span>
                  <span class="font-body-sm text-body-sm text-on-surface-variant sim-sessions" data-gb="60">Aprox. 30 Ensaios ou 8 Casamentos</span>
                </div>
              </div>
              <div class="pt-3 border-t border-surface-variant flex items-center justify-between">
                <span class="font-headline-sm text-headline-sm text-on-surface font-bold">R$ 99,90<span class="text-on-surface-variant font-body-sm text-[12px]">/mês</span></span>
                <a class="text-secondary hover:underline font-label-mono-sm text-label-mono-sm font-bold flex items-center" href="#planos-e-precos">Ver Plano <span class="material-symbols-outlined text-[16px]">arrow_forward</span></a>
              </div>
            </div>

            <!-- Simulação 100 GB -->
            <div class="p-space-md rounded-2xl bg-surface-container flex flex-col justify-between gap-space-md border border-surface-variant">
              <div class="flex flex-col gap-2">
                <span class="font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase font-bold">Enterprise / Produtoras</span>
                <span class="font-headline-lg text-headline-lg text-on-surface font-black">100 GB+</span>
                <div class="flex flex-col gap-1 mt-2">
                  <span class="font-label-mono-lg text-label-mono-lg text-on-surface font-bold sim-photos" data-gb="100">~14.600+ Fotos</span>
                  <span class="font-body-sm text-body-sm text-on-surface-variant sim-sessions" data-gb="100">Volume Ilimitado de Produção</span>
                </div>
              </div>
              <div class="pt-3 border-t border-surface-variant flex items-center justify-between">
                <span class="font-headline-sm text-headline-sm text-on-surface font-bold">Sob Demanda</span>
                <a class="text-amber-400 hover:underline font-label-mono-sm text-label-mono-sm font-bold flex items-center" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Tenho%20interesse%20no%20Plano%20Enterprise%20acima%20de%20100GB." rel="noopener noreferrer" target="_blank">Falar no WhatsApp <span class="material-symbols-outlined text-[16px]">chat</span></a>
              </div>
            </div>

          </div>

          <div class="p-3.5 rounded-xl bg-surface-container-highest/60 border border-amber-400/20 flex items-center gap-3">
            <span class="material-symbols-outlined text-amber-400 text-[22px]">info</span>
            <span class="font-body-sm text-body-sm text-on-surface-variant">
              Dica Pro Conecta King: No King Selection, as fotos de prova enviadas com ~7 MB entregam nitidez retina espetacular em qualquer tela e carregam 4x mais rápido para o seu cliente selecionar sem travar.
            </span>
          </div>

        </div>
      </section>

      <!-- TABELA DE PLANOS & PREÇOS (TRANSPARÊNCIA TOTAL) -->
      <section class="w-full bg-surface-container-lowest px-margin py-space-xl lg:py-24 border-t border-amber-500/10" id="planos-e-precos">
        <div class="max-w-7xl mx-auto flex flex-col gap-space-xl">
          <div class="flex flex-col items-center text-center gap-space-xs">
            <span class="font-label-mono-sm text-label-mono-sm text-amber-400 uppercase font-black tracking-widest">Planos Transparentes Sem Surpresas</span>
            <h2 class="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-on-surface font-bold">
              Escolha o Plano Ideal para a Escala do seu Estúdio
            </h2>
            <p class="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Sem taxas sobre as suas vendas de fotos extras. O lucro no Pix é 100% seu. Cancele quando quiser sem contratos amarrados.
            </p>
          </div>

          <!-- Grid dos 3 Cards Principais -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-space-lg items-stretch">
            
            <!-- Plano Starter (20 GB) -->
            <div class="p-space-lg rounded-3xl bg-surface-container-low flex flex-col justify-between gap-space-lg border border-surface-variant">
              <div class="flex flex-col gap-space-md">
                <div class="flex flex-col gap-1">
                  <span class="font-label-mono-sm text-label-mono-sm text-on-surface-variant font-bold uppercase tracking-wider">Iniciante / Ensaios</span>
                  <h3 class="font-headline-md text-headline-md text-on-surface font-black">Plano Starter (20 GB)</h3>
                  <p class="font-body-sm text-body-sm text-on-surface-variant">Para fotógrafos que realizam até 10 ensaios mensais e querem seleção ágil.</p>
                </div>
                <div class="flex items-baseline gap-1">
                  <span class="font-display-lg text-headline-lg text-on-surface font-black">R$ 39,90</span>
                  <span class="font-body-md text-body-md text-on-surface-variant">/mês</span>
                </div>
                <div class="flex flex-col gap-2.5 pt-space-xs font-body-sm text-body-sm text-on-surface-variant">
                  <div class="flex items-center gap-2.5 text-on-surface">
                    <span class="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                    <span>Até <strong>~2.900 fotos</strong> ativas em nuvem</span>
                  </div>
                  <div class="flex items-center gap-2.5 text-on-surface">
                    <span class="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                    <span>Galerias ilimitadas de clientes</span>
                  </div>
                  <div class="flex items-center gap-2.5 text-on-surface">
                    <span class="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                    <span>Marca d'água anti-print personalizável</span>
                  </div>
                  <div class="flex items-center gap-2.5 text-on-surface">
                    <span class="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                    <span>Anotações de retoque por imagem</span>
                  </div>
                  <div class="flex items-center gap-2.5 text-on-surface">
                    <span class="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                    <span>Venda automática de fotos extras no Pix</span>
                  </div>
                  <div class="flex items-center gap-2.5 text-on-surface-variant/60">
                    <span class="material-symbols-outlined text-[18px]">close</span>
                    <span>Reconhecimento Facial IA (Face AI)</span>
                  </div>
                </div>
              </div>
              <a class="w-full py-3.5 px-4 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface hover:text-amber-300 font-headline-sm text-body-md font-bold text-center transition-all flex items-center justify-center gap-2 border border-surface-variant hover:border-amber-400/40" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Quero%20contratar%20o%20Plano%20Starter%20(20%20GB)%20por%20R$%2039,90." rel="noopener noreferrer" target="_blank">
                <span>Escolher 20 GB</span>
                <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
              </a>
            </div>

            <!-- Plano Pro (30 GB) - MAIS POPULAR / DESTAQUE DOURADO -->
            <div class="p-space-lg rounded-3xl bg-surface-container-high shadow-2xl flex flex-col justify-between gap-space-lg relative overflow-hidden border-2 border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.35)]">
              <!-- Faixa Luminosa Mais Popular -->
              <div class="absolute top-0 right-0 left-0 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 py-1.5 text-center font-label-mono-sm text-label-mono-sm font-black tracking-wider uppercase shadow-[0_2px_12px_rgba(245,158,11,0.4)]">
                ⚡ O Mais Escolhido por Fotógrafos Profissionais
              </div>
              <div class="flex flex-col gap-space-md pt-5">
                <div class="flex flex-col gap-1">
                  <span class="font-label-mono-sm text-label-mono-sm text-amber-400 font-black uppercase tracking-wider">Acelerador de Receita</span>
                  <h3 class="font-headline-md text-headline-md text-on-surface font-black">Plano Pro (30 GB)</h3>
                  <p class="font-body-sm text-body-sm text-on-surface-variant">Reconhecimento Facial IA, Kanban e integração nativa com WhatsApp inclusos.</p>
                </div>
                <div class="flex items-baseline gap-1">
                  <span class="font-display-lg text-headline-lg text-amber-400 font-black drop-shadow-[0_0_16px_rgba(245,158,11,0.4)]">R$ 59,90</span>
                  <span class="font-body-md text-body-md text-on-surface-variant">/mês</span>
                </div>
                <div class="flex flex-col gap-2.5 pt-space-xs font-body-sm text-body-sm text-on-surface">
                  <div class="flex items-center gap-2.5">
                    <span class="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                    <span>Até <strong>~4.350 fotos</strong> ativas simultaneamente</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <span class="material-symbols-outlined text-amber-400 text-[18px]">bolt</span>
                    <span><strong class="text-amber-400">Reconhecimento Facial IA</strong> (Face AI ativo)</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <span class="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                    <span>Painel Kanban completo de gestão de projetos</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <span class="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                    <span>Integração de envio automático no WhatsApp</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <span class="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                    <span>Marca d'água anti-print + Anotações de retoque</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <span class="material-symbols-outlined text-amber-400 text-[18px]">star</span>
                    <span class="text-amber-300 font-semibold">Suporte Prioritário Conecta King</span>
                  </div>
                </div>
              </div>
              <a class="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-headline-sm text-body-md font-extrabold text-center transition-all shadow-[0_0_30px_rgba(245,158,11,0.45)] hover:shadow-[0_0_40px_rgba(245,158,11,0.65)] flex items-center justify-center gap-2" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Quero%20assinar%20o%20Plano%20Pro%20(30%20GB)%20por%20R$%2059,90." rel="noopener noreferrer" target="_blank">
                <span>Contratar Plano Pro 30 GB</span>
                <span class="material-symbols-outlined text-[18px] font-bold">arrow_forward</span>
              </a>
            </div>

            <!-- Plano Studio King (60 GB) -->
            <div class="p-space-lg rounded-3xl bg-surface-container-low flex flex-col justify-between gap-space-lg border border-surface-variant">
              <div class="flex flex-col gap-space-md">
                <div class="flex flex-col gap-1">
                  <span class="font-label-mono-sm text-label-mono-sm text-secondary font-bold uppercase tracking-wider">Alto Volume & Equipes</span>
                  <h3 class="font-headline-md text-headline-md text-on-surface font-black">Studio King (60 GB)</h3>
                  <p class="font-body-sm text-body-sm text-on-surface-variant">Para estúdios com múltiplos fotógrafos, casamentos semanais e formaturas.</p>
                </div>
                <div class="flex items-baseline gap-1">
                  <span class="font-display-lg text-headline-lg text-on-surface font-black">R$ 99,90</span>
                  <span class="font-body-md text-body-md text-on-surface-variant">/mês</span>
                </div>
                <div class="flex flex-col gap-2.5 pt-space-xs font-body-sm text-body-sm text-on-surface">
                  <div class="flex items-center gap-2.5">
                    <span class="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                    <span>Até <strong>~8.700 fotos</strong> ou grandes casamentos</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <span class="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                    <span>Tudo do Plano Pro incluído sem limites</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <span class="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                    <span>Acesso para múltiplos assistentes e editores</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <span class="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                    <span>Prioridade máxima de tráfego na CDN Cloudflare</span>
                  </div>
                  <div class="flex items-center gap-2.5">
                    <span class="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                    <span>Atendimento VIP personalizado</span>
                  </div>
                </div>
              </div>
              <a class="w-full py-3.5 px-4 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-headline-sm text-body-md font-bold text-center transition-all flex items-center justify-center gap-2 border border-surface-variant" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Quero%20assinar%20o%20Plano%20Studio%20King%20(60%20GB)%20por%20R$%2099,90." rel="noopener noreferrer" target="_blank">
                <span>Assinar Studio King 60 GB</span>
                <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
              </a>
            </div>

          </div>

          <!-- Card Enterprise Sob Demanda -->
          <div class="p-space-lg rounded-2xl bg-surface-container border border-amber-400/20 flex flex-col md:flex-row items-center justify-between gap-space-md">
            <div class="flex items-center gap-space-md">
              <div class="w-12 h-12 rounded-xl bg-surface-container-high border border-amber-400/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-[0_0_16px_rgba(245,158,11,0.2)]">
                <span class="material-symbols-outlined text-[28px] text-amber-400">business</span>
              </div>
              <div class="flex flex-col">
                <h4 class="font-headline-sm text-headline-sm text-on-surface font-bold">Precisa de 100 GB, 500 GB ou 1 TB para Produtora de Formaturas?</h4>
                <p class="font-body-sm text-body-sm text-on-surface-variant">Estruturas corporativas com SLAs dedicados, onboarding assistido e armazenamento massivo sob medida.</p>
              </div>
            </div>
            <a class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-container-high hover:bg-surface-bright text-amber-400 border border-amber-400/30 hover:border-amber-400/60 font-headline-sm text-body-sm font-bold flex-shrink-0 transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)]" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Preciso%20de%20uma%20proposta%20Enterprise%20(100GB%2B)%20para%20minha%20produtora." rel="noopener noreferrer" target="_blank">
              <span class="material-symbols-outlined text-[18px]">chat</span>
              <span>Consultar Enterprise</span>
            </a>
          </div>

        </div>
      </section>

      <!-- FAQ DE RESPOSTA RÁPIDA (QUEBRA DE OBJEÇÕES) -->
      <section class="w-full px-margin py-space-xl lg:py-24 max-w-4xl mx-auto" id="faq">
        <div class="flex flex-col items-center text-center gap-space-xs mb-space-xl">
          <span class="font-label-mono-sm text-label-mono-sm text-amber-400 uppercase font-black tracking-widest">Tire suas Dúvidas</span>
          <h2 class="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-on-surface font-bold">
            Perguntas Frequentes de Fotógrafos
          </h2>
          <p class="font-body-md text-body-md text-on-surface-variant">
            Transparência absoluta sobre fluxo de pagamento, compressão de imagens e compatibilidade.
          </p>
        </div>

        <!-- Accordion Interativo -->
        <div class="flex flex-col gap-space-sm" id="faq-accordion">
          
          <!-- FAQ 1 -->
          <div class="faq-item rounded-2xl bg-surface-container-low transition-all border border-transparent hover:border-amber-400/20">
            <button type="button" class="faq-toggle w-full p-space-md text-left flex items-center justify-between gap-4 cursor-pointer">
              <span class="font-headline-sm text-body-lg text-on-surface font-bold">Como o cliente final paga as fotos extras?</span>
              <span class="material-symbols-outlined text-amber-400 text-[20px] transition-transform faq-icon">expand_more</span>
            </button>
            <div class="faq-content hidden px-space-md pb-space-md text-on-surface-variant font-body-md text-body-md">
              <p>Direto na sua chave Pix ou link de pagamento configurado! O King Selection calcula a quantidade de fotos extras selecionadas e apresenta a chave Pix ou gera o pedido formatado para o seu WhatsApp. <strong class="text-secondary font-semibold">100% do valor vai para a sua conta, sem intermediação nem taxas sobre o seu faturamento.</strong></p>
            </div>
          </div>

          <!-- FAQ 2 -->
          <div class="faq-item rounded-2xl bg-surface-container-low transition-all border border-transparent hover:border-amber-400/20">
            <button type="button" class="faq-toggle w-full p-space-md text-left flex items-center justify-between gap-4 cursor-pointer">
              <span class="font-headline-sm text-body-lg text-on-surface font-bold">As fotos perdem qualidade para a entrega final de impressão?</span>
              <span class="material-symbols-outlined text-amber-400 text-[20px] transition-transform faq-icon">expand_more</span>
            </button>
            <div class="faq-content hidden px-space-md pb-space-md text-on-surface-variant font-body-md text-body-md">
              <p>Não. Apenas as fotos da galeria de prova são otimizadas para que o cliente abra no 4G/5G com velocidade estonteante. Após o cliente finalizar e pagar pelas extras, você utiliza a lista de nomes de arquivos para exportar os arquivos em resolução original máxima diretamente do seu Lightroom ou disco local.</p>
            </div>
          </div>

          <!-- FAQ 3 -->
          <div class="faq-item rounded-2xl bg-surface-container-low transition-all border border-transparent hover:border-amber-400/20">
            <button type="button" class="faq-toggle w-full p-space-md text-left flex items-center justify-between gap-4 cursor-pointer">
              <span class="font-headline-sm text-body-lg text-on-surface font-bold">O cliente precisa criar conta ou instalar algum aplicativo?</span>
              <span class="material-symbols-outlined text-amber-400 text-[20px] transition-transform faq-icon">expand_more</span>
            </button>
            <div class="faq-content hidden px-space-md pb-space-md text-on-surface-variant font-body-md text-body-md">
              <p>Zero aplicativo! O cliente recebe um link exclusivo protegido por senha ou PIN gerado automaticamente e abre diretamente no navegador de qualquer celular (Safari, Chrome) ou computador. A seleção é tão intuitiva quanto navegar no feed de uma rede social.</p>
            </div>
          </div>

          <!-- FAQ 4 -->
          <div class="faq-item rounded-2xl bg-surface-container-low transition-all border border-transparent hover:border-amber-400/20">
            <button type="button" class="faq-toggle w-full p-space-md text-left flex items-center justify-between gap-4 cursor-pointer">
              <span class="font-headline-sm text-body-lg text-on-surface font-bold">Como exporto a lista de fotos selecionadas para o Lightroom?</span>
              <span class="material-symbols-outlined text-amber-400 text-[20px] transition-transform faq-icon">expand_more</span>
            </button>
            <div class="faq-content hidden px-space-md pb-space-md text-on-surface-variant font-body-md text-body-md">
              <p>Com um único clique no botão <strong>"Copiar Nomes para Lightroom"</strong> dentro do seu painel. O King Selection copia a sequência exata de nomes de arquivo (ex: IMG_1020, IMG_1045). Basta abrir a Biblioteca do Lightroom, colar na barra de busca por texto com a opção "Contém" e filtrar todas em menos de 3 segundos.</p>
            </div>
          </div>

          <!-- FAQ 5 -->
          <div class="faq-item rounded-2xl bg-surface-container-low transition-all border border-transparent hover:border-amber-400/20">
            <button type="button" class="faq-toggle w-full p-space-md text-left flex items-center justify-between gap-4 cursor-pointer">
              <span class="font-headline-sm text-body-lg text-on-surface font-bold">Tem taxa de cancelamento ou contrato de fidelidade preso?</span>
              <span class="material-symbols-outlined text-amber-400 text-[20px] transition-transform faq-icon">expand_more</span>
            </button>
            <div class="faq-content hidden px-space-md pb-space-md text-on-surface-variant font-body-md text-body-md">
              <p>Não há fidelidade nem pegadinhas. As assinaturas funcionam mês a mês. Se desejar pausar ou cancelar, basta fazer a solicitação diretamente no painel ou pelo suporte no WhatsApp sem multa alguma.</p>
            </div>
          </div>

        </div>
      </section>

      <!-- SEÇÃO DE FECHAMENTO (CTA FINAL DE ALTO CONVENCIMENTO) -->
      <section class="w-full px-margin pb-space-xl lg:pb-28">
        <div class="max-w-5xl mx-auto rounded-3xl bg-surface-container-high p-space-lg lg:p-space-xl shadow-2xl flex flex-col items-center text-center gap-space-md relative overflow-hidden border border-amber-400/30">
          <!-- Efeito de Luz Âmbar Suave de Fundo -->
          <div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-amber-500/25 blur-3xl pointer-events-none"></div>
          
          <div class="w-14 h-14 rounded-2xl bg-surface-container-highest border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.35)] relative z-10">
            <span class="material-symbols-outlined text-[32px] text-amber-400">monetization_on</span>
          </div>
          
          <div class="flex flex-col gap-2 max-w-2xl relative z-10">
            <h2 class="font-headline-lg text-headline-lg-mobile lg:text-headline-lg text-on-surface font-black">
              Pare de Deixar Dinheiro na Mesa em Cada Ensaio Fotográfico
            </h2>
            <p class="font-body-lg text-body-lg text-on-surface-variant">
              Modernize a apresentação do seu estúdio hoje mesmo, encante seus clientes com velocidade ultra-rápida e comece a lucrar no Pix com venda automática de fotos extras.
            </p>
          </div>

          <!-- Botão Verde WhatsApp de Alta Conversão -->
          <div class="flex flex-col sm:flex-row items-center gap-space-sm pt-space-xs relative z-10 w-full sm:w-auto">
            <a class="w-full sm:w-auto inline-flex justify-center items-center gap-3 px-8 py-4 rounded-xl bg-secondary-container hover:bg-secondary text-on-secondary font-headline-sm text-body-lg font-bold transition-all shadow-[0_0_32px_rgba(16,185,129,0.35)] hover:shadow-[0_0_48px_rgba(16,185,129,0.55)]" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Quero%20conhecer%20o%20King%20Selection%20para%20meu%20est%C3%BAdio." rel="noopener noreferrer" target="_blank">
              <span class="material-symbols-outlined text-[24px]">chat</span>
              <span>Falar no WhatsApp Oficial: (11) 98878-9417</span>
            </a>
            <button type="button" onclick="openLoginModal()" class="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-4 rounded-xl bg-surface-container text-on-surface hover:text-amber-300 hover:bg-surface-bright font-headline-sm text-body-md font-semibold transition-all border border-amber-400/20 hover:border-amber-400/40 cursor-pointer">
              <span class="material-symbols-outlined text-amber-400 text-[20px]">lock_open</span>
              <span>Acessar Meu Painel</span>
            </button>
          </div>

          <!-- Selos de Confiança -->
          <div class="flex flex-wrap items-center justify-center gap-space-md pt-space-sm text-on-surface-variant font-label-mono-sm text-label-mono-sm relative z-10">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-secondary text-[16px]">lock</span>
              <span>Criptografia SHA-256</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-amber-400 text-[16px]">cloud</span>
              <span>Cloudflare R2 Global Edge</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-secondary text-[16px]">verified</span>
              <span>Garantia Conecta King Tecnologia</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  </main>

  <!-- MODAL EXCLUSIVO DE LOGIN (ÁREA DO FOTÓGRAFO) -->
  <div id="ks-login-modal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 opacity-0 pointer-events-none transition-all duration-300">
    <div class="relative w-full max-w-md bg-surface-container-high rounded-3xl p-6 sm:p-8 border border-amber-400/40 shadow-[0_0_50px_rgba(0,0,0,0.8)] transform scale-95 transition-all duration-300" id="ks-login-box">
      
      <!-- Botão Fechar -->
      <button type="button" onclick="closeLoginModal()" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-surface-container hover:bg-surface-bright text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer" title="Fechar">
        <span class="material-symbols-outlined text-[20px]">close</span>
      </button>

      <!-- Cabeçalho do Modal -->
      <div class="flex flex-col items-center text-center gap-2 mb-6">
        <div class="w-14 h-14 rounded-2xl bg-surface-container-lowest border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.35)]">
          <span class="material-symbols-outlined text-[28px] text-amber-400">lock</span>
        </div>
        <h3 class="font-headline-md text-headline-md font-black text-on-surface tracking-tight mt-1">Área do Fotógrafo</h3>
        <p class="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
          Acesse suas galerias, clientes e seleções em andamento no King Selection.
        </p>
      </div>

      <!-- Formulário de Login -->
      <form onsubmit="handleKsLogin(event)" class="space-y-4">
        
        <!-- Input E-mail / Usuário -->
        <div class="space-y-1.5 text-left">
          <label class="font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase font-bold" for="ks-email">E-mail ou Usuário</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">mail</span>
            <input 
              id="ks-email" 
              type="text" 
              required 
              autocomplete="username" 
              placeholder="Ex: seuemail@estudio.com ou telefone" 
              class="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container-lowest border border-amber-400/20 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-on-surface font-body-md placeholder:text-stone-500 text-sm transition-all outline-none"
            />
          </div>
        </div>

        <!-- Input Senha com Olhinho -->
        <div class="space-y-1.5 text-left">
          <div class="flex items-center justify-between">
            <label class="font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase font-bold" for="ks-password">Senha de Acesso</label>
            <a class="font-label-mono-sm text-label-mono-sm text-amber-400 hover:underline font-bold" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Esqueci%20minha%20senha%20de%20acesso%20do%20King%20Selection." target="_blank" rel="noopener noreferrer">Esqueci</a>
          </div>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">key</span>
            <input 
              id="ks-password" 
              type="password" 
              required 
              autocomplete="current-password" 
              placeholder="••••••••" 
              class="w-full h-12 pl-11 pr-11 rounded-xl bg-surface-container-lowest border border-amber-400/20 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-on-surface font-body-md placeholder:text-stone-500 text-sm transition-all outline-none"
            />
            <button 
              type="button" 
              id="ks-toggle-pwd-btn" 
              onclick="togglePasswordVisibility()" 
              class="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-300 transition-colors p-1.5 cursor-pointer flex items-center justify-center z-10" 
              title="Mostrar senha" 
              aria-label="Mostrar ou ocultar senha"
            >
              <svg id="ks-pwd-eye-open" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display: block;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg id="ks-pwd-eye-closed" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display: none;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Botão Entrar -->
        <div class="pt-2">
          <button 
            type="submit" 
            id="ks-btn-submit" 
            class="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-headline-sm text-body-md font-extrabold flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.45)] hover:shadow-[0_0_35px_rgba(245,158,11,0.65)] transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Acessar Meus Projetos</span>
            <span class="material-symbols-outlined text-[20px] font-bold">login</span>
          </button>
        </div>

        <!-- Links Auxiliares -->
        <div class="pt-3 text-center border-t border-surface-variant text-xs space-y-2">
          <p class="text-on-surface-variant">
            Ainda não é fotógrafo assinante? 
            <a href="#planos-e-precos" onclick="closeLoginModal()" class="text-amber-400 font-bold hover:underline">Contratar Plano</a>
          </p>
          <p>
            <a class="text-secondary font-semibold hover:underline inline-flex items-center gap-1" href="https://wa.me/5511988789417?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20para%20acessar%20meu%20painel%20do%20King%20Selection." target="_blank" rel="noopener noreferrer">
              <span class="material-symbols-outlined text-[16px]">chat</span>
              <span>Problemas no acesso? Suporte WhatsApp</span>
            </a>
          </p>
        </div>

      </form>
    </div>
  </div>

  <!-- FOOTER EXECUTIVO -->
  <footer class="w-full bg-surface-container-lowest py-space-xl border-t border-amber-500/10">
    <div class="w-full px-margin flex flex-col gap-space-xl max-w-7xl mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-lg items-start">
        
        <div class="flex flex-col gap-space-sm">
          <div class="flex items-center gap-space-sm">
            <div class="w-8 h-8 rounded-lg bg-surface-container-high border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
              <span class="material-symbols-outlined text-[20px] text-amber-400">crown</span>
            </div>
            <span class="font-headline-sm text-headline-sm text-on-surface font-bold">King Selection</span>
          </div>
          <p class="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
            Plataforma executiva de alta velocidade para seleção e aprovação de acervos fotográficos premium, equipada com infraestrutura de entrega em tempo real.
          </p>
        </div>

        <div class="flex flex-col gap-space-sm">
          <span class="font-label-mono-lg text-label-mono-lg text-amber-400 uppercase font-black tracking-wider">Infraestrutura & Segurança</span>
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2 text-on-surface-variant font-label-mono-sm text-label-mono-sm">
              <span class="material-symbols-outlined text-secondary text-[16px]">cloud_done</span>
              <span>Armazenamento Cloudflare R2 Edge</span>
            </div>
            <div class="flex items-center gap-2 text-on-surface-variant font-label-mono-sm text-label-mono-sm">
              <span class="material-symbols-outlined text-secondary text-[16px]">enhanced_encryption</span>
              <span>Criptografia SHA-256 e TLS 1.3</span>
            </div>
            <div class="flex items-center gap-2 text-on-surface-variant font-label-mono-sm text-label-mono-sm">
              <span class="material-symbols-outlined text-secondary text-[16px]">verified_user</span>
              <span>Privacidade & Proteção de Dados</span>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-space-sm">
          <span class="font-label-mono-lg text-label-mono-lg text-amber-400 uppercase font-black tracking-wider">Navegação Rápida</span>
          <div class="flex flex-col gap-2 font-body-sm text-body-sm">
            <a class="text-on-surface-variant hover:text-amber-400 transition-colors" href="#recursos">Recursos de Performance</a>
            <a class="text-on-surface-variant hover:text-amber-400 transition-colors" href="#comparativo">Comparativo</a>
            <a class="text-on-surface-variant hover:text-amber-400 transition-colors" href="#simulador">Simulador de Fotos</a>
            <a class="text-on-surface-variant hover:text-amber-400 transition-colors" href="#planos-e-precos">Tabela de Planos</a>
            <a class="text-on-surface-variant hover:text-amber-400 transition-colors" href="#faq">Perguntas Frequentes</a>
          </div>
        </div>

        <div class="flex flex-col gap-space-sm">
          <span class="font-label-mono-lg text-label-mono-lg text-amber-400 uppercase font-black tracking-wider">Atendimento Oficial</span>
          <div class="p-4 rounded-xl bg-surface-container-low border border-amber-400/15 flex flex-col gap-2">
            <span class="font-body-sm text-body-sm text-on-surface-variant">Suporte VIP e Onboarding:</span>
            <a class="font-label-mono-lg text-label-mono-lg text-secondary font-bold flex items-center gap-2 hover:underline" href="https://wa.me/5511988789417" rel="noopener noreferrer" target="_blank">
              <span class="material-symbols-outlined text-[16px]">call</span>
              <span>(11) 98878-9417</span>
            </a>
            <span class="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Atendimento para fotógrafos e estúdios</span>
          </div>
        </div>

      </div>

      <div class="flex flex-col sm:flex-row items-center justify-between gap-space-md pt-space-lg border-t border-surface-variant">
        <span class="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
          © 2026 Conecta King Tecnologia. Todos os direitos reservados.
        </span>
        <div class="flex items-center gap-space-md">
          <span class="font-label-mono-sm text-label-mono-sm text-on-surface-variant flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            Sistemas Operacionais Normalizados
          </span>
        </div>
      </div>
    </div>
  </footer>

  <!-- JAVASCRIPT VANILLA -->
  <script>
    // ── MODAL DE LOGIN ──
    function openLoginModal() {
      const modal = document.getElementById('ks-login-modal');
      const box = document.getElementById('ks-login-box');
      if (!modal || !box) return;
      modal.classList.remove('opacity-0', 'pointer-events-none');
      modal.classList.add('opacity-100', 'pointer-events-auto');
      box.classList.remove('scale-95');
      box.classList.add('scale-100');
      setTimeout(() => {
        const input = document.getElementById('ks-email');
        if (input) input.focus();
      }, 100);
    }

    function closeLoginModal() {
      const modal = document.getElementById('ks-login-modal');
      const box = document.getElementById('ks-login-box');
      if (!modal || !box) return;
      modal.classList.remove('opacity-100', 'pointer-events-auto');
      modal.classList.add('opacity-0', 'pointer-events-none');
      box.classList.remove('scale-100');
      box.classList.add('scale-95');
    }

    // Fecha modal clicando fora
    document.addEventListener('click', (e) => {
      const modal = document.getElementById('ks-login-modal');
      if (modal && e.target === modal) {
        closeLoginModal();
      }
    });

    // Fecha modal no ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLoginModal();
    });

    // ── VISIBILIDADE DE SENHA COM OLHINHO ──
    function togglePasswordVisibility() {
      const pwd = document.getElementById('ks-password');
      const openEye = document.getElementById('ks-pwd-eye-open');
      const closedEye = document.getElementById('ks-pwd-eye-closed');
      const btn = document.getElementById('ks-toggle-pwd-btn');
      if (!pwd) return;
      const isPass = pwd.type === 'password';
      pwd.type = isPass ? 'text' : 'password';
      if (openEye && closedEye) {
        openEye.style.display = isPass ? 'none' : 'block';
        closedEye.style.display = isPass ? 'block' : 'none';
      }
      if (btn) {
        btn.setAttribute('title', isPass ? 'Ocultar senha' : 'Mostrar senha');
      }
    }

    // ── LIMPEZA PÓS-LOGOUT ──
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('logout') === '1' || urlParams.get('session_expired') === '1') {
        localStorage.clear();
        sessionStorage.clear();
      }
      if (urlParams.get('login') === '1' || window.location.hash === '#login') {
        setTimeout(openLoginModal, 300);
      }
    } catch (_) {}

    // ── AUTENTICAÇÃO REAL (KING SELECTION & ADM) ──
    async function handleKsLogin(e) {
      if (e && e.preventDefault) e.preventDefault();
      const btn = document.getElementById('ks-btn-submit');
      const emailInput = document.getElementById('ks-email');
      const passInput = document.getElementById('ks-password');
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passInput ? passInput.value : '';

      if (!email || !password) {
        Swal.fire({
          icon: 'warning',
          title: 'Campos Obrigatórios',
          text: 'Por favor, informe seu e-mail e senha de acesso.',
          background: '#1c2027',
          color: '#dfe2ec',
          confirmButtonColor: '#f59e0b'
        });
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span><span>Autenticando...</span>';

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      try {
        const csrfMatch = document.cookie.match(/(?:^|; )ck_csrf=([^;]*)/);
        const xsrfMatch = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
        if (csrfMatch) headers['X-CK-CSRF'] = decodeURIComponent(csrfMatch[1]);
        if (xsrfMatch) headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfMatch[1]);
      } catch (_) {}

      try {
        const res = await fetch('/api/king-selection/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: headers,
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          const isAdmin = !!(data.user?.isAdmin || data.isAdmin);
          if (data.token) {
            try {
              localStorage.setItem('conectaKingToken', data.token);
              localStorage.setItem('token', data.token);
              localStorage.setItem('conectaKingSession', '1');
              if (data.user) {
                localStorage.setItem('conectaKingUser', JSON.stringify(data.user));
              }
            } catch (_) {}
          }
          Swal.fire({
            icon: 'success',
            title: isAdmin ? '👑 Bem-vindo, Administrador Master!' : 'Bem-vindo ao King Selection!',
            text: data.message || (isAdmin ? 'Acessando Painel Master ADM e Estúdio...' : 'Abrindo seus projetos...'),
            timer: 1500,
            showConfirmButton: false,
            background: '#1c2027',
            color: '#dfe2ec'
          }).then(() => {
            window.location.href = data.redirect || (isAdmin ? '/admin' : '/kingSelection');
          });
        } else if (data.code === 'MODULE_NOT_ENABLED') {
          Swal.fire({
            icon: 'warning',
            title: 'Módulo Não Habilitado',
            text: data.message || 'Seu plano ainda não possui o módulo King Selection ativado.',
            showCancelButton: true,
            confirmButtonText: 'Falar com Suporte no WhatsApp',
            cancelButtonText: 'Fechar',
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#31353d',
            background: '#1c2027',
            color: '#dfe2ec'
          }).then((result) => {
            if (result.isConfirmed) {
              window.open('https://wa.me/5511988789417?text=Ol%C3%A1!%20Meu%20e-mail%20%C3%A9%20' + encodeURIComponent(email) + '%20e%20gostaria%20de%20ativar%20meu%20plano%20do%20King%20Selection.', '_blank');
            }
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Acesso Não Autorizado',
            text: data.message || 'E-mail ou senha incorretos.',
            background: '#1c2027',
            color: '#dfe2ec',
            confirmButtonColor: '#f59e0b'
          });
        }
      } catch (err) {
        console.error(err);
        Swal.fire({
          icon: 'error',
          title: 'Erro de Conexão',
          text: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
          background: '#1c2027',
          color: '#dfe2ec',
          confirmButtonColor: '#f59e0b'
        });
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Acessar Meus Projetos</span><span class="material-symbols-outlined text-[20px]">login</span>';
      }
    }

    // ── FAQ ACCORDION ──
    const faqButtons = document.querySelectorAll('.faq-toggle');
    faqButtons.forEach(button => {
      button.addEventListener('click', () => {
        const item = button.closest('.faq-item');
        const content = item.querySelector('.faq-content');
        const icon = item.querySelector('.faq-icon');
        const isHidden = content.classList.contains('hidden');

        document.querySelectorAll('.faq-content').forEach(c => c.classList.add('hidden'));
        document.querySelectorAll('.faq-icon').forEach(i => i.classList.remove('rotate-180'));

        if (isHidden) {
          content.classList.remove('hidden');
          icon.classList.add('rotate-180');
        }
      });
    });

    // ── SIMULADOR DE CAPACIDADE ──
    const qualityBtns = document.querySelectorAll('.quality-btn');
    const photoHolders = document.querySelectorAll('.sim-photos');
    const sessionHolders = document.querySelectorAll('.sim-sessions');

    const updateCalculations = (mbPerPhoto) => {
      photoHolders.forEach(holder => {
        const gb = parseInt(holder.getAttribute('data-gb'), 10);
        const totalMb = gb * 1024;
        const totalPhotos = Math.floor(totalMb / mbPerPhoto);
        holder.textContent = `~${totalPhotos.toLocaleString('pt-BR')} Fotos`;
      });

      sessionHolders.forEach(holder => {
        const gb = parseInt(holder.getAttribute('data-gb'), 10);
        const totalMb = gb * 1024;
        const totalPhotos = Math.floor(totalMb / mbPerPhoto);
        
        if (gb === 20) {
          const sessions = Math.floor(totalPhotos / 250);
          holder.textContent = `Aprox. ${sessions} a ${sessions + 4} Ensaios`;
        } else if (gb === 30) {
          const sessions = Math.floor(totalPhotos / 250);
          holder.textContent = `Aprox. ${sessions} a ${sessions + 6} Ensaios`;
        } else if (gb === 60) {
          const weddings = Math.floor(totalPhotos / 1000);
          holder.textContent = `Aprox. ${Math.floor(totalPhotos / 250)} Ensaios ou ${weddings} Casamentos`;
        } else {
          holder.textContent = 'Volume Ilimitado de Produção';
        }
      });
    };

    qualityBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        qualityBtns.forEach(b => {
          b.classList.remove('bg-gradient-to-r', 'from-amber-500', 'via-amber-400', 'to-yellow-500', 'text-slate-950', 'shadow-[0_0_24px_rgba(245,158,11,0.5)]', 'border-amber-300', 'font-black', 'active');
          b.classList.add('bg-surface-container', 'text-on-surface-variant', 'border-transparent', 'font-semibold');
        });

        btn.classList.remove('bg-surface-container', 'text-on-surface-variant', 'border-transparent', 'font-semibold');
        btn.classList.add('bg-gradient-to-r', 'from-amber-500', 'via-amber-400', 'to-yellow-500', 'text-slate-950', 'shadow-[0_0_24px_rgba(245,158,11,0.5)]', 'border-amber-300', 'font-black', 'active');

        const mbSize = parseFloat(btn.getAttribute('data-size'));
        updateCalculations(mbSize);
      });
    });

    // Inicializa simulação com 7 MB
    document.addEventListener('DOMContentLoaded', () => {
      updateCalculations(7);
    });
  </script>

</body>
</html>
